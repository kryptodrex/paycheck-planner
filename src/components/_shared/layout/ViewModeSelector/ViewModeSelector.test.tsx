import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ViewModeSelector from './ViewModeSelector';

const DEFAULT_OPTIONS = [
  { value: 'paycheck' as const, label: 'Per Paycheck' },
  { value: 'monthly' as const, label: 'Monthly' },
  { value: 'yearly' as const, label: 'Yearly' },
];

describe('ViewModeSelector', () => {
  beforeEach(() => {
    localStorage.clear();
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
