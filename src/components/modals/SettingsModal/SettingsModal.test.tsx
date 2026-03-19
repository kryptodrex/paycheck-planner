import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
  let scrollIntoViewSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollIntoViewSpy = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollIntoViewSpy,
    });

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
        colorVisionMode: 'normal',
        stateCueMode: 'enhanced',
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
        colorVisionMode: 'normal',
        stateCueMode: 'enhanced',
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

  it('filters settings sections using search keywords', async () => {
    const user = userEvent.setup();
    renderSettingsModal();

    await user.type(screen.getByLabelText(/search settings/i), 'contrast');

    expect(screen.getByRole('heading', { name: 'Accessibility' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Appearance' })).not.toBeInTheDocument();

    const sidebar = screen.getByLabelText('Settings sections');
    expect(within(sidebar).getByRole('button', { name: 'Accessibility' })).toBeInTheDocument();
    expect(within(sidebar).queryByRole('button', { name: 'Appearance' })).not.toBeInTheDocument();
  });

  it('shows an empty state when no settings sections match search', async () => {
    const user = userEvent.setup();
    renderSettingsModal();

    await user.type(screen.getByLabelText(/search settings/i), 'zebra');

    expect(screen.getByText('No sections match your search.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No matching settings found. Try broader keywords.');
  });

  it('finds appearance by preset name and narrows the preset list', async () => {
    const user = userEvent.setup();
    renderSettingsModal();

    await user.type(screen.getByLabelText(/search settings/i), 'ocean');

    expect(screen.getByRole('heading', { name: 'Appearance' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /ocean/i })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /default/i })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Showing matching presets for "ocean".');
  });

  it('finds view mode favorites by cadence value and narrows visible options', async () => {
    const user = userEvent.setup();
    renderSettingsModal();

    await user.type(screen.getByLabelText(/search settings/i), 'quarterly');

    expect(screen.getByRole('heading', { name: 'App Data and Reset' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'View Mode Favorites' })).toBeInTheDocument();
    expect(screen.getByLabelText('Quarterly')).toBeInTheDocument();
    expect(screen.queryByLabelText('Weekly')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Showing matching view modes for "quarterly".');
  });

  it('explains theme mode and preset distinctions in appearance settings', () => {
    renderSettingsModal();

    expect(screen.getByText(/Theme setting controls whether is in light or dark mode, or matching your system preference\./i)).toBeInTheDocument();
    expect(screen.getByText(/Preset setting controls the overall color scheme of the app\./i)).toBeInTheDocument();
  });

  it('persists color vision support selection', async () => {
    const user = userEvent.setup();
    renderSettingsModal();

    await user.selectOptions(screen.getByLabelText('Color Vision Support'), 'deuteranopia');

    const storedSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || '{}');
    expect(storedSettings.colorVisionMode).toBe('deuteranopia');
    expect(screen.getByText(/Green-sensitive color adjustments\./i)).toBeInTheDocument();
  });

  it('persists enhanced state cue selection', async () => {
    const user = userEvent.setup();
    renderSettingsModal();

    const stateCueGroup = screen.getByText('Enhanced State Cues').closest('.settings-group');
    expect(stateCueGroup).toBeTruthy();
    await user.click(within(stateCueGroup as HTMLElement).getByRole('button', { name: 'Off' }));

    const storedSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || '{}');
    expect(storedSettings.stateCueMode).toBe('minimal');
    expect(screen.getByText('Hides additional state cues while preserving core behavior and theme colors.')).toBeInTheDocument();
  });

  it('scrolls to the selected section when using sidebar navigation', async () => {
    const user = userEvent.setup();
    renderSettingsModal();

    const sidebar = screen.getByLabelText('Settings sections');
    await user.click(within(sidebar).getByRole('button', { name: 'Glossary' }));

    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(within(sidebar).getByRole('button', { name: 'Glossary' })).toHaveClass('active');
  });

  it('resets search state when the modal closes and reopens', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const { rerender } = render(
      <ThemeProvider>
        <SettingsModal isOpen={true} onClose={onClose} />
      </ThemeProvider>,
    );

    const searchInput = screen.getByLabelText(/search settings/i);
    await user.type(searchInput, 'ocean');

    expect(screen.queryByRole('radio', { name: /default/i })).not.toBeInTheDocument();

    rerender(
      <ThemeProvider>
        <SettingsModal isOpen={false} onClose={onClose} />
      </ThemeProvider>,
    );

    rerender(
      <ThemeProvider>
        <SettingsModal isOpen={true} onClose={onClose} />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText(/search settings/i)).toHaveValue('');
    expect(screen.getByRole('radio', { name: /paycheck planner purple/i })).toBeInTheDocument();
  });
});
