/**
 * 피아노 훈련 화면 — 레이아웃 · 인터랙션 명세
 * 기준 화면: **가로모드** 스마트폰 868 × 411 dp (확인 기기). 색은 `musicTrainingTheme.ts`.
 *
 * 앱에서 유일하게 **가로로 눕는** 화면이고, 한 파일 안에 모드가 셋 들어 있다.
 *   ① 자유 모드 — 건반 + `FreeModePanel` 제어반
 *   ② 훈련 모드(random) — 건반 + `TrainingModePanel` 제어반. 문제음을 듣고 누른다
 *   ③ 낙하 모드(falling) — **제어반을 걷고** 트랙 + 건반. 내려오는 노트를 친다
 *
 * ⚠ 이 파일에는 **제어반 치수와 트랙 치수가 없다.** 저쪽은 기타와 함께 쓰는
 * `CONTROL_BAR`(`instrumentTheme.ts`)와 `FALLING_LAYOUT`(`fallingTheme.ts`)에 있다.
 * 여기 있는 것은 **이 화면 파일 안에만 있던 값**이다.
 *
 * ─────────────────────────────────────────────────────────────
 * 1. 구조 트리 — 무엇이 무엇을 감싸는가
 * ─────────────────────────────────────────────────────────────
 *
 * SafeAreaView (fullScreen)        flex 1, colors.screenBg, column
 * │
 * ├── midgroundLayer               절대배치 네 변 0, zIndex.midground
 * │                                배경 연출. 손가락은 통과한다
 * │
 * ├── [낙하] fallingModeLayout     flex 1, paddingTop falling.layoutPaddingTop
 * │   │                            **가로 여백 0** — 레인이 넓을수록 노트가 굵다 (4절)
 * │   │
 * │   ├── fallingTrackArea         flex 1, overflow hidden, minHeight 0
 * │   │   └── FallingNoteTrack     laneStartX 0
 * │   │                            introMinMs ← 카운트인과 물린다 (2절)
 * │   │
 * │   ├── fallingExitButton        절대배치 **좌상단** falling.exitTop/exitLeft
 * │   │   │                        알약(falling.pillBorderRadius 999)
 * │   │   │                        colors.hudBg + colors.exitBorder
 * │   │   │                        zIndex/elevation zIndex.fallingOverlay
 * │   │   │                        hitSlop falling.exitHitSlop
 * │   │   ├── Ionicons close       falling.exitIconSize
 * │   │   └── Text 「종료」        fontSize.fallingExit
 * │   │
 * │   ├── fallingHud               절대배치 **우상단** falling.hudTop/hudRight
 * │   │   │                        미션 아이콘 왼쪽에 붙는다 (4절)
 * │   │   ├── fallingHudValue      맞은 음. fontSize.fallingHudValue
 * │   │   └── fallingHudTotal      / 전체. fontSize.fallingHudTotal
 * │   │
 * │   └── fallingKeyboardArea      flexShrink 0, 높이 fallingWhiteKeyHeight
 * │                                자식 측정 전에 자리를 잡는다 (첫 실행 건반 밀림)
 * │                                zIndex/elevation zIndex.fallingKeyboard
 * │
 * ├── [자유·훈련] pianoArea        flex 1, 가운데, paddingTop scene.pianoAreaPaddingTop
 * │   │
 * │   ├── [고정 뷰포트 아님] octaveController
 * │   │   │                        row, space-between, width octave.width ('95%')
 * │   │   │                        CONSOLE.panel + CONSOLE.shadow 테두리
 * │   │   │                        radius octave.borderRadius, padding octave.padding
 * │   │   ├── octaveBtn 「옥타브 낮춤」   CONSOLE.selected
 * │   │   │                              아이콘 octave.btnIconSize + 글자 fontSize.octaveBtn
 * │   │   ├── MiniKeyboardMap             flex 1 가운데
 * │   │   └── octaveBtn 「옥타브 높임」
 * │   │
 * │   └── pianoContainer           flex 1, paddingHorizontal scene.pianoContainerPaddingHorizontal
 * │       └── pianoWrapper
 * │           └── rowContainer     row, marginVertical keyboard.rowMarginVertical
 * │               │                낙하 모드면 rowMarginVerticalCompact (0)
 * │               ├── whiteKey × N  colors → PIANO.keys.*
 * │               │   │             borderWidth keyboard.whiteBorderWidth
 * │               │   │             paddingBottom keyboard.whitePaddingBottom
 * │               │   │             elevation keyboard.whiteElevation
 * │               │   ├── keyAccent    FALLING_LAYOUT.keyAccentHeight (레인 색 띠)
 * │               │   └── keyTextLabel 음이름. **크기는 렌더에서** (4절)
 * │               └── blackKey × N  절대배치, zIndex.blackKey
 * │                                 elevation keyboard.blackElevation
 * │
 * ├── [미션] missionOverlay        절대배치. 네 변은 **렌더에서** (2절)
 * │   │                            colors.missionScrim, zIndex.missionOverlay
 * │   └── missionOverlayBox        CONSOLE.panel + PIANO.highlight 테두리
 * │       ├── missionOverlayText   fontSize.missionOverlay
 * │       └── missionOverlaySubText fontSize.missionOverlaySub
 * │
 * ├── [카운트인] previewOverlay    절대배치. 네 변은 렌더에서. zIndex.previewOverlay
 * │   └── previewText              fontSize.preview + PIANO.highlight 광채
 * │                                textShadowRadius preview.textShadowRadius
 * │
 * └── rippleContainer              절대배치 네 변 0, 손가락 통과
 *     │                            zIndex/elevation zIndex.ripple — **가장 위**
 *     └── ParticleVisualizer 또는 RippleLayer   particles.* (2절)
 *
 * ─────────────────────────────────────────────────────────────
 * 2. 계산해서 쓰는 값 — 토큰만으로는 안 보이는 것
 * ─────────────────────────────────────────────────────────────
 *
 * **오버레이 두 개의 네 변은 여기 없다.** `missionOverlay` · `previewOverlay`는
 *   위치를 렌더에서 `overlayFrameStyle`로 준다. 인셋은 기기마다 다르고 제어반 높이는
 *   모드마다 다르다(`CONTROL_BAR.standardHeight` 110 · `compactHeight` 76).
 *   고정값을 박으면 어긋난다.
 *
 * **건반 눌림 깊이는 흑·백이 다르다.**
 *   translateY = isBlack ? motion.blackKeyPressTranslateY(9) : motion.keyPressTranslateY(12)
 *   흑건이 얕은 것은 백건보다 짧고 위에 떠 있어서다. 같게 하면 흑건이 백건을 뚫는다.
 *   눌린 동안의 색도 함께 바뀐다 (`colors.*KeyPressed`).
 *
 * **파티클은 낙하 모드에서 줄인다.**
 *   size/speed scale = isFallingNoteActive ? particles.scaleWhileFalling(0.85) : particles.scale(1)
 *   maxParticles     = isFallingNoteActive ? particles.maxWhileFalling(80) : particles.max(120)
 *   노트가 내려오는 중에는 화면에 이미 움직이는 것이 많아, 파티클까지 원래 크기면
 *   판정선 근처가 안 보인다.
 *
 * **카운트인과 트랙은 겹친다** (치수가 아니라 시간이지만 여기 적어 둔다).
 *   트랙에 넘기는 `introMinMs` = `PREVIEW_REMAINING_AFTER_PLAY_MS` +
 *   `PREVIEW_APPROACH_MARGIN_MS`. 첫 노트가 이 시간 전에 판정선에 닿으면
 *   아직 `2`를 세는데 음이 떨어진다. 세 상수는 뜻이 촘촘해 **화면 파일에 남겨 두었다** —
 *   각각의 주석이 왜 그 값인지를 들고 있다.
 *
 * ─────────────────────────────────────────────────────────────
 * 3. 상태 — 무엇이 언제 보이는가
 * ─────────────────────────────────────────────────────────────
 *
 * | 요소              | 자유 | 훈련(random) | 낙하(falling) |
 * |-------------------|------|--------------|---------------|
 * | 제어반            | ✓ 자유 | ✓ 훈련     | **✗ 걷는다**   |
 * | 옥타브 줄         | ✓    | ✓ (고정 뷰포트면 ✗) | ✗      |
 * | 낙하 트랙         | ✗    | ✗            | ✓             |
 * | 종료 알약 · HUD   | ✗    | ✗            | ✓             |
 * | 건반 줄 여백      | 8    | 8            | **0** (compact) |
 *
 * | 건반 상태        | 바탕                    | 글자                  |
 * |------------------|-------------------------|-----------------------|
 * | 백건 평상시      | PIANO.keys.white        | PIANO.keys.label      |
 * | 백건 눌림        | colors.whiteKeyPressed  | 〃                    |
 * | 백건 범위 밖     | PIANO.keys.whiteDisabled + opacity.keyDisabled | labelDisabled |
 * | 흑건 평상시      | PIANO.keys.black        | labelOnBlack          |
 * | 흑건 눌림        | colors.blackKeyPressed  | 〃                    |
 * | 흑건 범위 밖     | 〃 + opacity.keyDisabled | 〃                   |
 *
 * ─────────────────────────────────────────────────────────────
 * 4. 제약 조건 — 어기면 무엇이 깨지는가
 * ─────────────────────────────────────────────────────────────
 *
 * ▸ **층 순서가 빽빽하다.** 낮은 것부터:
 *   `blackKey`(1) < `midground`(2) < `fallingKeyboard`(12) < `fallingOverlay`(20)
 *   < `missionOverlay`(90) < `previewOverlay`(95) < `ripple`(99).
 *   리플·파티클이 **가장 위**여야 건반을 눌렀을 때 손끝에서 튄다. 미션 오버레이가
 *   카운트인보다 아래인 것은 미션 안내를 읽는 중에 카운트인이 시작될 수 있어서다.
 *   안드로이드 전용이라 `zIndexElevation`으로 `elevation`도 함께 건다.
 *
 * ▸ **낙하 모드는 가로 여백이 0이다.** 좌우 10px은 트랙 배경(네이비)과 화면
 *   배경(검정) 사이에 테두리처럼 보이는 띠만 만들었다. 레인이 넓을수록 노트가 굵다.
 *
 * ▸ **`fallingTrackArea`의 `marginBottom`은 0이어야 한다.** 판정선이 트랙 바닥에
 *   붙어 있다. 여기서 더 띄우면 노트가 다시 허공에서 멎는다.
 *
 * ▸ **`falling.hudRight`(70)는 미션 아이콘 자리를 비켜 준 값이다.** 가운데에 두면
 *   가운데 레인으로 떨어지는 노트를 가린다. `right`로 **오른쪽 변을 못 박아야**
 *   폭이 내용에 맞게 줄어든다 — `alignSelf`만으로는 절대배치 자식의 폭이 안 잡힌다.
 *
 * ▸ **건반 음이름 크기는 이 파일에 없다.** 건반 폭에서 나오고(`getKeyLabelSize`)
 *   렌더에서 얹는다. 여기 기본값을 두면 곧 두 벌이 되어 갈라진다.
 *
 * ▸ **`octave.width`는 퍼센트 문자열('95%')이다.** 숫자로 바꾸면 가로모드에서
 *   기기 폭에 안 따라간다.
 */

