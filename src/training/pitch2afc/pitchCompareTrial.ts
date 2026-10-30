import { playPureTone, stopPureTone } from '@/audio/pureTone';

import { AUDIO } from './constants';

/**
 * 「높낮이 비교」 자극 재생 — 기준음 A → 목표음 B 두 톤을 이어 낸다.
 *
 * A는 항상 `baseHz`, B는 계단 엔진이 정한 `targetHz`(기준 ± cent).
 * 과제: B가 A보다 높은지/낮은지 고르기(2택).
 */

/**
 * 재생 게인.
 * 트랙 상수 `AUDIO.PEAK_GAIN_WAVE`(0.4)를 쓰지 않는다 — 사용자가 듣기 준비에서
 * 맞춘 볼륨(`pureTone` 기본 0.15)과 어긋나면 훈련이 갑자기 커진다.
 * 청취 확인과 같은 게인을 유지해 세션 간 비교 가능성을 지킨다.
 */
const PLAY_GAIN = 0.15;

export type PlayPitchPairOptions = {
  /** true면 재생 루프 즉시 중단(ABORTED throw). */
  shouldAbort?: () => boolean;
};

/** 중단 신호를 폴링하며 대기. `freqAfcTrial`과 동일한 방식. */
function sleep(ms: number, shouldAbort?: () => boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    if (shouldAbort?.()) {
      reject(new Error('ABORTED'));
      return;
    }
    const started = Date.now();
    const tick = () => {
      if (shouldAbort?.()) {
        reject(new Error('ABORTED'));
        return;
      }
      const left = ms - (Date.now() - started);
      if (left <= 0) {
        resolve();
        return;
      }
      setTimeout(tick, Math.min(50, left));
    };
    setTimeout(tick, Math.min(50, ms));
  });
}

function abortIfNeeded(shouldAbort?: () => boolean): void {
  if (shouldAbort?.()) {
    stopPureTone();
    throw new Error('ABORTED');
  }
}

/**
 * A → (묵음) → B 를 순서대로 재생한다.
 * 재생 중 입력은 화면에서 막는다(자극을 다 들은 뒤에만 답).
 */
export async function playPitchPair(
  baseHz: number,
  targetHz: number,
  options: PlayPitchPairOptions = {},
): Promise<void> {
  const shouldAbort = options.shouldAbort;

  abortIfNeeded(shouldAbort);
  await playPureTone({
    frequencyHz: baseHz,
    durationSec: AUDIO.TONE_DURATION,
    gain: PLAY_GAIN,
    rampSec: AUDIO.ATTACK_TIME,
  });

  abortIfNeeded(shouldAbort);
  if (AUDIO.GAP_DURATION > 0) {
    await sleep(Math.round(AUDIO.GAP_DURATION * 1000), shouldAbort);
  }

  abortIfNeeded(shouldAbort);
  await playPureTone({
    frequencyHz: targetHz,
    durationSec: AUDIO.TONE_DURATION,
    gain: PLAY_GAIN,
    rampSec: AUDIO.RELEASE_TIME,
  });

  abortIfNeeded(shouldAbort);
}

/** 진행 중인 재생을 즉시 끊는다(중단 경로). */
export function abortPitchPlayback(): void {
  stopPureTone();
}
