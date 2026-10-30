import { useCallback, useRef, useState } from "react";
import { Animated } from "react-native";

/** 누르는 동안 줄어드는 배율. 살짝만. */
const PRESSED_SCALE = 0.96;

/**
 * 선택 버튼 눌림 촉감 — 누르면 살짝 줄고 떼면 복귀한다.
 * 빙고 타일과 같은 native-driver spring이라 JS 스레드·layout 부담이 없다.
 *
 * `transform: [{ scale }]`을 감싸는 `Animated.View`에 넘기고,
 * `onPressIn`/`onPressOut`을 `Pressable`에 연결한다.
 */
export function usePressScale() {
  // 지연 초기화 useState로 Animated.Value를 한 번만 만든다(`equalizer.tsx`와 같은 방식).
  const [scale] = useState(() => new Animated.Value(1));
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const spring = useCallback(
    (toValue: number) => {
      animRef.current?.stop();
      const anim = Animated.spring(scale, {
        toValue,
        friction: 6,
        tension: 180,
        useNativeDriver: true,
      });
      animRef.current = anim;
      anim.start();
    },
    [scale],
  );

  const onPressIn = useCallback(() => spring(PRESSED_SCALE), [spring]);
  const onPressOut = useCallback(() => spring(1), [spring]);

  return { scale, onPressIn, onPressOut };
}
