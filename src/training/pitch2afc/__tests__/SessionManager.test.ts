/**
 * SessionManager 회귀 테스트
 *
 * 지키는 결함 (docs/앱_개선_제안서.md §2):
 * - P0-2 다시 듣기 시 방향(정답) 유지 + replayCount 기록
 * - P0-3 반응 시간이 자극 재생 시간을 포함하지 않을 것
 */

import { PITCH_TRIAL_COUNT } from "../constants";
import { SessionManager } from "../SessionManager";

function playRound(sm: SessionManager) {
  const round = sm.prepareRound();
  sm.openResponseWindow();
  return round;
}

describe("P0-2 — 다시 듣기는 같은 문제를 재생한다", () => {
  it("방향(isHigher)과 목표 주파수가 유지된다", () => {
    const sm = new SessionManager({ baseFreq: 440, centsDifference: 200 });
    sm.startSession();

    const first = sm.prepareRound();
    sm.countReplay();
    const afterReplay = sm.getStaircaseState();
    sm.countReplay();
    const afterSecondReplay = sm.getStaircaseState();

    expect(afterReplay.isHigher).toBe(first.isHigher);
    expect(afterSecondReplay.isHigher).toBe(first.isHigher);
    expect(afterReplay.targetFreq).toBe(first.targetFreq);
    expect(afterSecondReplay.targetFreq).toBe(first.targetFreq);
  });

  it("새 문제는 방향이 실제로 재추첨된다", () => {
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    const directions = new Set<boolean>();
    for (let i = 0; i < 100; i++) {
      directions.add(sm.prepareRound().isHigher);
    }

    expect(directions.size).toBe(2);
  });

  it("replayCount가 시행에 기록되고 라운드마다 초기화된다", () => {
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    playRound(sm);
    sm.countReplay();
    sm.countReplay();
    sm.submitAnswer(true);

    playRound(sm);
    sm.submitAnswer(true);

    const { trials } = sm.endSession();
    expect(trials[0].replayCount).toBe(2);
    expect(trials[1].replayCount).toBe(0);
  });

  it("다시 듣기는 시행 수를 늘리지 않는다", () => {
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    playRound(sm);
    sm.countReplay();
    sm.countReplay();
    sm.countReplay();
    sm.submitAnswer(true);

    expect(sm.endSession().totalTrials).toBe(1);
  });
});

describe("P0-3 — 반응 시간은 답변 가능 시점부터 잰다", () => {
  const REAL_NOW = Date.now();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function useFakeClock() {
    let current = REAL_NOW;
    jest.spyOn(Date, "now").mockImplementation(() => current);
    return {
      advance: (ms: number) => {
        current += ms;
      },
    };
  }

  it("자극 재생 시간(2500ms)이 포함되지 않는다", () => {
    const clock = useFakeClock();
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    sm.prepareRound();
    clock.advance(2500);
    sm.openResponseWindow();
    clock.advance(700);
    sm.submitAnswer(true);

    expect(sm.endSession().trials[0].reactionTimeMs).toBe(700);
  });

  it("다시 듣기를 하면 마지막 재생 종료 시점 기준으로 갱신된다", () => {
    const clock = useFakeClock();
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    sm.prepareRound();
    clock.advance(2500);
    sm.openResponseWindow();

    clock.advance(1000);
    sm.countReplay();
    clock.advance(2500);
    sm.openResponseWindow();

    clock.advance(400);
    sm.submitAnswer(true);

    expect(sm.endSession().trials[0].reactionTimeMs).toBe(400);
  });

  it("prepareRound는 측정을 시작하지 않는다", () => {
    const clock = useFakeClock();
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    sm.prepareRound();
    clock.advance(1200);
    sm.submitAnswer(true);

    expect(sm.endSession().trials[0].reactionTimeMs).toBe(0);
  });

  it("답변 후에는 측정 창이 닫힌다", () => {
    const clock = useFakeClock();
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    sm.prepareRound();
    sm.openResponseWindow();
    clock.advance(300);
    sm.submitAnswer(true);

    clock.advance(5000);
    sm.prepareRound();
    clock.advance(2500);
    sm.submitAnswer(true);

    expect(sm.endSession().trials[1].reactionTimeMs).toBe(0);
  });
});

