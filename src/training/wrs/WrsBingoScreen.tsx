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
import { ScreenHeader } from "@/components/ui/screen-header";
import {
  MaxContentWidth,
  Radius,
  Shadows,
  Spacing,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { confirmEndSession } from "@/training/confirmEndSession";
import {
  BINGO_CELL_COUNT,
  BINGO_MAX_CUES,
  bingoLineCells,
  bingoResultCopy,
  createBingoBoard,
  pickBingoCue,
  scoreBingoTap,
  summarizeBingo,
  type BingoSummary,
} from "@/training/wrs/wrsBingo";
import type { WrsDifficulty } from "@/training/wrs/wrsDistractors";
import { speakWrsWord, stopWrsSpeech } from "@/training/wrs/wrsTts";
import { usePauseOnBackground } from "@/hooks/use-pause-on-background";
import { useOutputKeepAlive } from "@/hooks/use-output-keep-alive";

type Phase = "idle" | "playing" | "choose" | "feedback" | "summary";

type WrsBingoScreenProps = {
  onBack: () => void;
  /** 목록에서 막 들어왔을 때 바로 시작. */
  autoStart?: boolean;
  onAutoStartConsumed?: () => void;
  initialDifficulty?: WrsDifficulty;
};

export function WrsBingoScreen({
  onBack,
  autoStart = false,
  onAutoStartConsumed,
  initialDifficulty = "easy",
}: Readonly<WrsBingoScreenProps>) {
  const theme = useTheme();
  const abortRef = useRef(false);
  /** 낭독 실행 세대. 새 실행이 시작되면 이전 낭독은 스스로 빠진다. */
  const runSeqRef = useRef(0);
  const boardRef = useRef<string[]>([]);
  const markedRef = useRef<boolean[]>(emptyMarked());
  const cueRef = useRef<string | null>(null);
  const cueCountRef = useRef(0);

  const [phase, setPhase] = useState<Phase>("idle");
  const [board, setBoard] = useState<string[]>([]);
  const [marked, setMarked] = useState<boolean[]>(emptyMarked());
  const [line, setLine] = useState<readonly number[] | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | undefined>(
    undefined,
  );
  const [lastMarked, setLastMarked] = useState<number | null>(null);
  const [cueUsed, setCueUsed] = useState(0);
  const [summary, setSummary] = useState<BingoSummary | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastDifficulty, setLastDifficulty] =
    useState<WrsDifficulty>(initialDifficulty);

  const running =
    phase === "playing" || phase === "choose" || phase === "feedback";
  const tapDisabled = phase !== "choose";
  const markedCount = marked.filter(Boolean).length;

  const resetRun = useCallback(() => {
    abortRef.current = true;
    void stopWrsSpeech();
    boardRef.current = [];
    markedRef.current = emptyMarked();
    cueRef.current = null;
    cueCountRef.current = 0;
    setBoard([]);
    setMarked(emptyMarked());
    setLine(null);
    setLastCorrect(undefined);
    setLastMarked(null);
    setCueUsed(0);
    setSummary(null);
    setLastError(null);
    setPhase("idle");
  }, []);

  const leaveToA = useCallback(() => {
    abortRef.current = true;
    void stopWrsSpeech();
    onBack();
  }, [onBack]);

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
      if (phase === "idle" || phase === "summary") {
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
          leaveToA();
          return true;
        });
        return () => sub.remove();
      }
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        confirmEndSession(resetRun);
        return true;
      });
      return () => sub.remove();
    }, [leaveToA, phase, resetRun]),
  );

  const finishRun = useCallback((nextLine: readonly number[] | null) => {
    abortRef.current = true;
    void stopWrsSpeech();
    setLastError(null);
    setLine(nextLine);
    setSummary(
      summarizeBingo({
        cueCount: cueCountRef.current,
        marked: markedRef.current,
      }),
    );
    setPhase("summary");
  }, []);

  const playCue = useCallback(
    async (avoid: string | null) => {
      const nextCue = pickBingoCue(
        boardRef.current,
        markedRef.current,
        Math.random,
        avoid,
      );
      if (!nextCue) {
        finishRun(bingoLineCells(markedRef.current));
        return;
      }
      cueRef.current = nextCue;
      cueCountRef.current += 1;
      setCueUsed(cueCountRef.current);
      // 이 실행의 세대 번호. 「중지」를 취소해 단서를 다시 읽힐 때, 끊긴
      // 이전 낭독이 abortRef가 false로 돌아간 것을 보고 되살아나 단계를
      // 잘못 넘기는 것을 막는다.
      const seq = ++runSeqRef.current;
      const aborted = () => abortRef.current || runSeqRef.current !== seq;
      abortRef.current = false;
      setLastError(null);
      setLastCorrect(undefined);
      setPhase("playing");
      if (__DEV__) {
        console.log(`[WrsBingo] cue: ${nextCue}`);
      }
      try {
        await speakWrsWord(nextCue);
        if (aborted()) {
          return;
        }
        setPhase("choose");
      } catch {
        if (aborted()) {
          return;
        }
        setLastError("단어를 읽지 못했어요. 칸을 고르거나 다시 시작해 주세요.");
        setPhase("choose");
      }
    },
    [finishRun],
  );

  /**
   * 지금 단서를 **다시** 읽어 준다. 기회를 소모하지 않는다.
   *
   * `playCue`는 새 단서를 뽑으면서 `cueCountRef`를 1 올린다. 「중지」를
   * 취소한 것뿐인데 남은 기회가 줄면 안 되므로 이 경로를 따로 둔다.
   */
  const replayCue = useCallback(async () => {
    const cue = cueRef.current;
    if (!cue) {
      return;
    }
    const seq = ++runSeqRef.current;
    const aborted = () => abortRef.current || runSeqRef.current !== seq;
    abortRef.current = false;
    setLastError(null);
    setPhase("playing");
    try {
      await speakWrsWord(cue);
      if (aborted()) {
        return;
      }
      setPhase("choose");
    } catch {
      if (aborted()) {
        return;
      }
      setLastError("단어를 읽지 못했어요. 칸을 고르거나 다시 시작해 주세요.");
      setPhase("choose");
    }
  }, []);

  const onStart = useCallback(
    (difficulty: WrsDifficulty) => {
      abortRef.current = false;
      setLastDifficulty(difficulty);
      const nextBoard = createBingoBoard(difficulty);
      boardRef.current = nextBoard;
      markedRef.current = emptyMarked();
      cueRef.current = null;
      cueCountRef.current = 0;
      setBoard(nextBoard);
      setMarked(emptyMarked());
      setLine(null);
      setSummary(null);
      setLastCorrect(undefined);
      setLastMarked(null);
      setCueUsed(0);
      setLastError(null);
      void playCue(null);
    },
    [playCue],
  );

  const autoStartOnceRef = useRef(false);
  useEffect(() => {
    if (!autoStart || autoStartOnceRef.current) {
      return;
    }
    autoStartOnceRef.current = true;
    onStart(initialDifficulty);
    onAutoStartConsumed?.();
  }, [autoStart, initialDifficulty, onAutoStartConsumed, onStart]);

  const onTap = useCallback(
    (choice: string, index: number) => {
      if (phase !== "choose") {
        return;
      }
      if (markedRef.current[index]) {
        return;
      }
      const cue = cueRef.current;
      if (!cue) {
        return;
      }
      const correct = scoreBingoTap(cue, choice);
      setLastCorrect(correct);
      if (!correct) {
        if (cueCountRef.current >= BINGO_MAX_CUES) {
          finishRun(null);
          return;
        }
        setPhase("feedback");
        return;
      }
      setLastError(null);
      const nextMarked = markedRef.current.map((on, i) =>
        i === index ? true : on,
      );
      markedRef.current = nextMarked;
      setMarked(nextMarked);
      setLastMarked(index);
      const nextLine = bingoLineCells(nextMarked);
      if (nextLine) {
        finishRun(nextLine);
        return;
      }
      if (cueCountRef.current >= BINGO_MAX_CUES) {
        finishRun(null);
        return;
      }
      setPhase("feedback");
    },
    [finishRun, phase],
  );

  const onNext = useCallback(() => {
    const nextLine = bingoLineCells(markedRef.current);
    if (nextLine || cueCountRef.current >= BINGO_MAX_CUES) {
      finishRun(nextLine);
      return;
    }
    const avoid = lastCorrect ? null : cueRef.current;
    void playCue(avoid);
  }, [finishRun, lastCorrect, playCue]);

  const onEndManual = useCallback(() => {
    finishRun(bingoLineCells(markedRef.current));
  }, [finishRun]);

  /**
   * 「중지」 — 읽던 소리를 **먼저** 끊고 확인을 묻는다.
   *
   * 확인을 먼저 띄우면 대화상자가 떠 있는 내내 낭독이 이어져 소리가
   * 안 멈춘다. 취소하면 같은 단서를 다시 읽어 준다(기회는 그대로).
   */
  const onStopPress = useCallback(() => {
    confirmEndSession(onEndManual, {
      onOpen: () => {
        abortRef.current = true;
        void stopWrsSpeech();
      },
      onCancel: () => {
        void replayCue();
      },
    });
  }, [onEndManual, replayCue]);

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <ScreenHeader
          title="단어 빙고"
          caption="들은 단어를 판에서 눌러요 · 편하게 연습해요"
        />

        {phase === "idle" ? (
          <ScrollView
            style={styles.fill}
            contentContainerStyle={styles.idleContent}
            showsVerticalScrollIndicator={false}
          >
            <Card style={styles.idleCard}>
              <ThemedText type="smallBold">이렇게 놀아요</ThemedText>
              <ThemedText themeColor="textSecondary" type="caption">
                3×3 판에 단어가 있어요. 들린 칸을 누르면 칠해집니다.
                가로·세로·대각 한 줄이면 끝나요. 맞히기 기록에는 안 남아요.
              </ThemedText>
            </Card>
            <BingoModeToggle
              value={lastDifficulty}
              onChange={setLastDifficulty}
            />
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
                {summary ? bingoResultCopy(summary) : "연습이 끝났어요"}
              </ThemedText>
            </View>
            {board.length === BINGO_CELL_COUNT ? (
              <View style={styles.boardWrap}>
                {summary?.won ? <ConfettiBurst /> : null}
                <BingoBoard
                  board={board}
                  marked={marked}
                  line={line}
                  phase={phase}
                  lastMarked={lastMarked}
                  lastCorrect={undefined}
                  disabled
                  onPress={() => undefined}
                />
              </View>
            ) : null}
            {summary ? (
              <View
                style={[
                  styles.statRow,
                  { backgroundColor: theme.accentTint },
                ]}
              >
                <StatFact
                  value={String(summary.lineCount)}
                  label="완성한 줄"
                />
                <View
                  style={[
                    styles.statDivider,
                    { backgroundColor: theme.accentBorder },
                  ]}
                />
                <StatFact
                  value={String(summary.markedCount)}
                  label="표시한 칸"
                />
                <View
                  style={[
                    styles.statDivider,
                    { backgroundColor: theme.accentBorder },
                  ]}
                />
                <StatFact
                  value={String(summary.cueCount)}
                  label="들은 단어"
                />
              </View>
            ) : null}
            <BingoModeToggle
              value={lastDifficulty}
              onChange={setLastDifficulty}
            />
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
                playing={phase === "playing"}
              />
              <ThemedText
                type="smallBold"
                themeColor={phase === "playing" ? "textSecondary" : "accent"}
                style={styles.statusText}
              >
                {promptCopy(phase, lastCorrect)}
              </ThemedText>
            </View>

            <View style={styles.hud}>
              <Pill label={`표시 ${markedCount} / 9`} />
              <Pill
                variant="surface"
                label={`기회 ${Math.max(0, BINGO_MAX_CUES - cueUsed)}번 남음`}
              />
            </View>

            {board.length === BINGO_CELL_COUNT ? (
              <BingoBoard
                board={board}
                marked={marked}
                line={line}
                phase={phase}
                lastMarked={lastMarked}
                lastCorrect={lastCorrect}
                disabled={tapDisabled}
                onPress={onTap}
              />
            ) : null}

            {lastError ? (
              <ThemedText themeColor="textSecondary" type="caption">
                {lastError}
              </ThemedText>
            ) : null}
          </ScrollView>
        ) : null}

        <View style={styles.actions}>
          {phase === "idle" ? (
            <View style={styles.actionRow}>
              <ActionButton
                variant="primary"
                label="시작"
                accessibilityLabel={`${difficultyA11y(lastDifficulty)} 시작`}
                onPress={() => onStart(lastDifficulty)}
              />
              <ActionButton label="뒤로 가기" onPress={leaveToA} />
            </View>
          ) : null}

          {phase === "summary" ? (
            <View style={styles.actionRow}>
              <ActionButton
                variant="primary"
                label="다시 하기"
                accessibilityLabel={`${difficultyA11y(lastDifficulty)} 다시 하기`}
                onPress={() => onStart(lastDifficulty)}
              />
              <ActionButton label="뒤로 가기" onPress={leaveToA} />
            </View>
          ) : null}

          {phase === "feedback" ? (
            <View style={styles.actionRow}>
              <ActionButton variant="primary" label="다음" onPress={onNext} />
              <ActionButton
                label="끝내기"
                onPress={() => confirmEndSession(onEndManual)}
              />
            </View>
          ) : null}

          {phase === "playing" || phase === "choose" ? (
            <View style={styles.actionRow}>
              <ActionButton label="중지" onPress={onStopPress} />
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function emptyMarked(): boolean[] {
  return Array.from({ length: BINGO_CELL_COUNT }, () => false);
}

const BINGO_MODES: readonly { key: WrsDifficulty; label: string }[] = [
  { key: "easy", label: "쉬운 판" },
  { key: "hard", label: "비슷한 소리" },
];

function difficultyA11y(d: WrsDifficulty): string {
  return d === "hard" ? "비슷한 소리 판" : "쉬운 판";
}

function BingoModeToggle({
  value,
  onChange,
}: Readonly<{
  value: WrsDifficulty;
  onChange: (next: WrsDifficulty) => void;
}>) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.modeRow, { borderColor: theme.border }]}
    >
      {BINGO_MODES.map((mode) => {
        const active = mode.key === value;
        return (
          <Pressable
            key={mode.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={difficultyA11y(mode.key)}
            onPress={() => onChange(mode.key)}
            style={[
              styles.modeSegment,
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
              {mode.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function promptCopy(
  phase: Phase,
  lastCorrect: boolean | undefined,
): string | null {
  if (phase === "playing") {
    return "듣는 중… 소리가 끝난 뒤 칸을 누르세요";
  }
  if (phase === "choose") {
    return "들은 단어를 누르세요";
  }
  if (phase !== "feedback") {
    return null;
  }
  if (lastCorrect) {
    return "맞았어요";
  }
  return "아쉬워요 · 그 칸이 아니에요";
}

/** 결과 화면의 사실 숫자. 점수·등급 아님 — "몇 줄/몇 칸/몇 단어"만. */
function StatFact({
  value,
  label,
}: Readonly<{ value: string; label: string }>) {
  const theme = useTheme();
  return (
    <View style={styles.statFact}>
      <ThemedText style={[styles.statValue, { color: theme.accent }]}>
        {value}
      </ThemedText>
      <ThemedText type="caption" style={{ color: theme.text }}>
        {label}
      </ThemedText>
    </View>
  );
}

/**
 * 줄 완성 축하 연출. 요약 화면 전용(규칙 5: 듣는 중엔 연출 없음).
 * 기존 컴포넌트로 대체 불가한 유일한 신규 요소 — 컨페티는 재사용 부품이 없다.
 */
function ConfettiBurst() {
  const theme = useTheme();
  const colors = [theme.accent, theme.positive, theme.highlight];
  // 지연 초기화 useState가 Animated.Value를 한 번만 만드는 표준 방식(`equalizer.tsx`와 같음).
  const [pieces] = useState(() =>
    Array.from({ length: 16 }, (_, i) => ({
      left: (i * 6.1) % 92,
      color: colors[i % colors.length],
      size: 6 + (i % 3) * 2,
      delay: (i % 6) * 90,
      dur: 1100 + (i % 4) * 260,
      v: new Animated.Value(0),
    })),
  );

  useEffect(() => {
    const loops = pieces.map((p) => {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.v, {
            toValue: 1,
            duration: p.dur,
            useNativeDriver: true,
          }),
          Animated.timing(p.v, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );
      anim.start();
      return anim;
    });
    return () => loops.forEach((l) => l.stop());
  }, [pieces]);

  return (
    <View pointerEvents="none" style={styles.confettiLayer}>
      {pieces.map((p, i) => {
        const translateY = p.v.interpolate({
          inputRange: [0, 1],
          outputRange: [-24, 170],
        });
        const opacity = p.v.interpolate({
          inputRange: [0, 0.15, 1],
          outputRange: [0, 1, 0],
        });
        const rotate = p.v.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "260deg"],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.confettiPiece,
              {
                left: `${p.left}%`,
                width: p.size,
                height: p.size + 3,
                backgroundColor: p.color,
                opacity,
                transform: [{ translateY }, { rotate }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function BingoBoard({
  board,
  marked,
  line,
  phase,
  lastMarked,
  lastCorrect,
  disabled,
  onPress,
}: Readonly<{
  board: readonly string[];
  marked: readonly boolean[];
  line: readonly number[] | null;
  phase: Phase;
  lastMarked: number | null;
  lastCorrect: boolean | undefined;
  disabled: boolean;
  onPress: (word: string, index: number) => void;
}>) {
  const theme = useTheme();
  const rows = [0, 1, 2];
  const isSummary = phase === "summary";
  return (
    <View style={[styles.tray, { backgroundColor: theme.accentTint }]}>
      {rows.map((row) => (
        <View key={row} style={styles.trayRow}>
          {rows.map((col) => {
            const index = row * 3 + col;
            const word = board[index];
            if (!word) {
              return null;
            }
            const isMarked = marked[index] === true;
            const inLine = line?.includes(index) === true;
            // 연출은 맞음/완성에서만: 방금 맞힌 칸 팝, 완성 줄 순차 팝.
            // 오답 feedback에서는 lastMarked가 이전 정답 칸에 남아 있어
            // lastCorrect === true로 좁혀 그 칸이 다시 팝하지 않게 한다.
            let animate = false;
            let delay = 0;
            if (inLine && isSummary) {
              animate = true;
              delay = (line?.indexOf(index) ?? 0) * 120;
            } else if (
              isMarked &&
              phase === "feedback" &&
              lastCorrect === true &&
              index === lastMarked
            ) {
              animate = true;
            }
            return (
              <BingoTile
                key={word}
                word={word}
                marked={isMarked}
                inLine={inLine}
                dimmed={isSummary && !isMarked && !inLine}
                animate={animate}
                delay={delay}
                disabled={disabled || isMarked}
                onPress={() => onPress(word, index)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

function BingoTile({
  word,
  marked,
  inLine,
  dimmed,
  animate,
  delay,
  disabled,
  onPress,
}: Readonly<{
  word: string;
  marked: boolean;
  inLine: boolean;
  dimmed: boolean;
  animate: boolean;
  delay: number;
  disabled: boolean;
  onPress: () => void;
}>) {
  const theme = useTheme();
  const [scale] = useState(() => new Animated.Value(animate ? 0.5 : 1));

  useEffect(() => {
    if (animate) {
      scale.setValue(0.5);
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 140,
        delay,
        useNativeDriver: true,
      }).start();
    } else {
      scale.setValue(1);
    }
  }, [animate, delay, scale]);

  const filled = marked || inLine;
  let backgroundColor: string = theme.surface;
  let textColor: string = theme.text;
  let tileShadow: object = Shadows.card;
  if (filled) {
    backgroundColor = theme.accent;
    textColor = theme.onAccent;
    tileShadow = Shadows.accent;
  } else if (dimmed) {
    // accentTint 위 글자는 text·accent만 AA. textMuted는 미달.
    backgroundColor = theme.accentTint;
    textColor = theme.text;
    tileShadow = styles.flat;
  }

  return (
    <Animated.View style={[styles.tileOuter, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={word}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.tile,
          { backgroundColor },
          tileShadow,
          dimmed && { borderWidth: 1, borderColor: theme.accentBorder },
          inLine && { borderWidth: 3, borderColor: theme.accentBorder },
          pressed && !disabled && styles.tilePressed,
        ]}
      >
        {filled ? (
          <View style={styles.tileCheck}>
            <Icon name="check" size={18} color={theme.onAccent} strokeWidth={2.6} />
          </View>
        ) : null}
        <ThemedText type="heading" style={[styles.bingoWord, { color: textColor }]}>
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
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  idleContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  idleCard: {
    gap: Spacing.two,
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
  /**
   * 연습 중 내용은 스크롤, 버튼은 그 밖에 고정.
   * 짧은 화면(568dp)에서는 기본 글씨에서도 3×3 판 아래로 「중지」가 통째로
   * 사라졌다 — 7개 화면 중 파손이 제일 심했다.
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
    fontSize: 16,
    lineHeight: 22,
  },
  hud: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.two,
  },
  boardWrap: {
    position: "relative",
  },
  tray: {
    width: "92%",
    alignSelf: "center",
    borderRadius: Radius.tile,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  trayRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  tileOuter: {
    flex: 1,
  },
  tile: {
    flex: 1,
    aspectRatio: 1,
    minHeight: 58,
    borderRadius: Radius.medium,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.one,
  },
  tilePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  tileCheck: {
    position: "absolute",
    top: Spacing.two - 1,
    right: Spacing.two - 1,
  },
  flat: {
  
    elevation: 0,
  },
  bingoWord: {
    fontSize: 26,
    lineHeight: 32,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.large - 2,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  statFact: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.half,
  },
  statDivider: {
    width: 1,
    alignSelf: "stretch",
  },
  statValue: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "800",
  },
  confettiLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  confettiPiece: {
    position: "absolute",
    top: 0,
    borderRadius: 2,
  },
  modeRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: Radius.pill,
    padding: Spacing.half,
    gap: Spacing.half,
    alignSelf: "stretch",
  },
  modeSegment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  actions: {
    gap: Spacing.two,
    marginTop: "auto",
    flexGrow: 0,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
});
