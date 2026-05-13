/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', isolatedModules: true }],
  },
  // @anthropic-ai/sdk publica ESM em algumas paths internas; libera transform.
  transformIgnorePatterns: ['/node_modules/(?!.*\\.mjs$)'],
  testTimeout: 30_000,
};
