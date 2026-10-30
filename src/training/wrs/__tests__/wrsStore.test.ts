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

import { WRS_SHORT_COUNT, WRS_TRIAL_COUNT } from "@/training/wrs/wrsSession";
import {
  appendWrsSummary,
  clearWrsRecords,
  listWrsRecords,
  MAX_WRS_SESSIONS,
} from "@/training/wrs/wrsStore";

const storageMock = AsyncStorage as unknown as { __reset: () => void };

function fullSummary(correctCount: number) {
  return {
    trialCount: WRS_TRIAL_COUNT,
    correctCount,
    percent: Math.round((100 * correctCount) / WRS_TRIAL_COUNT),
  };
}

describe("wrsStore", () => {
  beforeEach(() => {
    storageMock.__reset();
  });

  it("최신이 앞에 오고 50건을 넘으면 오래된 것을 버린다", async () => {
    for (let i = 0; i < MAX_WRS_SESSIONS + 2; i += 1) {
      await appendWrsSummary(
        fullSummary(i % 26),
        new Date(2026, 7, 1, 12, i),
      );
    }
    const rows = await listWrsRecords();
    expect(rows).toHaveLength(MAX_WRS_SESSIONS);
    expect(rows[0]?.summary.correctCount).toBe((MAX_WRS_SESSIONS + 1) % 26);
  });

  it("12개도 저장한다", async () => {
    const saved = await appendWrsSummary({
      trialCount: WRS_SHORT_COUNT,
      correctCount: 9,
      percent: 75,
    });
    const rows = await listWrsRecords();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(saved.id);
    expect(rows[0]?.summary.trialCount).toBe(WRS_SHORT_COUNT);
  });

  it("12·25개가 아니면 저장하지 않는다", async () => {
    await expect(
      appendWrsSummary({ trialCount: 3, correctCount: 2, percent: 67 }),
    ).rejects.toThrow("wrs record needs a full 12- or 25-trial list");
    expect(await listWrsRecords()).toHaveLength(0);
  });

  it("지우면 목록이 비다", async () => {
    await appendWrsSummary(fullSummary(10));
    await clearWrsRecords();
    expect(await listWrsRecords()).toHaveLength(0);
  });
});
