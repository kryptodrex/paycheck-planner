import React, { useState } from 'react';
import { useBudget } from '../../../contexts/BudgetContext';
import { useAppDialogs, useEncryptionSetupFlow } from '../../../hooks';
import { getCurrencySymbol, CURRENCIES } from '../../../utils/currency';
import { getDefaultAccountColor, getDefaultAccountIcon } from '../../../utils/accountDefaults';
import { getPaychecksPerYear } from '../../../utils/payPeriod';
import { formatSuggestedLeftover, getSuggestedLeftoverPerPaycheck } from '../../../utils/paySuggestions';
import {
  type EditableTaxLineValues,
  syncEditableTaxLineValues,
  toStoredTaxLine,
  validateEditableTaxLineValues,
} from '../../../utils/taxLines';
import type { Account } from '../../../types/accounts';
import type { PaySettings, TaxSettings } from '../../../types/payroll';
import { Button, FormGroup, InputWithPrefix, RadioGroup, InfoBox, AccountsEditor, EncryptionConfigPanel, ProgressBar, ErrorDialog, TaxLinesEditor, Dropdown } from '../../_shared';
import '../views.shared.css';
import '../../_shared/payEditorShared.css';
import './SetupWizard.css';

interface SetupWizardProps {
  onComplete: () => void;
  onCancel?: () => void;
}

