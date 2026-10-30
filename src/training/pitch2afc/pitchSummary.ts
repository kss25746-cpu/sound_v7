import {
  PITCH_TRIAL_COUNT,
  type PitchLevelCents,
} from "@/training/pitch2afc/constants";

/**
 * 「높낮이 비교」 세션 요약 — 저장 스키마의 단일 출처.
 *
 * 재는 것은 고정 간격에서 맞힌 비율이다. 반전 평균 cent·진단 역치가 아니다.
 */

export type PitchCompareEndReason = "complete" | "manual";

export type PitchCompareSummary = {
  trialCount: number;
  correctCount: number;
  percent: number;
  /** 고정 단계. 구(계단법) 기록은 칸을 모르므로 null. */
  levelCents: PitchLevelCents | null;
  endReason: PitchCompareEndReason;
};

export function percentOf(correctCount: number, trialCount: number): number {
  return trialCount <= 0
    ? 0
    : Math.round((100 * correctCount) / trialCount);
}

export function summarizePitchCompare(options: {
  trialCount: number;
  correctCount: number;
  levelCents: PitchLevelCents | null;
  endReason: PitchCompareEndReason;
}): PitchCompareSummary {
  return {
    trialCount: options.trialCount,
    correctCount: options.correctCount,
    percent: percentOf(options.correctCount, options.trialCount),
    levelCents: options.levelCents,
    endReason: options.endReason,
  };
}

export function pitchEndReasonLabel(reason: PitchCompareEndReason): string {
  return reason === "complete"
    ? `${PITCH_TRIAL_COUNT}문항을 마쳤어요`
    : "연습을 끝냈어요";
}

export function isFullPitchSession(trialCount: number): boolean {
  return trialCount === PITCH_TRIAL_COUNT;
}
