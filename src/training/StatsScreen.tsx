/**
 * 통합 연습 기록 화면 — 어느 탭에서 열어도 같은 화면.
 * 헤더 차트 버튼 한 번에 그 탭 통계가 뜨고(탭이 그 종목으로 열림), 다른 종목은
 * 칩으로 건너뛴다. 본문은 고른 칩만 — 다른 종목 근황 줄은 없다.
 *
 * 한 번에 하나만 그린다 — 네 그래프를 세로로 쌓지 않는다.
 * 저장소는 열 때 한 번만 읽고(`loadStatsFeed`), 탭 전환은 메모리로 처리한다.
 *
 * 탭을 누르면 「그 종목 화면이 열린다」고 읽히게 세 가지를 준다.
 *  1) 고른 탭만 파란 면 + 아래 삼각 꼬리로 본문을 가리킨다.
 *  2) 본문 맨 위에 종목 아이콘·이름·기록 수를 단 제목줄이 선다.
 *  3) 본문 전체가 누른 방향에서 밀려 들어온다(오른쪽 탭을 고르면 오른쪽에서).
 * 화면 이동(navigation)은 없다 — 스크롤만 맨 위로 되돌린다.
 */

import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInLeft, FadeInRight } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ActionButton } from "@/components/ui/action-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Icon, type IconName } from "@/components/ui/icon";
import { MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { PitchCompareProgressPanel } from "@/training/pitch2afc/PitchCompareProgressPanel";
import { Ling6ProgressPanel } from "@/training/ling6/Ling6ProgressPanel";
import { FreqFindProgressPanel } from "@/training/FreqFindProgressPanel";
import {
  clearStatsKind,
  countOfKind,
  EMPTY_STATS_FEED,
  freqFindRowsOfFeed,
  KIND_LABEL,
  loadStatsFeed,
  sessionRowsOfKind,
  STATS_KINDS,
  type StatsFeed,
  type StatsKind,
} from "@/training/statsFeed";
import { InstProgressPanel } from "@/training/inst/InstProgressPanel";
import { SentClosedProgressPanel } from "@/training/sentClosed/SentClosedProgressPanel";
import { WrsProgressPanel } from "@/training/wrs/WrsProgressPanel";

type StatsScreenProps = {
  /** 이 화면을 연 탭의 종목. 탭이 여기서 시작한다. */
  initialKind: StatsKind;
  onBack: () => void;
};

/** 본문 제목줄의 그림 — 각 종목이 훈련 화면에서 쓰는 아이콘 그대로. */
const KIND_ICON: Record<StatsKind, IconName> = {
  ling6: "headphones",
  pitch2: "bars",
  wrs1: "oneChar",
  wrs2: "twoChar",
  freqFind: "waves",
  sent: "sentence",
  inst: "pianoKeys",
};

/** 본문이 밀려 들어오는 시간(ms). 넘기는 느낌만 주고 기다리게 하지 않는다. */
const ENTER_MS = 220;

/** 선택한 종목의 본문. 종목마다 이미 있던 패널을 그대로 쓴다. */
function KindPanel({
  feed,
  kind,
}: Readonly<{ feed: StatsFeed; kind: StatsKind }>) {
  if (kind === "ling6") {
    return <Ling6ProgressPanel records={feed.ling6} />;
  }
  if (kind === "wrs1") {
    return <WrsProgressPanel records={feed.wrs1} />;
  }
  if (kind === "wrs2") {
    return <WrsProgressPanel records={feed.wrs2} />;
  }
  if (kind === "sent") {
    return <SentClosedProgressPanel records={feed.sent} />;
  }
  if (kind === "inst") {
    return <InstProgressPanel records={feed.inst} />;
  }
  if (kind === "freqFind") {
    return <FreqFindProgressPanel records={freqFindRowsOfFeed(feed)} />;
  }
  if (kind === "pitch2") {
    const rows = sessionRowsOfKind(feed, "pitch2").filter(
      (row): row is Extract<typeof row, { track: "pitch2" }> =>
        row.track === "pitch2",
    );
    return <PitchCompareProgressPanel records={rows} />;
  }
  return null;
}

type TabSpot = { x: number; width: number };

/** 지금 보는 종목 + 본문이 밀려 들어올 방향(오른쪽 탭으로 갔으면 `true`). */
type TabView = { kind: StatsKind; forward: boolean };

/**
 * 종목 탭 줄. 고른 것만 파란 면 + 꼬리로 아래 본문과 이어 보이게 한다.
 * 일곱 개라 한 화면에 다 들어오지 않으므로, 고른 탭이 잘리면 가운데로 굴려 준다
 * (헤더 차트 버튼으로 들어오면 그 종목이 줄 끝에 있을 수 있다).
 */
function KindTabs({
  value,
  onChange,
}: Readonly<{ value: StatsKind; onChange: (next: StatsKind) => void }>) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const spots = useRef<Partial<Record<StatsKind, TabSpot>>>({});
  const rowWidth = useRef(0);

  const revealTab = useCallback((kind: StatsKind) => {
    const spot = spots.current[kind];
    if (spot == null || rowWidth.current === 0) {
      return;
    }
    const x = Math.max(0, spot.x - (rowWidth.current - spot.width) / 2);
    scrollRef.current?.scrollTo({ x, animated: true });
  }, []);

  const pick = useCallback(
    (kind: StatsKind) => {
      onChange(kind);
      revealTab(kind);
    },
    [onChange, revealTab],
  );

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      style={styles.tabScroll}
      contentContainerStyle={styles.tabRow}
      onLayout={(event) => {
        rowWidth.current = event.nativeEvent.layout.width;
        revealTab(value);
      }}
    >
      {STATS_KINDS.map((kind) => {
        const active = kind === value;
        return (
          <View
            key={kind}
            style={styles.tabSlot}
            onLayout={(event) => {
              const { x, width } = event.nativeEvent.layout;
              spots.current[kind] = { x, width };
              if (active) {
                revealTab(kind);
              }
            }}
          >
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={`${KIND_LABEL[kind]} 기록 보기`}
              accessibilityState={{ selected: active }}
              onPress={() => pick(kind)}
              style={({ pressed }) => [
                styles.tab,
                {
                  borderColor: active ? theme.accent : theme.border,
                  backgroundColor: active ? theme.accent : theme.surface,
                },
                pressed && styles.tabPressed,
              ]}
            >
              <ThemedText
                type="smallBold"
                style={{ color: active ? theme.onAccent : theme.textSecondary }}
              >
                {KIND_LABEL[kind]}
              </ThemedText>
            </Pressable>
            {/* 고른 탭에서 본문으로 내려가는 꼬리. 자리는 늘 잡아 둔다(줄 높이 고정). */}
            <View
              style={[
                styles.tabCaret,
                { borderTopColor: theme.accent },
                !active && styles.tabCaretHidden,
              ]}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

/** 본문 맨 위 제목줄 — 지금 보고 있는 게 어느 종목인지 그림과 글로 못 박는다. */
function PanelHeading({
  kind,
  count,
}: Readonly<{ kind: StatsKind; count: number }>) {
  const theme = useTheme();

  return (
    <View style={styles.panelHeading}>
      <View
        style={[
          styles.panelMark,
          {
            backgroundColor: theme.accentTint,
            borderColor: theme.accentBorder,
          },
        ]}
      >
        <Icon name={KIND_ICON[kind]} size={24} color={theme.accent} />
      </View>
      <View style={styles.panelHeadingText}>
        <ThemedText style={styles.panelTitle}>{KIND_LABEL[kind]}</ThemedText>
        <ThemedText themeColor="textMuted" type="small">
          {count > 0 ? `기록 ${count}회` : "기록 없음"}
        </ThemedText>
      </View>
    </View>
  );
}

function ClearKindButton({
  kind,
  clearing,
  disabled,
  onPress,
}: Readonly<{
  kind: StatsKind;
  clearing: boolean;
  disabled: boolean;
  onPress: () => void;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${KIND_LABEL[kind]} 연습 기록 지우기`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.clearKind,
        disabled && styles.clearKindDisabled,
        pressed && !disabled && styles.clearKindPressed,
      ]}
    >
      <ThemedText themeColor="danger" type="small" style={styles.clearKindLabel}>
        {clearing ? "지우는 중…" : `${KIND_LABEL[kind]} 기록 지우기`}
      </ThemedText>
    </Pressable>
  );
}

export function StatsScreen({
  initialKind,
  onBack,
}: Readonly<StatsScreenProps>) {
  // 고른 종목과, 본문이 들어올 방향을 한 상태로 묶는다 —
  // 방향은 「어디서 어디로 갔나」라서 kind와 따로 두면 한 프레임 어긋난다.
  const [view, setView] = useState<TabView>({
    kind: initialKind,
    forward: true,
  });
  const [feed, setFeed] = useState<StatsFeed>(EMPTY_STATS_FEED);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const bodyRef = useRef<ScrollView>(null);
  const kind = view.kind;

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    void loadStatsFeed()
      .then((next) => {
        setFeed(next);
      })
      .catch(() => {
        setError("기록을 불러오지 못했어요");
        setFeed(EMPTY_STATS_FEED);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // 첫 진입과, 탭이 살아있는 채로 포커스가 돌아올 때 갱신한다.
  // `useFocusEffect`는 마운트에서도 한 번 도므로 별도 `useEffect`를 두면 두 번 읽는다.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  /** 종목 바꾸기 — 새 본문은 늘 위에서부터(앞 종목 스크롤 위치를 물려주지 않는다). */
  const pickKind = useCallback(
    (next: StatsKind) => {
      if (next === kind) {
        return;
      }
      bodyRef.current?.scrollTo({ y: 0, animated: false });
      setView({
        kind: next,
        forward: STATS_KINDS.indexOf(next) > STATS_KINDS.indexOf(kind),
      });
    },
    [kind],
  );

  const doClear = useCallback(() => {
    setClearing(true);
    void clearStatsKind(kind)
      .then(() => {
        Alert.alert("완료", `${KIND_LABEL[kind]} 연습 기록을 지웠어요.`);
        reload();
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "";
        if (message === "NETWORK_ERROR") {
          Alert.alert(
            "네트워크 연결 확인",
            "서버와 통신할 수 없습니다. 네트워크 연결 상태를 확인 후 다시 시도해 주세요.",
          );
        } else {
          Alert.alert("오류", "기록을 지우지 못했어요.");
        }
      })
      .finally(() => {
        setClearing(false);
      });
  }, [kind, reload]);

  const confirmClear = useCallback(() => {
    Alert.alert(
      "기록 삭제",
      `${KIND_LABEL[kind]} 연습 기록을 모두 지울까요? 다른 연습 기록은 그대로예요. 되돌릴 수 없어요.`,
      [
        { text: "취소", style: "cancel" },
        { text: "삭제", style: "destructive", onPress: doClear },
      ],
    );
  }, [doClear, kind]);

  const count = countOfKind(feed, kind);
  const hasRecords = count > 0;
  const entering = (view.forward ? FadeInRight : FadeInLeft).duration(ENTER_MS);

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <ScreenHeader
          title="연습 기록"
          caption="이 기기에만 저장 · 점수·청력 검사·진단 결과 아님"
        />

        <KindTabs value={kind} onChange={pickKind} />

        <ScrollView
          ref={bodyRef}
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ThemedText
              themeColor="textMuted"
              type="small"
              style={styles.notice}
            >
              불러오는 중…
            </ThemedText>
          ) : null}

          {error ? (
            <ThemedText
              themeColor="textSecondary"
              type="small"
              style={styles.notice}
            >
              {error}
            </ThemedText>
          ) : null}

          {/*
           * `key`가 종목이라 탭을 바꾸면 이 덩어리째 새로 그려지고, 그때 등장
           * 애니메이션이 돈다 — 제목줄·그래프가 한 화면처럼 같이 들어온다.
           * 기록을 지워 `feed`만 바뀔 때는 key가 그대로라 움직이지 않는다.
           */}
          {!loading && !error ? (
            <Animated.View
              key={kind}
              entering={entering}
              style={styles.panelStack}
            >
              <PanelHeading kind={kind} count={count} />

              {hasRecords ? (
                <KindPanel feed={feed} kind={kind} />
              ) : (
                <ThemedText
                  themeColor="textMuted"
                  type="small"
                  style={styles.notice}
                >
                  아직 {KIND_LABEL[kind]} 기록이 없어요
                </ThemedText>
              )}

              {/*
               * 기록 지우기는 본문 맨 아래. 되돌릴 수 없는 동작이라 화면 하단에
               * 「뒤로 가기」와 나란히 상시 노출하지 않는다 — 끝까지 내려야 닿는다.
               */}
              {hasRecords ? (
                <ClearKindButton
                  kind={kind}
                  clearing={clearing}
                  disabled={clearing}
                  onPress={confirmClear}
                />
              ) : null}
            </Animated.View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <ActionButton
            fill
            variant="primary"
            label="뒤로 가기"
            onPress={onBack}
          />
        </View>
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
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    alignItems: "stretch",
    gap: Spacing.three - 2,
  },
  /**
   * `horizontal` ScrollView는 RN 기본 스타일이 `flexGrow: 1`이라 세로로 늘어난다.
   * 그러면 탭이 `stretch`로 따라 늘어나 화면을 잡아먹는다 — 둘 다 막는다.
   */
  tabScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
    paddingRight: Spacing.two,
  },
  tabSlot: {
    alignItems: "center",
  },
  /** `minHeight` 44 = 손가락 최소 타깃. 글자만으로는 32px밖에 안 됐다. */
  tab: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    justifyContent: "center",
  },
  tabPressed: {
    opacity: 0.7,
  },
  /** 아래를 가리키는 삼각형 — RN에 도형이 없어 테두리로 만든다. */
  tabCaret: {
    width: 0,
    height: 0,
    marginTop: Spacing.one,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderBottomWidth: 0,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  tabCaretHidden: {
    opacity: 0,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  panelStack: {
    gap: Spacing.three,
  },
  panelHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two + 2,
  },
  panelMark: {
    width: 44,
    height: 44,
    borderRadius: Radius.small,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  panelHeadingText: {
    flexShrink: 1,
    gap: 1,
  },
  /** 화면 제목(23)보다 한 단 아래. 14px 하한 위라 인라인 축소가 아니다. */
  panelTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: 700,
  },
  notice: {
    textAlign: "center",
    paddingVertical: Spacing.three,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
  },
  /** 본문 맨 아래 한 줄. 오른쪽 구석이 아니라 가운데 — 실수로 스치지 않을 자리다. */
  clearKind: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.two,
  },
  clearKindLabel: {
    textAlign: "center",
  },
  clearKindPressed: {
    opacity: 0.7,
  },
  clearKindDisabled: {
    opacity: 0.4,
  },
});
