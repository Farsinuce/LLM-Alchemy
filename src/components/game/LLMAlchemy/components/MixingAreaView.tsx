'use client';

import React from 'react';
import { OpenMojiDisplay } from '@/components/game/OpenMojiDisplay';

interface MixingElement {
  id: string;
  name: string;
  emoji: string;
  x: number;
  y: number;
}

interface MixingAreaViewProps {
  mixingArea: MixingElement[];
  isMixing: boolean;
  mixingResult: string | null;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onTouchEnd: (e: React.TouchEvent<HTMLDivElement>) => void;
  onMixingElementMouseDown: (e: React.MouseEvent<HTMLDivElement>, element: MixingElement) => void;
  onMixingElementTouchStart: (e: React.TouchEvent<HTMLDivElement>, element: MixingElement) => void;
  onClearMixingArea: () => void;
}

export const MixingAreaView: React.FC<MixingAreaViewProps> = ({
  mixingArea,
  isMixing,
  mixingResult,
  onDrop,
  onDragOver,
  onTouchEnd,
  onMixingElementMouseDown,
  onMixingElementTouchStart,
  onClearMixingArea
}) => {
  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Mixing Area */}
      <div
        className={`
          absolute inset-4 border-2 border-dashed rounded-lg transition-all duration-300
          ${mixingArea.length > 0 
            ? 'border-purple-400 bg-purple-900/20' 
            : 'border-gray-600 bg-gray-800/50'
          }
          ${isMixing ? 'border-yellow-400 bg-yellow-900/20' : ''}
        `}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onTouchEnd={onTouchEnd}
      >
        {/* Drop Zone Instructions */}
        {mixingArea.length === 0 && !isMixing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-2">🧪</div>
              <p className="text-lg font-medium">Drop elements here to mix</p>
              <p className="text-sm mt-1">Drag & drop or touch elements to combine them</p>
            </div>
          </div>
        )}

        {/* Mixing Status */}
        {isMixing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-yellow-400">
              <div className="text-4xl mb-2 animate-spin">⚗️</div>
              <p className="text-lg font-medium">Mixing Elements...</p>
              <p className="text-sm mt-1">Please wait while the LLM creates magic</p>
            </div>
          </div>
        )}

        {/* Result Display */}
        {mixingResult && !isMixing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-green-400">
              <div className="text-6xl mb-4 animate-bounce">✨</div>
              <p className="text-xl font-bold mb-2">Success!</p>
              <p className="text-lg">{mixingResult}</p>
            </div>
          </div>
        )}

        {/* Mixing Area Elements */}
        {mixingArea.map((element) => (
          <div
            key={element.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 p-3 bg-gray-700 rounded-lg cursor-move hover:bg-gray-600 transition-colors select-none touch-manipulation"
            style={{
              left: `${element.x}px`,
              top: `${element.y}px`,
            }}
            onMouseDown={(e) => onMixingElementMouseDown(e, element)}
            onTouchStart={(e) => onMixingElementTouchStart(e, element)}
          >
            <div className="flex flex-col items-center gap-1">
              <OpenMojiDisplay
                emoji={element.emoji}
                name={element.name}
                size="md"
                className="text-2xl"
              />
              <span className="text-xs text-white font-medium leading-tight max-w-16 text-center">
                {element.name}
              </span>
            </div>
          </div>
        ))}

        {/* Clear Button */}
        {mixingArea.length > 0 && !isMixing && (
          <button
            onClick={onClearMixingArea}
            className="absolute top-4 right-4 px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-white text-sm font-medium transition-colors"
            title="Clear mixing area"
          >
            Clear
          </button>
        )}

        {/* Mixing Area Info */}
        {mixingArea.length > 0 && !isMixing && !mixingResult && (
          <div className="absolute bottom-4 left-4 text-sm text-gray-300">
            <p>{mixingArea.length} element{mixingArea.length !== 1 ? 's' : ''} ready to mix</p>
            {mixingArea.length >= 2 && (
              <p className="text-xs text-purple-400 mt-1">
                Move elements closer together to combine them
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
