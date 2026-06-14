import { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  calculateGrossPayPerPaycheck,
  calculateGrossPayPerYear,
  formatPayFrequencyLabel,
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
import { DateField } from '../src/components/DateField';
import { parseAmount, amountToInput } from '../src/utils/planMutations';

const PAY_FREQUENCIES: PayFrequency[] = ['weekly', 'bi-weekly', 'semi-monthly', 'monthly'];

const FREQUENCY_OPTIONS = PAY_FREQUENCIES.map((frequency) => ({
  value: frequency,
  label: formatPayFrequencyLabel(frequency),
}));

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
  const [minLeftover, setMinLeftover] = useState(amountToInput(paySettings?.minLeftover));
  const [firstPaycheckDate, setFirstPaycheckDate] = useState(paySettings?.firstPaycheckDate);
  const [error, setError] = useState<string | null>(null);

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
    if (parsedLeftover === null) {
      return setError('Please enter a valid minimum leftover amount.');
    }

    updatePlan(
      (p) => ({
        ...p,
        paySettings: {
          ...p.paySettings,
          payType,
          annualSalary: payType === 'salary' ? (parsedSalary ?? undefined) : undefined,
          hourlyRate: payType === 'hourly' ? (parsedRate ?? undefined) : undefined,
          hoursPerPayPeriod: payType === 'hourly' ? (parsedHours ?? undefined) : undefined,
          payFrequency,
          firstPaycheckDate,
          minLeftover: parsedLeftover || undefined,
        },
      }),
      { description: 'Edit pay settings' },
    );
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

          <DateField
            label="First Paycheck Date"
            value={firstPaycheckDate}
            onChange={(iso) => {
              setFirstPaycheckDate(iso);
              setError(null);
            }}
            hint="Used to calculate weekly / bi-weekly paychecks per month accurately."
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

        <View style={{ gap: spacing.sm }}>
          <Button title="Save Pay Settings" onPress={handleSave} />
          <Button title="Cancel" variant="secondary" onPress={() => router.back()} />
        </View>

        <SectionCard title="Currency">
          <ThemedText variant="secondary" size="xs" style={{ marginBottom: spacing.sm }}>
            Current currency: {plan.settings.currency}. Changing it converts existing amounts using
            live exchange rates.
          </ThemedText>
          <Button title="Change Currency…" variant="secondary" onPress={() => router.push('/currency')} />
        </SectionCard>

        <ThemedText variant="tertiary" size="xs" style={{ marginTop: spacing.md }}>
          Manage pre-tax and post-tax deductions in Money → Deductions.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
