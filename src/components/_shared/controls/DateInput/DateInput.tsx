import React from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../Button';
import Dropdown from '../Dropdown';
import './DateInput.css';

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  mode?: 'date' | 'day-month';
  planYear?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const POPOVER_GAP = 8;
const VIEWPORT_PADDING = 12;
const POPOVER_WIDTH = 360;

const parseIsoDate = (raw: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return null;
  }
  const parsed = new Date(`${raw}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatInputDate = (value: string): string => {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return '';
  }
  return `${String(parsed.getMonth() + 1).padStart(2, '0')}/${String(parsed.getDate()).padStart(2, '0')}/${parsed.getFullYear()}`;
};

const applyDateMask = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 8);

  if (digits.length === 0) {
    return '';
  }

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const clampCompletedDateInput = (maskedValue: string): string => {
  const digits = maskedValue.replace(/\D/g, '');
  if (digits.length !== 8) {
    return maskedValue;
  }

  const month = Math.min(Math.max(parseInt(digits.slice(0, 2), 10) || 1, 1), 12);
  const year = Math.min(Math.max(parseInt(digits.slice(4, 8), 10) || new Date().getFullYear(), 1900), 9999);
  const maxDay = new Date(year, month, 0).getDate();
  const day = Math.min(Math.max(parseInt(digits.slice(2, 4), 10) || 1, 1), maxDay);

  return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${String(year).padStart(4, '0')}`;
};

const parseUserEnteredDate = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const isoValue = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    return parseIsoDate(isoValue) ? isoValue : null;
  }

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!slashMatch) {
    return null;
  }

  const [, month, day, year] = slashMatch;
  const isoValue = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  return parseIsoDate(isoValue) ? isoValue : null;
};

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const parseBoundDate = (value?: string): Date | null => {
  if (!value) {
    return null;
  }
  return parseIsoDate(value);
};

const isSameDate = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const emitSyntheticChange = (
  onChange: React.ChangeEventHandler<HTMLInputElement> | undefined,
  nextValue: string,
) => {
  if (!onChange) {
    return;
  }

  const syntheticEvent = {
    target: { value: nextValue },
    currentTarget: { value: nextValue },
  } as React.ChangeEvent<HTMLInputElement>;

  onChange(syntheticEvent);
};

