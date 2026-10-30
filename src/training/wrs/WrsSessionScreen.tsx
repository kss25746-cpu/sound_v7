import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
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
import { Pill } from "@/components/ui/pill";
import { ListeningCheckEntryButton } from "@/components/ui/listening-check-entry-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { StatsEntryButton } from "@/components/ui/stats-entry-button";
import {
  MaxContentWidth,
  Radius,
  Shadows,
  Spacing,
} from "@/constants/theme";
import { usePressScale } from "@/hooks/use-press-scale";
import { useTheme } from "@/hooks/use-theme";
import { confirmEndSession } from "@/training/confirmEndSession";
import { ListeningCheckScreen } from "@/training/ListeningCheckScreen";
import { SessionProgressBar } from "@/training/SessionProgressBar";
import { StatsScreen } from "@/training/StatsScreen";
import {
  createWrsTrials,
  scoreWrsChoice,
  summarizeWrs,
  wrsPercentCopy,
  wrsResultCopy,
  WRS_SHORT_COUNT,
  WRS_TRIAL_COUNT,
  type WrsSessionLength,
  type WrsSessionSummary,
  type WrsTrial,
  type WrsTrialOutcome,
} from "@/training/wrs/wrsSession";
import { appendWrsSummary } from "@/training/wrs/wrsStore";
import {
  speakWrsWord,
  stopWrsSpeech,
  waitFirstWordLeadIn,
} from "@/training/wrs/wrsTts";
import { usePauseOnBackground } from "@/hooks/use-pause-on-background";
import { useOutputKeepAlive } from "@/hooks/use-output-keep-alive";

type Phase = "idle" | "playing" | "choose" | "feedback" | "summary";

type WrsSessionScreenProps = {
  /** 단어 듣기 목록으로 돌아가기(idle·요약에서만 노출). */
  onBack?: () => void;
  /** 목록에서 막 들어왔을 때 바로 시작. */
  autoStart?: boolean;
  onAutoStartConsumed?: () => void;
};

