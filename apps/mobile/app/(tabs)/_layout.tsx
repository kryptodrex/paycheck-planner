import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
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
        sceneStyle: { backgroundColor: colors.bgPrimary },
      }}
    >
      <Tabs.Screen
        name="summary"
        options={{
          title: 'Summary',
          tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="breakdown"
        options={{
          title: 'Breakdown',
          tabBarIcon: ({ color, size }) => <Feather name="list" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="money"
        options={{
          title: 'Money',
          tabBarIcon: ({ color, size }) => <Feather name="dollar-sign" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Accounts',
          tabBarIcon: ({ color, size }) => <Feather name="credit-card" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Feather name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
