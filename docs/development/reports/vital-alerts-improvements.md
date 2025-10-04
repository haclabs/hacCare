/**
 * Vital Signs Alert System Improvements Summary
 * ============================================
 * 
 * Applied the same conservative logic to vital signs alerts as medication alerts
 * to prevent excessive alert generation and ensure only one alert per patient per vital type.
 * 
 * KEY IMPROVEMENTS:
 * 
 * 1. ABNORMAL VITAL SIGNS ALERTS:
 *    - Only checks vitals from last 4 hours (unchanged - already conservative)
 *    - More precise duplicate checking: looks for exact vital type (Temperature, Blood Pressure, etc.)
 *    - Reduced duplicate check window from 4 hours to 2 hours
 *    - Changed expiration from 24 hours to 8 hours for consistency
 *    - Better error handling for duplicate checking
 * 
 * 2. MISSING VITALS ALERTS:
 *    - Only creates alerts for patients truly overdue (past threshold, not approaching)
 *    - More specific existing alert checking with 2-hour window
 *    - Improved priority system based on hours overdue:
 *      * Critical patients OR >16h overdue: Critical priority
 *      * >12h overdue: High priority  
 *      * Otherwise: Medium priority
 *    - Changed expiration from 24 hours to 8 hours
 *    - Better logging for troubleshooting
 * 
 * 3. DEDUPLICATION IMPROVEMENTS:
 *    - Separates "Missing Vitals" alerts from specific vital sign alerts
 *    - More precise grouping by vital type for abnormal readings
 *    - Prevents multiple alerts for same vital sign type per patient
 * 
 * EXPECTED RESULTS:
 * - Maximum one alert per patient for missing vitals
 * - Maximum one alert per patient per vital sign type (Temperature, Blood Pressure, etc.)
 * - Significantly reduced alert volume for vital signs
 * - More actionable alerts focused on truly urgent situations
 * 
 * BEFORE: Could have multiple alerts per patient for same vital issues
 * AFTER: One precise alert per patient per vital concern
 */