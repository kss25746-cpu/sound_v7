import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
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
import { Equalizer } from "@/components/ui/equalizer";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { ListeningCheckEntryButton } from "@/components/ui/listening-check-entry-button";
import { StatsEntryButton } from "@/components/ui/stats-entry-button";
import { Card } from "@/components/ui/card";
import {
  MaxContentWidth,
  Radius,
  Shadows,
  Spacing,
} from "@/constants/theme";
import { usePauseOnBackground } from "@/hooks/use-pause-on-background";
import { useTheme } from "@/hooks/use-theme";
import { confirmEndSession } from "@/training/confirmEndSession";
import {
  AUDIO,
  DEFAULT_PITCH_LEVEL_CENTS,
  PITCH_LEVEL_LABEL,
  PITCH_TRIAL_COUNT,
  type PitchLevelCents,
} from "@/training/pitch2afc/constants";
import { PitchLevelToggle } from "@/training/pitch2afc/PitchLevelToggle";
import {
  abortPitchPlayback,
  playPitchPair,
} from "@/training/pitch2afc/pitchCompareTrial";
import {
  isFullPitchSession,
  pitchEndReasonLabel,
  summarizePitchCompare,
  type PitchCompareEndReason,
  type PitchCompareSummary,
} from "@/training/pitch2afc/pitchSummary";
import {
  SessionManager,
  type SessionResult,
} from "@/training/pitch2afc/SessionManager";
import { SessionProgressBar } from "@/training/SessionProgressBar";
import { appendPitch2SessionSummary } from "@/training/sessionStore";

/** idle(연습 선택) 화면 텍스트만 균일하게 살짝 키우는 배율(사용자 요청). */
const TEXT_SCALE = 1.2;

type Phase = "idle" | "playing" | "choose" | "feedback" | "summary";

type EndReason = PitchCompareEndReason;

function summarize(
  result: SessionResult,
  endReason: EndReason,
): PitchCompareSummary {
  return summarizePitchCompare({
    trialCount: result.totalTrials,
    correctCount: result.correctCount,
    levelCents: result.centsDifference,
    endReason,
  });
}

function phaseCaption(phase: Phase, correct: boolean | undefined): string {
  switch (phase) {
    case "playing":
      return "듣는 중… 소리가 끝난 뒤 고르세요";
    case "choose":
      return "두 번째 소리가 더 높았나요, 낮았나요?";
    case "feedback":
      return correct ? "맞았어요" : "아쉬워요";
    case "summary":
      return "오늘 연습이 끝났어요";
    default:
      return "난이도를 고르고 시작하면 12 문항이 이어집니다";
  }
}

function progressCaption(
  phase: Phase,
  trialNumber: number,
  levelCents: PitchLevelCents,
): string {
  const levelLabel = PITCH_LEVEL_LABEL[levelCents];
  if (phase === "idle") {
    return `${PITCH_TRIAL_COUNT}문항 · ${levelLabel}`;
  }
  return `${trialNumber}/${PITCH_TRIAL_COUNT} · ${levelLabel}`;
}

