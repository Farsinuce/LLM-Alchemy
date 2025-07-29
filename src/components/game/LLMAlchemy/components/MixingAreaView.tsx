'use client';

import React from 'react';
import { OpenMojiDisplay } from '@/components/game/OpenMojiDisplay';
import { MixingElement } from '../hooks/useGameState';

interface MixingAreaViewProps {
  mixingArea: MixingElement[];
  isMixing: boolean;
  mixingResult: string | null;
  canUndo: boolean;
  animatingElements: Set<string>;
  onMixingElementMouseDown: (e: React.MouseEvent<HTMLDivElement>, element: MixingElement) => void;
  onMixingElementTouchStart: (e: React.TouchEvent<HTMLDivElement>, element: MixingElement) => void;
  onClearMixingArea: () => void;
  onUndo: () => void;
}

export const MixingAreaView: React.FC<MixingAreaViewProps> = ({
  mixingArea,
  isMixing,
  mixingResult,
  canUndo,
  animatingElements,
  onMixingElementMouseDown,
  onMixingElementTouchStart,
  onClearMixingArea,
  onUndo
}) => {
  return (
    <div 
      className={`
        flex-1 relative overflow-hidden border-2 border-dashed rounded-lg transition-all duration-500 m-4
        ${mixingArea.length > 0 
          ? 'border-purple-400 bg-purple-900/20' 
          : 'border-gray-600 bg-gray-800/50'
        }
        ${isMixing ? 'border-yellow-400 bg-yellow-900/20 animate-mixing-blur' : ''}
      `}
    >
      {/* UNDO Button - Top Left */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="absolute top-4 left-4 px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white text-sm font-medium transition-colors z-20"
        title="Undo last action"
      >
        ↶ Undo
      </button>

      {/* CLEAR Button - Top Right */}
      {mixingArea.length > 0 && !isMixing && (
        <button
          onClick={onClearMixingArea}
          className="absolute top-4 right-4 px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-white text-sm font-medium transition-colors z-20"
          title="Clear mixing area"
        >
          Clear
        </button>
      )}

      {/* Drop Zone Instructions */}
      {mixingArea.length === 0 && !isMixing && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center text-gray-400">
            <div className="text-4xl mb-2">🧪</div>
            <p className="text-lg font-medium">Drop elements here to mix</p>
            <p className="text-sm mt-1">Drag & drop or touch elements to combine them</p>
          </div>
        </div>
      )}

      {/* Mixing Status with Blur Backdrop */}
      {isMixing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-lg animate-fade-in z-30">
          <div className="text-center text-yellow-400 bg-black/50 rounded-xl p-6 border border-yellow-400/30">
            <div className="text-4xl mb-2 animate-spin">⚗️</div>
            <p className="text-lg font-medium">Mixing Elements...</p>
            <p className="text-sm mt-1">Please wait while the LLM creates magic</p>
          </div>
        </div>
      )}

      {/* Result Display */}
      {mixingResult && !isMixing && (
        <div className="absolute inset-0 flex items-center justify-center z-30">
          <div className="text-center text-green-400">
            <div className="text-6xl mb-4 animate-bounce">✨</div>
            <p className="text-xl font-bold mb-2">Success!</p>
            <p className="text-lg">{mixingResult}</p>
          </div>
        </div>
      )}

      {/* Mixing Area Elements */}
      {mixingArea.map((element) => {
        const elementKey = `${element.id}-${element.index}`;
        const isRemoving = animatingElements.has(elementKey);
        
        return (
          <div
            key={element.id}
            id={`mixing-${element.id}-${element.index}`}
            className={`absolute w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex flex-col items-center justify-center rounded-lg cursor-move hover:bg-gray-600 transition-colors select-none touch-manipulation z-10 ${
              isRemoving ? 'animate-element-remove-staggered' : 'animate-element-drop-in'
            }`}
            style={{
              left: `${element.x}px`,
              top: `${element.y}px`,
              backgroundColor: element.color,
              color: '#FFFFFF',
            }}
            onMouseDown={(e) => onMixingElementMouseDown(e, element)}
            onTouchStart={(e) => onMixingElementTouchStart(e, element)}
          >
            <OpenMojiDisplay
              emoji={element.emoji}
              name={element.name}
              size="md"
              className="text-2xl"
            />
            <div className="text-[8px] sm:text-[10px] font-medium px-1 text-center leading-tight">{element.name}</div>
          </div>
        );
      })}

      {/* Mixing Area Info */}
      {mixingArea.length > 0 && !isMixing && !mixingResult && (
        <div className="absolute bottom-4 left-4 text-sm text-gray-300 z-10">
          <p>{mixingArea.length} element{mixingArea.length !== 1 ? 's' : ''} ready to mix</p>
          {mixingArea.length >= 2 && (
            <p className="text-xs text-purple-400 mt-1">
              Move elements closer together to combine them
            </p>
          )}
        </div>
      )}
    </div>
  );
};
