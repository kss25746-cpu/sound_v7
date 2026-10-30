import { DefaultTheme, ThemeProvider } from "expo-router";
import { DoHyeon_400Regular, useFonts } from "@expo-google-fonts/do-hyeon";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { AudioManagerProvider } from "@/audio/audio-manager";
import { ClearProvider } from "@/chongyeon/context/ClearContext";
import { StarProvider } from "@/chongyeon/context/StarContext";
import AppTabs from "@/components/app-tabs";
import { TabBarVisibilityProvider } from "@/components/tab-bar-visibility";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DoHyeon: DoHyeon_400Regular,
  });

  /**
   * 네이티브 스플래시를 내린다.
   *
   * 전에는 Expo 로고 오버레이(`AnimatedSplashOverlay`)의 `onLayout`이 이걸 불렀다.
   * 오버레이를 걷어내면서(2026-08-22) 여기로 옮겼다 — **이 줄이 없으면
   * `preventAutoHideAsync`가 붙잡은 스플래시가 영영 안 내려가 첫 화면에서 멈춘다.**
   *
   * Do Hyeon은 피아노 곡 제목에만 쓴다. 앱 시작 때 한 번 올린 뒤 스플래시를 내린다.
   * 이미 내려간 뒤 다시 부르면 거부되므로(개발 중 새로고침) 삼킨다.
   */
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    // 라이트 고정 — 다크 모드 구현 안 함(use-theme.ts 참고).
    // 하단 3탭: 다른 소리 · 말소리 · 악기 소리. 통계는 각 목록 헤더에서 스와프.
    <ThemeProvider value={DefaultTheme}>
      {/*
       * 오디오 세션은 여기 한 번뿐이다. 화면·모듈에서 setAudioModeAsync를 부르지 않는다.
       * 정본: docs/merge-chongyeon-audio.md §2.2-1 · §6-3.
       */}
      <AudioManagerProvider>
        {/*
         * B에서 온 게임 화면이 별·클리어 진행도를 여기서 읽는다. 저장은 AsyncStorage.
         * 화면이 탭 안 묶음으로 들어가므로 Provider는 루트에 둔다.
         */}
        <StarProvider>
          <ClearProvider>
            {/*
             * 가로 화면(악기 탭의 피아노·기타)이 하단 탭바를 숨겨 달라고 건다.
             * 그 둘은 라우트가 아니라 묶음 안 상태라 NativeTabs가 스스로 알 수 없다.
             */}
            <TabBarVisibilityProvider>
              <AppTabs />
            </TabBarVisibilityProvider>
          </ClearProvider>
        </StarProvider>
      </AudioManagerProvider>
    </ThemeProvider>
  );
}
