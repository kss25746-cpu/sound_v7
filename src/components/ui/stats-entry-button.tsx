import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Icon } from "@/components/ui/icon";
import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type StatsEntryButtonProps = {
  onPress: () => void;
  /** 통계 버튼이 한 화면에 여럿일 때 종목을 구분하는 라벨(기본 "연습 통계 보기"). */
  accessibilityLabel?: string;
  /** 아이콘 아래 짧은 글자. 없으면 아이콘만(다른 탭과 같은 크기). */
  label?: string;
};

/** 헤더 우측 — 측정 통계 화면 진입. 탭마다 같은 그림. */
export function StatsEntryButton({
  onPress,
  accessibilityLabel = "연습 통계 보기",
  label,
}: Readonly<StatsEntryButtonProps>) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        label ? styles.buttonLabeled : null,
        {
          backgroundColor: theme.accentTint,
          borderColor: theme.accentBorder,
        },
        pressed && styles.pressed,
      ]}
    >
      <Icon name="chart" size={label ? 22 : 28} color={theme.accent} />
      {label ? (
        <ThemedText
          type="smallBold"
          style={[styles.label, { color: theme.accent }]}
          numberOfLines={1}
        >
          {label}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 60,
    height: 40,
    borderRadius: Radius.small + 1,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabeled: {
    height: 56,
    gap: 0,
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.7,
  },
});
