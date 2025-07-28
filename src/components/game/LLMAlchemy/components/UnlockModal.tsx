import React from 'react';
import { Achievement } from '@/types';
import { OpenMojiDisplay } from '@/components/game/OpenMojiDisplay';
import { Element } from '../hooks/useGameState';

interface ShowUnlock extends Element {
  isNew: boolean;
  achievement?: Achievement | null;
}

interface UnlockModalProps {
  showUnlock: ShowUnlock | null;
  onClose: () => void;
}

export const UnlockModal: React.FC<UnlockModalProps> = ({ showUnlock, onClose }) => {
  if (!showUnlock) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-sm mx-4 border border-gray-600">
        <div className="text-center">
          <div className="text-6xl mb-4">
            <OpenMojiDisplay 
              emoji={showUnlock.emoji} 
              hexcode={showUnlock.openmojiHex}
              name={showUnlock.name} 
              size="lg" 
            />
          </div>
          <h3 className="text-xl font-bold mb-2">
            {showUnlock.isNew ? 'New Discovery!' : 'Already Discovered'}
          </h3>
          <h4 className="text-lg text-yellow-400 mb-2">{showUnlock.name}</h4>
          {showUnlock.reasoning && (
            <p className="text-sm text-gray-300 mb-4">{showUnlock.reasoning}</p>
          )}
          {showUnlock.achievement && (
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 justify-center">
                <span className="text-2xl">🏆</span>
                <div>
                  <h5 className="font-semibold text-yellow-400">{showUnlock.achievement.name}</h5>
                  <p className="text-xs text-gray-300">{showUnlock.achievement.description}</p>
                </div>
              </div>
            </div>
          )}
          {showUnlock.isEndElement && (
            <div className="bg-purple-500/20 border border-purple-500/50 rounded-lg p-2 mb-4">
              <span className="text-sm text-purple-300">🏁 End Element</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};
