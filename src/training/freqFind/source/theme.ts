// theme.ts
// 바다 테마 토큰.
// 대역 → 수심 매핑은 UI 상의 표현 규칙이며, 청각 이론이 아니라 화면 구성용 약속이다.
//   고대역(3,350~7,000Hz) → 수면층 (밝음)
//   중대역(600~3,350Hz)   → 중층
//   저대역(≤500Hz)        → 심해층 (어두움)
//
// 글자 크기는 앱 공용 규칙(`themed-text.tsx`)을 따른다 — **14px 미만 금지**
// (고령·난청 사용자 가독성 하한). 화면에서 `fontSize`를 그 아래로 줄이지 말 것.

import { TextStyle } from "react-native";

import { type FishKey } from "./sceneAssets";

export const C = {
  // 바다 (위 → 아래)
  sky: "#BFF0FF",
  surface: "#7FD8F7",
  shallow: "#3FB6E8",
  mid: "#1E7FC0",
  deep: "#14498A",
  abyss: "#0A2342",

  sand: "#F3E5C0",
  coral: "#FF8A76",
  /** 장비 점검 등 선택 칩의 밝은 면. */
  cream: "#FFF8EA",
  seaweed: "#3FBF8B",
  gold: "#FFCE5C",

  ink: "#08203D",
  inkSoft: "#2C5378",
  white: "#FFFFFF",
  wrong: "#E2604F",
  right: "#38C08A",
} as const;

export const S = {
  gap: 12,
  pad: 20,
  /** 카드·타일 모서리. 앱 공용 `Radius.large`(20)와 맞춘다. */
  radius: 18,
  /** 버튼 모서리. 앱 공용 `Radius.medium`. */
  radiusButton: 14,
  radiusShell: 18,
} as const;

/**
 * 글자 스타일. 크기·굵기는 앱 공용 `ThemedText` 타입과 1:1로 맞췄다.
 *   title  = screenTitle(23/30·700)   sub = small(14/20)   body = default(16/24)
 *   word   = 보기 글자(22/28·700)      tiny = caption(14/20) — 이름은 남기고 크기만 14로 올렸다
 */
export const T: Record<string, TextStyle> = {
  title: { fontSize: 23, lineHeight: 30, fontWeight: "700", color: C.white, letterSpacing: -0.2 },
  sub: { fontSize: 14, lineHeight: 20, fontWeight: "500", color: "rgba(255,255,255,0.86)" },
  word: { fontSize: 22, lineHeight: 28, fontWeight: "700", color: C.ink },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "500", color: C.ink },
  bodySoft: { fontSize: 14, lineHeight: 20, fontWeight: "500", color: C.inkSoft },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "700", color: C.ink },
  tiny: { fontSize: 14, lineHeight: 20, fontWeight: "500", color: "rgba(255,255,255,0.8)" },
};

/**
 * 카드 없이 바다 배경 위에 바로 놓이는 글자의 그림자.
 *
 * 어두운 장면(중층·심해층·기본 바다)은 그라데이션 **위쪽**이 밝아 흰 글씨가 묻힌다.
 * 중층 맨 위 `#3FB6E8` 대 흰색은 2.3:1, 기본 바다 `#4FBDEA` 는 2.1:1로 AA(4.5:1)에
 * 한참 못 미쳤다. 배경을 눌러 주는 것은 `SeaBackground` 의 헤더 그늘이 맡고,
 * 이 그림자는 그 아래(가운데·바닥)까지 글자 윤곽을 세운다.
 * 떠다니는 이모지에 이미 같은 방식을 쓰고 있다(`Sea.tsx` `Fish`).
 *
 * 밝은 장면(수면층)은 어두운 글씨(`C.ink`, 12:1)라 그림자를 주지 않는다 —
 * 어두운 글씨 밑의 어두운 그림자는 번져 보이기만 한다.
 */
export const SEA_TEXT_SHADOW: TextStyle = {
  textShadowColor: "rgba(3,16,38,0.6)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
};

/** 장면의 `light` 를 그대로 넘기면 된다. 밝은 장면에서는 그림자가 붙지 않는다. */
export const seaTextShadow = (light?: boolean): TextStyle | null =>
  light ? null : SEA_TEXT_SHADOW;

export type SceneKey = "high" | "mid" | "low" | "neutral";

export interface SceneConfig {
  name: string;
  depth: string;
  /**
   * 위 → 아래 그라데이션 정지점. 경계가 보이지 않도록 5단으로 잇는다.
   * `colors[2]`가 그 장면의 대표색(기존 3색 띠의 가운데 색과 같은 역할).
   */
  colors: readonly [string, string, string, string, string];
  /** 배경이 밝아 흰 글씨가 안 읽히는 장면(수면층). 글자·유령 버튼을 어둡게 그린다. */
  light: boolean;
  /**
   * 이 깊이를 떠다니는 객체. 실제로 그 수심에 사는 것만 넣는다.
   * 예전에는 수면에 상어가, 중층에 게·거북·새우가 있었다(2026-09-14 종류 정리).
   */
  fish: readonly FishKey[];
  /** 이 배경 위의 글자색. */
  fg: string;
  fgSoft: string;
  accent: string;
}

// 대역별 화면 표현
export const SCENE: Record<SceneKey, SceneConfig> = {
  high: {
    name: "수면층",
    depth: "수심 5m",
    colors: ["#A9E8FA", "#6FCDF2", "#3FB6E8", "#2694D0", "#1E7FC0"],
    light: true,
    fish: ["tropicalFish", "grayFish", "dolphin"],
    fg: C.ink,
    fgSoft: C.inkSoft,
    accent: C.gold,
  },
  mid: {
    name: "중층",
    depth: "수심 40m",
    colors: ["#3FB6E8", "#2A98D2", "#1E7FC0", "#1861A3", "#14498A"],
    light: false,
    fish: ["grayFish", "blow", "tropicalFish"],
    fg: C.white,
    fgSoft: "rgba(255,255,255,0.86)",
    accent: C.coral,
  },
  low: {
    name: "심해층",
    depth: "수심 120m",
    colors: ["#1E7FC0", "#17609F", "#14498A", "#0E3566", "#0A2342"],
    light: false,
    fish: ["squid", "shark", "octopus"],
    fg: C.white,
    fgSoft: "rgba(255,255,255,0.86)",
    accent: C.seaweed,
  },
  // 대역이 정해지지 않은 화면(홈/결과)에서 쓰는 기본 바다
  neutral: {
    name: "바다",
    depth: "",
    colors: ["#4FBDEA", "#2A98D2", "#1B6DB0", "#14498A", "#0A2342"],
    light: false,
    fish: ["tropicalFish", "grayFish", "seaTurtle"],
    fg: C.white,
    fgSoft: "rgba(255,255,255,0.86)",
    accent: C.gold,
  },
};
