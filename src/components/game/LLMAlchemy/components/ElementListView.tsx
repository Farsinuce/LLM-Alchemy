'use client';

import React from 'react';
import { Element } from '@/types/game.types';
import { OpenMojiDisplay } from '@/components/game/OpenMojiDisplay';
import { getContrastColor, getRarityHoverColor, getElementSizeClasses, isTouchDevice } from '@/lib/ui-utils';
import { useDelayedHover } from '../hooks/useDelayedHover';

interface ElementListViewProps {
  elements: Element[];
  energyElement?: Element;
  gameMode: 'science' | 'creative';
  searchTerm: string;
  sortMode: string;
  shakeElement: string | null;
  popElement: string | null;
  hoveredElement: string | null;
  isDragging: boolean;
  dimmedElements: Set<string>;
  isPlayingLoadAnimation: boolean;
  animatedElements: Set<string>;
  onElementDragStart: (e: React.DragEvent<HTMLDivElement>, element: Element) => void;
  onElementDragEnd: () => void;
  onElementTouchStart: (e: React.TouchEvent<HTMLDivElement>, element: Element) => void;
  onElementClick: (element: Element, event: React.MouseEvent) => void;
  onElementMouseEnter: (element: Element, event: React.MouseEvent) => void;
  onElementMouseLeave: () => void;
}

export const ElementListView: React.FC<ElementListViewProps> = ({
  elements,
  energyElement,
  gameMode,
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
  // Use the unified delayed hover hook
  const { handleMouseEnter, handleMouseLeave } = useDelayedHover({
    onHover: onElementMouseEnter,
    delay: 500
  });

  // Combined mouse leave handler that calls both the unified hook and parent handler
  const handleElementMouseLeave = () => {
    handleMouseLeave(); // Clear timeout from unified hook
    onElementMouseLeave(); // Call parent handler
  };

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

  const renderElement = (element: Element) => (
    <div
      key={element.id}
      data-testid={`element-${element.name}`}
      draggable={!isTouchDevice()}
      onDragStart={(e) => onElementDragStart(e, element)}
      onTouchStart={(e) => onElementTouchStart(e, element)}
      onMouseEnter={(e) => handleMouseEnter(element, e)}
      onMouseLeave={handleElementMouseLeave}
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
  );

  return (
    <div data-testid="element-list" className="flex-1 overflow-y-auto p-4 scrollbar-mobile">
      {/* All Elements - Energy first with vertical separator if in Science mode */}
      <div className="flex flex-wrap gap-2 justify-start items-start max-w-full">
        {gameMode === 'science' && energyElement && (
          <>
            <div className="flex-shrink-0">
              {renderElement(energyElement)}
            </div>
            <div className="w-px h-12 sm:h-14 md:h-16 bg-gray-600 flex-shrink-0"></div>
          </>
        )}
        {sortedElements.map((element) => renderElement(element))}
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
