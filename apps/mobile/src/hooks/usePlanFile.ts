import { useState, useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import type { BudgetData } from '@paycheck-planner/core';
import { readPlanFile, decryptPlan, copyPlanIntoLibrary } from '../storage/planFileAdapter';
import { getStoredPlanKey, storePlanKey } from '../storage/keychainAdapter';
import { addRecentFile } from '../storage/recentFilesStore';

export type PlanLoadStatus = 'idle' | 'loading' | 'needs-key' | 'error';

export interface PendingDecrypt {
  planId: string;
  payload: string;
  uri: string;
  name: string;
}

export interface UsePlanFileResult {
  status: PlanLoadStatus;
  error: string | null;
  pending: PendingDecrypt | null;
  pickAndLoad: () => Promise<void>;
  submitKey: (key: string) => Promise<boolean>;
  clearPending: () => void;
}

export function usePlanFile(
  onSuccess: (plan: BudgetData, uri: string, encryptionKey: string | null) => void,
): UsePlanFileResult {
  const [status, setStatus] = useState<PlanLoadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingDecrypt | null>(null);

  const finalize = useCallback(
    async (plan: BudgetData, uri: string, name: string, encryptionKey: string | null) => {
      // Keep a durable copy in the app's documents directory; picker copies
      // land in the cache directory and can be evicted at any time.
      let workingUri = uri;
      try {
        workingUri = await copyPlanIntoLibrary(uri, plan.id);
      } catch {
        // Fall back to the original uri — read-only access still works.
      }

      await addRecentFile({
        uri: workingUri,
        name,
        lastOpenedAt: new Date().toISOString(),
        planId: plan.id,
        planName: plan.name,
        planYear: plan.year,
      });
      onSuccess(plan, workingUri, encryptionKey);
      setStatus('idle');
      setError(null);
    },
    [onSuccess],
  );

  const pickAndLoad = useCallback(async () => {
    setStatus('loading');
    setError(null);

    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) {
      setStatus('idle');
      return;
    }

    const asset = result.assets[0];
    const uri = asset.uri;
    const name = asset.name ?? 'Budget Plan';

    const parsed = await readPlanFile(uri);

    if (parsed.status === 'invalid') {
      setStatus('error');
      setError(parsed.reason);
      return;
    }

    if (parsed.status === 'ok') {
      await finalize(parsed.data, uri, name, null);
      return;
    }

    // Encrypted — try stored key first (triggers biometrics automatically)
    const storedKey = await getStoredPlanKey(parsed.planId, name);
    if (storedKey) {
      const plan = decryptPlan(parsed.payload, storedKey);
      if (plan) {
        await finalize(plan, uri, name, storedKey);
        return;
      }
      // Stored key is stale — fall through to ask user
      setError('The stored key could not decrypt this plan. Please enter your key again.');
    }

    // Ask the user for the key
    setPending({ planId: parsed.planId, payload: parsed.payload, uri, name });
    setStatus('needs-key');
  }, [finalize]);

  const submitKey = useCallback(
    async (key: string): Promise<boolean> => {
      if (!pending) return false;

      const trimmed = key.trim();
      const plan = decryptPlan(pending.payload, trimmed);
      if (!plan) {
        setError('Incorrect key — the plan could not be decrypted. Please check and try again.');
        return false;
      }

      // Store key with biometric protection for future opens
      await storePlanKey(pending.planId, trimmed);
      await finalize(plan, pending.uri, pending.name, trimmed);
      setPending(null);
      return true;
    },
    [pending, finalize],
  );

  const clearPending = useCallback(() => {
    setPending(null);
    setStatus('idle');
    setError(null);
  }, []);

  return { status, error, pending, pickAndLoad, submitKey, clearPending };
}
