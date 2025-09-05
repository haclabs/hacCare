/**
 * Enhanced Body Diagram Component
 * 
 * Provides accurate anatomical body diagrams (anterior/posterior views) with 
 * precise coordinate mapping for wound location marking, similar to professional
 * healthcare systems like Epic.
 */

import React from 'react';
import { WoundUI } from '../../../lib/woundService';

interface BodyDiagramProps {
  view: 'anterior' | 'posterior';
  wounds: WoundUI[];
  onBodyClick?: (coordinates: { x: number; y: number }, anatomicalRegion: string) => void;
  onWoundClick?: (wound: WoundUI) => void;
  interactive?: boolean;
  showWoundNumbers?: boolean;
  className?: string;
}

// Anatomical regions with precise coordinate boundaries
const ANATOMICAL_REGIONS = {
  anterior: {
    head: { x: [35, 65], y: [5, 20] },
    neck: { x: [45, 55], y: [18, 25] },
    chest: { x: [30, 70], y: [25, 45] },
    abdomen: { x: [35, 65], y: [45, 65] },
    pelvis: { x: [40, 60], y: [65, 75] },
    leftShoulder: { x: [20, 35], y: [25, 35] },
    rightShoulder: { x: [65, 80], y: [25, 35] },
    leftUpperArm: { x: [15, 30], y: [35, 55] },
    rightUpperArm: { x: [70, 85], y: [35, 55] },
    leftForearm: { x: [10, 25], y: [55, 75] },
    rightForearm: { x: [75, 90], y: [55, 75] },
    leftHand: { x: [5, 20], y: [75, 85] },
    rightHand: { x: [80, 95], y: [75, 85] },
    leftThigh: { x: [35, 47], y: [75, 90] },
    rightThigh: { x: [53, 65], y: [75, 90] },
    leftKnee: { x: [37, 45], y: [87, 93] },
    rightKnee: { x: [55, 63], y: [87, 93] },
    leftLowerLeg: { x: [37, 45], y: [90, 105] },
    rightLowerLeg: { x: [55, 63], y: [90, 105] },
    leftFoot: { x: [35, 47], y: [105, 115] },
    rightFoot: { x: [53, 65], y: [105, 115] }
  },
  posterior: {
    head: { x: [35, 65], y: [5, 20] },
    neck: { x: [45, 55], y: [18, 25] },
    upperBack: { x: [30, 70], y: [25, 45] },
    lowerBack: { x: [35, 65], y: [45, 65] },
    buttocks: { x: [40, 60], y: [65, 75] },
    leftShoulder: { x: [65, 80], y: [25, 35] }, // Note: reversed for posterior
    rightShoulder: { x: [20, 35], y: [25, 35] },
    leftUpperArm: { x: [70, 85], y: [35, 55] },
    rightUpperArm: { x: [15, 30], y: [35, 55] },
    leftForearm: { x: [75, 90], y: [55, 75] },
    rightForearm: { x: [10, 25], y: [55, 75] },
    leftHand: { x: [80, 95], y: [75, 85] },
    rightHand: { x: [5, 20], y: [75, 85] },
    leftThigh: { x: [53, 65], y: [75, 90] },
    rightThigh: { x: [35, 47], y: [75, 90] },
    leftKnee: { x: [55, 63], y: [87, 93] },
    rightKnee: { x: [37, 45], y: [87, 93] },
    leftLowerLeg: { x: [55, 63], y: [90, 105] },
    rightLowerLeg: { x: [37, 45], y: [90, 105] },
    leftFoot: { x: [53, 65], y: [105, 115] },
    rightFoot: { x: [35, 47], y: [105, 115] }
  }
};

