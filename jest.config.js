export default {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/', '<rootDir>/e2e/'],
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$|lodash-es|@fundamental-ngx|@apollo|graphql-sse)'],
  moduleNameMapper: {
    '^models/(.*)$': '<rootDir>/src/app/models/$1',
    '^services/(.*)$': '<rootDir>/src/app/services/$1',
    '^state/(.*)$': '<rootDir>/src/app/state/$1',
    '^components/(.*)$': '<rootDir>/src/app/components/$1',
    '^utils/(.*)$': '<rootDir>/src/app/utils/$1',
  },
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.spec.ts',
    '!src/app/**/index.ts',
  ],
  coverageReporters: ['html', 'lcov', 'text-summary'],
  testRunner: 'jest-jasmine2',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results',
        outputName: 'junit.xml',
      },
    ],
  ],
};