const getDefaultTaxLinesForCurrency = (currencyCode: string): EditableTaxLineValues[] => {
  if (currencyCode === 'USD') {
    return [
      { id: crypto.randomUUID(), label: 'Federal Tax', rate: '12', amount: '0.00', taxableIncome: '0.00', calculationType: 'percentage' },
      { id: crypto.randomUUID(), label: 'State Tax', rate: '5', amount: '0.00', taxableIncome: '0.00', calculationType: 'percentage' },
      { id: crypto.randomUUID(), label: 'Social Security', rate: '6.2', amount: '0.00', taxableIncome: '0.00', calculationType: 'percentage' },
      { id: crypto.randomUUID(), label: 'Medicare', rate: '1.45', amount: '0.00', taxableIncome: '0.00', calculationType: 'percentage' },
    ];
  }

  // Non-USD plans start with neutral labels and no assumed rates.
  return [
    { id: crypto.randomUUID(), label: 'Income Tax', rate: '0', amount: '0.00', taxableIncome: '0.00', calculationType: 'percentage' },
  ];
};

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete, onCancel }) => {
  const { updatePaySettings, updateTaxSettings, updateBudgetSettings, updateBudgetData, budgetData } = useBudget();
  const { errorDialog, openErrorDialog, closeErrorDialog } = useAppDialogs();
  
  const [step, setStep] = useState(1);
  const totalSteps = 6; // Increased from 5 to include encryption step

  // Form state
  const [currency, setCurrency] = useState(budgetData?.settings?.currency || 'USD');
  
  // Encryption configuration
  const {
    encryptionEnabled,
    setEncryptionEnabled,
    customKey: customEncryptionKey,
    setCustomKey: setCustomEncryptionKey,
    generatedKey: generatedEncryptionKey,
    useCustomKey: useCustomEncryptionKey,
    setUseCustomKey: setUseCustomEncryptionKey,
    generateKey: handleGenerateEncryptionKey,
    goBackToSelection,
    saveSelection: saveEncryptionSelection,
  } = useEncryptionSetupFlow();
  
  const [payType, setPayType] = useState<'salary' | 'hourly'>('salary');
  const [annualSalary, setAnnualSalary] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('');
  const [payFrequency, setPayFrequency] = useState<PaySettings['payFrequency']>('bi-weekly');
  const [minLeftover, setMinLeftover] = useState('0');

  const [taxLines, setTaxLines] = useState<EditableTaxLineValues[]>(() => getDefaultTaxLinesForCurrency(budgetData?.settings?.currency || 'USD'));
  const [hasEditedTaxLines, setHasEditedTaxLines] = useState(false);
  const [taxRatesAutoEstimated, setTaxRatesAutoEstimated] = useState(false);
  const [additionalWithholding, setAdditionalWithholding] = useState('0');
  const [additionalWithholdingError, setAdditionalWithholdingError] = useState<string | undefined>();

  // Account configuration - start with default "My Checking" account
  const [accounts, setAccounts] = useState<Account[]>([
    {
      id: crypto.randomUUID(),
      name: 'Checking',
      type: 'checking',
      color: getDefaultAccountColor('checking'),
      icon: getDefaultAccountIcon('checking'),
    },
  ]);

  const handleNext = () => {
    if (step === 3 && currency === 'USD' && !taxRatesAutoEstimated) {
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
      goBackToSelection();
      return;
    }
    
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    if (!budgetData) return;

    const encryptionResult = await saveEncryptionSelection({
      planId: budgetData.id,
      persistAppSettings: false,
      deleteStoredKeyWhenDisabled: false,
    });

    if (!encryptionResult.success) {
      openErrorDialog(encryptionResult.errorDialog);
      return;
    }

    let hasTaxErrors = false;
    const validatedTaxLines = taxLines.map((line) => {
      const nextLine = validateEditableTaxLineValues(line);
      if (nextLine.error) {
        hasTaxErrors = true;
      }
      return nextLine;
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
      taxLines: validatedTaxLines.map((line) => toStoredTaxLine(line, estimateGrossPerPaycheck())),
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

  const handleTaxLineChange = (id: string, field: 'label' | 'rate' | 'amount' | 'taxableIncome' | 'calculationType', value: string) => {
    setHasEditedTaxLines(true);
    setTaxLines((prev) => prev.map((line) => (
      line.id === id ? syncEditableTaxLineValues(line, field, value, estimateGrossPerPaycheck()) : line
    )));
  };

  const handleTaxLineBlur = (id: string, field: 'rate' | 'amount' | 'taxableIncome') => {
    setTaxLines((prev) => prev.map((line) => {
      if (line.id !== id) return line;

      if (field === 'taxableIncome') {
        const parsedTaxableIncome = Math.max(0, parseFloat(line.taxableIncome) || 0);
        return syncEditableTaxLineValues(line, 'taxableIncome', parsedTaxableIncome.toFixed(2), estimateGrossPerPaycheck());
      }

      if (field === 'amount') {
        const parsedAmount = Math.max(0, parseFloat(line.amount) || 0);
        return syncEditableTaxLineValues(line, 'amount', parsedAmount.toFixed(2), estimateGrossPerPaycheck());
      }

      const parsedRate = Math.max(0, parseFloat(line.rate) || 0);
      return syncEditableTaxLineValues(line, 'rate', parsedRate.toFixed(2), estimateGrossPerPaycheck());
    }));
  };

  const handleAddTaxLine = () => {
    setHasEditedTaxLines(true);
    const estimatedTaxableIncome = estimateGrossPerPaycheck();
    setTaxLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: '',
        rate: '0',
        amount: '0.00',
        taxableIncome: estimatedTaxableIncome.toFixed(2),
        calculationType: 'percentage',
      },
    ]);
  };

  const handleRemoveTaxLine = (id: string) => {
    setHasEditedTaxLines(true);
    setTaxLines((prev) => prev.filter((line) => line.id !== id));
  };

  const handleCurrencyChange = (value: string) => {
    setCurrency(value);

    if (!hasEditedTaxLines) {
      const estimatedTaxableIncome = estimateGrossPerPaycheck();
      setTaxLines(getDefaultTaxLinesForCurrency(value).map((line) => (
        syncEditableTaxLineValues(line, 'taxableIncome', estimatedTaxableIncome.toFixed(2), estimatedTaxableIncome)
      )));
      setTaxRatesAutoEstimated(value !== 'USD');
    }
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

  const applyEstimatedTaxRates = (lines: EditableTaxLineValues[]) => {
    const annualGross = getEstimatedAnnualGross();
    const federalRate = estimateFederalRate(annualGross);
    const stateRate = estimateStateRate(annualGross);
    const grossPerPaycheck = estimateGrossPerPaycheck();

    return lines.map((line) => {
      const lineWithTaxableIncome = syncEditableTaxLineValues(line, 'taxableIncome', grossPerPaycheck.toFixed(2), grossPerPaycheck);
      const normalizedLabel = line.label.trim().toLowerCase();

      if (normalizedLabel === 'federal tax') {
        return syncEditableTaxLineValues(lineWithTaxableIncome, 'rate', String(federalRate), grossPerPaycheck);
      }

      if (normalizedLabel === 'state tax') {
        return syncEditableTaxLineValues(lineWithTaxableIncome, 'rate', String(stateRate), grossPerPaycheck);
      }

      if (normalizedLabel === 'social security') {
        return syncEditableTaxLineValues(lineWithTaxableIncome, 'rate', '6.2', grossPerPaycheck);
      }

      if (normalizedLabel === 'medicare') {
        return syncEditableTaxLineValues(lineWithTaxableIncome, 'rate', '1.45', grossPerPaycheck);
      }

      return lineWithTaxableIncome;
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
    <div className="view-screen setup-wizard">
      <div className="view-screen-card wizard-container">
        <div className="wizard-header app-drag-region">
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
                <Dropdown
                  value={currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="currency-select"
                >
                  {CURRENCIES.map(curr => (
                    <option key={curr.code} value={curr.code}>
                      {curr.flag} {curr.name} ({curr.code})
                    </option>
                  ))}
                </Dropdown>
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
                Select your pay frequency so we can calculate your per-pay-period amounts.
              </p>

              <FormGroup label="Pay Frequency">
                <RadioGroup
                  name="payFrequency"
                  value={payFrequency}
                  onChange={(value) => setPayFrequency(value as PaySettings['payFrequency'])}
                  layout="column"
                  options={[
                    { value: 'weekly', label: 'Weekly', description: '52 paychecks per year' },
                    { value: 'bi-weekly', label: 'Bi-weekly', description: '26 paychecks per year (every 2 weeks)' },
                    { value: 'semi-monthly', label: 'Semi-monthly', description: '24 paychecks per year (twice a month)' },
                    { value: 'monthly', label: 'Monthly', description: '12 paychecks per year' },
                    { value: 'quarterly', label: 'Quarterly', description: '4 paychecks per year' },
                    { value: 'yearly', label: 'Yearly', description: '1 paycheck per year' },
                  ]}
                />
              </FormGroup>

              {/* Paycheck scheduling inputs intentionally disabled for now.
                  Keep this area reserved for re-enabling first-paycheck/semi-monthly date UX later. */}

              <FormGroup 
                label="Target Leftover Per Pay Period" 
                helperText="The target amount you want to keep around for spending on variable expenses like groceries, entertainment, and shopping each time you are paid. If you go below this amount, the app will alert you that you may be over-budget."
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

              {formattedSuggestedLeftover && parseInt(formattedSuggestedLeftover.replace(/[^0-9]/g, ''), 10) > parseInt(minLeftover || '0', 10) && (
                <div className="leftover-suggestion">
                  <div className="leftover-suggestion-copy">
                    <strong>Suggested leftover: {formattedSuggestedLeftover} per pay period</strong>
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
                {currency === 'USD' ? (
                  <>
                    <strong>Starter estimates loaded:</strong> These tax percentages were prefilled from the pay amount you entered.
                    Review and adjust them if your actual withholding differs.
                  </>
                ) : (
                  <>
                    <strong>No country-specific defaults loaded:</strong> Non-USD plans start with neutral tax lines so you can enter rates that match your local tax rules.
                  </>
                )}
              </InfoBox>

              <TaxLinesEditor
                lines={taxLines}
                currency={currency}
                onLineChange={handleTaxLineChange}
                onLineBlur={handleTaxLineBlur}
                onAddLine={handleAddTaxLine}
                onRemoveLine={handleRemoveTaxLine}
              />

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
                Set up the accounts where you want to allocate your paychecks. We've created a default checking account to get you started.
              </p>

              <AccountsEditor
                accounts={accounts}
                onAdd={handleAddAccount}
                onUpdate={handleUpdateAccount}
                onDelete={handleDeleteAccount}
                showToggleButton
                listLabel="Your Accounts"
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
              onClick={handleNext}
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
