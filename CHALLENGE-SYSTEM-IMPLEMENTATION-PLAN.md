# LLM Alchemy - Challenge System Implementation Plan

## Overview
Implement daily and weekly challenges to increase player engagement with token rewards and leaderboards.

**Key Features:**
- 2 daily challenges (5 tokens each) - broad categories
- 1 weekly challenge (25 tokens) - specific elements  
- No mode restrictions - players choose Science or Creative
- Europe/Copenhagen timezone for resets
- No retroactive completion
- Leaderboard tracking

---

## ✅ Phase 1: Database Setup

### 1.1 Create Challenge Tables
```sql
-- File: supabase/add-challenges-schema.sql

-- Master challenges table
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_type TEXT CHECK (challenge_type IN ('daily', 'weekly')),
  title TEXT NOT NULL,
  target_element TEXT,
  target_category TEXT,
  reward_tokens INTEGER NOT NULL DEFAULT 5,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uniq_type_date UNIQUE (challenge_type, start_date)
);

-- Completion tracking
CREATE TABLE challenge_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  element_discovered TEXT NOT NULL,
  game_mode TEXT NOT NULL,
  UNIQUE (challenge_id, user_id)
);

-- Indexes
CREATE INDEX idx_challenge_active ON challenges (end_date DESC);
CREATE INDEX idx_challenge_type_date ON challenges (challenge_type, start_date DESC);
CREATE INDEX idx_completion_user ON challenge_completions (user_id, completed_at DESC);
```

### 1.2 Row Level Security
```sql
-- Anyone can read challenges
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON challenges FOR SELECT USING (true);

-- Users can only see/create their own completions
ALTER TABLE challenge_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_completions" ON challenge_completions 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

---

## ✅ Phase 2: Challenge Data Setup

### 2.1 Create Curated Elements List
```typescript
// File: src/lib/challenge-elements.ts

export const DAILY_CATEGORIES = [
  // Science-oriented
  { category: 'organism', title: 'Discover a lifeform' },
  { category: 'edible', title: 'Discover something edible' },
  { category: 'tool', title: 'Discover a tool' },
  { category: 'metal', title: 'Discover a metal' },
  { category: 'gas', title: 'Discover a gas' },
  { category: 'liquid', title: 'Discover a liquid' },
  { category: 'mineral', title: 'Discover a mineral' },
  { category: 'danger', title: 'Discover something dangerous' },
  
  // Creative-oriented  
  { category: 'creature', title: 'Discover a creature' },
  { category: 'magical', title: 'Discover something magical' },
  { category: 'weapon', title: 'Discover a weapon' },
  { category: 'food', title: 'Discover food' },
  { category: 'mythological', title: 'Discover something mythological' }
];

export const WEEKLY_ELEMENTS = [
  // Common discoveries
  'Steam', 'Mud', 'Glass', 'Metal', 'Sand',
  'Alcohol', 'Vinegar', 'Soap', 'Plastic',
  
  // Medium difficulty
  'Whiskey', 'Telescope', 'Cheese', 'Yogurt',
  'Gunpowder', 'Dynamite', 'Pearl', 'Coral',
  
  // Creative elements
  'Dragon', 'Phoenix', 'Pizza', 'Ice Cream',
  'Excalibur', 'Love Potion', 'Portal',
  
  // Cross-mode elements
  'Diamond', 'Gold', 'Lightning', 'Rainbow'
];
```

---

## ✅ Phase 3: API Implementation

### 3.1 Challenge Generation Endpoint
```typescript
// File: app/api/challenges/generate/route.ts
// Vercel Cron endpoint - runs daily at midnight Copenhagen time

export async function GET(request: Request) {
  // 1. Verify cron secret
  // 2. Generate 2 daily challenges
  // 3. Generate 1 weekly challenge (Mondays only)
  // 4. Close expired challenges
}
```

### 3.2 Current Challenges Endpoint
```typescript
// File: app/api/challenges/current/route.ts
// Returns active challenges with user completion status

export async function GET(request: Request) {
  // 1. Get active challenges
  // 2. Get user's completions
  // 3. Merge and return
}
```

### 3.3 Vercel Cron Configuration
```json
// File: vercel.json
{
  "crons": [{
    "path": "/api/challenges/generate",
    "schedule": "0 0 * * *"  // Midnight Europe/Copenhagen
  }]
}
```

---

## ✅ Phase 4: Frontend Components

### 4.1 Challenge Bar Component
```typescript
// File: src/components/game/ChallengeBar.tsx
// Displays active challenges above mixing area

- Show 2 daily + 1 weekly challenge
- Display completion status
- Show token rewards
- Real-time updates on completion
```

### 4.2 Integrate with Existing Token System
```typescript
// File: src/lib/supabase-client.ts
// Update existing increment function for challenge rewards

- Use existing token increment logic
- Add challenge-specific celebration
```

---

## ✅ Phase 5: Game Integration

### 5.1 Completion Detection
```typescript
// File: src/components/game/LLMAlchemy.tsx
// Add to handleCombination function after element creation

- Check active challenges
- Match against new element (name or tags)
- Award tokens and update completion
- Show celebration toast
```

### 5.2 UI Integration Points
- Add ChallengeBar above mixing area
- Import challenge checking in handleCombination
- Connect to existing toast system for notifications

---

## ✅ Phase 6: Testing & Polish

### 6.1 Manual Testing Checklist
- [ ] Daily challenges generate at midnight
- [ ] Weekly challenge generates on Monday
- [ ] Challenges display correctly in UI
- [ ] Element discovery triggers completion
- [ ] Tokens are awarded correctly
- [ ] Completions persist across sessions
- [ ] No retroactive completions

### 6.2 Edge Cases to Test
- [ ] User completes same challenge twice (should be prevented)
- [ ] Challenge expires while user playing
- [ ] Multiple elements match category
- [ ] Database connection issues

---

## Implementation Order

1. **Database** (30 min)
   - Create SQL migration file
   - Run migration in Supabase

2. **Challenge Data** (20 min)
   - Create challenge-elements.ts
   - Define categories and elements

3. **API Routes** (1 hour)
   - Challenge generation endpoint
   - Current challenges endpoint
   - Vercel cron setup

4. **Frontend** (1.5 hours)
   - ChallengeBar component
   - Integration with game
   - Completion detection

5. **Testing** (30 min)
   - Manual testing
   - Bug fixes

**Total estimate: 3.5-4 hours**

---

## Notes

- Keep it simple - no over-engineering
- Reuse existing systems (tokens, toasts, achievements)
- Copenhagen timezone for consistency
- Start with basic UI, enhance later
