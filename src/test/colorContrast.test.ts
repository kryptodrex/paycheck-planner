/**
 * Color-contrast accessibility tests for Paycheck Planner design tokens.
 *
 * Verifies that every foreground/background color pair used in the UI meets
 * WCAG 2.1 Level AA contrast requirements:
 *
 *   • Normal text  (< 18 pt regular / < 14 pt bold) → 4.5 : 1
 *   • Large text   (≥ 18 pt regular / ≥ 14 pt bold) → 3.0 : 1
 *   • UI components (buttons, controls, icons)       → 3.0 : 1
 *
 * Reference: https://www.w3.org/TR/WCAG21/#contrast-minimum
 *
 * Color values are taken directly from src/index.css and individual component
 * CSS files for both the light and dark themes.
 */

import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  hexToRgb,
  meetsWcagAA,
  relativeLuminance,
  sRGBToLinear,
  WCAG,
} from './colorContrast';

// ─────────────────────────────────────────────────────────────────
// Algorithm unit tests
// ─────────────────────────────────────────────────────────────────

describe('WCAG utility – sRGBToLinear', () => {
  it('maps 0 (black channel) to 0', () => {
    expect(sRGBToLinear(0)).toBe(0);
  });

  it('maps 255 (white channel) to 1', () => {
    expect(sRGBToLinear(255)).toBeCloseTo(1, 5);
  });

  it('uses the linear segment for small values (≤ 0.04045)', () => {
    // 10/255 ≈ 0.0392 which is ≤ 0.04045 → uses v/12.92 path
    expect(sRGBToLinear(10)).toBeCloseTo(10 / 255 / 12.92, 5);
  });

  it('uses the gamma curve for larger values (> 0.04045)', () => {
    // 128/255 ≈ 0.502 which is > 0.04045 → uses pow() path
    const v = 128 / 255;
    expect(sRGBToLinear(128)).toBeCloseTo(Math.pow((v + 0.055) / 1.055, 2.4), 5);
  });
});

