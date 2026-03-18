import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- Lightweight React mock ------------------------------------------------
const hookState: unknown[] = [];
let hookCursor = 0;

function resetHookCursor() { hookCursor = 0; }
function resetHookState() { hookState.length = 0; hookCursor = 0; }

type EffectCallback = () => void | (() => void);
let capturedEffect: EffectCallback | null = null;
let capturedCleanup: (() => void) | null = null;

vi.mock('react', () => ({
  useState: <T,>(initialValue: T | (() => T)) => {
    const slot = hookCursor++;
    if (!(slot in hookState)) {
      hookState[slot] = typeof initialValue === 'function'
        ? (initialValue as () => T)()
        : initialValue;
    }
    const setState = (value: T | ((current: T) => T)) => {
      const current = hookState[slot] as T;
      hookState[slot] = typeof value === 'function'
        ? (value as (c: T) => T)(current)
        : value;
    };
    return [hookState[slot] as T, setState] as const;
  },
  useEffect: (effect: EffectCallback) => {
    capturedEffect = effect;
  },
}));
// ---------------------------------------------------------------------------

type ChangeListener = (e: { matches: boolean }) => void;
let mockMediaQuery: {
  matches: boolean;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  _listeners: ChangeListener[];
};

function buildMockWindow(matches: boolean) {
  mockMediaQuery = {
    matches,
    addEventListener: vi.fn((_: string, cb: ChangeListener) => {
      mockMediaQuery._listeners.push(cb);
    }),
    removeEventListener: vi.fn(),
    _listeners: [],
  };

  Object.defineProperty(globalThis, 'window', {
    value: {
      matchMedia: vi.fn(() => mockMediaQuery),
    },
    configurable: true,
    writable: true,
  });
}

import { useIsMobile } from './useIsMobile';

describe('useIsMobile', () => {
  beforeEach(() => {
    resetHookState();
    capturedEffect = null;
    capturedCleanup = null;
    vi.clearAllMocks();
  });

  it('initialises to false when media query does not match', () => {
    buildMockWindow(false);
    resetHookCursor();
    const isMobile = useIsMobile();
    expect(isMobile).toBe(false);
  });

  it('initialises to true when media query matches', () => {
    buildMockWindow(true);
    resetHookCursor();
    const isMobile = useIsMobile();
    expect(isMobile).toBe(true);
  });

  it('registers a change listener on the media query', () => {
    buildMockWindow(false);
    resetHookCursor();
    useIsMobile();

    capturedCleanup = (capturedEffect?.() as (() => void)) ?? null;
    expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('updates state to true when media query fires with matches=true', () => {
    buildMockWindow(false);
    resetHookCursor();
    useIsMobile();
    capturedCleanup = (capturedEffect?.() as (() => void)) ?? null;

    mockMediaQuery._listeners.forEach((cb) => cb({ matches: true }));

    resetHookCursor();
    const updated = useIsMobile();
    expect(updated).toBe(true);
  });

  it('updates state to false when media query fires with matches=false', () => {
    buildMockWindow(true);
    resetHookCursor();
    useIsMobile();
    capturedCleanup = (capturedEffect?.() as (() => void)) ?? null;

    mockMediaQuery._listeners.forEach((cb) => cb({ matches: false }));

    resetHookCursor();
    const updated = useIsMobile();
    expect(updated).toBe(false);
  });

  it('removes the listener when the cleanup function runs', () => {
    buildMockWindow(false);
    resetHookCursor();
    useIsMobile();
    capturedCleanup = (capturedEffect?.() as (() => void)) ?? null;

    capturedCleanup?.();
    expect(mockMediaQuery.removeEventListener).toHaveBeenCalledOnce();
  });
});

