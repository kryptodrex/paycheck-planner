import { useState } from 'react';
import { generateId, type TaxLine } from '@paycheck-planner/core';
import { FormSheet } from '../../components/FormSheet';
import { FormField } from '../../components/FormField';
import { FormError } from '../../components/FormError';
import { OptionPicker } from '../../components/OptionPicker';
import { parseAmount, amountToInput } from '../../utils/planMutations';

type CalcType = 'percentage' | 'fixed';

interface Props {
  line: TaxLine | null;
  onSave: (line: TaxLine) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

// Mounted only while open, so state initializers reset the form each time.
export function TaxLineFormSheet({ line, onSave, onDelete, onClose }: Props) {
  const [label, setLabel] = useState(line?.label ?? '');
  const [calcType, setCalcType] = useState<CalcType>(
    line?.calculationType === 'fixed' ? 'fixed' : 'percentage',
  );
  const [rate, setRate] = useState(amountToInput(line?.rate));
  const [amount, setAmount] = useState(amountToInput(line?.amount));
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    if (!label.trim()) return setError('Please enter a label.');

    if (calcType === 'percentage') {
      const parsedRate = parseAmount(rate);
      if (parsedRate === null) return setError('Please enter a valid rate.');
      onSave({
        ...(line ?? { id: generateId() }),
        label: label.trim(),
        rate: parsedRate,
        calculationType: 'percentage',
        amount: undefined,
      });
    } else {
      const parsedAmount = parseAmount(amount);
      if (parsedAmount === null) return setError('Please enter a valid amount.');
      onSave({
        ...(line ?? { id: generateId() }),
        label: label.trim(),
        rate: 0,
        amount: parsedAmount,
        calculationType: 'fixed',
      });
    }
    onClose();
  }

  return (
    <FormSheet
      visible
      title={line ? 'Edit Tax Line' : 'Add Tax Line'}
      onClose={onClose}
      onSave={handleSave}
      onDelete={line && onDelete ? () => { onDelete(line.id); onClose(); } : undefined}
      deleteLabel="Delete Tax Line"
    >
      <FormError message={error} />
      <FormField label="Label" value={label} onChangeText={setLabel} placeholder="e.g. Federal Income Tax" />
      <OptionPicker
        label="Calculation"
        options={[
          { value: 'percentage', label: 'Percent of Taxable Income' },
          { value: 'fixed', label: 'Fixed per Paycheck' },
        ]}
        value={calcType}
        onChange={setCalcType}
      />
      {calcType === 'percentage' ? (
        <FormField
          label="Rate (%)"
          value={rate}
          onChangeText={setRate}
          placeholder="0.0"
          keyboardType="decimal-pad"
        />
      ) : (
        <FormField
          label="Amount per Paycheck"
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
      )}
    </FormSheet>
  );
}
