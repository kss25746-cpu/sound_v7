import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** `smallBold`(=버튼 라벨) 기본 크기. textScale 배율의 기준. */
const LABEL_BASE_FONT_SIZE = 14;
const LABEL_BASE_LINE_HEIGHT = 20;

export type ActionButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  /** `primary`는 파란 채움(화면당 하나), `secondary`는 흰 배경 + 테두리. `danger`는 흰 면 + 낮은 채도 빨강 글자. */
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: IconName;
  /** 행 안에서 균등 분할할지. 단독 버튼이면 false. */
  fill?: boolean;
  /** 라벨 글자 배율(기본 1). idle 안내 화면에서만 살짝 키우는 용도. */
  textScale?: number;
  /** 테두리를 글자색과 같게. 통계 하단 3버튼용. */
  outlineMatchLabel?: boolean;
};

/** 시안의 48px 액션 버튼. 화면 하단 행에서 나란히 쓴다. */
export function ActionButton({
  label,
  variant = 'secondary',
  icon,
  fill = true,
  textScale = 1,
  outlineMatchLabel = false,
  disabled,
  ...rest
}: Readonly<ActionButtonProps>) {
  const theme = useTheme();
  const primary = variant === 'primary';
  let contentColor = theme.text;
  if (primary) {
    contentColor = theme.onAccent;
  } else if (variant === 'danger') {
    contentColor = theme.danger;
  }
  const scaledLabel =
    textScale === 1
      ? null
      : {
          fontSize: LABEL_BASE_FONT_SIZE * textScale,
          lineHeight: LABEL_BASE_LINE_HEIGHT * textScale,
        };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        fill && styles.fill,
        primary
          ? [{ backgroundColor: theme.accent }, Shadows.accent]
          : {
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: outlineMatchLabel ? contentColor : theme.border,
            },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
      {...rest}>
      <View style={styles.content}>
        {icon ? <Icon name={icon} size={16} color={contentColor} strokeWidth={2} /> : null}
        <ThemedText type="smallBold" style={[{ color: contentColor }, scaledLabel]}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.4,
  },
});
