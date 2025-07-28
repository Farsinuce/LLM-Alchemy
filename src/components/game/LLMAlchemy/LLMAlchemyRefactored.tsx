'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Sparkles, X, GripHorizontal, User, ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSupabase } from '@/components/auth/SupabaseProvider';
import { createClient, saveGameState, loadGameState, addTokens, getLlmModelPreference } from '@/lib/supabase';
import { Achievement } from '@/types';
import { GAME_CONFIG } from '@/lib/game-config';
import { ChallengeBar } from '@/components/game/ChallengeBar';
import { OpenMojiDisplay } from '@/components/game/OpenMojiDisplay';

// Import our new state management
import { useGameMode, useElements, useMixingArea, useCombinations, useAchievements, useGameUndo, useGameStats, useGamePersistence } from './contexts/GameStateProvider';
import { Element, MixingElement } from './hooks/useGameState';
import { useElementMixing } from './hooks/useElementMixing';
import { UnlockModal, AchievementsModal, ReasoningPopup } from './components';
import * as GameLogic from '@/lib/game-logic';

// UI-only interfaces (not moved to state management)
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

// Type for window.webkitAudioContext
interface WindowWithWebkit extends Window {
  webkitAudioContext?: typeof AudioContext;
}

const LLMAlchemyRefactored = () => {
  const { user, dbUser, dailyCount, tokenBalance, refreshTokenBalance } = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get state and actions from context
  const { gameMode, setGameMode } = useGameMode();
  const { elements, endElements, setElements, setEndElements } = useElements();
  const { mixingArea, setMixingArea, addToMixingArea, updateMixingElement, clearMixingArea } = useMixingArea();
  const { combinations, failedCombinations, setCombinations, setFailedCombinations } = useCombinations();
  const { achievements } = useAchievements();
  const { lastCombination, undoAvailable, setLastCombination, setUndoAvailable } = useGameUndo();
  const { isStateRestored, setStateRestored } = useGameStats();
  const { loadSavedState, resetGameState } = useGamePersistence();
  
  // UI-only state (ephemeral - doesn't need to be in global state)
  const [sortMode, setSortMode] = useState<string>('unlock');
  const [showUnlock, setShowUnlock] = useState<ShowUnlock | null>(null);
  const [showAchievements, setShowAchievements] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [unlockAnimationStartTime, setUnlockAnimationStartTime] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [hoveredElement, setHoveredElement] = useState<number | null>(null);
  const [isMixing] = useState<boolean>(false);
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
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [reasoningPopup, setReasoningPopup] = useState<ReasoningPopup | null>(null);
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<'flash' | 'pro'>('flash');
  const [dimmedElements, setDimmedElements] = useState<Set<string>>(new Set());
  const [animatingElements, setAnimatingElements] = useState<Set<string>>(new Set());
  const [isUndoing, setIsUndoing] = useState<boolean>(false);
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentChallenges, setCurrentChallenges] = useState<Challenge[]>([]);
  
  // Refs
  const draggedElement = useRef<MixingElement | null>(null);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const floatingEmojiId = useRef<number>(0);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('llm-alchemy-api-key');
    
    if (savedApiKey) {
      setUserApiKey(savedApiKey);
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
    const interval = setInterval(fetchChallenges, 60000);
    return () => clearInterval(interval);
  }, []);
  
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

  // Handle URL mode parameter and game state loading
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode && (mode === 'science' || mode === 'creative')) {
      setGameMode(mode as 'science' | 'creative');
    }
  }, [searchParams, setGameMode]);

  // Load game state when user and game mode are available
  useEffect(() => {
    const loadSavedStateEffect = async () => {
      if (user && gameMode) {
        console.log(`[REFACTORED_GAME_STATE_DEBUG] 🔄 Loading saved state for user ${user.id} in ${gameMode} mode...`);
        setStateRestored(false);
        
        try {
          const supabase = createClient();
          const savedState = await loadGameState(supabase, user.id, gameMode);
          
          if (savedState) {
            console.log(`[REFACTORED_GAME_STATE_DEBUG] ✅ Found saved state - loading into context`);
            
            // Load into context state
            loadSavedState({
              elements: savedState.elements || [],
              endElements: savedState.end_elements || [],
              combinations: savedState.combinations || {},
              achievements: savedState.achievements || [],
              failedCombinations: savedState.failed_combinations || [],
            });
            
            // Trigger load animation if needed
            if (savedState.elements && savedState.elements.length > 5) {
              setIsPlayingLoadAnimation(true);
              setAnimatedElements(new Set(savedState.elements.map(e => e.id)));
              playElementLoadAnimation(savedState.elements);
            }
          } else {
            console.log(`[REFACTORED_GAME_STATE_DEBUG] 📭 No saved state found for ${gameMode} mode - starting fresh`);
          }
        } catch (error) {
          console.error('[REFACTORED_GAME_STATE_DEBUG] ❌ Error loading game state:', error);
        } finally {
          setStateRestored(true);
        }
      }
    };

    loadSavedStateEffect();
  }, [user, gameMode, loadSavedState, setStateRestored]);

  // Auto-save game state when state changes
  useEffect(() => {
    if (!isStateRestored) return;

    const saveState = async () => {
      if (user && gameMode && (elements.length > 5 || endElements.length > 0 || Object.keys(combinations).length > 0)) {
        console.log(`[REFACTORED_GAME_STATE_DEBUG] 💾 Auto-saving state...`);
        
        try {
          const supabase = createClient();
          await saveGameState(supabase, user.id, {
            game_mode: gameMode,
            elements: elements,
            end_elements: endElements,
            combinations: combinations,
            achievements: achievements,
            failed_combinations: failedCombinations
          });
          console.log(`[REFACTORED_GAME_STATE_DEBUG] ✅ Auto-save completed successfully`);
        } catch (error) {
          console.error('[REFACTORED_GAME_STATE_DEBUG] ❌ Auto-save failed:', error);
        }
      }
    };

    const timeoutId = setTimeout(saveState, 2000);
    return () => clearTimeout(timeoutId);
  }, [user, gameMode, elements, endElements, combinations, achievements, failedCombinations, isStateRestored]);

  // Initialize Web Audio API
  useEffect(() => {
    audioContext.current = new (window.AudioContext || (window as WindowWithWebkit).webkitAudioContext!)();
  }, []);

  // Mode switching logic - reset to base elements when switching modes
  useEffect(() => {
    const isCurrentlyCreative = gameMode === 'creative';
    const isCurrentlyScience = gameMode === 'science';
    
    // Only reset if we're actually switching modes (not on initial load with saved state)
    const isModeSwitching = (isCurrentlyCreative && elements.find(e => e.name === 'Energy')) ||
                           (isCurrentlyScience && elements.find(e => e.name === 'Life'));
    
    if (isModeSwitching) {
      resetGameState(gameMode);
      // Clear UI state
      setFloatingEmojis([]);
      setShowUnlock(null);
      setReasoningPopup(null);
      setShakeElement(null);
      setPopElement(null);
    }
  }, [gameMode, elements, resetGameState]);

  // Global touch handlers
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

  // Cleanup effects
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Divider dragging
  useEffect(() => {
    if (isDraggingDivider) {
      const handleDividerDrag = (e: MouseEvent) => {
        const deltaY = e.clientY - dragStartY;
        const newHeight = dragStartHeight + deltaY;
        setListHeight(Math.max(100, Math.min(400, newHeight)));
      };

      const handleDividerMouseUp = () => {
        setIsDraggingDivider(false);
      };

      document.addEventListener('mousemove', handleDividerDrag);
      document.addEventListener('mouseup', handleDividerMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleDividerDrag);
        document.removeEventListener('mouseup', handleDividerMouseUp);
      };
    }
  }, [isDraggingDivider, dragStartY, dragStartHeight]);

  // Floating emoji management
  useEffect(() => {
    if (elements.length < 5) return;

    const createFloatingEmoji = () => {
      const randomElement = elements[Math.floor(Math.random() * elements.length)];
      return {
        id: floatingEmojiId.current++,
        emoji: randomElement.emoji,
        x: Math.random() * 100,
        y: Math.random() * 100,
        directionX: (Math.random() - 0.5) * 2,
        directionY: (Math.random() - 0.5) * 2,
        speed: 0.3 + Math.random() * 0.4,
        opacity: 0,
        maxOpacity: 0.005 + Math.random() * 0.005,
        lifespan: 8000 + Math.random() * 6000,
        age: 0
      };
    };

    if (floatingEmojis.length === 0) {
      const initialCount = 1 + Math.floor(Math.random() * 3);
      setFloatingEmojis(Array.from({ length: initialCount }, createFloatingEmoji));
    }

    const animationLoop = setInterval(() => {
      setFloatingEmojis(prevEmojis => {
        let newEmojis = prevEmojis.map(emoji => {
          const newAge = emoji.age + 100;
          const lifeProgress = newAge / emoji.lifespan;
          
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

        newEmojis = newEmojis.filter(emoji => emoji.age < emoji.lifespan);
        
        while (newEmojis.length < 1 || (newEmojis.length < 3 && Math.random() < 0.3)) {
          newEmojis.push(createFloatingEmoji());
        }

        return newEmojis;
      });
    }, 100);

    return () => clearInterval(animationLoop);
  }, [elements.length]);

  // Handle reasoning popup dismissal
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
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

  // Helper functions using game logic
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
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      case 'end-element':
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.15);
        osc.frequency.setValueAtTime(659.25, now + 0.3);
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

  // Initialize our custom hooks
  const { mixElements } = useElementMixing({
    userApiKey,
    selectedModel,
    onShowToast: showToast,
    onPlaySound: playSound,
    onShowUnlock: setShowUnlock,
    onSetShakeElement: setShakeElement,
    onSetPopElement: setPopElement,
    onSetUnlockAnimationStartTime: setUnlockAnimationStartTime,
    dropZoneRef
  });

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

  const animateRemoval = useCallback((elements: MixingElement[], onComplete: () => void) => {
    if (elements.length === 0) {
      onComplete();
      return;
    }
    
    elements.forEach((el, index) => {
      setTimeout(() => {
        setAnimatingElements(prev => new Set(prev).add(`${el.id}-${el.index}`));
      }, index * 50);
    });
    
    const totalDuration = elements.length * 50 + 300;
    setTimeout(() => {
      onComplete();
      setAnimatingElements(new Set());
    }, totalDuration);
  }, []);

  const playElementLoadAnimation = useCallback((elementsToAnimate: Element[]) => {
    const elementsToAnimate_filtered = elementsToAnimate.filter(e => e.unlockOrder > 4);
    if (elementsToAnimate_filtered.length === 0 || isPlayingLoadAnimation) return;
    
    console.log('[REFACTORED_LOAD_ANIMATION] Starting element load animation for', elementsToAnimate_filtered.length, 'elements');
    setIsPlayingLoadAnimation(true);
    
    const sortedElements = [...elementsToAnimate_filtered].sort((a, b) => a.unlockOrder - b.unlockOrder);
    setAnimatedElements(new Set(sortedElements.map(e => e.id)));
    
    const totalDuration = (sortedElements.length * 25) + 300 + 200;
    
    setTimeout(() => {
      setIsPlayingLoadAnimation(false);
      setAnimatedElements(new Set());
    }, totalDuration);
  }, [isPlayingLoadAnimation]);

  const handleElementClick = (element: Element, event: React.MouseEvent) => {
    if (element.reasoning) {
      event.preventDefault();
      event.stopPropagation();
      showReasoningPopup(element, event);
    }
  };

  const handleElementMouseEnter = (element: Element, event: React.MouseEvent) => {
    if (!GameLogic.isTouchDevice() && element.reasoning) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      const rect = event.currentTarget.getBoundingClientRect();
      hoverTimeoutRef.current = setTimeout(() => {
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
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (reasoningPopup && reasoningPopup.fromHover) {
      hideReasoningPopup();
    }
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  const handleGameModeToggle = () => {
    if (!isMixing) {
      const newMode = gameMode === 'science' ? 'creative' : 'science';
      playSound('click');
      
      setMixingArea([]);
      
      const url = new URL(window.location.href);
      url.searchParams.set('mode', newMode);
      window.history.replaceState({}, '', url);
      
      setGameMode(newMode);
    }
  };

  // Optimized element sorting with search filtering
  const sortedElements = useMemo(() => {
    return GameLogic.sortElements(elements, sortMode as 'unlock' | 'alpha', searchTerm);
  }, [elements, sortMode, searchTerm]);

  const regularElementCount = elements.length;
  const endElementCount = endElements.length;

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

  // Touch event handlers
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
      
      setTimeout(() => {
        showReasoningPopup(touchDragging, syntheticEvent as React.TouchEvent);
      }, 50);
      
      return;
    }
    
    // Handle as normal drag operation
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    
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
        // Mix the elements using our hook
        await mixElements(touchDragging, targetElement);
      } else if (!targetElement) {
        playSound('plop');
        if ('vibrate' in navigator) {
          navigator.vibrate(5);
        }
        const offset = GameLogic.getElementSize() / 2;
        if (touchDragging.fromMixingArea) {
          const newPos = GameLogic.resolveCollisions(x - offset, y - offset, mixingArea, dropZoneRef.current, touchDragging.mixIndex);
          updateMixingElement(touchDragging.mixIndex!, { x: newPos.x, y: newPos.y });
        } else {
          const newPos = GameLogic.resolveCollisions(x - offset, y - offset, mixingArea, dropZoneRef.current);
          const newElement = {
            ...touchDragging,
            x: newPos.x,
            y: newPos.y,
            index: Date.now(),
            energized: false
          };
          addToMixingArea(newElement);
        }
      }
    }
    
    setTouchDragging(null);
    setTouchOffset({ x: 0, y: 0 });
    setHoveredElement(null);
    setTouchStartTime(null);
    setTouchStartPos(null);
    setDimmedElements(new Set());
  };

  // Clear mixing area with animation
  const clearMixingAreaWithAnimation = () => {
    if (!isMixing && mixingArea.length > 0) {
      playSound('click');
      animateRemoval(mixingArea, () => clearMixingArea());
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col relative overflow-hidden select-none" style={{ touchAction: touchDragging || isDraggingDivider ? 'none' : 'auto' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-gray-900 to-blue-900/20"></div>
      
      {/* Floating Background Emojis */}
      {floatingEmojis.map(emoji => (
        <div
          key={emoji.id}
          className="absolute text-4xl pointer-events-none transition-opacity duration-200"
          style={{
            left: `${emoji.x}%`,
            top: `${emoji.y}%`,
            opacity: emoji.opacity,
            transform: 'translate(-50%, -50%)'
          }}
        >
          {emoji.emoji}
        </div>
      ))}
      
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
            className="flex items-center gap-2 px-3 py-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white"
            title="Back to Menu"
          >
            <ArrowLeft size={16} />
            <span className="text-sm">Back</span>
          </button>
          
          <div className="text-sm text-gray-400 flex items-center gap-2">
            {/* Undo Button */}
            {undoAvailable && !isUndoing && (
              <button
                onClick={async () => {
                  if (lastCombination) {
                    setIsUndoing(true);
                    playSound('reverse-pop');
                    
                    // Remove the created element
                    if (lastCombination.createdElement.isEndElement) {
                      const newEndElements = endElements.filter(e => e.id !== lastCombination.createdElement.element.id);
                      setEndElements(newEndElements);
                    } else {
                      const newElements = elements.filter(e => e.id !== lastCombination.createdElement.element.id);
                      setElements(newElements);
                    }
                    
                    // Restore the mixing area
                    setMixingArea(lastCombination.mixingAreaState);
                    
                    // Remove from combinations
                    const newCombinations = { ...combinations };
                    delete newCombinations[lastCombination.combinationKey];
                    setCombinations(newCombinations);
                    
                    // Remove from failed combinations if it was there
                    const newFailedCombinations = failedCombinations.filter(key => key !== lastCombination.combinationKey);
                    setFailedCombinations(newFailedCombinations);
                    
                    // Clear undo state
                    setLastCombination(null);
                    setUndoAvailable(false);
                    
                    showToast('Undid last combination');
                    
                    setTimeout(() => {
                      setIsUndoing(false);
                    }, 300);
                  }
                }}
                className="px-2 py-1 bg-orange-600 hover:bg-orange-500 rounded text-white font-medium transition-colors text-xs"
                title="Undo last combination"
              >
                ↶ Undo
              </button>
            )}
            
            {userApiKey ? (
              <span className="text-green-400">Using your API key</span>
            ) : tokenBalance > 0 ? (
              <span className="text-yellow-400">Tokens: {tokenBalance}</span>
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
            <input
              type="text"
              placeholder="Filter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-20 sm:w-20 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={() => setShowAchievements(true)}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-all flex items-center gap-1"
            >
              <span>🏆</span>
              <span className="hidden sm:inline text-sm">Achievements</span>
            </button>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-purple-500"
            >
              <option value="unlock">By Discovery</option>
              <option value="alpha">Alphabetical</option>
            </select>
          </div>
          
          {/* Game Mode Toggle */}
          <button
            onClick={handleGameModeToggle}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10 min-h-0">
        {/* Element List */}
        <div 
          className="overflow-y-auto bg-gray-800/30 backdrop-blur-sm"
          style={{ height: `${listHeight}px` }}
        >
          <div className="p-3">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
              {sortedElements.map((element) => {
                const elementSize = GameLogic.getElementSize();
                const isAnimated = animatedElements.has(element.id);
                const shouldShowLoadAnimation = isPlayingLoadAnimation && element.unlockOrder > 4;
                const animationDelay = shouldShowLoadAnimation ? (element.unlockOrder - 5) * 25 : 0;
                
                return (
                  <div
                    key={element.id}
                    draggable={!GameLogic.isTouchDevice()}
                    onDragStart={(e) => {
                      draggedElement.current = {
                        ...element,
                        x: 0,
                        y: 0,
                        index: 0,
                        energized: false
                      };
                      setIsDragging(true);
                      e.dataTransfer.effectAllowed = 'copy';
                      e.dataTransfer.setData('text/plain', element.name);
                    }}
                    onDragEnd={() => {
                      setIsDragging(false);
                      draggedElement.current = null;
                    }}
                    onTouchStart={(e) => {
                      const touch = e.touches[0];
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTouchStartTime(Date.now());
                      setTouchStartPos({ x: touch.clientX, y: touch.clientY });
                      setTouchOffset({
                        x: touch.clientX - rect.left,
                        y: touch.clientY - rect.top
                      });
                      
                      setTimeout(() => {
                        if (touchStartTime && Date.now() - touchStartTime > 150) {
                          setTouchDragging({
                            ...element,
                            x: 0,
                            y: 0,
                            index: 0,
                            energized: false,
                            fromMixingArea: false,
                            mixIndex: undefined
                          });
                          
                          const otherElements = new Set(sortedElements.filter(el => el.id !== element.id).map(el => el.id));
                          setDimmedElements(otherElements);
                          
                          if ('vibrate' in navigator) {
                            navigator.vibrate(10);
                          }
                        }
                      }, 150);
                    }}
                    onClick={(e) => handleElementClick(element, e)}
                    onMouseEnter={(e) => handleElementMouseEnter(element, e)}
                    onMouseLeave={handleElementMouseLeave}
                    className={`
                      aspect-square flex flex-col items-center justify-center text-center rounded-lg cursor-pointer transition-all duration-300 relative
                      ${isDragging ? 'opacity-30' : 'hover:scale-105 hover:shadow-lg active:scale-95'}
                      ${shakeElement === element.id ? 'animate-[shake_0.5s_ease-in-out]' : ''}
                      ${popElement === element.id ? 'animate-[pop_0.3s_ease-out]' : ''}
                      ${dimmedElements.has(element.id) ? 'opacity-30' : ''}
                      ${isAnimated && shouldShowLoadAnimation ? 'animate-[elementLoad_0.6s_ease-out]' : ''}
                      ${element.reasoning ? 'hover:ring-2 hover:ring-yellow-400/50' : ''}
                    `}
                    style={{ 
                      backgroundColor: element.color,
                      color: GameLogic.getContrastColor(element.color),
                      width: `${elementSize}px`,
                      height: `${elementSize}px`,
                      animationDelay: shouldShowLoadAnimation ? `${animationDelay}ms` : undefined
                    }}
                  >
                    <OpenMojiDisplay 
                      emoji={element.emoji} 
                      hexcode={element.openmojiHex}
                      name={element.name} 
                      size="sm" 
                    />
                    <div className="text-[8px] sm:text-[10px] font-medium px-1 text-center leading-tight">
                      {element.name}
                    </div>
                    {element.reasoning && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full text-[8px] flex items-center justify-center text-black font-bold">
                        ?
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div 
          className="h-1 bg-gray-600 cursor-row-resize hover:bg-gray-500 transition-colors flex items-center justify-center relative"
          onMouseDown={(e) => {
            setIsDraggingDivider(true);
            setDragStartY(e.clientY);
            setDragStartHeight(listHeight);
          }}
          onTouchStart={handleDividerTouchStart}
        >
          <GripHorizontal size={16} className="text-gray-400" />
        </div>

        {/* Mixing Area */}
        <div className="flex-1 bg-gray-900/50 backdrop-blur-sm relative overflow-hidden">
          <div 
            ref={dropZoneRef}
            className={`w-full h-full relative transition-colors ${
              isDragging || touchDragging ? 'bg-blue-900/20 border-2 border-dashed border-blue-400' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (!draggedElement.current) return;
              
              const rect = dropZoneRef.current!.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              
              playSound('plop');
              const offset = GameLogic.getElementSize() / 2;
              const newPos = GameLogic.resolveCollisions(x - offset, y - offset, mixingArea, dropZoneRef.current!);
              
              const newElement: MixingElement = {
                ...draggedElement.current,
                x: newPos.x,
                y: newPos.y,
                index: Date.now(),
                energized: false
              };
              
              addToMixingArea(newElement);
              setIsDragging(false);
              draggedElement.current = null;
            }}
          >
            {/* Mixing Area Elements */}
            {mixingArea.map((element) => {
              const elementSize = GameLogic.getElementSize();
              const isAnimating = animatingElements.has(`${element.id}-${element.index}`);
              
              return (
                <div
                  key={`mixing-${element.id}-${element.index}`}
                  id={`mixing-${element.id}-${element.index}`}
                  className={`absolute flex flex-col items-center justify-center text-center rounded-lg cursor-pointer transition-all duration-300 select-none ${
                    hoveredElement === element.index ? 'ring-2 ring-yellow-400 scale-110' : ''
                  } ${
                    touchDragging && touchDragging.mixIndex === element.index ? 'opacity-50' : ''
                  } ${
                    isAnimating ? 'animate-[elementRemove_0.3s_ease-in-out_forwards]' : ''
                  } ${
                    element.energized ? 'animate-pulse' : ''
                  }`}
                  style={{
                    left: `${element.x}px`,
                    top: `${element.y}px`,
                    width: `${elementSize}px`,
                    height: `${elementSize}px`,
                    backgroundColor: element.color,
                    color: GameLogic.getContrastColor(element.color),
                    zIndex: hoveredElement === element.index ? 1000 : 1
                  }}
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTouchStartTime(Date.now());
                    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
                    setTouchOffset({
                      x: touch.clientX - rect.left,
                      y: touch.clientY - rect.top
                    });
                    
                    setTimeout(() => {
                      if (touchStartTime && Date.now() - touchStartTime > 100) {
                        setTouchDragging({
                          ...element,
                          fromMixingArea: true,
                          mixIndex: element.index
                        });
                        
                        const otherIndices = new Set(mixingArea.filter(el => el.index !== element.index).map(el => el.index.toString()));
                        setDimmedElements(otherIndices);
                        
                        if ('vibrate' in navigator) {
                          navigator.vibrate(10);
                        }
                      }
                    }, 100);
                  }}
                  onClick={(e) => handleElementClick(element, e)}
                  onMouseEnter={(e) => handleElementMouseEnter(element, e)}
                  onMouseLeave={handleElementMouseLeave}
                >
                  <OpenMojiDisplay 
                    emoji={element.emoji} 
                    hexcode={element.openmojiHex}
                    name={element.name} 
                    size="sm" 
                  />
                  <div className="text-[8px] sm:text-[10px] font-medium px-1 text-center leading-tight">
                    {element.name}
                  </div>
                  {element.reasoning && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full text-[8px] flex items-center justify-center text-black font-bold">
                      ?
                    </div>
                  )}
                </div>
              );
            })}

            {/* Clear Button */}
            {mixingArea.length > 0 && !isMixing && (
              <button
                onClick={clearMixingAreaWithAnimation}
                className="absolute bottom-4 right-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 z-10"
              >
                <X size={16} />
                Clear
              </button>
            )}

            {/* Instructions */}
            {mixingArea.length === 0 && !isDragging && !touchDragging && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <div className="text-6xl mb-4">⚗️</div>
                  <h3 className="text-xl font-semibold mb-2">Mixing Area</h3>
                  <p className="text-sm">Drag elements here to combine them</p>
                  <p className="text-xs opacity-75 mt-1">Touch and hold on mobile</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Touch Drag Element */}
        {touchDragging && (
          <div
            id="touch-drag-element"
            className="fixed pointer-events-none z-50 flex flex-col items-center justify-center text-center rounded-lg"
            style={{
              width: `${GameLogic.getElementSize()}px`,
              height: `${GameLogic.getElementSize()}px`,
              backgroundColor: touchDragging.color,
              color: GameLogic.getContrastColor(touchDragging.color),
              transform: 'scale(1.1)'
            }}
          >
            <OpenMojiDisplay 
              emoji={touchDragging.emoji} 
              hexcode={touchDragging.openmojiHex}
              name={touchDragging.name} 
              size="sm" 
            />
            <div className="text-[8px] sm:text-[10px] font-medium px-1 text-center leading-tight">
              {touchDragging.name}
            </div>
          </div>
        )}
      </div>

      {/* Challenge Bar */}
      <ChallengeBar isAnonymous={dbUser?.is_anonymous} currentGameMode={gameMode} />

      {/* Reasoning Popup */}
      <ReasoningPopup 
        reasoningPopup={reasoningPopup}
        onClose={hideReasoningPopup}
      />

      {/* Unlock Modal */}
      <UnlockModal 
        showUnlock={showUnlock}
        onClose={() => setShowUnlock(null)}
      />

      {/* Achievements Modal */}
      <AchievementsModal 
        isOpen={showAchievements}
        achievements={achievements}
        onClose={() => setShowAchievements(false)}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 px-4 py-2 rounded-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
};

export default LLMAlchemyRefactored;
