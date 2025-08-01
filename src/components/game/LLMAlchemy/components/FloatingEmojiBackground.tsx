'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Element } from '@/types/game.types';

interface FloatingEmojiBackgroundProps {
  elements: Element[];
  gameMode: 'science' | 'creative';
}

interface FloatingEmoji {
  id: number;
  emoji: string;
  duration: number;
  delay: number;
  startX: number;
  endX: number;
  startY: number;
  endY: number;
}

const FloatingEmojiBackground: React.FC<FloatingEmojiBackgroundProps> = ({ elements, gameMode }) => {
  const [activeEmojis, setActiveEmojis] = useState<FloatingEmoji[]>([]);
  const emojiIdRef = useRef<number>(0);
  const spawnIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate a new floating emoji
  const createFloatingEmoji = (): FloatingEmoji => {
    const randomElement = elements[Math.floor(Math.random() * elements.length)];
    
    return {
      id: emojiIdRef.current++,
      emoji: randomElement.emoji,
      duration: 20000 + Math.random() * 15000, // 20-35 seconds
      delay: 0,
      startX: Math.random() * 100, // Start position as percentage
      endX: Math.random() * 100,   // End position as percentage
      startY: Math.random() * 100,
      endY: Math.random() * 100,
    };
  };

  // Handle emoji animation completion
  const handleAnimationEnd = (emojiId: number) => {
    setActiveEmojis(prev => prev.filter(emoji => emoji.id !== emojiId));
  };

  // Spawn new emojis periodically
  useEffect(() => {
    if (elements.length < 5) {
      // Clear any existing emojis and interval if not enough elements
      setActiveEmojis([]);
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current);
        spawnIntervalRef.current = null;
      }
      return;
    }

    // Initial spawn of 1-2 emojis
    if (activeEmojis.length === 0) {
      const initialCount = 1 + Math.floor(Math.random() * 2);
      const initialEmojis = Array.from({ length: initialCount }, createFloatingEmoji);
      setActiveEmojis(initialEmojis);
    }

    // Set up spawning interval
    if (!spawnIntervalRef.current) {
      spawnIntervalRef.current = setInterval(() => {
        setActiveEmojis(prev => {
          // Only spawn if we have less than 3 emojis and random chance
          if (prev.length < 3 && Math.random() < 0.4) {
            return [...prev, createFloatingEmoji()];
          }
          return prev;
        });
      }, 2000); // Check every 2 seconds
    }

    return () => {
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current);
        spawnIntervalRef.current = null;
      }
    };
  }, [elements.length, activeEmojis.length]);

  // Clear all emojis when game mode changes
  useEffect(() => {
    setActiveEmojis([]);
    emojiIdRef.current = 0;
  }, [gameMode]);

  if (elements.length < 5) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {activeEmojis.map((emoji) => (
        <div
          key={emoji.id}
          className="absolute text-4xl opacity-[0.03]"
          style={{
            left: `${emoji.startX}%`,
            top: `${emoji.startY}%`,
            transform: 'translate(-50%, -50%) scale(10)',
            animation: `floatingEmoji ${emoji.duration}ms linear forwards`,
            '--end-x': `${emoji.endX}%`,
            '--end-y': `${emoji.endY}%`,
          } as React.CSSProperties & { '--end-x': string; '--end-y': string }}
          onAnimationEnd={() => handleAnimationEnd(emoji.id)}
        >
          {emoji.emoji}
        </div>
      ))}
      
      <style jsx>{`
        @keyframes floatingEmoji {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(10);
          }
          10% {
            opacity: 0.03;
          }
          90% {
            opacity: 0.03;
            left: var(--end-x);
            top: var(--end-y);
            transform: translate(-50%, -50%) scale(10);
          }
          100% {
            opacity: 0;
            left: var(--end-x);
            top: var(--end-y);
            transform: translate(-50%, -50%) scale(10);
          }
        }
      `}</style>
    </div>
  );
};

export default FloatingEmojiBackground;
