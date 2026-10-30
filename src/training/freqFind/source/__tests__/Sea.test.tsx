import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import { AccessibilityInfo, Dimensions, StatusBar, Text } from "react-native";

import {
  BubbleField,
  FishField,
  fishPoseAt,
  SeaBackground,
  SeaIconButton,
  SoundButton,
  StageHeader,
  seaScaleForWidth,
} from "../Sea";
import { Colors } from "@/constants/theme";
import { C } from "../theme";
import { SCENE } from "../theme";
import { FISH_ASPECT } from "../sceneAssets";

/**
 * 회귀: 2026-09-14 UI 정돈에서 「이모지 아이콘을 걷어낸다」는 결정을 배경 장식까지
 * 넓게 적용해, 떠다니는 이모지 물고기와 거품이 통째로 사라졌다. 둘 다 배경 연출이므로
 * 그 결정의 대상이 아니었다. 다시 조용히 사라지지 않도록 존재를 못 박아 둔다.
 */
describe("SeaBackground - 떠다니는 거품과 물고기", () => {
  it("기본 배경에는 거품층과 물고기층이 모두 있다", () => {
    const { getByTestId } = render(
      <SeaBackground>
        <Text>내용</Text>
      </SeaBackground>
    );

    expect(getByTestId("sea-bubbles")).toBeTruthy();
    expect(getByTestId("sea-fish")).toBeTruthy();
  });

  it("장면마다 그 수심에 맞는 물고기가 실제로 그려진다", () => {
    const { getByTestId } = render(<SeaBackground scene="low" />);

    for (const kind of SCENE.low.fish) {
      expect(getByTestId(`sea-fish-${kind}`, { includeHiddenElements: true })).toBeTruthy();
    }
  });

  it("showDrift를 끄면(4단계 대립쌍) 거품도 물고기도 움직이지 않는다", () => {
    const { queryByTestId } = render(<SeaBackground scene="mid" showDrift={false} />);

    expect(queryByTestId("sea-bubbles")).toBeNull();
    expect(queryByTestId("sea-fish")).toBeNull();
  });

  it("showFish만 끄면 거품은 두고 물고기만 뺀다", () => {
    const { getByTestId, queryByTestId } = render(
      <SeaBackground scene="neutral" showFish={false} />
    );

    expect(getByTestId("sea-bubbles")).toBeTruthy();
    expect(queryByTestId("sea-fish")).toBeNull();
  });

  it("수면층은 상태바 아이콘을 검게, 어두운 바다는 하얗게 한다", () => {
    const light = render(<SeaBackground scene="high" />);
    expect(light.UNSAFE_getByType(StatusBar).props.barStyle).toBe("dark-content");

    const dark = render(<SeaBackground scene="low" />);
    expect(dark.UNSAFE_getByType(StatusBar).props.barStyle).toBe("light-content");
  });

  it("떠다니는 물고기는 스크린리더가 읽지 않는다", () => {
    const { getByTestId } = render(<SeaBackground scene="neutral" />);

    const fish = getByTestId(`sea-fish-${SCENE.neutral.fish[0]}`, {
      includeHiddenElements: true,
    });

    expect(fish.props.accessibilityElementsHidden).toBe(true);
    expect(fish.props.importantForAccessibility).toBe("no-hide-descendants");
  });
});

