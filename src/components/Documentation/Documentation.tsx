import React, { useState } from 'react';
import { BookOpen, Users, Activity, FileText, Shield, Search, ChevronRight, ChevronDown } from 'lucide-react';

export const Documentation: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>(['getting-started']);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const documentationSections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: BookOpen,
      content: [
        {
          title: 'Welcome to hacCare',
          content: `hacCare is a comprehensive hospital patient record system designed to streamline healthcare workflows and improve patient care. This documentation will guide you through all the features and functionality available in the system.`
        },
        {
          title: 'System Requirements',
          content: `• Modern web browser (Chrome, Firefox, Safari, Edge)
• Stable internet connection
• Valid user credentials provided by your administrator
• Recommended screen resolution: 1920x1080 or higher`
        },
        {
          title: 'First Login',
          content: `1. Navigate to the hacCare login page
2. Enter your email address and password
3. Click "Sign In" to access the system
4. If this is your first login, you may need to complete your profile setup`
        }
      ]
    },
    {
      id: 'patient-management',
      title: 'Patient Management',
      icon: Users,
      content: [
        {
          title: 'Viewing Patient List',
          content: `The main dashboard displays all patients assigned to you. Each patient card shows:
• Patient name, age, and gender
• Room and bed number
• Current condition status
• Recent vital signs
• Allergy alerts (if applicable)
• Number of active medications`
        },
        {
          title: 'Patient Details',
          content: `Click on any patient card to view detailed information:
• Complete patient demographics
• Emergency contact information
• Medical history and allergies
• Current vital signs with trends
• Active medications and schedules
• Nursing notes and assessments`
        },
        {
          title: 'Patient Labels',
          content: `Generate patient identification labels for medical records:
1. Open patient details
2. Click "Patient Labels" under the patient ID
3. Review label information
4. Print on Avery 5160 label sheets (30 labels per sheet)
5. Labels include: Name, Room, DOB, Allergies (in red), Patient ID with barcode`
        }
      ]
    },
    {
      id: 'vital-signs',
      title: 'Vital Signs Management',
      icon: Activity,
      content: [
        {
          title: 'Recording Vital Signs',
          content: `To update patient vital signs:
1. Navigate to patient details
2. Go to the "Vital Signs" tab
3. Click "Update Vitals"
4. Enter current measurements:
   • Temperature (°F)
   • Blood Pressure (systolic/diastolic)
   • Heart Rate (BPM)
   • Oxygen Saturation (%)
   • Respiratory Rate (breaths/min)
5. Save the readings`
        },
        {
          title: 'Vital Signs Trends',
          content: `View historical vital signs data:
• Click on "Vitals Trends" in the vital signs section
• View mini-charts for each vital sign
• Click any chart to see detailed trend analysis
• Historical data shows last 5 readings over 20 hours
• Identify patterns and changes in patient condition`
        },
        {
          title: 'Alert Thresholds',
          content: `The system automatically monitors for:
• Temperature above 101°F or below 96°F
• Blood pressure outside normal ranges
• Heart rate irregularities
• Low oxygen saturation levels
• Abnormal respiratory rates`
        }
      ]
    },
    {
      id: 'medications',
      title: 'Medication Management',
      icon: FileText,
      content: [
        {
          title: 'Viewing Medications',
          content: `Access patient medications through:
• Patient card summary (shows count of active medications)
• Patient details "Medications" tab
• Medication alerts in the notification panel`
        },
        {
          title: 'Medication Information',
          content: `Each medication entry includes:
• Medication name and dosage
• Administration frequency and route
• Prescribing physician
• Start date and duration
• Next scheduled administration time
• Current status (Active, Completed, Discontinued)`
        },
        {
          title: 'Medication Alerts',
          content: `The system provides alerts for:
• Medications due within the next hour
• Overdue medications
• Drug interaction warnings
• Allergy contraindications
• Dosage verification requirements`
        }
      ]
    },
    {
      id: 'alerts-notifications',
      title: 'Alerts & Notifications',
      icon: Shield,
      content: [
        {
          title: 'Alert Types',
          content: `hacCare monitors and alerts for:
• Medication Due: Upcoming or overdue medications
• Vital Signs Alert: Abnormal vital sign readings
• Emergency: Critical patient conditions
• Lab Results: New laboratory results available
• Discharge Ready: Patients ready for discharge`
        },
        {
          title: 'Managing Alerts',
          content: `To manage alerts:
1. Click the bell icon in the header to view alerts
2. Review active alerts by priority (Critical, High, Medium, Low)
3. Click "Acknowledge" to mark alerts as reviewed
4. Acknowledged alerts move to the "Acknowledged" section
5. Take appropriate action based on alert type`
        },
        {
          title: 'Alert Priorities',
          content: `• Critical: Immediate attention required (red)
• High: Urgent attention needed (orange)
• Medium: Important but not urgent (yellow)
• Low: Informational (blue)`
        }
      ]
    },
    {
      id: 'user-roles',
      title: 'User Roles & Permissions',
      icon: Shield,
      content: [
        {
          title: 'Nurse Role',
          content: `Nurses can:
• View assigned patients
• Update vital signs
• Add nursing notes
• Acknowledge alerts
• Generate patient labels
• View medication schedules`
        },
        {
          title: 'Admin Role',
          content: `Admins can:
• All nurse capabilities
• Manage user accounts
• Create new users
• Edit user profiles
• Activate/deactivate users
• View all patients in the system`
        },
        {
          title: 'Super Admin Role',
          content: `Super Admins can:
• All admin capabilities
• Delete user accounts
• Modify user roles
• Access system settings
• Manage hospital-wide configurations`
        }
      ]
    }
  ];

  const filteredSections = documentationSections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.content.some(item => 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BookOpen className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Documentation</h1>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredSections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSections.includes(section.id);
            
            return (
              <div key={section.id} className="p-6">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between text-left hover:bg-gray-50 p-3 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-6 w-6 text-blue-600" />
                    <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-4 space-y-6">
                    {section.content.map((item, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">{item.title}</h3>
                        <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                          {item.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredSections.length === 0 && (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No documentation found matching your search</p>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">Need Additional Help?</h3>
        <div className="text-blue-800 space-y-2">
          <p>• Contact your system administrator for account issues</p>
          <p>• Report bugs or feature requests to the IT department</p>
          <p>• For emergency technical support, call the hospital IT helpdesk</p>
          <p>• Training sessions are available for new users</p>
        </div>
      </div>
    </div>
  );
};

// Add default export for lazy loading
export default Documentation;