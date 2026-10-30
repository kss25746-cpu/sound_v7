jest.mock("@react-native-async-storage/async-storage", () => {
  let store: Record<string, string> = {};
  const delay = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  return {
    __esModule: true,
    default: {
      getItem: async (key: string): Promise<string | null> => {
        await delay();
        return store[key] ?? null;
      },
      setItem: async (key: string, value: string): Promise<void> => {
        await delay();
        store[key] = value;
      },
      removeItem: async (key: string): Promise<void> => {
        await delay();
        delete store[key];
      },
      __reset: (): void => {
        store = {};
      },
    },
  };
});

import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Ling6PhonemeMap } from "@/training/ling6/ling6Session";
import {
  formatDateKeyShort,
  HIGH_FREQ_LOOKBACK_DAYS,
  listLing6DailyRecords,
  localDateKey,
  MAX_LING6_DAYS,
  peekHighFreqBaseline,
  peekPreviousDayPassCount,
  shiftDateKey,
  upsertLing6DailyRecord,
  clearLing6DailyRecords,
} from "@/training/ling6/ling6Store";

const storageMock = AsyncStorage as unknown as { __reset: () => void };

function phonemes(passCount: number): Ling6PhonemeMap {
  const ids = ["m", "u", "a", "i", "sh", "s"] as const;
  const map = {
    m: false,
    u: false,
    a: false,
    i: false,
    sh: false,
    s: false,
  };
  for (let i = 0; i < passCount; i += 1) {
    const id = ids[i];
    if (id) {
      map[id] = true;
    }
  }
  return map;
}

function day(offset: number): Date {
  const date = new Date(2026, 7, 18, 12, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
}

describe("ling6Store", () => {
  beforeEach(() => {
    storageMock.__reset();
  });

  it("같은 날은 덮어쓰고 다른 날은 쌓인다", async () => {
    await upsertLing6DailyRecord(phonemes(3), day(0));
    await upsertLing6DailyRecord(phonemes(5), day(0));
    await upsertLing6DailyRecord(phonemes(4), day(-1));

    const rows = await listLing6DailyRecords();
    expect(rows).toHaveLength(2);
    expect(rows[0]?.dateKey).toBe(localDateKey(day(0)));
    expect(rows[0]?.summary.passCount).toBe(5);
    expect(rows[1]?.summary.passCount).toBe(4);
    expect(rows[0]?.summary.byPhoneme.i).toBe(true);
    expect(rows[0]?.summary.byPhoneme.s).toBe(false);
  });

  it("지난 기록 비교는 오늘이 아니라 직전 날짜다", async () => {
    expect(await peekPreviousDayPassCount(localDateKey(day(0)))).toBeNull();

    await upsertLing6DailyRecord(phonemes(3), day(-1));
    await upsertLing6DailyRecord(phonemes(6), day(0));

    expect(await peekPreviousDayPassCount(localDateKey(day(0)))).toBe(3);
    expect(await peekPreviousDayPassCount(localDateKey(day(1)))).toBe(6);
  });

  it("고음 기준은 지난주 간격이 있을 때만 잡힌다", async () => {
    await upsertLing6DailyRecord(phonemes(2), day(-HIGH_FREQ_LOOKBACK_DAYS));
    await upsertLing6DailyRecord(phonemes(4), day(-1));
    await upsertLing6DailyRecord(phonemes(5), day(0));

    const baseline = await peekHighFreqBaseline(localDateKey(day(0)));
    expect(baseline).not.toBeNull();
    expect(baseline?.m).toBe(true);
    expect(baseline?.a).toBe(false);
  });

  it(`날짜 상한 ${MAX_LING6_DAYS}을 넘으면 오래된 날부터 버린다`, async () => {
    for (let i = 0; i < MAX_LING6_DAYS + 3; i += 1) {
      await upsertLing6DailyRecord(phonemes(i % 7), day(-i));
    }

    const rows = await listLing6DailyRecords();
    expect(rows).toHaveLength(MAX_LING6_DAYS);
    expect(rows[0]?.dateKey).toBe(localDateKey(day(0)));
    expect(rows[rows.length - 1]?.dateKey).toBe(
      localDateKey(day(-(MAX_LING6_DAYS - 1))),
    );
  });

  it("날짜 키를 짧게 표기한다", () => {
    expect(formatDateKeyShort("2026-08-18")).toBe("8/18");
    expect(shiftDateKey("2026-08-18", -6)).toBe("2026-08-12");
  });

  it("초기화하면 링 6 일자 기록만 빈다", async () => {
    await upsertLing6DailyRecord(phonemes(4), day(0));
    await upsertLing6DailyRecord(phonemes(2), day(-1));
    expect(await listLing6DailyRecords()).toHaveLength(2);

    await clearLing6DailyRecords();
    expect(await listLing6DailyRecords()).toHaveLength(0);
  });
});
