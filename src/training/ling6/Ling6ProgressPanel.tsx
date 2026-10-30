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
import { Card } from "@/components/ui/card";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  LING6_WEAKNESS_WINDOW,
  ling6WeaknessSnapshot,
  SOUND_TRIAL_COUNT,
  type Ling6WeaknessSnapshot,
} from "@/training/ling6/ling6Session";
import {
  formatDateKeyShort,
  type SavedLing6Record,
} from "@/training/ling6/ling6Store";
import { LING6_SOUNDS } from "@/training/ling6/sounds";

const CHART_HEIGHT = 132;
const PAD_TOP = 10;
const PAD_BOTTOM = 18;
const PAD_LEFT = 18;
const PAD_RIGHT = 10;
const DOT_R = 3;
const LAST_DOT_R = 5;
const LAST_STROKE = 3;
/** 이하면 회차마다 점. 초과면 첫·끝만. 선·면적은 전부. 세 차트 동일. */
const MAX_ALL_DOTS = 12;
const BAR_MAX_H = 56;
const BAR_STUB_H = 3;

function chronological(
  records: readonly SavedLing6Record[],
): SavedLing6Record[] {
  return [...records].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

function dateOrdinal(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1) / 86_400_000;
}

const EMPTY_TREND_COPY = "내일 또 하면 선이 생겨요";

export function Ling6ProgressPanel({
  records,
}: Readonly<{ records: readonly SavedLing6Record[] }>) {
  if (records.length === 0) {
    return null;
  }

  const rows = chronological(records);
  const showTrend = rows.length >= 2;
  const weakness = ling6WeaknessSnapshot(
    records.map((record) => ({
      dateKey: record.dateKey,
      byPhoneme: record.summary.byPhoneme,
    })),
  );

  return (
    <View style={styles.stack}>
      {weakness.ready ? (
        <Card style={styles.card}>
          <ThemedText type="smallBold">최근 7번</ThemedText>
          <Ling6WeaknessBars snapshot={weakness} />
          {weakness.copy ? (
            <ThemedText type="smallBold" style={styles.weaknessCopy}>
              {weakness.copy}
            </ThemedText>
          ) : null}
        </Card>
      ) : null}

      <Card style={styles.card}>
        <ThemedText type="smallBold">맞힌 개수 변화</ThemedText>
        {showTrend ? (
          <>
            <ThemedText type="smallBold" style={styles.howToRead}>
              높을수록 더 많이 맞춤
            </ThemedText>
            <Ling6PassTrend records={rows} />
          </>
        ) : (
          <ThemedText
            type="small"
            themeColor="textMuted"
            style={styles.emptyTrend}
          >
            {EMPTY_TREND_COPY}
          </ThemedText>
        )}
      </Card>
    </View>
  );
}

function Ling6WeaknessBars({
  snapshot,
}: Readonly<{ snapshot: Ling6WeaknessSnapshot }>) {
  const theme = useTheme();
  const highlighted = new Set(snapshot.highlighted);

  return (
    <View style={styles.barsRow}>
      {LING6_SOUNDS.map((sound) => {
        const missCount = snapshot.missCounts[sound.id];
        const isHot = highlighted.has(sound.id);
        const fillH =
          missCount <= 0
            ? BAR_STUB_H
            : Math.max(
                BAR_STUB_H,
                (missCount / LING6_WEAKNESS_WINDOW) * BAR_MAX_H,
              );

        return (
          <View key={sound.id} style={styles.barCol}>
            <View
              accessibilityLabel={`${sound.label} /${sound.ipa}/ 아쉬움 ${missCount}회`}
              style={[styles.barTrack, { backgroundColor: theme.borderSubtle }]}
            >
              <View
                style={[
                  styles.barFill,
                  {
                    height: fillH,
                    backgroundColor: isHot ? theme.highlight : theme.chartMuted,
                  },
                ]}
              />
            </View>
            <ThemedText
              type="small"
              themeColor={isHot ? "text" : "textMuted"}
              style={styles.barIpa}
            >
              /{sound.ipa}/
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

function Ling6PassTrend({
  records,
}: Readonly<{ records: readonly SavedLing6Record[] }>) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const gradientId = useId();

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const plotW = Math.max(0, width - PAD_LEFT - PAD_RIGHT);
  const plotH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const baseY = CHART_HEIGHT - PAD_BOTTOM;
  const ordinals = records.map((record) => dateOrdinal(record.dateKey));
  const minOrd = Math.min(...ordinals);
  const maxOrd = Math.max(...ordinals);
  const spanOrd = maxOrd - minOrd || 1;

  const xy = records.map((record, index) => {
    const x =
      records.length === 1
        ? PAD_LEFT + plotW / 2
        : PAD_LEFT + ((ordinals[index] - minOrd) / spanOrd) * plotW;
    const y =
      PAD_TOP +
      ((SOUND_TRIAL_COUNT - record.summary.passCount) / SOUND_TRIAL_COUNT) *
        plotH;
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

  const ticks = [0, 3, 6];
  const first = records.at(0);
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
            {ticks.map((tick) => {
              const y =
                PAD_TOP +
                ((SOUND_TRIAL_COUNT - tick) / SOUND_TRIAL_COUNT) * plotH;
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
            {ticks.map((tick) => {
              const y =
                PAD_TOP +
                ((SOUND_TRIAL_COUNT - tick) / SOUND_TRIAL_COUNT) * plotH;
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
                  key={`${records[index]?.dateKey}-${index}`}
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
          {first ? formatDateKeyShort(first.dateKey) : ""}
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted" style={styles.axisText}>
          기록 0~6
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted" style={styles.axisText}>
          {last ? formatDateKeyShort(last.dateKey) : ""}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.two,
  },
  howToRead: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyTrend: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    paddingVertical: Spacing.three,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  barTrack: {
    width: "70%",
    height: BAR_MAX_H,
    justifyContent: "flex-end",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 4,
  },
  barIpa: {
    fontSize: 14,
    lineHeight: 20,
  },
  weaknessCopy: {
    fontSize: 14,
    lineHeight: 20,
  },
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
