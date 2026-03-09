import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react', () => ({
  useEffect: (effect: () => void | (() => void)) => {
    effect();
  },
}));

import { useGlobalKeyboardShortcuts } from './useGlobalKeyboardShortcuts';

type KeyboardListener = (event: KeyboardEvent) => void;

const listeners = new Map<string, KeyboardListener>();

describe('useGlobalKeyboardShortcuts', () => {
  beforeEach(() => {
    listeners.clear();

    Object.defineProperty(globalThis, 'window', {
      value: {
        addEventListener: vi.fn((event: string, handler: KeyboardListener) => {
          listeners.set(`window:${event}`, handler);
        }),
        removeEventListener: vi.fn(),
      },
      configurable: true,
    });

    Object.defineProperty(globalThis, 'document', {
      value: {
        addEventListener: vi.fn((event: string, handler: KeyboardListener) => {
          listeners.set(`document:${event}`, handler);
        }),
        removeEventListener: vi.fn(),
      },
      configurable: true,
    });

    Object.defineProperty(globalThis, 'navigator', {
      value: { platform: 'MacIntel' },
      configurable: true,
    });
  });

  it('registers keydown handlers on window and document', () => {
    useGlobalKeyboardShortcuts([
      { key: 's', mac: true, callback: vi.fn() },
    ]);

    expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true);
  });

  it('fires callback for matching platform shortcut and prevents default behavior', () => {
    const callback = vi.fn();
    useGlobalKeyboardShortcuts([
      { key: 's', mac: true, callback },
    ]);

    const handler = listeners.get('window:keydown');
    expect(handler).toBeDefined();

    const event = {
      key: 's',
      metaKey: true,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent;

    handler?.(event);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
  });

  it('does not fire callback when wrong modifier is used', () => {
    const callback = vi.fn();
    useGlobalKeyboardShortcuts([
      { key: 's', mac: true, callback },
    ]);

    const handler = listeners.get('window:keydown');
    expect(handler).toBeDefined();

    const event = {
      key: 's',
      metaKey: false,
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent;

    handler?.(event);

    expect(callback).not.toHaveBeenCalled();
  });
});
