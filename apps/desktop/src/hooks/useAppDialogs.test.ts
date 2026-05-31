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

import { useAppDialogs } from './useAppDialogs';

describe('useAppDialogs', () => {
  const useTestHook = () => {
    resetHookCursor();
    return useAppDialogs();
  };

  beforeEach(() => {
    resetHookState();
    vi.clearAllMocks();
  });

  it('opens and closes an error dialog while calling the close callback', () => {
    const onClose = vi.fn();

    let hook = useTestHook();
    hook.openErrorDialog({
      title: 'Open Failed',
      message: 'Something went wrong.',
      onClose,
    });
    hook = useTestHook();

    expect(hook.errorDialog).toMatchObject({
      title: 'Open Failed',
      message: 'Something went wrong.',
      actionLabel: 'OK',
    });

    hook.closeErrorDialog();
    hook = useTestHook();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(hook.errorDialog).toBeNull();
  });

  it('opens a confirm dialog and runs the confirm callback when accepted', async () => {
    const onConfirm = vi.fn();

    let hook = useTestHook();
    hook.openConfirmDialog({
      title: 'Hide Tab',
      message: 'Are you sure?',
      onConfirm,
      confirmVariant: 'danger',
    });
    hook = useTestHook();

    expect(hook.confirmDialog).toMatchObject({
      title: 'Hide Tab',
      message: 'Are you sure?',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      confirmVariant: 'danger',
    });

    await hook.confirmCurrentDialog();
    hook = useTestHook();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(hook.confirmDialog).toBeNull();
  });

  it('closes a confirm dialog and runs the cancel callback when dismissed', () => {
    const onCancel = vi.fn();

    let hook = useTestHook();
    hook.openConfirmDialog({
      title: 'Hide Tab',
      message: 'Are you sure?',
      onCancel,
    });
    hook = useTestHook();

    hook.closeConfirmDialog();
    hook = useTestHook();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(hook.confirmDialog).toBeNull();
  });
});