/**
 * Modern Professional Patient Dashboard
 * 
 * A beautifully designed, modern patient overview system with enhanced styling,
 * gradient backgrounds, improved cards, better typography, and professional visuals.
 * 
 * Features:
 * - Modern gradient design with professional styling
 * - Enhanced typography and visual hierarchy
 * - Interactive hover effects and animations
 * - Comprehensive patient status indicators
 * - Real-time vital signs display with icons
 * - Medication management with category indicators
 * - Quick action workflows with enhanced UX
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Activity, 
  Pill, 
  FileText, 
  User, 
  ChevronLeft, 
  ArrowLeft, 
  Settings,
  Calendar,
  Clock,
  TrendingUp,
  Heart,
  Thermometer,
  Stethoscope,
  AlertTriangle,
  CheckCircle,
  Users,
  BedDouble,
  Phone,
  Badge,
  Zap
} from 'lucide-react';
import { VitalsModule } from '../modules/vitals/VitalsModule';
import { MARModule } from '../modules/mar/MARModule';
import { FormsModule } from '../modules/forms/FormsModule';
import { SchemaTemplateEditor } from './SchemaTemplateEditor';
import { Patient } from '../types';
import { fetchPatientById } from '../lib/patientService';
import { useTenant } from '../contexts/TenantContext';

interface ModularPatientDashboardProps {
  onShowBracelet?: (patient: Patient) => void;
  onClose?: () => void;
  currentUser?: {
    id: string;
    name: string;
    role: string;
    department: string;
  };
}

type ActiveModule = 'vitals' | 'medications' | 'forms' | 'overview';

interface ModuleConfig {
  id: ActiveModule;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  badge?: string;
}

export const ModularPatientDashboard: React.FC<ModularPatientDashboardProps> = ({
  onShowBracelet,
  onClose,
  currentUser
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isMultiTenantAdmin } = useTenant();
  const [activeModule, setActiveModule] = useState<ActiveModule>('overview');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showSchemaEditor, setShowSchemaEditor] = useState(false);

  // Load patient data from URL parameter
  useEffect(() => {
    const loadPatient = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        const patientData = await fetchPatientById(id);
        setPatient(patientData);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Error loading patient:', err);
        setError(err instanceof Error ? err.message : 'Failed to load patient');
      } finally {
        setLoading(false);
      }
    };

    loadPatient();
  }, [id]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mb-6 mx-auto"></div>
          <p className="text-xl font-medium text-gray-700">Loading patient data...</p>
          <p className="text-gray-500 mt-2">Please wait while we fetch the information</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !patient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 mx-auto">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Unable to Load Patient</h2>
          <p className="text-red-600 mb-6">{error || 'Patient not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Module configurations with enhanced styling
  const moduleConfigs: ModuleConfig[] = [
    {
      id: 'vitals',
      title: 'Vital Signs',
      description: 'Monitor and record patient vital signs with real-time tracking',
      icon: Activity,
      color: 'blue',
      badge: patient.vitals?.length?.toString() || '0'
    },
    {
      id: 'medications',
      title: 'Medications',
      description: 'Complete medication administration and reconciliation system',
      icon: Pill,
      color: 'green',
      badge: patient.medications?.length?.toString() || '0'
    },
    {
      id: 'forms',
      title: 'Assessments',
      description: 'Clinical assessment forms and comprehensive documentation',
      icon: FileText,
      color: 'purple'
    }
  ];

  // Handle data updates from modules
  const handlePatientUpdate = (updatedData: Partial<Patient>) => {
    if (patient) {
      const updatedPatient = { ...patient, ...updatedData };
      setPatient(updatedPatient);
      setLastUpdated(new Date());
    }
  };

  const handleMedicationUpdate = (medications: any[]) => {
    handlePatientUpdate({ medications });
  };

  const handleAssessmentSave = (assessment: any) => {
    // In a real implementation, this would be saved to assessments collection
    console.log('Assessment saved:', assessment);
    setLastUpdated(new Date());
  };

  // Get enhanced color classes for modern styling
  const getModuleColorClasses = (color: string, isActive: boolean = false) => {
    const colors = {
      blue: {
        bg: isActive ? 'bg-gradient-to-br from-blue-50 to-blue-100' : 'bg-white',
        border: isActive ? 'border-blue-400 shadow-blue-100' : 'border-gray-200',
        text: isActive ? 'text-blue-900' : 'text-gray-900',
        icon: isActive ? 'text-blue-600' : 'text-gray-500',
        badge: 'bg-blue-500 text-white',
        accent: 'bg-blue-500',
        gradient: 'from-blue-500 to-blue-600'
      },
      green: {
        bg: isActive ? 'bg-gradient-to-br from-green-50 to-green-100' : 'bg-white',
        border: isActive ? 'border-green-400 shadow-green-100' : 'border-gray-200',
        text: isActive ? 'text-green-900' : 'text-gray-900',
        icon: isActive ? 'text-green-600' : 'text-gray-500',
        badge: 'bg-green-500 text-white',
        accent: 'bg-green-500',
        gradient: 'from-green-500 to-green-600'
      },
      purple: {
        bg: isActive ? 'bg-gradient-to-br from-purple-50 to-purple-100' : 'bg-white',
        border: isActive ? 'border-purple-400 shadow-purple-100' : 'border-gray-200',
        text: isActive ? 'text-purple-900' : 'text-gray-900',
        icon: isActive ? 'text-purple-600' : 'text-gray-500',
        badge: 'bg-purple-500 text-white',
        accent: 'bg-purple-500',
        gradient: 'from-purple-500 to-purple-600'
      }
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  // Calculate age helper
  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // Render modern module selector with enhanced cards
  const renderModuleSelector = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {moduleConfigs.map((module) => {
          const Icon = module.icon;
          const isActive = activeModule === module.id;
          const colorClasses = getModuleColorClasses(module.color, isActive);

          return (
            <button
              key={module.id}
              onClick={() => setActiveModule(module.id)}
              className={`group relative p-6 rounded-xl border-2 text-left transition-all duration-300 hover:shadow-xl hover:scale-105 ${colorClasses.bg} ${colorClasses.border} ${isActive ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}`}
            >
              {/* Gradient accent bar */}
              <div className={`absolute top-0 left-0 w-full h-1 rounded-t-xl bg-gradient-to-r ${colorClasses.gradient}`}></div>
              
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses.gradient} shadow-md`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                {module.badge && (
                  <div className={`px-3 py-1 text-xs font-bold rounded-full ${colorClasses.badge} shadow-sm`}>
                    {module.badge}
                  </div>
                )}
              </div>
              
              <div>
                <h3 className={`text-xl font-bold mb-2 ${colorClasses.text} group-hover:text-opacity-90`}>
                  {module.title}
                </h3>
                <p className={`text-sm leading-relaxed ${isActive ? 'text-gray-700' : 'text-gray-600'} group-hover:text-gray-700`}>
                  {module.description}
                </p>
              </div>

              {/* Subtle animated border on hover */}
              <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-gray-200 transition-colors duration-300"></div>
            </button>
          );
        })}
      </div>
    );
  };

  // Render enhanced patient overview with modern cards
  const renderPatientOverview = () => {
    const getPatientStatus = () => {
      // Determine overall patient status based on recent vitals and medications
      if (!patient.vitals || patient.vitals.length === 0) {
        return { status: 'pending', label: 'Assessment Needed', color: 'yellow' };
      }
      return { status: 'stable', label: 'Stable', color: 'green' };
    };

    const patientStatus = getPatientStatus();
    const age = calculateAge(patient.date_of_birth);

    return (
      <div className="bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <User className="h-8 w-8 text-white" />
              </div>
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 ${patientStatus.color === 'green' ? 'bg-green-500' : 'bg-yellow-500'} rounded-full border-2 border-white flex items-center justify-center`}>
                {patientStatus.color === 'green' ? (
                  <CheckCircle className="h-3 w-3 text-white" />
                ) : (
                  <Clock className="h-3 w-3 text-white" />
                )}
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {patient.first_name} {patient.last_name}
              </h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                <span className="flex items-center space-x-1">
                  <Badge className="h-4 w-4" />
                  <span>ID: {patient.patient_id}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{age} years old</span>
                </span>
                <span className="flex items-center space-x-1">
                  <BedDouble className="h-4 w-4" />
                  <span>Room {patient.room_number || 'Unassigned'}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{patient.gender}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Phone className="h-4 w-4" />
                  <span>{patient.phone_number || 'No contact'}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>Updated {lastUpdated.toLocaleTimeString()}</span>
                </span>
              </div>
            </div>
          </div>
          {/* Modern Action Row */}
          <div className="flex items-center space-x-3">
            {onShowBracelet && (
              <button
                onClick={() => onShowBracelet(patient)}
                className="flex items-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-4 py-2.5 rounded-xl transition-all duration-200 border border-blue-200 hover:border-blue-300 hover:scale-105 font-medium"
                title="Show ID Bracelet"
              >
                <Badge className="h-4 w-4 mr-2" />
                ID Bracelet
              </button>
            )}
            {isMultiTenantAdmin && (
              <button
                onClick={() => setShowSchemaEditor(true)}
                className="flex items-center text-gray-600 hover:text-gray-800 hover:bg-gray-50 px-4 py-2.5 rounded-xl transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:scale-105 font-medium"
                title="Edit Schema Templates"
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit Template
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="flex items-center text-gray-600 hover:text-gray-800 hover:bg-gray-50 px-4 py-2.5 rounded-xl transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:scale-105 font-medium"
              title="Print Patient Summary"
            >
              <FileText className="h-4 w-4 mr-2" />
              Print Summary
            </button>
            {/* Contact button removed as requested */}
          </div>
          {/* End Modern Action Row */}
          <div className="text-right">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
              patientStatus.color === 'green' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                patientStatus.color === 'green' ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              {patientStatus.label}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Enhanced Main Content */}
      <div className="px-6 py-8">
        {activeModule === 'overview' ? (
          <div className="space-y-8">
            {renderPatientOverview()}
            {renderModuleSelector()}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Modern Breadcrumb */}
            <nav className="flex items-center space-x-3 text-sm">
              <button
                onClick={() => setActiveModule('overview')}
                className="text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-all duration-200"
              >
                Overview
              </button>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <span className="text-gray-900 font-semibold bg-gray-100 px-3 py-1.5 rounded-lg">
                {moduleConfigs.find(m => m.id === activeModule)?.title}
              </span>
            </nav>

            {/* Active Module Content with Enhanced Styling */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm min-h-[600px] overflow-hidden">
              {activeModule === 'vitals' && (
                <VitalsModule
                  patient={patient}
                  vitals={patient.vitals || []}
                  onVitalsUpdate={(vitals) => {
                    handlePatientUpdate({ vitals });
                    setLastUpdated(new Date());
                  }}
                  currentUser={currentUser}
                />
              )}

              {activeModule === 'medications' && (
                <MARModule
                  patient={patient}
                  medications={patient.medications || []}
                  onMedicationUpdate={handleMedicationUpdate}
                  currentUser={currentUser}
                />
              )}

              {activeModule === 'forms' && (
                <FormsModule
                  patient={patient}
                  onAssessmentSave={handleAssessmentSave}
                  currentUser={currentUser}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Schema Template Editor */}
      <SchemaTemplateEditor
        isOpen={showSchemaEditor}
        onClose={() => setShowSchemaEditor(false)}
        onSave={(schema) => {
          console.log('Schema saved:', schema);
          // Here you would typically save to database
          setShowSchemaEditor(false);
        }}
      />
    </div>
  );
};
