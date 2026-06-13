import { useState } from 'react';
import { generateId, type Account, type Benefit } from '@paycheck-planner/core';
import { FormSheet } from '../../components/FormSheet';
import { FormField } from '../../components/FormField';
import { FormError } from '../../components/FormError';
import { OptionPicker } from '../../components/OptionPicker';
import { ToggleRow } from '../../components/ToggleRow';
import { accountOptions } from '../../utils/formOptions';
import { parseAmount, amountToInput } from '../../utils/planMutations';

interface Props {
  benefit: Benefit | null;
  accounts: Account[];
  onSave: (benefit: Benefit) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

// Mounted only while open, so state initializers reset the form each time.
export function BenefitFormSheet({ benefit, accounts, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(benefit?.name ?? '');
  const [amount, setAmount] = useState(amountToInput(benefit?.amount));
  const [isPercentage, setIsPercentage] = useState(benefit?.isPercentage ?? false);
  const [isTaxable, setIsTaxable] = useState(benefit?.isTaxable ?? false);
  const [source, setSource] = useState<'paycheck' | 'account'>(
    benefit?.deductionSource ?? 'paycheck',
  );
  const [sourceAccountId, setSourceAccountId] = useState<string | undefined>(
    benefit?.sourceAccountId ?? accounts[0]?.id,
  );
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    const parsedAmount = parseAmount(amount);
    if (!name.trim()) return setError('Please enter a name.');
    if (parsedAmount === null || parsedAmount <= 0) return setError('Please enter a valid amount.');
    if (source === 'account' && !sourceAccountId) return setError('Please choose an account.');

    onSave({
      ...(benefit ?? { id: generateId(), enabled: true }),
      name: name.trim(),
      amount: parsedAmount,
      isPercentage,
      isTaxable,
      deductionSource: source,
      sourceAccountId: source === 'account' ? sourceAccountId : undefined,
    });
    onClose();
  }

  return (
    <FormSheet
      visible
      title={benefit ? 'Edit Deduction' : 'Add Deduction'}
      onClose={onClose}
      onSave={handleSave}
      onDelete={benefit && onDelete ? () => { onDelete(benefit.id); onClose(); } : undefined}
      deleteLabel="Delete Deduction"
    >
      <FormError message={error} />
      <FormField label="Name" value={name} onChangeText={setName} placeholder="e.g. Health Insurance" />
      <FormField
        label={isPercentage ? 'Percent of Gross' : 'Amount per Paycheck'}
        value={amount}
        onChangeText={setAmount}
        placeholder={isPercentage ? '0' : '0.00'}
        keyboardType="decimal-pad"
      />
      <ToggleRow label="Percent of gross pay" value={isPercentage} onChange={setIsPercentage} />
      <ToggleRow
        label="Post-tax deduction"
        value={isTaxable}
        onChange={setIsTaxable}
        hint="Off = pre-tax (reduces taxable income)"
      />
      <OptionPicker
        label="Deducted From"
        options={[
          { value: 'paycheck', label: 'Paycheck' },
          { value: 'account', label: 'Account' },
        ]}
        value={source}
        onChange={setSource}
      />
      {source === 'account' && (
        <OptionPicker
          label="Source Account"
          options={accountOptions(accounts)}
          value={sourceAccountId}
          onChange={setSourceAccountId}
        />
      )}
    </FormSheet>
  );
}
