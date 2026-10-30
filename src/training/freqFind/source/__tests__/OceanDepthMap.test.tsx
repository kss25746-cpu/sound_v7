import React from "react";
import { StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";

import OceanDepthMap, { DEPTH_LAYER_GAP, DEPTH_LAYER_TEXT } from "../OceanDepthMap";
import { DEPTH_SCENE_ASPECT, DEPTH_SCENE_FOCUS } from "../sceneAssets";
import { C, SCENE } from "../theme";
import { FINAL_LABEL, type SummaryResult } from "../testEngine";

const summary: SummaryResult = {
  high: {
    tone: { heard: 3, total: 3, status: "ok" },
    screen: { correct: 5, total: 5, status: "pass" },
    fine: null,
    versus: null,
    final: "pass",
  },
  mid: {
    tone: { heard: 3, total: 3, status: "ok" },
    screen: { correct: 5, total: 5, status: "pass" },
    fine: null,
    versus: null,
    final: "pass",
  },
  low: {
    tone: { heard: 1, total: 3, status: "weak" },
    screen: { correct: 2, total: 5, status: "weak" },
    fine: null,
    versus: null,
    final: "weak",
  },
};

describe("OceanDepthMap - 수심 장면", () => {
  it("세 층 모두 장면 이미지를 깔고 이름은 수면·중층·심해 순이다", () => {
    const { getByTestId, getByText, getAllByText, queryByText } = render(<OceanDepthMap summary={summary} />);

    expect(getByTestId("depth-scene-high")).toBeTruthy();
    expect(getByTestId("depth-scene-mid")).toBeTruthy();
    expect(getByTestId("depth-scene-low")).toBeTruthy();
    expect(getByText("수면층")).toBeTruthy();
    expect(getByText("중층")).toBeTruthy();
    expect(getByText("심해층")).toBeTruthy();
    expect(getByText("잘 들린 층은 또렷, 아니면 흐릿")).toBeTruthy();
    expect(queryByText("바다 수심 청각 지도")).toBeNull();
    expect(queryByText("순음")).toBeNull();
    expect(queryByText("스크리닝")).toBeNull();
    expect(queryByText("정밀")).toBeNull();
    expect(queryByText("대립쌍")).toBeNull();
    expect(queryByText("이 깊이는 흐릿해요")).toBeNull();
    expect(queryByText("이 깊이는 또렷하게 들렸어요")).toBeNull();
    expect(getByTestId("depth-layer-high").props.accessibilityLabel).toMatch(FINAL_LABEL.pass);
    expect(getByTestId("depth-layer-mid").props.accessibilityLabel).toMatch(FINAL_LABEL.pass);
    expect(getByTestId("depth-layer-low").props.accessibilityLabel).toMatch(FINAL_LABEL.weak);
    expect(getAllByText(FINAL_LABEL.pass).length).toBe(5);
    expect(getAllByText(FINAL_LABEL.weak).length).toBe(3);
  });

  it("층 높이는 장면 비율이고 장면은 cover와 포커스 오프셋으로 채운다", () => {
    const { getByTestId } = render(<OceanDepthMap summary={summary} />);

    for (const band of ["high", "mid", "low"] as const) {
      expect(getByTestId(`depth-layer-${band}`).props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ aspectRatio: DEPTH_SCENE_ASPECT[band] })])
      );
      const focus = DEPTH_SCENE_FOCUS[band];
      const scene = getByTestId(`depth-scene-${band}`);
      expect(scene.props.resizeMode).toBe("cover");
      expect(scene.props.resizeMode).not.toBe("stretch");
      expect(StyleSheet.flatten(scene.props.style)).toEqual(
        expect.objectContaining({
          position: "absolute",
          top: 0,
          left: 0,
          width: `${focus.scale * 100}%`,
          height: `${focus.scale * 100}%`,
          transform: [{ translateX: focus.x }, { translateY: focus.y }],
        })
      );
    }
  });

  it("세 층 배경은 또렷과 같은 대표 바다색이다", () => {
    const { getByTestId } = render(<OceanDepthMap summary={summary} />);

    for (const band of ["high", "mid", "low"] as const) {
      expect(getByTestId(`depth-layer-${band}`).props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: SCENE[band].colors[2] })])
      );
    }
  });

  it("글자 영역에 흐릿 반투명 판이 없다", () => {
    const { getByTestId } = render(<OceanDepthMap summary={summary} />);

    for (const band of ["high", "mid", "low"] as const) {
      expect(StyleSheet.flatten(getByTestId(`depth-content-${band}`).props.style).backgroundColor).toBeUndefined();
    }
  });

  it("세 층 모두 밝은 장면을 쓰고 안개는 없다", () => {
    const { getAllByTestId, queryByTestId } = render(<OceanDepthMap summary={summary} />);

    expect(getAllByTestId("depth-clear")).toHaveLength(3);
    expect(queryByTestId("depth-fog")).toBeNull();
  });

  it("눈금 세 구간은 카드와 같은 간격이고 층마다 또렷·흐릿만 알린다", () => {
    const { getByTestId, getByText, queryByText } = render(
      <OceanDepthMap summary={summary} />
    );

    expect(StyleSheet.flatten(getByTestId("depth-ruler").props.style)).toEqual(
      expect.objectContaining({ gap: DEPTH_LAYER_GAP })
    );
    expect(StyleSheet.flatten(getByTestId("depth-layers").props.style)).toEqual(
      expect.objectContaining({ gap: DEPTH_LAYER_GAP })
    );
    for (const band of ["high", "mid", "low"] as const) {
      expect(StyleSheet.flatten(getByTestId(`depth-ruler-${band}`).props.style)).toEqual(
        expect.objectContaining({ flex: 1 })
      );
      expect(getByTestId(`depth-ruler-ping-${band}`)).toBeTruthy();
      expect(StyleSheet.flatten(getByTestId(`depth-ruler-line-${band}`).props.style)).toEqual(
        expect.objectContaining({ backgroundColor: C.white })
      );
    }
    expect(getByTestId("depth-ruler-high").props.accessibilityLabel).toBe("수면층 수심 5m 층 결론 또렷");
    expect(getByTestId("depth-ruler-mid").props.accessibilityLabel).toBe("중층 수심 40m 층 결론 또렷");
    expect(getByTestId("depth-ruler-low").props.accessibilityLabel).toBe("심해층 수심 120m 층 결론 흐릿");
    expect(getByTestId("depth-ruler-status-high").props.children).toBe(FINAL_LABEL.pass);
    expect(getByTestId("depth-ruler-status-mid").props.children).toBe(FINAL_LABEL.pass);
    expect(getByTestId("depth-ruler-status-low").props.children).toBe(FINAL_LABEL.weak);
    expect(StyleSheet.flatten(getByTestId("depth-ruler-status-high").props.style)).toEqual(
      expect.objectContaining({ color: C.right, fontSize: 14 })
    );
    expect(StyleSheet.flatten(getByTestId("depth-ruler-status-low").props.style)).toEqual(
      expect.objectContaining({ color: C.wrong, fontSize: 14 })
    );
    expect(StyleSheet.flatten(getByTestId("depth-ruler-ping-high").props.style).backgroundColor).toBe(C.right);
    expect(StyleSheet.flatten(getByTestId("depth-ruler-ping-low").props.style).backgroundColor).toBe(C.wrong);
    expect(getByText("0m")).toBeTruthy();
    expect(getByText("5m")).toBeTruthy();
    expect(getByText("40m")).toBeTruthy();
    expect(getByText("120m")).toBeTruthy();
    expect(queryByText("순음")).toBeNull();
    expect(queryByText("스크리닝")).toBeNull();
    expect(queryByText("정밀")).toBeNull();
    expect(queryByText(/\/5/)).toBeNull();
  });

  it("오버레이 글씨는 수면 ink, 중층·심해 흰색이다", () => {
    const { getByText, getAllByText } = render(<OceanDepthMap summary={summary} />);
    const high = DEPTH_LAYER_TEXT.high;
    const mid = DEPTH_LAYER_TEXT.mid;
    const low = DEPTH_LAYER_TEXT.low;

    expect(mid.fg).toBe(low.fg);
    expect(StyleSheet.flatten(getByText("수면층").props.style).color).toBe(high.fg);
    expect(StyleSheet.flatten(getByText("중층").props.style).color).toBe(mid.fg);
    expect(StyleSheet.flatten(getByText("심해층").props.style).color).toBe(low.fg);
    expect(StyleSheet.flatten(getByText("(3,350 ~ 7,000 Hz)").props.style).color).toBe(high.fgSoft);
    expect(StyleSheet.flatten(getByText("(600 ~ 3,350 Hz)").props.style).color).toBe(mid.fgSoft);
    expect(StyleSheet.flatten(getByText("(≤ 500 Hz)").props.style).color).toBe(low.fgSoft);
    const labels = getAllByText("대표 자음");
    expect(StyleSheet.flatten(labels[0].props.style).color).toBe(high.fg);
    expect(StyleSheet.flatten(labels[1].props.style).color).toBe(mid.fg);
    expect(StyleSheet.flatten(labels[2].props.style).color).toBe(low.fg);
    expect(StyleSheet.flatten(getByText("ㄷ").props.style).color).toBe(high.chipFg);
    expect(StyleSheet.flatten(getByText("ㄱ").props.style).color).toBe(mid.chipFg);
    expect(StyleSheet.flatten(getByText("ㄴ").props.style).color).toBe(low.chipFg);
  });
});