/** 2택 답 버튼 하나. pressed 강조 분기를 여기로 모아 화면 복잡도를 낮춘다. */
function ChoiceButton({
  label,
  a11yLabel,
  icon,
  disabled,
  onPress,
}: Readonly<{
  label: string;
  a11yLabel: string;
  icon: "arrowUp" | "arrowDown";
  disabled: boolean;
  onPress: () => void;
}>) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => {
        const active = pressed && !disabled;
        return [
          styles.choiceButton,
          {
            backgroundColor: active ? theme.accentTint : theme.surface,
            borderColor: active ? theme.accentBorder : theme.border,
          },
          Shadows.card,
          disabled && styles.disabled,
        ];
      }}
    >
      <Icon name={icon} size={30} color={theme.accent} strokeWidth={2.2} />
      <ThemedText type="smallBold" style={styles.choiceLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** 화면 상단 — idle은 히어로, 진행/요약은 제목 + 진행 배지(또는 종료 사유). */
function SessionHeader({
  phase,
  trialNumber,
  correct,
  endReason,
  levelCents,
  onLevelChange,
}: Readonly<{
  phase: Phase;
  trialNumber: number;
  correct: boolean | undefined;
  endReason: EndReason | null;
  levelCents: PitchLevelCents;
  onLevelChange: (next: PitchLevelCents) => void;
}>) {
  const theme = useTheme();

  if (phase === "idle") {
    return (
      <ScrollView
        style={styles.heroScroll}
        contentContainerStyle={styles.hero}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroMark, { backgroundColor: theme.accentTint }]}>
          <View
            style={[styles.heroRing, { borderColor: theme.accentBorder }]}
          />
          <Icon name="bars" size={40} color={theme.accent} />
        </View>
        <ThemedText type="heading" style={styles.heroHeading}>
          높낮이 비교
        </ThemedText>
        <PitchLevelToggle
          value={levelCents}
          onChange={onLevelChange}
          textScale={TEXT_SCALE}
          style={{ marginBottom: Spacing.six }}
        />
        <Pill
          mono
          textScale={TEXT_SCALE}
          label={progressCaption(phase, trialNumber, levelCents)}
        />
        <ThemedText
          type="smallBold"
          style={[styles.heroPrompt, styles.heroPromptScaled]}
        >
          {phaseCaption(phase, correct)}
        </ThemedText>
      </ScrollView>
    );
  }

  const showEndReason = phase === "summary" && endReason != null;
  return (
    <View style={styles.header}>
      <ThemedText type="screenTitle" style={styles.runningTitle}>
        높낮이 비교
      </ThemedText>
      <ThemedText themeColor="textMuted" type="small" style={styles.disclaimer}>
        웰니스 연습 · 병원 검사·진단을 대신하지 않아요
      </ThemedText>
      {showEndReason ? (
        <ThemedText
          themeColor="textSecondary"
          type="small"
          style={styles.caption}
        >
          {pitchEndReasonLabel(endReason)}
        </ThemedText>
      ) : (
        <Pill
          mono
          variant="surface"
          label={progressCaption(phase, trialNumber, levelCents)}
        />
      )}
    </View>
  );
}

function SessionActions({
  phase,
  canGoBack,
  onStart,
  onBack,
  onReturnToStart,
  onNext,
  onEndManual,
  onStopPress,
}: Readonly<{
  phase: Phase;
  canGoBack: boolean;
  onStart: () => void;
  onBack: () => void;
  onReturnToStart: () => void;
  onNext: () => void;
  onEndManual: () => void;
  onStopPress: () => void;
}>) {
  const atRest = phase === "idle" || phase === "summary";
  const playingOrChoosing = phase === "playing" || phase === "choose";
  const idleTextScale = phase === "idle" ? TEXT_SCALE : 1;

  return (
    <View style={[styles.actions, playingOrChoosing && styles.stopActions]}>
      {atRest ? (
        <>
          <ActionButton
            variant="primary"
            label={phase === "summary" ? "다시 연습" : "시작"}
            textScale={idleTextScale}
            onPress={onStart}
          />
          {phase === "summary" ? (
            <ActionButton
              label="처음으로"
              textScale={idleTextScale}
              onPress={onReturnToStart}
            />
          ) : null}
          {canGoBack ? (
            <ActionButton
              label="뒤로 가기"
              textScale={idleTextScale}
              onPress={onBack}
            />
          ) : null}
        </>
      ) : null}

      {phase === "feedback" ? (
        <>
          <ActionButton variant="primary" label="다음" onPress={onNext} />
          <ActionButton
            label="끝내기"
            onPress={() => confirmEndSession(onEndManual)}
          />
        </>
      ) : null}

      {playingOrChoosing ? (
        <ActionButton icon="stop" label="중지" onPress={onStopPress} />
      ) : null}
    </View>
  );
}

type PitchCompareScreenProps = {
  /** 연습 목록으로 돌아가기(idle·요약에서만 노출). */
  onBack?: () => void;
  onOpenStats?: () => void;
  onOpenListeningCheck?: () => void;
  autoStart?: boolean;
  onAutoStartConsumed?: () => void;
  initialLevelCents?: PitchLevelCents;
};

