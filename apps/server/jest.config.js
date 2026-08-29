/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/src/test/setup.ts'],
  clearMocks: true,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {}],
  },
};
