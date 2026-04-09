import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Sun, Moon, Monitor, Palette } from 'lucide-react';
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
import { estimateTaxSettings } from '../../../services/taxEstimationService';
import { FileStorageService } from '../../../services/fileStorage';
import { APP_CUSTOM_EVENTS } from '../../../constants/events';
import { APPEARANCE_PRESET_OPTIONS } from '../../../constants/appearancePresets';
import { getDefaultTabConfigs } from '../../../utils/tabManagement';
import type { Account } from '../../../types/accounts';
import type { PaySettings, TaxSettings, TaxFilingStatus } from '../../../types/payroll';
import type { AppearancePreset, ThemeMode } from '../../../types/appearance';
import type { TabConfig } from '../../../types/tabs';
import { Button, FormGroup, InputWithPrefix, RadioGroup, InfoBox, AccountsEditor, EncryptionConfigPanel, ProgressBar, ErrorDialog, TaxLinesEditor, Dropdown, DateInput, Toggle } from '../../_shared';
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

const TAB_STEP_DESCRIPTIONS: Record<string, string> = {
  metrics: 'Year-at-a-glance summary of income, taxes, and how your money is allocated across accounts.',
  breakdown: 'Detailed per-paycheck breakdown showing exactly where each dollar goes.',
  'other-income': 'Record side jobs, bonuses, freelance payments, or any income separate from your main paycheck.',
  bills: 'Track recurring fixed bills and subscriptions tied to each pay period.',
  savings: 'Set aside money for savings goals, emergency funds, and retirement contributions.',
  loans: 'Monitor loan balances, payments, and estimated payoff timelines.',
  taxes: 'Detailed view of your tax withholding and effective rate.',
};

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete, onCancel }) => {
  const { updatePaySettings, updateTaxSettings, updateBudgetSettings, updateBudgetData, budgetData, beginBatch, commitBatch } = useBudget();
  const { errorDialog, openErrorDialog, closeErrorDialog } = useAppDialogs();
  
  const [step, setStep] = useState(1);
  const totalSteps = 7;

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
  const [firstPaycheckDate, setFirstPaycheckDate] = useState('');
  const [minLeftover, setMinLeftover] = useState('0');

  const [taxLines, setTaxLines] = useState<EditableTaxLineValues[]>(() => getDefaultTaxLinesForCurrency(budgetData?.settings?.currency || 'USD'));
  const [hasEditedTaxLines, setHasEditedTaxLines] = useState(false);
  const [taxRatesAutoEstimated, setTaxRatesAutoEstimated] = useState(false);
  const [additionalWithholding, setAdditionalWithholding] = useState('0');
  const [additionalWithholdingError, setAdditionalWithholdingError] = useState<string | undefined>();
  const [filingStatus, setFilingStatus] = useState<TaxFilingStatus>('single');

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

  // Appearance & tab configuration (step 7)
  const [wizardThemeMode, setWizardThemeMode] = useState<ThemeMode>(() => {
    const s = FileStorageService.getAppSettings();
    return s.themeMode ?? 'light';
  });
  const [wizardPreset, setWizardPreset] = useState<AppearancePreset>(() => {
    const s = FileStorageService.getAppSettings();
    return s.appearancePreset ?? 'default';
  });
  const [wizardTabConfigs, setWizardTabConfigs] = useState<TabConfig[]>(() => getDefaultTabConfigs());

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
    beginBatch();
    if (budgetData) {
      updateBudgetSettings({
        ...budgetData.settings,
        currency,
        encryptionEnabled: encryptionEnabled ?? false,
        tabConfigs: wizardTabConfigs,
      });
    }

    // Save pay settings
    const paychecksPerYear = getPaychecksPerYear(payFrequency);
    const computedHoursPerPayPeriod =
      payType === 'hourly'
        ? ((parseFloat(hoursPerWeek) || 0) * 52) / paychecksPerYear
        : undefined;

    const isCalendarEligibleFrequency = payFrequency === 'weekly' || payFrequency === 'bi-weekly';
    const paySettings: PaySettings = {
      payType,
      payFrequency,
      minLeftover: parseFloat(minLeftover) || 0,
      ...(isCalendarEligibleFrequency && firstPaycheckDate ? { firstPaycheckDate } : {}),
      ...(payType === 'salary'
        ? { annualSalary: parseFloat(annualSalary) || 0 }
        : {
            hourlyRate: parseFloat(hourlyRate) || 0,
            hoursPerPayPeriod: computedHoursPerPayPeriod || 0,
          }
      ),
    };
    updatePaySettings(paySettings);

    // Save tax settings
    const taxSettings: TaxSettings = {
      taxLines: validatedTaxLines.map((line) => toStoredTaxLine(line, estimateGrossPerPaycheck())),
      additionalWithholding: parsedWithholding,
      filingStatus,
    };
    updateTaxSettings(taxSettings);

    // Save accounts configured during setup
    updateBudgetData({ accounts });
    commitBatch('Initial plan setup');

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

  const handleWizardThemeChange = (mode: ThemeMode) => {
    const existing = FileStorageService.getAppSettings();
    FileStorageService.saveAppSettings({ ...existing, themeMode: mode, appearanceMode: 'preset', appearancePreset: wizardPreset });
    setWizardThemeMode(mode);
    window.dispatchEvent(new Event(APP_CUSTOM_EVENTS.themeModeChanged));
    window.dispatchEvent(new Event(APP_CUSTOM_EVENTS.appearanceSettingsChanged));
  };

  const handleWizardPresetChange = (preset: AppearancePreset) => {
    const existing = FileStorageService.getAppSettings();
    FileStorageService.saveAppSettings({ ...existing, appearanceMode: 'preset', appearancePreset: preset });
    setWizardPreset(preset);
    window.dispatchEvent(new Event(APP_CUSTOM_EVENTS.appearanceSettingsChanged));
  };

  const handleWizardTabToggle = (tabId: string) => {
    setWizardTabConfigs((prev) => {
      const visibleCount = prev.filter((t) => t.visible).length;
      return prev.map((t) => {
        if (t.id !== tabId) return t;
        if (t.visible && visibleCount <= 1) return t;
        return { ...t, visible: !t.visible };
      });
    });
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

  const applyEstimatedTaxRates = (lines: EditableTaxLineValues[]) => {
    const annualGross = getEstimatedAnnualGross();
    const grossPerPaycheck = estimateGrossPerPaycheck();

    const estimated = estimateTaxSettings({
      currency,
      annualGrossIncome: annualGross,
      annualTaxableIncome: grossPerPaycheck * getPaychecksPerYear(payFrequency),
      paychecksPerYear: getPaychecksPerYear(payFrequency),
      filingStatus,
    });

    const estimatedByLabel = new Map(
      estimated.taxSettings.taxLines.map((line) => [line.label.trim().toLowerCase(), line]),
    );

    return lines.map((line) => {
      const normalizedLabel = line.label.trim().toLowerCase();
      const suggested = estimatedByLabel.get(normalizedLabel);
      const lineWithTaxableIncome = syncEditableTaxLineValues(
        line,
        'taxableIncome',
        (suggested?.taxableIncome ?? grossPerPaycheck).toFixed(2),
        grossPerPaycheck,
      );

      if (!suggested) {
        return lineWithTaxableIncome;
      }

      return syncEditableTaxLineValues(
        lineWithTaxableIncome,
        'rate',
        String(suggested.rate),
        grossPerPaycheck,
      );
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
      case 7:
        return true;
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
                      {`${curr.name} (${curr.symbol})`}
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
                  <li>Appearance theme and which tabs are visible</li>
                </ul>
              </InfoBox>
            </div>
          )}

          {step === 6 && (
            <div className="wizard-step">
              <h2 className="wizard-step-title-with-icon">
                <ShieldCheck className="ui-icon" aria-hidden="true" />
                Security Setup
              </h2>
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

          {step === 7 && (
            <div className="wizard-step">
              <h2 className="wizard-step-title-with-icon">
                <Palette className="ui-icon" aria-hidden="true" />
                Appearance &amp; Tabs
              </h2>
              <p className="step-description">
                Personalize your dashboard theme and choose which tabs are visible when you open your plan.
              </p>

              <div className="wizard-appearance-section">
                <h3 className="wizard-appearance-section-title">Theme</h3>
                <div className="wizard-theme-buttons">
                  {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => {
                    const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor;
                    const label = mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System';
                    return (
                      <button
                        key={mode}
                        type="button"
                        className={`wizard-theme-button${wizardThemeMode === mode ? ' wizard-theme-button--selected' : ''}`}
                        onClick={() => handleWizardThemeChange(mode)}
                      >
                        <Icon className="ui-icon" aria-hidden="true" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="wizard-appearance-section">
                <h3 className="wizard-appearance-section-title">Color Theme</h3>
                <div className="wizard-preset-grid">
                  {APPEARANCE_PRESET_OPTIONS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      className={`wizard-preset-card${wizardPreset === preset.value ? ' wizard-preset-card--selected' : ''}`}
                      onClick={() => handleWizardPresetChange(preset.value)}
                    >
                      <div className="wizard-preset-swatches">
                        <span className="wizard-preset-swatch" style={{ background: preset.preview.accent }} />
                        <span className="wizard-preset-swatch" style={{ background: preset.preview.accentAlt }} />
                        <span className="wizard-preset-swatch" style={{ background: preset.preview.surface }} />
                      </div>
                      <span className="wizard-preset-name">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="wizard-appearance-section">
                <h3 className="wizard-appearance-section-title">Visible Tabs</h3>
                <p className="wizard-tabs-hint">
                  Enable or disable tabs below. You can reorder them anytime by dragging in the tab bar.
                </p>
                <div className="wizard-tabs-list">
                  {wizardTabConfigs.map((tab) => {
                    const TabIcon = tab.icon;
                    return (
                      <div key={tab.id} className="wizard-tab-row">
                        <div className="wizard-tab-info">
                          <TabIcon className="ui-icon wizard-tab-icon" aria-hidden="true" />
                          <div className="wizard-tab-text">
                            <span className="wizard-tab-name">{tab.label}</span>
                            <span className="wizard-tab-description">
                              {TAB_STEP_DESCRIPTIONS[tab.id] ?? ''}
                            </span>
                          </div>
                        </div>
                        <Toggle
                          checked={tab.visible}
                          onChange={() => handleWizardTabToggle(tab.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
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

              {(payFrequency === 'weekly' || payFrequency === 'bi-weekly') && (
                <FormGroup
                  label="First Paycheck Date"
                  helperText="Used to calculate your exact paycheck dates for calendar-accurate monthly and quarterly views."
                >
                  <DateInput
                    value={firstPaycheckDate}
                    onChange={(e) => setFirstPaycheckDate(e.target.value)}
                    data-pay-setting-field="firstPaycheckDate"
                  />
                </FormGroup>
              )}

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
                    <strong>Starter estimates loaded:</strong> These tax percentages use progressive federal brackets,
                    Social Security wage-base capping, and Medicare surtax behavior from the pay amount you entered.
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
                showTaxableIncome={false}
              />

              {currency === 'USD' && (
                <FormGroup label="Federal Filing Status" helperText="Used for IRS federal bracket estimation.">
                  <Dropdown
                    value={filingStatus}
                    onChange={(e) => setFilingStatus(e.target.value as TaxFilingStatus)}
                  >
                    <option value="single">Single</option>
                    <option value="married_filing_jointly">Married Filing Jointly</option>
                  </Dropdown>
                </FormGroup>
              )}

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
                <ArrowLeft className="ui-icon ui-icon-sm" aria-hidden="true" />
                Back
              </Button>
            ) : null
          ) : (
            <Button
              variant="secondary"
              onClick={handlePrevious}
            >
              <ArrowLeft className="ui-icon ui-icon-sm" aria-hidden="true" />
              Previous
            </Button>
          )}
          
          {step < totalSteps ? (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="ui-icon ui-icon-sm" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleComplete}
              disabled={!canProceed()}
            >
              Complete Setup
              <Check className="ui-icon ui-icon-sm" aria-hidden="true" />
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
