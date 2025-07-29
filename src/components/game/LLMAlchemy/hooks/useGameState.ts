import { useReducer, useCallback } from 'react';
import { GameElement, Achievement } from '@/types/game.types';

export interface MixingElement extends GameElement {
  x: number;
  y: number;
  index: number;
  energized: boolean;
  fromMixingArea?: boolean;
  mixIndex?: number | null;
}

export interface LastCombination {
  createdElement: {
    element: GameElement;
    isEndElement: boolean;
  };
  combinationKey: string;
  mixingAreaState: MixingElement[];
  achievementsGained: Achievement[];
  endElementsGained: GameElement[];
  timestamp: number;
}

// Core game state (domain/persistent data only)
export interface GameState {
  // Core game data
  elements: GameElement[];
  endElements: GameElement[];
  combinations: Record<string, string | null>;
  gameMode: 'science' | 'creative';
  
  // Game logic state
  mixingArea: MixingElement[];
  achievements: Achievement[];
  failedCombinations: string[];
  
  // Enhanced state for UI restoration
  dimmedElements: Set<string>;
  animatingElements: Set<string>;
  isUndoing: boolean;
  
  // Undo/redo functionality
  lastCombination: LastCombination | null;
  undoAvailable: boolean;
  totalCombinationsMade: number;
  
  // State restoration tracking
  isStateRestored: boolean;
}

// Action types for the reducer
export type GameAction =
  | { type: 'SET_GAME_MODE'; payload: 'science' | 'creative' }
  | { type: 'SET_ELEMENTS'; payload: GameElement[] }
  | { type: 'ADD_ELEMENT'; payload: GameElement }
  | { type: 'SET_END_ELEMENTS'; payload: GameElement[] }
  | { type: 'ADD_END_ELEMENT'; payload: GameElement }
  | { type: 'SET_COMBINATIONS'; payload: Record<string, string | null> }
  | { type: 'ADD_COMBINATION'; payload: { key: string; result: string | null } }
  | { type: 'SET_MIXING_AREA'; payload: MixingElement[] }
  | { type: 'ADD_TO_MIXING_AREA'; payload: MixingElement }
  | { type: 'REMOVE_FROM_MIXING_AREA'; payload: number[] }
  | { type: 'UPDATE_MIXING_ELEMENT'; payload: { index: number; updates: Partial<MixingElement> } }
  | { type: 'CLEAR_MIXING_AREA' }
  | { type: 'SET_ACHIEVEMENTS'; payload: Achievement[] }
  | { type: 'ADD_ACHIEVEMENTS'; payload: Achievement[] }
  | { type: 'SET_FAILED_COMBINATIONS'; payload: string[] }
  | { type: 'ADD_FAILED_COMBINATION'; payload: string }
  | { type: 'SET_DIMMED_ELEMENTS'; payload: Set<string> }
  | { type: 'ADD_DIMMED_ELEMENT'; payload: string }
  | { type: 'REMOVE_DIMMED_ELEMENT'; payload: string }
  | { type: 'CLEAR_DIMMED_ELEMENTS' }
  | { type: 'SET_ANIMATING_ELEMENTS'; payload: Set<string> }
  | { type: 'ADD_ANIMATING_ELEMENT'; payload: string }
  | { type: 'REMOVE_ANIMATING_ELEMENT'; payload: string }
  | { type: 'CLEAR_ANIMATING_ELEMENTS' }
  | { type: 'SET_IS_UNDOING'; payload: boolean }
  | { type: 'SET_LAST_COMBINATION'; payload: LastCombination | null }
  | { type: 'SET_UNDO_AVAILABLE'; payload: boolean }
  | { type: 'INCREMENT_TOTAL_COMBINATIONS' }
  | { type: 'SET_STATE_RESTORED'; payload: boolean }
  | { type: 'LOAD_SAVED_STATE'; payload: Partial<GameState> }
  | { type: 'RESET_GAME_STATE'; payload: { gameMode: 'science' | 'creative' } };

// Initial state factory
const createInitialState = (gameMode: 'science' | 'creative' = 'science'): GameState => {
  const baseElements = gameMode === 'creative' 
    ? [
        { id: 'life', name: 'Life', emoji: '🧬', color: '#32CD32', unlockOrder: 0 },
        { id: 'earth', name: 'Earth', emoji: '🌍', color: '#8B4513', unlockOrder: 1 },
        { id: 'air', name: 'Air', emoji: '💨', color: '#87CEEB', unlockOrder: 2 },
        { id: 'fire', name: 'Fire', emoji: '🔥', color: '#FF4500', unlockOrder: 3 },
        { id: 'water', name: 'Water', emoji: '💧', color: '#4682B4', unlockOrder: 4 },
      ]
    : [
        { id: 'energy', name: 'Energy', emoji: '〰️', color: '#FFD700', unlockOrder: 0 },
        { id: 'earth', name: 'Earth', emoji: '🌍', color: '#8B4513', unlockOrder: 1 },
        { id: 'air', name: 'Air', emoji: '💨', color: '#87CEEB', unlockOrder: 2 },
        { id: 'fire', name: 'Fire', emoji: '🔥', color: '#FF4500', unlockOrder: 3 },
        { id: 'water', name: 'Water', emoji: '💧', color: '#4682B4', unlockOrder: 4 },
      ];

  return {
    elements: baseElements,
    endElements: [],
    combinations: {},
    gameMode,
    mixingArea: [],
    achievements: [],
    failedCombinations: [],
    dimmedElements: new Set<string>(),
    animatingElements: new Set<string>(),
    isUndoing: false,
    lastCombination: null,
    undoAvailable: false,
    totalCombinationsMade: 0,
    isStateRestored: false,
  };
};