export const scene = {
  backButtonMarginRight: 4,
  /** 패널이 자기 여백을 들고 있어 바깥은 0이다 */
  consoleBarPaddingHorizontal: 0,
  pianoAreaPaddingTop: 10,
  pianoContainerPaddingHorizontal: 10,
} as const;

/** 낙하 모드 전용 — 트랙 여백과 트랙 위에 뜨는 알약 둘 */
export const falling = {
  layoutPaddingTop: 6,
  /** 가로 여백 0 (4절) */
  pianoContainerPaddingHorizontal: 0,
  /** 트랙 바닥에 판정선이 붙어 있다 (4절) */
  trackMarginBottom: 0,

  exitTop: 12,
  exitLeft: 12,
  exitGap: 4,
  exitPaddingVertical: 6,
  exitPaddingHorizontal: 12,
  exitIconSize: 18,
  exitHitSlop: 10,

  hudTop: 12,
  /** 미션 아이콘 자리를 비켜 준다 (4절) */
  hudRight: 70,
  hudPaddingVertical: 5,
  hudPaddingHorizontal: 14,

  /** 알약 — 999는 「높이의 절반」을 뜻하는 관용값이다 */
  pillBorderRadius: 999,
  pillBorderWidth: 1,
} as const;

/** 건반 위 옥타브 이동 줄. 아래 제어반과 같은 네이비 상자다 */
export const octave = {
  /** 퍼센트 문자열 (4절) */
  width: '95%',
  borderWidth: 1,
  borderRadius: 14,
  padding: 8,
  marginBottom: 10,
  btnPaddingVertical: 8,
  btnPaddingHorizontal: 14,
  btnBorderRadius: 12,
  btnTextMarginHorizontal: 4,
  btnIconSize: 22,
} as const;

