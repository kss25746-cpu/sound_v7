// components/OceanDepthMap.tsx — 결과 화면의 수심 단면도.
// 대역 세 개를 위(수면)→아래(심해)로 쌓고, 층 결론은 또렷/흐릿 알약으로만 구분한다.
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
  type ViewStyle,
} from "react-native";

import { FishShape } from "./Sea";
import { DEPTH_SCENE_ASPECT, DEPTH_SCENE_FOCUS, DEPTH_SCENES } from "./sceneAssets";
import { C, S, SCENE } from "./theme";
import { BAND_INFO, type BandKey } from "./words";
import { FINAL_LABEL, type SummaryResult } from "./testEngine";

// 수심 순서: 위(수면층 5m) -> 중간(중층 40m) -> 아래(심해층 120m)
export const DEPTH_ORDER: readonly BandKey[] = ["high", "mid", "low"];
/** 눈금 세 구간과 카드 세 장이 같은 간격이라 높이가 한 줄로 맞는다. */
export const DEPTH_LAYER_GAP = 6;

/** 층 장면 밝기에 맞춘 오버레이 글씨. 또렷/흐릿과 무관. */
export const DEPTH_LAYER_TEXT = {
  high: {
    fg: C.ink,
    fgSoft: C.inkSoft,
    chipBg: "rgba(8,32,61,0.12)",
    chipFg: C.ink,
  },
  mid: {
    fg: C.white,
    fgSoft: "rgba(255,255,255,0.85)",
    chipBg: "rgba(255,255,255,0.22)",
    chipFg: C.white,
  },
  low: {
    fg: C.white,
    fgSoft: "rgba(255,255,255,0.85)",
    chipBg: "rgba(255,255,255,0.22)",
    chipFg: C.white,
  },
} as const;

interface OceanDepthMapProps {
  summary: SummaryResult;
  selectedBand?: BandKey | null;
  onSelectBand?: (band: BandKey) => void;
  style?: ViewStyle;
}

