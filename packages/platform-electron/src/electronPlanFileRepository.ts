import type { PlanFileSystemRepository } from '@paycheck-planner/storage';

export interface ElectronPlanFileBridge {
  loadBudget(filePath: string): Promise<{ success: boolean; data?: string; error?: string }>;
  openFileDialog(): Promise<string | null>;
  saveFileDialog(budgetName?: string): Promise<string | null>;
  saveBudget(filePath: string, data: string): Promise<{ success: boolean; error?: string }>;
  fileExists?(filePath: string): Promise<boolean>;
  selectDirectory(): Promise<string | null>;
}

export class ElectronPlanFileRepository implements PlanFileSystemRepository {
  private readonly bridge: ElectronPlanFileBridge;

  constructor(bridge: ElectronPlanFileBridge) {
    this.bridge = bridge;
  }

  loadBudget(filePath: string): Promise<{ success: boolean; data?: string; error?: string }> {
    return this.bridge.loadBudget(filePath);
  }

  openFileDialog(): Promise<string | null> {
    return this.bridge.openFileDialog();
  }

  saveFileDialog(budgetName?: string): Promise<string | null> {
    return this.bridge.saveFileDialog(budgetName);
  }

  saveBudget(filePath: string, data: string): Promise<{ success: boolean; error?: string }> {
    return this.bridge.saveBudget(filePath, data);
  }

  fileExists(filePath: string): Promise<boolean> {
    if (!this.bridge.fileExists) {
      return Promise.resolve(true);
    }

    return this.bridge.fileExists(filePath);
  }

  selectDirectory(): Promise<string | null> {
    return this.bridge.selectDirectory();
  }
}
