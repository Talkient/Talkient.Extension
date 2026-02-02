import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

// Shared rules for production TypeScript files
const productionRules = {
  '@typescript-eslint/explicit-function-return-type': 'warn',
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
};

// Relaxed rules for test files (unit tests and e2e)
// Tests often need more flexibility due to mocking and test utilities
const testRules = {
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/no-explicit-any': 'warn', // Warn instead of error in tests
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  '@typescript-eslint/no-unsafe-assignment': 'off', // Common with mocks
  '@typescript-eslint/no-unsafe-member-access': 'off', // Common with mocks
  '@typescript-eslint/no-unsafe-call': 'off', // Common with mocks
  '@typescript-eslint/no-unsafe-argument': 'off', // Common with mocks
  '@typescript-eslint/no-unsafe-return': 'off', // Common with mocks
  '@typescript-eslint/unbound-method': 'off', // Jest expect matchers
  '@typescript-eslint/no-require-imports': 'off', // Dynamic imports in tests
  '@typescript-eslint/require-await': 'off', // Test setup often doesn't need await
  '@typescript-eslint/no-floating-promises': 'off', // Test utilities handle this
  'no-console': 'off', // Console is fine in tests for debugging
  'no-empty': 'off', // Empty catch blocks in tests are fine
};

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintConfigPrettier,
  {
    // Source files (excluding tests)
    files: ['src/**/*.ts'],
    ignores: ['src/**/__tests__/**/*.ts', 'src/**/*.test.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: productionRules,
  },
  {
    // E2E test files
    files: ['e2e/**/*.ts', 'playwright.config.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.e2e.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: testRules,
  },
  {
    // Unit test files
    files: ['src/**/__tests__/**/*.ts', 'src/**/*.test.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.test.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: testRules,
  },
  {
    // Ignore JavaScript files, dist, and node_modules
    ignores: ['dist/**', 'node_modules/**', '**/*.js', '**/*.cjs', '**/*.mjs'],
  },
);
