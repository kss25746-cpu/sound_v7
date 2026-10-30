// ResultScreen.test.tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import ResultScreen from "../ResultScreen";
import { type SummaryResult } from "../testEngine";

const mockPassSummary: SummaryResult = {
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
    tone: { heard: 3, total: 3, status: "ok" },
    screen: { correct: 5, total: 5, status: "pass" },
    fine: null,
    versus: null,
    final: "pass",
  },
};

const mockWeakHighSummary: SummaryResult = {
  high: {
    tone: { heard: 1, total: 3, status: "weak" },
    screen: { correct: 2, total: 5, status: "weak" },
    fine: { correct: 2, total: 6, status: "weak" },
    versus: { correct: 2, total: 6, status: "weak" },
    final: "weak",
  },
  mid: {
    tone: { heard: 3, total: 3, status: "ok" },
    screen: { correct: 5, total: 5, status: "pass" },
    fine: null,
    versus: null,
    final: "pass",
  },
  low: {
    tone: { heard: 3, total: 3, status: "ok" },
    screen: { correct: 5, total: 5, status: "pass" },
    fine: null,
    versus: null,
    final: "pass",
  },
};

describe("ResultScreen - 수심 지도 그래픽 및 결과 시각화", () => {
  it("모든 대역이 잘 들릴 때(pass) 맑은 시야와 축하 가이드가 표시된다", () => {
    const onRestart = jest.fn();
    const onExit = jest.fn();

    const { getByText, queryAllByText, queryByText, getByTestId } = render(
      <ResultScreen
        summary={mockPassSummary}
        onRestart={onRestart}
        onExit={onExit}
      />
    );

    // 타이틀 확인
    expect(getByText("모든 깊이가 또렷하게 들렸어요")).toBeTruthy();
    expect(getByText("기록 저장됨")).toBeTruthy();
    expect(queryByText("바다 수심 청각 지도")).toBeNull();

    expect(getByTestId("depth-scene-high")).toBeTruthy();
    expect(getByTestId("depth-scene-mid")).toBeTruthy();
    expect(getByTestId("depth-scene-low")).toBeTruthy();

    // 수심 지도: 범례 1 + 눈금 3 + 층 알약 3
    const passBadges = queryAllByText("또렷");
    expect(passBadges.length).toBe(7);

    // 축하 카드 확인
    expect(getByText("지금의 듣기 상태를 유지하려면 한 달에 한 번 다시 점검해 보세요.")).toBeTruthy();
  });

  it("특정 깊이(수면층)가 약할 때 흐릿 표시와 해당 대역 맞춤 자음 가이드가 제공된다", () => {
    const onRestart = jest.fn();
    const onExit = jest.fn();

    const { getByText, queryByText, queryAllByText, getByLabelText } = render(
      <ResultScreen
        summary={mockWeakHighSummary}
        onRestart={onRestart}
        onExit={onExit}
      />
    );

    // 범례 1 + 눈금 1 + 흐린 층 1 (`onCustomTrain` 없으면 연습 카드 없음)
    const weakBadges = queryAllByText("흐릿");
    expect(weakBadges.length).toBe(3);

    const passBadges = queryAllByText("또렷");
    expect(passBadges.length).toBe(5);

    // 한 줄 결론
    expect(getByText("수면층이 흐릿하게 들렸어요")).toBeTruthy();

    // 가이드(문제·해결·예시·음소)는 「자세히 보기」를 누르기 전에는 보이지 않는다
    expect(queryByText("수면층 · 치찰음·마찰음")).toBeNull();
    fireEvent.press(getByText("자세히 보기"));
    expect(getByText("수면층 · 치찰음·마찰음")).toBeTruthy();
    expect(
      getByText("ㅅ·ㅆ·ㅊ·ㅈ 같은 날카로운 소리가 흐릿해 다른 자음으로 들리기 쉬워요.")
    ).toBeTruthy();
    expect(getByText("대립쌍으로 그 자음만 반복해 들으며 또렷하게 잡아 보세요.")).toBeTruthy();
    expect(getByLabelText("마루 ↔ 자루 소리 비교 듣기")).toBeTruthy();
    expect(getByText("ㅁ / ㅈ")).toBeTruthy();
    expect(getByText("마루")).toBeTruthy();
    expect(getByText("자루")).toBeTruthy();
    expect(queryByText("사탕 ↔ 가방")).toBeNull();
    expect(queryByText(/오박|꼭포|다퀴|대우/)).toBeNull();
    expect(queryByText("이마")).toBeNull();
    expect(queryByText("나이")).toBeNull();
    expect(queryByText("가구")).toBeNull();
    expect(getByText("쌍 더 보기")).toBeTruthy();
    expect(getByText("ㄷ · ㄸ · ㅌ · ㅈ · ㅉ · ㅊ · ㅅ · ㅆ")).toBeTruthy();

    fireEvent.press(getByText("쌍 더 보기"));
    expect(getByText("이마")).toBeTruthy();
    expect(getByText("나이")).toBeTruthy();
    expect(getByText("가구")).toBeTruthy();
    expect(getByText("쌍 접기")).toBeTruthy();
  });

  it("추천 대립쌍 칩을 탭하면 미니 청취 모달이 열리고 소리 비교만 한다", () => {
    const onCustomTrain = jest.fn();

    const { getByText, getByLabelText, getAllByText, queryByText } = render(
      <ResultScreen
        summary={mockWeakHighSummary}
        onRestart={jest.fn()}
        onCustomTrain={onCustomTrain}
      />
    );

    expect(queryByText("대립쌍 소리 비교")).toBeNull();

    fireEvent.press(getByText("자세히 보기"));
    fireEvent.press(getByLabelText("마루 ↔ 자루 소리 비교 듣기"));

    expect(getByText("대립쌍 소리 비교")).toBeTruthy();
    expect(getByText("수면층 · 두 소리 비교")).toBeTruthy();
    expect(queryByText(/변별 청취/)).toBeNull();
    expect(getByLabelText("마루 소리 듣기")).toBeTruthy();
    expect(getByLabelText("자루 소리 듣기")).toBeTruthy();
    expect(getByText("두 단어 이어서 듣기")).toBeTruthy();
    expect(getByText("한 음소만 다른 두 단어에 집중하며 들어 보세요.")).toBeTruthy();
    expect(getByLabelText("닫기")).toBeTruthy();

    expect(getAllByText("수면층").length).toBeGreaterThanOrEqual(2);
    expect(getAllByText("연습")).toHaveLength(1);
    expect(getByLabelText("수면층 연습")).toBeTruthy();
    expect(onCustomTrain).not.toHaveBeenCalled();
  });

  it("다시 측정, 헤더 통계, 홈 버튼이 올바르게 동작한다", () => {
    const onRestart = jest.fn();
    const onOpenStats = jest.fn();
    const onExit = jest.fn();
    const onHome = jest.fn();

    const { getByText, getByLabelText, getAllByTestId, queryByLabelText } = render(
      <ResultScreen
        summary={mockPassSummary}
        onRestart={onRestart}
        onOpenStats={onOpenStats}
        onHome={onHome}
        onExit={onExit}
      />
    );
    expect(getAllByTestId("sea-icon-btn")).toHaveLength(1);
    expect(queryByLabelText("장비 점검")).toBeNull();

    fireEvent.press(getByText("다시 측정하기"));
    expect(onRestart).toHaveBeenCalledTimes(1);

    fireEvent.press(getByLabelText("탐사 기록 통계 보기"));
    expect(onOpenStats).toHaveBeenCalledTimes(1);

    fireEvent.press(getByText("처음으로"));
    expect(onHome).toHaveBeenCalledTimes(1);
    expect(onExit).not.toHaveBeenCalled();
  });

  it("약한 대역이 있으면 다음 행동 블록의 층 카드 「연습」이 맞춤 연습을 연다", () => {
    const onCustomTrain = jest.fn();
    const { getByText, getAllByText, getByLabelText, queryByText } = render(
      <ResultScreen
        summary={mockWeakHighSummary}
        onRestart={jest.fn()}
        onCustomTrain={onCustomTrain}
      />
    );

    expect(getByText("다음에 할 일")).toBeTruthy();
    expect(getByText("흐릿한 깊이 1곳만 연습해요.")).toBeTruthy();
    expect(queryByText("세부 점수 보기")).toBeNull();
    expect(queryByText("검사 단계별 세부 데이터")).toBeNull();

    expect(getAllByText("수면층").length).toBeGreaterThanOrEqual(2);
    expect(getAllByText("흐릿").length).toBeGreaterThanOrEqual(3);
    expect(getByText("연습")).toBeTruthy();
    fireEvent.press(getByLabelText("수면층 연습"));
    expect(onCustomTrain).toHaveBeenCalledWith("high");

    fireEvent.press(getByText("자세히 보기"));
    expect(getByText("수면층 · 치찰음·마찰음")).toBeTruthy();
    expect(getByText("접기")).toBeTruthy();
    expect(getByText("세부 점수 보기")).toBeTruthy();
    expect(queryByText("검사 단계별 세부 데이터")).toBeNull();
    expect(queryByText(/순음:/)).toBeNull();
    expect(queryByText(/스크리닝: 2\/5/)).toBeNull();
    expect(queryByText(/정밀: 2\/6/)).toBeNull();
    expect(queryByText(/대립쌍: 2\/6/)).toBeNull();

    fireEvent.press(getByText("세부 점수 보기"));
    expect(getByText("세부 점수 접기")).toBeTruthy();
    expect(getAllByText(/순음:/).length).toBeGreaterThan(0);
    expect(getByText(/스크리닝: 2\/5/)).toBeTruthy();
    expect(getByText(/정밀: 2\/6/)).toBeTruthy();
    expect(getByText(/대립쌍: 2\/6/)).toBeTruthy();
  });

  it("축하 어군 재생 단서가 없다", () => {
    const { queryByLabelText } = render(
      <ResultScreen summary={mockPassSummary} onRestart={jest.fn()} />
    );

    expect(queryByLabelText("축하 어군 보기")).toBeNull();
  });

  it("거품은 두고 떠다니는 물고기는 그리지 않는다", () => {
    const { getByTestId, queryByTestId } = render(
      <ResultScreen summary={mockPassSummary} onRestart={jest.fn()} />
    );

    expect(getByTestId("sea-bubbles")).toBeTruthy();
    expect(queryByTestId("sea-fish")).toBeNull();
  });
});
