/**
 * 통계 읽기 창구 — 저장소 6개(`ling6Store` · `sessionStore` · `wrsStore` ·
 * `twoCharStore` · `sentClosed/store` · `inst/instStore`)를 **그대로 두고**
 * 읽는 쪽만 한 곳으로 모은다.
 * 저장 키 통합·마이그레이션이 아니다(`docs/training-stats-recommendation.md` §3
 * 「읽는 API만 봉투로 투영」).
 *
 * 화면은 이 파일의 `kind`만 알면 되고, 어느 키에서 나왔는지는 몰라도 된다.
 */

import {
  clearLing6DailyRecords,
  listLing6DailyRecords,
  type SavedLing6Record,
} from "@/training/ling6/ling6Store";
import {
  deleteSavedSessionsByTrack,
  isCountedInStats,
  listSavedSessions,
  type SavedFreqFindSessionRecord,
  type SavedSessionRecord,
  type SessionTrack,
} from "@/training/sessionStore";
import {
  clearTwoCharRecords,
  listTwoCharRecords,
  type SavedTwoCharRecord,
} from "@/training/wrs/twoCharStore";
import {
  clearWrsRecords,
  listWrsRecords,
  type SavedWrsRecord,
} from "@/training/wrs/wrsStore";
import {
  clearSentClosedRecords,
  listSentClosedRecords,
  type SavedSentClosedRecord,
} from "@/training/sentClosed/store";
import {
  clearInstRecords,
  listInstRecords,
  type SavedInstRecord,
} from "@/training/inst/instStore";

/** 통계 한 종목. 칩 하나 = kind 하나. */
export type StatsKind =
  | "ling6"
  | "pitch2"
  | "wrs1"
  | "wrs2"
  | "freqFind"
  | "sent"
  | "inst";

/** 칩 순서: 높낮이 · 소리 찾기 · 소리 구분 · 한 글자 · 두 글자 · 문장 · 듣고 고르기. */
export const STATS_KINDS: readonly StatsKind[] = [
  "pitch2",
  "freqFind",
  "ling6",
  "wrs1",
  "wrs2",
  "sent",
  "inst",
];

/** 칩·지우기 버튼에 쓰는 종목 이름. */
export const KIND_LABEL: Record<StatsKind, string> = {
  ling6: "소리 구분",
  pitch2: "높낮이 비교",
  wrs1: "한 글자",
  wrs2: "두 글자",
  freqFind: "소리 찾기",
  sent: "문장 듣기",
  inst: "듣고 고르기",
};

/**
 * 한 번 읽어 둔 여섯 저장소. 칩을 바꿔도 다시 읽지 않는다.
 * `sessions`는 귀풀기(practice)를 이미 걸러 낸 뒤다.
 */
export type StatsFeed = {
  readonly ling6: readonly SavedLing6Record[];
  readonly sessions: readonly SavedSessionRecord[];
  readonly wrs1: readonly SavedWrsRecord[];
  readonly wrs2: readonly SavedTwoCharRecord[];
  readonly sent: readonly SavedSentClosedRecord[];
  readonly inst: readonly SavedInstRecord[];
};

export const EMPTY_STATS_FEED: StatsFeed = {
  ling6: [],
  sessions: [],
  wrs1: [],
  wrs2: [],
  sent: [],
  inst: [],
};

/**
 * 여섯 저장소를 한 번에 읽는다. 레코드가 전부 요약 숫자라 합쳐도 수십 KB다.
 * 하나가 깨져도 나머지는 보여 준다(그 종목만 빈 목록).
 */
export async function loadStatsFeed(): Promise<StatsFeed> {
  const [ling6, sessions, wrs1, wrs2, sent, inst] = await Promise.all([
    listLing6DailyRecords().catch((): SavedLing6Record[] => []),
    listSavedSessions().catch((): SavedSessionRecord[] => []),
    listWrsRecords().catch((): SavedWrsRecord[] => []),
    listTwoCharRecords().catch((): SavedTwoCharRecord[] => []),
    listSentClosedRecords().catch((): SavedSentClosedRecord[] => []),
    listInstRecords().catch((): SavedInstRecord[] => []),
  ]);

  return {
    ling6,
    // 통계·추세는 연습(measure)만. 귀풀기는 저장하지 않지만 구기록이 남아 있다.
    sessions: sessions.filter(isCountedInStats),
    wrs1,
    wrs2,
    sent,
    inst,
  };
}

/** 이 kind가 `sessionStore` 트랙인지. 아니면 전용 저장소를 쓴다. */
function isSessionTrack(kind: StatsKind): kind is SessionTrack {
  return (
    kind === "pitch2" || kind === "freqFind"
  );
}

/** 선택한 종목의 세션만. 높낮이 비교·소리 찾기용. */
export function sessionRowsOfKind(
  feed: StatsFeed,
  kind: SessionTrack,
): SavedSessionRecord[] {
  return feed.sessions.filter((row) => row.track === kind);
}

/** 소리 찾기(바다 4단계) 세션만. */
export function freqFindRowsOfFeed(
  feed: StatsFeed,
): SavedFreqFindSessionRecord[] {
  return feed.sessions.filter(
    (row): row is SavedFreqFindSessionRecord => row.track === "freqFind",
  );
}

export function countOfKind(feed: StatsFeed, kind: StatsKind): number {
  switch (kind) {
    case "ling6":
      return feed.ling6.length;
    case "wrs1":
      return feed.wrs1.length;
    case "wrs2":
      return feed.wrs2.length;
    case "sent":
      return feed.sent.length;
    case "inst":
      return feed.inst.length;
    default:
      return sessionRowsOfKind(feed, kind).length;
  }
}

/**
 * 그 종목 기록만 지운다. 다른 종목은 건드리지 않는다.
 * 높낮이 비교·소리 찾기는 한 상자를 나눠 쓰므로 트랙 단위 삭제.
 */
export function clearStatsKind(kind: StatsKind): Promise<void> {
  switch (kind) {
    case "ling6":
      return clearLing6DailyRecords();
    case "wrs1":
      return clearWrsRecords();
    case "wrs2":
      return clearTwoCharRecords();
    case "sent":
      return clearSentClosedRecords();
    case "inst":
      return clearInstRecords();
    default:
      return deleteSavedSessionsByTrack(kind);
  }
}

export { isSessionTrack };
