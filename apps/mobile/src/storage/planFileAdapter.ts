import * as FileSystem from 'expo-file-system/legacy';
import CryptoJS from 'crypto-js';
import type { BudgetData } from '@paycheck-planner/core';

export interface EncryptedEnvelope {
  format: 'paycheck-planner-encrypted-v1';
  planId: string;
  payload: string;
}

function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
  if (!value || typeof value !== 'object') return false;
  const c = value as Partial<EncryptedEnvelope>;
  return (
    c.format === 'paycheck-planner-encrypted-v1' &&
    typeof c.planId === 'string' &&
    typeof c.payload === 'string'
  );
}

function isBudgetData(value: unknown): value is BudgetData {
  if (!value || typeof value !== 'object') return false;
  const c = value as Partial<BudgetData>;
  return (
    typeof c.id === 'string' &&
    typeof c.year === 'number' &&
    typeof c.name === 'string' &&
    typeof c.paySettings === 'object' &&
    Array.isArray(c.accounts) &&
    Array.isArray(c.bills) &&
    typeof c.settings === 'object'
  );
}

export type ReadPlanResult =
  | { status: 'ok'; data: BudgetData; planId: string }
  | { status: 'encrypted'; planId: string; payload: string }
  | { status: 'invalid'; reason: string };

export async function readPlanFile(uri: string): Promise<ReadPlanResult> {
  try {
    const content = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const parsed: unknown = JSON.parse(content);

    if (isEncryptedEnvelope(parsed)) {
      return { status: 'encrypted', planId: parsed.planId, payload: parsed.payload };
    }

    if (isBudgetData(parsed)) {
      return { status: 'ok', data: parsed, planId: parsed.id };
    }

    return { status: 'invalid', reason: 'File does not match a known Paycheck Planner format.' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'invalid', reason: `Could not read file: ${message}` };
  }
}

/**
 * Decrypt an AES-encrypted plan payload using the given key.
 * Returns the parsed BudgetData, or null if the key is wrong or the
 * decrypted content is not a valid plan.
 */
export function decryptPlan(payload: string, key: string): BudgetData | null {
  try {
    const decrypted = CryptoJS.AES.decrypt(payload, key).toString(CryptoJS.enc.Utf8);
    if (!decrypted) return null;
    const parsed: unknown = JSON.parse(decrypted);
    return isBudgetData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Serialize a plan to the on-disk format shared with desktop: plain JSON, or
 * the AES envelope (`paycheck-planner-encrypted-v1`) when a key is provided.
 */
export function serializePlan(plan: BudgetData, encryptionKey?: string | null): string {
  const jsonData = JSON.stringify(plan, null, 2);
  if (!encryptionKey) return jsonData;

  const envelope: EncryptedEnvelope = {
    format: 'paycheck-planner-encrypted-v1',
    planId: plan.id,
    payload: CryptoJS.AES.encrypt(jsonData, encryptionKey).toString(),
  };
  return JSON.stringify(envelope, null, 2);
}

export async function writePlanFile(
  uri: string,
  plan: BudgetData,
  encryptionKey?: string | null,
): Promise<void> {
  await FileSystem.writeAsStringAsync(uri, serializePlan(plan, encryptionKey), {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

const PLAN_LIBRARY_DIR = 'plans/';

async function ensurePlanLibraryDir(): Promise<string> {
  const dir = FileSystem.documentDirectory + PLAN_LIBRARY_DIR;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

/**
 * Copy an opened plan file into the app's documents directory so edits persist
 * even after the document-picker cache copy is evicted. Returns the durable
 * library URI for the plan.
 */
export async function copyPlanIntoLibrary(sourceUri: string, planId: string): Promise<string> {
  const dir = await ensurePlanLibraryDir();
  const targetUri = dir + `${planId}.budget`;
  if (sourceUri !== targetUri) {
    await FileSystem.copyAsync({ from: sourceUri, to: targetUri });
  }
  return targetUri;
}

/** Write a brand-new plan into the documents-directory library and return its URI. */
export async function createPlanFileInLibrary(
  plan: BudgetData,
  encryptionKey?: string | null,
): Promise<string> {
  const dir = await ensurePlanLibraryDir();
  const uri = dir + `${plan.id}.budget`;
  await writePlanFile(uri, plan, encryptionKey);
  return uri;
}