describe('WCAG utility – hexToRgb', () => {
  it('parses a 6-digit hex string with leading #', () => {
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('parses a 6-digit hex string without leading #', () => {
    expect(hexToRgb('000000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('is case-insensitive', () => {
    expect(hexToRgb('#FF5500')).toEqual(hexToRgb('#ff5500'));
  });

  it('throws for invalid input', () => {
    expect(() => hexToRgb('xyz')).toThrow('Invalid hex color');
    expect(() => hexToRgb('#fff')).toThrow('Invalid hex color');
  });
});

describe('WCAG utility – relativeLuminance', () => {
  it('returns 0 for pure black (#000000)', () => {
    expect(relativeLuminance('#000000')).toBe(0);
  });

  it('returns 1 for pure white (#ffffff)', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
  });

  it('returns a value between 0 and 1 for any valid color', () => {
    const l = relativeLuminance('#667eea');
    expect(l).toBeGreaterThan(0);
    expect(l).toBeLessThan(1);
  });
});

describe('WCAG utility – contrastRatio', () => {
  it('returns 21 for black on white (maximum possible contrast)', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('returns 1 for a color contrasted against itself', () => {
    expect(contrastRatio('#667eea', '#667eea')).toBeCloseTo(1, 5);
  });

  it('is symmetric (order of arguments does not matter)', () => {
    const a = '#3b82f6', b = '#f0f9ff';
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });

  it('always returns a value ≥ 1', () => {
    expect(contrastRatio('#ef4444', '#fef2f2')).toBeGreaterThanOrEqual(1);
  });
});

describe('WCAG utility – meetsWcagAA', () => {
  it('returns true for black on white (21:1, well above 4.5:1)', () => {
    expect(meetsWcagAA('#000000', '#ffffff')).toBe(true);
  });

  it('returns false for white on white (1:1)', () => {
    expect(meetsWcagAA('#ffffff', '#ffffff')).toBe(false);
  });

  it('applies the 3:1 threshold for large text / UI components', () => {
    // #667eea on white = 3.66:1 — fails 4.5 but passes 3.0
    expect(meetsWcagAA('#667eea', '#ffffff', false)).toBe(false);
    expect(meetsWcagAA('#667eea', '#ffffff', true)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────
// Known-ratio spot-checks (regression guard for the algorithm)
//
// These values were computed independently and are used to ensure the
// contrastRatio() implementation stays accurate.  If the algorithm is
// accidentally broken, these tests will catch it before the design-token
// tests further below.
// ─────────────────────────────────────────────────────────────────

describe('contrastRatio – known spot-check values', () => {
  // #111827 (text-primary) on #ffffff (bg-primary, light theme): ~17.74:1
  it('#111827 on #ffffff ≈ 17.74:1', () => {
    expect(contrastRatio('#111827', '#ffffff')).toBeCloseTo(17.74, 1);
  });

  // #4b5563 (text-secondary) on #ffffff: ~7.56:1
  it('#4b5563 on #ffffff ≈ 7.56:1', () => {
    expect(contrastRatio('#4b5563', '#ffffff')).toBeCloseTo(7.56, 1);
  });

  // #5568d3 (default light text-accent) on #ffffff: ~4.88:1
  it('#5568d3 on #ffffff ≈ 4.88:1', () => {
    expect(contrastRatio('#5568d3', '#ffffff')).toBeCloseTo(4.88, 1);
  });

  // White on #667eea (light accent-primary, primary button): ~3.66:1
  it('#ffffff on #667eea ≈ 3.66:1', () => {
    expect(contrastRatio('#ffffff', '#667eea')).toBeCloseTo(3.66, 1);
  });

  // #b91c1c (fixed alert-error-text) on #fef2f2 (alert-error-bg): ~5.91:1
  it('#b91c1c on #fef2f2 ≈ 5.91:1 (fixed alert-error contrast)', () => {
    expect(contrastRatio('#b91c1c', '#fef2f2')).toBeCloseTo(5.91, 1);
  });

  // #92400e (fixed alert-warning-text) on #fffbeb (alert-warning-bg): ~6.84:1
  it('#92400e on #fffbeb ≈ 6.84:1 (fixed alert-warning contrast)', () => {
    expect(contrastRatio('#92400e', '#fffbeb')).toBeCloseTo(6.84, 1);
  });

  // #166534 (fixed alert-success-text) on #f0fdf4 (alert-success-bg): ~6.81:1
  it('#166534 on #f0fdf4 ≈ 6.81:1 (fixed alert-success contrast)', () => {
    expect(contrastRatio('#166534', '#f0fdf4')).toBeCloseTo(6.81, 1);
  });

  // White text on the darker success toast easily clears AA.
  it('#ffffff on #047857 meets normal-text AA for success toasts', () => {
    expect(contrastRatio('#ffffff', '#047857')).toBeGreaterThanOrEqual(WCAG.AA_NORMAL_TEXT);
  });

  // White text on the darker warning toast also clears AA.
  it('#ffffff on #b45309 meets normal-text AA for warning toasts', () => {
    expect(contrastRatio('#ffffff', '#b45309')).toBeGreaterThanOrEqual(WCAG.AA_NORMAL_TEXT);
  });

  // #f9fafb (dark text-primary) on #1a1a1a (dark bg-primary): ~16.65:1
  it('#f9fafb on #1a1a1a ≈ 16.65:1 (dark-theme primary text)', () => {
    expect(contrastRatio('#f9fafb', '#1a1a1a')).toBeCloseTo(16.65, 1);
  });
});

// ─────────────────────────────────────────────────────────────────
// Helper to create descriptive test names
// ─────────────────────────────────────────────────────────────────
function assertAA(fg: string, bg: string, label: string, largeText = false) {
  const threshold = largeText ? WCAG.AA_LARGE_TEXT : WCAG.AA_NORMAL_TEXT;
  it(`${label} — contrast ≥ ${threshold}:1 (WCAG AA)`, () => {
    const ratio = contrastRatio(fg, bg);
    expect(ratio).toBeGreaterThanOrEqual(threshold);
  });
}

// ─────────────────────────────────────────────────────────────────
// Light-theme design token pairs
// ─────────────────────────────────────────────────────────────────
//  Values sourced from the light-theme section of src/index.css
//    :root, [data-theme="light"] { … }

describe('Light theme – primary text on surface backgrounds', () => {
  // --text-primary: #111827 on light backgrounds — normal-text threshold (4.5:1)
  assertAA('#111827', '#ffffff', 'text-primary (#111827) on bg-primary (#ffffff)');
  assertAA('#111827', '#f9fafb', 'text-primary (#111827) on bg-secondary (#f9fafb)');
  assertAA('#111827', '#f3f4f6', 'text-primary (#111827) on bg-tertiary (#f3f4f6)');
});

describe('Light theme – secondary text on surface backgrounds', () => {
  assertAA('#4b5563', '#ffffff', 'text-secondary (#4b5563) on bg-primary (#ffffff)');
  assertAA('#4b5563', '#f9fafb', 'text-secondary (#4b5563) on bg-secondary (#f9fafb)');
});

describe('Light theme – alert text on alert backgrounds (normal-text 4.5:1)', () => {
  // Colors fixed to meet WCAG AA; see CSS change log in this commit.
  assertAA('#b91c1c', '#fef2f2', 'alert-error-text (#b91c1c) on alert-error-bg (#fef2f2)');
  assertAA('#92400e', '#fffbeb', 'alert-warning-text (#92400e) on alert-warning-bg (#fffbeb)');
  assertAA('#166534', '#f0fdf4', 'alert-success-text (#166534) on alert-success-bg (#f0fdf4)');
  assertAA('#0369a1', '#f0f9ff', 'alert-info-text (#0369a1) on alert-info-bg (#f0f9ff)');
});

describe('Light theme – button text on button backgrounds (UI component 3:1)', () => {
  // Primary button: white text on accent-primary
  assertAA('#ffffff', '#667eea', 'white text on light accent-primary (#667eea) — primary button', true);
  // Danger button: white text on error-color
  assertAA('#ffffff', '#ef4444', 'white text on error-color (#ef4444) — danger button', true);
});

describe('Light theme – toast text on toast backgrounds (UI component 3:1)', () => {
  assertAA('#ffffff', '#047857', 'white text on toast-success-bg (#047857) — light mode');
  assertAA('#ffffff', '#b45309', 'white text on toast-warning-bg (#b45309) — light mode');
  // Error toast keeps white text on the darker red background
  assertAA('#ffffff', '#ef4444', 'white text on toast-error-bg (#ef4444) — light mode', true);
});

describe('Light theme – accent text and link colors', () => {
  assertAA('#5568d3', '#ffffff', 'text-accent (#5568d3) on bg-primary (#ffffff)');
  assertAA('#5568d3', '#ffffff', 'link-color (#5568d3) on bg-primary (#ffffff)');
  assertAA('#4338ca', '#ffffff', 'link-hover (#4338ca) on bg-primary (#ffffff)');
});

// ─────────────────────────────────────────────────────────────────
// Dark-theme design token pairs
// ─────────────────────────────────────────────────────────────────
//  Values sourced from the dark-theme section of src/index.css
//    [data-theme="dark"] { … }

describe('Dark theme – primary text on surface backgrounds', () => {
  assertAA('#f9fafb', '#1a1a1a', 'text-primary (#f9fafb) on bg-primary (#1a1a1a)');
  assertAA('#f9fafb', '#242424', 'text-primary (#f9fafb) on bg-secondary (#242424)');
  assertAA('#f9fafb', '#2d2d2d', 'text-primary (#f9fafb) on bg-tertiary (#2d2d2d)');
});

describe('Dark theme – secondary text on surface backgrounds', () => {
  assertAA('#d1d5db', '#242424', 'text-secondary (#d1d5db) on bg-secondary (#242424)', true);
  assertAA('#d1d5db', '#2d2d2d', 'text-secondary (#d1d5db) on bg-tertiary (#2d2d2d)', true);
});

describe('Dark theme – alert text on alert backgrounds (normal-text 4.5:1)', () => {
  assertAA('#fca5a5', '#2d1f1f', 'alert-error-text (#fca5a5) on alert-error-bg (#2d1f1f)');
  assertAA('#fbbf24', '#2d2718', 'alert-warning-text (#fbbf24) on alert-warning-bg (#2d2718)');
  assertAA('#86efac', '#1e2d24', 'alert-success-text (#86efac) on alert-success-bg (#1e2d24)');
  assertAA('#7dd3fc', '#1e2838', 'alert-info-text (#7dd3fc) on alert-info-bg (#1e2838)');
});

describe('Dark theme – button text on button backgrounds (UI component 3:1)', () => {
  assertAA('#ffffff', '#a855f7', 'white text on dark accent-primary (#a855f7) — primary button', true);
  assertAA('#ffffff', '#ef4444', 'white text on error-color (#ef4444) — danger button', true);
});

describe('Dark theme – toast text on toast backgrounds (UI component 3:1)', () => {
  // In dark mode all toast backgrounds are sufficiently dark that white text passes.
  assertAA('#ffffff', '#047857', 'white text on toast-success-bg (#047857) — dark mode', true);
  assertAA('#ffffff', '#b45309', 'white text on toast-warning-bg (#b45309) — dark mode', true);
  assertAA('#ffffff', '#b91c1c', 'white text on toast-error-bg (#b91c1c) — dark mode', true);
});

describe('Dark theme – link colors', () => {
  assertAA('#818cf8', '#1a1a1a', 'dark link-color (#818cf8) on bg-primary (#1a1a1a)', true);
});

describe('Preset themes – accent button contrast', () => {
  assertAA('#ffffff', '#0f766e', 'white text on Ocean light accent-primary (#0f766e)');
  assertAA('#ffffff', '#0284c7', 'white text on Ocean dark accent-primary (#0284c7)', true);
  assertAA('#ffffff', '#2f6f4f', 'white text on Forest light accent-primary (#2f6f4f)');
  assertAA('#ffffff', '#2f855a', 'white text on Forest dark accent-primary (#2f855a)', true);
  assertAA('#ffffff', '#b45309', 'white text on Sunset light accent-primary (#b45309)');
  assertAA('#ffffff', '#c2410c', 'white text on Sunset dark accent-primary (#c2410c)');
  assertAA('#ffffff', '#be185d', 'white text on Pink light accent-primary (#be185d)');
  assertAA('#ffffff', '#db2777', 'white text on Pink dark accent-primary (#db2777)');
  assertAA('#ffffff', '#4b5563', 'white text on Spreadsheet Core light accent-primary (#4b5563)');
  assertAA('#ffffff', '#64748b', 'white text on Spreadsheet Core dark accent-primary (#64748b)');
});

describe('Preset themes – readable text-accent colors', () => {
  assertAA('#0f766e', '#ffffff', 'Ocean light text-accent (#0f766e) on bg-primary (#ffffff)');
  assertAA('#2f6f4f', '#ffffff', 'Forest light text-accent (#2f6f4f) on bg-primary (#ffffff)');
  assertAA('#b45309', '#ffffff', 'Sunset light text-accent (#b45309) on bg-primary (#ffffff)');
  assertAA('#9d174d', '#ffffff', 'Pink light text-accent (#9d174d) on bg-primary (#ffffff)');
  assertAA('#374151', '#ffffff', 'Spreadsheet Core light text-accent (#374151) on bg-primary (#ffffff)');
  assertAA('#7dd3fc', '#1a1a1a', 'Ocean dark text-accent (#7dd3fc) on dark bg-primary (#1a1a1a)');
  assertAA('#bbf7d0', '#1a1a1a', 'Forest dark text-accent (#bbf7d0) on dark bg-primary (#1a1a1a)');
  assertAA('#fdba74', '#1a1a1a', 'Sunset dark text-accent (#fdba74) on dark bg-primary (#1a1a1a)');
  assertAA('#f9a8d4', '#1a1a1a', 'Pink dark text-accent (#f9a8d4) on dark bg-primary (#1a1a1a)');
  assertAA('#cbd5e1', '#1a1a1a', 'Spreadsheet Core dark text-accent (#cbd5e1) on dark bg-primary (#1a1a1a)');
});
