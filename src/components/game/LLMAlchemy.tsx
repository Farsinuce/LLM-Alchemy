import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Sparkles, Zap, X, GripHorizontal, User } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

// Type definitions
interface Element {
  id: string;
  name: string;
  emoji: string;
  color: string;
  unlockOrder: number;
  rarity?: string;
  reasoning?: string;
  tags?: string[];
  isEndElement?: boolean;
}

interface MixingElement extends Element {
  x: number;
  y: number;
  index: number;
  energized: boolean;
  isAnimating?: boolean;
  fromMixingArea?: boolean;
  mixIndex?: number | null;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  unlocked: number;
}

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
  y: number;
  directionX: number;
  directionY: number;
  speed: number;
  opacity: number;
  maxOpacity: number;
  lifespan: number;
  age: number;
}

interface ReasoningPopup {
  element: Element;
  x: number;
  y: number;
  fromHover: boolean;
}

interface ShowUnlock extends Element {
  isNew: boolean;
  achievement?: Achievement | null;
}

interface MixingElements {
  elements: Element[];
  indices: number[];
}

// Type for window.webkitAudioContext
interface WindowWithWebkit extends Window {
  webkitAudioContext?: typeof AudioContext;
}

// Constants
const CONSTANTS = {
  HOVER_DELAY: 500,
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 3000,
  ELEMENT_SIZES: { sm: 48, md: 56, lg: 64 },
  BREAKPOINTS: { sm: 640, md: 768 },
  FLOATING_EMOJI_UPDATE: 100,
  REASONING_POPUP_DELAY: 50,
  COLLISION_SPACING: 8,
  MAX_COLLISION_DISTANCE: 300,
  COLLISION_POSITIONS: 16,
  SOUND_VOLUMES: {
    press: 0.1,
    plop: 0.3,
    pop: 0.4,
    reward: 0.3,
    endElement: 0.35,
    click: 0.2
  }
};

// Utility functions
const isValidHexColor = (color: string): boolean => /^#[0-9A-F]{6}$/i.test(color);
const sanitizeColor = (color: string): string => isValidHexColor(color) ? color : '#808080';
const getElementSize = () => {
  if (window.innerWidth < CONSTANTS.BREAKPOINTS.sm) return CONSTANTS.ELEMENT_SIZES.sm;
  if (window.innerWidth < CONSTANTS.BREAKPOINTS.md) return CONSTANTS.ELEMENT_SIZES.md;
  return CONSTANTS.ELEMENT_SIZES.lg;
};

// Detect if the device has touch capabilities
const isTouchDevice =
  typeof window !== "undefined" &&
  (("ontouchstart" in window) || navigator.maxTouchPoints > 0);

