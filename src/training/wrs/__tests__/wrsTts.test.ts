import * as Speech from "expo-speech";

import { hasKoreanVoice } from "@/training/wrs/wrsTts";

jest.mock("expo-speech", () => ({
  getAvailableVoicesAsync: jest.fn(),
  speak: jest.fn(),
  stop: jest.fn(async () => undefined),
}));

const getVoices = Speech.getAvailableVoicesAsync as jest.MockedFunction<
  typeof Speech.getAvailableVoicesAsync
>;

/** 실제 목록에는 필드가 더 있지만 판별에 쓰는 건 language뿐이다. */
function voices(...languages: string[]) {
  return languages.map((language) => ({ language })) as Awaited<
    ReturnType<typeof Speech.getAvailableVoicesAsync>
  >;
}

describe("hasKoreanVoice", () => {
  beforeEach(() => {
    getVoices.mockReset();
  });

  it("한국어 음성이 있으면 true", async () => {
    getVoices.mockResolvedValue(voices("en-US", "ko-KR"));

    await expect(hasKoreanVoice()).resolves.toBe(true);
    expect(getVoices).toHaveBeenCalledTimes(1);
  });

  /** 실기기에서 실제로 만난 상황 — 엔진은 있는데 한국어만 없었다. */
  it("일본어·영어만 있으면 false", async () => {
    getVoices.mockResolvedValue(voices("ja-JP", "en-US", "ja-JP", "en-US"));

    await expect(hasKoreanVoice()).resolves.toBe(false);
  });

  it("대소문자·지역 표기가 달라도 한국어로 본다", async () => {
    getVoices.mockResolvedValue(voices("en-US", "KO-kr"));

    await expect(hasKoreanVoice()).resolves.toBe(true);
  });

  /**
   * 앱 시작 직후 첫 진입이면 엔진이 아직 안 깨서 목록이 비어 온다.
   * 그때 바로 포기하면 정작 한국어가 없는 기기가 안내 없이 통과해 버린다.
   */
  it("처음에 목록이 비면 다시 물어보고 그 결과를 쓴다", async () => {
    getVoices
      .mockResolvedValueOnce(voices())
      .mockResolvedValueOnce(voices("ja-JP", "en-US"));

    await expect(hasKoreanVoice()).resolves.toBe(false);
    expect(getVoices).toHaveBeenCalledTimes(2);
  });

  it("끝까지 목록이 비면 막지 않는다(true)", async () => {
    getVoices.mockResolvedValue(voices());

    await expect(hasKoreanVoice()).resolves.toBe(true);
    expect(getVoices).toHaveBeenCalledTimes(3);
  });

  it("조회가 실패해도 막지 않는다(true)", async () => {
    getVoices.mockRejectedValue(new Error("engine unavailable"));

    await expect(hasKoreanVoice()).resolves.toBe(true);
  });

  it("결과를 캐시하지 않는다 — 설치 후 «다시 확인»이 통해야 한다", async () => {
    getVoices.mockResolvedValueOnce(voices("en-US"));
    await expect(hasKoreanVoice()).resolves.toBe(false);

    getVoices.mockResolvedValueOnce(voices("en-US", "ko-KR"));
    await expect(hasKoreanVoice()).resolves.toBe(true);
  });
});
