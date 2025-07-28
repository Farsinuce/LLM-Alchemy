import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Sparkles, X, GripHorizontal, User, ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSupabase } from '@/components/auth/SupabaseProvider';
import { createClient, incrementDailyCount, decrementDailyCount, saveGameState, loadGameState, consumeToken, addTokens, getLlmModelPreference } from '@/lib/supabase-client';
import { buildSharedSections, buildSciencePrompt, buildCreativePrompt } from '@/lib/llm-prompts';
import { Achievement, checkAchievements, updateAchievementsWithProgress } from '@/lib/achievements';
import { GAME_CONFIG } from '@/lib/game-config';
import { ChallengeBar } from '@/components/game/ChallengeBar';
import { elementMatchesCategory } from '@/lib/challenge-elements';
import { resolveEmoji } from '@/lib/openmoji-service';
import { OpenMojiDisplay } from '@/components/game/OpenMojiDisplay';

// Type definitions
interface Element {
  id: string;
  name: string;
  emoji: string;
  color: string;
  unlockOrder: number;
  rarity?: string;
  reasoning?: string;
  tags?: string[];
  isEndElement?: boolean;
  parents?: Element[]; // Runtime only - the elements that created this one
  energyEnhanced?: boolean; // Runtime only - tracks if this was created via energy enhancement
  // OpenMoji-specific fields (only for PUA emojis)
  openmojiHex?: string;      // Hexcode for non-Unicode emojis
  isOpenmojiExtra?: boolean; // True if using PUA emoji
}

interface MixingElement extends Element {
  x: number;
  y: number;
  index: number;
  energized: boolean;
  fromMixingArea?: boolean;
  mixIndex?: number | null;
}


interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
  y: number;
  directionX: number;
  directionY: number;
  speed: number;
  opacity: number;
  maxOpacity: number;
  lifespan: number;
  age: number;
}

interface ReasoningPopup {
  element: Element;
  x: number;
  y: number;
  fromHover: boolean;
}

interface ShowUnlock extends Element {
  isNew: boolean;
  achievement?: Achievement | null;
}

interface MixingElements {
  elements: Element[];
  indices: number[];
}

interface LastCombination {
  elementCreated: Element;
  combinationKey: string;
  achievementsGained: Achievement[];
  endElementsGained: Element[];
  wasEndElement: boolean;
  timestamp: number;
}

// Type for window.webkitAudioContext
interface WindowWithWebkit extends Window {
  webkitAudioContext?: typeof AudioContext;
}

// Constants
const CONSTANTS = {
  HOVER_DELAY: 500,
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 3000,
  ELEMENT_SIZES: { sm: 48, md: 56, lg: 64 },
  BREAKPOINTS: { sm: 640, md: 768 },
  COLLISION_SPACING: 8,
  MAX_COLLISION_DISTANCE: 300,
  COLLISION_POSITIONS: 16
};

// Utility functions
const getElementSize = () => {
  if (window.innerWidth < CONSTANTS.BREAKPOINTS.sm) return CONSTANTS.ELEMENT_SIZES.sm;
  if (window.innerWidth < CONSTANTS.BREAKPOINTS.md) return CONSTANTS.ELEMENT_SIZES.md;
  return CONSTANTS.ELEMENT_SIZES.lg;
};

// Detect if the device has touch capabilities
const isTouchDevice =
  typeof window !== "undefined" &&
  (("ontouchstart" in window) || navigator.maxTouchPoints > 0);


