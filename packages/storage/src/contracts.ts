import type { StorageError } from './errors';

export interface PersistedPlan<TPlanData = unknown> {
  filePath: string;
  fileName: string;
  planName: string;
  data: TPlanData;
}

export type OpenPlanResult<TPlanData = unknown> =
  | { status: 'success'; plan: PersistedPlan<TPlanData> }
  | { status: 'cancelled' }
  | { status: 'error'; error: StorageError };

export type SavePlanResult =
  | { status: 'success'; filePath: string; fileName: string }
  | { status: 'cancelled' }
  | { status: 'error'; error: StorageError };

export interface PlanRepository<TPlanData = unknown> {
  openPlan(): Promise<OpenPlanResult<TPlanData>>;
  savePlan(data: TPlanData, filePath?: string): Promise<SavePlanResult>;
}

export interface SecureKeyRepository {
  saveKey(planId: string, key: string): Promise<void>;
  getKey(planId: string): Promise<string | null>;
  deleteKey(planId: string): Promise<void>;
  keyExists(planId: string): Promise<boolean>;
  getOrCreateKey(planId: string): Promise<string>;
}

export interface PlanFileSystemRepository {
  loadBudget(filePath: string): Promise<{ success: boolean; data?: string; error?: string }>;
  openFileDialog(): Promise<string | null>;
  saveFileDialog(budgetName?: string): Promise<string | null>;
  saveBudget(filePath: string, data: string): Promise<{ success: boolean; error?: string }>;
  fileExists(filePath: string): Promise<boolean>;
  selectDirectory(): Promise<string | null>;
}
