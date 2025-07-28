/**
 * UI utility functions shared across game components
 */

/**
 * Get contrast color (black or white) based on background color
 */
export const getContrastColor = (hexcolor: string): string => {
  const r = parseInt(hexcolor.slice(1, 3), 16);
  const g = parseInt(hexcolor.slice(3, 5), 16);
  const b = parseInt(hexcolor.slice(5, 7), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#FFFFFF';
};

/**
 * Get rarity-based hover color for element cards
 */
export const getRarityHoverColor = (rarity: string = 'common'): string => {
  switch (rarity) {
    case 'uncommon': return '#10B981'; // Green
    case 'rare': return '#8B5CF6';     // Purple  
    default: return '#6B7280';         // Gray (common)
  }
};

/**
 * Get element size based on screen width (responsive design)
 */
export const getElementSize = (): number => {
  if (typeof window === 'undefined') return 56; // SSR fallback
  
  const BREAKPOINTS = { sm: 640, md: 768 };
  const ELEMENT_SIZES = { sm: 48, md: 56, lg: 64 };
  
  if (window.innerWidth < BREAKPOINTS.sm) return ELEMENT_SIZES.sm;
  if (window.innerWidth < BREAKPOINTS.md) return ELEMENT_SIZES.md;
  return ELEMENT_SIZES.lg;
};

/**
 * Detect if the device has touch capabilities
 */
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false; // SSR fallback
  return (('ontouchstart' in window) || navigator.maxTouchPoints > 0);
};

/**
 * Get element size classes for Tailwind CSS
 */
export const getElementSizeClasses = (): string => {
  return 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16';
};

/**
 * Get element emoji size classes based on element card size
 */
export const getElementEmojiSizeClasses = (): string => {
  return 'text-lg sm:text-xl';
};

/**
 * Get element name text size classes
 */
export const getElementNameSizeClasses = (): string => {
  return 'text-[8px] sm:text-[10px]';
};
