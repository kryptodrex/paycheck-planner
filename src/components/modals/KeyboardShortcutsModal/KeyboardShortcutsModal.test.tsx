import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';

describe('KeyboardShortcutsModal', () => {
  it('renders zoom shortcuts in the views section', () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('Views Options')).toBeInTheDocument();
    expect(screen.getByText('Zoom in (scales the full app viewport)')).toBeInTheDocument();
    expect(screen.getByText('Zoom out (scales the full app viewport)')).toBeInTheDocument();
    expect(screen.getByText('Reset zoom to 100%')).toBeInTheDocument();
    expect(screen.getByLabelText(/(Cmd|Ctrl) plus \+/)).toBeInTheDocument();
    expect(screen.getByLabelText(/(Cmd|Ctrl) plus -/)).toBeInTheDocument();
    expect(screen.getByLabelText(/(Cmd|Ctrl) plus 0/)).toBeInTheDocument();
  });

  it('explains zoom and font scale differences', () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={() => {}} />);

    expect(
      screen.getByText(
        'Zoom changes the entire app viewport. Font Scale in Settings adjusts text sizing for readability preferences.',
      ),
    ).toBeInTheDocument();
  });
});
