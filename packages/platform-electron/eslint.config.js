import js from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      'no-undef': 'off',
      // Boundary: platform-electron is the Electron adapter layer — it may use
      // electron + storage/core, but must never import UI or any app package.
      'no-restricted-imports': ['error', {
        paths: ['react', 'react-dom'],
        patterns: [
          '**/apps/**',
          '@paycheck-planner/desktop',
          '@paycheck-planner/mobile',
          '@paycheck-planner/api',
        ],
      }],
    },
  },
])
