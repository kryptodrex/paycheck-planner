import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TransientStatusIndicator from './TransientStatusIndicator';

describe('TransientStatusIndicator', () => {
  it('does not render without a message', () => {
    const { container } = render(<TransientStatusIndicator message={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the message with warning styling', () => {
    render(<TransientStatusIndicator message="Plan file moved" variant="warning" topRem={2} rightRem={1.5} zoomFactor={2} />);

    const indicator = screen.getByRole('status');
    expect(indicator).toHaveTextContent('Plan file moved');
    expect(indicator.className).toContain('transient-status-indicator--warning');
    expect(indicator).toHaveStyle({ top: '1rem', right: '0.75rem', transform: 'scale(0.5)' });
  });
});
