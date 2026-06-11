import { useState } from 'react';
import { generateId, type Deduction } from '@paycheck-planner/core';
import { FormSheet } from '../../components/FormSheet';
import { FormField } from '../../components/FormField';
import { FormError } from '../../components/FormError';
import { ToggleRow } from '../../components/ToggleRow';
import { parseAmount, amountToInput } from '../../utils/planMutations';

interface Props {
  deduction: Deduction | null;
  onSave: (deduction: Deduction) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

// Mounted only while open, so state initializers reset the form each time.
export function DeductionFormSheet({ deduction, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(deduction?.name ?? '');
  const [amount, setAmount] = useState(amountToInput(deduction?.amount));
  const [isPercentage, setIsPercentage] = useState(deduction?.isPercentage ?? false);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    const parsedAmount = parseAmount(amount);
    if (!name.trim()) return setError('Please enter a name.');
    if (parsedAmount === null || parsedAmount <= 0) return setError('Please enter a valid amount.');

    onSave({
      ...(deduction ?? { id: generateId() }),
      name: name.trim(),
      amount: parsedAmount,
      isPercentage,
    });
    onClose();
  }

  return (
    <FormSheet
      visible
      title={deduction ? 'Edit Pre-Tax Deduction' : 'Add Pre-Tax Deduction'}
      onClose={onClose}
      onSave={handleSave}
      onDelete={deduction && onDelete ? () => { onDelete(deduction.id); onClose(); } : undefined}
      deleteLabel="Delete Deduction"
    >
      <FormError message={error} />
      <FormField label="Name" value={name} onChangeText={setName} placeholder="e.g. HSA Contribution" />
      <FormField
        label={isPercentage ? 'Percent of Gross' : 'Amount per Paycheck'}
        value={amount}
        onChangeText={setAmount}
        placeholder={isPercentage ? '0' : '0.00'}
        keyboardType="decimal-pad"
      />
      <ToggleRow label="Percent of gross pay" value={isPercentage} onChange={setIsPercentage} />
    </FormSheet>
  );
}
