import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { generateId, getDefaultAccountColor, type Account } from '@paycheck-planner/core';
import { FormSheet } from '../../components/FormSheet';
import { FormField } from '../../components/FormField';
import { FormError } from '../../components/FormError';
import { OptionPicker } from '../../components/OptionPicker';
import { ThemedText } from '../../components/ThemedText';
import { useTheme } from '../../contexts/ThemeContext';
import { parseAmount, amountToInput } from '../../utils/planMutations';

const ACCOUNT_TYPE_OPTIONS: { value: Account['type']; label: string }[] = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'investment', label: 'Investment' },
  { value: 'other', label: 'Other' },
];

// Matches the desktop account color palette options.
const COLOR_PALETTE = [
  '#667eea',
  '#764ba2',
  '#f093fb',
  '#4facfe',
  '#43e97b',
  '#f59e0b',
  '#ef4444',
  '#0f766e',
  '#be185d',
  '#64748b',
];

interface Props {
  account: Account | null;
  canDelete: boolean;
  onSave: (account: Account) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

// Mounted only while open, so state initializers reset the form each time.
export function AccountFormSheet({ account, canDelete, onSave, onDelete, onClose }: Props) {
  const { colors, spacing } = useTheme();
  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<Account['type']>(account?.type ?? 'checking');
  const [color, setColor] = useState(
    account?.color ?? getDefaultAccountColor(account?.type ?? 'checking'),
  );
  const [allocation, setAllocation] = useState(amountToInput(account?.allocation));
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    if (!name.trim()) return setError('Please enter a name.');
    const parsedAllocation = allocation.trim() ? parseAmount(allocation) : undefined;
    if (allocation.trim() && parsedAllocation === null) {
      return setError('Please enter a valid allocation amount.');
    }

    onSave({
      ...(account ?? { id: generateId() }),
      name: name.trim(),
      type,
      color,
      allocation: parsedAllocation ?? undefined,
    });
    onClose();
  }

  return (
    <FormSheet
      visible
      title={account ? 'Edit Account' : 'Add Account'}
      onClose={onClose}
      onSave={handleSave}
      onDelete={
        account && canDelete && onDelete ? () => { onDelete(account.id); onClose(); } : undefined
      }
      deleteLabel="Delete Account"
    >
      <FormError message={error} />
      <FormField label="Name" value={name} onChangeText={setName} placeholder="e.g. Joint Checking" />
      <OptionPicker label="Type" options={ACCOUNT_TYPE_OPTIONS} value={type} onChange={setType} />

      <ThemedText
        variant="secondary"
        size="xs"
        weight="semibold"
        style={{ marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.4 }}
      >
        Color
      </ThemedText>
      <View style={[styles.swatchRow, { gap: spacing.sm, marginBottom: spacing.md }]}>
        {COLOR_PALETTE.map((swatch) => (
          <TouchableOpacity
            key={swatch}
            style={[
              styles.swatch,
              { backgroundColor: swatch },
              color === swatch && { borderColor: colors.textPrimary, borderWidth: 2 },
            ]}
            onPress={() => setColor(swatch)}
            accessibilityRole="button"
            accessibilityLabel={`Color ${swatch}`}
          />
        ))}
      </View>

      <FormField
        label="Monthly Allocation"
        value={allocation}
        onChangeText={setAllocation}
        placeholder="Optional"
        keyboardType="decimal-pad"
        hint="Fixed amount routed to this account each month"
      />
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap' },
  swatch: { width: 34, height: 34, borderRadius: 17 },
});
