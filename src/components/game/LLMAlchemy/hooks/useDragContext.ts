import { useCallback, useRef, useState } from 'react';
import { MixingElement } from './useGameState';

interface DragState {
  element: MixingElement | null;
  isDragging: boolean;
  isTouch: boolean;
  fromMixingArea: boolean;
  startTime: number | null;
  startPosition: { x: number; y: number } | null;
  offset: { x: number; y: number };
}

const initialDragState: DragState = {
  element: null,
  isDragging: false,
  isTouch: false,
  fromMixingArea: false,
  startTime: null,
  startPosition: null,
  offset: { x: 0, y: 0 }
};

export function useDragContext() {
  const [dragState, setDragState] = useState<DragState>(initialDragState);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Start drag operation
  const startDrag = useCallback((
    element: MixingElement,
    isTouch: boolean = false,
    fromMixingArea: boolean = false,
    offset: { x: number; y: number } = { x: 0, y: 0 },
    startPosition?: { x: number; y: number }
  ) => {
    // Clear any existing cleanup timeout
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }

    setDragState({
      element,
      isDragging: true,
      isTouch,
      fromMixingArea,
      startTime: Date.now(),
      startPosition: startPosition || null,
      offset
    });
  }, []);

  // Update drag position (for touch dragging)
  const updateDragPosition = useCallback((position: { x: number; y: number }) => {
    setDragState(prev => prev.isDragging ? {
      ...prev,
      startPosition: position
    } : prev);
  }, []);

  // End drag operation
  const endDrag = useCallback(() => {
    setDragState(initialDragState);
    
    // Clear cleanup timeout since we're ending normally
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }
  }, []);

  // Force cleanup with timeout (prevents stuck drag states)
  const forceCleanup = useCallback((delay: number = 100) => {
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }
    
    cleanupTimeoutRef.current = setTimeout(() => {
      setDragState(initialDragState);
      cleanupTimeoutRef.current = null;
    }, delay);
  }, []);

  // Emergency cleanup (immediate)
  const emergencyCleanup = useCallback(() => {
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }
    setDragState(initialDragState);
  }, []);

  // Check if drag is a quick tap (for showing reasoning popup)
  const isQuickTap = useCallback(() => {
    if (!dragState.startTime || !dragState.startPosition) return false;
    
    const duration = Date.now() - dragState.startTime;
    return duration < 300;
  }, [dragState.startTime]);

  // Calculate movement distance
  const getMovementDistance = useCallback((currentPos: { x: number; y: number }) => {
    if (!dragState.startPosition) return 0;
    
    return Math.sqrt(
      Math.pow(currentPos.x - dragState.startPosition.x, 2) + 
      Math.pow(currentPos.y - dragState.startPosition.y, 2)
    );
  }, [dragState.startPosition]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }
  }, []);

  return {
    // State
    dragState,
    
    // Actions
    startDrag,
    updateDragPosition,
    endDrag,
    forceCleanup,
    emergencyCleanup,
    
    // Utilities
    isQuickTap,
    getMovementDistance,
    cleanup,
    
    // Computed values
    isDragging: dragState.isDragging,
    draggedElement: dragState.element,
    isTouch: dragState.isTouch,
    fromMixingArea: dragState.fromMixingArea,
    touchOffset: dragState.offset
  };
}
