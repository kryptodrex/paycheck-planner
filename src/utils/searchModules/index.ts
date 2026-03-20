/**
 * Search Modules Index
 *
 * Imports and registers all search modules.
 * Call initializeSearchModules() at app startup to register all modules.
 */

import { registerSearchModule } from '../searchRegistry';
import { billsSearchModule } from './billsSearchModule';
import { keyMetricsSearchModule } from './keyMetricsSearchModule';
import { loansSearchModule } from './loansSearchModule';
import { paySettingsSearchModule } from './paySettingsSearchModule';
import { payBreakdownSearchModule } from './payBreakdownSearchModule';
import { quickActionsSearchModule } from './quickActionsSearchModule';
import { savingsSearchModule } from './savingsSearchModule';
import { settingsSearchModule } from './settingsSearchModule';
import { taxesSearchModule } from './taxesSearchModule';

/**
 * Register all available search modules with the registry.
 * Call this once at app initialization (e.g., in main.tsx or App.tsx).
 */
export function initializeSearchModules(): void {
  registerSearchModule(billsSearchModule);
  registerSearchModule(keyMetricsSearchModule);
  registerSearchModule(loansSearchModule);
  registerSearchModule(payBreakdownSearchModule);
  registerSearchModule(paySettingsSearchModule);
  registerSearchModule(quickActionsSearchModule);
  registerSearchModule(savingsSearchModule);
  registerSearchModule(settingsSearchModule);
  registerSearchModule(taxesSearchModule);
  // Future modules can be registered here
}
