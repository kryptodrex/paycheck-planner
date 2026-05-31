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

import { useFieldErrors } from './useFieldErrors';

type ExampleErrors = {
  name?: string;
  amount?: string;
};

describe('useFieldErrors', () => {
  const useTestHook = () => {
    resetHookCursor();
    return useFieldErrors<ExampleErrors>();
  };

  beforeEach(() => {
    resetHookState();
    vi.clearAllMocks();
  });

  it('stores validation errors', () => {
    let hook = useTestHook();
    hook.setErrors({ name: 'Required.', amount: 'Invalid.' });
    hook = useTestHook();

    expect(hook.errors).toEqual({ name: 'Required.', amount: 'Invalid.' });
  });

  it('clears an individual field error without touching other fields', () => {
    let hook = useTestHook();
    hook.setErrors({ name: 'Required.', amount: 'Invalid.' });
    hook = useTestHook();

    hook.clearFieldError('name');
    hook = useTestHook();

    expect(hook.errors).toEqual({ name: undefined, amount: 'Invalid.' });
  });

  it('clears all field errors', () => {
    let hook = useTestHook();
    hook.setErrors({ name: 'Required.' });
    hook = useTestHook();

    hook.clearErrors();
    hook = useTestHook();

    expect(hook.errors).toEqual({});
  });
});