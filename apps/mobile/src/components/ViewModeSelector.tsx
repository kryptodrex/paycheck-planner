import type { ViewMode } from '@paycheck-planner/core';
import { SegmentedControl } from './SegmentedControl';

// Mirrors the desktop CompactViewModeSelector: per-paycheck, monthly, yearly.
const VIEW_MODE_OPTIONS: { value: ViewMode & string; label: string }[] = [
  { value: 'paycheck', label: 'Per Paycheck' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

interface Props {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewModeSelector({ value, onChange }: Props) {
  const normalized = VIEW_MODE_OPTIONS.some((o) => o.value === value) ? value : 'paycheck';
  return (
    <SegmentedControl
      options={VIEW_MODE_OPTIONS}
      value={normalized as string}
      onChange={(mode) => onChange(mode as ViewMode)}
    />
  );
}
