import { AudioContext, GainNode, OscillatorNode, StereoPannerNode } from 'react-native-audio-api';

/** HarmoniTune / 설계 문서 재사용 기준음 (A4). 임상 표준 인용 아님. */
export const DEFAULT_REFERENCE_HZ = 440;

/** 설계 §5: 온셋·오프셋 게이팅 권장 20~50 ms 중 중간값. 자극 스펙 미확정. */
export const DEFAULT_RAMP_SEC = 0.03;

/** 확인용 기본 지속시간(초). 세션 스펙 미확정. */
export const DEFAULT_DURATION_SEC = 0.5;

/** 청취 확인용 보수적 게인. dB FS 캘리브레이션 아님. */
export const DEFAULT_GAIN = 0.15;

export type PlayPureToneOptions = {
  frequencyHz?: number;
  durationSec?: number;
  /** 피크 리니어 게인 (0~1 권장). */
  gain?: number;
  rampSec?: number;
  /** 좌우 패닝 (-1: 왼쪽, 0: 중앙, 1: 오른쪽). */
  pan?: number;
};

let sharedContext: AudioContext | null = null;
let activeOscillator: OscillatorNode | null = null;
let activeGain: GainNode | null = null;
let activePanner: StereoPannerNode | null = null;
let pendingResolve: (() => void) | null = null;

function getContext(): AudioContext {
  if (!sharedContext) {
    sharedContext = new AudioContext();
  }
  return sharedContext;
}

async function ensureRunning(ctx: AudioContext): Promise<void> {
  if (ctx.state !== 'running') {
    await ctx.resume();
  }
}

function resolvePendingPlay(): void {
  const resolve = pendingResolve;
  pendingResolve = null;
  resolve?.();
}

/** 진행 중인 순음이 있으면 즉시 끊는다(클릭 가능 — 중단 경로). */
export function stopPureTone(): void {
  const osc = activeOscillator;
  const gain = activeGain;
  const panner = activePanner;
  activeOscillator = null;
  activeGain = null;
  activePanner = null;

  if (!osc && !gain && !panner) {
    resolvePendingPlay();
    return;
  }

  try {
    const ctx = sharedContext;
    const now = ctx?.currentTime ?? 0;
    if (gain && ctx) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.01);
    }
    osc?.stop(now + 0.015);
  } catch {
    // already stopped
  }

  try {
    osc?.disconnect();
  } catch {
    // already disconnected
  }
  try {
    gain?.disconnect();
  } catch {
    // already disconnected
  }
  try {
    panner?.disconnect();
  } catch {
    // already disconnected
  }

  resolvePendingPlay();
}

/**
 * sine 순음 1회 재생.
 * Oscillator → Gain(램핑) → (Panner) → destination. SoundPool 미사용.
 * Promise는 재생 종료(또는 stop) 시 resolve.
 */
export async function playPureTone(
  options: PlayPureToneOptions = {}
): Promise<void> {
  const frequencyHz = options.frequencyHz ?? DEFAULT_REFERENCE_HZ;
  const durationSec = options.durationSec ?? DEFAULT_DURATION_SEC;
  const peakGain = options.gain ?? DEFAULT_GAIN;
  const rampSec = options.rampSec ?? DEFAULT_RAMP_SEC;

  if (!Number.isFinite(frequencyHz) || frequencyHz <= 0) {
    throw new RangeError(`frequencyHz must be a positive finite number: ${frequencyHz}`);
  }
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new RangeError(`durationSec must be a positive finite number: ${durationSec}`);
  }
  if (!Number.isFinite(peakGain) || peakGain < 0) {
    throw new RangeError(`gain must be a non-negative finite number: ${peakGain}`);
  }
  if (!Number.isFinite(rampSec) || rampSec < 0) {
    throw new RangeError(`rampSec must be a non-negative finite number: ${rampSec}`);
  }

  const ctx = getContext();
  await ensureRunning(ctx);

  stopPureTone();

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = frequencyHz;

  const gain = ctx.createGain();
  const t0 = ctx.currentTime;
  // 지속시간이 짧으면 램핑을 줄여 피크 구간이 남도록 함.
  const maxRamp = Math.min(rampSec, durationSec / 3);
  const tPeak = t0 + maxRamp;
  const tRelease = t0 + Math.max(durationSec - maxRamp, maxRamp);
  const tEnd = t0 + durationSec;

  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peakGain, tPeak);
  gain.gain.setValueAtTime(peakGain, tRelease);
  gain.gain.linearRampToValueAtTime(0, tEnd);

  let panner: StereoPannerNode | null = null;
  if (typeof options.pan === 'number' && typeof ctx.createStereoPanner === 'function') {
    try {
      panner = ctx.createStereoPanner();
      const clampedPan = Math.max(-1, Math.min(1, options.pan));
      panner.pan.setValueAtTime(clampedPan, t0);
    } catch {
      panner = null;
    }
  }

  osc.connect(gain);
  if (panner) {
    gain.connect(panner);
    panner.connect(ctx.destination);
  } else {
    gain.connect(ctx.destination);
  }

  activeOscillator = osc;
  activeGain = gain;
  activePanner = panner;

  const ended = new Promise<void>((resolve) => {
    pendingResolve = resolve;
  });

  osc.onEnded = () => {
    const isCurrent = activeOscillator === osc;
    if (isCurrent) {
      activeOscillator = null;
      activeGain = null;
      activePanner = null;
    }
    try {
      osc.disconnect();
      gain.disconnect();
      panner?.disconnect();
    } catch {
      // already disconnected
    }
    // stopPureTone이 이미 resolve한 경우(교체·중단)에는 다시 resolve하지 않음.
    if (isCurrent) {
      resolvePendingPlay();
    }
  };

  osc.start(t0);
  osc.stop(tEnd + 0.02);

  await ended;
}

export async function closePureToneContext(): Promise<void> {
  stopPureTone();
  if (sharedContext) {
    await sharedContext.close();
    sharedContext = null;
  }
}
