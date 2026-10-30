import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { closeAmToneContext } from "@/audio/amTone";
import { closePureToneContext } from "@/audio/pureTone";
import { FlashcardsScreen } from "@/chongyeon/screens/FlashcardsScreen";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { ListeningCheckEntryButton } from "@/components/ui/listening-check-entry-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { StatsEntryButton } from "@/components/ui/stats-entry-button";
import { MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { FreqFindScreen } from "@/training/freqFind/FreqFindScreen";
import { Ling6SessionScreen } from "@/training/ling6/Ling6SessionScreen";
import { ListeningCheckScreen } from "@/training/ListeningCheckScreen";
import { SentClosedSessionScreen } from "@/training/sentClosed/SentClosedSessionScreen";
import { StatsScreen } from "@/training/StatsScreen";
import { WrsBingoScreen } from "@/training/wrs/WrsBingoScreen";
import { hasKoreanVoice } from "@/training/wrs/wrsTts";
import { WrsSessionScreen } from "@/training/wrs/WrsSessionScreen";
import { WrsTwoCharScreen } from "@/training/wrs/WrsTwoCharScreen";
import { WrsVoiceGuideScreen } from "@/training/wrs/WrsVoiceGuideScreen";

/** 한국어 TTS로 단어를 읽는다. 시작 전에 음성 유무를 본다. */
type TtsTrack = "one" | "two" | "bingo";

/** 파일·순음·그림 소리. TTS 확인이 없다. */
type DirectTrack = "find" | "ling6" | "flashcards" | "sent";

type TrainingTrack = TtsTrack | DirectTrack;

type Track = "picker" | TrainingTrack | "voiceGuide";

function isTtsTrack(track: TrainingTrack): track is TtsTrack {
  return track === "one" || track === "two" || track === "bingo";
}

type TrackOption = {
  track: TrainingTrack;
  icon: IconName;
  title: string;
  description: string;
};

const TRACK_OPTIONS: readonly TrackOption[] = [
  {
    track: "find",
    icon: "waves",
    title: "소리 찾기",
    description: "소리를 찾는 바다",
  },
  {
    track: "ling6",
    icon: "mic",
    title: "소리 구분",
    description: "들은 소리를 그림에서 고르는 연습",
  },
  {
    track: "one",
    icon: "oneChar",
    title: "한 글자",
    description: "한 글자 단어를 듣고 보기에서 고르는 연습",
  },
  {
    track: "two",
    icon: "twoChar",
    title: "두 글자",
    description: "두 글자 단어를 듣고 보기에서 고르는 연습",
  },
  {
    track: "bingo",
    icon: "bingoLine",
    title: "빙고",
    description: "쉬운 판·비슷한 소리로 줄을 만드는 연습",
  },
  {
    track: "flashcards",
    icon: "cards",
    title: "단어 카드",
    description: "단어 짝을 듣고 넘기며 익히는 카드",
  },
  {
    track: "sent",
    icon: "sentence",
    title: "문장 듣기",
    description: "문장을 듣고 그림을 고르는 연습",
  },
];

/**
 * 말소리 탭 — 소리 찾기 · 소리 구분 · 한 글자 · 두 글자 · 빙고 · 단어 카드 · 문장 듣기.
 * 목록 생김새는 악기 소리 탭과 같다. 빙고·한 글자·두 글자는 바로 시작하지 않는다.
 * 한 글자는 첫 화면에서 12문항·25문항을 고른다. 두 글자는 12개 안내 뒤 「시작」.
 *
 * 소리 찾기 컨텍스트는 그 항목을 벗어날 때 닫는다. 찾기 안의 점검·통계는
 * 항목이 마운트를 유지하므로 닫히지 않는다. 탭을 떠날 때의 닫기는 라우트가 한다.
 */
export function SpeechTabScreen() {
  const theme = useTheme();
  const [track, setTrack] = useState<Track>("picker");
  const [autoStart, setAutoStart] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const [pendingTrack, setPendingTrack] = useState<TtsTrack | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (track !== "find") {
      return;
    }
    return () => {
      void closeAmToneContext();
      void closePureToneContext();
    };
  }, [track]);

  const closeStats = useCallback(() => {
    setShowStats(false);
  }, []);

  const closeCheck = useCallback(() => {
    setShowCheck(false);
  }, []);

  const backToPicker = useCallback(() => {
    setTrack("picker");
    setAutoStart(false);
    setPendingTrack(null);
    setShowStats(false);
    setShowCheck(false);
  }, []);

  const openTrack = useCallback((next: TrainingTrack) => {
    if (!isTtsTrack(next)) {
      setTrack(next);
      return;
    }
    setChecking(true);
    void hasKoreanVoice()
      .then((ok) => {
        if (ok) {
          setPendingTrack(null);
          setAutoStart(false);
          setTrack(next);
          return;
        }
        setPendingTrack(next);
        setTrack("voiceGuide");
      })
      .finally(() => {
        setChecking(false);
      });
  }, []);

  const retryVoice = useCallback(() => {
    if (pendingTrack) {
      openTrack(pendingTrack);
    }
  }, [openTrack, pendingTrack]);

  const consumeAutoStart = useCallback(() => {
    setAutoStart(false);
  }, []);

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
      // 찾기·구분·글자·빙고·문장은 자기 화면이 뒤로가기를 처리한다.
      // 여기서도 잡으면 진행 중 확인을 건너뛰고 목록으로 나간다.
      if (track !== "flashcards" && track !== "voiceGuide") {
        return;
      }
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        backToPicker();
        return true;
      });
      return () => sub.remove();
    }, [track, showStats, showCheck, backToPicker, closeStats, closeCheck]),
  );

  if (showStats) {
    return <StatsScreen initialKind="freqFind" onBack={closeStats} />;
  }

  if (showCheck) {
    return (
      <ListeningCheckScreen onBack={closeCheck} />
    );
  }

  if (track === "find") {
    return <FreqFindScreen onBack={backToPicker} />;
  }

  if (track === "ling6") {
    return <Ling6SessionScreen onBack={backToPicker} />;
  }

  if (track === "one") {
    return (
      <WrsSessionScreen
        onBack={backToPicker}
        autoStart={autoStart}
        onAutoStartConsumed={consumeAutoStart}
      />
    );
  }

  if (track === "two") {
    return (
      <WrsTwoCharScreen
        onBack={backToPicker}
        autoStart={autoStart}
        onAutoStartConsumed={consumeAutoStart}
      />
    );
  }

  if (track === "bingo") {
    return <WrsBingoScreen onBack={backToPicker} />;
  }

  if (track === "voiceGuide") {
    return (
      <WrsVoiceGuideScreen
        onRetry={retryVoice}
        onBack={backToPicker}
        checking={checking}
      />
    );
  }

  if (track === "flashcards") {
    return <FlashcardsScreen onBack={backToPicker} />;
  }

  if (track === "sent") {
    return <SentClosedSessionScreen onBack={backToPicker} />;
  }

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <ScrollView
          style={styles.fill}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.top}>
            <ScreenHeader
              title="말소리"
              caption="소리 찾기와 말 연습을 고릅니다 · 병원 검사가 아니에요"
              action={
                <View style={styles.headerActions}>
                  <ListeningCheckEntryButton
                    onPress={() => setShowCheck(true)}
                  />
                  <StatsEntryButton onPress={() => setShowStats(true)} />
                </View>
              }
            />

            <View style={styles.list}>
              {TRACK_OPTIONS.map((option) => (
                <Pressable
                  key={option.track}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.title} — ${option.description}`}
                  accessibilityState={{ disabled: checking }}
                  disabled={checking}
                  onPress={() => openTrack(option.track)}
                  style={({ pressed }) => [
                    styles.cardPress,
                    pressed && !checking && styles.pressed,
                  ]}
                >
                  <Card style={styles.card}>
                    <View
                      style={[
                        styles.cardIcon,
                        { backgroundColor: theme.accentTint },
                      ]}
                    >
                      <Icon name={option.icon} size={22} color={theme.accent} />
                    </View>
                    <View style={styles.cardText}>
                      <ThemedText type="smallBold" style={styles.cardTitle}>
                        {option.title}
                      </ThemedText>
                      <ThemedText
                        themeColor="textSecondary"
                        type="small"
                        style={styles.cardCaption}
                      >
                        {option.description}
                      </ThemedText>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
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
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  top: {
    gap: Spacing.two,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  list: {
    marginTop: Spacing.three,
    gap: Spacing.three - 2,
  },
  cardPress: {
    borderRadius: Radius.large - 2,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three - 2,
    paddingVertical: Spacing.three + 2,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.small + 1,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: {
    flexShrink: 1,
    gap: Spacing.half,
  },
  cardTitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  cardCaption: {
    fontSize: 14,
    lineHeight: 20,
  },
});
