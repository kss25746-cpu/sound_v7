/**
 * 소리 맞추기(matchGame) — 레이아웃 · 인터랙션 명세
 * 기준 화면: 세로 스마트폰 411 × 868 dp (확인 기기). 색·불투명도는 `matchGameTheme.ts`.
 *
 * 소리 3개를 이어서 들려준 뒤, 9장짜리 3열 카드판에서 그 셋을 고르는 게임이다.
 * 화면에 세로 스택이 없다 — 배경 사진 한 장 위에 `container` 하나가 가운데 떠 있고,
 * 그 안의 내용만 상태에 따라 갈아 끼운다(물결 / 시작 버튼 / 카드판).
 *
 * ─────────────────────────────────────────────────────────────
 * 1. 구조 트리 — 무엇이 무엇을 감싸는가
 * ─────────────────────────────────────────────────────────────
 *
 * big_container                    flex: 1, 가운데 정렬
 * │
 * ├── backgroundContainer          absolute left/top 0
 * │   │                            LAYOUT.screenWidth × LAYOUT.screenHeight
 * │   └── Image 38.jpg             100% × 100%, resizeMode cover
 * │
 * ├── MissionProgressIcon          gameId "matchGame" (공용 컴포넌트가 제 자리를 잡는다)
 * │
 * ├── container                    가운데 정렬, width scene.widthPercent, maxWidth scene.maxWidth
 * │   │                            paddingH scene.paddingH, paddingTop/Bottom scene.padding*
 * │   │                            ⚠ 이 셋이 `grid`의 입력이다 — 아래 2절
 * │   │
 * │   ├── [시작 전 · 로딩 중] loadingContainer   가운데 정렬, paddingV LAYOUT.spacingLG
 * │   │   ├── WaveRipple           size LAYOUT.waveAnimationSize (네 게임 공용)
 * │   │   │                        style waveAnimation = 같은 값의 정사각
 * │   │   └── Text                 marginTop LAYOUT.loadingTextMarginTop
 * │   │
 * │   ├── [시작 전 · 대기] startButton           colors.startButtonBg
 * │   │   │                        paddingV/H start.padding*, radius start.borderRadius
 * │   │   │                        minWidth start.minWidth, elevation start.elevation
 * │   │   │                        activeOpacity opacity.startPressed
 * │   │   └── row: Ionicons game-controller-outline(start.iconSize) + gap start.iconGap
 * │   │       + Text 「게임시작」 LAYOUT.buttonTextFontSize, letterSpacing start.letterSpacing
 * │   │
 * │   └── [게임 중] gameButtonsContainer          row + wrap, 가운데, width 100%
 * │       │                        gap grid.gap, marginTop card.containerMarginTop
 * │       └── gameButton × 9        grid.cardSize 정사각, radius card.borderRadius
 * │           │                    borderWidth card.borderWidth, elevation card.elevation
 * │           │                    overflow hidden, activeOpacity opacity.cardPressed
 * │           │                    ├ 맞힘: colors.cardDisabled*, borderWidth card.disabledBorderWidth,
 * │           │                    │       elevation card.disabledElevation, opacity.cardDisabled
 * │           │                    └ 오답: colors.cardError*, borderWidth card.errorBorderWidth,
 * │           │                            elevation card.errorElevation, opacity.cardError
 * │           └── buttonContent    flex 1, 아래 정렬, paddingBottom card.contentPaddingBottom
 * │               │                height grid.contentHeight (**고정** — 카드 흔들림 방지)
 * │               │                Rive일 때만 height grid.cardSize (buttonContentAnimating)
 * │               ├── Image        card.imageSize 정사각, marginBottom card.imageMarginBottom
 * │               │                (누르지 않은 카드)
 * │               ├── RiveAnimalGame  card.riveSize 정사각, marginBottom card.riveMarginBottom (**음수**)
 * │               │                (누른 카드만. motion.windowMs 동안)
 * │               └── Text         누르지 않은 카드에만. letterSpacing card.labelLetterSpacing
 * │
 * └── Modal × 3 (시작 · 오류 · 성공)  transparent, fade. **셋이 같은 스타일을 쓴다**
 *     └── modalOverlay             flex 1 가운데, colors.modalScrim
 *         └── modalContent         colors.modalBg, padding/radius modal.content*
 *             │                    width modal.contentWidthPercent, maxWidth modal.contentMaxWidth
 *             │                    elevation modal.contentElevation
 *             ├── modalTitleRow    row, gap modal.titleIconGap, marginBottom modal.titleMarginBottom
 *             │   ├── Ionicons     modal.titleIconSize, colors.modalTitle
 *             │   │                시작 game-controller-outline · 오류 alert-circle-outline · 성공 sparkles-outline
 *             │   └── Text 제목    LAYOUT.modalTitleFontSize
 *             ├── Text 본문        LAYOUT.smallButtonTextFontSize, marginBottom modal.textMarginBottom
 *             └── modalButton      colors.modalButtonBg, paddingV/H · radius modal.button*
 *
 * ─────────────────────────────────────────────────────────────
 * 2. 계산해서 쓰는 값 — 토큰만으로는 안 보이는 것
 * ─────────────────────────────────────────────────────────────
 *
 * `grid`는 **`scene`에서 역산한다.** 카드판이 놓이는 상자가 `container`이므로
 * 그 폭(`scene.widthPercent`·`maxWidth`)과 좌우 패딩(`scene.paddingH`)을 그대로 입력으로 쓴다.
 * 예전에는 이 셋이 `layout.ts`의 함수 안에 숫자로 **복제**돼 있었고
 * (「matchGame.tsx container 스타일과 맞춤」이라는 주석이 그 사실을 적어 두고 있었다),
 * 화면 쪽 패딩만 고치면 그리드가 조용히 어긋났다. 여기서는 한 곳에서만 읽는다.
 *
 *   containerWidth = min(round(screenWidth × scene.widthRatio), scene.maxWidth)
 *   usableWidth    = containerWidth − scene.paddingH × 2
 *   cardSize       = max(grid.minCardSize, floor((usableWidth − gap × 2) / 3))
 *   mediaSize      = round(cardSize × (태블릿 0.62 / 폰 0.58))
 *   contentHeight  = round(cardSize × 0.82)   ← 글자 줄을 뺀 높이
 *   card.imageSize = round(mediaSize × 0.92)
 *   card.riveSize  = round(mediaSize × 2.0)   ← 아래 4절
 *
 * 기기별 cardSize(gap 폰 4 / 태블릿 10, 3열 고정):
 *   320 → 93 · 360 → 106 · 390 → 115 · 411 → 122 · 600 이상 → 140
 *   (600 이상은 태블릿이라 gap이 10으로 커지고 폭이 maxWidth 460에서 멎어, 셋이 같은 값이다)
 *
 * ─────────────────────────────────────────────────────────────
 * 3. 상태 — 무엇이 언제 보이는가
 * ─────────────────────────────────────────────────────────────
 *
 * | 상태                   | 물결 | 시작 버튼 | 카드판 | 모달        |
 * |------------------------|------|-----------|--------|-------------|
 * | 시작 전                | 없음 | 보임      | 없음   | 없음        |
 * | 문제음 재생 (isLoading)| 보임 | 숨김      | 없음   | 없음        |
 * | 재생 직후              | 없음 | 숨김      | 보임   | 시작 모달   |
 * | 게임 중                | 없음 | 숨김      | 보임   | 없음        |
 * | 카드 누름              | 없음 | 숨김      | 보임(그 장만 Rive) | 없음 |
 * | 모두 맞힘              | 없음 | 숨김      | 보임   | 성공 모달   |
 * | 오디오 로드 실패       | 없음 | 보임      | 없음   | 오류 모달   |
 *
 * 카드는 **동시에 여러 장이** Rive 상태일 수 있다. 한 장이 애니메이션하는 동안
 * 다른 장을 누를 수 있게 열어 둔 설계라, 같은 카드 연타만 `animatingRef`로 막는다.
 * 카드판이 한 번 열리면 게임이 끝날 때까지 닫히지 않는다 — 맞힌 카드는 사라지지 않고
 * 초록으로 잠긴다.
 *
 * ─────────────────────────────────────────────────────────────
 * 4. 제약 조건 — 지켜야 하는 규칙
 * ─────────────────────────────────────────────────────────────
 *
 * **3열은 고정이다.** `grid.columns`를 바꾸면 위 역산이 통째로 달라진다.
 * 320dp 폰에서도 3열이 유지되도록 `grid.minCardSize`(72)가 바닥을 받치는데,
 * 이 바닥이 걸리면 카드 세 장이 `usableWidth`를 넘어 줄이 바뀐다 —
 * 현재 기기 폭에서는 걸리지 않는다(위 표의 최소가 93이다).
 *
 * `buttonContent`의 높이를 고정하는 이유는 **카드 흔들림**이다. Image와 Rive는
 * 크기가 달라서 높이를 내용에 맡기면 누를 때마다 카드가 들썩인다. 그래서
 * 평소에는 `grid.contentHeight`, Rive일 때만 `grid.cardSize`로 **명시해서** 바꾼다.
 *
 * Rive는 `card.riveSize`가 이미지의 두 배가 넘고 `card.riveMarginBottom`이 음수다.
 * Rive 아트보드가 동물 둘레에 여백을 넉넉히 두고 있어, 그 여백까지 카드에 넣으면
 * 동물이 이미지보다 작게 보인다. 확대해서 카드 밖으로 넘치는 만큼은
 * `gameButton`의 `overflow: hidden`이 자른다 — 그 둘은 짝이다.
 *
 * `motion.windowMs`(카드를 Rive로 두는 시간)는 **모션이 시작한 뒤**부터 잰다.
 * 누른 시각부터 재면 상태머신이 늦게 붙은 만큼 모션이 잘린다. 자세한 것은
 * `MatchGameScreen.tsx`의 `restartWindowFromMotion` 주석에 있다.
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** 세로 전용 앱 기준, 600px 이상을 태블릿으로 구분 */
const isTablet = SCREEN_WIDTH >= 600;

