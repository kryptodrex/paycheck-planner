import { useEffect } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import { convertBillToYearly, formatCurrency } from '@paycheck-planner/core';
import type { Account } from '@paycheck-planner/core';
import { usePlan } from '../../src/contexts/PlanContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { ThemedView } from '../../src/components/ThemedView';
import { ThemedText } from '../../src/components/ThemedText';
import { MetricRow } from '../../src/components/MetricRow';
import { SectionCard } from '../../src/components/SectionCard';

const ACCOUNT_TYPE_ORDER: Account['type'][] = ['checking', 'savings', 'investment', 'other'];

const TYPE_LABELS: Record<Account['type'], string> = {
  checking: 'Checking',
  savings: 'Savings',
  investment: 'Investment',
  other: 'Other',
};

export default function AccountsScreen() {
  const { plan } = usePlan();
  const { colors, spacing, radius } = useTheme();

  useEffect(() => {
    if (!plan) {
      router.replace('/');
    }
  }, [plan]);

  if (!plan) return null;

  const { currency, locale } = plan.settings;
  const fmt = (n: number) => formatCurrency(n, currency, locale);

  // Group accounts by type
  const grouped = ACCOUNT_TYPE_ORDER.reduce<Record<Account['type'], Account[]>>(
    (acc, type) => {
      acc[type] = plan.accounts.filter((a) => a.type === type);
      return acc;
    },
    { checking: [], savings: [], investment: [], other: [] },
  );

  // Bills per account
  const billsByAccount = plan.bills
    .filter((b) => b.enabled !== false)
    .reduce<Record<string, typeof plan.bills>>((acc, bill) => {
      acc[bill.accountId] = acc[bill.accountId] ?? [];
      acc[bill.accountId].push(bill);
      return acc;
    }, {});

  // Loans per account
  const loansByAccount = plan.loans
    .filter((l) => l.enabled !== false)
    .reduce<Record<string, typeof plan.loans>>((acc, loan) => {
      acc[loan.accountId] = acc[loan.accountId] ?? [];
      acc[loan.accountId].push(loan);
      return acc;
    }, {});

  const totalBills = plan.bills
    .filter((b) => b.enabled !== false)
    .reduce((sum, b) => sum + convertBillToYearly(b.amount, b.frequency), 0);

  const totalLoans = plan.loans
    .filter((l) => l.enabled !== false)
    .reduce((sum, l) => sum + convertBillToYearly(l.monthlyPayment, l.paymentFrequency ?? 'monthly'), 0);

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'Accounts' }} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Obligations overview */}
        <SectionCard title="Annual Obligations">
          {totalBills > 0 && <MetricRow label="Total Bills" value={fmt(totalBills)} />}
          {totalLoans > 0 && <MetricRow label="Total Loans" value={fmt(totalLoans)} />}
          <MetricRow
            label="Total"
            value={fmt(totalBills + totalLoans)}
            isTotal
          />
        </SectionCard>

        {/* Accounts by type */}
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
                const hasBills = bills.length > 0 || loans.length > 0;

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
                    {/* Account header */}
                    <View
                      style={[
                        styles.accountHeader,
                        { padding: spacing.md, borderBottomColor: colors.border },
                        hasBills && { borderBottomWidth: StyleSheet.hairlineWidth },
                      ]}
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
                    </View>

                    {/* Bills for this account */}
                    {hasBills && (
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
            <ThemedText variant="secondary" size="sm" style={{ textAlign: 'center', paddingVertical: spacing.md }}>
              No accounts configured
            </ThemedText>
          </SectionCard>
        )}
      </ScrollView>
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
