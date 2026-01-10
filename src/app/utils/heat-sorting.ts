import type { Heat } from "../types";

/**
 * Sorts heats by their position string (e.g., "1a", "1b", "2a", "2b", "10").
 * It splits the position into a numeric part and an optional suffix string.
 * Sorts numerically by the number, then alphabetically by the suffix.
 */
export function sortHeatsByPosition(heats: Heat[]): Heat[] {
  return [...heats].sort((a, b) => {
    const parsePosition = (pos: string) => {
      const match = pos.match(/^(\d+)([a-z]*)$/);
      if (!match) return { num: 0, suffix: "" };
      return { num: parseInt(match[1], 10), suffix: match[2] };
    };

    const posA = parsePosition(a.position);
    const posB = parsePosition(b.position);

    if (posA.num !== posB.num) {
      return posA.num - posB.num;
    }
    return posA.suffix.localeCompare(posB.suffix);
  });
}
