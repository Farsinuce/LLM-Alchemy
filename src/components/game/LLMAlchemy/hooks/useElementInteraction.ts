import { useCallback, useRef } from 'react';
import { useMixingArea } from '../contexts/GameStateProvider';
import { Element, MixingElement } from './useGameState';
import * as GameLogic from '@/lib/game-logic';

interface UseElementInteractionProps {
  onMixElements: (elem1: MixingElement, elem2: MixingElement) => Promise<void>;
  onShowToast: (message: string) => void;
  onPlaySound: (type: string) => void;
  dropZoneRef: React.RefObject<HTMLDivElement | null>;
}

export function useElementInteraction({
  onMixElements,
  onShowToast,
  onPlaySound,
  dropZoneRef
}: UseElementInteractionProps) {
  const { mixingArea, addToMixingArea, updateMixingElement } = useMixingArea();
  const draggedElementRef = useRef<MixingElement | null>(null);
  const isDraggingRef = useRef(false);

  // Handle drag start for elements in mixing area
  const handleDragStart = useCallback((element: MixingElement, event: React.DragEvent | React.PointerEvent) => {
    draggedElementRef.current = element;
    isDraggingRef.current = true;
    onPlaySound('pick');
    
    // Haptic feedback for touch devices
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    if ('dataTransfer' in event) {
      // Desktop drag and drop
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', element.id);
    }
  }, [onPlaySound]);

  // Handle drag over for mixing area
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop in mixing area
  const handleDrop = useCallback((event: React.DragEvent | React.TouchEvent) => {
    event.preventDefault();
    
    if (!draggedElementRef.current || !dropZoneRef.current) return;
    
    const rect = dropZoneRef.current.getBoundingClientRect();
    let clientX: number, clientY: number;
    
    if ('clientX' in event) {
      // Mouse/drag event
      clientX = event.clientX;
      clientY = event.clientY;
    } else if ('touches' in event) {
      // Touch event
      const touch = event.touches?.[0] || event.changedTouches?.[0];
      if (!touch) return;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      return;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Resolve collisions with other elements
    const newPosition = GameLogic.resolveCollisions(
      x, 
      y, 
      mixingArea, 
      dropZoneRef.current, 
      draggedElementRef.current.index
    );
    
    // Update element position
    updateMixingElement(draggedElementRef.current.index, {
      x: newPosition.x,
      y: newPosition.y
    });
    
    // Check for collisions with other elements after drop
    checkForMixing(draggedElementRef.current.index, newPosition.x, newPosition.y);
    
    draggedElementRef.current = null;
    isDraggingRef.current = false;
  }, [mixingArea, updateMixingElement, dropZoneRef]);

  // Check for element mixing after position update
  const checkForMixing = useCallback((movedIndex: number, x: number, y: number) => {
    const movedElement = mixingArea.find(el => el.index === movedIndex);
    if (!movedElement) return;
    
    // Check collision with other elements
    for (const otherElement of mixingArea) {
      if (otherElement.index === movedIndex) continue;
      
      if (GameLogic.checkCollision(x, y, otherElement.x, otherElement.y)) {
        // Found a collision - trigger mixing
        onMixElements(movedElement, otherElement);
        return;
      }
    }
  }, [mixingArea, onMixElements]);

  // Handle element drag from element panel to mixing area
  const handleElementDrop = useCallback((element: Element, clientX: number, clientY: number) => {
    if (!dropZoneRef.current) return;
    
    // Prevent dropping end elements
    if (element.isEndElement) {
      onShowToast('End elements cannot be mixed');
      return;
    }
    
    const rect = dropZoneRef.current.getBoundingClientRect();
    const x = clientX - rect.left - GameLogic.getElementSize() / 2;
    const y = clientY - rect.top - GameLogic.getElementSize() / 2;
    
    // Resolve position to avoid collisions
    const newPosition = GameLogic.resolveCollisions(x, y, mixingArea, dropZoneRef.current);
    
    // Create mixing element
    const mixingElement: MixingElement = {
      ...element,
      x: newPosition.x,
      y: newPosition.y,
      index: Date.now() + Math.random(), // Unique index
      energized: false
    };
    
    addToMixingArea(mixingElement);
    onPlaySound('drop');
    
    // Check for immediate mixing
    setTimeout(() => {
      checkForMixing(mixingElement.index, newPosition.x, newPosition.y);
    }, 100);
  }, [mixingArea, addToMixingArea, onPlaySound, onShowToast, dropZoneRef, checkForMixing]);

  // Handle double click for quick mixing
  const handleElementDoubleClick = useCallback((element: Element) => {
    if (element.isEndElement) {
      onShowToast('End elements cannot be mixed');
      return;
    }
    
    // Find the center of the mixing area
    if (!dropZoneRef.current) return;
    
    const rect = dropZoneRef.current.getBoundingClientRect();
    const centerX = rect.width / 2 - GameLogic.getElementSize() / 2;
    const centerY = rect.height / 2 - GameLogic.getElementSize() / 2;
    
    // Resolve position
    const newPosition = GameLogic.resolveCollisions(centerX, centerY, mixingArea, dropZoneRef.current);
    
    // Create mixing element
    const mixingElement: MixingElement = {
      ...element,
      x: newPosition.x,
      y: newPosition.y,
      index: Date.now() + Math.random(),
      energized: false
    };
    
    addToMixingArea(mixingElement);
    onPlaySound('drop');
  }, [mixingArea, addToMixingArea, onPlaySound, onShowToast, dropZoneRef]);

  // Touch handling for mobile devices
  const handleTouchStart = useCallback((element: MixingElement, event: React.TouchEvent) => {
    event.preventDefault();
    handleDragStart(element, event as unknown as React.PointerEvent);
  }, [handleDragStart]);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    if (!isDraggingRef.current || !draggedElementRef.current || !dropZoneRef.current) return;
    
    const touch = event.touches[0];
    const rect = dropZoneRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left - GameLogic.getElementSize() / 2;
    const y = touch.clientY - rect.top - GameLogic.getElementSize() / 2;
    
    // Update position during drag
    updateMixingElement(draggedElementRef.current.index, { x, y });
  }, [updateMixingElement, dropZoneRef]);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    if (!isDraggingRef.current || !draggedElementRef.current) return;
    
    handleDrop(event);
  }, [handleDrop]);

  // Keyboard accessibility
  const handleKeyDown = useCallback((element: Element, event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleElementDoubleClick(element);
    }
  }, [handleElementDoubleClick]);

  // Clear dragging state (useful for cleanup)
  const clearDragState = useCallback(() => {
    draggedElementRef.current = null;
    isDraggingRef.current = false;
  }, []);

  // Get drag state
  const isDragging = useCallback(() => isDraggingRef.current, []);
  const getDraggedElement = useCallback(() => draggedElementRef.current, []);

  return {
    // Drag and drop handlers
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleElementDrop,
    
    // Touch handlers
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    
    // Interaction handlers
    handleElementDoubleClick,
    handleKeyDown,
    
    // State management
    clearDragState,
    isDragging,
    getDraggedElement,
    
    // Mixing check
    checkForMixing
  };
}
