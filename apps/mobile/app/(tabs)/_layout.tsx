import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accentPrimary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerStyle: { backgroundColor: colors.bgPrimary },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="summary"
        options={{
          title: 'Summary',
          tabBarIcon: ({ color }) => <TabIcon name="bar-chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="breakdown"
        options={{
          title: 'Pay Breakdown',
          tabBarIcon: ({ color }) => <TabIcon name="list" color={color} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Accounts',
          tabBarIcon: ({ color }) => <TabIcon name="credit-card" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ name, color }: { name: string; color: string }) {
  // Simple unicode fallback icons — avoids requiring a separate icon package dependency
  const ICONS: Record<string, string> = {
    'bar-chart': '▦',
    list: '☰',
    'credit-card': '▭',
  };
  const { fontSize } = useTheme();
  return (
    <Text style={{ color, fontSize: fontSize.lg, lineHeight: fontSize.lg + 4 }}>
      {ICONS[name] ?? '•'}
    </Text>
  );
}
