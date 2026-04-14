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
    files: ['src/**/*.{js,ts}', 'vite.config.ts'],
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
    files: ['src/**/*.ts', 'vite.config.ts'],
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['src/lib/utils/bundler.test.ts', 'src/lib/utils/bundler-functions.test.ts'],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  }
];
