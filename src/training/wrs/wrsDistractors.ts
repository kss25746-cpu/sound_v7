import {
  decompose,
  realizedJong,
  replaceCho,
  replaceJong,
  replaceJung,
} from "@/training/wrs/wrsHangul";
import { WRS_WORD_SET } from "@/training/wrs/wrsWords";

export type Rng = () => number;

export type ConfusionAxis = "cho" | "jung" | "jong";

export type WrsDifficulty = "easy" | "hard";

export type WrsChoices = {
  choices: readonly [string, string, string, string];
  axis: ConfusionAxis;
  difficulty: WrsDifficulty;
};

const AXES: readonly ConfusionAxis[] = ["cho", "jung", "jong"];

/** 평음–경음–격음. ㅅ계는 고주파 마찰·파찰. */
const CHO_TRIPLES: readonly (readonly number[])[] = [
  [0, 1, 15],
  [3, 4, 16],
  [7, 8, 17],
  [12, 13, 14],
  [9, 10, 14],
];

const CHO_PLACE: readonly (readonly number[])[] = [
  [6, 7, 8, 17],
  [2, 3, 4, 5, 9, 10],
  [0, 1, 15],
  [12, 13, 14],
  [18],
  [11],
];

/** 인접 모음. ㅔ–ㅐ·ㅖ–ㅒ는 정상 청력도 겹쳐 제외. */
const JUNG_NEAR: readonly (readonly number[])[] = [
  [8, 13],
  [4, 8],
  [18, 13],
  [0, 4],
  [12, 17],
  [20, 18],
];

const JUNG_FAR: readonly (readonly number[])[] = [
  [0, 20],
  [0, 13],
  [8, 20],
  [13, 20],
];

const JONG_NASAL: readonly number[] = [16, 4, 21];
const JONG_STOP: readonly number[] = [1, 7, 17];

function othersInGroups(
  index: number,
  groups: readonly (readonly number[])[],
): number[] {
  const found: number[] = [];
  for (const group of groups) {
    if (!group.includes(index)) {
      continue;
    }
    for (const item of group) {
      if (item !== index) {
        found.push(item);
      }
    }
  }
  return [...new Set(found)];
}

function placeOfCho(cho: number): number {
  return CHO_PLACE.findIndex((group) => group.includes(cho));
}

function mapReplace(
  target: string,
  indices: readonly number[],
  replace: (syllable: string, index: number) => string | null,
): string[] {
  const out: string[] = [];
  for (const index of indices) {
    const next = replace(target, index);
    if (next && next !== target) {
      out.push(next);
    }
  }
  return out;
}

export function candidatesFor(
  target: string,
  axis: ConfusionAxis,
  difficulty: WrsDifficulty,
): string[] {
  const jamo = decompose(target);
  if (!jamo) {
    return [];
  }

  if (axis === "cho") {
    if (difficulty === "hard") {
      return mapReplace(target, othersInGroups(jamo.cho, CHO_TRIPLES), replaceCho);
    }
    const place = placeOfCho(jamo.cho);
    const far: number[] = [];
    for (let cho = 0; cho < 19; cho += 1) {
      if (placeOfCho(cho) !== place) {
        far.push(cho);
      }
    }
    return mapReplace(target, far, replaceCho);
  }

  if (axis === "jung") {
    const groups = difficulty === "hard" ? JUNG_NEAR : JUNG_FAR;
    return mapReplace(target, othersInGroups(jamo.jung, groups), replaceJung);
  }

  const realized = realizedJong(jamo.jong);
  if (difficulty === "easy") {
    if (realized !== 0) {
      const dropped = replaceJong(target, 0);
      return dropped ? [dropped] : [];
    }
    return mapReplace(target, [16, 4], replaceJong);
  }

  if (JONG_NASAL.includes(realized)) {
    return mapReplace(
      target,
      JONG_NASAL.filter((jong) => jong !== realized),
      replaceJong,
    );
  }
  if (JONG_STOP.includes(realized)) {
    return mapReplace(
      target,
      JONG_STOP.filter((jong) => jong !== realized),
      replaceJong,
    );
  }
  if (realized === 0) {
    return mapReplace(target, JONG_NASAL, replaceJong);
  }
  if (realized === 8) {
    return mapReplace(target, [4, 7], replaceJong);
  }
  return [];
}

function uniqueKeepOrder(words: readonly string[], target: string): string[] {
  const seen = new Set<string>([target]);
  const out: string[] = [];
  for (const word of words) {
    if (word.length !== 1 || seen.has(word) || !decompose(word)) {
      continue;
    }
    seen.add(word);
    out.push(word);
  }
  return out;
}

export function shuffleInPlace<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const current = items[i];
    const swap = items[j];
    if (current === undefined || swap === undefined) {
      continue;
    }
    items[i] = swap;
    items[j] = current;
  }
  return items;
}

function preferPool(words: readonly string[], rng: Rng): string[] {
  const inPool: string[] = [];
  const outside: string[] = [];
  for (const word of words) {
    if (WRS_WORD_SET.has(word)) {
      inPool.push(word);
    } else {
      outside.push(word);
    }
  }
  shuffleInPlace(inPool, rng);
  shuffleInPlace(outside, rng);
  return [...inPool, ...outside];
}

function fillFromPool(
  target: string,
  taken: readonly string[],
  rng: Rng,
  need: number,
): string[] {
  const pool = shuffleInPlace(
    [...WRS_WORD_SET].filter((word) => word !== target && !taken.includes(word)),
    rng,
  );
  return pool.slice(0, need);
}

/**
 * 정답 1 + 오답 3. 축은 무작위로 하나 고르고, 그 축의 어려움→쉬움, 부족한 칸은 다른 축·단어풀로 채움.
 */
export function buildChoices(
  target: string,
  rng: Rng = Math.random,
): WrsChoices {
  const axes = shuffleInPlace([...AXES], rng);
  const primary = axes[0] ?? "cho";

  const hardPrimary = preferPool(candidatesFor(target, primary, "hard"), rng);
  const easyPrimary = preferPool(candidatesFor(target, primary, "easy"), rng);
  const otherHard: string[] = [];
  const otherEasy: string[] = [];
  for (const axis of axes.slice(1)) {
    otherHard.push(...candidatesFor(target, axis, "hard"));
    otherEasy.push(...candidatesFor(target, axis, "easy"));
  }

  const ranked = uniqueKeepOrder(
    [
      ...hardPrimary,
      ...preferPool(otherHard, rng),
      ...easyPrimary,
      ...preferPool(otherEasy, rng),
    ],
    target,
  );

  let distractors = ranked.slice(0, 3);
  if (distractors.length < 3) {
    distractors = [
      ...distractors,
      ...fillFromPool(target, distractors, rng, 3 - distractors.length),
    ];
  }

  const a = distractors[0];
  const b = distractors[1];
  const c = distractors[2];
  if (!a || !b || !c) {
    throw new Error("wrs needs 3 distractors");
  }

  const difficulty: WrsDifficulty = hardPrimary.length > 0 ? "hard" : "easy";
  const mixed = shuffleInPlace([target, a, b, c], rng);
  const c0 = mixed[0];
  const c1 = mixed[1];
  const c2 = mixed[2];
  const c3 = mixed[3];
  if (!c0 || !c1 || !c2 || !c3) {
    throw new Error("wrs needs 4 choices");
  }

  return {
    choices: [c0, c1, c2, c3],
    axis: primary,
    difficulty,
  };
}
