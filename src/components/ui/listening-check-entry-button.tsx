import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Icon } from "@/components/ui/icon";
import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type ListeningCheckEntryButtonProps = {
  onPress: () => void;
  /** 아이콘 아래 짧은 글자. 없으면 아이콘만(다른 탭과 같은 크기). */
  label?: string;
};

/** 헤더 우측 — 듣기 준비(재생 확인). 통계 버튼과 같은 크기. */
export function ListeningCheckEntryButton({
  onPress,
  label,
}: Readonly<ListeningCheckEntryButtonProps>) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="듣기 준비"
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
      <Icon name="headphones" size={label ? 22 : 28} color={theme.accent} />
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
