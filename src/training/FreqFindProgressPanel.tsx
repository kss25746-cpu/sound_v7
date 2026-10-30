import React from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Card } from "@/components/ui/card";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { SavedFreqFindSessionRecord } from "@/training/sessionStore";
import { BANDS, BAND_INFO, type BandKey } from "@/training/freqFind/source/words";
import { FINAL_LABEL, type ChoiceStatus } from "@/training/freqFind/source/testEngine";
import { SCENE } from "@/training/freqFind/source/theme";

const BAND_DOT_COLOR: Record<BandKey, string> = {
  high: "#F2C94C", // 수면층 (골드/햇빛)
  mid: "#FF7B60",  // 중층 (산호/코랄)
  low: "#38C08A",  // 심해층 (해초/에메랄드)
};

const STATUS_COLOR: Partial<Record<ChoiceStatus, { bg: string; text: string }>> = {
  pass: { bg: "rgba(56, 192, 138, 0.15)", text: "#279C6E" },
  suspect: { bg: "rgba(242, 201, 76, 0.18)", text: "#B88E14" },
  weak: { bg: "rgba(224, 86, 96, 0.15)", text: "#C03E48" },
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${m}월 ${day}일 ${h}:${min}`;
  } catch {
    return iso;
  }
}

export function FreqFindProgressPanel({
  records,
}: Readonly<{ records: readonly SavedFreqFindSessionRecord[] }>) {
  const theme = useTheme();

  if (records.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Card style={styles.card}>
          <ThemedText type="smallBold" style={styles.emptyTitle}>
            아직 탐사 기록이 없어요
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted" style={styles.emptyDesc}>
            소리 찾기 탭에서 수심별 청각 여정을 시작해 보세요.{"\n"}
            탐사를 마치면 이곳에 대역별 청취 상태가 차곡차곡 쌓입니다.
          </ThemedText>
        </Card>
      </View>
    );
  }

  // records[0]이 가장 최근 탐사
  const latest = records[0];

  return (
    <View style={styles.stack}>
      {/* 1. 누적 탐사 요약 카드 */}
      <Card style={styles.card}>
        <ThemedText type="smallBold">누적 탐사 요약</ThemedText>
        <View style={styles.summaryRow}>
          <View style={styles.statBox}>
            <ThemedText type="small" themeColor="textMuted">총 탐사</ThemedText>
            <ThemedText type="title" style={{ color: theme.accent }}>
              {records.length}
              <ThemedText type="small" style={{ color: theme.text }}> 회</ThemedText>
            </ThemedText>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <ThemedText type="small" themeColor="textMuted">최근 탐사</ThemedText>
            <ThemedText type="smallBold" style={{ marginTop: 6 }}>
              {formatDate(latest.savedAt).split(" ")[0]}
            </ThemedText>
          </View>
        </View>
      </Card>

      {/* 2. 최근 수심 대역별 청력 판정 카드 */}
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <ThemedText type="smallBold">최근 수심별 청취 상태</ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            {formatDate(latest.savedAt)} 기준
          </ThemedText>
        </View>

        <View style={styles.bandsContainer}>
          {BANDS.map((band) => {
            const info = BAND_INFO[band];
            const summary = latest.summary?.[band];
            const status: ChoiceStatus = summary?.final ?? "suspect";
            const statusStyle = STATUS_COLOR[status] ?? STATUS_COLOR.suspect!;

            return (
              <View key={band} style={styles.bandItem}>
                <View style={[styles.bandDot, { backgroundColor: BAND_DOT_COLOR[band] }]} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">
                    {SCENE[band].name} · {info.name}{" "}
                    <ThemedText type="small" themeColor="textMuted">
                      ({info.range})
                    </ThemedText>
                  </ThemedText>
                  <ThemedText type="small" themeColor="textMuted" style={{ marginTop: 2 }}>
                    기준 {info.toneHz}Hz · {info.consonants.join(" ")}
                  </ThemedText>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <ThemedText type="smallBold" style={{ color: statusStyle.text }}>
                    {FINAL_LABEL[status] ?? status}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </View>
      </Card>

      {/* 3. 최근 탐사 기록 이력 타임라인 (최대 10개) */}
      <Card style={styles.card}>
        <ThemedText type="smallBold">탐사 기록 이력</ThemedText>
        <View style={styles.historyList}>
          {records.slice(0, 10).map((record) => {
            return (
              <View key={record.id} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">
                    {formatDate(record.savedAt)}
                  </ThemedText>
                </View>

                <View style={styles.historyBadges}>
                  {BANDS.map((band) => {
                    const status: ChoiceStatus =
                      record.summary?.[band]?.final ?? "suspect";
                    const statusStyle =
                      STATUS_COLOR[status] ?? STATUS_COLOR.suspect!;
                    return (
                      <View
                        key={band}
                        style={[
                          styles.miniBadge,
                          { backgroundColor: statusStyle.bg },
                        ]}
                      >
                        <View
                          style={[
                            styles.miniDot,
                            { backgroundColor: BAND_DOT_COLOR[band] },
                          ]}
                        />
                        <ThemedText type="smallBold" style={{ color: statusStyle.text }}>
                          {BAND_INFO[band].name.slice(0, 1)}:
                          {FINAL_LABEL[status]?.slice(0, 2) ?? status}
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </Card>
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: Spacing.one,
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(0, 0, 0, 0.08)",
  },
  bandsContainer: {
    gap: 10,
    marginTop: 4,
  },
  bandItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  bandDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  historyList: {
    gap: 12,
    marginTop: 6,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0, 0, 0, 0.06)",
  },
  historyBadges: {
    flexDirection: "row",
    gap: 4,
  },
  miniBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radius.small,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  emptyWrap: {
    gap: Spacing.three,
  },
  emptyTitle: {
    fontSize: 16,
    marginTop: 4,
  },
  emptyDesc: {
    lineHeight: 22,
    marginTop: 4,
  },
});
