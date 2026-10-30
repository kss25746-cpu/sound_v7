import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ActionButton } from "@/components/ui/action-button";
import { Card } from "@/components/ui/card";
import { Equalizer } from "@/components/ui/equalizer";
import { Icon } from "@/components/ui/icon";
import { ListeningCheckEntryButton } from "@/components/ui/listening-check-entry-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { StatsEntryButton } from "@/components/ui/stats-entry-button";
import { MaxContentWidth, Radius, Shadows, Spacing } from "@/constants/theme";
import { usePressScale } from "@/hooks/use-press-scale";
import { useTheme } from "@/hooks/use-theme";
import { confirmEndSession } from "@/training/confirmEndSession";
import {
  playInstTrial,
  stopInstPlayback,
  waitInstLeadIn,
} from "@/training/inst/instPlay";
import {
  collectInstrumentResults,
  createInstTrials,
  INST_TRIAL_COUNT,
  instResultCopy,
  instWeakestIds,
  scoreInstChoice,
  summarizeInst,
  type InstOutcome,
  type InstrumentTally,
  type InstTrial,
} from "@/training/inst/instSession";
import {
  INSTRUMENTS,
  instrumentLabel,
  instrumentOf,
  type Instrument,
  type InstrumentId,
} from "@/training/inst/instruments";
import { appendInstSummary, listInstRecords } from "@/training/inst/instStore";
import { ListeningCheckScreen } from "@/training/ListeningCheckScreen";
import { SessionProgressBar } from "@/training/SessionProgressBar";
import { StatsScreen } from "@/training/StatsScreen";
import { usePauseOnBackground } from "@/hooks/use-pause-on-background";

type Phase = "idle" | "playing" | "choose" | "feedback" | "summary";

/** idle(연습 선택) 화면 텍스트만 균일하게 살짝 키우는 배율(다른 탭과 같은 값). */
const TEXT_SCALE = 1.2;

type InstSessionScreenProps = {
  /** 악기 소리 목록으로 돌아가기(idle·요약에서만 노출). */
  onBack?: () => void;
};

