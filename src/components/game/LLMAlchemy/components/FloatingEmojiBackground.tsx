'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Element } from '@/types/game.types';
import { OpenMojiDisplay } from '@/components/game/OpenMojiDisplay';

interface FloatingEmojiBackgroundProps {
  elements: Element[];
  gameMode: 'science' | 'creative';
}

interface FloatingEmoji {
  id: number;
  element: Element;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
}

const FloatingEmojiBackground: React.FC<FloatingEmojiBackgroundProps> = ({ elements, gameMode }) => {
  const [activeEmojis, setActiveEmojis] = useState<FloatingEmoji[]>([]);
  const emojiIdRef = useRef<number>(0);
  const spawnIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate a new floating emoji with constant travel distance
  const createFloatingEmoji = (): FloatingEmoji => {
    const randomElement = elements[Math.floor(Math.random() * elements.length)];
    
    // Start from a random edge
    const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
    let startX: number, startY: number;
    
    switch (edge) {
      case 0: // top edge
        startX = Math.random() * 100;
        startY = -10;
        break;
      case 1: // right edge
        startX = 110;
        startY = Math.random() * 100;
        break;
      case 2: // bottom edge
        startX = Math.random() * 100;
        startY = 110;
        break;
      default: // left edge
        startX = -10;
        startY = Math.random() * 100;
        break;
    }
    
    // Generate random direction toward/through center
    const centerX = 50 + (Math.random() - 0.5) * 60; // Center area with some spread
    const centerY = 50 + (Math.random() - 0.5) * 60;
    
    // Calculate direction vector
    const dirX = centerX - startX;
    const dirY = centerY - startY;
    
    // Normalize and scale to fixed distance (2 viewport units)
    const length = Math.sqrt(dirX * dirX + dirY * dirY);
    const fixedDistance = 20;
    const deltaX = (dirX / length) * fixedDistance;
    const deltaY = (dirY / length) * fixedDistance;
    
    return {
      id: emojiIdRef.current++,
      element: randomElement,
      startX,
      startY,
      deltaX,
      deltaY,
    };
  };

  // Handle emoji animation completion
  const handleAnimationEnd = (emojiId: number) => {
    setActiveEmojis(prev => prev.filter(emoji => emoji.id !== emojiId));
  };

  // Spawn new emojis periodically
  useEffect(() => {
    if (elements.length < 5) {
      setActiveEmojis([]);
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current);
        spawnIntervalRef.current = null;
      }
      return;
    }

    // Initial spawn
    if (activeEmojis.length === 0) {
      const initialEmojis = Array.from({ length: 2 }, createFloatingEmoji);
      setActiveEmojis(initialEmojis);
    }

    // Set up spawning interval
    if (!spawnIntervalRef.current) {
      spawnIntervalRef.current = setInterval(() => {
        setActiveEmojis(prev => {
          if (prev.length < 3 && Math.random() < 0.5) {
            return [...prev, createFloatingEmoji()];
          }
          return prev;
        });
      }, 3000);
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
          className="absolute opacity-[0.01]"
          style={{
            left: `${emoji.startX}%`,
            top: `${emoji.startY}%`,
            transform: 'translate(-50%, -50%) scale(15)',
            animation: 'floatAcross 10s linear forwards',
            '--dx': `${emoji.deltaX}vw`,
            '--dy': `${emoji.deltaY}vh`,
          } as React.CSSProperties & { '--dx': string; '--dy': string }}
          onAnimationEnd={() => handleAnimationEnd(emoji.id)}
        >
          <OpenMojiDisplay 
            emoji={emoji.element.emoji} 
            hexcode={emoji.element.openmojiHex}
            name={emoji.element.name} 
            size="lg"
          />
        </div>
      ))}
      
      <style jsx>{`
        @keyframes floatAcross {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(15);
          }
          10% {
            opacity: 0.02;
          }
          90% {
            opacity: 0.02;
            transform: translate3d(var(--dx), var(--dy), 0) translate(-50%, -50%) scale(15);
          }
          100% {
            opacity: 0;
            transform: translate3d(calc(var(--dx) * 1.2), calc(var(--dy) * 1.2), 0) translate(-50%, -50%) scale(15);
          }
        }
      `}</style>
    </div>
  );
};

export default FloatingEmojiBackground;
