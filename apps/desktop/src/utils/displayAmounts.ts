import type { ViewMode } from '../types/viewMode';
import { convertFromDisplayMode, convertToDisplayMode } from './payPeriod';

export function toDisplayAmount(
  perPaycheckAmount: number,
  paychecksPerYear: number,
  mode: ViewMode,
): number {
  return convertToDisplayMode(perPaycheckAmount, paychecksPerYear, mode);
}

export function fromDisplayAmount(
  displayAmount: number,
  paychecksPerYear: number,
  mode: ViewMode,
): number {
  return convertFromDisplayMode(displayAmount, paychecksPerYear, mode);
}

export function monthlyToDisplayAmount(
  monthlyAmount: number,
  paychecksPerYear: number,
  mode: ViewMode,
): number {
  const perPaycheckAmount = (monthlyAmount * 12) / paychecksPerYear;
  return toDisplayAmount(perPaycheckAmount, paychecksPerYear, mode);
}