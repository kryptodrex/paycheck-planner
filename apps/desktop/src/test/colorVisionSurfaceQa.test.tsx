import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';

import Alert from '../components/_shared/feedback/Alert/Alert';
import ConfirmDialog from '../components/_shared/feedback/ConfirmDialog/ConfirmDialog';
import Button from '../components/_shared/controls/Button/Button';
import type { ColorVisionMode } from '../types/appearance';

const COLOR_VISION_MODES: ColorVisionMode[] = ['normal', 'protanopia', 'deuteranopia', 'tritanopia'];
const THEMES = ['light', 'dark'] as const;
const CONTRASTS = ['normal', 'high'] as const;

function ColorVisionQaFixture() {
  return (
    <div>
      <Alert type="error">Potential budget issue detected.</Alert>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
        <Button variant="secondary" disabled>
          Sync Plan
        </Button>
        <Button variant="danger">Delete Plan</Button>
      </div>
      <ConfirmDialog
        isOpen={true}
        onClose={() => undefined}
        onConfirm={() => undefined}
        title="Delete plan"
        message="This action cannot be undone."
        confirmVariant="danger"
      />
    </div>
  );
}

describe('Color vision surface QA', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.setAttribute('data-theme-preset', 'default');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-preset');
    document.documentElement.removeAttribute('data-contrast');
    document.documentElement.removeAttribute('data-color-vision');
  });

  for (const mode of COLOR_VISION_MODES) {
    for (const theme of THEMES) {
      for (const contrast of CONTRASTS) {
        it(`${mode} ${theme} ${contrast} fixture has no accessibility violations`, async () => {
          document.documentElement.setAttribute('data-theme', theme);
          document.documentElement.setAttribute('data-contrast', contrast);
          document.documentElement.setAttribute('data-color-vision', mode);

          const { container } = render(<ColorVisionQaFixture />);
          expect(await axe(container)).toHaveNoViolations();
        });
      }
    }
  }

  it('renders non-color state cues for alerts, destructive confirmations, and disabled controls', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.setAttribute('data-contrast', 'normal');
    document.documentElement.setAttribute('data-color-vision', 'deuteranopia');

    render(<ColorVisionQaFixture />);

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Destructive action')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sync Plan' })).toHaveClass('btn-disabled-state');
  });
});
