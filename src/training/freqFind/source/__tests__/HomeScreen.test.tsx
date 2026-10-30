import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Colors } from "@/constants/theme";
import HomeScreen from "../HomeScreen";
import * as sessionStore from "@/training/sessionStore";

const flatten = (style: unknown) =>
  Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;

jest.mock("@/training/sessionStore", () => {
  const actual = jest.requireActual("@/training/sessionStore");
  return {
    ...actual,
    getLatestFreqFindSession: jest.fn(),
  };
});

describe("HomeScreen - 배경 연출", () => {
  it("거품은 두고 떠다니는 물고기는 그리지 않는다", () => {
    (sessionStore.getLatestFreqFindSession as jest.Mock).mockResolvedValue(null);

    const { getByTestId, queryByTestId } = render(<HomeScreen onStart={jest.fn()} />);

    expect(getByTestId("sea-bubbles")).toBeTruthy();
    expect(queryByTestId("sea-fish")).toBeNull();
  });
});

describe("HomeScreen - 최근 탐사 기록 연동", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("이전 기록이 없을 때 최근 기록 카드 없이 정상 렌더링된다", async () => {
    (sessionStore.getLatestFreqFindSession as jest.Mock).mockResolvedValue(null);

    const onStart = jest.fn();
    const { getByText, queryByText } = render(
      <HomeScreen onStart={onStart} />
    );

    expect(getByText("소리를 찾는 바다")).toBeTruthy();
    expect(getByText("병원 검사가 아니에요")).toBeTruthy();
    expect(getByText("여정이 궁금해요")).toBeTruthy();
    expect(queryByText("여정은 네 단계예요")).toBeNull();
    expect(queryByText("최근 탐사 기록")).toBeNull();

    fireEvent.press(getByText("여정이 궁금해요"));
    expect(getByText("여정은 네 단계예요")).toBeTruthy();
    expect(getByText("소리의 파동 — 들리는지 확인해요")).toBeTruthy();
    expect(getByText("마주 보는 두 소리 — 비슷한 두 단어를 구별해요")).toBeTruthy();
    expect(getByText(/위가 높은 소리\(수면\)/)).toBeTruthy();

    fireEvent.press(getByText("여정 시작"));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("이전 기록이 있을 때 최근 탐사 기록 카드와 수심별 상태가 표시된다", async () => {
    (sessionStore.getLatestFreqFindSession as jest.Mock).mockResolvedValue({
      id: "test-rec-1",
      track: "freqFind",
      savedAt: "2026-09-14T03:00:00.000Z",
      summary: {
        high: { final: "pass" },
        mid: { final: "pass" },
        low: { final: "weak" },
      },
    });

    const onStart = jest.fn();
    const { findByText, getByText } = render(
      <HomeScreen onStart={onStart} />
    );

    expect(await findByText("최근 탐사 기록")).toBeTruthy();
    expect(getByText("흐릿")).toBeTruthy();
  });

  it("최근 탐사 기록이 있고 onViewResult가 전달되면 [지난 결과 보기] 버튼이 표시되고 클릭 시 콜백이 호출된다", async () => {
    const mockRecord = {
      id: "test-rec-2",
      track: "freqFind" as const,
      savedAt: "2026-09-14T04:00:00.000Z",
      grades: { s1: null, s2: null, s3: null, s4: null },
      summary: {
        high: { final: "pass" },
        mid: { final: "pass" },
        low: { final: "pass" },
      } as any,
    };
    (sessionStore.getLatestFreqFindSession as jest.Mock).mockResolvedValue(mockRecord);

    const onStart = jest.fn();
    const onViewResult = jest.fn();
    const { findByText, getByText } = render(
      <HomeScreen onStart={onStart} onViewResult={onViewResult} />
    );

    const resultBtn = await findByText("지난 결과 보기");
    expect(resultBtn).toBeTruthy();

    fireEvent.press(resultBtn);
    expect(onViewResult).toHaveBeenCalledTimes(1);
    expect(onViewResult).toHaveBeenCalledWith(mockRecord);
  });

  it("recentSession prop이 직접 전달되면 비동기 로딩 없이 즉시 렌더링되고 결과 보기가 작동한다", () => {
    const mockRecord = {
      id: "test-rec-3",
      track: "freqFind" as const,
      savedAt: "2026-09-14T04:30:00.000Z",
      grades: { s1: null, s2: null, s3: null, s4: null },
      summary: {
        high: { final: "pass" },
        mid: { final: "weak" },
        low: { final: "pass" },
      } as any,
    };

    const onStart = jest.fn();
    const onViewResult = jest.fn();
    const { getByText } = render(
      <HomeScreen
        onStart={onStart}
        onViewResult={onViewResult}
        recentSession={mockRecord}
      />
    );

    expect(getByText("최근 탐사 기록")).toBeTruthy();
    const resultBtn = getByText("지난 결과 보기");
    expect(resultBtn).toBeTruthy();

    fireEvent.press(resultBtn);
    expect(onViewResult).toHaveBeenCalledWith(mockRecord);
  });

  it("recentSession이 null이면 저장소에 기록이 있어도 최근 카드를 안 띄운다", () => {
    (sessionStore.getLatestFreqFindSession as jest.Mock).mockResolvedValue({
      id: "stale",
      track: "freqFind",
      savedAt: "2026-09-14T04:30:00.000Z",
      pearls: 9,
      summary: { high: { final: "pass" }, mid: { final: "pass" }, low: { final: "pass" } },
    });

    const { queryByText } = render(
      <HomeScreen onStart={jest.fn()} recentSession={null} />
    );

    expect(queryByText("최근 탐사 기록")).toBeNull();
    expect(queryByText("여정이 궁금해요")).toBeTruthy();
    expect(queryByText("여정은 네 단계예요")).toBeNull();
    expect(sessionStore.getLatestFreqFindSession).not.toHaveBeenCalled();
  });

  it("우상단 차트만 통계 진입이고 카드에 「전체 기록 보기」와 Hz 범위는 없다", () => {
    const mockRecord = {
      id: "test-rec-4",
      track: "freqFind" as const,
      savedAt: "2026-09-10T04:30:00.000Z",
      grades: { s1: null, s2: null, s3: null, s4: null },
      summary: {
        high: { final: "pass" },
        mid: { final: "weak" },
        low: { final: "pass" },
      } as any,
    };

    const { getByText, getByLabelText, queryByText } = render(
      <HomeScreen
        onStart={jest.fn()}
        onOpenStats={jest.fn()}
        onViewResult={jest.fn()}
        recentSession={mockRecord}
      />
    );

    expect(getByLabelText("탐사 기록 통계 보기")).toBeTruthy();
    expect(getByText("지난 결과 보기")).toBeTruthy();
    expect(queryByText("전체 기록 보기")).toBeNull();
    expect(queryByText("≤ 500 Hz")).toBeNull();
    expect(queryByText("600 ~ 3,350 Hz")).toBeNull();
    expect(queryByText("3,350 ~ 7,000 Hz")).toBeNull();
    expect(getByText("여정이 궁금해요")).toBeTruthy();
    expect(queryByText("여정은 네 단계예요")).toBeNull();
    expect(queryByText("깊이와 주파수")).toBeNull();
  });

  it("뒤로 가기와 통계 단추 면은 accentTint다", () => {
    const { getByLabelText, getByTestId } = render(
      <HomeScreen
        onStart={jest.fn()}
        onBack={jest.fn()}
        onOpenStats={jest.fn()}
        recentSession={null}
      />
    );

    const back = flatten(getByLabelText("뒤로 가기").props.style) as {
      backgroundColor: string;
      borderColor: string;
    };
    const chart = flatten(getByTestId("sea-icon-btn").props.style) as {
      backgroundColor: string;
      borderColor: string;
    };
    expect(back.backgroundColor).toBe(Colors.light.accentTint);
    expect(chart.backgroundColor).toBe(Colors.light.accentTint);
    expect(back.borderColor).toBe("#C9CED6");
    expect(chart.borderColor).toBe("#C9CED6");
  });
});
