import React, { createContext, useContext, useState, useEffect } from 'react';

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
 * Custom hook to access theme context
 * Throws an error if used outside of ThemeProvider
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

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
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    
    // Fall back to system preference
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
    
    // Save preference to localStorage
    localStorage.setItem('haccare-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  /**
   * Toggle between dark and light mode
   */
  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
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