import { useMemo, useState } from 'react';
import { ScrollView, View, Switch, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  applyReallocationPlan,
  buildOverriddenPlan,
  createReallocationPlan,
  getPaychecksPerYear,
  REALLOCATION_SOURCE_TYPE_METADATA,
  type ReallocationPlannerInput,
  type ReallocationProposal,
} from '@paycheck-planner/core';
import { usePlanScreen } from '../src/hooks/usePlanScreen';
import { useTheme } from '../src/contexts/ThemeContext';
import { buildCustomAllocationItems, computeSummaryMetrics } from '../src/utils/summaryMetrics';
import { ThemedView } from '../src/components/ThemedView';
import { ThemedText } from '../src/components/ThemedText';
import { MetricRow } from '../src/components/MetricRow';
import { SectionCard } from '../src/components/SectionCard';
import { Button } from '../src/components/Button';
import { EmptyState } from '../src/components/EmptyState';

const ACTION_LABELS: Record<ReallocationProposal['action'], string> = {
  pause: 'Pause',
  zero: 'Zero out',
  reduce: 'Reduce',
};

export default function ReallocationScreen() {
  const helpers = usePlanScreen();
  const { colors, spacing, radius } = useTheme();
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const planner = useMemo(() => {
    if (!helpers) return null;
    const { plan } = helpers;
    const metrics = computeSummaryMetrics(plan);
    const paychecksPerYear = getPaychecksPerYear(plan.paySettings.payFrequency);

    const input: ReallocationPlannerInput = {
      targetRemainingPerPaycheck: plan.paySettings.minLeftover || 0,
      currentRemainingPerPaycheck: metrics.remainingPerPaycheck,
      grossPayPerPaycheck: metrics.breakdown.grossPay,
      paychecksPerYear,
      paySettings: plan.paySettings,
      preTaxDeductions: plan.preTaxDeductions || [],
      bills: plan.bills || [],
      benefits: plan.benefits || [],
      taxSettings: plan.taxSettings,
      savingsContributions: plan.savingsContributions || [],
      retirementElections: plan.retirement || [],
      accounts: plan.accounts,
      customAllocations: buildCustomAllocationItems(plan.accounts),
    };

    return { input, basePlan: createReallocationPlan(input) };
  }, [helpers]);

  if (!helpers || !planner) return null;

  const { updatePlan, fmt } = helpers;
  const { input, basePlan } = planner;

  // Skipped items get a freed override of 0; everything else keeps the algorithm value.
  const overrides = new Map<string, number>();
  for (const sourceId of skipped) overrides.set(sourceId, 0);
  const reviewPlan = buildOverriddenPlan(basePlan, overrides);

  const proposalsBySection = REALLOCATION_SOURCE_TYPE_METADATA.map((section) => ({
    section,
    proposals: basePlan.proposals.filter((proposal) => proposal.sourceType === section.id),
  })).filter((group) => group.proposals.length > 0);

  function toggleSkip(sourceId: string, include: boolean) {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (include) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  }

  function handleApply() {
    const result = applyReallocationPlan(input, reviewPlan);
    updatePlan(
      (p) => ({
        ...p,
        accounts: result.accounts,
        bills: result.bills,
        benefits: result.benefits,
        savingsContributions: result.savingsContributions,
        retirement: result.retirementElections,
      }),
      { description: 'Apply reallocation plan' },
    );
    router.back();
  }

  const noShortfall = basePlan.shortfallPerPaycheck <= 0;
  const hasSelection = reviewPlan.proposals.length > 0;

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'Reallocation Review' }} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionCard title="Per-Paycheck Shortfall">
          <MetricRow label="Target Leftover" value={fmt(basePlan.targetRemainingPerPaycheck)} />
          <MetricRow
            label="Current Remaining"
            value={fmt(basePlan.currentRemainingPerPaycheck)}
            isNegative={basePlan.currentRemainingPerPaycheck < 0}
          />
          <MetricRow
            label="Shortfall"
            value={fmt(basePlan.shortfallPerPaycheck)}
            isNegative={basePlan.shortfallPerPaycheck > 0}
            isTotal
          />
        </SectionCard>

        {noShortfall ? (
          <SectionCard>
            <EmptyState
              icon="check-circle"
              title="No shortfall to resolve"
              message="Your remaining-for-spending already meets the target leftover."
            />
          </SectionCard>
        ) : basePlan.proposals.length === 0 ? (
          <SectionCard>
            <EmptyState
              icon="lock"
              title="Nothing can be reallocated"
              message="All savings and retirement items are protected, and no discretionary bills are available to pause."
            />
          </SectionCard>
        ) : (
          <>
            {proposalsBySection.map(({ section, proposals }) => (
              <SectionCard key={section.id} title={section.label}>
                {proposals.map((proposal) => {
                  const included = !skipped.has(proposal.sourceId);
                  return (
                    <View
                      key={proposal.sourceId}
                      style={[
                        styles.proposalRow,
                        {
                          borderColor: colors.border,
                          borderRadius: radius.md,
                          padding: spacing.sm,
                          marginBottom: spacing.sm,
                          opacity: included ? 1 : 0.5,
                        },
                      ]}
                    >
                      <View style={{ flex: 1, paddingRight: spacing.sm }}>
                        <ThemedText size="sm" weight="semibold" numberOfLines={1}>
                          {proposal.label}
                        </ThemedText>
                        <ThemedText variant="secondary" size="xs" style={{ marginTop: 2 }}>
                          {ACTION_LABELS[proposal.action]} · {fmt(proposal.currentPerPaycheckAmount)}
                          {' → '}
                          {fmt(proposal.proposedPerPaycheckAmount)} per check
                        </ThemedText>
                        <ThemedText variant="accent" size="xs" weight="medium" style={{ marginTop: 2 }}>
                          Frees {fmt(proposal.freedPerPaycheckAmount)}
                        </ThemedText>
                      </View>
                      <Switch
                        value={included}
                        onValueChange={(value) => toggleSkip(proposal.sourceId, value)}
                        trackColor={{ false: colors.border, true: colors.accentPrimary }}
                        thumbColor="#ffffff"
                      />
                    </View>
                  );
                })}
              </SectionCard>
            ))}

            <SectionCard title="Projected Outcome">
              <MetricRow label="Total Freed" value={fmt(reviewPlan.totalFreedPerPaycheck)} />
              <MetricRow
                label="Projected Remaining"
                value={fmt(reviewPlan.projectedRemainingPerPaycheck)}
                isTotal
              />
              <ThemedText
                size="xs"
                weight="medium"
                style={{
                  marginTop: spacing.xs,
                  color: reviewPlan.fullyResolved ? colors.success : colors.warning,
                }}
              >
                {reviewPlan.fullyResolved
                  ? 'This plan fully covers the shortfall.'
                  : 'This plan only partially covers the shortfall.'}
              </ThemedText>
            </SectionCard>

            <View style={{ gap: spacing.sm }}>
              <Button
                title={`Apply ${reviewPlan.proposals.length} Change${reviewPlan.proposals.length === 1 ? '' : 's'}`}
                onPress={handleApply}
                disabled={!hasSelection}
              />
              <Button title="Cancel" variant="secondary" onPress={() => router.back()} />
            </View>

            <ThemedText variant="tertiary" size="xs" style={{ marginTop: spacing.md }}>
              Paused items are disabled, not deleted — re-enable them any time from the Money tab.
              Toggle an item off above to keep it unchanged.
            </ThemedText>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  proposalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
