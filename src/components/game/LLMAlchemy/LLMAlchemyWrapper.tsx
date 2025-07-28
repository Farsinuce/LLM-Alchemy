'use client';

import React from 'react';
import { GameStateProvider } from './contexts/GameStateProvider';
import LLMAlchemy from '../LLMAlchemy';
import LLMAlchemyRefactored from './LLMAlchemyRefactored';

interface LLMAlchemyWrapperProps {
  initialGameMode?: 'science' | 'creative';
}

const LLMAlchemyWrapper: React.FC<LLMAlchemyWrapperProps> = ({ 
  initialGameMode = 'science' 
}) => {
  // Feature flag - can be controlled via environment variable or user preference
  const useRefactoredVersion = process.env.NEXT_PUBLIC_USE_REFACTORED_GAME === 'true';
  
  // Add debug logging
  console.log('[LLM_ALCHEMY_WRAPPER] Feature flag state:', {
    useRefactoredVersion,
    envVar: process.env.NEXT_PUBLIC_USE_REFACTORED_GAME,
    initialGameMode
  });

  if (useRefactoredVersion) {
    console.log('[LLM_ALCHEMY_WRAPPER] 🔬 Using refactored version with new state management');
    
    return (
      <GameStateProvider initialGameMode={initialGameMode}>
        <LLMAlchemyRefactored />
      </GameStateProvider>
    );
  }

  console.log('[LLM_ALCHEMY_WRAPPER] 🎮 Using original version (production stable)');
  
  return <LLMAlchemy />;
};

export default LLMAlchemyWrapper;
