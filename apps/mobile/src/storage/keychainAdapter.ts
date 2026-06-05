import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const KEY_PREFIX = 'pp-plan-key-';

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

/**
 * Stores an AES key for the plan, protected by biometric / device passcode.
 * After storing, every retrieval will require biometric auth automatically.
 */
export async function storePlanKey(planId: string, key: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_PREFIX + planId, key, {
    requireAuthentication: true,
    authenticationPrompt: 'Authenticate to save your encryption key securely',
  });
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
