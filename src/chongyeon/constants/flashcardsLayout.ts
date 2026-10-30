/**
 * 단어 카드(flashcards 탭) — 레이아웃 · 인터랙션 명세
 * 기준 화면: 세로 스마트폰 411 × 868 dp (확인 기기). 색·글자는 `flashcardsTheme.ts`.
 *
 * 이 화면의 치수는 두 가지에서 역산한다:
 *   1) **화면**에서 — 진행바 위치, 카드 스택 높이, 헤더 버튼 폭
 *   2) **카드**에서 — 카드 안(WordFlashcard)의 모든 값. 카드가 반응형이므로
 *      안쪽을 화면 기준으로 두면 작은 폰에서 넘치고 태블릿에서는 남는 자리가 버튼 위에 쌓인다
 * 상한은 「지금까지 쓰던 고정값」이라 411×868에서는 전부 종전 그대로다.
 *
 * ─────────────────────────────────────────────────────────────
 * 1. 구조 트리 — 무엇이 무엇을 감싸는가
 * ─────────────────────────────────────────────────────────────
 *
 * GestureHandlerRootView
 * │
 * ├── Modal(익힘모달)             transparent, animationType slide, 아래 4절
 * │
 * └── container                   flex: 1, 배경 투명
 *     ├── fixedBackgroundImage    absolute 0,0,0,0 · zIndex 0
 *     │                           screenWidth × screenHeight, resizeMode contain
 *     └── contentOverlay          flex: 1, paddingTop insets.top
 *         │
 *         ├── ScrollView          zIndex 1
 *         │   │                   contentContainer paddingBottom = scrollBottomPadding
 *         │   │                   (렌더에서 계산 — 3절)
 *         │   └── section         marginH section.marginH / marginV section.marginV
 *         │       │               position relative ← 진행바가 이 기준으로 절대배치된다
 *         │       │
 *         │       ├── headerTopRow        row, space-between, marginBottom header.topRowMarginBottom
 *         │       │   ├── headerSideSlot  minWidth header.sideButtonMinWidth ← 배지와 같은 폭.
 *         │       │   │                   제목이 가운데 남게 잡아 두는 자리다 (안에 나가기 버튼)
 *         │       │   ├── headerTitleCenter  flex: 1
 *         │       │   │   └── titlePill      row, gap SM, paddingH MD / paddingV **XS**
 *         │       │   │                      (제목 글자가 배지보다 커서 SM을 주면 줄이 10px 두꺼워진다)
 *         │       │   │                      radius 999, onImageBg + 테두리 1, elevation 2
 *         │       │   └── completedBadge     minWidth header.sideButtonMinWidth
 *         │       │                          배경·테두리·그림자 없음 — 뒤에 깔린 SVG가 대신한다
 *         │       │
 *         │       ├── progressContainer    **absolute** top progress.top, left/right 0
 *         │       │   │                    (카드가 없으면 그리지 않는다 — 완료화면)
 *         │       │   ├── progressLineWrapper  height progress.lineWrapperHeight, overflow visible
 *         │       │   │   ├── progressLine     레일. width 90% 가운데 정렬
 *         │       │   │   ├── progressLineFill 지나온 구간. left 시작% / width 비율 × 폭%
 *         │       │   │   ├── progressTick × 카드수   left = 시작% + i/(n-1) × 폭%
 *         │       │   │   └── progressMarker        left = 시작% + 진행 × 폭%, zIndex 10
 *         │       │   │                             marginLeft -크기/2 ← **가운데**가 지점을 가리킨다
 *         │       │   └── progressTextPill    「3 / 12」. 제목과 같은 pill이되 세로로 얇다
 *         │       │
 *         │       └── cardStackContainer   radius card.borderRadius
 *         │           │                    minHeight card.stackMinHeight, marginTop card.stackMarginTop
 *         │           └── cardStackWrapper height card.stackHeight (측정 기준점)
 *         │               └── topCard      **absolute** left/right card.widthInsetPercent (→ 폭 80%)
 *         │                   │            height 100%, marginTop card.topCardMarginTop, zIndex 100
 *         │                   │            transform: translateX/Y · rotateZ · scale, opacity
 *         │                   └── topCardBackground  radius card.backgroundBorderRadius, 테두리 2
 *         │                       ├── Image(iroawa)  absoluteFill, cover
 *         │                       ├── cardOverlay    absoluteFill, 반투명 베이지
 *         │                       └── WordFlashcard  ← 2절
 *         │                           또는 completionContainer(남은 카드 0) ← 3절
 *         │
 *         └── bottomNavigationContainer   **absolute** bottom = insets.bottom − bottomNav.bottomOffset
 *                                         height bottomNav.height, zIndex·elevation 10
 *                                         row, space-between, paddingH, gap
 *             ├── ◀ navigationArrowButton  arrowSize 정사각, radius, elevation 3
 *             ├── 학습완료 completeButton   flex: 1 ← 폭은 남는 자리가 정한다
 *             │                            minHeight = arrowSize (화살표와 같은 줄에 선다)
 *             └── ▶ navigationArrowButton
 *
 * ─────────────────────────────────────────────────────────────
 * 2. WordFlashcard — 카드 안
 * ─────────────────────────────────────────────────────────────
 *
 * container                   flex: 1, width 100%, 배경 투명
 * │                           paddingV cardInner.containerPaddingV / H containerPaddingH
 * ├── wordsBlock              flex: 1, 가운데 정렬 ← 남는 세로를 이 블록이 갖는다.
 * │   │                       (「전체 듣기」에 `marginTop: auto`를 주면 태블릿에서 여유가
 * │   │                        전부 버튼 위에 쌓여 단어 카드만 위에 붙는다)
 * │   ├── wordsRow            row, space-around, marginBottom cardInner.rowMarginBottom
 * │   │   ├── wordColumn      gap cardInner.columnGap
 * │   │   │   └── wordCard    minWidth cardInner.minWidth, padding, radius, elevation 4
 * │   │   │       │           테두리 2는 **늘 자리를 차지하고** 평소엔 transparent —
 * │   │   │       │           재생 중에만 색이 들어가 글자가 흔들리지 않는다
 * │   │   │       ├── 단어     cardInner.textFontSize
 * │   │   │       └── 스피커   cardInner.playIconSize
 * │   │   ├── vsContainer     paddingH cardInner.vsPaddingH / V vsPaddingV, radius 24
 * │   │   └── wordColumn      (단어 2, 위와 같다)
 * │   └── waveformContainer   height cardInner.waveformHeight ← **Canvas와 같은 값**이다.
 * │                           전에는 상자 39 · Canvas 60이라 21px 삐져나왔다.
 * │                           자리는 늘 차지한다 (소리가 없을 때 칸이 무너지지 않게)
 * └── playAllButton           row, paddingH/V, radius 28, elevation 4, gap 8
 *                             marginTop/Bottom = 파형·바닥과의 **최소** 간격
 *
 * ─────────────────────────────────────────────────────────────
 * 3. 화면이 계산해서 쓰는 값 (여기 상수가 재료다)
 * ─────────────────────────────────────────────────────────────
 *
 * scrollBottomPadding = max(0, insets.bottom − bottomNav.bottomOffset)
 *                       + bottomNav.height + LAYOUT.spacingLG
 *   하단 네비가 절대배치라 스크롤 내용이 그 아래로 들어간다 — 가리는 높이만큼 비워 둔다.
 *   ⚠ `bottomNav.height`는 시스템 탭바가 아니라 **이 화면이 그리는 네비**의 높이다.
 *
 * progress : 카드 1장이면 0. 아니면 currentIndex / (카드수 − 1) 을 0~1로 자른다
 * railPercent(비율) = progress.railStartPercent + 비율 × progress.railSpanPercent
 *   레일·채움·눈금·마커가 **이 한 식**을 쓴다. 전에는 마커만 다른 기준이라 4px 어긋났다.
 * tickSize = getProgressTickSize(카드수)  ← 눈금이 카드 수만큼 생기므로 많으면 줄인다
 *
 * ─────────────────────────────────────────────────────────────
 * 4. 상태 — 무엇이 언제 보이는가
 * ─────────────────────────────────────────────────────────────
 *
 * | 지금                  | 카드 자리        | 진행바 | ◀ ▶            | 학습완료 |
 * |-----------------------|------------------|--------|-----------------|----------|
 * | 남은 카드 있음         | WordFlashcard    | 보임    | 양 끝에서 비활성 | 활성     |
 * | 남은 카드 0 (완료화면) | 트로피 + 처음부터 | 숨김    | 비활성          | 비활성   |
 *
 * 카드가 움직이는 동안(◀▶ motion.swipeDurationMs · 학습완료 motion.completeDurationMs)
 * **빗장 하나**가 셋 다 막는다 — 같은 카드 하나를 움직이므로 겹치면 인덱스가 꼬인다.
 *
 * 학습완료 : 카드가 익힘 배지로 날아간 뒤(motion.completeDurationMs) 목록에서 빠지고
 *            배지가 motion.badgePulseScale로 한 번 커진다.
 * 익힘모달 : 배지를 누르면 시트가 아래서 올라온다. 완료 항목을 누르면 **맨 뒤에** 되돌아가
 *            보고 있던 카드가 그대로 남는다. 「전체 다시 하기」는 기록을 전부 지운다 —
 *            그래서 채운 초록이 아니라 테두리 버튼이다(실수 누름 방지).
 * 재생     : 단어 카드를 누르면 그 단어만. 「전체 듣기」는 단어1 → 단어2로 이어서 울리고
 *            그동안 울리지 않는 쪽 카드는 흐려진다(opacity.wordCardDimmed).
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** 세로 전용 앱 기준, 600px 이상을 태블릿으로 구분 */
const isTablet = SCREEN_WIDTH >= 600;