// Game state reducer
function gameStateReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_GAME_MODE':
      // When mode changes, reset to base elements for that mode
      return createInitialState(action.payload);

    case 'SET_ELEMENTS':
      return { ...state, elements: action.payload };

    case 'ADD_ELEMENT':
      return { 
        ...state, 
        elements: [...state.elements, action.payload] 
      };

    case 'SET_END_ELEMENTS':
      return { ...state, endElements: action.payload };

    case 'ADD_END_ELEMENT':
      return { 
        ...state, 
        endElements: [...state.endElements, action.payload] 
      };

    case 'SET_COMBINATIONS':
      return { ...state, combinations: action.payload };

    case 'ADD_COMBINATION':
      return { 
        ...state, 
        combinations: { 
          ...state.combinations, 
          [action.payload.key]: action.payload.result 
        } 
      };

    case 'SET_MIXING_AREA':
      return { ...state, mixingArea: action.payload };

    case 'ADD_TO_MIXING_AREA':
      return { 
        ...state, 
        mixingArea: [...state.mixingArea, action.payload] 
      };

    case 'REMOVE_FROM_MIXING_AREA':
      return { 
        ...state, 
        mixingArea: state.mixingArea.filter(el => !action.payload.includes(el.index)) 
      };

    case 'UPDATE_MIXING_ELEMENT':
      return {
        ...state,
        mixingArea: state.mixingArea.map(el => 
          el.index === action.payload.index 
            ? { ...el, ...action.payload.updates }
            : el
        )
      };

    case 'CLEAR_MIXING_AREA':
      return { ...state, mixingArea: [] };

    case 'SET_ACHIEVEMENTS':
      return { ...state, achievements: action.payload };

    case 'ADD_ACHIEVEMENTS':
      return { 
        ...state, 
        achievements: [...state.achievements, ...action.payload] 
      };

    case 'SET_FAILED_COMBINATIONS':
      return { ...state, failedCombinations: action.payload };

    case 'ADD_FAILED_COMBINATION':
      return { 
        ...state, 
        failedCombinations: [...state.failedCombinations.slice(-4), action.payload] 
      };

    case 'SET_DIMMED_ELEMENTS':
      return { ...state, dimmedElements: action.payload };

    case 'ADD_DIMMED_ELEMENT':
      return { 
        ...state, 
        dimmedElements: new Set([...state.dimmedElements, action.payload])
      };

    case 'REMOVE_DIMMED_ELEMENT':
      const newDimmedElements = new Set(state.dimmedElements);
      newDimmedElements.delete(action.payload);
      return { ...state, dimmedElements: newDimmedElements };

    case 'CLEAR_DIMMED_ELEMENTS':
      return { ...state, dimmedElements: new Set<string>() };

    case 'SET_ANIMATING_ELEMENTS':
      return { ...state, animatingElements: action.payload };

    case 'ADD_ANIMATING_ELEMENT':
      return { 
        ...state, 
        animatingElements: new Set([...state.animatingElements, action.payload])
      };

    case 'REMOVE_ANIMATING_ELEMENT':
      const newAnimatingElements = new Set(state.animatingElements);
      newAnimatingElements.delete(action.payload);
      return { ...state, animatingElements: newAnimatingElements };

    case 'CLEAR_ANIMATING_ELEMENTS':
      return { ...state, animatingElements: new Set<string>() };

    case 'SET_IS_UNDOING':
      return { ...state, isUndoing: action.payload };

    case 'SET_LAST_COMBINATION':
      return { ...state, lastCombination: action.payload };

    case 'SET_UNDO_AVAILABLE':
      return { ...state, undoAvailable: action.payload };

    case 'INCREMENT_TOTAL_COMBINATIONS':
      return { ...state, totalCombinationsMade: state.totalCombinationsMade + 1 };

    case 'SET_STATE_RESTORED':
      return { ...state, isStateRestored: action.payload };

    case 'LOAD_SAVED_STATE':
      return { ...state, ...action.payload };

    case 'RESET_GAME_STATE':
      return createInitialState(action.payload.gameMode);

    default:
      return state;
  }
}

