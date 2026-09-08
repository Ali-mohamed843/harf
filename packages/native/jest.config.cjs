/**
 * `@harf/native` is the one package tested with Jest rather than Vitest.
 *
 * `@testing-library/react-native` is built for Jest, and React Native
 * distributes its source as untranspiled Flow, which Vitest's esbuild-based
 * pipeline cannot parse. Running the React Native adapter on the same
 * toolchain real React Native apps use is worth the extra config.
 */

/** @type {import('jest').Config} */
module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],

  // pnpm stores every package under node_modules/.pnpm/<name>@<version>/, so
  // the usual `node_modules/(?!react-native)` pattern never matches. Instead:
  // transform anything whose path mentions react-native anywhere, and ignore
  // the rest of node_modules. This covers react-native itself,
  // @react-native/*, and @testing-library/react-native.
  transformIgnorePatterns: ['node_modules[/\\\\](?!.*react-native)'],

  // @harf/core's built output imports a bare `react`, which pnpm resolves from
  // packages/core/node_modules — a different copy from the one the test tree
  // uses. Two React instances means hooks read a null dispatcher and every
  // render throws. Force both to this package's copy.
  moduleNameMapper: {
    '^react$': require.resolve('react'),
    '^react/jsx-runtime$': require.resolve('react/jsx-runtime'),
    '^react/jsx-dev-runtime$': require.resolve('react/jsx-dev-runtime'),
  },

  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.test.{ts,tsx}'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
