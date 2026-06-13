import { useState } from 'react';
import { ScrollView, View, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  convertBillToYearly,
  type Account,
  type AccountAllocationCategory,
} from '@paycheck-planner/core';
import { usePlanScreen } from '../../src/hooks/usePlanScreen';
import { useHighlightParam } from '../../src/hooks/useHighlightParam';
import { useTheme } from '../../src/contexts/ThemeContext';
import { isAutoAllocationCategoryId } from '../../src/utils/summaryMetrics';
import { upsertById, removeById } from '../../src/utils/planMutations';
import { ThemedText } from '../../src/components/ThemedText';
import { MetricRow } from '../../src/components/MetricRow';
import { SectionCard } from '../../src/components/SectionCard';
import { Button } from '../../src/components/Button';
import { PlanTabScreen } from '../../src/components/PlanTabScreen';
import { AccountFormSheet } from '../../src/features/accounts/AccountFormSheet';
import { AllocationFormSheet } from '../../src/features/accounts/AllocationFormSheet';

const ACCOUNT_TYPE_ORDER: Account['type'][] = ['checking', 'savings', 'investment', 'other'];

const TYPE_LABELS: Record<Account['type'], string> = {
  checking: 'Checking',
  savings: 'Savings',
  investment: 'Investment',
  other: 'Other',
};

interface AllocEdit {
  accountId: string;
  accountName: string;
  category: AccountAllocationCategory | null;
}

export default function AccountsScreen() {
  const helpers = usePlanScreen();
  const { colors, spacing, radius } = useTheme();
  const params = useLocalSearchParams<{ highlight?: string; action?: string }>();
  const highlightId = useHighlightParam(params.highlight);

  const [editing, setEditing] = useState<Account | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [allocEdit, setAllocEdit] = useState<AllocEdit | null>(null);

  // Honor "add account" deep-link from search (adjust state during render).
  const [appliedActionParam, setAppliedActionParam] = useState(params.action);
  if (params.action !== appliedActionParam) {
    setAppliedActionParam(params.action);
    if (params.action === 'add') {
      setEditing(null);
      setSheetVisible(true);
    }
  }

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

  function userAllocations(account: Account): AccountAllocationCategory[] {
    return (account.allocationCategories ?? []).filter((c) => !isAutoAllocationCategoryId(c.id));
  }

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

  function saveAllocation(accountId: string, category: AccountAllocationCategory) {
    updatePlan(
      (p) => ({
        ...p,
        accounts: p.accounts.map((a) =>
          a.id === accountId
            ? { ...a, allocationCategories: upsertById(a.allocationCategories, category) }
            : a,
        ),
      }),
      { description: 'Edit account allocation' },
    );
  }

  function deleteAllocation(accountId: string, categoryId: string) {
    updatePlan(
      (p) => ({
        ...p,
        accounts: p.accounts.map((a) =>
          a.id === accountId
            ? { ...a, allocationCategories: removeById(a.allocationCategories, categoryId) }
            : a,
        ),
      }),
      { description: 'Delete account allocation' },
    );
  }

  return (
    <PlanTabScreen title="Accounts" subtitle={plan.name}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 150 }}
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
                const allocations = userAllocations(account);
                const isHighlighted = highlightId === account.id;

                return (
                  <View
                    key={account.id}
                    style={[
                      styles.accountCard,
                      {
                        backgroundColor: colors.bgElevated,
                        borderColor: isHighlighted ? colors.accentPrimary : colors.border,
                        borderWidth: isHighlighted ? 1.5 : StyleSheet.hairlineWidth,
                        borderRadius: radius.lg,
                        marginBottom: spacing.md,
                        overflow: 'hidden',
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={[styles.accountHeader, { padding: spacing.md }]}
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
                      <Feather name="chevron-right" size={18} color={colors.textTertiary} />
                    </TouchableOpacity>

                    {(bills.length > 0 || loans.length > 0 || savings.length > 0) && (
                      <View style={[styles.cardSection, { borderTopColor: colors.border }]}>
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

                    {/* Custom allocations — editable */}
                    <View style={[styles.cardSection, { borderTopColor: colors.border }]}>
                      <View style={styles.allocHeader}>
                        <ThemedText
                          variant="tertiary"
                          size="xs"
                          weight="semibold"
                          style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                        >
                          Allocations
                        </ThemedText>
                        <TouchableOpacity
                          onPress={() =>
                            setAllocEdit({ accountId: account.id, accountName: account.name, category: null })
                          }
                          style={[
                            styles.allocAdd,
                            { backgroundColor: colors.accentPrimary + '1f', borderRadius: radius.md },
                          ]}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityRole="button"
                          accessibilityLabel={`Add allocation to ${account.name}`}
                        >
                          <Feather name="plus" size={15} color={colors.textAccent} />
                          <ThemedText variant="accent" size="sm" weight="semibold">
                            Add
                          </ThemedText>
                        </TouchableOpacity>
                      </View>

                      {allocations.length === 0 ? (
                        <ThemedText variant="tertiary" size="xs" style={{ paddingVertical: spacing.xs }}>
                          No custom allocations yet.
                        </ThemedText>
                      ) : (
                        allocations.map((cat) => (
                          <TouchableOpacity
                            key={cat.id}
                            style={styles.allocRow}
                            onPress={() =>
                              setAllocEdit({
                                accountId: account.id,
                                accountName: account.name,
                                category: cat,
                              })
                            }
                            activeOpacity={0.7}
                          >
                            <ThemedText size="sm" weight="medium" style={{ flex: 1 }} numberOfLines={1}>
                              {cat.name}
                            </ThemedText>
                            <ThemedText size="sm" weight="semibold">
                              {fmt(cat.amount)}/check
                            </ThemedText>
                            <Feather name="chevron-right" size={16} color={colors.textTertiary} />
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
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
          onSave={(account) =>
            updatePlan((p) => ({ ...p, accounts: upsertById(p.accounts, account) }), {
              description: editing ? 'Edit account' : 'Add account',
            })
          }
          onDelete={(id) =>
            updatePlan((p) => ({ ...p, accounts: removeById(p.accounts, id) }), {
              description: 'Delete account',
            })
          }
          onClose={() => setSheetVisible(false)}
        />
      )}

      {allocEdit && (
        <AllocationFormSheet
          accountName={allocEdit.accountName}
          category={allocEdit.category}
          onSave={(category) => saveAllocation(allocEdit.accountId, category)}
          onDelete={(id) => deleteAllocation(allocEdit.accountId, id)}
          onClose={() => setAllocEdit(null)}
        />
      )}
    </PlanTabScreen>
  );
}

const styles = StyleSheet.create({
  accountCard: { borderWidth: StyleSheet.hairlineWidth },
  accountHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3 },
  cardSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  allocHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  allocAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 34,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  allocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
  },
});
