/**
 * Nursopoly Game Types
 * Type definitions for the Nursopoly board game
 */

export type DisciplineType = 
  | 'medical-surgical'
  | 'pediatrics'
  | 'mental-health'
  | 'maternal-newborn'
  | 'community-health'
  | 'critical-care';

export type SpaceType = 
  | 'discipline'
  | 'start'
  | 'stat'
  | 'break-room'
  | 'clinical-rotation'
  | 'preceptor-review'
  | 'free-study';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export type GameStatus = 'setup' | 'playing' | 'question' | 'paused' | 'finished';

export interface Player {
  id: string;
  name: string;
  color: string;
  position: number;
  score: number;
  lapsCompleted: number;
  isActive: boolean;
  avatar?: string;
}

export interface BoardSpace {
  id: number;
  type: SpaceType;
  discipline?: DisciplineType;
  name: string;
  description: string;
  color: string;
  icon?: string;
}

export interface NursingQuestion {
  id: string;
  discipline: DisciplineType;
  difficulty: QuestionDifficulty;
  question: string;
  options: string[];
  correctAnswer: number; // index of correct option
  explanation: string;
  points: number;
}

export interface GameSettings {
  numPlayers: number;
  lapsToWin: number;
  timePerQuestion: number;
  difficulty: QuestionDifficulty[];
  soundEnabled: boolean;
}

export interface GameState {
  status: GameStatus;
  players: Player[];
  currentPlayerIndex: number;
  currentQuestion: NursingQuestion | null;
  diceRoll: number | null;
  settings: GameSettings;
  winner: Player | null;
}

export interface DiceAnimation {
  isRolling: boolean;
  result: number | null;
}
