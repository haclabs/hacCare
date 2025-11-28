// Labs Main Component
// Displays lab panels with tab navigation (All/Chemistry/ABG/Hematology/Order Entry)

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, FlaskConical, Activity, Droplet, AlertCircle, FileText, Trash2 } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../contexts/TenantContext';
import {
  getLabPanels,
  getLabResults,
  hasUnacknowledgedLabs,
  deleteLabPanel,
} from '../../../services/clinical/labService';
import { getLabOrders } from '../../../services/clinical/labOrderService';
import type { LabPanel, LabCategory } from '../../../features/clinical/types/labs';
import type { LabOrder } from '../../../features/clinical/types/labOrders';
import { LAB_CATEGORY_TABS, getStatusLabel, getStatusColorClass } from '../../../features/clinical/types/labs';
import { LabPanelDetail } from './LabPanelDetail';
import { CreateLabPanelModal } from './CreateLabPanelModal';
import { LabOrderEntryForm } from './LabOrderEntryForm';
import { LabOrderCard } from './LabOrderCard';
import { LabOrderLabelModal } from './LabOrderLabelModal';
import { format24HourDateTime } from '../../../utils/time';

interface LabsProps {
  patientId: string;
  patientNumber?: string;
  patientName?: string;
  patientDOB?: string;
  onLabsChange?: () => void;
}

export const Labs: React.FC<LabsProps> = ({ patientId, patientNumber, patientName, patientDOB, onLabsChange }) => {
  const { hasRole } = useAuth();
  const { currentTenant } = useTenant();
  const [activeTab, setActiveTab] = useState<LabCategory | 'all' | 'order'>('all');
  const [panels, setPanels] = useState<LabPanel[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [selectedPanel, setSelectedPanel] = useState<LabPanel | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasNewLabs, setHasNewLabs] = useState(false);

  const isAdmin = hasRole('admin') || hasRole('super_admin');

  const loadPanels = useCallback(async () => {
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
  }, [patientId, currentTenant]);

  const loadLabOrders = useCallback(async () => {
    if (!currentTenant) return;

    const { data, error: err } = await getLabOrders(patientId, currentTenant.id);

    if (err) {
      console.error('Failed to load lab orders:', err);
    } else {
      setLabOrders(data || []);
    }
  }, [patientId, currentTenant]);

  const checkForNewLabs = useCallback(async () => {
    if (!currentTenant) return;

    const { hasUnacked } = await hasUnacknowledgedLabs(patientId, currentTenant.id);
    setHasNewLabs(hasUnacked);
  }, [patientId, currentTenant]);

  useEffect(() => {
    loadPanels();
    loadLabOrders();
    checkForNewLabs();
  }, [loadPanels, loadLabOrders, checkForNewLabs]);

  const handlePanelCreated = () => {
    loadPanels();
    setShowCreateModal(false);
  };

  const handlePanelUpdated = () => {
    loadPanels();
    loadLabOrders();
    checkForNewLabs();
    onLabsChange?.();
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

  const filteredPanels = panels.filter(() => {
    if (activeTab === 'all' || activeTab === 'order') return true;
    return true;
  });

  if (selectedPanel) {
    return (
      <LabPanelDetail
        panel={selectedPanel}
        patientId={patientId}
        patientNumber={patientNumber}
        patientName={patientName}
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
      {/* Header */}
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
          <p className="text-gray-600 mt-1">
            Patient: {patientNumber || patientId}
            {patientName && ` - ${patientName}`}
          </p>
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

      {/* Tabs */}
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
          <button
            onClick={() => setActiveTab('order')}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors border-2
              ${
                activeTab === 'order'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300'
              }
            `}
          >
            <FileText className="w-4 h-4" />
            Enter Lab Order
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'order' ? (
        <LabOrderEntryForm
          patientId={patientId}
          patientName={patientName || 'Unknown Patient'}
          patientNumber={patientNumber || patientId}
          patientDOB={patientDOB || ''}
          onSuccess={() => {
            loadLabOrders(); // Reload orders after creating new one
            setActiveTab('all');
          }}
        />
      ) : (
        <>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-500">Loading labs...</p>
            </div>
          ) : filteredPanels.length === 0 && labOrders.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FlaskConical className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No lab panels or orders found</p>
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
            <div className="space-y-4">
              {/* Lab Orders Section */}
              {labOrders.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
                  {labOrders.map((order) => (
                    <LabOrderCard
                      key={order.id}
                      order={order}
                      onClick={() => setSelectedOrder(order)}
                    />
                  ))}
                </div>
              )}

              {/* Lab Panels Section */}
              {filteredPanels.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
                  {filteredPanels.map((panel) => (
                    <PanelCard
                      key={panel.id}
                      panel={panel}
                      onClick={() => setSelectedPanel(panel)}
                      onDelete={async () => {
                        if (confirm('Delete this lab panel and all its results? This cannot be undone.')) {
                          const { error } = await deleteLabPanel(panel.id);
                          if (error) {
                            alert('Failed to delete panel: ' + error.message);
                          } else {
                            loadPanels();
                          }
                        }
                      }}
                      isSuperAdmin={hasRole('super_admin')}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Create Panel Modal */}
      {showCreateModal && (
        <CreateLabPanelModal
          patientId={patientId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handlePanelCreated}
        />
      )}

      {/* Lab Order Label Modal */}
      {selectedOrder && (
        <LabOrderLabelModal
          order={selectedOrder}
          patientName={patientName || 'Unknown Patient'}
          patientNumber={patientNumber || patientId}
          patientDOB={patientDOB || ''}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
};

// Panel Card Component
interface PanelCardProps {
  panel: LabPanel;
  onClick: () => void;
  onDelete?: () => void;
  isSuperAdmin?: boolean;
}

const PanelCard: React.FC<PanelCardProps> = ({ panel, onClick, onDelete, isSuperAdmin }) => {
  const [resultStats, setResultStats] = useState<{
    total: number;
    abnormal: number;
    critical: number;
  }>({ total: 0, abnormal: 0, critical: 0 });

  const loadResultStats = useCallback(async () => {
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
  }, [panel.id]);

  useEffect(() => {
    loadResultStats();
  }, [loadResultStats]);

  return (
    <div
      onClick={onClick}
      className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h4 className="text-lg font-medium text-gray-900">
              {format24HourDateTime(panel.panel_time)}
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
