/**
 * BudgetContext integration tests — undo/redo state restoration
 *
 * These tests verify that user mutations are correctly tracked and that
 * undo/redo operations restore prior state across representative entity types.
 */
import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BudgetProvider, useBudget } from './BudgetContext';
import type { Bill } from '../types/obligations';
import type { ReactNode } from 'react';
import { setStorageCompositionForTests } from '../services/storageComposition';
import { FileStorageService } from '../services/fileStorage';

// Minimal electronAPI mock — only the methods BudgetContext calls synchronously
// or in the operations exercised by these tests.
const makeElectronAPIMock = () => ({
  budgetLoaded: vi.fn().mockResolvedValue(undefined),
  getWindowBounds: vi.fn().mockResolvedValue({ x: 0, y: 0, width: 1200, height: 800 }),
  fileExists: vi.fn().mockResolvedValue(true),
});

beforeEach(() => {
  Object.defineProperty(globalThis, 'window', {
    value: {
      electronAPI: makeElectronAPIMock(),
    },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  setStorageCompositionForTests(null);
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <BudgetProvider>{children}</BudgetProvider>
);

const makeBillInput = (accountId: string, overrides: Partial<Omit<Bill, 'id'>> = {}): Omit<Bill, 'id'> => ({
  name: 'Electricity',
  amount: 100,
  frequency: 'monthly',
  accountId,
  enabled: true,
  category: 'utilities',
  ...overrides,
});

describe('BudgetContext — undo/redo state restoration', () => {
  it('canUndo/canRedo are false before any mutations', () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('canUndo becomes true after a tracked mutation', () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => result.current.createNewBudget(2026));

    act(() => {
      const accountId = result.current.budgetData!.accounts[0].id;
      result.current.addBill(makeBillInput(accountId));
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('undo removes an added bill and redo restores it', () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => result.current.createNewBudget(2026));

    act(() => {
      const accountId = result.current.budgetData!.accounts[0].id;
      result.current.addBill(makeBillInput(accountId));
    });

    expect(result.current.budgetData?.bills).toHaveLength(1);
    expect(result.current.canUndo).toBe(true);

    // Undo the addBill
    act(() => result.current.undo());

    expect(result.current.budgetData?.bills).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);

    // Redo the addBill
    act(() => result.current.redo());

    expect(result.current.budgetData?.bills).toHaveLength(1);
    expect(result.current.budgetData?.bills[0].name).toBe('Electricity');
    expect(result.current.canRedo).toBe(false);
  });

  it('undo restores prior bill name after an update', () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => result.current.createNewBudget(2026));

    act(() => {
      const accountId = result.current.budgetData!.accounts[0].id;
      result.current.addBill(makeBillInput(accountId, { name: 'Internet', amount: 60 }));
    });

    const billId = result.current.budgetData!.bills[0].id;

    act(() => {
      result.current.updateBill(billId, { name: 'Fiber Internet', amount: 80 });
    });

    expect(result.current.budgetData?.bills[0].name).toBe('Fiber Internet');

    act(() => result.current.undo());

    expect(result.current.budgetData?.bills[0].name).toBe('Internet');
    expect(result.current.budgetData?.bills[0].amount).toBe(60);
  });

  it('new mutation after undo clears redo stack', () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => result.current.createNewBudget(2026));

    act(() => {
      const accountId = result.current.budgetData!.accounts[0].id;
      result.current.addBill(makeBillInput(accountId, { name: 'Water', amount: 40 }));
    });

    act(() => result.current.undo());
    expect(result.current.canRedo).toBe(true);

    // New mutation wipes redo stack
    act(() => {
      const accountId = result.current.budgetData!.accounts[0].id;
      result.current.addBill(makeBillInput(accountId, { name: 'Gas', amount: 70 }));
    });

    expect(result.current.canRedo).toBe(false);
  });

  it('history is cleared on createNewBudget (no undo across plan boundaries)', () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => result.current.createNewBudget(2026));
    act(() => {
      const accountId = result.current.budgetData!.accounts[0].id;
      result.current.addBill(makeBillInput(accountId, { name: 'Cable', amount: 50 }));
    });

    expect(result.current.canUndo).toBe(true);

    // Creating a new budget should reset history
    act(() => result.current.createNewBudget(2027));

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});

describe('BudgetContext — batch operations', () => {
  it('beginBatch/commitBatch coalesces multiple mutations into one undo step', () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => result.current.createNewBudget(2026));

    act(() => {
      result.current.beginBatch();
      const accountId = result.current.budgetData!.accounts[0].id;
      result.current.addBill(makeBillInput(accountId, { name: 'Bill A', amount: 10 }));
      result.current.addBill(makeBillInput(accountId, { name: 'Bill B', amount: 20 }));
      result.current.commitBatch('Added two bills');
    });

    expect(result.current.budgetData?.bills).toHaveLength(2);

    // Single undo step undoes both bills
    act(() => result.current.undo());

    expect(result.current.budgetData?.bills).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);
  });

  it('discardBatch cancels batch without pushing to undo stack', () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => result.current.createNewBudget(2026));

    act(() => {
      result.current.beginBatch();
      const accountId = result.current.budgetData!.accounts[0].id;
      result.current.addBill(makeBillInput(accountId, { name: 'Temporary', amount: 5 }));
      result.current.discardBatch();
    });

    // The mutation still applied to budgetData (discardBatch only affects history)
    // but the undo stack should be empty
    expect(result.current.canUndo).toBe(false);
  });
});

