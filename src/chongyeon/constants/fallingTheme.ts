/**
 * 낙하노트(자유 모드 연주 화면)의 디자인 토큰.
 *
 * `instrumentTheme.ts`가 **제어반**의 공통 치수를 담는다면, 이 파일은 **트랙**만의
 * 값을 담는다. 트랙은 Skia 캔버스라 StyleSheet를 못 쓰고, 색·치수가 코드 안에
 * 흩어지면 건반 쪽과 어긋난다 — 두 쪽이 **같은 값을 보게** 하려고 여기 모은다.
 *
 * 색은 `FreeModePanel`의 네이비+노랑을 그대로 잇는다. 대기 화면과 연주 화면이
 * 다른 앱처럼 보이면 안 되기 때문이다.
 *
 * 쓰는 곳: `components/FallingNoteTrack.tsx`, `screens/MusicTrainingScreen.tsx`
 */

import type { Note } from '../types/music';

/**
 * 노트가 **판정선까지 오는 데 걸리는 시간(초).**
 *
 * 예전에는 `LEAD_BEATS = 4`(박 기준)였다. 박 기준이면 BPM이 곡마다 다르므로
 * **스크롤 속도가 곡마다 달라진다** — 120BPM 곡은 72BPM 곡보다 1.7배 빨리 흐른다.
 * 시간 기준으로 두면 속도는 전곡 동일하고, 대신 빠른 곡일수록 화면에 담기는
 * 박 수가 늘어난다(= 음표가 촘촘해진다). 그게 악보의 생김새와 같은 방향이다.
 */
export const LEAD_SECONDS = 2.2;

export const FALLING_LAYOUT = {
  /** 노트 사이 숨구멍(px). 연속 8분음표가 한 덩어리로 뭉쳐 보이지 않게 한다 */
  noteGap: 4,
  /** 32분음표까지 내려가도 이만큼은 보장한다 */
  minNoteHeight: 16,
  /** 이보다 낮은 노트에는 도레미를 넣지 않는다 — 글자가 눌린다 */
  minLabelHeight: 30,
  noteRadius: 8,
  /** 레인 폭에서 노트 좌우로 뺄 여백 */
  noteInset: 3,
  judgmentStroke: 3,
  judgmentStrokePulse: 7,
  /** 레인 바닥의 착지 패드 높이 */
  padHeight: 10,
  /** 건반 위에 까는 레인 색 띠 높이 */
  keyAccentHeight: 7,
} as const;

export const FALLING_COLORS = {
  /** 트랙 배경. `FreeModePanel`의 `lcd`(#0A1017)보다 살짝 푸르다 */
  track: '#0E1726',
  /** 레인 교대 밴드. 선 하나보다 이쪽이 눈으로 훑기 쉽다 */
  laneBand: 'rgba(255, 255, 255, 0.035)',
  laneLine: 'rgba(255, 255, 255, 0.07)',
  /** 평상시 판정선 — `FreeModePanel`의 노랑과 같은 값 */
  judgment: '#FFD166',
  judgmentHit: '#FFFFFF',
  judgmentMiss: '#FF6B6B',
  /** 노트 안 도레미. 노트가 밝은 색이라 글자는 어둡게 */
  noteLabel: '#17120A',
  hit: '#FFFFFF',
  /**
   * 놓친 노트.
   *
   * **레인 색 중 어느 것과도 겹치면 안 된다.** 빨강(#FF6B6B)을 쓰다가 `도` 레인
   * 색과 정확히 같아서, 도에서 놓친 노트가 멀쩡한 노트와 구분되지 않았다.
   * 채도를 뺀 회청색이라 "꺼졌다"는 뜻도 색에서 읽힌다 — 판정선은 따로 빨갛게 튄다.
   */
  miss: '#6B7689',
} as const;

/**
 * 음이름 → 레인 색.
 *
 * **옥타브가 아니라 음이름으로 정한다.** 도는 어느 옥타브에서도 같은 계열이어야
 * "도는 빨강"이 학습으로 남는다. 팔레트 안에서 같은 음이름이 두 번 나오면
 * (8음 곡의 C4·C5) 위쪽을 옅게 틴트해서 레인만 구분한다.
 */
const PITCH_COLOR: Record<string, string> = {
  C: '#FF6B6B',
  D: '#FF9F45',
  E: '#FFD166',
  F: '#A8E05F',
  G: '#4ECDC4',
  A: '#6BA8FF',
  B: '#B07BFF',
};

const PITCH_SOLFEGE: Record<string, string> = {
  C: '도',
  D: '레',
  E: '미',
  F: '파',
  G: '솔',
  A: '라',
  B: '시',
};

/** 흑건은 팔레트에 없지만, 데이터가 늘어도 색이 비지 않게 기본값을 둔다 */
const FALLBACK_COLOR = '#8FA3BF';

/** `C#4` → `C`, `A3` → `A`. 샵은 앞 음이름의 색을 따른다 */
const pitchClassOf = (note: Note): string => note.charAt(0).toUpperCase();

const isSharp = (note: Note): boolean => note.charAt(1) === '#';

/** 흰색과 섞어 옅게. `amount` 0 = 원색, 1 = 흰색 */
const tint = (hex: string, amount: number): string => {
  const value = parseInt(hex.slice(1), 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  const r = mix((value >> 16) & 0xff);
  const g = mix((value >> 8) & 0xff);
  const b = mix(value & 0xff);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
};

/** `도` / `도♯`. 아동 대상이라 음이름(C3)보다 계이름이 먼저다 */
export const getSolfege = (note: Note): string => {
  const base = PITCH_SOLFEGE[pitchClassOf(note)] ?? note;
  return isSharp(note) ? `${base}♯` : base;
};

/**
 * 팔레트 순서 그대로 레인 색을 낸다.
 *
 * 같은 음이름이 두 번째로 나오면(= 한 옥타브 위) 단계적으로 옅어진다.
 * 색을 새로 배정하지 않는 이유는 위 `PITCH_COLOR` 주석과 같다.
 */
export const getLaneColors = (palette: Note[]): string[] => {
  const seen = new Map<string, number>();
  return palette.map((note) => {
    const pitchClass = pitchClassOf(note);
    const occurrence = seen.get(pitchClass) ?? 0;
    seen.set(pitchClass, occurrence + 1);
    const base = PITCH_COLOR[pitchClass] ?? FALLBACK_COLOR;
    return occurrence === 0 ? base : tint(base, Math.min(0.55, 0.3 * occurrence));
  });
};

/** 건반 쪽에서 쓰는 조회용. 레인 색과 **같은 함수에서** 나와야 어긋나지 않는다 */
export const getLaneColorMap = (palette: Note[]): Record<string, string> => {
  const colors = getLaneColors(palette);
  const map: Record<string, string> = {};
  palette.forEach((note, index) => {
    map[note] = colors[index];
  });
  return map;
};
