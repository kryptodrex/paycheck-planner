import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../src/contexts/ThemeContext';
import { fetchAppFaqs, type AppFaqData } from '../src/services/referenceData';
import { ThemedView } from '../src/components/ThemedView';
import { ThemedText } from '../src/components/ThemedText';
import { SectionCard } from '../src/components/SectionCard';
import { EmptyState } from '../src/components/EmptyState';

export default function FaqsScreen() {
  const { colors, spacing, radius, fontSize } = useTheme();
  const [data, setData] = useState<AppFaqData | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    void (async () => {
      const result = await fetchAppFaqs();
      if (active) {
        setData(result);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const sections = useMemo(() => {
    if (!data) return [];
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return data.sections;
    return data.sections
      .map((section) => {
        const items = section.items.filter((item) => {
          const corpus = [section.title, section.description, section.searchTerms, item.question, item.answer, ...item.keywords]
            .join(' ')
            .toLowerCase();
          return tokens.every((t) => corpus.includes(t));
        });
        return items.length > 0 ? { ...section, items } : null;
      })
      .filter((s): s is AppFaqData['sections'][number] => s !== null);
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
      <Stack.Screen options={{ title: 'App FAQs' }} />

      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.bgInput, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md },
          ]}
        >
          <Feather name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary, fontSize: fontSize.md, marginLeft: spacing.sm }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search FAQs…"
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
        <EmptyState icon="wifi-off" title="Couldn't load FAQs" message="Check your connection and try again." />
      ) : sections.length === 0 ? (
        <EmptyState icon="inbox" title="No matches" message={`Nothing matches “${query.trim()}”.`} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {sections.map((section) => (
            <SectionCard key={section.id} title={section.title}>
              {section.items.map((item) => {
                const isOpen = expanded.has(item.id);
                return (
                  <View key={item.id} style={{ marginBottom: spacing.sm }}>
                    <TouchableOpacity
                      style={styles.qRow}
                      onPress={() => toggle(item.id)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isOpen }}
                    >
                      <ThemedText size="sm" weight="medium" style={{ flex: 1, paddingRight: spacing.sm }}>
                        {item.question}
                      </ThemedText>
                      <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
                    </TouchableOpacity>
                    {isOpen && (
                      <ThemedText variant="secondary" size="xs" style={{ marginTop: spacing.xs, lineHeight: 18 }}>
                        {item.answer}
                      </ThemedText>
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
  qRow: { flexDirection: 'row', alignItems: 'center', minHeight: 36 },
});
