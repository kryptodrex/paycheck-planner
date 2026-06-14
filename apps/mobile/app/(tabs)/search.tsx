import { useMemo, useState } from 'react';
import { ScrollView, View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { usePlan } from '../../src/contexts/PlanContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import {
  getQuickActions,
  searchPlan,
  type PlanSearchResult,
  type QuickAction,
  type SearchTarget,
} from '../../src/utils/planSearch';
import { ThemedView } from '../../src/components/ThemedView';
import { ThemedText } from '../../src/components/ThemedText';
import { EmptyState } from '../../src/components/EmptyState';

function navigateToTarget(target: SearchTarget) {
  if (target.kind === 'tab') {
    const params: Record<string, string> = {};
    if (target.pathname === '/(tabs)/money') params.section = target.section;
    if ('highlight' in target && target.highlight) params.highlight = target.highlight;
    if ('action' in target && target.action) params.action = target.action;
    // Switch to the destination tab (search is itself a tab now).
    router.navigate({ pathname: target.pathname, params });
  } else {
    // Push the stack screen over the tab navigator.
    router.push(target.pathname);
  }
}

export default function SearchScreen() {
  const { plan } = usePlan();
  const { colors, spacing, radius, fontSize } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const results = useMemo(() => (plan ? searchPlan(plan, query) : []), [plan, query]);
  const quickActions = useMemo(() => getQuickActions(), []);

  if (!plan) return null;

  const showResults = query.trim().length >= 2;

  function handleResult(result: PlanSearchResult) {
    setQuery('');
    navigateToTarget(result.target);
  }

  function handleQuickAction(action: QuickAction) {
    setQuery('');
    navigateToTarget(action.target);
  }

  return (
    <ThemedView style={styles.screen}>
      {/* Search field */}
      <View style={[styles.headerRow, { paddingTop: insets.top + 10, paddingHorizontal: spacing.md }]}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.bgInput,
              borderColor: colors.border,
              borderRadius: radius.md,
              paddingHorizontal: spacing.md,
            },
          ]}
        >
          <Feather name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[
              styles.searchInput,
              { color: colors.textPrimary, fontSize: fontSize.md, marginLeft: spacing.sm },
            ]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search bills, savings, accounts…"
            placeholderTextColor={colors.textTertiary}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom + 96,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!showResults ? (
          <>
            <ThemedText
              variant="tertiary"
              size="xs"
              weight="semibold"
              style={{ textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm }}
            >
              Quick Actions
            </ThemedText>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.row,
                  {
                    backgroundColor: colors.bgElevated,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                  },
                ]}
                onPress={() => handleQuickAction(action)}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.qaIcon,
                    { backgroundColor: colors.accentPrimary + '1f', borderRadius: radius.sm },
                  ]}
                >
                  <Feather name={action.icon} size={18} color={colors.textAccent} />
                </View>
                <ThemedText size="md" weight="medium" style={{ flex: 1 }}>
                  {action.title}
                </ThemedText>
                <Feather name="chevron-right" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </>
        ) : results.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="No matches"
            message={`Nothing in this plan matches “${query.trim()}”.`}
          />
        ) : (
          results.map((result) => (
            <TouchableOpacity
              key={result.id}
              style={[
                styles.row,
                {
                  backgroundColor: colors.bgElevated,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                },
              ]}
              onPress={() => handleResult(result)}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1, paddingRight: spacing.sm }}>
                <ThemedText size="md" weight="semibold" numberOfLines={1}>
                  {result.title}
                </ThemedText>
                <ThemedText variant="tertiary" size="xs" style={{ marginTop: 2 }} numberOfLines={1}>
                  {result.subtitle}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.typeBadge,
                  { backgroundColor: colors.accentPrimary + '22', borderRadius: radius.sm },
                ]}
              >
                <ThemedText variant="accent" size="xs" weight="medium">
                  {result.typeLabel}
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textTertiary} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 48,
  },
  searchInput: { flex: 1, paddingVertical: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 60,
  },
  qaIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3 },
});
