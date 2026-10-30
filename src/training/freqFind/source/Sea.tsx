// components/Sea.tsx — 소리를 찾는 바다의 공용 조각들.
//
// 2026-09-14 정돈: 3단 색 띠 배경 → SVG 그라데이션, 버튼·글자 크기는 앱 공용
// (`ActionButton`·`ThemedText`) 규칙에 맞췄다.
//
// 2026-09-14 되돌림: 같은 작업에서 떠다니는 이모지 물고기와 거품까지 지우고 흐린 SVG
// 실루엣 2마리로 바꿨는데, 그건 「이모지 아이콘을 걷어낸다」는 결정의 범위 밖이었다.
// 이모지를 금지한 이유는 버튼·라벨 같은 UI 요소에 쓰였기 때문이고, 배경 장식은 해당하지
// 않는다. 둘 다 되살리되 예전 밀도(거품 14개·불투명도 0.55, 물고기 0.9)로는 돌아가지
// 않는다. 물고기 종류도 수심에 맞게 정리했다(`SCENE[band].fish`).
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  ImageSourcePropType,
  Pressable,
  Animated,
  Easing,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

import { Colors, MaxContentWidth } from "@/constants/theme";
import { Equalizer } from "@/components/ui/equalizer";
import { Icon, type IconName } from "@/components/ui/icon";
import { useReduceMotion } from "@/hooks/use-reduce-motion";

import { FISH, FISH_ASPECT, type FishKey } from "./sceneAssets";
import { C, S, T, SCENE, seaTextShadow, type SceneKey } from "./theme";

/* ------------------------------------------------------------------ */
/* 배경 — 경계 없는 수심 그라데이션 + 수면에서 내려오는 빛              */
/* ------------------------------------------------------------------ */

interface SeaBackgroundProps {
  scene?: SceneKey;
  children?: React.ReactNode;
  /** 떠다니는 거품·물고기. 4단계(대립쌍)처럼 아무것도 움직이면 안 되는 화면은 끈다. */
  showDrift?: boolean;
  /** 떠다니는 물고기만. 홈·결과처럼 거품은 두고 물고기만 빼려면 끈다. */
  showFish?: boolean;
}

