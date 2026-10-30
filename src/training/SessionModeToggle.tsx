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
  MEASURE_TARGET_REVERSALS,
  sessionModeLabel,
  type SessionMode,
} from "@/training/sessionMode";

/**
 * 귀풀기/연습 세그먼트 토글. idle 단계에서만 노출한다(진행 중엔 숨김).
 *
 * 색·게이지로 난이도를 암시하지 않는다는 화면 방침을 지키기 위해,
 * 선택 강조는 accent 틴트 한 겹만 쓴다.
 */
/** 라벨(smallBold)·힌트 기본 크기. textScale 배율의 기준. */
const LABEL_BASE_FONT_SIZE = 14;
const LABEL_BASE_LINE_HEIGHT = 20;
const HINT_BASE_FONT_SIZE = 10.5;
const HINT_BASE_LINE_HEIGHT = 14;

export function SessionModeToggle({
  value,
  onChange,
  disabled,
  style,
  textScale = 1,
}: Readonly<{
  value: SessionMode;
  onChange: (next: SessionMode) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** 라벨·힌트 글자 배율(기본 1). idle 안내 화면에서만 살짝 키우는 용도. */
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
  const scaledHint =
    textScale === 1
      ? styles.hint
      : {
          fontSize: HINT_BASE_FONT_SIZE * textScale,
          lineHeight: HINT_BASE_LINE_HEIGHT * textScale,
        };

  const options: readonly {
    key: SessionMode;
    label: string;
    hint: string;
  }[] = [
    {
      key: "practice",
      label: sessionModeLabel("practice"),
      hint: "직접 종료",
    },
    {
      key: "measure",
      label: sessionModeLabel("measure"),
      hint: `전환 ${MEASURE_TARGET_REVERSALS}번`,
    },
  ];

  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.row, { borderColor: theme.border }, style]}
    >
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: active, disabled }}
            accessibilityLabel={`${opt.label} · ${opt.hint}`}
            disabled={disabled}
            onPress={() => onChange(opt.key)}
            style={[
              styles.segment,
              active
                ? {
                    backgroundColor: theme.accentTint,
                    borderColor: theme.accent,
                  }
                : {
                    // ActionButton secondary · Pill surface와 같게 — 흰 면+테두리 = 누를 수 있음.
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
              {opt.label}
            </ThemedText>
            {/* 활성이면 바닥이 accentTint라 textMuted·textSecondary는 AA 미달 → 라벨과 같은 accent. */}
            <ThemedText
              type="small"
              style={[
                { color: active ? theme.accent : theme.textSecondary },
                scaledHint,
              ]}
            >
              {opt.hint}
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
    // 선택·비선택 모두 테두리를 켜되 두께는 같게 — 글자가 밀리지 않게.
    borderWidth: 1.5,
    borderColor: "transparent",
    borderRadius: Radius.pill,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.four,
    gap: 1,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
  },
});