/**
 * 카드 세로 배치.
 *
 * 카드 높이는 `card.stackHeight`(= min(400, 화면높이 × 0.4))로 반응형인데,
 * 카드를 **밀어내는** 값만 `stackMarginTop: 150` + `topCardMarginTop: 70` = **220 고정**이었다.
 * 640dp 높이 폰에서 화면의 34%를 무조건 먹어 카드 하단이 하단 네비 밑으로 들어갔다.
 * (868dp 기기에서는 여유가 있어 드러나지 않는다)
 *
 * 높이 비례로 두되 **상한을 지금 값(220)에 맞춘다** — 868dp에서는 150/70 그대로다.
 * 둘의 비(150 : 70)도 유지한다. 역할이 다르기 때문이다:
 * `stackMarginTop`은 흐름 안에서 자리를 차지하고(스크롤 길이에 반영),
 * `topCardMarginTop`은 절대배치된 카드만 그만큼 더 내린다(자리를 차지하지 않는다).
 */
const CARD_TOP_TOTAL = Math.round(Math.max(120, Math.min(220, SCREEN_HEIGHT * 0.2535)));
const CARD_STACK_MARGIN_TOP = Math.round(CARD_TOP_TOTAL * (150 / 220));
const TOP_CARD_MARGIN_TOP = CARD_TOP_TOTAL - CARD_STACK_MARGIN_TOP;

