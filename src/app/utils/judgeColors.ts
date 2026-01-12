// Distinct professional colors for judge column headers
const JUDGE_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#8B5CF6", // purple
  "#F59E0B", // orange
  "#06B6D4", // teal
  "#EC4899", // pink
  "#6366F1", // indigo
  "#14B8A6", // cyan
];

const judgeColorMap = new Map<string, string>();

export function getJudgeColor(judgeId: string): string {
  if (judgeColorMap.has(judgeId)) {
    return judgeColorMap.get(judgeId)!;
  }

  const colorIndex = judgeColorMap.size % JUDGE_COLORS.length;
  const color = JUDGE_COLORS[colorIndex];
  judgeColorMap.set(judgeId, color);
  return color;
}

export function clearJudgeColors(): void {
  judgeColorMap.clear();
}
