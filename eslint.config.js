import globals from 'globals';
import pluginJs from '@eslint/js';

export default [
  {
    ignores: ['_build/*'],
  },
  {
    files: ["src/**/*.js"],
    languageOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        globals: {
          ...globals.node,
        },
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      "quotes": ["error", "single", { "avoidEscape": true }],
      "semi":   ["error", "always", { "omitLastInOneLineBlock": true}],
      "no-console": "off",
      "no-trailing-spaces": ["error"],
      "indent": ["error", 4, { "SwitchCase": 1 }],
      "no-unused-vars": "warn",
    }
  }
];
