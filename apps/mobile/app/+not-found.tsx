import { Link, Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '../src/components/ThemedText';
import { ThemedView } from '../src/components/ThemedView';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <ThemedView style={styles.container}>
        <ThemedText size="xl" weight="semibold" style={{ marginBottom: 8 }}>
          Page not found
        </ThemedText>
        <ThemedText variant="secondary" size="sm" style={{ marginBottom: 24, textAlign: 'center' }}>
          This screen doesn't exist.
        </ThemedText>
        <Link href="/" style={styles.link}>
          <ThemedText variant="accent" size="sm" weight="medium">
            Go to home screen
          </ThemedText>
        </Link>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  link: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
});
