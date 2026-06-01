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

const light: ThemeColors = {
  pageBg: '#F5F7FA',
  cardBg: '#FFFFFF',
  cardAlt: '#F8FAFC',
  textPrimary: '#1F2937',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E2E8F0',
  inputBg: '#F8FAFC',
  headerBg: '#FFFFFF',
};

const dark: ThemeColors = {
  pageBg: '#111827',
  cardBg: '#1F2937',
  cardAlt: '#283548',
  textPrimary: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF',
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