/**
 * 「높낮이 비교」 — 기준음 A → 목표음 B 를 듣고 B가 더 높은지/낮은지 고르는 훈련(2택).
 *
 * 한 판의 간격은 고정. 문항 수는 12. 귀풀기 없음. 저장은 12문항을 다 푼 판만.
 */
export function PitchCompareScreen({
  onBack,
  onOpenStats,
  onOpenListeningCheck,
  autoStart = false,
  onAutoStartConsumed,
  initialLevelCents = DEFAULT_PITCH_LEVEL_CENTS,
}: Readonly<PitchCompareScreenProps>) {
  const theme = useTheme();
  const abortRef = useRef(false);
  const runSeqRef = useRef(0);
  const managerRef = useRef<SessionManager | null>(null);
  const savedRef = useRef(false);
  /**
   * **이 판이 실제로 쓰는 간격.** 토글이 고른 값(`levelCents`)과 따로 둔다 —
   * 진행 중에 토글을 만져도 헤더 배지는 시작할 때 고른 간격을 그대로 보여야 한다.
   *
   * 전에는 ref였고 렌더 중에 `runLevelRef.current`를 읽었다. `app.json`의
   * `experiments.reactCompiler`가 켜져 있는데 **ref 읽기는 반응형 의존성이 아니라**
   * 컴파일러가 추적하지 않는다 — 메모이즈 범위가 바뀌면 배지가 옛 값에 굳을 수 있다.
   * 시작 시점 값을 state로 박아 두면 그 위험이 없다.
   */
  const [runLevelCents, setRunLevelCents] =
    useState<PitchLevelCents>(initialLevelCents);
  const [phase, setPhase] = useState<Phase>("idle");
  const [levelCents, setLevelCents] =
    useState<PitchLevelCents>(initialLevelCents);
  const [trialNumber, setTrialNumber] = useState(0);
  const [correct, setCorrect] = useState<boolean | undefined>(undefined);
  const [summary, setSummary] = useState<PitchCompareSummary | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current = true;
      abortPitchPlayback();
    };
  }, []);

  /**
   * 백그라운드로 가면 이 판을 세운다. 소리는 `audio-manager`의 전역 게이트가 끊고,
   * 여기서는 진행만 멈춘다 — 안 들은 문항이 혼자 넘어가 오답으로 기록되는 걸 막는다.
   * 하는 일은 탭 이탈(blur) 때와 같다.
   */
  usePauseOnBackground(() => {
    abortRef.current = true;
    abortPitchPlayback();
  });

  const runRound = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager) {
      return;
    }

    setLastError(null);
    setCorrect(undefined);
    const seq = ++runSeqRef.current;
    const aborted = () => abortRef.current || runSeqRef.current !== seq;
    abortRef.current = false;

    const state = manager.prepareRound();
    setTrialNumber(state.totalTrials + 1);
    setPhase("playing");

    try {
      await playPitchPair(state.baseFreq, state.targetFreq, {
        shouldAbort: aborted,
      });
      if (aborted()) {
        return;
      }
      manager.openResponseWindow();
      setPhase("choose");
    } catch (e) {
      if (e instanceof Error && e.message === "ABORTED") {
        return;
      }
      setLastError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
      managerRef.current = null;
    }
  }, []);

  const finish = useCallback((reason: EndReason) => {
    const manager = managerRef.current;
    abortRef.current = true;
    abortPitchPlayback();
    if (!manager) {
      setPhase("idle");
      return;
    }
    const result = manager.endSession();
    const nextSummary = summarize(result, reason);
    setSummary(nextSummary);
    setPhase("summary");

    if (savedRef.current) {
      return;
    }
    savedRef.current = true;
    if (!isFullPitchSession(nextSummary.trialCount)) {
      setSaveNote("연습이 짧아서 기록에는 안 남겼어요");
      return;
    }
    setSaveNote(null);
    void appendPitch2SessionSummary(nextSummary)
      .then(() => setSaveNote("기기에 기록했어요"))
      .catch(() => setSaveNote("기록 저장에 실패했어요"));
  }, []);

  const onStart = useCallback(() => {
    setRunLevelCents(levelCents);
    const manager = new SessionManager({
      mode: "training",
      baseFreq: AUDIO.BASE_FREQ,
      soundMode: "wave",
      centsDifference: levelCents,
    });
    manager.startSession();
    managerRef.current = manager;
    savedRef.current = false;
    setSummary(null);
    setSaveNote(null);
    setCorrect(undefined);
    void runRound();
  }, [levelCents, runRound]);

  const autoStartOnceRef = useRef(false);
  useEffect(() => {
    if (!autoStart || autoStartOnceRef.current) {
      return;
    }
    autoStartOnceRef.current = true;
    onStart();
    onAutoStartConsumed?.();
  }, [autoStart, onAutoStartConsumed, onStart]);

  const onAnswer = useCallback(
    (userThinksHigher: boolean) => {
      const manager = managerRef.current;
      if (!manager || phase !== "choose") {
        return;
      }
      const result = manager.submitAnswer(userThinksHigher);
      setCorrect(result.isCorrect);
      setPhase("feedback");
    },
    [phase],
  );

  const onNext = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) {
      return;
    }
    if (manager.shouldAutoEnd()) {
      finish("complete");
      return;
    }
    void runRound();
  }, [finish, runRound]);

  const onEndManual = useCallback(() => {
    finish("manual");
  }, [finish]);

  const onStopPress = useCallback(() => {
    confirmEndSession(onEndManual, {
      onOpen: () => {
        abortRef.current = true;
        abortPitchPlayback();
      },
      onCancel: () => {
        if (!managerRef.current) {
          return;
        }
        void runRound();
      },
    });
  }, [onEndManual, runRound]);

  const returnToStart = useCallback(() => {
    abortRef.current = true;
    runSeqRef.current += 1;
    abortPitchPlayback();
    managerRef.current = null;
    setSummary(null);
    setSaveNote(null);
    setCorrect(undefined);
    setLastError(null);
    setTrialNumber(0);
    setPhase("idle");
  }, []);

  const leaveToList = useCallback(() => {
    abortRef.current = true;
    abortPitchPlayback();
    managerRef.current = null;
    onBack?.();
  }, [onBack]);

  useFocusEffect(
    useCallback(() => {
      if (phase === "idle") {
        if (!onBack) {
          return;
        }
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
          leaveToList();
          return true;
        });
        return () => sub.remove();
      }
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (phase === "summary") {
          returnToStart();
          return true;
        }
        if (phase === "feedback") {
          confirmEndSession(onEndManual);
          return true;
        }
        onStopPress();
        return true;
      });
      return () => sub.remove();
    }, [leaveToList, onBack, onEndManual, onStopPress, phase, returnToStart]),
  );

  const choiceDisabled = phase !== "choose";
  const running =
    phase === "playing" || phase === "choose" || phase === "feedback";
  const sessionLevel = running ? runLevelCents : levelCents;

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        {(onOpenStats || onOpenListeningCheck) &&
        (phase === "idle" || phase === "summary") ? (
          <View style={styles.statsRow}>
            {onOpenListeningCheck ? (
              <ListeningCheckEntryButton onPress={onOpenListeningCheck} />
            ) : null}
            {onOpenStats ? (
              <StatsEntryButton onPress={onOpenStats} />
            ) : null}
          </View>
        ) : null}
        <SessionHeader
          phase={phase}
          trialNumber={trialNumber}
          correct={correct}
          endReason={summary?.endReason ?? null}
          levelCents={sessionLevel}
          onLevelChange={setLevelCents}
        />
        {running ? (
          <SessionProgressBar
            current={trialNumber}
            total={PITCH_TRIAL_COUNT}
          />
        ) : null}

        {phase === "summary" ? (
          <ScrollView
            style={styles.summaryScroll}
            contentContainerStyle={styles.summaryScrollContent}
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
                {phaseCaption(phase, correct)}
              </ThemedText>
            </View>

            {summary ? (
              <Card size="large" style={styles.summaryCard}>
                <ThemedText type="metric" style={styles.summaryPercent}>
                  {`약 ${summary.percent}%`}
                </ThemedText>
                <ThemedText type="smallBold" style={styles.summaryCount}>
                  {`${summary.correctCount}/${summary.trialCount}`}
                </ThemedText>
                {summary.levelCents != null ? (
                  <ThemedText
                    themeColor="textMuted"
                    type="small"
                    style={styles.caption}
                  >
                    {`${summary.levelCents} cent`}
                  </ThemedText>
                ) : null}
                <ThemedText
                  themeColor="textMuted"
                  type="small"
                  style={styles.caption}
                >
                  그 간격에서 맞힌 비율 · 점수·청력 검사·진단 결과 아님
                </ThemedText>
              </Card>
            ) : null}

            {saveNote ? (
              <ThemedText
                themeColor="textSecondary"
                type="small"
                style={styles.caption}
              >
                {saveNote}
              </ThemedText>
            ) : null}
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
                height={26}
                barWidth={4}
                bars={4}
                playing={phase === "playing"}
              />
              <ThemedText
                type="smallBold"
                themeColor="textSecondary"
                style={styles.statusText}
              >
                {phaseCaption(phase, correct)}
              </ThemedText>
            </View>

            <View style={styles.choices}>
              <ChoiceButton
                label="더 낮아요"
                a11yLabel="두 번째 소리가 더 낮아요"
                icon="arrowDown"
                disabled={choiceDisabled}
                onPress={() => onAnswer(false)}
              />
              <ChoiceButton
                label="더 높아요"
                a11yLabel="두 번째 소리가 더 높아요"
                icon="arrowUp"
                disabled={choiceDisabled}
                onPress={() => onAnswer(true)}
              />
            </View>
          </ScrollView>
        ) : null}

        {lastError ? (
          <ThemedText
            themeColor="textSecondary"
            type="small"
            style={styles.caption}
          >
            {lastError}
          </ThemedText>
        ) : null}

        <SessionActions
          phase={phase}
          canGoBack={onBack != null}
          onStart={onStart}
          onBack={leaveToList}
          onReturnToStart={returnToStart}
          onNext={onNext}
          onEndManual={onEndManual}
          onStopPress={onStopPress}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 26,
    alignItems: "stretch",
    gap: Spacing.two + 2,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.two,
  },
  heroScroll: {
    flex: 1,
    alignSelf: "stretch",
    marginBottom: -(Spacing.two + 2),
  },
  hero: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two + 2,
  },
  heroHeading: {
    fontSize: 26 * TEXT_SCALE,
    lineHeight: 34 * TEXT_SCALE,
  },
  heroPromptScaled: {
    fontSize: 12.5 * TEXT_SCALE,
    lineHeight: 19 * TEXT_SCALE,
  },
  heroMark: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.three - 2,
  },
  heroRing: {
    position: "absolute",
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 52,
    borderWidth: 1,
  },
  heroPrompt: {
    textAlign: "center",
    maxWidth: 240,
    fontSize: 14,
    lineHeight: 20,
  },
  header: {
    alignItems: "center",
    gap: Spacing.two,
  },
  runningTitle: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.22,
    textAlign: "center",
  },
  caption: {
    textAlign: "center",
  },
  disclaimer: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  headline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two - 1,
    marginTop: Spacing.one,
  },
  headlineText: {
    fontSize: 15,
    lineHeight: 22,
  },
  runningScroll: {
    flex: 1,
  },
  runningContent: {
    flexGrow: 1,
    gap: Spacing.two + 2,
  },
  promptArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 26,
  },
  statusText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    textAlign: "center",
  },
  choices: {
    flexDirection: "row",
    gap: 12,
  },
  choiceButton: {
    flex: 1,
    minHeight: 132,
    borderWidth: 1.5,
    borderRadius: Radius.large,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: Spacing.two,
  },
  choiceLabel: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
  },
  summaryScroll: {
    flex: 1,
    alignSelf: "stretch",
  },
  summaryScrollContent: {
    gap: Spacing.two + 2,
    paddingBottom: Spacing.two,
  },
  summaryCard: {
    alignItems: "center",
    gap: Spacing.two,
  },
  summaryPercent: {
    fontSize: 34,
    lineHeight: 38,
  },
  summaryCount: {
    fontSize: 16,
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: Spacing.two,
  },
  stopActions: {
    marginTop: 16,
  },
  disabled: {
    opacity: 0.4,
  },
});
