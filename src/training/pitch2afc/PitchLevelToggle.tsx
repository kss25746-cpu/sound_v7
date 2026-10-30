import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  PITCH_LEVEL_LABEL,
  PITCH_LEVELS,
  type PitchLevelCents,
} from "@/training/pitch2afc/constants";

const LABEL_BASE_FONT_SIZE = 14;
const LABEL_BASE_LINE_HEIGHT = 20;

/**
 * 고정 단계 토글. idle에서만 노출한다.
 * 선택 강조는 accent 틴트만 쓴다(난이도 색 암시 없음).
 */
export function PitchLevelToggle({
  value,
  onChange,
  disabled,
  style,
  textScale = 1,
}: Readonly<{
  value: PitchLevelCents;
  onChange: (next: PitchLevelCents) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textScale?: number;
}>) {
  const theme = useTheme();
  const scaledLabel =
    textScale === 1
      ? null
      : {
          fontSize: LABEL_BASE_FONT_SIZE * textScale,
          lineHeight: LABEL_BASE_LINE_HEIGHT * textScale,
        };
  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.row, { borderColor: theme.border }, style]}
    >
      {PITCH_LEVELS.map((cents) => {
        const active = cents === value;
        const label = PITCH_LEVEL_LABEL[cents];
        return (
          <Pressable
            key={cents}
            accessibilityRole="radio"
            accessibilityState={{ selected: active, disabled }}
            accessibilityLabel={label}
            disabled={disabled}
            onPress={() => onChange(cents)}
            style={[
              styles.segment,
              active
                ? {
                    backgroundColor: theme.accentTint,
                    borderColor: theme.accent,
                  }
                : {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
            ]}
          >
            <ThemedText
              type="smallBold"
              style={[
                { color: active ? theme.accent : theme.text },
                scaledLabel,
              ]}
            >
              {label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: Radius.pill,
    padding: Spacing.half,
    gap: Spacing.half,
    alignSelf: "center",
  },
  segment: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
    borderRadius: Radius.pill,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    gap: 1,
  },
});
