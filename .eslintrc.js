// ESLint for Expo/React Native + TypeScript. `expo` gir TS-parser +
// react/react-native/hooks-regler; `prettier` slår av formateringsregler som
// kolliderer med Prettier (formatering håndteres av `npm run format`).
module.exports = {
  root: true,
  extends: ['expo', 'prettier'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.expo/',
    'coverage/',
    'assets/',
    'supabase/',
    'babel.config.js',
    'jest.config.js',
    'metro.config.js',
    '.eslintrc.js',
  ],
  rules: {
    // Norsk brødtekst i JSX inneholder apostrofer/anførselstegn.
    'react/no-unescaped-entities': 'off',
    // Kodebasen bruker bevisst `any` enkelte steder (Supabase-rader, navigasjon).
    '@typescript-eslint/no-explicit-any': 'off',
    'react-hooks/exhaustive-deps': 'warn',
    // Nye React 19 / React-Compiler-regler i eslint-config-expo 57. Koden kjører
    // (tester + web-eksport passerer); nedgradert til advarsel i tråd med resten
    // av de "støyende" reglene over. Vurder å rydde disse mønstrene senere:
    // set-state-i-effekt (kaskaderender) og ref-tilgang under render.
    'react-hooks/set-state-in-effect': 'warn',
    'react-hooks/refs': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
    ],
  },
};
