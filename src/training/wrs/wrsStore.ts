import {
  isWrsSessionLength,
  type WrsSessionSummary,
} from "@/training/wrs/wrsSession";

// 통합 모듈 가져오기
import { sendRecord, fetchRecord, deleteRecord } from "@/chongyeon/hooks/useSyncGameData";

export const WRS_RECORD_VERSION = 1;
export const MAX_WRS_SESSIONS = 50;

export type SavedWrsRecord = {
  id: string;
  savedAt: string;
  schemaVersion: number;
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
  if (
    !isFiniteNumber(value.trialCount) ||
    !isWrsSessionLength(value.trialCount)
  ) {
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

function isValidRecord(value: unknown): value is SavedWrsRecord {
  if (!isPlainObject(value)) {
    return false;
  }
  if (typeof value.id !== "string" || typeof value.savedAt !== "string") {
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

// 통합 모듈을 통해 서버에서 한 글자 기록 목록 가져오기
async function readAllRaw(): Promise<SavedWrsRecord[]> {
  const data = await fetchRecord("wrsSingle", MAX_WRS_SESSIONS);
  if (!Array.isArray(data)) return [];

  // DB 컬럼명을 앱 규격 객체로 변환
  const mapped: SavedWrsRecord[] = data.map((row: any) => ({
    id: row.id,
    savedAt: typeof row.saved_at === "string" ? row.saved_at : new Date(row.saved_at).toISOString(),
    schemaVersion: row.schema_version,
    summary: {
      trialCount: row.trial_count,
      correctCount: row.correct_count,
      percent: row.percent,
    },
  }));

  return mapped.filter(isValidRecord);
}

function sortNewestFirst(rows: readonly SavedWrsRecord[]): SavedWrsRecord[] {
  return [...rows].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

// 전체 한 글자 훈련 기록 조회 (문의하신 함수)
export async function listWrsRecords(): Promise<SavedWrsRecord[]> {
  return enqueue(async () => sortNewestFirst(await readAllRaw()));
}

// 세션 종료 요약 저장
export async function appendWrsSummary(
  summary: WrsSessionSummary,
  now: Date = new Date(),
): Promise<SavedWrsRecord> {
  if (!isWrsSessionLength(summary.trialCount)) {
    throw new Error("12개 또는 25개 문항이어야 합니다.");
  }

  return enqueue(async () => {
    const record: SavedWrsRecord = {
      id: newId(),
      savedAt: now.toISOString(),
      schemaVersion: WRS_RECORD_VERSION,
      summary,
    };

    // 통합 모듈로 서버 전송
    await sendRecord("wrsSingle", record);

    return record;
  });
}

// 전체 한 글자 훈련 기록 삭제
export function clearWrsRecords(): Promise<void> {
  return enqueue(async () => {
    // 통합 모듈로 서버 데이터 삭제
    await deleteRecord("wrsSingle");
  });
}

// 저장 일시 포맷 헬퍼
export function formatWrsSavedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hour}:${minute}`;
}