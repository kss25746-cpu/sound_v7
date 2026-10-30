/**
 * 소리 순서 맞추기(orderGame) — 레이아웃 · 인터랙션 명세
 * 기준 화면: 세로 스마트폰 411 × 868 dp (확인 기기). 색·글자는 `orderGameTheme.ts`.
 *
 * 소리 여럿을 **순서대로** 들려준 뒤, 위 줄의 동물 카드를 아래 점선 상자 3개에
 * 들은 순서대로 끌어다 놓는 게임이다. 게임 셋 중 유일하게 **드래그**가 있고,
 * 그래서 이 파일에는 다른 화면에 없는 `zIndex` 절이 있다 (4절).
 *
 * ─────────────────────────────────────────────────────────────
 * 1. 구조 트리 — 무엇이 무엇을 감싸는가
 * ─────────────────────────────────────────────────────────────
 *
 * big_container                    flex: 1, 가운데 정렬, colors.screenBg
 * │
 * ├── container                    flex: 1, 가운데 정렬
 * │   │                            paddingTop 0, paddingBottom LAYOUT.spacingMD
 * │   │
 * │   ├── [재생 중] waveContainer   flex 1 가운데
 * │   │   ├── WaveRipple           size LAYOUT.waveAnimationSize (네 게임 공용)
 * │   │   │                        style waveAnimation = 같은 값의 정사각
 * │   │   └── Text                 marginTop LAYOUT.loadingTextMarginTop
 * │   │
 * │   ├── [시작 전] startButton     colors.startButtonBg
 * │   │   │                        paddingV LAYOUT.completeButtonPaddingV / H LAYOUT.spacingLG
 * │   │   │                        radius button.borderRadius, minWidth button.minWidth
 * │   │   │                        elevation button.elevation
 * │   │   │                        activeOpacity opacity.pressed
 * │   │   └── row: Ionicons game-controller-outline(button.iconSize) + gap button.iconGap
 * │   │       + Text 「게임시작」 LAYOUT.buttonTextFontSize
 * │   │
 * │   └── [게임 중] ScrollView      flexGrow 1, 내용 가운데
 * │       │                        paddingTop play.paddingTop — 물음표 원 아래로 판을 내린다
 * │       │                        onScrollEndDrag/onMomentumScrollEnd → 드롭존 재측정 (2절)
 * │       │
 * │       ├── [DEBUG_DROP] debugText   fontSize.debugText, marginBottom debug.textMarginBottom
 * │       │
 * │       ├── imagesContainer      row + wrap, 가운데
 * │       │   │                    padding grid.padding, marginBottom grid.marginBottom
 * │       │   │                    끄는 중이면 zIndex/elevation zIndex.draggingLayer
 * │       │   └── DraggableImage × N   `SOUNDS_WITH_IMAGE` 전부
 * │       │       │                card.size 정사각 (Animated.View)
 * │       │       │                끄는 중이면 zIndex/elevation zIndex.draggedCard
 * │       │       └── Image        card.imageSize 정사각
 * │       │                        놓인 카드면 opacity.droppedCard
 * │       │
 * │       ├── dropZoneContainer    row 가운데, width 100%
 * │       │   │                    height dropZone.containerHeight (**고정**)
 * │       │   └── dropZone × 3     card.size 정사각, margin dropZone.margin
 * │       │       │                borderWidth dropZone.borderWidth, **dashed**
 * │       │       │                colors.dropZoneBg / dropZoneBorder
 * │       │       │                ref ← 페이지 좌표를 여기서 잰다 (2절)
 * │       │       │                collapsable={false} — 안 그러면 ref가 안 잡힌다
 * │       │       │                끄는 중이면 zIndex zIndex.draggingLayer (옆 칸 위로.
 * │       │       │                elevation은 배경에 그림자를 그려 안 준다)
 * │       │       └── dropZoneInner    100% × 100%, 가운데
 * │       │           │                끄는 중이면 zIndex/elevation zIndex.draggingLayer
 * │       │           ├── DraggableImage  놓인 카드가 있으면 (sourceZoneIndex = i)
 * │       │           └── Text 「놓는곳」  비어 있으면. colors.dropZonePlaceholder
 * │       │
 * │       └── submitButton         colors.submitButtonBg
 * │                                marginTop button.submitMarginTop, 나머지는 시작 버튼과 같다
 * │                                아이콘 checkmark-circle-outline 「정답 제출」
 * │
 * └── MissionProgressIcon          gameId "orderGame"
 *
 * ─────────────────────────────────────────────────────────────
 * 2. 계산해서 쓰는 값 — 토큰만으로는 안 보이는 것
 * ─────────────────────────────────────────────────────────────
 *
 * card.size      = min(태블릿 120 / 폰 100, round(screenWidth × 0.22))
 *                  기기별: 320 → 70 · 360 → 79 · 390 → 86 · 411 → 90 · 600 이상 → 120
 * card.imageSize = round(card.size × 0.8) — 카드 안의 여백을 남기는 비율
 *
 * **드롭 판정은 스타일이 아니라 실측 좌표로 한다.** 점선 상자 3개의 페이지 좌표를
 * `measure`로 재어 두고(`dropZonesLayout`), 손을 뗀 지점(`pageX`/`pageY`)이
 * 어느 상자 안인지 본다. 그래서 재측정 시점이 중요하다 —
 * 게임이 시작될 때(`motion.measureOnStartMs`), 상자가 배치될 때
 * (`motion.measureOnLayoutMs`), 스크롤이 멎을 때 세 번이다.
 * 스크롤하면 좌표가 통째로 밀리므로 스크롤 끝에서 다시 재지 않으면 **전부 빗나간다.**
 *
 * ─────────────────────────────────────────────────────────────
 * 3. 상태 — 무엇이 언제 보이는가
 * ─────────────────────────────────────────────────────────────
 *
 * | 상태            | 물결 | 시작 버튼 | 카드 줄 | 놓는 곳 | 제출 버튼 |
 * |-----------------|------|-----------|---------|---------|-----------|
 * | 시작 전         | 없음 | 보임      | 없음    | 없음    | 없음      |
 * | 문제음 재생     | 보임 | 숨김      | 없음    | 없음    | 없음      |
 * | 게임 중         | 없음 | 숨김      | 보임    | 보임    | 보임      |
 *
 * 카드 한 장의 상태:
 *
 * | 자리          | 위 줄            | 놓는 곳        |
 * |---------------|------------------|----------------|
 * | 안 놓임       | 또렷함, 끌 수 있음 | —              |
 * | 놓임          | opacity.droppedCard, **끌 수 없음** | 또렷함, 끌 수 있음 |
 *
 * 놓는 곳끼리 끌면 **자리가 맞바뀐다**(덮어쓰지 않는다). 위 줄에서 끌어다
 * 이미 찬 곳에 놓으면 원래 있던 카드가 위 줄로 돌아간다.
 *
 * ─────────────────────────────────────────────────────────────
 * 4. 제약 조건 — 지켜야 하는 규칙
 * ─────────────────────────────────────────────────────────────
 *
 * **`zIndex` 두 값은 짝이다.** 끌고 있는 카드가 다른 카드·상자 위로 지나가려면
 * 카드 자신(`zIndex.draggedCard` 999)뿐 아니라 그 카드를 담은 상자
 * (`zIndex.draggingLayer` 1000)도 함께 올라가야 한다. 안드로이드는 형제 사이
 * 순서를 `elevation`으로도 보므로 **둘을 같은 값으로 함께** 건다.
 * 담은 상자 쪽이 한 단 높다(1000 > 999).
 *
 * `dropZone`에 `collapsable={false}`가 필요하다. 안드로이드는 그리기만 하는 View를
 * 접어 버려서, 접히면 `ref`가 null이 되고 2절의 실측이 통째로 실패한다.
 *
 * `dropZoneContainer`의 높이를 고정하는 이유는 **카드가 들고 날 때 줄이 안 흔들리게**
 * 하기 위해서다. 상자 안이 비었다 찼다 하면 내용에 맡긴 높이가 매번 바뀐다.
 *
 * `motion.questionGapMs`(1300)는 게임 셋 중 가장 길다. 이 게임은 **순서**를 묻기
 * 때문에 소리가 서로 겹치면 문제가 성립하지 않는다 (matchGame은 반대로 200ms로
 * 일부러 겹친다 — `matchGameLayout.ts` 참조).
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** 세로 전용 앱 기준, 600px 이상을 태블릿으로 구분 */
const isTablet = SCREEN_WIDTH >= 600;

