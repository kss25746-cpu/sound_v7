import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  GradeState,
  SummaryResult,
} from "@/training/freqFind/source/testEngine";
import { isPitchLevelCents } from "@/training/pitch2afc/constants";
import type { PitchCompareSummary } from "@/training/pitch2afc/pitchSummary";
import { percentOf } from "@/training/pitch2afc/pitchSummary";
import {
  deleteRecord,
  fetchRecord,
  sendRecord,
} from "@/chongyeon/hooks/useSyncGameData";

/** 로컬 연습 기록 키. 스키마 바꾸면 버전 bump. */
const STORAGE_KEY = "training.sessionHistory.v1";

/**
 * 레코드 스키마 버전.
 * 필드 구성을 바꾸면 이 값을 올리고 `migrateRecord`에 분기를 추가한다.
 * 초기 저장분에는 이 필드가 없으므로 **없으면 1로 본다**.
 */
export const SESSION_RECORD_VERSION = 2;

/**
 * 목록에서 트랙마다 읽는 상한.
 * 새 저장은 `sendRecord`가 하고, 이 키에는 쓰지 않는다.
 */
export const MAX_MEASURE_SESSIONS = 50;

export type SessionTrack = "pitch2" | "freqFind";

/**
 * 세션 성격.
 * - `practice`: 귀풀기(한도 없음). **저장하지 않음.** 이번 결과 카드만.
 * - `measure`: 연습(반전 6). 기록 + 통계 포함.
 *
 * `주의`: 구버전 레코드에는 이 필드가 없다(`undefined`). 없으면 **측정으로 간주**해
 * 통계에 포함한다(기존 데이터를 통계에서 빠뜨리지 않기 위해).
 */
export type SessionMode = "practice" | "measure";

export type SavedPitch2SessionRecord = {
  id: string;
  track: "pitch2";
  savedAt: string;
  /** 없으면 1(초기 저장분). */
  schemaVersion?: number;
  /** 없으면 측정으로 간주(구버전 호환). */
  mode?: SessionMode;
  summary: PitchCompareSummary;
};

/** 소리 찾기(바다 4단계). */
export type SavedFreqFindSessionRecord = {
  id: string;
  track: "freqFind";
  savedAt: string;
  schemaVersion?: number;
  mode?: SessionMode;
  grades: GradeState;
  summary: SummaryResult;
};

export type SavedSessionRecord =
  | SavedPitch2SessionRecord
  | SavedFreqFindSessionRecord;

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── 저장된 값 형태 검증 ────────────────────────────────────────────────
// 저장소 내용은 앱이 썼더라도 **믿을 수 없는 입력**으로 다룬다(구버전·중단된 쓰기·
// 수동 조작). 형태가 어긋난 레코드는 읽는 시점에 버려서 화면이 넘어지지 않게 한다.

const END_REASONS: ReadonlySet<string> = new Set([
  "reversals",
  "max_trials",
  "manual",
]);

const PITCH_END_REASONS: ReadonlySet<string> = new Set(["complete", "manual"]);

const SESSION_MODES: ReadonlySet<string> = new Set(["practice", "measure"]);

