import { audio, ensureWordPlayer } from "../audioAdapter";
import { setWordAudioForTest, clearWordAudiosForTest } from "../wordAudioAssets";

jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

jest.mock("@/audio/pureTone", () => ({
  playPureTone: jest.fn(async () => undefined),
  stopPureTone: jest.fn(),
}));

jest.mock("@/audio/amTone", () => ({
  stopAmTone: jest.fn(),
}));

import * as Speech from "expo-speech";
import { playPureTone } from "@/audio/pureTone";

describe("audioAdapter calibration and panning", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearWordAudiosForTest();
  });

  afterEach(() => {
    clearWordAudiosForTest();
  });

  it("playTone은 고정 0.6을 곱한 게인과 pan을 playPureTone에 전달한다", async () => {
    await audio.playTone({ hz: 1000, level: 0.8, ms: 500, pan: -1.0 });

    expect(playPureTone).toHaveBeenCalledWith(
      expect.objectContaining({
        frequencyHz: 1000,
        durationSec: 0.5,
        pan: -1.0,
        gain: 0.12, // 0.8 * 0.6 * 0.25
      })
    );
  });

  it("음원이 없는 단어 호출 시 Speech.speak로 폴백되고 volume에 0.6이 반영된다", async () => {
    (Speech.speak as jest.Mock).mockImplementation((_word, options) => {
      options?.onDone?.();
    });

    await audio.playWord("미등록단어", { level: 0.8 });

    expect(Speech.speak).toHaveBeenCalledWith(
      "미등록단어",
      expect.objectContaining({
        volume: 0.48, // 0.8 * 0.6
      })
    );
  });

  it("사전 녹음 음원이 등록된 단어 호출 시 expo-audio player로 재생되고 Speech.speak는 호출되지 않는다", async () => {
    const mockAudioSource = 12345;
    setWordAudioForTest("엄마", mockAudioSource);

    const player = ensureWordPlayer();
    // simulate instant playback finish
    (player.addListener as jest.Mock).mockImplementation((_event: string, callback: (status: any) => void) => {
      setTimeout(() => callback({ didJustFinish: true }), 10);
      return { remove: jest.fn() };
    });

    await audio.playWord("엄마", { level: 0.8 });

    expect(player.replace).toHaveBeenCalledWith(mockAudioSource);
    expect(player.volume).toBeCloseTo(0.48);
    expect(player.play).toHaveBeenCalled();
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  it("stop() 호출 시 wordPlayer pause와 Speech.stop이 모두 호출된다", async () => {
    const player = ensureWordPlayer();
    await audio.stop();

    expect(player.pause).toHaveBeenCalled();
    expect(Speech.stop).toHaveBeenCalled();
  });
});

