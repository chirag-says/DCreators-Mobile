/**
 * Pure-logic unit tests only. These import framework-free modules
 * (src/lib/*, src/hooks helpers) so we run under a plain ts-jest/node
 * environment without the heavy react-native / jest-expo transform.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { strict: true, esModuleInterop: true } }],
  },
};
