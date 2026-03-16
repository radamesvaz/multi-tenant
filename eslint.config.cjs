// Configuración mínima para ESLint 10 (flat config)
// De momento se aplica a archivos JS/TS. Más adelante se puede extender para Vue.

const eslint = require('@eslint/js');

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  eslint.configs.recommended,
  {
    files: ['src/**/*.{js,ts}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      // Aquí puedes ir añadiendo reglas personalizadas
    },
  },
];

