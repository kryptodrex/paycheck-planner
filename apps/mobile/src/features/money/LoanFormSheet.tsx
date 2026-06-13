import { useState } from 'react';
import { generateId, type Account, type Loan, type LoanType } from '@paycheck-planner/core';
import { FormSheet } from '../../components/FormSheet';
import { FormField } from '../../components/FormField';
import { FormError } from '../../components/FormError';
import { OptionPicker } from '../../components/OptionPicker';
import { LOAN_TYPE_OPTIONS, accountOptions } from '../../utils/formOptions';
import { parseAmount, amountToInput } from '../../utils/planMutations';

interface Props {
  loan: Loan | null;
  accounts: Account[];
  onSave: (loan: Loan) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

// Mounted only while open, so state initializers reset the form each time.
export function LoanFormSheet({ loan, accounts, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(loan?.name ?? '');
  const [type, setType] = useState<LoanType>(loan?.type ?? 'personal');
  const [monthlyPayment, setMonthlyPayment] = useState(amountToInput(loan?.monthlyPayment));
  const [currentBalance, setCurrentBalance] = useState(amountToInput(loan?.currentBalance));
  const [interestRate, setInterestRate] = useState(amountToInput(loan?.interestRate));
  const [accountId, setAccountId] = useState<string | undefined>(
    loan?.accountId ?? accounts[0]?.id,
  );
  const [notes, setNotes] = useState(loan?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    const parsedPayment = parseAmount(monthlyPayment);
    const parsedBalance = parseAmount(currentBalance) ?? 0;
    const parsedRate = parseAmount(interestRate) ?? 0;
    if (!name.trim()) return setError('Please enter a name.');
    if (parsedPayment === null || parsedPayment <= 0) {
      return setError('Please enter a valid monthly payment.');
    }
    if (!accountId) return setError('Please choose an account.');

    onSave({
      ...(loan ?? {
        id: generateId(),
        enabled: true,
        principal: parsedBalance,
        startDate: new Date().toISOString().slice(0, 10),
      }),
      name: name.trim(),
      type,
      monthlyPayment: parsedPayment,
      currentBalance: parsedBalance,
      interestRate: parsedRate,
      accountId,
      notes: notes.trim() || undefined,
    });
    onClose();
  }

  return (
    <FormSheet
      visible
      title={loan ? 'Edit Loan' : 'Add Loan'}
      onClose={onClose}
      onSave={handleSave}
      onDelete={loan && onDelete ? () => { onDelete(loan.id); onClose(); } : undefined}
      deleteLabel="Delete Loan"
    >
      <FormError message={error} />
      <FormField label="Name" value={name} onChangeText={setName} placeholder="e.g. Car Loan" />
      <OptionPicker label="Type" options={LOAN_TYPE_OPTIONS} value={type} onChange={setType} />
      <FormField
        label="Monthly Payment"
        value={monthlyPayment}
        onChangeText={setMonthlyPayment}
        placeholder="0.00"
        keyboardType="decimal-pad"
      />
      <FormField
        label="Current Balance"
        value={currentBalance}
        onChangeText={setCurrentBalance}
        placeholder="0.00"
        keyboardType="decimal-pad"
      />
      <FormField
        label="Interest Rate (%)"
        value={interestRate}
        onChangeText={setInterestRate}
        placeholder="0.0"
        keyboardType="decimal-pad"
      />
      <OptionPicker
        label="Paid From Account"
        options={accountOptions(accounts)}
        value={accountId}
        onChange={setAccountId}
      />
      <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" multiline />
    </FormSheet>
  );
}
