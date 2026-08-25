/**
 * E2E test configuration. Runs the supertest suite in test/ against a real
 * Postgres + Redis (docker-compose). Tests self-skip with a clear message
 * when DATABASE_URL / REDIS_URL are unreachable.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '..',
  testRegex: '.*\\.e2e-spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testTimeout: 60000,
};
