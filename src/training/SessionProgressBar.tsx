import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/** 채움 폭이 목표까지 밀려가는 시간. 짧게. */
const FILL_MS = 260;

/**
 * 훈련 진행 화면의 슬림 진행바. 폭 = 현재 전환 / 목표 전환.
 * 난이도·정오답과 색을 연동하지 않는다.
 * 폭 변화는 즉시 점프가 아니라 짧게 밀어 채운다.
 */
export function SessionProgressBar({
  current,
  total,
}: Readonly<{
  current: number;
  total: number;
}>) {
  const theme = useTheme();
  const ratio = total <= 0 ? 0 : Math.min(1, Math.max(0, current / total));

  // 지연 초기화 useState로 Animated.Value를 한 번만 만든다(`equalizer.tsx`와 같은 방식).
  const [progress] = useState(() => new Animated.Value(ratio));
  // 첫 렌더는 애니메이션 없이 현재 비율로 그린다. 이후 변화만 밀어 채운다.
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      progress.setValue(ratio);
      return;
    }
    // width(%)는 layout이라 useNativeDriver를 쓸 수 없다.
    const anim = Animated.timing(progress, {
      toValue: ratio,
      duration: FILL_MS,
      useNativeDriver: false,
    });
    anim.start();
    return () => {
      anim.stop();
    };
  }, [progress, ratio]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: current }}
      style={[styles.track, { backgroundColor: theme.border }]}
    >
      <Animated.View
        style={[styles.fill, { width, backgroundColor: theme.accent }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 5,
    borderRadius: Radius.pill,
    overflow: "hidden",
    alignSelf: "stretch",
  },
  fill: {
    height: "100%",
    borderRadius: Radius.pill,
  },
});
