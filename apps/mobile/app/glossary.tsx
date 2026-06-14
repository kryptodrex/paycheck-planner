import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../src/contexts/ThemeContext';
import { fetchGlossary, type GlossaryData } from '../src/services/referenceData';
import { ThemedView } from '../src/components/ThemedView';
import { ThemedText } from '../src/components/ThemedText';
import { SectionCard } from '../src/components/SectionCard';
import { EmptyState } from '../src/components/EmptyState';

export default function GlossaryScreen() {
  const { colors, spacing, radius, fontSize } = useTheme();
  const [data, setData] = useState<GlossaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      const result = await fetchGlossary();
      if (active) {
        setData(result);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const grouped = useMemo(() => {
    if (!data) return [];
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matches = data.terms.filter((term) => {
      if (tokens.length === 0) return true;
      const corpus = `${term.term} ${term.definition} ${term.category}`.toLowerCase();
      return tokens.every((t) => corpus.includes(t));
    });
    const byCategory = new Map<string, typeof matches>();
    for (const term of matches) {
      const list = byCategory.get(term.category) ?? [];
      list.push(term);
      byCategory.set(term.category, list);
    }
    return [...byCategory.entries()].map(([category, terms]) => ({
      category,
      label: data.categoryLabels[category] ?? category,
      terms,
    }));
  }, [data, query]);

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'Glossary' }} />

      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
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
            style={[styles.searchInput, { color: colors.textPrimary, fontSize: fontSize.md, marginLeft: spacing.sm }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search terms…"
            placeholderTextColor={colors.textTertiary}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentPrimary} />
        </View>
      ) : !data ? (
        <EmptyState icon="wifi-off" title="Couldn't load glossary" message="Check your connection and try again." />
      ) : grouped.length === 0 ? (
        <EmptyState icon="inbox" title="No matches" message={`Nothing matches “${query.trim()}”.`} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {grouped.map((group) => (
            <SectionCard key={group.category} title={group.label}>
              {group.terms.map((term, i) => (
                <View key={term.id} style={{ marginBottom: i === group.terms.length - 1 ? 0 : spacing.md }}>
                  <ThemedText size="sm" weight="semibold">
                    {term.term}
                  </ThemedText>
                  <ThemedText variant="secondary" size="xs" style={{ marginTop: 2, lineHeight: 18 }}>
                    {term.definition}
                  </ThemedText>
                </View>
              ))}
            </SectionCard>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, minHeight: 46 },
  searchInput: { flex: 1, paddingVertical: 10 },
});
