/**
 * 높낮이 비교(pitch 2AFC) 트랙 상수.
 *
 * HarmoniTune `src/constants/theme.ts`에서 이 트랙이 쓰는 값만 떼어 왔다(§4-3).
 * mnn UI 테마(`src/constants/theme.ts`)와 섞지 않는다 — 트랙별 상수는 분리 유지
 * (merge-plan-harmonitune.md §2-4).
 */

export const AUDIO = {
  /** 기본 기준음 주파수 (A4) */
  BASE_FREQ: 440,
  /** 재생 주파수 하한 (Hz) */
  FREQ_MIN_HZ: 200,
  /** 재생 주파수 상한 (Hz) */
  FREQ_MAX_HZ: 2000,
  /** 소리 A 재생 시간 (초) */
  TONE_DURATION: 1.0,
  /** A→B 사이 대기 시간 (초) */
  GAP_DURATION: 0.5,
  /** Gain Envelope 공격 시간 (초) */
  ATTACK_TIME: 0.05,
  /** Gain Envelope 릴리스 시간 (초) */
  RELEASE_TIME: 0.05,
  /** 순수 파형 모드 서스테인 게인 */
  PEAK_GAIN_WAVE: 0.4,
  /** 포먼트 합성 모드 서스테인 게인 */
  PEAK_GAIN_VOICE: 0.3,
  /** 포먼트 합성 F1 주파수 */
  FORMANT_F1: 800,
  /** 포먼트 합성 F2 주파수 */
  FORMANT_F2: 1200,
  /** 포먼트 합성 Q 값 */
  FORMANT_Q: 3.0,
} as const;

/**
 * 고정 단계. 한 판의 간격은 바뀌지 않는다(2-down-1-up 아님).
 * 화면 기본은 100(보통). 200은 예전 시작값, 100은 반음, 50은 반음의 절반.
 * 학습 효과는 검증하지 않았다. 재는 것은 그 간격의 맞힌 비율이다.
 */
export const PITCH_LEVELS = [200, 100, 50] as const;

export type PitchLevelCents = (typeof PITCH_LEVELS)[number];

/** 첫 화면 칸 이름. 200이 가장 쉽고 50이 가장 어렵다. 화면에는 숫자를 안 낸다. */
export const PITCH_LEVEL_LABEL: Record<PitchLevelCents, string> = {
  200: "쉬움",
  100: "보통",
  50: "어려움",
};

export const DEFAULT_PITCH_LEVEL_CENTS: PitchLevelCents = 100;

/** 한 판 문항 수. 매 판 같다. */
export const PITCH_TRIAL_COUNT = 12;

export function isPitchLevelCents(value: unknown): value is PitchLevelCents {
  return (
    typeof value === "number" &&
    (PITCH_LEVELS as readonly number[]).includes(value)
  );
}
