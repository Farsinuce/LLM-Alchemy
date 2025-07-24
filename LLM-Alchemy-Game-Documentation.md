# LLM Alchemy - Comprehensive Game Documentation

## Overview

LLM Alchemy is a casual Next.js alchemy game deployed on Vercel with database integration. Players combine elements to discover new ones, with AI (Large Language Model) dynamically generating outcomes from combinations. The game features two modes, an achievement system, user authentication, and is designed for monetization with Stripe payment integration.

**🚀 LIVE GAME**: https://llm-alchemy-beta2.vercel.app  
**📂 REPOSITORY**: https://github.com/Farsinuce/LLM-Alchemy  
**⚡ STATUS**: Production-ready with tab-switching bug resolved, token system, Gemini Pro integration, and complete monetization foundation

## Core Concept

Players start with basic elements (Earth, Air, Fire, Water, [Energy|Life]) and combine them to create new elements. The AI generates realistic outcomes based on scientific principles (Science mode) or creative connections (Creative mode). Each combination can produce new elements, which can then be combined further, creating an ever-expanding tree of discoveries. Game progress is automatically saved to the database and persists across sessions.

## Current Architecture (Production)

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Anonymous Auth, automatic user creation (needs to be expanding with dedicated user registration)
- **LLM Provider**: OpenRouter (Gemini Flash 2.5 and Pro 2.5)
- **Hosting**: Vercel (automatic deployments from GitHub)
- **Payments**: Mollie (planned integration), Important: We are pivoting from Mollie to Stripe (supports MobilePay)

### System Architecture
```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Next.js App   │────▶│  API Routes      │────▶│  OpenRouter  │
│   (Frontend)    │     │  /api/generate   │     │  Gemini      │
│   - Game Logic  │     │  - LLM Calls     │     │              │
│   - UI/UX       │     │  - Validation    │     └──────────────┘
│   - State Mgmt  │     │  - Error Handle  │              
└─────────────────┘     └──────────────────┘              
         │                        │                        
         ▼                        ▼                        
┌─────────────────┐     ┌──────────────────┐               
│  Supabase Auth  │     │   Supabase DB    │               
│  - Anonymous    │────▶│   - users        │               
│  - Automatic    │     │   - user_elements│               
│  - Daily Limits │     │   - combinations │               
└─────────────────┘     │   - RLS Policies │               
                        └──────────────────┘               
```

### Database Schema (Supabase) (note that more exists)
```sql
-- User management and daily limits
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  is_anonymous BOOLEAN DEFAULT true,
  subscription_status TEXT DEFAULT 'free',
  subscription_ends_at TIMESTAMP,
  daily_count INTEGER DEFAULT 0,
  last_count_reset DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Player discoveries and progress
CREATE TABLE user_elements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  element_name TEXT NOT NULL,
  element_emoji TEXT,
  element_color TEXT,
  game_mode TEXT NOT NULL,
  discovered_at TIMESTAMP DEFAULT NOW()
);

-- Combination history and caching
CREATE TABLE user_combinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  element1 TEXT NOT NULL,
  element2 TEXT NOT NULL,
  result TEXT,
  game_mode TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Game Modes

### Science Mode
- **Starting Elements**: Energy, Earth, Air, Fire, Water
- **Focus**: Scientifically grounded combinations
- **Outcomes**: Real-world elements, compounds, and materials
- **End Elements**: Some combinations produce "End Elements" that cannot be mixed further
- **Examples**: Earth + Water = Mud; Fire + Water = Steam; Energy + Rock = Crystal

### Creative Mode
- **Starting Elements**: Life, Earth, Air, Fire, Water
- **Focus**: Creative, mythological, and cultural combinations
- **Outcomes**: Includes mythology, folklore, pop culture, everyday objects
- **No End Elements**: All elements can theoretically be combined further
- **Examples**: Fire + Earth = Pottery or Phoenix; Water + Life = Fish or Mermaid

## User System & Monetization

### Anonymous Play (Current Implementation)
- **Instant Access**: Players start immediately without signup
- **Auto-User Creation**: Anonymous users automatically created in Supabase
- **Daily Limits**: [50] combinations per day (tracked in database), subject to change
- **Progress Saving**: Game state persists across browser sessions
- **Upgrade Path**: Users can create accounts and buy tokens or subscribe to unlock premium features

### Premium Features
- **Unlimited Combinations**: No daily limits for subscribers (token packages available as alternative)
- **Cross-Device Sync**: Access progress from any device
- **Advanced LLM**: Upgrade from Gemini Flash to Gemini Pro with reasoning for more intelligent and novel combination outcomes
- **Better Undo**: Freemium players can only use the "UNDO COMBINATION"-feature once per game - Paying players can us it again and again (but only one step each time (like old MSpaint))

### Payment Integration (Stripe instead of Mollie)
**Subscription**: €5.99/month for unlimited combinations (unlimited = approx. 3000 combinations per month)
**Credit Packs (example)**:
- 100 credits: €0.40
- 500 credits: €1.80  
- 1000 credits: €3.50
- 2000 credits: €6.50

**Implementation Status**: Database foundation complete, payment integration planned

## Technical Implementation Details

### Core Components

1. **Element System**
   - Each element has: id, name, emoji, color, unlockOrder, rarity, reasoning, tags, isEndElement
   - Elements stored in React state with database persistence
   - Session-based combination caching to avoid repeated LLM calls
   - Color validation system ensures LLM-generated colors are valid hex codes

2. **LLM Integration (OpenRouter)**
   - Uses `/api/generate` endpoint for dynamic generation
   - Modular prompt system with shared and mode-specific components
   - JSON response format with validation and error handling
   - Tag-based categorization for achievement system
   - Rate limiting and error handling

3. **Database Integration (Supabase)**
   - Automatic anonymous user creation
   - Real-time daily counter tracking
   - Persistent game state storage (planned)
   - Row Level Security for data isolation
   - Cross-session progress restoration

4. **Authentication System**
   - **SupabaseProvider**: React context for auth state
   - **Anonymous Auth**: Automatic user creation on first visit
   - **Daily Counter**: Database-backed limit tracking
   - **Session Management**: Persistent across browser sessions
   - **Account Upgrade**: Migration path to registered users

### React Architecture

#### State Management
```typescript
// Main game state with proper cleanup
const [elements, setElements] = useState<Element[]>([...]);
const [dailyCount, setDailyCount] = useState<number>(0);
const [user, setUser] = useState<User | null>(null);