export function InstSessionScreen({ onBack }: Readonly<InstSessionScreenProps>) {
  const theme = useTheme();
  const abortRef = useRef(false);
  /** 재생 실행 세대. 새 실행이 시작되면 이전 재생은 스스로 빠진다. */
  const runSeqRef = useRef(0);
  const savedRef = useRef(false);
  const trialsRef = useRef<InstTrial[]>([]);
  const outcomesRef = useRef<InstOutcome[]>([]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [trialIndex, setTrialIndex] = useState(0);
  const [lastCorrect, setLastCorrect] = useState<boolean | undefined>(
    undefined,
  );
  const [lastTarget, setLastTarget] = useState<InstrumentId | null>(null);
  const [resultLine, setResultLine] = useState<string | null>(null);
  const [tally, setTally] = useState<Record<
    InstrumentId,
    InstrumentTally
  > | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [leadIn, setLeadIn] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  /**
   * 진행 막대가 그리는 값은 ref가 아니라 state로 둔다 — ref는 바꿔도 다시 그리지
   * 않는다. ref는 비동기 콜백에서 최신 값을 읽는 용도로 남긴다.
   */
  const [outcomeCount, setOutcomeCount] = useState(0);

  const running =
    phase === "playing" || phase === "choose" || phase === "feedback";
  const choiceDisabled = phase !== "choose";
  const idleTextScale = phase === "idle" ? TEXT_SCALE : 1;
  const weakestIds = tally ? instWeakestIds(tally) : null;

  const resetRun = useCallback(() => {
    abortRef.current = true;
    stopInstPlayback();
    trialsRef.current = [];
    outcomesRef.current = [];
    savedRef.current = false;
    setOutcomeCount(0);
    setTrialIndex(0);
    setLastCorrect(undefined);
    setLastTarget(null);
    setResultLine(null);
    setTally(null);
    setSaveNote(null);
    setLastError(null);
    setLeadIn(false);
    setPhase("idle");
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      await listInstRecords();
    } catch {
      // 목록 자체는 통계 화면이 따로 읽는다. 여기 실패는 화면에 영향이 없다.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      abortRef.current = false;
      void refreshHistory();
      return () => {
        abortRef.current = true;
        stopInstPlayback();
      };
    }, [refreshHistory]),
  );

  /**
   * 백그라운드로 가면 이 판을 세운다. 소리는 `audio-manager`의 전역 게이트가 끊고,
   * 여기서는 진행만 멈춘다 — 안 들은 문항이 혼자 넘어가 오답으로 기록되는 걸 막는다.
   * 하는 일은 탭 이탈(blur) 때와 같다.
   */
  usePauseOnBackground(() => {
    abortRef.current = true;
    stopInstPlayback();
  });

  useEffect(() => {
    return () => {
      abortRef.current = true;
      stopInstPlayback();
    };
  }, []);

  const openStats = useCallback(() => {
    setShowStats(true);
  }, []);

  const closeStats = useCallback(() => {
    setShowStats(false);
  }, []);

  const openCheck = useCallback(() => {
    setShowCheck(true);
  }, []);

  const closeCheck = useCallback(() => {
    setShowCheck(false);
  }, []);

  // 탭이 마운트된 채 남으므로 포커스가 없을 때는 걷어낸다 — 안 그러면 다른 탭의
  // 뒤로가기를 이 화면이 가로챈다(`BackHandler`는 등록 역순으로 먼저 true를 문다).
  useFocusEffect(
    useCallback(() => {
      if (showStats) {
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
          closeStats();
          return true;
        });
        return () => sub.remove();
      }
      if (showCheck) {
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
          closeCheck();
          return true;
        });
        return () => sub.remove();
      }
      if (phase === "idle" || phase === "summary") {
        if (!onBack) {
          return;
        }
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
          onBack();
          return true;
        });
        return () => sub.remove();
      }
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        confirmEndSession(resetRun);
        return true;
      });
      return () => sub.remove();
    }, [closeCheck, closeStats, onBack, phase, resetRun, showCheck, showStats]),
  );

  const playCurrent = useCallback(async (index: number, replay = false) => {
    const trial = trialsRef.current[index];
    if (!trial) {
      return;
    }
    // 이 실행의 세대 번호. 「중지」를 취소해 소리를 다시 틀 때, 끊긴 이전 재생이
    // abortRef가 false로 돌아간 것을 보고 되살아나 단계를 잘못 넘기는 것을 막는다.
    const seq = ++runSeqRef.current;
    const aborted = () => abortRef.current || runSeqRef.current !== seq;
    abortRef.current = false;
    setLastError(null);
    setPhase("playing");
    try {
      // 다시 듣기에는 앞 뜸을 두지 않는다 — 사용자가 방금 버튼을 눌러 놓고 기다린다.
      if (index === 0 && !replay) {
        setLeadIn(true);
        await waitInstLeadIn();
        if (aborted()) {
          return;
        }
        setLeadIn(false);
      }
      await playInstTrial(trial);
      if (aborted()) {
        return;
      }
      setPhase("choose");
    } catch {
      if (aborted()) {
        return;
      }
      setLeadIn(false);
      setLastError("소리를 재생하지 못했어요. 다시 시작해 주세요.");
      setPhase("choose");
    }
  }, []);

  /**
   * 이 문항을 다시 들려준다.
   *
   * 「고르기」에서만 연다. 피드백에서 다시 틀면 이미 답한 문항이 `choose`로
   * 되돌아가 같은 문항 답이 한 번 더 쌓인다(아래 「중지」 주석과 같은 이유).
   *
   * **횟수는 제한하지 않는다.** 이건 검사가 아니라 훈련이고, 같은 포락선끼리는
   * (피아노↔기타, 바이올린↔플루트) 한 번 듣고 가르기 어렵다 — 정상 청력도
   * 몇 번 들어야 한다(실기기 확인 2026-08-29). 한 번만 들려주면 못 들은 사람은
   * 찍는 수밖에 없고, 그건 훈련이 아니다.
   *
   * `주의`: 그래서 이 탭의 정답률은 **「몇 번이든 들은 뒤의 정답률」**이다.
   * 한 번에 맞혔는지를 재고 싶으면 다시 들은 횟수를 따로 세야 한다(지금은 안 센다).
   */
  const onReplay = useCallback(() => {
    void playCurrent(trialIndex, true);
  }, [playCurrent, trialIndex]);

  const onStart = useCallback(() => {
    abortRef.current = false;
    savedRef.current = false;
    trialsRef.current = createInstTrials();
    outcomesRef.current = [];
    setOutcomeCount(0);
    setTrialIndex(0);
    setLastCorrect(undefined);
    setLastTarget(null);
    setResultLine(null);
    setTally(null);
    setSaveNote(null);
    void playCurrent(0);
  }, [playCurrent]);

  const finishSession = useCallback(async () => {
    stopInstPlayback();
    setPhase("summary");

    const outcomes = outcomesRef.current;
    const summary = summarizeInst(outcomes);
    const nextTally = collectInstrumentResults(outcomes);
    setResultLine(instResultCopy(summary));
    setTally(nextTally);

    if (summary.trialCount !== INST_TRIAL_COUNT) {
      setSaveNote(null);
      return;
    }
    if (savedRef.current) {
      return;
    }
    savedRef.current = true;
    try {
      await appendInstSummary(summary);
      setSaveNote("기기에 기록했어요");
      await refreshHistory();
    } catch {
      setSaveNote("기록에 남기지 못했어요");
    }
  }, [refreshHistory]);

  const onChoose = useCallback(
    (choice: InstrumentId) => {
      if (phase !== "choose") {
        return;
      }
      const trial = trialsRef.current[trialIndex];
      if (!trial) {
        return;
      }
      const correct = scoreInstChoice(trial.target, choice);
      outcomesRef.current = [
        ...outcomesRef.current,
        { target: trial.target, choice, correct },
      ];
      setOutcomeCount(outcomesRef.current.length);
      setLastCorrect(correct);
      setLastTarget(trial.target);
      setPhase("feedback");
    },
    [phase, trialIndex],
  );

  const onNext = useCallback(() => {
    const nextIndex = trialIndex + 1;
    if (nextIndex >= trialsRef.current.length) {
      void finishSession();
      return;
    }
    setTrialIndex(nextIndex);
    setLastCorrect(undefined);
    setLastTarget(null);
    void playCurrent(nextIndex);
  }, [finishSession, playCurrent, trialIndex]);

  const onEndManual = useCallback(() => {
    void finishSession();
  }, [finishSession]);

  /**
   * 「중지」 — 소리를 **먼저** 끊고 확인을 묻는다. 확인을 먼저 띄우면 대화상자가
   * 떠 있는 내내 재생이 이어져 소리가 안 멈춘다. 취소하면 이번 소리를 다시 들려준다.
   */
  const onStopPress = useCallback(() => {
    confirmEndSession(onEndManual, {
      onOpen: () => {
        abortRef.current = true;
        stopInstPlayback();
      },
      onCancel: () => {
        void playCurrent(trialIndex);
      },
    });
  }, [onEndManual, playCurrent, trialIndex]);

  if (showStats) {
    return <StatsScreen initialKind="inst" onBack={closeStats} />;
  }

  if (showCheck) {
    return <ListeningCheckScreen onBack={closeCheck} />;
  }

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <ScreenHeader
          title="듣고 고르기"
          caption="들은 악기를 고르는 연습 · 병원 검사가 아니에요"
          action={
            phase === "idle" || phase === "summary" ? (
              <View style={styles.headerActions}>
                <ListeningCheckEntryButton onPress={openCheck} />
                <StatsEntryButton onPress={openStats} />
              </View>
            ) : null
          }
        />

        {running ? (
          <SessionProgressBar current={outcomeCount} total={INST_TRIAL_COUNT} />
        ) : null}

        {phase === "idle" ? (
          <ScrollView
            style={styles.fill}
            contentContainerStyle={styles.idleContent}
            showsVerticalScrollIndicator={false}
          >
            <Card style={styles.idleCard}>
              <ThemedText type="smallBold">이렇게 연습해요</ThemedText>
              <ThemedText
                themeColor="textSecondary"
                type="small"
                style={styles.idleBody}
              >
                악기 소리 하나를 들려 줘요. 피아노·기타·바이올린·플루트 중에서
                들은 악기를 고르면 됩니다. 소리 높이는 매번 달라져요 — 높낮이가
                아니라 소리의 결을 들어 보세요.
              </ThemedText>
            </Card>
            <View style={styles.previewGrid}>
              {INSTRUMENTS.map((instrument) => (
                <PreviewCell key={instrument.id} instrument={instrument} />
              ))}
            </View>
          </ScrollView>
        ) : null}

        {phase === "summary" ? (
          <ScrollView
            style={styles.fill}
            contentContainerStyle={styles.summaryContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headline}>
              <Icon name="check" size={28} color={theme.positive} />
              <ThemedText type="smallBold" style={styles.headlineText}>
                오늘 연습 끝
              </ThemedText>
            </View>
            <Card size="large" style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <ThemedText type="heading" style={styles.resultLine}>
                  {resultLine}
                </ThemedText>
                {weakestIds ? (
                  <View
                    accessible
                    accessibilityRole="text"
                    accessibilityLabel={`약한 소리 ${weakestIds.map(instrumentLabel).join("·")}`}
                    style={styles.weakCluster}
                  >
                    <ThemedText
                      type="smallBold"
                      style={[styles.weakLabel, { color: theme.accent }]}
                    >
                      약한 소리
                    </ThemedText>
                    <View style={styles.weakIcons}>
                      {weakestIds.map((id) => (
                        <Image
                          key={id}
                          source={instrumentOf(id).image}
                          style={styles.weakImage}
                          resizeMode="contain"
                        />
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
              {tally ? (
                <View style={styles.tallyList}>
                  {INSTRUMENTS.map((instrument) => (
                    <View key={instrument.id} style={styles.tallyRow}>
                      <ThemedText type="smallBold" style={styles.tallyLabel}>
                        {instrument.label}
                      </ThemedText>
                      <ThemedText
                        type="mono"
                        themeColor="textMuted"
                        style={styles.tallyScore}
                      >
                        {`${tally[instrument.id].correctCount}/${tally[instrument.id].trialCount}`}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              ) : null}
              <ThemedText
                type="small"
                themeColor="textMuted"
                style={styles.footnote}
              >
                연습 기록이에요. 청력 검사·진단 결과가 아니에요.
              </ThemedText>
              {saveNote ? (
                <ThemedText
                  themeColor="textSecondary"
                  type="small"
                  style={styles.footnote}
                >
                  {saveNote}
                </ThemedText>
              ) : null}
            </Card>
          </ScrollView>
        ) : null}

        {running ? (
          <ScrollView
            style={[styles.fill, styles.runningScroll]}
            contentContainerStyle={styles.runningContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.promptArea}>
              <Equalizer
                color={theme.accent}
                bars={3}
                playing={phase === "playing" && !leadIn}
              />
              <ThemedText
                type="smallBold"
                themeColor="textSecondary"
                style={styles.statusText}
              >
                {leadIn ? "곧 들어요…" : null}
                {!leadIn && phase === "playing"
                  ? "듣는 중… 소리가 끝난 뒤 고르세요"
                  : null}
                {phase === "choose" ? "들은 악기를 고르세요" : null}
                {phase === "feedback"
                  ? lastCorrect
                    ? "맞았어요"
                    : `아쉬워요 · 정답은 ${lastTarget ? instrumentLabel(lastTarget) : ""}`
                  : null}
              </ThemedText>
            </View>

            <View style={styles.choiceGrid}>
              {INSTRUMENTS.map((instrument) => (
                <ChoiceCell
                  key={instrument.id}
                  instrument={instrument}
                  disabled={choiceDisabled}
                  marked={
                    phase === "feedback" && lastTarget === instrument.id
                      ? "answer"
                      : null
                  }
                  onPress={() => onChoose(instrument.id)}
                />
              ))}
            </View>
          </ScrollView>
        ) : null}

        {lastError ? (
          <ThemedText themeColor="textSecondary" type="small">
            {lastError}
          </ThemedText>
        ) : null}

        <View style={styles.actions}>
          {phase === "idle" || phase === "summary" ? (
            <ActionButton
              variant="primary"
              fill={false}
              label={phase === "summary" ? "다시 연습" : "시작"}
              textScale={idleTextScale}
              onPress={onStart}
            />
          ) : null}

          {(phase === "idle" || phase === "summary") && onBack ? (
            <ActionButton fill={false} label="뒤로 가기" onPress={onBack} />
          ) : null}

          {phase === "summary" ? (
            <ActionButton fill={false} label="처음으로" onPress={resetRun} />
          ) : null}

          {phase === "feedback" ? (
            <>
              <ActionButton
                variant="primary"
                fill={false}
                label="다음"
                onPress={onNext}
              />
              {/*
               * 피드백에서는 「중지」(취소 시 재생 복구)를 쓰지 않는다. 이미 답한
               * 문항을 다시 재생해 `choose`로 되돌리면 같은 문항 답이 한 번 더
               * 쌓여 12개를 다 해도 13개가 되고, 그러면 기록이 조용히 버려진다.
               * 단어·문장 듣기와 같은 배치다.
               */}
              <ActionButton
                fill={false}
                label="끝내기"
                onPress={() => confirmEndSession(onEndManual)}
              />
            </>
          ) : null}

          {phase === "choose" ? (
            <ActionButton fill={false} label="다시 듣기" onPress={onReplay} />
          ) : null}

          {phase === "playing" || phase === "choose" ? (
            <ActionButton fill={false} label="중지" onPress={onStopPress} />
          ) : null}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

/** 시작 화면 미리보기 — 어떤 악기가 나오는지 미리 보여 준다(누를 수 없음). */
function PreviewCell({ instrument }: Readonly<{ instrument: Instrument }>) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.previewCell,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <Image
        source={instrument.image}
        style={styles.previewImage}
        resizeMode="contain"
      />
      <ThemedText type="smallBold">{instrument.label}</ThemedText>
    </View>
  );
}

function ChoiceCell({
  instrument,
  disabled,
  marked,
  onPress,
}: Readonly<{
  instrument: Instrument;
  disabled: boolean;
  marked: "answer" | null;
  onPress: () => void;
}>) {
  const theme = useTheme();
  const answer = marked === "answer";
  const { scale, onPressIn, onPressOut } = usePressScale();

  return (
    <Animated.View style={[styles.choiceCellOuter, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${instrument.label} · ${instrument.family}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.choiceCell,
          {
            backgroundColor: theme.surface,
            borderColor: answer
              ? theme.accent
              : pressed && !disabled
                ? theme.accentBorder
                : theme.border,
          },
          Shadows.card,
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <Image
          source={instrument.image}
          style={styles.choiceImage}
          resizeMode="contain"
        />
        <ThemedText type="smallBold" style={styles.choiceLabel}>
          {instrument.label}
        </ThemedText>
        <ThemedText
          type="small"
          themeColor="textMuted"
          style={styles.choiceFamily}
        >
          {instrument.family}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  safe: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  idleContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  idleCard: {
    gap: Spacing.two,
  },
  idleBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    justifyContent: "space-between",
  },
  previewCell: {
    width: "48%",
    borderWidth: 1,
    borderRadius: Radius.large - 4,
    paddingVertical: Spacing.two,
    alignItems: "center",
    gap: Spacing.one,
  },
  previewImage: {
    width: "100%",
    aspectRatio: 1,
    maxHeight: 64,
  },
  summaryContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  headline: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  headlineText: {
    fontSize: 16,
    lineHeight: 22,
  },
  summaryCard: {
    gap: Spacing.two,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  resultLine: {
    flex: 1,
    minWidth: 0,
    fontSize: 20,
    lineHeight: 28,
  },
  weakCluster: {
    alignItems: "flex-end",
    gap: Spacing.one,
  },
  weakLabel: {
    fontSize: 16,
    lineHeight: 22,
  },
  weakIcons: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  weakImage: {
    width: 34,
    height: 34,
  },
  tallyList: {
    gap: Spacing.one,
  },
  tallyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  tallyLabel: {
    fontSize: 16,
    lineHeight: 22,
  },
  tallyScore: {
    fontSize: 16,
    lineHeight: 22,
  },
  footnote: {
    fontSize: 14,
    lineHeight: 20,
  },
  /**
   * 연습 중 내용은 스크롤, 「중지」는 그 밖에 고정. 짧은 화면(568dp)에서
   * 보기 칸이 밀려 나가 고를 수 없게 되는 것을 막는다(링 6와 같은 이유).
   */
  runningScroll: {
    flexShrink: 1,
  },
  runningContent: {
    gap: Spacing.three,
  },
  promptArea: {
    alignItems: "center",
    gap: Spacing.two,
  },
  statusText: {
    textAlign: "center",
  },
  choiceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    justifyContent: "space-between",
  },
  /** 넷을 2×2로. 링 6(3열)보다 칸이 커서 그림과 글자가 함께 들어간다. */
  choiceCellOuter: {
    width: "48%",
  },
  choiceCell: {
    width: "100%",
    borderWidth: 1.5,
    borderRadius: Radius.large - 4,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    alignItems: "center",
    gap: Spacing.one,
  },
  /**
   * 칸 폭(48%)에 맞추고, 태블릿(`MaxContentWidth` 560)에서만 커지는 걸
   * `maxHeight`로 막는다. 요청 높이 70~90dp.
   */
  choiceImage: {
    width: "100%",
    aspectRatio: 1,
    maxHeight: 90,
  },
  choiceLabel: {
    fontSize: 17,
    lineHeight: 24,
  },
  choiceFamily: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  actions: {
    marginTop: "auto",
    gap: Spacing.two,
    flexGrow: 0,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.55,
  },
});
