// screens/ResultScreen.tsx
import React, { useState, useMemo, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";
import { SeaBackground, WaveButton, Card, NoteBox, SeaIconButton } from "./Sea";
import { C, S, T, SCENE, SEA_TEXT_SHADOW } from "./theme";
import { BANDS, BAND_INFO, MINIMAL_PAIRS, type BandKey } from "./words";
import { FINAL_LABEL, type SummaryResult, type ChoiceStatus } from "./testEngine";
import OceanDepthMap from "./OceanDepthMap";
import { audio } from "./audioAdapter";
import { hapticFeedback } from "./haptics";
import { hasWordAudio } from "./wordAudioAssets";

/** 한글 받침 있으면 이, 없으면 가. 결론 문장용. */
function iGa(word: string): "이" | "가" {
  const code = word.charCodeAt(word.length - 1);
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return "가";
  return (code - 0xac00) % 28 === 0 ? "가" : "이";
}

const TONE_LABEL: Record<string, string> = {
  ok: "모두 들림",
  watch: "일부 놓침",
  weak: "대부분 놓침",
};

interface ExamplePair {
  left: string;
  right: string;
  diff: string;
}

function pairLabel(p: ExamplePair): string {
  return `${p.left} ↔ ${p.right}`;
}

const PAIR_PREVIEW_COUNT = 2;
const PAIR_ROW_GAP = 8;

// 취약 대역별 맞춤 음향학적 분석 및 추천 훈련 정보
interface TrainingGuideInfo {
  title: string;
  problem: string;
  solution: string;
  examplePairs: readonly ExamplePair[];
  accentColor: string;
}

/** 4단계 실단어만. 꼭포·오박처럼 없는 단어·음원 없는 쌍은 뺀다. 고르는 규칙은 이전과 같다. */
function examplePairsFor(band: BandKey): ExamplePair[] {
  return MINIMAL_PAIRS.filter(
    (p) =>
      (p.a.band === band || p.b.band === band) &&
      hasWordAudio(p.a.word) &&
      hasWordAudio(p.b.word)
  ).map((p) => ({
    left: p.a.word,
    right: p.b.word,
    diff: p.diff,
  }));
}

const BAND_GUIDES: Record<BandKey, TrainingGuideInfo> = {
  high: {
    title: "수면층 · 치찰음·마찰음",
    problem: "ㅅ·ㅆ·ㅊ·ㅈ 같은 날카로운 소리가 흐릿해 다른 자음으로 들리기 쉬워요.",
    solution: "대립쌍으로 그 자음만 반복해 들으며 또렷하게 잡아 보세요.",
    examplePairs: examplePairsFor("high"),
    accentColor: C.gold,
  },
  mid: {
    title: "중층 · 대화 명료도·폐쇄음",
    problem: "ㄱ·ㅋ·ㅂ·ㅍ·ㅎ의 파열이 약해져 말이 덜 또렷할 수 있어요.",
    solution: "그 자음이 든 단어를 집중해서 듣고 구별해 보세요.",
    examplePairs: examplePairsFor("mid"),
    accentColor: C.coral,
  },
  low: {
    title: "심해층 · 비음·유음",
    problem: "ㄴ·ㅁ·ㄹ 울림이 약해져 콧소리·연결음이 뭉개질 수 있어요.",
    solution: "비슷한 모음의 대립쌍으로 울림을 비교해 들어 보세요.",
    examplePairs: examplePairsFor("low"),
    accentColor: C.seaweed,
  },
};

interface ResultScreenProps {
  summary: SummaryResult;
  onRestart: () => void;
  onOpenStats?: () => void;
  onHome?: () => void;
  onExit?: () => void;
  onCustomTrain?: (band: BandKey) => void;
}

export default function ResultScreen({
  summary,
  onRestart,
  onOpenStats,
  onHome,
  onExit,
  onCustomTrain,
}: ResultScreenProps) {
  const insets = useSafeAreaInsets();
  const weak = BANDS.filter((b) => summary[b]?.final === "weak" || summary[b]?.final === "suspect");
  const allClear = weak.length === 0;
  const [selectedBand, setSelectedBand] = useState<BandKey | null>(null);
  // 결과 화면은 결론·지도·다음 행동 3블록만 먼저 보인다(2026-09-14).
  // 가이드(문제·연습 쌍·집중 음소)는 「자세히 보기」. 단계별 숫자는 그 안에서 한 번 더 접는다.
  const [showDetails, setShowDetails] = useState(false);
  const [showScoreDetails, setShowScoreDetails] = useState(false);
  const [showAllPairs, setShowAllPairs] = useState<Partial<Record<BandKey, boolean>>>({});
  const [activeCompare, setActiveCompare] = useState<{ band: BandKey; pair: string } | null>(null);

  const weakNames = weak.map((b) => SCENE[b].name);
  const lastName = weakNames[weakNames.length - 1] ?? "";
  const conclusion = allClear
    ? "모든 깊이가 또렷하게 들렸어요"
    : weak.length === BANDS.length
      ? "모든 깊이가 흐릿하게 들렸어요"
      : `${weakNames.join("·")}${iGa(lastName)} 흐릿하게 들렸어요`;
  const practiceGuide =
    weak.length === BANDS.length
      ? "세 깊이 모두 흐릿해요. 골라 연습해요."
      : `흐릿한 깊이 ${weak.length}곳만 연습해요.`;

  return (
    <SeaBackground scene="neutral" showFish={false}>
      <ScrollView
        contentContainerStyle={[
          styles.wrap,
          {
            paddingTop: Math.max(insets.top + 12, 44),
            paddingBottom: Math.max(insets.bottom + 24, 60),
            paddingHorizontal: Math.max(insets.left, insets.right, S.pad),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {onOpenStats ? (
          <View style={styles.topRow}>
            <View style={{ flex: 1 }} />
            <View style={styles.headerActions}>
              <SeaIconButton
                icon="chart"
                onPress={onOpenStats}
                accessibilityLabel="탐사 기록 통계 보기"
              />
            </View>
          </View>
        ) : null}

        {/* 1. 결론 — 지도의 한 줄 설명. 큰 아이콘은 없다. */}
        <View style={styles.hero}>
          <Text style={[T.title, SEA_TEXT_SHADOW, { textAlign: "center" }]}>
            {conclusion}
          </Text>
          <View style={styles.savedBadge}>
            <Icon name="check" size={16} color={C.white} strokeWidth={2.2} />
            <Text style={[styles.badgeText, SEA_TEXT_SHADOW]}>기록 저장됨</Text>
          </View>
        </View>

        {/* 2. 수심 지도 */}
        <OceanDepthMap
          summary={summary}
          selectedBand={selectedBand}
          onSelectBand={(b) => setSelectedBand(selectedBand === b ? null : b)}
        />

        {/* 3. 다음 행동 */}
        <Card style={{ marginTop: S.gap, gap: 12 }}>
          <Text style={[T.body, { fontWeight: "700" }]}>다음에 할 일</Text>

          {allClear ? (
            <Text style={T.bodySoft}>
              지금의 듣기 상태를 유지하려면 한 달에 한 번 다시 점검해 보세요.
            </Text>
          ) : (
            <>
              <Text style={T.bodySoft}>{practiceGuide}</Text>
              {onCustomTrain
                ? weak.map((b) => (
                    <View key={b} style={styles.practiceLayerRow}>
                      <View style={[styles.dot, { backgroundColor: SCENE[b].colors[2] }]} />
                      <View style={styles.practiceLayerText}>
                        <Text style={[T.body, { fontWeight: "700" }]}>{SCENE[b].name}</Text>
                        <Text style={T.bodySoft}>흐릿</Text>
                      </View>
                      <View style={styles.practiceLayerBtn}>
                        <WaveButton
                          title="연습"
                          icon="play"
                          accessibilityLabel={`${SCENE[b].name} 연습`}
                          onPress={() => {
                            void hapticFeedback.selection();
                            onCustomTrain(b);
                          }}
                        />
                      </View>
                    </View>
                  ))
                : null}
            </>
          )}

          <Pressable
            onPress={() => {
              setShowDetails((prev) => !prev);
              setShowScoreDetails(false);
              setShowAllPairs({});
            }}
            style={styles.detailToggleRow}
            accessibilityRole="button"
            accessibilityState={{ expanded: showDetails }}
            accessibilityLabel={showDetails ? "자세한 결과 접기" : "자세한 결과 보기"}
          >
            <View style={styles.cardHeaderRow}>
              <Icon name="list" size={20} color={C.ink} strokeWidth={1.8} />
              <Text style={[T.body, { fontWeight: "700" }]}>
                {showDetails ? "접기" : "자세히 보기"}
              </Text>
            </View>
            <Icon
              name={showDetails ? "chevronUp" : "chevronDown"}
              size={18}
              color={C.inkSoft}
              strokeWidth={2}
            />
          </Pressable>

          {showDetails ? (
            <View style={{ gap: 14 }}>
              {weak.map((b) => {
                const guide = BAND_GUIDES[b];
                const info = BAND_INFO[b];
                return (
                  <View key={b} style={styles.guideItemBox}>
                    <View style={styles.guideTitleRow}>
                      <View style={[styles.guideDot, { backgroundColor: guide.accentColor }]} />
                      <Text style={[T.body, { fontWeight: "700", flex: 1 }]}>{guide.title}</Text>
                    </View>

                    <Text style={[T.bodySoft, { color: "#B3261E" }]}>{guide.problem}</Text>
                    <Text style={T.bodySoft}>{guide.solution}</Text>

                    <View style={styles.exampleWrap}>
                      <Text style={T.label}>추천 연습 단어 쌍 · 터치하면 소리를 비교해요</Text>
                      <PairChipsRow
                        pairs={
                          showAllPairs[b]
                            ? guide.examplePairs
                            : guide.examplePairs.slice(0, PAIR_PREVIEW_COUNT)
                        }
                        onPick={(pair) => {
                          void hapticFeedback.light();
                          setActiveCompare({ band: b, pair: pairLabel(pair) });
                        }}
                      />
                      {guide.examplePairs.length > PAIR_PREVIEW_COUNT ? (
                        <Pressable
                          onPress={() =>
                            setShowAllPairs((prev) => ({ ...prev, [b]: !prev[b] }))
                          }
                          style={styles.detailToggleRow}
                          accessibilityRole="button"
                          accessibilityState={{ expanded: !!showAllPairs[b] }}
                          accessibilityLabel={showAllPairs[b] ? "쌍 접기" : "쌍 더 보기"}
                        >
                          <Text style={[T.body, { fontWeight: "700" }]}>
                            {showAllPairs[b] ? "쌍 접기" : "쌍 더 보기"}
                          </Text>
                          <Icon
                            name={showAllPairs[b] ? "chevronUp" : "chevronDown"}
                            size={18}
                            color={C.inkSoft}
                            strokeWidth={2}
                          />
                        </Pressable>
                      ) : null}
                    </View>

                    <View style={styles.targetConsonantRow}>
                      <Text style={T.bodySoft}>집중 음소</Text>
                      <Text style={T.label}>{info.consonants.join(" · ")}</Text>
                    </View>
                  </View>
                );
              })}

              <View style={{ gap: 12 }}>
                <Pressable
                  onPress={() => setShowScoreDetails((prev) => !prev)}
                  style={styles.detailToggleRow}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showScoreDetails }}
                  accessibilityLabel={showScoreDetails ? "세부 점수 접기" : "세부 점수 보기"}
                >
                  <Text style={[T.body, { fontWeight: "700" }]}>
                    {showScoreDetails ? "세부 점수 접기" : "세부 점수 보기"}
                  </Text>
                  <Icon
                    name={showScoreDetails ? "chevronUp" : "chevronDown"}
                    size={18}
                    color={C.inkSoft}
                    strokeWidth={2}
                  />
                </Pressable>
                {showScoreDetails
                  ? BANDS.map((b) => {
                      const row = summary[b];
                      if (!row) return null;
                      return (
                        <View key={b} style={styles.detailRow}>
                          <View style={[styles.dot, { backgroundColor: SCENE[b].colors[2] }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={[T.body, { fontWeight: "700" }]}>
                              {SCENE[b].name}{" "}
                              <Text style={T.bodySoft}>({BAND_INFO[b].range})</Text>
                            </Text>
                            <Text style={T.bodySoft}>
                              순음: {TONE_LABEL[row.tone?.status ?? "watch"]} · 스크리닝:{" "}
                              {row.screen?.correct ?? 0}/{row.screen?.total ?? 0}
                              {row.fine ? ` · 정밀: ${row.fine.correct}/${row.fine.total}` : ""}
                              {row.versus ? ` · 대립쌍: ${row.versus.correct}/${row.versus.total}` : ""}
                            </Text>
                          </View>
                          <Badge status={row.final} />
                        </View>
                      );
                    })
                  : null}
              </View>
            </View>
          ) : null}
        </Card>

        <View style={{ marginTop: 24, gap: 12 }}>
          <WaveButton
            title="다시 측정하기"
            onPress={onRestart}
            tone={allClear ? "primary" : "ghost"}
          />
          {onHome ? (
            <WaveButton title="처음으로" onPress={onHome} tone="ghost" />
          ) : onExit ? (
            <WaveButton title="탭으로 돌아가기" onPress={onExit} tone="ghost" />
          ) : null}
        </View>

        <Text style={[T.tiny, SEA_TEXT_SHADOW, { textAlign: "center", marginTop: 16 }]}>
          이 결과는 일상적 청능 훈련과 자가 점검을 위한 기록이며, 전문 의료기관의 청력
          진단(PTA/WRS)을 대신하지 않습니다.
        </Text>
      </ScrollView>

      <PairCompareModal
        visible={activeCompare !== null}
        band={activeCompare?.band ?? null}
        pairStr={activeCompare?.pair ?? null}
        onClose={() => setActiveCompare(null)}
      />
    </SeaBackground>
  );
}

function Badge({ status }: { status: ChoiceStatus }) {
  let bg: string = C.gold;
  if (status === "pass") bg = C.right;
  else if (status === "weak") bg = C.wrong;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.badgeText}>{FINAL_LABEL[status] ?? status}</Text>
    </View>
  );
}

function PairChipsRow({
  pairs,
  onPick,
}: {
  pairs: readonly ExamplePair[];
  onPick: (pair: ExamplePair) => void;
}) {
  const rows: ExamplePair[][] = [];
  for (let i = 0; i < pairs.length; i += 2) {
    rows.push(pairs.slice(i, i + 2));
  }

  return (
    <View style={styles.pairsStack}>
      {rows.map((row) => (
        <View key={pairLabel(row[0])} style={styles.pairsRow}>
          {row.map((pair) => (
            <PairChipButton
              key={pairLabel(pair)}
              pair={pair}
              onPress={() => onPick(pair)}
            />
          ))}
          {row.length === 1 ? <View style={styles.pairChipSpacer} /> : null}
        </View>
      ))}
    </View>
  );
}

function PairChipButton({
  pair,
  onPress,
}: {
  pair: ExamplePair;
  onPress: () => void;
}) {
  const label = pairLabel(pair);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.pairChip,
        pressed && styles.pairChipPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} 소리 비교 듣기`}
    >
      <Text style={styles.pairDiff}>{pair.diff}</Text>
      <View style={styles.pairWordsRow}>
        <View style={styles.pairWordCell}>
          <Text style={styles.pairWord}>{pair.left}</Text>
        </View>
        <Text style={styles.pairSwap}>↔</Text>
        <View style={styles.pairWordCell}>
          <Text style={styles.pairWord}>{pair.right}</Text>
        </View>
      </View>
    </Pressable>
  );
}

interface PairCompareModalProps {
  visible: boolean;
  band: BandKey | null;
  pairStr: string | null;
  onClose: () => void;
}

function PairCompareModal({
  visible,
  band,
  pairStr,
  onClose,
}: PairCompareModalProps) {
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [isSequencePlaying, setIsSequencePlaying] = useState(false);

  const words = useMemo(() => {
    if (!pairStr) return ["", ""];
    const parts = pairStr.split(/\s*↔\s*/);
    return [parts[0] ?? "", parts[1] ?? ""];
  }, [pairStr]);

  const [wordA, wordB] = words;

  // 닫힐 때 오디오 정지
  useEffect(() => {
    if (visible) return;
    void audio.stop();
    const t = setTimeout(() => {
      setPlayingWord(null);
      setIsSequencePlaying(false);
    }, 0);
    return () => clearTimeout(t);
  }, [visible]);

  const handlePlayWord = async (word: string) => {
    if (!word || isSequencePlaying) return;
    void hapticFeedback.selection();
    setPlayingWord(word);
    try {
      await audio.playWord(word);
    } finally {
      setPlayingWord(null);
    }
  };

  const handlePlaySequence = async () => {
    if (!wordA || !wordB || isSequencePlaying) return;
    void hapticFeedback.selection();
    setIsSequencePlaying(true);
    try {
      setPlayingWord(wordA);
      await audio.playWord(wordA);
      setPlayingWord(null);

      await new Promise((r) => setTimeout(r, 450));

      setPlayingWord(wordB);
      await audio.playWord(wordB);
    } finally {
      setPlayingWord(null);
      setIsSequencePlaying(false);
    }
  };

  if (!visible || !band || !pairStr) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>대립쌍 소리 비교</Text>
              <Text style={T.bodySoft}>{`${SCENE[band].name} · 두 소리 비교`}</Text>
            </View>
            <Pressable
              onPress={() => {
                void hapticFeedback.light();
                onClose();
              }}
              style={styles.modalCloseBtn}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="닫기"
            >
              <Icon name="close" size={18} color={C.inkSoft} strokeWidth={2.2} />
            </Pressable>
          </View>

          <View style={styles.compareCardsRow}>
            <WordCard
              order="단어 1"
              word={wordA}
              playing={playingWord === wordA}
              onPress={() => void handlePlayWord(wordA)}
            />
            <WordCard
              order="단어 2"
              word={wordB}
              playing={playingWord === wordB}
              onPress={() => void handlePlayWord(wordB)}
            />
          </View>

          <NoteBox kind="info">한 음소만 다른 두 단어에 집중하며 들어 보세요.</NoteBox>

          <WaveButton
            title={isSequencePlaying ? "재생 중…" : "두 단어 이어서 듣기"}
            icon="play"
            onPress={() => void handlePlaySequence()}
            disabled={isSequencePlaying}
          />
        </View>
      </View>
    </Modal>
  );
}

function WordCard({
  order,
  word,
  playing,
  onPress,
}: {
  order: string;
  word: string;
  playing: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.wordCompareCard, playing && styles.wordCardActive]}
      accessibilityRole="button"
      accessibilityLabel={`${word} 소리 듣기`}
      accessibilityState={{ busy: playing }}
    >
      <Text style={T.bodySoft}>{order}</Text>
      <Text style={T.word}>{word}</Text>
      <View style={styles.playStatusRow}>
        <Icon name={playing ? "speaker" : "play"} size={14} color={C.mid} strokeWidth={2} />
        <Text style={[T.label, { color: C.mid }]}>{playing ? "재생 중" : "터치하여 듣기"}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: S.pad,
  },
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
  hero: {
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  savedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(56, 192, 138, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(56, 192, 138, 0.4)",
  },
  badgeText: {
    color: C.white,
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 20,
  },
  practiceLayerRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    gap: 10,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(8, 32, 61, 0.15)",
    backgroundColor: "rgba(8, 32, 61, 0.04)",
  },
  practiceLayerText: {
    flex: 1,
    gap: 2,
  },
  practiceLayerBtn: {
    flexShrink: 0,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  guideItemBox: {
    backgroundColor: "rgba(8, 32, 61, 0.04)",
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(8, 32, 61, 0.08)",
  },
  guideTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  guideDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  exampleWrap: {
    marginTop: 2,
    gap: 6,
  },
  pairsStack: {
    gap: PAIR_ROW_GAP,
  },
  pairsRow: {
    flexDirection: "row",
    gap: PAIR_ROW_GAP,
  },
  pairChip: {
    flex: 1,
    minHeight: 48,
    backgroundColor: C.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(8, 32, 61, 0.15)",
    gap: 4,
  },
  pairChipSpacer: {
    flex: 1,
  },
  pairChipPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  pairDiff: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: C.inkSoft,
    textAlign: "center",
  },
  pairWordsRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 28,
  },
  pairWordCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pairWord: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700",
    color: C.ink,
  },
  pairSwap: {
    fontSize: 14,
    lineHeight: 20,
    color: C.inkSoft,
    paddingHorizontal: 4,
  },
  targetConsonantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  detailToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 40,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(3, 16, 38, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: S.pad,
  },
  modalContent: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 20,
    gap: 14,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: C.ink,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(8, 32, 61, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  compareCardsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
    marginTop: 4,
  },
  wordCompareCard: {
    flex: 1,
    backgroundColor: "rgba(8, 32, 61, 0.04)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
    borderWidth: 2,
    borderColor: "transparent",
  },
  wordCardActive: {
    backgroundColor: "rgba(30, 127, 192, 0.1)",
    borderColor: C.mid,
  },
  playStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
});
