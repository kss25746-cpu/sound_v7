type StatusListener = (status: {
  didJustFinish?: boolean;
  error?: string | null;
}) => void;

const mockListeners: StatusListener[] = [];
const mockPlayer = {
  replace: jest.fn(),
  seekTo: jest.fn(async () => undefined),
  play: jest.fn(),
  pause: jest.fn(),
  addListener: jest.fn((_event: string, fn: StatusListener) => {
    mockListeners.push(fn);
    return {
      remove: () => {
        const at = mockListeners.indexOf(fn);
        if (at >= 0) {
          mockListeners.splice(at, 1);
        }
      },
    };
  }),
};

jest.mock("expo-audio", () => ({
  createAudioPlayer: () => mockPlayer,
}));

import {
  LING6_DURATION_SEC,
  playLing6Target,
  stopLing6Playback,
} from "@/training/ling6/ling6Play";
import { LING6_SOUNDS, ling6SoundOf } from "@/training/ling6/sounds";

/** 네이티브가 재생이 끝났다고 알리는 상태 갱신 한 번. */
function emitFinished(): void {
  for (const fn of [...mockListeners]) {
    fn({ didJustFinish: true, error: null });
  }
}

describe("ling6Play", () => {
  beforeEach(() => {
    mockListeners.length = 0;
    mockPlayer.replace.mockClear();
    mockPlayer.play.mockClear();
    mockPlayer.pause.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("여섯 소리 모두 음원이 붙어 있다", () => {
    // Jest는 wav를 에셋 목(숫자)으로 바꾸므로 파일이 서로 다른지는 여기서 못 본다.
    expect(LING6_SOUNDS).toHaveLength(6);
    for (const sound of LING6_SOUNDS) {
      expect(sound.audio).toBeDefined();
    }
  });

  it("소리 시행은 파일을 처음부터 틀고 재생이 끝나면 끝난다", async () => {
    const done = playLing6Target("a");
    // 오디오 모드 → replace → seekTo → 리스너 등록까지 마이크로태스크를 흘린다.
    for (let i = 0; i < 6; i += 1) {
      await Promise.resolve();
    }

    expect(mockPlayer.replace).toHaveBeenCalledWith(ling6SoundOf("a").audio);
    expect(mockPlayer.play).toHaveBeenCalled();

    emitFinished();
    await expect(done).resolves.toBeUndefined();
  });

  /**
   * 이 길이가 소리 파일과 다르면 길이만으로 「못 들었어요」를 골라낼 수 있다.
   * 파일은 `scripts/prep-ling6-wav.mjs`가 모두 같은 길이로 맞춰 둔다.
   */
  it("무음 시행은 소리와 같은 길이만큼 기다린다", async () => {
    jest.useFakeTimers();

    let ended = false;
    const done = playLing6Target("silence").then(() => {
      ended = true;
    });

    jest.advanceTimersByTime(LING6_DURATION_SEC * 1000 - 1);
    await Promise.resolve();
    expect(ended).toBe(false);

    jest.advanceTimersByTime(1);
    await done;
    expect(ended).toBe(true);
    // 무음은 파일을 건드리지 않는다.
    expect(mockPlayer.replace).not.toHaveBeenCalled();
  });

  it("중지하면 기다리던 무음이 바로 끝난다", async () => {
    jest.useFakeTimers();
    const done = playLing6Target("silence");
    stopLing6Playback();
    await expect(done).resolves.toBeUndefined();
  });
});
