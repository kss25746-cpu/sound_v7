import { TWO_CHAR_LISTS } from "@/training/wrs/twoCharLists";
import {
  createTwoCharTrials,
  isDissimilar,
  nextTwoCharListIndex,
  nextTwoCharListIndexFrom,
  pickDissimilar,
  TWO_CHAR_TRIAL_COUNT,
} from "@/training/wrs/twoCharSession";

function rngFrom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

describe("twoChar lists", () => {
  it("세 장 모두 12개이고 정답·어려운 오답이 다르다", () => {
    expect(TWO_CHAR_LISTS).toHaveLength(3);
    for (const list of TWO_CHAR_LISTS) {
      expect(list).toHaveLength(TWO_CHAR_TRIAL_COUNT);
      const targets = list.map((row) => row.target);
      expect(new Set(targets).size).toBe(12);
      for (const row of list) {
        expect(row.target).not.toBe(row.hard);
      }
    }
  });
});

describe("nextTwoCharListIndex", () => {
  it("완료 횟수에 따라 0·1·2를 돈다", () => {
    expect(nextTwoCharListIndex(0)).toBe(0);
    expect(nextTwoCharListIndex(1)).toBe(1);
    expect(nextTwoCharListIndex(2)).toBe(2);
    expect(nextTwoCharListIndex(3)).toBe(0);
  });
});

describe("nextTwoCharListIndexFrom", () => {
  it("기록이 50개이고 최근 장이 2이면 다음은 0이다", () => {
    const rows = [
      { listIndex: 2 },
      ...Array.from({ length: 49 }, () => ({ listIndex: 1 })),
    ];
    expect(nextTwoCharListIndexFrom(rows)).toBe(0);
  });

  it("장 번호가 없으면 기록 수로 계산한다", () => {
    const rows = Array.from({ length: 50 }, () => ({}));
    expect(nextTwoCharListIndexFrom(rows)).toBe(2);
  });
});

describe("createTwoCharTrials", () => {
  it("12개이고 각 보기에 정답과 어려운 오답이 있다", () => {
    for (const listIndex of [0, 1, 2]) {
      const trials = createTwoCharTrials(listIndex, rngFrom(42 + listIndex));
      expect(trials).toHaveLength(12);
      const list = TWO_CHAR_LISTS[listIndex];
      for (const trial of trials) {
        const item = list.find((row) => row.target === trial.target);
        expect(item).toBeDefined();
        expect(trial.choices).toContain(trial.target);
        expect(trial.choices).toContain(item?.hard);
        expect(new Set(trial.choices).size).toBe(4);
      }
    }
  });

  it("편지 보기에서 먼지 말고 둘은 음절이 안 겹친다", () => {
    const list = TWO_CHAR_LISTS[0];
    const item = list.find((row) => row.target === "편지");
    expect(item).toBeDefined();
    if (!item) {
      return;
    }
    const extra = pickDissimilar(list, item, rngFrom(7));
    expect(extra).toHaveLength(2);
    for (const word of extra) {
      expect(isDissimilar(word, "편지", "먼지")).toBe(true);
    }
  });
});
