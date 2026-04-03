import globals from 'globals';
import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';

export default [
  eslint.configs.recommended,
  {
    ignores: ['_build/*'],
  },
  {
    files: ["src/**/*.js"],
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
      "no-unused-vars": "warn",
    }
  }
];
