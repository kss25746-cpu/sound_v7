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
  INST_TRIAL_COUNT,
  summarizeInst,
  type InstOutcome,
  type InstSummary,
} from "@/training/inst/instSession";
import {
  appendInstSummary,
  clearInstRecords,
  INST_RECORD_VERSION,
  listInstRecords,
  MAX_INST_SESSIONS,
} from "@/training/inst/instStore";

type MockStorage = typeof AsyncStorage & { __reset: () => void };

const STORAGE_KEY = "training.instSessions.v1";

function fullSummary(correctCount: number): InstSummary {
  const outcomes: InstOutcome[] = Array.from(
    { length: INST_TRIAL_COUNT },
    (_, index) => ({
      target: "piano",
      choice: index < correctCount ? "piano" : "guitar",
      correct: index < correctCount,
    }),
  );
  return summarizeInst(outcomes);
}

beforeEach(() => {
  (AsyncStorage as MockStorage).__reset();
});

describe("appendInstSummary", () => {
  it("최신 기록이 앞에 오게 쌓는다", async () => {
    await appendInstSummary(fullSummary(8), new Date("2026-08-01T10:00:00Z"));
    await appendInstSummary(fullSummary(11), new Date("2026-08-02T10:00:00Z"));

    const rows = await listInstRecords();
    expect(rows).toHaveLength(2);
    expect(rows[0]?.summary.correctCount).toBe(11);
    expect(rows[0]?.schemaVersion).toBe(INST_RECORD_VERSION);
  });

  it("12개를 다 채우지 않은 요약은 거부한다", async () => {
    await expect(
      appendInstSummary({ trialCount: 5, correctCount: 5, percent: 100 }),
    ).rejects.toThrow();
    expect(await listInstRecords()).toEqual([]);
  });

  it("맞힌 수가 시행 수보다 많으면 거부한다", async () => {
    await expect(
      appendInstSummary({
        trialCount: INST_TRIAL_COUNT,
        correctCount: INST_TRIAL_COUNT + 1,
        percent: 100,
      }),
    ).rejects.toThrow();
  });

  it("상한을 넘으면 오래된 것부터 버린다", async () => {
    for (let i = 0; i < MAX_INST_SESSIONS + 3; i += 1) {
      const day = String((i % 28) + 1).padStart(2, "0");
      const hour = String(i % 24).padStart(2, "0");
      await appendInstSummary(
        fullSummary(i % (INST_TRIAL_COUNT + 1)),
        new Date(`2026-01-${day}T${hour}:00:00Z`),
      );
    }
    expect(await listInstRecords()).toHaveLength(MAX_INST_SESSIONS);
  });
});

describe("listInstRecords", () => {
  it("깨진 기록은 목록에서 뺀다", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: "a", savedAt: "2026-08-01T10:00:00.000Z" },
        {
          id: "b",
          savedAt: "2026-08-02T10:00:00.000Z",
          schemaVersion: INST_RECORD_VERSION,
          summary: { trialCount: INST_TRIAL_COUNT, correctCount: 9, percent: 75 },
        },
      ]),
    );
    const rows = await listInstRecords();
    expect(rows.map((row) => row.id)).toEqual(["b"]);
  });

  it("JSON이 아니면 빈 목록", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "{not json");
    expect(await listInstRecords()).toEqual([]);
  });
});

describe("clearInstRecords", () => {
  it("이 종목 기록만 지운다", async () => {
    await AsyncStorage.setItem("training.sentClosedSessions.v1", "[]");
    await appendInstSummary(fullSummary(7));
    await clearInstRecords();

    expect(await listInstRecords()).toEqual([]);
    expect(
      await AsyncStorage.getItem("training.sentClosedSessions.v1"),
    ).toBe("[]");
  });
});
