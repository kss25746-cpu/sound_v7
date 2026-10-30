/** 맞힌 % 추이. 한 글자·두 글자·문장 듣기 기록이 같은 모양. */
export type PercentSessionRecord = {
  id: string;
  savedAt: string;
  summary: {
    trialCount: number;
    correctCount: number;
    percent: number;
  };
};

export function chronologicalWrs(
  records: readonly PercentSessionRecord[],
): PercentSessionRecord[] {
  return [...records].sort((a, b) => a.savedAt.localeCompare(b.savedAt));
}

export function canShowWrsTrend(
  records: readonly PercentSessionRecord[],
): boolean {
  return records.length >= 2;
}

export function wrsTimeOrdinal(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

export function formatWrsDateShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
