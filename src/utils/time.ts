/**
 * Time Utility Functions
 * 
 * Collection of utility functions for date and time operations.
 */

import { format, parseISO, isValid } from 'date-fns';

/**
 * Format a date to local time
 * Converts UTC date to local time zone for display
 * 
 * @param {Date | string} date - Date to format
 * @param {string} formatString - Format string for date-fns
 * @returns {string} Formatted date string in local time
 */
export const formatLocalTime = (date: Date | string, formatString: string): string => {
  try {
    // Parse string to Date if needed
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) {
      return 'Invalid Date';
    }
    
    // Format using date-fns with the user's local timezone
    return format(dateObj, formatString);
  } catch (error) {
    console.error('Error formatting local time:', error);
    return 'Invalid Date';
  }
};

/**
 * Format a date for display
 * User-friendly date formatting with validation
 * 
 * @param {string | Date | null | undefined} dateValue - Date value to format
 * @param {string} formatString - Format string for date-fns
 * @returns {string} Formatted date string or fallback text
 */
export const formatDate = (dateValue: string | Date | null | undefined, formatString: string = 'MMM dd, yyyy'): string => {
  if (!dateValue) return 'N/A';
  
  try {
    const date = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
    
    if (!isValid(date)) {
      return 'N/A';
    }
    
    return format(date, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Get relative time description
 * Returns a human-readable relative time (e.g., "5 minutes ago")
 * 
 * @param {Date | string} date - Date to describe
 * @returns {string} Human-readable relative time
 */
export const getRelativeTime = (date: Date | string): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) {
      return 'Invalid Date';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
      return 'Just now';
    } else if (diffMin < 60) {
      return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    } else if (diffHour < 24) {
      return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
    } else if (diffDay < 30) {
      return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
    } else {
      return format(dateObj, 'MMM dd, yyyy');
    }
  } catch (error) {
    console.error('Error calculating relative time:', error);
    return 'Unknown time';
  }
};

/**
 * Check if a date is today
 * 
 * @param {Date | string} date - Date to check
 * @returns {boolean} True if date is today
 */
export const isToday = (date: Date | string): boolean => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) {
      return false;
    }
    
    const today = new Date();
    return (
      dateObj.getDate() === today.getDate() &&
      dateObj.getMonth() === today.getMonth() &&
      dateObj.getFullYear() === today.getFullYear()
    );
  } catch (error) {
    console.error('Error checking if date is today:', error);
    return false;
  }
};