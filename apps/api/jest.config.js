/**
 * Unit-test configuration (Jest + ts-jest — Jest chosen per NestJS idiom;
 * the testing-strategy doc permits either Jest or Vitest, one is used
 * consistently across this app). E2E config lives in test/jest-e2e.config.js.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  collectCoverageFrom: ['**/*.ts', '!**/*.spec.ts', '!**/testing/**', '!main.ts'],
  coverageDirectory: '../coverage',
};
