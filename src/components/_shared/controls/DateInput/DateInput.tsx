import React from 'react';
import './DateInput.css';

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Full native date picker or month/day only selector */
  mode?: 'date' | 'day-month';
  /** Required for day-month mode to compose a full YYYY-MM-DD value */
  planYear?: number;
}

const DateInput: React.FC<DateInputProps> = ({
  className,
  mode = 'date',
  planYear,
  value,
  onChange,
  ...props
}) => {
  const safeYear = planYear ?? new Date().getFullYear();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const hasError = className?.includes('field-error');

  const parsedDate = React.useMemo(() => {
    if (typeof value !== 'string' || !value) return null;
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [value]);

  const selectedMonth = parsedDate ? parsedDate.getMonth() + 1 : 1;
  const selectedDay = parsedDate ? parsedDate.getDate() : 1;

  const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

  const emitDateValue = (month: number, day: number) => {
    const nextValue = `${safeYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!onChange) return;
    const syntheticEvent = {
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
  };

  const handleMonthChange = (nextMonthStr: string) => {
    const nextMonth = parseInt(nextMonthStr, 10);
    const clampedDay = Math.min(selectedDay, daysInMonth(safeYear, nextMonth));
    emitDateValue(nextMonth, clampedDay);
  };

  const handleDayChange = (nextDayStr: string) => {
    const nextDay = parseInt(nextDayStr, 10);
    emitDateValue(selectedMonth, nextDay);
  };

  if (mode === 'day-month') {
    const dayMax = daysInMonth(safeYear, selectedMonth);

    return (
      <div className={`date-input day-month ${hasError ? 'field-error' : ''}`.trim()}>
        <select
          className="date-input-select"
          value={selectedMonth}
          onChange={(e) => handleMonthChange(e.target.value)}
          aria-label="Select month"
        >
          {Array.from({ length: 12 }, (_, idx) => {
            const monthValue = idx + 1;
            const monthLabel = new Date(2000, idx, 1).toLocaleString(undefined, { month: 'short' });
            return (
              <option key={monthValue} value={monthValue}>
                {monthLabel}
              </option>
            );
          })}
        </select>

        <span className="date-input-divider" aria-hidden="true" />

        <select
          className="date-input-select"
          value={Math.min(selectedDay, dayMax)}
          onChange={(e) => handleDayChange(e.target.value)}
          aria-label="Select day"
        >
          {Array.from({ length: dayMax }, (_, idx) => idx + 1).map((dayValue) => (
            <option key={dayValue} value={dayValue}>
              {dayValue}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const openDatePicker = () => {
    if (!inputRef.current) return;
    inputRef.current.focus();
    if (typeof inputRef.current.showPicker === 'function') {
      inputRef.current.showPicker();
    }
  };

  return (
    <div className={`date-input ${hasError ? 'field-error' : ''}`.trim()}>
      <input ref={inputRef} type="date" className={className} value={value} onChange={onChange} {...props} />
      <button
        type="button"
        className="date-input-trigger"
        aria-label="Open date picker"
        onClick={openDatePicker}
        tabIndex={-1}
      >
        <span className="date-input-calendar" aria-hidden="true" />
      </button>
    </div>
  );
};

export default DateInput;
