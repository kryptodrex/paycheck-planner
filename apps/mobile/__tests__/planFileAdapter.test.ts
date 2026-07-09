import { describe, it, expect, vi, beforeEach } from 'vitest';
import CryptoJS from 'crypto-js';

// Mock expo-file-system — not available in Node test environment
vi.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: vi.fn(),
  writeAsStringAsync: vi.fn(),
  copyAsync: vi.fn(),
  getInfoAsync: vi.fn(),
  makeDirectoryAsync: vi.fn(),
  documentDirectory: 'file:///documents/',
  EncodingType: { UTF8: 'utf8' },
}));

// Mock the non-legacy File API used for writing back to the source document
// and creating plan files in a user-picked folder. vi.mock factories are
// hoisted above this file's body, so the shared state lives in vi.hoisted.
const { fileWriteMock, pickDirectoryAsyncMock, createFileMock, MockFile, MockDirectory } =
  vi.hoisted(() => {
    const fileWriteMock = vi.fn();
    const pickDirectoryAsyncMock = vi.fn();
    const createFileMock = vi.fn();

    class MockFile {
      uri: string;
      constructor(uri: string) {
        this.uri = uri;
      }
      write(content: string | Uint8Array) {
        fileWriteMock(this.uri, content);
      }
    }

    class MockDirectory {
      uri: string;
      constructor(uri: string) {
        this.uri = uri;
      }
      static pickDirectoryAsync(...args: unknown[]) {
        return pickDirectoryAsyncMock(...args);
      }
      createFile(name: string, mimeType: string | null): MockFile {
        createFileMock(this.uri, name, mimeType);
        return new MockFile(`${this.uri}/${encodeURIComponent(name)}`);
      }
    }

    return { fileWriteMock, pickDirectoryAsyncMock, createFileMock, MockFile, MockDirectory };
  });

vi.mock('expo-file-system', () => ({
  File: MockFile,
  Directory: MockDirectory,
}));

import * as FileSystem from 'expo-file-system/legacy';
import {
  readPlanFile,
  decryptPlan,
  serializePlan,
  writePlanFile,
  writePlanToSource,
  copyPlanIntoLibrary,
  createPlanFileInFolder,
} from '../src/storage/planFileAdapter';

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

describe('serializePlan', () => {
  it('produces plain JSON without a key', () => {
    const serialized = serializePlan(MOCK_PLAN as never);
    const parsed = JSON.parse(serialized);
    expect(parsed.id).toBe('test-plan-001');
    expect(parsed.format).toBeUndefined();
  });

  it('produces an encrypted envelope that round-trips with decryptPlan', () => {
    const serialized = serializePlan(MOCK_PLAN as never, 'round-trip-key');
    const envelope = JSON.parse(serialized);
    expect(envelope.format).toBe('paycheck-planner-encrypted-v1');
    expect(envelope.planId).toBe('test-plan-001');

    const decrypted = decryptPlan(envelope.payload, 'round-trip-key');
    expect(decrypted?.id).toBe('test-plan-001');
    expect(decrypted?.name).toBe('Test Plan');
  });

  it('round-trips through readPlanFile for both formats', async () => {
    vi.mocked(FileSystem.readAsStringAsync).mockResolvedValue(serializePlan(MOCK_PLAN as never));
    const plain = await readPlanFile('file:///plain.budget');
    expect(plain.status).toBe('ok');

    vi.mocked(FileSystem.readAsStringAsync).mockResolvedValue(
      serializePlan(MOCK_PLAN as never, 'a-key'),
    );
    const encrypted = await readPlanFile('file:///encrypted.budget');
    expect(encrypted.status).toBe('encrypted');
  });
});

describe('writePlanFile', () => {
  it('writes serialized plan content to the given uri', async () => {
    vi.mocked(FileSystem.writeAsStringAsync).mockResolvedValue();
    await writePlanFile('file:///out.budget', MOCK_PLAN as never);
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      'file:///out.budget',
      serializePlan(MOCK_PLAN as never),
      { encoding: 'utf8' },
    );
  });
});