/** 배경 사진 위에 떠 있는 가운데 상자. `grid`가 이 값들에서 역산된다 */
export const scene = {
  widthPercent: '96%' as const,
  /** 위 퍼센트의 숫자 몫. `grid` 계산에 쓴다 — 둘은 같은 값이어야 한다 */
  widthRatio: 0.96,
  maxWidth: 460,
  paddingH: 10,
  paddingTop: 16,
  paddingBottom: 36,
} as const;

const CONTAINER_WIDTH = Math.min(Math.round(SCREEN_WIDTH * scene.widthRatio), scene.maxWidth);
const USABLE_WIDTH = CONTAINER_WIDTH - scene.paddingH * 2;
const COLUMNS = 3;
const GAP = isTablet ? 10 : 4;
/** 작은 폰에서도 3열이 유지되도록 낮춰 둔 바닥 */
const MIN_CARD_SIZE = 72;
const CARD_SIZE = Math.max(MIN_CARD_SIZE, Math.floor((USABLE_WIDTH - GAP * (COLUMNS - 1)) / COLUMNS));

/**
 * 카드 그리드 메트릭. 세로 뷰 전용(orientation 고정) 기준이라
 * `screenWidth`·`isTablet`만 쓴다.
 */
export const grid = {
  columns: COLUMNS,
  gap: GAP,
  minCardSize: MIN_CARD_SIZE,
  cardSize: CARD_SIZE,
  /** 카드 내부(이미지/Rive)는 카드 크기에 비례하도록 고정 */
  mediaSize: Math.round(CARD_SIZE * (isTablet ? 0.62 : 0.58)),
  /** 텍스트 영역을 제외한 컨텐츠 높이(카드 흔들림 방지용 고정) */
  contentHeight: Math.round(CARD_SIZE * 0.82),
} as const;

