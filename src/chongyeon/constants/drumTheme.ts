/**
 * 드럼(drum 탭) — 색 · 글자 토큰
 * 쓰는 곳: `screens/DrumScreen.tsx`
 *
 * 기타 탭(`guitarTheme.ts` + `guitarLayout.ts`)과 같은 짝이다.
 * 치수와 구조·상태 주석은 `drumLayout.ts`에 있다.
 * ⚠ `drumSetLayouts.ts`는 **다른 파일이다** — 드럼 세트 그림의 악기 좌표 데이터이고,
 *   `components/game/InteractiveDrumSet.tsx`가 쓴다.
 *
 * 공용 `colors.ts`의 색은 **여기서 이름만 다시 붙인다** — 값을 복제하지 않는다.
 * 다만 **글자가 똑같을 때만** 그렇게 한다. 이 화면에는 같은 색을 다르게 적은 것이
 * 여럿 있는데(`'#333333'` vs `COLORS.textPrimary = '#333'`, `'#fff'` vs `'#ffffff'`,
 * `'#e0e0e0'` vs `COLORS.grayLight = '#E0E0E0'`), 값을 **한 글자도 바꾸지 않는다**는
 * 규칙 1을 지키려고 그런 것은 리터럴로 두고 아래에 무엇과 같은 색인지 적어 뒀다.
 * 표기를 통일하는 것은 값 확인이 끝난 **다음** 작업이다.
 */

import { COLORS } from './colors';

export const colors = {
  // ════ 헤더 ════
  // 색은 두 역할뿐이다 — 기본(#333 글자·아이콘, 흰 바탕, 회색 테두리)과
  // 강조(코랄, 주 버튼 「듣기연습」에만). 모드 색은 제목 **글자색으로만** 쓴다 —
  // 판·테두리를 두르면 누를 수 없는데 버튼처럼 보인다.
  headerBg: '#ffffff',
  /** `COLORS.textPrimary`(`'#333'`)와 **같은 색**이지만 표기가 다르다 (위 머리말) */
  headerText: '#333333',
  headerBackIcon: '#333333',

  /**
   * 헤더 배경 플래시. `headerFlashAnim`(0·1·2)이 이 셋 사이를 오간다.
   * **알파 1을 유지해야 한다** — 0.95였을 때 뒤 배경 이미지의 레터박스 경계선이
   * 헤더에 비쳐 보였다. 그래서 `rgba`가 아니라 `rgb`다.
   * 0 = 평소 · 1 = 퀴즈 시작(주황) · 2 = 그만하기(회색)
   */
  headerFlash: ['rgb(255, 255, 255)', 'rgb(255, 153, 0)', 'rgb(153, 153, 153)'] as const,

  // ── 제목 「연주모드」/「퀴즈모드」 글자색
  headerTitlePlay: COLORS.blue,
  headerTitleQuiz: COLORS.primaryDark,

  // ── 보조 버튼 (문제 수 · 그만하기)
  headerSecondaryBg: '#ffffff',
  /** `COLORS.grayLight`(`'#E0E0E0'`)와 같은 색, 표기만 소문자다 */
  headerSecondaryBorder: '#e0e0e0',
  headerSecondaryText: '#333333',

  // ── 주 버튼 (듣기연습)
  /** 이 화면만 쓰는 코랄. 세그먼티드 컨트롤의 pill과 같은 값이다 */
  headerPrimaryBg: '#fd7d7d',
  headerPrimaryText: '#ffffff',

  // ════ 판 위 안내 ════
  /** 듣기연습 1회째 안내 (「들린 악기에 캐릭터를 가져가세요」) */
  quizHintBg: COLORS.white,
  quizHintText: COLORS.textPrimary,
  quizHintBorder: COLORS.border,

  // ── 현재 악기 이름 칩
  /** 이 화면만 쓰는 반투명 크림색 */
  instrumentLabelBg: 'rgba(252, 237, 204, 0.9)',
  instrumentLabelBorder: COLORS.gold,
  /** 크림 판 위 짙은 회보라 */
  instrumentLabelText: '#555457',

  // ════ 하단 고정 버튼 둘 (다시 듣기 · 순환) ════
  /** 이 화면만 쓰는 주황 */
  fixedButtonBg: '#FF9800',
  /** `'#ffffff'`와 **같은 색**이지만 원본이 세 자리로 적혀 있다 (위 머리말) */
  fixedButtonText: '#fff',
  /** 다시 듣기가 잠겼을 때. 회색 + `opacity.replayDisabled` */
  fixedButtonDisabledBg: '#b0b0b0',
  pageIndicatorText: COLORS.textPrimary,

  // ════ 설정 드롭다운 (문제 수) ════
  /** 거의 불투명한 흰 판. 헤더 바로 아래로 내려온다 */
  settingsPanelBg: 'rgba(255, 255, 255, 0.98)',
  settingsPanelBorder: '#e0e0e0',
  /** 세그먼티드 컨트롤 트랙. `COLORS.backgroundLight`와 같은 값이라 이름만 다시 붙인다 */
  segmentedTrackBg: COLORS.backgroundLight,
  /** 선택 칸을 따라 미끄러지는 pill. 「듣기연습」 버튼과 같은 코랄이다 */
  segmentedIndicatorBg: '#fd7d7d',
  /** `COLORS.textSecondary`와 같은 값 */
  segmentedItemText: COLORS.textSecondary,
  segmentedItemTextSelected: '#ffffff',

  // ════ 퀴즈 연출 ════
  gameOverScrim: 'rgba(0, 0, 0, 0.7)',
  countdownText: COLORS.green,
  /** 카운트다운 숫자 뒤 그림자 */
  countdownShadow: 'rgba(0,0,0,0.3)',
  /**
   * 정답 ⭕. 채운 글리프라 브랜드 초록 그대로 쓴다 —
   * 흰 배경 위 **작은** 글자였다면 `successOnWhite`여야 하지만, 80px 이모지다.
   */
  feedbackCorrect: COLORS.success,
  /** 오답 ❌ */
  feedbackWrong: COLORS.error,

  /** 하단 버튼 안의 드럼 스틱 SVG (`DrumStickIcon`의 기본값) */
  drumStickIcon: '#ffffff',
} as const;

/**
 * 고정 글자 크기.
 *
 * 이 화면의 글자는 대부분 **반응형**이라 `drumLayout.ts`에 있다
 * (`header.titleFontSize` · `buttonFontSize` · `buttonIconSize` ·
 * `quizHint.fontSize` · `fixedButton.iconFontSize` · `pageIndicatorFontSize` ·
 * `segmented.fontSize`). 기기와 무관하게 같은 값은 둘뿐이다.
 */
export const fontSize = {
  /** 현재 악기 이름 칩 */
  instrumentLabel: 18,
  /** 카운트다운 숫자이자 정답 ⭕ / 오답 ❌ 글리프의 크기 */
  countdown: 80,
} as const;

export const opacity = {
  /** 헤더 버튼들을 누르고 있는 동안 (`activeOpacity`) */
  headerPressed: 0.8,
  /** 세그먼티드 컨트롤 한 칸을 누르고 있는 동안 */
  segmentedPressed: 0.7,
  /**
   * 「다시 듣기」가 잠겼을 때의 판.
   * 라운드마다 켜졌다 꺼지므로 **버튼을 지우지 않고** 회색 + 반투명으로만 알린다.
   */
  replayDisabled: 0.65,
  /** 잠긴 버튼 안의 글자는 판보다 덜 흐리다 */
  replayTextDisabled: 0.7,
} as const;
