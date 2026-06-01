import type { ApiStorageBackend } from '../config.js';

export type StorageHealth = {
    backend: ApiStorageBackend;
    ready: boolean;
};

export type StorageBoundary = {
    getHealth(): StorageHealth;
};

class MemoryStorageBoundary implements StorageBoundary {
    getHealth(): StorageHealth {
        return {
            backend: 'memory',
            ready: true,
        };
    }
}

export function createStorageBoundary(_backend: ApiStorageBackend): StorageBoundary {
    // Placeholder storage boundary for future sync/versioning workflows.
    return new MemoryStorageBoundary();
}
