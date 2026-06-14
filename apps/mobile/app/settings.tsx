import { useEffect, useState } from 'react';
import { ScrollView, View, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';
import { Feather } from '@expo/vector-icons';
import { usePlan } from '../src/contexts/PlanContext';
import { useTheme, type ThemeMode } from '../src/contexts/ThemeContext';
import { APPEARANCE_PRESET_OPTIONS, resolveColors } from '../src/theme/tokens';
import {
  deletePlanKey,
  getAvailableBiometricType,
  getBiometricPref,
  setBiometricUnlock,
  storePlanKey,
  type BiometricType,
} from '../src/storage/keychainAdapter';
import { createShareableCopy } from '../src/storage/planFileAdapter';
import { ThemedView } from '../src/components/ThemedView';
import { ThemedText } from '../src/components/ThemedText';
import { MetricRow } from '../src/components/MetricRow';
import { SectionCard } from '../src/components/SectionCard';
import { SegmentedControl } from '../src/components/SegmentedControl';
import { ToggleRow } from '../src/components/ToggleRow';
import { Button } from '../src/components/Button';
import { FormSheet } from '../src/components/FormSheet';
import { FormField } from '../src/components/FormField';

const BIOMETRIC_LABELS: Record<BiometricType, string> = {
  face: 'Face ID',
  fingerprint: 'Touch ID / Fingerprint',
  iris: 'Iris',
  none: 'Biometrics',
};

const MODE_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const { plan, sourcePath, encryptionKey, saveState, saveError, canUndo, canRedo, undo, redo, closePlan, changeEncryptionKey } =
    usePlan();
  const { colors, spacing, radius, isDark, mode, preset, setMode, setPreset } = useTheme();
  const [sharing, setSharing] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [showEncryptSheet, setShowEncryptSheet] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);

  // Load the device's biometric capability and this plan's saved preference.
  useEffect(() => {
    if (!plan || !encryptionKey) return;
    let active = true;
    void (async () => {
      const [type, pref] = await Promise.all([
        getAvailableBiometricType(),
        getBiometricPref(plan.id),
      ]);
      if (active) {
        setBiometricType(type);
        setBiometricEnabled(pref);
      }
    })();
    return () => {
      active = false;
    };
  }, [plan, encryptionKey]);

  function handleClosePlan() {
    closePlan();
    router.replace('/');
  }

  async function handleToggleBiometric(next: boolean) {
    if (!plan || !encryptionKey) return;
    setBiometricBusy(true);
    try {
      const effective = await setBiometricUnlock(plan.id, encryptionKey, next);
      setBiometricEnabled(effective);
      if (next && !effective) {
        Alert.alert(
          'Could not enable',
          'Biometric unlock needs Face ID / Touch ID set up on this device, and you must approve the prompt.',
        );
      }
    } finally {
      setBiometricBusy(false);
    }
  }

  function openAddEncryption() {
    setKeyInput('');
    setConfirmInput('');
    setKeyError(null);
    setShowEncryptSheet(true);
  }

  async function submitAddEncryption() {
    if (!plan) return;
    const trimmed = keyInput.trim();
    if (trimmed.length < 4) return setKeyError('Encryption key must be at least 4 characters.');
    if (trimmed !== confirmInput.trim()) return setKeyError('Encryption keys do not match.');
    changeEncryptionKey(trimmed);
    await storePlanKey(plan.id, trimmed);
    setShowEncryptSheet(false);
  }

  function removeEncryption() {
    if (!plan) return;
    Alert.alert(
      'Remove Encryption',
      'This plan file will be saved unencrypted (no key required to open it).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            changeEncryptionKey(null);
            void deletePlanKey(plan.id);
          },
        },
      ],
    );
  }

  async function sharePlanFile() {
    if (!sourcePath || !plan) return;
    setSharing(true);
    try {
      if (await Sharing.isAvailableAsync()) {
        // Share a copy named after the plan (e.g. "2026 Plan.budget") rather
        // than the internal UUID file, matching the desktop's saved filenames.
        const shareUri = await createShareableCopy(sourcePath, plan);
        await Sharing.shareAsync(shareUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export or back up budget plan',
          UTI: 'public.json',
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

            <View style={[styles.undoRow, { marginBottom: spacing.sm }]}>
              <Button
                title="Undo"
                variant="secondary"
                onPress={undo}
                disabled={!canUndo}
                style={styles.undoButton}
              />
              <Button
                title="Redo"
                variant="secondary"
                onPress={redo}
                disabled={!canRedo}
                style={styles.undoButton}
              />
            </View>
            <ThemedText variant="tertiary" size="xs" style={{ marginBottom: spacing.md }}>
              Tip: shake your device to undo or redo the last change.
            </ThemedText>

            <Button
              title="View Change History"
              variant="secondary"
              onPress={() => router.push('/history')}
              style={{ marginBottom: spacing.sm }}
            />
            {sourcePath && (
              <>
                <Button
                  title="Export / Back Up Plan…"
                  variant="secondary"
                  onPress={sharePlanFile}
                  loading={sharing}
                  style={{ marginBottom: spacing.xs }}
                />
                <ThemedText
                  variant="tertiary"
                  size="xs"
                  style={{ marginBottom: spacing.sm }}
                >
                  Saved on this device automatically. Export to save a copy to Files, iCloud, or
                  the desktop app.
                </ThemedText>
              </>
            )}
            {encryptionKey && biometricType !== 'none' && (
              <View style={{ marginBottom: spacing.sm }}>
                <ToggleRow
                  label={`Unlock with ${BIOMETRIC_LABELS[biometricType]}`}
                  value={biometricEnabled}
                  onChange={biometricBusy ? () => {} : handleToggleBiometric}
                  hint={`Require ${BIOMETRIC_LABELS[biometricType]} to open this encrypted plan.`}
                />
              </View>
            )}
            {encryptionKey && (
              <Button
                title="Remove Stored Encryption Key"
                variant="secondary"
                onPress={forgetEncryptionKey}
                style={{ marginBottom: spacing.sm }}
              />
            )}
            {sourcePath && !encryptionKey && (
              <Button
                title="Add Encryption"
                variant="secondary"
                onPress={openAddEncryption}
                style={{ marginBottom: spacing.sm }}
              />
            )}
            {sourcePath && encryptionKey && (
              <Button
                title="Remove Encryption"
                variant="secondary"
                onPress={removeEncryption}
                style={{ marginBottom: spacing.sm }}
              />
            )}
            <Button
              title="Close Plan"
              variant="secondary"
              onPress={handleClosePlan}
              style={{ marginTop: spacing.xs }}
            />
            <ThemedText variant="tertiary" size="xs" style={{ marginTop: spacing.xs }}>
              Closing returns to the welcome screen. Your plan stays saved on this device.
            </ThemedText>
          </SectionCard>
        )}

        {/* Help & Reference — API-backed, shared with desktop */}
        <SectionCard title="Help & Reference">
          <Button
            title="App FAQs"
            variant="secondary"
            onPress={() => router.push('/faqs')}
            style={{ marginBottom: spacing.sm }}
          />
          <Button title="Glossary" variant="secondary" onPress={() => router.push('/glossary')} />
        </SectionCard>

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

      {showEncryptSheet && (
        <FormSheet
          visible
          title="Add Encryption"
          onClose={() => setShowEncryptSheet(false)}
          onSave={submitAddEncryption}
          saveLabel="Encrypt Plan"
        >
          <FormField
            label="Encryption Key"
            value={keyInput}
            onChangeText={(text) => {
              setKeyInput(text);
              setKeyError(null);
            }}
            placeholder="Choose a strong key"
            autoCapitalize="none"
            secureTextEntry
            error={keyError}
          />
          <FormField
            label="Confirm Key"
            value={confirmInput}
            onChangeText={(text) => {
              setConfirmInput(text);
              setKeyError(null);
            }}
            placeholder="Re-enter key"
            autoCapitalize="none"
            secureTextEntry
            hint="Keep this safe — without it the plan can't be opened."
          />
        </FormSheet>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  presetRow: { flexDirection: 'row', alignItems: 'center' },
  presetSwatches: { flexDirection: 'row', alignItems: 'center' },
  presetSwatch: { width: 26, height: 26, borderRadius: 13 },
  undoRow: { flexDirection: 'row', gap: 8 },
  undoButton: { flex: 1 },
});
