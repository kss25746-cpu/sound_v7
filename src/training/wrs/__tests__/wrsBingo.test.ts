import {
  BINGO_CELL_COUNT,
  bingoLineCells,
  bingoResultCopy,
  createBingoBoard,
  findBingoLine,
  findBingoLines,
  pickBingoCue,
  scoreBingoTap,
  summarizeBingo,
} from "@/training/wrs/wrsBingo";
import { WRS_WORD_SET } from "@/training/wrs/wrsWords";

function rngFrom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

describe("createBingoBoard", () => {
  it("쉬움·어려움 모두 풀 안 단어 9개를 준다", () => {
    for (const seed of [1, 7, 42, 99]) {
      for (const difficulty of ["easy", "hard"] as const) {
        const board = createBingoBoard(difficulty, rngFrom(seed));
        expect(board).toHaveLength(BINGO_CELL_COUNT);
        expect(new Set(board).size).toBe(BINGO_CELL_COUNT);
        for (const word of board) {
          expect(WRS_WORD_SET.has(word)).toBe(true);
        }
      }
    }
  });
});

describe("findBingoLine", () => {
  it("가로·세로·대각을 찾는다", () => {
    const row = [true, true, true, false, false, false, false, false, false];
    expect(findBingoLine(row)).toEqual([0, 1, 2]);
    const col = [true, false, false, true, false, false, true, false, false];
    expect(findBingoLine(col)).toEqual([0, 3, 6]);
    const diag = [true, false, false, false, true, false, false, false, true];
    expect(findBingoLine(diag)).toEqual([0, 4, 8]);
    const none = [true, true, false, true, false, false, false, false, false];
    expect(findBingoLine(none)).toBeNull();
  });
});

describe("pickBingoCue", () => {
  it("안 지운 칸만 고르고 직전 단어는 피한다", () => {
    const board = ["가", "나", "다", "라", "마", "바", "사", "아", "자"];
    const marked = [true, false, false, false, false, false, false, false, false];
    const cue = pickBingoCue(board, marked, rngFrom(3), "나");
    expect(cue).not.toBe("가");
    expect(cue).not.toBe("나");
    expect(cue).not.toBeNull();
  });
});

describe("scoreBingoTap", () => {
  it("들은 단어와 같으면 맞다", () => {
    expect(scoreBingoTap("감", "감")).toBe(true);
    expect(scoreBingoTap("감", "밤")).toBe(false);
  });
});

describe("findBingoLines", () => {
  it("한 칸으로 가로·세로가 같이 끝나면 두 줄을 준다", () => {
    const marked = [
      true,
      true,
      true,
      false,
      false,
      true,
      false,
      false,
      true,
    ];
    expect(findBingoLines(marked)).toEqual([
      [0, 1, 2],
      [2, 5, 8],
    ]);
    expect(bingoLineCells(marked)).toEqual([0, 1, 2, 5, 8]);
  });
});

describe("summarizeBingo", () => {
  it("한 줄이면 성공 문구다", () => {
    const marked = [true, true, true, false, false, false, false, false, false];
    const summary = summarizeBingo({
      cueCount: 3,
      marked,
    });
    expect(summary).toEqual({
      cueCount: 3,
      markedCount: 3,
      won: true,
      line: [0, 1, 2],
      lineCount: 1,
    });
    expect(bingoResultCopy(summary)).toBe("한 줄이 이어졌어요");
  });

  it("두 줄이면 두 줄 문구다", () => {
    const marked = [
      true,
      true,
      true,
      false,
      false,
      true,
      false,
      false,
      true,
    ];
    const summary = summarizeBingo({
      cueCount: 5,
      marked,
    });
    expect(summary.lineCount).toBe(2);
    expect(bingoResultCopy(summary)).toBe("두 줄이 이어졌어요");
  });
});
