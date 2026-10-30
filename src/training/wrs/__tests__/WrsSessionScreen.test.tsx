import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import { WRS_SHORT_COUNT } from "@/training/wrs/wrsSession";
import { WrsSessionScreen } from "@/training/wrs/WrsSessionScreen";

jest.mock("expo-router", () => ({
  // 포커스 훅은 마운트 때 한 번 도는 것으로 충분하다.
  useFocusEffect: (effect: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual("react");
    useEffect(effect, [effect]);
  },
}));

jest.mock("@/training/wrs/wrsTts", () => ({
  speakWrsWord: jest.fn(async () => undefined),
  stopWrsSpeech: jest.fn(async () => undefined),
  // 첫 단어 앞의 뜸(실제 0.7초)은 여기서 없앤다 — 테스트마다 붙으면 느려진다.
  waitFirstWordLeadIn: jest.fn(async () => undefined),
}));

jest.mock("@/training/wrs/wrsStore", () => ({
  appendWrsSummary: jest.fn(async () => undefined),
  clearWrsRecords: jest.fn(async () => undefined),
  listWrsRecords: jest.fn(async () => []),
}));

/**
 * 진행 막대가 알리는 현재 값. 0에 머물면 진행이 화면에 반영되지 않는다는 뜻이다.
 * 폭(%)이 아니라 접근성 값을 보는 이유는 보기 칸도 %폭을 쓰기 때문이다.
 */
function progressNow(): number | undefined {
  return screen.getByRole("progressbar").props.accessibilityValue?.now;
}

/** 보기 칸은 라벨이 단어 자체인 버튼이다(«중지» 같은 액션 버튼과 구분). */
async function choiceButtons() {
  await waitFor(() => {
    expect(screen.getByText("들은 단어를 고르세요")).toBeTruthy();
  });
  return screen
    .getAllByRole("button")
    .filter((node) => node.props.accessibilityLabel?.length === 1);
}

describe("WrsSessionScreen", () => {
  it("첫 화면에서 12문항·25문항을 고른다", () => {
    render(<WrsSessionScreen />);
    expect(screen.getByRole("radio", { name: "12문항" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "25문항" })).toBeTruthy();
    expect(
      screen.getByRole("radio", { name: "12문항" }).props.accessibilityState
        .selected,
    ).toBe(true);
  });

  it("연습을 시작하면 보기 4개가 그려진다", async () => {
    render(<WrsSessionScreen autoStart />);

    expect(await choiceButtons()).toHaveLength(4);
  });

  /**
   * 오늘 실제로 깨졌던 자리 — 진행 막대가 `outcomesRef`를 렌더에서 읽어
   * 0%에 얼어 있었다. 답을 고르면 폭이 늘어야 한다.
   */
  it("답을 고르면 진행 막대가 늘어난다", async () => {
    render(<WrsSessionScreen autoStart />);

    const choices = await choiceButtons();
    expect(progressNow()).toBe(0);

    fireEvent.press(choices[0]);

    await waitFor(() => {
      expect(progressNow()).toBe(1);
    });
    expect(screen.getByRole("progressbar").props.accessibilityValue.max).toBe(
      WRS_SHORT_COUNT,
    );
  });
});
