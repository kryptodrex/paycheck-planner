import { describe, expect, it, vi } from 'vitest';
import { ElectronPlanFileRepository, type ElectronPlanFileBridge } from './electronPlanFileRepository';

function createBridge(overrides?: Partial<ElectronPlanFileBridge>): ElectronPlanFileBridge {
  return {
    loadBudget: vi.fn(async () => ({ success: true, data: '{}' })),
    openFileDialog: vi.fn(async () => '/tmp/plan.budget'),
    saveFileDialog: vi.fn(async () => '/tmp/plan-save.budget'),
    saveBudget: vi.fn(async () => ({ success: true })),
    fileExists: vi.fn(async () => true),
    selectDirectory: vi.fn(async () => '/tmp'),
    ...overrides,
  };
}

describe('ElectronPlanFileRepository', () => {
  it('delegates file dialog and read/write calls to bridge', async () => {
    const bridge = createBridge();
    const repo = new ElectronPlanFileRepository(bridge);

    const opened = await repo.openFileDialog();
    const loaded = await repo.loadBudget('/tmp/plan.budget');
    const saved = await repo.saveBudget('/tmp/plan.budget', '{}');

    expect(opened).toBe('/tmp/plan.budget');
    expect(loaded.success).toBe(true);
    expect(saved.success).toBe(true);
    expect(bridge.openFileDialog).toHaveBeenCalledTimes(1);
    expect(bridge.loadBudget).toHaveBeenCalledWith('/tmp/plan.budget');
    expect(bridge.saveBudget).toHaveBeenCalledWith('/tmp/plan.budget', '{}');
  });
});
