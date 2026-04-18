import globals from 'globals';
import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['_build/*'],
  },
  {
    files: ['src/**/*.ts', 'scripts/**/*.ts'],
    plugins: {
        '@stylistic': stylistic,
    },
    languageOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        globals: {
          ...globals.node,
        },
    },
    rules: {
      '@stylistic/indent': ['error', 4, { 'SwitchCase': 1 }],
      '@stylistic/quotes': ['error', 'single', { 'avoidEscape': true }],
      '@stylistic/semi':   ['error', 'always', { 'omitLastInOneLineBlock': true}],
      '@stylistic/no-extra-semi':   ['error'],
      '@stylistic/no-trailing-spaces': ['error'],
      'no-console': 'off',
      'no-unused-vars': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
    }
  },
  {
    files: ['src/**/*.ts', 'scripts/**/*.ts'],
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    files: [
      'src/cli/config.test.ts',
      'src/processing/mock-processings.test.ts',
      'src/bundle/bundler.test.ts',
      'src/bundle/bundler-functions.test.ts',
      'src/excel/sheet-reader.test.ts',
      'src/excel/workbook-reader.test.ts',
    ],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  }
];
