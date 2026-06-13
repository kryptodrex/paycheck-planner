import { useState } from 'react';
import {
  generateId,
  type Account,
  type SavingsContribution,
  type SavingsFrequency,
} from '@paycheck-planner/core';
import { FormSheet } from '../../components/FormSheet';
import { FormField } from '../../components/FormField';
import { FormError } from '../../components/FormError';
import { OptionPicker } from '../../components/OptionPicker';
import { ToggleRow } from '../../components/ToggleRow';
import { SAVINGS_FREQUENCY_OPTIONS, accountOptions } from '../../utils/formOptions';
import { parseAmount, amountToInput } from '../../utils/planMutations';

interface Props {
  contribution: SavingsContribution | null;
  accounts: Account[];
  onSave: (contribution: SavingsContribution) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

// Mounted only while open, so state initializers reset the form each time.
export function SavingsFormSheet({
  contribution,
  accounts,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [name, setName] = useState(contribution?.name ?? '');
  const [amount, setAmount] = useState(amountToInput(contribution?.amount));
  const [frequency, setFrequency] = useState<SavingsFrequency>(contribution?.frequency ?? 'monthly');
  const [type, setType] = useState<'savings' | 'investment'>(contribution?.type ?? 'savings');
  const [accountId, setAccountId] = useState<string | undefined>(
    contribution?.accountId ?? accounts[0]?.id,
  );
  const [protectedFromReallocation, setProtectedFromReallocation] = useState(
    contribution?.reallocationProtected ?? false,
  );
  const [notes, setNotes] = useState(contribution?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    const parsedAmount = parseAmount(amount);
    if (!name.trim()) return setError('Please enter a name.');
    if (parsedAmount === null || parsedAmount <= 0) return setError('Please enter a valid amount.');
    if (!accountId) return setError('Please choose an account.');

    onSave({
      ...(contribution ?? { id: generateId(), enabled: true }),
      name: name.trim(),
      amount: parsedAmount,
      frequency,
      type,
      accountId,
      reallocationProtected: protectedFromReallocation,
      notes: notes.trim() || undefined,
    });
    onClose();
  }

  return (
    <FormSheet
      visible
      title={contribution ? 'Edit Savings' : 'Add Savings'}
      onClose={onClose}
      onSave={handleSave}
      onDelete={
        contribution && onDelete ? () => { onDelete(contribution.id); onClose(); } : undefined
      }
      deleteLabel="Delete Savings"
    >
      <FormError message={error} />
      <FormField label="Name" value={name} onChangeText={setName} placeholder="e.g. Emergency Fund" />
      <FormField
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        keyboardType="decimal-pad"
      />
      <OptionPicker
        label="Frequency"
        options={SAVINGS_FREQUENCY_OPTIONS}
        value={frequency}
        onChange={setFrequency}
      />
      <OptionPicker
        label="Type"
        options={[
          { value: 'savings', label: 'Savings' },
          { value: 'investment', label: 'Investment' },
        ]}
        value={type}
        onChange={setType}
      />
      <OptionPicker
        label="Destination Account"
        options={accountOptions(accounts)}
        value={accountId}
        onChange={setAccountId}
      />
      <ToggleRow
        label="Protect from reallocation"
        value={protectedFromReallocation}
        onChange={setProtectedFromReallocation}
        hint="Excluded when freeing up money to cover shortfalls"
      />
      <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" multiline />
    </FormSheet>
  );
}