export default function OceanDepthMap({
  summary,
  selectedBand,
  onSelectBand,
  style,
}: OceanDepthMapProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: C.right }]} />
            <Text style={[styles.legendText, { color: C.right }]}>{FINAL_LABEL.pass}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: C.wrong }]} />
            <Text style={[styles.legendText, { color: C.wrong }]}>{FINAL_LABEL.weak}</Text>
          </View>
        </View>
        <Text style={styles.mapSub} numberOfLines={1}>
          잘 들린 층은 또렷, 아니면 흐릿
        </Text>
      </View>

      <View style={styles.mapBody}>
        <DepthRuler
          layers={DEPTH_ORDER.map((band) => ({
            band,
            isPass: summary[band]?.final === "pass",
          }))}
        />
        <View style={styles.layersContainer} testID="depth-layers">
          {DEPTH_ORDER.map((band, idx) => {
            const isPass = summary[band]?.final === "pass";
            return (
              <DepthLayerCard
                key={band}
                band={band}
                isPass={isPass}
                isFirst={idx === 0}
                isLast={idx === DEPTH_ORDER.length - 1}
                isSelected={selectedBand === band}
                onPress={() => onSelectBand?.(band)}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 좌측 수심 눈금자 — 탐지등(코어+후광) + 또렷/흐릿 짧은 라벨           */
/* ------------------------------------------------------------------ */
/** 레이더 한 주기(ms). 1.2~1.6초 범위. 실기기에서 조정 가능. */
const RULER_PING_MS = 1400;

function DepthRuler({
  layers,
}: {
  layers: readonly { band: BandKey; isPass: boolean }[];
}) {
  return (
    <View style={styles.rulerWrap} testID="depth-ruler">
      <Text style={styles.rulerSurface} accessible={false}>
        0m
      </Text>
      {layers.map((layer, idx) => (
        <RulerSegment
          key={layer.band}
          band={layer.band}
          isPass={layer.isPass}
          delay={idx * 280}
        />
      ))}
    </View>
  );
}

function RulerSegment({
  band,
  isPass,
  delay,
}: {
  band: BandKey;
  isPass: boolean;
  delay: number;
}) {
  const scene = SCENE[band];
  const ping = useRadar(RULER_PING_MS, delay);
  const haloScale = ping.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.15],
  });
  const haloOpacity = ping.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 0.15],
  });
  const coreOpacity = ping.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.88],
  });
  const color = isPass ? C.right : C.wrong;
  const tick = scene.depth.replace(/^수심\s+/, "");
  const status = isPass ? FINAL_LABEL.pass : FINAL_LABEL.weak;

  return (
    <View
      style={styles.rulerSegment}
      testID={`depth-ruler-${band}`}
      accessibilityRole="text"
      accessibilityLabel={`${scene.name} ${scene.depth} 층 결론 ${status}`}
    >
      <View style={styles.rulerTrack} pointerEvents="none">
        <View testID={`depth-ruler-line-${band}`} style={styles.rulerLine} />
      </View>
      <View style={styles.rulerPingWrap} pointerEvents="none">
        <Animated.View
          style={[
            styles.rulerHalo,
            {
              backgroundColor: color,
              opacity: haloOpacity,
              transform: [{ scale: haloScale }],
            },
          ]}
        />
        <Animated.View
          testID={`depth-ruler-ping-${band}`}
          style={[styles.rulerPing, { backgroundColor: color, opacity: coreOpacity }]}
        />
      </View>
      <Text
        testID={`depth-ruler-status-${band}`}
        style={[styles.rulerStatus, { color }]}
        accessible={false}
      >
        {status}
      </Text>
      <Text style={styles.rulerLabel} accessible={false}>
        {tick}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 개별 수심층 카드                                                    */
/* ------------------------------------------------------------------ */
interface DepthLayerCardProps {
  band: BandKey;
  isPass: boolean;
  isFirst: boolean;
  isLast: boolean;
  isSelected?: boolean;
  onPress: () => void;
}

function DepthLayerCard({
  band,
  isPass,
  isFirst,
  isLast,
  isSelected,
  onPress,
}: DepthLayerCardProps) {
  const scene = SCENE[band];
  const info = BAND_INFO[band];
  const text = DEPTH_LAYER_TEXT[band];
  const bgColor = scene.colors[2];
  const focus = DEPTH_SCENE_FOCUS[band];
  let borderColor = "rgba(226,96,79,0.35)";
  if (isSelected) borderColor = C.gold;
  else if (isPass) borderColor = "rgba(255,255,255,0.22)";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.layerCard,
        {
          backgroundColor: bgColor,
          borderColor,
          aspectRatio: DEPTH_SCENE_ASPECT[band],
          borderTopLeftRadius: isFirst ? 16 : 6,
          borderTopRightRadius: isFirst ? 16 : 6,
          borderBottomLeftRadius: isLast ? 16 : 6,
          borderBottomRightRadius: isLast ? 16 : 6,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!isSelected }}
      accessibilityLabel={`${scene.name} ${scene.depth} ${isPass ? FINAL_LABEL.pass : FINAL_LABEL.weak} · ${info.name} ${info.range}`}
      testID={`depth-layer-${band}`}
    >
      <Image
        source={DEPTH_SCENES[band]}
        style={[
          styles.layerScene,
          {
            width: `${focus.scale * 100}%`,
            height: `${focus.scale * 100}%`,
            transform: [{ translateX: focus.x }, { translateY: focus.y }],
          },
        ]}
        resizeMode="cover"
        testID={`depth-scene-${band}`}
        accessibilityIgnoresInvertColors
        accessible={false}
      />
      <ClearWash />
      <SunbeamEffect isTopLayer={isFirst} />
      <SwimmingSchool />

      <View style={styles.layerContent} testID={`depth-content-${band}`}>
        <View style={styles.layerHeader}>
          <View style={styles.titleGroup}>
            <Text style={styles.layerDepth}>{scene.depth}</Text>
            <Text style={[styles.layerName, { color: text.fg }]}>{scene.name}</Text>
            <Text style={[styles.bandFreq, { color: text.fgSoft }]}>({info.range})</Text>
          </View>

          <View style={[styles.statusBadge, isPass ? styles.badgePass : styles.badgeWeak]}>
            <Text style={styles.statusBadgeText}>
              {isPass ? FINAL_LABEL.pass : FINAL_LABEL.weak}
            </Text>
          </View>
        </View>

        <View style={styles.layerMiddle}>
          <View style={styles.consonantBox}>
            <Text style={[styles.consonantLabel, { color: text.fg }]}>대표 자음</Text>
            <View style={styles.consonantTags}>
              {info.consonants.map((c) => (
                <View key={c} style={[styles.consonantChip, { backgroundColor: text.chipBg }]}>
                  <Text style={[styles.consonantChipText, { color: text.chipFg }]}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* 효과: 흐린 실루엣 물고기 두 마리                                      */
/* ------------------------------------------------------------------ */
function useLoop(from: number, to: number, duration: number, delay = 0): Animated.Value {
  const [value] = useState(() => new Animated.Value(from));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: to,
          duration,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: from,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [value, from, to, duration, delay]);
  return value;
}

/** 0→1 후 즉시 리셋. 후광이 커졌다 사라지는 레이더 링. */
function useRadar(duration: number, delay = 0): Animated.Value {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    const start = () => {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 1,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    };
    const id = delay > 0 ? setTimeout(start, delay) : undefined;
    if (delay <= 0) start();
    return () => {
      if (id !== undefined) clearTimeout(id);
      loop?.stop();
    };
  }, [value, duration, delay]);
  return value;
}

function SwimmingSchool() {
  const anim1 = useLoop(0, 1, 9000);
  const anim2 = useLoop(0, 1, 7500, 800);

  const transX1 = anim1.interpolate({ inputRange: [0, 1], outputRange: [-20, 140] });
  const transY1 = anim1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -6, 2] });
  const transX2 = anim2.interpolate({ inputRange: [0, 1], outputRange: [180, 20] });
  const transY2 = anim2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 8, -4] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          styles.fishItem,
          { top: 22, left: 30, transform: [{ translateX: transX1 }, { translateY: transY1 }] },
        ]}
      >
        <FishShape size={26} color={C.white} opacity={0.22} />
      </Animated.View>
      <Animated.View
        style={[
          styles.fishItem,
          { bottom: 20, right: 40, transform: [{ translateX: transX2 }, { translateY: transY2 }] },
        ]}
      >
        <FishShape size={18} color={C.white} opacity={0.16} flip />
      </Animated.View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 효과: 장면을 밝게 올리고 수면에서 빛이 내려온다                         */
