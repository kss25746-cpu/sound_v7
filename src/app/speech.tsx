import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

import { closeAmToneContext } from "@/audio/amTone";
import { closePureToneContext } from "@/audio/pureTone";
import { SpeechTabScreen } from "@/training/speech/SpeechTabScreen";

/** 하단 탭 — 말소리. 소리 찾기가 이 탭에 있다. */
export default function SpeechRoute() {
  // 탭 blur에서만 close. 의존성 [] — 찾기 안 점검·통계 스와프는 컨텍스트를 유지.
  // 점검음은 pureTone이라 am과 같이 닫는다.
  useFocusEffect(
    useCallback(() => {
      return () => {
        void closeAmToneContext();
        void closePureToneContext();
      };
    }, []),
  );

  return <SpeechTabScreen />;
}
