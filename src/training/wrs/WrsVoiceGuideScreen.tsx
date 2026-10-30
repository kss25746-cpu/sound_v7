import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ActionButton } from "@/components/ui/action-button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import {
  MaxContentWidth,
  Radius,
  Spacing,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/** 제조사마다 메뉴 이름이 달라, 검색으로 찾게 안내한다. */
const STEPS: readonly string[] = [
  "휴대폰 «설정»을 열고 «음성 변환»으로 검색하세요",
  "«텍스트 음성 변환 출력»을 누르세요",
  "«Google 텍스트 음성 변환» 옆 톱니바퀴를 누르세요",
  "«음성 데이터 설치»에서 «한국어»를 받으세요",
];

type WrsVoiceGuideScreenProps = {
  /** 음성을 깔고 돌아왔을 때 다시 확인 — 있으면 원래 가려던 연습으로 넘어간다. */
  onRetry: () => void;
  onBack: () => void;
  /** 확인 중에는 버튼을 잠근다. */
  checking?: boolean;
};

/**
 * 기기에 한국어 TTS 음성이 없을 때 연습 대신 띄우는 안내.
 *
 * 이 화면이 없으면 단어가 무음으로 지나가고 사용자는 이유를 알 수 없다 —
 * 소리를 듣고 고르는 연습이라 무음이면 찍기가 된다. 그래서 시작을 막고 안내한다.
 */
export function WrsVoiceGuideScreen({
  onRetry,
  onBack,
  checking = false,
}: Readonly<WrsVoiceGuideScreenProps>) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <ScrollView
          style={styles.fill}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={[styles.mark, { backgroundColor: theme.accentTint }]}>
              <Icon name="speaker" size={26} color={theme.accent} />
            </View>
            <ThemedText type="screenTitle">한국어 음성이 없어요</ThemedText>
            <ThemedText themeColor="textSecondary" type="caption">
              이 기기에 한국어 음성이 깔려 있지 않아 단어를 읽어 줄 수 없어요.
              한 번만 받아 두면 다음부터는 바로 연습할 수 있어요.
            </ThemedText>
          </View>

          <Card style={styles.card}>
            <ThemedText type="smallBold">받는 방법</ThemedText>
            {STEPS.map((step, index) => (
              <View key={step} style={styles.step}>
                <View
                  style={[styles.stepNo, { backgroundColor: theme.accentTint }]}
                >
                  <ThemedText type="smallBold" style={{ color: theme.accent }}>
                    {index + 1}
                  </ThemedText>
                </View>
                <ThemedText
                  themeColor="textSecondary"
                  type="caption"
                  style={styles.stepText}
                >
                  {step}
                </ThemedText>
              </View>
            ))}
          </Card>

          <ThemedText
            themeColor="textMuted"
            type="caption"
            style={styles.footnote}
          >
            메뉴가 안 보이면 Play 스토어에서 «Google 음성 서비스»를 설치하거나
            업데이트한 뒤 다시 확인해 주세요.
          </ThemedText>
        </ScrollView>

        <View style={styles.actions}>
          <ActionButton
            variant="primary"
            label={checking ? "확인 중…" : "다시 확인"}
            accessibilityLabel="한국어 음성이 깔렸는지 다시 확인"
            disabled={checking}
            onPress={onRetry}
          />
          <ActionButton label="뒤로 가기" disabled={checking} onPress={onBack} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  safe: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  body: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  header: {
    gap: Spacing.two,
  },
  mark: {
    width: 56,
    height: 56,
    borderRadius: Radius.tile,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.one,
  },
  card: {
    gap: Spacing.two,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
  },
  stepNo: {
    width: 24,
    height: 24,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    flex: 1,
  },
  footnote: {
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.two,
  },
});
