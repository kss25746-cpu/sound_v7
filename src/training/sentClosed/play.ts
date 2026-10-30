import { createAudioPlayer, type AudioPlayer } from "expo-audio";

import { sceneOf, type SceneId } from "@/training/sentClosed/scenes";

let player: AudioPlayer | null = null;
let playGen = 0;

/** 첫 문장 앞 뜸. 단어 듣기와 같은 이유 — 시작 직후 소리가 바로 나면 놓친다. */
export const SENT_CLOSED_FIRST_LEAD_MS = 700;

export async function waitSentClosedLeadIn(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, SENT_CLOSED_FIRST_LEAD_MS);
  });
}

function ensurePlayer(): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(null, { updateInterval: 100 });
  }
  return player;
}

/** 듣는 중 중지·화면 이탈. 오류로 보지 않음. */
export function stopSentClosedPlayback(): void {
  playGen += 1;
  player?.pause();
}

/**
 * 장면 wav를 처음부터 재생하고, 끝나거나 중지되면 resolve.
 * 임시 TTS. 사람 녹음 교체 후에도 이 함수는 그대로 쓴다.
 */
export async function playSentClosedScene(id: SceneId): Promise<void> {
  stopSentClosedPlayback();
  const gen = playGen;
  const current = ensurePlayer();
  current.replace(sceneOf(id).audio);
  await current.seekTo(0);

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