/** mode는 선택 필드 — 없으면(undefined) 허용, 있으면 아는 값이어야 한다. */
function isSessionModeOrAbsent(
  value: unknown,
): value is SessionMode | undefined {
  return (
    value === undefined ||
    (typeof value === "string" && SESSION_MODES.has(value))
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** 요약의 수치 항목은 「값 없음」이 정상이라 null을 허용한다. */
function isFiniteNumberOrNull(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isEndReasonOrNull(value: unknown): value is string | null {
  return (
    value === null || (typeof value === "string" && END_REASONS.has(value))
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidRecord(value: unknown): value is SavedSessionRecord {
  if (!isPlainObject(value)) {
    return false;
  }
  if (typeof value.id !== "string" || value.id === "") {
    return false;
  }
  if (typeof value.savedAt !== "string" || value.savedAt === "") {
    return false;
  }
  if (!isSessionModeOrAbsent(value.mode)) {
    return false;
  }

  if (value.track === "freqFind") {
    return isPlainObject(value.grades) && isPlainObject(value.summary);
  }

  if (value.track === "pitch2") {
    return isPlainObject(value.summary) && isValidPitch2Summary(value.summary);
  }

  return false;
}

function isValidPitch2Summary(
  summary: Record<string, unknown>,
): summary is PitchCompareSummary & Record<string, unknown> {
  if (
    !isFiniteNumber(summary.trialCount) ||
    !isFiniteNumber(summary.correctCount) ||
    !isFiniteNumber(summary.percent)
  ) {
    return false;
  }
  if (summary.correctCount < 0 || summary.correctCount > summary.trialCount) {
    return false;
  }
  if (summary.percent < 0 || summary.percent > 100) {
    return false;
  }
  if (
    summary.levelCents !== null &&
    !isPitchLevelCents(summary.levelCents)
  ) {
    return false;
  }
  return (
    typeof summary.endReason === "string" &&
    PITCH_END_REASONS.has(summary.endReason)
  );
}

function isLegacyPitch2Summary(summary: Record<string, unknown>): boolean {
  return (
    isFiniteNumber(summary.trialCount) &&
    isFiniteNumber(summary.reversalCount) &&
    isFiniteNumber(summary.correctCount) &&
    isEndReasonOrNull(summary.endReason) &&
    isFiniteNumberOrNull(summary.meanReversalCents) &&
    isFiniteNumberOrNull(summary.easiestCents) &&
    isFiniteNumberOrNull(summary.hardestCents)
  );
}

/**
 * 저장된 값 1건을 현재 스키마의 레코드로 만든다. 못 만들면 `null`(호출부가 버림).
 *
 * 스키마를 바꿀 때: `SESSION_RECORD_VERSION`을 올리고 여기에 버전별 분기를 넣는다.
 * v2: 높낮이 비교는 맞힌 비율·고정 단계. 계단법 구기록은 비율만 살린다.
 * 다른 음 찾기(`freq`)·떨림(`am`) 기록은 읽지 않는다.
 *
 * `주의`: 검증은 **형태 기준**이다.
 */
function migrateRecord(value: unknown): SavedSessionRecord | null {
  if (!isPlainObject(value)) {
    return null;
  }
  if (value.track === "pitch2" && isPlainObject(value.summary)) {
    if (isValidPitch2Summary(value.summary) && isValidRecord(value)) {
      return value;
    }
    if (!isLegacyPitch2Summary(value.summary)) {
      return null;
    }
    if (!isSessionModeOrAbsent(value.mode)) {
      return null;
    }
    const trialCount = value.summary.trialCount as number;
    const correctCount = value.summary.correctCount as number;
    const mode = value.mode;
    const migrated: SavedPitch2SessionRecord = {
      id: typeof value.id === "string" ? value.id : "",
      track: "pitch2",
      savedAt: typeof value.savedAt === "string" ? value.savedAt : "",
      schemaVersion: SESSION_RECORD_VERSION,
      mode,
      summary: {
        trialCount,
        correctCount,
        percent: percentOf(correctCount, trialCount),
        levelCents: null,
        endReason: value.summary.endReason === "manual" ? "manual" : "complete",
      },
    };
    return isValidRecord(migrated) ? migrated : null;
  }
  if (!isValidRecord(value)) {
    return null;
  }
  return value;
}

/**
 * 저장소 접근 직렬화 큐.
 *
 * append는 read → 수정 → write 세 단계라 원자적이지 않다. 두 호출이 겹치면
 * 둘 다 같은 원본을 읽고 각자 한 건씩 얹어 덮어써 **한 건이 유실**된다.
 * 모든 접근을 이 큐에 태워 한 번에 하나만 실행한다.
 *
 * 주의: 같은 JS 런타임 안에서만 유효하다(프로세스·기기 간 잠금이 아님).
 */
let tail: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  // 앞 작업이 실패해도 다음 작업은 실행한다(큐가 막히지 않도록 양쪽 핸들러에 연결).
  const run = tail.then(task, task);
  // 큐 꼬리에는 실패를 흘리지 않는다(처리는 호출자 몫).
  tail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** 예전 기기 키. 새 저장은 쓰지 않고, 읽을 때만 `migrateRecord`로 합친다. */
async function readLegacyKey(): Promise<SavedSessionRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw == null || raw === "") {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }

  const records: SavedSessionRecord[] = [];
  for (const item of parsed) {
    const record = migrateRecord(item);
    if (record) {
      records.push(record);
    }
  }
  return records;
}

function mergeById(
  primary: readonly SavedSessionRecord[],
  extra: readonly SavedSessionRecord[],
): SavedSessionRecord[] {
  const seen = new Set(primary.map((row) => row.id));
  const merged = [...primary];
  for (const row of extra) {
    if (seen.has(row.id)) {
      continue;
    }
    seen.add(row.id);
    merged.push(row);
  }
  return merged.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

/** `saved_at`을 글자로 만든다. 변환이 실패하면 `null`(그 줄은 버린다). */
function savedAtText(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  try {
    return new Date(value as string | number).toISOString();
  } catch {
    return null;
  }
}

/**
 * 큐 안에서만 호출할 것.
 * 서버 캐시를 그 자리에서 레코드로 만든다. 새 형식이 아니면 버린다.
 * 옛 키만 `migrateRecord`를 거친 뒤, 같은 id는 한 건으로 본다.
 */
async function readAllRaw(): Promise<SavedSessionRecord[]> {
  const records: SavedSessionRecord[] = [];

  const pitchData = await fetchRecord("pitch", MAX_MEASURE_SESSIONS);
  if (Array.isArray(pitchData)) {
    for (const row of pitchData) {
      if (!isPlainObject(row)) {
        continue;
      }
      const savedAt = savedAtText(row.saved_at);
      if (savedAt == null) {
        continue;
      }
      const item: SavedPitch2SessionRecord = {
        id: row.id as string,
        track: "pitch2",
        savedAt,
        schemaVersion: row.schema_version as number | undefined,
        mode: (row.mode as SessionMode) || "measure",
        summary: {
          trialCount: row.trial_count as number,
          correctCount: row.correct_count as number,
          percent: row.percent as number,
          levelCents: row.level_cents as PitchCompareSummary["levelCents"],
          endReason: row.end_reason as PitchCompareSummary["endReason"],
        },
      };
      if (isValidRecord(item)) {
        records.push(item);
      }
    }
  }

  const freqData = await fetchRecord("freqFind", MAX_MEASURE_SESSIONS);
  if (Array.isArray(freqData)) {
    for (const row of freqData) {
      if (!isPlainObject(row)) {
        continue;
      }
      const savedAt = savedAtText(row.saved_at);
      if (savedAt == null) {
        continue;
      }
      const item: SavedFreqFindSessionRecord = {
        id: row.id as string,
        track: "freqFind",
        savedAt,
        schemaVersion: row.schema_version as number | undefined,
        mode: (row.mode as SessionMode) || "measure",
        grades: row.grades as GradeState,
        summary: row.summary as SummaryResult,
      };
      if (isValidRecord(item)) {
        records.push(item);
      }
    }
  }

  const legacy = await readLegacyKey();
  return mergeById(records, legacy);
}

/**
 * 레코드 1건 추가. 귀풀기는 보내지 않는다.
 * `build`는 큐 안에서 실행되므로 `savedAt`·`id`가 **실제 기록 순서와 일치**한다.
 */
function appendRecord<R extends SavedSessionRecord>(
  build: () => R,
): Promise<R> {
  return enqueue(async () => {
    const record = build();
    if (record.mode === "practice") {
      return record;
    }
    const category = record.track === "pitch2" ? "pitch" : "freqFind";
    await sendRecord(category, record);
    return record;
  });
}

/** 「높낮이 비교」 세션 종료 요약 저장. 진단·역치 아님. 실패 시 throw. */
export function appendPitch2SessionSummary(
  summary: PitchCompareSummary,
  mode: SessionMode = "measure",
): Promise<SavedPitch2SessionRecord> {
  return appendRecord<SavedPitch2SessionRecord>(() => ({
    id: newId(),
    track: "pitch2",
    savedAt: new Date().toISOString(),
    schemaVersion: SESSION_RECORD_VERSION,
    mode,
    summary,
  }));
}

export function appendFreqFindSessionRecord(
  data: {
    grades: GradeState;
    summary: SummaryResult;
  },
  mode: SessionMode = "measure",
): Promise<SavedFreqFindSessionRecord> {
  return appendRecord<SavedFreqFindSessionRecord>(() => ({
    id: newId(),
    track: "freqFind",
    savedAt: new Date().toISOString(),
    schemaVersion: SESSION_RECORD_VERSION,
    mode,
    grades: data.grades,
    summary: data.summary,
  }));
}

export async function listSavedFreqFindSessions(): Promise<
  SavedFreqFindSessionRecord[]
> {
  const rows = await listSavedSessions();
  return rows.filter(
    (r): r is SavedFreqFindSessionRecord => r.track === "freqFind",
  );
}

export async function getLatestFreqFindSession(): Promise<SavedFreqFindSessionRecord | null> {
  const rows = await listSavedFreqFindSessions();
  return rows[0] ?? null;
}

/**
 * 이 레코드가 통계·추세 집계에 포함되는지.
 * 귀풀기(`practice`)만 제외한다. `mode`가 없는 구버전 레코드는 포함(측정으로 간주).
 */
export function isCountedInStats(record: SavedSessionRecord): boolean {
  return record.mode !== "practice";
}

/** 대기 중인 저장이 있으면 그것들이 끝난 뒤의 목록을 돌려준다. */
export function listSavedSessions(): Promise<SavedSessionRecord[]> {
  return enqueue(readAllRaw);
}

/** 개발·수동 초기화용. 음높이와 소리 찾기 서버 기록을 지운다. */
export function clearSavedSessions(): Promise<void> {
  return enqueue(async () => {
    await deleteRecord("pitch");
    await deleteRecord("freqFind");
  });
}

/**
 * 기록 1건 삭제. 없는 id면 아무 것도 하지 않는다.
 */
export function deleteSavedSession(id: string): Promise<void> {
  return enqueue(async () => {
    const rows = await readAllRaw();
    const target = rows.find((row) => row.id === id);
    if (!target) {
      return;
    }
    const category = target.track === "pitch2" ? "pitch" : "freqFind";
    await deleteRecord(category, id);
  });
}

/** 한 트랙의 서버 기록을 지운다. 다른 트랙은 그대로다. */
export function deleteSavedSessionsByTrack(track: SessionTrack): Promise<void> {
  return enqueue(async () => {
    const category = track === "pitch2" ? "pitch" : "freqFind";
    await deleteRecord(category);
  });
}
