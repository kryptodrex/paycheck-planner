import baseConfig from '../../eslint.base.config.js';

export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      // Honor the `_`-prefix convention for intentionally-unused args/vars
      // (e.g. unused middleware `_next`, placeholder `_backend`).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
];
