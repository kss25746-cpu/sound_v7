/**
 * 드럼(drum 탭) — 레이아웃 · 인터랙션 명세
 * 기준 화면: 세로 스마트폰 411 × 868 dp (확인 기기). 색·글자는 `drumTheme.ts`.
 * ⚠ `drumSetLayouts.ts`는 **다른 파일이다** — 드럼 세트 그림의 악기 좌표 데이터다.
 *
 * 한 화면에 **두 모드**가 들어 있다. 연주모드(자유롭게 두드리기)와
 * 퀴즈모드(=「듣기연습」, 들린 악기를 맞히기). 화면 구조는 같고
 * 헤더 제목·버튼과 하단 버튼의 뜻만 바뀐다 (3절).
 *
 * 세로 스택이 아니라 **겹친 판**이다. 배경 그림 위에 `contentWrapper`가 있고,
 * 그 안의 헤더·스크롤·오버레이가 모두 `zIndex`로 순서를 다툰다. 그래서 이 파일에는
 * `zIndex` 절이 따로 있다 (아래 `zIndex`, 4절).
 *
 * ─────────────────────────────────────────────────────────────
 * 1. 구조 트리 — 무엇이 무엇을 감싸는가
 * ─────────────────────────────────────────────────────────────
 *
 * GestureHandlerRootView
 * └── container                     flex: 1, zIndex zIndex.container
 *     ├── backgroundImageWrapper    zIndex zIndex.background, 가운데 정렬
 *     │   └── Image drum_m.webp     비율 고정(원본 aspect ratio)
 *     │
 *     └── contentWrapper            flex: 1, zIndex zIndex.content
 *         │
 *         ├── RNAnimated.View 헤더   zIndex zIndex.header, elevation header.elevation
 *         │   │                     row, 세로 가운데, paddingH header.paddingH
 *         │   │                     paddingTop insets.top + header.paddingTopOffset
 *         │   │                     paddingBottom header.paddingBottom
 *         │   │                     backgroundColor ← headerFlashAnim이 colors.headerFlash를 보간
 *         │   │                     안드로이드 상단바 구조: ← 제목 ······ 버튼들
 *         │   │
 *         │   ├── headerBackButton           header.backButtonSize 정사각, 테두리 없음
 *         │   │                              hitSlop header.backHitSlop → 터치 48dp
 *         │   │                              Ionicons arrow-back, header.backIconSize
 *         │   ├── headerTitle                flex 1 + numberOfLines 1 ← **남는 폭만 쓴다**
 *         │   │                              marginLeft header.titleMarginLeft, header.titleFontSize
 *         │   │                              「연주모드」(colors.headerTitlePlay) /
 *         │   │                              「퀴즈모드」(colors.headerTitleQuiz) + 「 · N/M 회」
 *         │   │
 *         │   ├── [연주모드] headerButton 보조  「⚙ N문제」 Ionicons settings-outline
 *         │   ├── [연주모드] headerButton 주    「듣기연습」 Ionicons ear-outline, colors.headerPrimaryBg
 *         │   └── [퀴즈모드] headerButton 보조  「그만하기」 Ionicons close
 *         │                                  알약 버튼 셋 다 height header.buttonHeight,
 *         │                                  paddingH header.buttonPaddingH, marginLeft header.buttonGap
 *         │                                  아이콘 header.buttonIconSize + 간격 header.buttonIconGap
 *         │                                  글자 header.buttonFontSize, radius header.pillRadius
 *         │                                  보조 = 흰 바탕 + 회색 테두리(header.buttonBorderWidth)
 *         │
 *         ├── [연주모드 · 설정 열림] settingsDropdownPanel
 *         │   │                      absolute, top = 헤더 실측 높이
 *         │   │                      height segmented.panelHeight
 *         │   │                      paddingV/H segmented.panelPadding*
 *         │   │                      zIndex zIndex.settingsPanel
 *         │   │                      borderBottomWidth segmented.panelBorderBottomWidth
 *         │   │                      elevation segmented.panelElevation
 *         │   └── QuestionCountSelector → segmentedTrack
 *         │       │                      width segmented.trackWidth, height segmented.trackHeight
 *         │       │                      padding segmented.trackPadding, radius segmented.pillRadius
 *         │       ├── segmentedIndicator  absolute, top/bottom/left segmented.trackPadding
 *         │       │                       width = 실측에서 계산 (2절)
 *         │       └── segmentedItem × 4   [5·10·15·20], 글자 segmented.fontSize
 *         │
 *         ├── [연주모드 · 설정 열림] settingsDropdownBackdrop
 *         │                          absolute, top = 헤더 + segmented.panelHeight
 *         │                          zIndex zIndex.settingsBackdrop, 투명
 *         │
 *         ├── ScrollView             flex 1, paddingTop scroll.paddingTop / Bottom scroll.paddingBottom
 *         │   └── section + sectionDrum   marginH section.marginH / V section.marginV
 *         │       │                       marginTop section.drumMarginTop
 *         │       └── HorizontalDrumScroller
 *         │
 *         ├── [퀴즈 1회째] quizHintFixed   absolute, top = 헤더 + 칩 높이
 *         │   │                            zIndex zIndex.instrumentLabel, 터치 통과
 *         │   └── Text                     quizHint.fontSize, radius quizHint.borderRadius
 *         │                                elevation/borderWidth quizHint.*
 *         │
 *         ├── [연주모드] instrumentLabelFixed   absolute, zIndex zIndex.instrumentLabel
 *         │   └── currentInstrumentDisplay     minWidth/minHeight instrumentLabel.*
 *         │                                    radius/elevation/borderWidth instrumentLabel.*
 *         │                                    글자 fontSize.instrumentLabel
 *         │
 *         ├── drumOverlayFixed       absolute 바닥, height overlay.height
 *         │   │                      paddingH overlay.paddingH
 *         │   │                      zIndex/elevation zIndex.drumOverlay ← **탭바 위에 그린다**
 *         │   └── drumOverlayClip → fixedDrumOverlayInner → drumOverlayPageCell × 4
 *         │       ├── fixedReplayButton   absolute bottom 0, left 50%
 *         │       │                       marginLeft fixedButton.replayMarginLeft (**음수**)
 *         │       │                       fixedButton.width × height, radius fixedButton.radius
 *         │       │                       잠기면 colors.fixedButtonDisabledBg + opacity.replayDisabled
 *         │       ├── pageIndicator       두 버튼 사이. height fixedButton.height, 터치 통과
 *         │       │                       글자 fixedButton.pageIndicatorFontSize
 *         │       └── fixedCycleButton    marginLeft fixedButton.cycleMarginLeft
 *         │                               나머지는 왼쪽 버튼과 같다
 *         │
 *         ├── [카운트다운·피드백] quizOverlayCenter   absoluteFill, zIndex zIndex.quizOverlay
 *         │                          paddingBottom quizOverlay.countdownPaddingBottom
 *         │                          글자 fontSize.countdown + 그림자 quizOverlay.shadow*
 *         │
 *         └── Modal (퀴즈 종료)       transparent, fade, statusBarTranslucent
 *             └── gameOverOverlay    flex 1 가운데, colors.gameOverScrim
 *                 └── DrumGameOverScreen
 *
 * ─────────────────────────────────────────────────────────────
 * 2. 계산해서 쓰는 값 — 토큰만으로는 안 보이는 것
 * ─────────────────────────────────────────────────────────────
 *
 * **하단 버튼은 화면 폭으로 배율을 잡는다.** 기준 폭 390dp에서 1배다:
 *
 *   scale = screenWidth / fixedButton.referenceWidth
 *   width = round(88 × scale) · height = round(56 × scale)
 *   gap   = round(150 × scale) · radius = round(12 × scale)
 *   iconFontSize        = max(22, min(34, round(26 × scale)))   ← 상하한이 걸려 있다
 *   pageIndicatorFontSize = max(16, min(22, round(18 × scale)))
 *   replayMarginLeft = −(width + gap / 2)   ← left 50%에서 왼쪽으로
 *   cycleMarginLeft  = gap / 2              ← left 50%에서 오른쪽으로
 *
 * 즉 두 버튼은 **화면 한가운데를 기준으로 좌우 대칭**이다. 사이 간격이 `gap`이고
 * 그 한가운데에 페이지 표시가 놓인다. `left: '50%'` + 음수 마진 조합이라
 * 부모 폭이 바뀌어도 가운데를 잃지 않는다.
 *
 * **헤더는 폭이 좁으면 문제 수 버튼을 줄인다:**
 *
 *   창 폭 < header.narrowWidth(360)  →  「⚙ N문제」 대신 「⚙ N」
 *   창 폭은 `useWindowDimensions`로 렌더마다 읽는다 (모듈 로드 때 한 번이 아니다).
 *   제목은 flex 1이라 버튼이 먼저 자리를 잡고, 모자라면 제목이 말줄임(…)된다.
 *
 * **세그먼티드 컨트롤 칸 폭은 실측에서 나온다:**
 *
 *   trackHeight  = segmented.itemHeight + trackPadding × 2
 *   panelHeight  = trackHeight + segmented.panelExtraHeight
 *   segmentWidth = (실측 트랙 폭 − trackPadding × 2) / 4
 *
 * 매직넘버 없이 항상 정렬된다 — pill이 그려지는 자리와 터치 영역이 같은 좌표계를 쓴다.
 * `panelHeight`는 바깥 터치를 받는 백드롭의 시작점(top)에도 쓰인다.
 *
 * `drumStick.iconSize = round(fixedButton.iconFontSize × 1.5)` —
 * 삼각형(◀▶) 글리프보다 가로로 길어 보여 글자 크기보다 키운 값이다.
 *
 * ─────────────────────────────────────────────────────────────
 * 3. 상태 — 무엇이 언제 보이는가
 * ─────────────────────────────────────────────────────────────
 *
 * | 요소              | 연주모드            | 퀴즈모드(듣기연습)        |
 * |-------------------|---------------------|---------------------------|
 * | 헤더 제목          | 「연주모드」(파랑)   | 「퀴즈모드 · N/M 회」(주황) |
 * | 헤더 오른쪽        | ⚙ N문제 · 듣기연습  | 그만하기                   |
 * | 설정 드롭다운      | ⚙️로 열림           | **열 수 없다**             |
 * | 악기 이름 칩       | 보임                | **숨김** (정답 노출이라서) |
 * | 첫 문제 안내       | 없음                | 1회째에만                  |
 * | 왼쪽 하단 버튼     | ◀ (이동)            | ↻ (다시 듣기)              |
 * | 오른쪽 하단 버튼   | 순환                | 순환                       |
 *
 * 퀴즈 한 라운드:
 *
 * | 단계        | 화면                                   |
 * |-------------|----------------------------------------|
 * | 시작        | 헤더 플래시(주황) + 카운트다운 2 → 1    |
 * | 출제        | 소리 재생. ↻ 켜짐                       |
 * | 답 고름     | 캐릭터를 악기로. ↻ 꺼짐                 |
 * | 채점        | ⭕ 또는 ❌ (fontSize.countdown 크기)    |
 * | 다음        | 캐릭터가 중립 위치로                    |
 * | 종료        | Modal + `DrumGameOverScreen`            |
 *
 * 「그만하기」를 누르면 헤더가 **회색**으로 한 번 번쩍인다
 * (`colors.headerFlash`의 3번째 값).
 *
 * ─────────────────────────────────────────────────────────────
 * 4. 제약 조건 — 지켜야 하는 규칙
 * ─────────────────────────────────────────────────────────────
 *
 * **헤더 버튼은 세 등급뿐이다.** 주(코랄로 채움 — 듣기연습) · 보조(흰 바탕 + 회색
 * 테두리 — 문제 수 · 그만하기) · 아이콘(테두리 없음 — 뒤로가기). 알약 버튼은
 * 높이·글자·아이콘·패딩을 `header.button*` 하나로 같이 쓴다. 아이콘은 **Ionicons만** 쓴다 —
 * 이모지는 제조사마다 모양이 다르고 색을 못 바꾸며, 안드로이드에서 하단이 잘려
 * `lineHeight`를 따로 줘야 했다. 모드 이름은 **버튼처럼 보이지 않게** 판·테두리 없이
 * 글자색으로만 구분한다. 예전에는 가운데 절대배치 배지였는데 좌우 버튼을 피하지 않아
 * 좁은 폰에서 겹쳤다.
 *
 * **악기 이름 칩은 `ScrollView` 밖에 둔다.** 안에 두면 드럼 세트 위로 올릴 때
 * `FlatList` 셀에 잘려 뒤 배경이 드러난다. 그래서 절대배치이고, 세로 기준을
 * **헤더 실측 높이**(상단 인셋 포함)로 잡은 뒤 칩 높이를 한 번 더 더해 내린다.
 * 그 「칩 높이」가 `instrumentLabel.minHeight`이고, 스타일의 `minHeight`와
 * **같은 상수를 양쪽에서 봐야** 실측(onLayout)이 오기 전 첫 프레임에도 안 튄다.
 *
 * `zIndex`는 두 무리다. 하나는 판을 쌓는 순서(`background` 0 · `container`/`content` 1),
 * 다른 하나는 그 위에 얹히는 것들(`header` 100 · `quizOverlay` 100 ·
 * `instrumentLabel` 300 · `settingsBackdrop` 500 · `settingsPanel` 501 ·
 * `drumOverlay` 9999)이다. **악기 이름 칩(300)이 설정 드롭다운(500·501)보다 낮다** —
 * 드롭다운이 열리면 그쪽이 위여야 한다. 하단 드럼 오버레이만 9999인 것은
 * **탭바 위에** 그려야 하기 때문이다(`elevation`도 같은 값을 함께 건다).
 *
 * `header.pillRadius`(999)는 알약 모양을 만드는 관용값이다. 높이가 바뀌어도
 * 늘 반원 끝이 된다 — 헤더 알약 버튼 · 세그먼티드가 함께 쓴다.
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** 세로 전용 앱 기준, 600px 이상을 태블릿으로 구분 */
const isTablet = SCREEN_WIDTH >= 600;

