import React from 'react';
import { X } from 'lucide-react';
import { OpenMojiDisplay } from '@/components/game/OpenMojiDisplay';
import { Element } from '../hooks/useGameState';

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
          emoji={reasoningPopup.element.emoji} 
          hexcode={reasoningPopup.element.openmojiHex}
          name={reasoningPopup.element.name} 
          size="sm" 
        />
        <h4 className="font-semibold">{reasoningPopup.element.name}</h4>
      </div>
      <p className="text-sm text-gray-300">{reasoningPopup.element.reasoning}</p>
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-400 hover:text-white"
      >
        <X size={16} />
      </button>
    </div>
  );
};
