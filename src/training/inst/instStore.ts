import {
  INST_TRIAL_COUNT,
  type InstSummary,
} from "@/training/inst/instSession";

// 통합 모듈 가져오기
import { sendRecord, fetchRecord, deleteRecord } from "@/chongyeon/hooks/useSyncGameData";

export const INST_RECORD_VERSION = 1;
export const MAX_INST_SESSIONS = 50;

export type { InstSummary };

export type SavedInstRecord = {
  id: string;
  savedAt: string;
  schemaVersion: number;
  summary: InstSummary;
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isInRange(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidSummary(value: unknown): value is InstSummary {
  return (
    isPlainObject(value) &&
    value.trialCount === INST_TRIAL_COUNT &&
    isInRange(value.correctCount, 0, INST_TRIAL_COUNT) &&
    isInRange(value.percent, 0, 100)
  );
}

function isValidRecord(value: unknown): value is SavedInstRecord {
  return (
    isPlainObject(value) &&
    typeof value.id === "string" &&
    typeof value.savedAt === "string" &&
    typeof value.schemaVersion === "number" &&
    isValidSummary(value.summary)
  );
}

let tail: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(task, task);
  tail = run.catch(() => undefined);
  return run;
}

// 통합 모듈을 통해 서버에서 듣고고르기 기록 목록 가져오기
async function readAllRaw(): Promise<SavedInstRecord[]> {
  const data = await fetchRecord("listenChoose", MAX_INST_SESSIONS);
  if (!Array.isArray(data)) return [];

  // DB 컬럼명을 앱 규격 객체로 변환
  const mapped: SavedInstRecord[] = data.map((row: any) => ({
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

function sortNewestFirst(
  rows: readonly SavedInstRecord[],
): SavedInstRecord[] {
  return [...rows].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

// 전체 듣고고르기 훈련 기록 조회 (문의하신 함수)
export function listInstRecords(): Promise<SavedInstRecord[]> {
  return enqueue(async () => sortNewestFirst(await readAllRaw()));
}

// 세션 종료 요약 저장
export async function appendInstSummary(
  summary: InstSummary,
  now: Date = new Date(),
): Promise<SavedInstRecord> {
  if (summary.trialCount !== INST_TRIAL_COUNT) {
    throw new Error("12개 문항이어야 합니다.");
  }
  if (!isInRange(summary.correctCount, 0, summary.trialCount)) {
    throw new Error("정답 수가 범위를 벗어났습니다.");
  }

  return enqueue(async () => {
    const record: SavedInstRecord = {
      id: newId(),
      savedAt: now.toISOString(),
      schemaVersion: INST_RECORD_VERSION,
      summary,
    };

    // 통합 모듈로 서버 전송
    await sendRecord("listenChoose", record);

    return record;
  });
}

// 전체 듣고고르기 훈련 기록 삭제
export function clearInstRecords(): Promise<void> {
  return enqueue(async () => {
    // 통합 모듈로 서버 데이터 삭제
    await deleteRecord("listenChoose");
  });
}

// 저장 일시 포맷 헬퍼
export function formatInstSavedAt(iso: string): string {
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