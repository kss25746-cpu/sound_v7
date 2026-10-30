/**
 * 세션 관리자. 한 판의 cent는 고정, 문항 수는 `PITCH_TRIAL_COUNT`.
 */

import {
  StaircaseEngine,
  type StaircaseState,
  type TrialResult,
} from "./StaircaseEngine";
import {
  AUDIO,
  DEFAULT_PITCH_LEVEL_CENTS,
  PITCH_TRIAL_COUNT,
  type PitchLevelCents,
} from "./constants";

export type SessionMode = "assessment" | "training";

export interface SessionConfig {
  /** 세션 모드. 화면은 training만 쓴다. */
  mode: SessionMode;
  baseFreq: number;
  soundMode: "wave" | "voice";
  centsDifference: PitchLevelCents;
}

export interface SessionResult {
  id: string;
  mode: SessionMode;
  soundMode: "wave" | "voice";
  baseFreq?: number;
  clampCount?: number;
  startedAt: number;
  endedAt: number;
  totalTrials: number;
  correctCount: number;
  /** 정답률 (0~1) */
  accuracy: number;
  centsDifference: PitchLevelCents;
  trials: TrialRecord[];
}

export interface TrialRecord {
  trialNumber: number;
  isCorrect: boolean;
  reactionTimeMs: number;
  replayCount?: number;
  centsDifference: number;
  isHigher: boolean;
  timestamp: number;
}

export class SessionManager {
  private config: SessionConfig;
  private staircaseEngine: StaircaseEngine;
  private startedAt: number = 0;
  private trials: TrialRecord[] = [];
  private responseWindowOpenedAt: number = 0;
  private replayCount: number = 0;
  private isActive: boolean = false;

  constructor(config?: Partial<SessionConfig>) {
    this.config = {
      mode: config?.mode ?? "training",
      baseFreq: config?.baseFreq ?? AUDIO.BASE_FREQ,
      soundMode: config?.soundMode ?? "wave",
      centsDifference: config?.centsDifference ?? DEFAULT_PITCH_LEVEL_CENTS,
    };

    this.staircaseEngine = new StaircaseEngine(
      this.config.baseFreq,
      this.config.centsDifference,
    );
  }

  startSession(): void {
    this.startedAt = Date.now();
    this.trials = [];
    this.isActive = true;
    this.responseWindowOpenedAt = 0;
    this.replayCount = 0;
    this.staircaseEngine.reset(
      this.config.baseFreq,
      this.config.centsDifference,
    );
  }

  prepareRound(): StaircaseState {
    this.responseWindowOpenedAt = 0;
    this.replayCount = 0;
    return this.staircaseEngine.prepareRound();
  }

  openResponseWindow(): void {
    this.responseWindowOpenedAt = Date.now();
  }

  countReplay(): void {
    this.replayCount += 1;
  }

  abortRound(): void {
    this.responseWindowOpenedAt = 0;
    this.replayCount = 0;
  }

  /** 12문항을 채우면 끝. 반전·상한 40이 아니다. */
  shouldAutoEnd(): boolean {
    return this.staircaseEngine.getState().totalTrials >= PITCH_TRIAL_COUNT;
  }

  submitAnswer(userThinksHigher: boolean): TrialResult {
    const now = Date.now();
    const reactionTimeMs =
      this.responseWindowOpenedAt > 0 ? now - this.responseWindowOpenedAt : 0;
    const currentState = this.staircaseEngine.getState();
    const result = this.staircaseEngine.submitAnswer(userThinksHigher);

    this.trials.push({
      trialNumber: this.trials.length + 1,
      isCorrect: result.isCorrect,
      reactionTimeMs,
      replayCount: this.replayCount,
      centsDifference: currentState.centsDifference,
      isHigher: currentState.isHigher,
      timestamp: now,
    });

    this.responseWindowOpenedAt = 0;

    return result;
  }

  endSession(): SessionResult {
    this.isActive = false;
    const state = this.staircaseEngine.getState();

    return {
      id: `session_${this.startedAt}`,
      mode: this.config.mode,
      soundMode: this.config.soundMode,
      baseFreq: this.config.baseFreq,
      clampCount: this.staircaseEngine.getClampCount(),
      startedAt: this.startedAt,
      endedAt: Date.now(),
      totalTrials: state.totalTrials,
      correctCount: state.correctCount,
      accuracy: this.staircaseEngine.getAccuracy(),
      centsDifference: this.config.centsDifference,
      trials: [...this.trials],
    };
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  getStaircaseState(): Readonly<StaircaseState> {
    return this.staircaseEngine.getState();
  }

  getConfig(): Readonly<SessionConfig> {
    return { ...this.config };
  }

  updateConfig(partial: Partial<SessionConfig>): void {
    if (this.isActive) {
      console.warn(
        "[SessionManager] 활성 세션 중에는 설정을 변경할 수 없습니다.",
      );
      return;
    }
    this.config = { ...this.config, ...partial };
    if (partial.baseFreq != null || partial.centsDifference != null) {
      this.staircaseEngine.reset(
        this.config.baseFreq,
        this.config.centsDifference,
      );
    }
  }
}
