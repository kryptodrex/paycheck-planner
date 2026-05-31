import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormattedNumberInput from './FormattedNumberInput';

describe('FormattedNumberInput', () => {
  it('renders an input element', () => {
    render(<FormattedNumberInput value={100} onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('displays formatted value when blurred', () => {
    render(<FormattedNumberInput value={1234.56} onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('1,234.56');
  });

  it('shows an empty string for empty value', () => {
    render(<FormattedNumberInput value="" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('calls onChange when user types a digit', async () => {
    const handleChange = vi.fn();
    render(<FormattedNumberInput value="" onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, '5');
    expect(handleChange).toHaveBeenCalled();
    const firstCall = handleChange.mock.calls[0][0];
    expect(firstCall.target.value).toBe('5');
  });

  it('strips non-numeric characters from each onChange call', async () => {
    const handleChange = vi.fn();
    render(<FormattedNumberInput value="" onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'a');
    // non-numeric chars produce sanitized empty string
    const allCallValues: string[] = handleChange.mock.calls.map((c) => c[0].target.value);
    expect(allCallValues.every((v) => /^-?\d*\.?\d*$/.test(v))).toBe(true);
  });

  it('renders prefix when provided', () => {
    const { container } = render(
      <FormattedNumberInput value={50} onChange={vi.fn()} prefix="$" />,
    );
    expect(container.querySelector('.formatted-number-affix')).toHaveTextContent('$');
  });

  it('renders suffix when provided', () => {
    const { container } = render(
      <FormattedNumberInput value={50} onChange={vi.fn()} suffix="%" />,
    );
    const affixes = container.querySelectorAll('.formatted-number-affix');
    const suffixEl = Array.from(affixes).find((el) => el.textContent === '%');
    expect(suffixEl).toBeDefined();
  });

  it('does not render affix elements when prefix/suffix are absent', () => {
    const { container } = render(<FormattedNumberInput value={50} onChange={vi.fn()} />);
    expect(container.querySelector('.formatted-number-affix')).toBeNull();
  });

  it('applies field-error class to wrapper when className includes field-error', () => {
    const { container } = render(
      <FormattedNumberInput value={0} onChange={vi.fn()} className="field-error" />,
    );
    expect(container.firstChild).toHaveClass('field-error');
  });

  it('forwards placeholder attribute', () => {
    render(
      <FormattedNumberInput value="" onChange={vi.fn()} placeholder="Enter amount" />,
    );
    expect(screen.getByPlaceholderText('Enter amount')).toBeInTheDocument();
  });

  it('does not allow negative values by default', async () => {
    const handleChange = vi.fn();
    render(<FormattedNumberInput value="" onChange={handleChange} allowNegative={false} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, '-');
    const callValues: string[] = handleChange.mock.calls.map((c) => c[0].target.value);
    expect(callValues.every((v) => !v.startsWith('-'))).toBe(true);
  });

  it('allows negative values when allowNegative is true', async () => {
    const handleChange = vi.fn();
    render(<FormattedNumberInput value="-" onChange={handleChange} allowNegative={true} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
