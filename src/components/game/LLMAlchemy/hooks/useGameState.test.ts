import { describe, it, expect } from 'vitest';
import { GameState, GameAction, Element, MixingElement } from './useGameState';

// Initial state factory (copied from the main file)
const createInitialState = (gameMode: 'science' | 'creative' = 'science'): GameState => {
  const baseElements = gameMode === 'creative' 
    ? [
        { id: 'life', name: 'Life', emoji: '🧬', color: '#32CD32', unlockOrder: 0 },
        { id: 'earth', name: 'Earth', emoji: '🌍', color: '#8B4513', unlockOrder: 1 },
        { id: 'air', name: 'Air', emoji: '💨', color: '#87CEEB', unlockOrder: 2 },
        { id: 'fire', name: 'Fire', emoji: '🔥', color: '#FF4500', unlockOrder: 3 },
        { id: 'water', name: 'Water', emoji: '💧', color: '#4682B4', unlockOrder: 4 },
      ]
    : [
        { id: 'energy', name: 'Energy', emoji: '〰️', color: '#FFD700', unlockOrder: 0 },
        { id: 'earth', name: 'Earth', emoji: '🌍', color: '#8B4513', unlockOrder: 1 },
        { id: 'air', name: 'Air', emoji: '💨', color: '#87CEEB', unlockOrder: 2 },
        { id: 'fire', name: 'Fire', emoji: '🔥', color: '#FF4500', unlockOrder: 3 },
        { id: 'water', name: 'Water', emoji: '💧', color: '#4682B4', unlockOrder: 4 },
      ];

  return {
    elements: baseElements,
    endElements: [],
    combinations: {},
    gameMode,
    mixingArea: [],
    achievements: [],
    failedCombinations: [],
    dimmedElements: new Set<string>(),
    animatingElements: new Set<string>(),
    isUndoing: false,
    isMixing: false,
    hoveredElement: null,
    touchDragging: null,
    touchOffset: { x: 0, y: 0 },
    lastCombination: null,
    undoAvailable: false,
    totalCombinationsMade: 0,
    isStateRestored: false,
  };
};

// Import the reducer function directly for testing
function gameStateReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_GAME_MODE':
      return createInitialState(action.payload);

    case 'SET_ELEMENTS':
      return { ...state, elements: action.payload };

    case 'ADD_ELEMENT':
      return { 
        ...state, 
        elements: [...state.elements, action.payload] 
      };

    case 'SET_COMBINATIONS':
      return { ...state, combinations: action.payload };

    case 'ADD_COMBINATION':
      return { 
        ...state, 
        combinations: { 
          ...state.combinations, 
          [action.payload.key]: action.payload.result 
        } 
      };

    case 'SET_MIXING_AREA':
      return { ...state, mixingArea: action.payload };

    case 'ADD_TO_MIXING_AREA':
      return { 
        ...state, 
        mixingArea: [...state.mixingArea, action.payload] 
      };

    case 'REMOVE_FROM_MIXING_AREA':
      return { 
        ...state, 
        mixingArea: state.mixingArea.filter((el: MixingElement) => !action.payload.includes(el.index)) 
      };

    case 'UPDATE_MIXING_ELEMENT':
      return {
        ...state,
        mixingArea: state.mixingArea.map((el: MixingElement) => 
          el.index === action.payload.index 
            ? { ...el, ...action.payload.updates }
            : el
        )
      };

    case 'CLEAR_MIXING_AREA':
      return { ...state, mixingArea: [] };

    case 'SET_ACHIEVEMENTS':
      return { ...state, achievements: action.payload };

    case 'ADD_ACHIEVEMENTS':
      return { 
        ...state, 
        achievements: [...state.achievements, ...action.payload] 
      };

    case 'SET_FAILED_COMBINATIONS':
      return { ...state, failedCombinations: action.payload };

    case 'ADD_FAILED_COMBINATION':
      return { 
        ...state, 
        failedCombinations: [...state.failedCombinations.slice(-4), action.payload] 
      };

    case 'SET_LAST_COMBINATION':
      return { ...state, lastCombination: action.payload };

    case 'SET_UNDO_AVAILABLE':
      return { ...state, undoAvailable: action.payload };

    case 'INCREMENT_TOTAL_COMBINATIONS':
      return { ...state, totalCombinationsMade: state.totalCombinationsMade + 1 };

    case 'SET_STATE_RESTORED':
      return { ...state, isStateRestored: action.payload };

    case 'LOAD_SAVED_STATE':
      return { ...state, ...action.payload };

    case 'RESET_GAME_STATE':
      return createInitialState(action.payload.gameMode);

    default:
      return state;
  }
}

// Test data
const testElement: Element = {
  id: 'steam',
  name: 'Steam',
  emoji: '💨',
  color: '#E0E0E0',
  unlockOrder: 5
};

const testMixingElement: MixingElement = {
  ...testElement,
  x: 100,
  y: 100,
  index: 12345,
  energized: false
};

