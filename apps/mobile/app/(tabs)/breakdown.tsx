import { useMemo } from 'react';
import { ScrollView, View, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  calculatePaycheckBreakdown,
  getDisplayModeLabel,
  getRetirementLabel,
} from '@paycheck-planner/core';
import { usePlanScreen } from '../../src/hooks/usePlanScreen';
import { useTheme } from '../../src/contexts/ThemeContext';
import { ThemedText } from '../../src/components/ThemedText';
import { MetricRow } from '../../src/components/MetricRow';
import { SectionCard } from '../../src/components/SectionCard';
import { ViewModeSelector } from '../../src/components/ViewModeSelector';
import { PlanTabScreen } from '../../src/components/PlanTabScreen';

export default function BreakdownScreen() {
  const helpers = usePlanScreen();
  const { colors, spacing, radius } = useTheme();

  const breakdown = useMemo(
    () => (helpers ? calculatePaycheckBreakdown(helpers.plan) : null),
    [helpers],
  );

  if (!helpers || !breakdown) return null;

  const { plan, fmt, displayMode, setDisplayMode, display, paychecksPerYear } = helpers;
  const modeLabel = getDisplayModeLabel(displayMode);
  const grossPay = breakdown.grossPay;

  const fixedOrPct = (amount: number, isPercentage?: boolean) =>
    isPercentage ? (grossPay * amount) / 100 : amount;

  const postTaxBenefits = plan.benefits.filter(
    (b) => b.enabled !== false && b.isTaxable && (b.deductionSource ?? 'paycheck') === 'paycheck',
  );
  const postTaxRetirement = plan.retirement.filter(
    (r) =>
      r.enabled !== false &&
      r.isPreTax === false &&
      (r.deductionSource ?? 'paycheck') === 'paycheck',
  );

  return (
    <PlanTabScreen title="Breakdown" subtitle={plan.name}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: spacing.md }}>
          <ViewModeSelector value={displayMode} onChange={setDisplayMode} />
        </View>

        {/* Gross to taxable */}
        <SectionCard
          title={`Earnings · ${modeLabel}`}
          actionLabel="Edit"
          actionIcon="edit-2"
          onAction={() => router.push('/pay-settings')}
        >
          <MetricRow label="Gross Pay" value={fmt(display(grossPay))} />

          {plan.preTaxDeductions.map((d) => (
            <MetricRow
              key={d.id}
              label={d.name}
              value={`−${fmt(display(fixedOrPct(d.amount, d.isPercentage)))}`}
              isNegative
              indented
            />
          ))}

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
                value={`−${fmt(display(fixedOrPct(b.amount, b.isPercentage)))}`}
                isNegative
                indented
              />
            ))}

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
                label={getRetirementLabel(r)}
                value={`−${fmt(
                  display(fixedOrPct(r.employeeContribution, r.employeeContributionIsPercentage)),
                )}`}
                isNegative
                indented
              />
            ))}

          <MetricRow label="Taxable Income" value={fmt(display(breakdown.taxableIncome))} isTotal />
        </SectionCard>

        {/* Taxes */}
        <SectionCard title={`Taxes · ${modeLabel}`}>
          {breakdown.taxLineAmounts.length === 0 ? (
            <MetricRow label="No tax lines configured" value="" />
          ) : (
            breakdown.taxLineAmounts.map((line) => (
              <MetricRow
                key={line.id}
                label={line.label}
                value={`−${fmt(display(line.amount))}`}
                isNegative
              />
            ))
          )}
          {breakdown.additionalWithholding > 0 && (
            <MetricRow
              label="Additional Withholding"
              value={`−${fmt(display(breakdown.additionalWithholding))}`}
              isNegative
            />
          )}
          {(breakdown.otherIncomeAutoWithholding ?? 0) > 0 && (
            <MetricRow
              label="Other Income Withholding"
              value={`−${fmt(display(breakdown.otherIncomeAutoWithholding ?? 0))}`}
              isNegative
            />
          )}
          <MetricRow
            label="Total Taxes"
            value={`−${fmt(display(breakdown.totalTaxes))}`}
            isTotal
            isNegative
          />

          <TouchableOpacity
            style={[
              styles.editTaxes,
              {
                borderColor: colors.border,
                borderRadius: radius.md,
                marginTop: spacing.sm,
              },
            ]}
            onPress={() => router.push('/taxes')}
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={15} color={colors.textAccent} />
            <ThemedText variant="accent" size="sm" weight="semibold">
              Edit Tax Settings
            </ThemedText>
          </TouchableOpacity>
        </SectionCard>

        {/* Post-tax deductions */}
        {(postTaxBenefits.length > 0 || postTaxRetirement.length > 0) && (
          <SectionCard title={`Post-Tax Deductions · ${modeLabel}`}>
            {postTaxBenefits.map((b) => (
              <MetricRow
                key={b.id}
                label={b.name}
                value={`−${fmt(display(fixedOrPct(b.amount, b.isPercentage)))}`}
                isNegative
              />
            ))}
            {postTaxRetirement.map((r) => (
              <MetricRow
                key={r.id}
                label={getRetirementLabel(r)}
                value={`−${fmt(
                  display(fixedOrPct(r.employeeContribution, r.employeeContributionIsPercentage)),
                )}`}
                isNegative
              />
            ))}
          </SectionCard>
        )}

        {/* Net */}
        <SectionCard title="Take-Home">
          <MetricRow label={`Net Pay · ${modeLabel}`} value={fmt(display(breakdown.netPay))} />
          <MetricRow
            label={`Net Pay · Yearly (${paychecksPerYear} checks)`}
            value={fmt(breakdown.netPay * paychecksPerYear)}
            isTotal
          />
        </SectionCard>
      </ScrollView>
    </PlanTabScreen>
  );
}

const styles = StyleSheet.create({
  editTaxes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
