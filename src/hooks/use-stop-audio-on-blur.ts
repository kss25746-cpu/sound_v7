import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";

/**
 * 탭에서 포커스를 잃을 때 그 화면의 소리를 정리한다.
 *
 * B(`chongyeon-0708/hooks/useStopAudioOnBlur.ts`)에서 이식했다. 정본 §2.1.
 *
 * 탭은 한 번 방문하면 계속 마운트 상태로 남는다. 그래서 **언마운트 클린업은 탭을
 * 바꿔도 실행되지 않고**, 정리는 포커스 기준으로 걸어야 한다.
 *
 * 재생 주체가 화면마다 다르므로(상주 풀 `audio-manager.tsx` / 화면이 직접 든 플레이어 /
 * 합성 엔진 `pureTone`·`amTone`) 공통 정지 함수는 없다. 각 화면이 자기 소리를
 * 정리하는 함수를 넘긴다.
 *
 * **무엇을 하는지는 화면이 정한다 — 정지만이 아니다.**
 * 파일 재생 쪽은 여기서 `remove()`까지 해야 하는 경우가 있다. `pause()`는 소리만
 * 멈추고 **AudioTrack은 계속 붙잡기 때문이다.** 안드로이드는 앱당 약 40개로 제한하므로
 * 붙잡은 채로 두면 다음 화면이 트랙을 못 받아 무음이 된다. 정본 §2.2-2 · §4.2.
 * (경위: `docs/재생-키포인트.md`)
 *
 * 합성 엔진(높낮이·소리 찾기)은 이 훅을 쓰지 않는다. 반납 대상이 AudioTrack이 아니라
 * `AudioContext`라 `src/app/index.tsx`·`speech.tsx`에서 `close*Context`를 직접 건다.
 * 정본 §2.5 · §4.3.
 *
 * @param stopAudio 포커스를 잃는 순간 호출된다. 매 렌더의 최신 함수가 쓰이므로
 *                  `useCallback`으로 감쌀 필요가 없다.
 * @returns 포커스 여부를 담은 ref. 답을 맞힌 뒤 타이머로 다음 문제음을 내보내는 화면처럼
 *          **떠난 뒤에 시작될 재생을 막아야 할 때** 재생 직전에 확인한다.
 */
export function useStopAudioOnBlur(
  stopAudio: () => void,
): React.RefObject<boolean> {
  const stopRef = useRef(stopAudio);
  const isFocusedRef = useRef(true);

  // B는 렌더 중에 대입했다. A의 lint는 렌더 중 ref 접근을 막으므로 커밋 뒤 effect에서
  // 넣는다. blur 클린업은 커밋보다 뒤에 일어나므로 언제나 최신 함수가 불린다.
  // (배경: docs/ref-vs-state-노트.md)
  useEffect(() => {
    stopRef.current = stopAudio;
  });

  useFocusEffect(
    // 의존성을 비워 두어 클린업이 포커스를 잃을 때만 1회 실행되게 한다
    useCallback(() => {
      isFocusedRef.current = true;

      return () => {
        isFocusedRef.current = false;
        stopRef.current();
      };
    }, []),
  );

  return isFocusedRef;
}
