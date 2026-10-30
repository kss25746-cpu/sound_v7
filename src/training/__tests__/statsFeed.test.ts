import type { SavedSessionRecord } from "@/training/sessionStore";
import {
  countOfKind,
  sessionRowsOfKind,
  type StatsFeed,
} from "@/training/statsFeed";

function localIso(
  year: number,
  month: number,
  day: number,
  hour = 9,
): string {
  return new Date(year, month - 1, day, hour).toISOString();
}

function amRecord(savedAt: string): SavedSessionRecord {
  return {
    id: `find-${savedAt}`,
    track: "freqFind",
    savedAt,
    schemaVersion: 2,
    mode: "measure",
    grades: {
      s1: {
        high: { heard: 1, total: 1, status: "ok" },
        mid: { heard: 1, total: 1, status: "ok" },
        low: { heard: 1, total: 1, status: "ok" },
      },
      s2: {
        high: { correct: 1, total: 1, status: "pass" },
        mid: { correct: 1, total: 1, status: "pass" },
        low: { correct: 1, total: 1, status: "pass" },
      },
      s3: null,
      s4: null,
    },
    summary: {
      high: { tone: null, screen: null, fine: null, versus: null, final: "pass" },
      mid: { tone: null, screen: null, fine: null, versus: null, final: "pass" },
      low: { tone: null, screen: null, fine: null, versus: null, final: "pass" },
    },
  };
}

function pitch2Record(savedAt: string): SavedSessionRecord {
  return {
    id: `pitch2-${savedAt}`,
    track: "pitch2",
    savedAt,
    schemaVersion: 1,
    mode: "measure",
    summary: {
      trialCount: 12,
      correctCount: 9,
      percent: 75,
      levelCents: 200,
      endReason: "complete",
    },
  };
}

const EMPTY: StatsFeed = {
  ling6: [],
  sessions: [],
  wrs1: [],
  wrs2: [],
  sent: [],
  inst: [],
};

describe("countOfKind · sessionRowsOfKind", () => {
  it("종목별로 세고, 같은 상자여도 트랙이 섞이지 않는다", () => {
    const feed: StatsFeed = {
      ...EMPTY,
      sessions: [
        pitch2Record(localIso(2026, 8, 20)),
        pitch2Record(localIso(2026, 8, 19)),
        amRecord(localIso(2026, 8, 18)),
      ],
    };

    expect(countOfKind(feed, "pitch2")).toBe(2);
    expect(countOfKind(feed, "freqFind")).toBe(1);
    expect(sessionRowsOfKind(feed, "freqFind")).toHaveLength(1);
    expect(sessionRowsOfKind(feed, "pitch2")).toHaveLength(2);
  });
});
