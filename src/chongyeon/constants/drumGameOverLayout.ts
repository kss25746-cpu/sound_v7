/**
 * 결과창(`DrumGameOverScreen`) — 레이아웃 · 인터랙션 명세
 * 기준 화면: 세로 스마트폰 411 × 868 dp (확인 기기). 색은 `drumGameOverTheme.ts`.
 *
 * 점수 · Rive 게이지 · 등급 문구 · 버튼 하나 또는 둘. 게임이 끝나면 덮는 판이다.
 *
 * ⚠ **한 쌍을 두 호스트가 같이 쓴다** — `auditoryLayout.ts`와 같은 꼴이다.
 *   ① 드럼(퀴즈 모드) — `Modal` 안의 전체 화면 오버레이. 「다시 하기」 + 「나가기」 둘.
 *   ② learn(단어 퀴즈) — 페이지 안에 flex로 채운다. 「확인」 하나.
 * 두 호스트의 **폭이 다르다.** 그래서 게이지 폭을 화면 크기가 아니라 **카드 실측값**으로
 * 잡는다 (2절). 값을 고칠 때는 양쪽을 다 봐야 한다.
 *
 * ─────────────────────────────────────────────────────────────
 * 1. 구조 트리 — 무엇이 무엇을 감싸는가
 * ─────────────────────────────────────────────────────────────
 *
 * container                     StyleSheet.absoluteFill, 가운데 정렬
 * │                             padding scene.padding
 * │
 * ├── resultWrapper             width 100%, 가운데, zIndex.result
 * │   └── resultContent         width 100%, 가운데
 * │       │                     paddingHorizontal scene.contentPaddingHorizontal
 * │       │
 * │       ├── scoreCard         colors.cardBg, radius card.borderRadius
 * │       │   │                 padding card.padding, maxWidth card.maxWidth
 * │       │   │                 borderWidth card.borderWidth, elevation card.elevation
 * │       │   │                 marginBottom card.marginBottom
 * │       │   │                 **onLayout ← 여기서 폭을 잰다** (2절)
 * │       │   └── scoreContainer    가운데, marginBottom card.scoreContainerMarginBottom
 * │       │       ├── progressBar   row 가운데, marginTop gauge.marginTop, gap gauge.gap
 * │       │       │   └── Rive      width/height ← 계산 (2절)
 * │       │       │                 stateMachine "State Machine 1", input "Number 1"
 * │       │       ├── scoreMessage  card.messageFontSize, marginTop card.messageMarginTop
 * │       │       │                 colors.message
 * │       │       └── scoreCombined 「점수/만점」. card.scoreFontSize
 * │       │                         marginTop card.scoreMarginTop
 * │       │                         색 ← 등급에 따라 렌더에서 준다 (3절)
 * │       │
 * │       └── buttonContainer   row, space-between, maxWidth card.maxWidth
 * │           │                 gap button.gap, marginTop button.containerMarginTop
 * │           ├── actionButton  flex 1. radius button.borderRadius
 * │           │                 paddingV/H button.paddingVertical/Horizontal
 * │           │                 minHeight button.minHeight, borderWidth button.borderWidth
 * │           │                 글자 button.fontSize
 * │           └── [onGoHome 있을 때만] secondaryButton  바탕만 비운 같은 틀
 * │
 * └── [만점] CorrectConfetti    fit Cover. zIndex.confetti + elevation (4절)
 *
 * ─────────────────────────────────────────────────────────────
 * 2. 계산해서 쓰는 값 — 토큰만으로는 안 보이는 것
 * ─────────────────────────────────────────────────────────────
 *
 * **게이지 폭은 화면이 아니라 카드를 따라간다.**
 *
 *   gaugeWidth  = 실측 전이면 gauge.minWidth
 *                 실측 후면 max(gauge.minWidth,
 *                              round(min(측정폭 − card.padding × 2, gauge.maxWidth)))
 *   gaugeHeight = round(gaugeWidth / gauge.aspect)
 *
 * 카드에 `maxWidth`만 있고 게이지가 220px 고정이던 때는 **태블릿에서 카드만 넓어지고
 * 게이지는 그대로**였다. 그래서 실측(`onLayout`)으로 바꿨다.
 *
 * 실측 전 첫 프레임은 **하한**(`gauge.minWidth`)으로 그린다. 큰 값으로 어림잡으면
 * 폭이 좁은 호스트(learn)에서 한 프레임 동안 게이지가 카드 밖으로 삐져나온다.
 *
 * 측정폭은 **반올림**한다. 소수점 끝자리가 흔들리면
 * onLayout → 리렌더 → onLayout이 돈다 (세션 32).
 *
 * gauge.aspect = 220 / 40 — 원본 Rive 아트보드 비율. 폭이 바뀌어도 이 비율을 지킨다.
 *
 * 게이지 차오름: `motion.fillDurationMs`를 `motion.fillSteps`로 나눈 간격마다
 *   목표값 / steps 만큼 더한다 (600 / 30 = 20ms × 30번).
 *   목표값 = (score / max(maxScore, 1)) × 100 — Rive 입력이 0~100 구간이다.
 *
 * ─────────────────────────────────────────────────────────────
 * 3. 상태 — 무엇이 언제 보이는가
 * ─────────────────────────────────────────────────────────────
 *
 * | 등급          | 조건                        | 문구        | 점수 색             |
 * |---------------|-----------------------------|-------------|---------------------|
 * | perfect       | maxScore > 0 && score === max | 완벽해요!  | colors.tierPerfect  |
 * | good          | score >= max × 0.7          | 잘했어요!   | colors.tierGood     |
 * | tryAgain      | 그 밖                        | 아쉬워요!   | colors.tierTryAgain |
 *
 * | 호스트 | 주 버튼    | 나가기 | 콘페티        |
 * |--------|-----------|--------|---------------|
 * | 드럼   | 다시 하기  | ✓      | 만점이면      |
 * | learn  | 확인       | ✗      | 만점이면      |
 *
 * ─────────────────────────────────────────────────────────────
 * 4. 제약 조건 — 어기면 무엇이 깨지는가
 * ─────────────────────────────────────────────────────────────
 *
 * ▸ **`zIndex.confetti`(2) > `zIndex.result`(1).** 콘페티는 `absoluteFill`이라
 *   기본값 100을 그대로 쓰면 결과 카드를 덮어 **점수가 가린다.** 자리잡기는
 *   `CorrectConfetti`가 이미 하고 여기선 **층만** 덮어쓴다.
 *   안드로이드 전용이라 `elevation`(`zIndexElevation.confetti`)도 같이 건다.
 *
 * ▸ **`card.borderWidth`(1)를 지울 수 없다.** 그림자는 `elevation`으로만 내는데
 *   learn 탭은 배경이 밝아(#F0F2F5) 그림자가 없으면 흰 카드가 배경에 묻는다.
 *   옅은 테두리가 그 경계를 만든다.
 *
 * ▸ **`buttonContainer`의 `maxWidth`는 `card.maxWidth`와 같아야 한다.**
 *   버튼 줄이 카드보다 넓어지면 어깨가 삐져나온다.
 *
 * ▸ **`maxScore`가 0일 때 만점이 아니다.** learn 「그만하기」는 한 문제도 안 푼 채
 *   접을 수 있어 `0/0`이 들어온다. 막지 않으면 콘페티가 깔리고 「완벽해요!」가 뜬다.
 *
 * ▸ 콘페티의 `fit`·`style`은 **모듈 상수**여야 한다. 카드 폭 실측으로 게이지가 다시
 *   그려져도 `React.memo`가 걸러 주는데, 새 객체를 넘기면 리렌더마다 처음부터 다시 돈다.
 */

