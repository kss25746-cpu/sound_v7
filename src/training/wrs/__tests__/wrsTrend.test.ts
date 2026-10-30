import type { SavedWrsRecord } from "@/training/wrs/wrsStore";
import {
  canShowWrsTrend,
  chronologicalWrs,
} from "@/training/wrs/wrsTrend";
import { WRS_TRIAL_COUNT } from "@/training/wrs/wrsSession";

function record(
  id: string,
  savedAt: string,
  percent: number,
): SavedWrsRecord {
  return {
    id,
    savedAt,
    schemaVersion: 1,
    summary: {
      trialCount: WRS_TRIAL_COUNT,
      correctCount: Math.round((percent / 100) * WRS_TRIAL_COUNT),
      percent,
    },
  };
}

describe("chronologicalWrs", () => {
  it("오래된 기록이 앞에 온다", () => {
    const rows = chronologicalWrs([
      record("b", "2026-08-19T12:00:00.000Z", 80),
      record("a", "2026-08-18T12:00:00.000Z", 40),
    ]);
    expect(rows.map((row) => row.id)).toEqual(["a", "b"]);
  });
});

describe("canShowWrsTrend", () => {
  it("실제 기록이 2회 이상일 때만 참이다", () => {
    expect(canShowWrsTrend([])).toBe(false);
    expect(canShowWrsTrend([record("a", "2026-08-19T12:00:00.000Z", 72)])).toBe(
      false,
    );
    expect(
      canShowWrsTrend([
        record("a", "2026-08-18T12:00:00.000Z", 40),
        record("b", "2026-08-19T12:00:00.000Z", 80),
      ]),
    ).toBe(true);
  });
});