// Custom hook for game state management
export function useGameState(initialGameMode: 'science' | 'creative' = 'science') {
  const [state, dispatch] = useReducer(
    gameStateReducer,
    createInitialState(initialGameMode)
  );

  // Action creators for easier dispatch calls
  const actions = {
    setGameMode: useCallback((mode: 'science' | 'creative') => {
      dispatch({ type: 'SET_GAME_MODE', payload: mode });
    }, []),

    setElements: useCallback((elements: GameElement[]) => {
      dispatch({ type: 'SET_ELEMENTS', payload: elements });
    }, []),

    addElement: useCallback((element: GameElement) => {
      dispatch({ type: 'ADD_ELEMENT', payload: element });
    }, []),

    setEndElements: useCallback((endElements: GameElement[]) => {
      dispatch({ type: 'SET_END_ELEMENTS', payload: endElements });
    }, []),

    addEndElement: useCallback((element: GameElement) => {
      dispatch({ type: 'ADD_END_ELEMENT', payload: element });
    }, []),

    setCombinations: useCallback((combinations: Record<string, string | null>) => {
      dispatch({ type: 'SET_COMBINATIONS', payload: combinations });
    }, []),

    addCombination: useCallback((key: string, result: string | null) => {
      dispatch({ type: 'ADD_COMBINATION', payload: { key, result } });
    }, []),

    setMixingArea: useCallback((mixingArea: MixingElement[]) => {
      dispatch({ type: 'SET_MIXING_AREA', payload: mixingArea });
    }, []),

    addToMixingArea: useCallback((element: MixingElement) => {
      dispatch({ type: 'ADD_TO_MIXING_AREA', payload: element });
    }, []),

    removeFromMixingArea: useCallback((indices: number[]) => {
      dispatch({ type: 'REMOVE_FROM_MIXING_AREA', payload: indices });
    }, []),

    updateMixingElement: useCallback((index: number, updates: Partial<MixingElement>) => {
      dispatch({ type: 'UPDATE_MIXING_ELEMENT', payload: { index, updates } });
    }, []),

    clearMixingArea: useCallback(() => {
      dispatch({ type: 'CLEAR_MIXING_AREA' });
    }, []),

    setAchievements: useCallback((achievements: Achievement[]) => {
      dispatch({ type: 'SET_ACHIEVEMENTS', payload: achievements });
    }, []),

    addAchievements: useCallback((achievements: Achievement[]) => {
      dispatch({ type: 'ADD_ACHIEVEMENTS', payload: achievements });
    }, []),

    setFailedCombinations: useCallback((failedCombinations: string[]) => {
      dispatch({ type: 'SET_FAILED_COMBINATIONS', payload: failedCombinations });
    }, []),

    addFailedCombination: useCallback((combination: string) => {
      dispatch({ type: 'ADD_FAILED_COMBINATION', payload: combination });
    }, []),

    setDimmedElements: useCallback((dimmedElements: Set<string>) => {
      dispatch({ type: 'SET_DIMMED_ELEMENTS', payload: dimmedElements });
    }, []),

    addDimmedElement: useCallback((elementName: string) => {
      dispatch({ type: 'ADD_DIMMED_ELEMENT', payload: elementName });
    }, []),

    removeDimmedElement: useCallback((elementName: string) => {
      dispatch({ type: 'REMOVE_DIMMED_ELEMENT', payload: elementName });
    }, []),

    clearDimmedElements: useCallback(() => {
      dispatch({ type: 'CLEAR_DIMMED_ELEMENTS' });
    }, []),

    setAnimatingElements: useCallback((animatingElements: Set<string>) => {
      dispatch({ type: 'SET_ANIMATING_ELEMENTS', payload: animatingElements });
    }, []),

    addAnimatingElement: useCallback((elementName: string) => {
      dispatch({ type: 'ADD_ANIMATING_ELEMENT', payload: elementName });
    }, []),

    removeAnimatingElement: useCallback((elementName: string) => {
      dispatch({ type: 'REMOVE_ANIMATING_ELEMENT', payload: elementName });
    }, []),

    clearAnimatingElements: useCallback(() => {
      dispatch({ type: 'CLEAR_ANIMATING_ELEMENTS' });
    }, []),

    setIsUndoing: useCallback((isUndoing: boolean) => {
      dispatch({ type: 'SET_IS_UNDOING', payload: isUndoing });
    }, []),

    setLastCombination: useCallback((combination: LastCombination | null) => {
      dispatch({ type: 'SET_LAST_COMBINATION', payload: combination });
    }, []),

    setUndoAvailable: useCallback((available: boolean) => {
      dispatch({ type: 'SET_UNDO_AVAILABLE', payload: available });
    }, []),

    incrementTotalCombinations: useCallback(() => {
      dispatch({ type: 'INCREMENT_TOTAL_COMBINATIONS' });
    }, []),

    setStateRestored: useCallback((restored: boolean) => {
      dispatch({ type: 'SET_STATE_RESTORED', payload: restored });
    }, []),

    loadSavedState: useCallback((savedState: Partial<GameState>) => {
      dispatch({ type: 'LOAD_SAVED_STATE', payload: savedState });
    }, []),

    resetGameState: useCallback((gameMode: 'science' | 'creative') => {
      dispatch({ type: 'RESET_GAME_STATE', payload: { gameMode } });
    }, []),
  };

  return {
    state,
    dispatch,
    actions,
  };
}
