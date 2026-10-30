import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import ToneStage from "../ToneStage";
import { audio } from "../audioAdapter";
import type { Stage1Item } from "../testEngine";

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

const ITEMS: Stage1Item[] = [
  { id: "t1", stage: 1, band: "mid", hz: 1000, level: 1, levelIndex: 0 },
  { id: "t2", stage: 1, band: "low", hz: 250, level: 1, levelIndex: 0 },
];

describe("ToneStage - 듣기 뒤 고르기", () => {
  beforeEach(() => {
    jest.spyOn(audio, "playTone").mockResolvedValue(undefined);
    jest.spyOn(audio, "stop").mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("듣기 전에는 응답 버튼이 없고 듣기 안내만 있다", () => {
    const { queryByText, queryByTestId, getByText } = render(
      <ToneStage items={ITEMS} onDone={jest.fn()} />
    );

    expect(getByText("버튼을 눌러 소리를 들어 보세요")).toBeTruthy();
    expect(getByText("진행 · 1 / 2")).toBeTruthy();
    expect(queryByText("들렸어요")).toBeNull();
    expect(queryByText("안 들렸어요")).toBeNull();
    expect(queryByTestId("choice-area")).toBeNull();
  });

  it("들은 뒤에만 들렸어요/안 들었어요가 나타난다", async () => {
    const { getByLabelText, getByText, getByTestId } = render(
      <ToneStage items={ITEMS} onDone={jest.fn()} />
    );

    await act(async () => {
      fireEvent.press(getByLabelText("소리 듣기"));
    });

    expect(getByText("이 소리가 들렸나요?")).toBeTruthy();
    expect(getByTestId("choice-area")).toBeTruthy();
    expect(getByText("들렸어요")).toBeTruthy();
    expect(getByText("안 들렸어요")).toBeTruthy();
  });

  it("다음 문항으로 가면 다시 듣기 전이 된다", async () => {
    const onDone = jest.fn();
    const { getByLabelText, getByText, queryByText, queryByTestId } = render(
      <ToneStage items={ITEMS} onDone={onDone} />
    );

    await act(async () => {
      fireEvent.press(getByLabelText("소리 듣기"));
    });
    fireEvent.press(getByText("들렸어요"));

    expect(queryByText("들렸어요")).toBeNull();
    expect(queryByTestId("choice-area")).toBeNull();
    expect(getByText("버튼을 눌러 소리를 들어 보세요")).toBeTruthy();
    expect(getByText("진행 · 2 / 2")).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe("ToneStage - 재생 겹침 방지", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("다시 듣기 중에 답하면 앞 순음을 끊고, 앞 재생이 끝나도 새 문항 답 버튼을 열지 않는다", async () => {
    jest.spyOn(audio, "stop").mockResolvedValue(undefined);
    const pending: (() => void)[] = [];
    jest.spyOn(audio, "playTone").mockImplementation(
      () =>
        new Promise<void>((r) => {
          pending.push(r);
        })
    );
    const { getByLabelText, getByText, queryByTestId } = render(
      <ToneStage items={ITEMS} onDone={jest.fn()} />
    );

    fireEvent.press(getByLabelText("소리 듣기"));
    await act(async () => {
      pending.shift()?.();
    });
    fireEvent.press(getByLabelText("다시 듣기"));
    const stale = pending.shift();
    fireEvent.press(getByText("들렸어요"));
    expect(audio.stop).toHaveBeenCalled();
    expect(getByText("진행 · 2 / 2")).toBeTruthy();

    await act(async () => {
      stale?.();
    });
    expect(getByText("버튼을 눌러 소리를 들어 보세요")).toBeTruthy();
    expect(queryByTestId("choice-area")).toBeNull();
  });
});
