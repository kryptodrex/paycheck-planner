import React, { useState } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import { formatWithSymbol, getCurrencySymbol } from '../../utils/currency';
import './PayBreakdown.css';

const PayBreakdown: React.FC = () => {
  const { budgetData, calculatePaycheckBreakdown } = useBudget();
  const [viewMode, setViewMode] = useState<'paycheck' | 'monthly' | 'yearly'>('paycheck');

  if (!budgetData) return null;

  const currency = budgetData.settings?.currency || 'USD';
  const breakdown = calculatePaycheckBreakdown();
  
  // Calculate multiplier based on view mode
  let multiplier = 1;
  const paychecksPerYear = getPaychecksPerYear(budgetData.paySettings.payFrequency);
  
  if (viewMode === 'monthly') {
    multiplier = paychecksPerYear / 12;
  } else if (viewMode === 'yearly') {
    multiplier = paychecksPerYear;
  }

  // Apply multiplier to all values
  const displayBreakdown = {
    grossPay: breakdown.grossPay * multiplier,
    preTaxDeductions: breakdown.preTaxDeductions * multiplier,
    taxableIncome: breakdown.taxableIncome * multiplier,
    federalTax: breakdown.federalTax * multiplier,
    stateTax: breakdown.stateTax * multiplier,
    socialSecurity: breakdown.socialSecurity * multiplier,
    medicare: breakdown.medicare * multiplier,
    additionalWithholding: breakdown.additionalWithholding * multiplier,
    totalTaxes: breakdown.totalTaxes * multiplier,
    netPay: breakdown.netPay * multiplier,
  };

  // Calculate percentages for visual bar
  const grossPay = displayBreakdown.grossPay;
  const preTaxPct = (displayBreakdown.preTaxDeductions / grossPay) * 100;
  const taxPct = (displayBreakdown.totalTaxes / grossPay) * 100;
  const netPct = (displayBreakdown.netPay / grossPay) * 100;

  return (
    <div className="pay-breakdown">
      <div className="breakdown-header">
        <div>
          <h2>Pay Breakdown</h2>
          <p>See where your paycheck goes from gross to net</p>
        </div>
        <div className="view-mode-selector">
          <button 
            className={viewMode === 'paycheck' ? 'active' : ''}
            onClick={() => setViewMode('paycheck')}
          >
            Per Paycheck
          </button>
          <button 
            className={viewMode === 'monthly' ? 'active' : ''}
            onClick={() => setViewMode('monthly')}
          >
            Monthly
          </button>
          <button 
            className={viewMode === 'yearly' ? 'active' : ''}
            onClick={() => setViewMode('yearly')}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Visual Flow */}
      <div className="visual-flow">
        <div className="flow-stage">
          <div className="stage-label">START</div>
          <div className="stage-box gross-box">
            <h3>Gross Pay</h3>
            <div className="stage-amount">{formatWithSymbol(displayBreakdown.grossPay, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stage-detail">
              {budgetData.paySettings.payType === 'salary' 
                ? `${formatWithSymbol(budgetData.paySettings.annualSalary || 0, currency, { maximumFractionDigits: 0 })}/year`
                : `${getCurrencySymbol(currency)}${budgetData.paySettings.hourlyRate}/hr × ${budgetData.paySettings.hoursPerPayPeriod} hrs`
              }
            </div>
          </div>
          <div className="stage-arrow">↓</div>
        </div>

        {displayBreakdown.preTaxDeductions > 0 && (
          <div className="flow-stage">
            <div className="stage-box deduction-box">
              <h3>Pre-Tax Deductions</h3>
              <div className="stage-amount negative">-{formatWithSymbol(displayBreakdown.preTaxDeductions, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="stage-detail">
                {budgetData.preTaxDeductions.length} deduction(s)
              </div>
            </div>
            <div className="stage-arrow">↓</div>
          </div>
        )}

        <div className="flow-stage">
          <div className="stage-box taxable-box">
            <h3>Taxable Income</h3>
            <div className="stage-amount">{formatWithSymbol(displayBreakdown.taxableIncome, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stage-detail">Subject to taxes</div>
          </div>
          <div className="stage-arrow">↓</div>
        </div>

        <div className="flow-stage">
          <div className="stage-box taxes-box">
            <h3>Total Taxes</h3>
            <div className="stage-amount negative">-{formatWithSymbol(displayBreakdown.totalTaxes, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stage-breakdown">
              <div className="breakdown-item">
                <span>Federal Tax ({budgetData.taxSettings.federalTaxRate}%)</span>
                <span>{formatWithSymbol(displayBreakdown.federalTax, currency, { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="breakdown-item">
                <span>State Tax ({budgetData.taxSettings.stateTaxRate}%)</span>
                <span>{formatWithSymbol(displayBreakdown.stateTax, currency, { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="breakdown-item">
                <span>Social Security (6.2%)</span>
                <span>{formatWithSymbol(displayBreakdown.socialSecurity, currency, { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="breakdown-item">
                <span>Medicare (1.45%)</span>
                <span>{formatWithSymbol(displayBreakdown.medicare, currency, { maximumFractionDigits: 2 })}</span>
              </div>
              {displayBreakdown.additionalWithholding > 0 && (
                <div className="breakdown-item">
                  <span>Additional Withholding</span>
                  <span>{formatWithSymbol(displayBreakdown.additionalWithholding, currency, { maximumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>
          <div className="stage-arrow">↓</div>
        </div>

        <div className="flow-stage">
          <div className="stage-label">RESULT</div>
          <div className="stage-box net-box">
            <h3>Net Pay (Take Home)</h3>
            <div className="stage-amount">{formatWithSymbol(displayBreakdown.netPay, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stage-detail">{netPct.toFixed(1)}% of gross</div>
          </div>
        </div>
      </div>

      {/* Visual Bar */}
      <div className="breakdown-bar">
        <h3>Visual Breakdown</h3>
        <div className="bar-container">
          {displayBreakdown.preTaxDeductions > 0 && (
            <div 
              className="bar-segment pretax-segment" 
              style={{ width: `${preTaxPct}%` }}
              title={`Pre-Tax: ${formatWithSymbol(displayBreakdown.preTaxDeductions, currency, { maximumFractionDigits: 0 })} (${preTaxPct.toFixed(1)}%)`}
            >
              {preTaxPct > 5 && <span>{preTaxPct.toFixed(1)}%</span>}
            </div>
          )}
          <div 
            className="bar-segment tax-segment" 
            style={{ width: `${taxPct}%` }}
            title={`Taxes: ${formatWithSymbol(displayBreakdown.totalTaxes, currency, { maximumFractionDigits: 0 })} (${taxPct.toFixed(1)}%)`}
          >
            <span>{taxPct.toFixed(1)}%</span>
          </div>
          <div 
            className="bar-segment net-segment" 
            style={{ width: `${netPct}%` }}
            title={`Net Pay: ${formatWithSymbol(displayBreakdown.netPay, currency, { maximumFractionDigits: 0 })} (${netPct.toFixed(1)}%)`}
          >
            <span>{netPct.toFixed(1)}%</span>
          </div>
        </div>
        <div className="bar-labels">
          {displayBreakdown.preTaxDeductions > 0 && (
            <div className="bar-label pretax-label">
              <span className="label-dot pretax-dot"></span>
              Pre-Tax Deductions
            </div>
          )}
          <div className="bar-label tax-label">
            <span className="label-dot tax-dot"></span>
            Taxes
          </div>
          <div className="bar-label net-label">
            <span className="label-dot net-dot"></span>
            Take Home
          </div>
        </div>
      </div>

      {/* Account Allocations */}
      {budgetData.accounts.length > 0 && (
        <div className="account-allocations">
          <h3>Account Allocations</h3>
          <p className="section-description">Where your net pay goes</p>
          <div className="allocations-grid">
            {budgetData.accounts.map(account => {
              const accountAmount = account.isRemainder 
                ? 0 // Will be calculated later
                : account.allocation * multiplier;
              
              return (
                <div key={account.id} className="allocation-card">
                  <div className="allocation-header">
                    <span className="account-icon">{account.icon || '💰'}</span>
                    <div>
                      <h4>{account.name}</h4>
                      <span className="account-type">{account.type}</span>
                    </div>
                  </div>
                  <div className="allocation-amount">
                    {account.isRemainder ? (
                      <span className="remainder-badge">Remainder</span>
                    ) : (
                      formatWithSymbol(accountAmount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

function getPaychecksPerYear(frequency: string): number {
  switch (frequency) {
    case 'weekly': return 52;
    case 'bi-weekly': return 26;
    case 'semi-monthly': return 24;
    case 'monthly': return 12;
    default: return 26;
  }
}

export default PayBreakdown;
