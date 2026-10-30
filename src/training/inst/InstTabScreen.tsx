import { useFocusEffect, useIsFocused } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DrumScreen } from "@/chongyeon/screens/DrumScreen";
import { GuitarScreen } from "@/chongyeon/screens/GuitarScreen";
import { MusicTrainingScreen } from "@/chongyeon/screens/MusicTrainingScreen";
import { useHideTabBar } from "@/components/tab-bar-visibility";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { ListeningCheckEntryButton } from "@/components/ui/listening-check-entry-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { StatsEntryButton } from "@/components/ui/stats-entry-button";
import {
  MaxContentWidth,
  Radius,
  Spacing,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { InstSessionScreen } from "@/training/inst/InstSessionScreen";
import { ListeningCheckScreen } from "@/training/ListeningCheckScreen";
import { StatsScreen } from "@/training/StatsScreen";

type Track = "picker" | "listen" | "piano" | "guitar" | "drum";

type TrainingTrack = Exclude<Track, "picker">;

type TrackOption = {
  track: TrainingTrack;
  icon: IconName;
  title: string;
  description: string;
};

const TRACK_OPTIONS: readonly TrackOption[] = [
  {
    track: "listen",
    icon: "speaker",
    title: "듣고 고르기",
    description: "악기 소리를 듣고 보기에서 고르는 연습",
  },
  {
    track: "piano",
    icon: "pianoKeys",
    title: "피아노",
    description: "건반을 치며 음을 맞히는 연습",
  },
  {
    track: "guitar",
    icon: "guitar",
    title: "기타",
    description: "프렛을 누르며 음을 맞히는 연습",
  },
  {
    track: "drum",
    icon: "drum",
    title: "드럼",
    description: "악기를 치고 소리를 맞히는 연습",
  },
];

const LANDSCAPE_TRACKS: ReadonlySet<Track> = new Set(["piano", "guitar"]);

/**
 * 화면 방향의 **유일한 소유자.**
 *
 * B에서는 `app/(tabs)/_layout.tsx`가 `usePathname()`으로 걸었다. A는 묶음 안
 * 상태 전환이라 pathname이 안 바뀐다. **지금 어느 하위 화면인지 아는 여기만 건다.**
 *
 * 떠나는 하위 화면이 세로로 되돌리면 안 된다. 예전에는 피아노·기타가 각자
 * "포커스 X → 세로"를 걸어서, 언마운트되지 않는 탭에서 나중에 실행된 쪽이
 * 들어온 쪽의 가로를 덮었다. 나가는 화면은 다음이 무엇인지 모른다.
 *
 * 묶음 안 `track` 전환의 cleanup에서는 세로를 걸지 않는다. 탭을 떠날 때만
 * 세로로 잠근다(`useFocusEffect` 의존성 `[]`). `lockAsync`는 취소되지 않으므로
 * 늦게 끝난 지난 잠금은 `lockRunId`와 다르면 무시한다.
 */
function useOrientationForTrack(track: Track) {
  const lockRunIdRef = useRef(0);
  const trackRef = useRef(track);

  useEffect(() => {
    trackRef.current = track;
  }, [track]);

  useEffect(() => {
    const runId = ++lockRunIdRef.current;
    const wantsLandscape = LANDSCAPE_TRACKS.has(track);
    void ScreenOrientation.lockAsync(
      wantsLandscape
        ? ScreenOrientation.OrientationLock.LANDSCAPE
        : ScreenOrientation.OrientationLock.PORTRAIT_UP,
    ).catch((error: unknown) => {
      if (runId !== lockRunIdRef.current) {
        return;
      }
      console.warn(
        `[화면 방향] ${wantsLandscape ? "가로" : "세로"} 잠금 실패 (${track})`,
        error,
      );
    });
  }, [track]);

  useFocusEffect(
    useCallback(() => {
      const enterId = ++lockRunIdRef.current;
      const current = trackRef.current;
      const wantsLandscape = LANDSCAPE_TRACKS.has(current);
      void ScreenOrientation.lockAsync(
        wantsLandscape
          ? ScreenOrientation.OrientationLock.LANDSCAPE
          : ScreenOrientation.OrientationLock.PORTRAIT_UP,
      ).catch((error: unknown) => {
        if (enterId !== lockRunIdRef.current) {
          return;
        }
        console.warn(
          `[화면 방향] ${wantsLandscape ? "가로" : "세로"} 잠금 실패 (${current})`,
          error,
        );
      });
      return () => {
        const leaveId = ++lockRunIdRef.current;
        void ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP,
        ).catch((error: unknown) => {
          if (leaveId !== lockRunIdRef.current) {
            return;
          }
          console.warn("[화면 방향] 세로 잠금 실패 (탭 이탈)", error);
        });
      };
    }, []),
  );
}

/**
 * 악기 소리 탭 — A 듣고 고르기 + B 피아노·기타·드럼.
 * 듣기 준비·통계는 헤더 아이콘으로 화면을 갈아끼움.
 *
 * 하단 탭은 **가로(피아노·기타)에서만 숨긴다.** 그 둘은 건반·프렛이 화면을 다 쓰고
 * 나가는 문이 `LandscapeBackButton` 하나다 — 세로용 탭이 남으면 영역이 겹치고
 * 나가는 길이 두 갈래가 된다. B가 그 화면만 `tabBarStyle: display:'none'`으로
 * 껐던 것과 같은 이유이고, 여기서는 라우트가 아니라 요청으로 올린다.
 */
export function InstTabScreen() {
  const theme = useTheme();
  const [track, setTrack] = useState<Track>("picker");
  const [showStats, setShowStats] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const isFocused = useIsFocused();

  useOrientationForTrack(track);
  /**
   * 방향과 **같은 조건**이다(`LANDSCAPE_TRACKS`). 둘이 갈리면 세로인데 탭바가 없거나
   * 가로인데 탭바가 남는다. 포커스를 같이 보는 것은, 가로 상태로 둔 채 다른 탭으로
   * 가면(딥링크 등) 숨김이 남기 때문이다.
   */
  useHideTabBar(isFocused && LANDSCAPE_TRACKS.has(track));

  const closeStats = useCallback(() => {
    setShowStats(false);
  }, []);

  const closeCheck = useCallback(() => {
    setShowCheck(false);
  }, []);

  const backToPicker = useCallback(() => {
    setTrack("picker");
    setShowStats(false);
    setShowCheck(false);
  }, []);

  const openTrack = useCallback((next: TrainingTrack) => {
    setTrack(next);
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
      if (track === "picker") {
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
    return <StatsScreen initialKind="inst" onBack={closeStats} />;
  }

  if (showCheck) {
    return (
      <ListeningCheckScreen onBack={closeCheck} />
    );
  }

  if (track === "listen") {
    return <InstSessionScreen onBack={backToPicker} />;
  }

  if (track === "piano") {
    return <MusicTrainingScreen onBack={backToPicker} />;
  }

  if (track === "guitar") {
    return <GuitarScreen onBack={backToPicker} />;
  }

  if (track === "drum") {
    return <DrumScreen onBack={backToPicker} />;
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
              title="악기 소리"
              caption="듣고 고르거나, 피아노·기타·드럼을 칩니다 · 병원 검사가 아니에요"
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
                  onPress={() => openTrack(option.track)}
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
                      <Icon
                        name={option.icon}
                        size={22}
                        color={theme.accent}
                      />
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
