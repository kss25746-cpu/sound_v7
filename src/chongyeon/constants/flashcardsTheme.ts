/**
 * 단어 카드(flashcards 탭) — 색 · 글자 토큰
 * 쓰는 곳: `screens/FlashcardsScreen.tsx` · `components/game/WordFlashcard.tsx`
 *
 * 기타 탭(`guitarTheme.ts` + `guitarLayout.ts`)과 같은 짝이다.
 * 치수와 구조·상태 주석은 `flashcardsLayout.ts`.
 *
 * 공용 `colors.ts`의 색은 **여기서 이름만 다시 붙인다** — 값을 복제하지 않는다.
 *
 * ⚠ 대비 규칙(공용 `colors.ts`가 적어 둔 것)을 여기서도 지킨다:
 *   글자·얇은 선에 `success`(#7cbd7e)를 쓰지 않는다 — 흰 바탕에서 2.2:1이다.
 *   채운 면에만 쓰고, 글자·눈금은 `successOnWhite`(#4E9A51)를 쓴다.
 */

import { COLORS, WAVEFORM_GRADIENT } from './colors';

export const colors = {
  // ── 판. 배경은 사진이고 화면 자체는 투명하다. 흰 막은 없다.
  textPrimary: COLORS.textPrimary,
  textSecondary: COLORS.textSecondary,

  // ── 사진 위 받침 (제목 pill · 진행숫자 pill · 진행바 레일)
  onImageBg: COLORS.surfaceOnImage,
  onImageBorder: COLORS.border,
  /** 제목 앞 아이콘 · 완료화면 트로피 */
  accentIcon: COLORS.primary,

  // ── 익힘 배지 (뒤에 깔린 SVG가 배경·테두리를 대신한다)
  badgeText: COLORS.white,

  // ── 진행바
  /** 레일. 사진 위라 흰색이다 — successLight는 거의 보이지 않았다 */
  progressRail: COLORS.surfaceOnImage,
  /** 지나온 구간 */
  progressFill: COLORS.successOnWhite,
  /** 지나온 눈금은 초록 채움 위라 흰색으로 뒤집는다 */
  progressTickPassed: COLORS.white,
  progressTickAhead: COLORS.successOnWhite,

  // ── 카드
  cardBorder: COLORS.successOnWhite,
  /** 카드 사진 위에 덮는 따뜻한 반투명 판 (사진이 비쳐 글자가 읽히도록) */
  cardOverlay: 'rgba(255, 250, 240, 0.55)',

  // ── 카드 안(WordFlashcard) 단어 카드
  wordCardBg: COLORS.white,
  /** 지금 소리 나는 카드 */
  wordCardBorderPlaying: COLORS.success,
  wordCardBgPlaying: COLORS.backgroundSuccess,
  wordText: COLORS.textPrimary,
  wordPlayIcon: COLORS.success,
  wordPlayIconPlaying: COLORS.successOnWhite,
  /** VS 칸 · 파형 — 파형 그라데이션의 첫 색과 같은 주황이다 */
  vsBg: WAVEFORM_GRADIENT.start,
  vsText: 'white',
  waveform: WAVEFORM_GRADIENT.start,

  // ── 「전체 듣기」
  playAllBg: COLORS.success,
  playAllText: COLORS.white,
  /** 재생 중(비활성). borderGray + opacity 0.6이던 때는 흰 글자가 1.5:1로 사라졌다 */
  playAllDisabledBg: COLORS.grayLight,
  playAllTextDisabled: COLORS.textSecondary,

  // ── 하단 네비 (◀ 학습완료 ▶)
  navButtonBg: COLORS.backgroundLight,
  navButtonDisabledBg: COLORS.grayLight,
  navIcon: COLORS.textPrimary,
  /** 비활성 화살표. borderGray는 이 배경(#E0E0E0) 위에서 1.2:1이라 사라졌다 */
  navIconDisabled: COLORS.textSecondary,
  completeBg: COLORS.success,
  completeText: COLORS.white,
  completeDisabledBg: COLORS.grayLight,
  /** 회색 바탕 위 흰 글자는 1.5:1이다 */
  completeTextDisabled: COLORS.textSecondary,

  // ── 완료화면 (카드 안에 들어간다)
  completionTitle: COLORS.successOnWhite,
  completionSubText: COLORS.textSecondary,

  // ── 익힘모달 (아래서 올라오는 시트)
  /** 시트 바탕 — 옅은 크림색 */
  modalSheetBg: '#FFF9E6',
  /** 시트 뒤 스크림 */
  modalScrim: 'rgba(0, 0, 0, 0.5)',
  modalHandle: COLORS.borderGray,
  /** 닫기 버튼 바탕 — 아주 옅은 회색 판 */
  modalCloseBg: 'rgba(0, 0, 0, 0.06)',
  /** 「전체 다시 하기」 — 채운 초록과 나눠 실수 누름을 막는 테두리 버튼 */
  modalResetBorder: COLORS.borderGray,
  modalResetText: COLORS.textSecondary,

  // ── 완료 항목 (시트 안 2열)
  completedItemBg: COLORS.white,
  completedItemBorder: COLORS.border,
  completedItemText: COLORS.textPrimary,
  /** 「↺ 되돌리기」 */
  chipBg: COLORS.backgroundSuccess,
  chipText: COLORS.successOnWhite,
} as const;

/**
 * 고정 글자 크기.
 *
 * 이 화면의 글자 크기는 거의 전부 **기기별**(태블릿 분기)이거나 카드 크기에서
 * 역산하는 값이라 `flashcardsLayout.ts`에 있다 — 여기 있는 것은 기기와 무관한 값뿐이다.
 */
export const fontSize = {
  /** 단어 두 장 사이의 「VS」 */
  vs: 16,
  /** 완료화면 설명문의 줄 간격 */
  completionSubLineHeight: 24,
} as const;

export const opacity = {
  /** 전체듣기 중 지금 울리지 않는 쪽 단어 카드 */
  wordCardDimmed: 0.5,
  /** 누를 때 — 네비·배지처럼 자주 누르는 것 */
  press: 0.88,
  /** 누를 때 — 완료 항목·「전체 다시 하기」처럼 한 번씩 누르는 것 */
  pressSoft: 0.7,
  /** 누를 때 — 완료화면의 「처음부터」 */
  pressStrong: 0.8,
} as const;
