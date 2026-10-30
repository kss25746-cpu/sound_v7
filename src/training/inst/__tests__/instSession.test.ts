import {
  collectInstrumentResults,
  createInstTrials,
  INST_TRIAL_COUNT,
  instResultCopy,
  instWeakestCopy,
  instWeakestIds,
  REPEATS_PER_INSTRUMENT,
  scoreInstChoice,
  summarizeInst,
  type InstOutcome,
} from "@/training/inst/instSession";
import {
  INSTRUMENT_IDS,
  type InstrumentId,
} from "@/training/inst/instruments";
import { INST_NOTE_IDS } from "@/training/inst/instSounds";

function rngFrom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

/** 씨앗을 바꿔 가며 여러 벌을 본다 — 한 벌만 보면 우연히 통과한다. */
const SEEDS = [1, 7, 42, 137, 999, 20260828];

describe("createInstTrials", () => {
  it("악기마다 같은 횟수씩 12시행", () => {
    for (const seed of SEEDS) {
      const trials = createInstTrials(rngFrom(seed));
      expect(trials).toHaveLength(INST_TRIAL_COUNT);
      for (const id of INSTRUMENT_IDS) {
        const mine = trials.filter((trial) => trial.target === id);
        expect(mine).toHaveLength(REPEATS_PER_INSTRUMENT);
      }
    }
  });

  it("같은 악기가 연달아 나오지 않는다", () => {
    for (const seed of SEEDS) {
      const trials = createInstTrials(rngFrom(seed));
      for (let i = 1; i < trials.length; i += 1) {
        expect(trials[i]?.target).not.toBe(trials[i - 1]?.target);
      }
    }
  });

  it("한 악기의 세 시행은 서로 다른 높이로 난다", () => {
    for (const seed of SEEDS) {
      const trials = createInstTrials(rngFrom(seed));
      for (const id of INSTRUMENT_IDS) {
        const notes = trials
          .filter((trial) => trial.target === id)
          .map((trial) => trial.note);
        expect(new Set(notes).size).toBe(REPEATS_PER_INSTRUMENT);
      }
    }
  });

  it("높이는 정해진 목록에서만 나온다", () => {
    const trials = createInstTrials(rngFrom(42));
    for (const trial of trials) {
      expect(INST_NOTE_IDS).toContain(trial.note);
    }
  });
});

describe("scoreInstChoice", () => {
  it("같은 악기면 맞다", () => {
    expect(scoreInstChoice("piano", "piano")).toBe(true);
    expect(scoreInstChoice("piano", "guitar")).toBe(false);
  });
});

function outcome(
  target: InstrumentId,
  choice: InstrumentId,
): InstOutcome {
  return { target, choice, correct: target === choice };
}

describe("summarizeInst", () => {
  it("정답률을 반올림한다", () => {
    const summary = summarizeInst([
      outcome("piano", "piano"),
      outcome("guitar", "violin"),
      outcome("flute", "flute"),
    ]);
    expect(summary).toEqual({ trialCount: 3, correctCount: 2, percent: 67 });
  });

  it("빈 세션은 0%", () => {
    expect(summarizeInst([])).toEqual({
      trialCount: 0,
      correctCount: 0,
      percent: 0,
    });
  });
});

describe("instResultCopy", () => {
  it("다 채운 세션은 맞힌 개수만 말한다", () => {
    expect(
      instResultCopy({ trialCount: 12, correctCount: 9, percent: 75 }),
    ).toBe("12개 중 9개를 맞혔어요");
  });

  it("덜 채우면 기록에 안 남는다고 알린다", () => {
    expect(
      instResultCopy({ trialCount: 5, correctCount: 4, percent: 80 }),
    ).toContain("기록에는 안 남겼어요");
  });

  it("한 문항도 안 했으면 기록할 내용이 없다", () => {
    expect(
      instResultCopy({ trialCount: 0, correctCount: 0, percent: 0 }),
    ).toBe("연습이 짧아서 기록할 내용이 없어요");
  });
});

describe("collectInstrumentResults", () => {
  it("악기별로 시행 수와 맞힌 수를 센다", () => {
    const tally = collectInstrumentResults([
      outcome("piano", "piano"),
      outcome("piano", "guitar"),
      outcome("violin", "violin"),
    ]);
    expect(tally.piano).toEqual({ trialCount: 2, correctCount: 1 });
    expect(tally.violin).toEqual({ trialCount: 1, correctCount: 1 });
    // 안 나온 악기도 칸은 있다 — 요약 표가 늘 넷을 그린다.
    expect(tally.flute).toEqual({ trialCount: 0, correctCount: 0 });
  });
});

describe("instWeakestIds", () => {
  it("가장 아쉬운 악기가 하나면 그것을 짚는다", () => {
    const tally = collectInstrumentResults([
      outcome("piano", "guitar"),
      outcome("piano", "guitar"),
      outcome("violin", "flute"),
      outcome("flute", "flute"),
    ]);
    expect(instWeakestIds(tally)).toEqual(["piano"]);
    expect(instWeakestCopy(tally)).toBe("이번엔 피아노 소리가 가장 아쉬웠어요");
  });

  it("다 맞혔으면 아무 말도 하지 않는다", () => {
    const tally = collectInstrumentResults([
      outcome("piano", "piano"),
      outcome("guitar", "guitar"),
    ]);
    expect(instWeakestIds(tally)).toBeNull();
    expect(instWeakestCopy(tally)).toBeNull();
  });

  it("아쉬운 악기가 둘이면 같이 짚는다", () => {
    const tally = collectInstrumentResults([
      outcome("piano", "guitar"),
      outcome("guitar", "piano"),
    ]);
    expect(instWeakestIds(tally)).toEqual(["piano", "guitar"]);
    expect(instWeakestCopy(tally)).toBe(
      "이번엔 피아노·기타 소리가 가장 아쉬웠어요",
    );
  });

  it("아쉬운 악기가 셋이면 같이 짚는다", () => {
    const tally = collectInstrumentResults([
      outcome("piano", "guitar"),
      outcome("guitar", "piano"),
      outcome("violin", "flute"),
      outcome("flute", "flute"),
    ]);
    expect(instWeakestIds(tally)).toEqual(["piano", "guitar", "violin"]);
    expect(instWeakestCopy(tally)).toBe(
      "이번엔 피아노·기타·바이올린 소리가 가장 아쉬웠어요",
    );
  });

  it("넷이 같은 횟수로 틀리면 아무 말도 하지 않는다", () => {
    const tally = collectInstrumentResults([
      outcome("piano", "guitar"),
      outcome("guitar", "piano"),
      outcome("violin", "flute"),
      outcome("flute", "violin"),
    ]);
    expect(instWeakestIds(tally)).toBeNull();
    expect(instWeakestCopy(tally)).toBeNull();
  });
});
