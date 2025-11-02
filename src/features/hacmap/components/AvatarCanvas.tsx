/**
 * Avatar Canvas - Interactive body map for device/wound placement
 * Renders human silhouette with clickable regions and markers
 */

import React, { useState } from 'react';
import type { Marker, Coordinates, RegionKey } from '../../../types/hacmap';

interface AvatarCanvasProps {
  mode: 'device' | 'wound';
  markers: Marker[];
  onCreateAt: (regionKey: RegionKey, coords: Coordinates) => void;
  onMarkerClick: (id: string, kind: 'device' | 'wound') => void;
  className?: string;
}

type ViewType = 'front' | 'back';

// Region definitions with boundaries (percentage of viewBox - based on 200x600 coordinate system)
// Updated to match new realistic avatar proportions with curves
const REGIONS: Record<RegionKey, { x: [number, number]; y: [number, number] }> = {
  'head': { x: [37, 63], y: [3, 12] },
  'neck': { x: [42, 58], y: [12, 16] },
  'chest': { x: [35, 65], y: [16, 30] },
  'abdomen': { x: [37, 63], y: [30, 45] },
  'pelvis': { x: [40, 60], y: [45, 57] },
  'back': { x: [35, 65], y: [16, 40] },
  'lower-back': { x: [37, 63], y: [40, 55] },
  'left-shoulder': { x: [28, 38], y: [13, 20] },
  'right-shoulder': { x: [62, 72], y: [13, 20] },
  'left-arm': { x: [24, 34], y: [20, 40] },              // Adjusted for curved upper arm
  'right-arm': { x: [66, 76], y: [20, 40] },             // Adjusted for curved upper arm
  'left-forearm': { x: [20, 30], y: [40, 58] },          // Extended range for forearm
  'right-forearm': { x: [70, 80], y: [40, 58] },         // Extended range for forearm
  'left-hand': { x: [18, 28], y: [58, 63] },             // Adjusted for new hand position
  'right-hand': { x: [72, 82], y: [58, 63] },            // Adjusted for new hand position
  'left-thigh': { x: [38, 48], y: [50, 75] },            // Adjusted for curved thigh
  'right-thigh': { x: [52, 62], y: [50, 75] },           // Adjusted for curved thigh
  'left-leg': { x: [38, 48], y: [75, 88] },              // Adjusted for new calf position
  'right-leg': { x: [52, 62], y: [75, 88] },             // Adjusted for new calf position
  'left-foot': { x: [36, 46], y: [88, 92] },             // Adjusted for new foot position
  'right-foot': { x: [54, 64], y: [88, 92] }             // Adjusted for new foot position
};

