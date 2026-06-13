import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { PlanProvider } from '../src/contexts/PlanContext';
import { ShakeUndoHandler } from '../src/components/ShakeUndoHandler';

function RootStack() {
  const { colors } = useTheme();
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bgPrimary },
          headerTintColor: colors.accentPrimary,
          headerTitleStyle: { fontWeight: '700', color: colors.textPrimary },
          // Show only the chevron on iOS back buttons (no "(tabs)" parent label).
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bgPrimary },
        }}
      >
        {/* animationTypeForReplace: 'pop' so returning to the welcome screen
            (when closing a plan via replace) slides in from the left. */}
        <Stack.Screen name="index" options={{ headerShown: false, animationTypeForReplace: 'pop' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: 'Not Found' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PlanProvider>
          <RootStack />
          <ShakeUndoHandler />
        </PlanProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
