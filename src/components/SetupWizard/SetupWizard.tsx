import React, { useState } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import { useAppDialogs } from '../../hooks';
import { getCurrencySymbol, CURRENCIES } from '../../utils/currency';
import { getDefaultAccountColor, getDefaultAccountIcon } from '../../utils/accountDefaults';
import { getPaychecksPerYear } from '../../utils/payPeriod';
import { formatSuggestedLeftover, getSuggestedLeftoverPerPaycheck } from '../../utils/paySuggestions';
import { KeychainService } from '../../services/keychainService';
import { FileStorageService } from '../../services/fileStorage';
import EncryptionConfigPanel from '../EncryptionSetup/EncryptionConfigPanel';
import type { Account } from '../../types/accounts';
import type { PaySettings, TaxSettings } from '../../types/payroll';
import { Button, FormGroup, InputWithPrefix, RadioGroup, InfoBox, AccountsEditor, ProgressBar, ErrorDialog } from '../shared';
import './SetupWizard.css';

interface SetupWizardProps {
  onComplete: () => void;
  onCancel?: () => void;
}

interface EditableTaxLine {
  id: string;
  label: string;
  rate: string;
  error?: string;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete, onCancel }) => {
  const { updatePaySettings, updateTaxSettings, updateBudgetSettings, updateBudgetData, budgetData } = useBudget();
  const { errorDialog, openErrorDialog, closeErrorDialog } = useAppDialogs();
  
  const [step, setStep] = useState(1);
  const totalSteps = 6; // Increased from 5 to include encryption step

  // Form state
  const [currency, setCurrency] = useState(budgetData?.settings?.currency || 'USD');
  
  // Encryption configuration
  const [encryptionEnabled, setEncryptionEnabled] = useState<boolean | null>(null);
  const [customEncryptionKey, setCustomEncryptionKey] = useState('');
  const [generatedEncryptionKey, setGeneratedEncryptionKey] = useState('');
  const [useCustomEncryptionKey, setUseCustomEncryptionKey] = useState(false);
  
  const [payType, setPayType] = useState<'salary' | 'hourly'>('salary');
  const [annualSalary, setAnnualSalary] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('');
  const [payFrequency, setPayFrequency] = useState<'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly'>('bi-weekly');
  const [minLeftover, setMinLeftover] = useState('0');

  const [taxLines, setTaxLines] = useState<EditableTaxLine[]>([
    { id: crypto.randomUUID(), label: 'Federal Tax', rate: '12' },
    { id: crypto.randomUUID(), label: 'State Tax', rate: '5' },
    { id: crypto.randomUUID(), label: 'Social Security', rate: '6.2' },
    { id: crypto.randomUUID(), label: 'Medicare', rate: '1.45' },
  ]);
  const [taxRatesAutoEstimated, setTaxRatesAutoEstimated] = useState(false);
  const [additionalWithholding, setAdditionalWithholding] = useState('0');
  const [additionalWithholdingError, setAdditionalWithholdingError] = useState<string | undefined>();

  // Account configuration - start with default "My Checking" account
  const [accounts, setAccounts] = useState<Account[]>([
    {
      id: crypto.randomUUID(),
      name: 'My Checking',
      type: 'checking',
      color: getDefaultAccountColor('checking'),
      icon: getDefaultAccountIcon('checking'),
    },
  ]);

  const handleNext = () => {
    if (step === 3 && !taxRatesAutoEstimated) {
      setTaxLines((prev) => applyEstimatedTaxRates(prev));
      setTaxRatesAutoEstimated(true);
    }

    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    // If on encryption step and currently in key setup view (encryptionEnabled is not null),
    // go back to the selection view instead of going to previous step
    if (step === 6 && encryptionEnabled !== null) {
      setEncryptionEnabled(null);
      return;
    }
    
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Generate a new encryption key
  const handleGenerateEncryptionKey = () => {
    const key = FileStorageService.generateEncryptionKey();
    setGeneratedEncryptionKey(key);
    setUseCustomEncryptionKey(false);
  };

  const handleCompleteEncryptionSetup = async () => {
    if (!budgetData) return;

    if (encryptionEnabled) {
      const keyToUse = useCustomEncryptionKey ? customEncryptionKey : generatedEncryptionKey;
      if (!keyToUse) {
        openErrorDialog({
          title: 'Encryption Key Required',
          message: 'Please generate or enter an encryption key.',
        });
        return;
      }
      // Save the encryption key to keychain
      await KeychainService.saveKey(budgetData.id, keyToUse);
    }

    // Proceed to next step
    handleNext();
  };

  const handleComplete = async () => {
    let hasTaxErrors = false;
    const validatedTaxLines = taxLines.map((line) => {
      const parsedRate = parseFloat(line.rate);
      if (line.label.trim() === '') {
        hasTaxErrors = true;
        return { ...line, error: 'Label is required.' };
      }
      if (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 100) {
        hasTaxErrors = true;
        return { ...line, error: 'Rate must be between 0 and 100.' };
      }
      return { ...line, error: undefined };
    });

    const parsedWithholding = parseFloat(additionalWithholding);
    if (!Number.isFinite(parsedWithholding) || parsedWithholding < 0) {
      setAdditionalWithholdingError('Additional withholding must be zero or greater.');
      hasTaxErrors = true;
    } else {
      setAdditionalWithholdingError(undefined);
    }

    setTaxLines(validatedTaxLines);
    if (hasTaxErrors) {
      setStep(4);
      return;
    }

    // Save currency setting
    if (budgetData) {
      updateBudgetSettings({
        ...budgetData.settings,
        currency,
        encryptionEnabled: encryptionEnabled ?? false,
      });
    }

    // Save pay settings
    const paychecksPerYear = getPaychecksPerYear(payFrequency);
    const computedHoursPerPayPeriod =
      payType === 'hourly'
        ? ((parseFloat(hoursPerWeek) || 0) * 52) / paychecksPerYear
        : undefined;

    const paySettings: PaySettings = {
      payType,
      payFrequency,
      minLeftover: parseFloat(minLeftover) || 0,
      ...(payType === 'salary' 
        ? { annualSalary: parseFloat(annualSalary) || 0 }
        : { 
            hourlyRate: parseFloat(hourlyRate) || 0,
            hoursPerPayPeriod: computedHoursPerPayPeriod || 0
          }
      ),
    };
    updatePaySettings(paySettings);

    // Save tax settings
    const taxSettings: TaxSettings = {
      taxLines: validatedTaxLines.map((line) => ({
        id: line.id,
        label: line.label.trim(),
        rate: parseFloat(line.rate),
      })),
      additionalWithholding: parsedWithholding,
    };
    updateTaxSettings(taxSettings);

    // Save accounts configured during setup
    updateBudgetData({ accounts });

    onComplete();
  };

  const handleAddAccount = (newAccount: Omit<Account, 'id'>) => {
    setAccounts((prev) => [
      ...prev,
      {
        ...newAccount,
        id: crypto.randomUUID(),
      },
    ]);
  };

  const handleUpdateAccount = (id: string, updates: Partial<Account>) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, ...updates } : acc))
    );
  };

  const handleDeleteAccount = (id: string) => {
    setAccounts((prev) => prev.filter((acc) => acc.id !== id));
  };

  const handleTaxLineChange = (id: string, field: 'label' | 'rate', value: string) => {
    setTaxLines((prev) => prev.map((line) => (
      line.id === id ? { ...line, [field]: value, error: undefined } : line
    )));
  };

  const handleAddTaxLine = () => {
    setTaxLines((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: '', rate: '0' },
    ]);
  };

  const handleRemoveTaxLine = (id: string) => {
    setTaxLines((prev) => prev.filter((line) => line.id !== id));
  };

  const getEstimatedAnnualGross = () => {
    if (payType === 'salary') {
      return parseFloat(annualSalary) || 0;
    }

    return (parseFloat(hourlyRate) || 0) * (parseFloat(hoursPerWeek) || 0) * 52;
  };

  const estimateFederalRate = (annualGross: number) => {
    if (annualGross <= 25000) return 7;
    if (annualGross <= 45000) return 10;
    if (annualGross <= 70000) return 12;
    if (annualGross <= 100000) return 15;
    if (annualGross <= 160000) return 18;
    if (annualGross <= 250000) return 22;
    return 26;
  };

  const estimateStateRate = (annualGross: number) => {
    if (annualGross <= 30000) return 3;
    if (annualGross <= 60000) return 4;
    if (annualGross <= 100000) return 5;
    if (annualGross <= 160000) return 6;
    return 7;
  };

  const applyEstimatedTaxRates = (lines: EditableTaxLine[]) => {
    const annualGross = getEstimatedAnnualGross();
    const federalRate = estimateFederalRate(annualGross);
    const stateRate = estimateStateRate(annualGross);

    return lines.map((line) => {
      const normalizedLabel = line.label.trim().toLowerCase();

      if (normalizedLabel === 'federal tax') {
        return { ...line, rate: String(federalRate), error: undefined };
      }

      if (normalizedLabel === 'state tax') {
        return { ...line, rate: String(stateRate), error: undefined };
      }

      if (normalizedLabel === 'social security') {
        return { ...line, rate: '6.2', error: undefined };
      }

      if (normalizedLabel === 'medicare') {
        return { ...line, rate: '1.45', error: undefined };
      }

      return line;
    });
  };

  const estimateGrossPerPaycheck = () => {
    const paychecksPerYear = getPaychecksPerYear(payFrequency);
    if (paychecksPerYear <= 0) return 0;

    if (payType === 'salary') {
      return (parseFloat(annualSalary) || 0) / paychecksPerYear;
    }

    const weeklyHours = parseFloat(hoursPerWeek) || 0;
    const hourly = parseFloat(hourlyRate) || 0;
    return (hourly * weeklyHours * 52) / paychecksPerYear;
  };

  const suggestedLeftoverPerPaycheck = getSuggestedLeftoverPerPaycheck(estimateGrossPerPaycheck());

  const formattedSuggestedLeftover = formatSuggestedLeftover(suggestedLeftoverPerPaycheck, currency);

  const canProceed = () => {
    switch (step) {
      case 1:
        return true; // Year and currency are always set
      case 2:
        if (payType === 'salary') {
          return annualSalary && parseFloat(annualSalary) > 0;
        } else {
          return hourlyRate && parseFloat(hourlyRate) > 0 && 
                 hoursPerWeek && parseFloat(hoursPerWeek) > 0;
        }
      case 3:
        return true;
      case 4:
        return true; // Tax settings are optional (can use defaults)
      case 5:
        return accounts.length > 0; // Need at least one account
      case 6:
        return encryptionEnabled !== null; // Must have chosen encryption or no encryption
      default:
        return false;
    }
  };

  return (
    <div className="setup-wizard">
      <div className="wizard-container">
        <div className="wizard-header">
          <h1>Setup Your Paycheck Plan</h1>
          <ProgressBar
            percentage={(step / totalSteps) * 100}
            label={`Step ${step} of ${totalSteps}`}
            className="wizard-progress"
          />
        </div>

        <div className="wizard-content">
          {step === 1 && (
            <div className="wizard-step">
              <h2>Welcome to Paycheck Planner!</h2>
              <p className="step-description">
                Let's set up how you get paid so you can get started planning for <strong>{budgetData?.year}</strong>.
              </p>

              <FormGroup label="Currency" helperText="Choose your local currency for this plan">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="currency-select"
                >
                  {CURRENCIES.map(curr => (
                    <option key={curr.code} value={curr.code}>
                      {curr.flag} {curr.name} ({curr.code})
                    </option>
                  ))}
                </select>
              </FormGroup>

              <InfoBox>
                <h3>What you'll configure in this quickstart guide:</h3>
                <ul>
                  <li>Your pay amount and frequency</li>
                  <li>Tax withholding estimates</li>
                  <li>Initial setup of your banking accounts</li>
                  <li>Security and encryption settings</li>
                </ul>
              </InfoBox>
            </div>
          )}

          {step === 6 && (
            <div className="wizard-step">
              <h2>🔐 Security Setup</h2>
              <p className="step-description">
                Choose how you want to protect your budget files
              </p>

              <EncryptionConfigPanel
                encryptionEnabled={encryptionEnabled}
                setEncryptionEnabled={setEncryptionEnabled}
                useCustomKey={useCustomEncryptionKey}
                setUseCustomKey={setUseCustomEncryptionKey}
                customKey={customEncryptionKey}
                setCustomKey={setCustomEncryptionKey}
                generatedKey={generatedEncryptionKey}
                onGenerateKey={handleGenerateEncryptionKey}
              />
            </div>
          )}

          {step === 2 && (
            <div className="wizard-step">
              <h2>How do you get paid?</h2>
              <p className="step-description">
                Tell us whether you're paid a salary or hourly, and how much.
              </p>

              <FormGroup label="Pay Type">
                <RadioGroup
                  name="payType"
                  value={payType}
                  onChange={(value) => setPayType(value as 'salary' | 'hourly')}
                  layout="row"
                  options={[
                    { value: 'salary', label: 'Annual Salary' },
                    { value: 'hourly', label: 'Hourly Wage' },
                  ]}
                />
              </FormGroup>

              {payType === 'salary' ? (
                <FormGroup label="Annual Salary">
                  <InputWithPrefix
                    prefix={getCurrencySymbol(currency)}
                    type="number"
                    value={annualSalary}
                    onChange={(e) => setAnnualSalary(e.target.value)}
                    placeholder="Your annual salary"
                    min="0"
                    step="1000"
                  />
                </FormGroup>
              ) : (
                <>
                  <FormGroup label="Hourly Rate">
                    <InputWithPrefix
                      prefix={getCurrencySymbol(currency)}
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      placeholder="Your hourly rate"
                      min="0"
                      step="0.50"
                    />
                  </FormGroup>
                  <FormGroup label="Total hours you most often work per week" helperText="This will be converted automatically based on your pay frequency in the next step.">
                    <input
                      type="number"
                      value={hoursPerWeek}
                      onChange={(e) => setHoursPerWeek(e.target.value)}
                      placeholder="Total hours per week"
                      min="0"
                      step="0.5"
                    />
                  </FormGroup>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="wizard-step">
              <h2>How often are you paid?</h2>
              <p className="step-description">
                Select your pay frequency so we can calculate your per-paycheck amounts.
              </p>

              <FormGroup label="Pay Frequency">
                <RadioGroup
                  name="payFrequency"
                  value={payFrequency}
                  onChange={(value) => setPayFrequency(value as 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly')}
                  layout="column"
                  options={[
                    { value: 'weekly', label: 'Weekly', description: '52 paychecks per year' },
                    { value: 'bi-weekly', label: 'Bi-weekly', description: '26 paychecks per year (every 2 weeks)' },
                    { value: 'semi-monthly', label: 'Semi-monthly', description: '24 paychecks per year (twice a month)' },
                    { value: 'monthly', label: 'Monthly', description: '12 paychecks per year' },
                  ]}
                />
              </FormGroup>

              {/* Paycheck scheduling inputs intentionally disabled for now.
                  Keep this area reserved for re-enabling first-paycheck/semi-monthly date UX later. */}

              <FormGroup 
                label="Target Leftover Per Paycheck" 
                helperText="The target amount you want to keep around for spending on variable expenses like groceries, entertainment, and shopping. If you go below this amount, the app will alert you that you may be over-budget."
              >
                <InputWithPrefix
                  prefix={getCurrencySymbol(currency)}
                  type="number"
                  value={minLeftover}
                  onChange={(e) => setMinLeftover(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="10"
                />
              </FormGroup>

              {formattedSuggestedLeftover && (
                <div className="setup-leftover-suggestion">
                  <div className="setup-leftover-suggestion-copy">
                    <strong>Suggested leftover: {formattedSuggestedLeftover} per paycheck</strong>
                    <span>
                      Based on your pay details, this is about 20% of estimated gross pay to leave room for variable spending.
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    size="small"
                    title="Use Suggested Amount"
                    onClick={() => setMinLeftover(String(suggestedLeftoverPerPaycheck))}
                  >
                    Use Suggested Amount
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="wizard-step">
              <h2>Tax Withholding</h2>
              <p className="step-description">
                Edit your tax labels and rates. You can keep these defaults or customize them now.
              </p>

              <InfoBox>
                <strong>Starter estimates loaded:</strong> These tax percentages were prefilled from the pay amount you entered.
                Review and adjust them if your actual withholding differs.
              </InfoBox>

              <div className="setup-tax-lines-editor">
                <div className="setup-tax-lines-header">
                  <span className="setup-col-label">Name</span>
                  <span className="setup-col-rate">Rate (%)</span>
                  <span className="setup-col-actions" />
                </div>

                {taxLines.map((line) => (
                  <div key={line.id} className="setup-tax-line-row">
                    <div className="setup-tax-line-fields">
                      <input
                        className={`setup-tax-line-label-input${line.error === 'Label is required.' ? ' field-error' : ''}`}
                        type="text"
                        placeholder="e.g. Federal Tax"
                        value={line.label}
                        onChange={(e) => handleTaxLineChange(line.id, 'label', e.target.value)}
                      />
                      <InputWithPrefix
                        suffix="%"
                        className={line.error && line.error !== 'Label is required.' ? 'field-error' : ''}
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={line.rate}
                        onChange={(e) => handleTaxLineChange(line.id, 'rate', e.target.value)}
                      />
                      <Button
                        variant="remove"
                        type="button"
                        title="Remove tax line"
                        onClick={() => handleRemoveTaxLine(line.id)}
                      >
                        ✕
                      </Button>
                    </div>
                    {line.error && <div className="setup-tax-line-error">{line.error}</div>}
                  </div>
                ))}

                <Button variant="secondary" onClick={handleAddTaxLine}>
                  + Add Tax Line
                </Button>
              </div>

              <FormGroup 
                label="Additional Withholding (per paycheck)" 
                helperText="Extra tax amount withheld per paycheck and sent to the IRS. Use this if you owe taxes at year-end or want to increase your refund. This is already subtracted from your net pay."
                error={additionalWithholdingError}
              >
                <InputWithPrefix
                  className={additionalWithholdingError ? 'field-error' : ''}
                  prefix={getCurrencySymbol(currency)}
                  type="number"
                  value={additionalWithholding}
                  onChange={(e) => {
                    setAdditionalWithholding(e.target.value);
                    if (additionalWithholdingError) setAdditionalWithholdingError(undefined);
                  }}
                  placeholder="0"
                  min="0"
                  step="10"
                />
              </FormGroup>
            </div>
          )}

          {step === 5 && (
            <div className="wizard-step">
              <h2>Where does your money go?</h2>
              <p className="step-description">
                Set up your accounts where you want to allocate your paychecks. We've created a default checking account to get you started.
              </p>

              <AccountsEditor
                accounts={accounts}
                onAdd={handleAddAccount}
                onUpdate={handleUpdateAccount}
                onDelete={handleDeleteAccount}
                showToggleButton={false}
                listLabel="Your Accounts"
                listSubtitle="We've created a default checking account for you. Click the edit icon to rename it or change its type."
                infoMessage="You can always add, remove, or rename accounts later from Edit → Accounts."
                minAccounts={1}
              />
            </div>
          )}
        </div>

        <div className="wizard-footer">
          {step === 1 ? (
            onCancel ? (
              <Button
                variant="secondary"
                onClick={onCancel}
              >
                ← Back
              </Button>
            ) : null
          ) : (
            <Button
              variant="secondary"
              onClick={handlePrevious}
            >
              ← Previous
            </Button>
          )}
          
          {step < totalSteps ? (
            <Button
              variant="primary"
              onClick={() => {
                // Special handling for encryption step
                if (step === 6) {
                  handleCompleteEncryptionSetup();
                } else {
                  handleNext();
                }
              }}
              disabled={!canProceed()}
            >
              Next →
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleComplete}
              disabled={!canProceed()}
            >
              Complete Setup ✓
            </Button>
          )}
        </div>
      </div>

      <ErrorDialog
        isOpen={!!errorDialog}
        onClose={closeErrorDialog}
        title={errorDialog?.title || 'Error'}
        message={errorDialog?.message || ''}
        actionLabel={errorDialog?.actionLabel}
      />
    </div>
  );
};

export default SetupWizard;
