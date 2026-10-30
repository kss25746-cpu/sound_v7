/**
 * 기타 탭 — A안 "네온 프렛라인" 레이아웃 · 인터랙션 명세
 * 기준 화면: 가로 스마트폰 780 × 360 dp
 *
 * ─────────────────────────────────────────────────────────────
 * 1. 구조 트리 — 무엇이 무엇을 감싸는가
 * ─────────────────────────────────────────────────────────────
 *
 * Screen                        flexDirection: 'column'
 * │                             backgroundColor: colors.screenBg
 * │
 * ├── Fretboard                 flex: 1            ← 남는 높이 전부
 * │   │                         paddingTop 8 / H 12 / Bottom 6
 * │   │                         rowGap 3
 * │   │
 * │   └── StringRow × 6         flex: 1            ← 6줄이 균등 분배
 * │       │                     flexDirection: 'row'
 * │       │                     alignItems: 'center', gap 10
 * │       │
 * │       ├── Label             width 56 (고정)     ← 예: "1번줄(E)"
 * │       │                     textAlign: 'right'
 * │       │
 * │       └── FretArea          flex: 1            ← 남는 폭 전부
 * │           │                 flexDirection: 'row'
 * │           │                 alignItems: 'center', gap 7
 * │           │
 * │           ├── StringLine    position: 'absolute'  ← 칸 뒤를 가로지름
 * │           │                 left 0 / right 0 / top '50%'
 * │           │                 height = stringGauge[i]
 * │           │                 color  = stringMaterial[i] 에 따라
 * │           │                          colors.stringPlain / stringWound
 * │           │
 * │           ├── OpenCell      flex: 1            ← 개방현
 * │           ├── Nut           width 4 (고정)      ← 개방현과 1프렛 경계
 * │           └── FretCell × 3  flex: 1            ← 1~3프렛
 * │
 * ├── Inlay                     position: 'absolute'  ← 프렛보드 위에 1개
 * │                             3프렛 칸 중앙, 3번줄과 4번줄 사이 높이
 * │                             size 10, colors.inlay
 * │
 * └── ControlBar                height 64 (고정)
 *     │                         flexDirection: 'row'
 *     │                         alignItems: 'center'
 *     │                         paddingHorizontal 12, gap 10
 *     │
 *     ├── ExitButton            44 × 44 (고정)
 *     ├── ScoreBlock            width 168 (고정)    ← 점수 + 피드백 2줄
 *     ├── StageArea             (상태에 따라 내용이 바뀜 — 아래 2번)
 *     ├── Spacer                flex: 1            ← 남는 폭을 밀어냄
 *     ├── MissionRing           44 × 44 (고정)
 *     └── ActionArea            (상태에 따라 내용이 바뀜 — 아래 2번)
 *
 * 핵심: flex 값이 있는 것은 "남는 공간을 나눠 갖는 것",
 *       width/height 숫자가 있는 것은 "고정". 둘을 섞지 말 것.
 *
 * ─────────────────────────────────────────────────────────────
 * 2. 상태별 차이 — 무엇이 바뀌는가
 * ─────────────────────────────────────────────────────────────
 *
 * 골격(프렛보드 + 하단바)은 네 상태 모두 같다.
 * 바뀌는 곳은 StageArea, ActionArea, 피드백 문구, 칸 강조뿐이다.
 *
 * ┌──────────┬───────────────────┬──────────────────────────────┐
 * │ 상태      │ StageArea         │ ActionArea                   │
 * ├──────────┼───────────────────┼──────────────────────────────┤
 * │ 대기      │ 난이도 칩 4개       │ 「훈련 시작」 1개               │
 * │          │ (선택 가능)        │ colors.accent                │
 * ├──────────┼───────────────────┼──────────────────────────────┤
 * │ 훈련 중   │ 잠긴 단계 표시 1개  │ 「다시 듣기」 colors.info       │
 * │          │ (자물쇠 + "2단계")  │ 「훈련 종료」 테두리 danger      │
 * └──────────┴───────────────────┴──────────────────────────────┘
 *
 * 피드백 문구 (ScoreBlock 아래줄):
 *   대기   "자유 연주 중"                colors.textMuted
 *   시작   "훈련 시작!"                  colors.info
 *   정답   "정답입니다! 🎸"              colors.accent
 *   오답   "틀렸습니다! 다시 들어보세요."  colors.dangerText
 *
 * 프렛 칸 강조 (채점 직후 해당 칸만):
 *   정답   backgroundColor: colors.correctFill  borderColor: colors.correctBorder
 *   오답   backgroundColor: colors.wrongFill    borderColor: colors.wrongBorder
 *
 * 난이도별 칸 활성 (모든 상태 공통):
 *   후보가 아닌 칸은 opacity.inactiveCell + 비활성.
 *   칸을 없애지 않고 자리는 그대로 둔다.
 *   1단계 개방현만 / 2단계 샵 없는 자연음 / 3단계 일부+샵 / 4단계 전부
 *
 * 소리는 대기·훈련 모두 난다. 막는 것은 채점뿐이다.
 *
 * ─────────────────────────────────────────────────────────────
 * 3. 누름 반응 — 세 가지가 동시에 일어난다
 * ─────────────────────────────────────────────────────────────
 *
 * 칸을 누르는 순간(onPressIn) 아래 셋이 함께 시작된다.
 * 대기·훈련 모두 동일하다. 채점 여부와 무관하다.
 *
 * (1) 칸 눌림 — Pressable 의 pressed 상태로 처리 (애니메이션 불필요)
 *     backgroundColor : colors.cellBgPressed
 *     borderColor     : colors.cellBorderPressed
 *     transform       : [{ translateY: press.translateY }]
 *     떼면 press.releaseMs 에 걸쳐 원래대로
 *
 * (2) 현 진동 — 눌린 줄의 StringLine 하나만
 *     애니메이션 라이브러리(예: Reanimated)의 withSequence + withTiming
 *     scaleY 를 왕복시키며 진폭을 줄여 정지시킨다.
 *     굵은 줄(저음)일수록 진폭이 크고 느리다 → vibration.byString 참조
 *
 * (3) 햅틱 — 햅틱 라이브러리(예: expo-haptics)
 *     impactAsync(Light). 정답 판정 시에만 Medium 으로 한 번 더.
 *
 * ─────────────────────────────────────────────────────────────
 * 4. 제약 조건 — 지켜야 하는 규칙
 * ─────────────────────────────────────────────────────────────
 *
 * bar.height + (6줄 × 48) ≤ 화면 높이.
 * bar.height 를 72 보다 키우면 프렛 칸이 44dp 아래로 내려가
 * 터치 타깃 기준을 깬다. 하단바는 64 고정 권장.
 */