const LLMAlchemy = () => {
  const { user, dbUser, dailyCount, tokenBalance, refreshDailyCount, refreshTokenBalance } = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [gameMode, setGameMode] = useState<'science' | 'creative'>('science');
  const [elements, setElements] = useState<Element[]>([
    { id: 'energy', name: 'Energy', emoji: '〰️', color: '#FFD700', unlockOrder: 0 },
    { id: 'earth', name: 'Earth', emoji: '🌍', color: '#8B4513', unlockOrder: 1 },
    { id: 'air', name: 'Air', emoji: '💨', color: '#87CEEB', unlockOrder: 2 },
    { id: 'fire', name: 'Fire', emoji: '🔥', color: '#FF4500', unlockOrder: 3 },
    { id: 'water', name: 'Water', emoji: '💧', color: '#4682B4', unlockOrder: 4 },
  ]);
  const [endElements, setEndElements] = useState<Element[]>([]);
  const [mixingArea, setMixingArea] = useState<MixingElement[]>([]);
  const [sortMode, setSortMode] = useState<string>('unlock');
  const [combinations, setCombinations] = useState<Record<string, string | null>>({});
  const [showUnlock, setShowUnlock] = useState<ShowUnlock | null>(null);
  const [, setMixingElements] = useState<MixingElements | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [hoveredElement, setHoveredElement] = useState<number | null>(null);
  const [isMixing, setIsMixing] = useState<boolean>(false);
  const [hoveredUIElement, setHoveredUIElement] = useState<string | null>(null);
  const [touchDragging, setTouchDragging] = useState<MixingElement | null>(null);
  const [touchOffset, setTouchOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [listHeight, setListHeight] = useState<number>(192);
  const [isDraggingDivider, setIsDraggingDivider] = useState<boolean>(false);
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [toast, setToast] = useState<string>('');
  const [shakeElement, setShakeElement] = useState<string | null>(null);
  const [popElement, setPopElement] = useState<string | null>(null);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [dragStartHeight, setDragStartHeight] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [unlockAnimationStartTime, setUnlockAnimationStartTime] = useState<number | null>(null);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [reasoningPopup, setReasoningPopup] = useState<ReasoningPopup | null>(null);
  const [showAchievements, setShowAchievements] = useState<boolean>(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<'flash' | 'pro'>('flash');
  const [lastCombination, setLastCombination] = useState<LastCombination | null>(null);
  const [undoUsed, setUndoUsed] = useState<boolean>(false);
  const [undoAvailable, setUndoAvailable] = useState<boolean>(false);
  const [totalCombinationsMade, setTotalCombinationsMade] = useState<number>(0);
  
  // Failed combinations tracking for improved LLM context
  const [failedCombinations, setFailedCombinations] = useState<string[]>([]);
  
  // State restoration tracking to prevent race conditions during mode switching
  const [isStateRestored, setIsStateRestored] = useState<boolean>(false);
  
  // Element dimming for drag feedback
  const [dimmedElements, setDimmedElements] = useState<Set<string>>(new Set());
  
  // New animation state for mixing area elements
  const [animatingElements, setAnimatingElements] = useState<Set<string>>(new Set());
  
  // Undo protection state to prevent token abuse
  const [isUndoing, setIsUndoing] = useState<boolean>(false);
  
  // Element load animation state
  const [isPlayingLoadAnimation, setIsPlayingLoadAnimation] = useState<boolean>(false);
  const [animatedElements, setAnimatedElements] = useState<Set<string>>(new Set());
  
  // Challenge-related state
  interface Challenge {
    id: string;
    challenge_type: 'daily' | 'weekly';
    title: string;
    target_element?: string;
    target_category?: string;
    reward_tokens: number;
    start_date: string;
    end_date: string;
    isCompleted: boolean;
  }
  const [currentChallenges, setCurrentChallenges] = useState<Challenge[]>([]);
  
  // Load API key from localStorage on mount (optional - for convenience)
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
  
  // Fetch current challenges
  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const response = await fetch('/api/challenges/current');
        if (response.ok) {
          const data = await response.json();
          setCurrentChallenges(data.challenges || []);
        }
      } catch (error) {
        console.error('Error fetching challenges:', error);
      }
    };

    fetchChallenges();
    // Refresh challenges every minute
    const interval = setInterval(fetchChallenges, 60000);
    return () => clearInterval(interval);
  }, []);
  
  // Check if a newly discovered element completes any challenges
  const checkChallengeCompletion = async (element: Element) => {
    if (!user || currentChallenges.length === 0) return;
    
    // Skip challenge completion check if user has disabled challenges
    if (dbUser && !dbUser.is_anonymous) {
      const supabase = createClient();
      const { getChallengePreference } = await import('@/lib/supabase-client');
      const challengesEnabled = await getChallengePreference(supabase, user.id);
      if (!challengesEnabled) return;
    }
    
    for (const challenge of currentChallenges) {
      // Skip if already completed
      if (challenge.isCompleted) continue;
      
      let isCompleted = false;
      
      // Check if element matches the challenge criteria
      if (challenge.target_element) {
        // Weekly challenge - specific element
        isCompleted = element.name.toLowerCase() === challenge.target_element.toLowerCase();
      } else if (challenge.target_category && element.tags) {
        // Daily challenge - category (use proper tag matching with synonyms)
        isCompleted = elementMatchesCategory(element.tags, challenge.target_category);
      }
      
      if (isCompleted) {
        try {
          const response = await fetch('/api/challenges/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              challengeId: challenge.id,
              elementDiscovered: element.name,
              elementTags: element.tags || [],
              gameMode
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            
            // Update challenge state
            setCurrentChallenges(prev => 
              prev.map(c => c.id === challenge.id ? { ...c, isCompleted: true } : c)
            );
            
            // Show completion toast
            if (result.tokensAwarded > 0) {
              showToast(`🎉 Challenge completed! +${result.tokensAwarded} tokens`);
              // Refresh token balance
              await refreshTokenBalance();
            } else {
              showToast(`🎉 Challenge completed!`);
            }
            
            // Play reward sound
            playSound('reward');
          }
        } catch (error) {
          console.error('Error completing challenge:', error);
        }
      }
    }
  };

  // Load model preference from Supabase for non-API-key users
  useEffect(() => {
    const loadModelPreference = async () => {
      if (user && !userApiKey) {
        const supabase = createClient();
        const modelPreference = await getLlmModelPreference(supabase, user.id);
        setSelectedModel(modelPreference);
      }
    };

    loadModelPreference();
  }, [user, userApiKey]);
  
  const draggedElement = useRef<MixingElement | null>(null);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const floatingEmojiId = useRef<number>(0);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle URL mode parameter and game state loading
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode && (mode === 'science' || mode === 'creative')) {
      setGameMode(mode as 'science' | 'creative');
    }
  }, [searchParams]);

  // Load game state when user and game mode are available
  useEffect(() => {
    const loadSavedState = async () => {
      if (user && gameMode) {
        console.log(`[GAME_STATE_DEBUG] 🔄 Loading saved state for user ${user.id} in ${gameMode} mode...`);
        setIsStateRestored(false); // Mark as loading
        
        try {
          const supabase = createClient();
          const savedState = await loadGameState(supabase, user.id, gameMode);
          
          if (savedState) {
            console.log(`[GAME_STATE_DEBUG] ✅ Found saved state:`, {
              elements: savedState.elements?.length || 0,
              end_elements: savedState.end_elements?.length || 0,
              combinations: Object.keys(savedState.combinations || {}).length,
              achievements: savedState.achievements?.length || 0,
              failed_combinations: savedState.failed_combinations?.length || 0,
              last_updated: savedState.updated_at
            });
            
            // Restore discovered elements
            if (Array.isArray(savedState.elements) && savedState.elements.length > 0) {
              console.log(`[GAME_STATE_DEBUG] 🧪 Restoring ${savedState.elements.length} elements:`, 
                savedState.elements.map(e => e.name).join(', '));
              
              // Set animation state FIRST to prevent flash
              if (savedState.elements.length > 5) {
                setIsPlayingLoadAnimation(true);
                setAnimatedElements(new Set(savedState.elements.map(e => e.id)));
              }
              
              // Then set elements (they'll start invisible due to animation state)
              setElements(savedState.elements);
              
              // Trigger load animation immediately (no delay needed)
              if (savedState.elements.length > 5) {
                playElementLoadAnimation(savedState.elements);
              }
            }
            
            // Restore end elements
            if (Array.isArray(savedState.end_elements) && savedState.end_elements.length > 0) {
              console.log(`[GAME_STATE_DEBUG] 🏁 Restoring ${savedState.end_elements.length} end elements:`, 
                savedState.end_elements.map(e => e.name).join(', '));
              setEndElements(savedState.end_elements);
            }
            
            // Restore combinations
            if (savedState.combinations && typeof savedState.combinations === 'object') {
              console.log(`[GAME_STATE_DEBUG] 🔗 Restoring ${Object.keys(savedState.combinations).length} combinations`);
              setCombinations(savedState.combinations);
            }
            
            // Restore achievements
            if (Array.isArray(savedState.achievements) && savedState.achievements.length > 0) {
              console.log(`[GAME_STATE_DEBUG] 🏆 Restoring ${savedState.achievements.length} achievements:`, 
                savedState.achievements.map(a => a.name).join(', '));
              setAchievements(savedState.achievements);
            }
            
            // Restore failed combinations
            if (Array.isArray(savedState.failed_combinations) && savedState.failed_combinations.length > 0) {
              console.log(`[GAME_STATE_DEBUG] ❌ Restoring ${savedState.failed_combinations.length} failed combinations:`, 
                savedState.failed_combinations.join(', '));
              setFailedCombinations(savedState.failed_combinations);
            }
          } else {
            console.log(`[GAME_STATE_DEBUG] 📭 No saved state found for ${gameMode} mode - starting fresh`);
          }
        } catch (error) {
          console.error('[GAME_STATE_DEBUG] ❌ Error loading game state:', error);
        } finally {
          setIsStateRestored(true); // Mark as restored even if loading failed
        }
      }
    };

    loadSavedState();
  }, [user, gameMode]);

  // Auto-save game state when elements, endElements, combinations, achievements, or failed combinations change
  useEffect(() => {
    // Skip auto-save if state is still being restored to prevent race conditions
    if (!isStateRestored) return;

    // Capture current values to avoid reference issues during poor connectivity
    const snapshot = {
      mode: gameMode,
      elems: [...elements],
      ends: [...endElements], 
      comb: { ...combinations },
      ach: [...achievements],
      fails: [...failedCombinations]
    };

    const saveState = async () => {
      if (user && snapshot.mode && (snapshot.elems.length > 5 || snapshot.ends.length > 0 || Object.keys(snapshot.comb).length > 0)) {
        console.log(`[GAME_STATE_DEBUG] 💾 Auto-saving state for user ${user.id} in ${snapshot.mode} mode...`, {
          elements: snapshot.elems.length,
          end_elements: snapshot.ends.length,
          combinations: Object.keys(snapshot.comb).length,
          achievements: snapshot.ach.length,
          failed_combinations: snapshot.fails.length,
          trigger: 'auto-save-debounced'
        });
        
        try {
          const supabase = createClient();
          await saveGameState(supabase, user.id, {
            game_mode: snapshot.mode,
            elements: snapshot.elems,
            end_elements: snapshot.ends,
            combinations: snapshot.comb,
            achievements: snapshot.ach,
            failed_combinations: snapshot.fails
          });
          console.log(`[GAME_STATE_DEBUG] ✅ Auto-save completed successfully`);
        } catch (error) {
          console.error('[GAME_STATE_DEBUG] ❌ Auto-save failed:', error);
        }
      } else {
        console.log(`[GAME_STATE_DEBUG] ⏭️ Skipping auto-save:`, {
          hasUser: !!user,
          hasGameMode: !!snapshot.mode,
          elementsCount: snapshot.elems.length,
          endElementsCount: snapshot.ends.length,
          combinationsCount: Object.keys(snapshot.comb).length,
          reason: !user ? 'no user' : !snapshot.mode ? 'no game mode' : 'not enough progress'
        });
      }
    };

    // Use debounce for background saves but immediate save is handled in performMix
    const timeoutId = setTimeout(saveState, 2000);
    return () => clearTimeout(timeoutId);
  }, [user, gameMode, elements, endElements, combinations, achievements, failedCombinations, isStateRestored]);

  // Handle back to home
  const handleBackToHome = () => {
    router.push('/');
  };

  // No need to initialize daily count - it comes from Supabase provider

  // Cleanup effects for memory leaks
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);


  useEffect(() => {
    // Initialize Web Audio API
    audioContext.current = new (window.AudioContext || (window as WindowWithWebkit).webkitAudioContext!)();
  }, []);

  useEffect(() => {
    // Set proper starting elements based on game mode - RESET TO BASE ELEMENTS
    const isCurrentlyCreative = gameMode === 'creative';
    const isCurrentlyScience = gameMode === 'science';
    
    // Only reset if we're actually switching modes (not on initial load with saved state)
    const isModeSwitching = (isCurrentlyCreative && elements.find(e => e.name === 'Energy')) ||
                           (isCurrentlyScience && elements.find(e => e.name === 'Life'));
    
    if (isModeSwitching) {
      // Reset to base starting elements for the new mode
      if (isCurrentlyCreative) {
        setElements([
          { id: 'life', name: 'Life', emoji: '🧬', color: '#32CD32', unlockOrder: 0 },
          { id: 'earth', name: 'Earth', emoji: '🌍', color: '#8B4513', unlockOrder: 1 },
          { id: 'air', name: 'Air', emoji: '💨', color: '#87CEEB', unlockOrder: 2 },
          { id: 'fire', name: 'Fire', emoji: '🔥', color: '#FF4500', unlockOrder: 3 },
          { id: 'water', name: 'Water', emoji: '💧', color: '#4682B4', unlockOrder: 4 },
        ]);
      } else {
        setElements([
          { id: 'energy', name: 'Energy', emoji: '〰️', color: '#FFD700', unlockOrder: 0 },
          { id: 'earth', name: 'Earth', emoji: '🌍', color: '#8B4513', unlockOrder: 1 },
          { id: 'air', name: 'Air', emoji: '💨', color: '#87CEEB', unlockOrder: 2 },
          { id: 'fire', name: 'Fire', emoji: '🔥', color: '#FF4500', unlockOrder: 3 },
          { id: 'water', name: 'Water', emoji: '💧', color: '#4682B4', unlockOrder: 4 },
        ]);
      }
      
      // Clear all other mode-specific state
      setEndElements([]);
      setCombinations({});
      setAchievements([]);
      setMixingArea([]);
      setFloatingEmojis([]);
      
      // Clear any popup states
      setShowUnlock(null);
      setReasoningPopup(null);
      setShakeElement(null);
      setPopElement(null);
    }
  }, [gameMode]);

  // Add global touch move and end handlers
  useEffect(() => {
    const handleGlobalTouchMove = (e: TouchEvent) => {
      handleTouchMove(e);
      handleDividerTouchMove(e);
    };
    
    const handleGlobalTouchEnd = (e: TouchEvent) => {
      handleTouchEnd(e);
      handleDividerTouchEnd();
    };
    
    if (touchDragging || isDraggingDivider) {
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd);
      
      return () => {
        document.removeEventListener('touchmove', handleGlobalTouchMove);
        document.removeEventListener('touchend', handleGlobalTouchEnd);
      };
    }
  }, [touchDragging, isDraggingDivider, mixingArea]);

  const playSound = (type: string) => {
    if (!audioContext.current) return;
    
    const osc = audioContext.current.createOscillator();
    const gainNode = audioContext.current.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioContext.current.destination);
    
    const now = audioContext.current.currentTime;
    
    switch(type) {
      case 'plop':
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'pop':
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      case 'reward':
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      case 'end-element':
        osc.frequency.setValueAtTime(440, now); // A4
        osc.frequency.setValueAtTime(554.37, now + 0.15); // C#5
        osc.frequency.setValueAtTime(659.25, now + 0.3); // E5
        gainNode.gain.setValueAtTime(0.35, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case 'press':
        osc.frequency.setValueAtTime(200, now);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      case 'click':
        osc.frequency.setValueAtTime(1000, now);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
        break;
      case 'reverse-pop':
        // Reverse of 'pop' sound - frequency rises instead of falls
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  // Helper function to find which elements have been previously mixed with the given element
  const getPreviouslyMixedElements = (elementName: string): Set<string> => {
    const mixedWith = new Set<string>();
    
    // Check combinations object
    Object.keys(combinations).forEach(comboKey => {
      const parts = comboKey.split('+');
      if (parts.includes(elementName)) {
        parts.forEach(part => {
          if (part !== elementName && part !== 'Energy') {
            mixedWith.add(part);
          }
        });
      }
    });
    
    // Check failed combinations
    failedCombinations.forEach(failedCombo => {
      const parts = failedCombo.split('+');
      if (parts.includes(elementName)) {
        parts.forEach(part => {
          if (part !== elementName && part !== 'Energy') {
            mixedWith.add(part);
          }
        });
      }
    });
    
    return mixedWith;
  };

  // Function to check if daily limit is reached (before API call)
  const checkDailyLimit = () => {
    // If user has their own API key, no limits
    if (userApiKey) {
      return true;
    }
    
    // If user has tokens, they can use them
    if (tokenBalance > 0) {
      return true;
    }
    
    // Otherwise check daily limit
    if (dailyCount >= GAME_CONFIG.DAILY_FREE_COMBINATIONS) {
      showToast(`Daily limit reached: ${dailyCount}/${GAME_CONFIG.DAILY_FREE_COMBINATIONS} - Click "Get more" for tokens!`);
      return false;
    }
    return true;
  };

  // Function to increment daily counter (after successful API call)
  const incrementDailyCounter = async () => {
    try {
      if (user && !userApiKey) {
        const supabase = createClient();
        
        // If user has tokens, consume one
        if (tokenBalance > 0) {
          await consumeToken(supabase, user.id);
          await refreshTokenBalance();
        } else {
          // Otherwise increment daily count
          await incrementDailyCount(supabase, user.id);
          await refreshDailyCount();
        }
      }
      return true;
    } catch (error) {
      console.error('Error updating usage counter:', error);
      return true; // Don't block gameplay for counter errors
    }
  };

  const showReasoningPopup = (element: Element, event: React.MouseEvent | React.TouchEvent) => {
    if (!element.reasoning) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    setReasoningPopup({
      element,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      fromHover: event.type === 'mouseenter'
    });
  };

  const hideReasoningPopup = () => {
    setReasoningPopup(null);
  };

  // Helper function to animate element removal with staggered timing
  const animateRemoval = useCallback((elements: MixingElement[], onComplete: () => void) => {
    if (elements.length === 0) {
      onComplete();
      return;
    }
    
    // Start animations with stagger
    elements.forEach((el, index) => {
      setTimeout(() => {
        setAnimatingElements(prev => new Set(prev).add(`${el.id}-${el.index}`));
      }, index * 50); // 50ms stagger for smooth cascading effect
    });
    
    // Clean up after longest animation
    const totalDuration = elements.length * 50 + 300; // stagger + animation duration
    setTimeout(() => {
      onComplete();
      setAnimatingElements(new Set());
    }, totalDuration);
  }, []);

  // Helper function to play pop-in animation for all elements when loading game
  const playElementLoadAnimation = useCallback((elementsToAnimate: Element[]) => {
    // Filter out starting elements (unlockOrder 0-4) and don't animate if only base elements or already playing
    const elementsToAnimate_filtered = elementsToAnimate.filter(e => e.unlockOrder > 4);
    if (elementsToAnimate_filtered.length === 0 || isPlayingLoadAnimation) return;
    
    console.log('[LOAD ANIMATION] Starting CSS-delayed element load animation for', elementsToAnimate_filtered.length, 'elements');
    setIsPlayingLoadAnimation(true);
    
    // Sort by unlock order for proper sequence
    const sortedElements = [...elementsToAnimate_filtered].sort((a, b) => a.unlockOrder - b.unlockOrder);
    
    // Add all elements to animated set immediately - CSS will handle timing
    setAnimatedElements(new Set(sortedElements.map(e => e.id)));
    
    // Calculate total duration: (elements * 25ms delay) + 300ms animation + 200ms buffer
    const totalDuration = (sortedElements.length * 25) + 300 + 200;
    
    // Mark sequence complete after all animations finish
    setTimeout(() => {
      setIsPlayingLoadAnimation(false);
      setAnimatedElements(new Set()); // Clear for next time
      console.log('[LOAD ANIMATION] ALL animations completed - total duration:', totalDuration + 'ms');
    }, totalDuration);
  }, [isPlayingLoadAnimation]);

  const handleElementClick = (element: Element, event: React.MouseEvent) => {
    // Always allow clicks to show reasoning if element has it
    if (element.reasoning) {
      event.preventDefault();
      event.stopPropagation();
      showReasoningPopup(element, event);
    }
  };

  const handleElementMouseEnter = (element: Element, event: React.MouseEvent) => {
    // Show popup on hover for desktop with 500ms delay
    if (!isTouchDevice && element.reasoning) {
      // Clear any existing timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      // Capture the bounding rect immediately
      const rect = event.currentTarget.getBoundingClientRect();
      // Set 500ms delay
      hoverTimeoutRef.current = setTimeout(() => {
        // Create a synthetic event with the captured rect
        const syntheticEvent = {
          currentTarget: {
            getBoundingClientRect: () => rect
          },
          type: 'mouseenter'
        };
        showReasoningPopup(element, syntheticEvent as React.MouseEvent);
      }, 500);
    }
  };

  const handleElementMouseLeave = () => {
    // Clear timeout if leaving before 500ms
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // Hide popup if it was from hover
    if (reasoningPopup && reasoningPopup.fromHover) {
      hideReasoningPopup();
    }
  };

  const getContrastColor = (hexcolor: string) => {
    const r = parseInt(hexcolor.slice(1, 3), 16);
    const g = parseInt(hexcolor.slice(3, 5), 16);
    const b = parseInt(hexcolor.slice(5, 7), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#FFFFFF';
  };

  const getRarityHoverColor = (rarity: string = 'common') => {
    switch (rarity) {
      case 'uncommon': return '#10B981'; // Green
      case 'rare': return '#8B5CF6';     // Purple  
      default: return '#6B7280';         // Gray (common)
    }
  };

  // Optimized collision detection with cached element size
  const elementSize = useMemo(() => getElementSize(), []);

  const checkCollision = useCallback((x1: number, y1: number, x2: number, y2: number, size: number | null = null) => {
    const currentSize = size || elementSize;
    return Math.abs(x1 - x2) < currentSize && Math.abs(y1 - y2) < currentSize;
  }, [elementSize]);

  const hasCollisionAt = useCallback((x: number, y: number, excludeIndex: number | null = null) => {
    const rect = dropZoneRef.current?.getBoundingClientRect();
    if (!rect) return false;
    
    // Check boundaries
    if (x < 0 || y < 0 || x + elementSize > rect.width || y + elementSize > rect.height) {
      return true; // Out of bounds
    }
    
    // Check collision with existing elements
    return mixingArea.some(el => 
      el.index !== excludeIndex && checkCollision(x, y, el.x, el.y)
    );
  }, [elementSize, mixingArea, checkCollision]);

  const findBestPosition = useCallback((centerX: number, centerY: number, excludeIndex: number | null = null) => {
    const spacing = elementSize + CONSTANTS.COLLISION_SPACING;
    
    // Try center first
    if (!hasCollisionAt(centerX, centerY, excludeIndex)) {
      return { x: centerX, y: centerY };
    }
    
    // Spiral outward from center
    for (let distance = spacing; distance < CONSTANTS.MAX_COLLISION_DISTANCE; distance += spacing * 0.7) {
      // Try positions around each circle
      for (let i = 0; i < CONSTANTS.COLLISION_POSITIONS; i++) {
        const angle = (i / CONSTANTS.COLLISION_POSITIONS) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;
        
        if (!hasCollisionAt(x, y, excludeIndex)) {
          return { x, y };
        }
      }
    }
    
    // Fallback: find any available position in grid pattern
    const rect = dropZoneRef.current?.getBoundingClientRect();
    if (rect) {
      for (let y = 0; y < rect.height - elementSize; y += spacing) {
        for (let x = 0; x < rect.width - elementSize; x += spacing) {
          if (!hasCollisionAt(x, y, excludeIndex)) {
            return { x, y };
          }
        }
      }
    }
    
    // Final fallback: return center even if it collides
    return { x: centerX, y: centerY };
  }, [elementSize, hasCollisionAt]);

  const resolveCollisions = (newX: number, newY: number, excludeIndex: number | null = null) => {
    return findBestPosition(newX, newY, excludeIndex);
  };




  const generateCombination = async (elem1: Element, elem2: Element, elem3: Element | null = null) => {
    // CHECK DAILY LIMIT FIRST - Before any API calls!
    if (!checkDailyLimit()) {
      return { result: null, error: true, limitReached: true };
    }
    
    // Determine if we should use the pro model
    const useProModel = userApiKey 
      ? (selectedModel === 'pro') 
      : (tokenBalance > 0 && selectedModel === 'pro');
    
    // Log model selection for debugging
    let userType: string;
    let reason: string;
    let model: string;
    
    if (userApiKey) {
      userType = 'API Key User';
      model = useProModel ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash';
      reason = `User preference (${useProModel ? 'Pro' : 'Flash'} selected)`;
    } else {
      userType = useProModel ? 'Token User' : 'Freemium User';
      model = useProModel ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash';
      reason = useProModel ? `Has tokens (${tokenBalance} remaining)` : `Daily limit user (${dailyCount}/${GAME_CONFIG.DAILY_FREE_COMBINATIONS} used)`;
    }
    
    console.log(`[LLM-Alchemy Frontend] User Type: ${userType} | Model: ${model} | Reason: ${reason}`);
    
    // Enhanced session caching - check existing combinations first
    const sortedNames = [elem1.name, elem2.name, elem3?.name].filter(Boolean).sort().join('+');
    const mixKey = elem3 ? `${sortedNames}+Energy` : sortedNames;
    
    // Return cached result if it exists (don't count against daily limit)
    if (combinations[mixKey] !== undefined) {
      const cachedResult = combinations[mixKey];
      if (cachedResult) {
        // Find the full element data
        const existingElement = elements.find(e => e.name === cachedResult) || 
                                endElements.find(e => e.name === cachedResult);
        return existingElement ? { 
          result: existingElement.name, 
          emoji: existingElement.emoji, 
          color: existingElement.color, 
          rarity: existingElement.rarity,
          reasoning: existingElement.reasoning || '',
          tags: existingElement.tags || [],
          isEndElement: existingElement.isEndElement || false
        } : { result: null };
      }
      return { result: null };
    }
    
    // Hardcoded combinations for life form path
    if (gameMode === 'science') {
      // Microbe creation
      if ((sortedNames.includes('Mud') || sortedNames.includes('Clay') || sortedNames.includes('Nutrient')) && 
          sortedNames.includes('Air') && sortedNames.includes('Energy')) {
        // Add 1-second delay to simulate LLM processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { 
          result: 'Microbe', 
          emoji: '🦠', 
          color: '#90EE90', 
          rarity: 'common', 
          reasoning: 'Energy activates organic matter in suitable environment',
          tags: ['lifeform', 'microorganism'],
          isEndElement: false
        };
      }
      
      // Microbe branches
      if (sortedNames === 'Energy+Microbe+Water' || sortedNames === 'Air+Energy+Microbe' || sortedNames === 'Earth+Energy+Microbe') {
        // Add 1-second delay to simulate LLM processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { 
          result: 'Algae', 
          emoji: '🌿', 
          color: '#228B22', 
          rarity: 'common', 
          reasoning: 'Microbes evolve photosynthesis in favorable conditions',
          tags: ['lifeform', 'plant', 'organism'],
          isEndElement: false
        };
      }
      if (sortedNames === 'Microbe+Water') {
        // Add 1-second delay to simulate LLM processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { 
          result: 'Protozoa', 
          emoji: '🔬', 
          color: '#4169E1', 
          rarity: 'common', 
          reasoning: 'Single-celled organisms thrive in aquatic environment',
          tags: ['lifeform', 'microorganism'],
          isEndElement: false
        };
      }
      if (sortedNames === 'Microbe+Mud' || sortedNames === 'Compost+Microbe') {
        // Add 1-second delay to simulate LLM processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { 
          result: 'Fungi', 
          emoji: '🍄', 
          color: '#8B4513', 
          rarity: 'common', 
          reasoning: 'Decomposer organisms break down organic matter',
          tags: ['lifeform', 'organism'],
          isEndElement: false
        };
      }
    }

    // Randomized rarity system
    const roll = Math.random();
    let rarityTarget;
    if (roll < 0.85) rarityTarget = 'common';
    else if (roll < 0.96) rarityTarget = 'uncommon';
    else rarityTarget = 'rare';

    // Keep only last 10 combinations for context (prevents endless chains)
    const recentCombinations = Object.entries(combinations).slice(-10);
    const recentText = recentCombinations.length > 0 
      ? recentCombinations.map(([mix, result]) => `${mix}=${result || 'null'}`).join(', ')
      : 'none';

    // Build shared sections
    const sharedSections = buildSharedSections(rarityTarget, gameMode);
    
    // Prepare mixing elements for prompt
    const mixingElements = [elem1, elem2, elem3].filter((e): e is Element => e !== null);
    
    // Prepare failed combinations text
    const failedText = failedCombinations.length > 0 
      ? failedCombinations.slice(-5).join(', ')
      : 'none';

    // Build mode-specific prompt
    const prompt = gameMode === 'science' 
      ? buildSciencePrompt(elements, mixingElements, sharedSections, recentText, failedText)
      : buildCreativePrompt(elements, mixingElements, sharedSections, recentText, failedText);

    // Debug logging for request
    console.log(`[LLM-Alchemy Debug] Making API request:`, {
      model: useProModel ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash',
      userType: userApiKey ? 'API Key User' : (useProModel ? 'Token User' : 'Freemium User'),
      combination: `${elem1.name} + ${elem2.name}${elem3 ? ' + Energy' : ''}`,
      hasUserApiKey: !!userApiKey,
      useProModel,
      tokenBalance
    });

    // Enhanced fetch with timeout and retry
    const makeRequest = async (isRetry: boolean = false): Promise<{ outcomes: { result: string; emoji: string; color: string; rarity: string; reasoning: string; tags: string[]; isEndElement: boolean }[] | null; reasoning?: string; error?: string }> => {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 8000); // 8 second timeout
      
      try {
        const requestBody = { 
          prompt, 
          gameMode,
          apiKey: userApiKey,
          useProModel
        };
        
        console.log(`[LLM-Alchemy Debug] ${isRetry ? 'Retry' : 'Initial'} request:`, requestBody);
        
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: abortController.signal
        });

        clearTimeout(timeoutId);
        console.log(`[LLM-Alchemy Debug] ${isRetry ? 'Retry' : 'Initial'} response status:`, response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[LLM-Alchemy Debug] API request failed:`, {
            status: response.status,
            statusText: response.statusText,
            errorText
          });
          throw new Error(`API request failed: ${response.status}`);
        }

        const rawResponse = await response.text();
        console.log(`[LLM-Alchemy Debug] Raw response:`, rawResponse);
        
        let parsedResult;
        try {
          parsedResult = JSON.parse(rawResponse);
          console.log(`[LLM-Alchemy Debug] Parsed result:`, parsedResult);
        } catch (parseError) {
          console.error(`[LLM-Alchemy Debug] Failed to parse response as JSON:`, parseError);
          throw parseError;
        }
        
        return parsedResult;
        
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error && error.name === 'AbortError') {
          console.log(`[LLM-Alchemy Debug] Request ${isRetry ? 'retry' : 'initial attempt'} timed out after 8 seconds`);
          throw new Error('Request timed out');
        }
        
        throw error;
      }
    };

    try {
      let parsedResult;
      
      try {
        // First attempt
        parsedResult = await makeRequest(false);
      } catch (firstError) {
        const errorMessage = firstError instanceof Error ? firstError.message : 'Unknown error';
        console.log(`[LLM-Alchemy Debug] First attempt failed:`, errorMessage);
        
        if (errorMessage === 'Request timed out') {
          console.log(`[LLM-Alchemy Debug] Attempting auto-retry...`);
          showToast('Connection slow, retrying...');
          
          try {
            // Auto-retry once
            parsedResult = await makeRequest(true);
            console.log(`[LLM-Alchemy Debug] Retry successful!`);
          } catch (retryError) {
            const retryErrorMessage = retryError instanceof Error ? retryError.message : 'Unknown error';
            console.error(`[LLM-Alchemy Debug] Retry also failed:`, retryErrorMessage);
            
            if (retryErrorMessage === 'Request timed out') {
              showToast('LLM timeout - try mixing again');
            } else {
              showToast('Network error - check connection');
            }
            
            return { result: null, error: true, timeout: true };
          }
        } else {
          // Non-timeout error on first attempt
          throw firstError;
        }
      }
      
      // Check if we got an error response
      if (parsedResult.error) {
        console.error(`[LLM-Alchemy Debug] API returned error:`, parsedResult.error);
        showToast('API Error: ' + parsedResult.error);
        return { result: null, error: true };
      }
      
      // Handle new multi-outcome format
      if (parsedResult.outcomes === null) {
        // No valid combination
        console.log(`[LLM-Alchemy Debug] No valid combination found:`, parsedResult.reasoning || 'No reaction');
        
        // Track failed combination
        const failedKey = `${elem1.name}+${elem2.name}${elem3 ? '+Energy' : ''}`;
        setFailedCombinations(prev => [...prev.slice(-4), failedKey]); // Keep last 5
        
        await incrementDailyCounter();
        return { result: null, reasoning: parsedResult.reasoning };
      }
      
      // Handle successful outcomes array
      if (Array.isArray(parsedResult.outcomes) && parsedResult.outcomes.length > 0) {
        let selectedOutcome;
        
        if (parsedResult.outcomes.length === 1) {
          // Only one outcome available
          selectedOutcome = parsedResult.outcomes[0];
          console.log(`[LLM-Alchemy Debug] Single outcome available:`, selectedOutcome);
        } else {
          // Multiple outcomes - select based on rarity probabilities
          const roll = Math.random() * 100;
          
          // Sort outcomes by rarity preference
          const commonOutcomes = parsedResult.outcomes.filter((o: { rarity: string }) => o.rarity === 'common');
          const uncommonOutcomes = parsedResult.outcomes.filter((o: { rarity: string }) => o.rarity === 'uncommon');
          const rareOutcomes = parsedResult.outcomes.filter((o: { rarity: string }) => o.rarity === 'rare');
          
          if (roll < 60 && commonOutcomes.length > 0) {
            selectedOutcome = commonOutcomes[Math.floor(Math.random() * commonOutcomes.length)];
          } else if (roll < 90 && uncommonOutcomes.length > 0) {
            selectedOutcome = uncommonOutcomes[Math.floor(Math.random() * uncommonOutcomes.length)];
          } else if (rareOutcomes.length > 0) {
            selectedOutcome = rareOutcomes[Math.floor(Math.random() * rareOutcomes.length)];
          } else {
            // Fallback to any available outcome
            selectedOutcome = parsedResult.outcomes[Math.floor(Math.random() * parsedResult.outcomes.length)];
          }
          
          console.log(`[LLM-Alchemy Debug] Selected outcome from ${parsedResult.outcomes.length} options:`, selectedOutcome);
        }
        
        // Log the final result we're returning
        const finalResult = {
          result: selectedOutcome.result || null,
          emoji: selectedOutcome.emoji || '✨',
          color: selectedOutcome.color || '#808080',
          rarity: selectedOutcome.rarity || 'common',
          reasoning: selectedOutcome.reasoning || '',
          tags: selectedOutcome.tags || [],
          isEndElement: selectedOutcome.isEndElement || false
        };
        
        console.log(`[LLM-Alchemy Debug] Final result to return:`, finalResult);
        
        // Increment daily counter for successful LLM API calls
        await incrementDailyCounter();
        
        return finalResult;
      }
      
      // Fallback for unexpected response format
      console.log(`[LLM-Alchemy Debug] Unexpected response format:`, parsedResult);
      await incrementDailyCounter();
      return { result: null };
      
    } catch (error) {
      console.error('Error generating combination:', error);
      
      // Handle different types of errors with specific messages
      if (error instanceof TypeError && error.message.includes('fetch')) {
        showToast('Network Error: Check connection and try again');
      } else if (error instanceof SyntaxError) {
        showToast('API Error: Invalid response format');
      } else {
        showToast('LLM Error: Try mixing different elements');
      }
      
      return { result: null, error: true };
    }
  };

  const handleDragStart = (e: React.DragEvent, element: Element, fromMixingArea = false, index: number | null = null) => {
    // Don't allow dragging End Elements
    if (element.isEndElement) return;
    
    hideReasoningPopup();
    draggedElement.current = { 
      ...element, 
      fromMixingArea, 
      mixIndex: index,
      x: 0,
      y: 0,
      index: 0,
      energized: false
    } as MixingElement;
    setIsDragging(true);
    setHoveredUIElement(null); // Clear any UI hover state when starting to drag
    
    // Calculate and set dimmed elements
    const previouslyMixed = getPreviouslyMixedElements(element.name);
    setDimmedElements(previouslyMixed);
    
    e.dataTransfer.effectAllowed = 'copy';
    playSound('press');
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setHoveredElement(null);
    setDimmedElements(new Set()); // Clear dimming
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleElementHover = (element: MixingElement) => {
    if (isDragging && draggedElement.current && element.index !== draggedElement.current.mixIndex) {
      setHoveredElement(element.index);
    }
  };

  const handleElementLeave = () => {
    setHoveredElement(null);
  };

  const handleDropOnMixingArea = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedElement.current || isMixing) return;

    const rect = dropZoneRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const targetElement = mixingArea.find(el => {
      const elRect = document.getElementById(`mixing-${el.id}-${el.index}`)?.getBoundingClientRect();
      if (!elRect) return false;
      return e.clientX >= elRect.left && e.clientX <= elRect.right &&
             e.clientY >= elRect.top && e.clientY <= elRect.bottom;
    });

    if (targetElement && targetElement.index !== draggedElement.current.mixIndex) {
      await mixElements(draggedElement.current, targetElement);
    } else if (!targetElement) {
      playSound('plop');
      const offset = window.innerWidth < 640 ? 24 : window.innerWidth < 768 ? 28 : 32;
      if (draggedElement.current.fromMixingArea) {
        const newPos = resolveCollisions(x - offset, y - offset, draggedElement.current!.mixIndex);
        setMixingArea(mixingArea.map(el => 
          el.index === draggedElement.current!.mixIndex
            ? { ...el, x: newPos.x, y: newPos.y }
            : el
        ));
      } else {
        const newPos = resolveCollisions(x - offset, y - offset);
        const newElement = {
          ...draggedElement.current,
          x: newPos.x,
          y: newPos.y,
          index: Date.now(),
          energized: false
        };
        setMixingArea([...mixingArea, newElement]);
      }
    }
    
    draggedElement.current = null;
    setHoveredElement(null);
  };

  const mixElements = async (elem1: MixingElement, elem2: MixingElement) => {
    if (isMixing || isUndoing) return;
    
    playSound('pop');
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 10, 10]);
    }
    
    const targetEl = elem2.energized ? elem2 : (elem2.name === 'Energy' ? elem1 : elem2);
    
    if (elem1.name === 'Energy' && !elem2.energized) {
      // Dropping Energy onto a non-energized element to energize it
      setMixingArea(mixingArea.map(el => 
        el.index === targetEl.index 
          ? { ...el, energized: true }
          : el
      ).filter(el => el.index !== elem1.index && el.index !== (elem1.fromMixingArea ? elem1.mixIndex : -1)));
    } else if (elem1.energized || elem2.energized) {
      // At least one element is energized - mix with energy
      // Get base elements (strip energized state)
      const baseElem1 = elem1.energized ? { ...elem1, name: elem1.name, energized: undefined } as Element : elem1;
      const baseElem2 = elem2.energized ? { ...elem2, name: elem2.name, energized: undefined } as Element : elem2;
      
      await performMix([baseElem1, baseElem2], true, elem1.index, elem2.index);
    } else {
      // Normal mixing without energy
      await performMix([elem1, elem2], false, elem1.index, elem2.index);
    }
  };

  const performMix = async (elementsToMix: Element[], hasEnergy = false, ...indicesToRemove: number[]) => {
    setIsMixing(true);
    setMixingElements({ elements: elementsToMix, indices: indicesToRemove });
    
    // Outer safety timeout - force clear mixing state after 15 seconds
    const mixingTimeout = setTimeout(() => {
      console.log('[MIXING_DEBUG] ⚠️ Mixing timeout reached - force clearing state');
      setIsMixing(false);
      setMixingElements(null);
      showToast('Mixing timeout - please refresh page');
    }, 15000);
    
    // Clear touch dragging state to ensure mobile elements disappear
    setTouchDragging(null);
    setTouchOffset({ x: 0, y: 0 });
    
    // Immediately remove elements from mixing area
    setMixingArea(mixingArea.filter(el => !indicesToRemove.includes(el.index)));
    
    const sortedNames = elementsToMix.map(e => e.name).sort().join('+');
    const mixKey = hasEnergy ? `${sortedNames}+Energy` : sortedNames;
    
    if (combinations[mixKey]) {
      const existingResult = combinations[mixKey];
      if (existingResult) {
        const existingElement = elements.find(e => e.name === existingResult) || 
                                endElements.find(e => e.name === existingResult);
        if (existingElement) {
          setShowUnlock({ ...existingElement, isNew: false });
          if (!existingElement.isEndElement) {
            setShakeElement(existingElement.id);
            setTimeout(() => {
              setShowUnlock(null);
              setShakeElement(null);
            }, 1500);
          } else {
            setTimeout(() => setShowUnlock(null), 1500);
          }
        }
      } else {
        showToast('No reaction');
      }
      clearTimeout(mixingTimeout);
      setMixingElements(null);
      setIsMixing(false);
      return;
    }

    const result = await generateCombination(elementsToMix[0], elementsToMix[1], hasEnergy ? { name: 'Energy' } as Element : null);
    
    if ('error' in result && result.error) {
      clearTimeout(mixingTimeout);
      setMixingElements(null);
      setIsMixing(false);
      return;
    }
    
    if (result.result) {
      const existing = elements.find(e => e.name.toLowerCase() === result.result!.toLowerCase()) ||
                      endElements.find(e => e.name.toLowerCase() === result.result!.toLowerCase());
      
      if (existing) {
        setShowUnlock({ ...existing, isNew: false });
        if (!existing.isEndElement) {
          setShakeElement(existing.id);
          setTimeout(() => {
            setShowUnlock(null);
            setShakeElement(null);
          }, 1500);
        } else {
          setTimeout(() => setShowUnlock(null), 1500);
        }
      } else {
        const isEndElement = 'isEndElement' in result ? result.isEndElement || false : false;
        
        // Resolve OpenMoji for the new element
        const openmojiData = resolveEmoji({
          unicodeEmoji: ('emoji' in result ? result.emoji : null) || '✨',
          name: result.result,
          tags: ('tags' in result ? result.tags : null) || []
        });
        
        const newElement = {
          id: result.result.toLowerCase().replace(/\s+/g, '-'),
          name: result.result,
          emoji: ('emoji' in result ? result.emoji : null) || '✨',
          color: ('color' in result ? result.color : null) || '#808080',
          unlockOrder: elements.length + endElements.length,
          rarity: 'rarity' in result ? result.rarity : 'common',
          reasoning: ('reasoning' in result ? result.reasoning : null) || '',
          tags: ('tags' in result ? result.tags : null) || [],
          isEndElement,
          parents: elementsToMix, // Track the parent elements that created this one
          energyEnhanced: hasEnergy && elementsToMix.length === 2, // Track if this was energy-enhanced (not energy as element)
          // Only store OpenMoji data for PUA (extra) emojis
          ...(openmojiData.isExtra && {
            openmojiHex: openmojiData.hexcode,
            isOpenmojiExtra: true
          })
        };
        
        // Update arrays first
        const updatedElements = isEndElement ? elements : [...elements, newElement];
        const updatedEndElements = isEndElement ? [...endElements, newElement] : endElements;
        
        if (isEndElement) {
          playSound('end-element');
          setEndElements(updatedEndElements);
        } else {
          playSound('reward');
          setElements(updatedElements);
          setPopElement(newElement.id);
        }
        
        // Check for achievements with updated arrays (safe)
        let contextualAchievement = null;
        let allAchievements: Achievement[] = [];
        try {
          allAchievements = checkAchievements(newElement, updatedElements, updatedEndElements, achievements, gameMode);
          contextualAchievement = allAchievements.find(a => a.id.startsWith('first-'));
          
          // Update achievements state if we have new ones
          if (allAchievements.length > 0) {
            setAchievements(prevAchievements => [...prevAchievements, ...allAchievements]);
          }
        } catch (achievementError) {
          console.error('Achievement check failed:', achievementError);
          // Continue without achievements - don't block the unlock flow
        }

        // Track this combination for undo functionality and enable undo
        setLastCombination({
          elementCreated: newElement,
          combinationKey: mixKey,
          achievementsGained: allAchievements,
          endElementsGained: isEndElement ? [newElement] : [],
          wasEndElement: isEndElement,
          timestamp: Date.now()
        });
        setUndoAvailable(true);
        setTotalCombinationsMade(prev => prev + 1);

        // Save immediately after discovery (fix for Bug 1)
        if (user && gameMode) {
          try {
            const supabase = createClient();
            console.log(`[GAME_STATE_DEBUG] 💾 Immediate save after discovery for user ${user.id} in ${gameMode} mode...`, {
              new_element: newElement.name,
              elements: updatedElements.length,
              end_elements: updatedEndElements.length,
              combinations: Object.keys({ ...combinations, [mixKey]: result.result }).length,
              achievements: [...achievements, ...allAchievements].length,
              failed_combinations: failedCombinations.length,
              trigger: 'immediate-save-after-discovery'
            });
            
            await saveGameState(supabase, user.id, {
              game_mode: gameMode,
              elements: updatedElements,
              end_elements: updatedEndElements,
              combinations: { ...combinations, [mixKey]: result.result },
              achievements: [...achievements, ...allAchievements],
              failed_combinations: failedCombinations
            });
            
            console.log(`[GAME_STATE_DEBUG] ✅ Immediate save completed successfully`);
          } catch (error) {
            console.error(`[GAME_STATE_DEBUG] ❌ Immediate save failed:`, error);
          }
        } else {
          console.log(`[GAME_STATE_DEBUG] ⏭️ Skipping immediate save:`, {
            hasUser: !!user,
            hasGameMode: !!gameMode,
            reason: !user ? 'no user' : 'no game mode'
          });
        }
        
        // Check if this new element completes any challenges
        await checkChallengeCompletion(newElement);
        
        setShowUnlock({ 
          ...newElement, 
          isNew: true,
          achievement: contextualAchievement || null
        });
        setUnlockAnimationStartTime(Date.now());
        
        if (!isEndElement) {
          // Add new element to mixing area center with collision detection IMMEDIATELY
          const rect = dropZoneRef.current!.getBoundingClientRect();
          const offset = window.innerWidth < 640 ? 24 : window.innerWidth < 768 ? 28 : 32;
          const centerX = rect.width / 2 - offset;
          const centerY = rect.height / 2 - offset;
          const newPos = resolveCollisions(centerX, centerY);
          
          const centerElement = {
            ...newElement,
            x: newPos.x,
            y: newPos.y,
            index: Date.now() + 1000,
            energized: false
          };
          
          setMixingArea(current => [...current, centerElement]);
          
          setTimeout(() => {
            setShowUnlock(null);
            setPopElement(null);
            setUnlockAnimationStartTime(null);
          }, 3000);
        } else {
          setTimeout(() => {
            setShowUnlock(null);
            setUnlockAnimationStartTime(null);
          }, 3000);
        }
      }
      
      setCombinations({ ...combinations, [mixKey]: result.result });
    } else {
      // Display LLM reasoning if available, otherwise fallback to generic message
      const reasoningText = 'reasoning' in result && result.reasoning 
        ? result.reasoning 
        : 'No reaction';
      showToast(reasoningText);
      setCombinations({ ...combinations, [mixKey]: null });
    }
    
    clearTimeout(mixingTimeout);
    setMixingElements(null);
    setIsMixing(false);
  };

  const handleTouchStart = (e: React.TouchEvent, element: Element, fromMixingArea = false, index: number | null = null) => {
    if (element.isEndElement) return;
    
    const touch = e.touches[0];
    
    // Record touch start for tap vs drag detection
    setTouchStartTime(Date.now());
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    
    hideReasoningPopup();
    
    setTouchDragging({ 
      ...element, 
      fromMixingArea, 
      mixIndex: index,
      x: 0,
      y: 0,
      index: 0,
      energized: false
    } as MixingElement);
    // Use responsive offset based on screen width
    const offset = window.innerWidth < 640 ? 24 : window.innerWidth < 768 ? 28 : 32;
    setTouchOffset({
      x: offset, // Half of element width
      y: offset  // Half of element height
    });
    
    // Calculate and set dimmed elements
    const previouslyMixed = getPreviouslyMixedElements(element.name);
    setDimmedElements(previouslyMixed);
    
    // Immediately position the drag element
    setTimeout(() => {
      const draggedEl = document.getElementById('touch-drag-element');
      if (draggedEl) {
        draggedEl.style.left = `${touch.clientX - offset}px`;
        draggedEl.style.top = `${touch.clientY - offset}px`;
      }
    }, 0);
    
    playSound('press');
    
    // Haptic feedback on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    e.preventDefault(); // Prevent scrolling while dragging
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!touchDragging) return;
    
    const touch = e.touches[0];
    const draggedEl = document.getElementById('touch-drag-element');
    if (draggedEl) {
      draggedEl.style.left = `${touch.clientX - touchOffset.x}px`;
      draggedEl.style.top = `${touch.clientY - touchOffset.y}px`;
    }
    
    // Check if hovering over a mixing area element
    const hoverTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    if (hoverTarget) {
      const mixingEl = mixingArea.find(el => {
        const elNode = document.getElementById(`mixing-${el.id}-${el.index}`);
        return elNode && (elNode === hoverTarget || elNode.contains(hoverTarget));
      });
      
      if (mixingEl && mixingEl.index !== touchDragging.mixIndex) {
        setHoveredElement(mixingEl.index);
      } else {
        setHoveredElement(null);
      }
    }
    
    e.preventDefault();
  };

  const handleTouchEnd = async (e: TouchEvent) => {
    if (!touchDragging) return;
    
    const touch = e.changedTouches[0];
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - (touchStartTime || 0);
    
    // Calculate movement distance
    const moveDistance = touchStartPos ? Math.sqrt(
      Math.pow(touch.clientX - touchStartPos!.x, 2) + 
      Math.pow(touch.clientY - touchStartPos!.y, 2)
    ) : 0;
    
    // If it was a quick tap with minimal movement, show reasoning popup
    if (touchDuration < 300 && moveDistance < 10 && touchDragging.reasoning) {
      // Create a synthetic event for the popup positioning
      const syntheticEvent = {
        currentTarget: {
          getBoundingClientRect: () => ({
            left: touchStartPos!.x - 32,
            top: touchStartPos!.y - 32,
            width: 64,
            height: 64
          })
        }
      };
      
      setTouchDragging(null);
      setTouchOffset({ x: 0, y: 0 });
      setTouchStartTime(null);
      setTouchStartPos(null);
      
      // Small delay to avoid conflicts
      setTimeout(() => {
        showReasoningPopup(touchDragging, syntheticEvent as React.TouchEvent);
      }, 50);
      
      return;
    }
    
    // Otherwise, handle as normal drag operation
    // Find what element we're dropping on
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Check if dropped in mixing area
    if (dropZoneRef.current && dropZoneRef.current.contains(dropTarget)) {
      const rect = dropZoneRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      // Check if dropped on another element
      const targetElement = mixingArea.find(el => {
        const elRect = document.getElementById(`mixing-${el.id}-${el.index}`)?.getBoundingClientRect();
        if (!elRect) return false;
        return touch.clientX >= elRect.left && touch.clientX <= elRect.right &&
               touch.clientY >= elRect.top && touch.clientY <= elRect.bottom;
      });
      
      if (targetElement && targetElement.index !== touchDragging.mixIndex) {
        await mixElements(touchDragging, targetElement);
      } else if (!targetElement) {
        playSound('plop');
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(5);
        }
        const offset = window.innerWidth < 640 ? 24 : window.innerWidth < 768 ? 28 : 32;
        if (touchDragging.fromMixingArea) {
          const newPos = resolveCollisions(x - offset, y - offset, touchDragging.mixIndex);
          setMixingArea(mixingArea.map(el => 
            el.index === touchDragging.mixIndex 
              ? { ...el, x: newPos.x, y: newPos.y }
              : el
          ));
        } else {
          const newPos = resolveCollisions(x - offset, y - offset);
          const newElement = {
            ...touchDragging,
            x: newPos.x,
            y: newPos.y,
            index: Date.now(),
            energized: false
          };
          setMixingArea([...mixingArea, newElement]);
        }
      }
    }
    
    setTouchDragging(null);
    setTouchOffset({ x: 0, y: 0 });
    setHoveredElement(null);
    setTouchStartTime(null);
    setTouchStartPos(null);
    setDimmedElements(new Set()); // Clear dimming
  };

  // Touch handlers for dividers
  const handleDividerTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDraggingDivider(true);
  };

  const handleDividerTouchMove = (e: TouchEvent) => {
    if (!isDraggingDivider) return;
    
    const touch = e.touches[0];
    const newHeight = touch.clientY - 100;
    setListHeight(Math.max(100, Math.min(400, newHeight)));
  };

  const handleDividerTouchEnd = () => {
    setIsDraggingDivider(false);
  };

  const clearMixingArea = () => {
    if (!isMixing && mixingArea.length > 0) {
      playSound('click');
      animateRemoval(mixingArea, () => setMixingArea([]));
    }
  };

  const handleDividerDrag = (e: MouseEvent) => {
    if (isDraggingDivider) {
      const deltaY = e.clientY - dragStartY;
      const newHeight = dragStartHeight + deltaY;
      setListHeight(Math.max(100, Math.min(400, newHeight)));
    }
  };

  const handleDividerMouseUp = () => {
    setIsDraggingDivider(false);
  };

  const handleGameModeToggle = () => {
    if (!isMixing) {
      const newMode = gameMode === 'science' ? 'creative' : 'science';
      playSound('click');
      
      // Immediately clear mixing area when switching modes
      setMixingArea([]);
      
      // Update URL to reflect mode change
      const url = new URL(window.location.href);
      url.searchParams.set('mode', newMode);
      window.history.replaceState({}, '', url);
      
      setGameMode(newMode);
      // showToast(`Switched to ${newMode} mode!`);
    }
  };

  // Optimized element sorting with search filtering
  const sortedElements = useMemo(() => {
    const filtered = elements
      .filter(e => e.name !== 'Energy')
      .filter(e => searchTerm === '' || e.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return filtered.sort((a, b) => {
      if (sortMode === 'alpha') {
        return a.name.localeCompare(b.name);
      }
      return a.unlockOrder - b.unlockOrder;
    });
  }, [elements, sortMode, searchTerm]);

  const energyElement = elements.find(e => e.name === 'Energy');
  const regularElementCount = elements.length;
  const endElementCount = endElements.length;

  useEffect(() => {
    if (isDraggingDivider) {
      document.addEventListener('mousemove', handleDividerDrag);
      document.addEventListener('mouseup', handleDividerMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleDividerDrag);
        document.removeEventListener('mouseup', handleDividerMouseUp);
      };
    }
  }, [isDraggingDivider]);

  // Floating emoji management system
  useEffect(() => {
    if (elements.length < 5) return;

    const createFloatingEmoji = () => {
      const randomElement = elements[Math.floor(Math.random() * elements.length)];
      return {
        id: floatingEmojiId.current++,
        emoji: randomElement.emoji,
        x: Math.random() * 100, // Start anywhere
        y: Math.random() * 100,
        directionX: (Math.random() - 0.5) * 2, // -1 to 1
        directionY: (Math.random() - 0.5) * 2,
        speed: 0.3 + Math.random() * 0.4, // 0.3 to 0.7
        opacity: 0,
        maxOpacity: 0.005 + Math.random() * 0.005, // 0.5% to 1%
        lifespan: 8000 + Math.random() * 6000, // 8-14 seconds
        age: 0
      };
    };

    // Initialize with 1-3 emojis
    if (floatingEmojis.length === 0) {
      const initialCount = 1 + Math.floor(Math.random() * 3);
      setFloatingEmojis(Array.from({ length: initialCount }, createFloatingEmoji));
    }

    const animationLoop = setInterval(() => {
      setFloatingEmojis(prevEmojis => {
        let newEmojis = prevEmojis.map(emoji => {
          const newAge = emoji.age + 100;
          const lifeProgress = newAge / emoji.lifespan;
          
          // Fade in first 20%, stay visible until 80%, then fade out
          let newOpacity;
          if (lifeProgress < 0.2) {
            newOpacity = (lifeProgress / 0.2) * emoji.maxOpacity;
          } else if (lifeProgress < 0.8) {
            newOpacity = emoji.maxOpacity;
          } else {
            newOpacity = emoji.maxOpacity * ((1 - lifeProgress) / 0.2);
          }

          return {
            ...emoji,
            x: emoji.x + emoji.directionX * emoji.speed,
            y: emoji.y + emoji.directionY * emoji.speed,
            opacity: Math.max(0, newOpacity),
            age: newAge
          };
        });

        // Remove dead emojis and ensure we maintain 1-3 emojis
        newEmojis = newEmojis.filter(emoji => emoji.age < emoji.lifespan);
        
        // Add new emojis if needed (maintain 1-3 count)
        while (newEmojis.length < 1 || (newEmojis.length < 3 && Math.random() < 0.3)) {
          newEmojis.push(createFloatingEmoji());
        }

        return newEmojis;
      });
    }, 100); // Update every 100ms

    return () => clearInterval(animationLoop);
  }, [elements.length]);

  // Handle reasoning popup dismissal
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // Only hide if popup exists and it's not from hover and we're not clicking on the popup itself
      if (reasoningPopup && !reasoningPopup.fromHover) {
        const popup = document.querySelector('.reasoning-popup');
        if (!popup || !popup.contains(e.target as Node)) {
          hideReasoningPopup();
        }
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && reasoningPopup) {
        hideReasoningPopup();
      }
    };

    if (reasoningPopup) {
      document.addEventListener('click', handleGlobalClick);
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('click', handleGlobalClick);
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [reasoningPopup]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col relative overflow-hidden select-none" style={{ touchAction: touchDragging || isDraggingDivider ? 'none' : 'auto' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-gray-900 to-blue-900/20"></div>
      
      {/* Header */}
      <div className="relative z-10 bg-gray-800/80 backdrop-blur-sm p-4 shadow-lg">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="text-yellow-400 hidden sm:block" />
              LLM Alchemy
            </h1>
          </div>
          <div className="text-lg font-semibold flex flex-col items-end gap-1">
            <span>Elements: {regularElementCount}</span>
            {gameMode === 'science' && endElementCount > 0 && (
              <span className="text-gray-300 text-base">Ends: {endElementCount}</span>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-3">
          <button
            onClick={handleBackToHome}
            onMouseEnter={() => setHoveredUIElement('back-button')}
            onMouseLeave={() => setHoveredUIElement(null)}
            className="flex items-center gap-2 px-3 py-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white"
            title="Back to Menu"
            style={{
              boxShadow: hoveredUIElement === 'back-button' ? '0 0 0 2px rgba(255, 255, 255, 0.4)' : ''
            }}
          >
            <ArrowLeft size={16} />
            <span className="text-sm">Back</span>
          </button>
          
          <div className="text-sm text-gray-400 flex items-center gap-1">
            {userApiKey ? (
              <span className="text-green-400">Using your API key</span>
            ) : tokenBalance > 0 ? (
              <>
                <span className="text-yellow-400">Tokens: {tokenBalance}</span>
              </>
            ) : dailyCount >= GAME_CONFIG.DAILY_FREE_COMBINATIONS ? (
              <button
                onClick={async () => {
                  if (user) {
                    const supabase = createClient();
                    await addTokens(supabase, user.id, 10);
                    await refreshTokenBalance();
                    showToast('+10 tokens added!');
                  }
                }}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-white font-medium transition-colors"
              >
                Get more
              </button>
            ) : (
              <>
                <User size={14} />
                <span>{dailyCount}/{GAME_CONFIG.DAILY_FREE_COMBINATIONS} today</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center gap-3">
          <div className="flex gap-2 text-sm items-center">
            <button
              onClick={() => setSortMode('unlock')}
              onMouseEnter={() => setHoveredUIElement('sort-unlock')}
              onMouseLeave={() => setHoveredUIElement(null)}
            className={`btn btn-sm hidden sm:block ${
              sortMode === 'unlock' ? (gameMode === 'creative' ? 'btn-creative' : 'btn-science') : 'btn-surface'
            }`}
              style={{
                boxShadow: hoveredUIElement === 'sort-unlock' && sortMode !== 'unlock' && !isMixing ? '0 0 0 2px rgba(255, 255, 255, 0.4)' : ''
              }}
            >
              1-2-3
            </button>
            <button
              onClick={() => setSortMode('alpha')}
              onMouseEnter={() => setHoveredUIElement('sort-alpha')}
              onMouseLeave={() => setHoveredUIElement(null)}
            className={`btn btn-sm hidden sm:block ${
              sortMode === 'alpha' ? (gameMode === 'creative' ? 'btn-creative' : 'btn-science') : 'btn-surface'
            }`}
              style={{
                boxShadow: hoveredUIElement === 'sort-alpha' && sortMode !== 'alpha' && !isMixing ? '0 0 0 2px rgba(255, 255, 255, 0.4)' : ''
              }}
            >
              A-Z
            </button>
            
            {/* Search functionality and achievements */}
            <div className="flex items-center gap-1 sm:ml-4">
              <input
                type="text"
                placeholder="Filter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-20 sm:w-20 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                style={{
                  boxShadow: searchTerm !== '' ? '0 0 0 1px rgba(147, 51, 234, 0.5)' : ''
                }}
              />
              <button
                onClick={() => setShowAchievements(true)}
                onMouseEnter={() => setHoveredUIElement('achievements-btn')}
                onMouseLeave={() => setHoveredUIElement(null)}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-all flex items-center gap-1"
                style={{
                  boxShadow: hoveredUIElement === 'achievements-btn' && !isMixing ? '0 0 0 2px rgba(255, 255, 255, 0.4)' : ''
                }}
              >
                <span>🏆</span>
                <span className="hidden sm:inline text-sm">Achievements</span>
              </button>
            </div>
          </div>
          
          {/* Game Mode Toggle */}
          <button
            onClick={handleGameModeToggle}
            onMouseEnter={() => setHoveredUIElement('mode-toggle')}
            onMouseLeave={() => setHoveredUIElement(null)}
            disabled={isMixing}
            className={`relative inline-flex h-8 w-32 cursor-pointer items-center rounded-full bg-gray-700 transition-colors hover:bg-gray-600 ${
              isMixing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{
              boxShadow: hoveredUIElement === 'mode-toggle' && !isMixing ? '0 0 0 2px rgba(255, 255, 255, 0.4)' : ''
            }}
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

      {/* Element List */}
      <div 
        className="relative z-10 overflow-y-auto backdrop-blur-sm p-4 transition-all duration-300 scrollbar-mobile"
        style={{ 
          height: `${listHeight}px`,
          touchAction: touchDragging ? 'none' : 'auto',
          willChange: isDraggingDivider ? 'height' : 'auto',
          background: gameMode === 'creative' 
            ? 'rgba(147, 51, 234, 0.1)' // Purple tint for Creative mode
            : 'rgba(59, 130, 246, 0.08)' // Blue tint for Science mode
        }}
      >
        <div className="flex flex-wrap gap-2">
          {energyElement && gameMode === 'science' && (
            <React.Fragment key="energy-section">
              <div
                key={energyElement.id}
                draggable={!isTouchDevice}
                onDragStart={(e) => handleDragStart(e, energyElement)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, energyElement)}
                onMouseEnter={(e) => {
                  setHoveredUIElement(`element-${energyElement.id}`);
                  handleElementMouseEnter(energyElement, e);
                }}
                onMouseLeave={() => {
                  setHoveredUIElement(null);
                  handleElementMouseLeave();
                }}
                onClick={(e) => handleElementClick(energyElement, e)}
                onContextMenu={(e) => e.preventDefault()}
              className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex flex-col items-center justify-center rounded-lg cursor-move hover:scale-110 transition-transform ${
                popElement === energyElement.id ? (isUndoing ? 'animate-element-pop-out' : 'animate-element-pop-in') : ''
              } ${
                  shakeElement === energyElement.id ? 'animate-element-shake' : ''
                } ${
                  touchDragging?.id === energyElement.id && !touchDragging?.fromMixingArea ? 'opacity-30' : ''
                }`}
                style={{ 
                  backgroundColor: energyElement.color,
                  color: getContrastColor(energyElement.color),
                  boxShadow: !isDraggingDivider && hoveredUIElement === `element-${energyElement.id}` && !isDragging ? `0 0 0 2px ${getRarityHoverColor(energyElement.rarity)}` : '',
                  transition: isDraggingDivider ? 'none' : undefined,
                  touchAction: 'none',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none'
                }}
              >
                <OpenMojiDisplay 
                  emoji={energyElement.emoji} 
                  hexcode={energyElement.openmojiHex}
                  name={energyElement.name} 
                  size="md" 
                />
                <div className="text-[8px] sm:text-[10px] font-medium px-1 text-center leading-tight">{energyElement.name}</div>
              </div>
              <div className="w-px h-12 sm:h-14 md:h-16 bg-gray-600 mx-1"></div>
            </React.Fragment>
          )}
          {sortedElements.map((element) => (
            <div
              key={element.id}
              draggable={!isTouchDevice}
              onDragStart={(e) => handleDragStart(e, element)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(e, element)}
              onMouseEnter={(e) => {
                setHoveredUIElement(`element-${element.id}`);
                handleElementMouseEnter(element, e);
              }}
              onMouseLeave={() => {
                setHoveredUIElement(null);
                handleElementMouseLeave();
              }}
              onClick={(e) => handleElementClick(element, e)}
              onContextMenu={(e) => e.preventDefault()}
              className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex flex-col items-center justify-center rounded-lg cursor-move hover:scale-110 transition-transform ${
                popElement === element.id ? (isUndoing ? 'animate-element-pop-out' : 'animate-element-pop-in') : ''
              } ${
                shakeElement === element.id ? 'animate-element-shake' : ''
              } ${
                touchDragging?.id === element.id && !touchDragging?.fromMixingArea ? 'opacity-30' : ''
              } ${
                isPlayingLoadAnimation && animatedElements.has(element.id) ? 'animate-element-load-delayed' : ''
              } ${
                dimmedElements.has(element.name) ? 'element-dimmed' : ''
              }`}
                style={{ 
                  backgroundColor: element.color,
                  color: getContrastColor(element.color),
                  boxShadow: !isDraggingDivider && hoveredUIElement === `element-${element.id}` && !isDragging ? `0 0 0 2px ${getRarityHoverColor(element.rarity)}` : '',
                  transition: isDraggingDivider ? 'none' : undefined,
                  touchAction: 'none',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  animationDelay: isPlayingLoadAnimation && animatedElements.has(element.id) 
                    ? `${element.unlockOrder * 25}ms` 
                    : undefined
                }}
            >
              <OpenMojiDisplay 
                emoji={element.emoji} 
                hexcode={element.openmojiHex}
                name={element.name} 
                size="md" 
              />
              <div className="text-[8px] sm:text-[10px] font-medium px-1 text-center leading-tight">{element.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Draggable Divider */}
      <div 
        className="relative z-20 bg-gray-700 flex items-center justify-center transition-all touch-none"
        style={{
          background: hoveredUIElement === 'divider1' || isDraggingDivider
            ? 'linear-gradient(to bottom, #4B5563, #6B7280, #4B5563)' 
            : 'linear-gradient(to bottom, #374151, #4B5563, #374151)',
          height: '6px',
          touchAction: 'none',
          boxShadow: isDraggingDivider ? 'inset 0 1px 2px rgba(0, 0, 0, 0.3)' : '',
          cursor: 'ns-resize'
        }}
        onMouseDown={(e) => {
          setIsDraggingDivider(true);
          setDragStartY(e.clientY);
          setDragStartHeight(listHeight);
        }}
        onTouchStart={(e) => {
          handleDividerTouchStart(e);
          setHoveredUIElement('divider1');
          setDragStartY(e.touches[0].clientY);
          setDragStartHeight(listHeight);
        }}
        onTouchEnd={() => setHoveredUIElement(null)}
        onMouseEnter={() => setHoveredUIElement('divider1')}
        onMouseLeave={() => setHoveredUIElement(null)}
      >
        <div className="flex flex-col items-center gap-0 py-2 px-8">
          <GripHorizontal className={`transition-colors ${isDraggingDivider ? 'text-gray-200' : 'text-gray-400'}`} size={12} />
        </div>
      </div>

      {/* Mixing Area */}
      <div 
        ref={dropZoneRef}
        className="relative z-10 flex-1 bg-gray-800/30 backdrop-blur-sm overflow-hidden"
        onDragOver={handleDragOver}
        onDrop={handleDropOnMixingArea}
        style={{ minHeight: '200px', touchAction: 'none' }}
      >
        {/* Floating emoji background animation */}
        {floatingEmojis.map((emoji) => (
          <div
            key={emoji.id}
            className="absolute pointer-events-none select-none"
            style={{
              left: `${emoji.x}%`,
              top: `${emoji.y}%`,
              fontSize: '400px',
              opacity: emoji.opacity,
              transform: 'translate(-50%, -50%)',
              zIndex: 1
            }}
          >
            {emoji.emoji}
          </div>
        ))}
        {/* Undo Button - show after first combination made */}
        {totalCombinationsMade > 0 && !isMixing && (
          <button
            onClick={async () => {
              // Check if undo is available (can't undo twice in a row)
              if (!undoAvailable) {
                showToast('No action to undo');
                return;
              }
              
              // Check if user can undo based on tier
              const canUndo = userApiKey || tokenBalance > 0 || !undoUsed;
              
              if (!canUndo) {
                showToast('Upgrade to get more undos');
                return;
              }
              
              // Play sound immediately for instant feedback
              playSound('reverse-pop');
              
              // Perform undo
              if (lastCombination) {
                try {
                  // Set undo protection state
                  setIsUndoing(true);
                  
                  // Immediately clear any reward animations to prevent conflicts (Bug 1 fix)
                  setShowUnlock(null);
                  setUnlockAnimationStartTime(null);
                  
                  // Remove the element that was created
                  const elementToRemove = lastCombination.elementCreated;
                  
                  // Start pop animation on main element
                  setPopElement(elementToRemove.id);
                  
                  // Find mixing area elements to animate
                  const mixingElementsToRemove = mixingArea.filter(el => el.name === elementToRemove.name);
                  
                  // Animate mixing area elements with the new system
                  if (mixingElementsToRemove.length > 0) {
                    animateRemoval(mixingElementsToRemove, () => {
                      // Remove from mixing area after animation
                      setMixingArea(prev => prev.filter(el => el.name !== elementToRemove.name));
                    });
                  }
                  
                  // Wait for main element animation to complete, then remove from main arrays
                  setTimeout(() => {
                    // Remove from elements/endElements arrays
                    if (elementToRemove.isEndElement) {
                      setEndElements(prev => prev.filter(e => e.id !== elementToRemove.id));
                    } else {
                      setElements(prev => prev.filter(e => e.id !== elementToRemove.id));
                    }
                    
                    // Clear main element pop animation and undo protection
                    setPopElement(null);
                    setIsUndoing(false);
                  }, 300); // Main element animation duration
                  
                  // Remove the combination from cache
                  setCombinations(prev => {
                    const newCombinations = { ...prev };
                    delete newCombinations[lastCombination.combinationKey];
                    return newCombinations;
                  });
                  
                  // Remove any achievements that were gained
                  if (lastCombination.achievementsGained.length > 0) {
                    setAchievements(prev => 
                      prev.filter(achievement => 
                        !lastCombination.achievementsGained.some(gained => gained.id === achievement.id)
                      )
                    );
                  }
                  
                  // Refund token or daily count
                  if (user && !userApiKey) {
                    const supabase = createClient();
                    
                    if (tokenBalance > 0) {
                      // Add back one token
                      await addTokens(supabase, user.id, 1);
                      await refreshTokenBalance();
                    } else {
                      // Decrement daily count using the proper function
                      await decrementDailyCount(supabase, user.id);
                      await refreshDailyCount();
                    }
                  }
                  
                  // Update undo state
                  setUndoAvailable(false); // Can't undo again until next combination
                  if (!userApiKey && tokenBalance === 0) {
                    setUndoUsed(true); // Freemium users can only undo once per session
                  }
                  
                  // Clear last combination
                  setLastCombination(null);
                  
                  showToast('Action undone!');
                  
                } catch (error) {
                  console.error('Error during undo:', error);
                  showToast('Undo failed');
                }
              }
            }}
            onMouseEnter={() => setHoveredUIElement('undo-button')}
            onMouseLeave={() => setHoveredUIElement(null)}
            className={`absolute top-4 left-4 px-3 py-2 rounded-lg transition-all z-20 flex items-center gap-1 ${
              undoAvailable && (userApiKey || tokenBalance > 0 || !undoUsed)
                ? 'bg-gray-700 hover:bg-gray-600 text-white cursor-pointer' 
                : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
            }`}
            style={{
              boxShadow: hoveredUIElement === 'undo-button' && !isMixing ? '0 0 0 2px rgba(255, 255, 255, 0.4)' : ''
            }}
          >
            <span>↩️</span>
            <span className="hidden sm:inline text-sm">Undo</span>
          </button>
        )}

        {mixingArea.length > 0 && !isMixing && (
          <button
            onClick={clearMixingArea}
            onMouseEnter={() => setHoveredUIElement('clear-button')}
            onMouseLeave={() => setHoveredUIElement(null)}
            className="absolute top-4 right-4 btn btn-danger p-2 rounded-full z-20"
            style={{
              boxShadow: hoveredUIElement === 'clear-button' && !isMixing ? '0 0 0 2px rgba(255, 255, 255, 0.4)' : ''
            }}
          >
            <X size={20} />
          </button>
        )}

        {/* Upgrade/Register button based on user status */}
        {(() => {
          // Anonymous users - show Register/Sign in button
          if (!user || (dbUser?.is_anonymous)) {
            return (
              <button
                onClick={() => {
                  router.push('/')
                }}
                onMouseEnter={() => setHoveredUIElement('register-button-mixing')}
                onMouseLeave={() => setHoveredUIElement(null)}
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-3 py-2 bg-gradient-to-r from-blue-600/80 to-purple-600/80 hover:from-blue-500/90 hover:to-purple-500/90 rounded-lg transition-all z-20 flex items-center gap-1 text-sm text-white font-medium backdrop-blur-sm"
                style={{
                  boxShadow: hoveredUIElement === 'register-button-mixing' && !isMixing ? '0 0 0 2px rgba(255, 255, 255, 0.4)' : ''
                }}
              >
                <span>👤</span>
                <span>Register / Sign in</span>
              </button>
            );
          }
          
          // Registered users - check if they need upgrade/tokens
          if (dbUser && !dbUser.is_anonymous) {
            // Don't show button for:
            // - API key users (unlimited)
            // - Premium users (subscription_status: 'premium')
            // - Users with tokens remaining (token_balance > 0)
            if (userApiKey || dbUser.subscription_status === 'premium' || (tokenBalance > 0)) {
              return null;
            }
            
            // Show button for:
            // - Freemium users (subscription_status: 'free')
            // - Users who ran out of tokens (token_balance = 0)
            const isFreemium = dbUser.subscription_status === 'free';
            const buttonText = isFreemium ? 'Upgrade' : 'Get more';
            
            return (
              <button
                onClick={() => {
                  router.push('/')
                }}
                onMouseEnter={() => setHoveredUIElement('upgrade-button-mixing')}
                onMouseLeave={() => setHoveredUIElement(null)}
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-3 py-2 bg-gradient-to-r from-purple-600/80 to-blue-600/80 hover:from-purple-500/90 hover:to-blue-500/90 rounded-lg transition-all z-20 flex items-center gap-1 text-sm text-white font-medium backdrop-blur-sm"
                style={{
                  boxShadow: hoveredUIElement === 'upgrade-button-mixing' && !isMixing ? '0 0 0 2px rgba(255, 255, 255, 0.4)' : ''
                }}
              >
                <span>⭐</span>
                <span>{buttonText}</span>
              </button>
            );
          }
          
          return null;
        })()}

        {mixingArea.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-500 text-center px-4">
              Drag elements here to mix them!
            </p>
          </div>
        )}
        
        {mixingArea.map((element) => (
          <div
            key={`${element.id}-${element.index}`}
            id={`mixing-${element.id}-${element.index}`}
            draggable={!isTouchDevice && !isMixing}
            onDragStart={(e) => handleDragStart(e, element, true, element.index)}
            onDragEnd={handleDragEnd}
            onTouchStart={(e) => handleTouchStart(e, element, true, element.index)}
            onMouseEnter={() => setHoveredUIElement(`mixing-${element.index}`)}
            onMouseLeave={() => setHoveredUIElement(null)}
            onContextMenu={(e) => e.preventDefault()}
            onDragOver={(e) => {
              e.preventDefault();
              handleElementHover(element);
            }}
            onDragEnter={() => handleElementHover(element)}
            onDragLeave={handleElementLeave}
            className={`absolute w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex flex-col items-center justify-center rounded-lg cursor-move ${
              element.energized ? 'animate-shake' : ''
            } ${
              hoveredElement === element.index && !element.energized ? 'animate-continuous-pulse' : ''
            } ${
              touchDragging?.mixIndex === element.index && touchDragging?.fromMixingArea ? 'opacity-30' : ''
            } ${
              animatingElements.has(`${element.id}-${element.index}`) ? 'animate-element-pop-out' : ''
            } ${
              dimmedElements.has(element.name) ? 'element-dimmed' : ''
            }`}
            style={{ 
              left: element.x, 
              top: element.y,
              backgroundColor: element.color,
              color: getContrastColor(element.color),
              pointerEvents: isMixing ? 'none' : 'auto',
              touchAction: 'none',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              transition: 'none',
              boxShadow: element.energized ? '0 0 20px rgba(250, 204, 21, 0.5), 0 0 0 2px #facc15' :
                        hoveredElement === element.index ? `0 0 0 2px ${getRarityHoverColor(element.rarity)}` :
                        hoveredUIElement === `mixing-${element.index}` && !isDragging ? `0 0 0 2px ${getRarityHoverColor(element.rarity)}` : ''
            }}
          >
            <OpenMojiDisplay 
              emoji={element.emoji} 
              hexcode={element.openmojiHex}
              name={element.name} 
              size="md" 
              className="pointer-events-none"
            />
            <div className="text-[8px] sm:text-[10px] font-medium px-1 text-center leading-tight pointer-events-none">{element.name}</div>
          </div>
        ))}
        
        {isMixing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-gray-800/90 rounded-xl p-6 flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mb-3"></div>
              <div className="text-sm">Mixing...</div>
            </div>
          </div>
        )}
      </div>


      {/* Unlock animation */}
      {showUnlock && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ pointerEvents: 'none' }}
        >
          <div 
            className={`relative transform transition-all duration-500 ${
              showUnlock.isNew ? (showUnlock.isEndElement ? 'animate-end-zoom-pulse' : 'animate-zoom-pulse') : 'animate-small-pulse opacity-80'
            }`}
            style={{ pointerEvents: 'none' }}
          >
            {showUnlock.isNew && (
              <>
                <div className={`absolute inset-0 rounded-xl blur-xl animate-pulse pointer-events-none ${
                  showUnlock.isEndElement ? 'bg-gradient-to-r from-blue-400 to-cyan-600' : 
                  showUnlock.rarity === 'rare' ? 'bg-gradient-to-r from-purple-400 to-purple-600' :
                  showUnlock.rarity === 'uncommon' ? 'bg-gradient-to-r from-green-400 to-green-600' :
                  'bg-gradient-to-r from-yellow-400 to-yellow-600'
                }`}></div>
                <div className={`absolute inset-0 rounded-xl opacity-50 animate-ping pointer-events-none ${
                  showUnlock.isEndElement ? 'bg-gradient-to-r from-blue-300 to-cyan-400' :
                  showUnlock.rarity === 'rare' ? 'bg-gradient-to-r from-purple-300 to-purple-400' :
                  showUnlock.rarity === 'uncommon' ? 'bg-gradient-to-r from-green-300 to-green-400' :
                  'bg-gradient-to-r from-yellow-300 to-amber-400'
                }`}></div>
              </>
            )}
            <div 
              className="relative bg-gray-800 rounded-xl p-8 border-2" 
              style={{ 
                borderColor: showUnlock.isNew ? (
                  showUnlock.isEndElement ? '#60A5FA' : 
                  showUnlock.rarity === 'rare' ? '#8B5CF6' :
                  showUnlock.rarity === 'uncommon' ? '#10B981' :
                  '#FBBF24'
                ) : showUnlock.color,
                pointerEvents: unlockAnimationStartTime && Date.now() - unlockAnimationStartTime > 500 ? 'auto' : 'none',
                cursor: unlockAnimationStartTime && Date.now() - unlockAnimationStartTime > 500 ? 'pointer' : 'default'
              }}
              onClick={() => {
                if (unlockAnimationStartTime && Date.now() - unlockAnimationStartTime > 500) {
                  setShowUnlock(null);
                  setPopElement(null);
                  setUnlockAnimationStartTime(null);
                }
              }}
            >
              <div className="text-center">
                  <OpenMojiDisplay 
                    emoji={showUnlock.emoji} 
                    hexcode={showUnlock.openmojiHex}
                    name={showUnlock.name} 
                    size="lg" 
                    className="mb-3 w-20 h-20 mx-auto"
                  />
                <div 
                  className="text-3xl font-bold mb-2" 
                  style={{ 
                    backgroundColor: showUnlock.color,
                    color: getContrastColor(showUnlock.color),
                    padding: '4px 12px',
                    borderRadius: '8px',
                    display: 'inline-block'
                  }}
                >
                  {showUnlock.name}
                </div>
                {showUnlock.isNew && (
                  <div className={`font-semibold mt-2 ${
                    showUnlock.isEndElement ? 'text-blue-400' : 'text-yellow-400'
                  }`}>
                    {showUnlock.isEndElement ? 'End Element' : 'New Element!'}
                  </div>
                )}
                {showUnlock.achievement && showUnlock.isNew && (
                  <div className="text-lg font-bold mt-3 text-yellow-300">
                    🏆 {showUnlock.achievement.name}
                  </div>
                )}
                {showUnlock.rarity && showUnlock.rarity !== 'common' && showUnlock.isNew && !showUnlock.isEndElement && (
                  <div className={`text-sm mt-2 font-medium ${
                    showUnlock.rarity === 'rare' ? 'text-purple-400' : 'text-blue-400'
                  }`}>
                    {showUnlock.rarity.toUpperCase()}
                  </div>
                )}
                {showUnlock.reasoning && showUnlock.isNew && (
                  <div className="text-sm mt-2 text-gray-300 italic max-w-xs text-center">
                    &quot;{showUnlock.reasoning}&quot;
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Achievements Modal */}
      {showAchievements && (() => {
        // Update achievements with progress information before displaying
        const achievementsWithProgress = updateAchievementsWithProgress(achievements, elements, endElements);
        
        return (
          <div 
            className="modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAchievements(false);
              }
            }}
          >
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex justify-end items-center mb-4">
                <button
                  onClick={() => setShowAchievements(false)}
                  className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="overflow-y-auto flex-1 space-y-6">
                {/* Achievements Section */}
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-yellow-400">🏆 Achievements ({achievementsWithProgress.length})</h4>
                  {achievementsWithProgress.length === 0 ? (
                    <p className="text-gray-400 text-sm">None unlocked yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {achievementsWithProgress
                        .sort((a: Achievement, b: Achievement) => b.unlocked - a.unlocked)
                        .map((achievement: Achievement) => {
                          // Get tier colors
                          const getTierColor = (tier?: 1 | 2 | 3) => {
                            switch (tier) {
                              case 1: return 'border-amber-600'; // Bronze
                              case 2: return 'border-gray-400';  // Silver  
                              case 3: return 'border-yellow-400'; // Gold
                              default: return 'border-gray-600';
                            }
                          };
                          
                          const getTierTextColor = (tier?: 1 | 2 | 3) => {
                            switch (tier) {
                              case 1: return 'text-amber-400'; // Bronze
                              case 2: return 'text-gray-300';  // Silver
                              case 3: return 'text-yellow-300'; // Gold
                              default: return 'text-yellow-300';
                            }
                          };
                          
                          const getTierProgressColor = (tier?: 1 | 2 | 3) => {
                            switch (tier) {
                              case 1: return 'bg-amber-600'; // Bronze
                              case 2: return 'bg-gray-400';  // Silver
                              case 3: return 'bg-yellow-400'; // Gold
                              default: return 'bg-gray-500';
                            }
                          };
                          
                          return (
                            <div
                              key={achievement.id}
                              className={`bg-gray-700/50 rounded-lg p-3 border-2 ${getTierColor(achievement.tier)} relative group cursor-pointer transition-all hover:bg-gray-700/70`}
                              title={achievement.isProgressive && achievement.nextTierAt ? 
                                `Next: ${achievement.nextTierAt - (achievement.currentCount || 0)} more needed` : 
                                ''
                              }
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{achievement.emoji}</span>
                                <div className="flex-1">
                                  <div className={`font-medium ${getTierTextColor(achievement.tier)}`}>
                                    {achievement.name}
                                  </div>
                                  <div className="text-sm text-gray-300">{achievement.description}</div>
                                  
                                  {/* Progress bar for tiered achievements */}
                                  {achievement.isProgressive && achievement.nextTierAt && (
                                    <div className="mt-2">
                                      <div className="w-full bg-gray-600/50 rounded-full h-1.5">
                                        <div 
                                          className={`h-1.5 rounded-full transition-all duration-300 ${getTierProgressColor(achievement.tier)}`}
                                          style={{
                                            width: `${Math.min(100, ((achievement.currentCount || 0) / achievement.nextTierAt) * 100)}%`
                                          }}
                                        ></div>
                                      </div>
                                      <div className="text-xs text-gray-400 mt-1">
                                        {achievement.currentCount || 0}/{achievement.nextTierAt}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Max tier indicator */}
                                  {achievement.isProgressive && !achievement.nextTierAt && (
                                    <div className="text-xs text-yellow-300 mt-1">
                                      ⭐ Max tier reached ({achievement.currentCount})
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* End Elements Section (Science Mode Only) */}
                {gameMode === 'science' && (
                  <div>
                    <h4 className="text-lg font-semibold mb-3 text-blue-400">🏁 End Elements ({endElements.length})</h4>
                    {endElements.length === 0 ? (
                      <p className="text-gray-400 text-sm">Nothing discovered yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {endElements
                          .sort((a, b) => b.unlockOrder - a.unlockOrder)
                          .map((element) => (
                            <div
                              key={element.id}
                              className="bg-gray-700/50 rounded-lg p-3 border border-gray-600"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{element.emoji}</span>
                                <div>
                                  <div className="font-medium" style={{ color: element.color }}>
                                    {element.name}
                                  </div>
                                  {element.reasoning && (
                                    <div className="text-sm text-gray-400 italic">
                                      &quot;{element.reasoning}&quot;
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}


      {/* Challenge Bar - Moved to Bottom */}
      <ChallengeBar isAnonymous={dbUser?.is_anonymous} currentGameMode={gameMode} />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 px-4 py-2 rounded-lg z-50">
          {toast}
        </div>
      )}


      {/* Touch drag overlay */}
      {touchDragging && (
        <div
          id="touch-drag-element"
          className="fixed w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex flex-col items-center justify-center rounded-lg pointer-events-none"
          style={{
            left: touchDragging ? -100 : -200,
            top: touchDragging ? -100 : -200,
            backgroundColor: touchDragging.color,
            color: getContrastColor(touchDragging.color),
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
            zIndex: 9999,
            transform: 'scale(1.1)',
            opacity: 0.95
          }}
        >
          <OpenMojiDisplay 
            emoji={touchDragging.emoji} 
            hexcode={touchDragging.openmojiHex}
            name={touchDragging.name} 
            size="md" 
            className="pointer-events-none"
          />
          <div className="text-[8px] sm:text-[10px] font-medium px-1 text-center leading-tight pointer-events-none">{touchDragging.name}</div>
        </div>
      )}

      {/* Reasoning Popup */}
      {reasoningPopup && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: reasoningPopup.x,
            top: reasoningPopup.y,
            transform: 'translateX(-50%) translateY(-100%)'
          }}
        >
          <div 
            className="reasoning-popup bg-gray-800/95 backdrop-blur-sm text-white text-sm px-3 py-2 rounded-lg shadow-lg border border-gray-600 max-w-xs"
            style={{
              pointerEvents: reasoningPopup.fromHover ? 'none' : 'auto'
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!reasoningPopup.fromHover) hideReasoningPopup();
            }}
          >
            {reasoningPopup.element.parents && reasoningPopup.element.parents.length > 0 && (
              <div className="text-center text-sm mb-1 flex items-center justify-center gap-1">
                {reasoningPopup.element.parents.map((parent, index) => (
                  <React.Fragment key={parent.id}>
                    <OpenMojiDisplay 
                      emoji={parent.emoji} 
                      hexcode={parent.openmojiHex}
                      name={parent.name} 
                      size="sm" 
                    />
                    {index < reasoningPopup.element.parents!.length - 1 && (
                      <span className="text-gray-400 mx-1">
                        {reasoningPopup.element.energyEnhanced ? '〰️' : '+'}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
            <div className="text-gray-300 italic text-center text-xs">
              {reasoningPopup.element.reasoning}
            </div>
            {/* Arrow pointing down */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-600"></div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* Mobile scrollbar styles */
        .scrollbar-mobile {
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
        }
        
        .scrollbar-mobile::-webkit-scrollbar {
          width: 6px;
        }
        
        .scrollbar-mobile::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .scrollbar-mobile::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
          border-radius: 3px;
        }
        
        .scrollbar-mobile::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.7);
        }
        
        /* Show scrollbar on mobile when content overflows */
        @media (max-width: 768px) {
          .scrollbar-mobile::-webkit-scrollbar {
            width: 8px;
          }
          
          .scrollbar-mobile::-webkit-scrollbar-thumb {
            background-color: rgba(156, 163, 175, 0.6);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-1px) rotate(-0.5deg); }
          75% { transform: translateX(1px) rotate(0.5deg); }
        }
        
        @keyframes zoom-pulse {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes end-zoom-pulse {
          0% { transform: scale(0) rotate(0deg); opacity: 0; }
          50% { transform: scale(1.1) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        
        @keyframes small-pulse {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes mix-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); opacity: 0.7; }
          100% { transform: scale(0); opacity: 0; }
        }
        
        @keyframes element-pop-in {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes element-pop-out {
          0% { transform: scale(1); opacity: 1; }
          30% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0); opacity: 0; }
        }
        
        @keyframes element-load-delayed {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes element-pop {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        
        @keyframes element-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        
        @keyframes continuous-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out infinite;
        }
        
        .animate-zoom-pulse {
          animation: zoom-pulse 0.5s ease-out;
        }
        
        .animate-end-zoom-pulse {
          animation: end-zoom-pulse 0.6s ease-out;
        }
        
        .animate-small-pulse {
          animation: small-pulse 0.3s ease-out;
        }
        
        .animate-mix-pop {
          animation: mix-pop 0.6s ease-out forwards;
        }
        
        .animate-element-pop {
          animation: element-pop 0.3s ease-out;
        }
        
        .animate-element-pop-in {
          animation: element-pop-in 0.3s ease-out;
        }
        
        .animate-element-pop-out {
          animation: element-pop-out 0.3s ease-out forwards;
        }
        
        .animate-element-load-delayed {
          animation: element-load-delayed 0.3s ease-out;
          animation-fill-mode: both;
        }
        
        .animate-element-shake {
          animation: element-shake 0.3s ease-out;
        }
        
        .animate-continuous-pulse {
          animation: continuous-pulse 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LLMAlchemy;
