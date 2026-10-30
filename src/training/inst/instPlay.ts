import { createAudioPlayer, type AudioPlayer } from "expo-audio";

import { instSoundOf } from "@/training/inst/instSounds";
import type { InstTrial } from "@/training/inst/instSession";

/**
 * 악기 자극 재생 — 훈련 쪽 창구.
 *
 * 합성(구 `@/audio/instrumentTone`)을 걷어내고 **실물 연주 녹음 wav**를 튼다.
 * 링 6가 같은 이유로 같은 길을 갔다(`ling6Play.ts`) — 하모닉 합성으로는 「피아노
 * 같은 소리」까지는 가도 「피아노」가 안 된다. 음원 16개는 `instSounds.ts`에 있다.
 *
 * 화면·세션은 이 교체에 손대지 않았다. 바뀐 것은 이 파일과 `instSounds.ts`뿐이다.
 */

/**
 * 첫 자극 앞 뜸(ms). 링 6·문장 듣기와 같은 이유 — 시작 직후 소리가 바로 나면
 * 들을 준비를 할 새가 없다. 두 번째부터는 「고르기 → 다음」 사이가 이미 있다.
 */
export const INST_FIRST_LEAD_MS = 700;

let player: AudioPlayer | null = null;
let playGen = 0;
let pendingResolve: (() => void) | null = null;

export async function waitInstLeadIn(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, INST_FIRST_LEAD_MS);
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

/** 진행 중인 재생을 끊는다. 중지·이탈 경로이므로 오류가 아니다. */
export function stopInstPlayback(): void {
  playGen += 1;
  player?.pause();
  resolvePending();
}

/** 한 시행 재생. 끝나거나 중지되면 resolve. */
export async function playInstTrial(trial: InstTrial): Promise<void> {
  stopInstPlayback();
  const gen = playGen;

  const current = ensurePlayer();
  current.replace(instSoundOf(trial.target, trial.note));
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