/**
 * 카드 **안**(WordFlashcard)의 치수.
 *
 * 카드 자체는 반응형인데(`stackHeight` · 폭 80%) **안쪽 치수는 전부 고정**이었다.
 * 그래서 세로로 312px, 가로로 290px이 늘 필요했고 —
 * - 320×640 폰: 카드가 256×256이라 **세로 56px · 가로 70px 넘쳐** 「전체 듣기」가 잘렸다
 * - 태블릿(800×1280): 카드가 640×512로 커져도 내용은 그대로라 **남는 200px이 전부
 *   버튼 위에 쌓였다** — 단어 카드는 위에, 버튼은 바닥에 떨어져 균형이 깨진다
 *
 * 그래서 **화면이 아니라 카드에서** 역산한다. 기준은 지금 확인된 실기기(411×868)의
 * 카드 크기 `329×347`이고, 그 크기에서는 **모든 값이 종전과 같다.**
 * 작은 폰에서만 줄고 태블릿에서만 커진다 (세션 34~35의 「폰 값은 그대로」 원칙).
 */
const CARD_WIDTH = SCREEN_WIDTH * 0.8; // topCard가 left/right 10%
const CARD_HEIGHT = Math.min(isTablet ? 560 : 400, SCREEN_HEIGHT * 0.4);
const REF_CARD_WIDTH = 329;
const REF_CARD_HEIGHT = 347;

