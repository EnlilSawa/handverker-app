import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeColors {
  pageBg: string;
  cardBg: string;
  cardAlt: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  inputBg: string;
  headerBg: string;
}

// Mono-tema (svart/hvitt): hvit side, grå kort, sort tekst.
const light: ThemeColors = {
  pageBg: '#FFFFFF',
  cardBg: '#F5F5F5',
  cardAlt: '#ECECEC',
  textPrimary: '#000000',
  textSecondary: '#616A76',
  textTertiary: '#878E97',
  border: '#E5E5E5',
  inputBg: '#FFFFFF',
  headerBg: '#FFFFFF',
};

const dark: ThemeColors = {
  pageBg: '#111827',
  cardBg: '#1F2937',
  cardAlt: '#283548',
  textPrimary: '#F9FAFB',
  // Sekundær/tertiær løftet ett hakk lysere så grå tekst (datoer, metadata,
  // etiketter) er tydelig i mørk modus — bevarer fortsatt lesehierarkiet.
  textSecondary: '#E5E7EB',
  textTertiary: '#CBD2DC',
  border: '#374151',
  inputBg: '#374151',
  headerBg: '#1F2937',
};

interface ThemeValue {
  isDark: boolean;
  toggleTheme: () => void;
  pageBg: string;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeValue>({
  isDark: false,
  toggleTheme: () => {},
  pageBg: light.pageBg,
  colors: light,
});

const KEY = 'efero_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v === 'dark') setIsDark(true);
    });
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(KEY, next ? 'dark' : 'light');
      return next;
    });
  };

  const colors = isDark ? dark : light;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, pageBg: colors.pageBg, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