import { fontSize } from './guitarTheme';

export const MIN_TOUCH = 44;

/** A안 아트보드 기준. 이 크기에서 토큰 숫자가 그대로다 */
const REF_W = 780;
const REF_H = 360;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const clampRound = (value: number, min: number, max: number) =>
  Math.round(clamp(value, min, max));

export const bar = {
  height: 64,
  maxHeight: 72, // 이 값을 넘기지 말 것
  paddingHorizontal: 12,
  gap: 10,
} as const;

export const board = {
  paddingTop: 8,
  paddingHorizontal: 12,
  paddingBottom: 6,
  rowGap: 3,
  /** 줄 이름 라벨 ↔ 프렛 영역 간격 */
  labelGap: 10,
  labelWidth: 56,
} as const;

export const fret = {
  cellHeight: 44,
  cellRadius: 4,
  cellGap: 7,
  /** 개방현 칸과 1프렛 사이 너트 */
  nutWidth: 4,
  nutHeight: 34,
  nutRadius: 1,
} as const;

/** 1번줄(고음 E) → 6번줄(저음 E) 순서의 현 굵기 */
export const stringGauge = [1, 1, 2, 2, 3, 3] as const;

/** 같은 순서의 현 재질. colors.stringPlain / colors.stringWound 와 짝 */
export const stringMaterial = [
  'plain',
  'plain',
  'plain',
  'wound',
  'wound',
  'wound',
] as const;

