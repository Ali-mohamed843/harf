/**
 * React Native ships its source as untranspiled Flow, so tests must go through
 * Babel with React Native's own preset. This is the only package in the
 * monorepo that needs Babel — every other package runs on Vitest/esbuild.
 */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
};
