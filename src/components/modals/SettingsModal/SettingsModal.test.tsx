import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { STORAGE_KEYS } from '../../../constants/storage';
import SettingsModal from './SettingsModal';

function renderSettingsModal() {
  return render(
    <ThemeProvider>
      <SettingsModal isOpen={true} onClose={vi.fn()} />
    </ThemeProvider>,
  );
}

describe('SettingsModal', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({
        themeMode: 'light',
        appearanceMode: 'preset',
        appearancePreset: 'default',
        customAppearance: {
          primaryAccent: '#667eea',
          surfaceTint: '#eef2ff',
        },
        highContrastMode: false,
        fontScale: 1,
        glossaryTermsEnabled: true,
        viewModeFavorites: ['weekly', 'monthly'],
      }),
    );

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('persists preset selection and restores it on reopen', async () => {
    const user = userEvent.setup();
    const { unmount, container } = renderSettingsModal();

    const pinkRadio = screen.getByRole('radio', { name: /pretty in pink/i });
    await user.click(pinkRadio);

    expect(pinkRadio).toHaveAttribute('aria-checked', 'true');

    const storedSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || '{}');
    expect(storedSettings.appearancePreset).toBe('pink');

    expect(container.querySelector('.settings-info')).toHaveTextContent('Current theme: Light • Preset: Pretty in Pink');

    unmount();
    const rerendered = renderSettingsModal();

    expect(screen.getByRole('radio', { name: /pretty in pink/i })).toHaveAttribute('aria-checked', 'true');
    expect(rerendered.container.querySelector('.settings-info')).toHaveTextContent('Current theme: Light • Preset: Pretty in Pink');
  });

  it('hides custom controls and coerces custom appearance mode back to preset persistence', async () => {
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({
        themeMode: 'light',
        appearanceMode: 'custom',
        appearancePreset: 'ocean',
        customAppearance: {
          primaryAccent: '#0f766e',
          surfaceTint: '#ecfeff',
        },
        highContrastMode: false,
        fontScale: 1,
        glossaryTermsEnabled: true,
        viewModeFavorites: ['weekly', 'monthly'],
      }),
    );

    const { container } = renderSettingsModal();

    expect(screen.queryByRole('button', { name: 'Custom' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/primary accent color/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/surface tint color/i)).not.toBeInTheDocument();
    expect(container.querySelector('.settings-info')).toHaveTextContent('Current theme: Light • Preset: Ocean');

    const storedSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || '{}');
    expect(storedSettings.appearanceMode).toBe('preset');
  });
});
