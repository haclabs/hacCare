import React, { createContext, useState, useEffect } from 'react';

/**
 * Theme Context Interface
 * Manages theme state throughout the application (light/dark/halloween/christmas)
 */
type Theme = 'light' | 'dark' | 'halloween' | 'christmas';

interface ThemeContextType {
  theme: Theme;
  isDarkMode: boolean;
  isHalloweenMode: boolean;
  isChristmasMode: boolean;
  setTheme: (theme: Theme) => void;
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
}

/**
 * Theme Context
 * React context for managing theme state across the application
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Theme Provider Component
 * Manages theme state and applies dark/light mode classes to the document
 * 
 * Features:
 * - Persists theme preference in localStorage
 * - Automatically applies theme classes to document
 * - Respects system preference on first visit
 * - Provides theme toggle functionality
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize theme state from localStorage or system preference
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('haccare-theme') as Theme;
    if (savedTheme && ['light', 'dark', 'halloween', 'christmas'].includes(savedTheme)) {
      return savedTheme;
    }
    
    // Fall back to system preference for new users
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const isDarkMode = theme === 'dark';
  const isHalloweenMode = theme === 'halloween';
  const isChristmasMode = theme === 'christmas';

  /**
   * Apply theme classes to document
   * Updates the document class to enable theme styles
   */
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes first
    root.classList.remove('dark', 'halloween', 'christmas');
    
    // Apply the current theme class
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'halloween') {
      root.classList.add('halloween');
    } else if (theme === 'christmas') {
      root.classList.add('christmas');
    }
    
    // Save to localStorage
    localStorage.setItem('haccare-theme', theme);
  }, [theme]);

  /**
   * Set specific theme
   * @param {Theme} newTheme - The theme to set
   */
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  /**
   * Toggle between dark and light mode (legacy support)
   */
  const toggleDarkMode = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('light');
    } else {
      // If terminal mode, cycle to light
      setTheme('light');
    }
  };

  /**
   * Set specific dark mode state (legacy support)
   * @param {boolean} isDark - Whether to enable dark mode
   */
  const setDarkMode = (isDark: boolean) => {
    setTheme(isDark ? 'dark' : 'light');
  };

  const value = {
    theme,
    isDarkMode,
    isHalloweenMode,
    isChristmasMode,
    setTheme,
    toggleDarkMode,
    setDarkMode
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export { ThemeContext };