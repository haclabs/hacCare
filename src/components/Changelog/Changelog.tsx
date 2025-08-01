import React, { useState } from 'react';
import { FileText, Calendar, Plus, Bug, Zap, Shield, Users } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Changelog Entry Interface
 * Defines the structure of each changelog entry
 */
interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    type: 'feature' | 'bugfix' | 'improvement' | 'security';
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
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  /**
   * Changelog data
   * Contains all version history with categorized changes
   */
  const changelogData: ChangelogEntry[] = [
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
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /**
   * Get human-readable label for change type
   * @param {string} type - The change type
   * @returns {string} Human-readable label
   */
  const getChangeLabel = (type: string) => {
    switch (type) {
      case 'feature': return 'New Feature';
      case 'bugfix': return 'Bug Fix';
      case 'improvement': return 'Improvement';
      case 'security': return 'Security';
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
            <div key={entry.version} className="p-6">
              {/* Version Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    v{entry.version}
                  </span>
                  <span className="text-gray-500 text-sm">
                    {format(new Date(entry.date), 'MMMM dd, yyyy')}
                  </span>
                  {index === 0 && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      Latest
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedVersion(
                    selectedVersion === entry.version ? null : entry.version
                  )}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {selectedVersion === entry.version ? 'Hide Details' : 'View Details'}
                </button>
              </div>

              {/* Change Type Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {['feature', 'improvement', 'bugfix', 'security'].map(type => {
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

      {/* Upcoming Features Panel */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-yellow-900 mb-3">Upcoming Features</h3>
        <div className="text-yellow-800 space-y-2 text-sm">
          <p>• <strong>v2.5.0:</strong> Comprehensive patient education module</p>
          <p>• <strong>v2.6.0:</strong> Integration with laboratory systems</p>
          <p>• <strong>v2.7.0:</strong> Automated medication dispensing integration</p>
          <p>• <strong>v2.8.0:</strong> Advanced reporting and analytics dashboard</p>
        </div>
      </div>
    </div>
  );
};