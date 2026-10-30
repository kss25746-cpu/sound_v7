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

import { closePureToneContext } from "@/audio/pureTone";
import {
  AnimalGameHubScreen,
  type AnimalGameId,
} from "@/chongyeon/screens/AnimalGameHubScreen";
import {
  AnimalGameScreen,
  type MatchGameLeave,
} from "@/chongyeon/screens/AnimalGameScreen";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { ListeningCheckEntryButton } from "@/components/ui/listening-check-entry-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { StatsEntryButton } from "@/components/ui/stats-entry-button";
import { MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { ListeningCheckScreen } from "@/training/ListeningCheckScreen";
import { PtaSessionScreen } from "@/training/pta/PtaSessionScreen";
import { StatsScreen } from "@/training/StatsScreen";

type Track = "picker" | "pitch" | "animals";

type TrackOption = {
  track: Exclude<Track, "picker">;
  icon: IconName;
  title: string;
  description: string;
};

const TRACK_OPTIONS: readonly TrackOption[] = [
  {
    track: "pitch",
    icon: "bars",
    title: "소리 높낮이",
    description: "두 소리 중 높은 쪽을 고르는 연습",
  },
  {
    track: "animals",
    icon: "paw",
    title: "동물 소리 게임",
    description: "동물 소리를 듣고 맞히는 게임 셋",
  },
];

/**
 * 다른 소리 탭 — 소리 높낮이 · 동물 소리 게임.
 * 목록 생김새는 악기 소리 탭과 같다. 연습은 기존 화면을 그대로 연다.
 *
 * 순음 컨텍스트는 높낮이 화면을 벗어날 때 닫는다. 그 안의 점검·통계 스와프는
 * 이 화면이 마운트를 유지하므로 닫히지 않는다. 탭을 떠날 때의 닫기는 라우트가 한다.
 */
export function OtherSoundsTabScreen() {
  const theme = useTheme();
  const [track, setTrack] = useState<Track>("picker");
  const [animalGame, setAnimalGame] = useState<AnimalGameId | null>(null);
  /** 강화학습 화면이 채운다. 뒤로가기가 목록으로 가기 전에 한 단계 홈을 묻는다. */
  const animalLeaveRef = useRef<MatchGameLeave | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    if (track !== "pitch") {
      return;
    }
    return () => {
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
    setAnimalGame(null);
    setShowStats(false);
    setShowCheck(false);
  }, []);

  const openAnimalGame = useCallback((game: AnimalGameId) => {
    setAnimalGame(game);
  }, []);

  const closeAnimalGame = useCallback(() => {
    setAnimalGame(null);
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
      if (track === "picker" || track === "pitch") {
        return;
      }
      if (track === "animals" && animalGame) {
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
          if (animalLeaveRef.current?.()) return true;
          closeAnimalGame();
          return true;
        });
        return () => sub.remove();
      }
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        backToPicker();
        return true;
      });
      return () => sub.remove();
    }, [
      track,
      animalGame,
      showStats,
      showCheck,
      backToPicker,
      closeAnimalGame,
      closeStats,
      closeCheck,
    ]),
  );

  if (showStats) {
    return <StatsScreen initialKind="pitch2" onBack={closeStats} />;
  }

  if (showCheck) {
    return (
      <ListeningCheckScreen onBack={closeCheck} />
    );
  }

  if (track === "pitch") {
    return <PtaSessionScreen onBack={backToPicker} />;
  }

  if (track === "animals") {
    if (animalGame) {
      return (
        <AnimalGameScreen
          game={animalGame}
          onBack={closeAnimalGame}
          leaveRef={animalLeaveRef}
        />
      );
    }
    return (
      <AnimalGameHubScreen
        onSelectGame={openAnimalGame}
        onBack={backToPicker}
      />
    );
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
              title="다른 소리"
              caption="높낮이·동물 소리를 고릅니다 · 병원 검사가 아니에요"
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
                  onPress={() => setTrack(option.track)}
                  style={({ pressed }) => [
                    styles.cardPress,
                    pressed && styles.pressed,
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
