import React, { useEffect, useMemo, useState } from 'react';
import { formatNumberDisplay, parseFormattedNumber } from '../../../utils/money';
import './FormattedNumberInput.css';

interface FormattedNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: string | number;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  allowNegative?: boolean;
}

const sanitizeNumericInput = (raw: string, decimals: number, allowNegative: boolean): string => {
  if (!raw) return '';

  let sanitized = raw.replace(/,/g, '').replace(/[^\d.-]/g, '');

  const isNegative = allowNegative && sanitized.startsWith('-');
  sanitized = sanitized.replace(/-/g, '');

  const parts = sanitized.split('.');
  const integerPart = parts[0] || '';

  if (decimals <= 0) {
    return `${isNegative ? '-' : ''}${integerPart}`;
  }

  const decimalPart = parts.slice(1).join('').slice(0, decimals);
  const hasTrailingDot = raw.includes('.') && parts.length === 1;

  if (hasTrailingDot) {
    return `${isNegative ? '-' : ''}${integerPart}.`;
  }

  return `${isNegative ? '-' : ''}${integerPart}${decimalPart ? `.${decimalPart}` : ''}`;
};

const formatTypedValue = (raw: string, decimals: number): string => {
  if (!raw) return '';

  const isNegative = raw.startsWith('-');
  const unsigned = isNegative ? raw.slice(1) : raw;
  const hasTrailingDot = unsigned.endsWith('.');
  const [integerPart = '', decimalPart = ''] = unsigned.split('.');

  const formattedInteger = integerPart
    ? parseInt(integerPart, 10).toLocaleString('en-US')
    : '0';

  if (hasTrailingDot && decimals > 0) {
    return `${isNegative ? '-' : ''}${formattedInteger}.`;
  }

  if (decimalPart && decimals > 0) {
    return `${isNegative ? '-' : ''}${formattedInteger}.${decimalPart}`;
  }

  return `${isNegative ? '-' : ''}${formattedInteger}`;
};

const formatForDisplay = (raw: string | number, decimals: number): string => {
  if (raw === '' || raw === null || raw === undefined) return '';
  const normalized = typeof raw === 'number' ? raw.toString() : raw;
  const parsed = parseFormattedNumber(normalized);
  if (!Number.isFinite(parsed)) return '';
  return formatNumberDisplay(parsed, decimals);
};

const FormattedNumberInput: React.FC<FormattedNumberInputProps> = ({
  value,
  onChange,
  onFocus,
  onBlur,
  prefix,
  suffix,
  className,
  decimals = 2,
  allowNegative = false,
  inputMode,
  ...props
}) => {
  const [displayValue, setDisplayValue] = useState(() => formatForDisplay(value, decimals));
  const hasError = className?.includes('field-error');

  const rawValue = useMemo(() => sanitizeNumericInput(String(value ?? ''), decimals, allowNegative), [value, decimals, allowNegative]);

  useEffect(() => {
    setDisplayValue(formatTypedValue(rawValue, decimals));
  }, [value, decimals, rawValue]);

  const emitChange = (nextValue: string) => {
    const syntheticEvent = {
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
  };

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    onFocus?.(event);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    setDisplayValue(formatForDisplay(rawValue, decimals));
    onBlur?.(event);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeNumericInput(event.target.value, decimals, allowNegative);
    setDisplayValue(formatTypedValue(sanitized, decimals));
    emitChange(sanitized);
  };

  return (
    <div className={`formatted-number-input ${hasError ? 'field-error' : ''}`.trim()}>
      {prefix && <span className="formatted-number-affix">{prefix}</span>}
      <input
        type="text"
        className={className}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        inputMode={inputMode || (decimals > 0 ? 'decimal' : 'numeric')}
        {...props}
      />
      {suffix && <span className="formatted-number-affix">{suffix}</span>}
    </div>
  );
};

export default FormattedNumberInput;