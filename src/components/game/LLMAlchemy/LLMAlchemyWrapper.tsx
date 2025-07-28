'use client';

import React from 'react';
import { GameStateProvider } from './contexts/GameStateProvider';
import LLMAlchemyRefactored from './LLMAlchemyRefactored';

interface LLMAlchemyWrapperProps {
  initialGameMode?: 'science' | 'creative';
}

const LLMAlchemyWrapper: React.FC<LLMAlchemyWrapperProps> = ({ 
  initialGameMode = 'science' 
}) => {
  console.log('[LLM_ALCHEMY_WRAPPER] 🔬 Using refactored version with new state management');
  
  return (
    <GameStateProvider initialGameMode={initialGameMode}>
      <LLMAlchemyRefactored />
    </GameStateProvider>
  );
};

export default LLMAlchemyWrapper;
