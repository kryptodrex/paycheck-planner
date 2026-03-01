import React from 'react';
import { useBudget } from '../contexts/BudgetContext';
import type { BillFrequency } from '../types/auth';
import './KeyMetrics.css';

const KeyMetrics: React.FC = () => {
  const { budgetData, calculatePaycheckBreakdown } = useBudget();

  if (!budgetData) return null;

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

  return (
    <div className="key-metrics">
      <div className="metrics-header">
        <h2>Key Metrics</h2>
        <p>Your financial overview at a glance</p>
      </div>

      <div className="metrics-grid">
        {/* Income Card */}
        <div className="metric-card income-card">
          <div className="metric-icon">💰</div>
          <h3>Total Income</h3>
          <div className="metric-values">
            <div className="metric-primary">
              <span className="label">Yearly</span>
              <span className="value">${annualGross.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Monthly</span>
              <span className="value">${monthlyGross.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Per Paycheck</span>
              <span className="value">${breakdown.grossPay.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
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
              <span className="value">${annualTaxes.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Monthly</span>
              <span className="value">${monthlyTaxes.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
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
              <span className="value">${annualNet.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Monthly</span>
              <span className="value">${monthlyNet.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Per Paycheck</span>
              <span className="value">${breakdown.netPay.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
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
              <span className="value">${annualBills.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Monthly</span>
              <span className="value">${monthlyBills.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
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
              <span className="value">${annualRemaining.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Monthly</span>
              <span className="value">${monthlyRemaining.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
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
              <span className="value">${annualSavings.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Monthly Savings</span>
              <span className="value">${(annualSavings / 12).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
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
            title={`Gross Income: $${annualGross.toLocaleString()}`}
          >
            <span>Gross: ${(annualGross / 1000).toFixed(0)}k</span>
          </div>
          <div className="flow-arrow">→</div>
          <div 
            className="flow-segment taxes-segment" 
            style={{ width: `${(annualTaxes / annualGross) * 100}%` }}
            title={`Taxes: $${annualTaxes.toLocaleString()}`}
          >
            <span>Taxes: ${(annualTaxes / 1000).toFixed(0)}k</span>
          </div>
          <div className="flow-arrow">→</div>
          <div 
            className="flow-segment net-segment" 
            style={{ width: `${(annualNet / annualGross) * 100}%` }}
            title={`Net Pay: $${annualNet.toLocaleString()}`}
          >
            <span>Net: ${(annualNet / 1000).toFixed(0)}k</span>
          </div>
          <div className="flow-arrow">→</div>
          <div 
            className="flow-segment bills-segment" 
            style={{ width: `${(annualBills / annualGross) * 100}%` }}
            title={`Bills: $${annualBills.toLocaleString()}`}
          >
            <span>Bills: ${(annualBills / 1000).toFixed(0)}k</span>
          </div>
          <div className="flow-arrow">→</div>
          <div 
            className="flow-segment remaining-segment" 
            style={{ width: `${(annualRemaining / annualGross) * 100}%` }}
            title={`Remaining: $${annualRemaining.toLocaleString()}`}
          >
            <span>Left: ${(annualRemaining / 1000).toFixed(0)}k</span>
          </div>
        </div>
      </div>
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
