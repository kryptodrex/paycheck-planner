import { useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  calculatePaycheckBreakdown,
  getPaychecksPerYear,
  formatCurrency,
} from '@paycheck-planner/core';
import { usePlan } from '../../src/contexts/PlanContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { ThemedView } from '../../src/components/ThemedView';
import { MetricRow } from '../../src/components/MetricRow';
import { SectionCard } from '../../src/components/SectionCard';

export default function BreakdownScreen() {
  const { plan } = usePlan();
  const { spacing } = useTheme();

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

  const annualize = (n: number) => n * paychecksPerYear;

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'Pay Breakdown' }} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Per paycheck */}
        <SectionCard title="Per Paycheck">
          <MetricRow label="Gross Pay" value={fmt(breakdown.grossPay)} />

          {/* Pre-tax deductions detail */}
          {plan.preTaxDeductions.map((d) => (
            <MetricRow
              key={d.id}
              label={d.name}
              value={`−${fmt(d.isPercentage ? (breakdown.grossPay * d.amount) / 100 : d.amount)}`}
              isNegative
              indented
            />
          ))}

          {/* Benefits (pre-tax, paycheck-deducted) */}
          {plan.benefits
            .filter(
              (b) =>
                b.enabled !== false &&
                !b.isTaxable &&
                (b.deductionSource ?? 'paycheck') === 'paycheck',
            )
            .map((b) => (
              <MetricRow
                key={b.id}
                label={b.name}
                value={`−${fmt(b.isPercentage ? (breakdown.grossPay * b.amount) / 100 : b.amount)}`}
                isNegative
                indented
              />
            ))}

          {/* Retirement (pre-tax) */}
          {plan.retirement
            .filter(
              (r) =>
                r.enabled !== false &&
                r.isPreTax !== false &&
                (r.deductionSource ?? 'paycheck') === 'paycheck',
            )
            .map((r) => (
              <MetricRow
                key={r.id}
                label={r.customLabel ?? r.type}
                value={`−${fmt(r.employeeContributionIsPercentage ? (breakdown.grossPay * r.employeeContribution) / 100 : r.employeeContribution)}`}
                isNegative
                indented
              />
            ))}

          <MetricRow
            label="Taxable Income"
            value={fmt(breakdown.taxableIncome)}
            isTotal
          />
        </SectionCard>

        {/* Tax lines */}
        <SectionCard title="Taxes (Per Paycheck)">
          {breakdown.taxLineAmounts.length === 0 ? (
            <MetricRow label="No tax lines configured" value="" />
          ) : (
            breakdown.taxLineAmounts.map((line) => (
              <MetricRow key={line.id} label={line.label} value={`−${fmt(line.amount)}`} isNegative />
            ))
          )}
          {breakdown.additionalWithholding > 0 && (
            <MetricRow
              label="Additional Withholding"
              value={`−${fmt(breakdown.additionalWithholding)}`}
              isNegative
            />
          )}
          <MetricRow label="Total Taxes" value={`−${fmt(breakdown.totalTaxes)}`} isTotal isNegative />
        </SectionCard>

        {/* Net */}
        <SectionCard title="Take-Home">
          <MetricRow label="Net Pay (per check)" value={fmt(breakdown.netPay)} />
          <MetricRow
            label={`Net Pay (annual · ${paychecksPerYear}×)`}
            value={fmt(annualize(breakdown.netPay))}
            isTotal
          />
        </SectionCard>

        {/* Annual summary */}
        <SectionCard title="Annual Totals">
          <MetricRow label="Gross" value={fmt(annualize(breakdown.grossPay))} />
          <MetricRow label="Pre-Tax Deductions" value={`−${fmt(annualize(breakdown.preTaxDeductions))}`} isNegative />
          <MetricRow label="Taxes" value={`−${fmt(annualize(breakdown.totalTaxes))}`} isNegative />
          <MetricRow label="Net" value={fmt(annualize(breakdown.netPay))} isTotal />
        </SectionCard>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
