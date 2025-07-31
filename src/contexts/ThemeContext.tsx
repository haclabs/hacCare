import React, { createContext, useState, useEffect } from 'react';

/**
 * Theme Context Interface
 * Manages dark/light mode state throughout the application
 */
interface ThemeContextType {
  isDarkMode: boolean;
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
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('haccare-theme');
    if (savedTheme === 'dark') {
      return true;
    } else if (savedTheme === 'light') {
      return false;
    } else if (savedTheme === 'system') {
      // Use system preference for 'system' setting
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    // Fall back to system preference for new users
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  /**
   * Apply theme classes to document
   * Updates the document class to enable dark mode styles
   */
  useEffect(() => {
    const root = document.documentElement;
    
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Only save to localStorage if it's not a system preference
    // System preference changes should not override the 'system' setting
    const savedTheme = localStorage.getItem('haccare-theme');
    if (savedTheme !== 'system') {
      localStorage.setItem('haccare-theme', isDarkMode ? 'dark' : 'light');
    }
  }, [isDarkMode]);

  /**
   * Listen for system theme changes when 'system' is selected
   */
  useEffect(() => {
    const savedTheme = localStorage.getItem('haccare-theme');
    if (savedTheme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        setIsDarkMode(e.matches);
      };
      
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      
      return () => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      };
    }
  }, []);

  /**
   * Toggle between dark and light mode
   * When toggling, we switch away from system preference to manual preference
   */
  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newValue = !prev;
      localStorage.setItem('haccare-theme', newValue ? 'dark' : 'light');
      return newValue;
    });
  };

  /**
   * Set specific dark mode state
   * @param {boolean} isDark - Whether to enable dark mode
   */
  const setDarkMode = (isDark: boolean) => {
    setIsDarkMode(isDark);
  };

  const value = {
    isDarkMode,
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