/** 알약 모양을 만드는 관용값. 높이가 바뀌어도 늘 반원 끝이 된다 (4절) */
const PILL_RADIUS = 999;

const HEADER_BACK_BUTTON_SIZE = 40;
/** 뒤로가기 터치 영역 = 버튼 + 사방 이만큼 = 48dp (안드로이드 권장 최소) */
const HEADER_BACK_HIT_SLOP = 4;

/**
 * 고정 헤더 — 안드로이드 상단바 구조 `← 제목 ······ 버튼들` (1절).
 * 알약 버튼(주·보조)은 **높이·글자·아이콘·패딩을 전부 같이 쓴다** (4절).
 */
export const header = {
  /** 「연주모드」/「퀴즈모드 · N/M 회」 */
  titleFontSize: isTablet ? 20 : 18,
  titleMarginLeft: 4,

  elevation: 3,
  paddingH: 12,
  /** `insets.top`에 더한다 */
  paddingTopOffset: 12,
  paddingBottom: 12,

  // ── 뒤로가기 (테두리 없는 아이콘 버튼)
  backButtonSize: HEADER_BACK_BUTTON_SIZE,
  backHitSlop: HEADER_BACK_HIT_SLOP,
  backIconSize: 22,

  // ── 알약 버튼 공통 (듣기연습 · 문제 수 · 그만하기)
  buttonHeight: isTablet ? 40 : 36,
  buttonPaddingH: isTablet ? 14 : 12,
  buttonFontSize: isTablet ? 16 : 14,
  buttonIconSize: isTablet ? 18 : 16,
  /** 아이콘과 글자 사이 */
  buttonIconGap: 4,
  /** 제목과 첫 버튼, 버튼과 버튼 사이 */
  buttonGap: 8,
  /** 보조 버튼 테두리 */
  buttonBorderWidth: 1.5,
  primaryElevation: 2,
  secondaryElevation: 1,

  /** 화면 폭이 이보다 좁으면 「⚙ N문제」를 「⚙ N」으로 줄인다 (2절) */
  narrowWidth: 360,

  /** 알약 버튼 · 세그먼티드가 함께 쓴다 */
  pillRadius: PILL_RADIUS,
} as const;

