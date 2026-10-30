/**
 * 청능 훈련(auditory) — 레이아웃 · 인터랙션 명세
 * 기준 화면: 세로 스마트폰 411 × 868 dp (확인 기기). 색·불투명도는 `auditoryTheme.ts`.
 *
 * 쓰는 곳: `MatchGameAIScreen`(Q-Learning).
 *
 * 화면 하나에 다섯 장면이 들어 있고 `state.status`가 그중 하나만 고른다.
 * 장면을 갈아 끼우는 것은 `renderScreen()` 하나뿐이라, 이 파일의 토큰도
 * **장면별이 아니라 요소별**로 묶여 있다(`button` · `choice` · `stats` · `progress`).
 *
 * ─────────────────────────────────────────────────────────────
 * 1. 구조 트리 — 무엇이 무엇을 감싸는가
 * ─────────────────────────────────────────────────────────────
 *
 * container                        flex: 1, colors.screenBg
 * │
 * ├── MissionProgressIcon          status가 LOADING·HOME이 아닐 때만
 * │
 * └── renderScreen()               아래 다섯 중 하나
 *
 *   [HOME]  centered               flex 1 가운데, padding LAYOUT.spacingMD
 *   │   ├── titleRow               row, gap titleIcon.gap, marginBottom LAYOUT.spacingLG
 *   │   │   ├── Ionicons ear-outline   titleIcon.size, colors.title
 *   │   │   └── mainTitle          LAYOUT.sectionTitleFontSize 「청능 훈련 (Q-Learning)」
 *   │   └── homeButtons            width 100%, 가운데, gap button.homeStackGap
 *   │       ├── primaryButton      colors.primaryButtonBg     「game-controller-outline 표준 모드」
 *   │       ├── secondaryButton    colors.secondaryButtonBg   「flame-outline 약점 훈련 모드」
 *   │       └── statsButton        colors.statsButtonBg       「stats-chart-outline 내 통계 보기」
 *   │           (셋 다 width button.primaryWidthPercent, radius LAYOUT.cardBorderRadius,
 *   │            paddingV LAYOUT.completeButtonPaddingV / H LAYOUT.spacingLG,
 *   │            marginV 0 — 공유 스타일의 spacingXS는 홈에서만 덮는다,
 *   │            elevation button.elevation, activeOpacity opacity.pressed)
 *   │       버튼은 전부 row: Ionicons(button.iconSize, colors.buttonText) + gap button.iconGap + 글자
 *   │
 *   [LOADING] centered
 *   │   └── ActivityIndicator      size large, colors.spinner
 *   │
 *   [LISTENING] loadingContainer   flex 1 가운데
 *   │   ├── WaveRipple             size LAYOUT.waveAnimationSize (네 게임 공용)
 *   │   │                          style waveAnimation = 같은 값의 정사각
 *   │   └── Text                   marginTop LAYOUT.loadingTextMarginTop
 *   │
 *   [PLAYING] centered
 *   │   ├── statusText × 2         LAYOUT.hintTextFontSize
 *   │   └── gameBoard              row + wrap, 가운데, width 100%
 *   │       └── gameButton × N     SOUNDS_CONFIG 전부. minWidth choice.minWidth
 *   │           │                  margin choice.margin, radius choice.borderRadius
 *   │           │                  paddingV LAYOUT.spacingSM / H LAYOUT.spacingMD
 *   │           │                  borderWidth choice.borderWidth
 *   │           │                  activeOpacity opacity.choicePressed
 *   │           │                  ├ 정답: colors.choiceCorrect*
 *   │           │                  └ 오답: colors.choiceIncorrect*
 *   │           └── Text           LAYOUT.smallButtonTextFontSize
 *   │
 *   [RESULTS] centered
 *   │   ├── mainTitle              「🎉 라운드 성공!」 / 「😥 라운드 실패」
 *   │   ├── resultText × 1~2       LAYOUT.completedTitleFontSize (실패일 때만 정답 줄)
 *   │   └── primaryButton          「play 계속하기」
 *   │
 *   [STATS] container
 *       ├── statsHeaderSection     paddingH/Top LAYOUT.spacingMD, paddingBottom LAYOUT.spacingSM
 *       │   ├── titleRow           row, gap titleIcon.gap — Ionicons stats-chart-outline + title 「내 통계」
 *       │   └── overallStatsCard   colors.statsCardBg, radius LAYOUT.cardBorderRadius
 *       │       │                  padding LAYOUT.spacingMD, marginTop LAYOUT.spacingSM
 *       │       │                  elevation stats.overallCardElevation
 *       │       ├── Text 제목      LAYOUT.smallButtonTextFontSize
 *       │       ├── Text 값        stats.overallValueFontSize (**이 화면의 유일한 전용 글자 크기**)
 *       │       └── Text 상세      LAYOUT.totalCountFontSize
 *       │
 *       └── ScrollView statsContainer   paddingH LAYOUT.spacingMD
 *       │   │                           paddingTop LAYOUT.spacingSM / Bottom LAYOUT.spacingMD
 *           └── statCard × N            정확도 낮은 순. colors.statsCardBg
 *               │                       radius stats.cardBorderRadius, padding stats.cardPadding
 *               │                       marginBottom stats.cardMarginBottom
 *               │                       elevation stats.cardElevation
 *               ├── statCardHeader      row, 양끝 정렬, marginBottom LAYOUT.spacingSM
 *               │   ├── statName        LAYOUT.completedTitleFontSize
 *               │   └── gradeContainer  row, gap LAYOUT.spacingXS
 *               │       ├── gradeEmoji  LAYOUT.completedTitleFontSize
 *               │       └── gradeLabel  LAYOUT.totalCountFontSize, 색은 등급 색
 *               ├── [시도 있음] progressBarContainer  height progress.barHeight
 *               │   │                   radius progress.barBorderRadius, overflow hidden
 *               │   │                   colors.progressTrack
 *               │   └── progressBar     width `정확도%`, backgroundColor = 등급 색
 *               ├── [시도 있음] statDetails   row, 양끝: 정확도 % · `맞힌수/전체회`
 *               └── [시도 없음] noDataText    italic 가운데
 *
 *   RESULTS·STATS에서 HOME으로 돌아가는 길은 감싼 쪽의 우하단 「나가기」(`GameExitButton`) 하나다.
 *
 * ─────────────────────────────────────────────────────────────
 * 2. 계산해서 쓰는 값 — 토큰만으로는 안 보이는 것
 * ─────────────────────────────────────────────────────────────
 *
 * 전체 정확도 = 전체 정답 / 전체 시도 × 100 (시도 0이면 "N/A")
 * 소리별 정확도 = correct / total × 100 → 진행 막대의 `width`가 그대로 이 퍼센트다.
 * 등급 경계 = 90 · 75 · 50%. **색과 라벨이 같은 경계를 쓰므로** 한쪽만 고치면 갈린다
 *             (`auditoryTheme.ts`의 `grade*` 주석과 짝이다).
 * 정렬 = 정확도 오름차순. 시도 0은 정확도 1로 쳐서 맨 뒤로 보낸다.
 * 선택지 개수 = `SOUNDS_CONFIG` 전부. 난이도는 **정답 개수**만 바꾸고 판은 그대로다 —
 *               그래서 게임판은 난이도와 무관하게 같은 크기다.
 *
 * ─────────────────────────────────────────────────────────────
 * 3. 상태 — 무엇이 언제 보이는가
 * ─────────────────────────────────────────────────────────────
 *
 * | status    | 미션 아이콘 | 보이는 것                         |
 * |-----------|-------------|-----------------------------------|
 * | LOADING   | 숨김        | 스피너 하나                       |
 * | HOME      | 숨김        | 제목 + 큰 버튼 셋                 |
 * | LISTENING | 보임        | 물결 + 「소리를 재생하고 있습니다」 |
 * | PLAYING   | 보임        | 상태 두 줄 + 선택지 판             |
 * | RESULTS   | 보임        | 결과 + 계속하기                    |
 * | STATS     | 보임        | 통계 목록                          |
 *
 * 선택지 한 장의 상태는 `userSelections[name]`이 정한다:
 *
 * | 값          | 판                    | 테두리                  | 글자                  | 누름 |
 * |-------------|-----------------------|-------------------------|-----------------------|------|
 * | (없음)      | choiceBg              | choiceBorder            | choiceLabel           | 가능 |
 * | 'correct'   | choiceCorrectBg       | choiceCorrectBorder     | choiceLabel           | 잠김 |
 * | 'incorrect' | choiceIncorrectBg     | choiceIncorrectBorder   | choiceLabel           | 잠김 |
 *
 * 고른 버튼은 언제나 정답 아니면 오답이라 따로 「잠김」 회색을 두지 않는다 —
 * 예전에는 회색이 맨 뒤에서 덮어 정답·오답 색이 보이지 않았다.
 * 색만으로는 토크백에 안 읽히므로 `accessibilityLabel`이 결과를 말로 읽어 준다.
 *
 * ─────────────────────────────────────────────────────────────
 * 4. 제약 조건 — 지켜야 하는 규칙
 * ─────────────────────────────────────────────────────────────
 *
 * **이 파일을 고치면 AI 화면이 바뀐다.**
 *
 * 큰 버튼 넷의 폭은 `button.primaryWidthPercent`(80%) 하나로 맞춰져 있다.
 *
 * `choice.borderRadius`는 `stats.cardBorderRadius`와 값이 같지만(12) **다른 키다.**
 * 예전에는 한 키(`auditoryStatsCardBorderRadius`)를 선택지 버튼과 통계 카드가
 * 나눠 썼는데, 둘은 서로 다른 장면의 다른 요소다 — 한쪽을 고치려다 다른 쪽이
 * 따라 바뀌지 않도록 갈라 두었다.
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** 세로 전용 앱 기준, 600px 이상을 태블릿으로 구분 */
const isTablet = SCREEN_WIDTH >= 600;

