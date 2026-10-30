import {
  isCompletePhonemeMap,
  type Ling6DailySummary,
  type Ling6PhonemeMap,
  passCountOf,
} from "@/training/ling6/ling6Session";
import { LING6_SOUND_IDS, type Ling6SoundId } from "@/training/ling6/sounds";

// 통합 모듈 가져오기
import { sendRecord, fetchRecord, deleteRecord } from "@/chongyeon/hooks/useSyncGameData";

export const LING6_RECORD_VERSION = 1;
export const MAX_LING6_DAYS = 50;
export const HIGH_FREQ_LOOKBACK_DAYS = 6;

export type SavedLing6Record = {
  id: string;
  dateKey: string;
  savedAt: string;
  schemaVersion: number;
  summary: Ling6DailySummary;
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

function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isPhonemeMap(value: unknown): value is Ling6PhonemeMap {
  if (!isPlainObject(value)) {
    return false;
  }
  return LING6_SOUND_IDS.every((id: Ling6SoundId) => typeof value[id] === "boolean");
}

function isValidRecord(value: unknown): value is SavedLing6Record {
  if (!isPlainObject(value)) {
    return false;
  }
  if (typeof value.id !== "string" || typeof value.savedAt !== "string") {
    return false;
  }
  if (!isDateKey(value.dateKey)) {
    return false;
  }
  if (!isPlainObject(value.summary)) {
    return false;
  }
  if (!isPhonemeMap(value.summary.byPhoneme)) {
    return false;
  }
  if (!isFiniteNumber(value.summary.passCount)) {
    return false;
  }
  return value.summary.passCount === passCountOf(value.summary.byPhoneme);
}

export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const next = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
  next.setDate(next.getDate() + days);
  return localDateKey(next);
}

export function formatDateKeyShort(dateKey: string): string {
  const parts = dateKey.split("-");
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  return `${month}/${day}`;
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

// 안전한 YYYY-MM-DD 변환 함수
function toSafeDateKey(raw: any): string {
  if (!raw) return "";
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  
  const d = new Date(str);
  if (!Number.isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return str.slice(0, 10);
}

// 통합 모듈을 통해 서버 데이터 불러오기
async function readAllRaw(): Promise<SavedLing6Record[]> {
  const data = await fetchRecord("ling6", MAX_LING6_DAYS);
  if (!Array.isArray(data)) return [];

  // DB 컬럼명을 앱 규격 객체로 변환
  const mapped: SavedLing6Record[] = data.map((row: any) => ({
    id: row.id,
    dateKey: toSafeDateKey(row.date_key),
    savedAt: typeof row.saved_at === "string" ? row.saved_at : new Date(row.saved_at).toISOString(),
    schemaVersion: row.schema_version,
    summary: {
      passCount: row.pass_count,
      byPhoneme: {
        m: row.phoneme_m,
        u: row.phoneme_u,
        a: row.phoneme_a,
        i: row.phoneme_i,
        sh: row.phoneme_sh,
        s: row.phoneme_s,
      },
    },
  }));

  return mapped.filter(isValidRecord);
}

function sortNewestFirst(rows: readonly SavedLing6Record[]): SavedLing6Record[] {
  return [...rows].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

// 전체 링 6 기록 조회
export async function listLing6DailyRecords(): Promise<SavedLing6Record[]> {
  return enqueue(async () => sortNewestFirst(await readAllRaw()));
}

// 그날 점검 1건 덮어쓰기 저장
export async function upsertLing6DailyRecord(
  byPhoneme: Ling6PhonemeMap,
  now: Date = new Date(),
): Promise<SavedLing6Record> {
  if (!isCompletePhonemeMap(byPhoneme)) {
    throw new Error("6개 음소가 모두 필요합니다.");
  }

  return enqueue(async () => {
    const dateKey = localDateKey(now);
    const rows = await readAllRaw();
    const existing = rows.find((row) => row.dateKey === dateKey);
    const record: SavedLing6Record = {
      id: existing?.id ?? newId(),
      dateKey,
      savedAt: now.toISOString(),
      schemaVersion: LING6_RECORD_VERSION,
      summary: {
        passCount: passCountOf(byPhoneme),
        byPhoneme,
      },
    };

    // 통합 모듈로 서버 전송
    await sendRecord("ling6", record);

    return record;
  });
}

// 오늘을 제외한 가장 최근 날짜의 통과 개수 조회
export async function peekPreviousDayPassCount(
  todayKey: string = localDateKey(),
): Promise<number | null> {
  const rows = await listLing6DailyRecords();
  const previous = rows.find((row) => row.dateKey < todayKey);
  return previous ? previous.summary.passCount : null;
}

// 고주파 기준 음소 기록 조회
export async function peekHighFreqBaseline(
  todayKey: string = localDateKey(),
): Promise<Ling6PhonemeMap | null> {
  const cutoff = shiftDateKey(todayKey, -HIGH_FREQ_LOOKBACK_DAYS);
  const rows = await listLing6DailyRecords();
  const previous = rows.find((row) => row.dateKey <= cutoff);
  return previous ? previous.summary.byPhoneme : null;
}

// 전체 링 6 기록 삭제
export function clearLing6DailyRecords(): Promise<void> {
  return enqueue(async () => {
    // 통합 모듈로 서버 데이터 삭제
    await deleteRecord("ling6");
  });
}