import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

import { holdOutputKeepAlive } from "@/audio/outputKeepAlive";

/**
 * 이 화면에 포커스가 있는 동안 **출력 장치를 깨어 있게** 붙잡는다.
 *
 * 이어폰을 꽂으면 소리가 몇 초 끊긴 뒤 다음 소리의 앞부분이 잘린다(장치 절전 → 깨어나는 지연).
 * 소리를 띄엄띄엄 내는 훈련 화면(TTS 단어 · 짧은 WAV · 타격음)은 모두 이 훅을 건다.
 * 경위와 원리는 `@/audio/outputKeepAlive` 주석과 `docs/이어폰-앞부분잘림_2026-10-15.md`.
 *
 * 포커스 기준인 이유: 탭은 마운트된 채 남으므로 언마운트만 보면 떠난 탭이 계속 붙잡는다
 * (`use-stop-audio-on-blur.ts`와 같은 이유). `useFocusEffect`는 언마운트 때도 정리한다.
 *
 * `주의`: 화면의 다른 `useFocusEffect`보다 **위에** 둔다. 진입 직후 첫 소리(예열·첫 문항)가
 * 이미 깨어 있는 출력 위에서 나야 한다.
 */
export function useOutputKeepAlive(): void {
  useFocusEffect(useCallback(() => holdOutputKeepAlive(), []));
}
