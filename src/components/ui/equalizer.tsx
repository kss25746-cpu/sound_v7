import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';

const STAGGER_MS = 150;
const HALF_CYCLE_MS = 450;
const MIN_SCALE = 0.35;

type EqualizerProps = {
  color: string;
  /** 가장 긴 막대의 높이(px). */
  height?: number;
  barWidth?: number;
  /** 2-AFC는 4, 3-AFC는 3. */
  bars?: 3 | 4;
  /** 재생 중일 때만 움직임. 아니면 멈춤·흐리게. */
  playing?: boolean;
};

function Bar({
  color,
  height,
  width,
  delay,
  animate,
}: Readonly<{
  color: string;
  height: number;
  width: number;
  delay: number;
  animate: boolean;
}>) {
  // useRef(...).current는 렌더 중 ref 접근이라 린트가 막는다.
  // 지연 초기화 useState가 Animated.Value를 한 번만 만드는 표준 방식.
  const [scale] = useState(() => new Animated.Value(MIN_SCALE));

  useEffect(() => {
    if (!animate) {
      // 모션 최소화·정지 — 중간 높이로 멈춰 둔다(막대가 사라지지 않게).
      scale.setValue(0.7);
      return;
    }

    const loop = Animated.sequence([
      // 지연은 루프 밖에 한 번만 둔다. 안에 넣으면 막대마다 주기가 달라진다.
      Animated.delay(delay),
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1,
            duration: HALF_CYCLE_MS,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: MIN_SCALE,
            duration: HALF_CYCLE_MS,
            useNativeDriver: true,
          }),
        ])
      ),
    ]);

    loop.start();
    return () => {
      loop.stop();
    };
  }, [animate, delay, scale]);

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          width,
          height,
          backgroundColor: color,
          transform: [{ scaleY: scale }],
        },
      ]}
    />
  );
}

/**
 * 재생 중을 알리는 막대 애니메이션(장식).
 * `주의`: 실제 소리의 파형이 아니다 — 자극의 세기·난이도와 연동하지 않는다.
 */
export function Equalizer({
  color,
  height = 18,
  barWidth = 3.5,
  bars = 4,
  playing = true,
}: Readonly<EqualizerProps>) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (alive) {
        setReduceMotion(reduced);
      }
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) => {
      setReduceMotion(reduced);
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  const animate = playing && !reduceMotion;

  return (
    <View
      style={[styles.row, { height }, !playing && styles.dim]}
      importantForAccessibility="no-hide-descendants">
      {Array.from({ length: bars }, (_, i) => (
        <Bar
          key={i}
          color={color}
          height={height}
          width={barWidth}
          delay={i * STAGGER_MS}
          animate={animate}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  dim: {
    opacity: 0.4,
  },
  bar: {
    borderRadius: 2,
    // 아래를 바닥에 붙인 채 위로만 자라게 한다.
    transformOrigin: 'bottom',
  },
});
