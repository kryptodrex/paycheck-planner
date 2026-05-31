import { describe, expect, it } from 'vitest';

const FORBIDDEN_LEGACY_IMPORTS = [
  '../utils/currency',
  '../utils/frequency',
  '../utils/historyEngine',
  '../utils/money',
  '../utils/payPeriod',
  '../utils/taxLines',
];

function walkDir(): string[] {
  return Object.keys(import.meta.glob('./**/*.ts', { eager: true, as: 'raw' }))
    .filter((filePath) => !filePath.endsWith('.test.ts'))
    .map((filePath) => filePath.replace(/^\.\//, ''));
}

describe('desktop architecture boundaries', () => {
  it('does not import legacy moved utility paths', () => {
    const violations: string[] = [];

    for (const filePath of walkDir()) {
      const source = import.meta.glob('./**/*.ts', { eager: true, as: 'raw' })[`./${filePath}`] as string;
      for (const importPath of FORBIDDEN_LEGACY_IMPORTS) {
        if (source.includes(importPath)) {
          violations.push(`${filePath} -> ${importPath}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