/** 위치 표시 점 — 3프렛 칸 중앙, 3번줄과 4번줄 사이 높이에 1개 */
export const inlay = {
  size: 10,
  /** 몇 번째 프렛 칸인가 (개방현 제외, 1부터) */
  fret: 3,
} as const;

/** 누르고 있는 동안의 칸 변형 */
export const press = {
  translateY: 1,
  releaseMs: 120,
} as const;

/**
 * 현 진동.
 * scaleY 를 1 → 1+amplitude → 1-amplitude … 로 왕복시키며
 * cycles 회 반복하고 감쇠시켜 1 로 끝낸다.
 */
export const vibration = {
  cycles: 4,
  /** 1번줄(고음) → 6번줄(저음) 순서 */
  byString: [
    { amplitude: 1.6, durationMs: 180 },
    { amplitude: 1.7, durationMs: 190 },
    { amplitude: 1.9, durationMs: 205 },
    { amplitude: 2.1, durationMs: 220 },
    { amplitude: 2.4, durationMs: 235 },
    { amplitude: 2.6, durationMs: 250 },
  ],
} as const;

export const control = {
  exitSize: 44,
  exitRadius: 8,

  /** 점수 + 피드백 문구 블록 */
  scoreBlockWidth: 168,
  scoreBlockGap: 3,

  /** 대기 상태: 난이도 칩 4개 */
  chipWidth: 60,
  chipHeight: 44,
  chipRadius: 6,
  chipGroupPadding: 3,
  chipGroupGap: 4,
  chipGroupRadius: 9,

  /** 훈련 상태: 잠긴 단계 표시 하나로 대체 */
  lockedStageWidth: 96,
  lockedStageHeight: 44,
  lockedStageRadius: 9,
  lockedStageGap: 6,

  /** 미션 진행 고리 */
  missionSize: 44,
  missionRingRadius: 18,
  missionRingWidth: 3,

  /** 훈련 시작 */
  primaryHeight: 44,
  primaryPaddingHorizontal: 22,
  primaryRadius: 8,

  /** 다시 듣기 · 훈련 종료 */
  actionHeight: 44,
  actionPaddingHorizontal: 16,
  actionRadius: 8,
  actionGap: 8,
} as const;

/** 줄 × 프렛 음 매핑 (위 = 1번줄 고음 E) */
export const strings = [
  { label: '1번줄(E)', notes: ['E4', 'F4', 'F#4', 'G4'] },
  { label: '2번줄(B)', notes: ['B3', 'C4', 'C#4', 'D4'] },
  { label: '3번줄(G)', notes: ['G3', 'G#3', 'A3', 'A#3'] },
  { label: '4번줄(D)', notes: ['D3', 'D#3', 'E3', 'F3'] },
  { label: '5번줄(A)', notes: ['A2', 'A#2', 'B2', 'C3'] },
  { label: '6번줄(E)', notes: ['E2', 'F2', 'F#2', 'G2'] },
] as const;

/**
 * 780×360에서는 토큰 그대로, 짧은 폰·폴드 커버는 줄이고 태블릿·폴드 펼침은 조금만 키운다.
 * 하단바는 spec 상한 72를 넘기지 않는다.
 */
