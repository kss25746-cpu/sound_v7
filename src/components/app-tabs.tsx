import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useTabBarHidden } from "@/components/tab-bar-visibility";
import { Colors } from "@/constants/theme";

/**
 * 하단 3탭 — 다른 소리 · 말소리 · 악기 소리.
 * NativeTabs(unstable). 아이콘은 시스템 심볼(전용 PNG 없음).
 * 각 탭은 목록을 열고, 목록에서 연습으로 들어간다.
 *
 * 가로 화면(악기 탭의 피아노·기타)에서는 **탭바를 숨긴다.** 그 둘은 라우트가 아니라
 * 묶음 안 상태라 여기서 직접 알 수 없다 — 화면이 건 요청을 받아 온다
 * (`tab-bar-visibility.tsx`).
 */
export default function AppTabs() {
  const colors = Colors.light;
  const hidden = useTabBarHidden();

  return (
    <NativeTabs
      hidden={hidden}
      backgroundColor={colors.surface}
      indicatorColor={colors.accentTint}
      tintColor={colors.accent}
      iconColor={{ default: colors.textMuted, selected: colors.accent }}
      labelStyle={{
        default: { color: colors.textMuted },
        selected: { color: colors.accent },
      }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>다른 소리</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="ear" md="hearing" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="speech">
        <NativeTabs.Trigger.Label>말소리</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="text.bubble" md="chat" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="inst">
        <NativeTabs.Trigger.Label>악기 소리</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="pianokeys" md="piano" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="setting">
        <NativeTabs.Trigger.Label>설정</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gear" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