describe('BudgetContext — audit history', () => {
  it('records object-level audit entries for tracked mutations', () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => result.current.createNewBudget(2026));

    act(() => {
      const accountId = result.current.budgetData!.accounts[0].id;
      result.current.addBill(makeBillInput(accountId, { name: 'Phone', amount: 90 }));
    });

    const audit = result.current.budgetData?.metadata?.auditHistory || [];
    expect(audit.length).toBeGreaterThan(0);

    const billCreateEntry = audit.find((entry) => entry.entityType === 'bill' && entry.changeType === 'create');
    expect(billCreateEntry).toBeTruthy();
    expect(billCreateEntry?.sourceAction).toBe('Add bill');
    expect(billCreateEntry?.timestamp).toBeTruthy();
    expect(billCreateEntry?.id).toBeTruthy();
  });

  it('does not record audit entries for explicitly non-tracked updates', () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => result.current.createNewBudget(2026));

    const startingCount = result.current.budgetData?.metadata?.auditHistory?.length || 0;

    act(() => {
      result.current.updateBudgetData(
        { name: 'Renamed without tracking' },
        { trackHistory: false, trackAudit: false, description: 'system update' },
      );
    });

    const endingCount = result.current.budgetData?.metadata?.auditHistory?.length || 0;
    expect(endingCount).toBe(startingCount);
  });
});

describe('BudgetContext — storage composition wiring', () => {
  it('saveBudget uses injected lifecycle and plan-file adapters', async () => {
    const composition = {
      keychain: {
        saveKey: vi.fn(async () => undefined),
        getKey: vi.fn(async () => null),
        deleteKey: vi.fn(async () => undefined),
        keyExists: vi.fn(async () => false),
        getOrCreateKey: vi.fn(async () => 'generated-key'),
      },
      planFiles: {
        loadBudget: vi.fn(async () => ({ success: true, data: '{}' })),
        openFileDialog: vi.fn(async () => '/tmp/opened.budget'),
        saveFileDialog: vi.fn(async () => '/tmp/saved-plan.budget'),
        saveBudget: vi.fn(async () => ({ success: true })),
        fileExists: vi.fn(async () => true),
        selectDirectory: vi.fn(async () => '/tmp'),
      },
      lifecycle: {
        getWindowBounds: vi.fn(async () => ({ width: 1400, height: 900, x: 10, y: 20 })),
        budgetLoaded: vi.fn(async () => undefined),
      },
    };

    setStorageCompositionForTests(composition);
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => result.current.createNewBudget(2026));

    let saveResult = false;
    await act(async () => {
      saveResult = await result.current.saveBudget('overview');
    });

    expect(saveResult).toBe(true);
    expect(composition.lifecycle.getWindowBounds).toHaveBeenCalledTimes(1);
    expect(composition.planFiles.saveFileDialog).toHaveBeenCalledTimes(1);
    expect(composition.planFiles.saveBudget).toHaveBeenCalledTimes(1);
    expect(result.current.budgetData?.settings.filePath).toBe('/tmp/saved-plan.budget');
  });

  it('loadBudget uses injected adapters and notifies lifecycle with restored window size', async () => {
    const loadedBudget = FileStorageService.createEmptyBudget(2026);
    loadedBudget.settings.filePath = '/tmp/loaded-plan.budget';
    loadedBudget.settings.windowSize = { width: 1111, height: 777, x: 42, y: 11 };

    const composition = {
      keychain: {
        saveKey: vi.fn(async () => undefined),
        getKey: vi.fn(async () => null),
        deleteKey: vi.fn(async () => undefined),
        keyExists: vi.fn(async () => false),
        getOrCreateKey: vi.fn(async () => 'generated-key'),
      },
      planFiles: {
        loadBudget: vi.fn(async () => ({ success: true, data: JSON.stringify(loadedBudget) })),
        openFileDialog: vi.fn(async () => '/tmp/loaded-plan.budget'),
        saveFileDialog: vi.fn(async () => '/tmp/save.budget'),
        saveBudget: vi.fn(async () => ({ success: true })),
        fileExists: vi.fn(async () => true),
        selectDirectory: vi.fn(async () => '/tmp'),
      },
      lifecycle: {
        getWindowBounds: vi.fn(async () => ({ width: 1400, height: 900, x: 10, y: 20 })),
        budgetLoaded: vi.fn(async () => undefined),
      },
    };

    setStorageCompositionForTests(composition);
    const { result } = renderHook(() => useBudget(), { wrapper });

    await act(async () => {
      await result.current.loadBudget();
    });

    expect(composition.planFiles.openFileDialog).toHaveBeenCalledTimes(1);
    expect(composition.planFiles.loadBudget).toHaveBeenCalledWith('/tmp/loaded-plan.budget');
    expect(composition.lifecycle.budgetLoaded).toHaveBeenCalledWith({ width: 1111, height: 777, x: 42, y: 11 });
    expect(result.current.budgetData?.settings.filePath).toBe('/tmp/loaded-plan.budget');
  });
});
