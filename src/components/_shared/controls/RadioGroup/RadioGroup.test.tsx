import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import RadioGroup from './RadioGroup';

const OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly', description: 'Once per year' },
];

describe('RadioGroup', () => {
  it('renders all options', () => {
    render(<RadioGroup name="frequency" value="weekly" options={OPTIONS} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Weekly')).toBeInTheDocument();
    expect(screen.getByLabelText('Monthly')).toBeInTheDocument();
  });

  it('checks the option matching the current value', () => {
    render(<RadioGroup name="frequency" value="monthly" options={OPTIONS} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Monthly')).toBeChecked();
    expect(screen.getByLabelText('Weekly')).not.toBeChecked();
  });

  it('calls onChange with the selected value when an option is clicked', async () => {
    const handleChange = vi.fn();
    render(<RadioGroup name="frequency" value="weekly" options={OPTIONS} onChange={handleChange} />);
    await userEvent.click(screen.getByLabelText('Monthly'));
    expect(handleChange).toHaveBeenCalledWith('monthly');
  });

  it('renders description text when provided', () => {
    render(<RadioGroup name="frequency" value="weekly" options={OPTIONS} onChange={vi.fn()} />);
    expect(screen.getByText('Once per year')).toBeInTheDocument();
  });

  it('disables an option when the disabled flag is set', () => {
    const opts = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B', disabled: true },
    ];
    render(<RadioGroup name="x" value="a" options={opts} onChange={vi.fn()} />);
    expect(screen.getByLabelText('B')).toBeDisabled();
    expect(screen.getByLabelText('A')).not.toBeDisabled();
  });

  it('does not call onChange for a disabled option', async () => {
    const handleChange = vi.fn();
    const opts = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B', disabled: true },
    ];
    render(<RadioGroup name="x" value="a" options={opts} onChange={handleChange} />);
    await userEvent.click(screen.getByLabelText('B'), { pointerEventsCheck: PointerEventsCheckLevel.Never });
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('applies row layout class when layout is row', () => {
    const { container } = render(
      <RadioGroup name="x" value="a" options={OPTIONS} onChange={vi.fn()} layout="row" />,
    );
    expect(container.firstChild).toHaveClass('row');
  });

  it('applies column layout class when layout is column', () => {
    const { container } = render(
      <RadioGroup name="x" value="a" options={OPTIONS} onChange={vi.fn()} layout="column" />,
    );
    expect(container.firstChild).toHaveClass('column');
  });

  it('resolves orientation="horizontal" to row layout', () => {
    const { container } = render(
      <RadioGroup name="x" value="a" options={OPTIONS} onChange={vi.fn()} orientation="horizontal" />,
    );
    expect(container.firstChild).toHaveClass('row');
  });

  it('merges additional className', () => {
    const { container } = render(
      <RadioGroup name="x" value="a" options={OPTIONS} onChange={vi.fn()} className="extra" />,
    );
    expect(container.firstChild).toHaveClass('extra');
  });
});