export const scroll = {
  /** 고정 헤더와의 간격 */
  paddingTop: 20,
  paddingBottom: 30,
} as const;

export const section = {
  marginH: 15,
  marginV: 10,
  /** 드럼 세트를 화면 아래쪽으로 내리는 값 */
  drumMarginTop: 150,
} as const;

/** 현재 악기 이름 칩 (연주모드에만) */
export const instrumentLabel = {
  /**
   * 칩의 최소 높이. **레이블을 제 높이만큼 아래로 내리는 데에도 쓴다** —
   * 스타일과 위치 계산이 같은 값을 봐야 첫 프레임에 안 튄다 (4절).
   */
  minHeight: 50,
  minWidth: 140,
  paddingH: 16,
  paddingV: 8,
  borderRadius: 10,
  elevation: 5,
  borderWidth: 2,
  lineHeight: 22,
  letterSpacing: 0,
} as const;

/** 듣기연습 1회째 안내 문구 */
export const quizHint = {
  fontSize: isTablet ? 18 : 15,
  borderRadius: 10,
  elevation: 3,
  borderWidth: 1,
} as const;

/** 하단 고정 오버레이 (캐릭터 + 버튼 둘). **탭바 위에 그린다** (4절) */
export const overlay = {
  height: 160,
  paddingH: 27,
} as const;

