/**
 * Augments vitest's `Matchers` interface to include the `toHaveNoViolations`
 * matcher provided by jest-axe.
 *
 * This file is referenced via tsconfig.app.json (the `src` include) so the
 * declaration is available in all test files without an explicit import.
 */
import type { AxeResults } from 'axe-core';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Matchers<R = any> {
    /** Asserts that the axe accessibility-audit result has zero violations. */
    toHaveNoViolations(): R;
  }
}

declare module 'jest-axe' {
  export const axe: (element: Element | string, options?: Record<string, unknown>) => Promise<AxeResults>;
  export const toHaveNoViolations: Record<string, unknown>;
}
