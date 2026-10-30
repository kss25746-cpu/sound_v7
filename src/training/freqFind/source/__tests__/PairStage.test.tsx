import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import PairStage from "../PairStage";
import { audio } from "../audioAdapter";
import type { PairStageItem } from "../testEngine";

jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: {
    Success: "success",
    Warning: "warning",
    Error: "error",
  },
  ImpactFeedbackStyle: {
    Light: "light",
    Medium: "medium",
    Heavy: "heavy",
  },
}));

jest.mock("@/components/ui/equalizer", () => ({
  Equalizer: () => null,
}));

const ITEM: PairStageItem = {
  id: "p1",
  stage: 4,
  band: "low",
  versus: "mid",
  diff: "ㅁ/ㅎ",
  answer: "마늘",
  options: ["마늘", "하늘"],
  displayType: "text",
};

beforeEach(() => {
  jest.spyOn(audio, "playWord").mockResolvedValue(undefined);
  jest.spyOn(audio, "stop").mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("PairStage", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("헤더는 두 층을 vs로 견주고 게이지는 수심 층 비교라고 쓴다", () => {
    const screen = render(
      <PairStage items={[ITEM]} onDone={jest.fn()} />
    );
    const { getByText } = screen;

    expect(getByText("심해층 vs 중층")).toBeTruthy();
    expect(getByText("심해층 비교 · 1 / 1")).toBeTruthy();
    expect(getByText("4단계 · 마주 보는 두 소리")).toBeTruthy();
    screen.unmount();
  });
});

describe("PairStage - 재생 겹침 방지", () => {
  const TWO: PairStageItem[] = [
    ITEM,
    { ...ITEM, id: "p2", answer: "하늘" },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("자동 재생은 문항당 한 번만 한다", async () => {
    const spy = jest
      .spyOn(audio, "playWord")
      .mockImplementation(() => new Promise((r) => setTimeout(r, 1000)));
    const screen = render(<PairStage items={TWO} onDone={jest.fn()} />);
    for (let i = 0; i < 50; i++) {
      await act(async () => {
        jest.advanceTimersByTime(200);
        await Promise.resolve();
      });
    }
    expect(spy).toHaveBeenCalledTimes(1);
    screen.unmount();
  });

  it("다시 듣기 중에 넘어가면 앞 소리를 끊고, 앞 재생이 끝나도 새 문항 보기를 열지 않는다", async () => {
    const pending: (() => void)[] = [];
    const spy = jest.spyOn(audio, "playWord").mockImplementation(
      () =>
        new Promise<void>((r) => {
          pending.push(r);
        })
    );
    const screen = render(<PairStage items={TWO} onDone={jest.fn()} />);
    const { getByLabelText, getByTestId } = screen;

    await act(async () => {
      jest.advanceTimersByTime(450);
    });
    await act(async () => {
      pending.shift()?.();
    });
    fireEvent.press(getByLabelText("다시 듣기"));
    const stale = pending.shift();
    fireEvent.press(getByLabelText("마늘"));
    await act(async () => {
      jest.advanceTimersByTime(600 + 1000);
    });
    expect(audio.stop).toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(450);
    });
    expect(spy).toHaveBeenCalledTimes(3);

    await act(async () => {
      stale?.();
    });
    expect(
      getByTestId("choice-area", { includeHiddenElements: true }).props.pointerEvents
    ).toBe("none");
    screen.unmount();
  });
});
