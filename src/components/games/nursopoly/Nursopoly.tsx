/**
 * Nursopoly - Interactive Nursing Education Board Game
 * 
 * A multiplayer board game for nursing students featuring:
 * - 30-space board with 6 clinical disciplines
 * - 2-6 player support with turn-based gameplay
 * - 60+ Canadian nursing questions
 * - Animated dice rolling and piece movement
 * - Score tracking and winner detection
 * - Full-screen optimized gameplay
 * 
 * @example
 * <Nursopoly />
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Users,
  Trophy,
  Settings,
  X,
  Dices,
  ChevronRight,
  Crown,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { GameState, Player, GameStatus, NursingQuestion, GameSettings } from './types';
import { BOARD_SPACES } from './boardConfig';
import { getRandomQuestion } from './questionBank';

// ============================================================================
// CONSTANTS
// ============================================================================

const PLAYER_COLORS = [
  { name: 'Blue', value: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-700' },
  { name: 'Red', value: 'bg-red-500', border: 'border-red-600', text: 'text-red-700' },
  { name: 'Green', value: 'bg-green-500', border: 'border-green-600', text: 'text-green-700' },
  { name: 'Purple', value: 'bg-purple-500', border: 'border-purple-600', text: 'text-purple-700' },
  { name: 'Orange', value: 'bg-orange-500', border: 'border-orange-600', text: 'text-orange-700' },
  { name: 'Pink', value: 'bg-pink-500', border: 'border-pink-600', text: 'text-pink-700' },
];

const DEFAULT_SETTINGS: GameSettings = {
  numPlayers: 2,
  lapsToWin: 1,
  timePerQuestion: 30,
  difficulty: ['easy', 'medium'],
  soundEnabled: false,
};

const PASS_START_BONUS = 200;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const Nursopoly: React.FC = () => {
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    status: 'setup',
    players: [],
    currentPlayerIndex: 0,
    currentQuestion: null,
    diceRoll: null,
    settings: DEFAULT_SETTINGS,
    winner: null,
  });

  const [diceAnimation, setDiceAnimation] = useState({ isRolling: false, result: null as number | null });
  const [playerSetup, setPlayerSetup] = useState<Array<{ name: string; colorIndex: number }>>([
    { name: '', colorIndex: 0 },
    { name: '', colorIndex: 1 },
  ]);
  const [showSettings, setShowSettings] = useState(false);
  const [questionTimer, setQuestionTimer] = useState(30);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [usedQuestionIds, setUsedQuestionIds] = useState<string[]>([]);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const currentSpace = BOARD_SPACES[currentPlayer?.position || 0];

  // ============================================================================
  // GAME SETUP
  // ============================================================================

  const startGame = () => {
    const players: Player[] = playerSetup
      .filter(p => p.name.trim())
      .map((p, index) => ({
        id: `player-${index}`,
        name: p.name.trim(),
        color: PLAYER_COLORS[p.colorIndex].value,
        position: 0,
        score: 0,
        lapsCompleted: 0,
        isActive: index === 0,
      }));

    if (players.length < 2) {
      alert('Please add at least 2 players');
      return;
    }

    setGameState(prev => ({
      ...prev,
      status: 'playing',
      players,
      currentPlayerIndex: 0,
    }));
  };

  const addPlayer = () => {
    if (playerSetup.length < 6) {
      const usedColors = playerSetup.map(p => p.colorIndex);
      const availableColor = PLAYER_COLORS.findIndex((_, idx) => !usedColors.includes(idx));
      setPlayerSetup([...playerSetup, { name: '', colorIndex: availableColor !== -1 ? availableColor : playerSetup.length }]);
    }
  };

  const removePlayer = (index: number) => {
    if (playerSetup.length > 2) {
      setPlayerSetup(playerSetup.filter((_, i) => i !== index));
    }
  };

  // ============================================================================
  // DICE ROLLING
  // ============================================================================

  const rollDice = () => {
    if (diceAnimation.isRolling || gameState.status !== 'playing') return;

    setDiceAnimation({ isRolling: true, result: null });

    // Animate for 1 second
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setDiceAnimation({ isRolling: false, result: roll });
      setGameState(prev => ({ ...prev, diceRoll: roll }));
      
      // Move player after brief delay
      setTimeout(() => movePlayer(roll), 500);
    }, 1000);
  };

  // ============================================================================
  // PLAYER MOVEMENT
  // ============================================================================

  const movePlayer = (spaces: number) => {
    const currentPos = currentPlayer.position;
    let newPos = currentPos + spaces;
    let passedStart = false;

    // Check if passed START
    if (newPos >= BOARD_SPACES.length) {
      newPos = newPos % BOARD_SPACES.length;
      passedStart = true;
    }

    // Update player position
    setGameState(prev => ({
      ...prev,
      players: prev.players.map((p, idx) =>
        idx === prev.currentPlayerIndex
          ? {
              ...p,
              position: newPos,
              score: passedStart ? p.score + PASS_START_BONUS : p.score,
              lapsCompleted: passedStart ? p.lapsCompleted + 1 : p.lapsCompleted,
            }
          : p
      ),
    }));

    // Handle landing on space after animation
    setTimeout(() => handleSpaceLanding(newPos, passedStart), 800);
  };

  // ============================================================================
  // SPACE LANDING LOGIC
  // ============================================================================

  const handleSpaceLanding = (position: number, passedStart: boolean) => {
    const space = BOARD_SPACES[position];

    // Check for winner
    if (passedStart && currentPlayer.lapsCompleted + 1 >= gameState.settings.lapsToWin) {
      setGameState(prev => ({
        ...prev,
        status: 'finished',
        winner: prev.players[prev.currentPlayerIndex],
      }));
      return;
    }

    // Handle special spaces
    switch (space.type) {
      case 'start':
        nextTurn();
        break;
      
      case 'discipline':
      case 'stat':
      case 'preceptor-review':
        // Present question
        presentQuestion(space.discipline!, space.type === 'stat' ? 2 : 1);
        break;
      
      case 'break-room':
        // Skip turn
        alert(`${currentPlayer.name} is taking a break! Lose a turn.`);
        nextTurn();
        break;
      
      case 'clinical-rotation':
        // Bonus - choose discipline (for now, random)
        const disciplines = ['medical-surgical', 'pediatrics', 'mental-health', 'maternal-newborn', 'community-health', 'critical-care'];
        const randomDiscipline = disciplines[Math.floor(Math.random() * disciplines.length)];
        presentQuestion(randomDiscipline as any, 1.5);
        break;
      
      case 'free-study':
        // Safe space - no question
        setTimeout(nextTurn, 1500);
        break;
      
      default:
        nextTurn();
    }
  };

  // ============================================================================
  // QUESTION SYSTEM
  // ============================================================================

  const presentQuestion = (discipline: string, pointMultiplier: number = 1) => {
    const question = getRandomQuestion(
      discipline,
      gameState.settings.difficulty,
      usedQuestionIds
    );

    if (!question) {
      // No questions available
      alert('No more questions available for this discipline!');
      nextTurn();
      return;
    }

    setUsedQuestionIds(prev => [...prev, question.id]);
    setGameState(prev => ({
      ...prev,
      status: 'question',
      currentQuestion: { ...question, points: Math.floor(question.points * pointMultiplier) },
    }));
    setQuestionTimer(gameState.settings.timePerQuestion);
    setSelectedAnswer(null);
    setShowFeedback(false);
  };

  // Question timer
  useEffect(() => {
    if (gameState.status !== 'question' || showFeedback) return;

    const interval = setInterval(() => {
      setQuestionTimer(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState.status, showFeedback]);

  const handleTimeUp = () => {
    setIsCorrect(false);
    setShowFeedback(true);
    setTimeout(() => {
      setGameState(prev => ({ ...prev, status: 'playing', currentQuestion: null }));
      nextTurn();
    }, 3000);
  };

  const submitAnswer = () => {
    if (selectedAnswer === null || !gameState.currentQuestion) return;

    const correct = selectedAnswer === gameState.currentQuestion.correctAnswer;
    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
      setGameState(prev => ({
        ...prev,
        players: prev.players.map((p, idx) =>
          idx === prev.currentPlayerIndex
            ? { ...p, score: p.score + (prev.currentQuestion?.points || 0) }
            : p
        ),
      }));
    }

    setTimeout(() => {
      setGameState(prev => ({ ...prev, status: 'playing', currentQuestion: null }));
      nextTurn();
    }, 3000);
  };

  // ============================================================================
  // TURN MANAGEMENT
  // ============================================================================

  const nextTurn = () => {
    setGameState(prev => {
      const nextIndex = (prev.currentPlayerIndex + 1) % prev.players.length;
      return {
        ...prev,
        currentPlayerIndex: nextIndex,
        diceRoll: null,
        players: prev.players.map((p, idx) => ({
          ...p,
          isActive: idx === nextIndex,
        })),
      };
    });
    setDiceAnimation({ isRolling: false, result: null });
  };

  const resetGame = () => {
    setGameState({
      status: 'setup',
      players: [],
      currentPlayerIndex: 0,
      currentQuestion: null,
      diceRoll: null,
      settings: DEFAULT_SETTINGS,
      winner: null,
    });
    setPlayerSetup([
      { name: '', colorIndex: 0 },
      { name: '', colorIndex: 1 },
    ]);
    setUsedQuestionIds([]);
  };

  // ============================================================================
  // RENDER: SETUP SCREEN
  // ============================================================================

  if (gameState.status === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-8 border border-slate-700">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Dices className="w-12 h-12 text-purple-400" />
              <h1 className="text-4xl font-bold text-white">Nursopoly</h1>
            </div>
            <p className="text-slate-300">
              The ultimate nursing education board game
            </p>
          </div>

          {/* Player Setup */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Players ({playerSetup.length}/6)
            </h2>
            <div className="space-y-3">
              {playerSetup.map((player, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => {
                      const newSetup = [...playerSetup];
                      newSetup[index].name = e.target.value;
                      setPlayerSetup(newSetup);
                    }}
                    placeholder={`Player ${index + 1} Name`}
                    className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <select
                    value={player.colorIndex}
                    onChange={(e) => {
                      const newSetup = [...playerSetup];
                      newSetup[index].colorIndex = parseInt(e.target.value);
                      setPlayerSetup(newSetup);
                    }}
                    className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {PLAYER_COLORS.map((color, idx) => (
                      <option key={idx} value={idx}>
                        {color.name}
                      </option>
                    ))}
                  </select>
                  {playerSetup.length > 2 && (
                    <button
                      onClick={() => removePlayer(index)}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {playerSetup.length < 6 && (
              <button
                onClick={addPlayer}
                className="mt-3 w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4" />
                Add Player
              </button>
            )}
          </div>

          {/* Game Settings */}
          <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Game Settings
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Laps to Win:</span>
                <select
                  value={gameState.settings.lapsToWin}
                  onChange={(e) => setGameState(prev => ({
                    ...prev,
                    settings: { ...prev.settings, lapsToWin: parseInt(e.target.value) }
                  }))}
                  className="bg-slate-600 text-white px-2 py-1 rounded"
                >
                  <option value={1}>1 (Quick)</option>
                  <option value={2}>2 (Medium)</option>
                  <option value={3}>3 (Long)</option>
                </select>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Time per Question:</span>
                <select
                  value={gameState.settings.timePerQuestion}
                  onChange={(e) => setGameState(prev => ({
                    ...prev,
                    settings: { ...prev.settings, timePerQuestion: parseInt(e.target.value) }
                  }))}
                  className="bg-slate-600 text-white px-2 py-1 rounded"
                >
                  <option value={20}>20 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={45}>45 seconds</option>
                </select>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3 mb-6">
            <p className="text-xs text-amber-200">
              ⚠️ <strong>Educational Use Only</strong> - Practice and simulation purposes. 
              Always follow facility protocols for real-world nursing practice.
            </p>
          </div>

          {/* Start Button */}
          <button
            onClick={startGame}
            disabled={playerSetup.filter(p => p.name.trim()).length < 2}
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
          >
            <Play className="w-5 h-5" />
            Start Game
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: WINNER SCREEN
  // ============================================================================

  if (gameState.status === 'finished' && gameState.winner) {
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-8 border border-slate-700">
          {/* Winner Announcement */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏆</div>
            <h1 className="text-4xl font-bold text-white mb-2">
              {gameState.winner.name} Wins!
            </h1>
            <p className="text-xl text-purple-300">
              Nursing Champion 🩺
            </p>
          </div>

          {/* Final Scores */}
          <div className="bg-slate-700/50 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Final Scores</h2>
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    index === 0 ? 'bg-yellow-900/30 border border-yellow-600/50' : 'bg-slate-600/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {index === 0 && <Crown className="w-5 h-5 text-yellow-400" />}
                    <div className={`w-8 h-8 ${player.color} rounded-full`} />
                    <span className="font-semibold text-white">{player.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{player.score}</div>
                    <div className="text-xs text-slate-400">{player.lapsCompleted} laps</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={resetGame}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              New Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: QUESTION MODAL
  // ============================================================================

  if (gameState.status === 'question' && gameState.currentQuestion) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-700">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${currentPlayer.color} rounded-full flex items-center justify-center text-white font-bold`}>
                {currentPlayer.name[0]}
              </div>
              <div>
                <div className="font-semibold text-white">{currentPlayer.name}</div>
                <div className="text-sm text-slate-400 capitalize">
                  {gameState.currentQuestion.discipline.replace('-', ' ')}
                </div>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-full font-mono font-bold ${
              questionTimer <= 10 ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-700 text-slate-300'
            }`}>
              {questionTimer}s
            </div>
          </div>

          {/* Question */}
          <div className="bg-slate-700/50 rounded-xl p-5 mb-6">
            <p className="text-lg text-white leading-relaxed">
              {gameState.currentQuestion.question}
            </p>
            <div className="mt-3 text-sm">
              <span className={`px-3 py-1 rounded-full ${
                gameState.currentQuestion.difficulty === 'easy' ? 'bg-green-900/50 text-green-300' :
                gameState.currentQuestion.difficulty === 'medium' ? 'bg-yellow-900/50 text-yellow-300' :
                'bg-red-900/50 text-red-300'
              }`}>
                {gameState.currentQuestion.difficulty}
              </span>
              <span className="ml-3 text-slate-400">
                Worth: {gameState.currentQuestion.points} points
              </span>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {gameState.currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => !showFeedback && setSelectedAnswer(index)}
                disabled={showFeedback}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  showFeedback && index === gameState.currentQuestion!.correctAnswer
                    ? 'bg-green-900/30 border-green-600'
                    : showFeedback && index === selectedAnswer
                    ? 'bg-red-900/30 border-red-600'
                    : selectedAnswer === index
                    ? 'bg-purple-900/30 border-purple-500'
                    : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                } ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    showFeedback && index === gameState.currentQuestion!.correctAnswer
                      ? 'bg-green-600 text-white'
                      : showFeedback && index === selectedAnswer
                      ? 'bg-red-600 text-white'
                      : selectedAnswer === index
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-600 text-slate-300'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="text-white">{option}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Feedback */}
          {showFeedback && (
            <div className={`rounded-xl p-4 mb-4 ${
              isCorrect ? 'bg-green-900/30 border border-green-600' : 'bg-red-900/30 border border-red-600'
            }`}>
              <p className={`font-semibold mb-2 ${isCorrect ? 'text-green-200' : 'text-red-200'}`}>
                {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
              </p>
              <p className="text-sm text-slate-300">
                {gameState.currentQuestion.explanation}
              </p>
            </div>
          )}

          {/* Submit Button */}
          {!showFeedback && (
            <button
              onClick={submitAnswer}
              disabled={selectedAnswer === null}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Submit Answer
            </button>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: GAME BOARD
  // ============================================================================

  // Board dimensions - static for perfect alignment
  const CORNER_SIZE = 120; // px
  const SPACE_WIDTH = 90; // px
  const SPACE_HEIGHT = 140; // px for horizontal spaces
  const BOARD_SIZE = 800; // total board size
  const CENTER_MARGIN = 10; // px margin from spaces

  // Helper function to get space position for board layout
  const getSpaceStyle = (index: number): React.CSSProperties => {
    const spaceW = SPACE_WIDTH;
    const spaceH = SPACE_HEIGHT;
    const corner = CORNER_SIZE;

    // BOTTOM ROW (0-7): Left to Right
    if (index === 0) {
      // Bottom-left corner (START)
      return { bottom: 0, left: 0, width: corner, height: corner };
    }
    if (index >= 1 && index <= 7) {
      return { 
        bottom: 0, 
        left: corner + (index - 1) * spaceW, 
        width: spaceW, 
        height: spaceH 
      };
    }

    // RIGHT COLUMN (8-15): Bottom to Top
    if (index === 8) {
      // Bottom-right corner
      return { bottom: 0, right: 0, width: corner, height: corner };
    }
    if (index >= 9 && index <= 15) {
      const pos = index - 9;
      return { 
        right: 0, 
        bottom: corner + pos * spaceW, 
        width: spaceH, 
        height: spaceW 
      };
    }

    // TOP ROW (16-23): Right to Left
    if (index === 16) {
      // Top-right corner
      return { top: 0, right: 0, width: corner, height: corner };
    }
    if (index >= 17 && index <= 23) {
      const pos = index - 17;
      return { 
        top: 0, 
        right: corner + pos * spaceW, 
        width: spaceW, 
        height: spaceH 
      };
    }

    // LEFT COLUMN (24-29): Top to Bottom
    if (index === 24) {
      // Top-left corner
      return { top: 0, left: 0, width: corner, height: corner };
    }
    if (index >= 25 && index <= 29) {
      const pos = index - 25;
      return { 
        left: 0, 
        top: corner + pos * spaceW, 
        width: spaceH, 
        height: spaceW 
      };
    }

    return {};
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 p-4">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2" style={{ fontFamily: 'serif' }}>
            <Dices className="w-8 h-8 text-amber-400" />
            NURSOPOLY
          </h1>
          <div className="text-sm text-amber-200 font-medium">
            Nursing Board Game
          </div>
        </div>
        <button
          onClick={resetGame}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          New Game
        </button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Board */}
        <div className="lg:col-span-3">
          <div className="w-full max-w-[900px] mx-auto">
            <div 
              className="relative bg-gradient-to-br from-amber-100 via-amber-50 to-amber-100 rounded-3xl shadow-2xl"
              style={{ 
                width: `${BOARD_SIZE}px`, 
                height: `${BOARD_SIZE}px`,
                margin: '0 auto',
                border: '12px solid #78350f', // amber-900
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 2px 4px rgba(0, 0, 0, 0.06)'
              }}
            >
              {/* Board Spaces */}
              {BOARD_SPACES.map((space, index) => {
                const playersOnSpace = gameState.players.filter(p => p.position === index);
                const isCorner = index === 0 || index === 8 || index === 16 || index === 24;
                const style = getSpaceStyle(index);
                const isHorizontal = index >= 1 && index <= 7 || index >= 17 && index <= 23;
                
                return (
                  <div
                    key={space.id}
                    className="absolute bg-amber-50"
                    style={{
                      ...style,
                      border: '2px solid #78350f',
                    }}
                  >
                    {/* Space Header with Discipline Color */}
                    <div 
                      className={`${space.color} flex items-center justify-center border-b-2 border-amber-900`}
                      style={{ height: isCorner ? '40px' : '35px' }}
                    >
                      <span className="text-2xl">{space.icon}</span>
                    </div>
                    
                    {/* Space Content */}
                    <div className="flex-1 flex flex-col items-center justify-center p-2 bg-amber-50">
                      <div 
                        className="font-black text-gray-900 text-center leading-tight uppercase tracking-tight"
                        style={{ 
                          fontSize: isCorner ? '10px' : '8.5px',
                          fontFamily: '"Helvetica Neue", "Arial", sans-serif',
                          fontWeight: 900
                        }}
                      >
                        {space.name}
                      </div>
                    </div>
                    
                    {/* Players on this space */}
                    {playersOnSpace.length > 0 && (
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 z-20">
                        {playersOnSpace.map(player => (
                          <div
                            key={player.id}
                            className={`w-7 h-7 ${player.color} rounded-full border-2 border-amber-900 shadow-xl flex items-center justify-center`}
                          >
                            <span className="text-white text-xs font-bold">{player.name[0]}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Center Area - Game Info */}
              <div 
                className="absolute bg-gradient-to-br from-teal-700 via-teal-800 to-teal-900 rounded-2xl shadow-2xl border-4 border-amber-900"
                style={{
                  top: `${SPACE_HEIGHT + CENTER_MARGIN}px`,
                  left: `${SPACE_HEIGHT + CENTER_MARGIN}px`,
                  width: `${BOARD_SIZE - (SPACE_HEIGHT + CENTER_MARGIN) * 2}px`,
                  height: `${BOARD_SIZE - (SPACE_HEIGHT + CENTER_MARGIN) * 2}px`,
                }}
              >
                <div className="w-full h-full p-6 flex flex-col items-center justify-center">
                  {/* Title */}
                  <div className="text-center mb-6">
                    <h2 
                      className="text-4xl font-bold text-amber-300 mb-2 tracking-wider"
                      style={{ 
                        fontFamily: 'Georgia, serif',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                      }}
                    >
                      NURSOPOLY
                    </h2>
                    <p className="text-amber-100 text-sm font-medium">Nursing Board Game</p>
                  </div>

                  {/* Current Player */}
                  <div className="bg-amber-900/40 rounded-xl p-4 mb-5 w-full max-w-xs backdrop-blur-sm">
                    <div className="text-amber-200 text-xs font-bold mb-2 text-center tracking-wide">CURRENT PLAYER</div>
                    <div className="flex items-center justify-center gap-3">
                      <div className={`w-14 h-14 ${currentPlayer?.color} rounded-full border-4 border-amber-900 shadow-2xl flex items-center justify-center`}>
                        <span className="text-white text-xl font-bold">{currentPlayer?.name[0]}</span>
                      </div>
                      <div className="text-white">
                        <div className="font-bold text-lg">{currentPlayer?.name}</div>
                        <div className="text-amber-200 text-sm">Score: {currentPlayer?.score}</div>
                      </div>
                    </div>
                  </div>

                  {/* Dice Roll Button */}
                  <button
                    onClick={rollDice}
                    disabled={diceAnimation.isRolling}
                    className="w-full max-w-xs bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:via-amber-700 hover:to-amber-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold py-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-2xl disabled:cursor-not-allowed border-3 border-amber-900"
                    style={{
                      boxShadow: '0 10px 25px rgba(0,0,0,0.3), 0 0 0 3px #78350f'
                    }}
                  >
                    <Dices className={`w-8 h-8 ${diceAnimation.isRolling ? 'animate-spin' : ''}`} />
                    <span className="text-xl font-extrabold">
                      {diceAnimation.isRolling ? 'Rolling...' : diceAnimation.result ? `Rolled ${diceAnimation.result}` : 'Roll Dice'}
                    </span>
                  </button>

                  {/* Lap Progress */}
                  <div className="mt-4 text-center text-amber-200 text-sm font-semibold">
                    Lap {currentPlayer?.lapsCompleted + 1} of {gameState.settings.lapsToWin}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scoreboard */}
        <div className="lg:col-span-1 space-y-4">
          {/* Players List */}
          <div className="bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl p-4 border-4 border-amber-900 shadow-xl">
            <h3 className="text-lg font-bold text-amber-900 mb-3 text-center" style={{ fontFamily: 'serif' }}>
              PLAYERS
            </h3>
            <div className="space-y-3">
              {gameState.players.map((player, index) => (
                <div
                  key={player.id}
                  className={`bg-white rounded-xl p-3 border-2 transition-all ${
                    player.isActive ? 'border-amber-600 shadow-lg ring-2 ring-amber-400' : 'border-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 ${player.color} rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md border-2 border-amber-900`}>
                      {player.name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">{player.name}</div>
                      <div className="text-xs text-gray-600">
                        Space {player.position}
                      </div>
                    </div>
                    {player.isActive && (
                      <Trophy className="w-5 h-5 text-amber-600 animate-pulse" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-amber-50 rounded p-2 text-center border border-amber-200">
                      <div className="text-gray-600">Score</div>
                      <div className="text-gray-900 font-bold text-base">{player.score}</div>
                    </div>
                    <div className="bg-amber-50 rounded p-2 text-center border border-amber-200">
                      <div className="text-gray-600">Laps</div>
                      <div className="text-gray-900 font-bold text-base">{player.lapsCompleted}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl p-4 border-4 border-amber-900 shadow-xl">
            <h3 className="text-sm font-bold text-amber-900 mb-3 text-center" style={{ fontFamily: 'serif' }}>
              DISCIPLINES
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded border border-gray-700"></div>
                <span className="text-gray-800 font-medium">Med-Surg</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-pink-500 rounded border border-gray-700"></div>
                <span className="text-gray-800 font-medium">Pediatrics</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded border border-gray-700"></div>
                <span className="text-gray-800 font-medium">Mental Health</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded border border-gray-700"></div>
                <span className="text-gray-800 font-medium">Maternal-Newborn</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded border border-gray-700"></div>
                <span className="text-gray-800 font-medium">Community</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded border border-gray-700"></div>
                <span className="text-gray-800 font-medium">Critical Care</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Nursopoly;
