import { Colors, type ThemeColor } from '@/constants/theme';

/**
 * 화면 색을 준다. **라이트 고정** — 다크 모드는 구현하지 않기로 했다(2026-08-11).
 *
 * OS 설정을 보지 않으므로 `useColorScheme`도 쓰지 않는다. 훅으로 남겨 두는 이유는
 * 호출부(화면 20여 곳)를 그대로 두기 위해서다 — 다크를 다시 하게 되면
 * 여기서만 갈라주면 된다.
 *
 * 반환 타입을 `string`으로 넓히는 건 `Colors`의 `as const` 때문이다. 그대로 두면
 * `let c = theme.text`가 `"#14201C"` 리터럴로 좁혀져 다른 색을 재대입할 수 없다.
 * 색의 16진값을 타입으로 알아야 할 곳은 없고, `themeColor` prop 자동완성은
 * 값이 아니라 키(`ThemeColor`)에서 나오므로 잃는 것이 없다.
 */
export function useTheme(): Record<ThemeColor, string> {
  return Colors.light;
}
