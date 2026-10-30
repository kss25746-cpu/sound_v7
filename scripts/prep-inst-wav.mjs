/**
 * 악기 원본에서 16개 자극을 뽑아 다듬는다. `node scripts/prep-inst-wav.mjs`
 *
 * 원본(`.inst-src/`, `fetch-inst-src.mjs`가 받음)은 형식이 제각각이다 —
 * 피아노만 스테레오, 기타는 96kHz/24bit, 나머지는 44.1kHz 모노. 게다가 피아노만
 * 음별 파일이고 나머지 셋은 **한 파일에 반음계 여러 음**이 들어 있다.
 *
 * 그래서 세 단계로 간다:
 *
 * 1. **ffmpeg로 형식을 통일** — 모노 · 44.1kHz · 16bit wav.
 * 2. **무음으로 분절한 뒤 자기상관으로 기음을 잰다.** 순서로 세지 않는다 —
 *    감쇠가 중간에 무음 판정을 스치면 한 음이 둘로 쪼개져 순서가 밀린다.
 *    음높이로 찾으면 그래도 맞는 음을 집는다. 못 찾으면 **소리 없이 넘어가지 않고
 *    에러로 멈춘다** (틀린 음이 assets에 들어가는 게 제일 나쁘다).
 * 3. **길이·크기를 16개 모두 같게** 맞춰 `assets/inst/`에 쓴다.
 *
 * 길이와 크기를 맞추는 이유는 링 6와 같다 — 다르면 음색을 안 듣고 길이나 크기로
 * 고를 수 있다. 다만 **꼬리는 맞추지 않는다**: 피아노·기타는 1.6초 안에서 여운이
 * 남고 바이올린·플루트는 끝까지 이어진다. 그 차이가 이 과제가 구별하려는 것이다.
 *
 * 표본율 44.1kHz는 원본 다수에 맞춘 것이다(기타만 96kHz에서 내려온다).
 */
import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { SOURCES, SRC_DIR, noteHz } from "./inst-sources.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, SRC_DIR);
const WORK = join(SRC, "_wav");
const OUT = join(ROOT, "assets", "inst");

/** 한 음의 길이(초). `src/audio/instrumentTone.ts`의 `INSTRUMENT_NOTE_SEC`와 같아야 한다. */
const BODY_SEC = 1.6;
/** 시작 딸깍 방지. 3ms면 어택(때림·퉁김)의 성격은 안 뭉갠다. */
const FADE_IN_SEC = 0.003;
/** 1.6초에서 자를 때의 페이드. 바이올린·플루트는 여기서 끊긴다. */
const FADE_OUT_SEC = 0.08;
/**
 * 크기를 맞출 창의 길이(초). **가장 큰 300ms 구간**을 재서 그걸 맞춘다.
 *
 * 앞 300ms로 재면 안 된다 — 바이올린은 활이라 어택이 느려서 소리가 뒤에서 커진다.
 * 앞을 기준 삼으면 몸통이 다른 악기의 세 배가 되어 **음색이 아니라 크기로 고를 수** 있다.
 * 전체 RMS로 재도 안 된다 — 감쇠음(피아노·기타)은 뒤쪽이 거의 무음이라 손해를 본다.
 *
 * `가정`: 지속음이 감쇠음보다 여전히 조금 크게 들릴 수 있다. 그건 악기의 성질이라
 * 지우면 음색이 상한다. 정밀하게 맞추려면 EBU R128(LUFS)이 맞지만 1.6초짜리에는
 * 게이팅이 불안정하다. 실기기 청취에서 문제가 되면 그때 손본다.
 */
const LEVEL_WINDOW_SEC = 0.3;
/** 목표 RMS(-20 dBFS). 링 6(`prep-ling6-wav.mjs`)와 같은 값으로 둔다. */
const TARGET_RMS = 0.1;
/** 정규화 뒤 피크 상한(클리핑 방지). */
const PEAK_CEILING = 0.9;

/** 분절 — 프레임 RMS에 히스테리시스를 건다. 들어갈 때와 나올 때 문턱이 다르다. */
const FRAME = 512;
const ENTER_RATIO = 0.12;
const EXIT_RATIO = 0.03;
/** 이보다 짧은 토막은 버린다(잡음·활 스치는 소리). */
const MIN_SEG_SEC = 0.4;
/** 이보다 짧게 벌어진 두 토막은 한 음으로 붙인다(감쇠가 문턱을 스친 경우). */
const MERGE_GAP_SEC = 0.15;
/** 기음이 목표에서 이만큼 넘게 벗어나면 다른 음이다. 반음이 100센트다. */
const MAX_CENTS = 45;

// ── wav 읽고 쓰기 (`prep-ling6-wav.mjs`와 같은 방식) ────────────────────────

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

