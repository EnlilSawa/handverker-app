// Jest med jest-expo-preset (SDK 50). Enhetstestene for beløpslogikk er ren TS,
// men preset-en gir korrekt babel/transform for hele Expo/RN-miljøet.
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/?(*.)+(test).ts', '**/?(*.)+(test).tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@supabase/.*|zustand))',
  ],
  collectCoverageFrom: ['src/utils/amounts.ts'],
};
