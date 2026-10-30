import React from "react";
import { Animated } from "react-native";
import { render, fireEvent, act } from "@testing-library/react-native";
import WordStage from "../WordStage";
import { audio } from "../audioAdapter";
import type { WordStageItem } from "../testEngine";

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

const item = (
  over: Partial<WordStageItem> & Pick<WordStageItem, "id" | "answer" | "options">
): WordStageItem => ({
  stage: 2,
  mode: "A",
  band: "mid",
  displayType: "text",
  ...over,
});

const ITEMS: WordStageItem[] = [
  item({ id: "w1", answer: "사과", options: ["사과", "수박", "포도", "배"] }),
  item({ id: "w2", answer: "하늘", options: ["하늘", "바다", "산", "강"] }),
];

const noopAnim = {
  start: jest.fn(),
  stop: jest.fn(),
  reset: jest.fn(),
};

function beginFake() {
  jest.useFakeTimers();
  jest.spyOn(audio, "playWord").mockResolvedValue(undefined);
  jest.spyOn(audio, "stop").mockResolvedValue(undefined);
  jest.spyOn(Animated, "loop").mockReturnValue(noopAnim as never);
  jest.spyOn(Animated, "spring").mockReturnValue(noopAnim as never);
}

function endFake() {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
}

async function waitUntilPlayable() {
  await act(async () => {
    jest.advanceTimersByTime(450);
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("WordStage - 오답 공개", () => {
  it("맞으면 안내 없이 0.9초 뒤 다음 문항으로 넘어간다", async () => {
    beginFake();
    const onDone = jest.fn();
    const screen = render(
      <WordStage items={ITEMS} stageLabel="2단계" onDone={onDone} />
    );
    const { getByLabelText, queryByText, getByText } = screen;

    try {
      await waitUntilPlayable();
      fireEvent.press(getByLabelText("사과"));

      await act(async () => {
        jest.advanceTimersByTime(700 + 900);
      });
      expect(getByText("소리를 들어 보세요")).toBeTruthy();
      expect(getByText("진행 · 2 / 2")).toBeTruthy();
      expect(queryByText("하늘")).toBeNull();
      expect(onDone).not.toHaveBeenCalled();
    } finally {
      screen.unmount();
      endFake();
    }
  });

  it("틀리면 「오답 · 정답: ○○」를 보이고 2초 뒤에 넘어간다", async () => {
    beginFake();
    const onDone = jest.fn();
    const screen = render(
      <WordStage items={ITEMS} stageLabel="2단계" onDone={onDone} />
    );
    const { getByLabelText, getByText, queryByText } = screen;

    try {
      await waitUntilPlayable();
      fireEvent.press(getByLabelText("수박"));

      await act(async () => {
        jest.advanceTimersByTime(700);
      });
      expect(getByText("오답 · 정답: 사과")).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
      expect(getByText("소리를 들어 보세요")).toBeTruthy();
      expect(getByText("진행 · 2 / 2")).toBeTruthy();
      expect(queryByText("오답 · 정답: 사과")).toBeNull();
      expect(queryByText("하늘")).toBeNull();
      expect(onDone).not.toHaveBeenCalled();
    } finally {
      screen.unmount();
      endFake();
    }
  });
});

describe("WordStage - 듣기 뒤 고르기", () => {
  it("듣기 전에는 보기 타일이 없고 들은 뒤에만 고를 수 있다", async () => {
    beginFake();
    const screen = render(
      <WordStage items={ITEMS} stageLabel="2단계" onDone={jest.fn()} />
    );
    const {
      queryByLabelText,
      queryByText,
      queryByTestId,
      getByLabelText,
      getByText,
      getByTestId,
    } = screen;

    try {
      expect(getByText("소리를 들어 보세요")).toBeTruthy();
      expect(queryByText("사과")).toBeNull();
      expect(queryByText("하늘")).toBeNull();
      expect(queryByLabelText("사과")).toBeNull();
      expect(queryByTestId("choice-area")).toBeNull();

      await waitUntilPlayable();

      expect(getByText("들은 소리를 고르세요")).toBeTruthy();
      expect(getByText("사과")).toBeTruthy();
      expect(getByLabelText("사과")).toBeTruthy();
      expect(getByTestId("choice-area")).toBeTruthy();
    } finally {
      screen.unmount();
      endFake();
    }
  });
});

describe("WordStage - 연습 재출제 게이지", () => {
  it("재출제가 붙어도 총량은 처음 문항 수이고 재출제는 「한 번 더」만 표시한다", async () => {
    beginFake();
    const onDone = jest.fn();
    const screen = render(
      <WordStage
        items={ITEMS}
        stageLabel="연습"
        onDone={onDone}
        isCustomTraining
      />
    );
    const { getByLabelText, getByText, queryByText } = screen;

    try {
      expect(getByText("진행 · 1 / 2")).toBeTruthy();

      await waitUntilPlayable();
      fireEvent.press(getByLabelText("수박"));

      await act(async () => {
        jest.advanceTimersByTime(700 + 2000);
      });

      expect(getByText("진행 · 2 / 2")).toBeTruthy();
      expect(queryByText("진행 · 2 / 3")).toBeNull();

      await waitUntilPlayable();
      fireEvent.press(getByLabelText("하늘"));

      await act(async () => {
        jest.advanceTimersByTime(700 + 900);
      });

      expect(getByText("연습 · 한 번 더")).toBeTruthy();
      expect(getByText("진행 · 2 / 2")).toBeTruthy();
      expect(queryByText("진행 · 3 / 3")).toBeNull();
      expect(onDone).not.toHaveBeenCalled();
    } finally {
      screen.unmount();
      endFake();
    }
  });
});

describe("WordStage - 재생 겹침 방지", () => {
  it("자동 재생은 문항당 한 번만 한다", async () => {
    beginFake();
    const spy = jest
      .spyOn(audio, "playWord")
      .mockImplementation(() => new Promise((r) => setTimeout(r, 1000)));
    const screen = render(
      <WordStage items={ITEMS} stageLabel="2단계" onDone={jest.fn()} />
    );

    try {
      for (let i = 0; i < 50; i++) {
        await act(async () => {
          jest.advanceTimersByTime(200);
          await Promise.resolve();
        });
      }
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("사과");
    } finally {
      screen.unmount();
      endFake();
    }
  });

  it("다시 듣기 중에 넘어가면 앞 소리를 끊고, 앞 재생이 끝나도 새 문항 보기를 열지 않는다", async () => {
    beginFake();
    const pending: (() => void)[] = [];
    const spy = jest.spyOn(audio, "playWord").mockImplementation(
      () =>
        new Promise<void>((r) => {
          pending.push(r);
        })
    );
    const screen = render(
      <WordStage items={ITEMS} stageLabel="2단계" onDone={jest.fn()} />
    );
    const { getByLabelText, getByText, queryByTestId } = screen;

    try {
      await waitUntilPlayable();
      await act(async () => {
        pending.shift()?.();
      });
      // 다시 듣기 — 끝나지 않은 채로 고른다.
      fireEvent.press(getByLabelText("다시 듣기"));
      expect(spy).toHaveBeenCalledTimes(2);
      const stale = pending.shift();
      fireEvent.press(getByLabelText("사과"));
      await act(async () => {
        jest.advanceTimersByTime(700 + 900);
      });
      expect(getByText("진행 · 2 / 2")).toBeTruthy();
      expect(audio.stop).toHaveBeenCalled();

      // 새 문항 자동 재생은 앞 재생에 막히지 않는다.
      await waitUntilPlayable();
      expect(spy).toHaveBeenLastCalledWith("하늘");

      // 앞 재생이 늦게 끝나도 새 문항은 아직 「듣기 전」이다.
      await act(async () => {
        stale?.();
      });
      expect(getByText("소리를 들어 보세요")).toBeTruthy();
      expect(queryByTestId("choice-area")).toBeNull();
    } finally {
      screen.unmount();
      endFake();
    }
  });
});
