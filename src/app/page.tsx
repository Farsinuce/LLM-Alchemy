'use client'

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { useSupabase } from '@/components/auth/SupabaseProvider';
import {
  createClient,
  getGameProgress,
  resetGameState,
  getLlmModelPreference,
  updateLlmModelPreference,
  getChallengePreference,
  updateChallengePreference
} from '@/lib/supabase';
import Emoji from '@/components/ui/Emoji';
import dynamic from 'next/dynamic';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });
import { 
  checkAndHandleUpgradeCallback
} from '@/lib/auth-utils';
import { GAME_CONFIG } from '@/lib/game-config';

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
  const [todaysChallenges, setTodaysChallenges] = useState<{id: string, challenge_type: string, title: string, reward_tokens: number, isCompleted: boolean, completionDetails: { element_discovered: string }}[]>([]);
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<'flash' | 'pro'>('flash');
  const [tempApiKey, setTempApiKey] = useState<string>('');
  const [tempSelectedModel, setTempSelectedModel] = useState<'flash' | 'pro'>('flash');
  const [tempShowChallenges, setTempShowChallenges] = useState<boolean>(true);
  const [isValidatingKey, setIsValidatingKey] = useState<boolean>(false);
  const [toast, setToast] = useState<string>('');
  
  // Authentication state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [showUpgradeBenefits, setShowUpgradeBenefits] = useState(false);
  
  // Payment state
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  
  // Challenge preferences - note: we show "Disable challenges" in UI but store as show_challenges in DB
  const [showChallenges, setShowChallenges] = useState(true);
  
  // Completed challenges modal
  const [showCompletedChallenges, setShowCompletedChallenges] = useState(false);
  const [completedChallenges, setCompletedChallenges] = useState<{
    id: string;
    element_discovered: string;
    game_mode: string;
    completed_at: string;
    challenges: {
      challenge_type: string;
      title: string;
      target_element: string;
      target_category: string;
      reward_tokens: number;
    } | null;
    tokens_awarded: number;
  }[]>([]);
  const [loadingCompleted, setLoadingCompleted] = useState(false);

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

  // Load API key from localStorage and preferences from Supabase on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('llm-alchemy-api-key');
    
    if (savedApiKey) {
      setUserApiKey(savedApiKey);
      // For API key users, load model preference from localStorage
      const savedModel = localStorage.getItem('llm-alchemy-model') as 'flash' | 'pro';
      if (savedModel && (savedModel === 'flash' || savedModel === 'pro')) {
        setSelectedModel(savedModel);
      }
    }
  }, []);

  // Load model preference and challenge preference from Supabase
  useEffect(() => {
    const loadPreferences = async () => {
      if (user) {
        const supabase = createClient();
        
        // Load model preference for non-API-key users
        if (!userApiKey) {
          const modelPreference = await getLlmModelPreference(supabase, user.id);
          setSelectedModel(modelPreference);
        }
        
        // Load challenge preference for all users
        const challengePreference = await getChallengePreference(supabase, user.id);
        setShowChallenges(challengePreference);
      }
    };

    loadPreferences();
  }, [user, userApiKey]);

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


  const handleShowAuth = (mode: 'login' | 'register' = 'login', showBenefits = false) => {
    setAuthModalMode(mode);
    setShowUpgradeBenefits(showBenefits);
    setShowAuthModal(true);
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      
      // Clear all local storage related to the app
      localStorage.removeItem('llm-alchemy-api-key');
      localStorage.removeItem('llm-alchemy-model');
      
      // Clear any other potential auth state
      window.location.reload();
      
      showToast('Logged out successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      showToast('Error logging out: ' + errorMessage);
    }
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

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      showToast(errorMessage || 'Payment failed');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  // Check auth states
  const hasSession = !!user;
  const isRegistered = hasSession && !dbUser?.is_anonymous;
  const isAnonymous = hasSession && (dbUser?.is_anonymous || false);
  const isLoggedOut = !hasSession;

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

  // Load challenges for registered users
  useEffect(() => {
    const loadChallenges = async () => {
      if (isRegistered) {
        try {
          const response = await fetch('/api/challenges/current');
          if (response.ok) {
            const data = await response.json();
            setTodaysChallenges(data.challenges || []);
          }
        } catch (error) {
          console.error('Error loading challenges:', error);
        }
      } else {
        setTodaysChallenges([]);
      }
    };

    loadChallenges();
  }, [isRegistered]);

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

  // Only show progress if there are more than the starting elements (5 base elements)
  const hasAnyProgress = progress && (
    (progress.science && progress.science.elements > 5) || 
    (progress.creative && progress.creative.elements > 5)
  );

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

  // Load completed challenges function
  const loadCompletedChallenges = async () => {
    if (!isRegistered) return;
    
    setLoadingCompleted(true);
    try {
      const response = await fetch('/api/challenges/completed');
      if (response.ok) {
        const data = await response.json();
        setCompletedChallenges(data.completedChallenges || []);
      } else {
        showToast('Failed to load completed challenges');
      }
    } catch (error) {
      console.error('Error loading completed challenges:', error);
      showToast('Error loading completed challenges');
    } finally {
      setLoadingCompleted(false);
    }
  };

  const handleViewAllChallenges = async () => {
    if (!isRegistered) {
      showToast('Please register to view challenges');
      return;
    }
    
    await loadCompletedChallenges();
    setShowCompletedChallenges(true);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-primary text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Emoji size="xl">✨</Emoji>
          <h1 className="text-5xl font-bold">LLM Alchemy</h1>
        </div>
        
        <p className="text-body mb-8">
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
                    <span className="font-medium flex items-center gap-1">
                      <Emoji>🧪</Emoji>
                      Science
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
                    <Emoji>❌</Emoji>
                  </button>
                </div>
              )}
              
              {progress?.creative && (
                <div className="flex justify-between items-center py-2 px-3 bg-purple-600/20 rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-medium flex items-center gap-1">
                      <Emoji>🎨</Emoji>
                      Creative
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
                    <Emoji>❌</Emoji>
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
            className="flex items-center justify-center gap-2 max-w-md mx-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-lg transition-all transform hover:scale-105"
          >
            {hasAnyProgress ? 'Continue Game' : 'New Game'}
            <ArrowRight size={20} />
          </button>
          
          <div className="text-sm text-gray-400 font-medium">
            {userApiKey ? (
              "Unlimited combinations"
            ) : dbUser?.subscription_status === 'premium' || (dbUser?.token_balance && dbUser.token_balance > 0) ? (
              `${dbUser.token_balance || 0} tokens remaining`
            ) : (
              `${Math.max(0, GAME_CONFIG.DAILY_FREE_COMBINATIONS - (dailyCount || 0))} combinations left today`
            )}
          </div>
          
          {/* Authentication / Account Status */}
          <div className="flex justify-center">
            {(isLoggedOut || isAnonymous) ? (
              <div className="space-y-3 flex flex-col items-center">
                <button
                  onClick={() => handleShowAuth('register')}
                  className="btn btn-surface btn-sm"
                >
                  <Emoji>👤</Emoji>
                  <span>Register / Sign in</span>
                </button>
                <button
                  onClick={() => {
                    setTempApiKey(userApiKey);
                    setTempSelectedModel(selectedModel);
                    setTempShowChallenges(showChallenges);
                    setShowApiKeyModal(true);
                  }}
                  className="btn btn-surface btn-sm"
                >
                  <Emoji>⚙️</Emoji>
                  <span>LLM Options</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-600/20 rounded-lg text-green-400 text-sm">
                    <span>✓</span>
                    <span>Signed in as {dbUser?.display_name || dbUser?.email || user?.email || 'User'}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="btn btn-sm status-error"
                  >
                    <Emoji>🚪</Emoji>
                    <span>Logout</span>
                  </button>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      setTempApiKey(userApiKey);
                      setTempSelectedModel(selectedModel);
                      setTempShowChallenges(showChallenges);
                      setShowApiKeyModal(true);
                    }}
                    className="btn btn-surface btn-sm"
                  >
                    <Emoji>⚙️</Emoji>
                    <span>LLM Options</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Upgrade button for registered freemium users */}
          {isRegistered && dbUser?.subscription_status === 'free' && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowPaymentSection(!showPaymentSection)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-colors text-sm text-white font-medium"
              >
                <Emoji>⭐</Emoji>
                <span>{showPaymentSection ? 'Hide Options' : 'Upgrade'}</span>
              </button>
            </div>
          )}
          
          {/* Payment Buttons for Authenticated Users */}
          {!isAnonymous && dbUser && showPaymentSection && (
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

          
          {userApiKey && (
            <div className="text-xs text-green-400 mt-2">
              ✓ Using your OpenRouter API key • Unlimited combinations
            </div>
          )}
        </div>

        {/* Challenges Preview - Moved to Bottom */}
        {isRegistered && showChallenges && todaysChallenges.length > 0 && (
          <div className="bg-gray-800/50 rounded-lg p-4 mt-6 text-left">
            <h3 className="text-sm font-semibold mb-3 text-center">Today&apos;s Challenges</h3>
            <div className="space-y-2">
              {todaysChallenges.slice(0, 3).map(challenge => (
                <div key={challenge.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Emoji>{challenge.challenge_type === 'daily' ? '🌟' : '🏆'}</Emoji>
                    <span className={`${challenge.isCompleted ? 'line-through text-green-400' : 'text-gray-300'}`}>
                      {challenge.title}
                    </span>
                    {challenge.isCompleted && challenge.completionDetails?.element_discovered && (
                      <span className="text-green-400 text-xs">
                        ✓ {challenge.completionDetails.element_discovered}
                      </span>
                    )}
                  </div>
                  <span className={`${challenge.isCompleted ? 'text-green-400' : 'text-warning'}`}>
                    {challenge.isCompleted ? '✓' : `+${challenge.reward_tokens}`}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-center">
              <button
                onClick={handleViewAllChallenges}
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                View all challenges →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* LLM Options Modal */}
      {showApiKeyModal && (
        <div 
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowApiKeyModal(false);
            }
          }}
        >
          <div className="modal-content max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-heading">LLM Options</h3>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="btn-ghost p-2 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Section 1: API Key Input */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <label className="text-sm font-medium">
                    <a 
                      href="https://openrouter.ai/settings/keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      OpenRouter
                    </a>
                    {" "}API Key
                  </label>
                </div>
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="sk-or..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Use your own API key to play without limits (localStorage)
                </p>
              </div>
              
              {/* Separator */}
              <div className="border-t border-gray-600"></div>
              
              {/* Section 2: Model Selection Toggle */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  LLM Selection
                </label>
                
                <div className="relative">
                  <button
                    onClick={() => {
                      // Check if user can toggle
                      const canToggle = userApiKey || 
                                      dbUser?.subscription_status === 'premium' || 
                                      (dbUser?.token_balance && dbUser.token_balance > 0);
                      
                      if (canToggle) {
                        setTempSelectedModel(tempSelectedModel === 'flash' ? 'pro' : 'flash');
                      } else {
                        showToast('Upgrade to toggle between Speed and Reasoning modes');
                      }
                    }}
                    className={`
                      w-full h-12 rounded-lg border-2 relative overflow-hidden transition-all
                      ${(userApiKey || dbUser?.subscription_status === 'premium' || (dbUser?.token_balance && dbUser.token_balance > 0))
                        ? 'border-purple-500 bg-gray-700 hover:bg-gray-600 cursor-pointer'
                        : 'border-gray-600 bg-gray-700/50 cursor-not-allowed opacity-50'
                      }
                    `}
                  >
                    <div className={`
                      absolute top-1 h-10 w-1/2 bg-purple-600 rounded-md transition-transform duration-200 ease-in-out
                      ${tempSelectedModel === 'pro' ? 'translate-x-full' : 'translate-x-0'}
                    `}></div>
                    
                    <div className="relative z-10 flex h-full">
                      <div className={`
                        flex-1 flex items-center justify-center font-medium transition-colors
                        ${tempSelectedModel === 'flash' ? 'text-white' : 'text-gray-300'}
                      `}>
                        Speed
                      </div>
                      <div className={`
                        flex-1 flex items-center justify-center font-medium transition-colors
                        ${tempSelectedModel === 'pro' ? 'text-white' : 'text-gray-300'}
                      `}>
                        Reasoning
                      </div>
                    </div>
                  </button>
                  
                  {!(userApiKey || dbUser?.subscription_status === 'premium' || (dbUser?.token_balance && dbUser.token_balance > 0)) && (
                    <p className="text-xs text-gray-500 mt-2">
                      Upgrade to unlock reasoning mode
                    </p>
                  )}
                </div>
              </div>
              
              {/* Separator */}
              <div className="border-t border-gray-600"></div>
              
              {/* Section 3: Challenge Toggle */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  Gameplay Options
                </label>
                <label className={`flex items-center gap-3 ${isAnonymous ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={isAnonymous ? true : !tempShowChallenges}
                    onChange={(e) => !isAnonymous && setTempShowChallenges(!e.target.checked)}
                    disabled={isAnonymous}
                    className={`w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2 ${isAnonymous ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  <span className={`text-sm ${isAnonymous ? 'text-gray-500' : 'text-gray-300'}`}>
                    Disable challenges
                  </span>
                </label>
                <p className="text-xs text-gray-400 mt-2">
                  {isAnonymous 
                    ? 'Challenges are only available for registered users'
                    : "When enabled, you won't receive challenge rewards or notifications"
                  }
                </p>
              </div>
              
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowApiKeyModal(false);
                    setTempApiKey(userApiKey);
                    setTempSelectedModel(selectedModel);
                  }}
                  className="btn btn-surface"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    // Validate API key if provided
                    if (tempApiKey.trim()) {
                      const isValid = await validateApiKey(tempApiKey);
                      if (!isValid) {
                        showToast('Invalid API key. Please check your OpenRouter API key and try again.');
                        return;
                      }
                    }
                    
                    // Save API key to localStorage
                    if (tempApiKey.trim()) {
                      setUserApiKey(tempApiKey);
                    } else {
                      setUserApiKey('');
                    }
                    
                    // Save model preference to Supabase
                    if (user && tempSelectedModel !== selectedModel) {
                      const supabase = createClient();
                      const success = await updateLlmModelPreference(supabase, user.id, tempSelectedModel);
                      if (success) {
                        setSelectedModel(tempSelectedModel);
                      }
                    }
                    
                    // Save challenge preference to Supabase (only for registered users)
                    if (user && !isAnonymous && tempShowChallenges !== showChallenges) {
                      const supabase = createClient();
                      const success = await updateChallengePreference(supabase, user.id, tempShowChallenges);
                      if (success) {
                        setShowChallenges(tempShowChallenges);
                      }
                    }
                    
                    setShowApiKeyModal(false);
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
        <div className="modal-backdrop">
          <div className="modal-content max-w-sm">
            <h3 className="text-heading mb-3">Reset Progress?</h3>
            <p className="text-body mb-4">
              Reset discovered elements in {selectedMode} mode?
            </p>
            
            <div className="mb-6">
              <label className="flex items-center gap-2 text-caption">
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
                className="btn btn-surface"
              >
                Cancel
              </button>
              <button
                onClick={confirmReset}
                className="btn btn-danger"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Challenges Modal */}
      {showCompletedChallenges && (
        <div 
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCompletedChallenges(false);
            }
          }}
        >
          <div className="modal-content max-w-2xl max-h-[80vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-heading">Completed Challenges</h3>
              <button
                onClick={() => setShowCompletedChallenges(false)}
                className="btn-ghost p-2 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            
            {loadingCompleted ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent mx-auto mb-2"></div>
                  <div className="text-sm text-gray-400">Loading challenges...</div>
                </div>
              </div>
            ) : completedChallenges.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-lg mb-2">
                  <Emoji size="lg">🎯</Emoji>
                </div>
                <div className="text-gray-400">No completed challenges yet</div>
                <div className="text-gray-500 text-sm mt-1">Complete challenges in-game to see them here</div>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto max-h-96">
                {completedChallenges.map((completion) => (
                  <div key={completion.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          <Emoji>{completion.challenges?.challenge_type === 'daily' ? '🌟' : '🏆'}</Emoji>
                        </span>
                        <div>
                          <div className="font-medium text-white">
                            {completion.challenges?.title || 'Challenge'}
                          </div>
                          <div className="text-sm text-gray-400">
                            {completion.challenges?.challenge_type === 'daily' ? 'Daily Challenge' : 'Weekly Challenge'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-medium">
                          +{completion.tokens_awarded || completion.challenges?.reward_tokens || 0} tokens
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(completion.completed_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400">Discovered:</span>
                      <span className="text-blue-400 font-medium">{completion.element_discovered}</span>
                      {completion.game_mode && (
                        <>
                          <span className="text-gray-500">•</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            completion.game_mode === 'science' 
                              ? 'bg-blue-600/20 text-blue-400' 
                              : 'bg-purple-600/20 text-purple-400'
                          }`}>
                            {completion.game_mode}
                          </span>
                        </>
                      )}
                    </div>
                    
                    {completion.challenges?.target_element && (
                      <div className="text-xs text-gray-500 mt-1">
                        Target: {completion.challenges.target_element}
                      </div>
                    )}
                    
                    {completion.challenges?.target_category && (
                      <div className="text-xs text-gray-500 mt-1">
                        Category: {completion.challenges.target_category}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setShowCompletedChallenges(false)}
                className="btn btn-surface"
              >
                Close
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
