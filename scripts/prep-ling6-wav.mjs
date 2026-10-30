/**
 * 링 6 원본 wav를 연습용으로 다듬는다. `node scripts/prep-ling6-wav.mjs`
 *
 * 원본(`mm/oo/ah/ee/sh/s.wav`)은 길이 2.9~3.6초·피크 3배 차이라
 * 길이와 크기가 힌트가 된다. 여섯 개를 같은 길이·같은 RMS로 맞춰
 * 그림과 같은 번호(`001~006.wav`)로 내보낸다. (원본이 이미 모노라면 그대로,
 * 스테레오면 채널을 평균해 모노로 만든다.)
 *
 * 표본율은 원본(48 kHz)을 그대로 둔다 — 링 6 최고역 /s/에 충분하고,
 * 리샘플은 품질을 얻는 게 아니라 잃을 쪽이다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIR = join(ROOT, "assets", "ling6");

/**
 * 그림 번호 ↔ 원본 파일. `sounds.ts`의 순서와 같다.
 * `gainScale`은 RMS 정규화 뒤에 한 번 더 곱하는 소리별 배율(기본 1).
 * 마찰음(/ʃ/·/s/)은 자연 발화가 모음보다 작다 — RMS로 억지로 키우면
 * 배경 잡음까지 커지고 귀에 과하게 들린다. 그래서 005·006만 낮춘다.
 */
const SOURCES = [
  { out: "001.wav", src: "mm.wav", id: "m", gainScale: 1 },
  { out: "002.wav", src: "oo.wav", id: "u", gainScale: 1 },
  { out: "003.wav", src: "ah.wav", id: "a", gainScale: 1 },
  { out: "004.wav", src: "ee.wav", id: "i", gainScale: 1 },
  { out: "005.wav", src: "sh.wav", id: "sh", gainScale: 0.5 },
  { out: "006.wav", src: "s.wav", id: "s", gainScale: 0.5 },
];

/** 여섯 개 공통 길이(초). 표준 링 6는 발화 길이를 같게 하라고 한다. */
const BODY_SEC = 1.0;
/** 온셋·오프셋 게이팅. 딸깍 소리를 막는다. */
const FADE_SEC = 0.03;
/** 소리의 시작·끝 판정 기준(피크 대비). */
const GATE_RATIO = 0.05;
/** 목표 RMS(-20 dBFS). 크기를 여섯 개 모두 같게 맞춘다. */
const TARGET_RMS = 0.1;
/** 정규화 뒤 피크 상한. 넘으면 전체를 낮춘다(클리핑 방지). */
const PEAK_CEILING = 0.9;

function readChunks(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF") {
    throw new Error("RIFF가 아님");
  }
  const chunks = {};
  let at = 12;
  while (at + 8 <= buf.length) {
    const id = buf.toString("ascii", at, at + 4);
    const size = buf.readUInt32LE(at + 4);
    chunks[id] = { start: at + 8, size };
    at += 8 + size + (size % 2);
  }
  return chunks;
}

/** 16bit PCM만 다룬다. 원본이 그 형식이라 변환기를 더 만들지 않는다. */
function toMonoFloat(buf) {
  const chunks = readChunks(buf);
  const fmt = chunks["fmt "];
  const data = chunks.data;
  if (!fmt || !data) {
    throw new Error("fmt/data 청크 없음");
  }
  const channels = buf.readUInt16LE(fmt.start + 2);
  const sampleRate = buf.readUInt32LE(fmt.start + 4);
  const bits = buf.readUInt16LE(fmt.start + 14);
  if (bits !== 16) {
    throw new Error(`16bit만 지원 (${bits}bit)`);
  }

  const frames = Math.floor(data.size / (2 * channels));
  const mono = new Float32Array(frames);
  for (let i = 0; i < frames; i += 1) {
    let sum = 0;
    for (let c = 0; c < channels; c += 1) {
      sum += buf.readInt16LE(data.start + (i * channels + c) * 2) / 32768;
    }
    mono[i] = sum / channels;
  }
  return { mono, sampleRate };
}

/** 앞뒤 무음을 걷어낸 구간. 무음은 코드가 기다리므로 파일에 남기지 않는다. */
function soundRegion(samples) {
  let peak = 0;
  for (const v of samples) {
    peak = Math.max(peak, Math.abs(v));
  }
  const gate = peak * GATE_RATIO;
  let first = -1;
  let last = -1;
  for (let i = 0; i < samples.length; i += 1) {
    if (Math.abs(samples[i]) > gate) {
      if (first < 0) {
        first = i;
      }
      last = i;
    }
  }
  return { first: Math.max(first, 0), last: last < 0 ? samples.length - 1 : last };
}

function shapeToFixedLength(samples, sampleRate) {
  const { first, last } = soundRegion(samples);
  const want = Math.round(BODY_SEC * sampleRate);
  const out = new Float32Array(want);
  const have = Math.min(want, last - first + 1);
  out.set(samples.subarray(first, first + have));

  const fade = Math.min(Math.round(FADE_SEC * sampleRate), Math.floor(have / 2));
  for (let i = 0; i < fade; i += 1) {
    const g = i / fade;
    out[i] *= g;
    out[have - 1 - i] *= g;
  }
  return out;
}

function normalize(samples, gainScale = 1) {
  let sum = 0;
  for (const v of samples) {
    sum += v * v;
  }
  const rms = Math.sqrt(sum / samples.length);
  let gain = (rms > 0 ? TARGET_RMS / rms : 1) * gainScale;

  let peak = 0;
  for (const v of samples) {
    peak = Math.max(peak, Math.abs(v));
  }
  if (peak * gain > PEAK_CEILING) {
    gain = PEAK_CEILING / peak;
  }

  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    out[i] = samples[i] * gain;
  }
  return { out, gain, rms };
}

function writeMonoWav(samples, sampleRate) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  return buf;
}

for (const { out, src, id, gainScale } of SOURCES) {
  const { mono, sampleRate } = toMonoFloat(readFileSync(join(DIR, src)));
  const shaped = shapeToFixedLength(mono, sampleRate);
  const { out: leveled, gain } = normalize(shaped, gainScale);
  writeFileSync(join(DIR, out), writeMonoWav(leveled, sampleRate));

  let peak = 0;
  for (const v of leveled) {
    peak = Math.max(peak, Math.abs(v));
  }
  console.log(
    `${src} -> ${out} (${id})  ${sampleRate}Hz mono ${BODY_SEC}s` +
      `  gain=${gain.toFixed(2)} peak=${peak.toFixed(3)}`,
  );
}
