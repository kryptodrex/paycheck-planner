import { useState } from 'react';
import { generateId, type AccountAllocationCategory } from '@paycheck-planner/core';
import { FormSheet } from '../../components/FormSheet';
import { FormField } from '../../components/FormField';
import { FormError } from '../../components/FormError';
import { parseAmount, amountToInput } from '../../utils/planMutations';

interface Props {
  accountName: string;
  category: AccountAllocationCategory | null;
  onSave: (category: AccountAllocationCategory) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

/**
 * Add/edit a custom allocation category on an account — the mobile equivalent
 * of the desktop Pay Breakdown allocation editor. Amounts are stored
 * per-paycheck (matching core's allocation math).
 */
export function AllocationFormSheet({ accountName, category, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(category?.name ?? '');
  const [amount, setAmount] = useState(amountToInput(category?.amount));
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    const parsed = parseAmount(amount);
    if (!name.trim()) return setError('Please enter a name.');
    if (parsed === null || parsed <= 0) return setError('Please enter a valid amount.');

    onSave({
      ...(category ?? { id: generateId() }),
      name: name.trim(),
      amount: parsed,
    });
    onClose();
  }

  return (
    <FormSheet
      visible
      title={category ? 'Edit Allocation' : 'Add Allocation'}
      onClose={onClose}
      onSave={handleSave}
      onDelete={category && onDelete ? () => { onDelete(category.id); onClose(); } : undefined}
      deleteLabel="Delete Allocation"
    >
      <FormError message={error} />
      <FormField
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Groceries, Fun Money"
        hint={`A spending category funded from ${accountName}`}
      />
      <FormField
        label="Amount per Paycheck"
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        keyboardType="decimal-pad"
        hint="Routed to this account out of each paycheck's net pay"
      />
    </FormSheet>
  );
}
