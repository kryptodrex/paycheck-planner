import { useState } from 'react';
import {
  generateId,
  type Account,
  type RetirementElection,
  type RetirementPlanType,
} from '@paycheck-planner/core';
import { FormSheet } from '../../components/FormSheet';
import { FormField } from '../../components/FormField';
import { FormError } from '../../components/FormError';
import { OptionPicker } from '../../components/OptionPicker';
import { ToggleRow } from '../../components/ToggleRow';
import { RETIREMENT_TYPE_OPTIONS, accountOptions } from '../../utils/formOptions';
import { parseAmount, amountToInput } from '../../utils/planMutations';

interface Props {
  election: RetirementElection | null;
  accounts: Account[];
  onSave: (election: RetirementElection) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

// Mounted only while open, so state initializers reset the form each time.
export function RetirementFormSheet({
  election,
  accounts,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [type, setType] = useState<RetirementPlanType>(election?.type ?? '401k');
  const [customLabel, setCustomLabel] = useState(election?.customLabel ?? '');
  const [contribution, setContribution] = useState(amountToInput(election?.employeeContribution));
  const [isPercentage, setIsPercentage] = useState(
    election?.employeeContributionIsPercentage ?? true,
  );
  const [isPreTax, setIsPreTax] = useState(election?.isPreTax !== false);
  const [source, setSource] = useState<'paycheck' | 'account'>(
    election?.deductionSource ?? 'paycheck',
  );
  const [sourceAccountId, setSourceAccountId] = useState<string | undefined>(
    election?.sourceAccountId ?? accounts[0]?.id,
  );
  const [hasEmployerMatch, setHasEmployerMatch] = useState(election?.hasEmployerMatch ?? false);
  const [matchCap, setMatchCap] = useState(amountToInput(election?.employerMatchCap));
  const [matchCapIsPercentage, setMatchCapIsPercentage] = useState(
    election?.employerMatchCapIsPercentage ?? true,
  );
  const [protectedFromReallocation, setProtectedFromReallocation] = useState(
    election?.reallocationProtected ?? false,
  );
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    const parsedContribution = parseAmount(contribution);
    if (parsedContribution === null || parsedContribution <= 0) {
      return setError('Please enter a valid contribution.');
    }
    if (source === 'account' && !sourceAccountId) return setError('Please choose an account.');

    onSave({
      ...(election ?? { id: generateId(), enabled: true }),
      type,
      customLabel: customLabel.trim() || undefined,
      employeeContribution: parsedContribution,
      employeeContributionIsPercentage: isPercentage,
      isPreTax,
      deductionSource: source,
      sourceAccountId: source === 'account' ? sourceAccountId : undefined,
      hasEmployerMatch,
      employerMatchCap: hasEmployerMatch ? (parseAmount(matchCap) ?? 0) : 0,
      employerMatchCapIsPercentage: matchCapIsPercentage,
      reallocationProtected: protectedFromReallocation,
    });
    onClose();
  }

  return (
    <FormSheet
      visible
      title={election ? 'Edit Retirement' : 'Add Retirement'}
      onClose={onClose}
      onSave={handleSave}
      onDelete={election && onDelete ? () => { onDelete(election.id); onClose(); } : undefined}
      deleteLabel="Delete Retirement"
    >
      <FormError message={error} />
      <OptionPicker label="Plan Type" options={RETIREMENT_TYPE_OPTIONS} value={type} onChange={setType} />
      <FormField
        label="Custom Label"
        value={customLabel}
        onChangeText={setCustomLabel}
        placeholder="Optional display name"
      />
      <FormField
        label={isPercentage ? 'Contribution (% of gross)' : 'Contribution per Paycheck'}
        value={contribution}
        onChangeText={setContribution}
        placeholder={isPercentage ? '0' : '0.00'}
        keyboardType="decimal-pad"
      />
      <ToggleRow label="Percent of gross pay" value={isPercentage} onChange={setIsPercentage} />
      <ToggleRow
        label="Pre-tax contribution"
        value={isPreTax}
        onChange={setIsPreTax}
        hint="Off = Roth / post-tax"
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
      <ToggleRow label="Employer match" value={hasEmployerMatch} onChange={setHasEmployerMatch} />
      {hasEmployerMatch && (
        <>
          <FormField
            label={matchCapIsPercentage ? 'Match Cap (% of gross)' : 'Match Cap Amount'}
            value={matchCap}
            onChangeText={setMatchCap}
            placeholder="0"
            keyboardType="decimal-pad"
          />
          <ToggleRow
            label="Cap is percent of gross"
            value={matchCapIsPercentage}
            onChange={setMatchCapIsPercentage}
          />
        </>
      )}
      <ToggleRow
        label="Protect from reallocation"
        value={protectedFromReallocation}
        onChange={setProtectedFromReallocation}
        hint="Excluded when freeing up money to cover shortfalls"
      />
    </FormSheet>
  );
}
