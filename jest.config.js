/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { useESM: true }]
  },
  moduleNameMapper: {
    "^@shared/(.*)$": "<rootDir>/shared/$1"
  },
  extensionsToTreatAsEsm: ['.ts'],
};