module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
  },
  ignorePatterns: ['node_modules/', '.next/', 'out/', 'coverage/'],
};