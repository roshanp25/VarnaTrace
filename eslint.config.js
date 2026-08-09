const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['jest.setup.js', '**/__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
    languageOptions: {
      globals: globals.jest,
    },
  },
];
