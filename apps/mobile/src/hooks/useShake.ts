import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Accelerometer } from 'expo-sensors';

// Accelerometer readings are in g (gravity included), so the device sits near a
// magnitude of 1 at rest. A deliberate shake spikes well above this.
const SHAKE_THRESHOLD = 1.8;
const MIN_INTERVAL_MS = 1200;
const SAMPLE_INTERVAL_MS = 120;

/**
 * Calls `onShake` when the device is shaken — the classic iOS undo gesture,
 * also wired up on Android. Best-effort and self-disabling on web / when the
 * accelerometer is unavailable.
 */
export function useShake(onShake: () => void, enabled = true): void {
  const lastShake = useRef(0);
  const callback = useRef(onShake);

  useEffect(() => {
    callback.current = onShake;
  });

  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;

    let cancelled = false;
    let subscription: { remove: () => void } | undefined;

    (async () => {
      try {
        const available = await Accelerometer.isAvailableAsync();
        if (!available || cancelled) return;
        Accelerometer.setUpdateInterval(SAMPLE_INTERVAL_MS);
        subscription = Accelerometer.addListener(({ x, y, z }) => {
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          if (magnitude <= SHAKE_THRESHOLD) return;
          const now = Date.now();
          if (now - lastShake.current < MIN_INTERVAL_MS) return;
          lastShake.current = now;
          callback.current();
        });
      } catch {
        // Sensor unavailable — silently skip.
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled]);
}
