/**
 * 훈련 화면 상태 머신 규칙
 *
 * 화면(app/training.tsx)에서 규칙만 떼어낸 순수 함수 모음입니다.
 * 측정값 신뢰도와 직결되는 규칙을 여기서 단일 지점으로 관리합니다.
 *
 * 1. 답변은 한 라운드에 **한 번만** 받는다 (`canSubmitAnswer`)
 *    — 'answered'에서도 받으면 정답을 본 뒤 반복 제출로 점수를 만들 수 있음
 * 2. 재생 버튼은 상태에 따라 **다시 듣기 / 새 문제**로 갈린다 (`isReplayPress`)
 *    — 'waiting'에서 새 문제를 뽑으면 사용자가 인지한 '다시 듣기'가 정답을 재추첨함
 * 3. 자극을 제대로 못 들은 라운드는 **버린다** ('interrupted')
 *    — 전화·앱 이탈로 소리를 놓친 채 찍은 답이 기록에 남으면 안 됨
 * 4. 평가 모드에서는 **시행별 정답을 알려주지 않는다** (`showsTrialFeedback`)
 *    — 도중에 요령을 배우면 "지금 실력"을 재는 목적이 무너짐
 *
 * 상태 전이:
 *   idle ──재생──> playing ──재생완료──> waiting ──답변──> answered
 *                     ▲                    │                  │
 *                     └──다시 듣기──────────┘                  │
 *                     └──────────────새 문제────────────────────┘
 *
 *   playing / waiting ──앱 이탈──> interrupted ──새 문제──> playing
 *   (진행 중이던 라운드는 기록 없이 폐기)
 */

import type { SessionMode } from './SessionManager';

export type GameState =
  | 'idle'
  | 'playing'
  | 'waiting'
  | 'answered'
  | 'interrupted';

/**
 * 답변을 받을 수 있는 상태인가.
 *
 * 'waiting'(재생 완료·미답변)일 때만 true.
 * 'answered'를 포함시키면 같은 자극에 여러 번 답할 수 있게 되므로 절대 넓히지 말 것.
 * 'interrupted'는 자극을 온전히 듣지 못한 상태이므로 받지 않는다.
 */
export function canSubmitAnswer(state: GameState): boolean {
  return state === 'waiting';
}

/**
 * 재생 버튼이 '다시 듣기'(같은 문제 재생)로 동작하는 상태인가.
 *
 * false면 '새 문제'(방향 재추첨)로 동작합니다.
 *
 * 'interrupted'에서 false인 이유: 자극을 일부만 들었을 수 있어
 * 같은 문제를 다시 주면 부분 노출이 단서로 남습니다. 새 문제가 안전합니다.
 */
export function isReplayPress(state: GameState): boolean {
  return state === 'waiting';
}

/** 재생 버튼을 누를 수 있는 상태인가. (재생 중에는 막는다) */
export function canPressPlay(state: GameState): boolean {
  return state !== 'playing';
}

/**
 * 앱 이탈·통화 등으로 라운드를 버려야 하는 상태인가.
 *
 * 재생 중이거나 답변 대기 중이었다면 그 라운드는 신뢰할 수 없습니다.
 * 이미 답한('answered') 라운드나 시작 전('idle')은 영향이 없습니다.
 */
export function shouldAbortOnInterrupt(state: GameState): boolean {
  return state === 'playing' || state === 'waiting';
}

/**
 * 시행마다 정답을 알려줄 것인가.
 *
 * 훈련은 알려주고(학습 효과가 목적), 평가는 알려주지 않습니다.
 * 평가 중 피드백은 도중 학습을 유발해 "현재 실력" 측정을 왜곡합니다.
 */
export function showsTrialFeedback(mode: SessionMode): boolean {
  return mode === 'training';
}

/**
 * 재생 버튼 문구.
 * 'waiting'에서는 같은 문제를 다시 들려주는 동작이므로 새 문제와 구분해 표기합니다.
 *
 * 아이콘은 화면 쪽에서 붙입니다. 여기에 이모지를 섞어 두면
 * 문구 자체를 다른 곳(로그·테스트)에서 쓸 때 지저분해집니다.
 */
export const PLAY_BUTTON_LABEL: Record<GameState, string> = {
  idle: '소리 듣기 (A → B)',
  playing: '소리 감상 중…',
  waiting: '다시 듣기 (A → B)',
  answered: '다음 소리 듣기 (A → B)',
  interrupted: '새 문제로 다시 듣기 (A → B)',
};

/** 재생 버튼 아이콘 (Feather 아이콘 이름) */
export const PLAY_BUTTON_ICON: Record<GameState, string> = {
  idle: 'play',
  playing: 'volume-2',
  waiting: 'rotate-ccw',
  answered: 'play',
  interrupted: 'play',
};

/**
 * 스크린리더용 재생 버튼 문구.
 *
 * 화면 문구는 아이콘과 짝지어 읽히므로, 읽어서 자연스러운 문장을 따로 둡니다.
 */
export const PLAY_BUTTON_A11Y_LABEL: Record<GameState, string> = {
  idle: '소리 듣기, 첫 번째 소리에 이어 두 번째 소리가 재생됩니다',
  playing: '소리 재생 중',
  waiting: '같은 문제 다시 듣기',
  answered: '다음 문제 듣기',
  interrupted: '새 문제로 다시 듣기',
};
