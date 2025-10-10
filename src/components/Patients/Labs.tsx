// Labs Main Component
// Displays lab panels with tab navigation (All/Chemistry/ABG/Hematology)

import React, { useState, useEffect } from 'react';
import { Plus, FlaskConical, Activity, Droplet, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../contexts/TenantContext';
import {
  getLabPanels,
  getLabResults,
  hasUnacknowledgedLabs,
} from '../../lib/labService';
import type { LabPanel, LabResult, LabCategory } from '../../types/labs';
import { LAB_CATEGORY_TABS, getStatusLabel, getStatusColorClass } from '../../types/labs';
import { LabPanelDetail } from './LabPanelDetail';
import { CreateLabPanelModal } from './CreateLabPanelModal';

interface LabsProps {
  patientId: string;
  onLabsChange?: () => void;
}

export const Labs: React.FC<LabsProps> = ({ patientId, onLabsChange }) => {
  const { hasRole } = useAuth();
  const { currentTenant } = useTenant();
  const [activeTab, setActiveTab] = useState<LabCategory | 'all'>('all');
  const [panels, setPanels] = useState<LabPanel[]>([]);
  const [selectedPanel, setSelectedPanel] = useState<LabPanel | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasNewLabs, setHasNewLabs] = useState(false);

  const isAdmin = hasRole('admin') || hasRole('super_admin');

  useEffect(() => {
    loadPanels();
    checkForNewLabs();
  }, [patientId, currentTenant]);

  const loadPanels = async () => {
    if (!currentTenant) return;

    setLoading(true);
    setError('');

    const { data, error: err } = await getLabPanels(patientId, currentTenant.id);

    if (err) {
      setError('Failed to load lab panels');
      console.error(err);
    } else {
      setPanels(data || []);
    }

    setLoading(false);
  };

  const checkForNewLabs = async () => {
    if (!currentTenant) return;

    const { hasUnacked } = await hasUnacknowledgedLabs(patientId, currentTenant.id);
    setHasNewLabs(hasUnacked);
  };

  const handlePanelCreated = () => {
    loadPanels();
    setShowCreateModal(false);
  };

  const handlePanelUpdated = () => {
    loadPanels();
    checkForNewLabs();
    onLabsChange?.(); // Notify parent component
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'chemistry':
        return <FlaskConical className="w-4 h-4" />;
      case 'abg':
        return <Activity className="w-4 h-4" />;
      case 'hematology':
        return <Droplet className="w-4 h-4" />;
      default:
        return <FlaskConical className="w-4 h-4" />;
    }
  };

  const filteredPanels = panels.filter(panel => {
    if (activeTab === 'all') return true;
    // We'll need to check if panel has results in this category
    // For now, show all panels in all tabs
    return true;
  });

  if (selectedPanel) {
    return (
      <LabPanelDetail
        panel={selectedPanel}
        patientId={patientId}
        onBack={() => {
          setSelectedPanel(null);
          handlePanelUpdated();
        }}
        onUpdate={handlePanelUpdated}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with tabs and actions */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <FlaskConical className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Laboratory Results</h2>
            {hasNewLabs && (
              <span className="px-3 py-1 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                New Labs
              </span>
            )}
          </div>
          <p className="text-gray-600 mt-1">Patient: {patientId}</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Panel
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-2">
          {LAB_CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors
                ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {tab.category && getCategoryIcon(tab.category)}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading labs...</p>
        </div>
      ) : filteredPanels.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FlaskConical className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No lab panels found</p>
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Create first panel
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
          {filteredPanels.map((panel) => (
            <PanelCard
              key={panel.id}
              panel={panel}
              onClick={() => setSelectedPanel(panel)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <CreateLabPanelModal
          patientId={patientId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handlePanelCreated}
        />
      )}
    </div>
  );
};

// Panel card component
interface PanelCardProps {
  panel: LabPanel;
  onClick: () => void;
}

const PanelCard: React.FC<PanelCardProps> = ({ panel, onClick }) => {
  const [resultStats, setResultStats] = useState<{
    total: number;
    abnormal: number;
    critical: number;
  }>({ total: 0, abnormal: 0, critical: 0 });

  useEffect(() => {
    loadResultStats();
  }, [panel.id]);

  const loadResultStats = async () => {
    const { data: results } = await getLabResults(panel.id);
    if (results) {
      const abnormal = results.filter(r => 
        r.flag === 'abnormal_high' || r.flag === 'abnormal_low'
      ).length;
      const critical = results.filter(r => 
        r.flag === 'critical_high' || r.flag === 'critical_low'
      ).length;
      
      setResultStats({
        total: results.length,
        abnormal,
        critical,
      });
    }
  };

  return (
    <div
      onClick={onClick}
      className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h4 className="text-lg font-medium text-gray-900">
              {new Date(panel.panel_time).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </h4>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColorClass(
                panel.status
              )}`}
            >
              {getStatusLabel(panel.status)}
            </span>
            {resultStats.critical > 0 && (
              <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center space-x-1">
                <AlertCircle className="h-3 w-3" />
                <span>CRITICAL</span>
              </span>
            )}
            {resultStats.abnormal > 0 && resultStats.critical === 0 && (
              <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                ABNORMAL
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>
              <span className="font-medium">{resultStats.total}</span> tests
            </span>
            {resultStats.abnormal > 0 && (
              <span className="text-yellow-600">
                <span className="font-medium">{resultStats.abnormal}</span> abnormal
              </span>
            )}
            {resultStats.critical > 0 && (
              <span className="text-red-600">
                <span className="font-medium">{resultStats.critical}</span> critical
              </span>
            )}
          </div>

          {panel.notes && (
            <p className="mt-2 text-sm text-gray-500">{panel.notes}</p>
          )}
        </div>

        <div className="text-right">
          {panel.entered_by_name && (
            <>
              <p className="text-sm font-medium text-gray-900">Entered by:</p>
              <p className="text-sm text-gray-600">{panel.entered_by_name}</p>
            </>
          )}
          {panel.source && (
            <p className="text-sm text-gray-500 mt-1">{panel.source}</p>
          )}
        </div>
      </div>
    </div>
  );
};
