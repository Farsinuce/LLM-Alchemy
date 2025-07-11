'use client';

import { useSupabase } from '@/components/auth/SupabaseProvider';
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
  const { user, loading } = useSupabase();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  return <LLMAlchemy />;
}
