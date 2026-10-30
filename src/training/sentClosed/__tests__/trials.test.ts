import {
  createSentClosedTrials,
  scoreSentClosedChoice,
  sentClosedResultCopy,
  SENT_CLOSED_TRIALS,
  SENT_CLOSED_TRIAL_COUNT,
} from "@/training/sentClosed/trials";

describe("SENT_CLOSED_TRIALS", () => {
  it("A형 9 + B형 9 = 18이고 음원 장면은 9개다", () => {
    expect(SENT_CLOSED_TRIAL_COUNT).toBe(18);
    expect(
      SENT_CLOSED_TRIALS.filter((trial) => trial.kind === "A"),
    ).toHaveLength(9);
    expect(
      SENT_CLOSED_TRIALS.filter((trial) => trial.kind === "B"),
    ).toHaveLength(9);
    const targets = new Set(SENT_CLOSED_TRIALS.map((trial) => trial.target));
    expect(targets.size).toBe(9);
  });

  it("A1은 아버지 행 3장, 정답은 전화", () => {
    const trial = SENT_CLOSED_TRIALS.find((row) => row.id === "A1");
    expect(trial).toEqual(
      expect.objectContaining({
        kind: "A",
        target: "father_phone",
        choiceSet: ["father_phone", "father_medicine", "father_umbrella"],
      }),
    );
  });

  it("B1은 전화 열 3장, 정답은 아버지", () => {
    const trial = SENT_CLOSED_TRIALS.find((row) => row.id === "B1");
    expect(trial).toEqual(
      expect.objectContaining({
        kind: "B",
        target: "father_phone",
        choiceSet: ["father_phone", "mother_phone", "postman_phone"],
      }),
    );
  });

  it("같은 장면이 A·B 정답으로 한 번씩 쓰인다", () => {
    const a1 = SENT_CLOSED_TRIALS.find((row) => row.id === "A1");
    const b1 = SENT_CLOSED_TRIALS.find((row) => row.id === "B1");
    expect(a1?.target).toBe("father_phone");
    expect(b1?.target).toBe("father_phone");
  });
});

describe("createSentClosedTrials", () => {
  it("18개를 유지하고 각 보기에 정답이 들어 있다", () => {
    const trials = createSentClosedTrials(() => 0.3);
    expect(trials).toHaveLength(18);
    for (const trial of trials) {
      expect(trial.choices).toHaveLength(3);
      expect(trial.choices).toContain(trial.target);
      expect([...trial.choices].sort()).toEqual([...trial.choiceSet].sort());
    }
  });

  it("9개는 섞은 18개 중에서 뽑고 정답이 보기에 있다", () => {
    const trials = createSentClosedTrials(() => 0.3, 9);
    expect(trials).toHaveLength(9);
    const ids = new Set(trials.map((trial) => trial.id));
    expect(ids.size).toBe(9);
    for (const trial of trials) {
      expect(trial.choices).toContain(trial.target);
    }
  });
});

describe("scoreSentClosedChoice", () => {
  it("같은 장면만 맞다", () => {
    expect(scoreSentClosedChoice("father_phone", "father_phone")).toBe(true);
    expect(scoreSentClosedChoice("father_phone", "mother_phone")).toBe(false);
  });
});

describe("sentClosedResultCopy", () => {
  it("18개를 다 하면 일지 문구만 남긴다", () => {
    expect(sentClosedResultCopy(18)).toBe("문장 18개를 들었어요");
  });

  it("중간에 끝내면 기록 안 남김을 말한다", () => {
    expect(sentClosedResultCopy(4)).toContain("기록에는 안 남겼어요");
  });

  it("9개를 다 하면 9개 일지를 남긴다", () => {
    expect(sentClosedResultCopy(9, 9)).toBe("문장 9개를 들었어요");
  });

  it("9개 판을 중간에 끝내면 9개를 말한다", () => {
    expect(sentClosedResultCopy(4, 9)).toContain("9개를 다 고르지 않아");
  });
});
