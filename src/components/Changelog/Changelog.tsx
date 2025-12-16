import React, { useState } from 'react';
import { FileText, Calendar, Plus, Bug, Zap, Shield, Users, Star } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Changelog Entry Interface
 * Defines the structure of each changelog entry
 */
interface ChangelogEntry {
  version: string;
  codename?: string;
  date: string;
  isMajor?: boolean;
  changes: {
    type: 'feature' | 'bugfix' | 'improvement' | 'security' | 'breaking';
    description: string;
  }[];
}

/**
 * Changelog Component
 * 
 * Displays the application's version history and release notes.
 * Features:
 * - Expandable version details
 * - Change type categorization
 * - Visual change type indicators
 * - Release statistics
 * - Upcoming features preview
 * 
 * @returns {JSX.Element} The changelog component
 */
export const Changelog: React.FC = () => {
  const [selectedVersion, setSelectedVersion] = useState<string>('5.2.0-rc5');

  /**
   * Changelog data
   * Contains all version history with categorized changes
   */
  const changelogData: ChangelogEntry[] = [
    {
      version: "5.2.0-rc5",
      codename: "BUGGLER",
      date: "2025-11-30",
      isMajor: true,
      changes: [
        {
          type: "improvement",
          description: "Old Simulation System Removal - Eliminated ~800 lines of unused legacy code (engine/, controllers/, types/)"
        },
        {
          type: "improvement",
          description: "Debug Log Cleanup - Removed 41 debug console.log statements, replaced with proper secureLogger"
        },
        {
          type: "improvement",
          description: "Bundle Optimization - Implemented 17-chunk code splitting with lazy-loaded PDFs (535KB saved)"
        },
        {
          type: "improvement",
          description: "Dependency Cleanup - Removed 57 unused packages (10 direct + 47 sub-dependencies)"
        },
        {
          type: "improvement",
          description: "Database Function Audit - Cataloged 135 functions, identified 21 for removal with SQL scripts"
        },
        {
          type: "improvement",
          description: "Documentation Cleanup - Removed 5 test/temporary documentation files"
        },
        {
          type: "security",
          description: "Error Logging Standardization - Replaced console.error with secureLogger throughout codebase"
        },
        {
          type: "improvement",
          description: "Code Quality Analysis - Created comprehensive improvement plan for ESLint errors and large files"
        },
      ]
    },
    {
      version: "5.2.0-rc4",
      codename: "OTTO",
      date: "2025-11-02",
      isMajor: true,
      changes: [
        {
          type: "feature",
          description: "Lab Orders System - Complete specimen ordering with 6 procedure categories (40+ test types) and 6 source categories (30+ sites)"
        },
        {
          type: "feature",
          description: "hacMap Body Mapping - Interactive device and wound tracking with front/back body diagrams and comprehensive clinical details"
        },
        {
          type: "feature",
          description: "Lab order cascading dropdowns: Hematology, Chemistry, Microbiology, Serology, Urinalysis, Special Tests"
        },
        {
          type: "feature",
          description: "Specimen collection sites: Venipuncture, Capillary, Arterial, Urine, Culture, and Other categories"
        },
        {
          type: "feature",
          description: "4x4\" printable specimen labels with barcode integration and order status tracking"
        },
        {
          type: "feature",
          description: "Device markers: Central Line, Peripheral IV, Foley Catheter, NG Tube, ET Tube with insertion details"
        },
        {
          type: "feature",
          description: "Wound markers: Pressure Injury, Surgical, Diabetic Ulcer with staging, size, exudate, and pain assessment"
        },
        {
          type: "improvement",
          description: "Simulation Integration - Lab orders and hacMap markers captured in simulation templates and snapshots"
        },
        {
          type: "improvement",
          description: "Simulation Reset Enhancement - Smart cleanup of student-entered data while preserving template baseline"
        },
        {
          type: "improvement",
          description: "Patient Duplication Enhancement - Lab orders and markers copied across tenants with complete clinical details"
        },
        {
          type: "improvement",
          description: "Super Admin Backup Service - Added lab orders and hacMap markers to comprehensive backup system"
        },
        {
          type: "improvement",
          description: "Backup Management UI - New checkboxes for lab orders and hacMap markers in backup creation interface"
        },
        {
          type: "security",
          description: "Complete RLS (Row Level Security) policies for lab_orders and hacmap_markers with tenant isolation"
        },
        {
          type: "bugfix",
          description: "Fixed create_simulation_snapshot() parameter ordering - resolved PostgreSQL default parameter error"
        },
        {
          type: "improvement",
          description: "Data Integrity - Proper foreign key constraints, label printing state management, and cascading deletes"
        },
        {
          type: "improvement",
          description: "Performance Optimization - JSONB aggregation for snapshots, indexed foreign keys, optimized DELETE queries"
        },
        {
          type: "feature",
          description: "Comprehensive Documentation - Created simulation/backup integration guides with testing checklists"
        }
      ]
    },
    {
      version: "5.0.0-rc.2",
      codename: "Mint",
      date: "2025-10-18",
      isMajor: true,
      changes: [
        {
          type: "breaking",
          description: "PHASE 5: COMPONENT ARCHITECTURE REVOLUTION - Migrated 60+ components to modern feature-based architecture"
        },
        {
          type: "improvement",
          description: "Feature-Based Component Organization - Created 5 feature modules: patients, clinical, admin, simulation, settings"
        },
        {
          type: "improvement",
          description: "Import Path Optimization - Fixed 150+ import statements for new feature structure with zero breaking changes"
        },
        {
          type: "improvement",
          description: "Developer Experience Enhancement - Clear feature boundaries, co-located components and hooks, intuitive navigation"
        },
        {
          type: "improvement",
          description: "Scalability Foundation - Independent feature development, reduced coupling, micro-frontend ready architecture"
        },
        {
          type: "improvement",
          description: "Performance Potential - Tree-shaking at feature level, lazy loading capabilities, optimized code-splitting"
        },
        {
          type: "feature",
          description: "Patients Feature Module - 30+ patient management components organized with dedicated hooks"
        },
        {
          type: "feature",
          description: "Clinical Feature Module - BCMA components and medication administration workflows"
        },
        {
          type: "feature",
          description: "Admin Feature Module - User management, tenant settings, and administrative tools"
        },
        {
          type: "feature",
          description: "Simulation Feature Module - Complete simulation workflow components"
        },
        {
          type: "feature",
          description: "Settings Feature Module - Application configuration and security settings"
        },
        {
          type: "improvement",
          description: "Architecture Grade Achievement - 9.5/10 (A+) folder organization following Netflix/Spotify patterns"
        },
        {
          type: "improvement",
          description: "Zero Regression - 100% backward compatibility, successful build (7.87s), passing TypeScript compilation"
        }
      ]
    },
    {
      version: "5.0.0-rc.1",
      codename: "Mango",
      date: "2025-10-04",
      isMajor: true,
      changes: [
        {
          type: "breaking",
          description: "MAJOR ARCHITECTURE OVERHAUL - Complete enterprise-grade restructure with professional development workflows"
        },
        {
          type: "security",
          description: "Database Security Complete Overhaul - Resolved 240+ security warnings to zero"
        },
        {
          type: "security",
          description: "PostgreSQL upgrade from 15.8.1.102 to 17.6.1.011 with comprehensive security patches"
        },
        {
          type: "security",
          description: "RLS (Row Level Security) performance optimization - Fixed 209 warnings with 50-90% performance improvement"
        },
        {
          type: "security",
          description: "Function search path security lockdown - Resolved 33 security warnings eliminating injection vulnerabilities"
        },
        {
          type: "security",
          description: "Multi-tenant security enhancement with proper tenant isolation and user-based filtering"
        },
        {
          type: "improvement",
          description: "Enterprise-Grade Project Organization - Restructured 60+ files into professional architecture"
        },
        {
          type: "improvement",
          description: "Feature-based architecture implementation with comprehensive docs/development/ structure"
        },
        {
          type: "improvement",
          description: "35% Project File Reduction - Significant performance and maintainability gains"
        },
        {
          type: "improvement",
          description: "Zero Compilation Errors - Complete codebase health restoration with TypeScript strict mode"
        },
        {
          type: "improvement",
          description: "Database Query Optimization - Enhanced session tracking with optimized filtering and indexing"
        },
        {
          type: "improvement",
          description: "Build & Development Speed - 40% faster development workflow with streamlined processes"
        },
        {
          type: "feature",
          description: "Professional Documentation Structure with comprehensive development guides and enterprise standards"
        },
        {
          type: "feature",
          description: "Super admin access enhancement for login history with NULL tenant ID handling"
        },
        {
          type: "feature",
          description: "Structured Maintenance Workflow with dedicated scripts and professional processes"
        },
        {
          type: "improvement",
          description: "Enterprise Standards Compliance - Industry best practices with clear production/development separation"
        }
      ]
    },
    {
      version: "3.0.0",
      date: "2025-07-31",
      changes: [
        {
          type: "feature",
          description: "Complete BCMA (Barcode Medication Administration) system with Five Rights verification"
        },
        {
          type: "feature",
          description: "Professional barcode generation and printing for patients and medications"
        },
        {
          type: "feature",
          description: "Diabetic record management with glucose monitoring and insulin tracking"
        },
        {
          type: "feature",
          description: "Enhanced security framework with AI-powered threat detection and secure logging"
        },
        {
          type: "feature",
          description: "24-hour medication administration history with comprehensive tracking"
        },
        {
          type: "improvement",
          description: "Major UI/UX improvements with enhanced medication cards and visual feedback"
        },
        {
          type: "improvement",
          description: "Enhanced database architecture with improved RLS policies and performance"
        },
        {
          type: "security",
          description: "HIPAA-compliant secure logging service with PHI redaction capabilities"
        },
        {
          type: "security",
          description: "Comprehensive security headers and real-time monitoring systems"
        },
        {
          type: "bugfix",
          description: "Fixed BCMA administration database record creation and foreign key constraints"
        },
        {
          type: "bugfix",
          description: "Resolved infinite recursion in tenant user policies and authentication persistence"
        }
      ]
    },
    {
      version: "2.4.1",
      date: "2025-07-15",
      changes: [
        {
          type: "improvement",
          description: "Enhanced real-time notification system with improved overdue medication alerts in notification panel"
        },
        {
          type: "improvement",
          description: "Implemented different vital signs monitoring thresholds based on patient condition (4 hours for Critical patients, 8 hours for others)"
        },
        {
          type: "improvement",
          description: "Added automatic alert checks every 5 minutes with real-time database synchronization"
        },
        {
          type: "improvement",
          description: "Enhanced alert detection algorithms to prevent missed notifications"
        },
        {
          type: "bugfix",
          description: "Fixed alert query to properly detect and display overdue medications"
        },
        {
          type: "bugfix",
          description: "Improved medication due time calculations and display in the notification panel"
        },
        {
          type: "bugfix",
          description: "Fixed vital signs alert thresholds with condition-based monitoring frequency"
        },
        {
          type: "bugfix",
          description: "Added CRITICAL prefix to vital signs alerts for high-priority patients"
        },
        {
          type: "improvement",
          description: "Enhanced logging and error handling throughout the alert system for better troubleshooting"
        }
      ]
    },
    {
      version: "2.4.0",
      date: "2025-07-10",
      changes: [
        {
          type: "feature",
          description: "Enhanced patient notes management with improved editing and deletion functionality"
        },
        {
          type: "feature",
          description: "Added visual indicators for note priority levels with appropriate color coding"
        },
        {
          type: "feature",
          description: "Implemented note deletion with confirmation dialog for data safety"
        },
        {
          type: "improvement",
          description: "Redesigned medication administration workflow with better organization"
        },
        {
          type: "improvement",
          description: "Added color-coded medication cards for due and overdue medications"
        },
        {
          type: "improvement",
          description: "Enhanced medication history viewing experience with better filtering"
        },
        {
          type: "improvement",
          description: "Implemented tabbed interface for different medication types (scheduled, PRN, continuous)"
        },
        {
          type: "bugfix",
          description: "Fixed hospital bracelet button functionality with clearer labeling"
        },
        {
          type: "bugfix",
          description: "Resolved QrCode component reference issues in patient detail view"
        },
        {
          type: "improvement",
          description: "Added required field validation for admission records and advanced directives"
        },
        {
          type: "improvement",
          description: "Enhanced form validation with better error handling and user feedback"
        }
      ]
    },
    {
      version: "2.3.0",
      date: "2025-07-04",
      changes: [
        {
          type: "feature",
          description: "Vital Signs Trend Analysis: Enhanced visualization of patient vital signs history with comprehensive trend charts for all vital measurements"
        },
        {
          type: "feature",
          description: "Last 5 readings summary table with formatted timestamps for better tracking of patient progress"
        },
        {
          type: "feature",
          description: "Trend analysis with automatic detection of improving/deteriorating patterns in vital signs"
        },
        {
          type: "feature",
          description: "Interactive mini-charts with detailed full-screen view for in-depth analysis"
        },
        {
          type: "improvement",
          description: "Enhanced Alert System with intelligent alert deduplication to prevent duplicate notifications"
        },
        {
          type: "improvement",
          description: "Advanced filtering by alert type and priority for better alert management"
        },
        {
          type: "improvement",
          description: "Rate-limiting for alert checks to prevent excessive processing and improve system performance"
        },
        {
          type: "improvement",
          description: "Improved real-time alert synchronization with better handling of similar alerts"
        },
        {
          type: "security",
          description: "New Security Settings Panel with password strength evaluation and visual indicators"
        },
        {
          type: "security",
          description: "Comprehensive password requirements enforcement for better account protection"
        },
        {
          type: "security",
          description: "Security status monitoring and recommendations for users"
        },
        {
          type: "security",
          description: "Preparation for future multi-factor authentication implementation"
        },
        {
          type: "improvement",
          description: "Fixed function return types for better type safety in database operations"
        },
        {
          type: "improvement",
          description: "Enhanced error handling in database operations for more reliable data management"
        },
        {
          type: "security",
          description: "Improved search path security for all database functions to prevent SQL injection"
        }
      ]
    },
    {
      version: "2.2.1",
      date: "2025-07-03",
      changes: [
        {
          type: "feature",
          description: "Added comprehensive demo content to the Admission Records tab with insurance information and attending physician"
        },
        {
          type: "feature",
          description: "Complete admission vital signs and measurements for better patient assessment"
        },
        {
          type: "feature",
          description: "Detailed social and family history sections for comprehensive patient profiles"
        },
        {
          type: "feature",
          description: "Emergency contacts with primary and secondary contact information"
        },
        {
          type: "feature",
          description: "Advance directives including living will, DNR status, and religious preferences"
        },
        {
          type: "feature",
          description: "Replaced image-based logo with custom Heart icon design for consistent branding"
        },
        {
          type: "improvement",
          description: "Split patient detail navigation tabs into two rows with color-coded sections"
        },
        {
          type: "improvement",
          description: "Standardized logo appearance across all components for better visual hierarchy"
        },
        {
          type: "bugfix",
          description: "Resolved invalid character error in diabetic care guidelines"
        },
        {
          type: "bugfix",
          description: "Eliminated image loading problems with custom icon solution"
        },
        {
          type: "improvement",
          description: "Enhanced JSX syntax compliance and error handling"
        }
      ]
    },
    {
      version: "2.2.0",
      date: "2025-07-01",
      changes: [
        {
          type: "feature",
          description: "Added comprehensive wound assessment system with interactive body diagrams for anterior and posterior views"
        },
        {
          type: "feature",
          description: "Implemented medication label generation with Avery 5160 compatibility for medication containers"
        },
        {
          type: "feature",
          description: "Added patient management system for super administrators with full CRUD operations"
        },
        {
          type: "feature",
          description: "Enhanced hospital bracelet design with professional medical appearance and security features"
        },
        {
          type: "improvement",
          description: "Enhanced authentication system with robust error handling and automatic session recovery"
        },
        {
          type: "improvement",
          description: "Added comprehensive code documentation and comments throughout the application"
        },
        {
          type: "improvement",
          description: "Reorganized patient detail interface with better barcode placement and medication tabs"
        },
        {
          type: "security",
          description: "Improved refresh token handling and automatic session cleanup for expired tokens"
        },
        {
          type: "bugfix",
          description: "Fixed authentication errors related to invalid refresh tokens and network connectivity issues"
        },
        {
          type: "bugfix",
          description: "Resolved barcode centering issues in patient bracelets and medication labels"
        }
      ]
    },
    {
      version: "2.1.0",
      date: "2025-06-20",
      changes: [
        {
          type: "feature",
          description: "Added patient label generation with Avery 5160 compatibility - print 30 identical labels per sheet"
        },
        {
          type: "feature",
          description: "Implemented vital signs trend analysis with interactive charts and historical data visualization"
        },
        {
          type: "improvement",
          description: "Enhanced patient detail view with reorganized layout and improved navigation"
        },
        {
          type: "improvement",
          description: "Updated patient labels button placement under patient ID for better workflow"
        },
        {
          type: "bugfix",
          description: "Fixed label spacing issues in print preview and generation"
        }
      ]
    },
    {
      version: "2.0.5",
      date: "2025-06-15",
      changes: [
        {
          type: "feature",
          description: "Added comprehensive user management system for admins and super admins"
        },
        {
          type: "feature",
          description: "Implemented role-based access control with nurse, admin, and super admin permissions"
        },
        {
          type: "security",
          description: "Enhanced authentication system with improved session management"
        },
        {
          type: "improvement",
          description: "Optimized database queries for faster patient data loading"
        },
        {
          type: "bugfix",
          description: "Resolved issue with vital signs not updating in real-time"
        }
      ]
    },
    {
      version: "2.0.0",
      date: "2025-06-10",
      changes: [
        {
          type: "feature",
          description: "Complete redesign of the patient management interface with modern UI components"
        },
        {
          type: "feature",
          description: "Added real-time alert system for medications, vital signs, and emergencies"
        },
        {
          type: "feature",
          description: "Implemented comprehensive vital signs tracking with automatic threshold monitoring"
        },
        {
          type: "improvement",
          description: "Enhanced mobile responsiveness across all device sizes"
        },
        {
          type: "security",
          description: "Upgraded to latest security protocols and encryption standards"
        }
      ]
    },
    {
      version: "1.8.2",
      date: "2025-06-05",
      changes: [
        {
          type: "feature",
          description: "Added medication scheduling and due time tracking"
        },
        {
          type: "improvement",
          description: "Improved patient search functionality with advanced filters"
        },
        {
          type: "bugfix",
          description: "Fixed issue with patient notes not saving properly"
        },
        {
          type: "bugfix",
          description: "Resolved medication alert timing inconsistencies"
        }
      ]
    }
  ];

  /**
   * Get icon component for change type
   * @param {string} type - The change type
   * @returns {React.ComponentType} Icon component
   */
  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'feature': return Plus;
      case 'bugfix': return Bug;
      case 'improvement': return Zap;
      case 'security': return Shield;
      case 'breaking': return Star;
      default: return FileText;
    }
  };

  /**
   * Get CSS classes for change type styling
   * @param {string} type - The change type
   * @returns {string} CSS classes
   */
  const getChangeColor = (type: string) => {
    switch (type) {
      case 'feature': return 'bg-green-100 text-green-800 border-green-200';
      case 'bugfix': return 'bg-red-100 text-red-800 border-red-200';
      case 'improvement': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'security': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'breaking': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /**
   * Get human-readable label for change type
   */
  const getChangeLabel = (type: string) => {
    switch (type) {
      case 'feature': return 'New Feature';
      case 'bugfix': return 'Bug Fix';
      case 'improvement': return 'Improvement';
      case 'security': return 'Security';
      case 'breaking': return 'Major Change';
      default: return 'Change';
    }
  };



  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileText className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Changelog</h1>
        </div>
        <div className="text-sm text-gray-500">
          Last 5 releases
        </div>
      </div>

      {/* Main Changelog Container */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Changelog Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Release history and updates</span>
          </div>
        </div>

        {/* Version Entries */}
        <div className="divide-y divide-gray-200">
          {changelogData.map((entry, index) => (
            <div key={entry.version} className={`p-6 ${entry.isMajor ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-l-4 border-orange-400' : ''}`}>
              {/* Version Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${entry.isMajor ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                      v{entry.version}
                    </span>
                    {entry.codename && (
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                        "{entry.codename}"
                      </span>
                    )}
                  </div>
                  <span className="text-gray-500 text-sm">
                    {format(new Date(entry.date), 'MMMM dd, yyyy')}
                  </span>
                  {index === 0 && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      Latest
                    </span>
                  )}
                  {entry.isMajor && (
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                      <Star className="h-3 w-3" />
                      <span>Major Release</span>
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedVersion(
                    selectedVersion === entry.version ? '' : entry.version
                  )}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {selectedVersion === entry.version ? 'Hide Details' : 'View Details'}
                </button>
              </div>

              {/* Change Type Summary */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                {['feature', 'improvement', 'bugfix', 'security', 'breaking'].map(type => {
                  const count = entry.changes.filter(change => change.type === type).length;
                  const Icon = getChangeIcon(type);
                  
                  return (
                    <div key={type} className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center space-x-2 mb-1">
                        <Icon className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {getChangeLabel(type)}s
                        </span>
                      </div>
                      <span className="text-2xl font-bold text-gray-900">{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Detailed Changes (Expandable) */}
              {selectedVersion === entry.version && (
                <div className="space-y-3">
                  {entry.changes.map((change, changeIndex) => {
                    const Icon = getChangeIcon(change.type);
                    
                    return (
                      <div key={changeIndex} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`p-2 rounded-full ${getChangeColor(change.type)}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getChangeColor(change.type)}`}>
                              {getChangeLabel(change.type)}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm leading-relaxed">
                            {change.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Summary when collapsed */}
              {selectedVersion !== entry.version && (
                <div className="text-sm text-gray-600">
                  {entry.changes.length} changes in this release
                  {entry.isMajor && (
                    <span className="ml-2 text-orange-600 font-medium">
                      • Major architecture overhaul with enterprise-grade improvements
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Release Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-3">
          <Users className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-medium text-blue-900">Release Information</h3>
        </div>
        <div className="text-blue-800 space-y-2 text-sm">
          <p>• <strong>Release Schedule:</strong> Major updates every 2-3 weeks, patches as needed</p>
          <p>• <strong>Maintenance Windows:</strong> Sundays 2:00 AM - 4:00 AM EST</p>
          <p>• <strong>Support:</strong> Contact IT helpdesk for issues with new features</p>
          <p>• <strong>Training:</strong> New feature training available upon request</p>
        </div>
      </div>

      {/* Major Release Highlight */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-3">
          <Star className="h-5 w-5 text-orange-600" />
          <h3 className="text-lg font-medium text-orange-900">Version 5.2.0-rc4 "OTTO" - Major Release Highlights</h3>
        </div>
        <div className="text-orange-800 space-y-2 text-sm">
          <p>• <strong>Lab Orders System:</strong> Complete specimen ordering with 40+ tests across 6 categories and 30+ collection sites</p>
          <p>• <strong>hacMap Integration:</strong> Visual device and wound tracking with interactive body diagrams</p>
          <p>• <strong>Simulation Enhancement:</strong> Lab orders and markers fully integrated into template/snapshot/reset workflow</p>
          <p>• <strong>Data Preservation:</strong> Complete clinical context maintained through simulations and backups</p>
          <p>• <strong>Zero Breaking Changes:</strong> 100% backward compatibility with comprehensive testing validation</p>
        </div>
      </div>

      {/* Upcoming Features Panel */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-green-900 mb-3">Upcoming Features (Version 5.x Series)</h3>
        <div className="text-green-800 space-y-2 text-sm">
          <p>• <strong>v5.1.0:</strong> Enhanced multi-factor authentication and advanced user management</p>
          <p>• <strong>v5.2.0:</strong> Real-time collaboration features and enhanced notification systems</p>
          <p>• <strong>v5.3.0:</strong> Advanced analytics dashboard with predictive patient care insights</p>
          <p>• <strong>v5.4.0:</strong> Integration with external healthcare systems and interoperability enhancements</p>
          <p>• <strong>v6.0.0:</strong> AI-powered clinical decision support and automated workflow optimization</p>
        </div>
      </div>
    </div>
  );
};

// Add default export for lazy loading
export default Changelog;