import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import Toggle from './Toggle';

describe('Toggle', () => {
  it('renders a checkbox input', () => {
    render(<Toggle checked={false} onChange={vi.fn()} />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('reflects checked state', () => {
    render(<Toggle checked={true} onChange={vi.fn()} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('reflects unchecked state', () => {
    render(<Toggle checked={false} onChange={vi.fn()} />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('calls onChange with new value when toggled', async () => {
    const handleChange = vi.fn();
    render(<Toggle checked={false} onChange={handleChange} />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('renders label text when provided', () => {
    render(<Toggle checked={false} onChange={vi.fn()} label="Enable notifications" />);
    expect(screen.getByText('Enable notifications')).toBeInTheDocument();
  });

  it('does not render label text when not provided', () => {
    const { container } = render(<Toggle checked={false} onChange={vi.fn()} />);
    expect(container.querySelector('.toggle-text')).toBeNull();
  });

  it('is disabled when disabled prop is set', () => {
    render(<Toggle checked={false} onChange={vi.fn()} disabled />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('adds disabled class to label when disabled', () => {
    const { container } = render(<Toggle checked={false} onChange={vi.fn()} disabled />);
    expect(container.querySelector('.toggle-label')).toHaveClass('disabled');
  });

  it('does not call onChange when disabled and clicked', async () => {
    const handleChange = vi.fn();
    render(<Toggle checked={false} onChange={handleChange} disabled />);
    await userEvent.click(screen.getByRole('checkbox'), { pointerEventsCheck: PointerEventsCheckLevel.Never });
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('uses provided id', () => {
    render(<Toggle id="my-toggle" checked={false} onChange={vi.fn()} />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('id', 'my-toggle');
  });
});
