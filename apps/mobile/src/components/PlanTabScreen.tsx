import { type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppHeader } from './AppHeader';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * Scaffold for the main tab screens: a consistent custom header (native tabs
 * render no header of their own) and the scrollable content. Search lives in the
 * native tab bar. Keeps every tab visually aligned.
 */
export function PlanTabScreen({ title, subtitle, children }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgPrimary }]}>
      <AppHeader title={title} subtitle={subtitle} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1 },
});
