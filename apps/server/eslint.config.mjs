import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'prisma/migrations', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // Allow deliberately-unused args/vars when prefixed with `_`
      // (e.g. the mandatory 4-arg Express error handler signature).
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Test files run under Jest's globals.
    files: ['**/*.test.ts', 'src/test/**/*.ts'],
    languageOptions: { globals: { ...globals.jest } },
  },
);
