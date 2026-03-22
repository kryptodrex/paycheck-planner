import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Toast from './Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders message when message is provided', () => {
    render(<Toast message="Saved successfully" />);
    expect(screen.getByRole('status')).toHaveTextContent('Saved successfully');
  });

  it('renders nothing when message is null', () => {
    const { container } = render(<Toast message={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('defaults to success type', () => {
    render(<Toast message="Done" />);
    expect(screen.getByRole('status')).toHaveClass('toast-success');
  });

  it.each(['success', 'warning', 'error'] as const)('applies %s type class', (type) => {
    render(<Toast message="msg" type={type} />);
    expect(screen.getByRole('status')).toHaveClass(`toast-${type}`);
  });

  it('calls onDismiss after default duration (2500 ms)', () => {
    const onDismiss = vi.fn();
    render(<Toast message="Hello" onDismiss={onDismiss} />);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2500);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss after custom duration', () => {
    const onDismiss = vi.fn();
    render(<Toast message="Hello" duration={1000} onDismiss={onDismiss} />);
    vi.advanceTimersByTime(999);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not call onDismiss when message is null', () => {
    const onDismiss = vi.fn();
    render(<Toast message={null} onDismiss={onDismiss} />);
    vi.advanceTimersByTime(5000);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('has role="status" and aria-live="polite"', () => {
    render(<Toast message="Info" />);
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-live', 'polite');
  });

  it('resets timer when message changes', () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<Toast message="First" duration={1000} onDismiss={onDismiss} />);
    vi.advanceTimersByTime(900);
    rerender(<Toast message="Second" duration={1000} onDismiss={onDismiss} />);
    vi.advanceTimersByTime(500);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