const scaleInCardH = (valueAtRef: number, min: number, max: number) =>
  Math.round(Math.max(min, Math.min(max, CARD_HEIGHT * (valueAtRef / REF_CARD_HEIGHT))));
const scaleInCardW = (valueAtRef: number, min: number, max: number) =>
  Math.round(Math.max(min, Math.min(max, CARD_WIDTH * (valueAtRef / REF_CARD_WIDTH))));

/**
 * 가로는 **두 단어 카드가 VS를 사이에 두고 한 줄에 들어가야** 한다.
 * 카드 폭에서 테두리(2×2)와 좌우 패딩, VS 칸을 뺀 나머지를 반으로 나눈 값이
 * 단어 카드 하나의 폭이다. 폰 상한 120은 **기존 값**이라 411dp에서는 그대로다.
 */
const CONTAINER_PADDING_H = scaleInCardW(16, 10, 20);
const VS_PADDING_H = scaleInCardW(15, 8, 18);
const VS_WIDTH = VS_PADDING_H * 2 + 20; // 'VS' 글자폭(16px 2자) 어림
const CARD_INNER_WIDTH = CARD_WIDTH - 4 - CONTAINER_PADDING_H * 2;
const WORD_CARD_WIDTH = Math.max(
  84,
  Math.min(isTablet ? 180 : 120, Math.floor((CARD_INNER_WIDTH - VS_WIDTH) / 2))
);
/** 단어 카드 안쪽 패딩도 카드 폭을 따라간다 — 카드만 줄면 글자가 넘친다 */
const WORD_CARD_PADDING = Math.max(
  10,
  Math.min(isTablet ? 26 : 20, Math.round(WORD_CARD_WIDTH * (20 / 120)))
);

/**
 * 진행바 레일의 기하.
 *
 * 레일(`progressLine`)은 래퍼 폭의 90%가 **가운데 정렬**이라 래퍼 기준 5%에서 시작해
 * 95%에서 끝난다. 마커·눈금·채움이 **한 식**(`시작 + 비율 × 폭`)을 쓰게 여기서 숫자로 둔다.
 * 전에는 마커만 `left: 비율 × 90%` + `marginLeft: -1`이라 레일보다 4px 왼쪽에 놓였고,
 * 눈금은 `space-between`이라 또 다른 기준이었다 — 셋이 서로 어긋나 있었다.
 */
const SECTION_MARGIN_H = 15;
const PROGRESS_RAIL_RATIO = 0.9;
const PROGRESS_RAIL_SPAN_PERCENT = PROGRESS_RAIL_RATIO * 100;
const PROGRESS_RAIL_START_PERCENT = (100 - PROGRESS_RAIL_SPAN_PERCENT) / 2;
/** 레일 실제 폭(px). 눈금을 카드 수에 맞춰 줄일 때 쓴다 */
const PROGRESS_RAIL_WIDTH = (SCREEN_WIDTH - SECTION_MARGIN_H * 2) * PROGRESS_RAIL_RATIO;
const PROGRESS_MARKER_SIZE = isTablet ? 44 : 32;
const PROGRESS_TICK_BASE_SIZE = isTablet ? 12 : 10;

export const section = {
  marginH: SECTION_MARGIN_H,
  marginV: 10,
  titleFontSize: isTablet ? 30 : 24,
  /** 사진 위 받침이라 알약 모양 */
  pillBorderRadius: 999,
} as const;

