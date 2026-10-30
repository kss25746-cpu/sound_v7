/**
 * 세 트랙 공통 — 귀풀기 / 연습 모드.
 *
 * 귀풀기(`practice`): 전환·시행 한도 없음. 직접 종료. 저장하지 않음(이번 결과 카드만).
 * 연습(`measure`): 전환 6 후 종료. 기록 + 통계 포함.
 *
 * 스텝은 가변 하나(트랙별 스케줄)로 두고, 종료 조건만 모드로 가른다.
 * 엔진은 2-down-1-up 그대로.
 */
import type { SessionMode } from "@/training/sessionStore";

export type { SessionMode };

/** 연습(구 측정) 종료 반전 수. 관례 6~8의 하한. */
export const MEASURE_TARGET_REVERSALS = 6;

/** 연습 세션 시행 안전 상한. 귀풀기에는 쓰지 않는다. */
export const MEASURE_MAX_TRIALS = 40;

/** idle 기본 모드 — 귀풀기. */
export const DEFAULT_SESSION_MODE: SessionMode = "practice";

/** 모드별 종료 반전 수. 귀풀기는 한도 없음(`null`). */
export function targetReversalsFor(mode: SessionMode): number | null {
  return mode === "measure" ? MEASURE_TARGET_REVERSALS : null;
}

/** 모드별 시행 한도. 귀풀기는 한도 없음(`null`). */
export function maxTrialsFor(mode: SessionMode): number | null {
  return mode === "measure" ? MEASURE_MAX_TRIALS : null;
}

/** 토글·배지용 짧은 라벨. */
export function sessionModeLabel(mode: SessionMode): string {
  return mode === "measure" ? "연습" : "귀풀기";
}

/** idle 안내·진행 배지 문구. 귀풀기는 목표 분모 없이 「전환 N」만. */
export function modeProgressCaption(options: {
  idle: boolean;
  trialNumber: number;
  reversalCount: number;
  targetReversals: number | null;
}): string {
  const { idle, trialNumber, reversalCount, targetReversals } = options;
  if (idle) {
    if (targetReversals == null) {
      return "직접 종료할 때까지";
    }
    return `난이도 전환 ${targetReversals}번까지`;
  }
  if (targetReversals == null) {
    return `전환 ${reversalCount}`;
  }
  return `연습 ${trialNumber} · 전환 ${reversalCount}/${targetReversals}`;
}
