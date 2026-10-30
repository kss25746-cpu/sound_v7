/**
 * 기타 탭 — A안 "네온 프렛라인" 색상 · 타이포 토큰
 * 출처: Design 캔버스 아트보드 "A · 네온 프렛라인"
 *
 * Space Grotesk / JetBrains Mono 는 앱에 번들하지 않았다.
 * `fonts` 값은 undefined 라 RN 기본 시스템 폰트로 떨어진다.
 */

export const colors = {
  // 바탕
  screenBg: '#0B0E13',
  boardBorder: '#1B2430',

  // 하단 제어반
  barBg: '#10161E',
  barBorder: '#1E2733',

  // 프렛 칸 (실기기 확인 후 보드 배경과 분리되도록 밝기를 올린 값)
  cellBg: '#2A3648',
  cellBorder: '#4A6078',
  cellText: '#DCE7F2',

  /** 누르고 있는 동안의 칸 — 한 단계 더 밝게 + 테두리 강조 */
  cellBgPressed: '#3A4A60',
  cellBorderPressed: '#5CD0E8',

  // 줄 · 너트 · 인레이
  /** 1~3번줄 (고음, 플레인 현) */
  stringPlain: '#C3D2E0',
  /** 4~6번줄 (저음, 와운드 현) */
  stringWound: '#B89A6A',
  nut: '#C3D2E0',
  /** 3프렛 위치 표시 점 */
  inlay: 'rgba(195, 210, 224, 0.22)',

  // 텍스트
  textPrimary: '#FFFFFF',
  textMuted: '#94A6B8',
  textLabel: '#6F8296',

  // 액센트
  accent: '#A8E85C', // 주 동작 (훈련 시작)
  accentOn: '#0B1A05', // accent 위 글자
  info: '#5CD0E8', // 보조 동작 (다시 듣기) · 미션 고리 · 누름 강조
  infoOn: '#04222B',

  // 상태
  correctFill: 'rgba(168, 232, 92, 0.16)',
  correctBorder: '#A8E85C',
  wrongFill: 'rgba(255, 107, 97, 0.14)',
  wrongBorder: '#FF6B61',
  dangerBorder: '#FF6B61', // 훈련 종료 테두리
  dangerText: '#FF8C84',

  // 부품
  exitBg: '#182029',
  exitBorder: '#263040',
  exitIcon: '#C6D4E2',
  chipGroupBg: '#0B1017',
  chipGroupBorder: '#1E2733',
  ringTrack: '#26323F',
} as const;

export const fonts = {
  ui: undefined,
  uiRegular: undefined,
  mono: undefined,
} as const;

export const fontSize = {
  stringLabel: 10,
  feedback: 11,
  feedbackStrong: 12,
  note: 13,
  chip: 13,
  action: 14,
  score: 15,
  primary: 15,
  ring: 11,
} as const;

export const opacity = {
  /**
   * 해당 단계 출제 후보가 아닌 칸.
   * cellBg 를 밝게 올린 뒤 활성/비활성 구분이 흐려지면
   * 0.18 ~ 0.20 까지 내려도 된다.
   */
  inactiveCell: 0.25,
} as const;
