/**
 * WCAG 2.1 color-contrast utilities.
 *
 * Reference: https://www.w3.org/TR/WCAG21/#contrast-minimum
 *
 * Minimum contrast ratios:
 *   Level AA – normal text:  4.5 : 1
 *   Level AA – large text:   3.0 : 1  (≥18 pt regular OR ≥14 pt bold)
 *   Level AA – UI components / graphical objects: 3.0 : 1
 *   Level AAA – normal text: 7.0 : 1
 *   Level AAA – large text:  4.5 : 1
 */

/** WCAG 2.1 minimum contrast-ratio thresholds. */
export const WCAG = {
  /** AA – normal body text (< 18 pt / 24 px regular, or < 14 pt / ~18.67 px bold) */
  AA_NORMAL_TEXT: 4.5,
  /** AA – large text (≥ 18 pt / 24 px regular OR ≥ 14 pt / ~18.67 px bold) */
  AA_LARGE_TEXT: 3.0,
  /** AA – non-text UI components (buttons, form controls, icons) and graphical objects */
  AA_UI_COMPONENTS: 3.0,
  /** AAA – normal body text */
  AAA_NORMAL_TEXT: 7.0,
  /** AAA – large text */
  AAA_LARGE_TEXT: 4.5,
} as const;

/**
 * Parse a 6-digit hex color string (with or without leading `#`) into its
 * red, green, and blue integer channel values (0–255).
 *
 * @throws if the string is not a valid 6-digit hex color
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: "${hex}". Expected a 6-digit hex string.`);
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert a single 8-bit sRGB channel value (0–255) to its linearised form
 * as defined by the IEC 61966-2-1 standard (used by WCAG).
 */
export function sRGBToLinear(channel: number): number {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Compute the WCAG 2.1 relative luminance of a hex color.
 * Returns a value in the range [0, 1], where 0 is pure black and 1 is pure white.
 *
 * Formula: L = 0.2126 * R + 0.7152 * G + 0.0722 * B  (with linearised channels)
 */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (
    0.2126 * sRGBToLinear(r) +
    0.7152 * sRGBToLinear(g) +
    0.0722 * sRGBToLinear(b)
  );
}

/**
 * Compute the WCAG 2.1 contrast ratio between two hex colors.
 *
 * Returns a value ≥ 1. Higher is better:
 *   - 1 : 1 means identical colors
 *   - 21 : 1 means black on white (maximum)
 *
 * Formula: (L1 + 0.05) / (L2 + 0.05)  where L1 ≥ L2
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns true if the foreground/background pair meets WCAG 2.1 Level AA.
 *
 * @param fg  Foreground hex color (text color)
 * @param bg  Background hex color
 * @param largeText  Pass `true` for large text (≥ 18 pt regular / ≥ 14 pt bold)
 *                   or UI components — uses the 3 : 1 threshold instead of 4.5 : 1
 */
export function meetsWcagAA(fg: string, bg: string, largeText = false): boolean {
  const threshold = largeText ? WCAG.AA_LARGE_TEXT : WCAG.AA_NORMAL_TEXT;
  return contrastRatio(fg, bg) >= threshold;
}

/**
 * Returns true if the foreground/background pair meets WCAG 2.1 Level AAA.
 *
 * @param fg  Foreground hex color (text color)
 * @param bg  Background hex color
 * @param largeText  Pass `true` for large text to use the 4.5 : 1 threshold
 *                   instead of 7 : 1
 */
export function meetsWcagAAA(fg: string, bg: string, largeText = false): boolean {
  const threshold = largeText ? WCAG.AAA_LARGE_TEXT : WCAG.AAA_NORMAL_TEXT;
  return contrastRatio(fg, bg) >= threshold;
}
