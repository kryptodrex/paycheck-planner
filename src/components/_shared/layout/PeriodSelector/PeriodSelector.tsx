import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../../controls/Button';
import PillBadge from '../../controls/PillBadge';
import './PeriodSelector.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface Period {
  year: number;
  /** 1-based month (1 = January, 12 = December) */
  month: number;
}

interface PeriodSelectorProps {
  period: Period;
  paychecksInPeriod: number;
  displayMode: 'monthly' | 'quarterly';
  onChange: (period: Period) => void;
}

function getPeriodLabel(period: Period, displayMode: 'monthly' | 'quarterly'): string {
  if (displayMode === 'quarterly') {
    const quarter = Math.ceil(period.month / 3);
    return `Q${quarter} ${period.year}`;
  }
  return `${MONTH_NAMES[period.month - 1]} ${period.year}`;
}

function navigatePeriod(period: Period, direction: 1 | -1, displayMode: 'monthly' | 'quarterly'): Period {
  const step = displayMode === 'quarterly' ? 3 : 1;
  let month = period.month + direction * step;
  let year = period.year;
  if (month > 12) {
    month -= 12;
    year += 1;
  } else if (month < 1) {
    month += 12;
    year -= 1;
  }
  return { year, month };
}

function getPaycheckLabel(count: number): string {
  return count === 1 ? '1 paycheck' : `${count} paychecks`;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  period,
  paychecksInPeriod,
  displayMode,
  onChange,
}) => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const isCurrentPeriod =
    displayMode === 'monthly'
      ? period.year === currentYear && period.month === currentMonth
      : period.year === currentYear && Math.ceil(period.month / 3) === Math.ceil(currentMonth / 3);

  const label = getPeriodLabel(period, displayMode);

  return (
    <div className="period-selector" aria-label={`Period: ${label}, ${getPaycheckLabel(paychecksInPeriod)}`}>
      <Button
        variant="secondary"
        size="xsmall"
        onClick={() => onChange(navigatePeriod(period, -1, displayMode))}
        title="Previous period"
        aria-label="Previous period"
      >
        <ChevronLeft className="ui-icon" aria-hidden="true" />
      </Button>
      <span className="period-selector-label">{label}</span>
      <Button
        variant="secondary"
        size="xsmall"
        onClick={() => onChange(navigatePeriod(period, 1, displayMode))}
        title="Next period"
        aria-label="Next period"
      >
        <ChevronRight className="ui-icon" aria-hidden="true" />
      </Button>
      <PillBadge variant="accent" className="period-selector-badge">
        {getPaycheckLabel(paychecksInPeriod)}
      </PillBadge>
      {!isCurrentPeriod && (
        <Button
          variant="utility"
          size="xsmall"
          onClick={() => onChange({ year: currentYear, month: currentMonth })}
          title="Jump to current period"
        >
          Today
        </Button>
      )}
    </div>
  );
};

export default PeriodSelector;
