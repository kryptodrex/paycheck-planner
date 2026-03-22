import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { APPEARANCE_PRESET_OPTIONS } from '../constants/appearancePresets';
import Alert from '../components/_shared/feedback/Alert/Alert';
import Button from '../components/_shared/controls/Button/Button';
import Modal from '../components/_shared/layout/Modal/Modal';
import ViewModeSelector from '../components/_shared/layout/ViewModeSelector/ViewModeSelector';

function PresetQaFixture() {
  return (
    <Modal isOpen={true} onClose={() => undefined} header="Preset QA Surface">
      <Alert type="warning">Check key actions before closing the plan.</Alert>
      <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
        <ViewModeSelector mode="monthly" onChange={() => undefined} />
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button variant="primary">Save</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="danger">Delete</Button>
        </div>
      </div>
    </Modal>
  );
}

describe('Preset surface QA', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.setAttribute('data-contrast', 'normal');
    document.documentElement.setAttribute('data-color-vision', 'normal');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-preset');
    document.documentElement.removeAttribute('data-contrast');
    document.documentElement.removeAttribute('data-color-vision');
  });

  for (const preset of APPEARANCE_PRESET_OPTIONS) {
    for (const theme of ['light', 'dark'] as const) {
      it(`${preset.label} ${theme} fixture has no accessibility violations`, async () => {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-theme-preset', preset.value);

        const { container } = render(<PresetQaFixture />);
        expect(await axe(container)).toHaveNoViolations();
      });
    }
  }
});