import { LAYOUT } from './layout';

export const scene = {
  padding: 16,
  contentPaddingHorizontal: 20,
} as const;

/**
 * 점수 카드. 카드가 `width: '100%'`뿐이라 태블릿에서는 카드만 넓어지고
 * 게이지는 220px로 남았다 — 그래서 상한을 준다 (2절).
 */
export const card = {
  maxWidth: LAYOUT.isTablet ? 520 : 400,
  padding: LAYOUT.isTablet ? 24 : 20,
  borderRadius: 16,
  borderWidth: 1,
  elevation: 4,
  marginBottom: 20,
  scoreContainerMarginBottom: 20,
  /** 「완벽해요!」 */
  messageFontSize: LAYOUT.isTablet ? 40 : 32,
  messageMarginTop: 5,
  /** 「7/10」 */
  scoreFontSize: LAYOUT.isTablet ? 34 : 28,
  scoreMarginTop: 16,
} as const;

/** Rive 진행 게이지. 폭은 카드 실측값을 따라간다 (2절) */
export const gauge = {
  maxWidth: LAYOUT.isTablet ? 340 : 240,
  minWidth: 160,
  /** 원본 Rive 아트보드 비율(220 × 40) */
  aspect: 220 / 40,
  marginTop: 15,
  gap: 6,
} as const;

export const button = {
  /** buttonContainer의 maxWidth는 card.maxWidth를 쓴다 (4절) */
  containerMarginTop: 20,
  gap: 15,
  borderRadius: 16,
  borderWidth: 2,
  paddingVertical: 18,
  paddingHorizontal: 12,
  minHeight: LAYOUT.isTablet ? 92 : 80,
  fontSize: LAYOUT.isTablet ? 24 : 20,
  /** 눌렀을 때 살짝 줄인다 */
  pressedScale: 0.98,
} as const;

export const zIndex = {
  result: 1,
  confetti: 2,
} as const;

/** 안드로이드는 zIndex만으로 안 올라가는 자리가 있다 (4절) */
export const zIndexElevation = {
  confetti: 8,
} as const;

/** 게이지가 0 → 목표까지 차오르는 연출 (2절) */
export const motion = {
  fillDurationMs: 600,
  fillSteps: 30,
} as const;
