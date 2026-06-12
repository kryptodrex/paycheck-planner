import { useMemo } from 'react';
import { ScrollView, View, TouchableOpacity, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getDisplayModeLabel } from '@paycheck-planner/core';
import { usePlan } from '../../src/contexts/PlanContext';
import { usePlanScreen } from '../../src/hooks/usePlanScreen';
import { useTheme } from '../../src/contexts/ThemeContext';
import { computeSummaryMetrics } from '../../src/utils/summaryMetrics';
import { ThemedView } from '../../src/components/ThemedView';
import { ThemedText } from '../../src/components/ThemedText';
import { MetricRow } from '../../src/components/MetricRow';
import { SectionCard } from '../../src/components/SectionCard';
import { GradientCard } from '../../src/components/GradientCard';
import { AllocationBar } from '../../src/components/AllocationBar';
import { ViewModeSelector } from '../../src/components/ViewModeSelector';

export default function SummaryScreen() {
  const { closePlan } = usePlan();
  const helpers = usePlanScreen();
  const { colors, spacing, radius } = useTheme();

  const metrics = useMemo(
    () => (helpers ? computeSummaryMetrics(helpers.plan) : null),
    [helpers],
  );

  if (!helpers || !metrics) return null;

  const { plan, fmt, displayMode, setDisplayMode, display } = helpers;
  const modeLabel = getDisplayModeLabel(displayMode);

  const heroNet = display(metrics.breakdown.netPay);
  const remainingDisplay = display(metrics.remainingPerPaycheck);
  const isShortfall = metrics.remainingPerPaycheck < 0;
  const targetLeftover = plan.paySettings.minLeftover || 0;
  // Offer reallocation whenever remaining falls below the target leftover
  // (or below zero when no target is set) — mirrors the desktop trigger.
  const needsReallocation = metrics.remainingPerPaycheck < targetLeftover || isShortfall;

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen
        options={{
          title: plan.name,
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => router.push('/search')}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                accessibilityLabel="Search plan"
              >
                <Feather name="search" size={18} color={colors.textAccent} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  closePlan();
                  router.replace('/');
                }}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 4 }}
                style={{ marginRight: 4 }}
              >
                <ThemedText variant="accent" size="sm" weight="medium">
                  Close
                </ThemedText>
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: spacing.md }}>
          <ViewModeSelector value={displayMode} onChange={setDisplayMode} />
        </View>

        {/* Net pay hero — mirrors the desktop KeyMetrics header card */}
        <GradientCard style={{ marginBottom: spacing.md }}>
          <ThemedText
            size="xs"
            weight="semibold"
            variant="inverse"
            style={{
              opacity: 0.85,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              marginBottom: spacing.xs,
            }}
          >
            Net Pay · {modeLabel}
          </ThemedText>
          <ThemedText size="xxxl" weight="bold" variant="inverse" style={{ marginBottom: 4 }}>
            {fmt(heroNet)}
          </ThemedText>
          <ThemedText size="sm" variant="inverse" style={{ opacity: 0.85 }}>
            {fmt(metrics.annualNet)} per year · {metrics.paychecksPerYear} paychecks
          </ThemedText>
        </GradientCard>

        {/* Shortfall warning + reallocation entry */}
        {needsReallocation && (
          <View
            style={[
              styles.warningBox,
              {
                backgroundColor: colors.warning + '20',
                borderColor: colors.warning,
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: spacing.md,
              },
            ]}
          >
            <ThemedText size="sm" weight="semibold" style={{ color: colors.warning }}>
              {isShortfall ? 'Allocations exceed net pay' : 'Leftover below target'}
            </ThemedText>
            <ThemedText variant="secondary" size="xs" style={{ marginTop: 2 }}>
              {isShortfall
                ? `You are short ${fmt(Math.abs(remainingDisplay))} ${modeLabel.toLowerCase()}.`
                : `Remaining for spending is below your ${fmt(targetLeftover)} per-paycheck target.`}
            </ThemedText>
            <TouchableOpacity
              style={[
                styles.warningAction,
                { borderColor: colors.warning, borderRadius: radius.sm, marginTop: spacing.sm },
              ]}
              onPress={() => router.push('/reallocation')}
              activeOpacity={0.75}
            >
              <ThemedText size="xs" weight="semibold" style={{ color: colors.warning }}>
                Review Reallocation Options
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Gross allocation bar — desktop KeyMetrics breakdown chart */}
        <SectionCard title="Where Your Gross Pay Goes (Yearly)">
          <AllocationBar segments={metrics.barSegments} formatAmount={fmt} />
        </SectionCard>

        {/* Income */}
        <SectionCard
          title={`Income · ${modeLabel}`}
          actionLabel="Edit"
          actionIcon="edit-2"
          onAction={() => router.push('/pay-settings')}
        >
          <MetricRow label="Gross Pay" value={fmt(display(metrics.breakdown.grossPay))} />
          {(metrics.breakdown.otherIncomeGross ?? 0) > 0 && (
            <MetricRow
              label="Other Income"
              value={fmt(display(metrics.breakdown.otherIncomeGross ?? 0))}
              indented
            />
          )}
          <MetricRow
            label="Taxes"
            value={`−${fmt(display(metrics.breakdown.totalTaxes))}`}
            isNegative
            indented
          />
          <MetricRow
            label="Pre-Tax Deductions"
            value={`−${fmt(display(metrics.breakdown.preTaxDeductions))}`}
            isNegative
            indented
          />
          <MetricRow label="Net Pay" value={fmt(heroNet)} isTotal />
        </SectionCard>

        {/* Key rates */}
        <SectionCard title="Key Rates">
          <MetricRow label="Effective Tax Rate" value={`${metrics.effectiveTaxRate.toFixed(1)}%`} />
          <MetricRow label="Savings Rate" value={`${metrics.savingsRate.toFixed(1)}%`} />
          <MetricRow label="Annual Savings" value={fmt(metrics.annualSavings)} />
        </SectionCard>

        {/* Recurring expenses */}
        <SectionCard title="Recurring Expenses">
          <MetricRow label="Monthly Total" value={fmt(metrics.monthlyRecurringExpenses)} />
          <MetricRow label="Yearly Total" value={fmt(metrics.annualRecurringExpenses)} />
          <MetricRow
            label="Tracked Items"
            value={`${metrics.recurringExpenseCount}`}
          />
        </SectionCard>

        {/* Remaining for spending */}
        <SectionCard title="Remaining for Spending">
          <MetricRow
            label={isShortfall ? `Shortfall · ${modeLabel}` : modeLabel}
            value={fmt(Math.abs(remainingDisplay))}
            isNegative={isShortfall}
            isTotal
          />
          <ThemedText variant="tertiary" size="xs" style={{ marginTop: spacing.xs }}>
            Net pay after bills, loans, savings, and account allocations.
          </ThemedText>
        </SectionCard>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  warningBox: { borderWidth: 1 },
  warningAction: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
