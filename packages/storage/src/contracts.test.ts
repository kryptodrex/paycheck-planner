import { describe, expect, it } from 'vitest';
import { StorageError, toStorageError } from './errors';

describe('storage errors', () => {
  it('constructs typed storage errors', () => {
    const error = new StorageError('NOT_FOUND', 'Plan file was not found');

    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Plan file was not found');
    expect(error.name).toBe('StorageError');
  });

  it('normalizes unknown errors into StorageError', () => {
    const normalized = toStorageError(new Error('boom'), 'fallback');

    expect(normalized).toBeInstanceOf(StorageError);
    expect(normalized.code).toBe('UNKNOWN');
    expect(normalized.message).toBe('boom');
  });
});
