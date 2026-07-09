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
import { writePlanFile, writePlanToSource } from '../storage/planFileAdapter';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** Status of mirroring saves back to the original (cloud) document. */
export type SourceSyncState = 'idle' | 'synced' | 'error';

interface SetPlanOptions {
  encryptionKey?: string | null;
  /**
   * The original document the plan was opened from (Files app / SAF provider).
   * When set, every save is also written back to it so the source — e.g. a file
   * in cloud storage — stays up to date, like editing in place on desktop.
   */
  sourceUri?: string | null;
}

export interface UpdatePlanOptions {
  /** Human-readable change description recorded in the plan's audit history. */
  description?: string;
  /** Set false for ephemeral changes (e.g. view mode) that shouldn't create audit/undo noise. */
  trackAudit?: boolean;
}

export interface ChangeSignal {
  label: string;
  /** Monotonic id so listeners can react to each distinct change. */
  seq: number;
}

interface PlanContextValue {
  plan: BudgetData | null;
  sourcePath: string | null;
  /** Original document saves are mirrored back to, or null for local-only plans. */
  sourceUri: string | null;
  encryptionKey: string | null;
  saveState: SaveState;
  saveError: string | null;
  syncState: SourceSyncState;
  syncError: string | null;
  canUndo: boolean;
  canRedo: boolean;
  lastChange: ChangeSignal | null;
  setPlan: (plan: BudgetData | null, path: string | null, options?: SetPlanOptions) => void;
  updatePlan: (updater: (plan: BudgetData) => BudgetData, options?: UpdatePlanOptions) => void;
  /** Change the file's encryption: pass a key to encrypt, or null to decrypt. Re-writes the file. */
  changeEncryptionKey: (key: string | null) => void;
  undo: () => void;
  redo: () => void;
  closePlan: () => void;
}

const PlanContext = createContext<PlanContextValue | null>(null);

const SAVE_DEBOUNCE_MS = 600;
const HISTORY_LIMIT = 50;

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlanState] = useState<BudgetData | null>(null);
  const [sourcePath, setSourcePath] = useState<string | null>(null);
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SourceSyncState>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [past, setPast] = useState<BudgetData[]>([]);
  const [future, setFuture] = useState<BudgetData[]>([]);
  const [lastChange, setLastChange] = useState<ChangeSignal | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);
  const latest = useRef<{
    plan: BudgetData | null;
    path: string | null;
    source: string | null;
    key: string | null;
  }>({
    plan: null,
    path: null,
    source: null,
    key: null,
  });

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const flushSave = useCallback(async () => {
    const { plan: currentPlan, path, source, key } = latest.current;
    if (!currentPlan || !path) return;

    setSaveState('saving');
    try {
      await writePlanFile(path, currentPlan, key);
      setSaveState('saved');
      setSaveError(null);
    } catch (err) {
      setSaveState('error');
      setSaveError(err instanceof Error ? err.message : String(err));
      return;
    }

    // Mirror the save back to the document the plan was opened from so the
    // source (e.g. a cloud-synced file) receives the edits too. Failure here
    // never loses data — the durable on-device copy above already saved.
    if (!source) return;
    try {
      await writePlanToSource(source, currentPlan, key);
      setSyncState('synced');
      setSyncError(null);
    } catch (err) {
      setSyncState('error');
      setSyncError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void flushSave();
    }, SAVE_DEBOUNCE_MS);
  }, [flushSave]);

  // Commits a new plan value, syncing the ref synchronously and persisting.
  const applyPlan = useCallback(
    (next: BudgetData) => {
      latest.current = { ...latest.current, plan: next };
      setPlanState(next);
      scheduleSave();
    },
    [scheduleSave],
  );

  const setPlan = useCallback(
    (newPlan: BudgetData | null, path: string | null, options?: SetPlanOptions) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      latest.current = {
        plan: newPlan,
        path,
        source: options?.sourceUri ?? null,
        key: options?.encryptionKey ?? null,
      };
      setPlanState(newPlan);
      setSourcePath(path);
      setSourceUri(options?.sourceUri ?? null);
      setEncryptionKey(options?.encryptionKey ?? null);
      setSaveState('idle');
      setSaveError(null);
      setSyncState('idle');
      setSyncError(null);
      setPast([]);
      setFuture([]);
      setLastChange(null);
    },
    [],
  );

  const updatePlan = useCallback(
    (updater: (current: BudgetData) => BudgetData, options?: UpdatePlanOptions) => {
      const current = latest.current.plan;
      if (!current) return;

      const base = { ...updater(current), updatedAt: new Date().toISOString() };
      if (base === current) return;

      const tracked = options?.trackAudit !== false;
      const auditEntries = tracked
        ? buildAuditEntries({
            prev: current,
            next: base,
            sourceAction: options?.description ?? 'Update plan data',
          })
        : [];

      const updated =
        auditEntries.length > 0
          ? {
              ...base,
              metadata: {
                auditHistory: [...(base.metadata?.auditHistory ?? []), ...auditEntries],
              },
            }
          : base;

      // Only record undo history for meaningful (audited) changes — not
      // ephemeral display state like the view-mode toggle.
      if (tracked) {
        setPast((p) => [...p, current].slice(-HISTORY_LIMIT));
        setFuture([]);
        seqRef.current += 1;
        setLastChange({ label: options?.description ?? 'Change', seq: seqRef.current });
      }

      applyPlan(updated);
    },
    [applyPlan],
  );

  const undo = useCallback(() => {
    const current = latest.current.plan;
    if (!current || past.length === 0) return;
    const previous = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [...f, current].slice(-HISTORY_LIMIT));
    applyPlan(previous);
  }, [past, applyPlan]);

  const redo = useCallback(() => {
    const current = latest.current.plan;
    if (!current || future.length === 0) return;
    const next = future[future.length - 1];
    setFuture((f) => f.slice(0, -1));
    setPast((p) => [...p, current].slice(-HISTORY_LIMIT));
    applyPlan(next);
  }, [future, applyPlan]);

  const changeEncryptionKey = useCallback(
    (key: string | null) => {
      if (!latest.current.plan || !latest.current.path) return;
      latest.current = { ...latest.current, key };
      setEncryptionKey(key);
      // Rewrite the file immediately in the new (encrypted/plaintext) format.
      void flushSave();
    },
    [flushSave],
  );

  const closePlan = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    latest.current = { plan: null, path: null, source: null, key: null };
    setPlanState(null);
    setSourcePath(null);
    setSourceUri(null);
    setEncryptionKey(null);
    setSaveState('idle');
    setSaveError(null);
    setSyncState('idle');
    setSyncError(null);
    setPast([]);
    setFuture([]);
    setLastChange(null);
  }, []);

  return (
    <PlanContext.Provider
      value={{
        plan,
        sourcePath,
        sourceUri,
        encryptionKey,
        saveState,
        saveError,
        syncState,
        syncError,
        canUndo: past.length > 0,
        canRedo: future.length > 0,
        lastChange,
        setPlan,
        updatePlan,
        changeEncryptionKey,
        undo,
        redo,
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
