/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

export default {
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  coverageProvider: 'v8',
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.+)': '<rootDir>/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/tests/'],
}
