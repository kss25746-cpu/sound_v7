/**
 * 화면 테스트가 저장소를 **간접적으로** 끌고 오는 일이 흔하다.
 * (예: `WrsSessionScreen` → `StatsScreen` → `ling6Store` → AsyncStorage)
 * 네이티브 모듈이 없으면 그 자리에서 스위트가 통째로 넘어지므로 기본 목을 깔아 둔다.
 *
 * 저장소 단위 테스트는 각자 `jest.mock`으로 이 목을 덮어쓴다(그쪽이 이긴다).
 */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("react-native-safe-area-context", () => {
  const mock = require("react-native-safe-area-context/jest/mock");
  return mock.default ?? mock;
});

jest.mock("expo-audio", () => ({
  setAudioModeAsync: jest.fn(async () => undefined),
  setIsAudioActiveAsync: jest.fn(async () => undefined),
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    replace: jest.fn(),
    seekTo: jest.fn(async () => undefined),
    remove: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    currentTime: 0,
    duration: 1,
    volume: 1.0,
    playing: false,
    paused: true,
  })),
}));

jest.mock("react-native-audio-api", () => ({
  AudioContext: jest.fn().mockImplementation(() => ({
    state: "running",
    currentTime: 0,
    resume: jest.fn(async () => {}),
    close: jest.fn(async () => {}),
    createOscillator: jest.fn(() => ({
      type: "sine",
      frequency: { value: 440 },
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    })),
    createGain: jest.fn(() => ({
      gain: {
        value: 1,
        setValueAtTime: jest.fn(),
        linearRampToValueAtTime: jest.fn(),
        cancelScheduledValues: jest.fn(),
      },
      connect: jest.fn(),
      disconnect: jest.fn(),
    })),
    createStereoPanner: jest.fn(() => ({
      pan: { setValueAtTime: jest.fn() },
      connect: jest.fn(),
      disconnect: jest.fn(),
    })),
    destination: {},
  })),
  GainNode: jest.fn(),
  OscillatorNode: jest.fn(),
  StereoPannerNode: jest.fn(),
}));
