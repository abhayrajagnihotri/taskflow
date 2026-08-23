module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.unit.test.ts', '**/*.integration.test.ts'],
  transform: {
    '^.+\\.(ts|tsx|js|mjs)$': '<rootDir>/tests/import-meta-transformer.js',
  },
  transformIgnorePatterns: ['node_modules/(?!@prisma)'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/generated/**',
    '!src/server.ts',
    '!src/worker.ts',
  ],
  testTimeout: 30000,
};
