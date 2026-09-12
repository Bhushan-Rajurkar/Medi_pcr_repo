import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useNativeColorScheme, Platform } from 'react-native';
import { Colors, ThemeType, ThemeColors } from '@/constants/theme';

interface ThemeContextType {
  theme: ThemeType;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'medi_pcr_theme_preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useNativeColorScheme();
  const [theme, setThemeState] = useState<ThemeType>('light'); // default to Day theme (Beige & Green)

  useEffect(() => {
    // Check localStorage on Web if available
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeType | null;
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setThemeState(savedTheme);
          return;
        }
      } catch (e) {
        // Ignore storage access error
      }
    }
    if (systemScheme === 'dark') {
      setThemeState('dark');
    }
  }, [systemScheme]);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      } catch (e) {
        // Ignore storage access error
      }
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const isDark = theme === 'dark';
  const colors = Colors[theme];

  return (
    <ThemeContext.Provider value={{ theme, colors, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
}
