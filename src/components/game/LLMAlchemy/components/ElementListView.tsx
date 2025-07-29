'use client';

import React, { useRef } from 'react';
import { GameElement } from '@/types/game.types';
import { OpenMojiDisplay } from '@/components/game/OpenMojiDisplay';
import { getContrastColor, getRarityHoverColor, getElementSizeClasses, isTouchDevice } from '@/lib/ui-utils';

interface ElementListViewProps {
  elements: GameElement[];
  searchTerm: string;
  sortMode: string;
  shakeElement: string | null;
  popElement: string | null;
  hoveredElement: string | null;
  isDragging: boolean;
  dimmedElements: Set<string>;
  isPlayingLoadAnimation: boolean;
  animatedElements: Set<string>;
  onElementDragStart: (e: React.DragEvent<HTMLDivElement>, element: GameElement) => void;
  onElementTouchStart: (e: React.TouchEvent<HTMLDivElement>, element: GameElement) => void;
  onElementClick: (element: GameElement, event: React.MouseEvent) => void;
  onElementMouseEnter: (element: GameElement, event: React.MouseEvent) => void;
  onElementMouseLeave: () => void;
}

export const ElementListView: React.FC<ElementListViewProps> = ({
  elements,
  searchTerm,
  sortMode,
  shakeElement,
  popElement,
  hoveredElement,
  isDragging,
  dimmedElements,
  isPlayingLoadAnimation,
  animatedElements,
  onElementDragStart,
  onElementTouchStart,
  onElementClick,
  onElementMouseEnter,
  onElementMouseLeave
}) => {
  const isTouch = isTouchDevice();
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle mouse enter with 500ms delay for reasoning popup
  const handleElementMouseEnter = (element: GameElement, event: React.MouseEvent) => {
    // Show popup on hover for desktop with 500ms delay
    if (!isTouch && element.reasoning) {
      // Clear any existing timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      // Capture the bounding rect immediately
      const rect = event.currentTarget.getBoundingClientRect();
      // Set 500ms delay
      hoverTimeoutRef.current = setTimeout(() => {
        // Create a synthetic event with the captured rect
        const syntheticEvent = {
          ...event,
          currentTarget: {
            getBoundingClientRect: () => rect
          },
          type: 'mouseenter'
        };
        onElementMouseEnter(element, syntheticEvent as React.MouseEvent);
      }, 500);
    }
  };

  // Handle mouse leave - clear timeout and call parent handler
  const handleElementMouseLeave = () => {
    // Clear timeout if leaving before 500ms
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // Call parent handler
    onElementMouseLeave();
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Sort elements based on sortMode
  const sortedElements = React.useMemo(() => {
    const filtered = elements.filter(element =>
      element.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortMode === 'alpha') {
      return filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // Sort by discovery order (unlockOrder ascending)
      return filtered.sort((a, b) => (a.unlockOrder || 0) - (b.unlockOrder || 0));
    }
  }, [elements, searchTerm, sortMode]);

  return (
    <div className="flex-1 overflow-y-auto p-4 scrollbar-mobile">
      {/* Use flex-wrap layout for natural responsiveness */}
      <div className="flex flex-wrap gap-2">
        {sortedElements.map((element) => (
          <div
            key={element.id}
            draggable={!isTouch}
            onDragStart={(e) => onElementDragStart(e, element)}
            onTouchStart={(e) => onElementTouchStart(e, element)}
            onMouseEnter={(e) => onElementMouseEnter(element, e)}
            onMouseLeave={onElementMouseLeave}
            onClick={(e) => onElementClick(element, e)}
            onContextMenu={(e) => e.preventDefault()}
            className={`
              ${getElementSizeClasses()} flex flex-col items-center justify-center rounded-lg cursor-move 
              hover:scale-110 transition-transform select-none
              ${popElement === element.id ? 'animate-element-pop-in' : ''}
              ${shakeElement === element.id ? 'animate-element-shake' : ''}
              ${isPlayingLoadAnimation && animatedElements.has(element.id) ? 'animate-element-load-delayed' : ''}
              ${dimmedElements.has(element.name) ? 'element-dimmed' : ''}
            `}
            style={{ 
              backgroundColor: element.color,
              color: getContrastColor(element.color),
              boxShadow: !isDragging && hoveredElement === element.id ? `0 0 0 2px ${getRarityHoverColor(element.rarity)}` : '',
              touchAction: 'none',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              animationDelay: isPlayingLoadAnimation && animatedElements.has(element.id) 
                ? `${(element.unlockOrder || 0) * 25}ms` 
                : undefined
            }}
          >
            {/* Question mark badge for elements with reasoning */}
            {element.reasoning && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold text-black">
                ?
              </div>
            )}
            
            <OpenMojiDisplay 
              emoji={element.emoji} 
              hexcode={element.openmojiHex}
              name={element.name} 
              size="md" 
            />
            <div className="text-[8px] sm:text-[10px] font-medium px-1 text-center leading-tight">
              {element.name}
            </div>
          </div>
        ))}
      </div>

      {sortedElements.length === 0 && searchTerm && (
        <div className="text-center text-gray-400 py-8">
          <p>No elements found matching &quot;{searchTerm}&quot;</p>
          <p className="text-sm mt-2">Try a different search term</p>
        </div>
      )}

      {elements.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          <p>No elements discovered yet!</p>
          <p className="text-sm mt-2">Start mixing to discover new elements</p>
        </div>
      )}
    </div>
  );
};
