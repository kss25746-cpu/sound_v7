import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DEFAULT_REFERENCE_HZ, playPureTone, stopPureTone } from "@/audio/pureTone";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ActionButton } from "@/components/ui/action-button";
import { Card } from "@/components/ui/card";
import { Equalizer } from "@/components/ui/equalizer";
import { Icon, type IconName } from "@/components/ui/icon";
import {
  MaxContentWidth,
  Radius,
  Shadows,
  Spacing,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/** 점검음 길이(초). 소리가 나는지 확인할 만큼만. 훈련 자극(0.5초)과 별개. */
const SAMPLE_DURATION_SEC = 1.5;

/**
 * 점검음 주파수(Hz). **볼륨 캘리브레이션이 아니라 재생 점검(sound check)** 이므로
 * 탭마다 실제 자극 주파수를 맞출 필요가 없다 — 사람 귀에 편한 중역대 순음(A4) 하나로 고정.
 * `주의`: 이 값이 퀴즈 크기와 이어지지 않는다. 퀴즈는 각자 고정 게인/파일/TTS로 재생된다.
 */
const CHECK_TONE_HZ = DEFAULT_REFERENCE_HZ;

/** idle 안내 화면 텍스트만 균일하게 살짝 키우는 배율(사용자 요청). */
const TEXT_SCALE = 1.2;

type ListeningCheckScreenProps = {
  onBack: () => void;
};

/** 카드 머리줄 — 파란 선 아이콘 + 굵은 한 줄. */
function GuideHeader({
  icon,
  title,
}: Readonly<{ icon: IconName; title: string }>) {
  const theme = useTheme();

  return (
    <View style={styles.guideHeader}>
      <Icon name={icon} size={18} color={theme.accent} />
      <ThemedText
        type="smallBold"
        style={[styles.guideTitle, styles.guideTitleText]}
      >
        {title}
      </ThemedText>
    </View>
  );
}

/**
 * 청취 조건 안내(정적) + 재생 점검(sound check). 시작 관문이 아니라 헤더 아이콘으로 연다(통계와 같음).
 *
 * 목적: 이어폰 연결·좌우·무음/볼륨0 여부를 **연습 전에** 확인하고, 편안한 볼륨을 찾게 한다.
 * `주의`: 이 화면은 **보정(calibration)도, 볼륨 맞추기도 아니다.** 여기서 낸 순음 크기는
 * 퀴즈로 이어지지 않는다(퀴즈는 각자 고정 게인/파일/TTS). 앱은 절대 음압을 모르며
 * OS 볼륨을 대신 바꾸지 않는다. 그래서 탭마다 주파수를 맞추지 않고 A4 순음 하나로 점검만 한다.
 */
export function ListeningCheckScreen({
  onBack,
}: Readonly<ListeningCheckScreenProps>) {
  const theme = useTheme();
  const abortRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current = true;
      stopPureTone();
    };
  }, []);

  const onPlaySample = useCallback(() => {
    if (playing) {
      return;
    }
    setError(null);
    setPlaying(true);
    abortRef.current = false;

    void playPureTone({
      frequencyHz: CHECK_TONE_HZ,
      durationSec: SAMPLE_DURATION_SEC,
    })
      .catch(() => {
        if (!abortRef.current) {
          setError("소리를 재생하지 못했어요. 기기 소리 설정을 확인해 주세요");
        }
      })
      .finally(() => {
        if (!abortRef.current) {
          setPlaying(false);
        }
      });
  }, [playing]);

  const leave = useCallback(() => {
    abortRef.current = true;
    stopPureTone();
    onBack();
  }, [onBack]);

  return (
    <ThemedView style={styles.fill}>
      {/*
        하단 inset은 빼야 한다 — 그 자리는 이미 네이티브 탭바가 덮고 있어서
        기본값을 쓰면 버튼 아래에 쓸모없는 48dp가 남고 안내가 그만큼 잘린다.
      */}
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            {/*
              시작 화면 hero 타일을 줄인 것 — 안내 카드가 쌓이는 화면이라 링은 뺀다.
              어느 탭에서 열든 진입 버튼(🎧)과 같은 헤드폰이다. 예전엔 탭 아이콘을 받아
              악기 소리만 건반이 나와 다른 화면처럼 보였다.
            */}
            <View
              style={[styles.trackMark, { backgroundColor: theme.accentTint }]}
            >
              <Icon name="headphones" size={30} color={theme.accent} />
            </View>
            <ThemedText
              type="screenTitle"
              style={[styles.centered, styles.title]}
            >
              듣기 준비
            </ThemedText>
          </View>

          <Card style={styles.box}>
            <GuideHeader
              icon="headphones"
              title="이어폰이나 헤드폰을 쓰는 게 좋아요"
            />
          </Card>

          <Card style={styles.box}>
            <GuideHeader
              icon="speaker"
              title="더 정확하게 듣기 위한 팁"
            />
            <ThemedText
              themeColor="textSecondary"
              type="small"
              style={styles.body}
            >
              • 초저가형 C타입 젠더는 절전 동작으로 인해 소리 첫 부분이 잘려 들릴 수 있어요.
              {"\n"}• 스마트폰 제조사 정품 젠더(삼성·애플 등)나 무선 이어폰을 권장해요.
            </ThemedText>
            
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: playing, busy: playing }}
              disabled={playing}
              onPress={onPlaySample}
              style={({ pressed }) => [
                styles.sampleButton,
                { backgroundColor: theme.accent },
                Shadows.accent,
                playing && styles.playing,
                pressed && !playing && styles.pressed,
              ]}
            >
              {playing ? (
                <Equalizer color={theme.onAccent} height={16} barWidth={3} />
              ) : null}
              <ThemedText
                type="smallBold"
                style={[{ color: theme.onAccent }, styles.sampleButtonText]}
              >
                {playing ? "재생 중…" : "볼륨 조정하기"}
              </ThemedText>
            </Pressable>
          </Card>

          <ThemedText
            themeColor="textMuted"
            type="small"
            style={styles.disclaimer}
          >
            웰니스 연습 · 병원 검사·진단을 대신하지 않아요
          </ThemedText>

          {error ? (
            <ThemedText
              themeColor="textSecondary"
              type="small"
              style={styles.centered}
            >
              {error}
            </ThemedText>
          ) : null}
        </ScrollView>
        <View style={styles.actions}>
          <ActionButton
            fill
            variant="primary"
            label="뒤로 가기"
            textScale={TEXT_SCALE}
            onPress={leave}
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
    // 하단 탭은 NativeTabs(네이티브)라 화면 영역이 이미 탭바 위에서 끝난다.
    // 탭바 높이를 또 더하면 버튼 아래에 80dp 빈 공간이 생긴다 — 스크롤을 씌우기
    // 전에는 내용이 넘쳐 흐르며 그 자리를 먹어 안 보였을 뿐이다.
    paddingBottom: Spacing.three,
    alignItems: "stretch",
    gap: Spacing.three - 4,
  },
  /**
   * 안내는 스크롤, 버튼은 그 밖에 고정.
   * 시스템 글씨 크기를 키우면 안내 카드가 화면을 넘치는데, 스크롤이 없으면
   * 「연습 시작」이 화면 밖으로 밀려 아예 눌리지 않는다(font_scale 1.2부터).
   */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    // 자리가 남으면 예전처럼 위에서부터, 모자랄 때만 스크롤.
    flexGrow: 1,
    gap: Spacing.three - 4,
  },
  header: {
    alignItems: "center",
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  trackMark: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.two - 2,
  },
  centered: {
    textAlign: "center",
  },
  /** screenTitle(23/30) × TEXT_SCALE. */
  title: {
    fontSize: 23 * TEXT_SCALE,
    lineHeight: 30 * TEXT_SCALE,
  },
  box: {
    gap: Spacing.two - 1,
  },
  guideHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  guideTitle: {
    flexShrink: 1,
  },
  /** smallBold(14/20) × TEXT_SCALE. */
  guideTitleText: {
    fontSize: 14 * TEXT_SCALE,
    lineHeight: 20 * TEXT_SCALE,
  },
  body: {
    fontSize: 12 * TEXT_SCALE,
    lineHeight: 19 * TEXT_SCALE,
  },
  /** smallBold(14/20) × TEXT_SCALE. */
  sampleButtonText: {
    fontSize: 14 * TEXT_SCALE,
    lineHeight: 20 * TEXT_SCALE,
  },
  sampleButton: {
    minHeight: 44,
    marginTop: Spacing.two - 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two + 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.small,
  },
  disclaimer: {
    fontSize: 14 * TEXT_SCALE,
    lineHeight: 20 * TEXT_SCALE,
    textAlign: "center",
    marginTop: Spacing.two,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.three - 4,
    // 스크롤 밖에 고정한다 — 배율을 키워도 버튼은 항상 화면에 남는다.
    // `marginTop: "auto"`는 스크롤과 같이 쓰면 1.0에서 레이아웃을 깬다(두 번 겪음).
    paddingTop: Spacing.three,
  },
  playing: {
    // 재생 중에도 버튼이 살아 있는 것처럼 보이게 — 완전히 흐려지지 않는다.
    opacity: 0.85,
  },
  pressed: {
    opacity: 0.7,
  },
});