describe("고정 12문항", () => {
  it("12문항 전에는 끝나지 않는다", () => {
    const sm = new SessionManager({ baseFreq: 440, centsDifference: 100 });
    sm.startSession();

    for (let i = 0; i < PITCH_TRIAL_COUNT - 1; i++) {
      const round = playRound(sm);
      sm.submitAnswer(round.isHigher);
      expect(sm.shouldAutoEnd()).toBe(false);
    }
  });

  it("12문항이면 종료 조건이 된다", () => {
    const sm = new SessionManager({ baseFreq: 440, centsDifference: 50 });
    sm.startSession();

    for (let i = 0; i < PITCH_TRIAL_COUNT; i++) {
      const round = playRound(sm);
      sm.submitAnswer(round.isHigher);
    }

    expect(sm.shouldAutoEnd()).toBe(true);
    expect(sm.getStaircaseState().centsDifference).toBe(50);
    expect(sm.endSession().centsDifference).toBe(50);
  });

  it("시작 직후에는 종료 조건이 아니다", () => {
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();
    expect(sm.shouldAutoEnd()).toBe(false);
  });
});

describe("P0-6 — 라운드 폐기", () => {
  it("abortRound는 시행을 기록하지 않는다", () => {
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    playRound(sm);
    sm.submitAnswer(true);

    playRound(sm);
    sm.abortRound();

    playRound(sm);
    sm.submitAnswer(true);

    const result = sm.endSession();
    expect(result.totalTrials).toBe(2);
    expect(result.trials).toHaveLength(2);
  });

  it("폐기 후 답변하면 반응 시간을 0으로 남긴다", () => {
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    playRound(sm);
    sm.abortRound();
    sm.submitAnswer(true);

    expect(sm.endSession().trials[0].reactionTimeMs).toBe(0);
  });

  it("폐기해도 다시 듣기 횟수가 다음 라운드로 새지 않는다", () => {
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    playRound(sm);
    sm.countReplay();
    sm.countReplay();
    sm.abortRound();

    playRound(sm);
    sm.submitAnswer(true);

    expect(sm.endSession().trials[0].replayCount).toBe(0);
  });
});

describe("세션 기본 동작", () => {
  it("세션 결과가 시행 수·정답 수·정답률을 집계한다", () => {
    const sm = new SessionManager({
      baseFreq: 440,
      mode: "training",
      centsDifference: 200,
    });
    sm.startSession();

    const r1 = playRound(sm);
    sm.submitAnswer(r1.isHigher);
    const r2 = playRound(sm);
    sm.submitAnswer(!r2.isHigher);
    const r3 = playRound(sm);
    sm.submitAnswer(r3.isHigher);

    const result = sm.endSession();
    expect(result.totalTrials).toBe(3);
    expect(result.correctCount).toBe(2);
    expect(result.accuracy).toBeCloseTo(2 / 3);
    expect(result.mode).toBe("training");
    expect(result.baseFreq).toBe(440);
    expect(result.centsDifference).toBe(200);
    expect(result.trials.every((t) => t.centsDifference === 200)).toBe(true);
  });

  it("startSession이 이전 세션 상태를 완전히 초기화한다", () => {
    const sm = new SessionManager({ baseFreq: 440 });

    sm.startSession();
    playRound(sm);
    sm.countReplay();
    sm.submitAnswer(true);
    sm.endSession();

    sm.startSession();
    playRound(sm);
    sm.submitAnswer(true);

    const result = sm.endSession();
    expect(result.totalTrials).toBe(1);
    expect(result.trials).toHaveLength(1);
    expect(result.trials[0].replayCount).toBe(0);
  });

  it("활성 세션 중에는 설정을 바꾸지 않는다", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    sm.updateConfig({ baseFreq: 262 });

    expect(sm.getConfig().baseFreq).toBe(440);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
