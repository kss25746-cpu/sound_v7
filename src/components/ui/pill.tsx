import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** mono·small 기본 크기(둘 다 14/20). `themed-text.tsx`의 같은 타입과 값을 맞춘다. */
const MONO_BASE = { fontSize: 14, lineHeight: 20 };
const SMALL_BASE = { fontSize: 14, lineHeight: 20 };

type PillProps = {
  label: string;
  icon?: IconName;
  /** 수치가 섞인 문구는 모노스페이스로(진행 상황 배지 등). */
  mono?: boolean;
  /** 가로로 꽉 채울지(요약 화면의 저장 안내처럼). */
  stretch?: boolean;
  /** 라벨 글자 배율(기본 1). idle 안내 화면에서만 살짝 키우는 용도. */
  textScale?: number;
  /** `surface`는 흰 면+테두리(훈련 진행 pill). 기본은 연한 강조 면. */
  variant?: 'accent' | 'surface';
};

/** 시안의 알약 배지 — 옅은 파랑 배경 + 파란 글자. */
export function Pill({
  label,
  icon,
  mono = false,
  stretch = false,
  textScale = 1,
  variant = 'accent',
}: Readonly<PillProps>) {
  const theme = useTheme();
  const surface = variant === 'surface';
  const base = mono ? MONO_BASE : SMALL_BASE;
  // mono·small이 같은 크기가 되면서 `surface` 전용 크기(13/18)는 없어졌다 — 배율만 남는다.
  const scaledLabel =
    textScale === 1
      ? null
      : {
          fontSize: base.fontSize * textScale,
          lineHeight: base.lineHeight * textScale,
        };

  return (
    <View
      style={[
        styles.pill,
        stretch ? styles.stretch : styles.hug,
        surface
          ? {
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.border,
              paddingVertical: 6,
              paddingHorizontal: 14,
            }
          : { backgroundColor: theme.accentTint },
      ]}>
      {icon ? (
        <Icon
          name={icon}
          size={14}
          color={surface ? theme.text : theme.accent}
          strokeWidth={2.2}
        />
      ) : null}
      <ThemedText
        type={mono ? 'mono' : 'small'}
        style={[{ color: surface ? theme.text : theme.accent }, scaledLabel]}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two - 2,
    paddingVertical: Spacing.two - 2,
    paddingHorizontal: Spacing.three - 2,
    borderRadius: Radius.pill,
  },
  hug: {
    alignSelf: 'center',
  },
  stretch: {
    alignSelf: 'stretch',
  },
});
