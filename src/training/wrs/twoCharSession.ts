import {
  TWO_CHAR_LISTS,
  TWO_CHAR_LIST_COUNT,
  TWO_CHAR_TRIAL_COUNT,
  type TwoCharItem,
} from "@/training/wrs/twoCharLists";
import {
  shuffleInPlace,
  type Rng,
} from "@/training/wrs/wrsDistractors";
import type { WrsSessionSummary } from "@/training/wrs/wrsSession";

export { TWO_CHAR_LIST_COUNT, TWO_CHAR_TRIAL_COUNT };

export type TwoCharTrial = {
  target: string;
  hard: string;
  choices: readonly [string, string, string, string];
};

export function nextTwoCharListIndex(completedCount: number): number {
  const safe = Math.max(0, completedCount);
  return safe % TWO_CHAR_LIST_COUNT;
}

/**
 * 최신순 목록의 맨 앞 장 다음 장.
 * 장 번호가 없거나 0·1·2가 아니면 기록 수로 계산한다(v1).
 */
export function nextTwoCharListIndexFrom(
  rows: readonly { listIndex?: number }[],
): number {
  const last = rows[0]?.listIndex;
  if (last !== 0 && last !== 1 && last !== 2) {
    return nextTwoCharListIndex(rows.length);
  }
  return (last + 1) % TWO_CHAR_LIST_COUNT;
}

export function syllablesOf(word: string): string[] {
  return [...word];
}

export function sharesSyllable(a: string, b: string): boolean {
  const right = new Set(syllablesOf(b));
  return syllablesOf(a).some((part) => right.has(part));
}

export function isDissimilar(
  candidate: string,
  target: string,
  hard: string,
): boolean {
  if (candidate === target || candidate === hard) {
    return false;
  }
  return !sharesSyllable(candidate, target) && !sharesSyllable(candidate, hard);
}

function overlapCount(candidate: string, target: string, hard: string): number {
  let n = 0;
  if (sharesSyllable(candidate, target)) {
    n += 1;
  }
  if (sharesSyllable(candidate, hard)) {
    n += 1;
  }
  return n;
}

/**
 * 같은 장 다른 정답에서 안 비슷한 2개.
 * 음절이 안 겹치는 것을 우선하고, 모자라면 겹침이 적은 순.
 */
export function pickDissimilar(
  list: readonly TwoCharItem[],
  item: TwoCharItem,
  rng: Rng,
): [string, string] {
  const pool = list
    .map((row) => row.target)
    .filter((word) => word !== item.target && word !== item.hard);
  const unlike = shuffleInPlace(
    pool.filter((word) => isDissimilar(word, item.target, item.hard)),
    rng,
  );
  if (unlike.length >= 2) {
    return [unlike[0], unlike[1]];
  }

  const rest = shuffleInPlace(
    pool.filter((word) => !unlike.includes(word)),
    rng,
  ).sort(
    (a, b) =>
      overlapCount(a, item.target, item.hard) -
      overlapCount(b, item.target, item.hard),
  );
  const picked = [...unlike];
  for (const word of rest) {
    if (picked.length >= 2) {
      break;
    }
    picked.push(word);
  }
  if (picked.length < 2) {
    throw new Error("two-char list needs two extra choices");
  }
  return [picked[0], picked[1]];
}

export function createTwoCharTrials(
  listIndex: number,
  rng: Rng = Math.random,
): TwoCharTrial[] {
  const list = TWO_CHAR_LISTS[listIndex];
  if (!list || list.length !== TWO_CHAR_TRIAL_COUNT) {
    throw new Error("two-char list index out of range");
  }
  const ordered = shuffleInPlace([...list], rng);
  return ordered.map((item) => {
    const extra = pickDissimilar(list, item, rng);
    const choices = shuffleInPlace(
      [item.target, item.hard, extra[0], extra[1]],
      rng,
    );
    if (new Set(choices).size !== 4) {
      throw new Error("two-char choices must be four unique words");
    }
    return {
      target: item.target,
      hard: item.hard,
      choices: [choices[0], choices[1], choices[2], choices[3]],
    };
  });
}

export function scoreTwoCharChoice(target: string, choice: string): boolean {
  return target === choice;
}

export function summarizeTwoChar(
  outcomes: readonly { correct: boolean }[],
): WrsSessionSummary {
  const trialCount = outcomes.length;
  const correctCount = outcomes.filter((row) => row.correct).length;
  const percent =
    trialCount === 0 ? 0 : Math.round((100 * correctCount) / trialCount);
  return { trialCount, correctCount, percent };
}
