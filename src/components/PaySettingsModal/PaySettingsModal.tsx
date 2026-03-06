import React, { useState, useEffect } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import type { PaySettings } from '../../types/auth';
import { getCurrencySymbol } from '../../utils/currency';
import { Modal, Button, FormGroup, InputWithPrefix, RadioGroup } from '../shared';
import './PaySettingsModal.css';

interface PaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PaySettingsModal: React.FC<PaySettingsModalProps> = ({ isOpen, onClose }) => {
  const { budgetData, updatePaySettings } = useBudget();
  
  // Form state
  const [editPayType, setEditPayType] = useState<'salary' | 'hourly'>('salary');
  const [editAnnualSalary, setEditAnnualSalary] = useState('');
  const [editHourlyRate, setEditHourlyRate] = useState('');
  const [editHoursPerPayPeriod, setEditHoursPerPayPeriod] = useState('');
  const [editPayFrequency, setEditPayFrequency] = useState<'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly'>('bi-weekly');
  const [editMinLeftover, setEditMinLeftover] = useState('0');

  // Pre-fill form when modal opens
  useEffect(() => {
    if (isOpen && budgetData) {
      setEditPayType(budgetData.paySettings.payType);
      setEditPayFrequency(budgetData.paySettings.payFrequency);
      setEditMinLeftover(budgetData.paySettings.minLeftover?.toString() || '0');
      setEditAnnualSalary(budgetData.paySettings.annualSalary?.toString() || '');
      setEditHourlyRate(budgetData.paySettings.hourlyRate?.toString() || '');
      setEditHoursPerPayPeriod(budgetData.paySettings.hoursPerPayPeriod?.toString() || '');
    }
  }, [isOpen, budgetData]);

  // Handle Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

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

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      contentClassName="pay-settings-modal-content"
      header="Edit Pay Breakdown Settings"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveSettings}>Save Changes</Button>
        </>
      }
    >
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

        {editPayType === 'salary' ? (
          <FormGroup label="Annual Salary">
            <InputWithPrefix
              prefix={getCurrencySymbol(budgetData.settings.currency || 'USD')}
              type="number"
              value={editAnnualSalary}
              onChange={(e) => setEditAnnualSalary(e.target.value)}
              placeholder="65000"
              min="0"
              step="100"
            />
          </FormGroup>
        ) : (
          <>
            <FormGroup label="Hourly Rate">
              <InputWithPrefix
                prefix={getCurrencySymbol(budgetData.settings.currency || 'USD')}
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
          label="Target Leftover Per Paycheck"
          helperText="The target amount you want to keep unallocated for spending. If you go below this amount, the app will alert you that you may be over-budget."
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
    </Modal>
  );
};

export default PaySettingsModal;
