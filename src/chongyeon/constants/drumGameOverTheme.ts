/**
 * 결과창(`DrumGameOverScreen`) — 색 · 고정 글자 크기 · 투명도.
 * 치수는 `drumGameOverLayout.ts`.
 *
 * 드럼 퀴즈 모드의 전체 화면 오버레이가 쓴다.
 *
 * 값은 전부 공용 `colors.ts`에서 온 것을 **이 화면의 뜻으로 다시 이름 붙인 것**이다
 * (`COLORS.white` → `cardBg`). 등급색 둘만 이 파일 고유의 리터럴이다.
 *
 * **`fontSize`가 없다.** 이 화면의 글자 넷(점수 · 문구 · 버튼)이 전부
 * `LAYOUT.isTablet`으로 갈리는 반응형이라 규칙 3대로 layout의 `card` · `button`에 있다.
 *
 * 쓰는 곳: `screens/DrumGameOverScreen.tsx` ← `screens/DrumScreen.tsx`
 */

import { COLORS } from './colors';

export const colors = {
  /** 점수 카드 — 흰 판 + 옅은 테두리 (제약은 layout 4절) */
  cardBg: COLORS.white,
  cardBorder: COLORS.border,

  /** 「완벽해요!」 · 「잘했어요!」 · 「아쉬워요!」 문구 */
  message: COLORS.textPrimary,

  /**
   * 결과 등급색. 셋 다 **흰 카드 위**에 올라가므로 원색 그대로는 흐리다 —
   * 금 `#FFD700`은 흰 배경에서 2.2:1, 초록 `#7cbd7e`도 2.2:1이라
   * 큰 글씨 기준(3:1)에 못 미친다. 그래서 한 톤씩 내린 값이다.
   * 밝기가 아니라 **색상(hue)으로** 가른다 (세션 28에 미션 아이콘에서 세운 원칙).
   */
  tierPerfect: '#B8860B',
  tierGood: COLORS.successOnWhite,
  tierTryAgain: '#6B7280',

  /** 주 버튼 — 「다시 하기」(드럼) · 「확인」(learn). 채운 초록 */
  actionBg: COLORS.success,
  actionBorder: COLORS.success,
  actionText: COLORS.white,

  /** 나가기 — 같은 틀에 바탕만 비운 아웃라인 */
  secondaryBg: COLORS.white,
  secondaryText: COLORS.successOnWhite,
} as const;

export const opacity = {
  /** 눌린 버튼 */
  pressed: 0.8,
} as const;
