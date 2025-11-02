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

/**
 * Format date and time in 24-hour format
 * Standard format for displaying dates with time across the application
 * 
 * @param {Date | string | null | undefined} dateValue - Date value to format
 * @returns {string} Formatted date and time string in 24-hour format
 */
export const format24HourDateTime = (dateValue: Date | string | null | undefined): string => {
  if (!dateValue) return 'N/A';
  
  try {
    const date = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
    
    if (!isValid(date)) {
      return 'N/A';
    }
    
    // Format: "MMM dd, yyyy, HH:mm" (e.g., "Nov 02, 2025, 14:30")
    return format(date, 'MMM dd, yyyy, HH:mm');
  } catch (error) {
    console.error('Error formatting 24-hour date time:', error);
    return 'Invalid Date';
  }
};

/**
 * Format time only in 24-hour format
 * 
 * @param {Date | string | null | undefined} dateValue - Date value to format
 * @returns {string} Formatted time string in 24-hour format
 */
export const format24HourTime = (dateValue: Date | string | null | undefined): string => {
  if (!dateValue) return 'N/A';
  
  try {
    const date = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
    
    if (!isValid(date)) {
      return 'N/A';
    }
    
    // Format: "HH:mm" (e.g., "14:30")
    return format(date, 'HH:mm');
  } catch (error) {
    console.error('Error formatting 24-hour time:', error);
    return 'Invalid Time';
  }
};

/**
 * Get current date/time formatted for datetime-local input
 * Returns current system time in the format required by HTML5 datetime-local input
 * 
 * @returns {string} Current date/time in YYYY-MM-DDTHH:mm format
 */
export const getCurrentLocalDateTimeString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};