export const BodyDiagram: React.FC<BodyDiagramProps> = ({
  view,
  wounds,
  onBodyClick,
  onWoundClick,
  interactive = false,
  showWoundNumbers = true,
  className = ""
}) => {
  
  const getAnatomicalRegion = (x: number, y: number, view: 'anterior' | 'posterior'): string => {
    const regions = ANATOMICAL_REGIONS[view];
    
    for (const [regionName, bounds] of Object.entries(regions)) {
      if (x >= bounds.x[0] && x <= bounds.x[1] && y >= bounds.y[0] && y <= bounds.y[1]) {
        return regionName;
      }
    }
    return 'unknown';
  };

  const handleSvgClick = (event: React.MouseEvent<SVGElement>) => {
    if (!interactive || !onBodyClick) return;
    
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    const region = getAnatomicalRegion(x, y, view);
    onBodyClick({ x, y }, region);
  };

  const getWoundColor = (wound: WoundUI) => {
    switch (wound.healingProgress) {
      case 'Improving': return '#10b981'; // green
      case 'Stable': return '#3b82f6'; // blue
      case 'Deteriorating': return '#ef4444'; // red
      case 'New': return '#f59e0b'; // amber
      default: return '#6b7280'; // gray
    }
  };

  const AnteriorBodySVG = () => (
    <svg
      viewBox="0 0 100 120"
      className={`w-full h-full ${interactive ? 'cursor-crosshair' : ''} ${className}`}
      onClick={handleSvgClick}
    >
      {/* Head */}
      <ellipse cx="50" cy="12" rx="12" ry="15" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/>
      
      {/* Neck */}
      <rect x="46" y="22" width="8" height="6" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/>
      
      {/* Chest/Torso */}
      <ellipse cx="50" cy="42" rx="18" ry="15" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/>
      
      {/* Abdomen */}
      <ellipse cx="50" cy="58" rx="15" ry="8" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/>
      
      {/* Pelvis */}
      <ellipse cx="50" cy="70" rx="12" ry="6" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/>
      
      {/* Arms */}
      <ellipse cx="27" cy="38" rx="5" ry="12" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Left upper arm */}
      <ellipse cx="73" cy="38" rx="5" ry="12" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Right upper arm */}
      
      {/* Forearms */}
      <ellipse cx="20" cy="58" rx="4" ry="10" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Left forearm */}
      <ellipse cx="80" cy="58" rx="4" ry="10" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Right forearm */}
      
      {/* Hands */}
      <ellipse cx="17" cy="72" rx="3" ry="4" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Left hand */}
      <ellipse cx="83" cy="72" rx="3" ry="4" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Right hand */}
      
      {/* Thighs */}
      <ellipse cx="42" cy="85" rx="6" ry="12" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Left thigh */}
      <ellipse cx="58" cy="85" rx="6" ry="12" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Right thigh */}
      
      {/* Lower legs */}
      <ellipse cx="42" cy="105" rx="4" ry="10" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Left lower leg */}
      <ellipse cx="58" cy="105" rx="4" ry="10" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Right lower leg */}
      
      {/* Feet */}
      <ellipse cx="42" cy="117" rx="3" ry="3" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Left foot */}
      <ellipse cx="58" cy="117" rx="3" ry="3" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Right foot */}
      
      {/* Render wounds for anterior view */}
      {wounds
        .filter(wound => wound.view === 'anterior')
        .map((wound, index) => (
          <g key={wound.id}>
            <circle
              cx={wound.coordinates.x}
              cy={wound.coordinates.y}
              r="2.5"
              fill={getWoundColor(wound)}
              stroke="white"
              strokeWidth="1"
              className={onWoundClick ? "cursor-pointer hover:opacity-80" : ""}
              onClick={(e) => {
                e.stopPropagation();
                if (onWoundClick) onWoundClick(wound);
              }}
            />
            {showWoundNumbers && (
              <text
                x={wound.coordinates.x}
                y={wound.coordinates.y + 1}
                textAnchor="middle"
                className="text-[3px] font-bold fill-white pointer-events-none"
              >
                {index + 1}
              </text>
            )}
          </g>
        ))}
    </svg>
  );

  const PosteriorBodySVG = () => (
    <svg
      viewBox="0 0 100 120"
      className={`w-full h-full ${interactive ? 'cursor-crosshair' : ''} ${className}`}
      onClick={handleSvgClick}
    >
      {/* Head (back) */}
      <ellipse cx="50" cy="12" rx="12" ry="15" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/>
      
      {/* Neck */}
      <rect x="46" y="22" width="8" height="6" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/>
      
      {/* Upper Back */}
      <ellipse cx="50" cy="42" rx="18" ry="15" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/>
      
      {/* Lower Back */}
      <ellipse cx="50" cy="58" rx="15" ry="8" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/>
      
      {/* Buttocks */}
      <ellipse cx="50" cy="70" rx="12" ry="6" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/>
      
      {/* Arms (back) - note reversed positioning */}
      <ellipse cx="73" cy="38" rx="5" ry="12" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Right upper arm (from back) */}
      <ellipse cx="27" cy="38" rx="5" ry="12" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Left upper arm (from back) */}
      
      {/* Forearms (back) */}
      <ellipse cx="80" cy="58" rx="4" ry="10" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Right forearm */}
      <ellipse cx="20" cy="58" rx="4" ry="10" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Left forearm */}
      
      {/* Hands (back) */}
      <ellipse cx="83" cy="72" rx="3" ry="4" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Right hand */}
      <ellipse cx="17" cy="72" rx="3" ry="4" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Left hand */}
      
      {/* Thighs (back) */}
      <ellipse cx="58" cy="85" rx="6" ry="12" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Right thigh */}
      <ellipse cx="42" cy="85" rx="6" ry="12" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Left thigh */}
      
      {/* Lower legs (back) */}
      <ellipse cx="58" cy="105" rx="4" ry="10" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Right lower leg */}
      <ellipse cx="42" cy="105" rx="4" ry="10" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Left lower leg */}
      
      {/* Feet (back) */}
      <ellipse cx="58" cy="117" rx="3" ry="3" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Right foot */}
      <ellipse cx="42" cy="117" rx="3" ry="3" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="0.8"/> {/* Left foot */}
      
      {/* Render wounds for posterior view */}
      {wounds
        .filter(wound => wound.view === 'posterior')
        .map((wound) => (
          <g key={wound.id}>
            <circle
              cx={wound.coordinates.x}
              cy={wound.coordinates.y}
              r="2.5"
              fill={getWoundColor(wound)}
              stroke="white"
              strokeWidth="1"
              className={onWoundClick ? "cursor-pointer hover:opacity-80" : ""}
              onClick={(e) => {
                e.stopPropagation();
                if (onWoundClick) onWoundClick(wound);
              }}
            />
            {showWoundNumbers && (
              <text
                x={wound.coordinates.x}
                y={wound.coordinates.y + 1}
                textAnchor="middle"
                className="text-[3px] font-bold fill-white pointer-events-none"
              >
                {wounds.filter(w => w.view === 'posterior').indexOf(wound) + 1}
              </text>
            )}
          </g>
        ))}
    </svg>
  );

  return view === 'anterior' ? <AnteriorBodySVG /> : <PosteriorBodySVG />;
};
