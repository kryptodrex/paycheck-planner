import { useCallback, useState } from 'react';
import { FileStorageService, type RelinkMovedBudgetFileResult } from '../services/fileStorage';
import { getBaseFileName } from '../utils/filePath';

type RelinkSuccessResult = Extract<RelinkMovedBudgetFileResult, { status: 'success' }>;

export interface MissingFileState {
  filePath: string;
  fileName: string;
}

interface UseFileRelinkFlowOptions {
  getExpectedPlanId?: (missingFilePath: string) => string | undefined;
  onRelinkSuccess: (result: RelinkSuccessResult, missingFile: MissingFileState) => Promise<void> | void;
  fallbackErrorMessage: string;
}

export function useFileRelinkFlow({
  getExpectedPlanId,
  onRelinkSuccess,
  fallbackErrorMessage,
}: UseFileRelinkFlowOptions) {
  const [missingFile, setMissingFile] = useState<MissingFileState | null>(null);
  const [relinkMismatchMessage, setRelinkMismatchMessage] = useState<string | null>(null);
  const [relinkLoading, setRelinkLoading] = useState(false);

  const promptFileRelink = useCallback((filePath: string, fileName = getBaseFileName(filePath) || filePath) => {
    setMissingFile({ filePath, fileName });
    setRelinkMismatchMessage(null);
  }, []);

  const clearFileRelinkPrompt = useCallback(() => {
    setMissingFile(null);
    setRelinkMismatchMessage(null);
  }, []);

  const locateRelinkedFile = useCallback(async () => {
    if (!missingFile || relinkLoading) return;

    setRelinkLoading(true);
    try {
      const result = await FileStorageService.relinkMovedBudgetFile(
        missingFile.filePath,
        getExpectedPlanId?.(missingFile.filePath),
      );

      if (result.status === 'cancelled') {
        return;
      }

      if (result.status === 'mismatch' || result.status === 'invalid') {
        setRelinkMismatchMessage(result.message);
        return;
      }

      clearFileRelinkPrompt();
      await onRelinkSuccess(result, missingFile);
    } catch (error) {
      const message = (error as Error).message || fallbackErrorMessage;
      setRelinkMismatchMessage(message);
    } finally {
      setRelinkLoading(false);
    }
  }, [clearFileRelinkPrompt, fallbackErrorMessage, getExpectedPlanId, missingFile, onRelinkSuccess, relinkLoading]);

  return {
    missingFile,
    relinkMismatchMessage,
    relinkLoading,
    promptFileRelink,
    clearFileRelinkPrompt,
    locateRelinkedFile,
  };
}