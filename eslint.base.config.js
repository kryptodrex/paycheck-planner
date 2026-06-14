import js from '@eslint/js'
import globals from 'globals'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.flat.recommended.rules,
      ...reactRefresh.configs.vite.rules,
      'no-undef': 'off',
      // eslint-plugin-react-hooks v7's `recommended` set bundles React Compiler
      // rules. This project does not build with the React Compiler, so the
      // compiler-only memoization check is not applicable and is turned off.
      'react-hooks/preserve-manual-memoization': 'off',
      // New, intentionally-advisory rule for this codebase: the existing
      // derived-state-sync effects are deliberate. Keep it as a warning (visible,
      // non-blocking) rather than forcing risky refactors; revisit if/when the
      // React Compiler is adopted.
      'react-hooks/set-state-in-effect': 'warn',
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: globals.browser,
    },
  },
])
