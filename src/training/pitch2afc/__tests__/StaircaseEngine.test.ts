import { centsToFreq } from "../../../audio/cents";
import { AUDIO, DEFAULT_PITCH_LEVEL_CENTS } from "../constants";
import { StaircaseEngine } from "../StaircaseEngine";

function answer(engine: StaircaseEngine, correct: boolean) {
  const { isHigher } = engine.prepareRound();
  return engine.submitAnswer(correct ? isHigher : !isHigher);
}

function run(engine: StaircaseEngine, sequence: boolean[]) {
  for (const correct of sequence) {
    answer(engine, correct);
  }
}

describe("고정 간격", () => {
  it("기본 간격은 200이다", () => {
    const state = new StaircaseEngine(440).getState();
    expect(state.centsDifference).toBe(DEFAULT_PITCH_LEVEL_CENTS);
    expect(state.baseFreq).toBe(440);
    expect(state.totalTrials).toBe(0);
  });

  it("생성 때 고른 간격이 유지된다", () => {
    expect(new StaircaseEngine(440, 50).getState().centsDifference).toBe(50);
  });

  it("맞혀도 간격이 줄지 않는다", () => {
    const engine = new StaircaseEngine(440, 200);
    run(engine, [true, true, true, true]);
    expect(engine.getState().centsDifference).toBe(200);
    expect(engine.getState().totalTrials).toBe(4);
    expect(engine.getState().correctCount).toBe(4);
  });

  it("틀려도 간격이 늘지 않는다", () => {
    const engine = new StaircaseEngine(440, 100);
    run(engine, [false, false]);
    expect(engine.getState().centsDifference).toBe(100);
    expect(engine.getState().correctCount).toBe(0);
  });

  it("기본 기준음은 A4다", () => {
    expect(new StaircaseEngine().getState().baseFreq).toBe(AUDIO.BASE_FREQ);
  });
});

describe("집계", () => {
  it("시행 수와 정답 수를 센다", () => {
    const engine = new StaircaseEngine(440, 200);
    run(engine, [true, false, true, false]);
    expect(engine.getState().totalTrials).toBe(4);
    expect(engine.getState().correctCount).toBe(2);
    expect(engine.getAccuracy()).toBeCloseTo(0.5);
  });

  it("시행 전 정답률은 0이다", () => {
    expect(new StaircaseEngine(440).getAccuracy()).toBe(0);
  });

  it("reset이 시행을 지우고 간격을 받는다", () => {
    const engine = new StaircaseEngine(440, 200);
    run(engine, [true, false, true]);
    engine.reset(262, 50);
    const state = engine.getState();
    expect(state.centsDifference).toBe(50);
    expect(state.totalTrials).toBe(0);
    expect(state.baseFreq).toBe(262);
    expect(engine.getClampCount()).toBe(0);
  });
});

describe("목표 주파수 계산", () => {
  it("현재 격차만큼 위 또는 아래로 이동한다", () => {
    const engine = new StaircaseEngine(440, 200);
    const { isHigher, targetFreq, centsDifference } = engine.prepareRound();
    const expected = centsToFreq(
      440,
      isHigher ? centsDifference : -centsDifference,
    );
    expect(targetFreq).toBeCloseTo(expected, 6);
  });

  it("양방향이 모두 나온다", () => {
    const engine = new StaircaseEngine(440);
    const directions = new Set<boolean>();
    for (let i = 0; i < 100; i++) directions.add(engine.prepareRound().isHigher);
    expect(directions.size).toBe(2);
  });

  it("재생 한도를 벗어나면 클램프하고 횟수를 센다", () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    const engine = new StaircaseEngine(AUDIO.FREQ_MIN_HZ, 200);

    let sawLowDirection = false;
    for (let i = 0; i < 50; i++) {
      const round = engine.prepareRound();
      if (!round.isHigher) {
        sawLowDirection = true;
        expect(round.targetFreq).toBe(AUDIO.FREQ_MIN_HZ);
      }
      expect(round.targetFreq).toBeGreaterThanOrEqual(AUDIO.FREQ_MIN_HZ);
      expect(round.targetFreq).toBeLessThanOrEqual(AUDIO.FREQ_MAX_HZ);
    }

    expect(sawLowDirection).toBe(true);
    expect(engine.getClampCount()).toBeGreaterThan(0);
    log.mockRestore();
  });
});

describe("피드백 메시지", () => {
  it("정답이면 실제 방향을 알려준다", () => {
    const engine = new StaircaseEngine(440);
    const { isHigher } = engine.prepareRound();
    const result = engine.submitAnswer(isHigher);
    expect(result.isCorrect).toBe(true);
    expect(result.message).toContain(isHigher ? "높았습니다" : "낮았습니다");
  });

  it("오답이면 정답 방향을 알려준다", () => {
    const engine = new StaircaseEngine(440);
    const { isHigher } = engine.prepareRound();
    const result = engine.submitAnswer(!isHigher);
    expect(result.isCorrect).toBe(false);
    expect(result.message).toContain(isHigher ? "높았습니다" : "낮았습니다");
  });
});