export function SeaBackground({
  scene = "neutral",
  children,
  showDrift = true,
  showFish = true,
}: SeaBackgroundProps) {
  const s = SCENE[scene] ?? SCENE.neutral;
  const gradientId = `sea-${scene}`;
  const lightId = `sea-light-${scene}`;
  const scrimId = `sea-scrim-${scene}`;
  return (
    <View style={[styles.fill, { backgroundColor: s.colors[4] }]}>
      <StatusBar
        barStyle={s.light ? "dark-content" : "light-content"}
        backgroundColor="transparent"
        translucent
      />
      <Svg
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            {s.colors.map((color, i) => (
              <Stop key={color + i} offset={i / (s.colors.length - 1)} stopColor={color} />
            ))}
          </LinearGradient>
          {/* 수면 광원 — 위쪽 가운데가 살짝 밝고 아래로 갈수록 사라진다. */}
          <RadialGradient id={lightId} cx="50%" cy="0%" r="75%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={s.light ? 0.28 : 0.2} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
          {/*
            헤더 그늘 — 글자가 놓이는 위쪽만 눌러 준다(2026-09-15).
            배경색(그라데이션 정지점)은 수심을 나타내는 정보고, 장면끼리 위아래로
            이어지도록 `mid.colors[0] === high.colors[2]` 처럼 물려 둔 값이라
            손대지 않는다. 대비가 필요한 띠에만 어둠을 덮는 쪽이 정보를 지킨다.

            흰 글씨 기준(광원까지 얹은 뒤) 중층은 맨 위 1.96:1 → 5.86:1,
            히어로 문구가 앉는 18% 지점은 2.47:1 → 6.11:1이 된다. 42% 아래로는
            흔적이 없어 화면 가운데·바닥은 예전 그대로다.
            `C.abyss` 계열이라 검은 막이 아니라 깊은 물로 읽힌다.

            `주의`: 광원(`cy="0%"`)을 헤더 아래로 내리는 안도 재 봤는데, 맨 위는
            조금 나아지지만 그만큼 화면 **가운데**가 밝아져 소리 버튼 캡션이
            3.88:1 → 3.53:1로 되레 나빠졌다. 광원은 그대로 두고 그늘만 덮는다.
          */}
          <LinearGradient id={scrimId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset={0} stopColor="#031026" stopOpacity={0.5} />
            <Stop offset={0.18} stopColor="#031026" stopOpacity={0.45} />
            <Stop offset={0.42} stopColor="#031026" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill={`url(#${gradientId})`} />
        <Rect x="0" y="0" width="100" height="100" fill={`url(#${lightId})`} />
        {/* 수면층은 글자가 어두운 색이라(12:1) 그늘을 덮으면 오히려 읽기 나빠진다. */}
        {s.light ? null : (
          <Rect x="0" y="0" width="100" height="100" fill={`url(#${scrimId})`} />
        )}
      </Svg>

      {showDrift ? <BubbleField light={s.light} /> : null}
      {showDrift && showFish ? (
        /* 수심이 바뀌면 다시 마운트되어 배치 시드가 새로 뽑힌다. 종류 풀은 `s.fish` 그대로. */
        <FishField key={scene} fishes={s.fish} />
      ) : null}
      {/* 배경은 화면 전체, 내용은 다른 탭처럼 `MaxContentWidth`(태블릿) 안에 가운데 정렬. */}
      <View style={[styles.fill, styles.content]}>{children}</View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 물고기 실루엣 — 결과 화면 수심 지도의 정지 장식                        */
/* ------------------------------------------------------------------ */

/** 32×20 그리드의 물고기 한 마리. 색·크기는 호출부가 정한다. */
export function FishShape({
  size = 32,
  color = C.white,
  opacity = 1,
  flip = false,
}: {
  size?: number;
  color?: string;
  opacity?: number;
  flip?: boolean;
}) {
  return (
    <Svg
      width={size}
      height={size * 0.625}
      viewBox="0 0 32 20"
      opacity={opacity}
      style={flip ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      <Path
        d="M1 10C6 2.5 13.5 1 20.5 6.2L30 2l-2.2 8L30 18l-9.5-4.2C13.5 19 6 17.5 1 10Z"
        fill={color}
      />
    </Svg>
  );
}

/** 렌더 중 `Math.random`을 부르지 않기 위한 결정적 의사난수. */
const pseudo = (index: number, seed: number): number => {
  const x = Math.sin(index * 997.13 + seed * 37.19) * 10000;
  return x - Math.floor(x);
};

/** `pseudo`로 섞는다. 같은 시드면 같은 순서. */
const shuffleSeeded = <T,>(items: readonly T[], seed: number): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(pseudo(i, seed) * (i + 1));
    const atI = out[i];
    const atJ = out[j];
    if (atI === undefined || atJ === undefined) continue;
    out[i] = atJ;
    out[j] = atI;
  }
  return out;
};

/* ------------------------------------------------------------------ */
/* 거품 — 아래에서 위로                                                 */
/* ------------------------------------------------------------------ */

interface BubbleProps {
  left: number;
  size: number;
  duration: number;
  delay: number;
  /** 멈춰 세울 높이(화면 비율). 위상 0은 투명해서 쓰면 사라진 것과 같다. */
  rest: number;
  still: boolean;
  height: number;
  peak: number;
  color: string;
  borderColor: string;
}

function Bubble({
  left,
  size,
  duration,
  delay,
  rest,
  still,
  height,
  peak,
  color,
  borderColor,
}: BubbleProps) {
  const [p] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.timing(p, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [p, duration, delay, still]);

  // 멈출 때는 보간을 태우지 않고 시드가 정한 높이에 그대로 세운다. 값이 정적이라
  // 올라오다 만 자리에서 반쯤 투명하게 굳는 일이 없다.
  const pose = still
    ? { opacity: peak, transform: [{ translateY: -rest * height }] }
    : {
        opacity: p.interpolate({
          inputRange: [0, 0.1, 0.85, 1],
          outputRange: [0, peak, peak * 0.7, 0],
        }),
        transform: [
          { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, -height - 80] }) },
          { translateX: p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 12, -8] }) },
        ],
      };

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          left,
          bottom: -40,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderColor,
          ...pose,
        },
      ]}
      pointerEvents="none"
      testID="sea-bubble"
    />
  );
}

/**
 * 올라오는 거품. 예전 14개·불투명도 0.55는 배경이 시끄러웠고, 그다음 손질에서는 아예
 * 사라졌다. 지금은 8개·0.3으로 「있는지 모르게 있는」 정도만 남긴다.
 * 수면층은 배경이 밝아 흰 거품이 묻히므로 어둡게 그린다.
 */