const REFERENCE_WIDTH = 390;
const FIXED_BTN_SCALE = SCREEN_WIDTH / REFERENCE_WIDTH;
const FIXED_BUTTON_WIDTH = Math.round(88 * FIXED_BTN_SCALE);
const FIXED_BUTTON_GAP = Math.round(150 * FIXED_BTN_SCALE);
const FIXED_ICON_FONT_SIZE = Math.max(22, Math.min(34, Math.round(26 * FIXED_BTN_SCALE)));

/**
 * 하단 버튼 둘 (다시 듣기/이동 · 순환).
 * 화면 폭으로 배율을 잡고, 화면 한가운데를 기준으로 좌우 대칭이다 (2절).
 */
export const fixedButton = {
  /** 이 폭에서 1배다 */
  referenceWidth: REFERENCE_WIDTH,
  scale: FIXED_BTN_SCALE,
  width: FIXED_BUTTON_WIDTH,
  height: Math.round(56 * FIXED_BTN_SCALE),
  /** 두 버튼 사이. 그 한가운데에 페이지 표시가 놓인다 */
  gap: FIXED_BUTTON_GAP,
  radius: Math.round(12 * FIXED_BTN_SCALE),
  /** 배율에 상하한이 걸려 있다 — 아주 작거나 큰 기기에서도 읽히게 */
  iconFontSize: FIXED_ICON_FONT_SIZE,
  pageIndicatorFontSize: Math.max(16, Math.min(22, Math.round(18 * FIXED_BTN_SCALE))),
  /** `left: '50%'`에서 왼쪽으로 (**음수**) */
  replayMarginLeft: -(FIXED_BUTTON_WIDTH + FIXED_BUTTON_GAP / 2),
  /** `left: '50%'`에서 오른쪽으로 */
  cycleMarginLeft: FIXED_BUTTON_GAP / 2,
  elevation: 3,
  replayPaddingH: 6,
} as const;

