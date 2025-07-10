'use client'

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useSupabase } from '@/components/auth/SupabaseProvider';
import { createClient, getGameProgress, resetGameState } from '@/lib/supabase-client';

interface GameProgress {
  science: { elements: number, endElements: number, achievements: number, lastPlayed?: string } | null;
  creative: { elements: number, endElements: number, achievements: number, lastPlayed?: string } | null;
  lastMode: 'science' | 'creative';
}

export default function Home() {
  const { user, dailyCount, loading } = useSupabase();
  const router = useRouter();
  const [progress, setProgress] = useState<GameProgress | null>(null);
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [resetAchievements, setResetAchievements] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'science' | 'creative'>('science');

  // Load game progress when user is available
  useEffect(() => {
    const loadProgress = async () => {
      if (user) {
        const supabase = createClient();
        const gameProgress = await getGameProgress(supabase, user.id);
        setProgress(gameProgress);
      }
    };

    loadProgress();
  }, [user]);

  const hasAnyProgress = progress && (progress.science || progress.creative);

  const handleContinueGame = () => {
    if (progress) {
      // Go to game with last played mode
      router.push(`/game?mode=${progress.lastMode}`);
    } else {
      // No progress, start new game in science mode
      router.push('/game?mode=science');
    }
  };

  const handleNewGame = (gameMode: 'science' | 'creative') => {
    setSelectedMode(gameMode);
    setShowNewGameModal(true);
  };

  const confirmNewGame = async () => {
    if (user) {
      const supabase = createClient();
      await resetGameState(supabase, user.id, selectedMode, resetAchievements);
      setShowNewGameModal(false);
      setResetAchievements(false);
      router.push(`/game?mode=${selectedMode}`);
    }
  };

  const formatElementCount = (count: number) => {
    return count === 0 ? 'None' : `${count} element${count === 1 ? '' : 's'}`;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Sparkles className="text-yellow-400" size={48} />
          <h1 className="text-5xl font-bold">LLM Alchemy</h1>
        </div>
        
        <p className="text-lg text-gray-300 mb-8">
          Combine elements to discover new ones using AI.
          Science mode for realistic combinations, Creative mode for imaginative results!
        </p>

        {/* Progress Display */}
        {hasAnyProgress && (
          <div className="bg-gray-800/50 rounded-lg p-6 mb-6 text-left">
            <h3 className="text-lg font-semibold mb-4 text-center">Your Progress</h3>
            
            <div className="space-y-3">
              {progress?.science && (
                <div className="flex justify-between items-center py-2 px-3 bg-blue-600/20 rounded">
                  <span className="font-medium">🧪 Science Mode</span>
                  <span className="text-sm text-gray-300">
                    {formatElementCount(progress.science.elements)}
                    {progress.science.endElements > 0 && `, ${progress.science.endElements} end`}
                  </span>
                </div>
              )}
              
              {progress?.creative && (
                <div className="flex justify-between items-center py-2 px-3 bg-purple-600/20 rounded">
                  <span className="font-medium">🎨 Creative Mode</span>
                  <span className="text-sm text-gray-300">
                    {formatElementCount(progress.creative.elements)}
                  </span>
                </div>
              )}
            </div>

            <div className="text-center mt-4 text-sm text-gray-400">
              Today: {dailyCount}/50 combinations used
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="space-y-4">
          {hasAnyProgress && (
            <button 
              onClick={handleContinueGame}
              className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-lg transition-all transform hover:scale-105"
            >
              Continue Game
              <ArrowRight size={20} />
            </button>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleNewGame('science')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all"
            >
              New Science Game
            </button>
            
            <button 
              onClick={() => handleNewGame('creative')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-all"
            >
              New Creative Game
            </button>
          </div>
          
          <div className="text-sm text-gray-400">
            Free to play • 50 combinations per day
          </div>
        </div>
      </div>

      {/* New Game Confirmation Modal */}
      {showNewGameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold mb-3">Start New Game?</h3>
            <p className="text-gray-300 mb-4">
              Reset current progress in {selectedMode} mode and start fresh?
            </p>
            
            <div className="mb-6">
              <label className="flex items-center gap-2 text-sm">
                <input 
                  type="checkbox"
                  checked={resetAchievements}
                  onChange={(e) => setResetAchievements(e.target.checked)}
                  className="rounded"
                />
                Also reset achievements
              </label>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowNewGameModal(false);
                  setResetAchievements(false);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmNewGame}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded transition-colors font-medium"
              >
                Start New Game
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
