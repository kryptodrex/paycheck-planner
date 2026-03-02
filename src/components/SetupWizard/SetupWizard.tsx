import React, { useState, useEffect } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import { getCurrencySymbol, CURRENCIES } from '../../utils/currency';
import { AccountsService } from '../../services/accountsService';
import type { PaySettings, TaxSettings, Account } from '../../types/auth';
import './SetupWizard.css';

interface SetupWizardProps {
  onComplete: () => void;
  onCancel?: () => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete, onCancel }) => {
  const { updatePaySettings, updateTaxSettings, updateBudgetSettings, budgetData } = useBudget();
  
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  // Check if user already has accounts set up
  const [hasExistingAccounts] = useState(AccountsService.hasAccounts());

  // Form state
  const [currency, setCurrency] = useState(budgetData?.settings?.currency || 'USD');
  const [payType, setPayType] = useState<'salary' | 'hourly'>('salary');
  const [annualSalary, setAnnualSalary] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [hoursPerPayPeriod, setHoursPerPayPeriod] = useState('80');
  const [payFrequency, setPayFrequency] = useState<'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly'>('bi-weekly');
  
  const [federalTaxRate, setFederalTaxRate] = useState('12');
  const [stateTaxRate, setStateTaxRate] = useState('5');
  const [additionalWithholding, setAdditionalWithholding] = useState('0');

  // Account configuration - load from global accounts or use defaults
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<Account['type']>('checking');
  const [editingAccountIndex, setEditingAccountIndex] = useState<number | null>(null);
  const [editingAccountName, setEditingAccountName] = useState('');

  // Initialize accounts from global storage
  useEffect(() => {
    if (hasExistingAccounts) {
      setAccounts(AccountsService.getAccounts());
    } else {
      // First time setup - use defaults
      setAccounts(AccountsService.getDefaultAccounts());
    }
  }, [hasExistingAccounts]);

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

  const handleComplete = () => {
    // Save currency setting
    if (budgetData) {
      updateBudgetSettings({
        ...budgetData.settings,
        currency,
      });
    }

    // Save pay settings
    const paySettings: PaySettings = {
      payType,
      payFrequency,
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

    // Save accounts to global storage if this is first-time setup
    if (!hasExistingAccounts) {
      AccountsService.saveAccounts(accounts);
    }

    onComplete();
  };

  const handleAddAccount = () => {
    if (newAccountName.trim()) {
      const newAccount: Account = {
        id: crypto.randomUUID(),
        name: newAccountName.trim(),
        type: newAccountType,
        allocation: 0,
        isRemainder: false,
        color: getColorForAccountType(newAccountType),
      };
      
      // For existing accounts, add to global storage immediately
      if (hasExistingAccounts) {
        AccountsService.addAccount(newAccount.name, newAccount.type);
        setAccounts(AccountsService.getAccounts());
      } else {
        // For first-time setup, just add to local state
        setAccounts([...accounts, newAccount]);
      }
      
      setNewAccountName('');
      setNewAccountType('checking');
    }
  };

  const handleRemoveAccount = (id: string) => {
    if (hasExistingAccounts) {
      // For existing accounts, remove from global storage
      AccountsService.deleteAccount(id);
      setAccounts(AccountsService.getAccounts());
    } else {
      // For first-time setup, just remove from local state
      setAccounts(accounts.filter(acc => acc.id !== id));
    }
  };

  const handleStartEditAccountName = (index: number) => {
    setEditingAccountIndex(index);
    setEditingAccountName(accounts[index].name);
  };

  const handleSaveAccountName = (index: number) => {
    if (editingAccountName.trim()) {
      const account = accounts[index];
      if (hasExistingAccounts) {
        // Update in global storage
        AccountsService.updateAccount(account.id, { name: editingAccountName.trim() });
        setAccounts(AccountsService.getAccounts());
      } else {
        // Update in local state
        const newAccounts = [...accounts];
        newAccounts[index] = { ...account, name: editingAccountName.trim() };
        setAccounts(newAccounts);
      }
    }
    setEditingAccountIndex(null);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return true; // Year is already set
      case 2:
        if (payType === 'salary') {
          return annualSalary && parseFloat(annualSalary) > 0;
        } else {
          return hourlyRate && parseFloat(hourlyRate) > 0 && 
                 hoursPerPayPeriod && parseFloat(hoursPerPayPeriod) > 0;
        }
      case 3:
        return true; // payFrequency is always set to a value
      case 4:
        return true; // Tax settings are optional (can use defaults)
      case 5:
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

              <div className="form-group">
                <label htmlFor="currency">Currency</label>
                <select
                  id="currency"
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
                <small>Choose your local currency for this plan</small>
              </div>

              <div className="info-box">
                <h3>What you'll configure:</h3>
                <ul>
                  <li>Your pay amount and frequency</li>
                  <li>Pre-tax deductions (401k, benefits, etc.)</li>
                  <li>Tax withholding estimates</li>
                  <li>Where your net pay goes (accounts)</li>
                  <li>Your recurring bills and expenses</li>
                </ul>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="wizard-step">
              <h2>How do you get paid?</h2>
              <p className="step-description">
                Tell us whether you're paid a salary or hourly, and how much.
              </p>

              <div className="form-group">
                <label>Pay Type</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="payType"
                      value="salary"
                      checked={payType === 'salary'}
                      onChange={(e) => setPayType(e.target.value as 'salary' | 'hourly')}
                    />
                    <span>Annual Salary</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="payType"
                      value="hourly"
                      checked={payType === 'hourly'}
                      onChange={(e) => setPayType(e.target.value as 'salary' | 'hourly')}
                    />
                    <span>Hourly Wage</span>
                  </label>
                </div>
              </div>

              {payType === 'salary' ? (
                <div className="form-group">
                  <label htmlFor="annualSalary">Annual Salary</label>
                  <div className="input-with-prefix">
                    <span className="prefix">{getCurrencySymbol(currency)}</span>
                    <input
                      type="number"
                      id="annualSalary"
                      value={annualSalary}
                      onChange={(e) => setAnnualSalary(e.target.value)}
                      placeholder="65000"
                      min="0"
                      step="1000"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label htmlFor="hourlyRate">Hourly Rate</label>
                    <div className="input-with-prefix">
                      <span className="prefix">{getCurrencySymbol(currency)}</span>
                      <input
                        type="number"
                        id="hourlyRate"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value)}
                        placeholder="25.00"
                        min="0"
                        step="0.50"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="hoursPerPayPeriod">Hours per Pay Period</label>
                    <input
                      type="number"
                      id="hoursPerPayPeriod"
                      value={hoursPerPayPeriod}
                      onChange={(e) => setHoursPerPayPeriod(e.target.value)}
                      placeholder="80"
                      min="0"
                      step="1"
                    />
                    <small>e.g., 80 hours for bi-weekly pay (40 hrs/week × 2 weeks)</small>
                  </div>
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

              <div className="form-group">
                <div className="radio-group vertical">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="payFrequency"
                      value="weekly"
                      checked={payFrequency === 'weekly'}
                      onChange={(e) => setPayFrequency(e.target.value as any)}
                    />
                    <span>
                      <strong>Weekly</strong>
                      <small>52 paychecks per year</small>
                    </span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="payFrequency"
                      value="bi-weekly"
                      checked={payFrequency === 'bi-weekly'}
                      onChange={(e) => setPayFrequency(e.target.value as any)}
                    />
                    <span>
                      <strong>Bi-weekly</strong>
                      <small>26 paychecks per year (every 2 weeks)</small>
                    </span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="payFrequency"
                      value="semi-monthly"
                      checked={payFrequency === 'semi-monthly'}
                      onChange={(e) => setPayFrequency(e.target.value as any)}
                    />
                    <span>
                      <strong>Semi-monthly</strong>
                      <small>24 paychecks per year (twice a month)</small>
                    </span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="payFrequency"
                      value="monthly"
                      checked={payFrequency === 'monthly'}
                      onChange={(e) => setPayFrequency(e.target.value as any)}
                    />
                    <span>
                      <strong>Monthly</strong>
                      <small>12 paychecks per year</small>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="wizard-step">
              <h2>Tax Withholding</h2>
              <p className="step-description">
                Enter your estimated tax rates. You can update these later or leave them as defaults.
              </p>

              <div className="form-group">
                <label htmlFor="federalTaxRate">Federal Tax Rate (%)</label>
                <input
                  type="number"
                  id="federalTaxRate"
                  value={federalTaxRate}
                  onChange={(e) => setFederalTaxRate(e.target.value)}
                  placeholder="12"
                  min="0"
                  max="50"
                  step="0.5"
                />
                <small>Your estimated federal income tax rate</small>
              </div>

              <div className="form-group">
                <label htmlFor="stateTaxRate">State Tax Rate (%)</label>
                <input
                  type="number"
                  id="stateTaxRate"
                  value={stateTaxRate}
                  onChange={(e) => setStateTaxRate(e.target.value)}
                  placeholder="5"
                  min="0"
                  max="20"
                  step="0.5"
                />
                <small>Your state income tax rate (0 if no state tax)</small>
              </div>

              <div className="form-group">
                <label htmlFor="additionalWithholding">Additional Withholding (per paycheck)</label>
                <div className="input-with-prefix">
                  <span className="prefix">{getCurrencySymbol(currency)}</span>
                  <input
                    type="number"
                    id="additionalWithholding"
                    value={additionalWithholding}
                    onChange={(e) => setAdditionalWithholding(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="10"
                  />
                </div>
                <small>Extra amount to withhold per paycheck (optional)</small>
              </div>

              <div className="info-box">
                <strong>Note:</strong> Social Security (6.2%) and Medicare (1.45%) are automatically included.
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="wizard-step">
              <h2>Where does your money go? 💰</h2>
              <p className="step-description">
                {hasExistingAccounts 
                  ? 'Your existing accounts are listed below. You can add more if needed.'
                  : 'Set up your accounts where you want to allocate your paycheck funds.'}
              </p>

              <div className="form-group">
                <label>Your Accounts</label>
                <div className="accounts-list">
                  {accounts.map((account, index) => (
                    <div key={account.id} className="account-item">
                      <div className="account-info">
                        <div>
                          {editingAccountIndex === index ? (
                            <input
                              autoFocus
                              type="text"
                              className="account-name-input"
                              value={editingAccountName}
                              onChange={(e) => setEditingAccountName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveAccountName(index);
                                } else if (e.key === 'Escape') {
                                  setEditingAccountIndex(null);
                                }
                              }}
                              onBlur={() => handleSaveAccountName(index)}
                            />
                          ) : (
                            <>
                              <span className="account-name">{account.name}</span>
                              <span className="account-type-badge">{account.type}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="account-actions">
                        {editingAccountIndex !== index && (
                          <>
                            <button
                              type="button"
                              className="btn-icon"
                              onClick={() => handleStartEditAccountName(index)}
                              title="Edit name"
                            >
                              ✎
                            </button>
                            {!hasExistingAccounts && (
                              <button
                                type="button"
                                className="btn-icon btn-danger"
                                onClick={() => handleRemoveAccount(account.id)}
                                title="Remove"
                              >
                                ✕
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Add Another Account</label>
                <div className="add-account-form">
                  <div className="form-row">
                    <input
                      type="text"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="e.g., Emergency Fund"
                      className="flex-grow"
                    />
                    <select
                      value={newAccountType}
                      onChange={(e) => setNewAccountType(e.target.value as any)}
                    >
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                      <option value="investment">Investment</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleAddAccount}
                  >
                    + Add Account
                  </button>
                </div>
              </div>

              <div className="info-box">
                <strong>Tip:</strong> {hasExistingAccounts 
                  ? 'These accounts are shared across all your plans. Manage them anytime from Edit → Accounts.'
                  : 'You can always add, remove, or rename accounts later from Edit → Accounts.'}
              </div>
            </div>
          )}
        </div>

        <div className="wizard-footer">
          {step === 1 ? (
            <button
              className="btn btn-secondary"
              onClick={onCancel}
            >
              ← Back
            </button>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={handlePrevious}
            >
              ← Previous
            </button>
          )}
          
          {step < totalSteps ? (
            <button
              className="btn btn-primary"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next →
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleComplete}
              disabled={!canProceed()}
            >
              Complete Setup ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;

function getColorForAccountType(type: string): string {
  const colors: Record<string, string> = {
    checking: '#3b82f6',
    savings: '#10b981',
    investment: '#8b5cf6',
    other: '#6b7280',
  };
  return colors[type] || colors.other;
}
