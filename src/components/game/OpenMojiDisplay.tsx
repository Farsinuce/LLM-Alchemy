import React, { memo, useState } from 'react';
import { unicodeToHexSequence } from '@/lib/openmoji-service';

interface OpenMojiDisplayProps {
  emoji: string;           // Unicode emoji
  hexcode?: string;        // Pre-resolved hexcode (for PUA emojis)
  name: string;           // Alt text
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Displays an OpenMoji SVG
 * Memoized to prevent unnecessary re-renders
 * UPDATED: Uses React state for fallback instead of insertAdjacentHTML
 */
export const OpenMojiDisplay = memo<OpenMojiDisplayProps>(({ 
  emoji, 
  hexcode,
  name,
  size = 'md',
  className = '' 
}) => {
  const [fallbackToUnicode, setFallbackToUnicode] = useState(false);
  
  // Guard against undefined/null values
  const safeEmoji = emoji || '❓';
  const safeName = name || 'Unknown Element';
  
  const sizeClasses = {
    sm: 'w-6 h-6',     // 24px - for UI elements
    md: 'w-8 h-8',     // 32px - default game size
    lg: 'w-12 h-12'    // 48px - for showcases
  };
  
  // Use provided hexcode or convert from Unicode (with safe fallback)
  const finalHexcode = hexcode || unicodeToHexSequence(safeEmoji);
  
  // If fallback is triggered, render Unicode emoji
  if (fallbackToUnicode) {
    return (
      <span className={`${sizeClasses[size]} flex items-center justify-center text-2xl ${className}`}>
        {safeEmoji}
      </span>
    );
  }
  
  return (
    <img 
      src={`/openmoji/${finalHexcode}.svg`}
      alt={safeName}
      className={`${sizeClasses[size]} ${className} select-none`}
      loading="lazy"
      draggable={false}
      onError={() => {
        console.warn(`Failed to load OpenMoji SVG: ${finalHexcode}`);
        setFallbackToUnicode(true);
      }}
    />
  );
});

OpenMojiDisplay.displayName = 'OpenMojiDisplay';
