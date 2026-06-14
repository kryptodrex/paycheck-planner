import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../src/contexts/ThemeContext';
import { fetchGlossary, type GlossaryData, type GlossaryTerm } from '../src/services/referenceData';
import { ThemedView } from '../src/components/ThemedView';
import { ThemedText } from '../src/components/ThemedText';
import { SectionCard } from '../src/components/SectionCard';
import { EmptyState } from '../src/components/EmptyState';

export default function GlossaryScreen() {
  const { colors, spacing, radius, fontSize } = useTheme();
  const [data, setData] = useState<GlossaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  // Look up a term's display name by id (for rendering related-term chips).
  const termsById = useMemo(() => {
    const map = new Map<string, GlossaryTerm>();
    for (const term of data?.terms ?? []) map.set(term.id, term);
    return map;
  }, [data]);

  const grouped = useMemo(() => {
    if (!data) return [];
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matches = data.terms.filter((term) => {
      if (tokens.length === 0) return true;
      const corpus = [
        term.term,
        term.shortDefinition,
        term.fullDefinition,
        term.category,
        ...(term.aliases ?? []),
        ...(term.tags ?? []),
      ]
        .join(' ')
        .toLowerCase();
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

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
              {group.terms.map((term, i) => {
                const isOpen = expanded.has(term.id);
                const related = (term.relatedTermIds ?? [])
                  .map((id) => termsById.get(id))
                  .filter((t): t is GlossaryTerm => t !== undefined);
                return (
                  <View
                    key={term.id}
                    style={{ marginBottom: i === group.terms.length - 1 ? 0 : spacing.md }}
                  >
                    <TouchableOpacity
                      style={styles.termRow}
                      onPress={() => toggle(term.id)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isOpen }}
                    >
                      <View style={{ flex: 1, paddingRight: spacing.sm }}>
                        <ThemedText size="sm" weight="semibold">
                          {term.term}
                        </ThemedText>
                        <ThemedText variant="secondary" size="xs" style={{ marginTop: 2, lineHeight: 18 }}>
                          {term.shortDefinition}
                        </ThemedText>
                      </View>
                      <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
                    </TouchableOpacity>

                    {isOpen && (
                      <View style={{ marginTop: spacing.xs, gap: spacing.xs }}>
                        <ThemedText variant="secondary" size="xs" style={{ lineHeight: 18 }}>
                          {term.fullDefinition}
                        </ThemedText>

                        {!!term.aliases?.length && (
                          <ThemedText variant="tertiary" size="xs">
                            <ThemedText variant="tertiary" size="xs" weight="semibold">
                              Also called:{' '}
                            </ThemedText>
                            {term.aliases.join(', ')}
                          </ThemedText>
                        )}

                        {!!term.tags?.length && (
                          <ThemedText variant="tertiary" size="xs">
                            <ThemedText variant="tertiary" size="xs" weight="semibold">
                              Keywords:{' '}
                            </ThemedText>
                            {term.tags.join(', ')}
                          </ThemedText>
                        )}

                        {related.length > 0 && (
                          <View style={styles.relatedWrap}>
                            <ThemedText variant="tertiary" size="xs" weight="semibold">
                              Related:
                            </ThemedText>
                            {related.map((rel) => (
                              <TouchableOpacity
                                key={rel.id}
                                onPress={() => {
                                  setQuery(rel.term);
                                  setExpanded(new Set([rel.id]));
                                }}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                style={[
                                  styles.relatedChip,
                                  { backgroundColor: colors.bgInput, borderColor: colors.border, borderRadius: radius.sm },
                                ]}
                              >
                                <ThemedText size="xs" style={{ color: colors.textAccent }}>
                                  {rel.term}
                                </ThemedText>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
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
  termRow: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 36 },
  relatedWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 2 },
  relatedChip: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
});