const CARD_SIZE = Math.min(isTablet ? 120 : 100, Math.round(SCREEN_WIDTH * 0.22));

/** 끌어 옮기는 동물 카드 (`DraggableImage`). 위 줄과 놓는 곳이 같은 크기를 쓴다 */
export const card = {
  size: CARD_SIZE,
  /** 카드 안에 여백을 남기는 비율 */
  imageSize: Math.round(CARD_SIZE * 0.8),
} as const;

/**
 * 게임 중 스크롤의 위 여백.
 * 물음표는 top 50 + 패딩 8 + 아이콘 32 + 패딩 8이라 아래가 약 98이다.
 * 100에 카드 줄 패딩 10이 더해져 카드 위는 약 110이다.
 */
export const play = {
  paddingTop: 100,
} as const;

/** 카드가 깔리는 위 줄 */
export const grid = {
  padding: 10,
  marginBottom: 20,
} as const;

/** 아래 점선 상자 3개 */
export const dropZone = {
  /** 줄 높이는 **고정**이다 — 카드가 들고 나도 안 흔들리게 (4절) */
  containerHeight: 120,
  margin: isTablet ? 12 : 10,
  borderWidth: 1,
} as const;

/** 시작 · 제출 버튼. 둘이 같은 꼴이고 색과 `marginTop`만 다르다 */
export const button = {
  borderRadius: 15,
  minWidth: 200,
  elevation: 3,
  /** 제출 버튼만. 놓는 곳에서 띄운다 */
  submitMarginTop: 20,
  /** 버튼 글자 앞 Ionicons. 글자(`LAYOUT.buttonTextFontSize` 18/16)보다 2 크게 */
  iconSize: isTablet ? 20 : 18,
  iconGap: 8,
} as const;

