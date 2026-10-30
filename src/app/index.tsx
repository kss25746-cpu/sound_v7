import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

import { closePureToneContext } from "@/audio/pureTone";
import { OtherSoundsTabScreen } from "@/training/other/OtherSoundsTabScreen";

/** 하단 첫 탭 — 다른 소리. expo-router 기본 라우트라 앱 시작 화면. */
export default function OtherSoundsRoute() {
  // 탭 blur에서만 close. 의존성 [] — 목록 안 점검·통계 스와프는 컨텍스트를 유지.
  useFocusEffect(
    useCallback(() => {
      return () => {
        void closePureToneContext();
      };
    }, []),
  );

  return <OtherSoundsTabScreen />;
}
