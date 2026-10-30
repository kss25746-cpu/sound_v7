/**
 * 소리 맞추기(matchGame) — 색 · 글자 토큰
 * 쓰는 곳: `screens/MatchGameScreen.tsx`
 *
 * 기타 탭(`guitarTheme.ts` + `guitarLayout.ts`) ·
 * 단어 카드(`flashcardsTheme.ts`)와 같은 짝이다.
 * 치수와 구조·상태 주석은 `matchGameLayout.ts`에 있다.
 *
 * 공용 `colors.ts`의 색은 **여기서 이름만 다시 붙인다** — 값을 복제하지 않는다.
 * 이 화면에는 화면 전용 리터럴 색이 하나도 없다. 배경이 사진 한 장이고
 * 나머지는 공용 팔레트(주황 버튼 · 흰 카드 · 초록/빨강 상태)로만 칠하기 때문이다.
 *
 * `fontSize`가 없는 이유: 이 화면의 글자 크기는 전부 **공용 반응형 키**다
 * (`LAYOUT.buttonTextFontSize` · `smallButtonTextFontSize` · `modalTitleFontSize`).
 * 고정 크기가 하나도 없으므로 빈 객체를 두지 않는다. 자간(letterSpacing)은
 * 크기가 아니라 치수라 `matchGameLayout.ts`(`start.letterSpacing` · `card.labelLetterSpacing`)에 있다.
 */

import { COLORS } from './colors';

export const colors = {
  // ── 시작 버튼 (게임 시작 전 한가운데)
  startButtonBg: COLORS.primary,
  startButtonText: COLORS.white,

  // ── 소리를 내는 동안 (WaveRipple + 안내 문구)
  /** 네 게임이 함께 쓰는 물결 색. `WaveRipple`의 기본값과 같은 값이다 */
  waveRipple: COLORS.waveRipple,
  loadingText: COLORS.textLoading,

  // ── 동물 카드 (3열 그리드)
  cardBg: COLORS.background,
  cardBorder: COLORS.border,
  cardLabel: COLORS.textPrimary,
  /** 맞힌 카드 — 옅은 초록 판에 초록 테두리 */
  cardDisabledBg: COLORS.backgroundSuccess,
  cardDisabledBorder: COLORS.green,
  /** 흰 배경 위 초록 글자라 `success`가 아니라 짙은 `successText`를 쓴다 */
  cardDisabledLabel: COLORS.successText,
  /** 오답 — Alert 없이 이 색과 흔들림만으로 알린다 */
  cardErrorBg: COLORS.backgroundError,
  cardErrorBorder: COLORS.errorBorder,

  // ── 모달 셋(시작 · 오류 · 성공)이 같은 옷을 입는다
  modalScrim: COLORS.overlay,
  modalBg: COLORS.backgroundWarm,
  modalTitle: COLORS.primaryDark,
  modalText: COLORS.textSlate,
  modalButtonBg: COLORS.primary,
  modalButtonText: COLORS.white,
} as const;

export const opacity = {
  /** 시작 버튼을 누르고 있는 동안 (`activeOpacity`) */
  startPressed: 0.8,
  /** 동물 카드를 누르고 있는 동안. 시작 버튼보다 한 단 더 눌린다 */
  cardPressed: 0.7,
  /** 맞혀서 잠긴 카드. 누를 수 없다는 표시라 `activeOpacity`가 아니라 스타일이다 */
  cardDisabled: 0.8,
  /**
   * 오답 카드. 1이라 사실상 안 흐려진다 —
   * 빨간 판이 이미 충분해서 0.9에서 1로 올린 값이다.
   */
  cardError: 1,
} as const;
