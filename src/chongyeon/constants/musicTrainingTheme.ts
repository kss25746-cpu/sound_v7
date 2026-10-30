/**
 * 피아노 훈련 화면 — **이 화면에만 있는** 색 · 고정 글자 크기 · 투명도.
 * 치수는 `musicTrainingLayout.ts`.
 *
 * ⚠ 이 화면은 theme 파일을 **넷** 쓴다. 나머지 셋은 남이 함께 쓰는 것이라 그대로 둔다.
 *
 * | 파일                 | 범위                                              |
 * |----------------------|---------------------------------------------------|
 * | `consoleTheme.ts`    | `CONSOLE` — 피아노 콘솔의 네이비+노랑. 패널 넷이 쓴다 |
 * | `instrumentTheme.ts` | `CONTROL_BAR` · `RADII` · `SEMANTIC` · `PIANO` — 기타와 공유 |
 * | `fallingTheme.ts`    | `FALLING_*` — 낙하 트랙. `FallingNoteTrack` 등이 쓴다 |
 * | **이 파일**          | 화면 파일 안에만 있던 리터럴                        |
 *
 * 셋의 대문자 이름(`CONSOLE`)은 그대로 둔다. 다른 화면의 소문자 규칙(`colors`)과
 * 다르지만, 저 셋은 **한 화면 전용이 아니라** 컴포넌트 여럿이 함께 쓰는 공용이고
 * 이름을 바꾸면 값은 하나도 안 변한 채 파일 여럿이 흔들린다.
 *
 * 여기 색은 전부 **낙하 모드 UI와 건반 눌림**이다. 평상시 화면의 색은 이미 위 셋에 있다.
 *
 * 쓰는 곳: `screens/MusicTrainingScreen.tsx`
 */

export const colors = {
  /**
   * 화면 바탕. `PIANO.screen`(`#000000`)과 **같은 색인데 글자가 다르다**(`#000`).
   * 값 확인이 끝나기 전에는 표기를 통일하지 않는다.
   */
  screenBg: '#000',
  /** 준비 중 스피너. `SEMANTIC.score`와 같은 값이다 */
  loadingIndicator: '#ffffff',

  /**
   * 낙하 모드 트랙 위에 뜨는 알약 둘(종료 · 점수). `CONSOLE.lcd`(`#0A1017`)의
   * rgb에 0.82를 건 것 — **액정과 같은 색**이라야 트랙 위에서 콘솔의 연장으로 읽힌다.
   */
  hudBg: 'rgba(10, 16, 23, 0.82)',
  /** 종료 알약 테두리. `CONSOLE.title`(`#FFD166`)의 rgb에 0.35 */
  exitBorder: 'rgba(255, 209, 102, 0.35)',
  /** 「맞은 음 / 전체」의 **전체** 쪽. 맞은 쪽은 `FALLING_COLORS.judgment`다 */
  hudTotal: 'rgba(255, 255, 255, 0.55)',

  /** 미션 오버레이가 연주 영역을 덮는 검은 막 */
  missionScrim: 'rgba(0, 0, 0, 0.4)',
  /** 미션 오버레이 보조 글자 */
  missionSubText: '#fff',

  /**
   * 건반 눌림 색 — 스타일이 아니라 `useAnimatedStyle`이 `translateY`를 보고 고른다.
   * ⚠ `PIANO.keys.white`(`'white'`) · `PIANO.keys.black`(`'black'`)과 **글자가 달라**
   * 갈라 둔다. 애니메이션 워크릿이 매 프레임 읽는 값이라 뜻도 다르다 —
   * 저쪽은 정지 상태의 건반 색, 여기는 눌리는 동안의 색이다.
   */
  whiteKeyIdle: '#ffffff',
  whiteKeyPressed: '#ececec',
  blackKeyIdle: '#111111',
  blackKeyPressed: '#2a2a2a',
} as const;

/**
 * 고정 글자 크기. 이 화면에 반응형 글자는 없다 — 가로모드 전용이라
 * `LAYOUT.isTablet`으로 가르지 않고, 건반 음이름만 **건반 폭에서** 나온다
 * (`getKeyLabelSize`. 그래서 여기에도 스타일에도 없다).
 */
export const fontSize = {
  fallingExit: 14,
  fallingHudValue: 20,
  fallingHudTotal: 14,
  octaveBtn: 15,
  whiteKeyLabel: 11,
  blackKeyLabel: 10,
  missionOverlay: 26,
  missionOverlaySub: 14,
  /** 카운트인 숫자(3 · 2 · 1 · Start) */
  preview: 54,
} as const;

export const opacity = {
  /**
   * 출제 범위 밖 건반. 0.25는 검은 배경 위에서 건반을 **지워버렸다.**
   * 0.4면 「여기 건반이 있는데 이번 난이도에서는 안 쓴다」가 보인다 —
   * 범위가 좁아진 것이지 건반이 없어진 게 아니다.
   */
  keyDisabled: 0.4,
} as const;
