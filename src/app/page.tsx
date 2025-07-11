'use client'

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';
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
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetAchievements, setResetAchievements] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'science' | 'creative'>('science');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<'flash' | 'pro'>('flash');
  const [tempApiKey, setTempApiKey] = useState<string>('');

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('llm-alchemy-api-key');
    const savedModel = localStorage.getItem('llm-alchemy-model') as 'flash' | 'pro';
    
    if (savedApiKey) {
      setUserApiKey(savedApiKey);
    }
    if (savedModel && (savedModel === 'flash' || savedModel === 'pro')) {
      setSelectedModel(savedModel);
    }
  }, []);

  // Save API key to localStorage when it changes
  useEffect(() => {
    if (userApiKey) {
      localStorage.setItem('llm-alchemy-api-key', userApiKey);
      localStorage.setItem('llm-alchemy-model', selectedModel);
    } else {
      localStorage.removeItem('llm-alchemy-api-key');
      localStorage.removeItem('llm-alchemy-model');
    }
  }, [userApiKey, selectedModel]);

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
    if (hasAnyProgress && progress) {
      // Go to game with last played mode
      router.push(`/game?mode=${progress.lastMode}`);
    } else {
      // No progress, start new game in science mode
      router.push('/game?mode=science');
    }
  };

  const handleResetMode = (gameMode: 'science' | 'creative') => {
    setSelectedMode(gameMode);
    setShowResetModal(true);
  };

  const confirmReset = async () => {
    if (user) {
      const supabase = createClient();
      await resetGameState(supabase, user.id, selectedMode, resetAchievements);
      setShowResetModal(false);
      setResetAchievements(false);
      // Refresh progress display
      const gameProgress = await getGameProgress(supabase, user.id);
      setProgress(gameProgress);
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
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      <span className="hidden sm:inline">🧪 </span>Science Mode
                    </span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-sm text-gray-300">
                      {progress.science.elements} elements
                      {progress.science.endElements > 0 && `, ${progress.science.endElements} end`}
                    </span>
                  </div>
                  <button
                    onClick={() => handleResetMode('science')}
                    className="text-red-400 hover:text-red-300 transition-colors text-lg"
                    title="Reset Science Mode"
                  >
                    ❌
                  </button>
                </div>
              )}
              
              {progress?.creative && (
                <div className="flex justify-between items-center py-2 px-3 bg-purple-600/20 rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      <span className="hidden sm:inline">🎨 </span>Creative Mode
                    </span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-sm text-gray-300">
                      {progress.creative.elements} elements
                    </span>
                  </div>
                  <button
                    onClick={() => handleResetMode('creative')}
                    className="text-red-400 hover:text-red-300 transition-colors text-lg"
                    title="Reset Creative Mode"
                  >
                    ❌
                  </button>
                </div>
              )}
            </div>

            <div className="text-center mt-4 text-sm text-gray-400">
              Today: {dailyCount}/50 combinations used
            </div>
          </div>
        )}
        
        {/* Single Action Button */}
        <div className="space-y-4">
          <button 
            onClick={handleContinueGame}
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-lg transition-all transform hover:scale-105"
          >
            {hasAnyProgress ? 'Continue Game' : 'New Game'}
            <ArrowRight size={20} />
          </button>
          
          <div className="text-sm text-gray-400">
            Free to play • 50 combinations per day
          </div>
          
          {/* API Key Button */}
          <button
            onClick={() => {
              setTempApiKey(userApiKey);
              setShowApiKeyModal(true);
            }}
            className="flex items-center justify-center gap-2 w-full mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
          >
            <span>🔑</span>
            <span>{userApiKey ? 'Update API Key' : 'Use Your Own API Key'}</span>
          </button>
          
          {userApiKey && (
            <div className="text-xs text-green-400 mt-2">
              ✓ Using your OpenRouter API key • Unlimited combinations
            </div>
          )}
        </div>
      </div>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowApiKeyModal(false);
            }
          }}
        >
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">API Key Settings</h3>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="p-2 hover:bg-gray-700 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  OpenRouter API Key
                </label>
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="sk-or-..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Use your own API key to play without daily limits
                </p>
              </div>
              
              {tempApiKey && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Model Selection
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="flash"
                        checked={selectedModel === 'flash'}
                        onChange={(e) => setSelectedModel(e.target.value as 'flash' | 'pro')}
                        className="text-purple-500"
                      />
                      <span>Gemini Flash 2.5 (Faster, Cheaper)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="pro"
                        checked={selectedModel === 'pro'}
                        onChange={(e) => setSelectedModel(e.target.value as 'flash' | 'pro')}
                        className="text-purple-500"
                      />
                      <span>Gemini Pro 2.5 (Better Quality)</span>
                    </label>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 justify-end mt-6">
                <button
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setUserApiKey(tempApiKey);
                    setShowApiKeyModal(false);
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Mode Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold mb-3">Reset Progress?</h3>
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
                  setShowResetModal(false);
                  setResetAchievements(false);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReset}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded transition-colors font-medium"
              >
                Reset Progress
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
