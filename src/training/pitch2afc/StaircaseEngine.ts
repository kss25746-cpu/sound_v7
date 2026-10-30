/**
 * 높낮이 비교 엔진. 한 판의 cent 간격은 고정이다.
 *
 * 2-down-1-up·반전 평균은 쓰지 않는다. 맞혀도 간격이 줄지 않는다.
 * 재는 것은 그 간격에서 맞힌 비율이다(개인 역치 아님).
 */

import { AUDIO, DEFAULT_PITCH_LEVEL_CENTS } from "./constants";
import { centsToFreq, clampFreq } from "../../audio/cents";

export interface StaircaseState {
  /** 이 판의 고정 cent 격차 */
  centsDifference: number;
  /** B 소리가 더 높은지 (현재 라운드) */
  isHigher: boolean;
  /** 총 시행 수 */
  totalTrials: number;
  /** 정답 수 */
  correctCount: number;
  /** B 소리의 주파수 (Hz) */
  targetFreq: number;
  /** 기준 주파수 (Hz) */
  baseFreq: number;
}

export interface TrialResult {
  isCorrect: boolean;
  message: string;
  newState: StaircaseState;
}

export class StaircaseEngine {
  private state: StaircaseState;
  /** 파일럿용: targetFreq 클램프 발생 횟수 */
  private clampCount = 0;

  constructor(
    baseFreq: number = AUDIO.BASE_FREQ,
    centsDifference: number = DEFAULT_PITCH_LEVEL_CENTS,
  ) {
    this.state = StaircaseEngine.initialState(baseFreq, centsDifference);
  }

  private static initialState(
    baseFreq: number,
    centsDifference: number,
  ): StaircaseState {
    return {
      centsDifference,
      isHigher: true,
      totalTrials: 0,
      correctCount: 0,
      targetFreq: baseFreq,
      baseFreq,
    };
  }

  getState(): Readonly<StaircaseState> {
    return { ...this.state };
  }

  getClampCount(): number {
    return this.clampCount;
  }

  /**
   * 새 라운드를 준비합니다.
   * B 소리의 방향(높음/낮음)을 랜덤으로 결정하고 목표 주파수를 계산합니다.
   */
  prepareRound(): StaircaseState {
    const isHigher = Math.random() > 0.5;
    const centsOffset = isHigher
      ? this.state.centsDifference
      : -this.state.centsDifference;
    const rawTarget = centsToFreq(this.state.baseFreq, centsOffset);
    const { clamped: targetFreq, wasOverLimit } = clampFreq(
      rawTarget,
      AUDIO.FREQ_MIN_HZ,
      AUDIO.FREQ_MAX_HZ,
    );
    if (wasOverLimit) {
      this.clampCount += 1;
      if (__DEV__) {
        console.log(
          `[StaircaseEngine] freq clamped: ${rawTarget.toFixed(2)} → ${targetFreq}`,
        );
      }
    }

    this.state = {
      ...this.state,
      isHigher,
      targetFreq,
    };

    return this.getState();
  }

  /**
   * 사용자의 답변을 처리합니다. 격차는 그대로 둡니다.
   */
  submitAnswer(userThinksHigher: boolean): TrialResult {
    const prev = this.state;
    const isCorrect = userThinksHigher === prev.isHigher;

    const message = isCorrect
      ? `정답. B 소리가 ${prev.centsDifference}만큼 더 ${
          prev.isHigher ? "높았습니다" : "낮았습니다"
        }.`
      : `아쉬워요. B 소리가 더 ${
          prev.isHigher ? "높았습니다" : "낮았습니다"
        }.`;

    this.state = {
      ...prev,
      totalTrials: prev.totalTrials + 1,
      correctCount: prev.correctCount + (isCorrect ? 1 : 0),
    };

    return {
      isCorrect,
      message,
      newState: this.getState(),
    };
  }

  reset(
    baseFreq: number = AUDIO.BASE_FREQ,
    centsDifference: number = this.state.centsDifference,
  ): void {
    this.clampCount = 0;
    this.state = StaircaseEngine.initialState(baseFreq, centsDifference);
  }

  getAccuracy(): number {
    if (this.state.totalTrials === 0) return 0;
    return this.state.correctCount / this.state.totalTrials;
  }
}