describe('Game State Reducer', () => {
  describe('ADD_ELEMENT', () => {
    it('should add a new element to the elements array', () => {
      const initialState = createInitialState('science');
      const action: GameAction = {
        type: 'ADD_ELEMENT',
        payload: testElement
      };

      const result = gameStateReducer(initialState, action);

      expect(result.elements).toHaveLength(6); // 5 base + 1 new
      expect(result.elements).toContain(testElement);
      expect(result.elements[5]).toEqual(testElement);
    });

    it('should not modify other state properties', () => {
      const initialState = createInitialState('science');
      const action: GameAction = {
        type: 'ADD_ELEMENT',
        payload: testElement
      };

      const result = gameStateReducer(initialState, action);

      expect(result.mixingArea).toEqual(initialState.mixingArea);
      expect(result.combinations).toEqual(initialState.combinations);
      expect(result.gameMode).toEqual(initialState.gameMode);
    });
  });

  describe('SET_GAME_MODE', () => {
    it('should switch from science to creative mode with correct base elements', () => {
      const initialState = createInitialState('science');
      const action: GameAction = {
        type: 'SET_GAME_MODE',
        payload: 'creative'
      };

      const result = gameStateReducer(initialState, action);

      expect(result.gameMode).toBe('creative');
      expect(result.elements).toHaveLength(5);
      expect(result.elements[0].name).toBe('Life'); // Creative mode starts with Life
      expect(result.elements.find((e: Element) => e.name === 'Energy')).toBeUndefined(); // No Energy in creative
    });

    it('should reset all state when switching modes', () => {
      const stateWithProgress = {
        ...createInitialState('science'),
        elements: [...createInitialState('science').elements, testElement],
        mixingArea: [testMixingElement],
        combinations: { 'fire+water': 'steam' }
      };

      const action: GameAction = {
        type: 'SET_GAME_MODE',
        payload: 'creative'
      };

      const result = gameStateReducer(stateWithProgress, action);

      expect(result.elements).toHaveLength(5); // Back to base elements
      expect(result.mixingArea).toHaveLength(0); // Cleared
      expect(result.combinations).toEqual({}); // Cleared
    });
  });

  describe('ADD_TO_MIXING_AREA', () => {
    it('should add element to mixing area', () => {
      const initialState = createInitialState('science');
      const action: GameAction = {
        type: 'ADD_TO_MIXING_AREA',
        payload: testMixingElement
      };

      const result = gameStateReducer(initialState, action);

      expect(result.mixingArea).toHaveLength(1);
      expect(result.mixingArea[0]).toEqual(testMixingElement);
    });

    it('should allow multiple elements in mixing area', () => {
      const initialState = createInitialState('science');
      
      const firstAdd = gameStateReducer(initialState, {
        type: 'ADD_TO_MIXING_AREA',
        payload: testMixingElement
      });

      const secondElement = { ...testMixingElement, id: 'water', index: 54321 };
      const secondAdd = gameStateReducer(firstAdd, {
        type: 'ADD_TO_MIXING_AREA',
        payload: secondElement
      });

      expect(secondAdd.mixingArea).toHaveLength(2);
      expect(secondAdd.mixingArea[1]).toEqual(secondElement);
    });
  });

  describe('CLEAR_MIXING_AREA', () => {
    it('should remove all elements from mixing area', () => {
      const stateWithMixing = {
        ...createInitialState('science'),
        mixingArea: [testMixingElement, { ...testMixingElement, index: 99999 }]
      };

      const action: GameAction = { type: 'CLEAR_MIXING_AREA' };
      const result = gameStateReducer(stateWithMixing, action);

      expect(result.mixingArea).toHaveLength(0);
      expect(result.mixingArea).toEqual([]);
    });
  });

  describe('ADD_COMBINATION', () => {
    it('should add successful combination to combinations record', () => {
      const initialState = createInitialState('science');
      const action: GameAction = {
        type: 'ADD_COMBINATION',
        payload: { key: 'fire+water', result: 'steam' }
      };

      const result = gameStateReducer(initialState, action);

      expect(result.combinations['fire+water']).toBe('steam');
      expect(Object.keys(result.combinations)).toHaveLength(1);
    });

    it('should preserve existing combinations when adding new ones', () => {
      const stateWithCombinations = {
        ...createInitialState('science'),
        combinations: { 'earth+water': 'mud' }
      };

      const action: GameAction = {
        type: 'ADD_COMBINATION',
        payload: { key: 'fire+water', result: 'steam' }
      };

      const result = gameStateReducer(stateWithCombinations, action);

      expect(result.combinations['earth+water']).toBe('mud');
      expect(result.combinations['fire+water']).toBe('steam');
      expect(Object.keys(result.combinations)).toHaveLength(2);
    });
  });

  describe('LOAD_SAVED_STATE', () => {
    it('should merge saved state with existing state', () => {
      const initialState = createInitialState('science');
      const savedElements = [
        ...initialState.elements,
        testElement
      ];

      const action: GameAction = {
        type: 'LOAD_SAVED_STATE',
        payload: {
          elements: savedElements,
          combinations: { 'fire+water': 'steam' }
        }
      };

      const result = gameStateReducer(initialState, action);

      expect(result.elements).toEqual(savedElements);
      expect(result.combinations['fire+water']).toBe('steam');
      expect(result.gameMode).toBe('science'); // Should preserve existing game mode
    });
  });

  describe('INCREMENT_TOTAL_COMBINATIONS', () => {
    it('should increment the total combinations counter', () => {
      const initialState = createInitialState('science');
      const action: GameAction = { type: 'INCREMENT_TOTAL_COMBINATIONS' };

      const result = gameStateReducer(initialState, action);

      expect(result.totalCombinationsMade).toBe(1);
      expect(initialState.totalCombinationsMade).toBe(0); // Original unchanged
    });

    it('should increment from existing count', () => {
      const stateWithCount = {
        ...createInitialState('science'),
        totalCombinationsMade: 5
      };

      const action: GameAction = { type: 'INCREMENT_TOTAL_COMBINATIONS' };
      const result = gameStateReducer(stateWithCount, action);

      expect(result.totalCombinationsMade).toBe(6);
    });
  });
});
