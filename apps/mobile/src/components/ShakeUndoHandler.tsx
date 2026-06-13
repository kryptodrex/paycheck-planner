import { Alert, type AlertButton } from 'react-native';
import { usePlan } from '../contexts/PlanContext';
import { useShake } from '../hooks/useShake';

/**
 * Renders nothing; wires the shake gesture to undo/redo with an iOS-style
 * prompt. Only active while there's something to undo or redo.
 */
export function ShakeUndoHandler() {
  const { canUndo, canRedo, undo, redo, lastChange } = usePlan();

  useShake(() => {
    if (!canUndo && !canRedo) return;
    const buttons: AlertButton[] = [];
    if (canUndo) buttons.push({ text: 'Undo', onPress: undo });
    if (canRedo) buttons.push({ text: 'Redo', onPress: redo });
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(
      'Undo or Redo?',
      lastChange ? `Last change: ${lastChange.label}.` : undefined,
      buttons,
    );
  }, canUndo || canRedo);

  return null;
}
