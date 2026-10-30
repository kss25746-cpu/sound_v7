/**
 * 동물게임 허브 — 색 · 고정 글자 크기 · 투명도.
 * 치수는 `animalGameHubLayout.ts`.
 *
 * 이 화면은 앱에서 **유일하게 어두운 바탕**이다(`screenBg` 짙은 보라). 다른 화면이
 * 흰 카드에 짙은 글자를 올리는 것과 정반대라 공용 `colors.ts`의 색이 하나도 안 맞는다 —
 * 그래서 공용에서 가져오는 색이 **하나도 없다.**
 *
 * 색 체계는 세 갈래다.
 * ① 크림(`text*` · `subtitleBox*`) — 어두운 바탕 위의 글자와 판.
 *    `#FFF7E8` 한 색의 투명도만 바꿔 쓴다.
 * ② 금(`star*`) · 초록(`clear*`) — 별과 클리어. 칩과 배지가 같은 색을 나눠 쓴다.
 * ③ 게임색(`gameAccent`) — 카드 넷을 구분하는 색. **데이터**라서 화면의 `games` 배열이 읽는다.
 *
 * ⚠ `gameAccent.orderGame`과 `star`는 값이 같다(`#FFD54F`). **뜻이 달라 갈라 둔다** —
 * 「소리 순서」 게임의 색을 바꾼다고 별빛까지 바뀌면 안 된다.
 *
 * 쓰는 곳: `screens/AnimalGameHubScreen.tsx`
 */

export const colors = {
  /** 화면 바탕 — 짙은 보라 */
  screenBg: '#352B46',

  /**
   * 바탕에 깔리는 흐린 빛 세 덩이. 각각 금 · 분홍 · 보라의 rgb에 0.10을 건 것이라
   * 위(별) · 왼쪽(초기화 버튼) · 아래(PG 카드)의 색과 짝이 맞는다.
   */
  glowTop: 'rgba(255, 213, 79, 0.10)',
  glowLeft: 'rgba(255, 79, 138, 0.10)',
  glowBottom: 'rgba(167, 139, 250, 0.10)',

  /** 크림 — 제목 · 게임 이름 · 로딩 글자 */
  textPrimary: '#FFF7E8',
  /** 작은 설명 글자(kicker · 게임 설명) */
  textMuted: 'rgba(255, 247, 232, 0.68)',
  /** 타자기 부제 */
  textSubtitle: 'rgba(255, 247, 232, 0.72)',

  /** 부제 상자 */
  subtitleBoxBg: 'rgba(255, 247, 232, 0.08)',
  /** ⚠ 여기만 크림이 아니라 **흰색** 0.07이다 */
  subtitleBoxBorder: 'rgba(255, 255, 255, 0.07)',

  /** 별 — 아이콘 · 타자기 커서 · 클리어 배지 바탕 · 클리어한 카드의 테두리 */
  star: '#FFD54F',
  starChipBg: 'rgba(255, 213, 79, 0.16)',
  starChipBorder: 'rgba(255, 213, 79, 0.35)',

  /** 클리어 — 체크 아이콘 · 요약 칩 글자 */
  clear: '#5EE7A8',
  clearChipBg: 'rgba(94, 231, 168, 0.13)',
  clearChipBorder: 'rgba(94, 231, 168, 0.35)',
  /** 금색 배지 위에 얹는 체크. 검정이 아니라 바탕에 가까운 짙은 보라다 */
  clearedBadgeIcon: '#1A1420',

  /** 아이콘 칸 바탕 — 화면 바탕보다 한 톤 어둡다 */
  iconContainerBg: '#1F1A32',

  /** [DEV] 나중에 삭제: 전체 초기화 버튼 */
  resetText: '#FFB4C8',
  resetBg: 'rgba(255, 79, 138, 0.12)',
  resetBorder: 'rgba(255, 79, 138, 0.30)',

  /**
   * 게임 카드 셋의 구분색. 화면의 `games` 배열이 `color`로 들고 가
   * 아이콘 칸 위 액센트 줄과 테두리에 쓴다.
   */
  gameAccent: {
    matchGame: '#6FE0B0',
    orderGame: '#FFD54F',
    matchGameAI: '#FF7A8A',
  },
} as const;

/**
 * 아직 클리어하지 않은 카드의 테두리는 **게임색에 이 알파를 붙여** 만든다
 * (`` `${game.color}66` `` = 40%). 게임색이 셋이라 색을 셋 더 적는 대신 식으로 둔다.
 */
export const iconBorderAlphaSuffix = '66';

/** 전부 고정 크기다 — 이 화면에는 반응형 글자가 없다 */
export const fontSize = {
  loading: 16,
  /** 「AUDITORY TRAINING」 */
  kicker: 11,
  sectionTitle: 25,
  /** 요약 칩 안의 숫자 */
  chipValue: 13,
  subtitle: 14,
  resetLabel: 13,
  /** 카드 안 게임 아이콘(Ionicons) 크기 */
  gameIcon: 38,
  gameName: 16,
  gameDesc: 12,
} as const;

export const opacity = {
  /** 게임 카드 `activeOpacity` */
  cardPressed: 0.82,
  /** 초기화 중인 버튼 */
  resetDisabled: 0.55,
} as const;
