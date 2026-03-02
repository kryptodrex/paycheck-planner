import  React, { useState, useEffect } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import type { BillFrequency, PaySettings, TaxSettings } from '../../types/auth';
import { formatWithSymbol, CURRENCIES, getCurrencySymbol } from '../../utils/currency';
import './KeyMetrics.css';

interface KeyMetricsProps {
  showEditModal?: boolean;
  onCloseEditModal?: () => void;
}

const KeyMetrics: React.FC<KeyMetricsProps> = ({ showEditModal: externalShowEditModal, onCloseEditModal }) => {
  const { budgetData, calculatePaycheckBreakdown, updatePaySettings, updateTaxSettings, updateBudgetSettings } = useBudget();
  const [internalShowEditModal, setInternalShowEditModal] = useState(false);
  const showEditModal = externalShowEditModal ?? internalShowEditModal;
  const setShowEditModal = onCloseEditModal ? (value: boolean) => { if (!value) onCloseEditModal(); } : setInternalShowEditModal;
  
  // Form state for editing
  const [editPayType, setEditPayType] = useState<'salary' | 'hourly'>('salary');
  const [editAnnualSalary, setEditAnnualSalary] = useState('');
  const [editHourlyRate, setEditHourlyRate] = useState('');
  const [editHoursPerPayPeriod, setEditHoursPerPayPeriod] = useState('');
  const [editPayFrequency, setEditPayFrequency] = useState<'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly'>('bi-weekly');
  const [editFederalTaxRate, setEditFederalTaxRate] = useState('');
  const [editStateTaxRate, setEditStateTaxRate] = useState('');
  const [editAdditionalWithholding, setEditAdditionalWithholding] = useState('');
  const [editCurrency, setEditCurrency] = useState('USD');

  // Pre-fill form when modal opens (either internally or externally controlled)
  useEffect(() => {
    if (showEditModal && budgetData) {
      setEditPayType(budgetData.paySettings.payType);
      setEditPayFrequency(budgetData.paySettings.payFrequency);
      setEditAnnualSalary(budgetData.paySettings.annualSalary?.toString() || '');
      setEditHourlyRate(budgetData.paySettings.hourlyRate?.toString() || '');
      setEditHoursPerPayPeriod(budgetData.paySettings.hoursPerPayPeriod?.toString() || '');
      setEditFederalTaxRate(budgetData.taxSettings.federalTaxRate.toString());
      setEditStateTaxRate(budgetData.taxSettings.stateTaxRate.toString());
      setEditAdditionalWithholding(budgetData.taxSettings.additionalWithholding.toString());
      setEditCurrency(budgetData.settings.currency || 'USD');
    }
  }, [showEditModal, budgetData]);

  // Handle Esc key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showEditModal) {
        setShowEditModal(false);
      }
    };

    if (showEditModal) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showEditModal]);

  if (!budgetData) return null;

  const handleSaveSettings = () => {
    // Save pay settings
    const paySettings: PaySettings = {
      payType: editPayType,
      payFrequency: editPayFrequency,
      ...(editPayType === 'salary' 
        ? { annualSalary: parseFloat(editAnnualSalary) || 0 }
        : { 
            hourlyRate: parseFloat(editHourlyRate) || 0,
            hoursPerPayPeriod: parseFloat(editHoursPerPayPeriod) || 0
          }
      ),
    };
    updatePaySettings(paySettings);

    // Save tax settings
    const taxSettings: TaxSettings = {
      federalTaxRate: parseFloat(editFederalTaxRate) || 0,
      stateTaxRate: parseFloat(editStateTaxRate) || 0,
      socialSecurityRate: 6.2,
      medicareRate: 1.45,
      additionalWithholding: parseFloat(editAdditionalWithholding) || 0,
    };
    updateTaxSettings(taxSettings);

    // Save currency settings
    if (budgetData) {
      updateBudgetSettings({
        ...budgetData.settings,
        currency: editCurrency,
      });
    }

    setShowEditModal(false);
  };

  const breakdown = calculatePaycheckBreakdown();

  // Calculate annualized values
  const paychecksPerYear = getPaychecksPerYear(budgetData.paySettings.payFrequency);
  const annualGross = breakdown.grossPay * paychecksPerYear;
  const annualNet = breakdown.netPay * paychecksPerYear;
  const annualTaxes = breakdown.totalTaxes * paychecksPerYear;

  // Calculate total bills (annualized)
  const annualBills = budgetData.bills.reduce((sum, bill) => {
    return sum + annualizeBillAmount(bill.amount, bill.frequency);
  }, 0);

  // Calculate monthly averages
  const monthlyGross = annualGross / 12;
  const monthlyNet = annualNet / 12;
  const monthlyTaxes = annualTaxes / 12;
  const monthlyBills = annualBills / 12;

  // Calculate remaining/free money
  const annualRemaining = annualNet - annualBills;
  const monthlyRemaining = annualRemaining / 12;

  // Calculate savings rate
  const savingsAccounts = budgetData.accounts.filter(a => a.type === 'savings');
  const annualSavings = savingsAccounts.reduce((sum, account) => {
    if (account.isRemainder) return 0; // Can't calculate remainder yet
    return sum + (account.allocation * paychecksPerYear);
  }, 0);
  const savingsRate = annualGross > 0 ? (annualSavings / annualGross) * 100 : 0;

  // Get currency from budget settings
  const currency = budgetData.settings.currency || 'USD';

  return (
    <div className="key-metrics">
      <div className="metrics-header">
        <div>
          <h2>Key Metrics</h2>
          <p>Your financial overview at a glance</p>
        </div>
      </div>

      <div className="metrics-grid">
        {/* Income Card */}
        <div className="metric-card income-card">
          <div className="metric-icon">💰</div>
          <h3>Total Income</h3>
          <div className="metric-values">
            <div className="metric-primary">
              <span className="label">Yearly</span>
              <span className="value">{formatWithSymbol(annualGross, currency, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Monthly</span>
              <span className="value">{formatWithSymbol(monthlyGross, currency, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Per Paycheck</span>
              <span className="value">{formatWithSymbol(breakdown.grossPay, currency, { maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Taxes Card */}
        <div className="metric-card taxes-card">
          <div className="metric-icon">🏛️</div>
          <h3>Taxes</h3>
          <div className="metric-values">
            <div className="metric-primary">
              <span className="label">Yearly</span>
              <span className="value">{formatWithSymbol(annualTaxes, currency, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Monthly</span>
              <span className="value">{formatWithSymbol(monthlyTaxes, currency, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Effective Rate</span>
              <span className="value">{((annualTaxes / annualGross) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Net Pay Card */}
        <div className="metric-card net-card">
          <div className="metric-icon">✅</div>
          <h3>Net Pay (Take Home)</h3>
          <div className="metric-values">
            <div className="metric-primary">
              <span className="label">Yearly</span>
              <span className="value">{formatWithSymbol(annualNet, currency, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Monthly</span>
              <span className="value">{formatWithSymbol(monthlyNet, currency, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Per Paycheck</span>
              <span className="value">{formatWithSymbol(breakdown.netPay, currency, { maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Bills Card */}
        <div className="metric-card bills-card">
          <div className="metric-icon">📋</div>
          <h3>Total Bills</h3>
          <div className="metric-values">
            <div className="metric-primary">
              <span className="label">Yearly</span>
              <span className="value">{formatWithSymbol(annualBills, currency, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Monthly</span>
              <span className="value">{formatWithSymbol(monthlyBills, currency, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Count</span>
              <span className="value">{budgetData.bills.length} bills</span>
            </div>
          </div>
        </div>

        {/* Remaining Card */}
        <div className="metric-card remaining-card">
          <div className="metric-icon">💵</div>
          <h3>Remaining (After Bills)</h3>
          <div className="metric-values">
            <div className="metric-primary">
              <span className="label">Yearly</span>
              <span className="value">{formatWithSymbol(annualRemaining, currency, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Monthly</span>
              <span className="value">{formatWithSymbol(monthlyRemaining, currency, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">% of Net</span>
              <span className="value">{((annualRemaining / annualNet) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Savings Rate Card */}
        <div className="metric-card savings-card">
          <div className="metric-icon">🏦</div>
          <h3>Savings Rate</h3>
          <div className="metric-values">
            <div className="metric-primary">
              <span className="label">Rate</span>
              <span className="value">{savingsRate.toFixed(1)}%</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Yearly Savings</span>
              <span className="value">{formatWithSymbol(annualSavings, currency, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Monthly Savings</span>
              <span className="value">{formatWithSymbol(annualSavings / 12, currency, { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="summary-bar">
        <h3>Money Flow Summary</h3>
        <div className="flow-visual">
          <div 
            className="flow-segment income-segment" 
            style={{ width: '100%' }}
            title={`Gross Income: ${formatWithSymbol(annualGross, currency, { maximumFractionDigits: 0 })}`}
          >
            <span>Gross: {getCurrencySymbol(currency)}{(annualGross / 1000).toFixed(0)}k</span>
          </div>
          <div className="flow-arrow">→</div>
          <div 
            className="flow-segment taxes-segment" 
            style={{ width: `${(annualTaxes / annualGross) * 100}%` }}
            title={`Taxes: ${formatWithSymbol(annualTaxes, currency, { maximumFractionDigits: 0 })}`}
          >
            <span>Taxes: {getCurrencySymbol(currency)}{(annualTaxes / 1000).toFixed(0)}k</span>
          </div>
          <div className="flow-arrow">→</div>
          <div 
            className="flow-segment net-segment" 
            style={{ width: `${(annualNet / annualGross) * 100}%` }}
            title={`Net Pay: ${formatWithSymbol(annualNet, currency, { maximumFractionDigits: 0 })}`}
          >
            <span>Net: {getCurrencySymbol(currency)}{(annualNet / 1000).toFixed(0)}k</span>
          </div>
          <div className="flow-arrow">→</div>
          <div 
            className="flow-segment bills-segment" 
            style={{ width: `${(annualBills / annualGross) * 100}%` }}
            title={`Bills: ${formatWithSymbol(annualBills, currency, { maximumFractionDigits: 0 })}`}
          >
            <span>Bills: {getCurrencySymbol(currency)}{(annualBills / 1000).toFixed(0)}k</span>
          </div>
          <div className="flow-arrow">→</div>
          <div 
            className="flow-segment remaining-segment" 
            style={{ width: `${(annualRemaining / annualGross) * 100}%` }}
            title={`Remaining: ${formatWithSymbol(annualRemaining, currency, { maximumFractionDigits: 0 })}`}
          >
            <span>Left: {getCurrencySymbol(currency)}{(annualRemaining / 1000).toFixed(0)}k</span>
          </div>
        </div>
      </div>

      {/* Edit Pay Settings Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Pay Settings</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Pay Type</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="editPayType"
                      value="salary"
                      checked={editPayType === 'salary'}
                      onChange={(e) => setEditPayType(e.target.value as 'salary' | 'hourly')}
                    />
                    <span>Annual Salary</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="editPayType"
                      value="hourly"
                      checked={editPayType === 'hourly'}
                      onChange={(e) => setEditPayType(e.target.value as 'salary' | 'hourly')}
                    />
                    <span>Hourly Wage</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="editCurrency">Currency</label>
                <select
                  id="editCurrency"
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value)}
                >
                  {CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.symbol} - {curr.name} ({curr.code})
                    </option>
                  ))}
                </select>
              </div>

              {editPayType === 'salary' ? (
                <div className="form-group">
                  <label htmlFor="editAnnualSalary">Annual Salary</label>
                  <div className="input-with-prefix">
                    <span className="prefix">{getCurrencySymbol(editCurrency)}</span>
                    <input
                      type="number"
                      id="editAnnualSalary"
                      value={editAnnualSalary}
                      onChange={(e) => setEditAnnualSalary(e.target.value)}
                      placeholder="65000"
                      min="0"
                      step="1000"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label htmlFor="editHourlyRate">Hourly Rate</label>
                    <div className="input-with-prefix">
                      <span className="prefix">{getCurrencySymbol(editCurrency)}</span>
                      <input
                        type="number"
                        id="editHourlyRate"
                        value={editHourlyRate}
                        onChange={(e) => setEditHourlyRate(e.target.value)}
                        placeholder="25.00"
                        min="0"
                        step="0.50"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="editHoursPerPayPeriod">Hours per Pay Period</label>
                    <input
                      type="number"
                      id="editHoursPerPayPeriod"
                      value={editHoursPerPayPeriod}
                      onChange={(e) => setEditHoursPerPayPeriod(e.target.value)}
                      placeholder="80"
                      min="0"
                      step="1"
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Pay Frequency</label>
                <div className="radio-group vertical">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="editPayFrequency"
                      value="weekly"
                      checked={editPayFrequency === 'weekly'}
                      onChange={(e) => setEditPayFrequency(e.target.value as any)}
                    />
                    <span>Weekly (52 per year)</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="editPayFrequency"
                      value="bi-weekly"
                      checked={editPayFrequency === 'bi-weekly'}
                      onChange={(e) => setEditPayFrequency(e.target.value as any)}
                    />
                    <span>Bi-weekly (26 per year)</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="editPayFrequency"
                      value="semi-monthly"
                      checked={editPayFrequency === 'semi-monthly'}
                      onChange={(e) => setEditPayFrequency(e.target.value as any)}
                    />
                    <span>Semi-monthly (24 per year)</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="editPayFrequency"
                      value="monthly"
                      checked={editPayFrequency === 'monthly'}
                      onChange={(e) => setEditPayFrequency(e.target.value as any)}
                    />
                    <span>Monthly (12 per year)</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="editFederalTaxRate">Federal Tax Rate (%)</label>
                <input
                  type="number"
                  id="editFederalTaxRate"
                  value={editFederalTaxRate}
                  onChange={(e) => setEditFederalTaxRate(e.target.value)}
                  placeholder="12"
                  min="0"
                  max="50"
                  step="0.5"
                />
              </div>

              <div className="form-group">
                <label htmlFor="editStateTaxRate">State Tax Rate (%)</label>
                <input
                  type="number"
                  id="editStateTaxRate"
                  value={editStateTaxRate}
                  onChange={(e) => setEditStateTaxRate(e.target.value)}
                  placeholder="5"
                  min="0"
                  max="20"
                  step="0.5"
                />
              </div>

              <div className="form-group">
                <label htmlFor="editAdditionalWithholding">Additional Withholding (per paycheck)</label>
                <div className="input-with-prefix">
                  <span className="prefix">{getCurrencySymbol(editCurrency)}</span>
                  <input
                    type="number"
                    id="editAdditionalWithholding"
                    value={editAdditionalWithholding}
                    onChange={(e) => setEditAdditionalWithholding(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="10"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveSettings}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions
function getPaychecksPerYear(frequency: string): number {
  switch (frequency) {
    case 'weekly': return 52;
    case 'bi-weekly': return 26;
    case 'semi-monthly': return 24;
    case 'monthly': return 12;
    default: return 26;
  }
}

function annualizeBillAmount(amount: number, frequency: BillFrequency): number {
  switch (frequency) {
    case 'weekly': return amount * 52;
    case 'bi-weekly': return amount * 26;
    case 'monthly': return amount * 12;
    case 'quarterly': return amount * 4;
    case 'semi-annual': return amount * 2;
    case 'yearly': return amount;
    case 'custom': return amount * 12; // Default to monthly for custom
    default: return amount * 12;
  }
}

export default KeyMetrics;
