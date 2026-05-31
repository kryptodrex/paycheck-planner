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
			'no-restricted-imports': ['error', {
				paths: [
					'electron',
					'react',
					'react-dom',
					'react/jsx-runtime',
					'react/jsx-dev-runtime',
					'@paycheck-planner/desktop',
				],
				patterns: [
					'**/apps/desktop/**',
					'**/components/**',
					'**/contexts/**',
				],
			}],
			'no-restricted-globals': ['error', 'window', 'document', 'navigator', 'localStorage', 'sessionStorage'],
		},
	},
])
