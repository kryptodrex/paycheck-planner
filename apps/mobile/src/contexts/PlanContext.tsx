import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { BudgetData } from '@paycheck-planner/core';

interface PlanContextValue {
  plan: BudgetData | null;
  sourcePath: string | null;
  setPlan: (plan: BudgetData | null, path: string | null) => void;
  closePlan: () => void;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlanState] = useState<BudgetData | null>(null);
  const [sourcePath, setSourcePath] = useState<string | null>(null);

  const setPlan = useCallback((newPlan: BudgetData | null, path: string | null) => {
    setPlanState(newPlan);
    setSourcePath(path);
  }, []);

  const closePlan = useCallback(() => {
    setPlanState(null);
    setSourcePath(null);
  }, []);

  return (
    <PlanContext.Provider value={{ plan, sourcePath, setPlan, closePlan }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within PlanProvider');
  return ctx;
}
