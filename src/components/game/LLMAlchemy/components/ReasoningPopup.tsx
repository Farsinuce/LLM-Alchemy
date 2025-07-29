import React from 'react';
import { X, Zap } from 'lucide-react';
import { OpenMojiDisplay } from '@/components/game/OpenMojiDisplay';
import { Element } from '@/types/game.types';

interface ReasoningPopup {
  element: Element;
  x: number;
  y: number;
  fromHover: boolean;
}

interface ReasoningPopupProps {
  reasoningPopup: ReasoningPopup | null;
  onClose: () => void;
}

export const ReasoningPopup: React.FC<ReasoningPopupProps> = ({ 
  reasoningPopup, 
  onClose 
}) => {
  if (!reasoningPopup) return null;

  const { element } = reasoningPopup;
  const hasParents = element.parents && element.parents.length > 0;

  return (
    <div
      className="reasoning-popup fixed z-50 bg-gray-800 border border-gray-600 rounded-lg p-4 max-w-xs shadow-xl"
      style={{
        left: `${Math.min(reasoningPopup.x, window.innerWidth - 200)}px`,
        top: `${Math.max(reasoningPopup.y - 100, 10)}px`,
        transform: 'translateX(-50%)'
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <OpenMojiDisplay 
          emoji={element.emoji} 
          hexcode={element.openmojiHex}
          name={element.name} 
          size="sm" 
        />
        <h4 className="font-semibold">{element.name}</h4>
      </div>
      
      {/* Show parent elements if available */}
      {hasParents && (
        <div className="mb-3 p-2 bg-gray-700/50 rounded border-l-2 border-blue-400">
          <div className="text-xs text-gray-400 mb-1">Created from:</div>
          <div className="flex items-center gap-1 text-sm">
            {element.parents!.map((parent, index) => (
              <React.Fragment key={parent.name}>
                <span className="text-yellow-300">{parent.name}</span>
                {index < element.parents!.length - 1 && (
                  <span className="text-gray-400">+</span>
                )}
              </React.Fragment>
            ))}
            {element.energyEnhanced && (
              <>
                <span className="text-gray-400">+</span>
                <span className="text-purple-300 flex items-center gap-1">
                  <Zap size={12} />
                  Energy
                </span>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Show reasoning */}
      {element.reasoning && (
        <p className="text-sm text-gray-300">{element.reasoning}</p>
      )}
      
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-400 hover:text-white"
      >
        <X size={16} />
      </button>
    </div>
  );
};
