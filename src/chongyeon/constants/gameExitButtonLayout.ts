/**
 * 게임 공용 「나가기」 — 레이아웃 · 인터랙션 명세
 * 기준 화면: 세로 스마트폰 411 × 868 dp (확인 기기). 색은 `gameExitButtonTheme.ts`.
 *
 * 게임 셋(matchGame · matchGameAI · orderGame)에서 **목록으로 나가는**
 * 버튼이다. 세 화면에 각각 넣지 않고 게임을 감싸는 `(games)/_layout.tsx`에
 * **한 번만** 올린다 — 각각 넣으면 스타일·인셋·zIndex가 갈라진다.
 *
 * ─────────────────────────────────────────────────────────────
 * 1. 구조 트리 — 무엇이 무엇을 감싸는가
 * ─────────────────────────────────────────────────────────────
 *
 * Pressable button            absolute right button.right / bottom button.bottom
 * │                           row, 가운데 정렬, gap button.gap
 * │                           minHeight button.minHeight
 * │                           paddingH button.paddingH
 * │                           borderRadius = minHeight / 2 (아래 2절)
 * │                           borderWidth button.borderWidth, colors.border
 * │                           backgroundColor colors.bg (누르면 colors.pressedBg)
 * │                           elevation button.elevation, zIndex button.zIndex
 * │                           hitSlop button.hitSlop
 * ├── Ionicons "arrow-back"   size button.iconSize, colors.icon
 * └── Text 「나가기」          button.fontSize, weight 700, colors.label
 *
 * ─────────────────────────────────────────────────────────────
 * 2. 계산해서 쓰는 값 — 토큰만으로는 안 보이는 것
 * ─────────────────────────────────────────────────────────────
 *
 * borderRadius = button.minHeight / 2 — **알약 모양을 만드는 식이다.**
 * 높이가 바뀌면 반지름이 따라와야 하므로 숫자로 적지 않는다.
 * 폰 44/2 = 22, 태블릿 52/2 = 26.
 *
 * `button.minHeight`는 미관이 아니라 **손가락이 닿는 최소치**다 (폰 44 · 태블릿 52).
 * `button.right`·`bottom`은 코너에서 띄우는 값이고, 두 값이 같아야 대각선으로
 * 같은 거리에 놓인다.
 *
 * ─────────────────────────────────────────────────────────────
 * 3. 상태 — 무엇이 언제 보이는가
 * ─────────────────────────────────────────────────────────────
 *
 * | 상태        | 판              | 나머지        |
 * |-------------|-----------------|---------------|
 * | 평소        | colors.bg       | 그대로        |
 * | 누르는 중   | colors.pressedBg| 그대로        |
 *
 * **항상 보인다.** 소리를 내는 중(`LISTENING`)에도 숨기지 않는다 —
 * 소리는 여기서 끊지 않고, 넷 다 `useStopAudioOnBlur`가 화면을 뜰 때 끊는다.
 *
 * ─────────────────────────────────────────────────────────────
 * 4. 제약 조건 — 지켜야 하는 규칙
 * ─────────────────────────────────────────────────────────────
 *
 * **오른쪽 아래다. 우상단으로 옮기면 안 된다** — 그 자리는 미션 아이콘이
 * (`top: 50, right: 20`) 쓴다.
 *
 * `insets.bottom`을 **더하지 않는다.** 이 버튼이 얹히는 레이아웃의 바닥은 이미
 * 탭바 위에서 끝나므로, 더하면 그만큼 떠오른다 (냉장고 `replay.bottom`과 같은 함정).
 *
 * 그림자는 `elevation`만 쓴다 — `shadowColor`/`shadowOffset` 조합을 섞지 않는다.
 *
 * `button.zIndex`(10)는 게임 화면 안의 요소들과 겨루는 값이다. 냉장고의
 * `zIndex.controlSection`(200)과는 다른 좌표계에 있어 서로 영향을 주지 않는다.
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** 세로 전용 앱 기준, 600px 이상을 태블릿으로 구분 */
const isTablet = SCREEN_WIDTH >= 600;

export const button = {
  /** 손가락이 닿는 최소치. `borderRadius`가 이 값의 절반이다 (2절) */
  minHeight: isTablet ? 52 : 44,
  /** 코너에서 띄우는 값. 둘이 같아야 대각선으로 같은 거리에 놓인다 */
  right: isTablet ? 24 : 16,
  bottom: isTablet ? 24 : 16,
  paddingH: isTablet ? 18 : 14,
  /** 아이콘과 「나가기」 사이 */
  gap: isTablet ? 8 : 6,
  iconSize: isTablet ? 22 : 18,
  fontSize: isTablet ? 16 : 14,
  borderWidth: 1,
  elevation: 6,
  zIndex: 10,
  /** 알약 밖으로 넓힌 터치 영역 */
  hitSlop: 8,
} as const;
