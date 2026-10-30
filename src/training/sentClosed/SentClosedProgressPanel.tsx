/**
 * 문장 듣기 기록 본문 — 한 글자 탭과 같은 구성(맞힌 비율 변화 + 최근 연습).
 */

import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Card } from "@/components/ui/card";
import { Spacing } from "@/constants/theme";
import { PercentTrend } from "@/training/PercentTrend";
import {
  formatSentClosedSavedAt,
  type SavedSentClosedRecord,
} from "@/training/sentClosed/store";
import { canShowWrsTrend, chronologicalWrs } from "@/training/wrs/wrsTrend";

export function SentClosedProgressPanel({
  records,
}: Readonly<{ records: readonly SavedSentClosedRecord[] }>) {
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
            청력 검사가 아니에요.
          </ThemedText>
          <PercentTrend records={chronologicalWrs(records)} />
        </Card>
      ) : null}
      <SentClosedRecentList records={records} />
    </View>
  );
}

function SentClosedRecentList({
  records,
}: Readonly<{ records: readonly SavedSentClosedRecord[] }>) {
  const recent = records.slice(0, 8);
  return (
    <Card style={styles.card}>
      <ThemedText type="smallBold">최근 연습</ThemedText>
      {recent.map((record) => (
        <View key={record.id} style={styles.historyRow}>
          <ThemedText type="mono" themeColor="textMuted">
            {formatSentClosedSavedAt(record.savedAt)}
          </ThemedText>
          <ThemedText type="smallBold">
            {`${record.summary.correctCount}/${record.summary.trialCount} · 약 ${record.summary.percent}%`}
          </ThemedText>
        </View>
      ))}
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
