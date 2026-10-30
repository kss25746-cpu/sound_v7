import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Colors, Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'small'
    | 'smallBold'
    | 'caption'
    | 'subtitle'
    | 'heading'
    | 'screenTitle'
    | 'metric'
    | 'mono'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'caption' && styles.caption,
        type === 'subtitle' && styles.subtitle,
        type === 'heading' && styles.heading,
        type === 'screenTitle' && styles.screenTitle,
        type === 'metric' && styles.metric,
        type === 'mono' && styles.mono,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  /**
   * 캡션·안내·타임스탬프 등 2차 본문. 14px 하한을 지키는 유일한 캡션 자리.
   * 화면에서 fontSize를 11~13으로 인라인으로 줄이지 말 것 — 이 타입을 쓴다.
   * (고령·난청 사용자 가독성: 14px 미만 금지.)
   */
  caption: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
    fontWeight: 600,
  },
  /** 트랙 진입 화면의 큰 제목. */
  heading: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: 700,
    letterSpacing: -0.3,
  },
  /** 목록·요약 등 일반 화면 제목. */
  screenTitle: {
    fontSize: 23,
    lineHeight: 30,
    fontWeight: 700,
    letterSpacing: -0.2,
  },
  /** 계기판처럼 읽히는 큰 수치. */
  metric: {
    fontFamily: Fonts.mono,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: 600,
  },
  /** 배지·타임스탬프 등 수치. 크기는 `small`과 같다 — 14px 하한 때문에 더 줄이지 않는다. */
  mono: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 600,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  /** 강조 링크. 색은 accent 토큰(하드코딩 금지). */
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: Colors.light.accent,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 14,
  },
});
