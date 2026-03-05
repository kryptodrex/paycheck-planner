import React, { useState, useEffect } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import type { PaySettings, TaxSettings } from '../../types/auth';
import { formatWithSymbol, CURRENCIES, getCurrencySymbol } from '../../utils/currency';
import { Modal, Button, FormGroup, InputWithPrefix, StickyActions, RadioGroup } from '../shared';
import './PaySettingsModal.css';

interface PaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PaySettingsModal: React.FC<PaySettingsModalProps> = ({ isOpen, onClose }) => {
  const { budgetData, updatePaySettings, updateTaxSettings, updateBudgetSettings } = useBudget();
  
  // Form state
  const [editPayType, setEditPayType] = useState<'salary' | 'hourly'>('salary');
  const [editAnnualSalary, setEditAnnualSalary] = useState('');
  const [editHourlyRate, setEditHourlyRate] = useState('');
  const [editHoursPerPayPeriod, setEditHoursPerPayPeriod] = useState('');
  const [editPayFrequency, setEditPayFrequency] = useState<'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly'>('bi-weekly');
  const [editMinLeftover, setEditMinLeftover] = useState('0');
  const [editFederalTaxRate, setEditFederalTaxRate] = useState('');
  const [editStateTaxRate, setEditStateTaxRate] = useState('');
  const [editAdditionalWithholding, setEditAdditionalWithholding] = useState('');
  const [editCurrency, setEditCurrency] = useState('USD');
  const [settingsView, setSettingsView] = useState<'overview' | 'editor'>('overview');

  // Pre-fill form when modal opens
  useEffect(() => {
    if (isOpen && budgetData) {
      setSettingsView('overview');
      setEditPayType(budgetData.paySettings.payType);
      setEditPayFrequency(budgetData.paySettings.payFrequency);
      setEditMinLeftover(budgetData.paySettings.minLeftover?.toString() || '0');
      setEditAnnualSalary(budgetData.paySettings.annualSalary?.toString() || '');
      setEditHourlyRate(budgetData.paySettings.hourlyRate?.toString() || '');
      setEditHoursPerPayPeriod(budgetData.paySettings.hoursPerPayPeriod?.toString() || '');
      setEditFederalTaxRate(budgetData.taxSettings.federalTaxRate.toString());
      setEditStateTaxRate(budgetData.taxSettings.stateTaxRate.toString());
      setEditAdditionalWithholding(budgetData.taxSettings.additionalWithholding.toString());
      setEditCurrency(budgetData.settings.currency || 'USD');
    }
  }, [isOpen, budgetData]);

