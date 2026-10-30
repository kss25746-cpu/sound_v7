/**
 * 동물게임 허브 — 레이아웃 · 인터랙션 명세
 * 기준 화면: 세로 스마트폰 411 × 868 dp (확인 기기). 색·글자는 `animalGameHubTheme.ts`.
 *
 * 게임 셋(소리 맞추기 · 소리 순서 · 강화학습)을 고르는 화면이다. 탭이 아니라
 * `wrs` 묶음 안의 한 항목이라 우하단에 「나가기」가 있다(`GameExitButton`).
 *
 * ⚠ **이 파일에는 반응형 값이 하나도 없다.** 다른 화면의 layout이 `screenWidth`로
 * 카드 크기를 잡는 것과 달리, 여기는 카드 폭이 128dp로 **고정**이고 줄바꿈은
 * `flexWrap`이 알아서 한다. 폰에서 2열, 태블릿에서 4열이 되는 것도 그 결과다 —
 * 계산하는 곳이 없으니 기기별 표도 없다.
 *
 * ─────────────────────────────────────────────────────────────
 * 1. 구조 트리 — 무엇이 무엇을 감싸는가
 * ─────────────────────────────────────────────────────────────
 *
 * GestureHandlerRootView          flex: 1
 * ├── container                   flex: 1, colors.screenBg
 *     │                           paddingTop/Bottom ← safe-area insets (토큰 아님)
 *     │
 *     ├── glowTop                 절대배치. glow.top (오른쪽 위 밖으로 걸침)
 *     ├── glowLeft                절대배치. glow.left (왼쪽으로 걸침)
 *     ├── glowBottom              절대배치. glow.bottom (오른쪽 아래로 걸침)
 *     │                           셋 다 원. 형제 순서상 아래 내용이 위에 온다 (4절)
 *     │
 *     └── ScrollView              flex 1, 스크롤바 숨김
 *         │                       contentContainer flexGrow 1
 *         │                       paddingBottom scene.scrollBottomPadding
 *         └── section             flex 1
 *             │                   marginHorizontal/paddingTop section.*
 *             │
 *             ├── sectionHeader   marginBottom section.headerMarginBottom
 *             │   │
 *             │   ├── titleRow    row, 가운데, space-between
 *             │   │   │           marginBottom section.titleRowMarginBottom
 *             │   │   │
 *             │   │   ├── titleBlock           flex 1
 *             │   │   │   ├── kicker           fontSize.kicker
 *             │   │   │   │                    letterSpacing section.kickerLetterSpacing
 *             │   │   │   └── sectionTitleRow  row, gap section.titleIconGap
 *             │   │   │       ├── Ionicons ear-outline  size fontSize.sectionTitle
 *             │   │   │       └── sectionTitle fontSize.sectionTitle, flexShrink 1
 *             │   │   │                        letterSpacing section.titleLetterSpacing
 *             │   │   │
 *             │   │   └── summaryRow           row, gap summary.rowGap
 *             │   │       ├── [별 > 0] starSummary    금 칩 (3절)
 *             │   │       └── [클리어 > 0] clearSummary  초록 칩
 *             │   │           두 칩 모두 summary.chip* + 아이콘 summary.iconSize
 *             │   │
 *             │   └── subtitleBox     minHeight subtitle.minHeight (**고정** — 2절)
 *             │       └── sectionSubtitle  타자기 글자 + [치는 중] cursorText 「|」
 *             │
 *             ├── gameGrid        row + wrap, 가운데
 *             │   │               columnGap/rowGap grid.*
 *             │   └── gameCard × 4   width card.width, 가운데
 *             │       │              activeOpacity opacity.cardPressed
 *             │       │              accessibilityLabel에 별·클리어를 말로 넣는다 (4절)
 *             │       │
 *             │       ├── [별] starBadge       절대배치 badge.starTop/starRight
 *             │       │                        zIndex.badge, 아이콘 badge.starIconSize
 *             │       ├── [클리어] clearedBadge 절대배치 badge.clearedTop/clearedRight
 *             │       │                        badge.clearedSize 정사각, 원
 *             │       │                        zIndex.badge, 아이콘 badge.clearedIconSize
 *             │       │
 *             │       ├── iconContainer        card.iconSize 정사각
 *             │       │   │                    radius card.iconBorderRadius, overflow hidden
 *             │       │   │                    borderWidth card.iconBorderWidth
 *             │       │   │                    borderColor ← 클리어 여부로 갈린다 (3절)
 *             │       │   ├── cardAccent       위쪽 띠. height card.accentHeight
 *             │       │   │                    bg = 게임색, zIndex.cardAccent
 *             │       │   └── Ionicons         size fontSize.gameIcon, color = 게임색
 *             │       │                        paw · shuffle · rocket-outline (`games[].icon`)
 *             │       │
 *             │       ├── gameName             fontSize.gameName
 *             │       └── gameDesc             fontSize.gameDesc
 *             │
 *             └── [DEV] resetButton   가운데 정렬, marginTop reset.marginTop
 *                                     아이콘 reset.iconSize + 글자
 *                                     초기화 중이면 opacity.resetDisabled
 *
 * └── GameExitButton              container와 형제. 우하단 알약 「나가기」
 *                                 치수는 gameExitButtonLayout. 바닥 인셋을 더하지 않는다
 *
 * ─────────────────────────────────────────────────────────────
 * 2. 계산해서 쓰는 값 — 토큰만으로는 안 보이는 것
 * ─────────────────────────────────────────────────────────────
 *
 * glow.*.borderRadius = size / 2 — 셋 다 **원**이다. 크기를 고치면 반지름도 같이 고칠 것.
 *   top/left 240 → 120, bottom 220 → 110.
 *
 * badge.clearedBorderRadius = clearedSize / 2 (22 → 11). 같은 이유다.
 *
 * card.accentBorderRadius = card.iconBorderRadius (둘 다 28). 액센트 띠가 아이콘 칸의
 *   **위쪽 두 모서리에 딱 맞아야** 하므로 같은 값이어야 한다. `overflow: 'hidden'`이
 *   잘라 주긴 하지만, 라운드가 어긋나면 모서리에 한 픽셀이 비친다.
 *
 * badge.clearedTop = 84 는 `card.iconSize`(104)의 **안쪽 아래**를 노린 값이다.
 *   84 + 22(배지) = 106 이라 배지가 아이콘 칸 밑변에 2dp 걸친다. 아이콘 칸 크기를
 *   바꾸면 이 값도 따라가야 한다.
 *
 * subtitle.minHeight(58)는 **타자기 때문에 고정**이다. 부제가 한 글자씩 늘어나는데
 *   상자가 내용에 맞춰 자라면 두 줄이 되는 순간 아래 그리드가 통째로 밀린다.
 *   다 친 글자가 두 줄로 들어가는 높이를 미리 잡아 둔 것이다 (`fontSize.subtitle` 14 ×
 *   `subtitle.lineHeight` 21 × 2줄 + 여백).
 *
 * ─────────────────────────────────────────────────────────────
 * 3. 상태 — 무엇이 언제 보이는가
 * ─────────────────────────────────────────────────────────────
 *
 * | 상태                    | 보이는 것                                        |
 * |-------------------------|--------------------------------------------------|
 * | Context 없음            | 「로딩 중...」 하나. 빛 세 덩이도 안 그린다        |
 * | 부제 치는 중            | 잘린 부제 + 금색 커서 「|」                       |
 * | 부제 다 침              | 커서가 사라진다 (`isSubtitleDone`)                |
 * | 별 0개                  | 금 칩을 안 그린다                                 |
 * | 클리어 0개              | 초록 칩을 안 그린다                               |
 *
 * 카드 하나의 상태 — 별과 클리어는 **따로** 붙는다(별만, 클리어만, 둘 다 가능).
 *
 * | 카드 상태   | 별 배지 | 클리어 배지 | iconContainer 테두리                  |
 * |-------------|---------|-------------|---------------------------------------|
 * | 처음        | ✗       | ✗           | 게임색 + `iconBorderAlphaSuffix` (40%) |
 * | 별만        | ✓       | ✗           | 게임색 + 알파                          |
 * | 클리어      | —       | ✓           | **colors.star** (금색 한 줄)           |
 *
 * ─────────────────────────────────────────────────────────────
 * 4. 제약 조건 — 어기면 무엇이 깨지는가
 * ─────────────────────────────────────────────────────────────
 *
 * ▸ **빛 세 덩이는 절대배치 형제이고 층 토큰이 없다.** `zIndex` 없이 ScrollView보다
 *   먼저 나오는 순서만으로 뒤에 깔린다. 뒤에 무엇을 더 붙이려면 순서를 지킬 것.
 *
 * ▸ **`zIndex.cardAccent`(2) < `zIndex.badge`(3).** 카드 안에서 액센트 띠보다
 *   배지가 위여야 한다. 클리어 배지는 아이콘 칸 아래에 걸쳐 있어 층이 뒤집히면 잘린다.
 *
 * ▸ **별·클리어는 배지 아이콘에만 있다.** 토크백이 아이콘을 못 읽으므로
 *   `accessibilityLabel`이 「별 획득」·「클리어 완료」를 말로 붙인다. 배지를 고칠 때
 *   라벨도 같이 고칠 것.
 *
 * ▸ **`grid.columnGap`(38)이 `grid.rowGap`(34)보다 크다.** 카드에 이름과 설명이
 *   딸려 있어 세로로는 이미 글자 여백이 있기 때문이다. 둘을 같게 만들면 가로가 좁아 보인다.
 *
 * ▸ 타자기 `motion.subtitleStepMs`(60)는 부제 30자에 1.8초다.
 *   `subtitleStartDelayMs`(450)는 화면이 뜬 직후가 아니라 **한 박자 뒤에** 치기 시작하게 한다.
 */

