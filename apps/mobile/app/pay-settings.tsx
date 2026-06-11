import { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  calculateGrossPayPerPaycheck,
  calculateGrossPayPerYear,
  formatPayFrequencyLabel,
  type Deduction,
  type PayFrequency,
  type PayType,
} from '@paycheck-planner/core';
import { usePlanScreen } from '../src/hooks/usePlanScreen';
import { useTheme } from '../src/contexts/ThemeContext';
import { ThemedView } from '../src/components/ThemedView';
import { ThemedText } from '../src/components/ThemedText';
import { MetricRow } from '../src/components/MetricRow';
import { SectionCard } from '../src/components/SectionCard';
import { Button } from '../src/components/Button';
import { FormField } from '../src/components/FormField';
import { FormError } from '../src/components/FormError';
import { OptionPicker } from '../src/components/OptionPicker';
import { ItemCard } from '../src/components/ItemCard';
import { EmptyState } from '../src/components/EmptyState';
import { DeductionFormSheet } from '../src/features/pay/DeductionFormSheet';
import {
  upsertById,
  removeById,
  parseAmount,
  amountToInput,
} from '../src/utils/planMutations';

const PAY_FREQUENCIES: PayFrequency[] = ['weekly', 'bi-weekly', 'semi-monthly', 'monthly'];

