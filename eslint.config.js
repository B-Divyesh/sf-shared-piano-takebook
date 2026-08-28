import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'test-results/**', 'playwright-report/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: {
        AudioContext: 'readonly', Blob: 'readonly', caches: 'readonly', cancelAnimationFrame: 'readonly',
        crypto: 'readonly', document: 'readonly', fetch: 'readonly', history: 'readonly', indexedDB: 'readonly',
        location: 'readonly', localStorage: 'readonly', matchMedia: 'readonly', navigator: 'readonly',
        performance: 'readonly', requestAnimationFrame: 'readonly', setTimeout: 'readonly', structuredClone: 'readonly',
        URL: 'readonly', window: 'readonly'
      }
    }
  },
  {
    files: ['tests/**/*.ts', '*.config.ts'],
    languageOptions: {
      globals: { Buffer: 'readonly', console: 'readonly', process: 'readonly', URL: 'readonly' }
    }
  }
);
