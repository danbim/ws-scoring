/**
 * Color palette optimized for daylight readability with high contrast.
 * 8 distinct colors that are easily distinguishable in outdoor conditions.
 */
const RIDER_COLORS = [
  '#0066CC', // Deep blue
  '#FF6B35', // Bright orange
  '#2ECC71', // Vibrant green
  '#E74C3C', // Strong red
  '#9B59B6', // Purple
  '#F39C12', // Amber
  '#1ABC9C', // Teal
  '#34495E', // Dark slate
];

/**
 * Simple hash function that converts a string to a consistent numeric value.
 * Uses bitwise operations for performance and consistency.
 *
 * @param str - The string to hash
 * @returns A positive integer hash value
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get a consistent color for a rider based on their ID.
 * The same rider ID will always return the same color across sessions.
 *
 * @param riderId - The unique identifier for the rider
 * @returns A hex color string (e.g., '#0066CC')
 *
 * @example
 * ```typescript
 * const color = getRiderColor('rider-123');
 * // Returns the same color every time for 'rider-123'
 * ```
 */
export function getRiderColor(riderId: string): string {
  const hash = simpleHash(riderId);
  return RIDER_COLORS[hash % RIDER_COLORS.length];
}

/**
 * Get a rider's color with a specified opacity for backgrounds or overlays.
 * Converts the hex color to RGBA format with the given opacity.
 *
 * @param riderId - The unique identifier for the rider
 * @param opacity - The opacity value between 0 (transparent) and 1 (opaque)
 * @returns An RGBA color string (e.g., 'rgba(0, 102, 204, 0.2)')
 *
 * @example
 * ```typescript
 * const bgColor = getRiderColorWithOpacity('rider-123', 0.2);
 * // Returns a semi-transparent version of the rider's color
 * ```
 */
export function getRiderColorWithOpacity(riderId: string, opacity: number): string {
  const color = getRiderColor(riderId);
  // Convert hex to rgba
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
