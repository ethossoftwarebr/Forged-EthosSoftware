/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec|e2e\\-spec|e2e\\.spec))\\.[jt]sx?$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', isolatedModules: true }],
  },
  setupFiles: [],
  testTimeout: 30_000,
};
