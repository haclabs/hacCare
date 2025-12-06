/**
 * Nursopoly Board Configuration
 * Defines the 30 spaces on the game board
 */

import { BoardSpace } from './types';

export const BOARD_SPACES: BoardSpace[] = [
  // START (0)
  {
    id: 0,
    type: 'start',
    name: 'START',
    description: 'Begin your nursing journey! Collect 200 points each time you pass.',
    color: 'bg-teal-500',
    icon: '🏥',
  },
  
  // Side 1: Medical-Surgical & Pediatrics
  {
    id: 1,
    type: 'discipline',
    discipline: 'medical-surgical',
    name: 'Med-Surg Ward',
    description: 'Answer a Medical-Surgical nursing question',
    color: 'bg-cyan-500',
    icon: '🏥',
  },
  {
    id: 2,
    type: 'discipline',
    discipline: 'pediatrics',
    name: 'Pediatric Unit',
    description: 'Answer a Pediatrics nursing question',
    color: 'bg-purple-400',
    icon: '👶',
  },
  {
    id: 3,
    type: 'stat',
    name: 'STAT!',
    description: 'Urgent care! Answer correctly for double points!',
    color: 'bg-rose-400',
    icon: '🚨',
  },
  {
    id: 4,
    type: 'discipline',
    discipline: 'medical-surgical',
    name: 'Surgical Floor',
    description: 'Answer a Medical-Surgical nursing question',
    color: 'bg-cyan-500',
    icon: '💉',
  },
  {
    id: 5,
    type: 'discipline',
    discipline: 'community-health',
    name: 'Community Clinic',
    description: 'Answer a Community Health question',
    color: 'bg-purple-400',
    icon: '🏘️',
  },
  {
    id: 6,
    type: 'break-room',
    name: 'Break Room',
    description: 'Mandatory rest break. Lose a turn.',
    color: 'bg-slate-400',
    icon: '☕',
  },
  {
    id: 7,
    type: 'discipline',
    discipline: 'pediatrics',
    name: 'NICU',
    description: 'Answer a Pediatrics nursing question',
    color: 'bg-rose-300',
    icon: '👼',
  },
  
  // Corner (8)
  {
    id: 8,
    type: 'clinical-rotation',
    name: 'Clinical Rotation',
    description: 'Choose any discipline to advance to!',
    color: 'bg-cyan-500',
    icon: '🔄',
  },
  
  // Side 2: Mental Health & Critical Care
  {
    id: 9,
    type: 'discipline',
    discipline: 'mental-health',
    name: 'Psych Ward',
    description: 'Answer a Mental Health nursing question',
    color: 'bg-purple-400',
    icon: '🧠',
  },
  {
    id: 10,
    type: 'discipline',
    discipline: 'critical-care',
    name: 'ICU',
    description: 'Answer a Critical Care question',
    color: 'bg-rose-400',
    icon: '❤️‍🩹',
  },
  {
    id: 11,
    type: 'discipline',
    discipline: 'mental-health',
    name: 'Mental Health Unit',
    description: 'Answer a Mental Health nursing question',
    color: 'bg-purple-400',
    icon: '💭',
  },
  {
    id: 12,
    type: 'free-study',
    name: 'Free Study Time',
    description: 'Safe space! No question required.',
    color: 'bg-teal-500',
    icon: '📚',
  },
  {
    id: 13,
    type: 'discipline',
    discipline: 'critical-care',
    name: 'Trauma Bay',
    description: 'Answer a Critical Care question',
    color: 'bg-rose-400',
    icon: '🚑',
  },
  {
    id: 14,
    type: 'discipline',
    discipline: 'maternal-newborn',
    name: 'Labor & Delivery',
    description: 'Answer a Maternal-Newborn question',
    color: 'bg-cyan-500',
    icon: '🤰',
  },
  {
    id: 15,
    type: 'stat',
    name: 'STAT!',
    description: 'Urgent care! Answer correctly for double points!',
    color: 'bg-rose-400',
    icon: '🚨',
  },
  
  // Corner (16)
  {
    id: 16,
    type: 'preceptor-review',
    name: 'Preceptor Review',
    description: 'Answer 3 quick questions!',
    color: 'bg-cyan-500',
    icon: '👨‍⚕️',
  },
  
  // Side 3: Maternal-Newborn & Community
  {
    id: 17,
    type: 'discipline',
    discipline: 'maternal-newborn',
    name: 'Postpartum Unit',
    description: 'Answer a Maternal-Newborn question',
    color: 'bg-rose-300',
    icon: '👶',
  },
  {
    id: 18,
    type: 'discipline',
    discipline: 'community-health',
    name: 'Public Health',
    description: 'Answer a Community Health question',
    color: 'bg-purple-400',
    icon: '🌍',
  },
  {
    id: 19,
    type: 'discipline',
    discipline: 'medical-surgical',
    name: 'Med-Surg Floor',
    description: 'Answer a Medical-Surgical nursing question',
    color: 'bg-cyan-500',
    icon: '🏥',
  },
  {
    id: 20,
    type: 'break-room',
    name: 'Break Room',
    description: 'Mandatory rest break. Lose a turn.',
    color: 'bg-slate-400',
    icon: '☕',
  },
  {
    id: 21,
    type: 'discipline',
    discipline: 'pediatrics',
    name: 'Pediatric ER',
    description: 'Answer a Pediatrics nursing question',
    color: 'bg-rose-300',
    icon: '🚑',
  },
  {
    id: 22,
    type: 'discipline',
    discipline: 'community-health',
    name: 'Home Care',
    description: 'Answer a Community Health question',
    color: 'bg-purple-400',
    icon: '🏠',
  },
  {
    id: 23,
    type: 'stat',
    name: 'STAT!',
    description: 'Urgent care! Answer correctly for double points!',
    color: 'bg-rose-400',
    icon: '🚨',
  },
  
  // Corner (24)
  {
    id: 24,
    type: 'free-study',
    name: 'Free Study Time',
    description: 'Safe space! No question required.',
    color: 'bg-teal-500',
    icon: '📚',
  },
  
  // Side 4: Back to start
  {
    id: 25,
    type: 'discipline',
    discipline: 'critical-care',
    name: 'CCU',
    description: 'Answer a Critical Care question',
    color: 'bg-rose-400',
    icon: '💓',
  },
  {
    id: 26,
    type: 'discipline',
    discipline: 'mental-health',
    name: 'Crisis Intervention',
    description: 'Answer a Mental Health nursing question',
    color: 'bg-purple-400',
    icon: '🆘',
  },
  {
    id: 27,
    type: 'discipline',
    discipline: 'maternal-newborn',
    name: 'Antepartum Care',
    description: 'Answer a Maternal-Newborn question',
    color: 'bg-rose-300',
    icon: '🤰',
  },
  {
    id: 28,
    type: 'discipline',
    discipline: 'pediatrics',
    name: 'Pediatric Oncology',
    description: 'Answer a Pediatrics nursing question',
    color: 'bg-rose-300',
    icon: '🎗️',
  },
  {
    id: 29,
    type: 'discipline',
    discipline: 'medical-surgical',
    name: 'Telemetry Unit',
    description: 'Answer a Medical-Surgical nursing question',
    color: 'bg-cyan-500',
    icon: '📊',
  },
];

// Helper to get board layout positions (4-sided square)
export const getBoardPosition = (spaceId: number): { side: number; position: number } => {
  const spacesPerSide = 8; // 30 spaces / 4 sides ≈ 7-8 per side
  
  if (spaceId === 0) return { side: 0, position: 0 }; // Start
  if (spaceId <= 7) return { side: 1, position: spaceId };
  if (spaceId === 8) return { side: 1, position: 8 }; // Corner
  if (spaceId <= 15) return { side: 2, position: spaceId - 8 };
  if (spaceId === 16) return { side: 2, position: 8 }; // Corner
  if (spaceId <= 23) return { side: 3, position: spaceId - 16 };
  if (spaceId === 24) return { side: 3, position: 8 }; // Corner
  return { side: 4, position: spaceId - 24 };
};
