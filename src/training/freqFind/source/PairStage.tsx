// screens/PairStage.tsx — 4단계: 최소대립쌍 2지선다 (상대 판정)
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
import type { PairStageItem } from "./testEngine";
import { getPairImage } from "./wordAssets";
import { hapticFeedback } from "./haptics";

const ANTICIPATION_MS = 600;
const REVEAL_MS = 1000;

interface PairStageProps {
  items: PairStageItem[];
  onDone: (answers: Record<string, string>) => void;
  paused?: boolean;
  exit?: StageExit;
}

type StagePhase = "choose" | "anticipate" | "reveal";

export default function PairStage({
  items,
  onDone,
  paused = false,
  exit,
}: PairStageProps) {
  const insets = useSafeAreaInsets();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [phase, setPhase] = useState<StagePhase>("choose");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // 재생 세대. 문항이 바뀌거나 일시정지되면 올려서, 앞 재생이 끝날 때 새 문항의
  // `playing`/`played`를 건드리지 못하게 한다.
  const playGen = useRef(0);

  const item = items[idx];

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
      setPhase("reveal");
      if (word === item.answer) {
        void hapticFeedback.success();
      } else {
        void hapticFeedback.error();
      }
      const t2 = setTimeout(() => {
        const next = { ...answers, [item.id]: word };
        setAnswers(next);
        if (idx + 1 >= items.length) {
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
      }, REVEAL_MS);
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

  return (
    <SeaBackground scene={item.band} showDrift={false}>
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
          label="4단계 · 마주 보는 두 소리"
          place={`${scene.name} vs ${SCENE[item.versus].name}`}
          exit={exit}
        />

        <View style={styles.center}>
          <View style={[styles.diffTag, scene.light && styles.diffTagLight]}>
            {item.displayType === "image" ? (
              <>
                <Text style={[styles.diffText, seaTextShadow(scene.light), { color: scene.fg }]}>
                  두 그림 중 선택
                </Text>
                <Text style={[T.tiny, seaTextShadow(scene.light), { color: scene.fgSoft }]}>
                  들린 소리에 맞는 그림을 고르세요
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.diffText, seaTextShadow(scene.light), { color: scene.fg }]}>
                  {item.diff}
                </Text>
                <Text style={[T.tiny, seaTextShadow(scene.light), { color: scene.fgSoft }]}>
                  소리 하나만 달라요
                </Text>
              </>
            )}
          </View>
          <View style={{ height: 24 }} />
          <SoundButton
            onPress={play}
            playing={playing}
            light={scene.light}
            caption={played ? "다시 듣기" : "듣는 중"}
          />
        </View>

        <View
          testID="choice-area"
          pointerEvents={played ? "auto" : "none"}
          accessibilityElementsHidden={!played}
          importantForAccessibility={played ? "auto" : "no-hide-descendants"}
          style={[styles.choiceList, !played && styles.choiceHidden]}
        >
          {item.options.map((w) => (
            <ShellChoice
              key={w}
              wide
              label={w}
              image={item.displayType === "image" ? getPairImage(w) : undefined}
              state={stateOf(w)}
              disabled={phase !== "choose" || !played}
              onPress={() => choose(w)}
            />
          ))}
        </View>

        <DepthGauge
          current={idx + 1}
          total={items.length}
          label={`${scene.name} 비교`}
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
  choiceList: { gap: S.gap, marginBottom: S.gap },
  choiceHidden: { height: 0, opacity: 0, marginBottom: 0, overflow: "hidden" },
  diffTag: {
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  diffTagLight: {
    backgroundColor: "rgba(8,32,61,0.08)",
  },
  diffText: { fontSize: 22, lineHeight: 28, fontWeight: "700", letterSpacing: 2 },
});
