import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ViewModeSelector from './ViewModeSelector';

const DEFAULT_OPTIONS = [
  { value: 'paycheck' as const, label: 'Per Paycheck' },
  { value: 'monthly' as const, label: 'Monthly' },
  { value: 'yearly' as const, label: 'Yearly' },
];

describe('ViewModeSelector', () => {
  it('renders default options when none provided', () => {
    render(<ViewModeSelector mode="paycheck" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Per Paycheck' })).toBeInTheDocument();
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

  it('renders hint text when provided', () => {
    render(
      <ViewModeSelector
        mode="paycheck"
        onChange={vi.fn()}
        options={DEFAULT_OPTIONS}
        hintText="Per 2 weeks"
      />,
    );
    expect(screen.getByText('Per 2 weeks')).toBeInTheDocument();
  });

  it('hides hint when mode is not in hintVisibleModes', () => {
    render(
      <ViewModeSelector
        mode="monthly"
        onChange={vi.fn()}
        options={DEFAULT_OPTIONS}
        hintText="Per 2 weeks"
        hintVisibleModes={['paycheck']}
      />,
    );
    expect(screen.queryByText('Per 2 weeks')).toBeNull();
  });

  it('shows hint when mode is in hintVisibleModes', () => {
    render(
      <ViewModeSelector
        mode="paycheck"
        onChange={vi.fn()}
        options={DEFAULT_OPTIONS}
        hintText="Per 2 weeks"
        hintVisibleModes={['paycheck']}
      />,
    );
    expect(screen.getByText('Per 2 weeks')).toBeInTheDocument();
  });

  it('reserves hint row space when reserveHintSpace is true even without hint', () => {
    const { container } = render(
      <ViewModeSelector
        mode="paycheck"
        onChange={vi.fn()}
        options={DEFAULT_OPTIONS}
        reserveHintSpace={true}
      />,
    );
    expect(container.querySelector('.view-mode-selector-hint')).toBeInTheDocument();
  });

  it('does not render hint row when neither hintText nor reserveHintSpace', () => {
    const { container } = render(
      <ViewModeSelector mode="paycheck" onChange={vi.fn()} options={DEFAULT_OPTIONS} />,
    );
    expect(container.querySelector('.view-mode-selector-hint')).toBeNull();
  });
});
