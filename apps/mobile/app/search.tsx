import { useMemo, useState } from 'react';
import { ScrollView, View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { usePlanScreen } from '../src/hooks/usePlanScreen';
import { useTheme } from '../src/contexts/ThemeContext';
import { searchPlan, type PlanSearchResult } from '../src/utils/planSearch';
import { ThemedView } from '../src/components/ThemedView';
import { ThemedText } from '../src/components/ThemedText';
import { EmptyState } from '../src/components/EmptyState';

export default function SearchScreen() {
  const helpers = usePlanScreen();
  const { colors, spacing, radius, fontSize } = useTheme();
  const [query, setQuery] = useState('');

  const results = useMemo(
    () => (helpers ? searchPlan(helpers.plan, query) : []),
    [helpers, query],
  );

  if (!helpers) return null;

  function openResult(result: PlanSearchResult) {
    const { destination } = result;
    if (destination.route === '/(tabs)/money') {
      router.replace({ pathname: '/(tabs)/money', params: { section: destination.section } });
    } else if (destination.route === '/(tabs)/accounts') {
      router.replace('/(tabs)/accounts');
    } else {
      router.push(destination.route);
    }
  }

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'Search Plan' }} />

      <View style={{ padding: spacing.md }}>
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
          <Feather name="search" size={16} color={colors.textTertiary} />
          <TextInput
            style={[
              styles.searchInput,
              { color: colors.textPrimary, fontSize: fontSize.md, marginLeft: spacing.sm },
            ]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search bills, savings, accounts…"
            placeholderTextColor={colors.textTertiary}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {query.trim().length < 2 ? (
          <EmptyState
            icon="search"
            title="Search your plan"
            message="Find bills, loans, savings, accounts, taxes, and settings by name."
          />
        ) : results.length === 0 ? (
          <EmptyState icon="inbox" title="No matches" message={`Nothing in this plan matches “${query.trim()}”.`} />
        ) : (
          results.map((result) => (
            <TouchableOpacity
              key={result.id}
              style={[
                styles.resultRow,
                {
                  backgroundColor: colors.bgElevated,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                },
              ]}
              onPress={() => openResult(result)}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1, paddingRight: spacing.sm }}>
                <ThemedText size="sm" weight="semibold" numberOfLines={1}>
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
              <Feather name="chevron-right" size={16} color={colors.textTertiary} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 46,
  },
  searchInput: { flex: 1, paddingVertical: 10 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3 },
});
