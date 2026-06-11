import { useState } from 'react';
import { ScrollView, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  convertBillToYearly,
  type Account,
} from '@paycheck-planner/core';
import { usePlanScreen } from '../../src/hooks/usePlanScreen';
import { useTheme } from '../../src/contexts/ThemeContext';
import { ThemedView } from '../../src/components/ThemedView';
import { ThemedText } from '../../src/components/ThemedText';
import { MetricRow } from '../../src/components/MetricRow';
import { SectionCard } from '../../src/components/SectionCard';
import { Button } from '../../src/components/Button';
import { AccountFormSheet } from '../../src/features/accounts/AccountFormSheet';
import { upsertById, removeById } from '../../src/utils/planMutations';

const ACCOUNT_TYPE_ORDER: Account['type'][] = ['checking', 'savings', 'investment', 'other'];

const TYPE_LABELS: Record<Account['type'], string> = {
  checking: 'Checking',
  savings: 'Savings',
  investment: 'Investment',
  other: 'Other',
};

export default function AccountsScreen() {
  const helpers = usePlanScreen();
  const { colors, spacing, radius } = useTheme();
  const [editing, setEditing] = useState<Account | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  if (!helpers) return null;

  const { plan, updatePlan, fmt } = helpers;

  const grouped = ACCOUNT_TYPE_ORDER.reduce<Record<Account['type'], Account[]>>(
    (acc, type) => {
      acc[type] = plan.accounts.filter((a) => a.type === type);
      return acc;
    },
    { checking: [], savings: [], investment: [], other: [] },
  );

  const billsByAccount = plan.bills
    .filter((b) => b.enabled !== false)
    .reduce<Record<string, typeof plan.bills>>((acc, bill) => {
      acc[bill.accountId] = acc[bill.accountId] ?? [];
      acc[bill.accountId].push(bill);
      return acc;
    }, {});

  const loansByAccount = (plan.loans ?? [])
    .filter((l) => l.enabled !== false)
    .reduce<Record<string, typeof plan.loans>>((acc, loan) => {
      acc[loan.accountId] = acc[loan.accountId] ?? [];
      acc[loan.accountId].push(loan);
      return acc;
    }, {});

  const savingsByAccount = (plan.savingsContributions ?? [])
    .filter((s) => s.enabled !== false)
    .reduce<Record<string, NonNullable<typeof plan.savingsContributions>>>((acc, item) => {
      acc[item.accountId] = acc[item.accountId] ?? [];
      acc[item.accountId].push(item);
      return acc;
    }, {});

  const totalBills = plan.bills
    .filter((b) => b.enabled !== false)
    .reduce((sum, b) => sum + convertBillToYearly(b.amount, b.frequency), 0);

  const totalLoans = (plan.loans ?? [])
    .filter((l) => l.enabled !== false)
    .reduce((sum, l) => sum + l.monthlyPayment * 12, 0);

  function accountHasLinks(accountId: string): boolean {
    return (
      plan.bills.some((b) => b.accountId === accountId) ||
      (plan.loans ?? []).some((l) => l.accountId === accountId) ||
      (plan.savingsContributions ?? []).some((s) => s.accountId === accountId) ||
      plan.benefits.some((b) => b.sourceAccountId === accountId) ||
      plan.retirement.some((r) => r.sourceAccountId === accountId)
    );
  }

  function openEditor(account: Account | null) {
    setEditing(account);
    setSheetVisible(true);
  }

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'Accounts' }} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionCard title="Annual Obligations">
          {totalBills > 0 && <MetricRow label="Total Bills" value={fmt(totalBills)} />}
          {totalLoans > 0 && <MetricRow label="Total Loans" value={fmt(totalLoans)} />}
          <MetricRow label="Total" value={fmt(totalBills + totalLoans)} isTotal />
        </SectionCard>

        <Button
          title="Add Account"
          variant="secondary"
          onPress={() => openEditor(null)}
          style={{ marginBottom: spacing.md }}
        />

        {ACCOUNT_TYPE_ORDER.map((type) => {
          const accounts = grouped[type];
          if (accounts.length === 0) return null;
          return (
            <View key={type}>
              <ThemedText
                variant="tertiary"
                size="xs"
                weight="semibold"
                style={{ letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: spacing.sm }}
              >
                {TYPE_LABELS[type]}
              </ThemedText>

              {accounts.map((account) => {
                const bills = billsByAccount[account.id] ?? [];
                const loans = loansByAccount[account.id] ?? [];
                const savings = savingsByAccount[account.id] ?? [];
                const hasItems = bills.length > 0 || loans.length > 0 || savings.length > 0;

                return (
                  <View
                    key={account.id}
                    style={[
                      styles.accountCard,
                      {
                        backgroundColor: colors.bgElevated,
                        borderColor: colors.border,
                        borderRadius: radius.lg,
                        marginBottom: spacing.md,
                        overflow: 'hidden',
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={[
                        styles.accountHeader,
                        { padding: spacing.md, borderBottomColor: colors.border },
                        hasItems && { borderBottomWidth: StyleSheet.hairlineWidth },
                      ]}
                      onPress={() => openEditor(account)}
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: account.color ?? colors.accentPrimary },
                        ]}
                      />
                      <ThemedText size="md" weight="semibold" style={{ flex: 1 }}>
                        {account.name}
                      </ThemedText>
                      {account.isRemainder && (
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: colors.accentPrimary + '22', borderRadius: radius.sm },
                          ]}
                        >
                          <ThemedText variant="accent" size="xs" weight="medium">
                            Remainder
                          </ThemedText>
                        </View>
                      )}
                      {account.allocation !== undefined && !account.isRemainder && (
                        <ThemedText variant="secondary" size="sm">
                          {fmt(account.allocation)}/mo
                        </ThemedText>
                      )}
                      <Feather name="chevron-right" size={16} color={colors.textTertiary} />
                    </TouchableOpacity>

                    {hasItems && (
                      <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
                        {bills.map((bill) => (
                          <MetricRow
                            key={bill.id}
                            label={bill.name}
                            value={fmt(convertBillToYearly(bill.amount, bill.frequency) / 12) + '/mo'}
                          />
                        ))}
                        {loans.map((loan) => (
                          <MetricRow
                            key={loan.id}
                            label={loan.name}
                            value={fmt(loan.monthlyPayment) + '/mo'}
                          />
                        ))}
                        {savings.map((item) => (
                          <MetricRow
                            key={item.id}
                            label={item.name}
                            value={fmt(convertBillToYearly(item.amount, item.frequency) / 12) + '/mo'}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}

        {plan.accounts.length === 0 && (
          <SectionCard>
            <ThemedText
              variant="secondary"
              size="sm"
              style={{ textAlign: 'center', paddingVertical: spacing.md }}
            >
              No accounts configured
            </ThemedText>
          </SectionCard>
        )}
      </ScrollView>

      {sheetVisible && (
        <AccountFormSheet
          account={editing}
          canDelete={editing ? !accountHasLinks(editing.id) : false}
          onSave={(account) => updatePlan((p) => ({ ...p, accounts: upsertById(p.accounts, account) }))}
          onDelete={(id) => updatePlan((p) => ({ ...p, accounts: removeById(p.accounts, id) }))}
          onClose={() => setSheetVisible(false)}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  accountCard: { borderWidth: StyleSheet.hairlineWidth },
  accountHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  badge: { paddingHorizontal: 8, paddingVertical: 3 },
});
