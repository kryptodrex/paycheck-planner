import type { AppLifecycleRepository } from '@paycheck-planner/storage';

export interface ElectronAppLifecycleBridge {
  getWindowBounds(): Promise<{ width: number; height: number; x: number; y: number }>;
  budgetLoaded(windowSize?: { width: number; height: number; x: number; y: number }): Promise<void>;
}

export class ElectronAppLifecycleRepository implements AppLifecycleRepository {
  private readonly bridge: ElectronAppLifecycleBridge;

  constructor(bridge: ElectronAppLifecycleBridge) {
    this.bridge = bridge;
  }

  getWindowBounds(): Promise<{ width: number; height: number; x: number; y: number }> {
    return this.bridge.getWindowBounds();
  }

  budgetLoaded(windowSize?: { width: number; height: number; x: number; y: number }): Promise<void> {
    return this.bridge.budgetLoaded(windowSize);
  }
}