/** 하단 버튼 안의 드럼 스틱 SVG */
export const drumStick = {
  /** 삼각형(◀▶) 글리프보다 가로로 길어 보여 글자 크기보다 키운다 */
  iconSize: Math.round(FIXED_ICON_FONT_SIZE * 1.5),
} as const;

const SEGMENTED_ITEM_HEIGHT = isTablet ? 44 : 36;
const SEGMENTED_TRACK_PADDING = 4;
const SEGMENTED_TRACK_HEIGHT = SEGMENTED_ITEM_HEIGHT + SEGMENTED_TRACK_PADDING * 2;
const SEGMENTED_PANEL_EXTRA_HEIGHT = 20;

/**
 * 문제 수 세그먼티드 컨트롤과 그것을 담은 드롭다운 패널.
 * 칸 폭은 **실측 트랙 폭에서 계산**하므로 매직넘버 없이 항상 정렬된다 (2절).
 */
export const segmented = {
  /** 비율 90%, 폰 최대 420 / 태블릿 최대 520 */
  trackWidth: Math.min(Math.round(SCREEN_WIDTH * 0.9), isTablet ? 520 : 420),
  /** 한 칸 높이. 트랙 높이는 여기에 상하 패딩이 더해진 값이다 */
  itemHeight: SEGMENTED_ITEM_HEIGHT,
  fontSize: isTablet ? 16 : 14,
  /** 인디케이터 pill이 트랙 테두리에서 이만큼 떠 있다 */
  trackPadding: SEGMENTED_TRACK_PADDING,
  trackHeight: SEGMENTED_TRACK_HEIGHT,
  pillRadius: PILL_RADIUS,

  /** 패널 높이 = 트랙 + 이 값. 바깥 터치 백드롭의 시작점 계산에도 쓴다 */
  panelExtraHeight: SEGMENTED_PANEL_EXTRA_HEIGHT,
  panelHeight: SEGMENTED_TRACK_HEIGHT + SEGMENTED_PANEL_EXTRA_HEIGHT,
  panelPaddingV: 10,
  panelPaddingH: 15,
  panelBorderBottomWidth: 1,
  panelElevation: 4,
} as const;

