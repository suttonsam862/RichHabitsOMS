/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { useESM: true }]
  },
  moduleNameMapper: {
    "^@shared/(.*)$": "<rootDir>/shared/$1",
    "^@/(.*)$": "<rootDir>/client/src/$1"
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  setupFilesAfterEnv: ['<rootDir>/client/tests/setup.ts'],
  testMatch: [
    "**/__tests__/**/*.(ts|tsx)",
    "**/*.(test|spec).(ts|tsx)"
  ],
  collectCoverageFrom: [
    "client/src/**/*.{ts,tsx}",
    "server/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**"
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 10000
};