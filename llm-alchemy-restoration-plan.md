# LLM Alchemy UI Restoration Plan (Revised - Lean Approach)

## Goal
Get the refactored game back to feature parity with the original monolith, focusing on gameplay first and cleanup second. No over-engineering.

## Current Status
- Build now succeeds on Vercel ✅
- TypeScript errors fixed in MixingAreaView and LLMAlchemyRefactored ✅
- Core mixing functionality restored ✅
- Next: Implement hover delays and visual feedback features

## Phase A: Gameplay Parity (Core Features)

### A1. Fix TypeScript Build ✅
**Status:** COMPLETE (2025-01-29)
- Fixed MixingAreaView missing properties (color, unlockOrder, etc.)
- Fixed draggedElement type errors in refactored component

### A2. Basic Element Combination ✅
**Status:** COMPLETE (2025-01-29)
- [x] Verify element collision detection 
- [x] Confirm combination logic fires correctly
- [x] Check new element appears in list
- **Fix Applied:** Restored full drop handler logic from original

### A3. Energy Element Separation
**Test:** Energy element shows "〰️" emoji and separator line works
- [ ] Verify OpenMojiDisplay handles Energy's emoji correctly
- [ ] Confirm separator line appears between regular/end elements
- **If broken:** Copy Energy rendering from original

### A4. Drag & Drop Functionality ✅
**Status:** COMPLETE (2025-01-29)
- [x] Mouse drag from element list works
- [x] Elements snap to position in mixing area
- [x] Drag within mixing area works
- **Fix Applied:** Restored complete onDrop logic with element detection

### A5. Hover Timer (500ms) 🚧
**Status:** IN PROGRESS - Next priority
- [ ] 500ms hover timer triggers popup
- [ ] Popup dismisses on mouse leave
- **Implementation:** Copy hover logic exactly from monolith, avoid new abstractions

### A6. Touch Support
**Test:** Basic long-press drag works on mobile
- [ ] Long press initiates drag
- [ ] Touch drag moves element
- [ ] Drop combines elements
- **Skip:** Fancy gestures, pinch/zoom

### A7. One Smoke Test
**After A2-A6 work:** Write ONE integration test that Water+Fire=Steam
- Use existing test setup if available
- Skip if test setup takes >30min

## Phase B: Code Hygiene (Deletions Only)

### B1. Remove Duplicate Types
- [ ] Delete any shadow MixingElement interfaces
- [ ] Remove unused type exports
- [ ] Consolidate Element vs MixingElement if truly duplicate

### B2. Delete Dead Code
- [ ] Remove unused hook exports from useElementInteraction
- [ ] Delete commented-out code blocks
- [ ] Remove unused state variables

### B3. Flatten Prop Drilling
- [ ] Where child components have context access, remove redundant props
- [ ] Delete prop interfaces that just pass through context data

**NOT doing:**
- No new controller hooks
- No JSDoc documentation
- No architectural changes

## Phase C: Polish & Blockers

### C1. Restore Visual/Audio
- [ ] CSS animations (mixing blur, element drop-in)
- [ ] Sound effects on interactions
- [ ] Loading animations

### C2. Fix Challenges 403
**Likely fix:** 
```sql
ALTER POLICY "Select challenges" ON public.challenges
  USING (true);  -- Allow all reads
```
- [ ] Test with anonymous user
- [ ] Verify challenge bar loads

### C3. Mobile Touch Test
- [ ] Test on one real device (iPhone or Android)
- [ ] Basic drag/drop works
- [ ] No console errors

## Go/No-Go Checkpoint ✅

**Conceptual gate:** All core features now working:
1. Build passes TypeScript compilation ✅
2. Water + Fire = Steam combination works ✅
3. Can drag elements to mixing area ✅

Proceeding with additional features and polish.

## Implementation Strategy

1. **Start with A2** - Get core mixing working
2. **If any task blocks >2h** - Copy wholesale from original
3. **Test frequently** - After each feature, verify it works
4. **Commit after each working feature** - Enable incremental rollback

## Rollback Plan

If Go/No-Go gate fails:
1. `git checkout main`
2. `cp src/components/game/LLMAlchemy.tsx src/components/game/LLMAlchemy.tsx.backup`
3. Continue with monolith until a better refactor strategy emerges

## Not In Scope
- Performance optimization (React.memo, useMemo)
- Comprehensive test coverage  
- Documentation
- New architectural patterns
- Perfect code organization

## Success Criteria
- Game is playable
- No TypeScript errors
- Core features work
- Can ship to users

Remember: This is a small indie game, not enterprise software. Fun > Clean Code.
