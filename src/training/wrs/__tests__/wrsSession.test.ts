import {
  createWrsTrials,
  scoreWrsChoice,
  summarizeWrs,
  WRS_SHORT_COUNT,
  WRS_TRIAL_COUNT,
  wrsResultCopy,
} from "@/training/wrs/wrsSession";

function rngFrom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

describe("createWrsTrials", () => {
  it("25개 시행이고 각 보기에 정답이 들어 있다", () => {
    const trials = createWrsTrials(rngFrom(42));
    expect(trials).toHaveLength(WRS_TRIAL_COUNT);
    const targets = trials.map((trial) => trial.target);
    expect(new Set(targets).size).toBe(WRS_TRIAL_COUNT);
    for (const trial of trials) {
      expect(trial.choices).toContain(trial.target);
      expect(new Set(trial.choices).size).toBe(4);
    }
  });

  it("12개로 뽑으면 정답이 겹치지 않는다", () => {
    const trials = createWrsTrials(rngFrom(7), WRS_SHORT_COUNT);
    expect(trials).toHaveLength(WRS_SHORT_COUNT);
    expect(new Set(trials.map((trial) => trial.target)).size).toBe(
      WRS_SHORT_COUNT,
    );
  });
});

describe("scoreWrsChoice", () => {
  it("같은 단어면 맞다", () => {
    expect(scoreWrsChoice("감", "감")).toBe(true);
    expect(scoreWrsChoice("감", "밤")).toBe(false);
  });
});

describe("summarizeWrs", () => {
  it("정답률을 반올림한다", () => {
    const summary = summarizeWrs([
      { target: "감", choice: "감", correct: true, axis: "cho" },
      { target: "밤", choice: "담", correct: false, axis: "cho" },
      { target: "남", choice: "남", correct: true, axis: "jong" },
    ]);
    expect(summary).toEqual({ trialCount: 3, correctCount: 2, percent: 67 });
    expect(wrsResultCopy(summary)).toBe("3개 중 2개를 맞혔어요");
  });
});