export function WrsSessionScreen({
  onBack,
  autoStart = false,
  onAutoStartConsumed,
}: Readonly<WrsSessionScreenProps>) {
  const theme = useTheme();
  const abortRef = useRef(false);
  /** 재생 실행 세대. 새 실행이 시작되면 이전 재생은 스스로 빠진다. */
  const runSeqRef = useRef(0);
  const savedRef = useRef(false);
  const trialsRef = useRef<WrsTrial[]>([]);
  const outcomesRef = useRef<WrsTrialOutcome[]>([]);
  // 처음 선택은 짧은 판(12)이다(2026-10-23 결정). 25는 토글로 고른다
  const trialLengthRef = useRef<WrsSessionLength>(WRS_SHORT_COUNT);

  const [phase, setPhase] = useState<Phase>("idle");
  const [trialLength, setTrialLength] = useState<WrsSessionLength>(
    WRS_SHORT_COUNT,
  );
  const [trialIndex, setTrialIndex] = useState(0);
  const [lastCorrect, setLastCorrect] = useState<boolean | undefined>(
    undefined,
  );
  const [lastTarget, setLastTarget] = useState<string | null>(null);
  const [summary, setSummary] = useState<WrsSessionSummary | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  /**
   * 첫 단어 앞의 뜸 동안 켜진다. 이때도 「듣는 중」이라고 하면 난청 사용자가
   * 소리를 놓친 줄 안다 — 아직 안 났다는 걸 말로 알린다.
   */
  const [leadIn, setLeadIn] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  /**
   * 화면이 그리는 값은 ref가 아니라 state로 둔다 — ref는 바꿔도 다시 그리지 않아서
   * 옆에 있는 `setPhase` 덕에 우연히 맞게 보일 뿐이다. ref는 비동기 콜백에서
   * 최신 값을 읽는 용도로 남긴다(`WrsBingoScreen`의 `markedRef`+`marked`와 같은 짝).
   */
  const [trials, setTrials] = useState<WrsTrial[]>([]);
  const [outcomeCount, setOutcomeCount] = useState(0);

  const running =
    phase === "playing" || phase === "choose" || phase === "feedback";
  const choiceDisabled = phase !== "choose";
  const currentTrial = trials[trialIndex];

  const resetRun = useCallback(() => {
    abortRef.current = true;
    void stopWrsSpeech();
    trialsRef.current = [];
    outcomesRef.current = [];
    savedRef.current = false;
    setTrials([]);
    setOutcomeCount(0);
    setTrialIndex(0);
    setLastCorrect(undefined);
    setLastTarget(null);
    setSummary(null);
    setSaveNote(null);
    setLastError(null);
    setLeadIn(false);
    setPhase("idle");
  }, []);

  // 이어폰 출력이 잠들어 단어 앞부분이 잘리지 않게 (docs/이어폰-앞부분잘림_2026-10-15.md)
  useOutputKeepAlive();

  useFocusEffect(
    useCallback(() => {
      abortRef.current = false;
      return () => {
        abortRef.current = true;
        void stopWrsSpeech();
      };
    }, []),
  );

  /**
   * 백그라운드로 가면 이 판을 세운다. 소리는 `audio-manager`의 전역 게이트가 끊고,
   * 여기서는 진행만 멈춘다 — 안 들은 문항이 혼자 넘어가 오답으로 기록되는 걸 막는다.
   * 하는 일은 탭 이탈(blur) 때와 같다.
   */
  usePauseOnBackground(() => {
    abortRef.current = true;
    void stopWrsSpeech();
  });

  useEffect(() => {
    return () => {
      abortRef.current = true;
      void stopWrsSpeech();
    };
  }, []);

  // 탭이 마운트된 채 남으므로 포커스가 없을 때는 걷어낸다 — 안 그러면 다른 탭의
  // 뒤로가기를 이 화면이 가로챈다(`BackHandler`는 등록 역순으로 먼저 true를 문다).
  useFocusEffect(
    useCallback(() => {
      if (showStats) {
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
          setShowStats(false);
          return true;
        });
        return () => sub.remove();
      }
      if (showCheck) {
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
          setShowCheck(false);
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
    }, [onBack, phase, resetRun, showStats, showCheck]),
  );

  const playCurrent = useCallback(async (index: number) => {
    const trial = trialsRef.current[index];
    if (!trial) {
      return;
    }
    // 이 실행의 세대 번호. 「중지」를 취소해 단어를 다시 읽힐 때, 끊긴 이전
    // 실행이 abortRef가 false로 돌아간 것을 보고 되살아나 단계를 잘못
    // 넘기는 것을 막는다. abortRef 하나로는 두 실행을 구분할 수 없다.
    const seq = ++runSeqRef.current;
    const aborted = () => abortRef.current || runSeqRef.current !== seq;
    abortRef.current = false;
    setLastError(null);
    setPhase("playing");
    // 첫 단어만 뜸을 들인다 — 두 번째부터는 「고르기 → 다음」 사이가 이미 있다.
    if (index === 0) {
      setLeadIn(true);
      await waitFirstWordLeadIn();
      setLeadIn(false);
      if (aborted()) {
        return;
      }
    }
    try {
      await speakWrsWord(trial.target);
      if (aborted()) {
        return;
      }
      setPhase("choose");
    } catch {
      if (aborted()) {
        return;
      }
      setLastError("단어를 읽지 못했어요. 보기를 고르거나 다시 시작해 주세요.");
      setPhase("choose");
    }
  }, []);

  const onStart = useCallback(() => {
    abortRef.current = false;
    savedRef.current = false;
    trialLengthRef.current = trialLength;
    const nextTrials = createWrsTrials(Math.random, trialLength);
    trialsRef.current = nextTrials;
    outcomesRef.current = [];
    setTrials(nextTrials);
    setOutcomeCount(0);
    setTrialIndex(0);
    setLastCorrect(undefined);
    setLastTarget(null);
    setSummary(null);
    setSaveNote(null);
    void playCurrent(0);
  }, [playCurrent, trialLength]);

  const autoStartOnceRef = useRef(false);
  useEffect(() => {
    if (!autoStart || autoStartOnceRef.current) {
      return;
    }
    autoStartOnceRef.current = true;
    onStart();
    onAutoStartConsumed?.();
  }, [autoStart, onAutoStartConsumed, onStart]);

  const finishSession = useCallback(async () => {
    abortRef.current = true;
    await stopWrsSpeech();
    const nextSummary = summarizeWrs(outcomesRef.current);
    setSummary(nextSummary);
    setPhase("summary");

    const planned = trialLengthRef.current;
    if (nextSummary.trialCount !== planned) {
      setSaveNote(`${planned}개를 다 고르지 않아 기록에는 안 남겼어요`);
      return;
    }

    if (savedRef.current) {
      return;
    }
    savedRef.current = true;
    try {
      await appendWrsSummary(nextSummary);
      setSaveNote("기기에 기록했어요");
    } catch {
      setSaveNote("기록에 남기지 못했어요");
    }
  }, []);

  const onChoose = useCallback(
    (choice: string) => {
      if (phase !== "choose") {
        return;
      }
      const trial = trialsRef.current[trialIndex];
      if (!trial) {
        return;
      }
      const correct = scoreWrsChoice(trial.target, choice);
      outcomesRef.current = [
        ...outcomesRef.current,
        {
          target: trial.target,
          choice,
          correct,
          axis: trial.axis,
        },
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
   * 「중지」 — 읽는 중이었다면 소리를 **먼저** 끊고 확인을 묻는다.
   *
   * 확인을 먼저 띄우면 대화상자가 떠 있는 내내 낭독이 이어져 소리가
   * 안 멈춘다. 그래서 `playing`에서는 끊었다가 취소 시 되살린다.
   *
   * `choose`는 이미 끝까지 들려준 뒤다. 여기서 되살리면 「다시 듣기」가
   * 없는 화면에 숨은 재청취 경로가 생겨, 정답률이 「한 번 듣고 답한
   * 값」인지 알 수 없게 된다. 그래서 복구하지 않는다.
   */
  const onStopPress = useCallback(() => {
    if (phase === "choose") {
      confirmEndSession(onEndManual);
      return;
    }
    confirmEndSession(onEndManual, {
      onOpen: () => {
        abortRef.current = true;
        void stopWrsSpeech();
      },
      onCancel: () => {
        void playCurrent(trialIndex);
      },
    });
  }, [onEndManual, phase, playCurrent, trialIndex]);

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

  if (showStats) {
    return (
      <StatsScreen initialKind="wrs1" onBack={closeStats} />
    );
  }

  if (showCheck) {
    return (
      <ListeningCheckScreen onBack={closeCheck} />
    );
  }

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <ScreenHeader
          title="한 글자"
          caption="들은 단어를 보기에서 고르는 연습 · 병원 검사가 아니에요"
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
          <SessionProgressBar current={outcomeCount} total={trials.length} />
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
                한 글자 단어 하나를 읽어 줘요. 비슷한 소리 보기 네 개 중에서
                들은 단어를 고르면 됩니다. 목소리는 기계음이라 사람 말과 다를 수
                있어요.
              </ThemedText>
              <TrialLengthToggle value={trialLength} onChange={setTrialLength} />
            </Card>
          </ScrollView>
        ) : null}

        {phase === "summary" ? (
          <ScrollView
            style={styles.fill}
            contentContainerStyle={styles.summaryContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headline}>
              <Icon
                name="check"
                size={18}
                color={theme.accent}
                strokeWidth={2.2}
              />
              <ThemedText type="smallBold" style={styles.headlineText}>
                연습이 끝났어요
              </ThemedText>
            </View>
            {summary ? (
              <Card size="large" style={styles.summaryCard}>
                <ThemedText type="heading" style={styles.resultLine}>
                  {wrsResultCopy(summary)}
                </ThemedText>
                {wrsPercentCopy(summary) ? (
                  <ThemedText type="smallBold" style={{ color: theme.accent }}>
                    {wrsPercentCopy(summary)}
                  </ThemedText>
                ) : null}
                <ThemedText
                  type="small"
                  themeColor="textMuted"
                  style={styles.footnote}
                >
                  연습 기록이에요. 청력 검사·진단 결과가 아니에요.
                </ThemedText>
              </Card>
            ) : null}
            {saveNote ? <Pill stretch icon="check" label={saveNote} /> : null}
          </ScrollView>
        ) : null}

        {running ? (
          <ScrollView
            style={styles.runningScroll}
            contentContainerStyle={styles.runningContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.promptArea}>
              <Equalizer
                color={theme.accent}
                height={24}
                barWidth={4}
                bars={3}
                playing={phase === "playing" && !leadIn}
              />
              <ThemedText
                type="smallBold"
                themeColor="textSecondary"
                style={styles.statusText}
              >
                {promptCopy(phase, lastCorrect, lastTarget, leadIn)}
              </ThemedText>
            </View>

            {currentTrial ? (
              <View style={styles.choiceGrid}>
                {currentTrial.choices.map((word) => (
                  <ChoiceCell
                    key={word}
                    word={word}
                    disabled={choiceDisabled}
                    marked={
                      phase === "feedback" && lastTarget === word
                        ? "answer"
                        : null
                    }
                    onPress={() => onChoose(word)}
                  />
                ))}
              </View>
            ) : null}
          </ScrollView>
        ) : null}

        {lastError ? (
          <ThemedText
            themeColor="textSecondary"
            type="small"
          >
            {lastError}
          </ThemedText>
        ) : null}

        <View style={styles.actions}>
          {phase === "idle" || phase === "summary" ? (
            <ActionButton
              variant="primary"
              fill={false}
              label={phase === "summary" ? "다시 연습" : "시작"}
              onPress={onStart}
            />
          ) : null}

          {(phase === "idle" || phase === "summary") && onBack ? (
            <ActionButton fill={false} label="뒤로 가기" onPress={onBack} />
          ) : null}

          {phase === "feedback" ? (
            <>
              <ActionButton
                variant="primary"
                fill={false}
                label="다음"
                onPress={onNext}
              />
              <ActionButton
                fill={false}
                label="끝내기"
                onPress={() => confirmEndSession(onEndManual)}
              />
            </>
          ) : null}

          {phase === "playing" || phase === "choose" ? (
            <ActionButton fill={false} label="중지" onPress={onStopPress} />
          ) : null}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function TrialLengthToggle({
  value,
  onChange,
}: Readonly<{
  value: WrsSessionLength;
  onChange: (next: WrsSessionLength) => void;
}>) {
  const theme = useTheme();
  const options: readonly {
    key: WrsSessionLength;
    label: string;
  }[] = [
    { key: WRS_SHORT_COUNT, label: "12문항" },
    { key: WRS_TRIAL_COUNT, label: "25문항" },
  ];

  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.lengthRow, { borderColor: theme.border }]}
    >
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
            onPress={() => onChange(opt.key)}
            style={[
              styles.lengthSegment,
              active
                ? {
                    backgroundColor: theme.accentTint,
                    borderColor: theme.accent,
                  }
                : {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
            ]}
          >
            <ThemedText
              type="smallBold"
              style={{ color: active ? theme.accent : theme.text }}
            >
              {opt.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function choiceBorder(
  theme: { accent: string; accentBorder: string; border: string },
  answer: boolean,
  pressed: boolean,
): string {
  if (answer) {
    return theme.accent;
  }
  if (pressed) {
    return theme.accentBorder;
  }
  return theme.border;
}

function promptCopy(
  phase: Phase,
  lastCorrect: boolean | undefined,
  lastTarget: string | null,
  leadIn: boolean,
): string | null {
  if (leadIn) {
    return "잠시 뒤 들려 드려요";
  }
  if (phase === "playing") {
    return "듣는 중… 소리가 끝난 뒤 고르세요";
  }
  if (phase === "choose") {
    return "들은 단어를 고르세요";
  }
  if (phase !== "feedback") {
    return null;
  }
  if (lastCorrect) {
    return "맞았어요";
  }
  return `아쉬워요 · 정답은 ${lastTarget ?? ""}`;
}

function ChoiceCell({
  word,
  disabled,
  marked,
  onPress,
}: Readonly<{
  word: string;
  disabled: boolean;
  marked: "answer" | null;
  onPress: () => void;
}>) {
  const theme = useTheme();
  const answer = marked === "answer";
  const { scale, onPressIn, onPressOut } = usePressScale();

  return (
    <Animated.View
      style={[styles.choiceCellOuter, { transform: [{ scale }] }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={word}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.choiceCell,
          {
            backgroundColor: theme.surface,
            borderColor: choiceBorder(theme, answer, pressed && !disabled),
          },
          Shadows.card,
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <ThemedText type="heading" style={styles.choiceWord}>
          {word}
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
  lengthRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: Radius.pill,
    padding: Spacing.half,
    gap: Spacing.half,
    alignSelf: "stretch",
  },
  lengthSegment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
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
  resultLine: {
    fontSize: 20,
    lineHeight: 28,
  },
  footnote: {
    fontSize: 14,
    lineHeight: 20,
  },
  /**
   * 연습 중 내용은 스크롤, 「중지」는 그 밖에 고정.
   * 화면이 짧으면(568dp) 기본 글씨에서도 보기가 넘쳐 「중지」가 화면 밖으로 밀린다.
   *
   * `flex: 1`이 아니라 `flexShrink: 1`인 이유 — 자리가 남을 때는 내용 높이 그대로
   * 두어 키 큰 화면(868dp)의 배치를 건드리지 않는다. 모자랄 때만 줄어들며
   * 스크롤이 생긴다. `flex: 1`을 쓰면 남는 자리를 스크롤이 다 먹어 버튼이 아래로
   * 내려가고, 그게 곧 사용자 기기의 회귀가 된다.
   */
  runningScroll: {
    flexShrink: 1,
  },
  runningContent: {
    // `safe`의 gap과 같은 값 — 감싸기 전후로 promptArea·보기 사이가 벌어지지 않는다.
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
  choiceCellOuter: {
    width: "48%",
  },
  choiceCell: {
    width: "100%",
    minHeight: 72,
    borderWidth: 1.5,
    borderRadius: Radius.large - 4,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceWord: {
    fontSize: 28,
    lineHeight: 36,
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
