import React from 'react';
import { View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

// NavigationContainer theme — makes all card/screen backgrounds transparent
// so our root pageBg shows through everywhere.
const NAV_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
    card: 'transparent',
  },
};

function Root() {
  const { pageBg, isDark } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: pageBg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <NavigationContainer theme={NAV_THEME}>
          <Root />
        </NavigationContainer>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
