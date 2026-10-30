/**
 * 훈련 화면 상태 머신 회귀 테스트
 *
 * 지키는 결함 (docs/앱_개선_제안서.md §2):
 * - P0-1 답변 중복 제출 — 'answered'에서 답변을 받으면 점수를 조작할 수 있다
 * - P0-2 다시 듣기 재추첨 — 'waiting'에서 새 문제를 뽑으면 정답이 바뀐다
 */

import {
  GameState,
  PLAY_BUTTON_LABEL,
  canPressPlay,
  canSubmitAnswer,
  isReplayPress,
  shouldAbortOnInterrupt,
  showsTrialFeedback,
} from '../trainingFlow';

const ALL_STATES: GameState[] = [
  'idle',
  'playing',
  'waiting', //재생 끝, 답변 대기
  'answered',
  'interrupted',//앱 이탈로 라운드 폐기
];

describe('canSubmitAnswer — P0-1 답변 중복 제출 차단', () => {
  it("'waiting'에서만 답변을 받는다", () => {
    expect(canSubmitAnswer('waiting')).toBe(true);
  });

  it.each(['idle', 'playing', 'answered', 'interrupted'] as GameState[])(
    "'%s'에서는 답변을 받지 않는다",
    (state) => {
      expect(canSubmitAnswer(state)).toBe(false);
    },
  );

  it("'answered'를 허용하면 안 된다 — 정답 확인 후 반복 제출이 가능해진다", () => {
    // 이 단언이 깨지면 사용자가 피드백으로 정답을 본 뒤
    // 같은 버튼을 반복 탭해 시행 수·정답률·난이도를 임의로 만들 수 있다.
    expect(canSubmitAnswer('answered')).toBe(false);
  });

  it('답변을 받는 상태는 정확히 하나뿐이다', () => {
    expect(ALL_STATES.filter(canSubmitAnswer)).toEqual(['waiting']);
  });
});

describe('isReplayPress — P0-2 다시 듣기 / 새 문제 분기', () => {
  it("'waiting'에서는 다시 듣기(같은 문제)로 동작한다", () => {
    // false가 되면 prepareRound()가 호출되어 정답 방향이 재추첨된다.
    expect(isReplayPress('waiting')).toBe(true);
  });

  it.each(['idle', 'answered', 'interrupted'] as GameState[])(
    "'%s'에서는 새 문제로 동작한다",
    (state) => {
      expect(isReplayPress(state)).toBe(false);
    },
  );

  it("'interrupted'는 다시 듣기가 아니다 — 부분 노출이 단서로 남는다", () => {
    // 소리를 일부만 들은 상태에서 같은 문제를 다시 주면
    // 앞부분 기억이 힌트가 되어 그 시행이 오염된다
    expect(isReplayPress('interrupted')).toBe(false);
  });

  it('다시 듣기로 동작하는 상태는 정확히 하나뿐이다', () => {
    expect(ALL_STATES.filter(isReplayPress)).toEqual(['waiting']);
  });

  it('답변을 받는 상태와 다시 듣기 상태가 일치한다', () => {
    // 두 규칙이 어긋나면 "답할 수 있는데 다시 들으면 문제가 바뀌는" 창이 생긴다.
    ALL_STATES.forEach((state) => {
      expect(isReplayPress(state)).toBe(canSubmitAnswer(state));
    });
  });
});

describe('shouldAbortOnInterrupt — P0-6 앱 이탈 시 라운드 폐기', () => {
  it.each(['playing', 'waiting'] as GameState[])(
    "'%s'에서 이탈하면 라운드를 버린다",
    (state) => {
      // 재생 중이었거나 답변 대기 중이었다면 자극을 온전히 못 들었다
      expect(shouldAbortOnInterrupt(state)).toBe(true);
    },
  );

  it.each(['idle', 'answered', 'interrupted'] as GameState[])(
    "'%s'에서 이탈해도 버릴 라운드가 없다",
    (state) => {
      expect(shouldAbortOnInterrupt(state)).toBe(false);
    },
  );

  it('이미 답한 라운드는 이탈해도 보존된다', () => {
    // 답변이 끝난 시행까지 지우면 정상적으로 쌓은 기록을 잃는다
    expect(shouldAbortOnInterrupt('answered')).toBe(false);
  });

  it('답변을 받을 수 있는 상태는 반드시 폐기 대상에 포함된다', () => {
    ALL_STATES.filter(canSubmitAnswer).forEach((state) => {
      expect(shouldAbortOnInterrupt(state)).toBe(true);
    });
  });
});

describe('showsTrialFeedback — P1-2 평가 모드 피드백 숨김', () => {
  it('훈련은 시행마다 정답을 알려준다', () => {
    expect(showsTrialFeedback('training')).toBe(true);
  });

  it('평가는 시행마다 정답을 알려주지 않는다', () => {
    // 피드백은 도중 학습을 유발해 "현재 실력" 측정을 왜곡한다
    expect(showsTrialFeedback('assessment')).toBe(false);
  });
});

describe('canPressPlay', () => {
  it('재생 중에는 누를 수 없다', () => {
    expect(canPressPlay('playing')).toBe(false);
  });

  it.each(['idle', 'waiting', 'answered', 'interrupted'] as GameState[])(
    "'%s'에서는 누를 수 있다",
    (state) => {
      expect(canPressPlay(state)).toBe(true);
    },
  );

  it('인터럽션 뒤에는 반드시 다시 시작할 수 있어야 한다', () => {
    // 여기서 막히면 세션이 영구히 멈춘다
    expect(canPressPlay('interrupted')).toBe(true);
  });
});

describe('PLAY_BUTTON_LABEL', () => {
  it('모든 상태에 문구가 있다', () => {
    ALL_STATES.forEach((state) => {
      expect(PLAY_BUTTON_LABEL[state]).toBeTruthy();
    });
  });

  it('다시 듣기와 새 문제의 문구가 서로 다르다', () => {
    // 같은 문구면 사용자가 "같은 문제 재생"과 "새 문제"를 구분할 수 없다.
    expect(PLAY_BUTTON_LABEL.waiting).not.toBe(PLAY_BUTTON_LABEL.answered);
    expect(PLAY_BUTTON_LABEL.waiting).toContain('다시 듣기');
    expect(PLAY_BUTTON_LABEL.answered).toContain('다음');
  });
});
