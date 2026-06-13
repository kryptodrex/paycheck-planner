import { useState } from 'react';
import {
  generateId,
  type CoreFrequency,
  type OtherIncome,
  type OtherIncomeAmountMode,
  type OtherIncomePayTreatment,
  type OtherIncomeType,
} from '@paycheck-planner/core';
import { FormSheet } from '../../components/FormSheet';
import { FormField } from '../../components/FormField';
import { FormError } from '../../components/FormError';
import { OptionPicker } from '../../components/OptionPicker';
import { ToggleRow } from '../../components/ToggleRow';
import {
  OTHER_INCOME_AMOUNT_MODE_OPTIONS,
  OTHER_INCOME_PAY_TREATMENT_OPTIONS,
  OTHER_INCOME_TYPE_OPTIONS,
} from '../../utils/formOptions';
import { parseAmount, amountToInput } from '../../utils/planMutations';

const FREQUENCY_OPTIONS: { value: CoreFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'semi-monthly', label: 'Semi-monthly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

interface Props {
  income: OtherIncome | null;
  onSave: (income: OtherIncome) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

// Mounted only while open, so state initializers reset the form each time.
export function OtherIncomeFormSheet({ income, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(income?.name ?? '');
  const [incomeType, setIncomeType] = useState<OtherIncomeType>(income?.incomeType ?? 'bonus');
  const [amountMode, setAmountMode] = useState<OtherIncomeAmountMode>(income?.amountMode ?? 'fixed');
  const [amount, setAmount] = useState(
    amountToInput(
      income?.amountMode === 'percent-of-gross' ? income?.percentOfGross : income?.amount,
    ),
  );
  const [frequency, setFrequency] = useState<CoreFrequency>(income?.frequency ?? 'yearly');
  const [payTreatment, setPayTreatment] = useState<OtherIncomePayTreatment>(
    income?.payTreatment ?? 'gross',
  );
  const [isTaxable, setIsTaxable] = useState(income?.isTaxable ?? true);
  const [notes, setNotes] = useState(income?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    const parsedAmount = parseAmount(amount);
    if (!name.trim()) return setError('Please enter a name.');
    if (parsedAmount === null || parsedAmount <= 0) return setError('Please enter a valid amount.');

    onSave({
      ...(income ?? { id: generateId(), enabled: true, withholdingMode: 'none' as const }),
      name: name.trim(),
      incomeType,
      amountMode,
      amount: amountMode === 'fixed' ? parsedAmount : 0,
      percentOfGross: amountMode === 'percent-of-gross' ? parsedAmount : undefined,
      frequency,
      payTreatment,
      isTaxable,
      notes: notes.trim() || undefined,
    });
    onClose();
  }

  return (
    <FormSheet
      visible
      title={income ? 'Edit Other Income' : 'Add Other Income'}
      onClose={onClose}
      onSave={handleSave}
      onDelete={income && onDelete ? () => { onDelete(income.id); onClose(); } : undefined}
      deleteLabel="Delete Income"
    >
      <FormError message={error} />
      <FormField label="Name" value={name} onChangeText={setName} placeholder="e.g. Annual Bonus" />
      <OptionPicker
        label="Income Type"
        options={OTHER_INCOME_TYPE_OPTIONS}
        value={incomeType}
        onChange={setIncomeType}
      />
      <OptionPicker
        label="Amount Mode"
        options={OTHER_INCOME_AMOUNT_MODE_OPTIONS}
        value={amountMode}
        onChange={setAmountMode}
      />
      <FormField
        label={amountMode === 'fixed' ? 'Amount' : 'Percent of Gross'}
        value={amount}
        onChangeText={setAmount}
        placeholder={amountMode === 'fixed' ? '0.00' : '0'}
        keyboardType="decimal-pad"
      />
      <OptionPicker
        label="Frequency"
        options={FREQUENCY_OPTIONS}
        value={frequency}
        onChange={setFrequency}
      />
      <OptionPicker
        label="Pay Treatment"
        options={OTHER_INCOME_PAY_TREATMENT_OPTIONS}
        value={payTreatment}
        onChange={setPayTreatment}
      />
      <ToggleRow label="Taxable" value={isTaxable} onChange={setIsTaxable} />
      <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" multiline />
    </FormSheet>
  );
}
