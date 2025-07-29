# LLM Alchemy UI Restoration Plan (Revised - Lean Approach)

## Goal
Get the refactored game back to feature parity with the original monolith, focusing on gameplay first and cleanup second. No over-engineering.

## Current Status
- Build fails on Vercel due to TypeScript errors
- MixingAreaView already imports correct MixingElement type ✅
- LLMAlchemyRefactored has been fixed for build errors ✅
- Next: Restore missing gameplay features

## Phase A: Gameplay Parity (Core Features)

### A1. Fix TypeScript Build ✅
**Status:** COMPLETE - Fixed draggedElement type errors

### A2. Basic Element Combination
**Test:** Water + Fire = Steam works
- [ ] Verify element collision detection 
- [ ] Confirm combination logic fires correctly
- [ ] Check new element appears in list
- **If broken:** Copy mixElements logic wholesale from LLMAlchemy.tsx

### A3. Energy Element Separation
**Test:** Energy element shows "〰️" emoji and separator line works
- [ ] Verify OpenMojiDisplay handles Energy's emoji correctly
- [ ] Confirm separator line appears between regular/end elements
- **If broken:** Copy Energy rendering from original

### A4. Drag & Drop Functionality
**Test:** Can drag elements from list to mixing area
- [ ] Mouse drag from element list works
- [ ] Elements snap to position in mixing area
- [ ] Drag within mixing area works
- **If takes >2h:** Copy ALL drag handlers from LLMAlchemy.tsx verbatim

### A5. Hover Timer (500ms)
**Test:** Hovering shows reasoning popup after delay
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

## Go/No-Go Checkpoint

**Conceptual gate:** If at any point these aren't working, consider full rollback:
1. Build passes TypeScript compilation
2. Water + Fire = Steam combination works
3. Can drag elements to mixing area

Everything else can ship with known issues.

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
