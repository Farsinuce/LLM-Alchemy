'use client';

import { useState, useCallback, useRef } from 'react';
import { Element, MixingElement } from './useGameState';

/**
 * Hook for managing game animations and visual feedback
 * Handles shake, pop, removal, and load animations
 */
export const useGameAnimations = () => {
  // Animation state
  const [shakeElement, setShakeElement] = useState<string | null>(null);
  const [popElement, setPopElement] = useState<string | null>(null);
  const [animatingElements, setAnimatingElements] = useState<Set<string>>(new Set());
  const isPlayingLoadAnimation = useRef<boolean>(false);
  const [animatedElements, setAnimatedElements] = useState<Set<string>>(new Set());
  
  // Timeout tracking for cleanup
  const animationTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Clear existing timeout helper
  const clearExistingTimeout = useCallback((key: string) => {
    const existing = animationTimeouts.current.get(key);
    if (existing) {
      clearTimeout(existing);
      animationTimeouts.current.delete(key);
    }
  }, []);

  // Trigger shake animation on an element
  const triggerShake = useCallback((elementId: string) => {
    setShakeElement(elementId);
    
    // Clear any existing shake timeout for this element
    clearExistingTimeout(`shake-${elementId}`);
    
    // Set new timeout to clear shake
    const timeout = setTimeout(() => {
      setShakeElement(null);
    }, 500);
    
    animationTimeouts.current.set(`shake-${elementId}`, timeout);
  }, [clearExistingTimeout]);

  // Trigger pop animation on an element
  const triggerPop = useCallback((elementId: string) => {
    setPopElement(elementId);
    
    // Clear any existing pop timeout for this element
    clearExistingTimeout(`pop-${elementId}`);
    
    // Set new timeout to clear pop
    const timeout = setTimeout(() => {
      setPopElement(null);
    }, 300);
    
    animationTimeouts.current.set(`pop-${elementId}`, timeout);
  }, [clearExistingTimeout]);

  // Animate removal of elements from mixing area with improved clear animation
  const animateRemoval = useCallback((elements: MixingElement[], onComplete: () => void) => {
    if (elements.length === 0) {
      onComplete();
      return;
    }
    
    // Apply the new clear animation directly to DOM elements
    elements.forEach((el, index) => {
      const timeout = setTimeout(() => {
        const domElement = document.getElementById(`mixing-${el.id}-${el.index}`);
        if (domElement) {
          domElement.classList.add('animate-clear-zoom-fade');
        }
        setAnimatingElements(prev => new Set(prev).add(`${el.id}-${el.index}`));
      }, index * 50);
      
      animationTimeouts.current.set(`removal-${el.id}-${el.index}`, timeout);
    });
    
    // Complete the animation and call onComplete (400ms for new animation + stagger)
    const totalDuration = elements.length * 50 + 400;
    const completeTimeout = setTimeout(() => {
      onComplete();
      setAnimatingElements(new Set());
    }, totalDuration);
    
    animationTimeouts.current.set('removal-complete', completeTimeout);
  }, []);

  // Play element load animation (for loading saved game state)
  const playElementLoadAnimation = useCallback((elementsToAnimate: Element[]) => {
    const elementsToAnimate_filtered = elementsToAnimate.filter(e => e.unlockOrder > 4);
    if (elementsToAnimate_filtered.length === 0 || isPlayingLoadAnimation.current) return;
    
    console.log('[LOAD_ANIMATION] Starting element load animation for', elementsToAnimate_filtered.length, 'elements');
    isPlayingLoadAnimation.current = true;
    
    // Sort elements by unlock order for proper animation sequence
    const sortedElements = [...elementsToAnimate_filtered].sort((a, b) => a.unlockOrder - b.unlockOrder);
    setAnimatedElements(new Set(sortedElements.map(e => e.id)));
    
    // Calculate total animation duration
    const totalDuration = (sortedElements.length * 25) + 300 + 200;
    
    // Clear existing load animation timeout
    clearExistingTimeout('load-animation');
    
    // Set timeout to complete load animation
    const timeout = setTimeout(() => {
      isPlayingLoadAnimation.current = false;
      setAnimatedElements(new Set());
    }, totalDuration);
    
    animationTimeouts.current.set('load-animation', timeout);
  }, [clearExistingTimeout]);

  // Clear all animations (useful for cleanup or mode switching)
  const clearAllAnimations = useCallback(() => {
    setShakeElement(null);
    setPopElement(null);
    setAnimatingElements(new Set());
    isPlayingLoadAnimation.current = false;
    setAnimatedElements(new Set());
    
    // Clear all timeouts
    animationTimeouts.current.forEach(timeout => clearTimeout(timeout));
    animationTimeouts.current.clear();
  }, []);

  // Check if an element is currently being animated
  const isElementAnimated = useCallback((elementId: string) => {
    return animatedElements.has(elementId);
  }, [animatedElements]);

  // Check if an element is in removal animation
  const isElementRemoving = useCallback((elementId: string, elementIndex?: number) => {
    const key = elementIndex !== undefined ? `${elementId}-${elementIndex}` : elementId;
    return animatingElements.has(key);
  }, [animatingElements]);

  return {
    // State
    shakeElement,
    popElement,
    animatingElements,
    isPlayingLoadAnimation: isPlayingLoadAnimation.current,
    animatedElements,
    
    // Actions
    triggerShake,
    triggerPop,
    animateRemoval,
    playElementLoadAnimation,
    clearAllAnimations,
    
    // Helpers
    isElementAnimated,
    isElementRemoving
  };
};
