/**
 * 맞힌 비율(0~100%) 추이 그래프 — 한 글자·두 글자·문장 듣기가 같이 쓴다.
 * 맞힌 비율 추이. 위가 잘함이라 축을 따로 둔다.
 * 여기 숫자는 점수·진단이 아니다(웰니스 방침).
 */

import { useId, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  formatWrsDateShort,
  wrsTimeOrdinal,
  type PercentSessionRecord,
} from "@/training/wrs/wrsTrend";

const CHART_HEIGHT = 132;
const PAD_TOP = 10;
const PAD_BOTTOM = 18;
const PAD_LEFT = 22;
const PAD_RIGHT = 10;
const DOT_R = 3;
const LAST_DOT_R = 5;
const LAST_STROKE = 3;
/** 이하면 회차마다 점. 초과면 첫·끝만. 선·면적은 전부. 세 차트 동일. */
const MAX_ALL_DOTS = 12;
const PERCENT_MAX = 100;
const TICKS = [0, 50, 100] as const;

/** `records`는 시간순(오래→최근). 최소 2점. */
export function PercentTrend({
  records,
}: Readonly<{ records: readonly PercentSessionRecord[] }>) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const gradientId = useId();

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const plotW = Math.max(0, width - PAD_LEFT - PAD_RIGHT);
  const plotH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const baseY = CHART_HEIGHT - PAD_BOTTOM;
  const ordinals = records.map((record) => wrsTimeOrdinal(record.savedAt));
  const minOrd = Math.min(...ordinals);
  const maxOrd = Math.max(...ordinals);
  const spanOrd = maxOrd - minOrd || 1;

  const xy = records.map((record, index) => {
    const x = PAD_LEFT + ((ordinals[index] - minOrd) / spanOrd) * plotW;
    const y =
      PAD_TOP + ((PERCENT_MAX - record.summary.percent) / PERCENT_MAX) * plotH;
    return { x, y };
  });

  const linePath = xy
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
    )
    .join(" ");

  const lastX = xy.at(-1)?.x;
  const firstX = xy.at(0)?.x;
  const areaPath =
    lastX != null && firstX != null
      ? `${linePath} L ${lastX.toFixed(1)} ${baseY} L ${firstX.toFixed(1)} ${baseY} Z`
      : "";

  const first = records[0];
  const last = records.at(-1);

  return (
    <View style={styles.chartWrap}>
      <View style={styles.chartArea} onLayout={onLayout}>
        {width > 0 ? (
          <Svg width={width} height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={theme.accent} stopOpacity={0.22} />
                <Stop offset="1" stopColor={theme.accent} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {TICKS.map((tick) => {
              const y = PAD_TOP + ((PERCENT_MAX - tick) / PERCENT_MAX) * plotH;
              return (
                <Line
                  key={`tick-${tick}`}
                  x1={PAD_LEFT}
                  y1={y}
                  x2={width - PAD_RIGHT}
                  y2={y}
                  stroke={theme.border}
                  strokeWidth={1}
                />
              );
            })}
            {TICKS.map((tick) => {
              const y = PAD_TOP + ((PERCENT_MAX - tick) / PERCENT_MAX) * plotH;
              return (
                <SvgText
                  key={`label-${tick}`}
                  x={2}
                  y={y + 3}
                  fontSize={9}
                  fill={theme.textMuted}
                >
                  {tick}
                </SvgText>
              );
            })}
            <Path d={areaPath} fill={`url(#${gradientId})`} />
            <Path
              d={linePath}
              stroke={theme.accent}
              strokeWidth={2.5}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {xy.map((point, index) => {
              const isLast = index === xy.length - 1;
              const showDot =
                xy.length <= MAX_ALL_DOTS || index === 0 || isLast;
              if (!showDot) {
                return null;
              }
              return (
                <Circle
                  key={`${records[index]?.id}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={isLast ? LAST_DOT_R : DOT_R}
                  fill={isLast ? theme.surface : theme.accent}
                  stroke={isLast ? theme.highlight : theme.accent}
                  strokeWidth={isLast ? LAST_STROKE : 0}
                />
              );
            })}
          </Svg>
        ) : null}
      </View>
      <View style={styles.axisRow}>
        <ThemedText type="small" themeColor="textMuted" style={styles.axisText}>
          {first ? formatWrsDateShort(first.savedAt) : ""}
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted" style={styles.axisText}>
          기록 0~100%
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted" style={styles.axisText}>
          {last ? formatWrsDateShort(last.savedAt) : ""}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrap: {
    gap: Spacing.one,
  },
  chartArea: {
    height: CHART_HEIGHT,
  },
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  axisText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