export function BubbleField({
  count = 8,
  light = false,
}: {
  count?: number;
  light?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const color = light ? "rgba(8,32,61,0.4)" : "rgba(255,255,255,0.7)";
  const borderColor = light ? "rgba(8,32,61,0.55)" : "rgba(255,255,255,0.9)";
  const peak = light ? 0.22 : 0.3;
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: `bubble-${i}`,
        left: pseudo(i, 1) * Math.max(width - 20, 40),
        size: 5 + pseudo(i, 2) * 10,
        duration: 8000 + pseudo(i, 3) * 7000,
        delay: pseudo(i, 4) * 6000,
        // 멈춰 세울 높이(화면 비율). 바닥이나 천장에 몰리지 않게 가운데 언저리로.
        rest: 0.25 + pseudo(i, 5) * 0.45,
      })),
    [count, width]
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" testID="sea-bubbles">
      {seeds.map(({ id, ...b }) => (
        <Bubble
          key={id}
          {...b}
          still={reduceMotion}
          height={height}
          peak={peak}
          color={color}
          borderColor={borderColor}
        />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 헤엄치는 객체 — 깊이마다 사는 것이 다르다                              */
/* ------------------------------------------------------------------ */

/*
  2026-09-15 유영 손질. 그전까지 물고기는 `Easing.linear`로 등속 횡단하면서 세로로만
  `[0, -10, 0, 10, 0]`를 오갔다 — 16~28초에 500dp를 가는 동안 위아래 10px이라 기울기가
  사실상 0이었고, 화면에서는 「스티커가 미끄러지는」 것으로 읽혔다. 세 가지를 고쳤다.

  (1) 속도를 맥박치게 — 꼬리를 한 번 칠 때 밀려 나갔다가 미끄러진다.
  (2) 세로 진폭을 몸 높이에 비례하게 키워 경로를 물결로.
  (3) 오르내리는 방향으로 코를 든다.

  `주의`: 몸통이 휘거나 꼬리가 젓는 건 여기서 할 수 없다. 비트맵 한 장(`FISH[kind]`)이라
  변형이 불가능하고, 그건 벡터·메시 런타임을 들여야 하는 별개의 결정이다.
*/

/** 꼬리를 한 번 치는 주기. 밀려 나갔다가 미끄러지는 리듬 하나의 길이. */
const FISH_BEAT_MS = 1400;
/** 한 번 칠 때 더 밀리는 거리(몸 높이 대비). 키우면 튕기듯 움직여 만화가 된다. */
const FISH_SURGE = 0.16;
/** 횡단하는 동안 오르내리는 폭(몸 높이 대비). */
const FISH_WAVE = 0.45;
/** 오르내림이 가장 가파른 지점에서 코가 드는 각. */
const FISH_PITCH_DEG = 9;
/** 횡단 한 번에 그리는 물결 수. */
const FISH_WAVE_CYCLES = 2;

/*
  사인을 등분해 뽑아 `interpolate`에 그대로 넘긴다. `interpolate`는 점 사이를 직선으로
  이으므로 점이 적으면 각이 진다. 예전 5점이 꺾여 보이지 않았던 건 진폭이 10px뿐이라서였고,
  진폭을 키우는 순간 드러난다. 주기당 12점이면 보이지 않는다.
*/
const FISH_SAMPLES = FISH_WAVE_CYCLES * 12;
const FISH_PHASE = Array.from({ length: FISH_SAMPLES + 1 }, (_, i) => i / FISH_SAMPLES);

/**
 * 횡단 진행률 `t`(0~1)에서의 자세 — 세로 위치와 그 지점에서 코가 드는 각.
 * 위 표본을 이 함수로 떠서 `interpolate`에 넘긴다. 순수 함수라 물결 자체를 못 박을 수 있다.
 */
export const fishPoseAt = (size: number, t: number) => {
  const turn = 2 * Math.PI * FISH_WAVE_CYCLES * t;
  return {
    /** 화면 좌표라 아래가 +. 사인을 뒤집어 위로 먼저 뜨게 한다. */
    y: -Math.sin(turn) * size * FISH_WAVE,
    /** 세로 속도(= 위 곡선의 기울기)가 향하는 쪽으로 코를 든다. */
    deg: -Math.cos(turn) * FISH_PITCH_DEG,
  };
};

/*
  꼬리 한 번의 추진. 앞 4분의 1에서 밀고 나머지를 미끄러진다.
  시작과 끝이 모두 0이라 **합이 0** — 평균 속도와 도착 시각은 예전 그대로고 속도만 맥박친다.
*/
const FISH_SURGE_PHASE = [0, 0.12, 0.26, 0.45, 0.7, 1];
const FISH_SURGE_CURVE = [0, 0.45, 1, 0.78, 0.35, 0];

interface FishProps {
  kind: FishKey;
  top: number;
  duration: number;
  delay: number;
  /** 꼬리 주기. 마리마다 달라야 셋이 한 몸처럼 젓지 않는다. */
  beatMs: number;
  size: number;
  reverse: boolean;
  opacity: number;
  width: number;
  /** 멈춰 세울 가로 자리(화면 비율). 위상 0은 화면 밖이라 쓰면 사라진 것과 같다. */
  rest: number;
  still: boolean;
}

/** 폰 360dp에서 1. 폭 분기는 없고 너비에 비례한다. 상한은 콘텐츠 폭(560) 비율. */
const SEA_PHONE_WIDTH = 360;
const SEA_SCALE_MIN = 0.9;
const SEA_SCALE_MAX = MaxContentWidth / SEA_PHONE_WIDTH;

export const seaScaleForWidth = (width: number): number =>
  Math.min(Math.max(width / SEA_PHONE_WIDTH, SEA_SCALE_MIN), SEA_SCALE_MAX);

/** 물고기 크기 계산용 별칭. 식은 `seaScaleForWidth`와 같다. */
export const fishScaleForWidth = seaScaleForWidth;

function Fish({
  kind,
  top,
  duration,
  delay,
  beatMs,
  size,
  reverse,
  opacity,
  width,
  rest,
  still,
}: FishProps) {
  // 횡단(느림)과 꼬리(빠름)는 주기가 달라 값을 따로 둔다.
  const [cross] = useState(() => new Animated.Value(0));
  const [beat] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (still) return;
    const swim = Animated.loop(
      Animated.timing(cross, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    // 꼬리에는 지연을 주지 않는다. 루프 안의 지연은 매 주기 반복돼 젓다 말고 서 버린다
    // (`equalizer.tsx`에 같은 함정이 적혀 있다). 어긋남은 마리마다 다른 `beatMs`가 만든다.
    const tail = Animated.loop(
      Animated.timing(beat, {
        toValue: 1,
        duration: beatMs,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    swim.start();
    tail.start();
    return () => {
      swim.stop();
      tail.stop();
    };
  }, [cross, beat, duration, delay, beatMs, still]);

  const edge = size * FISH_ASPECT + 12;
  const forward = reverse ? -1 : 1;
  const flip = { scaleX: reverse ? -1 : 1 };
  const wave = FISH_PHASE.map((t) => fishPoseAt(size, t));

  /*
    멈출 때는 시드가 정한 자리에 **수평으로** 세운다. 물결 도중의 기울어진 자세로 굳으면
    고장난 것처럼 보이고, 위상 0으로 두면 화면 밖이라 사라진 것과 같아진다.
  */
  const transform = still
    ? [{ translateX: rest * width }, flip]
    : [
        // 등속 횡단 + 꼬리 추진. 추진의 합이 0이라 평균 속도는 그대로고 속도만 맥박친다.
        {
          translateX: Animated.add(
            cross.interpolate({
              inputRange: [0, 1],
              outputRange: reverse ? [width + edge, -edge] : [-edge, width + edge],
            }),
            beat.interpolate({
              inputRange: FISH_SURGE_PHASE,
              outputRange: FISH_SURGE_CURVE.map((v) => v * size * FISH_SURGE * forward),
            })
          ),
        },
        {
          translateY: cross.interpolate({
            inputRange: FISH_PHASE,
            outputRange: wave.map((q) => q.y),
          }),
        },
        {
          // 좌우 반전(`scaleX`)은 회전보다 **먼저** 적용되므로 회전은 뒤집히지 않는다.
          // 부호를 직접 줘서 반전된 물고기도 진행 방향으로 코를 들게 한다.
          // 표본 끝자락은 부동소수 찌꺼기(1e-16)가 남아 지수 표기가 되므로 자릿수를 끊는다.
          rotate: cross.interpolate({
            inputRange: FISH_PHASE,
            outputRange: wave.map((q) => `${(q.deg * forward).toFixed(2)}deg`),
          }),
        },
        flip,
      ];

  return (
    <Animated.Image
      source={FISH[kind]}
      resizeMode="contain"
      style={{
        position: "absolute",
        top,
        width: size * FISH_ASPECT,
        height: size,
        opacity,
        transform,
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={`sea-fish-${kind}`}
    />
  );
}

/**
 * 떠다니는 객체. 종류는 장면이 정한다(`SCENE[band].fish`) — 수면에는 밝은 물고기와
 * 돌고래, 심해에는 오징어·상어처럼 그 수심에 사는 것만 넣는다.
 * 불투명도는 예전 0.9가 너무 또렷했고 실루엣 0.1은 보이지 않았다. 멀리 있는 것일수록
 * 작고 흐리게(0.6~0.8) 그려 깊이가 느껴지게 한다. 하한을 0.45에서 0.6으로 올린 것은
 * 저대비 개체가 묻히던 문제 때문이고, 0.85를 넘기지 말 것(다시 또렷해진다).
 * 스크린리더가 장식 물고기를 읽지 않도록 접근성 트리에서 뺀다.
 *
 * 위치·방향·순서는 시드로 섞는다. 종류 목록 자체는 바꾸지 않는다.
 * 시드를 안 주면 마운트 때 한 번만 뽑는다(렌더마다 `Math.random` 금지).
 * 크기는 예전 22~38의 2배(44~76)를 폰 기준(360dp)으로 두고, 너비에 비례해 맞춘다.
 */
export function FishField({
  fishes = ["tropicalFish", "grayFish"],
  seed,
}: {
  fishes?: readonly FishKey[];
  seed?: number;
}) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const [mountSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const resolved = seed ?? mountSeed;
  const scale = fishScaleForWidth(width);
  const seeds = useMemo(
    () =>
      shuffleSeeded(fishes, resolved).map((kind, i) => {
        const near = pseudo(i, resolved + 9);
        return {
          id: `fish-${i}-${kind}`,
          kind,
          top: 90 + pseudo(i, resolved + 5) * Math.max(height * 0.6, 120),
          duration: 16000 + pseudo(i, resolved + 6) * 12000,
          delay: i * 2500 + pseudo(i, resolved + 7) * 3000,
          beatMs: FISH_BEAT_MS * (0.85 + pseudo(i, resolved + 10) * 0.4),
          // 멈춰 세울 가로 자리(화면 비율). 한쪽 끝에 몰리지 않게.
          rest: 0.08 + pseudo(i, resolved + 11) * 0.64,
          size: (44 + near * 32) * scale,
          opacity: 0.6 + near * 0.2,
          reverse: pseudo(i, resolved + 8) > 0.5,
        };
      }),
    [fishes, height, resolved, scale]
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" testID="sea-fish">
      {seeds.map(({ id, ...f }) => (
        <Fish key={id} {...f} width={width} still={reduceMotion} />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 진행 게이지                                                          */
/* ------------------------------------------------------------------ */

interface DepthGaugeProps {
  current: number;
  total: number;
  label: string;
  light?: boolean;
}

export function DepthGauge({ current, total, label, light = false }: DepthGaugeProps) {
  const ratio = total > 0 ? current / total : 0;
  return (
    <View style={styles.gaugeWrap}>
      <View style={[styles.gaugeTrack, light && styles.gaugeTrackLight]}>
        <View style={[styles.gaugeFill, { width: `${Math.min(1, ratio) * 100}%` }]} />
      </View>
      <Text style={[T.tiny, seaTextShadow(light), light && { color: C.inkSoft }]}>
        {label} · {current} / {total}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 단계 상단 행 — 제목 · 나가기 (flex, 절대 위치 없음)                   */
/* ------------------------------------------------------------------ */

export type StageExit = {
  title: string;
  accessibilityLabel: string;
  icon?: IconName;
  onPress: () => void;
};

export function StageHeader({
  scene = "neutral",
  label,
  place,
  exit,
}: {
  scene?: SceneKey;
  label?: React.ReactNode;
  place?: string;
  exit?: StageExit;
}) {
  const s = SCENE[scene] ?? SCENE.neutral;
  const hasTitle = (label != null && label !== "") || Boolean(place);
  return (
    <View style={styles.stageHeader} testID="stage-header">
      <View style={styles.stageHeaderTitle}>
        {hasTitle ? (
          <>
            {label != null && label !== "" ? (
              <Text style={[T.tiny, seaTextShadow(s.light), { color: s.fgSoft }]}>{label}</Text>
            ) : null}
            {place ? (
              <Text
                style={[styles.stageHeaderPlace, seaTextShadow(s.light), { color: s.fg }]}
                numberOfLines={2}
              >
                {place}
              </Text>
            ) : null}
          </>
        ) : null}
      </View>
      {exit ? (
        <Pressable
          onPress={exit.onPress}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={exit.accessibilityLabel}
          style={({ pressed }) => [styles.stageExit, pressed ? { opacity: 0.7 } : null]}
        >
          <Icon
            name={exit.icon ?? "close"}
            size={16}
            color={C.white}
            strokeWidth={2.2}
          />
          <Text style={styles.stageExitText} numberOfLines={2}>
            {exit.title}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 보기 타일                                                            */
/* ------------------------------------------------------------------ */

export type ShellState = "idle" | "selected" | "right" | "wrong" | "dim";

interface ShellChoiceProps {
  label: string;
  image?: ImageSourcePropType;
  state?: ShellState;
  onPress: () => void;
  disabled?: boolean;
  wide?: boolean;
}

export function ShellChoice({
  label,
  image,
  state = "idle",
  onPress,
  disabled,
  wide,
}: ShellChoiceProps) {
  const [scale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (state === "right" || state === "wrong") {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: state === "right" ? 1.06 : 0.95,
          duration: 130,
          useNativeDriver: true,
        }),
        Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]).start();
    }
  }, [state, scale]);

  // 그림 보기는 늘 흰 바탕 — 그림의 흰 배경과 이어지게. 정답·오답은 테두리, 나머지는 타일째 흐리게.
  let bg: string = C.white;
  let border: string | undefined;
  if (image) {
    if (state === "right") border = C.right;
    else if (state === "wrong") border = C.wrong;
  } else if (state === "right") bg = C.right;
  else if (state === "wrong") bg = C.wrong;
  else if (state === "dim") bg = "rgba(255,255,255,0.55)";
  const fg = state === "right" || state === "wrong" ? C.white : C.ink;
  const imageDim = !!image && state === "dim";

  return (
    <Animated.View
      style={[wide ? styles.shellWide : styles.shell, { transform: [{ scale }] }]}
    >
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled, selected: state === "selected" }}
        android_ripple={{ color: "rgba(0,0,0,0.08)" }}
        style={({ pressed }) => [
          styles.shellInner,
          image ? (wide ? styles.shellInnerImageWide : styles.shellInnerImage) : null,
          { backgroundColor: bg, opacity: imageDim ? 0.6 : pressed ? 0.85 : 1 },
          state === "selected" && styles.shellSelected,
          border ? { borderColor: border } : null,
        ]}
      >
        {image ? (
          <Image
            source={image}
            style={wide ? styles.shellImageWide : styles.shellImage}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Text style={[T.word, { color: fg }]}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* 소리 재생 버튼 — 누르면 음파가 퍼진다                                 */
/* ------------------------------------------------------------------ */

interface SoundButtonProps {
  onPress: () => void;
  playing: boolean;
  caption?: string;
  light?: boolean;
}

export function SoundButton({
  onPress,
  playing,
  caption = "소리 듣기",
  light = false,
}: SoundButtonProps) {
  const { width } = useWindowDimensions();
  const ui = seaScaleForWidth(width);
  const diameter = 88 * ui;
  const iconSize = 38 * ui;
  const [ripple] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!playing) {
      ripple.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(ripple, {
        toValue: 1,
        duration: 1100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [playing, ripple]);

  const rippleScale = ripple.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] });
  const opacity = ripple.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const fg = light ? C.deep : C.white;
  const round = {
    width: diameter,
    height: diameter,
    borderRadius: diameter / 2,
  };

  return (
    <View style={styles.soundWrap}>
      <Animated.View
        style={[
          styles.ripple,
          light && styles.rippleLight,
          round,
          { transform: [{ scale: rippleScale }], opacity },
        ]}
      />
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={caption}
        accessibilityState={{ busy: playing }}
        testID="sound-btn"
        style={[styles.soundBtn, light && styles.soundBtnLight, round]}
        android_ripple={{ color: "rgba(255,255,255,0.2)", borderless: true }}
      >
        {playing ? (
          <Equalizer
            color={fg}
            height={30 * ui}
            barWidth={Math.max(4, 5 * ui)}
            bars={4}
            playing
          />
        ) : (
          <View
            testID="sound-glyph"
            // 나팔 SVG는 박스 한가운데보다 위가 무겁다. 크기 비율로만 내린다.
            style={{ transform: [{ translateY: iconSize * (2.5 / 38) }] }}
          >
            <Icon name="speaker" size={iconSize} color={fg} strokeWidth={1.8} />
          </View>
        )}
      </Pressable>
      <Text
        style={[T.tiny, { marginTop: 8 }, seaTextShadow(light), light && { color: C.inkSoft }]}
      >
        {caption}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 기대 연출 — 정답 공개 직전 작은 점들이 위로 몰린다                      */
/* ------------------------------------------------------------------ */

export function AnticipationOverlay({ visible }: { visible: boolean }) {
  const { width } = useWindowDimensions();
  const [p] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!visible) return;
    p.setValue(0);
    Animated.timing(p, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, p]);

  if (!visible) return null;

  const dots = [0, 1, 2, 3, 4, 5];
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { justifyContent: "center", alignItems: "center" },
      ]}
      pointerEvents="none"
    >
      {dots.map((i) => {
        const translateY = p.interpolate({
          inputRange: [0, 1],
          outputRange: [60 + i * 14, -40 - i * 10],
        });
        const opacity = p.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.6, 0] });
        return (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                left: width / 2 - 60 + i * 24,
                width: 8 + (i % 3) * 4,
                height: 8 + (i % 3) * 4,
                opacity,
                transform: [{ translateY }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 공통 버튼 · 카드                                                     */
/* ------------------------------------------------------------------ */

interface WaveButtonProps {
  title: string;
  onPress: () => void;
  /**
   * `primary` 파란 채움(화면당 하나) · `secondary` 흰 면 + 테두리(카드 안) ·
   * `ghost` 반투명(바다 배경 위). 앱 공용 `ActionButton`의 세 가지와 같은 역할.
   */
  tone?: "primary" | "ghost" | "secondary";
  disabled?: boolean;
  icon?: IconName;
  /** 밝은 장면(수면층) 위의 ghost는 어둡게 그린다. */
  light?: boolean;
  accessibilityLabel?: string;
}

export function WaveButton({
  title,
  onPress,
  tone = "primary",
  disabled,
  icon,
  light = false,
  accessibilityLabel,
}: WaveButtonProps) {
  let bg: string;
  let fg: string;
  let border: string = "transparent";
  if (tone === "primary") {
    bg = C.deep;
    fg = C.white;
  } else if (tone === "secondary") {
    bg = C.white;
    fg = C.ink;
    border = "rgba(8,32,61,0.16)";
  } else if (light) {
    bg = "rgba(8,32,61,0.08)";
    fg = C.ink;
    border = "rgba(8,32,61,0.22)";
  } else {
    bg = "rgba(255,255,255,0.14)";
    fg = C.white;
    border = "rgba(255,255,255,0.38)";
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      android_ripple={{ color: "rgba(0,0,0,0.1)" }}
      style={({ pressed }) => [
        styles.waveBtn,
        { backgroundColor: bg, borderColor: border },
        disabled ? styles.waveBtnDisabled : null,
        pressed && !disabled ? styles.waveBtnPressed : null,
      ]}
    >
      <View style={styles.waveBtnContent}>
        {icon ? <Icon name={icon} size={16} color={fg} strokeWidth={2} /> : null}
        {/*
          `ghost` 는 제 배경이 반투명이라 바다가 그대로 비친다 — 밝은 물 위에서는
          흰 라벨이 묻히므로 글자에 윤곽을 준다. `primary`·`secondary` 는 불투명한
          면을 깔고 있어 대비가 면 색으로 이미 정해진다.
        */}
        <Text
          style={[
            styles.waveBtnText,
            tone === "ghost" ? seaTextShadow(light) : null,
            { color: fg },
          ]}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

export function Card({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** 카드 안에서 쓰는 작은 안내 상자(정보·경고·성공). 이모지 대신 아이콘 하나. */
export function NoteBox({
  kind = "info",
  title,
  children,
}: {
  kind?: "info" | "warning" | "success";
  title?: string;
  children?: React.ReactNode;
}) {
  const palette = {
    info: { bg: "rgba(30,127,192,0.08)", border: "rgba(30,127,192,0.28)", fg: C.mid, icon: "info" as IconName },
    warning: { bg: "rgba(226,96,79,0.1)", border: "rgba(226,96,79,0.4)", fg: C.wrong, icon: "alert" as IconName },
    success: { bg: "rgba(56,192,138,0.12)", border: "rgba(56,192,138,0.45)", fg: "#187D56", icon: "check" as IconName },
  }[kind];
  return (
    <View style={[styles.note, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <View style={styles.noteIcon}>
        <Icon name={palette.icon} size={18} color={palette.fg} strokeWidth={2} />
      </View>
      <View style={styles.noteBody}>
        {title ? <Text style={[T.label, { color: palette.fg }]}>{title}</Text> : null}
        {typeof children === "string" ? <Text style={T.bodySoft}>{children}</Text> : children}
      </View>
    </View>
  );
}

/** 홈 윗줄. 다른 탭 통계 차트와 같은 옅은 파란 면. */
const HEADER_CHIP_BG = Colors.light.accentTint;
const HEADER_CHIP_BORDER = "#C9CED6";

/**
 * 헤더 아이콘 칸 — `WaveButton` ghost와 같은 유리 톤.
 * 홈·결과의 통계 진입용. 공용 `ListeningCheckEntryButton`/`StatsEntryButton`은 건드리지 않는다.
 * `light`는 수면층(밝음) 헤더용으로만 준비. 홈·결과는 지금 `neutral`이라 안 쓴다.
 * `gray`는 홈 윗줄만. 면은 `accentTint`, 아이콘은 남색이다.
 */
export function SeaIconButton({
  icon,
  onPress,
  accessibilityLabel,
  light = false,
  gray = false,
}: {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  light?: boolean;
  gray?: boolean;
}) {
  const bg = gray ? HEADER_CHIP_BG : light ? "rgba(8,32,61,0.08)" : "rgba(255,255,255,0.14)";
  const fg = gray || light ? C.ink : C.white;
  const border = gray ? HEADER_CHIP_BORDER : light ? "rgba(8,32,61,0.22)" : "rgba(255,255,255,0.38)";
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID="sea-icon-btn"
      android_ripple={{ color: "rgba(0,0,0,0.1)" }}
      style={({ pressed }) => [
        styles.iconBtn,
        { backgroundColor: bg, borderColor: border },
        pressed ? { opacity: 0.7 } : null,
      ]}
    >
      <Icon name={icon} size={28} color={fg} strokeWidth={2} />
    </Pressable>
  );
}

/** 헤더 왼쪽 「돌아가기」·오른쪽 작은 동작용 텍스트 버튼(바다 배경 위). */
export function SeaTextButton({
  title,
  onPress,
  icon,
  iconRight,
  light = false,
  gray = false,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  iconRight?: IconName;
  light?: boolean;
  /** 홈 윗줄. `SeaIconButton`의 `gray`와 같은 면. */
  gray?: boolean;
  accessibilityLabel?: string;
}) {
  const fg = gray || light ? C.ink : C.white;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }) => [
        styles.textBtn,
        light ? styles.textBtnLight : null,
        gray ? styles.textBtnGray : null,
        pressed ? { opacity: 0.7 } : null,
      ]}
    >
      {icon ? <Icon name={icon} size={16} color={fg} strokeWidth={2} /> : null}
      <Text style={[styles.textBtnLabel, seaTextShadow(light || gray), { color: fg }]}>{title}</Text>
      {iconRight ? <Icon name={iconRight} size={16} color={fg} strokeWidth={2} /> : null}
    </Pressable>
  );
}

/** 히어로 아이콘 — 반투명 원 안의 선 아이콘. 이모지 마스코트를 대신한다. */
export function HeroMark({
  icon,
  size = 72,
  light = false,
}: {
  icon: IconName;
  size?: number;
  light?: boolean;
}) {
  return (
    <View
      style={[
        styles.heroMark,
        light ? styles.heroMarkLight : null,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Icon name={icon} size={size * 0.5} color={light ? C.deep : C.white} strokeWidth={1.6} />
    </View>
  );
}

/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { width: "100%", maxWidth: MaxContentWidth, alignSelf: "center" },
  dot: {
    position: "absolute",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  bubble: {
    position: "absolute",
    borderWidth: 1,
  },
  gaugeWrap: { alignItems: "center", gap: 6 },
  gaugeTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  gaugeTrackLight: {
    backgroundColor: "rgba(8,32,61,0.12)",
  },
  gaugeFill: { height: "100%", backgroundColor: C.gold, borderRadius: 4 },
  stageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stageHeaderTitle: { flex: 1, minWidth: 0 },
  // 세션창은 듣기 버튼이 주인공이라 헤더는 단계·장소만 얇게.
  stageHeaderPlace: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  stageExit: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  stageExitText: {
    color: C.white,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    flexShrink: 1,
  },
  shell: { width: "47%" },
  shellWide: { width: "100%" },
  shellInner: {
    minHeight: 76,
    borderRadius: S.radiusShell,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  shellSelected: {
    borderColor: C.deep,
  },
  // 정답·오답 테두리 두께를 늘 잡아 둬서 상태가 바뀌어도 타일이 들썩이지 않는다
  shellInnerImage: {
    minHeight: 110,
    paddingVertical: 8,
    borderWidth: 5,
  },
  shellInnerImageWide: {
    minHeight: 130,
    paddingVertical: 10,
    borderWidth: 5,
  },
  shellImage: {
    width: 88,
    height: 88,
  },
  shellImageWide: {
    width: 104,
    height: 104,
  },
  soundWrap: { alignItems: "center", justifyContent: "center" },
  ripple: {
    position: "absolute",
    top: 0,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  rippleLight: {
    backgroundColor: "rgba(20,73,138,0.25)",
  },
  soundBtn: {
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.55)",
  },
  soundBtnLight: {
    backgroundColor: "rgba(255,255,255,0.55)",
    borderColor: "rgba(20,73,138,0.35)",
  },
  waveBtn: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: S.radiusButton,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  waveBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  waveBtnText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  waveBtnDisabled: { opacity: 0.4 },
  waveBtnPressed: { transform: [{ scale: 0.97 }] },
  iconBtn: {
    width: 60,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: S.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(8,32,61,0.08)",
  },
  note: {
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  noteIcon: { paddingTop: 1 },
  noteBody: { flex: 1, gap: 2 },
  textBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 40,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  textBtnLight: {
    backgroundColor: "rgba(8,32,61,0.08)",
  },
  textBtnGray: {
    backgroundColor: HEADER_CHIP_BG,
    borderWidth: 1,
    borderColor: HEADER_CHIP_BORDER,
  },
  textBtnLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  heroMark: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  heroMarkLight: {
    backgroundColor: "rgba(255,255,255,0.5)",
    borderColor: "rgba(20,73,138,0.3)",
  },
});
