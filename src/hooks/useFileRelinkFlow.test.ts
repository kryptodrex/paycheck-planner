import { beforeEach, describe, expect, it, vi } from 'vitest';

const hookState: unknown[] = [];
let hookCursor = 0;

function resetHookCursor() {
  hookCursor = 0;
}

function resetHookState() {
  hookState.length = 0;
  hookCursor = 0;
}

vi.mock('react', () => ({
  useState: <T,>(initialValue: T) => {
    const slot = hookCursor++;

    if (!(slot in hookState)) {
      hookState[slot] = initialValue;
    }

    const setState = (value: T | ((current: T) => T)) => {
      const currentValue = hookState[slot] as T;
      hookState[slot] = typeof value === 'function'
        ? (value as (current: T) => T)(currentValue)
        : value;
    };

    return [hookState[slot] as T, setState] as const;
  },
  useCallback: <T extends (...args: never[]) => unknown>(callback: T) => callback,
}));

vi.mock('../services/fileStorage', () => ({
  FileStorageService: {
    relinkMovedBudgetFile: vi.fn(),
  },
}));

import { FileStorageService } from '../services/fileStorage';
import { useFileRelinkFlow } from './useFileRelinkFlow';

describe('useFileRelinkFlow', () => {
  const onRelinkSuccess = vi.fn();
  const getExpectedPlanId = vi.fn(() => 'plan-1');

  const useTestHook = () => {
    resetHookCursor();
    return useFileRelinkFlow({
      getExpectedPlanId,
      onRelinkSuccess,
      fallbackErrorMessage: 'Unable to relink moved file.',
    });
  };

  beforeEach(() => {
    resetHookState();
    vi.clearAllMocks();
  });

  it('stores the missing file prompt and clears any prior mismatch message', () => {
    let hook = useTestHook();

    hook.promptFileRelink('/tmp/missing-plan.budget');
    hook = useTestHook();

    expect(hook.missingFile).toEqual({
      filePath: '/tmp/missing-plan.budget',
      fileName: 'missing-plan.budget',
    });
    expect(hook.relinkMismatchMessage).toBeNull();
  });

  it('surfaces mismatch results without clearing the missing file prompt', async () => {
    vi.mocked(FileStorageService.relinkMovedBudgetFile).mockResolvedValue({
      status: 'mismatch',
      message: 'That file belongs to a different plan.',
    });

    let hook = useTestHook();
    hook.promptFileRelink('/tmp/missing-plan.budget');
    hook = useTestHook();

    await hook.locateRelinkedFile();
    hook = useTestHook();

    expect(FileStorageService.relinkMovedBudgetFile).toHaveBeenCalledWith('/tmp/missing-plan.budget', 'plan-1');
    expect(hook.missingFile).toEqual({
      filePath: '/tmp/missing-plan.budget',
      fileName: 'missing-plan.budget',
    });
    expect(hook.relinkMismatchMessage).toBe('That file belongs to a different plan.');
    expect(onRelinkSuccess).not.toHaveBeenCalled();
  });

  it('clears the prompt and calls the success handler when relinking succeeds', async () => {
    vi.mocked(FileStorageService.relinkMovedBudgetFile).mockResolvedValue({
      status: 'success',
      filePath: '/tmp/moved-plan.budget',
      planName: 'moved-plan',
    });

    let hook = useTestHook();
    hook.promptFileRelink('/tmp/missing-plan.budget', 'Missing Plan');
    hook = useTestHook();

    await hook.locateRelinkedFile();
    hook = useTestHook();

    expect(onRelinkSuccess).toHaveBeenCalledWith(
      {
        status: 'success',
        filePath: '/tmp/moved-plan.budget',
        planName: 'moved-plan',
      },
      {
        filePath: '/tmp/missing-plan.budget',
        fileName: 'Missing Plan',
      },
    );
    expect(hook.missingFile).toBeNull();
    expect(hook.relinkMismatchMessage).toBeNull();
    expect(hook.relinkLoading).toBe(false);
  });
});