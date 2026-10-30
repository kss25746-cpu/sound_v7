import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

/**
 * 앱이 백그라운드로 갈 때 **그 화면의 진행을 멈춘다.**
 *
 * 소리를 끊는 일은 여기서 하지 않는다 — 그건 `audio-manager.tsx`의 AppState 게이트가
 * 앱 전역으로 한 번에 처리한다. 이 훅이 맡는 것은 **세션이 혼자 넘어가지 않게 하는 것**이다.
 *
 * 왜 필요한가: 세션 화면은 「재생 → 대기 → 다음 문항」을 타이머·Promise로 잇는다.
 * 홈 버튼을 눌러도 그 사슬은 계속 돌아, 돌아와 보면 못 들은 문항이 지나가 있거나
 * 오답이 정상 기록으로 저장된다. 청능 기록에서는 이게 그대로 통계 오염이 된다.
 *
 * **포커스를 가진 화면에서만 부른다.** 탭은 한 번 방문하면 계속 마운트 상태로 남으므로,
 * 가드가 없으면 백그라운드 한 번에 여섯 화면의 콜백이 모두 돈다.
 *
 * 하는 일은 화면이 정한다 — 보통 이탈(blur) 때와 같은 정리(`abortRef` 세우기 +
 * 재생 중지)를 그대로 넘기면 된다. 남는 화면 상태도 blur 때와 같다.
 *
 * `inactive`도 함께 본다. 안드로이드에서 자주 오지는 않지만(알림창을 내릴 때 등)
 * 멈추는 쪽이 안전하다.
 *
 * @param onBackground 백그라운드로 갈 때 호출된다. 매 렌더의 최신 함수가 쓰이므로
 *                     `useCallback`으로 감쌀 필요가 없다.
 */
export function usePauseOnBackground(onBackground: () => void): void {
  const handlerRef = useRef(onBackground);
  const isFocusedRef = useRef(true);

  // 렌더 중 ref 대입은 lint가 막는다(`use-stop-audio-on-blur.ts`와 같은 이유).
  // 커밋 뒤 effect에서 넣어도 AppState 콜백보다는 항상 먼저다.
  useEffect(() => {
    handlerRef.current = onBackground;
  });

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      return () => {
        isFocusedRef.current = false;
      };
    }, []),
  );

  useEffect(() => {
    const handleChange = (next: AppStateStatus) => {
      if (next === "active" || !isFocusedRef.current) {
        return;
      }
      handlerRef.current();
    };

    const sub = AppState.addEventListener("change", handleChange);
    return () => sub.remove();
  }, []);
}
