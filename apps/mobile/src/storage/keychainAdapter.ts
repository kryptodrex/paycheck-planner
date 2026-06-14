import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'pp-plan-key-';
const BIOMETRIC_PREF_PREFIX = 'pp-biometric-';

/**
 * Returns the stored AES key for the given plan, prompting biometric auth
 * automatically when the key was saved with requireAuthentication: true.
 * Returns null if no key is stored or auth is cancelled/fails.
 */
export async function getStoredPlanKey(planId: string, planName?: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY_PREFIX + planId, {
      authenticationPrompt: planName
        ? `Authenticate to open "${planName}"`
        : 'Authenticate to open your encrypted plan',
    });
  } catch {
    return null;
  }
}

async function hasUsableBiometrics(): Promise<boolean> {
  try {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

/**
 * Stores an AES key for the plan. When `useBiometric` is set and biometrics are
 * available the key is protected with `requireAuthentication` so future reads
 * prompt Face ID / fingerprint. This is strictly best-effort: biometric storage
 * throws when the binary lacks `NSFaceIDUsageDescription` (e.g. Expo Go) or no
 * biometrics are enrolled, so we fall back to plain secure storage and never
 * reject — caching the key must never block opening an already-decrypted plan.
 *
 * @returns whether the key was persisted at all.
 */
export async function storePlanKey(
  planId: string,
  key: string,
  useBiometric = true,
): Promise<boolean> {
  const storeKey = KEY_PREFIX + planId;

  if (useBiometric && (await hasUsableBiometrics())) {
    try {
      await SecureStore.setItemAsync(storeKey, key, {
        requireAuthentication: true,
        authenticationPrompt: 'Authenticate to save your encryption key securely',
      });
      return true;
    } catch {
      // Biometric-protected storage unavailable — fall back below.
    }
  }

  try {
    await SecureStore.setItemAsync(storeKey, key);
    return true;
  } catch {
    return false;
  }
}

/** Whether the user has opted into biometric unlock for this plan. */
export async function getBiometricPref(planId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(BIOMETRIC_PREF_PREFIX + planId)) === 'true';
  } catch {
    return false;
  }
}

async function setBiometricPref(planId: string, enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(BIOMETRIC_PREF_PREFIX + planId, enabled ? 'true' : 'false');
  } catch {
    // Preference is best-effort; ignore storage failures.
  }
}

/**
 * Toggle biometric unlock for an encrypted plan. Enabling prompts for biometric
 * auth once (satisfying the OS permission ask), then re-stores the key with
 * `requireAuthentication`; disabling re-stores it without. Returns the effective
 * enabled state (enabling fails closed if auth is cancelled/unavailable).
 */
export async function setBiometricUnlock(
  planId: string,
  key: string,
  enabled: boolean,
): Promise<boolean> {
  if (enabled) {
    if (!(await hasUsableBiometrics())) return false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Enable biometric unlock for this plan',
    });
    if (!result.success) return false;
    await storePlanKey(planId, key, true);
    await setBiometricPref(planId, true);
    return true;
  }

  await storePlanKey(planId, key, false);
  await setBiometricPref(planId, false);
  return false;
}

export async function deletePlanKey(planId: string): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_PREFIX + planId);
}

export type BiometricType = 'face' | 'fingerprint' | 'iris' | 'none';

export async function getAvailableBiometricType(): Promise<BiometricType> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!hasHardware || !isEnrolled) return 'none';

  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'iris';
  return 'none';
}
