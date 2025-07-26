'use client';

import { useEffect, useState } from 'react';

interface Challenge {
  id: string;
  challenge_type: 'daily' | 'weekly';
  title: string;
  target_element?: string;
  target_category?: string;
  game_mode?: 'science' | 'creative' | 'any';
  reward_tokens: number;
  start_date: string;
  end_date: string;
  isCompleted: boolean;
  completionDetails?: {
    element_discovered: string;
    game_mode: string;
    completed_at: string;
  } | null;
}

interface ChallengeBarProps {
  isAnonymous?: boolean;
}

export function ChallengeBar({ isAnonymous }: ChallengeBarProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hiddenChallenges, setHiddenChallenges] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchChallenges();
    // Refresh challenges every 30 seconds
    const interval = setInterval(fetchChallenges, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchChallenges = async () => {
    try {
      const response = await fetch('/api/challenges/current');
      if (!response.ok) throw new Error('Failed to fetch challenges');
      
      const data = await response.json();
      setChallenges(data.challenges || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching challenges:', err);
      setError('Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  const hideChallenge = (challengeId: string) => {
    setHiddenChallenges(prev => new Set([...prev, challengeId]));
  };

  // Show registration prompt for anonymous users
  if (isAnonymous) {
    return (
      <div className="challenge-bar-container mb-4">
        <div className="p-3 bg-surface-secondary rounded-lg border border-warning/30 text-center">
          <p className="text-sm text-muted">
            🔒 <span className="text-blue-400 underline cursor-pointer" onClick={() => window.location.href = '/'}>Register</span> to participate in challenges
          </p>
        </div>
      </div>
    );
  }

  if (loading) return null;
  if (error) return null;
  if (challenges.length === 0) return null;

  // Separate daily and weekly challenges and filter out hidden ones
  const dailyChallenges = challenges.filter(c => c.challenge_type === 'daily' && !hiddenChallenges.has(c.id));
  const weeklyChallenges = challenges.filter(c => c.challenge_type === 'weekly' && !hiddenChallenges.has(c.id));

  return (
    <div className="challenge-bar-container mb-4">
      <div className="grid gap-2">
        {/* Daily Challenges */}
        {dailyChallenges.map((challenge) => (
          <div
            key={challenge.id}
            className="challenge-item transition-all duration-300"
          >
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary border border-primary/20">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl">🌟</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted uppercase tracking-wider">Daily Quest</span>
                    {challenge.game_mode && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        challenge.game_mode === 'science' ? 'bg-blue-500/20 text-blue-300' :
                        challenge.game_mode === 'creative' ? 'bg-purple-500/20 text-purple-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {challenge.game_mode === 'science' ? '🔬 Science' :
                         challenge.game_mode === 'creative' ? '🎨 Creative' :
                         '🌟 Any Mode'}
                      </span>
                    )}
                    {challenge.isCompleted && (
                      <span className="text-xs text-success">✓ Completed</span>
                    )}
                  </div>
                  <p className="text-body font-medium">{challenge.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-warning">+{challenge.reward_tokens}</span>
                    <span className="text-xs text-muted">tokens</span>
                  </div>
                  {challenge.isCompleted && challenge.completionDetails && (
                    <p className="text-xs text-muted mt-1">
                      Found: {challenge.completionDetails.element_discovered}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => hideChallenge(challenge.id)}
                  className="text-gray-400 hover:text-gray-300 transition-colors p-1"
                  title="Hide challenge"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Weekly Challenge */}
        {weeklyChallenges.map((challenge) => (
          <div
            key={challenge.id}
            className="challenge-item transition-all duration-300"
          >
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary border border-warning/30">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl">🏆</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted uppercase tracking-wider">Weekly Challenge</span>
                    {challenge.game_mode && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        challenge.game_mode === 'science' ? 'bg-blue-500/20 text-blue-300' :
                        challenge.game_mode === 'creative' ? 'bg-purple-500/20 text-purple-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {challenge.game_mode === 'science' ? '🔬 Science' :
                         challenge.game_mode === 'creative' ? '🎨 Creative' :
                         '🌟 Any Mode'}
                      </span>
                    )}
                    {challenge.isCompleted && (
                      <span className="text-xs text-success">✓ Completed</span>
                    )}
                  </div>
                  <p className="text-body font-medium">{challenge.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-warning">+{challenge.reward_tokens}</span>
                    <span className="text-xs text-muted">tokens</span>
                  </div>
                  {challenge.isCompleted && challenge.completionDetails && (
                    <p className="text-xs text-muted mt-1">
                      Mode: {challenge.completionDetails.game_mode}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => hideChallenge(challenge.id)}
                  className="text-gray-400 hover:text-gray-300 transition-colors p-1"
                  title="Hide challenge"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
