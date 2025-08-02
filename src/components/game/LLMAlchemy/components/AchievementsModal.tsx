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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-4 border border-gray-600 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Emoji>🏆</Emoji>
            Achievements
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {achievements.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
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
                  className="bg-gray-700/50 rounded-lg p-3 border border-gray-600"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{achievement.emoji}</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-yellow-400">{achievement.name}</h4>
                      <p className="text-sm text-gray-300 mt-1">{achievement.description}</p>
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
