import { useEffect } from 'react';
import { ScrollView, View, TouchableOpacity, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  calculatePaycheckBreakdown,
  getPaychecksPerYear,
  convertBillToYearly,
  formatCurrency,
} from '@paycheck-planner/core';
import { usePlan } from '../../src/contexts/PlanContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { ThemedView } from '../../src/components/ThemedView';
import { ThemedText } from '../../src/components/ThemedText';
import { MetricRow } from '../../src/components/MetricRow';
import { SectionCard } from '../../src/components/SectionCard';

export default function SummaryScreen() {
  const { plan, closePlan } = usePlan();
  const { colors, spacing, radius } = useTheme();

  useEffect(() => {
    if (!plan) {
      router.replace('/');
    }
  }, [plan]);

  if (!plan) return null;

  const { currency, locale } = plan.settings;
  const fmt = (n: number) => formatCurrency(n, currency, locale);

  const breakdown = calculatePaycheckBreakdown(plan);
  const paychecksPerYear = getPaychecksPerYear(plan.paySettings.payFrequency);
  const annualNet = breakdown.netPay * paychecksPerYear;
  const annualGross = breakdown.grossPay * paychecksPerYear;

  const annualBills = plan.bills
    .filter((b) => b.enabled !== false)
    .reduce((sum, b) => sum + convertBillToYearly(b.amount, b.frequency), 0);

  const annualLoans = plan.loans
    .filter((l) => l.enabled !== false)
    .reduce((sum, l) => {
      const freq = l.paymentFrequency ?? 'monthly';
      return sum + convertBillToYearly(l.monthlyPayment, freq);
    }, 0);

  const annualObligations = annualBills + annualLoans;
  const annualRemaining = annualNet - annualObligations;

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen
        options={{
          title: plan.name,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => { closePlan(); router.replace('/'); }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 4 }}
              style={{ marginRight: 4 }}
            >
              <ThemedText variant="accent" size="sm" weight="medium">
                Close
              </ThemedText>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Annual net hero */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.accentPrimary,
              borderRadius: radius.xl,
              padding: spacing.lg,
              marginBottom: spacing.md,
            },
          ]}
        >
          <ThemedText
            size="xs"
            weight="semibold"
            variant="inverse"
            style={{ opacity: 0.8, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: spacing.xs }}
          >
            Annual Net Pay
          </ThemedText>
          <ThemedText size="xxxl" weight="bold" variant="inverse" style={{ marginBottom: 4 }}>
            {fmt(annualNet)}
          </ThemedText>
          <ThemedText size="sm" variant="inverse" style={{ opacity: 0.8 }}>
            {fmt(breakdown.netPay)} per paycheck · {paychecksPerYear}× per year
          </ThemedText>
        </View>

        {/* Income flow */}
        <SectionCard title="Income Flow">
          <MetricRow label="Gross Pay" value={fmt(breakdown.grossPay)} />
          {(breakdown.otherIncomeGross ?? 0) > 0 && (
            <MetricRow
              label="Other Income"
              value={fmt(breakdown.otherIncomeGross ?? 0)}
              indented
            />
          )}
          <MetricRow
            label="Pre-Tax Deductions"
            value={`−${fmt(breakdown.preTaxDeductions)}`}
            isNegative
            indented
          />
          <MetricRow
            label="Total Taxes"
            value={`−${fmt(breakdown.totalTaxes)}`}
            isNegative
            indented
          />
          <MetricRow label="Net Pay (per check)" value={fmt(breakdown.netPay)} isTotal />
        </SectionCard>

        {/* Annual spending allocation */}
        <SectionCard title="Annual Spending">
          <MetricRow label="Net Income" value={fmt(annualNet)} />
          {annualBills > 0 && (
            <MetricRow label="Bills" value={`−${fmt(annualBills)}`} isNegative indented />
          )}
          {annualLoans > 0 && (
            <MetricRow label="Loans" value={`−${fmt(annualLoans)}`} isNegative indented />
          )}
          <MetricRow
            label={annualRemaining >= 0 ? 'Remaining / Savings' : 'Shortfall'}
            value={fmt(Math.abs(annualRemaining))}
            isTotal
            isNegative={annualRemaining < 0}
          />
        </SectionCard>

        {/* Pay schedule info */}
        <SectionCard title="Pay Schedule">
          <MetricRow
            label="Frequency"
            value={plan.paySettings.payFrequency.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          />
          <MetricRow label="Annual Gross" value={fmt(annualGross)} />
          <MetricRow label="Tax Rate (effective)" value={`${((breakdown.totalTaxes / (breakdown.grossPay || 1)) * 100).toFixed(1)}%`} />
        </SectionCard>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  heroCard: { alignItems: 'flex-start' },
});