/** 헤더 한 줄 — 나가기 · 제목 pill · 익힘 배지 */
export const header = {
  topRowMarginBottom: isTablet ? 20 : 15,
  /**
   * 제목·배지의 아이콘 치수. 옆 글자 크기의 0.85~0.9로 둔다 —
   * 같은 px면 획이 굵어 글자보다 커 보인다.
   */
  titleIconSize: isTablet ? 26 : 21,
  /** 헤더 좌/우 대칭. 왼쪽 빈 칸도 이 폭을 잡아 제목이 가운데 남는다 */
  sideButtonMinWidth: Math.min(isTablet ? 120 : 88, Math.round(SCREEN_WIDTH * 0.22)),
  sideButtonPaddingH: 12,
  sideButtonPaddingV: 8,
  sideButtonBorderRadius: 8,
  badgeTextFontSize: isTablet ? 22 : 16,
  badgeIconSize: isTablet ? 20 : 15,
} as const;

export const progress = {
  /**
   * 진행바의 세로 위치(섹션 기준, 절대배치). 화면 높이 비례이던 값에 **상한만** 걸었다 —
   * 태블릿(1280dp)에서 256까지 내려가 카드와 붙었다. 868dp 폰에서는 174로 종전과 같다.
   */
  top: Math.round(Math.min(isTablet ? 190 : 176, SCREEN_HEIGHT * 0.2)),
  /** 레일 폭. 기하의 근거는 위 `PROGRESS_RAIL_*` 주석 */
  lineWidthPercent: `${PROGRESS_RAIL_SPAN_PERCENT}%` as `${number}%`,
  /** 마커·눈금·채움이 함께 쓰는 한 식: `시작 + 비율 × 폭` (래퍼 기준 %) */
  railStartPercent: PROGRESS_RAIL_START_PERCENT,
  railSpanPercent: PROGRESS_RAIL_SPAN_PERCENT,
  lineWrapperHeight: isTablet ? 24 : 20,
  lineHeight: isTablet ? 4 : 3,
  lineBorderRadius: 2,
  markerSize: PROGRESS_MARKER_SIZE,
  markerIconSize: isTablet ? 48 : 36,
  /** 마커는 **가운데**가 레일 위 지점을 가리켜야 한다. 전에는 -1이라 4px 왼쪽이었다 */
  markerMarginLeft: -PROGRESS_MARKER_SIZE / 2,
  markerMarginTop: isTablet ? -36 : -30,
  textFontSize: isTablet ? 22 : 18,
  textMarginTop: isTablet ? 8 : 6,
} as const;

/**
 * 진행바 눈금 하나의 크기.
 *
 * 눈금은 **카드 한 장**을 뜻하므로 개수가 카드 수를 따라간다. 그래서 카드가 많으면
 * 기본 크기(폰 10 · 태블릿 12)로는 서로 붙는다. 레일을 카드 수로 나눈 한 칸의 **절반**을
 * 넘지 않게 줄이되, 눈금이 보이지 않을 만큼 작아지지는 않게 하한을 둔다.
 *
 * 레일이 넓으면 줄일 일이 없다 — 실기기(411dp, 레일 343)에서는 카드 20장이어도 10 그대로고,
 * 320dp(레일 261)에서 15장을 넘길 때부터 줄어든다.
 */
export function getProgressTickSize(cardCount: number): number {
  if (cardCount <= 1) return PROGRESS_TICK_BASE_SIZE;
  const slot = PROGRESS_RAIL_WIDTH / (cardCount - 1);
  return Math.round(Math.max(4, Math.min(PROGRESS_TICK_BASE_SIZE, slot * 0.55)));
}

