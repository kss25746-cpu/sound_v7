import { createAudioPlayer, type AudioPlayer } from "expo-audio";

import { ling6SoundOf, type Ling6Choice } from "@/training/ling6/sounds";

/**
 * 링 6 자극 재생. 합성(구 `ling6Synth.ts`)을 걷어내고 녹음 wav를 튼다 —
 * 사인 2개·흰잡음 근사는 정상 청력에도 맞추기 어려운 품질 문제였다.
 *
 * `주의`: 지금 음원은 웹에서 받은 **개인 확인용** 임시본이다. 배포 전에
 * 직접 녹음으로 갈아야 한다. 파일만 바꾸면 이 모듈은 그대로 쓴다.
 */

/**
 * 자극 한 토막 길이(초). `scripts/prep-ling6-wav.mjs`가 여섯 파일을 이 길이로
 * 맞춰 놓았다. **무음 시행도 같은 길이로 기다린다** — 다르면 길이만으로
 * 「못 들었어요」를 골라낼 수 있다.
 */
export const LING6_DURATION_SEC = 1.0;

/**
 * 첫 자극 앞 뜸(ms). 단어·문장 듣기와 같은 이유 — 시작 직후 소리가 바로
 * 나면 들을 준비를 할 새가 없다. 두 번째부터는 「고르기 → 다음」 사이에
 * 이미 사이가 있어 두지 않는다.
 */
export const LING6_FIRST_LEAD_MS = 700;

let player: AudioPlayer | null = null;
let playGen = 0;
let silenceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingResolve: (() => void) | null = null;

export async function waitLing6LeadIn(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, LING6_FIRST_LEAD_MS);
  });
}

function ensurePlayer(): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(null, { updateInterval: 100 });
  }
  return player;
}

function resolvePending(): void {
  const resolve = pendingResolve;
  pendingResolve = null;
  resolve?.();
}

/** 진행 중인 재생·무음 대기를 끊는다. 중지·이탈 경로이므로 오류가 아니다. */
export function stopLing6Playback(): void {
  playGen += 1;
  if (silenceTimer !== null) {
    clearTimeout(silenceTimer);
    silenceTimer = null;
  }
  player?.pause();
  resolvePending();
}

function waitSilence(gen: number): Promise<void> {
  const ended = new Promise<void>((resolve) => {
    pendingResolve = resolve;
  });
  silenceTimer = setTimeout(() => {
    silenceTimer = null;
    if (gen === playGen) {
      resolvePending();
    }
  }, LING6_DURATION_SEC * 1000);
  return ended;
}

/** 한 시행 재생. `silence`는 소리 파일과 같은 길이만큼 기다린다. */
export async function playLing6Target(target: Ling6Choice): Promise<void> {
  stopLing6Playback();
  const gen = playGen;

  if (target === "silence") {
    await waitSilence(gen);
    return;
  }

  const current = ensurePlayer();
  current.replace(ling6SoundOf(target).audio);
  await current.seekTo(0);
  if (gen !== playGen) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const finish = (): void => {
      subscription.remove();
      resolve();
    };
    const subscription = current.addListener(
      "playbackStatusUpdate",
      (status) => {
        if (gen !== playGen) {
          finish();
          return;
        }
        if (status.error) {
          subscription.remove();
          reject(new Error(status.error));
          return;
        }
        if (status.didJustFinish) {
          finish();
        }
      },
    );
    current.play();
  });
}
