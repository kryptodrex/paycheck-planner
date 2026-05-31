import {
  type AppLifecycleRepository,
  type PlanFileSystemRepository,
  type SecureKeyRepository,
} from '@paycheck-planner/storage';
import {
  ElectronAppLifecycleRepository,
  ElectronKeychainRepository,
  ElectronPlanFileRepository,
} from '@paycheck-planner/platform-electron';

const SERVICE_NAME = 'Paycheck Planner';
const ACCOUNT_NAME = 'encryption-key';

export interface StorageComposition {
  keychain: SecureKeyRepository;
  planFiles: PlanFileSystemRepository;
  lifecycle: AppLifecycleRepository;
}

let testComposition: StorageComposition | null = null;

function createDefaultStorageComposition(): StorageComposition {
  if (!window.electronAPI) {
    throw new Error('Electron API not available');
  }

  return {
    keychain: new ElectronKeychainRepository({
      serviceName: SERVICE_NAME,
      accountPrefix: ACCOUNT_NAME,
      bridge: window.electronAPI,
    }),
    planFiles: new ElectronPlanFileRepository(window.electronAPI),
    lifecycle: new ElectronAppLifecycleRepository(window.electronAPI),
  };
}

export function resolveStorageComposition(): StorageComposition {
  return testComposition ?? createDefaultStorageComposition();
}

export function setStorageCompositionForTests(composition: StorageComposition | null): void {
  testComposition = composition;
}
