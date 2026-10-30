import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
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
import { Pill } from "@/components/ui/pill";
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
import { StatsScreen } from "@/training/StatsScreen";
import {
  collectPhonemeResults,
  createLing6Trials,
  isCompletePhonemeMap,
  ling6HighFreqCopy,
  ling6ProgressCopy,
  ling6ResultCopy,
  scoreLing6Choice,
  toDailySummary,
  TOTAL_TRIAL_COUNT,
  type Ling6Trial,
  type Ling6TrialOutcome,
} from "@/training/ling6/ling6Session";
import {
  listLing6DailyRecords,
  peekHighFreqBaseline,
  peekPreviousDayPassCount,
  upsertLing6DailyRecord,
  type SavedLing6Record,
} from "@/training/ling6/ling6Store";
import {
  playLing6Target,
  stopLing6Playback,
  waitLing6LeadIn,
} from "@/training/ling6/ling6Play";
import {
  LING6_SOUNDS,
  type Ling6Choice,
  type Ling6Sound,
} from "@/training/ling6/sounds";
import { SessionProgressBar } from "@/training/SessionProgressBar";
import { usePauseOnBackground } from "@/hooks/use-pause-on-background";

type Phase = "idle" | "playing" | "choose" | "feedback" | "summary";

/** idle(연습 선택) 화면 텍스트만 균일하게 살짝 키우는 배율(사용자 요청). */
const TEXT_SCALE = 1.2;

function soundLabel(choice: Ling6Choice): string {
  if (choice === "silence") {
    return "못 들었어요";
  }
  return LING6_SOUNDS.find((sound) => sound.id === choice)?.label ?? choice;
}

type Ling6SessionScreenProps = {
  onBack?: () => void;
};