export function getGuitarFit(usableWidth: number, usableHeight: number) {
  const sx = usableWidth / REF_W;
  const sy = usableHeight / REF_H;
  const fontScale = clamp(Math.min(sx, sy), 0.82, 1.18);

  const barHeight = clampRound(usableHeight * (bar.height / REF_H), bar.height, bar.maxHeight);
  const padTop = clampRound(board.paddingTop * sy, 4, 14);
  const padH = clampRound(board.paddingHorizontal * sx, 6, 20);
  const padBottom = clampRound(board.paddingBottom * sy, 3, 12);
  const rowGap = clampRound(board.rowGap * sy, 2, 8);
  const labelGap = clampRound(board.labelGap * sx, 6, 16);
  const labelWidth = clampRound(board.labelWidth * sx, 40, 80);

  const rowH = Math.max(
    1,
    (usableHeight - barHeight - padTop - padBottom - rowGap * 5) / 6,
  );
  const cellHeight = clampRound(
    Math.min(rowH, fret.cellHeight * clamp(sy, 0.82, 1.2)),
    fret.cellHeight,
    56,
  );
  const cellGap = clampRound(fret.cellGap * sx, 4, 12);
  const nutWidth = clampRound(fret.nutWidth * sx, 3, 6);
  const nutHeight = clampRound(cellHeight * (fret.nutHeight / fret.cellHeight), 22, 44);

  const touch = clampRound(
    Math.min(barHeight - 8, MIN_TOUCH * clamp(sy, 0.85, 1.15)),
    MIN_TOUCH,
    52,
  );

  const barPadH = clampRound(bar.paddingHorizontal * sx, 6, 18);
  const barGap = clampRound(bar.gap * sx, 4, 14);
  const actionPadH = clampRound(control.actionPaddingHorizontal * sx, 8, 22);
  const primaryPadH = clampRound(control.primaryPaddingHorizontal * sx, 10, 28);
  const actionGap = clampRound(control.actionGap * sx, 4, 12);
  const chipGroupPadding = clampRound(control.chipGroupPadding * sx, 2, 5);
  const chipGroupGap = clampRound(control.chipGroupGap * sx, 2, 6);
  const lockedStageWidth = clampRound(control.lockedStageWidth * sx, 72, 120);

  let scoreBlockWidth = clampRound(control.scoreBlockWidth * sx, 96, 220);
  const startMin = 80;
  const usedSansChips =
    barPadH * 2 + touch + barGap + scoreBlockWidth + barGap + touch + barGap + startMin + barGap;
  let chipWidth = clampRound(
    (usableWidth - usedSansChips - chipGroupPadding * 2 - chipGroupGap * 3) / 4,
    32,
    76,
  );
  if (chipWidth <= 32 && scoreBlockWidth > 96) {
    scoreBlockWidth = 96;
    const used = barPadH * 2 + touch + barGap + scoreBlockWidth + barGap + touch + barGap + startMin + barGap;
    chipWidth = clampRound(
      (usableWidth - used - chipGroupPadding * 2 - chipGroupGap * 3) / 4,
      32,
      76,
    );
  }

  return {
    barHeight,
    padTop,
    padH,
    padBottom,
    rowGap,
    labelGap,
    labelWidth,
    cellHeight,
    cellGap,
    nutWidth,
    nutHeight,
    touch,
    barPadH,
    barGap,
    actionPadH,
    primaryPadH,
    actionGap,
    chipGroupPadding,
    chipGroupGap,
    chipWidth,
    lockedStageWidth,
    scoreBlockWidth,
    stringLabel: clampRound(fontSize.stringLabel * fontScale, 8, 13),
    feedback: clampRound(fontSize.feedback * fontScale, 9, 13),
    note: clampRound(fontSize.note * fontScale, 10, 16),
    chip: clampRound(fontSize.chip * fontScale, 10, 16),
    action: clampRound(fontSize.action * fontScale, 11, 17),
    score: clampRound(fontSize.score * fontScale, 12, 18),
    primary: clampRound(fontSize.primary * fontScale, 12, 18),
    ring: clampRound(fontSize.ring * fontScale, 9, 13),
    lockIcon: clampRound(14 * fontScale, 11, 18),
    missionRingRadius: clampRound(touch / 2 - 4, 12, 22),
    missionRingWidth: clampRound(3 * fontScale, 2, 4),
    inlaySize: clampRound(inlay.size * fontScale, 8, 14),
  };
}
