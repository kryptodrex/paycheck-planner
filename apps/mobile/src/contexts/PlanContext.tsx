import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import { buildAuditEntries, type BudgetData } from '@paycheck-planner/core';
import { writePlanFile } from '../storage/planFileAdapter';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface SetPlanOptions {
  encryptionKey?: string | null;
}

export interface UpdatePlanOptions {
  /** Human-readable change description recorded in the plan's audit history. */
  description?: string;
  /** Set false for ephemeral changes (e.g. view mode) that shouldn't create audit noise. */
  trackAudit?: boolean;
}

interface PlanContextValue {
  plan: BudgetData | null;
  sourcePath: string | null;
  encryptionKey: string | null;
  saveState: SaveState;
  saveError: string | null;
  setPlan: (plan: BudgetData | null, path: string | null, options?: SetPlanOptions) => void;
  updatePlan: (updater: (plan: BudgetData) => BudgetData, options?: UpdatePlanOptions) => void;
  closePlan: () => void;
}

const PlanContext = createContext<PlanContextValue | null>(null);

const SAVE_DEBOUNCE_MS = 600;

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlanState] = useState<BudgetData | null>(null);
  const [sourcePath, setSourcePath] = useState<string | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<{ plan: BudgetData | null; path: string | null; key: string | null }>({
    plan: null,
    path: null,
    key: null,
  });

  useEffect(() => {
    latest.current = { plan, path: sourcePath, key: encryptionKey };
  }, [plan, sourcePath, encryptionKey]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const flushSave = useCallback(async () => {
    const { plan: currentPlan, path, key } = latest.current;
    if (!currentPlan || !path) return;

    setSaveState('saving');
    try {
      await writePlanFile(path, currentPlan, key);
      setSaveState('saved');
      setSaveError(null);
    } catch (err) {
      setSaveState('error');
      setSaveError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void flushSave();
    }, SAVE_DEBOUNCE_MS);
  }, [flushSave]);

  const setPlan = useCallback(
    (newPlan: BudgetData | null, path: string | null, options?: SetPlanOptions) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setPlanState(newPlan);
      setSourcePath(path);
      setEncryptionKey(options?.encryptionKey ?? null);
      setSaveState('idle');
      setSaveError(null);
    },
    [],
  );

  const updatePlan = useCallback(
    (updater: (current: BudgetData) => BudgetData, options?: UpdatePlanOptions) => {
      setPlanState((current) => {
        if (!current) return current;
        const next = { ...updater(current), updatedAt: new Date().toISOString() };

        // Record audit entries the same way desktop does, so the change
        // history travels with the plan file across platforms.
        const auditEntries =
          options?.trackAudit === false
            ? []
            : buildAuditEntries({
                prev: current,
                next,
                sourceAction: options?.description ?? 'Update plan data',
              });

        const updated =
          auditEntries.length > 0
            ? {
                ...next,
                metadata: {
                  auditHistory: [...(next.metadata?.auditHistory ?? []), ...auditEntries],
                },
              }
            : next;

        latest.current = { ...latest.current, plan: updated };
        return updated;
      });
      scheduleSave();
    },
    [scheduleSave],
  );

  const closePlan = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setPlanState(null);
    setSourcePath(null);
    setEncryptionKey(null);
    setSaveState('idle');
    setSaveError(null);
  }, []);

  return (
    <PlanContext.Provider
      value={{
        plan,
        sourcePath,
        encryptionKey,
        saveState,
        saveError,
        setPlan,
        updatePlan,
        closePlan,
      }}
    >
      {children}
    </PlanContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within PlanProvider');
  return ctx;
}
