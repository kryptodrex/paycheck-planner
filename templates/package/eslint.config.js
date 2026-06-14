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
			// If this is a domain/leaf or adapter package, add boundary rules here so
			// it can't reach for UI/platform/other workspace packages. Mirror
			// packages/core/eslint.config.js. Delete this block for an app package.
			// 'no-restricted-imports': ['error', {
			// 	paths: ['electron', 'react', 'react-dom'],
			// 	patterns: ['**/apps/**', '@paycheck-planner/*'],
			// }],
			// 'no-restricted-globals': ['error', 'window', 'document', 'navigator', 'localStorage', 'sessionStorage'],
		},
	},
])