/** HOME·RESULTS·STATS의 큰 버튼 넷 */
export const button = {
  /** 표준 · 약점 · 통계 · 계속하기가 모두 이 폭이다 */
  primaryWidthPercent: '80%' as const,
  elevation: 3,
  /** 버튼 글자 앞 Ionicons. 글자(`LAYOUT.buttonTextFontSize` 18/16)보다 2 크게 */
  iconSize: isTablet ? 20 : 18,
  iconGap: 8,
  /** 홈 버튼 세 개의 상하 간격. 결과·통계 버튼은 이 값을 쓰지 않는다 */
  homeStackGap: isTablet ? 24 : 16,
} as const;

/** 제목(「청능 훈련」·「내 통계」) 앞 Ionicons. 제목 글자(30/24)와 같은 크기 */
export const titleIcon = {
  size: isTablet ? 30 : 24,
  gap: 8,
} as const;

/** PLAYING의 선택지 버튼 (`SOUNDS_CONFIG` 전부가 한 판에 깔린다) */
export const choice = {
  minWidth: isTablet ? 120 : 100,
  margin: 6,
  borderWidth: 2,
  /** 통계 카드와 값은 같지만 다른 키다 — 4절 */
  borderRadius: 12,
} as const;

/** STATS의 카드 둘 (전체 정확도 · 소리별) */
export const stats = {
  /** 「전체 정확도」 큰 숫자. 이 화면의 유일한 전용 글자 크기다 */
  overallValueFontSize: isTablet ? 52 : 48,
  overallCardElevation: 3,
  cardBorderRadius: 12,
  cardPadding: 16,
  cardMarginBottom: 12,
  cardElevation: 2,
} as const;

/** 소리별 정확도 막대. 채운 폭은 정확도 %라 토큰이 아니다 (2절) */
export const progress = {
  barHeight: 8,
  barBorderRadius: 4,
} as const;

/** 연출 시간 */
export const motion = {
  /**
   * 문제음 사이 간격. 소리가 겹쳐 들리지 않게 한 박자 쉰다 —
   * 소리 셋을 일부러 겹쳐 내는 `matchGame`(200ms)과 다른 값인 이유다.
   */
  questionGapMs: 800,
} as const;
