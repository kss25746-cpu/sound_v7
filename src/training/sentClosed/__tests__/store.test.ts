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

import {
    appendSentClosedSummary,
    clearSentClosedRecords,
    listSentClosedRecords,
    MAX_SENT_CLOSED_SESSIONS,
    SENT_CLOSED_RECORD_VERSION,
} from "@/training/sentClosed/store";
import {
    SENT_CLOSED_SHORT_COUNT,
    SENT_CLOSED_TRIAL_COUNT,
    summarizeSentClosed,
} from "@/training/sentClosed/trials";

const storageMock = AsyncStorage as unknown as { __reset: () => void };

/** 고른 문항 수를 다 푼 세션. 맞힌 개수만 바꿔 가며 쓴다. */
function fullRun(correctCount: number, trialCount = SENT_CLOSED_TRIAL_COUNT) {
  return summarizeSentClosed(
    Array.from({ length: trialCount }, (_, index) => ({
      target: "father_phone" as const,
      choice: "father_phone" as const,
      correct: index < correctCount,
    })),
  );
}

describe("sentClosedStore", () => {
  beforeEach(() => {
    storageMock.__reset();
  });

  it("최신이 앞에 오고 50건을 넘으면 오래된 것을 버린다", async () => {
    for (let i = 0; i < MAX_SENT_CLOSED_SESSIONS + 2; i += 1) {
      await appendSentClosedSummary(fullRun(9), new Date(2026, 7, 1, 12, i));
    }
    const rows = await listSentClosedRecords();
    expect(rows).toHaveLength(MAX_SENT_CLOSED_SESSIONS);
    expect(rows[0]?.savedAt).toBe(new Date(2026, 7, 1, 12, 51).toISOString());
  });

  it("9·18이 아니면 저장하지 않는다", async () => {
    await expect(
      appendSentClosedSummary({ trialCount: 3, correctCount: 2, percent: 67 }),
    ).rejects.toThrow("sent-closed record needs a full 9- or 18-trial list");
    expect(await listSentClosedRecords()).toHaveLength(0);
  });

  it("9개를 다 고르면 비율과 함께 남긴다", async () => {
    const saved = await appendSentClosedSummary(
      fullRun(6, SENT_CLOSED_SHORT_COUNT),
    );
    expect(saved.summary).toEqual({
      trialCount: SENT_CLOSED_SHORT_COUNT,
      correctCount: 6,
      percent: 67,
    });
  });

  it("맞힌 수와 비율을 함께 남긴다", async () => {
    const saved = await appendSentClosedSummary(fullRun(12));
    expect(saved.schemaVersion).toBe(SENT_CLOSED_RECORD_VERSION);
    expect(saved.summary).toEqual({
      trialCount: SENT_CLOSED_TRIAL_COUNT,
      correctCount: 12,
      percent: 67,
    });
  });

  it("맞힌 수가 문항 수를 넘으면 저장하지 않는다", async () => {
    await expect(
      appendSentClosedSummary({
        trialCount: SENT_CLOSED_TRIAL_COUNT,
        correctCount: SENT_CLOSED_TRIAL_COUNT + 1,
        percent: 100,
      }),
    ).rejects.toThrow("sent-closed record has an impossible correct count");
    expect(await listSentClosedRecords()).toHaveLength(0);
  });

  /** v1(들은 횟수만)은 배포 전에 사라진 형식이라 읽을 때 버린다. */
  it("옛 기록(들은 횟수만)은 읽을 때 버린다", async () => {
    await AsyncStorage.setItem(
      "training.sentClosedSessions.v1",
      JSON.stringify([
        {
          id: "old-1",
          savedAt: new Date(2026, 7, 1, 9, 0).toISOString(),
          schemaVersion: 1,
          summary: { trialCount: SENT_CLOSED_TRIAL_COUNT },
        },
      ]),
    );
    const saved = await appendSentClosedSummary(
      fullRun(12),
      new Date(2026, 7, 1, 10, 0),
    );
    const rows = await listSentClosedRecords();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(saved.id);
  });

  it("맞힌 수와 비율이 하나만 있으면 버린다", async () => {
    const savedAt = new Date(2026, 7, 1, 9, 0).toISOString();
    await AsyncStorage.setItem(
      "training.sentClosedSessions.v1",
      JSON.stringify([
        {
          id: "half-correct",
          savedAt,
          schemaVersion: 2,
          summary: { trialCount: SENT_CLOSED_TRIAL_COUNT, correctCount: 9 },
        },
        {
          id: "half-percent",
          savedAt,
          schemaVersion: 2,
          summary: { trialCount: SENT_CLOSED_TRIAL_COUNT, percent: 50 },
        },
      ]),
    );
    expect(await listSentClosedRecords()).toHaveLength(0);
  });

  it("지우면 목록이 비다", async () => {
    await appendSentClosedSummary(fullRun(18));
    await clearSentClosedRecords();
    expect(await listSentClosedRecords()).toHaveLength(0);
  });
});
