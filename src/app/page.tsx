'use client'

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { useSupabase } from '@/components/auth/SupabaseProvider';
import { createClient, getGameProgress, resetGameState } from '@/lib/supabase-client';
import AuthModal from '@/components/auth/AuthModal';
import { 
  shouldShowUpgradePrompt, 
  shouldShowUpgradeButton, 
  upgradeAnonymousAccount, 
  upgradeAnonymousAccountWithGoogle,
  checkAndHandleUpgradeCallback
} from '@/lib/auth-utils';

interface GameProgress {
  science: { elements: number, endElements: number, achievements: number, lastPlayed?: string } | null;
  creative: { elements: number, endElements: number, achievements: number, lastPlayed?: string } | null;
  lastMode: 'science' | 'creative';
}

export default function Home() {
  const { user, dbUser, dailyCount, loading } = useSupabase();
  const router = useRouter();
  const [progress, setProgress] = useState<GameProgress | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetAchievements, setResetAchievements] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'science' | 'creative'>('science');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<'flash' | 'pro'>('flash');
  const [tempApiKey, setTempApiKey] = useState<string>('');
  const [isValidatingKey, setIsValidatingKey] = useState<boolean>(false);
  const [toast, setToast] = useState<string>('');
  
  // Authentication state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [showUpgradeBenefits, setShowUpgradeBenefits] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  
  // Payment state
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

  // Show toast function
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  // API key validation function
  const validateApiKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey.trim()) return false;
    
    setIsValidatingKey(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: 'Test validation. Respond with just: {"result": "test", "emoji": "✅", "color": "#00FF00", "rarity": "common", "reasoning": "validation test", "tags": []}',
          gameMode: 'science',
          apiKey: apiKey,
          useProModel: false
        })
      });

      if (response.ok) {
        const result = await response.json();
        return !result.error;
      }
      return false;
    } catch (error) {
      console.error('API key validation error:', error);
      return false;
    } finally {
      setIsValidatingKey(false);
    }
  };

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

  // Check for upgrade callback on mount
  useEffect(() => {
    const handleUpgradeCallback = async () => {
      const wasUpgraded = await checkAndHandleUpgradeCallback();
      if (wasUpgraded) {
        showToast('Account upgraded! Your progress has been saved.');
      }
    };
    
    handleUpgradeCallback();
  }, []);

  // Authentication handlers
  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    showToast('Welcome! You can now purchase tokens and subscriptions.');
  };

  const handleUpgradeAccount = async () => {
    if (!user || !dbUser) return;
    
    setIsUpgrading(true);
    const result = await upgradeAnonymousAccountWithGoogle(user.id);
    
    if (result.success) {
      showToast(result.message);
    } else {
      showToast(result.message);
      setIsUpgrading(false);
    }
  };

  const handleShowAuth = (mode: 'login' | 'register' = 'login', showBenefits = false) => {
    setAuthModalMode(mode);
    setShowUpgradeBenefits(showBenefits);
    setShowAuthModal(true);
  };

  // Payment handlers
  const handleStripePayment = async (productId: string) => {
    if (isAnonymous) {
      // Show auth modal first for anonymous users
      handleShowAuth('register', true);
      return;
    }

    setIsCreatingPayment(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Payment creation failed');
      }

      // Redirect to Stripe Checkout
      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (error: any) {
      showToast(error.message || 'Payment failed');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  // Check if user should see upgrade prompts
  const isAnonymous = dbUser?.is_anonymous || false;
  const shouldShowUpgrade = shouldShowUpgradeButton(dailyCount, 5, isAnonymous);
  const shouldShowUpgradePromptNow = shouldShowUpgradePrompt(dailyCount, 5, isAnonymous);

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

  // Refresh progress when page becomes visible (returning from game)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && user) {
        const supabase = createClient();
        const gameProgress = await getGameProgress(supabase, user.id);
        setProgress(gameProgress);
      }
    };

    const handleFocus = async () => {
      if (user) {
        const supabase = createClient();
        const gameProgress = await getGameProgress(supabase, user.id);
        setProgress(gameProgress);
      }
    };

    // Listen for page visibility changes and window focus
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
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
                      <span className="hidden sm:inline">🧪 </span>Science
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
                      <span className="hidden sm:inline">🎨 </span>Creative
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
          
          {/* Authentication / Account Status */}
          <div className="flex justify-center">
            {isAnonymous ? (
              <button
                onClick={() => handleShowAuth('register', shouldShowUpgrade)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
                  shouldShowUpgrade 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
                }`}
              >
                <span>👤</span>
                <span>{shouldShowUpgrade ? 'Upgrade Account' : 'Create Account'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-600/20 rounded-lg text-green-400 text-sm">
                <span>✓</span>
                <span>Signed in as {dbUser?.display_name || dbUser?.email}</span>
              </div>
            )}
          </div>
          
          {/* Payment Buttons for Authenticated Users */}
          {!isAnonymous && dbUser && (
            <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-center">Get More Tokens</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => handleStripePayment('tokens_100')}
                  disabled={isCreatingPayment}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-all text-sm"
                >
                  {isCreatingPayment ? 'Processing...' : '100 tokens - €0.40'}
                </button>
                <button
                  onClick={() => handleStripePayment('tokens_500')}
                  disabled={isCreatingPayment}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-all text-sm"
                >
                  {isCreatingPayment ? 'Processing...' : '500 tokens - €1.80'}
                </button>
                <button
                  onClick={() => handleStripePayment('tokens_1000')}
                  disabled={isCreatingPayment}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-all text-sm"
                >
                  {isCreatingPayment ? 'Processing...' : '1000 tokens - €3.50'}
                </button>
                <button
                  onClick={() => handleStripePayment('subscription_monthly')}
                  disabled={isCreatingPayment}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-all text-sm"
                >
                  {isCreatingPayment ? 'Processing...' : 'Monthly - €5.99'}
                </button>
              </div>
              <div className="text-xs text-gray-400 text-center">
                Current balance: {dbUser.token_balance || 0} tokens
              </div>
            </div>
          )}

          {/* Quick Sign In for returning users */}
          {isAnonymous && (
            <div className="flex justify-center">
              <button
                onClick={() => handleShowAuth('login', false)}
                className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
              >
                Already have an account? Sign in
              </button>
            </div>
          )}
          
          {/* API Key Button - More subtle */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                setTempApiKey(userApiKey);
                setShowApiKeyModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm text-gray-300 hover:text-white"
            >
              <span>🔑</span>
              <span>{userApiKey ? 'Update API Key' : 'Use Your Own API Key'}</span>
            </button>
          </div>
          
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
                  Use your own API key to play without limits
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
                  onClick={async () => {
                    if (tempApiKey.trim()) {
                      // Validate API key before saving
                      const isValid = await validateApiKey(tempApiKey);
                      if (isValid) {
                        setUserApiKey(tempApiKey);
                        setShowApiKeyModal(false);
                      } else {
                        alert('Invalid API key. Please check your OpenRouter API key and try again.');
                        return;
                      }
                    } else {
                      // Allow clearing the API key
                      setUserApiKey('');
                      setShowApiKeyModal(false);
                    }
                  }}
                  disabled={isValidatingKey}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isValidatingKey 
                      ? 'bg-gray-600 cursor-not-allowed' 
                      : 'bg-purple-600 hover:bg-purple-500'
                  }`}
                >
                  {isValidatingKey ? 'Validating...' : 'Save'}
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
              Reset discovered elements in {selectedMode} mode?
            </p>
            
            <div className="mb-6">
              <label className="flex items-center gap-2 text-sm">
                <input 
                  type="checkbox"
                  checked={resetAchievements}
                  onChange={(e) => setResetAchievements(e.target.checked)}
                  className="rounded"
                />
                Reset achievements
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
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AuthModal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        initialMode={authModalMode}
        showUpgradeBenefits={showUpgradeBenefits}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 px-4 py-2 rounded-lg z-50">
          {toast}
        </div>
      )}
    </main>
  );
}
