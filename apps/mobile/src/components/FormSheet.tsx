import { type ReactNode } from 'react';
import {
  Modal,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Pressable,
  Platform,
  StyleSheet,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { Button } from './Button';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  visible: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSave?: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
  onDelete?: () => void;
  deleteLabel?: string;
}

/**
 * Bottom-sheet style modal used for all add/edit workflows — the mobile
 * equivalent of the desktop's Modal + StickyActions pattern.
 */
export function FormSheet({
  visible,
  title,
  children,
  onClose,
  onSave,
  saveLabel = 'Save',
  saveDisabled,
  onDelete,
  deleteLabel = 'Delete',
}: Props) {
  const { colors, spacing, radius } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropTouchable} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bgElevated,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingBottom: Platform.OS === 'ios' ? 34 : spacing.md,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
            <ThemedText size="lg" weight="semibold">
              {title}
            </ThemedText>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          <View style={[styles.footer, { paddingHorizontal: spacing.lg, gap: spacing.sm }]}>
            {onSave && (
              <Button title={saveLabel} onPress={onSave} disabled={saveDisabled} />
            )}
            {onDelete && <Button title={deleteLabel} variant="danger" onPress={onDelete} />}
            <Button title="Cancel" variant="secondary" onPress={onClose} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  backdropTouchable: { flex: 1 },
  sheet: { maxHeight: '88%' },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  body: { flexGrow: 0 },
  footer: { paddingTop: 12 },
});
