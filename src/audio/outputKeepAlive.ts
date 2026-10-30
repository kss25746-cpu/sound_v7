import {
  createAudioPlayer,
  type AudioPlayer,
  type AudioSource,
} from "expo-audio";

import { getMusicVolumeDb, subscribeMusicVolumeDb } from "@/audio/outputVolume";

/**
 * **출력 장치 킵얼라이브 — 화면들이 함께 쓰는 하나.**
 *
 * 들리지 않을 만큼 작은 잡음 WAV를 루프로 흘려 **출력 장치가 잠들지 않게** 붙잡는다.
 * 소리를 내려는 것이 아니다.
 *
 * 왜 필요한가 (2026-10-15 실기기 확정, 정본 `docs/이어폰-앞부분잘림_2026-10-15.md`):
 * 유선 이어폰을 꽂으면 한 글자·두 글자·빙고(TTS)와 문장 듣기(WAV)가 **앞부분이 잘리고 싱크가
 * 어긋났다.** 이어폰을 빼고 폰 스피커로 들으면 전부 정상이었다. 서로 다른 두 엔진(TTS 프로세스 ·
 * expo-audio)이 같이 망가졌으므로 범인은 둘이 공유하는 **출력 경로**다. 소리가 몇 초 끊기면
 * 이어폰 쪽 출력(USB-C DAC · 출력 스트림)이 절전으로 내려가고, 다음 소리가 들어와 깨어나는
 * 0.1~0.5초 사이에 앞부분이 사라진다. 장치가 깨어 있으면 TTS도 같은 장치로 나가므로 같이 산다.
 *
 * **여러 화면이 동시에 붙잡을 수 있다(참조 카운트).** 탭은 마운트된 채 남고 포커스가 겹치는
 * 순간이 있어서, 불리언 하나로 두면 먼저 떠나는 화면이 다른 화면의 킵얼라이브까지 꺼 버린다.
 * 화면은 직접 부르지 말고 `useOutputKeepAlive()`를 쓴다.
 *
 * 대가: 붙잡는 동안 AudioTrack 1개와 `doNotMix` 오디오 포커스를 계속 쥔다(= 바깥 앱 소리가
 * 멈춘다). 훈련 중 바깥 소리를 끊는 것이 이 앱의 정책이라 받아들인다. 대신 **화면을 떠날 때와
 * 백그라운드에서는 반드시 끈다.**
 *
 * TTS와의 관계: 삼성 TTS는 오디오 포커스를 가져가지 않고, 이 루프와 **같은 출력 스레드**
 * (deep-buffer)에 얹혀 나간다. 단어마다 출력이 다시 열리지 않는다(2026-10-15 logcat 확인).
 *
 * **볼륨 보정 (2026-10-15 실기기):** 붙잡아 둬도 이어폰 DAC가 잡음을 무음으로 보면 스스로
 * 음소거해서 앞부분이 다시 잘린다. 미디어 볼륨은 이 잡음도 같이 줄이므로, 볼륨이 낮을수록
 * DAC 기준선 밑으로 떨어진다(−66dBFS 파일: 최대 볼륨에서만 해결 · −56dBFS: 중간부터 해결).
 * 그래서 미디어 볼륨 감쇠(dB)를 읽어 `player.volume`으로 되돌려, DAC에 닿는 잡음을 볼륨과
 * 상관없이 `TARGET_AT_DAC_DB`로 맞춘다. 높은 볼륨에서는 오히려 예전보다 조용해진다.
 */

/**
 * 48kHz · 모노 · 2초, 백색 잡음 RMS −36dBFS, 루프 이음새 앞뒤 5ms 페이드.
 * 그대로 틀면 들린다 — **반드시 `player.volume`으로 줄여서 쓴다**(`keepAliveVolume`).
 *
 * 완전 무음(전부 0 샘플)이 아닌 이유: 일부 이어폰 DAC·앰프는 디지털 무음이 이어지면 스스로 꺼진다.
 * 0 샘플 루프는 앱 안의 포커스·스트림은 붙잡아도 그 절전은 못 막는다.
 */
