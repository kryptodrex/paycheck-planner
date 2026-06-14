import { useEffect, useState } from 'react';
import { ScrollView, View, ActivityIndicator, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import { CURRENCIES } from '@paycheck-planner/core';
import { convertBudgetAmounts } from '@paycheck-planner/core/budget-currency-conversion';
import { usePlanScreen } from '../src/hooks/usePlanScreen';
import { useTheme } from '../src/contexts/ThemeContext';
import { fetchExchangeRate } from '../src/services/referenceData';
import { ThemedView } from '../src/components/ThemedView';
import { ThemedText } from '../src/components/ThemedText';
import { SectionCard } from '../src/components/SectionCard';
import { Button } from '../src/components/Button';
import { FormField } from '../src/components/FormField';
import { FormError } from '../src/components/FormError';
import { OptionPicker } from '../src/components/OptionPicker';
import { parseAmount } from '../src/utils/planMutations';

const CURRENCY_OPTIONS = CURRENCIES.map((currency) => ({
  value: currency.code,
  label: `${currency.flag} ${currency.code}`,
}));

export default function CurrencyScreen() {
  const helpers = usePlanScreen();
  const { colors, spacing } = useTheme();

  const current = helpers?.plan.settings.currency ?? 'USD';
  const [target, setTarget] = useState(current);
  const [rate, setRate] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed = target !== current;

  // Fetch the live rate whenever the target currency changes.
  useEffect(() => {
    if (target === current) {
      setRate('');
      return;
    }
    let active = true;
    setFetching(true);
    setError(null);
    void (async () => {
      const fetched = await fetchExchangeRate(current, target);
      if (!active) return;
      setFetching(false);
      if (fetched === null) {
        setError('Could not fetch a live rate. Enter one manually to continue.');
        setRate('');
      } else {
        setRate(String(fetched));
      }
    })();
    return () => {
      active = false;
    };
  }, [target, current]);

  if (!helpers) return null;

  const { plan, updatePlan, fmt } = helpers;

  function handleConvert() {
    if (!changed) return router.back();
    const parsedRate = parseAmount(rate);
    if (parsedRate === null || parsedRate <= 0) {
      return setError('Please enter a valid exchange rate.');
    }

    updatePlan(
      (p) => convertBudgetAmounts({ ...p, settings: { ...p.settings, currency: target } }, parsedRate),
      { description: `Convert currency to ${target}` },
    );
    router.back();
  }

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'Change Currency' }} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FormError message={error} />

        <SectionCard title="Currency">
          <ThemedText variant="secondary" size="xs" style={{ marginBottom: spacing.sm }}>
            Current: {current}. Changing currency converts every amount in this plan using the
            exchange rate below.
          </ThemedText>
          <OptionPicker
            label="New Currency"
            options={CURRENCY_OPTIONS}
            value={target}
            onChange={(value) => {
              setTarget(value);
              setError(null);
            }}
          />

          {changed && (
            <>
              {fetching ? (
                <View style={styles.rateLoading}>
                  <ActivityIndicator color={colors.accentPrimary} />
                  <ThemedText variant="tertiary" size="xs" style={{ marginLeft: spacing.sm }}>
                    Fetching live rate…
                  </ThemedText>
                </View>
              ) : (
                <FormField
                  label={`Exchange Rate (1 ${current} → ${target})`}
                  value={rate}
                  onChangeText={(text) => {
                    setRate(text);
                    setError(null);
                  }}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  hint="Auto-filled from live rates; adjust if needed."
                />
              )}
            </>
          )}
        </SectionCard>

        {changed && parseAmount(rate) ? (
          <SectionCard title="Preview">
            <ThemedText variant="secondary" size="xs">
              Example: {fmt(100)} becomes{' '}
              {new Intl.NumberFormat(plan.settings.locale, { style: 'currency', currency: target }).format(
                100 * (parseAmount(rate) ?? 1),
              )}
            </ThemedText>
          </SectionCard>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <Button title="Convert Currency" onPress={handleConvert} disabled={changed && fetching} />
          <Button title="Cancel" variant="secondary" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  rateLoading: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
});
