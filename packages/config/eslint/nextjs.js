/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [require.resolve('./base.js'), 'next/core-web-vitals'],
  rules: {
    'react/no-unescaped-entities': 'off',
  },
};
