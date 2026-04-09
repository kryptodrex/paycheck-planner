import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import DateInput from './DateInput';

const ControlledDateInput = ({
  initialValue = '2026-03-28',
  required = false,
}: {
  initialValue?: string;
  required?: boolean;
}) => {
  const [value, setValue] = React.useState(initialValue);

  return (
    <>
      <DateInput
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label="First paycheck date"
        required={required}
      />
      <div data-testid="date-value">{value || 'empty'}</div>
    </>
  );
};

describe('DateInput', () => {
  it('accepts manual text entry and normalizes it on blur', async () => {
    const user = userEvent.setup();
    render(<ControlledDateInput initialValue="" />);

    const input = screen.getByRole('textbox', { name: 'First paycheck date' });
    await user.type(input, '01092026');
    await user.tab();

    expect(screen.getByTestId('date-value')).toHaveTextContent('2026-01-09');
    expect(input).toHaveValue('01/09/2026');
  });

  it('auto-formats and clamps impossible typed dates', async () => {
    const user = userEvent.setup();
    render(<ControlledDateInput initialValue="" />);

    const input = screen.getByRole('textbox', { name: 'First paycheck date' });
    await user.type(input, '13322026');

    expect(input).toHaveValue('12/31/2026');

    await user.tab();
    expect(screen.getByTestId('date-value')).toHaveTextContent('2026-12-31');
  });

  it('opens calendar popover and updates date when selecting a day', async () => {
    const user = userEvent.setup();
    render(<ControlledDateInput />);

    await user.click(screen.getByRole('button', { name: 'Open date picker' }));

    const dialog = screen.getByRole('dialog', { name: 'Calendar date picker' });
    const targetDate = new Date('2026-03-15T00:00:00').toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    await user.click(within(dialog).getByRole('button', { name: targetDate }));

    expect(screen.getByTestId('date-value')).toHaveTextContent('2026-03-15');
    expect(screen.queryByRole('dialog', { name: 'Calendar date picker' })).not.toBeInTheDocument();
  });

  it('clears selected date from calendar footer action', async () => {
    const user = userEvent.setup();
    render(<ControlledDateInput initialValue="2026-03-10" />);

    await user.click(screen.getByRole('button', { name: 'Open date picker' }));
    await user.click(screen.getByRole('button', { name: 'Clear' }));

    expect(screen.getByTestId('date-value')).toHaveTextContent('empty');
  });

  it('keeps clear action disabled when input is required', async () => {
    const user = userEvent.setup();
    render(<ControlledDateInput initialValue="2026-03-10" required />);

    await user.click(screen.getByRole('button', { name: 'Open date picker' }));

    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
  });
});
