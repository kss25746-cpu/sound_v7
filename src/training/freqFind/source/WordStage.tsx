// screens/WordStage.tsx — 2단계(스크리닝) · 3단계(정밀) 공용
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  SeaBackground,
  SoundButton,
  ShellChoice,
  DepthGauge,
  StageHeader,
  AnticipationOverlay,
  type ShellState,
  type StageExit,
} from "./Sea";
import { S, T, SCENE, seaTextShadow } from "./theme";
import { audio } from "./audioAdapter";
import {
  appendPracticeRetryIfNeeded,
  isPracticeRetryItem,
  type WordStageItem,
} from "./testEngine";
import { getWordImage } from "./wordAssets";
import { hapticFeedback } from "./haptics";

const ANTICIPATION_MS = 700; // 선택 후 정답 공개까지의 대기 연출
const REVEAL_MS_RIGHT = 900;
const REVEAL_MS_WRONG = 2000;

interface WordStageProps {
  items: WordStageItem[];
  stageLabel: string;
  onDone: (answers: Record<string, string>) => void;
  paused?: boolean;
  isCustomTraining?: boolean;
  exit?: StageExit;
}

type StagePhase = "choose" | "anticipate" | "reveal";

export default function WordStage({
  items,
  stageLabel,
  onDone,
  paused = false,
  isCustomTraining = false,
  exit,
}: WordStageProps) {
  const insets = useSafeAreaInsets();
  const [idx, setIdx] = useState(0);
  const [queue, setQueue] = useState<WordStageItem[]>(() => [...items]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [phase, setPhase] = useState<StagePhase>("choose");
  const [streak, setStreak] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // 재생 세대. 문항이 바뀌거나 일시정지되면 올려서, 앞 재생이 끝날 때 새 문항의
  // `playing`/`played`를 건드리지 못하게 한다.
  const playGen = useRef(0);

  const item = queue[idx];

  useEffect(() => {
    const list = timers.current;
    return () => {
      list.forEach(clearTimeout);
      void audio.stop();
    };
  }, []);

  // 백그라운드 전환 또는 일시정지 시 진행 중인 타이머와 오디오 즉시 중지
  useEffect(() => {
    if (!paused) return;
    timers.current.forEach(clearTimeout);
    // 새 배열로 바꾸면 언마운트 정리(첫 배열을 잡고 있다)가 이후 타이머를 못 지운다
    timers.current.length = 0;
    playGen.current += 1;
    void audio.stop();
    // 대기(anticipate)·공개(reveal) 중이었으면 넘기는 타이머가 지워져 멈추므로 다시 선택 상태로 롤백
    const t = setTimeout(() => {
      setPlaying(false);
      if (phase === "anticipate" || phase === "reveal") {
        setPhase("choose");
        setPicked(null);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [paused, phase]);

  const play = useCallback(async () => {
    if (paused || playing || !item) return;
    const gen = playGen.current;
    setPlaying(true);
    try {
      await audio.playWord(item.answer);
    } finally {
      if (gen === playGen.current) {
        setPlaying(false);
        setPlayed(true);
      }
    }
  }, [item, playing, paused]);

  const playRef = useRef(play);
  useEffect(() => {
    playRef.current = play;
  }, [play]);

  // 문항이 바뀌면(또는 일시정지에서 돌아오면) 한 번만 자동 재생한다. deps에 `play`를
  // 넣으면 `playing`이 바뀔 때마다 다시 걸려 재생이 끝없이 반복된다.
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => {
      void playRef.current();
    }, 450);
    timers.current.push(t);
    return () => clearTimeout(t);
  }, [idx, paused]);

  const choose = (word: string) => {
    if (paused || phase !== "choose" || !played || !item) return;
    void hapticFeedback.selection();
    setPicked(word);
    setPhase("anticipate");

    const t1 = setTimeout(() => {
      const correct = word === item.answer;
      setPhase("reveal");
      setStreak((s) => (correct ? s + 1 : 0));
      if (correct) {
        void hapticFeedback.success();
      } else {
        void hapticFeedback.error();
      }

      const t2 = setTimeout(() => {
        const next = { ...answers, [item.id]: word };
        setAnswers(next);
        const nextQueue = isCustomTraining
          ? appendPracticeRetryIfNeeded(queue, item, word)
          : queue;
        if (nextQueue !== queue) setQueue(nextQueue);
        if (idx + 1 >= nextQueue.length) {
          onDone(next);
        } else {
          // 앞 문항 소리가 새 보기 위로 이어지지 않게 끊는다.
          playGen.current += 1;
          void audio.stop();
          setPlaying(false);
          setPlayed(false);
          setPicked(null);
          setPhase("choose");
          setIdx((i) => i + 1);
        }
      }, correct ? REVEAL_MS_RIGHT : REVEAL_MS_WRONG);
      timers.current.push(t2);
    }, ANTICIPATION_MS);
    timers.current.push(t1);
  };

  const stateOf = (word: string): ShellState => {
    if (phase === "choose") return "idle";
    if (phase === "anticipate") return word === picked ? "selected" : "dim";
    if (item && word === item.answer) return "right";
    if (word === picked) return "wrong";
    return "dim";
  };

  if (!item) return null;

  const scene = SCENE[item.band];
  // 틀렸을 때만 타일 위 가운데에 정답을 한 줄로 알려 준다(「다음」 버튼 없이 자동으로 넘어간다).
  const wrongReveal = phase === "reveal" && picked !== null && picked !== item.answer;
  let placeSuffix = "";
  if (item.mode === "B") {
    placeSuffix = item.displayType === "image" ? " · 같은 깊이의 네 그림" : " · 같은 깊이의 네 단어";
  }

  return (
    <SeaBackground scene={item.band}>
      <View
        testID="stage-wrap"
        style={[
          styles.wrap,
          {
            paddingTop: Math.max(insets.top + 10, 44),
            paddingBottom: Math.max(insets.bottom + 16, 32),
            paddingHorizontal: Math.max(insets.left, insets.right, S.pad),
          },
        ]}
      >
        <StageHeader
          scene={item.band}
          label={`${stageLabel}${isCustomTraining && isPracticeRetryItem(item) ? " · 한 번 더" : ""}`}
          place={`${scene.name}${placeSuffix}`}
          exit={exit}
        />

        <View style={styles.center}>
          <Text style={[styles.hint, seaTextShadow(scene.light), { color: scene.fg }]}>
            {played ? "들은 소리를 고르세요" : "소리를 들어 보세요"}
          </Text>
          <View style={{ height: 28 }} />
          <SoundButton
            onPress={play}
            playing={playing}
            light={scene.light}
            caption={played ? "다시 듣기" : "듣는 중"}
          />
          {streak >= 3 && phase === "reveal" ? (
            <View style={[styles.streak, scene.light && styles.streakLight]}>
              <Text
                style={[
                  T.tiny,
                  seaTextShadow(scene.light),
                  { color: scene.fg, fontWeight: "700" },
                ]}
              >
                {streak}번 연속 맞았어요
              </Text>
            </View>
          ) : null}
        </View>

        <View
          pointerEvents="none"
          accessibilityElementsHidden={!wrongReveal}
          style={styles.wrongHintSlot}
        >
          {wrongReveal ? (
            <View
              style={[styles.wrongHint, scene.light && styles.wrongHintLight]}
              accessibilityRole="text"
              accessibilityLiveRegion="polite"
            >
              <Text
                style={[
                  T.body,
                  seaTextShadow(scene.light),
                  styles.wrongHintText,
                  { color: scene.fg },
                ]}
                numberOfLines={1}
              >
                오답 · 정답: {item.answer}
              </Text>
            </View>
          ) : null}
        </View>

        {played ? (
          <View testID="choice-area" style={styles.grid}>
            {item.options.map((w) => (
              <ShellChoice
                key={w}
                label={w}
                image={item.displayType === "image" ? getWordImage(w) : undefined}
                state={stateOf(w)}
                disabled={phase !== "choose"}
                onPress={() => choose(w)}
              />
            ))}
          </View>
        ) : null}

        {/* 연습 재출제는 큐만 늘고 총량은 처음 문항 수. 재출제는 상단 「한 번 더」로만 표시 */}
        <DepthGauge
          current={Math.min(idx + 1, items.length)}
          total={items.length}
          label="진행"
          light={scene.light}
        />
      </View>

      <AnticipationOverlay visible={phase === "anticipate"} />
    </SeaBackground>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: S.pad, gap: S.gap },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hint: { ...T.body, fontWeight: "600", textAlign: "center" },
  streak: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  streakLight: {
    backgroundColor: "rgba(8,32,61,0.08)",
  },
  // 오답 줄이 떠도 타일이 밀리지 않도록 자리를 늘 비워 둔다.
  wrongHintSlot: { height: 36, alignItems: "center", justifyContent: "center" },
  wrongHint: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  wrongHintLight: {
    backgroundColor: "rgba(8,32,61,0.08)",
  },
  wrongHintText: {
    fontWeight: "700",
    opacity: 0.92,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: S.gap,
    marginBottom: S.gap,
  },
});
