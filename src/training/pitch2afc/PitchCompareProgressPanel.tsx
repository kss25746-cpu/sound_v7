/**
 * 높낮이 비교 기록 — 문장 듣기와 같은 구성(맞힌 비율 변화 + 최근 n/12).
 */

import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Card } from "@/components/ui/card";
import { Spacing } from "@/constants/theme";
import { PercentTrend } from "@/training/PercentTrend";
import type { SavedPitch2SessionRecord } from "@/training/sessionStore";
import { formatSentClosedSavedAt } from "@/training/sentClosed/store";
import { canShowWrsTrend, chronologicalWrs } from "@/training/wrs/wrsTrend";

export function PitchCompareProgressPanel({
  records,
}: Readonly<{ records: readonly SavedPitch2SessionRecord[] }>) {
  if (records.length === 0) {
    return null;
  }

  return (
    <View style={styles.stack}>
      {canShowWrsTrend(records) ? (
        <Card style={styles.card}>
          <ThemedText type="smallBold">맞힌 비율 변화</ThemedText>
          <ThemedText type="smallBold" style={styles.howToRead}>
            높을수록 더 많이 맞춤
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted" style={styles.note}>
            그 간격에서 맞힌 비율이에요. 청력 검사가 아니에요.
          </ThemedText>
          <PercentTrend records={chronologicalWrs(records)} />
        </Card>
      ) : null}
      <PitchCompareRecentList records={records} />
    </View>
  );
}

function PitchCompareRecentList({
  records,
}: Readonly<{ records: readonly SavedPitch2SessionRecord[] }>) {
  const recent = records.slice(0, 8);
  return (
    <Card style={styles.card}>
      <ThemedText type="smallBold">최근 연습</ThemedText>
      {recent.map((record) => {
        const level =
          record.summary.levelCents == null
            ? null
            : `${record.summary.levelCents}`;
        return (
          <View key={record.id} style={styles.historyRow}>
            <ThemedText type="mono" themeColor="textMuted">
              {formatSentClosedSavedAt(record.savedAt)}
            </ThemedText>
            <ThemedText type="smallBold">
              {level == null
                ? `${record.summary.correctCount}/${record.summary.trialCount} · 약 ${record.summary.percent}%`
                : `${level} · ${record.summary.correctCount}/${record.summary.trialCount} · 약 ${record.summary.percent}%`}
            </ThemedText>
          </View>
        );
      })}
    </Card>
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
  note: {
    fontSize: 14,
    lineHeight: 20,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
});
