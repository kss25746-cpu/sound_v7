import { TWO_CHAR_TRIAL_COUNT } from "@/training/wrs/twoCharLists";
import type { WrsSessionSummary } from "@/training/wrs/wrsSession";

// 통합 모듈 가져오기
import { sendRecord, fetchRecord, deleteRecord } from "@/chongyeon/hooks/useSyncGameData";

export const TWO_CHAR_RECORD_VERSION = 2;
export const MAX_TWO_CHAR_SESSIONS = 50;

export type SavedTwoCharRecord = {
  id: string;
  savedAt: string;
  schemaVersion: number;
  /** 없으면 v1 기록. 0·1·2. */
  listIndex?: number;
  summary: WrsSessionSummary;
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidSummary(value: unknown): value is WrsSessionSummary {
  if (!isPlainObject(value)) {
    return false;
  }
  if (!isFiniteNumber(value.trialCount) || value.trialCount < 0) {
    return false;
  }
  if (!isFiniteNumber(value.correctCount) || value.correctCount < 0) {
    return false;
  }
  if (value.correctCount > value.trialCount) {
    return false;
  }
  if (!isFiniteNumber(value.percent) || value.percent < 0 || value.percent > 100) {
    return false;
  }
  return true;
}

function isListIndexOrAbsent(value: unknown): value is number | undefined {
  return value === undefined || value === 0 || value === 1 || value === 2;
}

function isValidRecord(value: unknown): value is SavedTwoCharRecord {
  if (!isPlainObject(value)) {
    return false;
  }
  if (typeof value.id !== "string" || typeof value.savedAt !== "string") {
    return false;
  }
  if (!isListIndexOrAbsent(value.listIndex)) {
    return false;
  }
  return isValidSummary(value.summary);
}

let tail: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(task, task);
  tail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

// 통합 모듈을 통해 서버에서 두 글자 기록 목록 가져오기
async function readAllRaw(): Promise<SavedTwoCharRecord[]> {
  const data = await fetchRecord("wrsDouble", MAX_TWO_CHAR_SESSIONS);
  if (!Array.isArray(data)) return [];

  // DB 컬럼명을 앱 규격 객체로 변환
  const mapped: SavedTwoCharRecord[] = data.map((row: any) => ({
    id: row.id,
    savedAt: typeof row.saved_at === "string" ? row.saved_at : new Date(row.saved_at).toISOString(),
    schemaVersion: row.schema_version,
    listIndex: row.listIndex ?? row.list_index,
    summary: {
      trialCount: row.trial_count,
      correctCount: row.correct_count,
      percent: row.percent,
    },
  }));

  return mapped.filter(isValidRecord);
}

function sortNewestFirst(
  rows: readonly SavedTwoCharRecord[],
): SavedTwoCharRecord[] {
  return [...rows].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

// 전체 두 글자 훈련 기록 조회 (문의하신 함수)
export async function listTwoCharRecords(): Promise<SavedTwoCharRecord[]> {
  return enqueue(async () => sortNewestFirst(await readAllRaw()));
}

// 세션 종료 요약 저장
export async function appendTwoCharSummary(
  summary: WrsSessionSummary,
  listIndex: number,
  now: Date = new Date(),
): Promise<SavedTwoCharRecord> {
  if (summary.trialCount !== TWO_CHAR_TRIAL_COUNT) {
    throw new Error("12개 문항이어야 합니다.");
  }
  if (listIndex !== 0 && listIndex !== 1 && listIndex !== 2) {
    throw new Error("장 번호는 0, 1, 2여야 합니다.");
  }

  return enqueue(async () => {
    const record: SavedTwoCharRecord = {
      id: newId(),
      savedAt: now.toISOString(),
      schemaVersion: TWO_CHAR_RECORD_VERSION,
      listIndex,
      summary,
    };

    // 통합 모듈로 서버 전송
    await sendRecord("wrsDouble", record);

    return record;
  });
}

// 전체 두 글자 훈련 기록 삭제
export function clearTwoCharRecords(): Promise<void> {
  return enqueue(async () => {
    // 통합 모듈로 서버 데이터 삭제
    await deleteRecord("wrsDouble");
  });
}