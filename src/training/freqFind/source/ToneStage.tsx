// screens/ToneStage.tsx — 1단계: 소리의 파동
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SeaBackground, SoundButton, WaveButton, DepthGauge, StageHeader, type StageExit } from "./Sea";
import { S, T, SCENE, seaTextShadow } from "./theme";
import { audio } from "./audioAdapter";
import type { Stage1Item } from "./testEngine";
import { hapticFeedback } from "./haptics";

interface ToneStageProps {
  items: Stage1Item[];
  onDone: (answers: Record<string, boolean>) => void;
  paused?: boolean;
  exit?: StageExit;
}

export default function ToneStage({
  items,
  onDone,
  paused = false,
  exit,
}: ToneStageProps) {
  const insets = useSafeAreaInsets();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(false);
  // 재생 세대. 문항이 바뀌거나 일시정지되면 올려서, 앞 재생이 끝날 때 새 문항의
  // `played`를 켜(소리를 듣기 전에 답 버튼이 뜨게 하)지 못하게 한다.
  const playGen = useRef(0);

  const item = items[idx];

  useEffect(() => {
    return () => {
      void audio.stop();
    };
  }, []);

  useEffect(() => {
    if (!paused) return;
    playGen.current += 1;
    void audio.stop();
    // 일시정지 → 진행 중이던 재생 표시를 내린다(재생 자체는 위에서 끊었다).
    const t = setTimeout(() => setPlaying(false), 0);
    return () => clearTimeout(t);
  }, [paused]);

  const play = useCallback(async () => {
    if (playing || !item || paused) return;
    const gen = playGen.current;
    setPlaying(true);
    try {
      await audio.playTone({ hz: item.hz, level: item.level, ms: 1200 });
    } finally {
      if (gen === playGen.current) {
        setPlaying(false);
        setPlayed(true);
      }
    }
  }, [item, playing, paused]);

  const answer = (heard: boolean) => {
    if (!item) return;
    void hapticFeedback.selection();
    const next = { ...answers, [item.id]: heard };
    setAnswers(next);
    if (idx + 1 >= items.length) {
      onDone(next);
    } else {
      // 「다시 듣기」 중에 답하면 앞 순음이 다음 문항까지 이어지므로 끊는다.
      playGen.current += 1;
      void audio.stop();
      setIdx(idx + 1);
      setPlaying(false);
      setPlayed(false);
    }
  };

  if (!item) return null;

  const scene = SCENE[item.band];

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
          label="1단계 · 소리의 파동"
          place={`${scene.name} · ${scene.depth}`}
          exit={exit}
        />

        <View style={styles.center}>
          <Text style={[styles.hint, seaTextShadow(scene.light), { color: scene.fg }]}>
            {played ? "이 소리가 들렸나요?" : "버튼을 눌러 소리를 들어 보세요"}
          </Text>
          <View style={{ height: 28 }} />
          <SoundButton
            onPress={play}
            playing={playing}
            light={scene.light}
            caption={played ? "다시 듣기" : "소리 듣기"}
          />
        </View>

        {played ? (
          <View testID="choice-area" style={styles.choiceRow}>
            <View style={styles.choiceItem}>
              <WaveButton title="들렸어요" onPress={() => answer(true)} />
            </View>
            <View style={styles.choiceItem}>
              <WaveButton
                title="안 들렸어요"
                tone="ghost"
                light={scene.light}
                onPress={() => answer(false)}
              />
            </View>
          </View>
        ) : null}
        <DepthGauge current={idx + 1} total={items.length} label="진행" light={scene.light} />
      </View>
    </SeaBackground>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: S.pad },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hint: { ...T.body, fontWeight: "600", textAlign: "center" },
  choiceRow: { flexDirection: "row", gap: S.gap, marginBottom: S.gap },
  choiceItem: { flex: 1 },
});
