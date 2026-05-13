/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', isolatedModules: true }],
  },
  // jose publica ESM em algumas paths internas; libera transform pra evitar
  // SyntaxError em `import { ... } from 'jose'` dentro de node_modules.
  transformIgnorePatterns: ['/node_modules/(?!(jose|@panva)/)'],
  testTimeout: 30_000,
};
