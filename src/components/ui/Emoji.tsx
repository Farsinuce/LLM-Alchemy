import React from 'react';
import { getStaticOpenMoji } from '@/lib/openmoji-service';

interface EmojiProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'children'> {
  children: string;  // Unicode emoji
  size?: 'sm' | 'md' | 'lg';
  scale?: number;    // Scale factor (e.g., 1.5 = 150% size)
  className?: string;
  alt?: string;
}

/**
 * Unified emoji component that renders static UI emojis using OpenMoji SVGs
 * 
 * This component provides a consistent way to display emojis throughout the application,
 * ensuring all static UI emojis use the OpenMoji style rather than browser-native emojis.
 * 
 * @example
 * ```tsx
 * <Emoji>🏆</Emoji>
 * <Emoji size="lg">🌟</Emoji>
 * <Emoji size="lg" scale={1.5}>✨</Emoji>
 * <Emoji className="my-class">🎯</Emoji>
 * ```
 */
const Emoji: React.FC<EmojiProps> = React.memo(({ 
  children, 
  size = 'md', 
  scale,
  className, 
  alt, 
  ...props 
}) => {
  // Get the OpenMoji SVG path
  const src = getStaticOpenMoji(children);
  
  // Map size variants to Tailwind classes
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };
  
  const sizeClass = sizeClasses[size];
  const combinedClassName = `inline-block ${sizeClass} ${className || ''}`.trim();
  
  // Apply scale transform if provided
  const scaleStyle = scale ? { transform: `scale(${scale})` } : {};
  const combinedStyle = { ...scaleStyle, ...props.style };
  
  return (
    <img 
      src={src} 
      alt={alt || children}
      className={combinedClassName}
      style={combinedStyle}
      onError={(e) => {
        // Fallback to Unicode if OpenMoji SVG fails to load
        const target = e.currentTarget as HTMLImageElement;
        const parent = target.parentNode;
        if (parent) {
          // Hide the broken image
          target.style.display = 'none';
          // Insert Unicode emoji as fallback
          const textNode = document.createTextNode(children);
          parent.insertBefore(textNode, target.nextSibling);
        }
      }}
      {...props}
    />
  );
});

Emoji.displayName = 'Emoji';

export default Emoji;