export const keyboard = {
  rowMarginVertical: 8,
  /** 낙하 모드. 위아래 8px씩이 그대로 트랙에서 빠져나간 높이였다 */
  rowMarginVerticalCompact: 0,
  whiteBorderWidth: 1,
  whitePaddingBottom: 15,
  /** 2.5D 입체감 그림자 — 흑건이 더 높이 뜬다 */
  whiteElevation: 10,
  blackPaddingBottom: 12,
  blackElevation: 15,
  keyBorderRadius: 4,
  labelMarginBottom: 4,
} as const;

export const mission = {
  boxPaddingVertical: 14,
  boxPaddingHorizontal: 28,
  boxBorderRadius: 16,
  boxBorderWidth: 1.5,
  boxElevation: 10,
  subTextMarginTop: 6,
} as const;

export const preview = {
  /** 카운트인 숫자의 광채 */
  textShadowRadius: 14,
} as const;

/** 건반을 누를 때 튀는 입자. 낙하 모드에서는 줄인다 (2절) */
export const particles = {
  count: 20,
  max: 120,
  maxWhileFalling: 80,
  scale: 1,
  scaleWhileFalling: 0.85,
} as const;

/** 층 — 낮은 것부터 blackKey < midground < fallingKeyboard < … < ripple (4절) */
export const zIndex = {
  blackKey: 1,
  midground: 2,
  fallingKeyboard: 12,
  fallingOverlay: 20,
  missionOverlay: 90,
  previewOverlay: 95,
  ripple: 99,
} as const;

/** 안드로이드는 zIndex만으로 안 올라가는 자리가 있다 (4절) */
export const zIndexElevation = {
  fallingKeyboard: 12,
  fallingOverlay: 20,
  ripple: 99,
} as const;

/** 건반 눌림 깊이 (2절) */
export const motion = {
  keyPressTranslateY: 12,
  blackKeyPressTranslateY: 9,
} as const;
