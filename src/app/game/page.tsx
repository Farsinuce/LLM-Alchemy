'use client';

import { useSupabase } from '@/components/auth/SupabaseProvider';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with browser-only APIs
const LLMAlchemyWrapper = dynamic(() => import('@/components/game/LLMAlchemy/LLMAlchemyWrapper'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white text-xl">Loading game...</div>
    </div>
  )
});

export default function GamePage() {
  const { user, loading, signInAnonymously } = useSupabase();
  const [gameReady, setGameReady] = useState(false);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    const initializeGameUser = async () => {
      if (loading) return;

      if (!user) {
        // No user session - create anonymous user for the game
        setInitializing(true);
        try {
          await signInAnonymously();
          setGameReady(true);
        } catch (error) {
          console.error('Failed to create anonymous user for game:', error);
          // Still allow game to load, but without save functionality
          setGameReady(true);
        } finally {
          setInitializing(false);
        }
      } else {
        // User already exists
        setGameReady(true);
      }
    };

    initializeGameUser();
  }, [user, loading, signInAnonymously]);

  if (loading || initializing || !gameReady) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">
          {initializing ? 'Setting up your game session...' : 'Loading game...'}
        </div>
      </div>
    );
  }

  return <LLMAlchemyWrapper />;
}
