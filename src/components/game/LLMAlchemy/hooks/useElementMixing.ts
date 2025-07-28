import { useCallback } from 'react';
import { useSupabase } from '@/components/auth/SupabaseProvider';
import { createClient, incrementDailyCount, saveGameState, consumeToken } from '@/lib/supabase';
import { buildSharedSections, buildSciencePrompt, buildCreativePrompt } from '@/lib/llm-prompts';
import { checkAchievements } from '@/lib/achievements';
import { elementMatchesCategory } from '@/lib/challenge-elements';
import { resolveEmoji } from '@/lib/openmoji-service';
import { GAME_CONFIG } from '@/lib/game-config';
import { Achievement } from '@/types';
import { 
  useGameMode, 
  useElements, 
  useMixingArea, 
  useCombinations, 
  useAchievements, 
  useGameUndo, 
  useGameStats 
} from '../contexts/GameStateProvider';
import { Element, MixingElement, LastCombination } from './useGameState';
import * as GameLogic from '@/lib/game-logic';

interface ShowUnlockElement extends Element {
  isNew: boolean;
  achievement?: Achievement | null;
}

interface UseElementMixingProps {
  userApiKey: string;
  selectedModel: 'flash' | 'pro';
  onShowToast: (message: string) => void;
  onPlaySound: (type: string) => void;
  onShowUnlock: (element: ShowUnlockElement | null) => void;
  onSetShakeElement: (id: string | null) => void;
  onSetPopElement: (id: string | null) => void;
  onSetUnlockAnimationStartTime: (time: number | null) => void;
  dropZoneRef: React.RefObject<HTMLDivElement | null>;
}

