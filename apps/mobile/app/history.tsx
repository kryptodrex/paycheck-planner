import { useMemo } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import type { AuditChangeType, AuditEntityType, AuditEntry } from '@paycheck-planner/core';
import { usePlanScreen } from '../src/hooks/usePlanScreen';
import { useTheme } from '../src/contexts/ThemeContext';
import { ThemedView } from '../src/components/ThemedView';
import { ThemedText } from '../src/components/ThemedText';
import { EmptyState } from '../src/components/EmptyState';

const CHANGE_LABELS: Record<AuditChangeType, string> = {
  create: 'Added',
  update: 'Updated',
  delete: 'Deleted',
  restore: 'Restored',
};

const AUDIT_ENTITY_LABELS: Record<AuditEntityType, string> = {
  bill: 'Bill',
  deduction: 'Pre-Tax Deduction',
  'savings-contribution': 'Savings',
  'retirement-election': 'Retirement',
  loan: 'Loan',
  benefit: 'Benefit',
  'other-income': 'Other Income',
  account: 'Account',
  'allocation-item': 'Allocation',
  'pay-settings': 'Pay Settings',
  'tax-settings': 'Tax Settings',
  'budget-settings': 'Plan Settings',
};

const MAX_VISIBLE_ENTRIES = 200;

function entryTitle(entry: AuditEntry): string {
  const snapshot = entry.snapshot as { name?: string; label?: string } | null;
  return (
    snapshot?.name ??
    snapshot?.label ??
    AUDIT_ENTITY_LABELS[entry.entityType] ??
    entry.entityType
  );
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

export default function HistoryScreen() {
  const helpers = usePlanScreen();
  const { colors, spacing, radius } = useTheme();

  const entries = useMemo(() => {
    const history = helpers?.plan.metadata?.auditHistory ?? [];
    return [...history]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, MAX_VISIBLE_ENTRIES);
  }, [helpers]);

  if (!helpers) return null;

  const changeColor = (changeType: AuditChangeType): string => {
    switch (changeType) {
      case 'create':
        return colors.success;
      case 'delete':
        return colors.error;
      case 'restore':
        return colors.warning;
      default:
        return colors.textAccent;
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'Change History' }} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {entries.length === 0 ? (
          <EmptyState
            icon="clock"
            title="No changes recorded yet"
            message="Edits made on this device and on desktop appear here as they happen."
          />
        ) : (
          entries.map((entry) => (
            <View
              key={entry.id}
              style={[
                styles.entryRow,
                {
                  backgroundColor: colors.bgElevated,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                },
              ]}
            >
              <View style={styles.entryHeader}>
                <ThemedText
                  size="xs"
                  weight="semibold"
                  style={{ color: changeColor(entry.changeType) }}
                >
                  {CHANGE_LABELS[entry.changeType] ?? entry.changeType}
                </ThemedText>
                <ThemedText variant="tertiary" size="xs">
                  {formatTimestamp(entry.timestamp)}
                </ThemedText>
              </View>
              <ThemedText size="sm" weight="semibold" style={{ marginTop: 2 }} numberOfLines={1}>
                {entryTitle(entry)}
              </ThemedText>
              <ThemedText variant="tertiary" size="xs" style={{ marginTop: 2 }} numberOfLines={1}>
                {AUDIT_ENTITY_LABELS[entry.entityType] ?? entry.entityType} · {entry.sourceAction}
              </ThemedText>
              {entry.note && (
                <ThemedText variant="secondary" size="xs" style={{ marginTop: 4 }}>
                  {entry.note}
                </ThemedText>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  entryRow: { borderWidth: StyleSheet.hairlineWidth },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