/** 카드 스택과 그 위의 카드 한 장 */
export const card = {
  stackHeight: Math.min(isTablet ? 560 : 400, SCREEN_HEIGHT * 0.4),
  stackMinHeight: Math.min(isTablet ? 560 : 400, SCREEN_HEIGHT * 0.4),
  stackMarginTop: CARD_STACK_MARGIN_TOP,
  /** 카드 양쪽 여백. left/right 각 10% → 카드 폭은 화면의 80%다 */
  widthInsetPercent: '10%' as const,
  borderRadius: Math.min(isTablet ? 32 : 24, Math.round(SCREEN_WIDTH * 0.04)),
  /** 카드(절대배치)를 스택 안에서 더 내리는 양. 위 `CARD_TOP_TOTAL` 주석 참고 */
  topCardMarginTop: TOP_CARD_MARGIN_TOP,
  backgroundBorderRadius: 25,
} as const;

/** 카드 안(WordFlashcard). 값의 근거는 위 `CARD_*` 주석 — 411×868에서는 전부 종전값이다 */
export const cardInner = {
  containerPaddingV: scaleInCardH(20, 10, 24),
  containerPaddingH: CONTAINER_PADDING_H,
  minWidth: WORD_CARD_WIDTH,
  padding: WORD_CARD_PADDING,
  borderRadius: 15,
  textFontSize: scaleInCardH(32, 22, isTablet ? 40 : 32),
  textMarginBottom: scaleInCardH(15, 8, 18),
  /** 단어 카드 안 스피커 아이콘. 글자와 같이 줄어야 카드가 넘치지 않는다 */
  playIconSize: scaleInCardH(40, 28, isTablet ? 48 : 40),
  playButtonPadding: scaleInCardH(10, 4, 12),
  rowMarginBottom: scaleInCardH(10, 6, 14),
  columnGap: scaleInCardH(10, 6, 12),
  vsPaddingH: VS_PADDING_H,
  vsPaddingV: scaleInCardH(8, 5, 10),
  vsBorderRadius: 24,
  /** 파형 폭은 화면이 아니라 **카드 안쪽 폭**을 넘지 않아야 한다 (320dp에서 12px 삐져나왔다) */
  waveformWidth: Math.min(isTablet ? 400 : 280, Math.floor(CARD_INNER_WIDTH)),
  /**
   * 파형의 세로. **담는 상자(`waveformContainer`)의 높이이자 Canvas의 높이**다 — 하나로 둔다.
   * 전에는 상자가 `scaleInCardH(39…)`, Canvas가 `scaleInCardH(60…)`이라 기준이 갈려
   * Canvas가 담는 상자보다 21px 커졌고 `paddingVertical`은 뜻을 잃었다.
   * 값은 **자리를 차지하던 쪽(39)**을 남겨 레이아웃이 종전 그대로다.
   */
  waveformHeight: scaleInCardH(39, 26, 52),
} as const;

/** 카드 안 「전체 듣기」 */
export const playAll = {
  paddingH: scaleInCardH(24, 16, 28),
  paddingV: scaleInCardH(14, 10, 16),
  borderRadius: 28,
  elevation: 4,
  /**
   * 파형과의 **최소** 간격. 남는 공간은 단어 카드 쪽과 나눠 갖되
   * (`wordsBlock`이 가운데 정렬), 빠듯한 기기에서도 파형에 붙지 않게 이만큼은 띄운다.
   */
  marginTop: scaleInCardH(12, 8, 20),
  marginBottom: scaleInCardH(16, 6, 20),
  fontSize: scaleInCardH(16, 13, 18),
  /** 앞 스피커 아이콘. 글자(`fontSize`)보다 한 단계 크다 */
  iconSize: scaleInCardH(20, 16, 22),
  /** 아이콘과 글자 사이 */
  gap: 8,
} as const;

/** 하단 네비 (◀ 학습완료 ▶). 절대배치라 스크롤 내용 위에 뜬다 */
export const bottomNav = {
  /** **이 화면이 직접 그리는** 네비의 높이다 — 시스템 탭바가 아니다 */
  height: 64,
  /** 안드로이드 기준 미세 위치 보정값 (`bottom: insets.bottom − 이 값`) */
  bottomOffset: isTablet ? 26 : 40,
  paddingH: isTablet ? 24 : 20,
  gap: isTablet ? 48 : 40,
  arrowSize: isTablet ? 60 : 48,
  arrowBorderRadius: isTablet ? 30 : 24,
  arrowElevation: 3,
  arrowIconSize: isTablet ? 32 : 28,
  completeBorderRadius: 28,
  /** 버튼이 `flex: 1`이라 폭은 남는 자리가 정한다. 이 값은 **글자가 붙지 않을 최소 여백**이다 */
  completePaddingH: 20,
  completePaddingV: 14,
  completeElevation: 4,
  textFontSize: isTablet ? 18 : 16,
} as const;

