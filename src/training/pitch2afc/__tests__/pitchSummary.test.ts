import { PITCH_TRIAL_COUNT } from "../constants";
import {
  isFullPitchSession,
  percentOf,
  summarizePitchCompare,
} from "../pitchSummary";

describe("pitchSummary", () => {
  it("12문항이면 꽉 찬 판이다", () => {
    expect(isFullPitchSession(PITCH_TRIAL_COUNT)).toBe(true);
    expect(isFullPitchSession(11)).toBe(false);
  });

  it("맞힌 비율을 반올림한다", () => {
    expect(percentOf(2, 3)).toBe(67);
    expect(percentOf(0, 12)).toBe(0);
    expect(percentOf(0, 0)).toBe(0);
  });

  it("요약에 고정 단계와 비율을 넣는다", () => {
    expect(
      summarizePitchCompare({
        trialCount: 12,
        correctCount: 9,
        levelCents: 100,
        endReason: "complete",
      }),
    ).toEqual({
      trialCount: 12,
      correctCount: 9,
      percent: 75,
      levelCents: 100,
      endReason: "complete",
    });
  });
});
