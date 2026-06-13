import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import {
  calculatePaycheckBreakdown,
  calculateTaxLineAmount,
  getTaxLineCalculationType,
  type TaxFilingStatus,
  type TaxLine,
} from '@paycheck-planner/core';
import { usePlanScreen } from '../src/hooks/usePlanScreen';
import { useTheme } from '../src/contexts/ThemeContext';
import { ThemedView } from '../src/components/ThemedView';
import { ThemedText } from '../src/components/ThemedText';
import { MetricRow } from '../src/components/MetricRow';
import { SectionCard } from '../src/components/SectionCard';
import { ItemCard } from '../src/components/ItemCard';
import { EmptyState } from '../src/components/EmptyState';
import { OptionPicker } from '../src/components/OptionPicker';
import { FormField } from '../src/components/FormField';
import { TaxLineFormSheet } from '../src/features/taxes/TaxLineFormSheet';
import { upsertById, removeById, parseAmount, amountToInput } from '../src/utils/planMutations';

export default function TaxesScreen() {
  const helpers = usePlanScreen();
  const { spacing } = useTheme();
  const [editingLine, setEditingLine] = useState<TaxLine | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [withholdingInput, setWithholdingInput] = useState<string | null>(null);

  const breakdown = useMemo(
    () => (helpers ? calculatePaycheckBreakdown(helpers.plan) : null),
    [helpers],
  );

  if (!helpers || !breakdown) return null;

  const { plan, updatePlan, fmt } = helpers;
  const taxLines = plan.taxSettings.taxLines ?? [];
  const filingStatus: TaxFilingStatus = plan.taxSettings.filingStatus ?? 'single';

  const withholdingValue =
    withholdingInput ?? amountToInput(plan.taxSettings.additionalWithholding || 0);

  function commitWithholding(text: string) {
    setWithholdingInput(text);
    const parsed = text.trim() === '' ? 0 : parseAmount(text);
    if (parsed === null) return;
    updatePlan((p) => ({
      ...p,
      taxSettings: { ...p.taxSettings, additionalWithholding: parsed },
    }));
  }

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'Tax Settings' }} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionCard title="Per-Paycheck Summary">
          <MetricRow label="Taxable Income" value={fmt(breakdown.taxableIncome)} />
          <MetricRow label="Total Taxes" value={`−${fmt(breakdown.totalTaxes)}`} isNegative isTotal />
        </SectionCard>

        <SectionCard
          title="Tax Lines"
          actionLabel="Add"
          onAction={() => {
            setEditingLine(null);
            setSheetVisible(true);
          }}
        >
          {taxLines.length === 0 ? (
            <EmptyState
              icon="percent"
              title="No tax lines"
              message="Add federal, state, Social Security, and Medicare withholding lines."
            />
          ) : (
            taxLines.map((line) => {
              const calcType = getTaxLineCalculationType(line);
              const perPaycheck = calculateTaxLineAmount(
                breakdown.taxableIncome,
                line,
                breakdown.grossPay,
              );
              return (
                <ItemCard
                  key={line.id}
                  title={line.label}
                  subtitle={calcType === 'fixed' ? 'Fixed amount' : `${line.rate}% of taxable income`}
                  amount={fmt(perPaycheck)}
                  amountCaption="per check"
                  onPress={() => {
                    setEditingLine(line);
                    setSheetVisible(true);
                  }}
                />
              );
            })
          )}
        </SectionCard>

        <SectionCard title="Withholding & Filing">
          <FormField
            label="Additional Withholding (per paycheck)"
            value={withholdingValue}
            onChangeText={commitWithholding}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
          <OptionPicker
            label="Filing Status"
            options={[
              { value: 'single', label: 'Single' },
              { value: 'married_filing_jointly', label: 'Married Filing Jointly' },
            ]}
            value={filingStatus}
            onChange={(status) =>
              updatePlan((p) => ({
                ...p,
                taxSettings: { ...p.taxSettings, filingStatus: status },
              }))
            }
          />
          <ThemedText variant="tertiary" size="xs">
            Tax rates are manual on mobile. Use the desktop app's auto-estimate to refresh rates
            from current brackets.
          </ThemedText>
        </SectionCard>
      </ScrollView>

      {sheetVisible && (
        <TaxLineFormSheet
          line={editingLine}
          onSave={(line) =>
            updatePlan((p) => ({
              ...p,
              taxSettings: { ...p.taxSettings, taxLines: upsertById(p.taxSettings.taxLines, line) },
            }))
          }
          onDelete={(id) =>
            updatePlan((p) => ({
              ...p,
              taxSettings: { ...p.taxSettings, taxLines: removeById(p.taxSettings.taxLines, id) },
            }))
          }
          onClose={() => setSheetVisible(false)}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
