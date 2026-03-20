import { describe, expect, it, beforeEach } from 'vitest';
import {
  registerSearchModule,
  unregisterSearchModule,
  getAllSearchResults,
  getActionHandler,
  getRegisteredModules,
  clearRegistry,
  type SearchModule,
} from './searchRegistry';
import type { BudgetData } from '../types/budget';

// ─── Mock modules for testing ────────────────────────────────────────────

const mockBudget: BudgetData = {
  id: 'test-plan',
  name: 'Test Plan',
  year: 2026,
  paySettings: {
    payType: 'salary',
    annualSalary: 75000,
    payFrequency: 'bi-weekly',
  },
  preTaxDeductions: [],
  benefits: [],
  bills: [],
  retirement: [],
  taxSettings: { taxLines: [], additionalWithholding: 0 },
  savingsContributions: [],
  loans: [],
  accounts: [],
  settings: { currency: 'USD', locale: 'en-US' } as BudgetData['settings'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const mockModuleA: SearchModule = {
  id: 'module-a',
  buildResults: () => [
    {
      id: 'result-a1',
      title: 'Result A1',
      category: 'Module A',
      categoryIcon: '📦',
      action: { type: 'navigate-tab', tabId: 'metrics' },
    },
  ],
  actionHandlers: {
    'action-type-a': () => {
      // Mock handler
    },
  },
};

const mockModuleB: SearchModule = {
  id: 'module-b',
  buildResults: () => [
    {
      id: 'result-b1',
      title: 'Result B1',
      category: 'Module B',
      categoryIcon: '🎯',
      action: { type: 'navigate-tab', tabId: 'breakdown' },
    },
    {
      id: 'result-b2',
      title: 'Result B2',
      category: 'Module B',
      categoryIcon: '🎯',
      action: { type: 'navigate-tab', tabId: 'bills' },
    },
  ],
  actionHandlers: {
    'action-type-b': () => {
      // Mock handler
    },
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────

describe('searchRegistry', () => {
  beforeEach(() => {
    // Clear registry before each test
    clearRegistry();
  });

  describe('registerSearchModule', () => {
    it('registers a module', () => {
      registerSearchModule(mockModuleA);
      const modules = getRegisteredModules();

      expect(modules).toHaveLength(1);
      expect(modules[0].id).toBe('module-a');
    });

    it('allows registering multiple modules', () => {
      registerSearchModule(mockModuleA);
      registerSearchModule(mockModuleB);

      const modules = getRegisteredModules();
      expect(modules).toHaveLength(2);
    });

    it('warns when re-registering same module id', () => {
      registerSearchModule(mockModuleA);
      registerSearchModule(mockModuleA);

      const modules = getRegisteredModules();
      expect(modules).toHaveLength(1);
    });
  });

  describe('unregisterSearchModule', () => {
    it('removes a registered module', () => {
      registerSearchModule(mockModuleA);
      registerSearchModule(mockModuleB);

      unregisterSearchModule('module-a');
      const modules = getRegisteredModules();

      expect(modules).toHaveLength(1);
      expect(modules[0].id).toBe('module-b');
    });

    it('silently ignores unregistering non-existent module', () => {
      registerSearchModule(mockModuleA);
      unregisterSearchModule('non-existent');

      const modules = getRegisteredModules();
      expect(modules).toHaveLength(1);
    });
  });

  describe('getAllSearchResults', () => {
    it('returns empty array when no modules registered', () => {
      const results = getAllSearchResults(mockBudget);
      expect(results).toEqual([]);
    });

    it('returns results from all registered modules', () => {
      registerSearchModule(mockModuleA);
      registerSearchModule(mockModuleB);

      const results = getAllSearchResults(mockBudget);

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.id)).toContain('result-a1');
      expect(results.map((r) => r.id)).toContain('result-b1');
      expect(results.map((r) => r.id)).toContain('result-b2');
    });

    it('passes budgetData to all modules', () => {
      let receivedBudget = null;

      const moduleWithCapture: SearchModule = {
        id: 'capture-module',
        buildResults: (budget) => {
          receivedBudget = budget;
          return [];
        },
        actionHandlers: {},
      };

      registerSearchModule(moduleWithCapture);
      getAllSearchResults(mockBudget);

      expect(receivedBudget).toEqual(mockBudget);
    });
  });

  describe('getActionHandler', () => {
    it('returns handler when found', () => {
      const handlerImpl = () => {
        // Mock implementation
      };
      const module: SearchModule = {
        id: 'test-module',
        buildResults: () => [],
        actionHandlers: {
          'test-action': handlerImpl,
        },
      };

      registerSearchModule(module);
      const handler = getActionHandler('test-action');

      expect(handler).toBe(handlerImpl);
    });

    it('returns undefined when handler not found', () => {
      registerSearchModule(mockModuleA);
      const handler = getActionHandler('non-existent-action');

      expect(handler).toBeUndefined();
    });

    it('returns handler from first module that has it', () => {
      const handlerA = () => {
        // Handler A
      };
      const handlerB = () => {
        // Handler B
      };

      const moduleA: SearchModule = {
        id: 'module-a',
        buildResults: () => [],
        actionHandlers: { 'shared-action': handlerA },
      };

      const moduleB: SearchModule = {
        id: 'module-b',
        buildResults: () => [],
        actionHandlers: { 'shared-action': handlerB },
      };

      registerSearchModule(moduleA);
      registerSearchModule(moduleB);
      const handler = getActionHandler('shared-action');

      // Should return handler from first registered module
      expect(handler).toBe(handlerA);
    });
  });

  describe('getRegisteredModules', () => {
    it('returns all registered modules', () => {
      registerSearchModule(mockModuleA);
      registerSearchModule(mockModuleB);

      const modules = getRegisteredModules();

      expect(modules).toHaveLength(2);
      expect(modules.map((m) => m.id)).toEqual(['module-a', 'module-b']);
    });

    it('returns empty array when nothing registered', () => {
      const modules = getRegisteredModules();
      expect(modules).toEqual([]);
    });
  });

  describe('clearRegistry', () => {
    it('removes all registered modules', () => {
      registerSearchModule(mockModuleA);
      registerSearchModule(mockModuleB);

      clearRegistry();
      const modules = getRegisteredModules();

      expect(modules).toEqual([]);
    });

    it('allows re-registering after clearing', () => {
      registerSearchModule(mockModuleA);
      clearRegistry();
      registerSearchModule(mockModuleB);

      const modules = getRegisteredModules();
      expect(modules).toHaveLength(1);
      expect(modules[0].id).toBe('module-b');
    });
  });
});
