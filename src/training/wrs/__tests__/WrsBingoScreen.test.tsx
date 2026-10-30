import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { BINGO_CELL_COUNT } from "@/training/wrs/wrsBingo";
import * as wrsBingo from "@/training/wrs/wrsBingo";
import { WrsBingoScreen } from "@/training/wrs/WrsBingoScreen";

jest.mock("expo-router", () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual("react");
    useEffect(effect, [effect]);
  },
}));

jest.mock("@/training/wrs/wrsTts", () => ({
  speakWrsWord: jest.fn(async () => undefined),
  stopWrsSpeech: jest.fn(async () => undefined),
}));

describe("WrsBingoScreen", () => {
  it("idle에서는 토글로 판을 고르고 시작 전에는 칸이 없다", () => {
    render(<WrsBingoScreen onBack={() => undefined} />);

    expect(screen.getByRole("radio", { name: "쉬운 판" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "비슷한 소리 판" })).toBeTruthy();
    expect(screen.getByText("시작")).toBeTruthy();
    expect(screen.queryByText("들은 단어를 누르세요")).toBeNull();
  });

  it("autoStart면 idle을 건너뛰고 칸 9개가 그려진다", async () => {
    render(
      <WrsBingoScreen
        onBack={() => undefined}
        autoStart
        initialDifficulty="easy"
      />,
    );

    await waitFor(
      () => {
        expect(screen.getByText("들은 단어를 누르세요")).toBeTruthy();
      },
      { timeout: 10000 },
    );
    const cells = screen
      .getAllByRole("button")
      .filter((node) => node.props.accessibilityLabel?.length === 1);
    expect(cells).toHaveLength(BINGO_CELL_COUNT);
  }, 15000);

  it("요약에서 방금 한 판이 토글에 선택되고 통계는 한 줄이다", async () => {
    const board = ["가", "나", "다", "라", "마", "바", "사", "아", "자"];
    const cues = ["가", "나", "다"];
    let cueIndex = 0;
    const boardSpy = jest
      .spyOn(wrsBingo, "createBingoBoard")
      .mockReturnValue([...board]);
    const cueSpy = jest
      .spyOn(wrsBingo, "pickBingoCue")
      .mockImplementation(() => cues[cueIndex++] ?? null);

    try {
      render(
        <WrsBingoScreen
          onBack={() => undefined}
          autoStart
          initialDifficulty="easy"
        />,
      );

      for (const word of cues) {
        await waitFor(() => {
          expect(screen.getByText("들은 단어를 누르세요")).toBeTruthy();
        });
        fireEvent.press(screen.getByLabelText(word));
        if (word === "다") {
          break;
        }
        await waitFor(() => {
          expect(screen.getByText("맞았어요")).toBeTruthy();
        });
        fireEvent.press(screen.getByText("다음"));
      }

      await waitFor(() => {
        expect(screen.getByText("한 줄이 이어졌어요")).toBeTruthy();
      });
      expect(screen.getByRole("radio", { name: "쉬운 판" }).props.accessibilityState)
        .toEqual(expect.objectContaining({ selected: true }));
      expect(screen.getByText("비슷한 소리")).toBeTruthy();
      expect(screen.getByText("다시 하기")).toBeTruthy();
      expect(screen.getByText("뒤로 가기")).toBeTruthy();
      expect(screen.getByText("완성한 줄")).toBeTruthy();
      expect(screen.getByText("표시한 칸")).toBeTruthy();
      expect(screen.getByText("들은 단어")).toBeTruthy();
    } finally {
      boardSpy.mockRestore();
      cueSpy.mockRestore();
    }
  });
});
