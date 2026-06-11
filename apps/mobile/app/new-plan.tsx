import { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  calculateGrossPayPerYear,
  CURRENCIES,
  formatCurrency,
  formatPayFrequencyLabel,
  type PayFrequency,
  type PayType,
} from '@paycheck-planner/core';
import { usePlan } from '../src/contexts/PlanContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { createEmptyPlan } from '../src/utils/createPlan';
import { createPlanFileInLibrary } from '../src/storage/planFileAdapter';
import { addRecentFile } from '../src/storage/recentFilesStore';
import { ThemedView } from '../src/components/ThemedView';
import { ThemedText } from '../src/components/ThemedText';
import { SectionCard } from '../src/components/SectionCard';
import { Button } from '../src/components/Button';
import { FormField } from '../src/components/FormField';
import { FormError } from '../src/components/FormError';
import { OptionPicker } from '../src/components/OptionPicker';
import { parseAmount } from '../src/utils/planMutations';

const PAY_FREQUENCIES: PayFrequency[] = ['weekly', 'bi-weekly', 'semi-monthly', 'monthly'];

const FREQUENCY_OPTIONS = PAY_FREQUENCIES.map((frequency) => ({
  value: frequency,
  label: formatPayFrequencyLabel(frequency),
}));

const CURRENCY_OPTIONS = CURRENCIES.map((currency) => ({
  value: currency.code,
  label: `${currency.flag} ${currency.code}`,
}));

export default function NewPlanScreen() {
  const { setPlan } = usePlan();
  const { spacing } = useTheme();

  const defaultYear = new Date().getFullYear();
  const [name, setName] = useState(`${defaultYear} Plan`);
  const [year, setYear] = useState(String(defaultYear));
  const [currency, setCurrency] = useState('USD');
  const [payType, setPayType] = useState<PayType>('salary');
  const [annualSalary, setAnnualSalary] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [hoursPerPayPeriod, setHoursPerPayPeriod] = useState('');
  const [payFrequency, setPayFrequency] = useState<PayFrequency>('bi-weekly');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const previewGross = calculateGrossPayPerYear({
    payType,
    annualSalary: parseAmount(annualSalary) ?? 0,
    hourlyRate: parseAmount(hourlyRate) ?? 0,
    hoursPerPayPeriod: parseAmount(hoursPerPayPeriod) ?? 0,
    payFrequency,
  });

  async function handleCreate() {
    const parsedYear = Number(year);
    const parsedSalary = parseAmount(annualSalary);
    const parsedRate = parseAmount(hourlyRate);
    const parsedHours = parseAmount(hoursPerPayPeriod);

    if (!name.trim()) return setError('Please enter a plan name.');
    if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      return setError('Please enter a valid year.');
    }
    if (payType === 'salary' && (parsedSalary === null || parsedSalary <= 0)) {
      return setError('Please enter a valid annual salary.');
    }
    if (payType === 'hourly' && (parsedRate === null || parsedRate <= 0 || parsedHours === null || parsedHours <= 0)) {
      return setError('Please enter a valid hourly rate and hours per pay period.');
    }

    setCreating(true);
    try {
      const plan = createEmptyPlan({
        name: name.trim(),
        year: parsedYear,
        currency,
        payType,
        annualSalary: parsedSalary ?? undefined,
        hourlyRate: parsedRate ?? undefined,
        hoursPerPayPeriod: parsedHours ?? undefined,
        payFrequency,
      });

      const uri = await createPlanFileInLibrary(plan);
      await addRecentFile({
        uri,
        name: `${plan.name}.budget`,
        lastOpenedAt: new Date().toISOString(),
        planId: plan.id,
        planName: plan.name,
        planYear: plan.year,
      });

      setPlan(plan, uri);
      router.replace('/(tabs)/summary');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'New Plan' }} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FormError message={error} />

        <SectionCard title="Plan">
          <FormField
            label="Plan Name"
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError(null);
            }}
            placeholder={`${defaultYear} Plan`}
          />
          <FormField
            label="Year"
            value={year}
            onChangeText={(text) => {
              setYear(text);
              setError(null);
            }}
            placeholder={String(defaultYear)}
            keyboardType="number-pad"
          />
          <OptionPicker
            label="Currency"
            options={CURRENCY_OPTIONS}
            value={currency}
            onChange={setCurrency}
          />
        </SectionCard>

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

          {previewGross > 0 && (
            <ThemedText variant="tertiary" size="xs">
              Estimated gross income: {formatCurrency(previewGross, currency)} per year
            </ThemedText>
          )}
        </SectionCard>

        <View style={{ gap: spacing.sm }}>
          <Button title="Create Plan" onPress={handleCreate} loading={creating} />
          <Button title="Cancel" variant="secondary" onPress={() => router.back()} />
        </View>

        <ThemedText variant="tertiary" size="xs" style={{ marginTop: spacing.md }}>
          Your plan starts with a checking account and standard tax lines. Add accounts, bills,
          savings, and taxes from the tabs — everything saves automatically to this device and can
          be shared to the desktop app.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
