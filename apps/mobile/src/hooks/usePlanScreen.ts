import { useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import {
  formatCurrency,
  getPaychecksPerYear,
  toDisplayAmount,
  type BudgetData,
  type ViewMode,
} from '@paycheck-planner/core';
import { usePlan } from '../contexts/PlanContext';

export interface PlanScreenHelpers {
  plan: BudgetData;
  updatePlan: (updater: (plan: BudgetData) => BudgetData) => void;
  fmt: (amount: number) => string;
  displayMode: ViewMode;
  setDisplayMode: (mode: ViewMode) => void;
  paychecksPerYear: number;
  /** Convert a per-paycheck amount into the active display mode. */
  display: (perPaycheckAmount: number) => number;
}

/**
 * Shared scaffolding for plan tab screens: redirects to the welcome screen
 * when no plan is open and exposes formatting + display-mode helpers.
 *
 * The display mode persists into plan.settings.displayMode, matching desktop.
 */
export function usePlanScreen(): PlanScreenHelpers | null {
  const { plan, updatePlan } = usePlan();

  useEffect(() => {
    if (!plan) {
      router.replace('/');
    }
  }, [plan]);

  const setDisplayMode = useCallback(
    (mode: ViewMode) => {
      updatePlan((current) => ({
        ...current,
        settings: { ...current.settings, displayMode: mode },
      }));
    },
    [updatePlan],
  );

  if (!plan) return null;

  const { currency, locale } = plan.settings;
  const displayMode: ViewMode = plan.settings.displayMode ?? 'paycheck';
  const paychecksPerYear = getPaychecksPerYear(plan.paySettings.payFrequency);

  return {
    plan,
    updatePlan,
    fmt: (amount: number) => formatCurrency(amount, currency, locale),
    displayMode,
    setDisplayMode,
    paychecksPerYear,
    display: (perPaycheckAmount: number) =>
      toDisplayAmount(perPaycheckAmount, paychecksPerYear, displayMode),
  };
}
