'use client';

import React from 'react';
import { GameElement } from '@/types/game.types';
import { OpenMojiDisplay } from '@/components/game/OpenMojiDisplay';

interface ElementListViewProps {
  elements: GameElement[];
  searchTerm: string;
  sortMode: string;
  shakeElement: string | null;
  popElement: string | null;
  hoveredElement: string | null;
  onElementDragStart: (e: React.DragEvent<HTMLDivElement>, element: GameElement) => void;
  onElementTouchStart: (e: React.TouchEvent<HTMLDivElement>, element: GameElement) => void;
  onElementMouseEnter: (name: string) => void;
  onElementMouseLeave: () => void;
}

export const ElementListView: React.FC<ElementListViewProps> = ({
  elements,
  searchTerm,
  sortMode,
  shakeElement,
  popElement,
  hoveredElement,
  onElementDragStart,
  onElementTouchStart,
  onElementMouseEnter,
  onElementMouseLeave
}) => {
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
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {sortedElements.map((element) => (
          <div
            key={element.name}
            draggable
            onDragStart={(e) => onElementDragStart(e, element)}
            onTouchStart={(e) => onElementTouchStart(e, element)}
            onMouseEnter={() => onElementMouseEnter(element.name)}
            onMouseLeave={onElementMouseLeave}
            className={`
              element-card group relative p-3 bg-gray-700 rounded-lg cursor-grab active:cursor-grabbing 
              transition-all duration-200 hover:bg-gray-600 hover:scale-105 select-none touch-manipulation
              ${shakeElement === element.name ? 'animate-shake' : ''}
              ${popElement === element.name ? 'animate-pop-in' : ''}
              ${hoveredElement === element.name ? 'ring-2 ring-blue-400' : ''}
            `}
          >
            {/* Element Icon */}
            <div className="flex justify-center mb-2">
              <OpenMojiDisplay
                emoji={element.emoji}
                name={element.name}
                className="text-2xl group-hover:scale-110 transition-transform"
              />
            </div>
            
            {/* Element Name */}
            <div className="text-center">
              <span className="text-sm font-medium text-white block leading-tight">
                {element.name}
              </span>
              
              {/* Discovery Indicator */}
              {element.unlockOrder && (
                <span className="text-xs text-gray-400 mt-1 block">
                  #{element.unlockOrder}
                </span>
              )}
            </div>
            
            {/* Hover Effect Overlay */}
            <div className="absolute inset-0 bg-blue-400 opacity-0 group-hover:opacity-10 rounded-lg transition-opacity pointer-events-none"></div>
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
