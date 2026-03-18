import { describe, expect, it, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('defaults to primary variant and medium size', () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('btn-primary');
    expect(btn).not.toHaveClass('btn-small');
  });

  it.each([
    'primary',
    'secondary',
    'tertiary',
    'danger',
    'utility',
  ] as const)('applies %s variant class', (variant) => {
    render(<Button variant={variant}>btn</Button>);
    expect(screen.getByRole('button')).toHaveClass(`btn-${variant}`);
  });

  it.each(['xsmall', 'small', 'large'] as const)('applies %s size class', (size) => {
    render(<Button size={size}>btn</Button>);
    expect(screen.getByRole('button')).toHaveClass(`btn-${size}`);
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Can't click</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled and shows loading text when isLoading', () => {
    render(<Button isLoading loadingText="Saving...">Save</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent('Saving...');
  });

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Blocked</Button>);
    await userEvent.click(screen.getByRole('button'), { skipPointerEventsCheck: true });
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows successText after click and resets after timeout', () => {
    vi.useFakeTimers();
    try {
      render(<Button successText="Copied!">Copy</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toHaveTextContent('Copy');
      fireEvent.click(btn);
      expect(btn).toHaveTextContent('Copied!');
      act(() => { vi.advanceTimersByTime(2001); });
      expect(btn).toHaveTextContent('Copy');
    } finally {
      vi.useRealTimers();
    }
  });

  it('applies additional className', () => {
    render(<Button className="extra">btn</Button>);
    expect(screen.getByRole('button')).toHaveClass('extra');
  });

  it('forwards additional HTML button attributes', () => {
    render(<Button type="submit" aria-label="Submit form">Submit</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('type', 'submit');
    expect(btn).toHaveAttribute('aria-label', 'Submit form');
  });
});
