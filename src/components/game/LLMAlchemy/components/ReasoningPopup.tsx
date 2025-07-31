import React from 'react';
import { X } from 'lucide-react';
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

  return (
    <div
      className={`reasoning-popup fixed z-50 bg-gray-800/95 backdrop-blur-sm border border-gray-600 rounded-lg p-3 max-w-xs shadow-xl ${
        reasoningPopup.fromHover ? 'pointer-events-none' : ''
      }`}
      style={{
        left: `${Math.min(reasoningPopup.x, window.innerWidth - 200)}px`,
        top: `${Math.max(reasoningPopup.y - 100, 10)}px`,
        transform: 'translateX(-50%)'
      }}
    >
      {/* Show parent emojis joined by + or 〰️ if energy was used */}
      {element.parents && element.parents.length > 0 && (
        <div className="text-center text-sm mb-2 flex items-center justify-center gap-1">
          {element.parents.map((parent, index) => (
            <React.Fragment key={parent.name}>
              <OpenMojiDisplay 
                emoji={parent.emoji} 
                hexcode={parent.openmojiHex}
                name={parent.name} 
                size="sm" 
              />
              {index < element.parents!.length - 1 && (
                <span className="text-gray-400 mx-1">
                  {element.energyEnhanced ? '〰️' : '+'}
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
      
      {/* Show reasoning text */}
      {element.reasoning && (
        <div className="text-gray-300 italic text-center text-xs">
          {element.reasoning}
        </div>
      )}
      
      {!reasoningPopup.fromHover && (
        <button
          onClick={onClose}
          className="absolute top-1 right-1 text-gray-400 hover:text-white"
        >
          <X size={12} />
        </button>
      )}
      
      {/* Arrow pointing down */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2">
        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-600"></div>
      </div>
    </div>
  );
};
