/**
 * 듣고 고르기 기록 본문 — 단어·문장 듣기와 같은 구성(맞힌 비율 변화 + 최근 연습).
 * 기록 형식이 셋 다 같은 모양이라 `PercentTrend`를 그대로 쓴다.
 */

import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Card } from "@/components/ui/card";
import { Spacing } from "@/constants/theme";
import { formatInstSavedAt, type SavedInstRecord } from "@/training/inst/instStore";
import { PercentTrend } from "@/training/PercentTrend";
import { canShowWrsTrend, chronologicalWrs } from "@/training/wrs/wrsTrend";

export function InstProgressPanel({
  records,
}: Readonly<{ records: readonly SavedInstRecord[] }>) {
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
      <InstRecentList records={records} />
    </View>
  );
}

function InstRecentList({
  records,
}: Readonly<{ records: readonly SavedInstRecord[] }>) {
  const recent = records.slice(0, 8);
  return (
    <Card style={styles.card}>
      <ThemedText type="smallBold">최근 연습</ThemedText>
      {recent.map((record) => (
        <View key={record.id} style={styles.historyRow}>
          <ThemedText type="mono" themeColor="textMuted">
            {formatInstSavedAt(record.savedAt)}
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
