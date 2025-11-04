/**
 * Avatar Canvas - Interactive body map for device/wound placement
 * Renders human silhouette with clickable regions and markers
 */

import React, { useState } from 'react';
import type { Marker, Coordinates, RegionKey } from '../../../types/hacmap';

interface AvatarCanvasProps {
  mode: 'device' | 'wound' | null;
  markers: Marker[];
  onCreateAt?: (regionKey: RegionKey, coords: Coordinates) => void;
  onMarkerClick: (id: string, kind: 'device' | 'wound') => void;
  onMarkerMove?: (id: string, regionKey: RegionKey, coords: Coordinates) => void;
  className?: string;
}

type ViewType = 'front' | 'back';

// Region definitions with boundaries (percentage of viewBox - based on 200x400 image dimensions)
// Coordinates are in percentages: viewBox is 200x600, images are 200x400, so y-scaling factor is 1.5x
const REGIONS: Record<RegionKey, { x: [number, number]; y: [number, number]; view: 'front' | 'back' | 'both' }> = {
  // HEAD & NECK (both views)
  'head': { x: [35, 65], y: [2, 15], view: 'both' },
  'neck': { x: [42, 58], y: [15, 20], view: 'both' },
  
  // FRONT VIEW - TORSO
  'chest': { x: [30, 70], y: [20, 35], view: 'front' },
  'abdomen': { x: [35, 65], y: [35, 50], view: 'front' },
  'pelvis': { x: [38, 62], y: [50, 60], view: 'front' },
  
  // BACK VIEW - TORSO
  'back': { x: [30, 70], y: [20, 45], view: 'back' },
  'lower-back': { x: [35, 65], y: [45, 60], view: 'back' },
  
  // SHOULDERS (both views)
  'left-shoulder': { x: [20, 35], y: [18, 28], view: 'both' },
  'right-shoulder': { x: [65, 80], y: [18, 28], view: 'both' },
  
  // LEFT ARM (both views)
  'left-arm': { x: [12, 28], y: [28, 42], view: 'both' },
  'left-forearm': { x: [8, 24], y: [42, 54], view: 'both' },
  'left-hand': { x: [5, 22], y: [54, 62], view: 'both' },
  
  // RIGHT ARM (both views)
  'right-arm': { x: [72, 88], y: [28, 42], view: 'both' },
  'right-forearm': { x: [76, 92], y: [42, 54], view: 'both' },
  'right-hand': { x: [78, 95], y: [54, 62], view: 'both' },
  
  // LEFT LEG (both views)
  'left-thigh': { x: [35, 48], y: [60, 80], view: 'both' },
  'left-leg': { x: [35, 48], y: [80, 95], view: 'both' },
  'left-foot': { x: [33, 48], y: [95, 100], view: 'both' },
  
  // RIGHT LEG (both views)
  'right-thigh': { x: [52, 65], y: [60, 80], view: 'both' },
  'right-leg': { x: [52, 65], y: [80, 95], view: 'both' },
  'right-foot': { x: [52, 67], y: [95, 100], view: 'both' }
};

