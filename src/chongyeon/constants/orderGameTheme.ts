/**
 * 소리 순서 맞추기(orderGame) — 색 · 글자 토큰
 * 쓰는 곳: `screens/OrderGameScreen.tsx` · `components/game/DraggableImage.tsx`
 *
 * 기타 탭(`guitarTheme.ts` + `guitarLayout.ts`)과 같은 짝이다.
 * 치수와 구조·상태 주석은 `orderGameLayout.ts`에 있다.
 *
 * 공용 `colors.ts`의 색은 **여기서 이름만 다시 붙인다** — 값을 복제하지 않는다.
 * 전용 리터럴은 디버그 글자 하나뿐이다(`DEBUG_DROP`이 켜져야 보인다).
 */

import { COLORS } from './colors';

export const colors = {
  /**
   * 화면 바닥. 게임 셋 중 유일하게 **연노랑**이다
   * (matchGame은 사진, AI·PG는 연회색). 나가기 버튼이 흰 알약인 것은
   * 이 세 배경 모두에서 읽히게 하려는 값이다 — `gameExitButtonTheme.ts` 참조.
   */
  screenBg: COLORS.backgroundWarning,

  // ── 소리를 내는 동안
  /** 네 게임이 함께 쓰는 물결 색. `WaveRipple`의 기본값과 같은 값이다 */
  waveRipple: COLORS.waveRipple,
  /** 이 화면만 안내 문구가 `textPrimary`다 (나머지 셋은 `textLoading`) */
  loadingText: COLORS.textPrimary,

  // ── 놓는 곳 (점선 상자 3개)
  dropZoneBg: COLORS.backgroundLight,
  dropZoneBorder: COLORS.borderGray,
  /** 비어 있을 때의 「놓는곳」 글자 */
  dropZonePlaceholder: COLORS.textPlaceholder,

  // ── 버튼 둘. 초록 두 단계로 시작과 제출을 갈라 놓는다
  startButtonBg: COLORS.green,
  submitButtonBg: COLORS.greenBright,
  buttonText: COLORS.white,

  /** 드롭존 좌표 디버그 줄 (`DEBUG_DROP`이 true일 때만) */
  debugText: '#666',
} as const;

/**
 * 고정 글자 크기.
 * 이 화면의 다른 글자는 전부 공용 반응형 키다
 * (`LAYOUT.buttonTextFontSize` · `smallButtonTextFontSize`).
 */
export const fontSize = {
  /** 디버그 줄. 화면에 늘 보이는 글자가 아니라 작아도 된다 */
  debugText: 10,
} as const;

export const opacity = {
  /** 시작 · 제출 버튼을 누르고 있는 동안 (`activeOpacity`) */
  pressed: 0.8,
  /**
   * 이미 놓는 곳에 올라간 카드. 위 줄에서 **사라지지 않고 흐려진 채 남는다**
   * (`disabled`와 짝이라 끌 수도 없다). 자리를 비우지 않으므로 위 줄의
   * 카드 배치는 게임 내내 그대로다.
   */
  droppedCard: 0.3,
} as const;
