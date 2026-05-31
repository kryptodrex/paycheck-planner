export type StorageErrorCode =
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'DECRYPTION_FAILED'
  | 'INVALID_FORMAT'
  | 'USER_CANCELLED'
  | 'UNKNOWN';

export class StorageError extends Error {
  readonly code: StorageErrorCode;
  readonly cause?: unknown;

  constructor(code: StorageErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.cause = cause;
  }
}

export function toStorageError(error: unknown, fallbackMessage: string): StorageError {
  if (error instanceof StorageError) {
    return error;
  }

  if (error instanceof Error) {
    return new StorageError('UNKNOWN', error.message || fallbackMessage, error);
  }

  return new StorageError('UNKNOWN', fallbackMessage, error);
}
