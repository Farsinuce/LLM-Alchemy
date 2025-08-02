'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { GAME_CONFIG } from '@/lib/game-config';
import Emoji from '@/components/ui/Emoji';

interface GameHeaderProps {
  regularElementCount: number;
  endElementCount: number;
  gameMode: 'science' | 'creative';
  undoAvailable: boolean;
  isUndoing: boolean;
  userApiKey: string;
  tokenBalance: number;
  dailyCount: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortMode: string;
  setSortMode: (mode: string) => void;
  isMixing: boolean;
  onBackToHome: () => void;
  onGameModeToggle: () => void;
  onShowAchievements: () => void;
  onUndo: () => Promise<void>;
  onGetMoreTokens: () => Promise<void>;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  regularElementCount,
  endElementCount,
  gameMode,
  undoAvailable,
  isUndoing,
  userApiKey,
  tokenBalance,
  dailyCount,
  searchTerm,
  setSearchTerm,
  sortMode,
  setSortMode,
  isMixing,
  onBackToHome,
  onGameModeToggle,
  onShowAchievements,
  onUndo,
  onGetMoreTokens
}) => {
  return (
    <div className="relative z-10 bg-white/90 backdrop-blur-sm p-4 shadow-lg border-b-2 border-black">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-black">
            <Emoji>{gameMode === 'science' ? '🧪' : '🎨'}</Emoji>
            LLM Alchemy
          </h1>
        </div>
        <div className="text-lg font-semibold flex flex-col items-end gap-1 text-black">
          <span>Elements: {regularElementCount}</span>
          {gameMode === 'science' && endElementCount > 0 && (
            <span className="text-gray-600 text-base">Ends: {endElementCount}</span>
          )}
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-3">
        <button
          onClick={onBackToHome}
          className="om-btn flex items-center gap-2"
          title="Back to Menu"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">Back</span>
        </button>
        
        <div className="text-sm text-gray-600 flex items-center gap-2">
          {/* Undo Button */}
          {undoAvailable && !isUndoing && (
            <button
              onClick={onUndo}
              className="om-btn om-btn-primary px-2 py-1 font-medium text-xs"
              title="Undo last combination"
            >
              ↶ Undo
            </button>
          )}
          
          {userApiKey ? (
            <span className="text-green-600">Using your API key</span>
          ) : tokenBalance > 0 ? (
            <span className="text-yellow-600">Tokens: {tokenBalance}</span>
          ) : dailyCount >= GAME_CONFIG.DAILY_FREE_COMBINATIONS ? (
            <button
              onClick={onGetMoreTokens}
              className="om-btn om-btn-primary"
            >
              Get more
            </button>
          ) : (
            <>
              <Emoji size="sm">🪙</Emoji>
              <span>{dailyCount}/{GAME_CONFIG.DAILY_FREE_COMBINATIONS} today</span>
            </>
          )}
        </div>
      </div>
      
      <div className="flex justify-between items-center gap-3">
        <div className="flex gap-2 text-sm items-center">
          <input
            type="text"
            placeholder="Filter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="om-input w-20 sm:w-20 px-2 py-1 text-sm"
          />
          <button
            onClick={onShowAchievements}
            className="om-btn flex items-center gap-1"
          >
            <Emoji size="sm">🏆</Emoji>
            <span className="hidden sm:inline text-sm">Achievements</span>
          </button>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
            className="om-select px-2 py-1 text-sm"
          >
            <option value="unlock">By Discovery</option>
            <option value="alpha">Alphabetical</option>
          </select>
        </div>
        
        {/* Game Mode Toggle */}
        <button
          onClick={onGameModeToggle}
          disabled={isMixing}
          className={`relative inline-flex h-8 w-32 cursor-pointer items-center rounded-full bg-gray-700 transition-colors hover:bg-gray-600 ${
            isMixing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <div className={`absolute left-1 h-6 w-14 rounded-full transition-transform ${
            gameMode === 'creative' ? 'bg-purple-600 translate-x-16' : 'bg-blue-500'
          }`}></div>
          <span className={`absolute left-3 text-xs font-medium z-10 ${
            gameMode === 'science' ? 'text-white' : 'text-gray-400'
          }`}>Science</span>
          <span className={`absolute right-3 text-xs font-medium z-10 ${
            gameMode === 'creative' ? 'text-white' : 'text-gray-400'
          }`}>Creative</span>
        </button>
      </div>
    </div>
  );
};
