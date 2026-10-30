import {
  AudioContext,
  GainNode,
  OscillatorNode,
} from 'react-native-audio-api';

import {
  DEFAULT_DURATION_SEC,
  DEFAULT_GAIN,
  DEFAULT_RAMP_SEC,
} from '@/audio/pureTone';

/** 설계 §5·§6 예: 반송파 1 kHz. 제품 확정 아님. */
export const DEFAULT_CARRIER_HZ = 1000;

/** 설계 §5 예: 4/8/16 Hz 중 중간. 제품 확정 아님. */
export const DEFAULT_MOD_HZ = 8;

/**
 * m → dB = 20·log₁₀ m. m=1 → 0 dB(가장 쉬움).
 * 계단식이 조절하는 축(설계 §6).
 */
export function depthDbFromM(m: number): number {
  if (!Number.isFinite(m) || m <= 0) {
    throw new RangeError(`m must be a positive finite number: ${m}`);
  }
  return 20 * Math.log10(m);
}

export function mFromDepthDb(depthDb: number): number {
  if (!Number.isFinite(depthDb) || depthDb > 0) {
    throw new RangeError(`depthDb must be finite and ≤ 0: ${depthDb}`);
  }
  return 10 ** (depthDb / 20);
}

/**
 * 정현 AM (1+m·sin) 구간의 RMS 보정 배율.
 * 변조로 커진 파워를 기준(무변조)에 맞춤 — 설계 §5 RMS 등화.
 */
export function rmsEqualizeScale(m: number): number {
  if (!Number.isFinite(m) || m < 0) {
    throw new RangeError(`m must be a non-negative finite number: ${m}`);
  }
  return 1 / Math.sqrt(1 + (m * m) / 2);
}

export type PlayAmToneOptions = {
  carrierHz?: number;
  /** 변조 깊이 0~1. 0이면 무변조(순수 반송파). */
  m?: number;
  modHz?: number;
  durationSec?: number;
  /** 무변조 기준 피크 리니어 게인(게이트 피크). */
  gain?: number;
  rampSec?: number;
  /** false면 RMS 등화 끔(테스트용). 기본 true. */
  equalizeRms?: boolean;
};

let sharedContext: AudioContext | null = null;
let activeCarrier: OscillatorNode | null = null;
let activeModulator: OscillatorNode | null = null;
let activeNodes: GainNode[] = [];
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

function disconnectAll(): void {
  const carrier = activeCarrier;
  const modulator = activeModulator;
  const nodes = activeNodes;
  activeCarrier = null;
  activeModulator = null;
  activeNodes = [];

  for (const n of nodes) {
    try {
      n.disconnect();
    } catch {
      // already disconnected
    }
  }
  try {
    carrier?.disconnect();
  } catch {
    // already disconnected
  }
  try {
    modulator?.disconnect();
  } catch {
    // already disconnected
  }
}

/** 진행 중인 AM/반송파가 있으면 즉시 끊는다(클릭 가능 — 중단 경로). */
export function stopAmTone(): void {
  const carrier = activeCarrier;
  const modulator = activeModulator;
  const gate = activeNodes.at(-1) ?? null;

  if (!carrier && !modulator && activeNodes.length === 0) {
    resolvePendingPlay();
    return;
  }

  try {
    const ctx = sharedContext;
    const now = ctx?.currentTime ?? 0;
    if (gate && ctx) {
      gate.gain.cancelScheduledValues(now);
      gate.gain.setValueAtTime(gate.gain.value, now);
      gate.gain.linearRampToValueAtTime(0, now + 0.01);
    }
    carrier?.stop(now + 0.015);
    modulator?.stop(now + 0.015);
  } catch {
    // already stopped
  }

  disconnectAll();
  resolvePendingPlay();
}

/**
 * 반송파 + (선택) 정현 AM 1회.
 * carrier → amGain → gateGain → destination.
 * modulator → depthGain → amGain.gain (오프셋 A 유지 → 진짜 AM, 링 모듈레이션 아님).
 * m≤1, 온셋/오프셋 게이팅, 기본 RMS 등화. SoundPool 미사용.
 */
export async function playAmTone(
  options: PlayAmToneOptions = {}
): Promise<void> {
  const carrierHz = options.carrierHz ?? DEFAULT_CARRIER_HZ;
  const m = options.m ?? 0;
  const modHz = options.modHz ?? DEFAULT_MOD_HZ;
  const durationSec = options.durationSec ?? DEFAULT_DURATION_SEC;
  const peakGain = options.gain ?? DEFAULT_GAIN;
  const rampSec = options.rampSec ?? DEFAULT_RAMP_SEC;
  const equalizeRms = options.equalizeRms ?? true;

  if (!Number.isFinite(carrierHz) || carrierHz <= 0) {
    throw new RangeError(`carrierHz must be a positive finite number: ${carrierHz}`);
  }
  if (!Number.isFinite(m) || m < 0 || m > 1) {
    throw new RangeError(`m must be in [0, 1]: ${m}`);
  }
  if (!Number.isFinite(modHz) || modHz <= 0) {
    throw new RangeError(`modHz must be a positive finite number: ${modHz}`);
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
  stopAmTone();

  const scale = equalizeRms && m > 0 ? rmsEqualizeScale(m) : 1;
  const A = peakGain * scale;

  const carrier = ctx.createOscillator();
  carrier.type = 'sine';
  carrier.frequency.value = carrierHz;

  const amGain = ctx.createGain();
  // DC 오프셋(+1 역할). depthGain이 A·m·sin을 더함 → A·(1+m·sin).
  amGain.gain.value = A;

  const gateGain = ctx.createGain();
  const t0 = ctx.currentTime;
  const maxRamp = Math.min(rampSec, durationSec / 3);
  const tPeak = t0 + maxRamp;
  const tRelease = t0 + Math.max(durationSec - maxRamp, maxRamp);
  const tEnd = t0 + durationSec;

  gateGain.gain.setValueAtTime(0, t0);
  gateGain.gain.linearRampToValueAtTime(1, tPeak);
  gateGain.gain.setValueAtTime(1, tRelease);
  gateGain.gain.linearRampToValueAtTime(0, tEnd);

  carrier.connect(amGain);
  amGain.connect(gateGain);
  gateGain.connect(ctx.destination);

  let modulator: OscillatorNode | null = null;
  let depthGain: GainNode | null = null;

  if (m > 0) {
    modulator = ctx.createOscillator();
    modulator.type = 'sine';
    modulator.frequency.value = modHz;

    depthGain = ctx.createGain();
    depthGain.gain.value = A * m;

    modulator.connect(depthGain);
    depthGain.connect(amGain.gain);
  }

  activeCarrier = carrier;
  activeModulator = modulator;
  activeNodes = [amGain, gateGain, ...(depthGain ? [depthGain] : [])];

  const ended = new Promise<void>((resolve) => {
    pendingResolve = resolve;
  });

  carrier.onEnded = () => {
    const isCurrent = activeCarrier === carrier;
    if (isCurrent) {
      try {
        modulator?.stop();
      } catch {
        // already stopped
      }
      disconnectAll();
      resolvePendingPlay();
    }
  };

  carrier.start(t0);
  carrier.stop(tEnd + 0.02);
  if (modulator) {
    modulator.start(t0);
    modulator.stop(tEnd + 0.02);
  }

  await ended;
}

export async function closeAmToneContext(): Promise<void> {
  stopAmTone();
  if (sharedContext) {
    await sharedContext.close();
    sharedContext = null;
  }
}
