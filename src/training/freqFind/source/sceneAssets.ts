// sceneAssets.ts — 수면·중층·심해 장면. 홈 안내와 결과 수심 지도에서 같이 쓴다.
import { ImageSourcePropType } from "react-native";

import { type BandKey } from "./words";

export const DEPTH_SCENES: Record<BandKey, ImageSourcePropType> = {
  high: require("../../../../assets/freq/depth/high.webp"),
  mid: require("../../../../assets/freq/depth/mid.webp"),
  low: require("../../../../assets/freq/depth/low.webp"),
};

/** 수심 장면 가로÷세로. 파일 픽셀: high 1024×608, mid 1024×604, low 1024×609. 층 높이를 맞춰 여백 없이 채운다. */
export const DEPTH_SCENE_ASPECT: Record<BandKey, number> = {
  high: 1024 / 608,
  mid: 1024 / 604,
  low: 1024 / 609,
};

/** 층마다 cover로 보여줄 구역(scale·translate). */
export const DEPTH_SCENE_FOCUS: Record<BandKey, { scale: number; x: number; y: number }> = {
  high: { scale: 1.15, x: 0, y: -12 },
  mid: { scale: 1.1, x: -8, y: -3 },
  low: { scale: 1.2, x: 0, y: -20 },
};

/** 떠다니는 물고기. 원본 긴 변 256, 비율 256×140. */
export const FISH_ASPECT = 256 / 140;

export const FISH = {
  tropicalFish: require("../../../../assets/freq/fish/tropicalFish.webp"),
  grayFish: require("../../../../assets/freq/fish/grayFish.webp"),
  dolphin: require("../../../../assets/freq/fish/dolphin.webp"),
  blow: require("../../../../assets/freq/fish/blow.webp"),
  squid: require("../../../../assets/freq/fish/squid.webp"),
  shark: require("../../../../assets/freq/fish/shark.webp"),
  octopus: require("../../../../assets/freq/fish/octopus.webp"),
  seaTurtle: require("../../../../assets/freq/fish/seaTurtle.webp"),
} as const;

export type FishKey = keyof typeof FISH;