// Supabase integration
const { user, dbUser, dailyCount, loading, refreshDailyCount } = useSupabase();

// Performance optimizations
const supabase = useMemo(() => createClient(), []);
const incrementDailyCounter = useCallback(async () => { ... }, [user]);
```

#### Component Architecture
```
LLMAlchemy.tsx (Main Game)
├── SupabaseProvider (Authentication & Database)
├── Element Grid (Discovery Collection)
├── Mixing Area (Drag & Drop Interface)
├── Achievement System (Progress Tracking)
├── Reasoning Popups (Educational Content)
└── Audio System (Feedback & Polish)
```

### LLM Prompt System (OpenRouter)

#### Modular Architecture
- **buildSharedSections()**: Common components (rarity, reasoning, response format)
- **buildSciencePrompt()**: Science-specific rules and constraints
- **buildCreativePrompt()**: Creative-specific rules and flexibility

#### Science Mode Prompt Features
- **Scientific Accuracy**: High school level understanding, avoid obscure terms
- **Scale Limits**: Building-sized max, molecule-sized min
- **Technology Preference**: Natural over technological outcomes
- **Energy Transformation**: Energy + element creates NEW substance
- **End Elements**: Some combinations produce non-mixable finals
- **Rarity Distribution**: Common 60%, uncommon 30%, rare 10%

#### Creative Mode Prompt Features
- **Cultural Grounding**: Real mythology, folklore, pop culture
- **Creative Balance**: Epic vs mundane outcomes
- **Logical Connections**: Clear thematic links required
- **Flexible Elements**: Allow meaningful variations
- **Quality Control**: Return null for poor combinations

### Daily Counter System

#### Implementation
```typescript
// Database-backed counter
const incrementDailyCounter = async () => {
  if (user) {
    const supabase = createClient();
    await incrementDailyCount(supabase, user.id);
    await refreshDailyCount();
  }
};

// Limit checking before API calls
const checkDailyLimit = () => {
  if (dailyCount >= 50) {
    showToast(`Daily limit reached: ${dailyCount}/50 - Upgrade for unlimited!`);
    return false;
  }
  return true;
};
```

#### Features
- **Real-time Tracking**: Updates immediately after LLM calls
- **Daily Reset**: Automatic reset at midnight (server time)
- **Persistent Storage**: Survives browser refreshes
- **Upgrade Prompts**: Encourages premium subscriptions
- **Anonymous Support**: Works without user accounts

### Achievement System

#### Hybrid Approach
- **Tag-Based**: LLM assigns category tags, game detects "first of type"
- **Milestone-Based**: Hardcoded achievements for progression
- **Database Storage**: Persistent achievement unlocks (planned)

#### Categories
**Science Mode**: Genesis, Geologist, Metallurgist, Botanist, End Collector  
**Creative Mode**: Edible Elements, First Lifeform, Metalworker, Tool Maker, Fictional Hero  
**Universal**: Alchemist Apprentice (10), Skilled Alchemist (50), Century Club (100)

### Performance Optimizations

#### React Patterns
```typescript
// Memoized Supabase client
const supabase = useMemo(() => createClient(), []);