  // Handle Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (settingsView === 'editor') {
          setSettingsView('overview');
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, settingsView, onClose]);

  if (!budgetData) return null;

  const handleSaveSettings = () => {
    // Save pay settings
    const paySettings: PaySettings = {
      payType: editPayType,
      payFrequency: editPayFrequency,
      minLeftover: parseFloat(editMinLeftover) || 0,
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

    onClose();
  };

  const cancelEditor = () => {
    setSettingsView('overview');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      contentClassName="pay-settings-modal-content"
    >
      <div className="modal-header">
        <h2>Edit Pay Settings</h2>
      </div>
      {settingsView === 'overview' ? (
        <div className="modal-body pay-settings-overview">
          <p>Review your current pay setup or open the editor to update salary, taxes, currency, and pay frequency.</p>
          <div className="overview-grid">
            <div className="overview-item">
              <span>Pay Type</span>
              <strong>{budgetData.paySettings.payType === 'salary' ? 'Salary' : 'Hourly'}</strong>
            </div>
            <div className="overview-item">
              <span>Pay Frequency</span>
              <strong>{budgetData.paySettings.payFrequency}</strong>
            </div>
            <div className="overview-item">
              <span>Federal Tax</span>
              <strong>{budgetData.taxSettings.federalTaxRate}%</strong>
            </div>
            <div className="overview-item">
              <span>State Tax</span>
              <strong>{budgetData.taxSettings.stateTaxRate}%</strong>
            </div>
            <div className="overview-item">
              <span>Additional Withholding</span>
              <strong>{formatWithSymbol(budgetData.taxSettings.additionalWithholding, budgetData.settings.currency || 'USD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
            <div className="overview-item">
              <span>Currency</span>
              <strong>{budgetData.settings.currency || 'USD'}</strong>
            </div>
          </div>
          <div className="modal-footer">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button variant="primary" onClick={() => setSettingsView('editor')}>Edit Pay Settings</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="modal-body pay-settings-editor-body">
            <FormGroup label="Pay Type">
              <RadioGroup
                name="editPayType"
                value={editPayType}
                onChange={(value) => setEditPayType(value as 'salary' | 'hourly')}
                layout="row"
                options={[
                  { value: 'salary', label: 'Annual Salary' },
                  { value: 'hourly', label: 'Hourly Wage' },
                ]}
              />
            </FormGroup>

            <FormGroup label="Currency">
              <select
                value={editCurrency}
                onChange={(e) => setEditCurrency(e.target.value)}
              >
                {CURRENCIES.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.symbol} - {curr.name} ({curr.code})
                  </option>
                ))}
              </select>
            </FormGroup>

            {editPayType === 'salary' ? (
              <FormGroup label="Annual Salary">
                <InputWithPrefix
                  prefix={getCurrencySymbol(editCurrency)}
                  type="number"
                  value={editAnnualSalary}
                  onChange={(e) => setEditAnnualSalary(e.target.value)}
                  placeholder="65000"
                  min="0"
                  step="1000"
                />
              </FormGroup>
            ) : (
              <>
                <FormGroup label="Hourly Rate">
                  <InputWithPrefix
                    prefix={getCurrencySymbol(editCurrency)}
                    type="number"
                    value={editHourlyRate}
                    onChange={(e) => setEditHourlyRate(e.target.value)}
                    placeholder="25.00"
                    min="0"
                    step="0.50"
                  />
                </FormGroup>
                <FormGroup label="Hours per Pay Period">
                  <input
                    type="number"
                    value={editHoursPerPayPeriod}
                    onChange={(e) => setEditHoursPerPayPeriod(e.target.value)}
                    placeholder="80"
                    min="0"
                    step="1"
                  />
                </FormGroup>
              </>
            )}

            <FormGroup label="Pay Frequency">
              <RadioGroup
                name="editPayFrequency"
                value={editPayFrequency}
                onChange={(value) => setEditPayFrequency(value as 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly')}
                layout="column"
                options={[
                  { value: 'weekly', label: 'Weekly', description: '52 per year' },
                  { value: 'bi-weekly', label: 'Bi-weekly', description: '26 per year' },
                  { value: 'semi-monthly', label: 'Semi-monthly', description: '24 per year' },
                  { value: 'monthly', label: 'Monthly', description: '12 per year' },
                ]}
              />
            </FormGroup>

            <FormGroup 
              label="Minimum Leftover Per Paycheck" 
              helperText="The minimum amount you want to keep unallocated for spending (groceries, shopping, etc.). This will warn you if allocations leave less than this amount."
            >
              <InputWithPrefix
                prefix={getCurrencySymbol(budgetData.settings.currency || 'USD')}
                type="number"
                value={editMinLeftover}
                onChange={(e) => setEditMinLeftover(e.target.value)}
                placeholder="0"
                min="0"
                step="10"
              />
            </FormGroup>

            <FormGroup label="Federal Tax Rate (%)">
              <input
                type="number"
                value={editFederalTaxRate}
                onChange={(e) => setEditFederalTaxRate(e.target.value)}
                placeholder="12"
                min="0"
                max="50"
                step="0.5"
              />
            </FormGroup>

            <FormGroup label="State Tax Rate (%)">
              <input
                type="number"
                value={editStateTaxRate}
                onChange={(e) => setEditStateTaxRate(e.target.value)}
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
                prefix={getCurrencySymbol(editCurrency)}
                type="number"
                value={editAdditionalWithholding}
                onChange={(e) => setEditAdditionalWithholding(e.target.value)}
                placeholder="0"
                min="0"
                step="10"
              />
            </FormGroup>
          </div>
          <StickyActions>
            <Button variant="secondary" onClick={cancelEditor}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveSettings}>Save Changes</Button>
          </StickyActions>
        </>
      )}
    </Modal>
  );
};

export default PaySettingsModal;