/** 카운트다운 · 정답/오답 글리프가 뜨는 판 */
export const quizOverlay = {
  /** 드럼 세트를 가리지 않도록 위로 올린다 */
  countdownPaddingBottom: 300,
  shadowOffset: { width: 2, height: 2 },
  shadowRadius: 5,
} as const;

/**
 * 쌓임 순서. 두 무리다 — 판을 쌓는 순서(0·1)와 그 위에 얹히는 것들(100~9999).
 * **악기 이름 칩(300)이 설정 드롭다운(500·501)보다 낮다** (4절).
 */
export const zIndex = {
  background: 0,
  container: 1,
  content: 1,
  header: 100,
  quizOverlay: 100,
  /** 악기 이름 칩과 퀴즈 안내 문구가 같은 자리를 나눠 쓴다 */
  instrumentLabel: 300,
  settingsBackdrop: 500,
  settingsPanel: 501,
  /** **탭바 위에** 그려야 한다. `elevation`에도 같은 값을 건다 */
  drumOverlay: 9999,
} as const;

/** 연출 시간과 배율 */
export const motion = {
  /** 헤더 배경이 한 번 번쩍이는 시간 (올라갈 때·내려올 때 각각) */
  headerFlashDurationMs: 150,

  /**
   * ↻(다시 듣기)를 눌렀을 때의 스케일 펄스.
   * **버튼 자체만 반응한다** — 정답 악기를 하이라이트하면 답이 노출된다.
   */
  replayPulseScale: 1.15,
  replayPulseUpMs: 90,
  replayPulseDownMs: 140,

  // ── 퀴즈 시작 (카운트다운 2 → 1 → 출제)
  /** 이 뒤에 스크롤 잠금이 풀린다 */
  quizScrollUnlockMs: 800,
  /** 숫자 한 칸 */
  countdownStepMs: 1000,
  /** 0이 된 뒤 첫 문제가 나가기까지 */
  countdownEndMs: 500,

  // ── 세그먼티드 pill이 칸을 따라 미끄러지는 스프링
  //    첫 실측 때는 애니메이션 없이 즉시 배치한다 (안 그러면 패널을 열 때마다 왼쪽에서 날아온다)
  segmentedSpringSpeed: 16,
  segmentedSpringBounciness: 6,
} as const;
