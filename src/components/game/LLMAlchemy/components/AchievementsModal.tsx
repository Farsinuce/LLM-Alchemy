import React from 'react';
import { X } from 'lucide-react';
import { Achievement } from '@/types';
import Emoji from '@/components/ui/Emoji';

interface AchievementsModalProps {
  isOpen: boolean;
  achievements: Achievement[];
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ 
  isOpen, 
  achievements, 
  onClose 
}) => {
  if (!isOpen) return null;

  return (
    <div className="om-modal-backdrop">
      <div className="om-modal-content max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2 text-black">
            <Emoji>🏆</Emoji>
            Achievements
          </h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-black"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {achievements.length === 0 ? (
            <div className="text-center text-gray-600 py-8">
              <div className="text-4xl mb-2">
                <Emoji size="lg">🎯</Emoji>
              </div>
              <p>No achievements yet!</p>
              <p className="text-sm mt-1">Keep discovering elements to unlock achievements.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="bg-gray-100 rounded-lg p-3 border-2 border-gray-300"
                >
                  <div className="flex items-start gap-3">
                    <Emoji>{achievement.emoji}</Emoji>
                    <div className="flex-1">
                      <h4 className="font-semibold text-amber-600">{achievement.name}</h4>
                      <p className="text-sm text-gray-700 mt-1">{achievement.description}</p>
                      {achievement.unlocked && (
                        <p className="text-xs text-gray-500 mt-2">
                          Unlocked: {new Date(achievement.unlocked).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
