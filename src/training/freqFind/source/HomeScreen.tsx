// screens/HomeScreen.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";
import { getLatestFreqFindSession, type SavedFreqFindSessionRecord } from "@/training/sessionStore";

import { SeaBackground, WaveButton, Card, SeaTextButton, SeaIconButton } from "./Sea";
import { C, S, T, SCENE, SEA_TEXT_SHADOW } from "./theme";
import { BANDS, BAND_INFO, type BandKey } from "./words";
import { FINAL_LABEL } from "./testEngine";

interface HomeScreenProps {
  /** 「여정 시작」. 곧바로 1단계로 간다. */
  onStart: () => void;
  onBack?: () => void;
  onOpenStats?: () => void;
  onViewResult?: (record?: SavedFreqFindSessionRecord) => void;
  recentSession?: SavedFreqFindSessionRecord | null;
}

function formatSavedAt(isoString: string): string {
  try {
    const d = new Date(isoString);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${m}월 ${day}일 ${h}:${min}`;
  } catch {
    return isoString;
  }
}

function badgeColorOf(status: string): string {
  if (status === "pass") return C.right;
  if (status === "weak") return C.wrong;
  return C.gold;
}

export default function HomeScreen({
  onStart,
  onBack,
  onOpenStats,
  onViewResult,
  recentSession,
}: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const [showGuide, setShowGuide] = useState(false);
  const [latestSession, setLatestSession] = useState<SavedFreqFindSessionRecord | null>(
    recentSession ?? null
  );

  useEffect(() => {
    if (recentSession !== undefined) {
      // 부모가 준 값은 activeSession이 직접 쓴다. 여기서는 불러오기만 건너뛴다.
      return;
    }
    let unmounted = false;
    void getLatestFreqFindSession().then((record) => {
      if (!unmounted) {
        setLatestSession(record);
      }
    });
    return () => {
      unmounted = true;
    };
  }, [recentSession]);

  const activeSession = recentSession !== undefined ? recentSession : latestSession;

  return (
    <SeaBackground scene="neutral" showFish={false}>
      <ScrollView
        contentContainerStyle={[
          styles.wrap,
          {
            paddingTop: Math.max(insets.top + 12, 44),
            paddingBottom: Math.max(insets.bottom + 24, 48),
            paddingHorizontal: Math.max(insets.left, insets.right, S.pad),
          },
        ]}
      >
        <View style={styles.topRow}>
          {onBack ? (
            <SeaTextButton
              title="뒤로 가기"
              icon="chevronLeft"
              onPress={onBack}
              accessibilityLabel="뒤로 가기"
              gray
            />
          ) : (
            <View style={{ flex: 1 }} />
          )}

          {onOpenStats ? (
            <View style={styles.headerActions}>
              <SeaIconButton
                icon="chart"
                onPress={onOpenStats}
                accessibilityLabel="탐사 기록 통계 보기"
                gray
              />
            </View>
          ) : null}
        </View>

        <View style={styles.hero}>
          <Icon name="frequency" size={64} color={C.white} />
          {/* 히어로는 배경이 가장 밝은 띠에 앉는다 — 헤더 그늘에 더해 글자도 윤곽을 세운다. */}
          <Text style={[T.title, SEA_TEXT_SHADOW, { marginTop: 14 }]}>소리를 찾는 바다</Text>
          <Text style={[T.tiny, SEA_TEXT_SHADOW, { textAlign: "center", marginTop: 8 }]}>
            병원 검사가 아니에요
          </Text>
        </View>

        <View style={styles.startActions}>
          <WaveButton title="여정 시작" onPress={onStart} />
        </View>

        {activeSession ? (
          <Card style={styles.recentCard}>
            <View style={styles.recentHeader}>
              <View style={styles.rowCenter}>
                <Icon name="compass" size={18} color={C.mid} strokeWidth={1.8} />
                <Text style={T.label}>최근 탐사 기록</Text>
              </View>
              <Text style={T.bodySoft}>{formatSavedAt(activeSession.savedAt)}</Text>
            </View>

            <View style={styles.recentBandsRow}>
              {BANDS.map((band: BandKey) => {
                const status = activeSession.summary[band]?.final ?? "unknown";
                return (
                  <View key={band} style={styles.recentBandItem}>
                    <View
                      style={[styles.recentBandDot, { backgroundColor: SCENE[band].colors[2] }]}
                    />
                    <Text style={T.bodySoft}>{BAND_INFO[band].name}</Text>
                    <View
                      style={[styles.recentBandBadge, { backgroundColor: badgeColorOf(status) }]}
                    >
                      <Text style={styles.recentBandBadgeText}>
                        {FINAL_LABEL[status] ?? status}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {onViewResult ? (
              <WaveButton
                title="지난 결과 보기"
                icon="compass"
                tone="secondary"
                onPress={() => onViewResult(activeSession)}
                accessibilityLabel="지난 결과 보기"
              />
            ) : null}
          </Card>
        ) : null}

        <View style={[styles.guideBlock, activeSession ? { marginTop: S.gap } : null]}>
          <Pressable
            onPress={() => setShowGuide((v) => !v)}
            style={({ pressed }) => [styles.guideToggle, pressed ? { opacity: 0.7 } : null]}
            accessibilityRole="button"
            accessibilityState={{ expanded: showGuide }}
            accessibilityLabel="여정이 궁금해요"
          >
            <Text style={[T.tiny, SEA_TEXT_SHADOW]}>여정이 궁금해요</Text>
            <Icon
              name={showGuide ? "chevronUp" : "chevronDown"}
              size={16}
              color={C.white}
              strokeWidth={2}
            />
          </Pressable>

          {showGuide ? (
            <Card style={styles.guideCard}>
              <Text style={T.label}>여정은 네 단계예요</Text>
              <Step n="1" title="소리의 파동" desc="들리는지 확인해요" />
              <Step n="2" title="바다 둘러보기" desc="알맞은 그림을 고르세요" />
              <Step n="3" title="깊이 들어가기" desc="흐릿했던 소리만 다시 봐요" />
              <Step n="4" title="마주 보는 두 소리" desc="비슷한 두 단어를 구별해요" />
              <View style={styles.guideDivider} />
              <Text style={T.bodySoft}>
                위가 높은 소리(수면), 아래가 낮은 소리(심해)예요.
              </Text>
              <Text style={T.bodySoft}>깊이는 화면 표현이고, 검사 결과가 아니에요.</Text>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </SeaBackground>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text>
          <Text style={T.label}>{title}</Text>
          <Text style={T.bodySoft}> — {desc}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: S.pad },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 6 },
  hero: { alignItems: "center", marginBottom: 20 },
  startActions: { marginBottom: 28 },
  step: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.mid,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { color: C.white, fontWeight: "700", fontSize: 14, lineHeight: 20 },
  guideBlock: { gap: 10 },
  guideToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 40,
    paddingVertical: 6,
  },
  guideCard: { gap: S.gap },
  guideDivider: {
    height: 1,
    backgroundColor: "rgba(8,32,61,0.08)",
  },
  recentCard: {
    gap: 12,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recentBandsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(8,32,61,0.08)",
  },
  recentBandItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(8,32,61,0.04)",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  recentBandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recentBandBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  recentBandBadgeText: {
    color: C.white,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
});
