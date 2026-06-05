import { describe, it, expect, vi, beforeEach } from 'vitest';
import CryptoJS from 'crypto-js';

// Mock expo-file-system — not available in Node test environment
vi.mock('expo-file-system', () => ({
  readAsStringAsync: vi.fn(),
  EncodingType: { UTF8: 'utf8' },
}));

import * as FileSystem from 'expo-file-system';
import { readPlanFile, decryptPlan } from '../src/storage/planFileAdapter';

const MOCK_PLAN = {
  id: 'test-plan-001',
  name: 'Test Plan',
  year: 2025,
  paySettings: { payType: 'salary', annualSalary: 100000, payFrequency: 'bi-weekly' },
  preTaxDeductions: [],
  benefits: [],
  retirement: [],
  taxSettings: { taxLines: [], additionalWithholding: 0 },
  accounts: [],
  bills: [],
  loans: [],
  settings: { currency: 'USD', locale: 'en-US' },
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

function makeEncryptedEnvelope(plan: typeof MOCK_PLAN, key: string) {
  const payload = CryptoJS.AES.encrypt(JSON.stringify(plan), key).toString();
  return JSON.stringify({
    format: 'paycheck-planner-encrypted-v1',
    planId: plan.id,
    payload,
  });
}

describe('readPlanFile', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns ok for a valid unencrypted plan', async () => {
    vi.mocked(FileSystem.readAsStringAsync).mockResolvedValue(JSON.stringify(MOCK_PLAN));
    const result = await readPlanFile('file:///test.budget');
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.data.id).toBe('test-plan-001');
      expect(result.planId).toBe('test-plan-001');
    }
  });

  it('returns encrypted for an encrypted envelope', async () => {
    const envelope = makeEncryptedEnvelope(MOCK_PLAN, 'my-secret-key');
    vi.mocked(FileSystem.readAsStringAsync).mockResolvedValue(envelope);
    const result = await readPlanFile('file:///encrypted.budget');
    expect(result.status).toBe('encrypted');
    if (result.status === 'encrypted') {
      expect(result.planId).toBe('test-plan-001');
      expect(typeof result.payload).toBe('string');
    }
  });

  it('returns invalid for unrecognised JSON', async () => {
    vi.mocked(FileSystem.readAsStringAsync).mockResolvedValue(JSON.stringify({ foo: 'bar' }));
    const result = await readPlanFile('file:///bad.budget');
    expect(result.status).toBe('invalid');
  });

  it('returns invalid when file cannot be read', async () => {
    vi.mocked(FileSystem.readAsStringAsync).mockRejectedValue(new Error('Permission denied'));
    const result = await readPlanFile('file:///nope.budget');
    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.reason).toContain('Permission denied');
    }
  });

  it('returns invalid for malformed JSON', async () => {
    vi.mocked(FileSystem.readAsStringAsync).mockResolvedValue('not json {{{}}}');
    const result = await readPlanFile('file:///garbage.budget');
    expect(result.status).toBe('invalid');
  });
});

describe('decryptPlan', () => {
  const KEY = 'super-secret-key-1234';

  it('decrypts a correctly encrypted plan', () => {
    const payload = CryptoJS.AES.encrypt(JSON.stringify(MOCK_PLAN), KEY).toString();
    const result = decryptPlan(payload, KEY);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('test-plan-001');
  });

  it('returns null for a wrong key', () => {
    const payload = CryptoJS.AES.encrypt(JSON.stringify(MOCK_PLAN), KEY).toString();
    const result = decryptPlan(payload, 'wrong-key');
    // Wrong key produces garbled output — should return null
    expect(result).toBeNull();
  });

  it('returns null for payload that decrypts to non-plan JSON', () => {
    const payload = CryptoJS.AES.encrypt(JSON.stringify({ not: 'a plan' }), KEY).toString();
    expect(decryptPlan(payload, KEY)).toBeNull();
  });

  it('returns null for a completely invalid payload string', () => {
    expect(decryptPlan('not-a-valid-ciphertext', KEY)).toBeNull();
  });
});
