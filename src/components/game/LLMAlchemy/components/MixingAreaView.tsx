'use client';

import React from 'react';
import { OpenMojiDisplay } from '@/components/game/OpenMojiDisplay';
import { MixingElement } from '../hooks/useGameState';
import { getContrastColor, getRarityHoverColor } from '@/lib/ui-utils';
import Emoji from '@/components/ui/Emoji';

interface MixingAreaViewProps {
  mixingArea: MixingElement[];
  isMixing: boolean;
  mixingResult: string | null;
  canUndo: boolean;
  animatingElements: Set<string>;
  hoveredElement: number | null;
  hoveredUIElement: string | null;
  isDragging: boolean;
  touchDragging: MixingElement | null;
  dimmedElements: Set<string>;
  onMixingElementMouseDown: (e: React.MouseEvent<HTMLDivElement>, element: MixingElement) => void;
  onMixingElementTouchStart: (e: React.TouchEvent<HTMLDivElement>, element: MixingElement) => void;
  onMixingElementMouseEnter: (element: MixingElement) => void;
  onMixingElementMouseLeave: () => void;
  onMixingElementDragOver: (e: React.DragEvent, element: MixingElement) => void;
  onMixingElementDragEnter: (element: MixingElement) => void;
  onMixingElementDragLeave: () => void;
  onClearMixingArea: () => void;
  onUndo: () => void;
}

export const MixingAreaView: React.FC<MixingAreaViewProps> = ({
  mixingArea,
  isMixing,
  canUndo,
  animatingElements,
  hoveredElement,
  hoveredUIElement,
  isDragging,
  touchDragging,
  dimmedElements,
  onMixingElementMouseDown,
  onMixingElementTouchStart,
  onMixingElementMouseEnter,
  onMixingElementMouseLeave,
  onMixingElementDragOver,
  onMixingElementDragEnter,
  onMixingElementDragLeave,
  onClearMixingArea,
  onUndo
}) => {
  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Undo Button */}
      {canUndo && (
        <button
          onClick={onUndo}
          onMouseEnter={() => {}}
          onMouseLeave={() => {}}
          className="absolute top-4 left-4 om-btn om-btn-primary z-20 flex items-center gap-1 cursor-pointer"
          title="Undo last action"
        >
          <Emoji>↩️</Emoji>
          <span className="hidden sm:inline text-sm">Undo</span>
        </button>
      )}

      {/* Clear Button */}
      {mixingArea.length > 0 && !isMixing && (
        <button
          onClick={onClearMixingArea}
          onMouseEnter={() => {}}
          onMouseLeave={() => {}}
          className="absolute top-4 right-4 om-btn om-btn-danger p-2 rounded-full z-20"
          title="Clear mixing area"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}

      {/* Empty state */}
      {mixingArea.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-black text-center px-4">
            Drag elements here to mix them!
          </p>
        </div>
      )}
      
      {/* Mixing area elements */}
      {mixingArea.map((element) => (
        <div
          key={`${element.id}-${element.index}`}
          id={`mixing-${element.id}-${element.index}`}
          draggable={!isMixing}
          onDragStart={(e) => onMixingElementMouseDown(e as React.MouseEvent<HTMLDivElement>, element)}
          onTouchStart={(e) => onMixingElementTouchStart(e, element)}
          onMouseEnter={() => onMixingElementMouseEnter(element)}
          onMouseLeave={onMixingElementMouseLeave}
          onContextMenu={(e) => e.preventDefault()}
          onDragOver={(e) => onMixingElementDragOver(e, element)}
          onDragEnter={() => onMixingElementDragEnter(element)}
          onDragLeave={onMixingElementDragLeave}
          className={`absolute w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex flex-col items-center justify-center rounded-lg cursor-move ${
            element.energized ? 'animate-shake' : ''
          } ${
            hoveredElement === element.index && !element.energized ? 'animate-continuous-pulse' : ''
          } ${
            touchDragging?.mixIndex === element.index && touchDragging?.fromMixingArea ? 'opacity-30' : ''
          } ${
            animatingElements.has(`${element.id}-${element.index}`) ? 'animate-element-pop-out' : ''
          } ${
            dimmedElements.has(element.name) ? 'element-dimmed' : ''
          }`}
          style={{ 
            left: `${element.x}px`, 
            top: `${element.y}px`,
            backgroundColor: element.color,
            color: getContrastColor(element.color),
            pointerEvents: isMixing ? 'none' : 'auto',
            touchAction: 'none',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            transition: 'none',
            zIndex: 10,
            boxShadow: element.energized ? '0 0 20px rgba(250, 204, 21, 0.5), 0 0 0 2px #facc15' :
                      hoveredElement === element.index ? `0 0 0 2px ${getRarityHoverColor(element.rarity)}` :
                      hoveredUIElement === `mixing-${element.index}` && !isDragging ? `0 0 0 2px ${getRarityHoverColor(element.rarity)}` : ''
          }}
        >
          <OpenMojiDisplay 
            emoji={element.emoji} 
            hexcode={element.openmojiHex}
            name={element.name} 
            size="md" 
            className="pointer-events-none"
          />
          <div className="text-[8px] sm:text-[10px] font-medium px-1 text-center leading-tight pointer-events-none">{element.name}</div>
        </div>
      ))}
      
      {/* Mixing overlay */}
      {isMixing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-gray-800/90 rounded-xl p-6 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mb-3"></div>
            <div className="text-sm">Mixing...</div>
          </div>
        </div>
      )}
    </div>
  );
};