export function useElementMixing({
  userApiKey,
  selectedModel,
  onShowToast,
  onPlaySound,
  onShowUnlock,
  onSetShakeElement,
  onSetPopElement,
  onSetUnlockAnimationStartTime,
  dropZoneRef
}: UseElementMixingProps) {
  const { user, dailyCount, tokenBalance, refreshDailyCount, refreshTokenBalance } = useSupabase();
  const { gameMode } = useGameMode();
  const { elements, endElements, addElement, addEndElement } = useElements();
  const { mixingArea, setMixingArea, updateMixingElement, removeFromMixingArea, addToMixingArea } = useMixingArea();
  const { combinations, failedCombinations, addCombination, addFailedCombination } = useCombinations();
  const { achievements, addAchievements } = useAchievements();
  const { setLastCombination, setUndoAvailable } = useGameUndo();
  const { incrementTotalCombinations } = useGameStats();

  // Generate combination using API
  const generateCombination = useCallback(async (
    elem1: Element, 
    elem2: Element, 
    elem3: Element | null = null
  ): Promise<GameLogic.CombinationResult> => {
    // Check daily limit first
    const limitCheck = GameLogic.shouldAllowMixing(
      userApiKey, 
      tokenBalance, 
      dailyCount, 
      GAME_CONFIG.DAILY_FREE_COMBINATIONS
    );
    
    if (!limitCheck.allowed) {
      onShowToast(limitCheck.reason!);
      return { result: null, error: true, limitReached: true };
    }

    // Determine model selection
    const modelSelection = GameLogic.determineModelSelection(userApiKey, tokenBalance, selectedModel);
    console.log(`[LLM-Alchemy Frontend] User Type: ${modelSelection.userType} | Model: ${modelSelection.model} | Reason: ${modelSelection.reason}`);

    // Build combination key for caching
    const sortedNames = [elem1.name, elem2.name, elem3?.name].filter(Boolean).sort().join('+');
    const mixKey = elem3 ? `${sortedNames}+Energy` : sortedNames;

    // Check cache first
    const cachedResult = GameLogic.getCachedCombination(mixKey, combinations, elements, endElements);
    if (cachedResult) return cachedResult;

    // Check hardcoded combinations
    const hardcodedResult = GameLogic.getHardcodedCombination(sortedNames, gameMode);
    if (hardcodedResult) {
      // Add 1-second delay to simulate LLM processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      return hardcodedResult;
    }

    // Build context for LLM
    const { recentText, failedText } = GameLogic.buildCombinationContext(combinations, failedCombinations);
    const rarityTarget = GameLogic.calculateRarityTarget();

    // Build shared sections and prompt
    const sharedSections = buildSharedSections(rarityTarget, gameMode);
    const mixingElements = [elem1, elem2, elem3].filter((e): e is Element => e !== null);
    
    const prompt = gameMode === 'science' 
      ? buildSciencePrompt(elements, mixingElements, sharedSections, recentText, failedText)
      : buildCreativePrompt(elements, mixingElements, sharedSections, recentText, failedText);

    // Make API request with retry logic
    const makeRequest = async (): Promise<{
      error?: string;
      outcomes?: Array<{
        result: string;
        emoji: string;
        color: string;
        rarity: string;
        reasoning: string;
        achievementTags: string[];
        emojiTags: string[];
        tags: string[];
        isEndElement: boolean;
      }> | null;
      reasoning?: string;
    }> => {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 8000);
      
      try {
        const requestBody = { 
          prompt, 
          gameMode,
          apiKey: userApiKey,
          useProModel: modelSelection.useProModel
        };
        
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: abortController.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[LLM-Alchemy Debug] API request failed:`, response.status, errorText);
          throw new Error(`API request failed: ${response.status}`);
        }

        const rawResponse = await response.text();
        return JSON.parse(rawResponse);
        
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timed out');
        }
        
        throw error;
      }
    };

    try {
      let parsedResult;
      
      try {
        parsedResult = await makeRequest();
      } catch (firstError) {
        const errorMessage = firstError instanceof Error ? firstError.message : 'Unknown error';
        
        if (errorMessage === 'Request timed out') {
          onShowToast('Connection slow, retrying...');
          
          try {
            parsedResult = await makeRequest();
          } catch (retryError) {
            const retryErrorMessage = retryError instanceof Error ? retryError.message : 'Unknown error';
            
            if (retryErrorMessage === 'Request timed out') {
              onShowToast('LLM timeout - try mixing again');
            } else {
              onShowToast('Network error - check connection');
            }
            
            return { result: null, error: true, timeout: true };
          }
        } else {
          throw firstError;
        }
      }
      
      // Handle API response
      if (parsedResult.error) {
        onShowToast('API Error: ' + parsedResult.error);
        return { result: null, error: true };
      }
      
      if (parsedResult.outcomes === null) {
        // No valid combination - track as failed
        const failedKey = `${elem1.name}+${elem2.name}${elem3 ? '+Energy' : ''}`;
        addFailedCombination(failedKey);
        
        // Increment counter for failed attempts too
        await incrementUsageCounter();
        return { result: null, reasoning: parsedResult.reasoning };
      }
      
      // Handle successful outcomes
      if (Array.isArray(parsedResult.outcomes) && parsedResult.outcomes.length > 0) {
        let selectedOutcome;
        
        if (parsedResult.outcomes.length === 1) {
          selectedOutcome = parsedResult.outcomes[0];
        } else {
          // Multiple outcomes - select based on rarity probabilities
          const roll = Math.random() * 100;
          
          const commonOutcomes = parsedResult.outcomes.filter(o => o.rarity === 'common');
          const uncommonOutcomes = parsedResult.outcomes.filter(o => o.rarity === 'uncommon');
          const rareOutcomes = parsedResult.outcomes.filter(o => o.rarity === 'rare');
          
          if (roll < 60 && commonOutcomes.length > 0) {
            selectedOutcome = commonOutcomes[Math.floor(Math.random() * commonOutcomes.length)];
          } else if (roll < 90 && uncommonOutcomes.length > 0) {
            selectedOutcome = uncommonOutcomes[Math.floor(Math.random() * uncommonOutcomes.length)];
          } else if (rareOutcomes.length > 0) {
            selectedOutcome = rareOutcomes[Math.floor(Math.random() * rareOutcomes.length)];
          } else {
            selectedOutcome = parsedResult.outcomes[Math.floor(Math.random() * parsedResult.outcomes.length)];
          }
        }
        
        // Increment usage counter for successful API calls
        await incrementUsageCounter();
        
        return {
          result: selectedOutcome.result || null,
          emoji: selectedOutcome.emoji || '✨',
          color: selectedOutcome.color || '#808080',
          rarity: selectedOutcome.rarity || 'common',
          reasoning: selectedOutcome.reasoning || '',
          achievementTags: selectedOutcome.achievementTags || [],
          emojiTags: selectedOutcome.emojiTags || [],
          tags: selectedOutcome.tags || [],
          isEndElement: selectedOutcome.isEndElement || false
        };
      }
      
      await incrementUsageCounter();
      return { result: null };
      
    } catch (error) {
      console.error('Error generating combination:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        onShowToast('Network Error: Check connection and try again');
      } else if (error instanceof SyntaxError) {
        onShowToast('API Error: Invalid response format');
      } else {
        onShowToast('LLM Error: Try mixing different elements');
      }
      
      return { result: null, error: true };
    }
  }, [userApiKey, selectedModel, gameMode, elements, endElements, combinations, failedCombinations, tokenBalance, dailyCount]);

  // Helper to increment usage counter
  const incrementUsageCounter = useCallback(async () => {
    try {
      if (user && !userApiKey) {
        const supabase = createClient();
        
        if (tokenBalance > 0) {
          await consumeToken(supabase, user.id);
          await refreshTokenBalance();
        } else {
          await incrementDailyCount(supabase, user.id);
          await refreshDailyCount();
        }
      }
      return true;
    } catch (error) {
      console.error('Error updating usage counter:', error);
      return true;
    }
  }, [user, userApiKey, tokenBalance, refreshTokenBalance, refreshDailyCount]);

  // Check challenge completion
  const checkChallengeCompletion = useCallback(async (element: Element) => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/challenges/current');
      if (!response.ok) return;
      
      const data = await response.json();
      const currentChallenges = data.challenges || [];
      
      for (const challenge of currentChallenges) {
        if (challenge.isCompleted) continue;
        
        let isCompleted = false;
        
        if (challenge.target_element) {
          isCompleted = element.name.toLowerCase() === challenge.target_element.toLowerCase();
        } else if (challenge.target_category) {
          const elementTags = element.achievementTags || element.tags || [];
          isCompleted = elementMatchesCategory(elementTags, challenge.target_category);
        }
        
        if (isCompleted) {
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
            
            if (result.tokensAwarded > 0) {
              onShowToast(`🎉 Challenge completed! +${result.tokensAwarded} tokens`);
              await refreshTokenBalance();
            } else {
              onShowToast(`🎉 Challenge completed!`);
            }
            
            onPlaySound('reward');
          }
        }
      }
    } catch (error) {
      console.error('Error checking challenge completion:', error);
    }
  }, [user, gameMode, refreshTokenBalance, onShowToast, onPlaySound]);

  // Main mixing function
  const mixElements = useCallback(async (elem1: MixingElement, elem2: MixingElement) => {
    if (!GameLogic.validateMixing(elem1, elem2)) return;
    
    onPlaySound('pop');
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 10, 10]);
    }
    
    const mixingType = GameLogic.getMixingType(elem1, elem2);
    
    if (mixingType === 'energize') {
      // Energize the non-energy element
      const targetEl = elem2.name === 'Energy' ? elem1 : elem2;
      updateMixingElement(targetEl.index, { energized: true });
      
      // Remove energy element
      const energyIndex = elem1.name === 'Energy' ? elem1.index : elem2.index;
      removeFromMixingArea([energyIndex]);
      
    } else if (mixingType === 'energy-mix') {
      // Mix with energy
      const baseElem1 = elem1.energized ? { ...elem1, energized: false } as Element : elem1;
      const baseElem2 = elem2.energized ? { ...elem2, energized: false } as Element : elem2;
      
      await performMix([baseElem1, baseElem2], true, elem1.index, elem2.index);
      
    } else {
      // Normal mixing
      await performMix([elem1, elem2], false, elem1.index, elem2.index);
    }
  }, [onPlaySound, updateMixingElement, setMixingArea]);

  // Perform the actual mixing logic
  const performMix = useCallback(async (
    elementsToMix: Element[], 
    hasEnergy: boolean = false, 
    ...indicesToRemove: number[]
  ) => {
    // Remove elements from mixing area immediately
    removeFromMixingArea(indicesToRemove);
    
    const mixKey = GameLogic.generateCombinationKey(elementsToMix, hasEnergy);
    
    // Check if combination already exists
    const cachedResult = GameLogic.getCachedCombination(mixKey, combinations, elements, endElements);
    if (cachedResult) {
      if (cachedResult.result) {
        const existingElement = elements.find(e => e.name === cachedResult.result) || 
                                endElements.find(e => e.name === cachedResult.result);
        if (existingElement) {
          onShowUnlock({ ...existingElement, isNew: false });
          if (!existingElement.isEndElement) {
            onSetShakeElement(existingElement.id);
            setTimeout(() => {
              onShowUnlock(null);
              onSetShakeElement(null);
            }, 1500);
          } else {
            setTimeout(() => onShowUnlock(null), 1500);
          }
        }
      } else {
        onShowToast('No reaction');
      }
      return;
    }

    // Generate new combination
    const result = await generateCombination(
      elementsToMix[0], 
      elementsToMix[1], 
      hasEnergy ? { name: 'Energy' } as Element : null
    );
    
    if (result.error) return;
    
    if (result.result) {
      // Check if element already exists
      const existing = elements.find(e => e.name.toLowerCase() === result.result!.toLowerCase()) ||
                      endElements.find(e => e.name.toLowerCase() === result.result!.toLowerCase());
      
      if (existing) {
        onShowUnlock({ ...existing, isNew: false });
        if (!existing.isEndElement) {
          onSetShakeElement(existing.id);
          setTimeout(() => {
            onShowUnlock(null);
            onSetShakeElement(null);
          }, 1500);
        } else {
          setTimeout(() => onShowUnlock(null), 1500);
        }
      } else {
        // Create new element
        const isEndElement = result.isEndElement || false;
        
        // Resolve OpenMoji for the new element
        const emojiTags = result.emojiTags || result.achievementTags || result.tags || [];
        const openmojiData = resolveEmoji({
          unicodeEmoji: result.emoji || '✨',
          name: result.result,
          tags: emojiTags
        });
        
        const newElement: Element = {
          id: result.result.toLowerCase().replace(/\s+/g, '-'),
          name: result.result,
          emoji: result.emoji || '✨',
          color: result.color || '#808080',
          unlockOrder: elements.length + endElements.length,
          rarity: result.rarity || 'common',
          reasoning: result.reasoning || '',
          achievementTags: result.achievementTags || [],
          emojiTags: result.emojiTags || [],
          tags: result.tags || [],
          isEndElement,
          parents: elementsToMix,
          energyEnhanced: hasEnergy && elementsToMix.length === 2,
          ...(openmojiData.isExtra && {
            openmojiHex: openmojiData.hexcode,
            isOpenmojiExtra: true
          })
        };
        
        // Add to appropriate collection
        if (isEndElement) {
          onPlaySound('end-element');
          addEndElement(newElement);
        } else {
          onPlaySound('reward');
          addElement(newElement);
          onSetPopElement(newElement.id);
        }
        
        // Check achievements
        let allAchievements: Achievement[] = [];
        let contextualAchievement = null;
        try {
          const updatedElements = isEndElement ? elements : [...elements, newElement];
          const updatedEndElements = isEndElement ? [...endElements, newElement] : endElements;
          
          allAchievements = checkAchievements(newElement, updatedElements, updatedEndElements, achievements, gameMode);
          contextualAchievement = allAchievements.find(a => a.id.startsWith('first-'));
          
          if (allAchievements.length > 0) {
            addAchievements(allAchievements);
          }
        } catch (error) {
          console.error('Achievement check failed:', error);
        }

        // Set up undo functionality
        const lastCombination: LastCombination = {
          createdElement: {
            element: newElement,
            isEndElement: isEndElement
          },
          combinationKey: mixKey,
          mixingAreaState: mixingArea, // Capture current mixing area state
          achievementsGained: allAchievements,
          endElementsGained: isEndElement ? [newElement] : [],
          timestamp: Date.now()
        };
        
        setLastCombination(lastCombination);
        setUndoAvailable(true);
        incrementTotalCombinations();

        // Save state immediately
        if (user && gameMode) {
          try {
            const supabase = createClient();
            const updatedElements = isEndElement ? elements : [...elements, newElement];
            const updatedEndElements = isEndElement ? [...endElements, newElement] : endElements;
            
            await saveGameState(supabase, user.id, {
              game_mode: gameMode,
              elements: updatedElements,
              end_elements: updatedEndElements,
              combinations: { ...combinations, [mixKey]: result.result },
              achievements: [...achievements, ...allAchievements],
              failed_combinations: failedCombinations
            });
          } catch (error) {
            console.error('Immediate save failed:', error);
          }
        }
        
        // Check challenge completion
        await checkChallengeCompletion(newElement);
        
        // Show unlock modal
        onShowUnlock({ 
          ...newElement, 
          isNew: true,
          achievement: contextualAchievement || null
        });
        onSetUnlockAnimationStartTime(Date.now());
        
        if (!isEndElement) {
          // Add new element to mixing area center
          const rect = dropZoneRef.current?.getBoundingClientRect();
          if (rect) {
            const offset = GameLogic.getElementSize() / 2;
            const centerX = rect.width / 2 - offset;
            const centerY = rect.height / 2 - offset;
            const newPos = GameLogic.resolveCollisions(centerX, centerY, mixingArea, dropZoneRef.current);
            
            const centerElement: MixingElement = {
              ...newElement,
              x: newPos.x,
              y: newPos.y,
              index: Date.now() + 1000,
              energized: false
            };
            
            addToMixingArea(centerElement);
          }
          
          setTimeout(() => {
            onShowUnlock(null);
            onSetPopElement(null);
            onSetUnlockAnimationStartTime(null);
          }, 3000);
        } else {
          setTimeout(() => {
            onShowUnlock(null);
            onSetUnlockAnimationStartTime(null);
          }, 3000);
        }
      }
      
      // Cache the result
      addCombination(mixKey, result.result);
    } else {
      // No reaction
      const reasoningText = result.reasoning || 'No reaction';
      onShowToast(reasoningText);
      addCombination(mixKey, null);
    }
  }, [
    setMixingArea, combinations, elements, endElements, generateCombination, onShowUnlock, 
    onSetShakeElement, onPlaySound, onSetPopElement, addEndElement, addElement, achievements, 
    addAchievements, setLastCombination, setUndoAvailable, incrementTotalCombinations, 
    user, gameMode, failedCombinations, checkChallengeCompletion, onSetUnlockAnimationStartTime,
    dropZoneRef, mixingArea, addCombination, onShowToast
  ]);

  return {
    mixElements,
    performMix
  };
}