export const scene = {
  /** 우하단 「나가기」 알약(높이 44 + 바닥 16)에 글이 가리지 않게 비운다 */
  scrollBottomPadding: 72,
} as const;

/** 바탕에 깔리는 흐린 빛 세 덩이. 전부 원이고 화면 밖으로 걸친다 (2절) */
export const glow = {
  top: { top: -80, right: -40, size: 240, borderRadius: 120 },
  left: { top: 260, left: -110, size: 240, borderRadius: 120 },
  bottom: { right: -70, bottom: 40, size: 220, borderRadius: 110 },
} as const;

export const section = {
  marginHorizontal: 18,
  paddingTop: 18,
  headerMarginBottom: 72,
  titleRowMarginBottom: 18,
  kickerLetterSpacing: 3,
  kickerMarginBottom: 6,
  /** 음수 — 굵은 큰 글자를 조인다 */
  titleLetterSpacing: -0.5,
  /** 제목 앞 Ionicons와 글자 사이 */
  titleIconGap: 6,
} as const;

/** 오른쪽 위 요약 칩 둘(별 · 클리어). 색만 다르고 치수는 같다 */
export const summary = {
  rowGap: 8,
  chipGap: 5,
  chipPaddingVertical: 7,
  chipPaddingHorizontal: 12,
  chipBorderRadius: 18,
  chipBorderWidth: 1,
  iconSize: 14,
} as const;