export const AvatarCanvas: React.FC<AvatarCanvasProps> = ({
  mode,
  markers,
  onCreateAt,
  onMarkerClick,
  onMarkerMove,
  className = ''
}) => {
  const [view, setView] = useState<ViewType>('front');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<Marker | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const hoverTimeoutRef = React.useRef<number | null>(null);
  
  // Stable hover handlers with debounce
  const handleMarkerEnter = React.useCallback((marker: Marker) => {
    if (draggingId) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredMarker(marker);
  }, [draggingId]);
  
  const handleMarkerLeave = React.useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = window.setTimeout(() => {
      setHoveredMarker(null);
    }, 50); // Small delay to prevent flashing
  }, []);

  const handleSvgClick = (event: React.MouseEvent<SVGSVGElement>) => {
    // Only allow creating new markers when in placement mode
    if (!mode || !onCreateAt) return;
    
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    
    // Calculate click position as percentage of viewBox
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    // Find which region was clicked
    const regionKey = findRegion(x, y);
    if (regionKey) {
      onCreateAt(regionKey, { x, y, view });
    }
  };

  const findRegion = (x: number, y: number): RegionKey | null => {
    for (const [key, region] of Object.entries(REGIONS)) {
      // Check if region is visible in current view
      if (region.view !== 'both' && region.view !== view) {
        continue;
      }
      
      // For front view, we need to flip left/right regions since we're looking at the patient face-to-face
      let adjustedX = x;
      if (view === 'front' && (key.includes('left-') || key.includes('right-'))) {
        // Mirror the x coordinate around the center (50%)
        adjustedX = 100 - x;
      }
      
      if (
        adjustedX >= region.x[0] && adjustedX <= region.x[1] &&
        y >= region.y[0] && y <= region.y[1]
      ) {
        return key as RegionKey;
      }
    }
    return null;
  };

  // Convert screen coordinates to SVG percentage coordinates
  const screenToSvgCoords = (clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!svgRef.current) return null;
    
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    
    return { x, y };
  };

  // Handle marker drag start with pointer events
  const handleMarkerDragStart = (e: React.PointerEvent, marker: Marker) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Capture pointer on the element that received pointerdown
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    setDraggingId(marker.id);
    setHoveredMarker(null); // Hide tooltip during drag
  };

  // Handle marker drag with pointer events
  const handleMarkerDrag = (e: React.PointerEvent) => {
    if (!draggingId || !onMarkerMove) return;
    
    const coords = screenToSvgCoords(e.clientX, e.clientY);
    if (!coords) return;
    
    // Clamp coordinates to valid range
    const clampedX = Math.max(0, Math.min(100, coords.x));
    const clampedY = Math.max(0, Math.min(100, coords.y));
    
    const regionKey = findRegion(clampedX, clampedY);
    if (regionKey) {
      onMarkerMove(draggingId, regionKey, { x: clampedX, y: clampedY });
    }
  };

  // Handle marker drag end with pointer events
  const handleMarkerDragEnd = (e: React.PointerEvent) => {
    if (e.target && 'releasePointerCapture' in e.target) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
    setDraggingId(null);
  };

  // Filter markers by view
  const filteredMarkers = markers.filter(marker => {
    const region = REGIONS[marker.regionKey];
    if (!region) return true; // Show if region not found
    
    // If marker has bodyView set (new system), only show on matching view
    if (marker.bodyView) {
      return marker.bodyView === view;
    }
    
    // Otherwise use region definition (legacy/fallback)
    return region.view === 'both' || region.view === view;
  });

  return (
    <div className={`${className} flex flex-col items-center`}>
      {/* View Toggle Buttons */}
      <div className="flex items-center space-x-2 mb-4">
        <button
          onClick={() => setView('front')}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
            view === 'front'
              ? 'bg-purple-500 text-white shadow-md scale-105'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 opacity-50'
          }`}
        >
          Front View
        </button>
        <button
          onClick={() => setView('back')}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
            view === 'back'
              ? 'bg-purple-500 text-white shadow-md scale-105'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 opacity-50'
          }`}
        >
          Back View
        </button>
      </div>
      
      {/* Avatar SVG with Image Background */}
      <div className="relative max-w-[360px] flex-shrink-0">
        <svg
          ref={svgRef}
          viewBox="0 0 200 400"
          className={`w-full h-auto bg-white rounded-lg shadow-sm`}
          style={{ 
            maxHeight: '600px', 
            touchAction: 'none',
            cursor: draggingId ? 'grabbing' : (hoveredMarker && !mode ? 'grab' : (mode ? 'crosshair' : 'default'))
          }}
          onClick={handleSvgClick}
          aria-label="Body diagram for device and wound placement"
          preserveAspectRatio="xMidYMid meet"
        >
        {/* Define filters for markers */}
        <defs>
          {/* Marker shadow */}
          <filter id="markerShadow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Body Image - Front or Back */}
        <image
          href={view === 'front' ? '/images/body-front.png' : '/images/body-back.png'}
          x="0"
          y="0"
          width="200"
          height="400"
          preserveAspectRatio="xMidYMid meet"
          pointerEvents="none"
        />

        {/* Region hit areas (invisible but hoverable) - filtered by view */}
        {!draggingId && Object.entries(REGIONS)
          .filter(([, region]) => region.view === 'both' || region.view === view)
          .map(([key, region]) => {
            // For front view, mirror left/right regions
            let rectX = region.x[0] * 2;
            if (view === 'front' && (key.includes('left-') || key.includes('right-'))) {
              // Mirror the x coordinate around center
              rectX = 200 - (region.x[1] * 2);
            }
            
            return (
              <rect
                key={key}
                x={rectX}
                y={region.y[0] * 4}
                width={(region.x[1] - region.x[0]) * 2}
                height={(region.y[1] - region.y[0]) * 4}
                fill="transparent"
                className="hover:fill-blue-100 hover:fill-opacity-10 transition-all"
                pointerEvents={draggingId ? 'none' : 'all'}
              >
                <title>{key.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</title>
              </rect>
            );
          })}

        {/* Modern pin-style markers */}
        {filteredMarkers.map((marker) => (
          <g
            key={marker.id}
            className={`${draggingId === marker.id ? 'scale-110' : 'hover:scale-110'} transition-transform`}
            transform={`translate(${marker.x * 2}, ${marker.y * 4})`}
            filter="url(#markerShadow)"
          >
            {/* Draggable invisible larger hit area */}
            <circle
              cx="0"
              cy="0"
              r="20"
              fill="transparent"
              style={{ touchAction: 'none', cursor: 'inherit' }}
              onMouseEnter={() => handleMarkerEnter(marker)}
              onMouseLeave={handleMarkerLeave}
              onPointerDown={(e) => handleMarkerDragStart(e, marker)}
              onPointerMove={draggingId === marker.id ? handleMarkerDrag : undefined}
              onPointerUp={draggingId === marker.id ? handleMarkerDragEnd : undefined}
              onPointerCancel={draggingId === marker.id ? handleMarkerDragEnd : undefined}
              onClick={(e) => {
                e.stopPropagation();
                if (draggingId !== marker.id) {
                  onMarkerClick(marker.id, marker.kind);
                }
              }}
            />
            
            {/* Pin shadow/glow base */}
            <circle
              cx="0"
              cy="0"
              r="16"
              fill={marker.kind === 'device' ? '#10b981' : '#ec4899'}
              opacity="0.15"
              pointerEvents="none"
            />
            
            {/* Main pin button */}
            <circle
              cx="0"
              cy="0"
              r="12"
              fill={marker.kind === 'device' ? '#10b981' : '#ec4899'}
              stroke="white"
              strokeWidth="2.5"
              pointerEvents="none"
            />
            
            {/* Inner circle for depth */}
            <circle
              cx="0"
              cy="0"
              r="9"
              fill="none"
              stroke="white"
              strokeWidth="0.5"
              opacity="0.3"
              pointerEvents="none"
            />
            
            {/* Icon with better styling */}
            {marker.kind === 'device' ? (
              // Device icon - medical cross with rounded ends
              <g fill="white" stroke="none" pointerEvents="none">
                <rect x="-1" y="-6" width="2" height="12" rx="1" />
                <rect x="-6" y="-1" width="12" height="2" rx="1" />
              </g>
            ) : (
              // Wound icon - pulsing dot
              <g pointerEvents="none">
                <circle cx="0" cy="0" r="3.5" fill="white" opacity="0.9" />
                <circle cx="0" cy="0" r="2" fill="white" />
              </g>
            )}
          </g>
        ))}
        </svg>
        
        {/* Hover Tooltip */}
        {hoveredMarker && !draggingId && (
          <div 
            className="absolute pointer-events-none z-50"
            style={{
              left: `${(hoveredMarker.x / 50) * 100}%`,
              top: `${(hoveredMarker.y / 100) * 100}%`,
              transform: 'translate(-50%, calc(-100% - 35px))'
            }}
          >
            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-gray-700 whitespace-nowrap">
              <div className="font-semibold">
                {hoveredMarker.kind === 'device' 
                  ? hoveredMarker.label?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                  : hoveredMarker.label?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                }
              </div>
              <div className="text-gray-300 text-[10px] mt-1">
                {hoveredMarker.regionKey.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </div>
              <div className="text-gray-400 text-[10px] mt-1">
                {hoveredMarker.kind === 'device' ? '🔧 Device' : '🩹 Wound'} • Click to edit • Drag to move
              </div>
              {/* Arrow pointing down to marker */}
              <div 
                className="absolute left-1/2 bottom-0 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"
                style={{ transform: 'translate(-50%, 100%)' }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Instructions below avatar */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-xs text-blue-800 text-center max-w-[360px]">
        <span className="font-medium">Tip:</span> {
          mode 
            ? 'Click anywhere on the body to place a marker' 
            : 'Click a marker to edit • Drag markers to reposition • Select Add Device/Wound to place new markers'
        }
      </div>
    </div>
  );
};
