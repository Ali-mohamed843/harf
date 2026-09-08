/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'core',
        'react',
        'native',
        'next',
        'eslint-plugin',
        'fonts',
        'docs',
        'example-native',
        'repo',
        'ci',
        'deps',
        'release',
      ],
    ],
    'body-max-line-length': [0, 'always'],
  },
};