export const subtitle = {
  /** 타자기가 늘어나도 안 밀리게 미리 잡은 높이 (2절) */
  minHeight: 58,
  paddingHorizontal: 18,
  borderRadius: 18,
  borderWidth: 1,
  elevation: 1,
  lineHeight: 21,
} as const;

export const grid = {
  columnGap: 38,
  rowGap: 34,
} as const;

export const card = {
  width: 128,
  iconSize: 104,
  iconBorderRadius: 28,
  iconBorderWidth: 1.5,
  iconMarginBottom: 14,
  iconElevation: 4,
  accentHeight: 3,
  /** iconBorderRadius와 같아야 한다 (2절) */
  accentBorderRadius: 28,
  nameMarginBottom: 8,
  descLineHeight: 17,
} as const;

export const badge = {
  starTop: 10,
  starRight: 18,
  starIconSize: 16,
  clearedTop: 84,
  clearedRight: 17,
  clearedSize: 22,
  clearedBorderRadius: 11,
  clearedIconSize: 12,
} as const;

/** [DEV] 나중에 삭제: 전체 초기화 버튼 */
export const reset = {
  marginTop: 34,
  gap: 6,
  paddingVertical: 10,
  paddingHorizontal: 18,
  borderRadius: 18,
  borderWidth: 1,
  iconSize: 14,
} as const;

export const zIndex = {
  cardAccent: 2,
  badge: 3,
} as const;

/** 부제 타자기 (4절) */
export const motion = {
  subtitleStartDelayMs: 450,
  subtitleStepMs: 60,
} as const;