const FREQUENCY_OPTIONS = PAY_FREQUENCIES.map((frequency) => ({
  value: frequency,
  label: formatPayFrequencyLabel(frequency),
}));

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default function PaySettingsScreen() {
  const helpers = usePlanScreen();
  const { spacing } = useTheme();

  const paySettings = helpers?.plan.paySettings;
  const [payType, setPayType] = useState<PayType>(paySettings?.payType ?? 'salary');
  const [annualSalary, setAnnualSalary] = useState(amountToInput(paySettings?.annualSalary));
  const [hourlyRate, setHourlyRate] = useState(amountToInput(paySettings?.hourlyRate));
  const [hoursPerPayPeriod, setHoursPerPayPeriod] = useState(
    amountToInput(paySettings?.hoursPerPayPeriod),
  );
  const [payFrequency, setPayFrequency] = useState<PayFrequency>(
    paySettings?.payFrequency ?? 'bi-weekly',
  );
  const [firstPaycheckDate, setFirstPaycheckDate] = useState(paySettings?.firstPaycheckDate ?? '');
  const [minLeftover, setMinLeftover] = useState(amountToInput(paySettings?.minLeftover));
  const [error, setError] = useState<string | null>(null);
  const [editingDeduction, setEditingDeduction] = useState<Deduction | null>(null);
  const [deductionSheetVisible, setDeductionSheetVisible] = useState(false);

  if (!helpers) return null;

  const { plan, updatePlan, fmt } = helpers;

  const previewSettings = {
    payType,
    annualSalary: parseAmount(annualSalary) ?? 0,
    hourlyRate: parseAmount(hourlyRate) ?? 0,
    hoursPerPayPeriod: parseAmount(hoursPerPayPeriod) ?? 0,
    payFrequency,
  };
  const previewGrossPerCheck = calculateGrossPayPerPaycheck(previewSettings);
  const previewGrossPerYear = calculateGrossPayPerYear(previewSettings);

  function handleSave() {
    const parsedSalary = parseAmount(annualSalary);
    const parsedRate = parseAmount(hourlyRate);
    const parsedHours = parseAmount(hoursPerPayPeriod);
    const parsedLeftover = minLeftover.trim() ? parseAmount(minLeftover) : 0;

    if (payType === 'salary' && (parsedSalary === null || parsedSalary <= 0)) {
      return setError('Please enter a valid annual salary.');
    }
    if (payType === 'hourly' && (parsedRate === null || parsedRate <= 0)) {
      return setError('Please enter a valid hourly rate.');
    }
    if (payType === 'hourly' && (parsedHours === null || parsedHours <= 0)) {
      return setError('Please enter valid hours per pay period.');
    }
    if (firstPaycheckDate.trim() && !DATE_PATTERN.test(firstPaycheckDate.trim())) {
      return setError('First paycheck date must use the YYYY-MM-DD format.');
    }
    if (parsedLeftover === null) {
      return setError('Please enter a valid minimum leftover amount.');
    }

    updatePlan((p) => ({
      ...p,
      paySettings: {
        ...p.paySettings,
        payType,
        annualSalary: payType === 'salary' ? (parsedSalary ?? undefined) : undefined,
        hourlyRate: payType === 'hourly' ? (parsedRate ?? undefined) : undefined,
        hoursPerPayPeriod: payType === 'hourly' ? (parsedHours ?? undefined) : undefined,
        payFrequency,
        firstPaycheckDate: firstPaycheckDate.trim() || undefined,
        minLeftover: parsedLeftover || undefined,
      },
    }));
    router.back();
  }

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'Pay Settings' }} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FormError message={error} />

        <SectionCard title="Pay">
          <OptionPicker
            label="Pay Type"
            options={[
              { value: 'salary', label: 'Salary' },
              { value: 'hourly', label: 'Hourly' },
            ]}
            value={payType}
            onChange={setPayType}
          />

          {payType === 'salary' ? (
            <FormField
              label="Annual Salary"
              value={annualSalary}
              onChangeText={(text) => {
                setAnnualSalary(text);
                setError(null);
              }}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          ) : (
            <>
              <FormField
                label="Hourly Rate"
                value={hourlyRate}
                onChangeText={(text) => {
                  setHourlyRate(text);
                  setError(null);
                }}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
              <FormField
                label="Hours per Pay Period"
                value={hoursPerPayPeriod}
                onChangeText={(text) => {
                  setHoursPerPayPeriod(text);
                  setError(null);
                }}
                placeholder="80"
                keyboardType="decimal-pad"
              />
            </>
          )}

          <OptionPicker
            label="Pay Frequency"
            options={FREQUENCY_OPTIONS}
            value={payFrequency}
            onChange={setPayFrequency}
          />

          <FormField
            label="First Paycheck Date"
            value={firstPaycheckDate}
            onChangeText={(text) => {
              setFirstPaycheckDate(text);
              setError(null);
            }}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            hint="Optional — anchors the pay calendar"
          />

          <FormField
            label="Minimum Leftover per Paycheck"
            value={minLeftover}
            onChangeText={(text) => {
              setMinLeftover(text);
              setError(null);
            }}
            placeholder="0.00"
            keyboardType="decimal-pad"
            hint="Optional buffer to keep unallocated each paycheck"
          />
        </SectionCard>

        <SectionCard title="Preview">
          <MetricRow label="Gross per Paycheck" value={fmt(previewGrossPerCheck)} />
          <MetricRow label="Gross per Year" value={fmt(previewGrossPerYear)} isTotal />
        </SectionCard>

        <SectionCard
          title="Pre-Tax Deductions"
          actionLabel="Add"
          onAction={() => {
            setEditingDeduction(null);
            setDeductionSheetVisible(true);
          }}
        >
          {plan.preTaxDeductions.length === 0 ? (
            <EmptyState
              icon="minus-circle"
              title="No pre-tax deductions"
              message="Deductions here reduce taxable income before tax lines apply."
            />
          ) : (
            plan.preTaxDeductions.map((deduction) => (
              <ItemCard
                key={deduction.id}
                title={deduction.name}
                amount={deduction.isPercentage ? `${deduction.amount}%` : fmt(deduction.amount)}
                amountCaption={deduction.isPercentage ? 'of gross' : 'per check'}
                onPress={() => {
                  setEditingDeduction(deduction);
                  setDeductionSheetVisible(true);
                }}
              />
            ))
          )}
        </SectionCard>

        <View style={{ gap: spacing.sm }}>
          <Button title="Save Pay Settings" onPress={handleSave} />
          <Button title="Cancel" variant="secondary" onPress={() => router.back()} />
        </View>

        <ThemedText variant="tertiary" size="xs" style={{ marginTop: spacing.md }}>
          Currency ({plan.settings.currency}) can be changed on desktop, which also converts
          existing amounts using live exchange rates.
        </ThemedText>
      </ScrollView>

      {deductionSheetVisible && (
        <DeductionFormSheet
          deduction={editingDeduction}
          onSave={(deduction) =>
            updatePlan((p) => ({
              ...p,
              preTaxDeductions: upsertById(p.preTaxDeductions, deduction),
            }))
          }
          onDelete={(id) =>
            updatePlan((p) => ({ ...p, preTaxDeductions: removeById(p.preTaxDeductions, id) }))
          }
          onClose={() => setDeductionSheetVisible(false)}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