describe('writePlanToSource', () => {
  beforeEach(() => {
    fileWriteMock.mockReset();
  });

  it('writes plain JSON back to the original document uri', async () => {
    const sourceUri = 'content://com.provider.cloud/document/plan%2Ebudget';
    await writePlanToSource(sourceUri, MOCK_PLAN as never);
    expect(fileWriteMock).toHaveBeenCalledWith(sourceUri, serializePlan(MOCK_PLAN as never));
  });

  it('writes the encrypted envelope when a key is given', async () => {
    await writePlanToSource('file:///icloud/plan.budget', MOCK_PLAN as never, 'the-key');
    const [, content] = fileWriteMock.mock.calls[0];
    const envelope = JSON.parse(content as string);
    expect(envelope.format).toBe('paycheck-planner-encrypted-v1');
    expect(decryptPlan(envelope.payload, 'the-key')?.id).toBe('test-plan-001');
  });

  it('propagates write failures so callers can surface a sync error', async () => {
    fileWriteMock.mockImplementation(() => {
      throw new Error('Permission lapsed');
    });
    await expect(
      writePlanToSource('content://gone/doc', MOCK_PLAN as never),
    ).rejects.toThrow('Permission lapsed');
  });
});

describe('createPlanFileInFolder', () => {
  beforeEach(() => {
    pickDirectoryAsyncMock.mockReset();
    createFileMock.mockReset();
    fileWriteMock.mockReset();
  });

  it('creates a plan-named .budget document in the picked folder and writes the plan', async () => {
    pickDirectoryAsyncMock.mockResolvedValue(new MockDirectory('content://tree/icloud-docs'));
    const result = await createPlanFileInFolder(MOCK_PLAN as never);

    expect(result.status).toBe('created');
    expect(createFileMock).toHaveBeenCalledWith(
      'content://tree/icloud-docs',
      'Test Plan.budget',
      'application/json',
    );
    if (result.status === 'created') {
      expect(fileWriteMock).toHaveBeenCalledWith(result.uri, serializePlan(MOCK_PLAN as never));
    }
  });

  it('writes the encrypted envelope when a key is given', async () => {
    pickDirectoryAsyncMock.mockResolvedValue(new MockDirectory('file:///chosen-dir'));
    await createPlanFileInFolder(MOCK_PLAN as never, 'folder-key');
    const [, content] = fileWriteMock.mock.calls[0];
    const envelope = JSON.parse(content as string);
    expect(envelope.format).toBe('paycheck-planner-encrypted-v1');
    expect(decryptPlan(envelope.payload, 'folder-key')?.id).toBe('test-plan-001');
  });

  it('returns canceled when the user dismisses the folder picker', async () => {
    pickDirectoryAsyncMock.mockRejectedValue(
      Object.assign(new Error('The file picker was cancelled by the user'), {
        code: 'ERR_PICKER_CANCELLED',
      }),
    );
    const result = await createPlanFileInFolder(MOCK_PLAN as never);
    expect(result).toEqual({ status: 'canceled' });
    expect(createFileMock).not.toHaveBeenCalled();
  });

  it('rethrows real picker failures so the UI can show them', async () => {
    pickDirectoryAsyncMock.mockRejectedValue(new Error('Provider unavailable'));
    await expect(createPlanFileInFolder(MOCK_PLAN as never)).rejects.toThrow(
      'Provider unavailable',
    );
  });
});

describe('copyPlanIntoLibrary', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('copies the picked document into the plans library and returns the durable uri', async () => {
    vi.mocked(FileSystem.getInfoAsync).mockResolvedValue({ exists: true } as never);
    vi.mocked(FileSystem.copyAsync).mockResolvedValue();
    const uri = await copyPlanIntoLibrary('content://picker/doc%2Fplan', 'test-plan-001');
    expect(uri).toBe('file:///documents/plans/test-plan-001.budget');
    expect(FileSystem.copyAsync).toHaveBeenCalledWith({
      from: 'content://picker/doc%2Fplan',
      to: 'file:///documents/plans/test-plan-001.budget',
    });
  });

  it('does not copy onto itself when the source already is the library file', async () => {
    vi.mocked(FileSystem.getInfoAsync).mockResolvedValue({ exists: true } as never);
    const libraryUri = 'file:///documents/plans/test-plan-001.budget';
    const uri = await copyPlanIntoLibrary(libraryUri, 'test-plan-001');
    expect(uri).toBe(libraryUri);
    expect(FileSystem.copyAsync).not.toHaveBeenCalled();
  });
});
