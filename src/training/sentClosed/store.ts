import {
  isSentClosedSessionLength,
  type SentClosedSummary,
} from "@/training/sentClosed/trials";

// 통합 모듈 가져오기
import { sendRecord, fetchRecord, deleteRecord } from "@/chongyeon/hooks/useSyncGameData";



export const SENT_CLOSED_RECORD_VERSION = 2;
export const MAX_SENT_CLOSED_SESSIONS = 50;

export type { SentClosedSummary };

export type SavedSentClosedRecord = {
  id: string;
  savedAt: string;
  schemaVersion: number;
  summary: SentClosedSummary;
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

/** 맞힌 수·비율이 다 있어야 한다. 없거나 반쪽인 기록은 목록에서 뺀다. */
function isValidSummary(value: unknown): value is SentClosedSummary {
  if (!isPlainObject(value) || typeof value.trialCount !== "number") {
    return false;
  }
  if (!isSentClosedSessionLength(value.trialCount)) {
    return false;
  }
  return (
    isInRange(value.correctCount, 0, value.trialCount) &&
    isInRange(value.percent, 0, 100)
  );
}

function isValidRecord(value: unknown): value is SavedSentClosedRecord {
  return (
    isPlainObject(value) &&
    typeof value.id === "string" &&
    typeof value.savedAt === "string" &&
    typeof value.schemaVersion === "number" &&
    isValidSummary(value.summary)
  );
}

/** 읽기·쓰기를 한 줄로 세운다 — 두 세션이 겹쳐 저장돼도 뒤엣것이 앞엣것을 덮지 않는다. */
let tail: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(task, task);
  tail = run.catch(() => undefined);
  return run;
}

// 통합 모듈을 통해 서버에서 문장듣기 기록 목록 가져오기
async function readAllRaw(): Promise<SavedSentClosedRecord[]> {
  const data = await fetchRecord("sentenceListen", MAX_SENT_CLOSED_SESSIONS);
  if (!Array.isArray(data)) return [];

  // DB 컬럼명을 앱 규격 객체로 변환
  const mapped: SavedSentClosedRecord[] = data.map((row: any) => ({
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
  rows: readonly SavedSentClosedRecord[],
): SavedSentClosedRecord[] {
  return [...rows].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function listSentClosedRecords(): Promise<SavedSentClosedRecord[]> {
  return enqueue(async () => sortNewestFirst(await readAllRaw()));
}

// 세션 종료 요약 저장
export async function appendSentClosedSummary(
  summary: SentClosedSummary,
  now: Date = new Date(),
): Promise<SavedSentClosedRecord> {
  if (!isSentClosedSessionLength(summary.trialCount)) {
    throw new Error("9개 또는 18개 문항이어야 합니다.");
  }
  if (!isInRange(summary.correctCount, 0, summary.trialCount)) {
    throw new Error("정답 수가 범위를 벗어났습니다.");
  }

  return enqueue(async () => {
    const record: SavedSentClosedRecord = {
      id: newId(),
      savedAt: now.toISOString(),
      schemaVersion: SENT_CLOSED_RECORD_VERSION,
      summary,
    };

    // 통합 모듈로 서버 전송
    await sendRecord("sentenceListen", record);

    return record;
  });
}

// 전체 문장듣기 훈련 기록 삭제
export function clearSentClosedRecords(): Promise<void> {
  return enqueue(async () => {
    // 통합 모듈로 서버 데이터 삭제
    await deleteRecord("sentenceListen");
  });
}
export function formatSentClosedSavedAt(iso: string): string {
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