describe("StageHeader - 단계 공용 헤더", () => {
  it("제목과 나가기를 한 행에 두고 절대 위치로 띄우지 않는다", () => {
    const onPress = jest.fn();
    const { getByText, getByTestId } = render(
      <StageHeader
        scene="mid"
        label="3단계 · 깊이 들어가기"
        place="중층"
        exit={{
          title: "결과로 돌아가기",
          accessibilityLabel: "결과로 돌아가기",
          icon: "chevronLeft",
          onPress,
        }}
      />
    );

    expect(getByText("3단계 · 깊이 들어가기")).toBeTruthy();
    expect(getByText("중층")).toBeTruthy();
    expect(getByText("결과로 돌아가기")).toBeTruthy();
    expect(getByTestId("stage-header").props.style.position).not.toBe("absolute");
    expect(getByTestId("stage-header").props.style.gap).toBe(8);

    fireEvent.press(getByText("결과로 돌아가기"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("나가기만 있어도 절대 위치로 띄우지 않는다", () => {
    const { getByLabelText, getByTestId } = render(
      <StageHeader
        exit={{
          title: "중단",
          accessibilityLabel: "측정 중단하고 메인으로 가기",
          onPress: jest.fn(),
        }}
      />
    );

    expect(getByTestId("stage-header").props.style.position).not.toBe("absolute");
    expect(getByLabelText("측정 중단하고 메인으로 가기")).toBeTruthy();
  });
});

describe("SCENE.fish - 수심에 맞는 종류", () => {
  it("모든 장면이 떠다닐 객체를 최소 두 종류 가진다", () => {
    for (const key of Object.keys(SCENE) as (keyof typeof SCENE)[]) {
      expect(SCENE[key].fish.length).toBeGreaterThanOrEqual(2);
    }
  });

  /**
   * 예전 구성은 수면층(수심 5m)에 상어, 중층·심해층에 게·새우·거북이 떠다녔다.
   * 바닥을 기는 것과 숨 쉬러 올라오는 거북은 중층·심해를 가로지르지 않는다.
   */
  it("수면·중층·심해·기본 바다의 종류가 합의와 같다", () => {
    expect(SCENE.high.fish).toEqual(["tropicalFish", "grayFish", "dolphin"]);
    expect(SCENE.mid.fish).toEqual(["grayFish", "blow", "tropicalFish"]);
    expect(SCENE.low.fish).toEqual(["squid", "shark", "octopus"]);
    expect(SCENE.neutral.fish).toEqual(["tropicalFish", "grayFish", "seaTurtle"]);
  });
});

describe("FishField - 시드 배치", () => {
  const layoutOf = (seed: number) => {
    const { getByTestId, unmount } = render(
      <FishField fishes={SCENE.low.fish} seed={seed} />
    );
    const layout = Object.fromEntries(
      SCENE.low.fish.map((kind) => {
        const node = getByTestId(`sea-fish-${kind}`, { includeHiddenElements: true });
        const flip = node.props.style.transform.find(
          (t: { scaleX?: number }) => t.scaleX !== undefined
        );
        return [kind, { top: node.props.style.top, scaleX: flip?.scaleX }];
      })
    );
    unmount();
    return layout;
  };

  it("같은 시드는 같은 배치, 다른 시드는 다른 배치", () => {
    expect(layoutOf(1)).toEqual(layoutOf(1));
    expect(layoutOf(1)).not.toEqual(layoutOf(99));
  });

  it("시드를 섞어도 수심 풀의 종류는 모두 있다", () => {
    const { getByTestId } = render(<FishField fishes={SCENE.low.fish} seed={7} />);
    for (const kind of SCENE.low.fish) {
      expect(getByTestId(`sea-fish-${kind}`, { includeHiddenElements: true })).toBeTruthy();
    }
  });

  it("높이는 폰 기준 2배(44)에 너비 스케일을 곱한 값 이상이다", () => {
    const { getByTestId } = render(<FishField fishes={SCENE.low.fish} seed={1} />);
    const minH = 44 * seaScaleForWidth(Dimensions.get("window").width);
    for (const kind of SCENE.low.fish) {
      const node = getByTestId(`sea-fish-${kind}`, { includeHiddenElements: true });
      expect(node.props.style.height).toBeGreaterThanOrEqual(minH);
      expect(node.props.style.width).toBeCloseTo(node.props.style.height * FISH_ASPECT);
    }
  });
});

describe("seaScaleForWidth", () => {
  it("360에서 1이고 분기는 없으며 560에서 상한이다", () => {
    expect(seaScaleForWidth(360)).toBe(1);
    expect(seaScaleForWidth(180)).toBe(0.9);
    expect(seaScaleForWidth(560)).toBeCloseTo(560 / 360);
    expect(seaScaleForWidth(1200)).toBeCloseTo(560 / 360);
  });
});

describe("SeaIconButton", () => {
  const flatten = (style: unknown) =>
    Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;

  it("어두운 바다는 ghost와 같은 반투명 흰 면·흰 테두리고, 라벨·콜백이 산다", () => {
    const onPress = jest.fn();
    const { getByLabelText, getByTestId } = render(
      <SeaIconButton icon="headphones" onPress={onPress} accessibilityLabel="장비 점검" />
    );

    const btn = flatten(getByTestId("sea-icon-btn").props.style) as {
      backgroundColor: string;
      borderColor: string;
      width: number;
      height: number;
    };
    expect(btn.backgroundColor).toBe("rgba(255,255,255,0.14)");
    expect(btn.borderColor).toBe("rgba(255,255,255,0.38)");
    expect(btn.width).toBe(60);
    expect(btn.height).toBe(40);
    expect(getByLabelText("장비 점검")).toBeTruthy();

    fireEvent.press(getByLabelText("장비 점검"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("light면 어두운 반투명으로 그린다", () => {
    const { getByTestId } = render(
      <SeaIconButton icon="chart" onPress={jest.fn()} accessibilityLabel="통계" light />
    );
    const btn = flatten(getByTestId("sea-icon-btn").props.style) as {
      backgroundColor: string;
      borderColor: string;
    };
    expect(btn.backgroundColor).toBe("rgba(8,32,61,0.08)");
    expect(btn.borderColor).toBe("rgba(8,32,61,0.22)");
    expect(getByTestId("sea-icon-btn").findByProps({ color: C.ink })).toBeTruthy();
  });

  it("gray면 accentTint 면과 남색 아이콘이다", () => {
    const { getByTestId } = render(
      <SeaIconButton icon="chart" onPress={jest.fn()} accessibilityLabel="통계" gray />
    );
    const btn = flatten(getByTestId("sea-icon-btn").props.style) as {
      backgroundColor: string;
      borderColor: string;
    };
    expect(btn.backgroundColor).toBe(Colors.light.accentTint);
    expect(btn.borderColor).toBe("#C9CED6");
    expect(getByTestId("sea-icon-btn").findByProps({ color: C.ink })).toBeTruthy();
  });
});

describe("SoundButton", () => {
  const flatten = (style: unknown) =>
    Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;

  it("원 크기는 폰 88에 너비 스케일을 곱하고, 스피커는 아래로 보정한다", () => {
    const { getByTestId, getByLabelText } = render(
      <SoundButton onPress={() => undefined} playing={false} />
    );
    const ui = seaScaleForWidth(Dimensions.get("window").width);
    const btn = flatten(getByTestId("sound-btn").props.style) as { width: number };
    expect(btn.width).toBeCloseTo(88 * ui);
    const glyph = flatten(getByTestId("sound-glyph").props.style) as {
      transform: { translateY: number }[];
    };
    expect(glyph.transform[0]?.translateY).toBeCloseTo(38 * ui * (2.5 / 38));
    expect(getByLabelText("소리 듣기")).toBeTruthy();
  });
});

/*
  `Animated` 값은 테스트 렌더러에서 숫자·문자열로 풀려 나온다. 별도 구독 없이
  마운트 시점의 자세를 그대로 읽으면 된다.
*/
type Pose = { translateX: number; translateY: number; rotate: string; scaleX: number };

const poseOf = (node: { props: { style: { transform: object[] } } }): Pose =>
  Object.assign({}, ...node.props.style.transform) as Pose;

const fishNodes = (getByTestId: (id: string, o: object) => unknown) =>
  SCENE.low.fish.map((kind) => ({
    kind,
    node: getByTestId(`sea-fish-${kind}`, { includeHiddenElements: true }) as {
      props: { style: { height: number; transform: object[] } };
    },
  }));

describe("Fish - 유영", () => {
  /**
   * 2026-09-15 이전에는 `translateX`/`translateY`뿐이었다. 오르내려도 코가 늘 수평이라
   * 「미끄러지는 스티커」로 읽혔다. 회전이 다시 빠지지 않게 못 박는다.
   */
  it("오르내리는 방향으로 코를 든다", () => {
    const { getByTestId } = render(<FishField fishes={SCENE.low.fish} seed={3} />);

    for (const { node } of fishNodes(getByTestId)) {
      const { rotate } = poseOf(node);
      expect(rotate.endsWith("deg")).toBe(true);
      // 기울기는 물결이 가장 가파른 곳의 각을 넘지 않는다. 배경 장식이 기울어 눕지 않게.
      expect(Math.abs(parseFloat(rotate))).toBeGreaterThan(0);
      expect(Math.abs(parseFloat(rotate))).toBeLessThanOrEqual(9);
    }
  });
});

/**
 * 안드로이드 설정 → 접근성 → 「애니메이션 제거」. 그전까지 `Equalizer`만 대응하고
 * 배경 장식은 대응이 없었다. 움직임을 키우는 이번 손질과 함께 메웠다.
 * 숨기지 않고 **멈춰 세운다** — 움직임만 빼면 되지, 그림이 사라지면 구성이 달라진다.
 */
describe("배경 장식 - 애니메이션 제거", () => {
  const withReduceMotion = async (ui: React.ReactElement) => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const view = render(ui);
    await act(async () => undefined);
    return view;
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("물고기는 사라지지 않고 화면 안에 멈춰 선다", async () => {
    const width = Dimensions.get("window").width;

    // 움직일 때는 위상 0 — 아직 화면 밖에서 들어오기를 기다린다.
    const moving = render(<FishField fishes={SCENE.low.fish} seed={5} />);
    for (const { node } of fishNodes(moving.getByTestId)) {
      const x = poseOf(node).translateX;
      expect(x < 0 || x > width).toBe(true);
    }
    moving.unmount();

    const still = await withReduceMotion(<FishField fishes={SCENE.low.fish} seed={5} />);
    for (const { node } of fishNodes(still.getByTestId)) {
      const x = poseOf(node).translateX;
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(width);
    }
  });

  it("거품은 투명해진 채로 멈추지 않는다", async () => {
    const { getAllByTestId } = await withReduceMotion(<BubbleField />);
    const opacities = getAllByTestId("sea-bubble").map(
      (node) => (node.props.style as { opacity: number }).opacity
    );

    expect(opacities.length).toBeGreaterThan(0);
    for (const o of opacities) {
      expect(o).toBeGreaterThan(0);
    }
  });
});

describe("fishPoseAt - 물결", () => {
  const sweep = (size: number) =>
    Array.from({ length: 201 }, (_, i) => fishPoseAt(size, i / 200));

  /**
   * 예전 세로 진폭은 몸 크기와 무관한 고정 10px이었다. 16~28초에 500dp를 가는 동안의
   * 10px이라 기울기가 없어 직선으로 읽혔다. 상수로 되돌아가지 않게 한다.
   */
  it("오르내리는 폭이 몸 높이에 비례한다", () => {
    const ampOf = (size: number) => Math.max(...sweep(size).map((q) => Math.abs(q.y)));

    expect(ampOf(60)).toBeCloseTo(60 * 0.45);
    expect(ampOf(120)).toBeCloseTo(2 * ampOf(60));
    // 예전 고정값보다 확실히 크다 — 작은 개체(44)에서도.
    expect(ampOf(44)).toBeGreaterThan(10);
  });

  it("코는 오르내림이 가장 가파른 곳에서 가장 많이 들고, 그 각을 넘지 않는다", () => {
    const poses = sweep(60);
    for (const { deg } of poses) {
      expect(Math.abs(deg)).toBeLessThanOrEqual(9 + 1e-9);
    }
    // 가장 높은 지점(y가 극값)에서는 수평이다.
    const top = poses.reduce((a, b) => (b.y < a.y ? b : a));
    expect(Math.abs(top.deg)).toBeLessThan(0.5);
  });

  it("시작과 끝이 같아 되돌아 이어 붙여도 튀지 않는다", () => {
    expect(fishPoseAt(60, 1).y).toBeCloseTo(fishPoseAt(60, 0).y);
    expect(fishPoseAt(60, 1).deg).toBeCloseTo(fishPoseAt(60, 0).deg);
  });
});
