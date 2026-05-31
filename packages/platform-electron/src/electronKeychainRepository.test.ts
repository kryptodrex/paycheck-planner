import { describe, expect, it, vi } from 'vitest';
import { ElectronKeychainRepository, type ElectronKeychainBridge } from './electronKeychainRepository';

function createBridge(overrides?: Partial<ElectronKeychainBridge>): ElectronKeychainBridge {
  return {
    saveKeychainKey: vi.fn(async () => ({ success: true })),
    getKeychainKey: vi.fn(async () => ({ success: true })),
    deleteKeychainKey: vi.fn(async () => ({ success: true })),
    ...overrides,
  };
}

describe('ElectronKeychainRepository', () => {
  it('saves and retrieves keys using bridge contracts', async () => {
    const bridge = createBridge({
      getKeychainKey: vi.fn(async () => ({ success: true, key: 'abc123' })),
    });

    const repo = new ElectronKeychainRepository({
      serviceName: 'Paycheck Planner',
      accountPrefix: 'encryption-key',
      bridge,
    });

    await repo.saveKey('plan-1', 'abc123');
    const value = await repo.getKey('plan-1');

    expect(value).toBe('abc123');
    expect(bridge.saveKeychainKey).toHaveBeenCalledWith('Paycheck Planner', 'encryption-key:plan-1', 'abc123');
    expect(bridge.getKeychainKey).toHaveBeenCalledWith('Paycheck Planner', 'encryption-key:plan-1');
  });

  it('creates key when one does not exist', async () => {
    const bridge = createBridge();

    const repo = new ElectronKeychainRepository({
      serviceName: 'Paycheck Planner',
      accountPrefix: 'encryption-key',
      bridge,
      keyFactory: () => 'generated-key',
    });

    const key = await repo.getOrCreateKey('plan-2');

    expect(key).toBe('generated-key');
    expect(bridge.saveKeychainKey).toHaveBeenCalledWith('Paycheck Planner', 'encryption-key:plan-2', 'generated-key');
  });
});
