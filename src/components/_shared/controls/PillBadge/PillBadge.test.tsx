import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PillBadge from './PillBadge';

describe('PillBadge', () => {
  it('renders children', () => {
    render(<PillBadge>Active</PillBadge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('defaults to neutral variant', () => {
    const { container } = render(<PillBadge>text</PillBadge>);
    expect(container.firstChild).toHaveClass('pill-badge--neutral');
  });

  it.each([
    'success',
    'accent',
    'info',
    'warning',
    'neutral',
    'outline',
  ] as const)('applies %s variant class', (variant) => {
    const { container } = render(<PillBadge variant={variant}>label</PillBadge>);
    expect(container.firstChild).toHaveClass(`pill-badge--${variant}`);
  });

  it('applies base pill-badge class', () => {
    const { container } = render(<PillBadge>badge</PillBadge>);
    expect(container.firstChild).toHaveClass('pill-badge');
  });

  it('merges additional className', () => {
    const { container } = render(<PillBadge className="custom">badge</PillBadge>);
    expect(container.firstChild).toHaveClass('custom');
  });

  it('renders as a span element', () => {
    const { container } = render(<PillBadge>badge</PillBadge>);
    expect(container.firstChild?.nodeName).toBe('SPAN');
  });

  it('renders React node children', () => {
    render(
      <PillBadge>
        <strong>Bold</strong>
      </PillBadge>,
    );
    expect(screen.getByText('Bold').tagName).toBe('STRONG');
  });
});
