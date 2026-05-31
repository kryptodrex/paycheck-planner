import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SOURCE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const FORBIDDEN_IMPORT_PATTERNS: RegExp[] = [
  /^electron$/,
  /^node:electron$/,
  /^react($|\/)/,
  /^react-dom($|\/)/,
  /^@paycheck-planner\/desktop($|\/)/,
  /apps\/desktop/,
  /components\//,
  /contexts\//,
];

const FORBIDDEN_GLOBAL_PATTERNS: RegExp[] = [
  /\bwindow\b/,
  /\bdocument\b/,
  /\bnavigator\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
];

function walkDir(dirPath: string): string[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractImports(sourceCode: string): string[] {
  const imports = new Set<string>();
  const importPatterns = [
    /from\s+['"]([^'"]+)['"]/g,
    /import\(['"]([^'"]+)['"]\)/g,
  ];

  for (const pattern of importPatterns) {
    for (const match of sourceCode.matchAll(pattern)) {
      const moduleSpecifier = match[1];
      if (moduleSpecifier) {
        imports.add(moduleSpecifier);
      }
    }
  }

  return [...imports];
}

describe('core architecture boundaries', () => {
  const sourceFiles = walkDir(SOURCE_ROOT);

  it('does not import React, Electron, desktop app modules, or UI-layer modules', () => {
    const violations: string[] = [];

    for (const filePath of sourceFiles) {
      const source = fs.readFileSync(filePath, 'utf8');
      const imports = extractImports(source);

      for (const importPath of imports) {
        if (FORBIDDEN_IMPORT_PATTERNS.some((pattern) => pattern.test(importPath))) {
          violations.push(`${path.relative(SOURCE_ROOT, filePath)} -> ${importPath}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('does not access browser globals directly', () => {
    const violations: string[] = [];

    for (const filePath of sourceFiles) {
      const source = fs.readFileSync(filePath, 'utf8');

      for (const pattern of FORBIDDEN_GLOBAL_PATTERNS) {
        if (pattern.test(source)) {
          violations.push(`${path.relative(SOURCE_ROOT, filePath)} -> ${pattern}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
