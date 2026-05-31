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

import { useModalEntityEditor } from './useModalEntityEditor';

describe('useModalEntityEditor', () => {
  const useTestHook = () => {
    resetHookCursor();
    return useModalEntityEditor<{ id: string; name: string }>();
  };

  beforeEach(() => {
    resetHookState();
    vi.clearAllMocks();
  });

  it('opens a create flow with no editing entity selected', () => {
    let hook = useTestHook();

    hook.openForCreate();
    hook = useTestHook();

    expect(hook.isOpen).toBe(true);
    expect(hook.isEditing).toBe(false);
    expect(hook.editingEntity).toBeNull();
  });

  it('opens an edit flow with the selected entity', () => {
    const entity = { id: 'loan-1', name: 'Car Loan' };

    let hook = useTestHook();
    hook.openForEdit(entity);
    hook = useTestHook();

    expect(hook.isOpen).toBe(true);
    expect(hook.isEditing).toBe(true);
    expect(hook.editingEntity).toEqual(entity);
  });

  it('closes the editor and clears the editing entity', () => {
    const entity = { id: 'bill-1', name: 'Electric' };

    let hook = useTestHook();
    hook.openForEdit(entity);
    hook = useTestHook();

    hook.closeEditor();
    hook = useTestHook();

    expect(hook.isOpen).toBe(false);
    expect(hook.isEditing).toBe(false);
    expect(hook.editingEntity).toBeNull();
  });
});