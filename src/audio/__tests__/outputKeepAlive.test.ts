import { createAudioPlayer } from "expo-audio";

import {
  holdOutputKeepAlive,
  keepAliveVolume,
  releaseOutputKeepAlivePlayer,
  resetOutputKeepAliveForTest,
  setOutputKeepAliveSuspended,
  TARGET_AT_DAC_DB,
} from "@/audio/outputKeepAlive";
import { getMusicVolumeDb, subscribeMusicVolumeDb } from "@/audio/outputVolume";

jest.mock("@/audio/outputVolume", () => ({
  getMusicVolumeDb: jest.fn(() => null),
  subscribeMusicVolumeDb: jest.fn(() => jest.fn()),
}));

type MockPlayer = {
  play: jest.Mock;
  pause: jest.Mock;
  remove: jest.Mock;
  loop?: boolean;
  volume?: number;
};

const createMock = createAudioPlayer as unknown as jest.Mock;
const getDbMock = getMusicVolumeDb as jest.Mock;
const subscribeMock = subscribeMusicVolumeDb as jest.Mock;

/** 원본 잡음(−36dBFS)이 볼륨 v, 미디어 감쇠 db를 거쳐 DAC에 닿는 크기 */
function levelAtDac(v: number, db: number): number {
  return -36 + 20 * Math.log10(v) + db;
}

function lastPlayer(): MockPlayer {
  return createMock.mock.results[createMock.mock.results.length - 1]
    .value as MockPlayer;
}

beforeEach(() => {
  resetOutputKeepAliveForTest();
  createMock.mockClear();
  getDbMock.mockReset().mockReturnValue(null);
  subscribeMock.mockReset().mockImplementation(() => jest.fn());
});

describe("keepAliveVolume", () => {
  it.each([0, -10, -25, -40])("미디어 감쇠 %idB에서도 DAC에 닿는 크기는 목표값", (db) => {
    expect(levelAtDac(keepAliveVolume(db), db)).toBeCloseTo(TARGET_AT_DAC_DB, 6);
  });

  it("감쇠를 모르면 최대 볼륨으로 가정해 가장 작게 튼다", () => {
    expect(keepAliveVolume(null)).toBeCloseTo(keepAliveVolume(0), 10);
  });

  it("보정이 원본보다 크게 만들 수는 없다(1에서 멈춤)", () => {
    expect(keepAliveVolume(-80)).toBe(1);
    expect(keepAliveVolume(-Infinity)).toBe(1);
  });
});

describe("outputKeepAlive", () => {
  it("붙잡으면 루프 플레이어를 하나 만들어 튼다", () => {
    holdOutputKeepAlive();
    expect(createMock).toHaveBeenCalledTimes(1);
    const player = lastPlayer();
    expect(player.loop).toBe(true);
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it("여러 화면이 붙잡으면 마지막 화면이 놓을 때만 멈춘다", () => {
    const releaseA = holdOutputKeepAlive();
    const releaseB = holdOutputKeepAlive();
    expect(createMock).toHaveBeenCalledTimes(1);
    const player = lastPlayer();

    releaseA();
    expect(player.pause).not.toHaveBeenCalled();

    releaseB();
    expect(player.pause).toHaveBeenCalledTimes(1);
  });

  it("같은 release를 두 번 불러도 한 번만 센다", () => {
    const releaseA = holdOutputKeepAlive();
    holdOutputKeepAlive();
    const player = lastPlayer();

    releaseA();
    releaseA();
    expect(player.pause).not.toHaveBeenCalled();
  });

  it("백그라운드에서는 멈추고, 돌아오면 붙잡은 화면이 있을 때만 되살린다", () => {
    const release = holdOutputKeepAlive();
    const player = lastPlayer();
    player.play.mockClear();

    setOutputKeepAliveSuspended(true);
    expect(player.pause).toHaveBeenCalledTimes(1);

    setOutputKeepAliveSuspended(false);
    expect(player.play).toHaveBeenCalledTimes(1);

    release();
    player.play.mockClear();
    setOutputKeepAliveSuspended(true);
    setOutputKeepAliveSuspended(false);
    expect(player.play).not.toHaveBeenCalled();
  });

  it("백그라운드 중에 진입한 화면은 돌아올 때 튼다", () => {
    setOutputKeepAliveSuspended(true);
    holdOutputKeepAlive();
    expect(createMock).not.toHaveBeenCalled();

    setOutputKeepAliveSuspended(false);
    expect(lastPlayer().play).toHaveBeenCalledTimes(1);
  });

  it("틀기 전에 지금 볼륨으로 보정하고, 볼륨이 바뀌면 다시 맞춘다", () => {
    getDbMock.mockReturnValue(-25);
    holdOutputKeepAlive();
    const player = lastPlayer();
    expect(player.volume).toBeCloseTo(keepAliveVolume(-25), 10);

    expect(subscribeMock).toHaveBeenCalledTimes(1);
    const listener = subscribeMock.mock.calls[0][0] as (db: number | null) => void;
    listener(-10);
    expect(player.volume).toBeCloseTo(keepAliveVolume(-10), 10);
  });

  it("멈추면 볼륨 구독을 끊고, 다시 틀면 한 번만 구독한다", () => {
    const unsubscribe = jest.fn();
    subscribeMock.mockImplementation(() => unsubscribe);
    const releaseA = holdOutputKeepAlive();
    holdOutputKeepAlive();
    expect(subscribeMock).toHaveBeenCalledTimes(1);

    setOutputKeepAliveSuspended(true);
    expect(unsubscribe).toHaveBeenCalledTimes(1);

    setOutputKeepAliveSuspended(false);
    expect(subscribeMock).toHaveBeenCalledTimes(2);
    releaseA();
    expect(subscribeMock).toHaveBeenCalledTimes(2);
  });

  it("앱 종료 시 플레이어를 반납하고, 다시 붙잡으면 새로 만든다", () => {
    holdOutputKeepAlive();
    const first = lastPlayer();
    releaseOutputKeepAlivePlayer();
    expect(first.remove).toHaveBeenCalledTimes(1);

    holdOutputKeepAlive();
    expect(createMock).toHaveBeenCalledTimes(2);
  });
});
