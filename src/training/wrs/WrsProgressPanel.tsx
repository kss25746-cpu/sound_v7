import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Card } from "@/components/ui/card";
import { Spacing } from "@/constants/theme";
import { PercentTrend } from "@/training/PercentTrend";
import { formatWrsSavedAt } from "@/training/wrs/wrsStore";
import {
  canShowWrsTrend,
  chronologicalWrs,
  type PercentSessionRecord,
} from "@/training/wrs/wrsTrend";

export function WrsProgressPanel({
  records,
}: Readonly<{ records: readonly PercentSessionRecord[] }>) {
  if (records.length === 0) {
    return null;
  }

  const showTrend = canShowWrsTrend(records);

  return (
    <View style={styles.stack}>
      {showTrend ? (
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
      <WrsRecentList records={records} />
    </View>
  );
}

function WrsRecentList({
  records,
}: Readonly<{ records: readonly PercentSessionRecord[] }>) {
  const recent = records.slice(0, 8);
  return (
    <Card style={styles.card}>
      <ThemedText type="smallBold">최근 연습</ThemedText>
      {recent.map((record) => (
        <View key={record.id} style={styles.historyRow}>
          <ThemedText type="mono" themeColor="textMuted">
            {formatWrsSavedAt(record.savedAt)}
          </ThemedText>
          <ThemedText type="smallBold">
            {record.summary.correctCount}/{record.summary.trialCount} · 약{" "}
            {record.summary.percent}%
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