/** 완료화면 — 남은 카드가 0일 때 카드 안에 들어간다 */
export const completion = {
  /**
   * 안쪽 여백. 완료화면은 화면이 아니라 **카드박스 안**이므로 카드 폭을 따라간다 —
   * `40` 고정이면 320dp에서 안쪽 폭 256 중 **80을 먹는다.**
   * 411dp(실기기)에서는 계산값이 그대로 40이라 종전과 같다.
   */
  containerPadding: scaleInCardW(40, 20, 48),
  /** 맨 위 트로피. 글자 위에 따로 서므로 제목보다 크다 */
  iconSize: isTablet ? 56 : 44,
  titleFontSize: isTablet ? 30 : 24,
  titleMarginBottom: 10,
  subTextFontSize: isTablet ? 20 : 16,
  restartButtonBorderRadius: 25,
  restartButtonMarginTop: 24,
  restartButtonMarginBottom: 36,
  restartButtonPaddingH: isTablet ? 32 : 28,
  /** 「처음부터」(완료화면)와 「전체 다시 하기」(익힘모달)가 함께 쓴다 */
  restartIconSize: isTablet ? 20 : 18,
} as const;

/** 익힘모달 — 아래서 올라오는 시트 */
export const modal = {
  /** 시트가 화면을 다 덮지 않는다. 안쪽 스크롤 상자가 `flexShrink: 1`이라 줄어든다 */
  sheetMaxHeightPercent: '80%' as const,
  sheetElevation: 10,
  contentBorderRadius: 24,
  /** 손잡이 — 바닥에서 올라온 판이라는 표시 */
  handleWidth: isTablet ? 56 : 44,
  handleHeight: 5,
  headerPaddingV: 16,
  headerPaddingH: isTablet ? 24 : 20,
  titleFontSize: isTablet ? 22 : 18,
  closeBtnSize: isTablet ? 40 : 36,
  closeIconSize: isTablet ? 24 : 22,
  bodyPaddingH: isTablet ? 20 : 16,
  bodyPaddingV: 16,
  bodyPaddingBottom: 24,
  /** 「전체 다시 하기」의 테두리 — 채운 초록과 무게를 나눈다 */
  resetButtonBorderWidth: 1.5,
} as const;

/** 익힘모달 안의 완료 항목 2열 */
export const completedItem = {
  /**
   * 폭을 고정한다. 전에는 `minWidth: '45%'`라 단어가 길면 항목이 늘어나
   * **줄마다 폭이 달랐다.** 폭을 고정하고 컨테이너의 space-between이 사이를 벌린다.
   * 48×2 = 96%라 남는 4%가 두 열 사이 간격이 된다 (411dp에서 15px).
   */
  widthPercent: '48%' as const,
  padding: 14,
  borderRadius: 16,
  elevation: 2,
  textFontSize: isTablet ? 22 : 18,
  /** 두 단어를 가르는 「/」 좌우 */
  separatorMarginH: 6,
  /** 「↺ 되돌리기」 */
  chipIconSize: isTablet ? 16 : 14,
  chipFontSize: isTablet ? 13 : 11,
} as const;

/** 카드가 움직이는 시간. 이 셋이 도는 동안 빗장 하나가 ◀▶·학습완료를 함께 막는다 */
export const motion = {
  /** ◀▶ 넘김 */
  swipeDurationMs: 300,
  /** 학습완료 — 카드가 익힘 배지로 날아간다 */
  completeDurationMs: 600,
  /** 날아온 카드를 받은 배지가 한 번 커진다 */
  badgePulseScale: 1.06,
} as const;
