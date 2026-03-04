import React, { useState } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import { formatWithSymbol, getCurrencySymbol } from '../../utils/currency';
import { Button, InputWithPrefix } from '../shared';
import './TaxBreakdown.css';

const TaxBreakdown: React.FC = () => {
  const { budgetData, calculatePaycheckBreakdown, updateBudgetData } = useBudget();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    federalTaxRate: 0,
    stateTaxRate: 0,
    additionalWithholding: 0,
  });

  if (!budgetData) return null;

  const currency = budgetData.settings?.currency || 'USD';
  const breakdown = calculatePaycheckBreakdown();
  const taxSettings = budgetData.taxSettings;

  const handleEditStart = () => {
    setEditForm({
      federalTaxRate: taxSettings.federalTaxRate,
      stateTaxRate: taxSettings.stateTaxRate,
      additionalWithholding: taxSettings.additionalWithholding,
    });
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
  };

  const handleEditSave = () => {
    updateBudgetData({
      taxSettings: {
        ...taxSettings,
        federalTaxRate: editForm.federalTaxRate,
        stateTaxRate: editForm.stateTaxRate,
        additionalWithholding: editForm.additionalWithholding,
      },
    });
    setIsEditing(false);
  };

  const handleFieldChange = (field: string, value: number) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="tax-breakdown">
      <div className="breakdown-header">
        <div>
          <h2>Tax Breakdown</h2>
          <p>View and manage your tax withholding information</p>
        </div>
        {!isEditing && (
          <Button variant="secondary" onClick={handleEditStart}>
            ⚙️ Edit Tax Settings
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="tax-edit-section">
          <h3>Edit Tax Settings</h3>
          
          <div className="edit-form">
            <div className="form-group">
              <label>Federal Tax Rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={editForm.federalTaxRate}
                onChange={(e) => handleFieldChange('federalTaxRate', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label>State Tax Rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={editForm.stateTaxRate}
                onChange={(e) => handleFieldChange('stateTaxRate', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label>Additional Withholding per Paycheck</label>
              <InputWithPrefix
                prefix={getCurrencySymbol(currency)}
                type="number"
                min="0"
                step="0.01"
                value={editForm.additionalWithholding}
                onChange={(e) => handleFieldChange('additionalWithholding', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="edit-actions">
            <Button variant="secondary" onClick={handleEditCancel}>Cancel</Button>
            <Button variant="primary" onClick={handleEditSave}>Save Changes</Button>
          </div>
        </div>
      ) : (
        <div className="tax-summary">
          <div className="summary-section">
            <h3>Gross vs. Net Pay</h3>
            <div className="summary-table">
              <div className="summary-row">
                <span className="label">Gross Pay</span>
                <span className="amount">{formatWithSymbol(breakdown.grossPay, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="summary-row">
                <span className="label">Total Taxes</span>
                <span className="amount negative">-{formatWithSymbol(breakdown.totalTaxes, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="summary-row total">
                <span className="label">Net Pay</span>
                <span className="amount">{formatWithSymbol(breakdown.netPay, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="summary-section">
            <h3>Tax Breakdown</h3>
            <div className="summary-table">
              <div className="summary-row">
                <span className="label">Federal Tax ({taxSettings.federalTaxRate}%)</span>
                <span className="amount">{formatWithSymbol(breakdown.federalTax, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="summary-row">
                <span className="label">State Tax ({taxSettings.stateTaxRate}%)</span>
                <span className="amount">{formatWithSymbol(breakdown.stateTax, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="summary-row">
                <span className="label">Social Security (6.2%)</span>
                <span className="amount">{formatWithSymbol(breakdown.socialSecurity, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="summary-row">
                <span className="label">Medicare (1.45%)</span>
                <span className="amount">{formatWithSymbol(breakdown.medicare, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {breakdown.additionalWithholding > 0 && (
                <div className="summary-row">
                  <span className="label">Additional Withholding</span>
                  <span className="amount">{formatWithSymbol(breakdown.additionalWithholding, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="summary-row total">
                <span className="label">Total Taxes</span>
                <span className="amount">{formatWithSymbol(breakdown.totalTaxes, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="summary-section">
            <h3>Tax Rates & Settings</h3>
            <div className="settings-table">
              <div className="settings-row">
                <span className="label">Federal Tax Rate</span>
                <span className="value">{taxSettings.federalTaxRate}%</span>
              </div>
              <div className="settings-row">
                <span className="label">State Tax Rate</span>
                <span className="value">{taxSettings.stateTaxRate}%</span>
              </div>
              <div className="settings-row">
                <span className="label">Social Security Rate</span>
                <span className="value">{taxSettings.socialSecurityRate}%</span>
              </div>
              <div className="settings-row">
                <span className="label">Medicare Rate</span>
                <span className="value">{taxSettings.medicareRate}%</span>
              </div>
              <div className="settings-row">
                <span className="label">Additional Withholding per Paycheck</span>
                <span className="value">{formatWithSymbol(taxSettings.additionalWithholding, currency, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxBreakdown;
