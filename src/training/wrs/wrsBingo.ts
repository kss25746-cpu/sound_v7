import {
  candidatesFor,
  shuffleInPlace,
  type ConfusionAxis,
  type Rng,
  type WrsDifficulty,
} from "@/training/wrs/wrsDistractors";
import { WRS_WORD_SET, WRS_WORDS } from "@/training/wrs/wrsWords";

/** 3×3. 문항 수가 아니라 칸 수. */
export const BINGO_CELL_COUNT = 9;

/** 한 줄이 안 나와도 끝내기. 칸의 두 바퀴 분량. */
export const BINGO_MAX_CUES = 18;

const AXES: readonly ConfusionAxis[] = ["cho", "jung", "jong"];

export const BINGO_LINES: readonly (readonly number[])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export type BingoSummary = {
  cueCount: number;
  markedCount: number;
  won: boolean;
  line: readonly number[] | null;
  lineCount: number;
};

function uniqueWords(words: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const word of words) {
    if (word.length !== 1 || seen.has(word) || !WRS_WORD_SET.has(word)) {
      continue;
    }
    seen.add(word);
    out.push(word);
  }
  return out;
}

function hardNeighbors(word: string): string[] {
  const found: string[] = [];
  for (const axis of AXES) {
    found.push(...candidatesFor(word, axis, "hard"));
  }
  return uniqueWords(found.filter((item) => item !== word));
}

function conflictsHard(a: string, b: string): boolean {
  return hardNeighbors(a).includes(b) || hardNeighbors(b).includes(a);
}

function fillToNine(board: string[], pool: readonly string[]): string[] {
  for (const word of pool) {
    if (board.length >= BINGO_CELL_COUNT) {
      break;
    }
    if (!board.includes(word)) {
      board.push(word);
    }
  }
  return board.slice(0, BINGO_CELL_COUNT);
}

function pickFarBoard(rng: Rng): string[] {
  const pool = shuffleInPlace([...WRS_WORDS], rng);
  const board: string[] = [];
  for (const word of pool) {
    if (board.some((existing) => conflictsHard(existing, word))) {
      continue;
    }
    board.push(word);
    if (board.length >= BINGO_CELL_COUNT) {
      break;
    }
  }
  return shuffleInPlace(fillToNine(board, pool), rng);
}

function pickNearBoard(rng: Rng): string[] {
  const pool = shuffleInPlace([...WRS_WORDS], rng);
  let cluster: string[] = [];
  for (const seed of pool) {
    const near = hardNeighbors(seed);
    if (near.length < 2) {
      continue;
    }
    cluster = uniqueWords([seed, ...shuffleInPlace([...near], rng)]);
    break;
  }
  if (cluster.length === 0) {
    const first = pool[0];
    cluster = first ? [first] : [];
  }

  let grew = true;
  while (cluster.length < BINGO_CELL_COUNT && grew) {
    grew = false;
    const extra: string[] = [];
    for (const word of cluster) {
      extra.push(...hardNeighbors(word));
    }
    for (const word of shuffleInPlace(uniqueWords(extra), rng)) {
      if (cluster.includes(word)) {
        continue;
      }
      cluster.push(word);
      grew = true;
      if (cluster.length >= BINGO_CELL_COUNT) {
        break;
      }
    }
  }

  return shuffleInPlace(fillToNine(cluster, pool), rng);
}

export function createBingoBoard(
  difficulty: WrsDifficulty,
  rng: Rng = Math.random,
): string[] {
  const board = difficulty === "hard" ? pickNearBoard(rng) : pickFarBoard(rng);
  if (board.length !== BINGO_CELL_COUNT || new Set(board).size !== BINGO_CELL_COUNT) {
    throw new Error("bingo needs 9 unique words");
  }
  return board;
}

export function findBingoLines(
  marked: readonly boolean[],
): readonly (readonly number[])[] {
  return BINGO_LINES.filter((line) =>
    line.every((index) => marked[index] === true),
  );
}

export function findBingoLine(
  marked: readonly boolean[],
): readonly number[] | null {
  return findBingoLines(marked)[0] ?? null;
}

/** 완성된 모든 줄의 칸. 강조용. */
export function bingoLineCells(
  marked: readonly boolean[],
): readonly number[] | null {
  const lines = findBingoLines(marked);
  if (lines.length === 0) {
    return null;
  }
  const cells: number[] = [];
  const seen = new Set<number>();
  for (const line of lines) {
    for (const index of line) {
      if (!seen.has(index)) {
        seen.add(index);
        cells.push(index);
      }
    }
  }
  return cells;
}

export function pickBingoCue(
  board: readonly string[],
  marked: readonly boolean[],
  rng: Rng = Math.random,
  avoid: string | null = null,
): string | null {
  const open: string[] = [];
  for (let i = 0; i < board.length; i += 1) {
    const word = board[i];
    if (!word || marked[i]) {
      continue;
    }
    open.push(word);
  }
  if (open.length === 0) {
    return null;
  }
  const preferred = avoid ? open.filter((word) => word !== avoid) : open;
  const pool = preferred.length > 0 ? preferred : open;
  return pool[Math.floor(rng() * pool.length)] ?? null;
}

export function scoreBingoTap(cue: string, choice: string): boolean {
  return cue === choice;
}

export function summarizeBingo(options: {
  cueCount: number;
  marked: readonly boolean[];
}): BingoSummary {
  const lines = findBingoLines(options.marked);
  return {
    cueCount: options.cueCount,
    markedCount: options.marked.filter(Boolean).length,
    won: lines.length > 0,
    line: lines[0] ?? null,
    lineCount: lines.length,
  };
}

const LINE_WIN_COPY = [
  "한 줄이 이어졌어요",
  "두 줄이 이어졌어요",
  "세 줄이 이어졌어요",
  "네 줄이 이어졌어요",
] as const;

export function bingoResultCopy(summary: BingoSummary): string {
  if (!summary.won || summary.lineCount < 1) {
    return "이번에는 한 줄이 안 나왔어요";
  }
  return LINE_WIN_COPY[summary.lineCount - 1] ?? `${summary.lineCount}줄이 이어졌어요`;
}