export function Ling6SessionScreen({ onBack }: Ling6SessionScreenProps) {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const abortRef = useRef(false);
  /** 재생 실행 세대. 새 실행이 시작되면 이전 재생은 스스로 빠진다. */
  const runSeqRef = useRef(0);
  const savedRef = useRef(false);
  const trialsRef = useRef<Ling6Trial[]>([]);
  const outcomesRef = useRef<Ling6TrialOutcome[]>([]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [trialIndex, setTrialIndex] = useState(0);
  const [lastCorrect, setLastCorrect] = useState<boolean | undefined>(
    undefined,
  );
  const [lastTarget, setLastTarget] = useState<Ling6Choice | null>(null);
  const [passCount, setPassCount] = useState<number | null>(null);
  const [progressLine, setProgressLine] = useState<string | null>(null);
  const [highFreqLine, setHighFreqLine] = useState<string | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [leadIn, setLeadIn] = useState(false);
  const [history, setHistory] = useState<SavedLing6Record[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  /**
   * 진행 막대가 그리는 값은 ref가 아니라 state로 둔다 — ref는 바꿔도 다시 그리지
   * 않아서 옆에 있는 `setPhase` 덕에 우연히 맞게 보일 뿐이다. ref는 비동기
   * 콜백에서 최신 값을 읽는 용도로 남긴다.
   */
  const [outcomeCount, setOutcomeCount] = useState(0);

  const running =
    phase === "playing" || phase === "choose" || phase === "feedback";
  const choiceDisabled = phase !== "choose";
  // idle 안내 화면에서만 버튼 글자를 키운다(summary·진행 중은 기본 크기).
  const idleTextScale = phase === "idle" ? TEXT_SCALE : 1;

  const resetRun = useCallback(() => {
    abortRef.current = true;
    stopLing6Playback();
    trialsRef.current = [];
    outcomesRef.current = [];
    savedRef.current = false;
    setOutcomeCount(0);
    setTrialIndex(0);
    setLastCorrect(undefined);
    setLastTarget(null);
    setPassCount(null);
    setProgressLine(null);
    setHighFreqLine(null);
    setSaveNote(null);
    setLastError(null);
    setPhase("idle");
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      setHistory(await listLing6DailyRecords());
    } catch {
      setHistory([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      abortRef.current = false;
      void refreshHistory();
      return () => {
        abortRef.current = true;
        stopLing6Playback();
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
    stopLing6Playback();
  });

  useEffect(() => {
    return () => {
      abortRef.current = true;
      stopLing6Playback();
    };
  }, []);

  const openStats = useCallback(() => {
    void refreshHistory();
    setShowStats(true);
  }, [refreshHistory]);

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

  const playCurrent = useCallback(async (index: number) => {
    const trial = trialsRef.current[index];
    if (!trial) {
      return;
    }
    // 이 실행의 세대 번호. 「중지」를 취소해 소리를 다시 틀 때, 끊긴 이전
    // 재생이 abortRef가 false로 돌아간 것을 보고 되살아나 단계를 잘못
    // 넘기는 것을 막는다. abortRef 하나로는 두 실행을 구분할 수 없다.
    const seq = ++runSeqRef.current;
    const aborted = () => abortRef.current || runSeqRef.current !== seq;
    abortRef.current = false;
    setLastError(null);
    setPhase("playing");
    // 첫 소리만 뜸을 들인다 — 두 번째부터는 「고르기 → 다음」 사이가 이미 있다.
    if (index === 0) {
      setLeadIn(true);
      await waitLing6LeadIn();
      setLeadIn(false);
      if (aborted()) {
        return;
      }
    }
    try {
      await playLing6Target(trial.target);
      if (aborted()) {
        return;
      }
      setPhase("choose");
    } catch {
      if (aborted()) {
        return;
      }
      setLastError("소리를 재생하지 못했어요. 다시 시작해 주세요.");
      setPhase("choose");
    }
  }, []);

  const onStart = useCallback(() => {
    abortRef.current = false;
    savedRef.current = false;
    trialsRef.current = createLing6Trials();
    outcomesRef.current = [];
    setOutcomeCount(0);
    setTrialIndex(0);
    setLastCorrect(undefined);
    setLastTarget(null);
    setPassCount(null);
    setProgressLine(null);
    setHighFreqLine(null);
    setSaveNote(null);
    void playCurrent(0);
  }, [playCurrent]);

  const finishSession = useCallback(async () => {
    stopLing6Playback();
    setPhase("summary");

    const byPhoneme = collectPhonemeResults(outcomesRef.current);
    if (!isCompletePhonemeMap(byPhoneme)) {
      setPassCount(null);
      setProgressLine(null);
      setHighFreqLine(null);
      setSaveNote("6음을 다 고르지 않아 날짜 기록에는 안 남겼어요");
      return;
    }

    const nextSummary = toDailySummary(byPhoneme);
    setPassCount(nextSummary.passCount);

    if (savedRef.current) {
      return;
    }
    savedRef.current = true;
    try {
      const previous = await peekPreviousDayPassCount();
      const highFreqPrev = await peekHighFreqBaseline();
      await upsertLing6DailyRecord(byPhoneme);
      setProgressLine(ling6ProgressCopy(previous, nextSummary.passCount));
      setHighFreqLine(ling6HighFreqCopy(highFreqPrev, byPhoneme));
      setSaveNote("기기에 기록했어요");
      await refreshHistory();
    } catch {
      setSaveNote("기록에 남기지 못했어요");
    }
  }, [refreshHistory]);

  const onChoose = useCallback(
    (choice: Ling6Choice) => {
      if (phase !== "choose") {
        return;
      }
      const trial = trialsRef.current[trialIndex];
      if (!trial) {
        return;
      }
      const correct = scoreLing6Choice(trial.target, choice);
      outcomesRef.current = [
        ...outcomesRef.current,
        { target: trial.target, correct },
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
   * 「중지」 — 소리를 **먼저** 끊고 확인을 묻는다.
   *
   * 확인을 먼저 띄우면 대화상자가 떠 있는 내내 재생이 이어져 소리가
   * 안 멈춘다. 취소하면 고르지 않은 이번 소리를 다시 들려준다.
   */
  const onStopPress = useCallback(() => {
    confirmEndSession(onEndManual, {
      onOpen: () => {
        abortRef.current = true;
        stopLing6Playback();
      },
      onCancel: () => {
        void playCurrent(trialIndex);
      },
    });
  }, [onEndManual, playCurrent, trialIndex]);

  if (showStats) {
    return <StatsScreen initialKind="ling6" onBack={closeStats} />;
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
          title="소리 구분"
          caption="들은 소리를 그림에서 고르는 연습 · 병원 검사가 아니에요"
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
          <SessionProgressBar current={outcomeCount} total={TOTAL_TRIAL_COUNT} />
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
                말소리 6개(음·우·아·이·쉬·스) 중 하나를 들려 줘요. 어떤 소리인지
                그림에서 고르면 됩니다. 가끔 아무 소리도 없을 수 있어요. 그때는
                「못 들었어요」를 누르세요.
              </ThemedText>
            </Card>
            {history.length === 0 ? (
              <Image
                source={require("@/assets/ling6/ling6_back.webp")}
                style={[styles.idleImage, { height: windowHeight * 0.45 }]}
                resizeMode="cover"
              />
            ) : null}
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
                오늘 연습이 끝났어요
              </ThemedText>
            </View>
            {passCount != null ? (
              <Card size="large" style={styles.summaryCard}>
                <ThemedText type="heading" style={styles.resultLine}>
                  {ling6ResultCopy(passCount)}
                </ThemedText>
                {progressLine ? (
                  <ThemedText type="smallBold" style={{ color: theme.accent }}>
                    {progressLine}
                  </ThemedText>
                ) : null}
                {highFreqLine ? (
                  <ThemedText
                    type="smallBold"
                    style={{ color: theme.positive }}
                  >
                    {highFreqLine}
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
                {leadIn ? "곧 들어요…" : null}
                {!leadIn && phase === "playing"
                  ? "듣는 중… 소리가 끝난 뒤 고르세요"
                  : null}
                {phase === "choose" ? "들은 소리를 고르세요" : null}
                {phase === "feedback"
                  ? lastCorrect
                    ? "맞았어요"
                    : `아쉬워요 · 정답은 ${soundLabel(lastTarget ?? "silence")}`
                  : null}
              </ThemedText>
            </View>

            <View style={styles.choiceGrid}>
              {LING6_SOUNDS.map((sound) => (
                <ChoiceCell
                  key={sound.id}
                  sound={sound}
                  disabled={choiceDisabled}
                  marked={
                    phase === "feedback" && lastTarget === sound.id
                      ? "answer"
                      : null
                  }
                  onPress={() => onChoose(sound.id)}
                />
              ))}
            </View>

            {/* 「못 들었어요」도 보기의 하나라 스크롤 안에 둔다. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="못 들었어요"
              accessibilityState={{ disabled: choiceDisabled }}
              disabled={choiceDisabled}
              onPress={() => onChoose("silence")}
              style={({ pressed }) => [
                styles.silenceButton,
                {
                  backgroundColor: theme.surface,
                  borderColor:
                    phase === "feedback" && lastTarget === "silence"
                      ? theme.accent
                      : theme.border,
                },
                pressed && !choiceDisabled && styles.pressed,
                choiceDisabled && styles.disabled,
              ]}
            >
              <ThemedText type="smallBold">못 들었어요</ThemedText>
            </Pressable>
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
              textScale={idleTextScale}
              onPress={onStart}
            />
          ) : null}

          {phase === "summary" ? (
            <ActionButton fill={false} label="처음으로" onPress={resetRun} />
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

function ChoiceCell({
  sound,
  disabled,
  marked,
  onPress,
}: Readonly<{
  sound: Ling6Sound;
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
        accessibilityLabel={sound.label}
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
          source={sound.image}
          style={styles.choiceImage}
          resizeMode="contain"
        />
        <ThemedText type="smallBold">{sound.label}</ThemedText>
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
  idleImage: {
    width: "90%",
    alignSelf: "center",
    borderRadius: Radius.large - 4,
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
   * 짧은 화면(568dp)에서는 기본 글씨에서도 그림 6개 중 4개만 보이고
   * 「쉬」·「스」와 「못 들었어요」가 화면 밖으로 밀려 고를 수조차 없었다.
   * `flexShrink: 1`인 이유는 `WrsSessionScreen`과 같다.
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
  choiceCellOuter: {
    width: "31.5%",
  },
  choiceCell: {
    width: "100%",
    borderWidth: 1.5,
    borderRadius: Radius.large - 4,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
    alignItems: "center",
    gap: 2,
  },
  choiceImage: {
    width: "100%",
    height: 78,
  },
  silenceButton: {
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingVertical: Spacing.three,
    alignItems: "center",
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