/** 시작 버튼 — 게임 시작 전에만 가운데 */
export const start = {
  paddingV: 18,
  paddingH: 48,
  minWidth: 220,
  borderRadius: 16,
  elevation: 4,
  letterSpacing: 0.5,
  /** 글자 앞 Ionicons. 글자(`LAYOUT.buttonTextFontSize` 18/16)보다 2 크게 */
  iconSize: isTablet ? 20 : 18,
  iconGap: 8,
} as const;

/** 동물 카드 한 장 (3열 × 3줄). 크기는 `grid`에 있다 */
export const card = {
  /** 카드판을 물결·시작 버튼이 있던 자리보다 살짝 내린다 */
  containerMarginTop: 6,
  borderRadius: 16,
  borderWidth: 2,
  elevation: 3,
  /** 글자 줄을 바닥에서 띄우는 값 (Rive일 때도 같다) */
  contentPaddingBottom: 10,
  imageSize: Math.round(grid.mediaSize * 0.92),
  imageMarginBottom: 8,
  /** Rive 아트보드 여백만큼 키운다 — 넘치는 만큼은 카드가 자른다 (4절) */
  riveSize: Math.round(grid.mediaSize * 2.0),
  riveMarginBottom: -12,
  labelLetterSpacing: 0.3,

  // ── 맞힌 카드 (초록으로 잠김)
  disabledBorderWidth: 3,
  disabledElevation: 2,

  // ── 오답 카드 (빨간 판)
  /** 맞힌 카드(3)보다 얇다 — 3에서 2로 낮춘 값이다 */
  errorBorderWidth: 2,
  errorElevation: 2,
} as const;

/** 모달 셋(시작 · 오류 · 성공)이 같은 값을 쓴다 */
export const modal = {
  contentPadding: 24,
  contentBorderRadius: 20,
  contentWidthPercent: '80%' as const,
  contentMaxWidth: 320,
  contentElevation: 5,
  titleMarginBottom: 10,
  /** 제목 앞 Ionicons. 제목 글자(`LAYOUT.modalTitleFontSize` 22/18)와 같은 크기 */
  titleIconSize: isTablet ? 22 : 18,
  titleIconGap: 6,
  textMarginBottom: 20,
  buttonPaddingV: 12,
  buttonPaddingH: 24,
  buttonBorderRadius: 12,
} as const;

/**
 * 연출 시간.
 *
 * `windowMs`는 카드를 Rive로 두는 시간이고 **모션이 시작한 뒤**부터 잰다 (4절).
 * 나머지는 문제음을 들려주는 동안의 간격이다 — 소리 3개가 겹쳐 들리는 것은
 * 훈련 설계이므로 `questionGapMs`(200)는 값을 바꾸지 않는다.
 */
export const motion = {
  windowMs: 1500,
  /** 마지막 정답 뒤 성공 모달을 띄우기까지의 틈 */
  successModalDelayMs: 300,
  /** 문제음 사이 간격. **훈련 설계 값이다** */
  questionGapMs: 200,
  /** 마지막 소리가 끝나고 카드판을 열기까지 */
  afterQuestionsDelayMs: 500,

  // ── 오디오 로드·재생 실패 시에만 (maxRetries 2회)
  loadRetryDelayMs: 300,
  playRetryDelayMs: 500,
} as const;
