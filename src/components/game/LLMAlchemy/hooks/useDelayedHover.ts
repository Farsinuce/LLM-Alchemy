import { useRef, useCallback, useEffect } from 'react';
import { Element } from '@/types/game.types';
import { isTouchDevice } from '@/lib/ui-utils';

interface UseDelayedHoverProps {
  onHover: (element: Element, event: React.MouseEvent) => void;
  delay?: number;
}

interface UseDelayedHoverReturn {
  handleMouseEnter: (element: Element, event: React.MouseEvent) => void;
  handleMouseLeave: () => void;
}

/**
 * Unified hook for handling delayed hover effects with reasoning popups
 * Encapsulates the 500ms timer logic used by both ElementListView and MixingAreaView
 */
export function useDelayedHover({
  onHover,
  delay = 500
}: UseDelayedHoverProps): UseDelayedHoverReturn {
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTouch = isTouchDevice();

  const handleMouseEnter = useCallback((element: Element, event: React.MouseEvent) => {
    // Only show popup on hover for desktop with delay, and only if element has reasoning
    if (!isTouch && element.reasoning) {
      // Clear any existing timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      // Capture the bounding rect immediately
      const rect = event.currentTarget.getBoundingClientRect();

      // Set delay before showing popup
      hoverTimeoutRef.current = setTimeout(() => {
        // Create a synthetic event with the captured rect
        const syntheticEvent = {
          ...event,
          currentTarget: {
            getBoundingClientRect: () => rect
          },
          type: 'mouseenter'
        };
        onHover(element, syntheticEvent as React.MouseEvent);
      }, delay);
    }
  }, [onHover, delay, isTouch]);

  const handleMouseLeave = useCallback(() => {
    // Clear timeout if leaving before delay completes
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return {
    handleMouseEnter,
    handleMouseLeave
  };
}
