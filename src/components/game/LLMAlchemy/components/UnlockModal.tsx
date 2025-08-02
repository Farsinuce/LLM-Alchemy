import React, { useEffect, useState } from 'react';
import { Element, Achievement } from '@/types/game.types';
import { OpenMojiDisplay } from '@/components/game/OpenMojiDisplay';
import Emoji from '@/components/ui/Emoji';

interface ShowUnlock extends Element {
  isNew: boolean;
  achievement?: Achievement | null;
}

interface UnlockModalProps {
  showUnlock: ShowUnlock | null;
  onClose: () => void;
}

export const UnlockModal: React.FC<UnlockModalProps> = ({ showUnlock, onClose }) => {
  // Two-stage animation state
  const [animationStage, setAnimationStage] = useState<'initial' | 'anticipation' | 'reveal'>('initial');

  // Initialize animation stages when showUnlock changes
  useEffect(() => {
    if (!showUnlock) {
      setAnimationStage('initial');
      return;
    }
    
    // Directly show the reveal animation without delay
    setAnimationStage('reveal');
  }, [showUnlock]);

  // Auto-close after animation completes
  useEffect(() => {
    if (!showUnlock || animationStage !== 'reveal') return;
    
    const timeout = setTimeout(() => {
      onClose();
    }, showUnlock.isNew ? 3000 : 2000);

    return () => clearTimeout(timeout);
  }, [showUnlock, animationStage, onClose]);

  if (!showUnlock || animationStage === 'initial') return null;

  // Get rarity-based styling
  const getRarityStyle = (rarity: string = 'common') => {
    switch (rarity) {
      case 'uncommon':
        return {
          borderColor: '#10B981', // Green
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          glowColor: '0 0 20px rgba(16, 185, 129, 0.3)'
        };
      case 'rare':
        return {
          borderColor: '#8B5CF6', // Purple
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          glowColor: '0 0 20px rgba(139, 92, 246, 0.3)'
        };
      case 'epic':
        return {
          borderColor: '#F59E0B', // Orange/Gold
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          glowColor: '0 0 20px rgba(245, 158, 11, 0.3)'
        };
      case 'legendary':
        return {
          borderColor: '#EF4444', // Red
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          glowColor: '0 0 20px rgba(239, 68, 68, 0.3)'
        };
      default:
        return {
          borderColor: '#6B7280', // Gray
          backgroundColor: 'rgba(107, 114, 128, 0.1)',
          glowColor: '0 0 20px rgba(107, 114, 128, 0.2)'
        };
    }
  };

  const rarityStyle = getRarityStyle(showUnlock.rarity);

  return (
    <div 
      className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${
        animationStage === 'reveal' ? 'animate-fade-in' : ''
      }`} 
      onClick={onClose}
    >
      <div 
        className={`om-modal-content max-w-sm mx-4 cursor-pointer ${
          animationStage === 'anticipation' 
            ? 'scale-75 opacity-50 transition-all duration-200' 
            : 'animate-element-unlock-bounce'
        }`}
        style={{
          borderColor: rarityStyle.borderColor,
          boxShadow: animationStage === 'reveal' ? `${rarityStyle.glowColor}, 0 4px 6px -1px rgba(0, 0, 0, 0.1)` : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="text-6xl mb-4">
            <OpenMojiDisplay 
              emoji={showUnlock.emoji} 
              hexcode={showUnlock.openmojiHex}
              name={showUnlock.name} 
              size="lg" 
            />
          </div>
          <h3 className="text-xl font-bold mb-2 text-black">
            {showUnlock.isNew ? 'New Discovery!' : 'Already Discovered'}
          </h3>
          <h4 className="text-lg text-amber-600 mb-2">{showUnlock.name}</h4>
          {showUnlock.reasoning && (
            <p className="text-sm text-gray-700 mb-4">{showUnlock.reasoning}</p>
          )}
          {showUnlock.achievement && (
            <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 justify-center">
                <Emoji size="lg">🏆</Emoji>
                <div>
                  <h5 className="font-semibold text-yellow-700">{showUnlock.achievement.name}</h5>
                  <p className="text-xs text-gray-600">{showUnlock.achievement.description}</p>
                </div>
              </div>
            </div>
          )}
          {showUnlock.isEndElement && (
            <div className="bg-purple-100 border border-purple-400 rounded-lg p-2 mb-4">
              <span className="text-sm text-purple-700"><Emoji>🏁</Emoji> End Element</span>
            </div>
          )}
          
          {/* Rarity indicator */}
          {showUnlock.rarity && showUnlock.rarity !== 'common' && (
            <div className="mt-4">
              <span 
                className="px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
                style={{ 
                  color: rarityStyle.borderColor,
                  backgroundColor: rarityStyle.backgroundColor,
                  border: `1px solid ${rarityStyle.borderColor}`
                }}
              >
                {showUnlock.rarity}
              </span>
            </div>
          )}
          
          {/* Auto-close indicator */}
          <div className="mt-4 text-xs text-gray-400">
            Click anywhere to close • Auto-closes in {showUnlock.isNew ? '3' : '2'}s
          </div>
        </div>
      </div>
    </div>
  );
};
