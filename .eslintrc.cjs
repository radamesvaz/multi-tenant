module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.vue'],
      parser: '@typescript-eslint/parser',
      extends: [
        'plugin:@typescript-eslint/recommended',
      ],
      parserOptions: {
        project: null,
      },
    },
  ],
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn'],
    'vue/multi-word-component-names': 'off',
  },
};

