/**
 * Generates a UUID v4 string in any runtime.
 *
 * React Native's Hermes engine has no global `crypto`, so a bare
 * `crypto.randomUUID()` throws a ReferenceError on mobile. This helper
 * prefers the native Web Crypto implementation (Node, Electron, browsers)
 * and falls back to a manual RFC 4122 v4 construction elsewhere.
 */
export function generateId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }

  let bytes: Uint8Array;
  if (cryptoObj?.getRandomValues) {
    bytes = cryptoObj.getRandomValues(new Uint8Array(16));
  } else {
    bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Set the version (4) and variant (10xx) bits per RFC 4122
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
