/**
 * InitialsAvatar Component
 * 
 * Displays a deterministic avatar based on a person's name.
 * Uses initials (first letter of first and last name) on a colored background.
 * Color is deterministically derived from the name so it's always consistent.
 */

import React from 'react';

export interface InitialsAvatarProps {
  name: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

// Fixed palette of 8 colors, ensuring good visual distinction
const COLOR_PALETTE = [
  '#3B82F6', // blue
  '#EC4899', // pink
  '#10B981', // emerald
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#06B6D4', // cyan
  '#EF4444', // red
  '#6366F1', // indigo
];

/**
 * Generate a deterministic hash from a string
 * Same input always produces same hash
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Extract initials from a name
 * "John Doe" -> "JD"
 * "John" -> "J"
 * "Mary Jane Watson" -> "MW" (takes first and last)
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  
  // For multiple parts, use first letter of first and last
  const first = parts[0][0].toUpperCase();
  const last = parts[parts.length - 1][0].toUpperCase();
  return `${first}${last}`;
}

/**
 * Get deterministic background color for a name
 */
function getBackgroundColor(name: string): string {
  const hash = hashString(name);
  const index = hash % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}

export function InitialsAvatar({
  name,
  size = 'medium',
  className,
}: InitialsAvatarProps): React.ReactElement {
  const initials = getInitials(name);
  const backgroundColor = getBackgroundColor(name);

  const sizeClasses = {
    small: 'w-6 h-6 text-xs',
    medium: 'w-10 h-10 text-sm',
    large: 'w-20 h-20 text-2xl',
  };

  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold text-white ${sizeClasses[size]} ${className || ''}`}
      style={{ backgroundColor }}
      title={name}
    >
      {initials}
    </div>
  );
}

export default InitialsAvatar;
