import React, { useState, useEffect } from 'react';
import { 
  Copy, 
  Download, 
  Upload, 
  Eye, 
  Play, 
  Edit, 
  Trash2, 
  Plus,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Users
} from 'lucide-react';
import { SimulationSubTenantService } from '../../lib/simulationSubTenantService';
import PatientTemplateEditor from './PatientTemplateEditor';

interface TemplateManagementProps {
  currentTenantId: string;
  scenarioId: string;
  scenarioName: string;
  onClose: () => void;
}

interface PatientTemplate {
  id?: string;
  scenario_template_id: string;
  template_name: string;
  patient_name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  date_of_birth?: string;
  room_number?: string;
  bed_number?: string;
  diagnosis: string;
  condition: 'Critical' | 'Stable' | 'Improving' | 'Discharged';
  allergies?: string[];
  blood_type?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  assigned_nurse?: string;
  created_at?: string;
  updated_at?: string;
  vitals_count?: number;
  medications_count?: number;
  notes_count?: number;
}

export const TemplateManagement: React.FC<TemplateManagementProps> = ({
  currentTenantId,
  scenarioId,
  scenarioName,
  onClose
}) => {
  const [templates, setTemplates] = useState<PatientTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<PatientTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PatientTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [scenarioId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const templateData = await SimulationSubTenantService.getPatientTemplates(scenarioId);
      
      console.log('Raw template data:', templateData);
      
      // Enhance templates with counts
      const enhancedTemplates = templateData.map(template => {
        console.log('Processing template:', template.template_name);
        console.log('Vitals data:', template.patient_vitals_templates);
        console.log('Medications data:', template.patient_medications_templates);
        console.log('Notes data:', template.patient_notes_templates);
        
        return {
          ...template,
          vitals_count: template.patient_vitals_templates?.length || 0,
          medications_count: template.patient_medications_templates?.length || 0,
          notes_count: template.patient_notes_templates?.length || 0
        };
      });
      
      console.log('Enhanced templates:', enhancedTemplates);
      setTemplates(enhancedTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowEditor(true);
  };

  const handleEditTemplate = (template: PatientTemplate) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      await SimulationSubTenantService.deletePatientTemplate(templateId);
      console.log('Template deleted successfully:', templateId);
      await loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const handleDuplicateTemplate = async (template: PatientTemplate) => {
    try {
      const duplicatedTemplate = {
        ...template,
        template_name: `${template.template_name} (Copy)`,
        patient_name: `${template.patient_name} (Copy)`
      };
      
      // In a real implementation, you would duplicate the template
      console.log('Duplicating template:', duplicatedTemplate);
      await loadTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      alert('Failed to duplicate template');
    }
  };

  const handleExportTemplate = (template: PatientTemplate) => {
    // Export template as JSON
    const exportData = {
      template,
      exported_at: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.template_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePreviewTemplate = (template: PatientTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleInstantiateTemplate = async (template: PatientTemplate) => {
    if (!confirm(`Create simulation patients from this template? This will add "${template.patient_name}" to your simulation.`)) {
      return;
    }

    try {
      // This would be called when creating a simulation
      console.log('Instantiating template:', template);
      alert('Template instantiation would happen during simulation creation');
    } catch (error) {
      console.error('Error instantiating template:', error);
      alert('Failed to instantiate template');
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'stable': return 'text-green-600 bg-green-100';
      case 'improving': return 'text-blue-600 bg-blue-100';
      case 'discharged': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading templates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Patient Templates</h2>
          <p className="text-gray-600">Scenario: {scenarioName}</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleCreateTemplate}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Create Template</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Back to Scenarios
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Yet</h3>
          <p className="text-gray-600 mb-6">Create your first patient template to get started.</p>
          <button
            onClick={handleCreateTemplate}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Create First Template</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              {/* Template Card Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900 truncate">{template.template_name}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConditionColor(template.condition)}`}>
                    {template.condition}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{template.patient_name}</p>
                <p className="text-xs text-gray-500">{template.age} years • {template.gender}</p>
              </div>

              {/* Template Content */}
              <div className="p-4">
                <p className="text-sm text-gray-700 mb-4 line-clamp-2">{template.diagnosis}</p>
                
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">{template.vitals_count}</div>
                    <div className="text-xs text-gray-500">Vitals</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">{template.medications_count}</div>
                    <div className="text-xs text-gray-500">Meds</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-purple-600">{template.notes_count}</div>
                    <div className="text-xs text-gray-500">Notes</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => handlePreviewTemplate(template)}
                    className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    title="Preview"
                  >
                    <Eye className="h-3 w-3" />
                    <span>Preview</span>
                  </button>
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    title="Edit"
                  >
                    <Edit className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDuplicateTemplate(template)}
                    className="flex items-center space-x-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                    title="Duplicate"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={() => handleExportTemplate(template)}
                    className="flex items-center space-x-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                    title="Export"
                  >
                    <Download className="h-3 w-3" />
                    <span>Export</span>
                  </button>
                  <button
                    onClick={() => handleInstantiateTemplate(template)}
                    className="flex items-center space-x-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                    title="Use in Simulation"
                  >
                    <Play className="h-3 w-3" />
                    <span>Use</span>
                  </button>
                  <button
                    onClick={() => template.id && handleDeleteTemplate(template.id)}
                    className="flex items-center space-x-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 rounded-b-lg">
                <div className="flex justify-between items-center">
                  <span>Updated {template.updated_at ? new Date(template.updated_at).toLocaleDateString() : 'Unknown'}</span>
                  <Clock className="h-3 w-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Patient Template Editor Modal */}
      {showEditor && (
        <PatientTemplateEditor
          scenarioId={scenarioId}
          onClose={() => {
            setShowEditor(false);
            setEditingTemplate(null);
          }}
          onSave={() => {
            loadTemplates();
            setShowEditor(false);
            setEditingTemplate(null);
          }}
          editingTemplate={editingTemplate || undefined}
        />
      )}

      {/* Template Preview Modal */}
      {showPreview && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Template Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Template Name</label>
                  <p className="text-gray-900">{selectedTemplate.template_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Patient Name</label>
                  <p className="text-gray-900">{selectedTemplate.patient_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Age</label>
                  <p className="text-gray-900">{selectedTemplate.age} years</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Gender</label>
                  <p className="text-gray-900">{selectedTemplate.gender}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Diagnosis</label>
                  <p className="text-gray-900">{selectedTemplate.diagnosis}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedTemplate.vitals_count}</div>
                  <div className="text-sm text-gray-600">Vital Signs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{selectedTemplate.medications_count}</div>
                  <div className="text-sm text-gray-600">Medications</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{selectedTemplate.notes_count}</div>
                  <div className="text-sm text-gray-600">Notes</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateManagement;