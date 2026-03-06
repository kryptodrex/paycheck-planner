import React, { useState } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import { getCurrencySymbol, CURRENCIES } from '../../utils/currency';
import { KeychainService } from '../../services/keychainService';
import { FileStorageService } from '../../services/fileStorage';
import EncryptionConfigPanel from '../EncryptionSetup/EncryptionConfigPanel';
import type { PaySettings, TaxSettings, Account } from '../../types/auth';
import { Button, FormGroup, InputWithPrefix, RadioGroup, InfoBox } from '../shared';
import './SetupWizard.css';

interface SetupWizardProps {
  onComplete: () => void;
  onCancel?: () => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete, onCancel }) => {
  const { updatePaySettings, updateTaxSettings, updateBudgetSettings, budgetData } = useBudget();
  
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
  const [hoursPerPayPeriod, setHoursPerPayPeriod] = useState('80');
  const [payFrequency, setPayFrequency] = useState<'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly'>('bi-weekly');
  const [minLeftover, setMinLeftover] = useState('0');
  
  const [federalTaxRate, setFederalTaxRate] = useState('12');
  const [stateTaxRate, setStateTaxRate] = useState('5');
  const [additionalWithholding, setAdditionalWithholding] = useState('0');

  // Account configuration - start with default "My Checking" account
  const [accounts, setAccounts] = useState<Account[]>([
    {
      id: crypto.randomUUID(),
      name: 'My Checking',
      type: 'checking',
      color: getDefaultColorForType('checking'),
      icon: getDefaultIconForType('checking'),
    },
  ]);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<Account['type']>('checking');
  const [newAccountIcon, setNewAccountIcon] = useState(getDefaultIconForType('checking'));
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingAccountName, setEditingAccountName] = useState('');
  const [editingAccountIcon, setEditingAccountIcon] = useState('');
  const [editingAccountType, setEditingAccountType] = useState<Account['type']>('checking');

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
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
        alert('Please generate or enter an encryption key.');
        return;
      }
      // Save the encryption key to keychain
      await KeychainService.saveKey(budgetData.id, keyToUse);
    }

    // Proceed to next step
    handleNext();
  };

  const handleComplete = async () => {
    // Save currency setting
    if (budgetData) {
      updateBudgetSettings({
        ...budgetData.settings,
        currency,
        encryptionEnabled: encryptionEnabled ?? false,
      });
    }

    // Save pay settings
    const paySettings: PaySettings = {
      payType,
      payFrequency,
      minLeftover: parseFloat(minLeftover) || 0,
      ...(payType === 'salary' 
        ? { annualSalary: parseFloat(annualSalary) || 0 }
        : { 
            hourlyRate: parseFloat(hourlyRate) || 0,
            hoursPerPayPeriod: parseFloat(hoursPerPayPeriod) || 0
          }
      ),
    };
    updatePaySettings(paySettings);

    // Save tax settings
    const taxSettings: TaxSettings = {
      federalTaxRate: parseFloat(federalTaxRate) || 0,
      stateTaxRate: parseFloat(stateTaxRate) || 0,
      socialSecurityRate: 6.2,
      medicareRate: 1.45,
      additionalWithholding: parseFloat(additionalWithholding) || 0,
    };
    updateTaxSettings(taxSettings);

    onComplete();
  };

  const handleAddAccount = () => {
    if (!newAccountName.trim()) {
      return;
    }

    const newAccount: Account = {
      id: crypto.randomUUID(),
      name: newAccountName.trim(),
      type: newAccountType,
      color: getDefaultColorForType(newAccountType),
      icon: newAccountIcon.trim() || getDefaultIconForType(newAccountType),
    };
    
    setAccounts((prev) => [...prev, newAccount]);
    setNewAccountName('');
    setNewAccountType('checking');
    setNewAccountIcon(getDefaultIconForType('checking'));
  };

  const handleRemoveAccount = (id: string) => {
    if (accounts.length <= 1) {
      alert('You must have at least one account');
      return;
    }
    setAccounts(accounts.filter(acc => acc.id !== id));
  };

  const handleStartEdit = (account: Account) => {
    setEditingAccountId(account.id);
    setEditingAccountName(account.name);
    setEditingAccountIcon(account.icon || getDefaultIconForType(account.type));
    setEditingAccountType(account.type);
  };

  const handleCancelEdit = () => {
    setEditingAccountId(null);
    setEditingAccountName('');
    setEditingAccountIcon('');
    setEditingAccountType('checking');
  };

  const handleSaveEdit = (accountId: string) => {
    if (!editingAccountName.trim()) {
      handleCancelEdit();
      return;
    }

    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId
          ? {
              ...acc,
              name: editingAccountName.trim(),
              icon: editingAccountIcon.trim() || getDefaultIconForType(editingAccountType),
              type: editingAccountType,
              color: getDefaultColorForType(editingAccountType),
            }
          : acc
      )
    );
    handleCancelEdit();
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return true; // Year and currency are always set
      case 2:
        return encryptionEnabled !== null; // Must have chosen encryption or no encryption
      case 3:
        if (payType === 'salary') {
          return annualSalary && parseFloat(annualSalary) > 0;
        } else {
          return hourlyRate && parseFloat(hourlyRate) > 0 && 
                 hoursPerPayPeriod && parseFloat(hoursPerPayPeriod) > 0;
        }
      case 4:
        return true; // payFrequency is always set to a value
      case 5:
        return true; // Tax settings are optional (can use defaults)
      case 6:
        return accounts.length > 0; // Need at least one account
      default:
        return false;
    }
  };

  return (
    <div className="setup-wizard">
      <div className="wizard-container">
        <div className="wizard-header">
          <h1>Setup Your Paycheck Plan</h1>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(step / totalSteps) * 100}%` }}
            ></div>
          </div>
          <p className="step-indicator">Step {step} of {totalSteps}</p>
        </div>

        <div className="wizard-content">
          {step === 1 && (
            <div className="wizard-step">
              <h2>Welcome to Paycheck Planner! 🎉</h2>
              <p className="step-description">
                You're planning for <strong>{budgetData?.year}</strong>. 
                Let's set up how you get paid so we can help you plan where every paycheck goes.
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
                <h3>What you'll configure:</h3>
                <ul>
                  <li>Your pay amount and frequency</li>
                  <li>Pre-tax deductions (401k, benefits, etc.)</li>
                  <li>Tax withholding estimates</li>
                  <li>Where your net pay goes (accounts)</li>
                  <li>Your recurring bills and expenses</li>
                </ul>
              </InfoBox>
            </div>
          )}

          {step === 2 && (
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

          {step === 3 && (
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
                    placeholder="65000"
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
                      placeholder="25.00"
                      min="0"
                      step="0.50"
                    />
                  </FormGroup>
                  <FormGroup label="Hours per Pay Period" helperText="e.g., 80 hours for bi-weekly pay (40 hrs/week × 2 weeks)">
                    <input
                      type="number"
                      value={hoursPerPayPeriod}
                      onChange={(e) => setHoursPerPayPeriod(e.target.value)}
                      placeholder="80"
                      min="0"
                      step="1"
                    />
                  </FormGroup>
                </>
              )}
            </div>
          )}

          {step === 4 && (
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

              <FormGroup 
                label="Minimum Leftover Per Paycheck" 
                helperText="The minimum amount you want to keep unallocated for spending (groceries, shopping, etc.). This will warn you if allocations leave less than this amount."
              >
                <InputWithPrefix
                  prefix="$"
                  type="number"
                  value={minLeftover}
                  onChange={(e) => setMinLeftover(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="10"
                />
              </FormGroup>
            </div>
          )}

          {step === 5 && (
            <div className="wizard-step">
              <h2>Tax Withholding</h2>
              <p className="step-description">
                Enter your estimated tax rates. You can update these later or leave them as defaults.
              </p>

              <FormGroup label="Federal Tax Rate (%)" helperText="Your estimated federal income tax rate">
                <input
                  type="number"
                  value={federalTaxRate}
                  onChange={(e) => setFederalTaxRate(e.target.value)}
                  placeholder="12"
                  min="0"
                  max="50"
                  step="0.5"
                />
              </FormGroup>

              <FormGroup label="State Tax Rate (%)" helperText="Your state income tax rate (0 if no state tax)">
                <input
                  type="number"
                  value={stateTaxRate}
                  onChange={(e) => setStateTaxRate(e.target.value)}
                  placeholder="5"
                  min="0"
                  max="20"
                  step="0.5"
                />
              </FormGroup>

              <FormGroup 
                label="Additional Withholding (per paycheck)" 
                helperText="Extra tax amount withheld per paycheck and sent to the IRS. Use this if you owe taxes at year-end or want to increase your refund. This is already subtracted from your net pay."
              >
                <InputWithPrefix
                  prefix={getCurrencySymbol(currency)}
                  type="number"
                  value={additionalWithholding}
                  onChange={(e) => setAdditionalWithholding(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="10"
                />
              </FormGroup>

              <InfoBox>
                <p>
                  <strong>Note:</strong> Social Security (6.2%) and Medicare (1.45%) are automatically included.
                </p>
              </InfoBox>
            </div>
          )}

          {step === 6 && (
            <div className="wizard-step">
              <h2>Where does your money go? 💰</h2>
              <p className="step-description">
                Set up your accounts where you want to allocate your paycheck funds. We've created a default checking account to get you started.
              </p>

              <FormGroup label="Your Accounts">
                <div className="accounts-list">
                  {accounts.map((account) => (
                    <div key={account.id} className="account-item">
                      {editingAccountId === account.id ? (
                        <div className="account-edit-form">
                          <input
                            type="text"
                            className="account-icon-input"
                            value={editingAccountIcon}
                            onChange={(e) => setEditingAccountIcon(e.target.value)}
                            placeholder="💰"
                            maxLength={2}
                          />
                          <input
                            autoFocus
                            type="text"
                            className="account-name-input"
                            value={editingAccountName}
                            onChange={(e) => setEditingAccountName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEdit(account.id);
                              } else if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                          />
                          <select
                            className="account-type-select"
                            value={editingAccountType}
                            onChange={(e) => {
                              const newType = e.target.value as Account['type'];
                              setEditingAccountType(newType);
                              if (!editingAccountIcon || editingAccountIcon === getDefaultIconForType(account.type)) {
                                setEditingAccountIcon(getDefaultIconForType(newType));
                              }
                            }}
                          >
                            <option value="checking">Checking</option>
                            <option value="savings">Savings</option>
                            <option value="investment">Investment</option>
                            <option value="other">Other</option>
                          </select>
                          <div className="account-edit-actions">
                            <Button
                              variant="secondary"
                              size="small"
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="primary"
                              size="small"
                              onClick={() => handleSaveEdit(account.id)}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="account-details">
                            <div className="account-name-display">
                              <span className="account-icon-display">{account.icon || getDefaultIconForType(account.type)}</span>
                              <div className="account-info-text">
                                <h4>{account.name}</h4>
                                <span className="account-type">{account.type}</span>
                              </div>
                            </div>
                          </div>
                          <div className="account-actions">
                            <Button
                              variant="icon"
                              onClick={() => handleStartEdit(account)}
                              title="Edit account"
                            >
                              ✎
                            </Button>
                            <Button
                              variant="icon"
                              onClick={() => handleRemoveAccount(account.id)}
                              title="Delete account"
                            >
                              🗑
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </FormGroup>

              <FormGroup label="Add Another Account">
                <div className="add-account-form">
                  <div className="add-account-row">
                    <div className="add-account-field add-account-icon-field">
                      <label className="add-account-label">Icon</label>
                      <input
                        type="text"
                        className="account-icon-input"
                        placeholder="💰"
                        value={newAccountIcon}
                        onChange={(e) => setNewAccountIcon(e.target.value)}
                        maxLength={2}
                        title="Icon (emoji)"
                      />
                    </div>
                    <div className="add-account-field add-account-name-field">
                      <label className="add-account-label">Account Name</label>
                      <input
                        type="text"
                        className="account-name-input"
                        placeholder="e.g., Emergency Fund, Checking"
                        value={newAccountName}
                        onChange={(e) => setNewAccountName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddAccount();
                          }
                        }}
                      />
                    </div>
                    <div className="add-account-field add-account-type-field">
                      <label className="add-account-label">Type</label>
                      <select
                        className="account-type-select"
                        value={newAccountType}
                        onChange={(e) => {
                          const newType = e.target.value as Account['type'];
                          setNewAccountType(newType);
                          setNewAccountIcon(getDefaultIconForType(newType));
                        }}
                      >
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                        <option value="investment">Investment</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddAccount}
                    disabled={!newAccountName.trim()}
                  >
                    + Add Account
                  </Button>
                </div>
              </FormGroup>

              <InfoBox>
                <p>
                  <strong>Tip:</strong> You can always add, remove, or rename accounts later from Edit → Accounts.
                </p>
              </InfoBox>
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
                if (step === 2) {
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
    </div>
  );
};

export default SetupWizard;

function getDefaultColorForType(type: Account['type']): string {
  switch (type) {
    case 'checking':
      return '#667eea';
    case 'savings':
      return '#f093fb';
    case 'investment':
      return '#4facfe';
    case 'other':
      return '#43e97b';
    default:
      return '#667eea';
  }
}

function getDefaultIconForType(type: Account['type']): string {
  switch (type) {
    case 'checking':
      return '💳';
    case 'savings':
      return '💰';
    case 'investment':
      return '📈';
    case 'other':
      return '💵';
    default:
      return '💰';
  }
}
