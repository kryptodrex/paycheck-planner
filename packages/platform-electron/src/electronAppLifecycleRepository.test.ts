import { describe, expect, it, vi } from 'vitest';
import {
  ElectronAppLifecycleRepository,
  type ElectronAppLifecycleBridge,
} from './electronAppLifecycleRepository';

function createBridge(overrides?: Partial<ElectronAppLifecycleBridge>): ElectronAppLifecycleBridge {
  return {
    getWindowBounds: vi.fn(async () => ({ width: 1200, height: 800, x: 0, y: 0 })),
    budgetLoaded: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('ElectronAppLifecycleRepository', () => {
  it('delegates lifecycle calls to bridge', async () => {
    const bridge = createBridge();
    const repo = new ElectronAppLifecycleRepository(bridge);

    const bounds = await repo.getWindowBounds();
    await repo.budgetLoaded(bounds);

    expect(bounds.width).toBe(1200);
    expect(bridge.getWindowBounds).toHaveBeenCalledTimes(1);
    expect(bridge.budgetLoaded).toHaveBeenCalledWith(bounds);
  });
});