function readMonoWav(buf) {
  const chunks = readChunks(buf);
  const fmt = chunks["fmt "];
  const data = chunks.data;
  if (!fmt || !data) {
    throw new Error("fmt/data 청크 없음");
  }
  const channels = buf.readUInt16LE(fmt.start + 2);
  const sampleRate = buf.readUInt32LE(fmt.start + 4);
  const bits = buf.readUInt16LE(fmt.start + 14);
  if (bits !== 16 || channels !== 1) {
    throw new Error(`모노 16bit만 다룬다 (${channels}ch ${bits}bit)`);
  }
  const frames = Math.floor(data.size / 2);
  const mono = new Float32Array(frames);
  for (let i = 0; i < frames; i += 1) {
    mono[i] = buf.readInt16LE(data.start + i * 2) / 32768;
  }
  return { mono, sampleRate };
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

// ── 분절 ───────────────────────────────────────────────────────────────────

function frameRms(samples) {
  const count = Math.floor(samples.length / FRAME);
  const rms = new Float32Array(count);
  for (let f = 0; f < count; f += 1) {
    let sum = 0;
    for (let i = 0; i < FRAME; i += 1) {
      const v = samples[f * FRAME + i];
      sum += v * v;
    }
    rms[f] = Math.sqrt(sum / FRAME);
  }
  return rms;
}

function segments(samples, sampleRate) {
  const rms = frameRms(samples);
  let peak = 0;
  for (const v of rms) {
    peak = Math.max(peak, v);
  }
  const enter = peak * ENTER_RATIO;
  const exit = peak * EXIT_RATIO;

  const runs = [];
  let start = -1;
  for (let f = 0; f < rms.length; f += 1) {
    if (start < 0 && rms[f] > enter) {
      start = f;
    } else if (start >= 0 && rms[f] < exit) {
      runs.push({ from: start * FRAME, to: f * FRAME });
      start = -1;
    }
  }
  if (start >= 0) {
    runs.push({ from: start * FRAME, to: samples.length });
  }

  const gap = MERGE_GAP_SEC * sampleRate;
  const merged = [];
  for (const run of runs) {
    const last = merged[merged.length - 1];
    if (last && run.from - last.to < gap) {
      last.to = run.to;
    } else {
      merged.push({ ...run });
    }
  }
  return merged.filter((r) => r.to - r.from >= MIN_SEG_SEC * sampleRate);
}

// ── 기음 재기 (자기상관) ────────────────────────────────────────────────────

/**
 * 한 토막의 기음(Hz). 어택은 배음이 어지러우니 앞쪽 15%를 건너뛰고 잰다.
 *
 * 최댓값을 그냥 쓰면 **한 옥타브 아래로 잡히는 실수**가 잦다(주기를 두 배로 봐도
 * 상관값이 거의 같다). 그래서 최댓값의 90% 이상인 것 중 **가장 짧은 주기**를 고른다.
 */
function fundamentalHz(samples, sampleRate, seg) {
  const len = seg.to - seg.from;
  const at = seg.from + Math.floor(len * 0.15);
  const size = Math.min(8192, seg.to - at);
  if (size < 2048) {
    return 0;
  }

  const x = new Float32Array(size);
  let mean = 0;
  for (let i = 0; i < size; i += 1) {
    mean += samples[at + i];
  }
  mean /= size;
  for (let i = 0; i < size; i += 1) {
    x[i] = samples[at + i] - mean;
  }

  const minLag = Math.floor(sampleRate / 1200);
  const maxLag = Math.min(Math.ceil(sampleRate / 150), Math.floor(size / 2));
  const corr = new Float32Array(maxLag + 1);
  let best = 0;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let num = 0;
    let a = 0;
    let b = 0;
    for (let i = 0; i + lag < size; i += 1) {
      num += x[i] * x[i + lag];
      a += x[i] * x[i];
      b += x[i + lag] * x[i + lag];
    }
    corr[lag] = a > 0 && b > 0 ? num / Math.sqrt(a * b) : 0;
    best = Math.max(best, corr[lag]);
  }
  // 상관이 이만큼도 안 서면 음정 있는 소리가 아니다(잡음·활 스침).
  if (best < 0.3) {
    return 0;
  }

  // `주의`: **문턱을 처음 넘는 지연**을 쓰면 안 된다 — 상관 곡선이 완만해서
  // 최소 지연 근처가 이미 문턱을 넘는 일이 잦고, 그러면 1200Hz 언저리로 붙는다.
  // 반드시 **봉우리(국소 최댓값)** 중에서 고른다.
  let lag = minLag;
  let found = false;
  for (let l = minLag + 1; l < maxLag; l += 1) {
    if (corr[l] > corr[l - 1] && corr[l] >= corr[l + 1] && corr[l] >= best * 0.85) {
      lag = l;
      found = true;
      break;
    }
  }
  if (!found) {
    for (let l = minLag; l <= maxLag; l += 1) {
      if (corr[l] === best) {
        lag = l;
        break;
      }
    }
  }

  // 포물선 보간 — 표본 단위 주기로는 센트가 거칠다.
  const y0 = corr[lag - 1] ?? corr[lag];
  const y1 = corr[lag];
  const y2 = corr[lag + 1] ?? corr[lag];
  const denom = y0 - 2 * y1 + y2;
  const shift = denom !== 0 ? (0.5 * (y0 - y2)) / denom : 0;
  return sampleRate / (lag + shift);
}