const KEEP_ALIVE_SOURCE = require("@/assets/audio/keepalive-noise.wav") as AudioSource;
const SOURCE_RMS_DB = -36;

/**
 * DAC에 닿을 잡음 크기(dBFS). 실측 기준선: −56dBFS 파일 × 중간 볼륨(≈ −25dB) ≈ −81에서 해결.
 * 여유 3dB를 더했다. 잘림이 남으면 올리고, 잡음이 거슬리면 내린다.
 */
export const TARGET_AT_DAC_DB = -78;

/**
 * 미디어 볼륨 감쇠 `volumeDb`(0 = 최대)에서 플레이어에 줄 볼륨(0~1).
 * 감쇠를 모르면 최대 볼륨(0dB)으로 가정한다 — 가장 작게 틀어 들릴 위험을 없앤다.
 */
export function keepAliveVolume(volumeDb: number | null): number {
  const attenuation = volumeDb !== null && !Number.isNaN(volumeDb) ? Math.min(0, volumeDb) : 0;
  const gainDb = TARGET_AT_DAC_DB - SOURCE_RMS_DB - attenuation;
  return Math.min(1, Math.max(0, Math.pow(10, gainDb / 20)));
}

let player: AudioPlayer | null = null;
/** 지금 붙잡고 있는 화면 수 */
let holders = 0;
/** 앱이 백그라운드에 있는가. 있으면 붙잡은 화면이 있어도 끈다 */
let suspended = false;
/** 재생 중에만 볼륨 변경을 듣는다 */
let unsubscribeVolume: (() => void) | null = null;

function setPlayerVolume(volumeDb: number | null): void {
  if (player) {
    player.volume = keepAliveVolume(volumeDb);
  }
}

function apply(): void {
  const shouldPlay = holders > 0 && !suspended;
  try {
    if (!shouldPlay) {
      unsubscribeVolume?.();
      unsubscribeVolume = null;
      player?.pause();
      return;
    }
    if (!player) {
      // 루프는 상태를 볼 일이 없다 — 기본 0.5초 간격 상태 이벤트가 계속 올라오지 않게 늘린다
      player = createAudioPlayer(KEEP_ALIVE_SOURCE, { updateInterval: 60_000 });
      player.loop = true;
    }
    // 틀기 전에 볼륨부터 — 원본은 들리는 크기다
    setPlayerVolume(getMusicVolumeDb());
    unsubscribeVolume ??= subscribeMusicVolumeDb(setPlayerVolume);
    player.play();
  } catch (error) {
    console.warn("outputKeepAlive: 전환 실패", error);
  }
}

/**
 * 킵얼라이브를 붙잡는다. 돌려받은 함수로 놓는다(여러 번 불러도 한 번만 센다).
 */
export function holdOutputKeepAlive(): () => void {
  holders += 1;
  apply();

  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    holders = Math.max(0, holders - 1);
    apply();
  };
}

/**
 * 백그라운드 게이트. `audio-manager.tsx`의 AppState 게이트 **한 곳에서만** 부른다.
 * 포그라운드로 돌아오면 붙잡은 화면이 남아 있을 때만 되살린다.
 */
export function setOutputKeepAliveSuspended(next: boolean): void {
  suspended = next;
  apply();
}

/** 앱 종료 시 플레이어를 반납한다. */
export function releaseOutputKeepAlivePlayer(): void {
  unsubscribeVolume?.();
  unsubscribeVolume = null;
  if (!player) {
    return;
  }
  try {
    player.remove();
  } catch {
    /* 이미 해제됨 */
  }
  player = null;
}

/** 테스트 전용: 모듈 상태를 처음으로 되돌린다. */
export function resetOutputKeepAliveForTest(): void {
  releaseOutputKeepAlivePlayer();
  holders = 0;
  suspended = false;
}
