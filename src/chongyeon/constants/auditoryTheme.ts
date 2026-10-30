/**
 * 청능 훈련(auditory) — 색 · 글자 토큰
 * 쓰는 곳: `screens/MatchGameAIScreen.tsx` (Q-Learning)
 *
 * 기타 탭(`guitarTheme.ts` + `guitarLayout.ts`)과 같은 짝이다.
 * 치수와 구조·상태 주석은 `auditoryLayout.ts`에 있다.
 *
 * 공용 `colors.ts`의 색은 **여기서 이름만 다시 붙인다** — 값을 복제하지 않는다.
 * 등급 5색(`grade*`)만 이 화면 전용이라 리터럴로 둔다.
 *
 * `fontSize`가 없는 이유: 이 화면의 글자 크기는 「전체 정확도」 숫자 하나만 빼면
 * 전부 **공용 반응형 키**다. 그 하나도 반응형(태블릿 52 / 폰 48)이라
 * 규칙 3에 따라 `auditoryLayout.ts`(`stats.overallValueFontSize`)에 있다.
 */

import { COLORS } from './colors';

export const colors = {
  // ── 판
  screenBg: COLORS.backgroundGray,
  title: COLORS.textPrimary,
  /** 「난이도 · 남은 기회 · 점수」 줄과 안내 문구 */
  statusText: COLORS.textMuted,

  // ── 소리를 내는 동안 (LISTENING)
  /** 네 게임이 함께 쓰는 물결 색. `WaveRipple`의 기본값과 같은 값이다 */
  waveRipple: COLORS.waveRipple,
  loadingText: COLORS.textLoading,
  /** 첫 로드(LOADING)의 `ActivityIndicator` */
  spinner: COLORS.activityIndicator,

  // ── 선택지 버튼 (게임판. 상태에 따라 판·테두리·글자가 함께 바뀐다)
  choiceBg: COLORS.blueLight,
  choiceBorder: COLORS.blue,
  choiceLabel: COLORS.textPrimary,
  choiceCorrectBg: COLORS.successLight,
  /** 채운 면이라 브랜드 초록 그대로 (글자였다면 `successOnWhite`여야 한다) */
  choiceCorrectBorder: COLORS.success,
  choiceIncorrectBg: COLORS.errorLight,
  choiceIncorrectBorder: COLORS.error,

  // ── 큰 버튼 넷 (표준 · 약점 · 통계 · 계속하기). 글자는 모두 흰색이다
  buttonText: COLORS.white,
  primaryButtonBg: COLORS.blue,
  secondaryButtonBg: COLORS.orange,
  /** 「내 통계 보기」 */
  statsButtonBg: COLORS.successGreen,

  // ── 통계 화면
  statsCardBg: COLORS.background,
  overallLabel: COLORS.textSecondary,
  overallValue: COLORS.blue,
  overallDetail: COLORS.textLight,
  statName: COLORS.textPrimary,
  accuracyText: COLORS.textPrimary,
  attemptText: COLORS.textSecondary,
  noDataText: COLORS.textLight,
  /** 진행 막대의 **바탕**. 채운 부분은 등급 색을 그대로 쓴다 */
  progressTrack: COLORS.grayLight,

  // ── 등급 5단계 (정확도 0 · 50 · 75 · 90% 경계).
  //    막대를 채우는 색이자 라벨 글자 색이라 **둘 다에 쓰인다**.
  /** 한 번도 안 해 본 소리 (total === 0) */
  gradeUntried: '#999',
  /** 90% 이상 — 완벽 */
  gradePerfect: '#FF6B6B',
  /** 75% 이상 — 우수 */
  gradeExcellent: '#4ECDC4',
  /** 50% 이상 — 보통 */
  gradeNormal: '#95E1D3',
  /** 50% 미만 — 연습필요 */
  gradePractice: '#FFE66D',
} as const;

export const opacity = {
  /** 큰 버튼 넷을 누르고 있는 동안 (`activeOpacity`) */
  pressed: 0.8,
  /** 선택지 버튼을 누르고 있는 동안. 큰 버튼보다 한 단 더 눌린다 */
  choicePressed: 0.7,
} as const;