const LLMAlchemy = () => {
  const { data: session } = useSession();
  const [gameMode, setGameMode] = useState<string>('science'); // 'science' or 'creative'
  const [elements, setElements] = useState<Element[]>([
    { id: 'energy', name: 'Energy', emoji: '〰️', color: '#FFD700', unlockOrder: 0 },
    { id: 'earth', name: 'Earth', emoji: '🌍', color: '#8B4513', unlockOrder: 1 },
    { id: 'air', name: 'Air', emoji: '💨', color: '#87CEEB', unlockOrder: 2 },
    { id: 'fire', name: 'Fire', emoji: '🔥', color: '#FF4500', unlockOrder: 3 },
    { id: 'water', name: 'Water', emoji: '💧', color: '#4682B4', unlockOrder: 4 },
  ]);
  const [endElements, setEndElements] = useState<Element[]>([]);
  const [mixingArea, setMixingArea] = useState<MixingElement[]>([]);
  const [sortMode, setSortMode] = useState<string>('unlock');
  const [combinations, setCombinations] = useState<Record<string, string | null>>({});
  const [showUnlock, setShowUnlock] = useState<ShowUnlock | null>(null);
  const [mixingElements, setMixingElements] = useState<MixingElements | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [hoveredElement, setHoveredElement] = useState<number | null>(null);
  const [isMixing, setIsMixing] = useState<boolean>(false);
  const [hoveredUIElement, setHoveredUIElement] = useState<string | null>(null);
  const [touchDragging, setTouchDragging] = useState<MixingElement | null>(null);
  const [touchOffset, setTouchOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [listHeight, setListHeight] = useState<number>(192);
  const [isDraggingDivider, setIsDraggingDivider] = useState<boolean>(false);
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [toast, setToast] = useState<string>('');
  const [shakeElement, setShakeElement] = useState<string | null>(null);
  const [popElement, setPopElement] = useState<string | null>(null);
  const [showModeConfirm, setShowModeConfirm] = useState<boolean>(false);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [dragStartHeight, setDragStartHeight] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [unlockAnimationStartTime, setUnlockAnimationStartTime] = useState<number | null>(null);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [reasoningPopup, setReasoningPopup] = useState<ReasoningPopup | null>(null);
  const [showAchievements, setShowAchievements] = useState<boolean>(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  
  const draggedElement = useRef<MixingElement | null>(null);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const floatingEmojiId = useRef<number>(0);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup effects for memory leaks
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Achievement checking function
  const checkAchievements = (newElement: Element, allElements: Element[], allEndElements: Element[]): Achievement[] => {
    const newAchievements: Achievement[] = [];
    
    try {
      // Tag-based achievement detection
      if (newElement.tags && Array.isArray(newElement.tags)) {
        for (const tag of newElement.tags) {
          let achievementId: string | null = null;
          let achievementName: string = '';
          let achievementDescription: string = '';
          let achievementEmoji: string = '🏆';
          
          // Check if this is the first element with this tag
          const hasExistingWithTag = [...allElements, ...allEndElements]
            .filter(e => e.id !== newElement.id)
            .some(e => e.tags && e.tags.includes(tag));
          
          if (!hasExistingWithTag) {
            // Map tags to achievements based on game mode
            if (gameMode === 'creative') {
              switch (tag) {
                case 'food':
                  achievementId = 'first-food';
                  achievementName = 'Edible Elements';
                  achievementDescription = 'Created your first food item';
                  achievementEmoji = '🍎';
                  break;
                case 'lifeform':
                case 'creature':
                case 'animal':
                  achievementId = 'first-lifeform';
                  achievementName = 'First Lifeform!';
                  achievementDescription = 'Brought life into existence';
                  achievementEmoji = '🧬';
                  break;
                case 'metal':
                  achievementId = 'first-metal';
                  achievementName = 'Metalworker';
                  achievementDescription = 'Forged your first metal';
                  achievementEmoji = '⚒️';
                  break;
                case 'tool':
                  achievementId = 'first-tool';
                  achievementName = 'Tool Maker';
                  achievementDescription = 'Crafted your first tool';
                  achievementEmoji = '🔨';
                  break;
                case 'fictional-character':
                case 'character':
                  achievementId = 'first-character';
                  achievementName = 'Fictional Hero';
                  achievementDescription = 'Summoned a legendary character';
                  achievementEmoji = '🦸';
                  break;
                case 'disaster':
                  achievementId = 'first-disaster';
                  achievementName = 'Chaos Alchemist';
                  achievementDescription = 'Unleashed destructive forces';
                  achievementEmoji = '💥';
                  break;
              }
            } else { // Science mode
              switch (tag) {
                case 'lifeform':
                case 'organism':
                case 'microorganism':
                  achievementId = 'first-lifeform';
                  achievementName = 'Genesis';
                  achievementDescription = 'Created the first living organism';
                  achievementEmoji = '🧬';
                  break;
                case 'mineral':
                case 'compound':
                  achievementId = 'first-mineral';
                  achievementName = 'Geologist';
                  achievementDescription = 'Discovered your first mineral compound';
                  achievementEmoji = '💎';
                  break;
                case 'metal':
                  achievementId = 'first-metal';
                  achievementName = 'Metallurgist';
                  achievementDescription = 'Refined your first metal';
                  achievementEmoji = '⚒️';
                  break;
                case 'plant':
                  achievementId = 'first-plant';
                  achievementName = 'Botanist';
                  achievementDescription = 'Cultivated plant life';
                  achievementEmoji = '🌱';
                  break;
              }
            }
            
            // Add the achievement if we found a match and don't already have it
            if (achievementId && !achievements.find(a => a.id === achievementId)) {
              newAchievements.push({
                id: achievementId,
                name: achievementName,
                description: achievementDescription,
                emoji: achievementEmoji,
                unlocked: Date.now()
              });
            }
          }
        }
      }
      
      // Milestone achievements using passed arrays
      const totalElements = allElements.length + allEndElements.length;
      
      // 10 elements achievement
      if (totalElements >= 10 && !achievements.find(a => a.id === 'alchemist-apprentice')) {
        newAchievements.push({
          id: 'alchemist-apprentice',
          name: 'Alchemist Apprentice',
          description: 'Discovered 10 elements',
          emoji: '🎓',
          unlocked: Date.now()
        });
      }
      
      // 50 elements achievement
      if (totalElements >= 50 && !achievements.find(a => a.id === 'skilled-alchemist')) {
        newAchievements.push({
          id: 'skilled-alchemist',
          name: 'Skilled Alchemist',
          description: 'Discovered 50 elements',
          emoji: '🧙',
          unlocked: Date.now()
        });
      }
      
      // 100 elements achievement
      if (totalElements >= 100 && !achievements.find(a => a.id === 'century-club')) {
        newAchievements.push({
          id: 'century-club',
          name: 'Century Club',
          description: 'Discovered 100 elements',
          emoji: '💯',
          unlocked: Date.now()
        });
      }
      
      // End element achievements (Science mode only)
      if (gameMode === 'science') {
        if (allEndElements.length >= 1 && !achievements.find(a => a.id === 'dead-end')) {
          newAchievements.push({
            id: 'dead-end',
            name: 'End of Branch',
            description: 'Discovered your first End Element',
            emoji: '🔚',
            unlocked: Date.now()
          });
        }
        
        if (allEndElements.length >= 10 && !achievements.find(a => a.id === 'end-collector')) {
          newAchievements.push({
            id: 'end-collector',
            name: 'End Collector',
            description: 'Collected 10 End Elements',
            emoji: '🏁',
            unlocked: Date.now()
          });
        }
      }
      
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
    
    // Update achievements state if we have new ones
    if (newAchievements.length > 0) {
      setAchievements(prevAchievements => [...prevAchievements, ...newAchievements]);
    }
    
    return newAchievements;
  };

  useEffect(() => {
    // Initialize Web Audio API
    audioContext.current = new (window.AudioContext || (window as WindowWithWebkit).webkitAudioContext!)();
  }, []);

  useEffect(() => {
    // Set proper starting elements based on game mode
    if (gameMode === 'creative' && elements.find(e => e.name === 'Energy')) {
      setElements([
        { id: 'life', name: 'Life', emoji: '🌱', color: '#32CD32', unlockOrder: 0 },
        ...elements.filter(e => e.name !== 'Energy')
      ]);
      // Clear floating emojis to restart with new mode elements
      setFloatingEmojis([]);
    } else if (gameMode === 'science' && elements.find(e => e.name === 'Life')) {
      setElements([
        { id: 'energy', name: 'Energy', emoji: '〰️', color: '#FFD700', unlockOrder: 0 },
        ...elements.filter(e => e.name !== 'Life')
      ]);
      // Clear floating emojis to restart with new mode elements
      setFloatingEmojis([]);
    }
  }, [gameMode]);

  // Add global touch move and end handlers
  useEffect(() => {
    const handleGlobalTouchMove = (e: TouchEvent) => {
      handleTouchMove(e);
      handleDividerTouchMove(e);
    };
    
    const handleGlobalTouchEnd = (e: TouchEvent) => {
      handleTouchEnd(e);
      handleDividerTouchEnd();
    };
    
    if (touchDragging || isDraggingDivider) {
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd);
      
      return () => {
        document.removeEventListener('touchmove', handleGlobalTouchMove);
        document.removeEventListener('touchend', handleGlobalTouchEnd);
      };
    }
  }, [touchDragging, isDraggingDivider, mixingArea]);

  const playSound = (type: string) => {
    if (!audioContext.current) return;
    
    const osc = audioContext.current.createOscillator();
    const gainNode = audioContext.current.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioContext.current.destination);
    
    const now = audioContext.current.currentTime;
    
    switch(type) {
      case 'plop':
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'pop':
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      case 'reward':
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      case 'end-element':
        osc.frequency.setValueAtTime(440, now); // A4
        osc.frequency.setValueAtTime(554.37, now + 0.15); // C#5
        osc.frequency.setValueAtTime(659.25, now + 0.3); // E5
        gainNode.gain.setValueAtTime(0.35, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case 'press':
        osc.frequency.setValueAtTime(200, now);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      case 'click':
        osc.frequency.setValueAtTime(1000, now);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
        break;
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const showReasoningPopup = (element: Element, event: React.MouseEvent | React.TouchEvent) => {
    if (!element.reasoning) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    setReasoningPopup({
      element,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      fromHover: event.type === 'mouseenter'
    });
  };

  const hideReasoningPopup = () => {
    setReasoningPopup(null);
  };

  const handleElementClick = (element: Element, event: React.MouseEvent) => {
    // Always allow clicks to show reasoning if element has it
    if (element.reasoning) {
      event.preventDefault();
      event.stopPropagation();
      showReasoningPopup(element, event);
    }
  };

  const handleElementMouseEnter = (element: Element, event: React.MouseEvent) => {
    // Show popup on hover for desktop with 500ms delay
    if (!isTouchDevice && element.reasoning) {
      // Clear any existing timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      // Capture the bounding rect immediately
      const rect = event.currentTarget.getBoundingClientRect();
      // Set 500ms delay
      hoverTimeoutRef.current = setTimeout(() => {
        // Create a synthetic event with the captured rect
        const syntheticEvent = {
          currentTarget: {
            getBoundingClientRect: () => rect
          },
          type: 'mouseenter'
        };
        showReasoningPopup(element, syntheticEvent as any);
      }, 500);
    }
  };

  const handleElementMouseLeave = () => {
    // Clear timeout if leaving before 500ms
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // Hide popup if it was from hover
    if (reasoningPopup && reasoningPopup.fromHover) {
      hideReasoningPopup();
    }
  };

  const getContrastColor = (hexcolor: string) => {
    const r = parseInt(hexcolor.slice(1, 3), 16);
    const g = parseInt(hexcolor.slice(3, 5), 16);
    const b = parseInt(hexcolor.slice(5, 7), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#FFFFFF';
  };

  // Optimized collision detection with cached element size
  const elementSize = useMemo(() => getElementSize(), []);

  const checkCollision = useCallback((x1: number, y1: number, x2: number, y2: number, size: number | null = null) => {
    const currentSize = size || elementSize;
    return Math.abs(x1 - x2) < currentSize && Math.abs(y1 - y2) < currentSize;
  }, [elementSize]);

  const hasCollisionAt = useCallback((x: number, y: number, excludeIndex: number | null = null) => {
    const rect = dropZoneRef.current?.getBoundingClientRect();
    if (!rect) return false;
    
    // Check boundaries
    if (x < 0 || y < 0 || x + elementSize > rect.width || y + elementSize > rect.height) {
      return true; // Out of bounds
    }
    
    // Check collision with existing elements
    return mixingArea.some(el => 
      el.index !== excludeIndex && checkCollision(x, y, el.x, el.y)
    );
  }, [elementSize, mixingArea, checkCollision]);

  const findBestPosition = useCallback((centerX: number, centerY: number, excludeIndex: number | null = null) => {
    const spacing = elementSize + CONSTANTS.COLLISION_SPACING;
    
    // Try center first
    if (!hasCollisionAt(centerX, centerY, excludeIndex)) {
      return { x: centerX, y: centerY };
    }
    
    // Spiral outward from center
    for (let distance = spacing; distance < CONSTANTS.MAX_COLLISION_DISTANCE; distance += spacing * 0.7) {
      // Try positions around each circle
      for (let i = 0; i < CONSTANTS.COLLISION_POSITIONS; i++) {
        const angle = (i / CONSTANTS.COLLISION_POSITIONS) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;
        
        if (!hasCollisionAt(x, y, excludeIndex)) {
          return { x, y };
        }
      }
    }
    
    // Fallback: find any available position in grid pattern
    const rect = dropZoneRef.current?.getBoundingClientRect();
    if (rect) {
      for (let y = 0; y < rect.height - elementSize; y += spacing) {
        for (let x = 0; x < rect.width - elementSize; x += spacing) {
          if (!hasCollisionAt(x, y, excludeIndex)) {
            return { x, y };
          }
        }
      }
    }
    
    // Final fallback: return center even if it collides
    return { x: centerX, y: centerY };
  }, [elementSize, hasCollisionAt]);

  const resolveCollisions = (newX: number, newY: number, excludeIndex: number | null = null) => {
    return findBestPosition(newX, newY, excludeIndex);
  };

  const animateElementToPosition = (elementIndex: number, newX: number, newY: number) => {
    // Mark element as animating and update position
    setMixingArea(prevArea => 
      prevArea.map(el => 
        el.index === elementIndex 
          ? { ...el, x: newX, y: newY, isAnimating: true }
          : el
      )
    );
    
    // Remove animation flag after transition completes
    setTimeout(() => {
      setMixingArea(prevArea => 
        prevArea.map(el => 
          el.index === elementIndex 
            ? { ...el, isAnimating: false }
            : el
        )
      );
    }, 300); // Match transition duration
  };

  // Modular prompt building system - Fixed stale closure issue
  const buildSharedSections = useCallback((rarityTarget: string, currentGameMode: string) => ({
    raritySystem: `RARITY SYSTEM (Target: ${rarityTarget}):
- "common" = the most expected/obvious outcome (60% chance)
- "uncommon" = a less obvious but plausible outcome (30% chance)
- "rare" = an unexpected but valid outcome (10% chance)
- Generate outcome with ${rarityTarget} rarity for this combination`,

    reasoningRequirement: `REASONING REQUIREMENT:
- Every valid result needs a brief (15-60 characters) explanation
- Keep explanations simple and educational`,

    responseFormat: `Respond with ONLY a valid JSON object, no other text:
{
  "result": "Element Name" or null,
  "emoji": "appropriate emoji", 
  "color": "hex color code",
  "rarity": "common" or "uncommon" or "rare",${currentGameMode === 'science' ? '\n  "isEndElement": true or false,' : ''}
  "reasoning": "brief explanation",
  "tags": ["category1", "category2"]
}`
  }), []);

  const buildSciencePrompt = (elements: Element[], mixingElements: Element[], shared: any, recentText: string) => {
    return `Generate science-based element combinations.

Current unlocked elements: ${elements.map(e => e.name).join(', ')}
Mixing: ${mixingElements.map(e => e.name).join(' + ')}

CORE RULES - Scientific Accuracy:
1. Generate ONLY common, well-known scientific outcomes (high school level understanding)
2. NEVER create obscure scientific terms (NO: Heterokaryon, Plasmogamy, etc.)
3. Outcomes must have clear SCIENTIFIC CONNECTIONS - results should logically follow from combination based on real scientific principles
4. Examples of GOOD outcomes: Rock, Sand, Steam, Cloud, Plant, Tree, Metal, Glass
5. Mixing the same element with itself CAN produce results (e.g., Fungi + Fungi = Mycelium)

MODE CONSTRAINTS - Scale & Scope:
SCALE LIMITS:
- Never generate outcomes larger than a building or smaller than a molecule
- If a combination would create something too large, return a fragment instead
- Examples: Rock + Rock = Gravel (not Boulder), Water + Water = Pool (not Ocean)

TECHNOLOGY PREFERENCE:
- Prefer natural outcomes: Geode, Fossil, Microbe, Plant
- Advanced technology (Computer, Phone) → MUST be End Elements
- Guide toward biology, geology, chemistry over technology

COMBINATION RULES:
SIMILAR ELEMENTS RULE:
- If outcome is too similar to existing elements, return the existing element name
- Creates natural "rediscovery" rather than null responses

ENDLESS CHAINS PREVENTION:
- Focus on tangible ELEMENTS rather than phenomena progressions
- Avoid very similar variations: Rain vs Drizzle, Mist vs Fog
- Water→Steam→Cloud is GOOD (distinct states)
- Rain→Drizzle→Sprinkle is BAD (minor variations)
- Return null when results become nonsensical

ENERGY TRANSFORMATION:
- Energy + element must create NEW substance, not adjective version
- Energy + Rock = Crystal (not "Energized Rock")
- If no valid transformation exists, return null

END ELEMENTS (evolutionary dead-ends):
- Extremophile, Fish, Arthropod (broad categories)
- Diamond, Obsidian (final mineral forms)  
- Computer, Book (advanced human tech)

${shared.raritySystem}

${shared.reasoningRequirement}
- Focus on the mechanism: "Heat evaporates liquid" or "Pressure crystallizes minerals"

TAGS REQUIREMENT:
- Assign 1-3 relevant tags for achievement tracking
- Science tags: "lifeform", "organism", "mineral", "compound", "metal", "plant", "animal", "chemical", "gas", "liquid", "solid"
- Achievement tags: "food", "tool", "disaster", "danger", "catastrophe"

Recent combinations: ${recentText}

${shared.responseFormat}`;
  };

  const buildCreativePrompt = (elements: Element[], mixingElements: Element[], shared: any, recentText: string) => {
    return `Generate creative element combinations.

Current unlocked elements: ${elements.map(e => e.name).join(', ')}
Mixing: ${mixingElements.map(e => e.name).join(' + ')}

CORE RULES - Creative Connections:
1. Generate outcomes from real sources: mythology, animals, plants, folklore, pop culture
2. Outputs MUST have clear thematic/conceptual links to ALL inputs
3. If no logical connection exists, return null instead of forcing a result
4. BALANCE epic vs mundane: Not everything should be legendary

MODE CONSTRAINTS - Grounded Creativity:
SIMILAR ELEMENTS RULE (Flexible):
- Allow meaningful variations when they represent distinct concepts
- Example: "Storm" and "Hurricane" are different enough to coexist
- But avoid pure adjective versions: "Flying Unicorn" → return "Pegasus" instead

COMPOUND WORDS:
- Allowed when iconic: "Storm Cloud" ✓, "Ice Cream" ✓
- NOT allowed for adjective combos: "Flying Unicorn" ✗

COMBINATION RULES:
TRANSFORMATION FOCUS:
- Make creative leaps to distinct entities
- "Unicorn → Pegasus" GOOD, "Unicorn → Flying Unicorn" BAD
- Everything must be recognizable to general audience

LOGICAL CONNECTIONS:
- Consider: shared properties, cultural associations, functional relationships
- Example: Fire + Earth = "Pottery" (mundane) OR "Phoenix" (epic)

${shared.raritySystem}

${shared.reasoningRequirement}
- Focus on the conceptual bridge between inputs and output

TAGS REQUIREMENT:
- Assign 1-3 relevant tags for achievement tracking
- Creative tags: "food", "lifeform", "creature", "animal", "metal", "tool", "fictional-character", "object", "place", "concept"
- Achievement tags: "disaster", "danger", "catastrophe"

Recent combinations: ${recentText}

${shared.responseFormat}`;
  };

  const generateCombination = async (elem1: Element, elem2: Element, elem3: Element | null = null) => {
    // Enhanced session caching - check existing combinations first
    const sortedNames = [elem1.name, elem2.name, elem3?.name].filter(Boolean).sort().join('+');
    const mixKey = elem3 ? `${sortedNames}+Energy` : sortedNames;
    
    // Return cached result if it exists
    if (combinations[mixKey] !== undefined) {
      const cachedResult = combinations[mixKey];
      if (cachedResult) {
        // Find the full element data
        const existingElement = elements.find(e => e.name === cachedResult) || 
                                endElements.find(e => e.name === cachedResult);
        return existingElement ? { 
          result: existingElement.name, 
          emoji: existingElement.emoji, 
          color: existingElement.color, 
          rarity: existingElement.rarity,
          reasoning: existingElement.reasoning || '',
          tags: existingElement.tags || [],
          isEndElement: existingElement.isEndElement || false
        } : { result: null };
      }
      return { result: null };
    }
    
    // Hardcoded combinations for life form path
    if (gameMode === 'science') {
      // Microbe creation
      if ((sortedNames.includes('Mud') || sortedNames.includes('Clay') || sortedNames.includes('Nutrient')) && 
          sortedNames.includes('Air') && sortedNames.includes('Energy')) {
        return { 
          result: 'Microbe', 
          emoji: '🦠', 
          color: '#90EE90', 
          rarity: 'common', 
          reasoning: 'Energy activates organic matter in suitable environment',
          tags: ['lifeform', 'microorganism'],
          isEndElement: false
        };
      }
      
      // Microbe branches
      if (sortedNames === 'Energy+Microbe+Water' || sortedNames === 'Air+Energy+Microbe' || sortedNames === 'Earth+Energy+Microbe') {
        return { 
          result: 'Algae', 
          emoji: '🌿', 
          color: '#228B22', 
          rarity: 'common', 
          reasoning: 'Microbes evolve photosynthesis in favorable conditions',
          tags: ['lifeform', 'plant', 'organism'],
          isEndElement: false
        };
      }
      if (sortedNames === 'Microbe+Water') {
        return { 
          result: 'Protozoa', 
          emoji: '🔬', 
          color: '#4169E1', 
          rarity: 'common', 
          reasoning: 'Single-celled organisms thrive in aquatic environment',
          tags: ['lifeform', 'microorganism'],
          isEndElement: false
        };
      }
      if (sortedNames === 'Microbe+Mud' || sortedNames === 'Compost+Microbe') {
        return { 
          result: 'Fungi', 
          emoji: '🍄', 
          color: '#8B4513', 
          rarity: 'common', 
          reasoning: 'Decomposer organisms break down organic matter',
          tags: ['lifeform', 'organism'],
          isEndElement: false
        };
      }
    }

    // Randomized rarity system
    const roll = Math.random();
    let rarityTarget;
    if (roll < 0.6) rarityTarget = 'common';
    else if (roll < 0.9) rarityTarget = 'uncommon';
    else rarityTarget = 'rare';

    // Keep only last 10 combinations for context (prevents endless chains)
    const recentCombinations = Object.entries(combinations).slice(-10);
    const recentText = recentCombinations.length > 0 
      ? recentCombinations.map(([mix, result]) => `${mix}=${result || 'null'}`).join(', ')
      : 'none';

    // Build shared sections
    const sharedSections = buildSharedSections(rarityTarget, gameMode);
    
    // Prepare mixing elements for prompt
    const mixingElements = [elem1, elem2, elem3].filter((e): e is Element => e !== null);
    
    // Build mode-specific prompt
    const prompt = gameMode === 'science' 
      ? buildSciencePrompt(elements, mixingElements, sharedSections, recentText)
      : buildCreativePrompt(elements, mixingElements, sharedSections, recentText);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, gameMode })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const parsedResult = await response.json();
      
      // Check if we got an error response
      if (parsedResult.error) {
        console.error('API Error:', parsedResult.error);
        showToast('API Error: ' + parsedResult.error);
        return { result: null, error: true };
      }
      
      // Ensure all required fields exist
      return {
        result: parsedResult.result || null,
        emoji: parsedResult.emoji || '✨',
        color: parsedResult.color || '#808080',
        rarity: parsedResult.rarity || 'common',
        reasoning: parsedResult.reasoning || '',
        tags: parsedResult.tags || [],
        isEndElement: parsedResult.isEndElement || false
      };
      
    } catch (error) {
      console.error('Error generating combination:', error);
      
      // Handle different types of errors with specific messages
      if (error instanceof TypeError && error.message.includes('fetch')) {
        showToast('Network Error: Check connection and try again');
      } else if (error instanceof SyntaxError) {
        showToast('API Error: Invalid response format');
      } else {
        showToast('LLM Error: Try mixing different elements');
      }
      
      return { result: null, error: true };
    }
  };

  const handleDragStart = (e: React.DragEvent, element: Element, fromMixingArea = false, index: number | null = null) => {
    // Don't allow dragging End Elements
    if (element.isEndElement) return;
    
    hideReasoningPopup();
    draggedElement.current = { 
      ...element, 
      fromMixingArea, 
      mixIndex: index,
      x: 0,
      y: 0,
      index: 0,
      energized: false
    } as MixingElement;
    setIsDragging(true);
    setHoveredUIElement(null); // Clear any UI hover state when starting to drag
    e.dataTransfer.effectAllowed = 'copy';
    playSound('press');
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setHoveredElement(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleElementHover = (element: MixingElement) => {
    if (isDragging && draggedElement.current && element.index !== draggedElement.current.mixIndex) {
      setHoveredElement(element.index);
    }
  };

  const handleElementLeave = () => {
    setHoveredElement(null);
  };

  const handleDropOnMixingArea = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedElement.current || isMixing) return;

    const rect = dropZoneRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const targetElement = mixingArea.find(el => {
      const elRect = document.getElementById(`mixing-${el.id}-${el.index}`)?.getBoundingClientRect();
      if (!elRect) return false;
      return e.clientX >= elRect.left && e.clientX <= elRect.right &&
             e.clientY >= elRect.top && e.clientY <= elRect.bottom;
    });

    if (targetElement && targetElement.index !== draggedElement.current.mixIndex) {
      await mixElements(draggedElement.current, targetElement);
    } else if (!targetElement) {
      playSound('plop');
      const offset = window.innerWidth < 640 ? 24 : window.innerWidth < 768 ? 28 : 32;
      if (draggedElement.current.fromMixingArea) {
        const newPos = resolveCollisions(x - offset, y - offset, draggedElement.current!.mixIndex);
        setMixingArea(mixingArea.map(el => 
          el.index === draggedElement.current!.mixIndex
            ? { ...el, x: newPos.x, y: newPos.y }
            : el
        ));
      } else {
        const newPos = resolveCollisions(x - offset, y - offset);
        const newElement = {
          ...draggedElement.current,
          x: newPos.x,
          y: newPos.y,
          index: Date.now(),
          energized: false
        };
        setMixingArea([...mixingArea, newElement]);
      }
    }
    
    draggedElement.current = null;
    setHoveredElement(null);
  };

  const mixElements = async (elem1: MixingElement, elem2: MixingElement) => {
    if (isMixing) return;
    
    playSound('pop');
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 10, 10]);
    }
    
    const isEnergyMix = elem1.name === 'Energy' || elem2.energized;
    const targetEl = elem2.energized ? elem2 : (elem2.name === 'Energy' ? elem1 : elem2);
    
    if (elem1.name === 'Energy' && !elem2.energized) {
      setMixingArea(mixingArea.map(el => 
        el.index === targetEl.index 
          ? { ...el, energized: true }
          : el
      ).filter(el => el.index !== elem1.index && el.index !== (elem1.fromMixingArea ? elem1.mixIndex : -1)));
    } else if (elem2.energized) {
      const energizedBase = { ...elem2, name: elem2.name, energized: undefined } as Element;
      await performMix([energizedBase, elem1], true, elem1.index, elem2.index);
    } else {
      await performMix([elem1, elem2], false, elem1.index, elem2.index);
    }
  };

  const performMix = async (elementsToMix: Element[], hasEnergy = false, ...indicesToRemove: number[]) => {
    setIsMixing(true);
    setMixingElements({ elements: elementsToMix, indices: indicesToRemove });
    
    // Clear touch dragging state to ensure mobile elements disappear
    setTouchDragging(null);
    setTouchOffset({ x: 0, y: 0 });
    
    // Immediately remove elements from mixing area
    setMixingArea(mixingArea.filter(el => !indicesToRemove.includes(el.index)));
    
    const sortedNames = elementsToMix.map(e => e.name).sort().join('+');
    const mixKey = hasEnergy ? `${sortedNames}+Energy` : sortedNames;
    
    if (combinations[mixKey]) {
      const existingResult = combinations[mixKey];
      if (existingResult) {
        const existingElement = elements.find(e => e.name === existingResult) || 
                                endElements.find(e => e.name === existingResult);
        if (existingElement) {
          setShowUnlock({ ...existingElement, isNew: false });
          if (!existingElement.isEndElement) {
            setShakeElement(existingElement.id);
            setTimeout(() => {
              setShowUnlock(null);
              setShakeElement(null);
            }, 1500);
          } else {
            setTimeout(() => setShowUnlock(null), 1500);
          }
        }
      } else {
        showToast('No reaction');
      }
      setMixingElements(null);
      setIsMixing(false);
      return;
    }

    const result = await generateCombination(elementsToMix[0], elementsToMix[1], hasEnergy ? { name: 'Energy' } as Element : null);
    
    if (result.error) {
      setMixingElements(null);
      setIsMixing(false);
      return;
    }
    
    if (result.result) {
      const existing = elements.find(e => e.name.toLowerCase() === result.result.toLowerCase()) ||
                      endElements.find(e => e.name.toLowerCase() === result.result.toLowerCase());
      
      if (existing) {
        setShowUnlock({ ...existing, isNew: false });
        if (!existing.isEndElement) {
          setShakeElement(existing.id);
          setTimeout(() => {
            setShowUnlock(null);
            setShakeElement(null);
          }, 1500);
        } else {
          setTimeout(() => setShowUnlock(null), 1500);
        }
      } else {
        const newElement = {
          id: result.result.toLowerCase().replace(/\s+/g, '-'),
          name: result.result,
          emoji: result.emoji || '✨',
          color: result.color || '#808080',
          unlockOrder: elements.length + endElements.length,
          rarity: result.rarity,
          reasoning: result.reasoning || '',
          tags: result.tags || [],
          isEndElement: result.isEndElement || false
        };
        
        // Update arrays first
        const updatedElements = result.isEndElement ? elements : [...elements, newElement];
        const updatedEndElements = result.isEndElement ? [...endElements, newElement] : endElements;
        
        if (result.isEndElement) {
          playSound('end-element');
          setEndElements(updatedEndElements);
        } else {
          playSound('reward');
          setElements(updatedElements);
          setPopElement(newElement.id);
        }
        
        // Check for achievements with updated arrays (safe)
        let contextualAchievement = null;
        try {
          const allAchievements = checkAchievements(newElement, updatedElements, updatedEndElements);
          contextualAchievement = allAchievements.find(a => a.id.startsWith('first-'));
        } catch (achievementError) {
          console.error('Achievement check failed:', achievementError);
          // Continue without achievements - don't block the unlock flow
        }
        
        setShowUnlock({ 
          ...newElement, 
          isNew: true,
          achievement: contextualAchievement || null
        });
        setUnlockAnimationStartTime(Date.now());
        
        if (!result.isEndElement) {
          // Add new element to mixing area center with collision detection IMMEDIATELY
          const rect = dropZoneRef.current!.getBoundingClientRect();
          const offset = window.innerWidth < 640 ? 24 : window.innerWidth < 768 ? 28 : 32;
          const centerX = rect.width / 2 - offset;
          const centerY = rect.height / 2 - offset;
          const newPos = resolveCollisions(centerX, centerY);
          
          const centerElement = {
            ...newElement,
            x: newPos.x,
            y: newPos.y,
            index: Date.now() + 1000,
            energized: false
          };
          
          setMixingArea(current => [...current, centerElement]);
          
          setTimeout(() => {
            setShowUnlock(null);
            setPopElement(null);
            setUnlockAnimationStartTime(null);
          }, 3000);
        } else {
          setTimeout(() => {
            setShowUnlock(null);
            setUnlockAnimationStartTime(null);
          }, 3000);
        }
      }
      
      setCombinations({ ...combinations, [mixKey]: result.result });
    } else {
      showToast('No reaction');
      setCombinations({ ...combinations, [mixKey]: null });
    }
    
    setMixingElements(null);
    setIsMixing(false);
  };

  const handleTouchStart = (e: React.TouchEvent, element: Element, fromMixingArea = false, index: number | null = null) => {
    if (element.isEndElement) return;
    
    const touch = e.touches[0];
    
    // Record touch start for tap vs drag detection
    setTouchStartTime(Date.now());
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    
    hideReasoningPopup();
    
    setTouchDragging({ 
      ...element, 
      fromMixingArea, 
      mixIndex: index,
      x: 0,
      y: 0,
      index: 0,
      energized: false
    } as MixingElement);
    // Use responsive offset based on screen width
    const offset = window.innerWidth < 640 ? 24 : window.innerWidth < 768 ? 28 : 32;
    setTouchOffset({
      x: offset, // Half of element width
      y: offset  // Half of element height
    });
    
    // Immediately position the drag element
    setTimeout(() => {
      const draggedEl = document.getElementById('touch-drag-element');
      if (draggedEl) {
        draggedEl.style.left = `${touch.clientX - offset}px`;
        draggedEl.style.top = `${touch.clientY - offset}px`;
      }
    }, 0);
    
    playSound('press');
    
    // Haptic feedback on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    e.preventDefault(); // Prevent scrolling while dragging
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!touchDragging) return;
    
    const touch = e.touches[0];
    const draggedEl = document.getElementById('touch-drag-element');
    if (draggedEl) {
      draggedEl.style.left = `${touch.clientX - touchOffset.x}px`;
      draggedEl.style.top = `${touch.clientY - touchOffset.y}px`;
    }
    
    // Check if hovering over a mixing area element
    const hoverTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    if (hoverTarget) {
      const mixingEl = mixingArea.find(el => {
        const elNode = document.getElementById(`mixing-${el.id}-${el.index}`);
        return elNode && (elNode === hoverTarget || elNode.contains(hoverTarget));
      });
      
      if (mixingEl && mixingEl.index !== touchDragging.mixIndex) {
        setHoveredElement(mixingEl.index);
      } else {
        setHoveredElement(null);
      }
    }
    
    e.preventDefault();
  };

  const handleTouchEnd = async (e: TouchEvent) => {
    if (!touchDragging) return;
    
    const touch = e.changedTouches[0];
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - (touchStartTime || 0);
    
    // Calculate movement distance
    const moveDistance = touchStartPos ? Math.sqrt(
      Math.pow(touch.clientX - touchStartPos!.x, 2) + 
      Math.pow(touch.clientY - touchStartPos!.y, 2)
    ) : 0;
    
    // If it was a quick tap with minimal movement, show reasoning popup
    if (touchDuration < 300 && moveDistance < 10 && touchDragging.reasoning) {
      // Create a synthetic event for the popup positioning
      const syntheticEvent = {
        currentTarget: {
          getBoundingClientRect: () => ({
            left: touchStartPos!.x - 32,
            top: touchStartPos!.y - 32,
            width: 64,
            height: 64
          })
        }
      };
      
      setTouchDragging(null);
      setTouchOffset({ x: 0, y: 0 });
      setTouchStartTime(null);
      setTouchStartPos(null);
      
      // Small delay to avoid conflicts
      setTimeout(() => {
        showReasoningPopup(touchDragging, syntheticEvent as any);
      }, 50);
      
      return;
    }
    
    // Otherwise, handle as normal drag operation
    // Find what element we're dropping on
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Check if dropped in mixing area
    if (dropZoneRef.current && dropZoneRef.current.contains(dropTarget)) {
      const rect = dropZoneRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      // Check if dropped on another element
      const targetElement = mixingArea.find(el => {
        const elRect = document.getElementById(`mixing-${el.id}-${el.index}`)?.getBoundingClientRect();
        if (!elRect) return false;
        return touch.clientX >= elRect.left && touch.clientX <= elRect.right &&
               touch.clientY >= elRect.top && touch.clientY <= elRect.bottom;
      });
      
      if (targetElement && targetElement.index !== touchDragging.mixIndex) {
        await mixElements(touchDragging, targetElement);
      } else if (!targetElement) {
        playSound('plop');
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(5);
        }
        const offset = window.innerWidth < 640 ? 24 : window.innerWidth < 768 ? 28 : 32;
        if (touchDragging.fromMixingArea) {
          const newPos = resolveCollisions(x - offset, y - offset, touchDragging.mixIndex);
          setMixingArea(mixingArea.map(el => 
            el.index === touchDragging.mixIndex 
              ? { ...el, x: newPos.x, y: newPos.y }
              : el
          ));
        } else {
          const newPos = resolveCollisions(x - offset, y - offset);
          const newElement = {
            ...touchDragging,
            x: newPos.x,
            y: newPos.y,
            index: Date.now(),
            energized: false
          };
          setMixingArea([...mixingArea, newElement]);
        }
      }
    }
    
    setTouchDragging(null);
    setTouchOffset({ x: 0, y: 0 });
    setHoveredElement(null);
    setTouchStartTime(null);
    setTouchStartPos(null);
  };

  // Touch handlers for dividers
  const handleDividerTouchStart = (e: React.TouchEvent, dividerType: string) => {
    e.preventDefault();
    setIsDraggingDivider(true);
  };

  const handleDividerTouchMove = (e: TouchEvent) => {
    if (!isDraggingDivider) return;
    
    const touch = e.touches[0];
    const newHeight = touch.clientY - 100;
    setListHeight(Math.max(100, Math.min(400, newHeight)));
  };

  const handleDividerTouchEnd = () => {
    setIsDraggingDivider(false);
  };

  const clearMixingArea = () => {
    if (!isMixing) {
      playSound('click');
      setMixingArea([]);
    }
  };

  const handleDividerDrag = (e: MouseEvent) => {
    if (isDraggingDivider) {
      const deltaY = e.clientY - dragStartY;
      const newHeight = dragStartHeight + deltaY;
      setListHeight(Math.max(100, Math.min(400, newHeight)));
    }
  };

  const handleDividerMouseUp = () => {
    setIsDraggingDivider(false);
  };

  const handleGameModeToggle = () => {
    if (!isMixing) {
      setShowModeConfirm(true);
    }
  };

  const confirmModeSwitch = () => {
    const newMode = gameMode === 'science' ? 'creative' : 'science';
    playSound('click');
    setGameMode(newMode);
    
    // Reset game with appropriate starting elements
    const startingElements = newMode === 'science' ? [
      { id: 'energy', name: 'Energy', emoji: '〰️', color: '#FFD700', unlockOrder: 0 },
      { id: 'earth', name: 'Earth', emoji: '🌍', color: '#8B4513', unlockOrder: 1 },
      { id: 'air', name: 'Air', emoji: '💨', color: '#87CEEB', unlockOrder: 2 },
      { id: 'fire', name: 'Fire', emoji: '🔥', color: '#FF4500', unlockOrder: 3 },
      { id: 'water', name: 'Water', emoji: '💧', color: '#4682B4', unlockOrder: 4 },
    ] : [
      { id: 'life', name: 'Life', emoji: '🧬', color: '#32CD32', unlockOrder: 0 },
      { id: 'earth', name: 'Earth', emoji: '🌍', color: '#8B4513', unlockOrder: 1 },
      { id: 'air', name: 'Air', emoji: '💨', color: '#87CEEB', unlockOrder: 2 },
      { id: 'fire', name: 'Fire', emoji: '🔥', color: '#FF4500', unlockOrder: 3 },
      { id: 'water', name: 'Water', emoji: '💧', color: '#4682B4', unlockOrder: 4 },
    ];
    
    setElements(startingElements);
    setEndElements([]);
    setMixingArea([]);
    setCombinations({});
    setAchievements([]);
    setShowModeConfirm(false);
    showToast(`Switched to ${newMode} mode!`);
  };

  // Optimized element sorting with search filtering
  const sortedElements = useMemo(() => {
    const filtered = elements
      .filter(e => e.name !== 'Energy')
      .filter(e => searchTerm === '' || e.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return filtered.sort((a, b) => {
      if (sortMode === 'alpha') {
        return a.name.localeCompare(b.name);
      }
      return a.unlockOrder - b.unlockOrder;
    });
  }, [elements, sortMode, searchTerm]);

  const energyElement = elements.find(e => e.name === 'Energy');
  const regularElementCount = elements.length;
  const endElementCount = endElements.length;

  useEffect(() => {
    if (isDraggingDivider) {
      document.addEventListener('mousemove', handleDividerDrag);
      document.addEventListener('mouseup', handleDividerMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleDividerDrag);
        document.removeEventListener('mouseup', handleDividerMouseUp);
      };
    }
  }, [isDraggingDivider]);

  // Floating emoji management system
  useEffect(() => {
    if (elements.length < 5) return;

    const createFloatingEmoji = () => {
      const randomElement = elements[Math.floor(Math.random() * elements.length)];
      return {
        id: floatingEmojiId.current++,
        emoji: randomElement.emoji,
        x: Math.random() * 100, // Start anywhere
        y: Math.random() * 100,
        directionX: (Math.random() - 0.5) * 2, // -1 to 1
        directionY: (Math.random() - 0.5) * 2,
        speed: 0.3 + Math.random() * 0.4, // 0.3 to 0.7
        opacity: 0,
        maxOpacity: 0.005 + Math.random() * 0.005, // 0.5% to 1%
        lifespan: 8000 + Math.random() * 6000, // 8-14 seconds
        age: 0
      };
    };

    // Initialize with 1-3 emojis
    if (floatingEmojis.length === 0) {
      const initialCount = 1 + Math.floor(Math.random() * 3);
      setFloatingEmojis(Array.from({ length: initialCount }, createFloatingEmoji));
    }

    const animationLoop = setInterval(() => {
      setFloatingEmojis(prevEmojis => {
        let newEmojis = prevEmojis.map(emoji => {
          const newAge = emoji.age + 100;
          const lifeProgress = newAge / emoji.lifespan;
          
          // Fade in first 20%, stay visible until 80%, then fade out
          let newOpacity;
          if (lifeProgress < 0.2) {
            newOpacity = (lifeProgress / 0.2) * emoji.maxOpacity;
          } else if (lifeProgress < 0.8) {
            newOpacity = emoji.maxOpacity;
          } else {
            newOpacity = emoji.maxOpacity * ((1 - lifeProgress) / 0.2);
          }

          return {
            ...emoji,
            x: emoji.x + emoji.directionX * emoji.speed,
            y: emoji.y + emoji.directionY * emoji.speed,
            opacity: Math.max(0, newOpacity),
            age: newAge
          };
        });

        // Remove dead emojis and ensure we maintain 1-3 emojis
        newEmojis = newEmojis.filter(emoji => emoji.age < emoji.lifespan);
        
        // Add new emojis if needed (maintain 1-3 count)
        while (newEmojis.length < 1 || (newEmojis.length < 3 && Math.random() < 0.3)) {
          newEmojis.push(createFloatingEmoji());
        }

        return newEmojis;
      });
    }, 100); // Update every 100ms

    return () => clearInterval(animationLoop);
  }, [elements.length]);

  // Handle reasoning popup dismissal
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // Only hide if popup exists and it's not from hover and we're not clicking on the popup itself
      if (reasoningPopup && !reasoningPopup.fromHover) {
        const popup = document.querySelector('.reasoning-popup');
        if (!popup || !popup.contains(e.target as Node)) {
          hideReasoningPopup();
        }
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && reasoningPopup) {
        hideReasoningPopup();
      }
    };

    if (reasoningPopup) {
      document.addEventListener('click', handleGlobalClick);
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('click', handleGlobalClick);
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [reasoningPopup]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col relative overflow-hidden select-none" style={{ touchAction: touchDragging || isDraggingDivider ? 'none' : 'auto' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-gray-900 to-blue-900/20"></div>
      
      {/* Header */}
      <div className="relative z-10 bg-gray-800/80 backdrop-blur-sm p-4 shadow-lg">
        <div className="flex justify-between items-start mb-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="text-yellow-400 hidden sm:block" />
            LLM Alchemy
          </h1>
          <div className="text-lg font-semibold flex flex-col items-end gap-1">
            <span>Elements: {regularElementCount}</span>
            {gameMode === 'science' && endElementCount > 0 && (
              <span className="text-gray-300 text-base">Ends: {endElementCount}</span>
            )}
            {session && (
              <div className="text-sm text-gray-400 flex items-center gap-1">
                <User size={14} />
                <span>
                  {session.user.dailyLimit.count}/{session.user.dailyLimit.maxCount} today
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center gap-3">
          <div className="flex gap-2 text-sm items-center">
            <button
              onClick={() => setSortMode('unlock')}
              onMouseEnter={() => setHoveredUIElement('sort-unlock')}
              onMouseLeave={() => setHoveredUIElement(null)}
              className={`px-3 py-1 rounded transition-all hidden sm:block ${
                sortMode === 'unlock' ? (gameMode === 'creative' ? 'bg-purple-600' : 'bg-blue-500') : 'bg-gray-700 hover:bg-gray-600'
              }`}
              style={{
                boxShadow: hoveredUIElement === 'sort-unlock' && sortMode !== 'unlock' && !isMixing ? '0 0 0 2px rgba(255, 255, 255, 0.4)' : ''
              }}
            >
              1-2-3
            </button>
            <button
              onClick={() => setSortMode('alpha')}
              onMouseEnter={() => setHoveredUIElement('sort-alpha')}
              onMouseLeave={() => setHoveredUIElement(null)}
              className={`px-3 py-1 rounded transition-all hidden sm:block ${
                sortMode === 'alpha' ? (gameMode === 'creative' ? 'bg-purple-600' : 'bg-blue-500') : 'bg-gray-700 hover:bg-gray-600'
              }`}
              style={{
                boxShadow: hoveredUIElement === 'sort-alpha' && sortMode !== 'alpha' && !isMixing ? '0 0 0 2px rgba(255, 255, 255, 0.4)' : ''
              }}
            >
              A-Z
            </button>
            
            {/* Search functionality and achievements */}
            <div className="flex items-center gap-1 sm:ml-4">
              <input
                type="text"
                placeholder="Filter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-20 sm:w-20 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                style={{
                  boxShadow: searchTerm !== '' ? '0 0 0 1px rgba(147, 51, 234, 0.5)' : ''
                }}
              />
              <button
                onClick={() => setShowAchievements(true)}
                onMouseEnter={() => setHoveredUIElement('achievements-btn')}
                onMouseLeave={() => setHoveredUIElement(null)}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-all flex items-center gap-1"
                style={{
                  boxShadow: hoveredUIElement === 'achievements-btn' && !isMixing ? '0 0 0 2px rgba(255, 255, 255, 0.4)' : ''
                }}
              >
                <span>🏆</span>
                <span className="hidden sm:inline text-sm">Achievements</span>
              </button>
            </div>
          </div>
          
          {/* Game Mode Toggle */}
          <button
            onClick={handleGameModeToggle}
            onMouseEnter={() => setHoveredUIElement('mode-toggle')}
            onMouseLeave={() => setHoveredUIElement(null)}
            disabled={isMixing}
            className={`relative inline-flex h-8 w-32 cursor-pointer items-center rounded-full bg-gray-700 transition-colors hover:bg-gray-600 ${
              isMixing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{
              boxShadow: hoveredUIElement === 'mode-toggle' && !isMixing ? '0 0 0 2px rgba(255, 255, 255, 0.4)' : ''
            }}
          >
            <div className={`absolute left-1 h-6 w-14 rounded-full transition-transform ${
              gameMode === 'creative' ? 'bg-purple-600 translate-x-16' : 'bg-blue-500'
            }`}></div>
            <span className={`absolute left-3 text-xs font-medium z-10 ${
              gameMode === 'science' ? 'text-white' : 'text-gray-400'
            }`}>Science</span>
            <span className={`absolute right-3 text-xs font-medium z-10 ${
              gameMode === 'creative' ? 'text-white' : 'text-gray-400'
            }`}>Creative</span>
          </button>
        </div>
      </div>

      {/* Element List */}
      <div 
        className="relative z-10 overflow-y-auto backdrop-blur-sm p-4 transition-all duration-300 scrollbar-mobile"
        style={{ 
          height: `${listHeight}px`,
          touchAction: touchDragging ? 'none' : 'auto',
          willChange: isDraggingDivider ? 'height' : 'auto',
          background: gameMode === 'creative' 
            ? 'rgba(147, 51, 234, 0.1)' // Purple tint for Creative mode
            : 'rgba(59, 130, 246, 0.08)' // Blue tint for Science mode
        }}
      >
        <div className="flex flex-wrap gap-2">
          {energyElement && gameMode === 'science' && (
            <React.Fragment key="energy-section">
              <div
                key={energyElement.id}
                draggable={!isTouchDevice}
                onDragStart={(e) => handleDragStart(e, energyElement)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, energyElement)}
                onMouseEnter={(e) => {
                  setHoveredUIElement(`element-${energyElement.id}`);
                  handleElementMouseEnter(energyElement, e);
                }}
                onMouseLeave={() => {
                  setHoveredUIElement(null);
                  handleElementMouseLeave();
                }}
                onClick={(e) => handleElementClick(energyElement, e)}
                onContextMenu={(e) => e.preventDefault()}
                className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex flex-col items-center justify-center rounded-lg cursor-move hover:scale-110 transition-transform ${
                  popElement === energyElement.id ? 'animate-element-pop' : ''
                } ${
                  shakeElement === energyElement.id ? 'animate-element-shake' : ''
                } ${
                  touchDragging?.id === energyElement.id && !touchDragging?.fromMixingArea ? 'opacity-30' : ''
                }`}
                style={{ 
                  backgroundColor: energyElement.color,
                  color: getContrastColor(energyElement.color),
                  boxShadow: !isDraggingDivider && hoveredUIElement === `element-${energyElement.id}` && !isDragging ? '0 0 0 2px rgba(255, 255, 255, 0.4)' : '',
                  transition: isDraggingDivider ? 'none' : undefined,
                  touchAction: 'none',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none'
                }}
              >
                <div className="text-lg sm:text-xl">{energyElement.emoji}</div>
                <div className="text-[8px] sm:text-[10px] font-medium px-1 text-center leading-tight">{energyElement.name}</div>
              </div>
              <div className="w-px h-12 sm:h-14 md:h-16 bg-gray-600 mx-1"></div>
            </React.Fragment>
          )}
          {sortedElements.map((element) => (
            <div
              key={element.id}
              draggable={!isTouchDevice}
              onDragStart={(e) => handleDragStart(e, element)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(e, element)}
              onMouseEnter={(e) => {
                setHoveredUIElement(`element-${element.id}`);
                handleElementMouseEnter(element, e);
              }}
              onMouseLeave={() => {
                setHoveredUIElement(null);
                handleElementMouseLeave();
              }}
              onClick={(e) => handleElementClick(element, e)}
              onContextMenu={(e) => e.preventDefault()}
              className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex flex-col items-center justify-center rounded-lg cursor-move hover:scale-110 transition-transform ${
                popElement === element.id ? 'animate-element-pop' : ''
              } ${
                shakeElement === element.id ? 'animate-element-shake' : ''
              } ${
                touchDragging?.id === element.id && !touchDragging?.fromMixingArea ? 'opacity-30' : ''
              }`}
              style={{ 
                backgroundColor: element.color,
                color: getContrastColor(element.color),
                boxShadow: !isDraggingDivider && hoveredUIElement === `element-${element.id}` && !isDragging ? '0 0 0 2px rgba(255, 255, 255, 0.4)' : '',
                transition: isDraggingDivider ? 'none' : undefined,
                touchAction: 'none',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none'
              }}
            >
              <div className="text-lg sm:text-xl">{element.emoji}</div>
              <div className="text-[8px] sm:text-[10px] font-medium px-1 text-center leading-tight">{element.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Draggable Divider */}
      <div 
        className="relative z-20 bg-gray-700 flex items-center justify-center transition-all touch-none"
        style={{
          background: hoveredUIElement === 'divider1' || isDraggingDivider
            ? 'linear-gradient(to bottom, #4B5563, #6B7280, #4B5563)' 
            : 'linear-gradient(to bottom, #374151, #4B5563, #374151)',
          height: '6px',
          touchAction: 'none',
          boxShadow: isDraggingDivider ? 'inset 0 1px 2px rgba(0, 0, 0, 0.3)' : '',
          cursor: 'ns-resize'
        }}
        onMouseDown={(e) => {
          setIsDraggingDivider(true);
          setDragStartY(e.clientY);
          setDragStartHeight(listHeight);
        }}
        onTouchStart={(e) => {
          handleDividerTouchStart(e, 'divider1');
          setHoveredUIElement('divider1');
          setDragStartY(e.touches[0].clientY);
          setDragStartHeight(listHeight);
        }}
        onTouchEnd={() => setHoveredUIElement(null)}
        onMouseEnter={() => setHoveredUIElement('divider1')}
        onMouseLeave={() => setHoveredUIElement(null)}
      >
        <div className="flex flex-col items-center gap-0 py-2 px-8">
          <GripHorizontal className={`transition-colors ${isDraggingDivider ? 'text-gray-200' : 'text-gray-400'}`} size={12} />
        </div>
      </div>

      {/* Mixing Area */}
      <div 
        ref={dropZoneRef}
        className="relative z-10 flex-1 bg-gray-800/30 backdrop-blur-sm overflow-hidden"
        onDragOver={handleDragOver}
        onDrop={handleDropOnMixingArea}
        style={{ minHeight: '200px', touchAction: 'none' }}
      >
        {/* Floating emoji background animation */}
        {floatingEmojis.map((emoji) => (
          <div
            key={emoji.id}
            className="absolute pointer-events-none select-none"
            style={{
              left: `${emoji.x}%`,
              top: `${emoji.y}%`,
              fontSize: '400px',
              opacity: emoji.opacity,
              transform: 'translate(-50%, -50%)',
              zIndex: 1
            }}
          >
            {emoji.emoji}
          </div>
        ))}
        {mixingArea.length > 0 && !isMixing && (
          <button
            onClick={clearMixingArea}
            onMouseEnter={() => setHoveredUIElement('clear-button')}
            onMouseLeave={() => setHoveredUIElement(null)}
            className="absolute top-4 right-4 p-2 bg-red-600/80 hover:bg-red-500 rounded-full transition-all z-20"
            style={{
              boxShadow: hoveredUIElement === 'clear-button' && !isMixing ? '0 0 0 2px rgba(255, 255, 255, 0.4)' : ''
            }}
          >
            <X size={20} />
          </button>
        )}

        {mixingArea.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-500 text-center px-4">
              Drag elements here to mix them!
            </p>
          </div>
        )}
        
        {mixingArea.map((element) => (
          <div
            key={`${element.id}-${element.index}`}
            id={`mixing-${element.id}-${element.index}`}
            draggable={!isTouchDevice && !isMixing}
            onDragStart={(e) => handleDragStart(e, element, true, element.index)}
            onDragEnd={handleDragEnd}
            onTouchStart={(e) => handleTouchStart(e, element, true, element.index)}
            onMouseEnter={() => setHoveredUIElement(`mixing-${element.index}`)}
            onMouseLeave={() => setHoveredUIElement(null)}
            onContextMenu={(e) => e.preventDefault()}
            onDragOver={(e) => {
              e.preventDefault();
              handleElementHover(element);
            }}
            onDragEnter={() => handleElementHover(element)}
            onDragLeave={handleElementLeave}
            className={`absolute w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex flex-col items-center justify-center rounded-lg cursor-move ${
              element.energized ? 'animate-shake' : ''
            } ${
              hoveredElement === element.index && !element.energized ? 'animate-continuous-pulse' : ''
            } ${
              touchDragging?.mixIndex === element.index && touchDragging?.fromMixingArea ? 'opacity-30' : ''
            }`}
            style={{ 
              left: element.x, 
              top: element.y,
              backgroundColor: element.color,
              color: getContrastColor(element.color),
              pointerEvents: isMixing ? 'none' : 'auto',
              touchAction: 'none',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              transition: element.isAnimating ? 'left 0.3s ease-out, top 0.3s ease-out' : 'none',
              boxShadow: element.energized ? '0 0 20px rgba(250, 204, 21, 0.5), 0 0 0 2px #facc15' :
                        hoveredElement === element.index ? '0 0 0 2px rgba(255, 255, 255, 0.6)' :
                        hoveredUIElement === `mixing-${element.index}` && !isDragging ? '0 0 0 2px rgba(255, 255, 255, 0.4)' : ''
            }}
          >
            <div className="text-lg sm:text-xl pointer-events-none">{element.emoji}</div>
            <div className="text-[8px] sm:text-[10px] font-medium px-1 text-center leading-tight pointer-events-none">{element.name}</div>
          </div>
        ))}
        
        {isMixing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-gray-800/90 rounded-xl p-6 flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mb-3"></div>
              <div className="text-sm">Mixing...</div>
            </div>
          </div>
        )}
      </div>


      {/* Unlock animation */}
      {showUnlock && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ pointerEvents: 'none' }}
        >
          <div 
            className={`relative transform transition-all duration-500 ${
              showUnlock.isNew ? (showUnlock.isEndElement ? 'animate-end-zoom-pulse' : 'animate-zoom-pulse') : 'animate-small-pulse opacity-80'
            }`}
            style={{ pointerEvents: 'none' }}
          >
            {showUnlock.isNew && (
              <>
                <div className={`absolute inset-0 rounded-xl blur-xl animate-pulse pointer-events-none ${
                  showUnlock.isEndElement ? 'bg-gradient-to-r from-blue-400 to-cyan-600' : 'bg-gradient-to-r from-yellow-400 to-yellow-600'
                }`}></div>
                <div className={`absolute inset-0 rounded-xl opacity-50 animate-ping pointer-events-none ${
                  showUnlock.isEndElement ? 'bg-gradient-to-r from-blue-300 to-cyan-400' : 'bg-gradient-to-r from-yellow-300 to-amber-400'
                }`}></div>
              </>
            )}
            <div 
              className="relative bg-gray-800 rounded-xl p-8 border-2" 
              style={{ 
                borderColor: showUnlock.isNew ? (showUnlock.isEndElement ? '#60A5FA' : '#FBBF24') : showUnlock.color,
                pointerEvents: unlockAnimationStartTime && Date.now() - unlockAnimationStartTime > 500 ? 'auto' : 'none',
                cursor: unlockAnimationStartTime && Date.now() - unlockAnimationStartTime > 500 ? 'pointer' : 'default'
              }}
              onClick={() => {
                if (unlockAnimationStartTime && Date.now() - unlockAnimationStartTime > 500) {
                  setShowUnlock(null);
                  setPopElement(null);
                  setUnlockAnimationStartTime(null);
                }
              }}
            >
              <div className="text-center">
                <div className="text-6xl mb-3">{showUnlock.emoji}</div>
                <div 
                  className="text-3xl font-bold mb-2" 
                  style={{ 
                    backgroundColor: showUnlock.color,
                    color: getContrastColor(showUnlock.color),
                    padding: '4px 12px',
                    borderRadius: '8px',
                    display: 'inline-block'
                  }}
                >
                  {showUnlock.name}
                </div>
                {showUnlock.isNew && (
                  <div className={`font-semibold mt-2 ${
                    showUnlock.isEndElement ? 'text-blue-400' : 'text-yellow-400'
                  }`}>
                    {showUnlock.isEndElement ? 'End Element' : 'New Element!'}
                  </div>
                )}
                {showUnlock.achievement && showUnlock.isNew && (
                  <div className="text-lg font-bold mt-3 text-yellow-300">
                    🏆 {showUnlock.achievement.name}
                  </div>
                )}
                {showUnlock.rarity && showUnlock.rarity !== 'common' && showUnlock.isNew && !showUnlock.isEndElement && (
                  <div className={`text-sm mt-2 font-medium ${
                    showUnlock.rarity === 'rare' ? 'text-purple-400' : 'text-blue-400'
                  }`}>
                    {showUnlock.rarity.toUpperCase()}
                  </div>
                )}
                {showUnlock.reasoning && showUnlock.isNew && (
                  <div className="text-sm mt-2 text-gray-300 italic max-w-xs text-center">
                    "{showUnlock.reasoning}"
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Achievements Modal */}
      {showAchievements && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                Achievements & End Elements
              </h3>
              <button
                onClick={() => setShowAchievements(false)}
                className="p-2 hover:bg-gray-700 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 space-y-6">
              {/* Achievements Section */}
              <div>
                <h4 className="text-lg font-semibold mb-3 text-yellow-400">🏆 Achievements ({achievements.length})</h4>
                {achievements.length === 0 ? (
                  <p className="text-gray-400 text-sm">None unlocked yet.</p>
                ) : (
                  <div className="space-y-2">
                    {achievements
                      .sort((a, b) => b.unlocked - a.unlocked)
                      .map((achievement) => (
                        <div
                          key={achievement.id}
                          className="bg-gray-700/50 rounded-lg p-3 border border-gray-600"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{achievement.emoji}</span>
                            <div>
                              <div className="font-medium text-yellow-300">{achievement.name}</div>
                              <div className="text-sm text-gray-300">{achievement.description}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* End Elements Section (Science Mode Only) */}
              {gameMode === 'science' && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-blue-400">🏁 End Elements ({endElements.length})</h4>
                  {endElements.length === 0 ? (
                    <p className="text-gray-400 text-sm">Nothing discovered yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {endElements
                        .sort((a, b) => b.unlockOrder - a.unlockOrder)
                        .map((element) => (
                          <div
                            key={element.id}
                            className="bg-gray-700/50 rounded-lg p-3 border border-gray-600"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{element.emoji}</span>
                              <div>
                                <div className="font-medium" style={{ color: element.color }}>
                                  {element.name}
                                </div>
                                {element.reasoning && (
                                  <div className="text-sm text-gray-400 italic">
                                    "{element.reasoning}"
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 px-4 py-2 rounded-lg z-50">
          {toast}
        </div>
      )}

      {/* Mode Switch Confirmation */}
      {showModeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm mx-4">
            <h3 className="text-xl font-bold mb-3">Switch game mode?</h3>
            <p className="text-gray-300 mb-4">
              Switch to {gameMode === 'science' ? 'Creative' : 'Science'} mode? 
              This will reset all your progress and achievement.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowModeConfirm(false)}
                onMouseEnter={() => setHoveredUIElement('cancel-btn')}
                onMouseLeave={() => setHoveredUIElement(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                style={{
                  boxShadow: hoveredUIElement === 'cancel-btn' ? '0 0 0 2px rgba(255, 255, 255, 0.4)' : ''
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmModeSwitch}
                onMouseEnter={() => setHoveredUIElement('switch-btn')}
                onMouseLeave={() => setHoveredUIElement(null)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded transition-colors font-medium"
                style={{
                  boxShadow: hoveredUIElement === 'switch-btn' ? '0 0 0 2px rgba(255, 255, 255, 0.4)' : ''
                }}
              >
                Switch mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Touch drag overlay */}
      {touchDragging && (
        <div
          id="touch-drag-element"
          className="fixed w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex flex-col items-center justify-center rounded-lg pointer-events-none"
          style={{
            left: touchDragging ? -100 : -200,
            top: touchDragging ? -100 : -200,
            backgroundColor: touchDragging.color,
            color: getContrastColor(touchDragging.color),
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
            zIndex: 9999,
            transform: 'scale(1.1)',
            opacity: 0.95
          }}
        >
          <div className="text-lg sm:text-xl pointer-events-none">{touchDragging.emoji}</div>
          <div className="text-[8px] sm:text-[10px] font-medium px-1 text-center leading-tight pointer-events-none">{touchDragging.name}</div>
        </div>
      )}

      {/* Reasoning Popup */}
      {reasoningPopup && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: reasoningPopup.x,
            top: reasoningPopup.y,
            transform: 'translateX(-50%) translateY(-100%)'
          }}
        >
          <div 
            className="reasoning-popup bg-gray-800/95 backdrop-blur-sm text-white text-sm px-3 py-2 rounded-lg shadow-lg border border-gray-600 max-w-xs"
            style={{
              pointerEvents: reasoningPopup.fromHover ? 'none' : 'auto'
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!reasoningPopup.fromHover) hideReasoningPopup();
            }}
          >
            <div className="font-medium text-center mb-1">
              {reasoningPopup.element.emoji} {reasoningPopup.element.name}
            </div>
            <div className="text-gray-300 italic text-center text-xs">
              "{reasoningPopup.element.reasoning}"
            </div>
            {/* Arrow pointing down */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-600"></div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* Mobile scrollbar styles */
        .scrollbar-mobile {
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
        }
        
        .scrollbar-mobile::-webkit-scrollbar {
          width: 6px;
        }
        
        .scrollbar-mobile::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .scrollbar-mobile::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
          border-radius: 3px;
        }
        
        .scrollbar-mobile::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.7);
        }
        
        /* Show scrollbar on mobile when content overflows */
        @media (max-width: 768px) {
          .scrollbar-mobile::-webkit-scrollbar {
            width: 8px;
          }
          
          .scrollbar-mobile::-webkit-scrollbar-thumb {
            background-color: rgba(156, 163, 175, 0.6);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-1px) rotate(-0.5deg); }
          75% { transform: translateX(1px) rotate(0.5deg); }
        }
        
        @keyframes zoom-pulse {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes end-zoom-pulse {
          0% { transform: scale(0) rotate(0deg); opacity: 0; }
          50% { transform: scale(1.1) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        
        @keyframes small-pulse {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes mix-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); opacity: 0.7; }
          100% { transform: scale(0); opacity: 0; }
        }
        
        @keyframes element-pop {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        
        @keyframes element-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        
        @keyframes continuous-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out infinite;
        }
        
        .animate-zoom-pulse {
          animation: zoom-pulse 0.5s ease-out;
        }
        
        .animate-end-zoom-pulse {
          animation: end-zoom-pulse 0.6s ease-out;
        }
        
        .animate-small-pulse {
          animation: small-pulse 0.3s ease-out;
        }
        
        .animate-mix-pop {
          animation: mix-pop 0.6s ease-out forwards;
        }
        
        .animate-element-pop {
          animation: element-pop 0.3s ease-out;
        }
        
        .animate-element-shake {
          animation: element-shake 0.3s ease-out;
        }
        
        .animate-continuous-pulse {
          animation: continuous-pulse 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LLMAlchemy;