export const AvatarCanvas: React.FC<AvatarCanvasProps> = ({
  mode,
  markers,
  onCreateAt,
  onMarkerClick,
  className = ''
}) => {
  const [view, setView] = useState<ViewType>('front');

  const handleSvgClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    
    // Calculate click position as percentage of viewBox
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    // Find which region was clicked
    const regionKey = findRegion(x, y);
    if (regionKey) {
      onCreateAt(regionKey, { x, y });
    }
  };

  const findRegion = (x: number, y: number): RegionKey | null => {
    for (const [key, bounds] of Object.entries(REGIONS)) {
      if (
        x >= bounds.x[0] && x <= bounds.x[1] &&
        y >= bounds.y[0] && y <= bounds.y[1]
      ) {
        return key as RegionKey;
      }
    }
    return null;
  };

  // Filter markers by view
  const filteredMarkers = markers.filter(marker => {
    const isBackRegion = marker.regionKey === 'back' || marker.regionKey === 'lower-back';
    return view === 'back' ? isBackRegion : !isBackRegion;
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
      
      {/* Avatar SVG */}
      <div className="relative max-w-[360px] flex-shrink-0">
        <svg
          viewBox="0 0 200 600"
          className="w-full h-auto cursor-crosshair bg-gradient-to-b from-gray-50 to-white rounded-lg"
          style={{ maxHeight: '480px' }}
          onClick={handleSvgClick}
          aria-label="Body diagram for device and wound placement"
          preserveAspectRatio="xMidYMid meet"
        >
        {/* Define gradients and filters for realistic 3D effect */}
        <defs>
          {/* More realistic skin-like gradient */}
          <linearGradient id="bodyGradient" x1="30%" y1="0%" x2="70%" y2="0%">
            <stop offset="0%" stopColor="#d1d5db" />
            <stop offset="50%" stopColor="#e8eaed" />
            <stop offset="100%" stopColor="#d1d5db" />
          </linearGradient>
          
          {/* Subtle shadow for depth */}
          <filter id="softShadow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
            <feOffset dx="0" dy="1" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.15"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
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

        {/* Realistic human silhouette - medical diagram style (wider, shorter limbs) */}
        {view === 'front' ? (
          // FRONT VIEW
          <g fill="url(#bodyGradient)" stroke="#b0b5ba" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" filter="url(#softShadow)">
            {/* Head - slightly wider */}
            <ellipse cx="100" cy="35" rx="22" ry="25" />
            <path d="M 83 55 Q 100 60 117 55" fill="none" stroke="#d1d5db" strokeWidth="1" /> {/* Chin line */}
          
          {/* Neck - wider */}
          <path d="M 90 60 L 88 75 L 112 75 L 110 60 Z" />
          
          {/* Shoulders - even wider */}
          <ellipse cx="70" cy="82" rx="18" ry="12" />
          <ellipse cx="130" cy="82" rx="18" ry="12" />
          
          {/* Torso - wider body */}
          <path d="
            M 88 75
            L 73 90
            L 68 130
            Q 65 160 67 190
            L 70 230
            L 73 270
            L 127 270
            L 130 230
            L 133 190
            Q 135 160 132 130
            L 127 90
            L 112 75
            Z
          " />
          
          {/* Left arm - more natural proportions */}
          <path d="M 70 82 Q 60 95 56 120 Q 54 140 52 165" strokeWidth="13" /> {/* Upper arm with curve */}
          <path d="M 52 165 Q 50 185 48 210 L 46 235" strokeWidth="11" /> {/* Forearm */}
          <ellipse cx="45" cy="245" rx="9" ry="11" /> {/* Hand */}
          
          {/* Right arm - more natural proportions */}
          <path d="M 130 82 Q 140 95 144 120 Q 146 140 148 165" strokeWidth="13" /> {/* Upper arm with curve */}
          <path d="M 148 165 Q 150 185 152 210 L 154 235" strokeWidth="11" /> {/* Forearm */}
          <ellipse cx="155" cy="245" rx="9" ry="11" /> {/* Hand */}
          
          {/* Pelvis/Hips - wider */}
          <path d="M 73 270 Q 70 285 72 300 L 128 300 Q 130 285 127 270 Z" />
          
          {/* Left leg - more natural proportions */}
          <path d="M 78 300 Q 79 330 80 370 Q 81 410 82 450" strokeWidth="17" /> {/* Thigh with slight curve */}
          <path d="M 82 450 Q 81 475 80 500 L 78 525" strokeWidth="14" /> {/* Calf */}
          <ellipse cx="77" cy="540" rx="11" ry="9" /> {/* Foot */}
          
          {/* Right leg - more natural proportions */}
          <path d="M 122 300 Q 121 330 120 370 Q 119 410 118 450" strokeWidth="17" /> {/* Thigh with slight curve */}
          <path d="M 118 450 Q 119 475 120 500 L 122 525" strokeWidth="14" /> {/* Calf */}
          <ellipse cx="123" cy="540" rx="11" ry="9" /> {/* Foot */}
          </g>
        ) : (
          // BACK VIEW
          <g fill="url(#bodyGradient)" stroke="#b0b5ba" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" filter="url(#softShadow)">
            {/* Head - back of head */}
            <ellipse cx="100" cy="35" rx="22" ry="25" />
            
            {/* Neck - back */}
            <path d="M 90 60 L 88 75 L 112 75 L 110 60 Z" />
            
            {/* Shoulders - back view */}
            <ellipse cx="70" cy="82" rx="18" ry="12" />
            <ellipse cx="130" cy="82" rx="18" ry="12" />
            
            {/* Back - spine indication */}
            <path d="M 100 75 L 100 270" stroke="#b0b5ba" strokeWidth="2" fill="none" opacity="0.3" />
            
            {/* Upper back/torso */}
            <path d="
              M 88 75
              L 73 90
              L 68 130
              Q 65 160 67 190
              L 70 230
              L 73 270
              L 127 270
              L 130 230
              L 133 190
              Q 135 160 132 130
              L 127 90
              L 112 75
              Z
            " />
            
            {/* Left arm - back view, more natural proportions */}
            <path d="M 70 82 Q 60 95 56 120 Q 54 140 52 165" strokeWidth="13" />
            <path d="M 52 165 Q 50 185 48 210 L 46 235" strokeWidth="11" />
            <ellipse cx="45" cy="245" rx="9" ry="11" />
            
            {/* Right arm - back view, more natural proportions */}
            <path d="M 130 82 Q 140 95 144 120 Q 146 140 148 165" strokeWidth="13" />
            <path d="M 148 165 Q 150 185 152 210 L 154 235" strokeWidth="11" />
            <ellipse cx="155" cy="245" rx="9" ry="11" />
            
            {/* Pelvis/Hips */}
            <path d="M 73 270 Q 70 285 72 300 L 128 300 Q 130 285 127 270 Z" />
            
            {/* Left leg - back view, more natural proportions */}
            <path d="M 78 300 Q 79 330 80 370 Q 81 410 82 450" strokeWidth="17" />
            <path d="M 82 450 Q 81 475 80 500 L 78 525" strokeWidth="14" />
            <ellipse cx="77" cy="540" rx="11" ry="9" />
            
            {/* Right leg - back view, more natural proportions */}
            <path d="M 122 300 Q 121 330 120 370 Q 119 410 118 450" strokeWidth="17" />
            <path d="M 118 450 Q 119 475 120 500 L 122 525" strokeWidth="14" />
            <ellipse cx="123" cy="540" rx="11" ry="9" />
          </g>
        )}

        {/* Region hit areas (invisible but hoverable) - filtered by view */}
        {Object.entries(REGIONS)
          .filter(([key]) => {
            const isBackRegion = key === 'back' || key === 'lower-back';
            return view === 'back' ? isBackRegion : !isBackRegion;
          })
          .map(([key, bounds]) => (
            <rect
              key={key}
              x={bounds.x[0] * 2}
              y={bounds.y[0] * 6}
              width={(bounds.x[1] - bounds.x[0]) * 2}
              height={(bounds.y[1] - bounds.y[0]) * 6}
              fill="transparent"
              className="hover:fill-blue-100 hover:fill-opacity-10 transition-all"
              style={{ cursor: 'crosshair' }}
            >
              <title>{key.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</title>
            </rect>
          ))}

        {/* Modern pin-style markers */}
        {filteredMarkers.map((marker) => (
          <g
            key={marker.id}
            onClick={(e) => {
              e.stopPropagation();
              onMarkerClick(marker.id, marker.kind);
            }}
            className="cursor-pointer hover:scale-110 transition-transform"
            transform={`translate(${marker.x * 2}, ${marker.y * 6})`}
            filter="url(#markerShadow)"
          >
            {/* Pin shadow/glow base */}
            <circle
              cx="0"
              cy="0"
              r="16"
              fill={marker.kind === 'device' ? '#10b981' : '#ec4899'}
              opacity="0.15"
            />
            
            {/* Main pin button */}
            <circle
              cx="0"
              cy="0"
              r="12"
              fill={marker.kind === 'device' ? '#10b981' : '#ec4899'}
              stroke="white"
              strokeWidth="2.5"
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
            />
            
            {/* Icon with better styling */}
            {marker.kind === 'device' ? (
              // Device icon - medical cross with rounded ends
              <g fill="white" stroke="none">
                <rect x="-1" y="-6" width="2" height="12" rx="1" />
                <rect x="-6" y="-1" width="12" height="2" rx="1" />
              </g>
            ) : (
              // Wound icon - pulsing dot
              <g>
                <circle cx="0" cy="0" r="3.5" fill="white" opacity="0.9" />
                <circle cx="0" cy="0" r="2" fill="white" />
              </g>
            )}
          </g>
        ))}
        </svg>
      </div>
      
      {/* Instructions below avatar */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-xs text-blue-800 text-center max-w-[360px]">
        <span className="font-medium">Tip:</span> Click anywhere on the body to place a marker
      </div>
    </div>
  );
};
