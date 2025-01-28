import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/_build/**',
    ]
  },
});