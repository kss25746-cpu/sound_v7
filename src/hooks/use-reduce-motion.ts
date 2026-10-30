import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * 시스템 「애니메이션 제거」(안드로이드: 설정 → 접근성 → 애니메이션 제거).
 * 켜져 있으면 **장식** 움직임을 멈춘다 — 진행·상태를 알리는 움직임까지 끄라는 뜻은 아니다.
 *
 * 켜고 끄는 즉시 반영되도록 변경 이벤트도 듣는다. 화면이 살아 있는 동안 설정을
 * 바꾸는 사람이 실제로 있고(모션 멀미), 재시작을 요구하면 대응하지 않은 것과 같다.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (alive) {
        setReduceMotion(reduced);
      }
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (reduced) => {
        setReduceMotion(reduced);
      },
    );
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return reduceMotion;
}
