// Lab Panel Detail View
// Shows results table with CRUD for admins and acknowledge for nurses

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Check,
  AlertTriangle,
  FlaskConical,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../contexts/TenantContext';
import {
  getLabResults,
  deleteLabResult,
  deleteLabPanel,
  createStandardLabSet,
  getEffectiveRangeDisplay,
} from '../../lib/labService';
import type { LabPanel, LabResult, LabCategory } from '../../types/labs';
import {
  LAB_CATEGORY_TABS,
  getFlagLabel,
  getFlagColorClass,
  getStatusLabel,
  getStatusColorClass,
} from '../../types/labs';
import { CreateLabResultModal } from './CreateLabResultModal';
import { EditLabResultModal } from './EditLabResultModal';
import { LabAcknowledgeModal } from './LabAcknowledgeModal';

interface LabPanelDetailProps {
  panel: LabPanel;
  patientId: string;
  onBack: () => void;
  onUpdate: () => void;
}

export const LabPanelDetail: React.FC<LabPanelDetailProps> = ({
  panel,
  patientId,
  onBack,
  onUpdate,
}) => {
  const { hasRole } = useAuth();
  const { currentTenant } = useTenant();
  const [results, setResults] = useState<LabResult[]>([]);
  const [activeTab, setActiveTab] = useState<LabCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAckModal, setShowAckModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<LabResult | null>(null);

  const isAdmin = hasRole('admin') || hasRole('super_admin');
  const canAcknowledge = panel.status !== 'acknowledged' && panel.ack_required;

  useEffect(() => {
    loadResults();
  }, [panel.id]);

  const loadResults = async () => {
    setLoading(true);
    const { data, error } = await getLabResults(panel.id);
    
    if (error) {
      console.error('Failed to load results:', error);
    } else {
      setResults(data || []);
    }
    
    setLoading(false);
  };

  const handleDeleteResult = async (resultId: string) => {
    if (!confirm('Delete this lab result?')) return;

    const { error } = await deleteLabResult(resultId);
    
    if (error) {
      alert('Failed to delete result');
    } else {
      loadResults();
      onUpdate();
    }
  };

  const handleDeletePanel = async () => {
    if (!confirm('Delete this entire lab panel and all results?')) return;

    const { error } = await deleteLabPanel(panel.id);
    
    if (error) {
      alert('Failed to delete panel');
    } else {
      onBack();
    }
  };

  const handleAddStandardSet = async (category: LabCategory) => {
    if (!currentTenant) return;
    
    if (!confirm(`Add standard ${category.toUpperCase()} test set?`)) return;

    const { error } = await createStandardLabSet(
      panel.id,
      category,
      patientId,
      currentTenant.id
    );

    if (error) {
      alert('Failed to add standard set');
    } else {
      loadResults();
      onUpdate();
    }
  };

  const handleResultCreated = () => {
    loadResults();
    onUpdate();
    setShowCreateModal(false);
  };

  const handleResultUpdated = () => {
    loadResults();
    onUpdate();
    setShowEditModal(false);
    setSelectedResult(null);
  };

  const handleAcknowledged = () => {
    loadResults();
    onUpdate();
    setShowAckModal(false);
  };

  const filteredResults = results.filter(r => 
    activeTab === 'all' ? true : r.category === activeTab
  );

  const unackedResults = results.filter(r => !r.ack_at);
  const abnormalResults = results.filter(r => r.flag !== 'normal');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Lab Panel - {new Date(panel.panel_time).toLocaleString()}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColorClass(
                  panel.status
                )}`}
              >
                {getStatusLabel(panel.status)}
              </span>
              {panel.entered_by_name && (
                <span className="text-xs text-gray-500">
                  by {panel.entered_by_name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canAcknowledge && unackedResults.length > 0 && (
            <button
              onClick={() => setShowAckModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Check className="w-4 h-4" />
              Acknowledge ({unackedResults.length})
            </button>
          )}
          
          {isAdmin && (
            <>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Result
              </button>
              <button
                onClick={handleDeletePanel}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete panel"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Panel notes */}
      {panel.notes && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-900">{panel.notes}</p>
        </div>
      )}

      {/* Abnormal warning */}
      {abnormalResults.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-900">
              {abnormalResults.length} abnormal or critical value{abnormalResults.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-yellow-700 mt-0.5">
              Review carefully before acknowledging
            </p>
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-1">
          {LAB_CATEGORY_TABS.map((tab) => {
            const count = tab.id === 'all' 
              ? results.length 
              : results.filter(r => r.category === tab.category).length;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-2 text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </nav>
      </div>

      {/* Add standard set button */}
      {isAdmin && activeTab !== 'all' && filteredResults.length === 0 && (
        <button
          onClick={() => handleAddStandardSet(activeTab)}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          + Add Standard {activeTab.toUpperCase()} Test Set
        </button>
      )}

      {/* Results table */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FlaskConical className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No results in this category</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Test
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Units
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Reference Range
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Flag
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredResults.map((result) => {
                  const refRange = getEffectiveRangeDisplay(
                    result.ref_low,
                    result.ref_high,
                    result.ref_operator,
                    result.sex_ref,
                    null
                  );

                  return (
                    <tr key={result.id} className={result.ack_at ? 'bg-gray-50' : ''}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {result.test_name}
                        {!result.ack_at && (
                          <span className="ml-2 text-blue-600">•</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {result.value !== null ? result.value : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {result.units || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {refRange.display || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getFlagColorClass(
                            result.flag
                          )}`}
                        >
                          {getFlagLabel(result.flag)}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedResult(result);
                                setShowEditModal(true);
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteResult(result.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateLabResultModal
          panelId={panel.id}
          patientId={patientId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleResultCreated}
        />
      )}

      {showEditModal && selectedResult && (
        <EditLabResultModal
          result={selectedResult}
          patientId={patientId}
          onClose={() => {
            setShowEditModal(false);
            setSelectedResult(null);
          }}
          onSuccess={handleResultUpdated}
        />
      )}

      {showAckModal && (
        <LabAcknowledgeModal
          panel={panel}
          results={results}
          patientId={patientId}
          onClose={() => setShowAckModal(false)}
          onSuccess={handleAcknowledged}
        />
      )}
    </div>
  );
};
