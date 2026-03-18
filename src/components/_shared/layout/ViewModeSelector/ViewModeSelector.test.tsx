import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ViewModeSelector from './ViewModeSelector';

class LocalStorageMock {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  clear(): void {
    this.store.clear();
  }
}

const DEFAULT_OPTIONS = [
  { value: 'paycheck' as const, label: 'Per Paycheck' },
  { value: 'monthly' as const, label: 'Monthly' },
  { value: 'yearly' as const, label: 'Yearly' },
];

describe('ViewModeSelector', () => {
  const localStorageMock = new LocalStorageMock();

  beforeEach(() => {
    localStorageMock.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });
  });
  it('renders default options when none provided', () => {
    render(<ViewModeSelector mode="weekly" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Weekly' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Monthly' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yearly' })).toBeInTheDocument();
  });

  it('marks the active mode button with active class', () => {
    render(<ViewModeSelector mode="monthly" onChange={vi.fn()} options={DEFAULT_OPTIONS} />);
    expect(screen.getByRole('button', { name: 'Monthly' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Per Paycheck' })).not.toHaveClass('active');
  });

  it('calls onChange when a mode button is clicked', async () => {
    const handleChange = vi.fn();
    render(<ViewModeSelector mode="paycheck" onChange={handleChange} options={DEFAULT_OPTIONS} />);
    await userEvent.click(screen.getByRole('button', { name: 'Yearly' }));
    expect(handleChange).toHaveBeenCalledWith('yearly');
  });

  it('renders custom options', () => {
    const opts = [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
    ];
    render(<ViewModeSelector mode="a" onChange={vi.fn()} options={opts} />);
    expect(screen.getByRole('button', { name: 'Option A' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Option B' })).toBeInTheDocument();
  });
});
