import type { InstrumentId } from "@/training/inst/instruments";

/**
 * 악기 자극 음원 — 악기 넷 × 기음 넷 = 16개.
 *
 * 실물 연주 녹음이다(합성음 아님). 출처와 고른 이유는 `scripts/inst-sources.mjs`에
 * 적어 뒀다 — 요지는 **University of Iowa Electronic Music Studios**의 무향실
 * 녹음이고, 네 악기가 한 출처에 다 있으며, 이용 제한이 없다는 것.
 *
 * `scripts/prep-inst-wav.mjs`가 16개를 **모노 44.1kHz · 1.6초 · 같은 크기**로
 * 맞춰 놓았다. 길이와 크기를 맞추는 이유는 링 6와 같다 — 다르면 음색을 안 듣고
 * 길이나 크기로 고를 수 있다.
 *
 * `주의`: Metro의 `require`는 **정적이어야 한다.** 경로를 문자열로 조립할 수 없어
 * 16개를 손으로 적는다. 파일 이름이 곧 `{악기}-{음}`이다.
 */

/** 기음 id. 파일 이름 뒷부분과 같다(`piano-g4.wav`). */
export type InstNoteId = "g4" | "a4" | "c5" | "e5";

export type InstNote = {
  id: InstNoteId;
  /** 실제 녹음이라 정확히 이 값은 아니다. 표시·검증용 이름값이다. */
  hz: number;
};

/**
 * 시행마다 굴리는 기음 넷. G4·A4·C5·E5.
 *
 * 왜 여기인가(결정 2026-08-28, `wav음원생성.md`): 아래로 내려 C4를 쓰면 **플루트의
 * 최저음**이라 소리가 약하고 바람 소리가 섞인다. 크기를 맞추려 올리면 그 잡음까지
 * 커져 「쉬익거리는 게 플루트」라는 **음색 아닌 단서**가 된다(`prep-ling6-wav.mjs`가
 * 마찰음에서 겪은 것과 같은 문제). 반대로 한 옥타브를 통째로 올리면 이번엔 기타가
 * 높은 프렛이라 얇고 빨리 죽고, 배음이 이 앱 작업 대역(`pitch2afc/constants.ts`
 * 200~2000 Hz) 밖으로 많이 나간다. 넷 다 편한 가운데 자리가 여기다.
 *
 * `주의`: 여기 값을 바꾸면 **음원을 다시 뽑아야 한다** — `scripts/inst-sources.mjs`의
 * `NOTES`와 짝이다. 숫자만 고치면 파일과 어긋난다.
 */
export const INST_NOTES: readonly InstNote[] = [
  { id: "g4", hz: 392.0 },
  { id: "a4", hz: 440.0 },
  { id: "c5", hz: 523.25 },
  { id: "e5", hz: 659.26 },
];

export const INST_NOTE_IDS: readonly InstNoteId[] = INST_NOTES.map(
  (note) => note.id,
);

/** Metro 에셋 id 표. 악기 → 음 → 파일. */
const SOUNDS: Record<InstrumentId, Record<InstNoteId, number>> = {
  piano: {
    g4: require("@/assets/inst/piano-g4.wav"),
    a4: require("@/assets/inst/piano-a4.wav"),
    c5: require("@/assets/inst/piano-c5.wav"),
    e5: require("@/assets/inst/piano-e5.wav"),
  },
  guitar: {
    g4: require("@/assets/inst/guitar-g4.wav"),
    a4: require("@/assets/inst/guitar-a4.wav"),
    c5: require("@/assets/inst/guitar-c5.wav"),
    e5: require("@/assets/inst/guitar-e5.wav"),
  },
  violin: {
    g4: require("@/assets/inst/violin-g4.wav"),
    a4: require("@/assets/inst/violin-a4.wav"),
    c5: require("@/assets/inst/violin-c5.wav"),
    e5: require("@/assets/inst/violin-e5.wav"),
  },
  flute: {
    g4: require("@/assets/inst/flute-g4.wav"),
    a4: require("@/assets/inst/flute-a4.wav"),
    c5: require("@/assets/inst/flute-c5.wav"),
    e5: require("@/assets/inst/flute-e5.wav"),
  },
};

const NOTE_MAP: ReadonlyMap<InstNoteId, InstNote> = new Map(
  INST_NOTES.map((note) => [note.id, note]),
);

export function instNoteHz(id: InstNoteId): number {
  const note = NOTE_MAP.get(id);
  if (!note) {
    throw new Error(`unknown inst note: ${id}`);
  }
  return note.hz;
}

export function instSoundOf(
  instrument: InstrumentId,
  note: InstNoteId,
): number {
  const sound = SOUNDS[instrument]?.[note];
  if (sound === undefined) {
    throw new Error(`unknown inst sound: ${instrument}-${note}`);
  }
  return sound;
}
