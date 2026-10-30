import {
  stopAllHearingAudio,
  registerAudioStopper,
  configureHearingAudioMode,
  setHearingAudioActive,
} from "../audioFocus";
import { stopPureTone } from "../pureTone";
import { stopAmTone } from "../amTone";
import * as Speech from "expo-speech";
import { setAudioModeAsync, setIsAudioActiveAsync } from "expo-audio";

jest.mock("expo-audio", () => ({
  setAudioModeAsync: jest.fn(async () => undefined),
  setIsAudioActiveAsync: jest.fn(async () => undefined),
}));

jest.mock("expo-speech", () => ({
  stop: jest.fn(),
  speak: jest.fn(),
}));

jest.mock("../pureTone", () => ({
  stopPureTone: jest.fn(),
  playPureTone: jest.fn(async () => undefined),
}));

jest.mock("../amTone", () => ({
  stopAmTone: jest.fn(),
  playAmTone: jest.fn(async () => undefined),
}));

describe("audioFocus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("configureHearingAudioMode calls setAudioModeAsync with doNotMix and playsInSilentMode", async () => {
    await configureHearingAudioMode();
    expect(setAudioModeAsync).toHaveBeenCalledWith({
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
      shouldPlayInBackground: false,
    });
  });

  it("setHearingAudioActive calls setIsAudioActiveAsync", async () => {
    await setHearingAudioActive(true);
    expect(setIsAudioActiveAsync).toHaveBeenCalledWith(true);

    await setHearingAudioActive(false);
    expect(setIsAudioActiveAsync).toHaveBeenCalledWith(false);
  });

  it("stopAllHearingAudio calls stopPureTone, stopAmTone, Speech.stop, and registered stoppers", async () => {
    const mockStopper1 = jest.fn();
    const mockStopper2 = jest.fn(async () => undefined);

    const unregister1 = registerAudioStopper(mockStopper1);
    const unregister2 = registerAudioStopper(mockStopper2);

    await stopAllHearingAudio();

    expect(stopPureTone).toHaveBeenCalledTimes(1);
    expect(stopAmTone).toHaveBeenCalledTimes(1);
    expect(Speech.stop).toHaveBeenCalledTimes(1);
    expect(mockStopper1).toHaveBeenCalledTimes(1);
    expect(mockStopper2).toHaveBeenCalledTimes(1);

    // unregister 테스트
    unregister1();
    unregister2();

    jest.clearAllMocks();
    await stopAllHearingAudio();

    expect(mockStopper1).not.toHaveBeenCalled();
    expect(mockStopper2).not.toHaveBeenCalled();
  });

  /**
   * 회귀 방지 — 이 한 줄이 되돌아오면 앱의 절반이 무음이 된다.
   *
   * `setIsAudioActiveAsync`는 expo-audio **전역** 플래그 하나다. 네이티브가 꺼진 상태에서
   * 모든 `play()`를 조용히 무시하므로 JS 쪽에서는 무음을 감지할 수 없다.
   * `stopAllHearingAudio`는 화면 이탈·단계 전환마다 불리는 경로라, 여기서 전역을 끄면
   * 소리 구분·문장 듣기·악기 탭이 통째로 죽는다(2026-09-23 실제 버그).
   *
   * 전역 on/off는 `audio-manager.tsx`의 AppState 게이트가 한 쌍으로만 다룬다.
   */
  it("stopAllHearingAudio는 전역 오디오 스위치를 건드리지 않는다", async () => {
    const unregister = registerAudioStopper(jest.fn());

    await stopAllHearingAudio();

    expect(setIsAudioActiveAsync).not.toHaveBeenCalled();

    unregister();
  });
});
