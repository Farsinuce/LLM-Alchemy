'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useGameState, GameState, GameAction, MixingElement, LastCombination } from '../hooks/useGameState';
import { Element, Achievement } from '@/types/game.types';

// Context type definition
interface GameStateContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  actions: {
    setGameMode: (mode: 'science' | 'creative') => void;
    setElements: (elements: Element[]) => void;
    addElement: (element: Element) => void;
    setEndElements: (endElements: Element[]) => void;
    addEndElement: (element: Element) => void;
    setCombinations: (combinations: Record<string, string | null>) => void;
    addCombination: (key: string, result: string | null) => void;
    setMixingArea: (mixingArea: MixingElement[]) => void;
    addToMixingArea: (element: MixingElement) => void;
    removeFromMixingArea: (indices: number[]) => void;
    updateMixingElement: (index: number, updates: Partial<MixingElement>) => void;
    clearMixingArea: () => void;
    setAchievements: (achievements: Achievement[]) => void;
    addAchievements: (achievements: Achievement[]) => void;
    setFailedCombinations: (failedCombinations: string[]) => void;
    addFailedCombination: (combination: string) => void;
    setDimmedElements: (dimmedElements: Set<string>) => void;
    addDimmedElement: (elementName: string) => void;
    removeDimmedElement: (elementName: string) => void;
    clearDimmedElements: () => void;
    setAnimatingElements: (animatingElements: Set<string>) => void;
    addAnimatingElement: (elementName: string) => void;
    removeAnimatingElement: (elementName: string) => void;
    clearAnimatingElements: () => void;
    setIsUndoing: (isUndoing: boolean) => void;
    setLastCombination: (combination: LastCombination | null) => void;
    setUndoAvailable: (available: boolean) => void;
    incrementTotalCombinations: () => void;
    setStateRestored: (restored: boolean) => void;
    loadSavedState: (savedState: Partial<GameState>) => void;
    resetGameState: (gameMode: 'science' | 'creative') => void;
  };
}

// Create the context
const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

// Provider component props
interface GameStateProviderProps {
  children: ReactNode;
  initialGameMode?: 'science' | 'creative';
}

// Provider component
export function GameStateProvider({ children, initialGameMode = 'science' }: GameStateProviderProps) {
  const gameState = useGameState(initialGameMode);

  return (
    <GameStateContext.Provider value={gameState}>
      {children}
    </GameStateContext.Provider>
  );
}

// Custom hook to use the game state context
export function useGameStateContext(): GameStateContextType {
  const context = useContext(GameStateContext);
  
  if (context === undefined) {
    throw new Error('useGameStateContext must be used within a GameStateProvider');
  }
  
  return context;
}

// Convenience hooks for specific parts of the state
export function useGameMode() {
  const { state, actions } = useGameStateContext();
  return {
    gameMode: state.gameMode,
    setGameMode: actions.setGameMode,
  };
}

export function useElements() {
  const { state, actions } = useGameStateContext();
  return {
    elements: state.elements,
    endElements: state.endElements,
    setElements: actions.setElements,
    addElement: actions.addElement,
    setEndElements: actions.setEndElements,
    addEndElement: actions.addEndElement,
  };
}

export function useMixingArea() {
  const { state, actions } = useGameStateContext();
  return {
    mixingArea: state.mixingArea,
    setMixingArea: actions.setMixingArea,
    addToMixingArea: actions.addToMixingArea,
    removeFromMixingArea: actions.removeFromMixingArea,
    updateMixingElement: actions.updateMixingElement,
    clearMixingArea: actions.clearMixingArea,
  };
}

export function useCombinations() {
  const { state, actions } = useGameStateContext();
  return {
    combinations: state.combinations,
    failedCombinations: state.failedCombinations,
    setCombinations: actions.setCombinations,
    addCombination: actions.addCombination,
    setFailedCombinations: actions.setFailedCombinations,
    addFailedCombination: actions.addFailedCombination,
  };
}

export function useAchievements() {
  const { state, actions } = useGameStateContext();
  return {
    achievements: state.achievements,
    setAchievements: actions.setAchievements,
    addAchievements: actions.addAchievements,
  };
}

export function useGameUndo() {
  const { state, actions } = useGameStateContext();
  return {
    lastCombination: state.lastCombination,
    undoAvailable: state.undoAvailable,
    setLastCombination: actions.setLastCombination,
    setUndoAvailable: actions.setUndoAvailable,
  };
}

export function useGameStats() {
  const { state, actions } = useGameStateContext();
  return {
    totalCombinationsMade: state.totalCombinationsMade,
    isStateRestored: state.isStateRestored,
    incrementTotalCombinations: actions.incrementTotalCombinations,
    setStateRestored: actions.setStateRestored,
  };
}

export function useGamePersistence() {
  const { actions } = useGameStateContext();
  return {
    loadSavedState: actions.loadSavedState,
    resetGameState: actions.resetGameState,
  };
}

export function useElementInteractionState() {
  const { state, actions } = useGameStateContext();
  return {
    dimmedElements: state.dimmedElements,
    animatingElements: state.animatingElements,
    isUndoing: state.isUndoing,
    setDimmedElements: actions.setDimmedElements,
    addDimmedElement: actions.addDimmedElement,
    removeDimmedElement: actions.removeDimmedElement,
    clearDimmedElements: actions.clearDimmedElements,
    setAnimatingElements: actions.setAnimatingElements,
    addAnimatingElement: actions.addAnimatingElement,
    removeAnimatingElement: actions.removeAnimatingElement,
    clearAnimatingElements: actions.clearAnimatingElements,
    setIsUndoing: actions.setIsUndoing,
  };
}
