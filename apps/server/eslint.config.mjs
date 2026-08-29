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
  },
  {
    // Test files run under Jest's globals.
    files: ['**/*.test.ts', 'src/test/**/*.ts'],
    languageOptions: { globals: { ...globals.jest } },
  },
);
