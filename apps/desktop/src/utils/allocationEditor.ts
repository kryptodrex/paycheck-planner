import type { ViewMode } from '../types/viewMode';
import { fromDisplayAmount, toDisplayAmount } from './displayAmounts';

const STORED_ALLOCATION_PRECISION = 1_000_000_000_000;

export function normalizeStoredAllocationAmount(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(Math.max(0, amount) * STORED_ALLOCATION_PRECISION) / STORED_ALLOCATION_PRECISION;
}

export function fromAllocationDisplayAmount(
  displayAmount: number,
  paychecksPerYear: number,
  displayMode: ViewMode,
): number {
  return normalizeStoredAllocationAmount(
    fromDisplayAmount(Math.max(0, displayAmount), paychecksPerYear, displayMode),
  );
}

export function toAllocationDisplayAmount(
  storedAmount: number,
  paychecksPerYear: number,
  displayMode: ViewMode,
): number {
  return toDisplayAmount(
    normalizeStoredAllocationAmount(storedAmount),
    paychecksPerYear,
    displayMode,
  );
}