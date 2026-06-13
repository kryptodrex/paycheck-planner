import { useState } from 'react';
import { generateId, type Account, type Bill, type BillFrequency } from '@paycheck-planner/core';
import { FormSheet } from '../../components/FormSheet';
import { FormField } from '../../components/FormField';
import { FormError } from '../../components/FormError';
import { OptionPicker } from '../../components/OptionPicker';
import { ToggleRow } from '../../components/ToggleRow';
import { BILL_FREQUENCY_OPTIONS, accountOptions } from '../../utils/formOptions';
import { parseAmount, amountToInput } from '../../utils/planMutations';

interface Props {
  bill: Bill | null;
  accounts: Account[];
  onSave: (bill: Bill) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

// Mounted only while open, so state initializers reset the form each time.
export function BillFormSheet({ bill, accounts, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(bill?.name ?? '');
  const [amount, setAmount] = useState(amountToInput(bill?.amount));
  const [frequency, setFrequency] = useState<BillFrequency>(
    bill?.frequency === 'custom' ? 'monthly' : (bill?.frequency ?? 'monthly'),
  );
  const [accountId, setAccountId] = useState<string | undefined>(
    bill?.accountId ?? accounts[0]?.id,
  );
  const [discretionary, setDiscretionary] = useState(bill?.discretionary ?? false);
  const [notes, setNotes] = useState(bill?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    const parsedAmount = parseAmount(amount);
    if (!name.trim()) return setError('Please enter a name.');
    if (parsedAmount === null || parsedAmount <= 0) return setError('Please enter a valid amount.');
    if (!accountId) return setError('Please choose an account.');

    onSave({
      ...(bill ?? { id: generateId(), enabled: true }),
      name: name.trim(),
      amount: parsedAmount,
      frequency,
      accountId,
      discretionary,
      notes: notes.trim() || undefined,
    });
    onClose();
  }

  return (
    <FormSheet
      visible
      title={bill ? 'Edit Bill' : 'Add Bill'}
      onClose={onClose}
      onSave={handleSave}
      onDelete={bill && onDelete ? () => { onDelete(bill.id); onClose(); } : undefined}
      deleteLabel="Delete Bill"
    >
      <FormError message={error} />
      <FormField label="Name" value={name} onChangeText={setName} placeholder="e.g. Rent" />
      <FormField
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        keyboardType="decimal-pad"
      />
      <OptionPicker label="Frequency" options={BILL_FREQUENCY_OPTIONS} value={frequency} onChange={setFrequency} />
      <OptionPicker
        label="Paid From Account"
        options={accountOptions(accounts)}
        value={accountId}
        onChange={setAccountId}
      />
      <ToggleRow
        label="Discretionary"
        value={discretionary}
        onChange={setDiscretionary}
        hint="Optional spending that could be cut back if needed"
      />
      <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" multiline />
    </FormSheet>
  );
}
