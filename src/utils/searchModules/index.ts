/**
 * Search Modules Index
 *
 * Imports and registers all search modules.
 * Call initializeSearchModules() at app startup to register all modules.
 */

import { registerSearchModule } from '../searchRegistry';
import { billsSearchModule } from './billsSearchModule';

/**
 * Register all available search modules with the registry.
 * Call this once at app initialization (e.g., in main.tsx or App.tsx).
 */
export function initializeSearchModules(): void {
  registerSearchModule(billsSearchModule);
  // Future modules will be registered here:
  // registerSearchModule(loansSearchModule);
  // registerSearchModule(savingsSearchModule);
  // registerSearchModule(taxesSearchModule);
  // etc.
}
