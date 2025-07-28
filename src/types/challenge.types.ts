// Challenge system types
export interface Challenge {
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

export interface ChallengeBarProps {
  isAnonymous?: boolean;
  currentGameMode?: 'science' | 'creative';
}