/**
 * 끄는 동안의 쌓임 순서. **둘을 함께 걸어야 한다** (4절).
 * `elevation`에도 같은 값을 준다 — 안드로이드는 형제 순서를 그것으로도 본다.
 */
export const zIndex = {
  /** 끌고 있는 카드를 담은 상자 (위 줄 또는 그 놓는 곳) */
  draggingLayer: 1000,
  /** 끌고 있는 카드 자신 */
  draggedCard: 999,
} as const;

/** `DEBUG_DROP`이 true일 때만 보이는 좌표 줄 */
export const debug = {
  textMarginBottom: 4,
} as const;

/**
 * 연출 시간.
 *
 * 앞의 둘은 **드롭존 좌표를 다시 재는 시점**이라 연출이 아니라 정확도 문제다 (2절).
 * 레이아웃이 자리를 잡기 전에 재면 좌표가 어긋나고, 그러면 드롭이 전부 빗나간다.
 */
export const motion = {
  /** 게임이 시작되고 판이 자리를 잡을 때까지 기다린다 */
  measureOnStartMs: 200,
  /** 상자 하나가 배치된 뒤 */
  measureOnLayoutMs: 100,

  /** 문제음 사이 간격. **순서를 묻는 게임이라 겹치면 안 된다** (4절) */
  questionGapMs: 1300,
  /** 마지막 소리가 끝나고 판을 열기까지 */
  afterQuestionsDelayMs: 500,

  // ── 오디오 로드·재생 실패 시에만 (maxRetries 2회)
  loadRetryDelayMs: 300,
  playRetryDelayMs: 500,
} as const;