/* ------------------------------------------------------------------ */
function ClearWash() {
  return (
    <View style={styles.clearWash} pointerEvents="none" testID="depth-clear" />
  );
}

function SunbeamEffect({ isTopLayer }: { isTopLayer: boolean }) {
  const pulse = useLoop(0.5, 0.85, 2600);
  return (
    <Animated.View
      style={[
        styles.sunbeam,
        {
          opacity: pulse,
          backgroundColor: isTopLayer ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.07)",
        },
      ]}
      pointerEvents="none"
    />
  );
}

/* ------------------------------------------------------------------ */
/* 스타일                                                              */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(10, 35, 66, 0.88)",
    borderRadius: S.radius + 6,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  mapSub: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.75)",
    textAlign: "right",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  mapBody: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
  },
  rulerWrap: {
    width: 56,
    gap: DEPTH_LAYER_GAP,
    position: "relative",
    overflow: "visible",
  },
  rulerSurface: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: "rgba(255,255,255,0.65)",
  },
  rulerSegment: {
    flex: 1,
    alignItems: "center",
    position: "relative",
    overflow: "visible",
  },
  rulerTrack: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  rulerLine: {
    position: "absolute",
    top: 4,
    bottom: 4,
    width: 2,
    borderRadius: 1,
    backgroundColor: C.white,
    opacity: 0.28,
  },
  rulerPingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  rulerHalo: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  rulerPing: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rulerStatus: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  rulerLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: C.gold,
  },
  layersContainer: {
    flex: 1,
    gap: DEPTH_LAYER_GAP,
  },
  layerCard: {
    borderWidth: 1.5,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
  },
  layerScene: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  layerContent: {
    zIndex: 2,
    padding: 12,
  },
  layerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 6,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    flexWrap: "wrap",
    flex: 1,
  },
  layerDepth: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: C.gold,
  },
  layerName: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    color: C.ink,
  },
  bandFreq: {
    fontSize: 14,
    lineHeight: 20,
    color: C.inkSoft,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgePass: {
    backgroundColor: C.right,
  },
  badgeWeak: {
    backgroundColor: C.wrong,
  },
  statusBadgeText: {
    color: C.white,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  layerMiddle: {
    marginVertical: 4,
    gap: 4,
  },
  consonantBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  consonantLabel: {
    fontSize: 14,
    lineHeight: 20,
    color: C.ink,
    fontWeight: "700",
  },
  consonantTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    flex: 1,
  },
  consonantChip: {
    backgroundColor: "rgba(8,32,61,0.12)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  consonantChipText: {
    color: C.ink,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  sunbeam: {
    ...StyleSheet.absoluteFill,
    transform: [{ rotate: "15deg" }, { scale: 1.3 }],
  },
  clearWash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  fishItem: {
    position: "absolute",
  },
});
