import { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
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
import { createPlanFileInLibrary, createPlanFileInFolder } from '../src/storage/planFileAdapter';
import { addRecentFile } from '../src/storage/recentFilesStore';
import { storePlanKey } from '../src/storage/keychainAdapter';
import { ThemedView } from '../src/components/ThemedView';
import { ThemedText } from '../src/components/ThemedText';
import { SectionCard } from '../src/components/SectionCard';
import { Button } from '../src/components/Button';
import { FormField } from '../src/components/FormField';
import { FormError } from '../src/components/FormError';
import { OptionPicker } from '../src/components/OptionPicker';
import { ToggleRow } from '../src/components/ToggleRow';
import { parseAmount } from '../src/utils/planMutations';

const PAY_FREQUENCIES: PayFrequency[] = ['weekly', 'bi-weekly', 'semi-monthly', 'monthly'];

const FREQUENCY_OPTIONS = PAY_FREQUENCIES.map((frequency) => ({
  value: frequency,
  label: formatPayFrequencyLabel(frequency),
}));

const CURRENCY_OPTIONS = CURRENCIES.map((currency) => ({
  value: currency.code,
  label: `${currency.symbol} ${currency.code}`,
}));

type SaveLocation = 'folder' | 'device';

const SAVE_LOCATION_OPTIONS: { value: SaveLocation; label: string }[] = [
  { value: 'folder', label: 'Files / iCloud folder…' },
  { value: 'device', label: 'On this device only' },
];

export default function NewPlanScreen() {
  const { setPlan } = usePlan();
  const { colors, spacing, radius } = useTheme();

  const defaultYear = new Date().getFullYear();
  const [name, setName] = useState(`${defaultYear} Plan`);
  const [year, setYear] = useState(String(defaultYear));
  const [currency, setCurrency] = useState('USD');
  const [payType, setPayType] = useState<PayType>('salary');
  const [annualSalary, setAnnualSalary] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [hoursPerPayPeriod, setHoursPerPayPeriod] = useState('');
  const [payFrequency, setPayFrequency] = useState<PayFrequency>('bi-weekly');
  const [saveLocation, setSaveLocation] = useState<SaveLocation>('folder');
  const [encrypt, setEncrypt] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState('');
  const [confirmKey, setConfirmKey] = useState('');
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

    const trimmedKey = encryptionKey.trim();
    if (encrypt) {
      if (trimmedKey.length < 4) return setError('Encryption key must be at least 4 characters.');
      if (trimmedKey !== confirmKey.trim()) return setError('Encryption keys do not match.');
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

      const key = encrypt ? trimmedKey : null;

      // Create the user-visible document first when a folder was requested, so
      // cancelling the folder picker leaves nothing behind and stays in the wizard.
      let sourceUri: string | null = null;
      if (saveLocation === 'folder') {
        const result = await createPlanFileInFolder(plan, key);
        if (result.status === 'canceled') return;
        sourceUri = result.uri;
      }

      // The durable working copy lives in the app's storage; edits auto-save
      // there and are mirrored to the folder document when one was chosen.
      const uri = await createPlanFileInLibrary(plan, key);
      await addRecentFile({
        uri,
        name: `${plan.name}.budget`,
        lastOpenedAt: new Date().toISOString(),
        planId: plan.id,
        planName: plan.name,
        planYear: plan.year,
        ...(sourceUri ? { sourceUri } : {}),
      });

      // Remember the key (biometric-protected when available) so the plan
      // reopens without re-entry; best-effort and never blocks creation.
      if (key) await storePlanKey(plan.id, key);

      setPlan(plan, uri, { encryptionKey: key, sourceUri });
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

        <SectionCard title="Save Location">
          <OptionPicker
            label="Save the plan file"
            options={SAVE_LOCATION_OPTIONS}
            value={saveLocation}
            onChange={setSaveLocation}
          />
          <ThemedText variant="tertiary" size="xs">
            {saveLocation === 'folder'
              ? 'You’ll pick a folder (like iCloud Drive) when the plan is created. The file stays in sync as you edit, and desktop can open it too.'
              : 'The plan is stored privately inside the app on this phone. You can move it to a folder later from Settings.'}
          </ThemedText>
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

        <SectionCard title="Security">
          <ToggleRow
            label="Encrypt this plan"
            value={encrypt}
            onChange={(next) => {
              setEncrypt(next);
              setError(null);
            }}
            hint="Protect the plan file with a key (AES). Required to open on any device."
          />
          {encrypt && (
            <>
              <FormField
                label="Encryption Key"
                value={encryptionKey}
                onChangeText={(text) => {
                  setEncryptionKey(text);
                  setError(null);
                }}
                placeholder="Choose a strong key"
                autoCapitalize="none"
                secureTextEntry
              />
              <FormField
                label="Confirm Key"
                value={confirmKey}
                onChangeText={(text) => {
                  setConfirmKey(text);
                  setError(null);
                }}
                placeholder="Re-enter key"
                autoCapitalize="none"
                secureTextEntry
                hint="Keep this safe — without it the plan can't be opened."
              />
            </>
          )}
        </SectionCard>

        <View style={{ gap: spacing.sm }}>
          <Button title="Create Plan" onPress={handleCreate} loading={creating} />
          <Button title="Cancel" variant="secondary" onPress={() => router.back()} />
        </View>

        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: colors.bgInput,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
              marginTop: spacing.md,
            },
          ]}
        >
          <View style={styles.infoHeader}>
            <Feather name="info" size={16} color={colors.textAccent} />
            <ThemedText size="sm" weight="semibold">
              Where it's saved
            </ThemedText>
          </View>
          <ThemedText variant="secondary" size="xs" style={{ marginTop: spacing.xs, lineHeight: 18 }}>
            Your plan saves automatically as you edit — there’s no save button. A working copy
            always lives safely on this device, and if you choose a folder above, the plan file
            there is kept up to date too, so it’s backed up and shared with the desktop app.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  infoBox: { borderWidth: StyleSheet.hairlineWidth },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
