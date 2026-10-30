import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CardProps = ViewProps & {
  /** `large`는 요약처럼 내용이 많은 카드(반경·여백이 조금 더 큼). */
  size?: 'default' | 'large';
};

/** 시안의 흰 카드 — 옅은 테두리 + 아주 약한 그림자. */
export function Card({ style, size = 'default', ...rest }: Readonly<CardProps>) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        size === 'large' && styles.large,
        { backgroundColor: theme.surface, borderColor: theme.border },
        style,
      ]}
      {...rest}
    />
  );
}

/** 카드 안쪽 가로 구분선. */
export function CardDivider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.large - 2,
    padding: Spacing.three,
    ...Shadows.card,
  },
  large: {
    borderRadius: Radius.large,
    padding: Spacing.four - 4,
  },
  divider: {
    height: 1,
    alignSelf: 'stretch',
  },
});