// Callback optimization
const signInAnonymously = useCallback(async () => { ... }, [supabase]);

// Effect cleanup
useEffect(() => {
  let mounted = true;
  // ... async operations
  return () => { mounted = false; };
}, [dependencies]);
```

#### Database Optimization
- **Row Level Security**: User-isolated data access
- **Efficient Queries**: Single-user data retrieval
- **Connection Pooling**: Supabase handles scaling
- **Caching Strategy**: Session-based combination caching

## User Interface & Experience

### Responsive Design
- **Mobile-First**: Touch-optimized drag and drop
- **Breakpoint Sizing**: 48px/56px/64px element tiles
- **Adaptive Layout**: Collapsible sections and resizable areas
- **Cross-Platform**: Works on desktop, tablet, mobile

### Interactive Elements

#### Element Management
- **Drag & Drop**: Intuitive combination interface
- **Touch Support**: Mobile-optimized with haptic feedback
- **Visual Feedback**: Hover states, animations, sound effects
- **Search/Filter**: Find elements quickly in large collections
- **Sort Options**: Unlock order vs alphabetical

#### Game Controls
- **Mode Toggle**: Switch between Science/Creative (resets progress)
- **Clear Button**: Remove all elements from mixing area
- **Achievement Modal**: View unlocked achievements and end elements
- **Daily Counter**: Real-time display of usage (X/50 today)

### Visual & Audio Feedback

#### Animations
- **Element Unlocks**: Zoom-pulse for new, small-pulse for existing
- **Special Elements**: End element rotation + scale animation
- **Collision Resolution**: Smooth positioning with 300ms transitions
- **Background**: Subtle floating emoji animation (1-3 active)

#### Audio System (Web Audio API)
- **Sound Effects**: plop, pop, reward, end-element, press, click
- **Volume Optimization**: Balanced levels for each sound type
- **Browser Compatibility**: AudioContext/webkitAudioContext fallback

## Deployment & DevOps

### Vercel Integration
- **Automatic Deployments**: GitHub push triggers deploy
- **Environment Variables**: Secure API key management
- **Build Optimization**: Next.js 15 with App Router
- **CDN Distribution**: Global edge network

### Environment Configuration
```env
# OpenRouter API
OPENROUTER_API_KEY=sk-or-v1-xxx

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# App Configuration
NEXT_PUBLIC_APP_URL=https://llm-alchemy-beta2.vercel.app
```

### Database Management (Supabase)
- **Hosted PostgreSQL**: Managed database with automatic backups
- **Row Level Security**: User data isolation
- **Real-time Subscriptions**: Live data updates (planned)
- **Dashboard Management**: Web-based admin interface


## Current Status & Roadmap

### ✅ Completed Features
- **Full Next.js deployment** on Vercel
- **Supabase database integration** with user management
- **Anonymous authentication** with automatic user creation
- **Daily counter system** with database persistence
- **OpenRouter LLM integration** (Gemini)
- **Complete game functionality** (both modes, achievements)
- **Mobile-responsive design** with touch optimization
- **Performance optimization** (React hooks, memory management)
- **Per-mode game state persistence** with auto-save and cross-session restoration
- **Professional main menu system** with progress tracking and reset functionality
- **Enhanced mobile UX** with optimized layouts and direct mode switching
- **Comprehensive error handling** for database connectivity issues

### 🔄 In Progress
- **RLS Policy Configuration**: Final database security setup
- **Game State Persistence**: Store/restore discovered elements
- **Debug Log Cleanup**: Remove development console output

### 📋 Planned Features
- **Stripe Payment Integration**: Credit purchases and subscriptions
- **Account Upgrade Flow**: Anonymous to registered user migration
- **Advanced Statistics**: Discovery analytics and progress tracking
- **Social Features**: Leaderboards and sharing capabilities

### 🚀 Business Roadmap
1. **Fix RLS Policies** (should be fixed already)
2. **Implement Game Persistence** (have already been looked at)
3. **Stripe Integration** (next up)
4. **Premium Features** (has already been worked on)
5. **Exploit Prevention** (todo)
6. **Public Launch** (when everything else is done)

## Development Guidelines

### Code Quality Standards
- **TypeScript**: Strict typing throughout
- **React Best Practices**: Hooks, cleanup, performance optimization, trying to not overcomplicate things
- **Error Handling**: Graceful degradation
- **Testing**: Manual testing
- **Documentation**: Comprehensive inline comments

### Performance Requirements
- **Load Time**: < 3 seconds on mobile
- **Responsive**: 60fps animations and interactions
- **Memory**: Proper cleanup, no memory leaks
- **Database**: Efficient queries, minimal round trips
- **API**: Rate limiting, caching, error recovery

## Integration Requirements

### External Services
- **OpenRouter**: LLM API with backup models
- **Supabase**: Database, auth, real-time features
- **Vercel**: Hosting, deployment, analytics
- **Stripe**: Payment processing (incl. support for Danish MobilePay)

### Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (last 2 versions)
- **Mobile**: iOS Safari, Android Chrome
- **Features**: Touch events, Web Audio API, localStorage (localStorage is being phased out in favour of SupaBase)
- **Fallbacks**: Graceful degradation for older browsers, if possible

## Conclusion

LLM Alchemy has evolved from a Claude Artifact prototype to a production-ready Next.js application with full database integration, user management, and monetization capabilities. The game maintains its core appeal of AI-powered discovery while adding the infrastructure needed for a sustainable business model.

**Current Status**: 95% complete technical foundation, ready for final work.

**Key Achievements**: 
- Successful migration from prototype to production
- Database integration with anonymous user support
- Daily limit system for monetization
- Performance optimization and mobile support
- Clean, maintainable codebase ready for scaling

**Next Milestones**: User authentication (registration), and Stripe payment integration for full monetization capabilities.

## UI Design System

### Current Implementation (July 2025)
LLM Alchemy now features a comprehensive design system that ensures consistent styling across the entire application, addressing the original issue of fragmented individual styling.

#### Design System Components
- **Semantic Color Palette**: Primary, secondary, danger, success, warning colors with hover states
- **Button System**: Standardized button variants (btn-primary, btn-secondary, btn-surface, btn-danger, etc.)
- **Typography Scale**: Consistent text classes (text-heading, text-body, text-caption, text-muted)
- **Layout Components**: Cards, modals, forms with unified styling
- **Game-Specific Elements**: Element cards, progress bars, game mode toggles

#### Technical Implementation
- **Tailwind CSS v4**: Modern CSS framework with @theme directive configuration
- **CSS Custom Properties**: Semantic design tokens using CSS variables
- **Component Classes**: Reusable utility classes in @layer components
- **Documentation**: Complete design system guide in DESIGN_SYSTEM.md

#### Files Structure
```
├── src/app/globals.css       # Design tokens & utility classes (Tailwind v4)
├── src/app/page.tsx          # Refactored with design system classes
├── src/components/auth/AuthModal.tsx # Design system implementation
├── DESIGN_SYSTEM.md          # Complete documentation & examples
└── src/components/game/LLMAlchemy.tsx # Partially updated (common patterns)
```

#### Benefits Achieved
- **Consistency**: Unified visual language across all UI components
- **Maintainability**: Changes to design tokens propagate throughout app
- **Scalability**: Easy to add new components following established patterns
- **Developer Experience**: Clear guidelines and reusable component classes

---

**Last Updated**: July 24, 2025  
**Version**: Beta 5 (Complete Design System & Tailwind v4 Compatibility)  
**Live Game**: https://llm-alchemy-beta2.vercel.app

### 🎯 Latest Update (July 24, 2025):
**DESIGN SYSTEM COMPLETE** - Comprehensive UI overhaul with:
- ✅ Semantic color system with design tokens
- ✅ Consistent button variants and typography
- ✅ Tailwind CSS v4 compatibility (critical bug fix)
- ✅ Professional design system documentation
- ✅ Maintainable, scalable styling architecture

### 🚨 Critical Bug Fixed (July 24, 2025):
**Tailwind v4 Compatibility Issue** - Discovered project uses Tailwind CSS v4, but design system was implemented with v3 syntax:
- ✅ Removed incompatible tailwind.config.js (not used in v4)
- ✅ Updated CSS to use @import "tailwindcss" (v4 syntax)
- ✅ Migrated design tokens to @theme directive
- ✅ All design system classes now functional

Read C:\ai\LLM-Alchemy\recent-work-history.txt for more recent work.
