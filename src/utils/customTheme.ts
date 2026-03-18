import type { CustomAppearanceSettings } from '../types/appearance';

type Theme = 'light' | 'dark';

type Rgb = {
  r: number;
  g: number;
  b: number;
};

export const CUSTOM_THEME_VARIABLES = [
  '--bg-secondary',
  '--bg-tertiary',
  '--border-color',
  '--border-color-light',
  '--accent-primary',
  '--accent-hover',
  '--accent-secondary',
  '--text-accent',
  '--link-color',
  '--link-hover',
  '--header-gradient',
] as const;

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b]
    .map((channel) => clampChannel(channel).toString(16).padStart(2, '0'))
    .join('')}`;
}

function mixHex(base: string, overlay: string, overlayWeight: number): string {
  const baseRgb = hexToRgb(base);
  const overlayRgb = hexToRgb(overlay);
  const baseWeight = 1 - overlayWeight;

  return rgbToHex({
    r: baseRgb.r * baseWeight + overlayRgb.r * overlayWeight,
    g: baseRgb.g * baseWeight + overlayRgb.g * overlayWeight,
    b: baseRgb.b * baseWeight + overlayRgb.b * overlayWeight,
  });
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const normalize = (channel: number) => {
    const srgb = channel / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };

  const red = normalize(r);
  const green = normalize(g);
  const blue = normalize(b);

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string): number {
  const lightest = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darkest = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lightest + 0.05) / (darkest + 0.05);
}

function adjustForContrast(
  color: string,
  background: string,
  minimumContrast: number,
  direction: 'darken' | 'lighten',
): string {
  let candidate = color;
  let weight = 0;

  while (contrastRatio(candidate, background) < minimumContrast && weight < 0.96) {
    weight += 0.06;
    candidate = mixHex(color, direction === 'darken' ? '#111827' : '#ffffff', weight);
  }

  return candidate;
}

export function generateCustomThemeTokens(
  theme: Theme,
  customAppearance: CustomAppearanceSettings,
): Record<(typeof CUSTOM_THEME_VARIABLES)[number], string> {
  const { primaryAccent, surfaceTint } = customAppearance;

  if (theme === 'light') {
    const accentHover = mixHex(primaryAccent, '#111827', 0.18);
    const accentSecondary = mixHex(primaryAccent, surfaceTint, 0.4);
    const textAccent = adjustForContrast(primaryAccent, '#ffffff', 4.5, 'darken');
    const linkHover = adjustForContrast(accentHover, '#ffffff', 4.5, 'darken');

    return {
      '--bg-secondary': mixHex('#ffffff', surfaceTint, 0.32),
      '--bg-tertiary': mixHex('#ffffff', surfaceTint, 0.52),
      '--border-color': mixHex('#d1d5db', surfaceTint, 0.22),
      '--border-color-light': mixHex('#e5e7eb', surfaceTint, 0.32),
      '--accent-primary': primaryAccent,
      '--accent-hover': accentHover,
      '--accent-secondary': accentSecondary,
      '--text-accent': textAccent,
      '--link-color': textAccent,
      '--link-hover': linkHover,
      '--header-gradient': `linear-gradient(135deg, ${primaryAccent} 0%, ${accentSecondary} 100%)`,
    };
  }

  const darkAccentPrimary = adjustForContrast(primaryAccent, '#ffffff', 3, 'darken');
  const darkAccentHover = mixHex(darkAccentPrimary, '#111827', 0.14);
  const darkTextAccent = adjustForContrast(primaryAccent, '#1a1a1a', 4.5, 'lighten');
  const darkLinkHover = adjustForContrast(mixHex(darkTextAccent, '#ffffff', 0.12), '#1a1a1a', 4.5, 'lighten');
  const darkAccentSecondary = mixHex(primaryAccent, '#ffffff', 0.24);

  return {
    '--bg-secondary': mixHex('#242424', surfaceTint, 0.16),
    '--bg-tertiary': mixHex('#2d2d2d', surfaceTint, 0.2),
    '--border-color': mixHex('#374151', surfaceTint, 0.16),
    '--border-color-light': mixHex('#2d2d2d', surfaceTint, 0.12),
    '--accent-primary': darkAccentPrimary,
    '--accent-hover': darkAccentHover,
    '--accent-secondary': darkAccentSecondary,
    '--text-accent': darkTextAccent,
    '--link-color': darkTextAccent,
    '--link-hover': darkLinkHover,
    '--header-gradient': `linear-gradient(135deg, ${mixHex('#1a1a1a', primaryAccent, 0.28)} 0%, ${mixHex('#1a1a1a', surfaceTint, 0.2)} 100%)`,
  };
}