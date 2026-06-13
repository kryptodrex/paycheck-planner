import { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { generateDemoBudgetData, type BudgetData } from '@paycheck-planner/core';
import { usePlanFile } from '../src/hooks/usePlanFile';
import { usePlan } from '../src/contexts/PlanContext';
import { getRecentFiles, removeRecentFile, type RecentFile } from '../src/storage/recentFilesStore';
import { readPlanFile, decryptPlan } from '../src/storage/planFileAdapter';
import { getStoredPlanKey } from '../src/storage/keychainAdapter';
import { useTheme } from '../src/contexts/ThemeContext';
import { ThemedText } from '../src/components/ThemedText';
import { ThemedView } from '../src/components/ThemedView';

export default function WelcomeScreen() {
  const { colors, spacing, radius, fontSize } = useTheme();
  const { setPlan } = usePlan();

  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [keyInput, setKeyInput] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);

  const onPlanLoaded = useCallback(
    (plan: BudgetData, uri: string, encryptionKey: string | null) => {
      setPlan(plan, uri, { encryptionKey });
      router.replace('/(tabs)/summary');
    },
    [setPlan],
  );

  const { status, error, pending, pickAndLoad, submitKey, clearPending } =
    usePlanFile(onPlanLoaded);

  // Modal visibility is derived from the load status rather than mirrored in state.
  const keyModalVisible = status === 'needs-key';

  useFocusEffect(
    useCallback(() => {
      getRecentFiles().then(setRecentFiles);
    }, []),
  );

  async function handlePickAndLoad() {
    setKeyInput('');
    setKeyError(null);
    await pickAndLoad();
  }

  async function openDemoMode() {
    const plan = generateDemoBudgetData(new Date().getFullYear());
    setPlan(plan, null);
    router.replace('/(tabs)/summary');
  }

  async function openRecentFile(file: RecentFile) {
    const parsed = await readPlanFile(file.uri);
    if (parsed.status === 'invalid') return;

    if (parsed.status === 'ok') {
      setPlan(parsed.data, file.uri);
      router.replace('/(tabs)/summary');
      return;
    }

    // Encrypted — try stored key (biometrics)
    const storedKey = await getStoredPlanKey(parsed.planId, file.planName ?? file.name);
    if (storedKey) {
      const plan = decryptPlan(parsed.payload, storedKey);
      if (plan) {
        setPlan(plan, file.uri, { encryptionKey: storedKey });
        router.replace('/(tabs)/summary');
        return;
      }
    }

    // Key not found — trigger the full pick-and-load flow instead
    await handlePickAndLoad();
  }

  async function handleSubmitKey() {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      setKeyError('Please enter your encryption key.');
      return;
    }
    const ok = await submitKey(trimmed);
    if (!ok) {
      setKeyError(pending ? error ?? 'Incorrect key. Please try again.' : null);
    }
  }

  function handleCancelKey() {
    clearPending();
    setKeyInput('');
    setKeyError(null);
  }

  const isLoading = status === 'loading';

  return (
    <ThemedView style={styles.screen}>
      {/* Header gradient area */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.accentPrimary, paddingTop: 64, paddingBottom: spacing.xxl },
        ]}
      >
        <ThemedText
          size="xxxl"
          weight="bold"
          variant="inverse"
          style={{ textAlign: 'center', marginBottom: spacing.xs }}
        >
          Paycheck Planner
        </ThemedText>
        <ThemedText
          size="sm"
          variant="inverse"
          style={{ textAlign: 'center', opacity: 0.85 }}
        >
          Open a budget plan to get started
        </ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Primary action */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              backgroundColor: colors.accentPrimary,
              borderRadius: radius.lg,
              marginBottom: spacing.md,
              minHeight: 52,
            },
          ]}
          onPress={handlePickAndLoad}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText size="md" weight="semibold" variant="inverse">
              Open Budget File
            </ThemedText>
          )}
        </TouchableOpacity>

        {/* Create new plan */}
        <TouchableOpacity
          style={[
            styles.secondaryButton,
            {
              borderColor: colors.border,
              borderRadius: radius.lg,
              marginBottom: spacing.md,
              minHeight: 52,
            },
          ]}
          onPress={() => router.push('/new-plan')}
          activeOpacity={0.75}
        >
          <ThemedText size="md" weight="medium" variant="secondary">
            Create New Plan
          </ThemedText>
        </TouchableOpacity>

        {/* Demo mode */}
        <TouchableOpacity
          style={[
            styles.secondaryButton,
            {
              borderColor: colors.border,
              borderRadius: radius.lg,
              marginBottom: spacing.xl,
              minHeight: 52,
            },
          ]}
          onPress={openDemoMode}
          activeOpacity={0.75}
        >
          <ThemedText size="md" weight="medium" variant="secondary">
            Try Demo Mode
          </ThemedText>
        </TouchableOpacity>

        {/* Recent files */}
        {recentFiles.length > 0 && (
          <>
            <ThemedText
              variant="tertiary"
              size="xs"
              weight="semibold"
              style={[styles.sectionLabel, { marginBottom: spacing.sm }]}
            >
              RECENT FILES
            </ThemedText>

            {recentFiles.map((file) => (
              <TouchableOpacity
                key={file.uri}
                style={[
                  styles.recentRow,
                  {
                    backgroundColor: colors.bgElevated,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    marginBottom: spacing.sm,
                    minHeight: 60,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                  },
                ]}
                onPress={() => openRecentFile(file)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText size="sm" weight="medium" numberOfLines={1}>
                    {file.planName ?? file.name}
                  </ThemedText>
                  {file.planYear && (
                    <ThemedText variant="tertiary" size="xs" style={{ marginTop: 2 }}>
                      {file.planYear} · {file.name}
                    </ThemedText>
                  )}
                  <ThemedText variant="tertiary" size="xs" style={{ marginTop: 1 }}>
                    {formatRelativeDate(file.lastOpenedAt)}
                  </ThemedText>
                </View>
                <TouchableOpacity
                  style={styles.recentRemove}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 8 }}
                  onPress={() => removeRecentFile(file.uri).then(() => setRecentFiles((prev) => prev.filter((f) => f.uri !== file.uri)))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${file.planName ?? file.name} from recents`}
                >
                  <ThemedText variant="tertiary" size="xl">
                    ×
                  </ThemedText>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* General error (not key-entry) */}
        {error && status === 'error' && (
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: colors.error + '18',
                borderColor: colors.error + '40',
                borderRadius: radius.md,
                padding: spacing.md,
                marginTop: spacing.sm,
              },
            ]}
          >
            <ThemedText size="sm" style={{ color: colors.error }}>
              {error}
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {/* Encryption key modal */}
      <Modal
        visible={keyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancelKey}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <Pressable style={styles.modalBackdrop} onPress={handleCancelKey} />
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.bgElevated,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                padding: spacing.lg,
                paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg,
              },
            ]}
          >
            <View style={styles.sheetHandle} />

            <ThemedText size="lg" weight="semibold" style={{ marginBottom: spacing.xs }}>
              Encryption Key Required
            </ThemedText>
            <ThemedText variant="secondary" size="sm" style={{ marginBottom: spacing.lg }}>
              {pending?.name ?? 'This file'} is encrypted. Enter the AES key from your desktop app
              (Settings → Show Encryption Key).
            </ThemedText>

            <TextInput
              style={[
                styles.keyInput,
                {
                  backgroundColor: colors.bgInput,
                  borderColor: keyError ? colors.error : colors.border,
                  borderRadius: radius.md,
                  color: colors.textPrimary,
                  fontSize: fontSize.sm,
                  padding: spacing.md,
                  marginBottom: keyError ? spacing.xs : spacing.md,
                  minHeight: 44,
                },
              ]}
              value={keyInput}
              onChangeText={(t) => { setKeyInput(t); setKeyError(null); }}
              placeholder="Paste encryption key here"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmitKey}
            />

            {keyError && (
              <ThemedText size="xs" style={{ color: colors.error, marginBottom: spacing.md }}>
                {keyError}
              </ThemedText>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.accentPrimary,
                  borderRadius: radius.md,
                  marginBottom: spacing.sm,
                  minHeight: 48,
                },
              ]}
              onPress={handleSubmitKey}
              activeOpacity={0.85}
            >
              <ThemedText size="md" weight="semibold" variant="inverse">
                Unlock Plan
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, { minHeight: 44 }]}
              onPress={handleCancelKey}
              activeOpacity={0.7}
            >
              <ThemedText size="sm" variant="secondary">
                Cancel
              </ThemedText>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
}

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: 'center' },
  primaryButton: { alignItems: 'center', justifyContent: 'center' },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: { letterSpacing: 0.6 },
  recentRow: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  recentRemove: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  errorBox: { borderWidth: StyleSheet.hairlineWidth },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: { width: '100%' },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    alignSelf: 'center',
    marginBottom: 16,
  },
  keyInput: { borderWidth: 1 },
});
