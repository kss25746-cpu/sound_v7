/**
 * 게임 공용 「나가기」 — 색 토큰
 * 쓰는 곳: `components/GameExitButton.tsx`
 * (게임 셋 `AnimalGameScreen` · 동물 허브 `AnimalGameHubScreen`)
 *
 * 기타 탭(`guitarTheme.ts` + `guitarLayout.ts`)과 같은 짝이다.
 * 치수와 구조·상태 주석은 `gameExitButtonLayout.ts`에 있다.
 *
 * 공용 `colors.ts`의 색은 **여기서 이름만 다시 붙인다** — 값을 복제하지 않는다.
 * 이 버튼에는 전용 리터럴 색이 없다. 밝은 배경 위에 얹히는 흰 알약이라
 * 공용 팔레트만으로 칠해진다.
 *
 * `fontSize`·`opacity`가 없는 이유:
 * 글자 크기는 반응형이라 규칙 3에 따라 layout에 있고(`button.fontSize`),
 * 이 버튼은 `TouchableOpacity`가 아니라 `Pressable`이라 `activeOpacity` 대신
 * **누른 상태의 배경색**(`pressedBg`)으로 눌림을 알린다.
 */

import { COLORS } from './colors';

export const colors = {
  /**
   * 판. 밝은 배경·사진 위에 얹히므로 **불투명**하다.
   * 반투명으로 깔면 배경에 따라 글자 대비가 흔들린다 —
   * 가로 화면용 `LandscapeBackButton`이 반투명 흰 판인 것과 갈라지는 지점이다.
   */
  bg: COLORS.background,
  /** 누르고 있는 동안 한 단 어두워진다 */
  pressedBg: COLORS.backgroundLight,
  /**
   * 테두리. **`borderGray`를 쓰면 안 된다** —
   * `borderGray`(#BDBDBD)는 흰 판·`#f5f5f5` 양쪽에서 1.88:1이라 경계가 안 보인다.
   * 판이 흰색이면 **경계가 유일한 구분**이라 3:1을 넘겨야 하고,
   * `textSecondary`는 5.2~5.7:1이다.
   */
  border: COLORS.textSecondary,
  icon: COLORS.textPrimary,
  label: COLORS.textPrimary,
} as const;
