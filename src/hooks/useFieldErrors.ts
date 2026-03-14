import { useCallback, useState } from 'react';

type FieldErrorState = Record<string, string | undefined>;

export function useFieldErrors<T extends FieldErrorState>() {
  const [errors, setErrors] = useState<T>({} as T);

  const clearErrors = useCallback(() => {
    setErrors({} as T);
  }, []);

  const clearFieldError = useCallback((field: keyof T) => {
    setErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      return {
        ...currentErrors,
        [field]: undefined,
      };
    });
  }, []);

  return {
    errors,
    setErrors,
    clearErrors,
    clearFieldError,
  };
}