const cents = (hz, target) => 1200 * Math.log2(hz / target);

// ── 다듬기 ─────────────────────────────────────────────────────────────────

function shape(samples, sampleRate, seg) {
  const want = Math.round(BODY_SEC * sampleRate);
  const out = new Float32Array(want);
  const have = Math.min(want, seg.to - seg.from);
  out.set(samples.subarray(seg.from, seg.from + have));

  const fadeIn = Math.round(FADE_IN_SEC * sampleRate);
  for (let i = 0; i < fadeIn && i < have; i += 1) {
    out[i] *= i / fadeIn;
  }
  const fadeOut = Math.round(FADE_OUT_SEC * sampleRate);
  for (let i = 0; i < fadeOut && i < have; i += 1) {
    out[have - 1 - i] *= i / fadeOut;
  }
  return out;
}

function normalize(samples, sampleRate) {
  const window = Math.min(Math.round(LEVEL_WINDOW_SEC * sampleRate), samples.length);
  const hop = Math.round(0.05 * sampleRate);
  let sum = 0;
  for (let i = 0; i < window; i += 1) {
    sum += samples[i] * samples[i];
  }
  let loudest = sum;
  for (let at = hop; at + window <= samples.length; at += hop) {
    sum = 0;
    for (let i = at; i < at + window; i += 1) {
      sum += samples[i] * samples[i];
    }
    loudest = Math.max(loudest, sum);
  }
  const rms = Math.sqrt(loudest / window);
  let gain = rms > 0 ? TARGET_RMS / rms : 1;

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

// ── 실행 ───────────────────────────────────────────────────────────────────

if (!existsSync(SRC)) {
  throw new Error(`${SRC_DIR}/ 가 없다. 먼저 node scripts/fetch-inst-src.mjs`);
}
mkdirSync(WORK, { recursive: true });
mkdirSync(OUT, { recursive: true });

const rows = [];

for (const source of SOURCES) {
  const src = join(SRC, source.file);
  if (!existsSync(src)) {
    throw new Error(`원본 없음: ${source.file} — node scripts/fetch-inst-src.mjs`);
  }

  // 1. 형식 통일. 원본마다 채널·표본율·비트폭이 달라 여기서 한 번에 맞춘다.
  const wav = join(WORK, `${source.file}.wav`);
  const ff = spawnSync(
    "ffmpeg",
    ["-v", "error", "-y", "-i", src, "-ac", "1", "-ar", "44100", "-sample_fmt", "s16", wav],
    { encoding: "utf8" },
  );
  if (ff.status !== 0) {
    throw new Error(`ffmpeg 실패 (${source.file}): ${ff.stderr || ff.error?.message}`);
  }

  const { mono, sampleRate } = readMonoWav(readFileSync(wav));
  const segs = segments(mono, sampleRate);
  const measured = segs.map((seg) => ({ seg, hz: fundamentalHz(mono, sampleRate, seg) }));

  // 2. 음높이로 목표를 찾는다. 순서로 세지 않는다.
  for (const id of source.notes) {
    const target = noteHz(id);
    const scored = measured
      .filter((m) => m.hz > 0)
      .map((m) => ({ ...m, off: Math.abs(cents(m.hz, target)) }))
      .filter((m) => m.off <= MAX_CENTS)
      .sort((a, b) => a.off - b.off || b.seg.to - b.seg.from - (a.seg.to - a.seg.from));

    const hit = scored[0];
    if (!hit) {
      const near = measured
        .map((m) => `${m.hz.toFixed(1)}Hz`)
        .join(" ");
      throw new Error(
        `${source.file}에서 ${id}(${target}Hz)를 못 찾았다. 토막 ${segs.length}개: ${near}`,
      );
    }

    const shaped = shape(mono, sampleRate, hit.seg);
    const { out, gain } = normalize(shaped, sampleRate);
    const name = `${source.instrument}-${id}.wav`;
    writeFileSync(join(OUT, name), writeMonoWav(out, sampleRate));

    let peak = 0;
    for (const v of out) {
      peak = Math.max(peak, Math.abs(v));
    }
    rows.push({
      name,
      src: source.file,
      hz: hit.hz,
      off: cents(hit.hz, target),
      gain,
      peak,
      segs: segs.length,
    });
  }
}

rows.sort((a, b) => a.name.localeCompare(b.name));
for (const r of rows) {
  console.log(
    `${r.name.padEnd(16)} ${r.hz.toFixed(2).padStart(7)}Hz ` +
      `${r.off >= 0 ? "+" : ""}${r.off.toFixed(1)}센트  ` +
      `gain=${r.gain.toFixed(2)} peak=${r.peak.toFixed(3)}  ← ${r.src}`,
  );
}
console.log(`\n${rows.length}개 → assets/inst/ (모노 44.1kHz ${BODY_SEC}초)`);
