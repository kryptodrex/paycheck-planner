import { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';
import { Feather } from '@expo/vector-icons';
import { usePlan } from '../../src/contexts/PlanContext';
import { useTheme, type ThemeMode } from '../../src/contexts/ThemeContext';
import { APPEARANCE_PRESET_OPTIONS, resolveColors } from '../../src/theme/tokens';
import { deletePlanKey } from '../../src/storage/keychainAdapter';
import { ThemedView } from '../../src/components/ThemedView';
import { ThemedText } from '../../src/components/ThemedText';
import { MetricRow } from '../../src/components/MetricRow';
import { SectionCard } from '../../src/components/SectionCard';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import { Button } from '../../src/components/Button';

const MODE_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const { plan, sourcePath, encryptionKey, saveState, saveError, closePlan } = usePlan();
  const { colors, spacing, radius, isDark, mode, preset, setMode, setPreset } = useTheme();
  const [sharing, setSharing] = useState(false);

  async function sharePlanFile() {
    if (!sourcePath) return;
    setSharing(true);
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(sourcePath, {
          mimeType: 'application/json',
          dialogTitle: 'Share budget plan file',
        });
      }
    } finally {
      setSharing(false);
    }
  }

  function forgetEncryptionKey() {
    if (!plan) return;
    Alert.alert(
      'Remove Stored Key',
      'You will need to re-enter your encryption key the next time you open this plan.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void deletePlanKey(plan.id);
          },
        },
      ],
    );
  }

  const saveLabel =
    saveState === 'saving' ? 'Saving…'
    : saveState === 'saved' ? 'All changes saved'
    : saveState === 'error' ? `Save failed: ${saveError ?? 'unknown error'}`
    : sourcePath ? 'No changes yet' : 'Demo mode — changes are not saved';

  const version =
    Constants.expoConfig?.version ?? Constants.manifest2?.extra?.expoClient?.version ?? '—';

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'Settings' }} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance — mirrors the desktop Settings > Appearance section */}
        <SectionCard title="Appearance">
          <ThemedText
            variant="secondary"
            size="xs"
            weight="semibold"
            style={{ marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.4 }}
          >
            Theme
          </ThemedText>
          <View style={{ marginBottom: spacing.md }}>
            <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />
          </View>

          <ThemedText
            variant="secondary"
            size="xs"
            weight="semibold"
            style={{ marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.4 }}
          >
            Color Preset
          </ThemedText>
          {APPEARANCE_PRESET_OPTIONS.map((option) => {
            const previewColors = resolveColors(isDark, option.value);
            const selected = preset === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.presetRow,
                  {
                    borderColor: selected ? colors.accentPrimary : colors.border,
                    borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
                    borderRadius: radius.md,
                    padding: spacing.sm,
                    marginBottom: spacing.sm,
                  },
                ]}
                onPress={() => setPreset(option.value)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <View style={styles.presetSwatches}>
                  <View
                    style={[styles.presetSwatch, { backgroundColor: previewColors.accentPrimary }]}
                  />
                  <View
                    style={[
                      styles.presetSwatch,
                      { backgroundColor: previewColors.accentSecondary, marginLeft: -8 },
                    ]}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <ThemedText size="sm" weight="medium">
                    {option.label}
                  </ThemedText>
                  <ThemedText variant="tertiary" size="xs" numberOfLines={1}>
                    {option.description}
                  </ThemedText>
                </View>
                {selected && <Feather name="check" size={16} color={colors.accentPrimary} />}
              </TouchableOpacity>
            );
          })}
        </SectionCard>

        {/* Plan */}
        {plan && (
          <SectionCard title="Current Plan">
            <MetricRow label="Plan" value={plan.name} />
            <MetricRow label="Year" value={String(plan.year)} />
            <MetricRow label="Currency" value={plan.settings.currency} />
            <MetricRow label="Encrypted" value={encryptionKey ? 'Yes' : 'No'} />
            <ThemedText
              variant={saveState === 'error' ? 'primary' : 'tertiary'}
              size="xs"
              style={{
                marginTop: spacing.xs,
                marginBottom: spacing.md,
                color: saveState === 'error' ? colors.error : undefined,
              }}
            >
              {saveLabel}
            </ThemedText>

            {sourcePath && (
              <Button
                title="Share Plan File"
                variant="secondary"
                onPress={sharePlanFile}
                loading={sharing}
                style={{ marginBottom: spacing.sm }}
              />
            )}
            {encryptionKey && (
              <Button
                title="Remove Stored Encryption Key"
                variant="secondary"
                onPress={forgetEncryptionKey}
                style={{ marginBottom: spacing.sm }}
              />
            )}
            <Button
              title="Close Plan"
              variant="danger"
              onPress={() => {
                closePlan();
                router.replace('/');
              }}
            />
          </SectionCard>
        )}

        {/* About */}
        <SectionCard title="About">
          <MetricRow label="App" value="Paycheck Planner" />
          <MetricRow label="Version" value={version} />
          <ThemedText variant="tertiary" size="xs" style={{ marginTop: spacing.xs }}>
            Plans are stored locally on this device. Edits save back to your plan file and stay
            compatible with the desktop app.
          </ThemedText>
        </SectionCard>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  presetRow: { flexDirection: 'row', alignItems: 'center' },
  presetSwatches: { flexDirection: 'row', alignItems: 'center' },
  presetSwatch: { width: 26, height: 26, borderRadius: 13 },
});
