import React from "react";
import { render } from "@testing-library/react-native";
import { FreqFindProgressPanel } from "@/training/FreqFindProgressPanel";
import type { SavedFreqFindSessionRecord } from "@/training/sessionStore";

describe("FreqFindProgressPanel", () => {
  it("기록이 없을 때 안내 문구를 렌더링한다", () => {
    const { getByText } = render(<FreqFindProgressPanel records={[]} />);
    expect(getByText(/아직 탐사 기록이 없어요/)).toBeTruthy();
  });

  it("기록이 있을 때 총 탐사 수 및 대역 상태를 렌더링한다", () => {
    const sampleRecord: SavedFreqFindSessionRecord = {
      id: "freqFind-1",
      track: "freqFind",
      savedAt: "2026-09-14T03:00:00.000Z",
      schemaVersion: 1,
      mode: "measure",
      grades: {
        s1: {
          low: { heard: 3, total: 3, status: "ok" },
          mid: { heard: 3, total: 3, status: "ok" },
          high: { heard: 3, total: 3, status: "ok" },
        },
        s2: {
          low: { correct: 5, total: 5, status: "pass" },
          mid: { correct: 5, total: 5, status: "pass" },
          high: { correct: 5, total: 5, status: "pass" },
        },
        s3: null,
        s4: null,
      },
      summary: {
        low: {
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
        high: {
          tone: { heard: 2, total: 3, status: "watch" },
          screen: { correct: 4, total: 5, status: "suspect" },
          fine: null,
          versus: null,
          final: "suspect",
        },
      },
    };

    const { getByText } = render(
      <FreqFindProgressPanel records={[sampleRecord]} />,
    );

    expect(getByText("누적 탐사 요약")).toBeTruthy();
    expect(getByText(/1\s*회/)).toBeTruthy();
    expect(getByText("최근 수심별 청취 상태")).toBeTruthy();
    expect(getByText(/수면층/)).toBeTruthy();
    expect(getByText("탐사 기록 이력")).toBeTruthy();
  });
});