const DateInput: React.FC<DateInputProps> = ({
  className,
  mode = 'date',
  planYear,
  value,
  onChange,
  min,
  max,
  disabled,
  required,
  name,
  id,
  ...props
}) => {
  const safeYear = planYear ?? new Date().getFullYear();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const hasError = className?.includes('field-error');
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [inputText, setInputText] = React.useState(typeof value === 'string' ? formatInputDate(value) : '');
  const [popoverStyle, setPopoverStyle] = React.useState<React.CSSProperties>({});

  const parsedDate = React.useMemo(() => {
    if (typeof value !== 'string' || !value) {
      return null;
    }
    return parseIsoDate(value);
  }, [value]);

  const minDate = React.useMemo(
    () => parseBoundDate(typeof min === 'string' ? min : undefined),
    [min],
  );
  const maxDate = React.useMemo(
    () => parseBoundDate(typeof max === 'string' ? max : undefined),
    [max],
  );
  const today = React.useMemo(() => startOfDay(new Date()), []);

  React.useEffect(() => {
    setInputText(typeof value === 'string' ? formatInputDate(value) : '');
  }, [value]);

  const [displayMonth, setDisplayMonth] = React.useState<Date>(() => {
    if (parsedDate) {
      return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  React.useEffect(() => {
    if (!isCalendarOpen) {
      return;
    }

    if (parsedDate) {
      setDisplayMonth(new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1));
      return;
    }

    setDisplayMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }, [isCalendarOpen, parsedDate, today]);

  React.useLayoutEffect(() => {
    if (!isCalendarOpen) {
      return;
    }

    const updatePopoverPosition = () => {
      if (!rootRef.current || !popoverRef.current) {
        return;
      }

      const triggerRect = rootRef.current.getBoundingClientRect();
      const popoverRect = popoverRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(POPOVER_WIDTH, viewportWidth - (VIEWPORT_PADDING * 2));
      const left = Math.min(
        Math.max(triggerRect.left, VIEWPORT_PADDING),
        viewportWidth - width - VIEWPORT_PADDING,
      );

      const spaceBelow = viewportHeight - triggerRect.bottom - VIEWPORT_PADDING;
      const spaceAbove = triggerRect.top - VIEWPORT_PADDING;
      const shouldOpenAbove = spaceBelow < popoverRect.height && spaceAbove > spaceBelow;
      const top = shouldOpenAbove
        ? Math.max(VIEWPORT_PADDING, triggerRect.top - popoverRect.height - POPOVER_GAP)
        : Math.min(triggerRect.bottom + POPOVER_GAP, viewportHeight - popoverRect.height - VIEWPORT_PADDING);

      setPopoverStyle({
        position: 'fixed',
        top,
        left,
        width,
      });
    };

    updatePopoverPosition();
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);

    return () => {
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [isCalendarOpen, inputText]);

  React.useEffect(() => {
    if (!isCalendarOpen) {
      return;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (!rootRef.current) {
        return;
      }

      const eventTarget = event.target as Node;
      const isInsideTrigger = rootRef.current.contains(eventTarget);
      const isInsidePopover = popoverRef.current?.contains(eventTarget) ?? false;

      if (!isInsideTrigger && !isInsidePopover) {
        setIsCalendarOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCalendarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isCalendarOpen]);

  const selectedMonth = parsedDate ? parsedDate.getMonth() + 1 : 1;
  const selectedDay = parsedDate ? parsedDate.getDate() : 1;

  const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

  const emitDateValue = (month: number, day: number) => {
    const nextValue = `${safeYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    emitSyntheticChange(onChange, nextValue);
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
      <div className={`date-input day-month ${hasError ? 'field-error' : ''}`.trim()} ref={rootRef}>
        <Dropdown
          containerClassName="date-input-select-container"
          className="date-input-select"
          value={selectedMonth}
          onChange={(e) => handleMonthChange(e.target.value)}
          aria-label="Select month"
          disabled={disabled}
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
        </Dropdown>

        <span className="date-input-divider" aria-hidden="true" />

        <Dropdown
          containerClassName="date-input-select-container"
          className="date-input-select"
          value={Math.min(selectedDay, dayMax)}
          onChange={(e) => handleDayChange(e.target.value)}
          aria-label="Select day"
          disabled={disabled}
        >
          {Array.from({ length: dayMax }, (_, idx) => idx + 1).map((dayValue) => (
            <option key={dayValue} value={dayValue}>
              {dayValue}
            </option>
          ))}
        </Dropdown>
      </div>
    );
  }

  const canSelectDate = (date: Date): boolean => {
    if (minDate && date < minDate) {
      return false;
    }
    if (maxDate && date > maxDate) {
      return false;
    }
    return true;
  };

  const monthLabel = displayMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const navigateMonth = (offset: number) => {
    setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const startWeekday = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1).getDay();
  const calendarDays = React.useMemo(() => {
    const firstCellDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1 - startWeekday);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(firstCellDate.getTime() + index * DAY_MS);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
        date,
        inMonth: date.getMonth() === displayMonth.getMonth() && date.getFullYear() === displayMonth.getFullYear(),
      };
    });
  }, [displayMonth, startWeekday]);

  const emitDate = (nextDate: Date) => {
    if (!canSelectDate(nextDate)) {
      return;
    }

    emitSyntheticChange(onChange, toIsoDate(nextDate));
    setInputText(formatInputDate(toIsoDate(nextDate)));
    setIsCalendarOpen(false);
  };

  const clearDate = () => {
    if (required) {
      return;
    }
    emitSyntheticChange(onChange, '');
    setInputText('');
  };

  const commitTypedValue = () => {
    const parsedValue = parseUserEnteredDate(inputText);
    if (parsedValue === null) {
      setInputText(typeof value === 'string' ? formatInputDate(value) : '');
      return;
    }

    emitSyntheticChange(onChange, parsedValue);
    setInputText(parsedValue ? formatInputDate(parsedValue) : '');

    if (parsedValue) {
      const parsedTypedDate = parseIsoDate(parsedValue);
      if (parsedTypedDate) {
        setDisplayMonth(new Date(parsedTypedDate.getFullYear(), parsedTypedDate.getMonth(), 1));
      }
    }
  };

  const rootClasses = [
    'date-input',
    'date-input-calendar-mode',
    className,
    hasError ? 'field-error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClasses} ref={rootRef}>
      <input type="hidden" name={name} value={typeof value === 'string' ? value : ''} />
      <input
        {...props}
        ref={inputRef}
        id={id}
        type="text"
        className="date-input-field"
        value={inputText}
        onChange={(event) => {
          const maskedValue = applyDateMask(event.target.value);
          const normalizedValue = maskedValue.replace(/\D/g, '').length === 8
            ? clampCompletedDateInput(maskedValue)
            : maskedValue;
          setInputText(normalizedValue);
        }}
        onBlur={commitTypedValue}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commitTypedValue();
            setIsCalendarOpen(false);
            inputRef.current?.blur();
          }

          if (event.key === 'ArrowDown' && !isCalendarOpen && !disabled) {
            event.preventDefault();
            setIsCalendarOpen(true);
          }
        }}
        placeholder="MM/DD/YYYY"
        maxLength={10}
        inputMode="numeric"
        aria-label={(props['aria-label'] as string | undefined) || 'Select date'}
        aria-haspopup="dialog"
        aria-expanded={isCalendarOpen}
        disabled={disabled}
      />
      <Button
        type="button"
        variant="secondary"
        size="small"
        className="date-input-trigger"
        aria-label="Open date picker"
        onClick={() => {
          if (disabled) {
            return;
          }
          commitTypedValue();
          setIsCalendarOpen((prev) => !prev);
        }}
        disabled={disabled}
      >
        <Calendar className="ui-icon" aria-hidden="true" />
      </Button>

      {isCalendarOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          className="date-input-popover"
          style={popoverStyle}
          role="dialog"
          aria-label="Calendar date picker"
        >
          <div className="date-input-popover-header">
            <Button
              type="button"
              variant="secondary"
              size="small"
              className="date-input-nav"
              onClick={() => navigateMonth(-1)}
              aria-label="Previous month"
            >
              <ChevronLeft className="ui-icon" aria-hidden="true" />
            </Button>
            <div className="date-input-month-label">{monthLabel}</div>
            <Button
              type="button"
              variant="secondary"
              size="small"
              className="date-input-nav"
              onClick={() => navigateMonth(1)}
              aria-label="Next month"
            >
              <ChevronRight className="ui-icon" aria-hidden="true" />
            </Button>
          </div>

          <div className="date-input-weekdays" aria-hidden="true">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((weekday, index) => (
              <span key={`${weekday}-${index}`}>{weekday}</span>
            ))}
          </div>

          <div className="date-input-grid">
            {calendarDays.map((cell) => {
              const isSelected = parsedDate ? isSameDate(cell.date, parsedDate) : false;
              const isToday = isSameDate(cell.date, today);
              const isDisabled = !canSelectDate(cell.date);
              const classes = [
                'date-input-day',
                !cell.inMonth ? 'outside-month' : '',
                isSelected ? 'selected' : '',
                isToday ? 'today' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  type="button"
                  key={cell.key}
                  className={classes}
                  onClick={() => emitDate(cell.date)}
                  disabled={isDisabled}
                  aria-label={cell.date.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="date-input-popover-footer">
            <Button type="button" variant="utility" size="small" onClick={clearDate} disabled={required}>
              Clear
            </Button>
            <Button
              type="button"
              variant="utility"
              size="small"
              onClick={() => {
                setDisplayMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                emitDate(today);
              }}
            >
              Today
            </Button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default DateInput;
