import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import PillToggle from './PillToggle';

describe('PillToggle', () => {
  it('renders left and right labels', () => {
    render(<PillToggle value={false} onChange={vi.fn()} leftLabel="Off" rightLabel="On" />);
    expect(screen.getByRole('button', { name: 'Off' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'On' })).toBeInTheDocument();
  });

  it('defaults left label to "Off" and right label to "On"', () => {
    render(<PillToggle value={false} onChange={vi.fn()} />);
    expect(screen.getByText('Off')).toBeInTheDocument();
    expect(screen.getByText('On')).toBeInTheDocument();
  });

  it('calls onChange(true) when right button clicked and value is false', async () => {
    const handleChange = vi.fn();
    render(<PillToggle value={false} onChange={handleChange} leftLabel="No" rightLabel="Yes" />);
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }));
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange(false) when left button clicked and value is true', async () => {
    const handleChange = vi.fn();
    render(<PillToggle value={true} onChange={handleChange} leftLabel="No" rightLabel="Yes" />);
    await userEvent.click(screen.getByRole('button', { name: 'No' }));
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('marks right option as active when value is true', () => {
    render(<PillToggle value={true} onChange={vi.fn()} leftLabel="No" rightLabel="Yes" />);
    expect(screen.getByRole('button', { name: 'Yes' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'No' })).not.toHaveClass('active');
  });

  it('marks left option as active when value is false', () => {
    render(<PillToggle value={false} onChange={vi.fn()} leftLabel="No" rightLabel="Yes" />);
    expect(screen.getByRole('button', { name: 'No' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Yes' })).not.toHaveClass('active');
  });

  it('disables both buttons when disabled', () => {
    render(<PillToggle value={false} onChange={vi.fn()} disabled />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeDisabled();
  });

  it('does not call onChange when disabled', async () => {
    const handleChange = vi.fn();
    render(<PillToggle value={false} onChange={handleChange} disabled />);
    for (const btn of screen.getAllByRole('button')) {
      await userEvent.click(btn, { pointerEventsCheck: PointerEventsCheckLevel.Never });
    }
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('applies disabled class to wrapper when disabled', () => {
    const { container } = render(<PillToggle value={false} onChange={vi.fn()} disabled />);
    expect(container.firstChild).toHaveClass('disabled');
  });

  it('applies additional className to wrapper', () => {
    const { container } = render(<PillToggle value={false} onChange={vi.fn()} className="my-toggle" />);
    expect(container.firstChild).toHaveClass('my-toggle');
  });
});
