'use client';

import { useRef, useEffect, useCallback } from 'react';

// Type for window.webkitAudioContext
interface WindowWithWebkit extends Window {
  webkitAudioContext?: typeof AudioContext;
}

export type SoundType = 'plop' | 'pop' | 'reward' | 'end-element' | 'press' | 'click' | 'reverse-pop';

/**
 * Hook for managing Web Audio API sound effects
 * Uses oscillator-based sounds for game interactions
 */
export const useGameAudio = () => {
  const audioContext = useRef<AudioContext | null>(null);

  // Initialize Web Audio API
  useEffect(() => {
    audioContext.current = new (window.AudioContext || (window as WindowWithWebkit).webkitAudioContext!)();
  }, []);

  const playSound = useCallback((type: SoundType) => {
    if (!audioContext.current) return;
    
    const osc = audioContext.current.createOscillator();
    const gainNode = audioContext.current.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioContext.current.destination);
    
    const now = audioContext.current.currentTime;
    
    switch(type) {
      case 'plop':
        // Element dropped into mixing area
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
        
      case 'pop':
        // Element interaction or mixing success
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
        
      case 'reward':
        // Achievement or milestone reached
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
        
      case 'end-element':
        // Discovery of an end element (science mode)
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.15);
        osc.frequency.setValueAtTime(659.25, now + 0.3);
        gainNode.gain.setValueAtTime(0.35, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
        
      case 'press':
        // Element pressed down (drag start)
        osc.frequency.setValueAtTime(200, now);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
        
      case 'click':
        // Button clicks and UI interactions
        osc.frequency.setValueAtTime(1000, now);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
        break;
        
      case 'reverse-pop':
        // Undo operation
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
    }
  }, []);

  return {
    playSound
  };
};
