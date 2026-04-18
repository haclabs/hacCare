import React from 'react';
import { AvatarCanvas } from './AvatarCanvas';
import type { MarkerWithDetails, Coordinates, RegionKey } from '../../../types/hacmap';
import { DEVICE_TYPE_LABELS, WOUND_TYPE_LABELS } from '../../../types/hacmap';
import type { PlacementMode, PendingMarker } from '../hooks/useAvatarBoard';

interface AvatarCanvasPanelProps {
  markers: MarkerWithDetails[];
  filteredMarkers: MarkerWithDetails[];
  placementMode: PlacementMode;
  setPlacementMode: (mode: PlacementMode) => void;
  pendingMarker: PendingMarker | null;
  onCreateAt: (regionKey: RegionKey, coords: Coordinates) => Promise<void>;
  onMarkerClick: (id: string, kind: 'device' | 'wound') => Promise<void>;
  onMarkerMove: (id: string, regionKey: RegionKey, coords: Coordinates) => Promise<void>;
}

export const AvatarCanvasPanel: React.FC<AvatarCanvasPanelProps> = ({
  markers,
  filteredMarkers,
  placementMode,
  setPlacementMode,
  pendingMarker,
  onCreateAt,
  onMarkerClick,
  onMarkerMove,
}) => {
  return (
    <div className="flex-1 bg-gray-50 rounded-lg border-2 border-gray-200 p-6 overflow-auto">
      <div className="flex items-start gap-10 justify-center">
        {/* Avatar Canvas */}
        <AvatarCanvas
          mode={placementMode}
          markers={filteredMarkers}
          pendingMarker={pendingMarker}
          onCreateAt={placementMode ? onCreateAt : undefined}
          onMarkerClick={onMarkerClick}
          onMarkerMove={onMarkerMove}
          className=""
        />

        {/* Right sidebar with buttons and info */}
        <div className="flex flex-col space-y-4 w-80 flex-shrink-0">
          {/* Quick Add Buttons */}
          <div className={`rounded-xl shadow-lg border-2 p-4 transition-all ${
            placementMode
              ? (placementMode === 'device' ? 'bg-green-50 border-green-400' : 'bg-pink-50 border-pink-400')
              : 'bg-white border-gray-200'
          }`}>
            <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Quick Add</div>

            {/* Active Mode Indicator */}
            {placementMode && (
              <div className={`mb-3 p-3 rounded-lg border-2 ${
                placementMode === 'device'
                  ? 'bg-green-100 border-green-400 animate-pulse'
                  : 'bg-pink-100 border-pink-400 animate-pulse'
              }`}>
                <div className="flex items-center gap-2 text-sm font-bold">
                  <div className={`w-3 h-3 rounded-full ${
                    placementMode === 'device' ? 'bg-green-600' : 'bg-pink-600'
                  } animate-ping absolute`}></div>
                  <div className={`w-3 h-3 rounded-full ${
                    placementMode === 'device' ? 'bg-green-600' : 'bg-pink-600'
                  }`}></div>
                  <span className={placementMode === 'device' ? 'text-green-900' : 'text-pink-900'}>
                    ACTIVE: Click body to place {placementMode}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={() => setPlacementMode(placementMode === 'device' ? null : 'device')}
                className={`w-full px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                  pendingMarker?.kind === 'device'
                    ? 'bg-orange-500 text-white shadow-lg hover:bg-orange-600 ring-4 ring-orange-200 animate-pulse'
                    : placementMode === 'device'
                    ? 'bg-green-600 text-white shadow-lg hover:bg-green-700 ring-4 ring-green-200'
                    : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="7" y="2" width="2" height="12" rx="1" />
                  <rect x="2" y="7" width="12" height="2" rx="1" />
                </svg>
                <span>
                  {pendingMarker?.kind === 'device'
                    ? '📝 Complete Device Form'
                    : placementMode === 'device'
                    ? '✓ Device Mode Active - Click to Cancel'
                    : 'Add Device'}
                </span>
              </button>
              <button
                onClick={() => setPlacementMode(placementMode === 'wound' ? null : 'wound')}
                className={`w-full px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                  pendingMarker?.kind === 'wound'
                    ? 'bg-orange-500 text-white shadow-lg hover:bg-orange-600 ring-4 ring-orange-200 animate-pulse'
                    : placementMode === 'wound'
                    ? 'bg-pink-600 text-white shadow-lg hover:bg-pink-700 ring-4 ring-pink-200'
                    : 'bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100'
                }`}
              >
                <div className="w-4 h-4 rounded-full border-2 border-current"></div>
                <span>
                  {pendingMarker?.kind === 'wound'
                    ? '📝 Complete Wound Form'
                    : placementMode === 'wound'
                    ? '✓ Wound Mode Active - Click to Cancel'
                    : 'Add Wound'}
                </span>
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Summary</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total Devices:</span>
                <span className="font-semibold text-green-600">{markers.filter(m => m.kind === 'device').length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total Wounds:</span>
                <span className="font-semibold text-pink-600">{markers.filter(m => m.kind === 'wound').length}</span>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Markers:</span>
                  <span className="font-semibold text-gray-900">{markers.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          {markers.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
              <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Recent</div>
              <div className="space-y-2">
                {markers.slice(-3).reverse().map(marker => (
                  <div
                    key={marker.id}
                    className="text-xs p-2 bg-gray-50 rounded border border-gray-200"
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${marker.kind === 'device' ? 'bg-green-500' : 'bg-pink-500'}`}></div>
                      <span className="font-medium text-gray-700">
                        {marker.kind === 'device'
                          ? (marker.device?.type ? DEVICE_TYPE_LABELS[marker.device.type] : marker.device?.type)
                          : (marker.wound?.wound_type ? WOUND_TYPE_LABELS[marker.wound.wound_type] : marker.wound?.wound_type)}
                      </span>
                    </div>
                    <div className="text-gray-500 ml-4 mt-1">
                      {marker.regionKey.replace(/-/g, ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
