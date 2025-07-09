'use client';

import { useSession, signIn } from 'next-auth/react';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with browser-only APIs
const LLMAlchemy = dynamic(() => import('@/components/game/LLMAlchemy'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white text-xl">Loading game...</div>
    </div>
  )
});

export default function GamePage() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      // Create guest session automatically
      signIn('guest', { redirect: false });
    }
  }, [status]);

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  return <LLMAlchemy />;
}
