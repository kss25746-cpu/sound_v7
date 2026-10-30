import { buildChoices, candidatesFor } from "@/training/wrs/wrsDistractors";

function rngFrom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

describe("candidatesFor", () => {
  it("감의 초성 어려움은 캄·깜이다", () => {
    const next = candidatesFor("감", "cho", "hard");
    expect(next).toEqual(expect.arrayContaining(["캄", "깜"]));
  });

  it("감의 종성 어려움은 간·강이다", () => {
    const next = candidatesFor("감", "jong", "hard");
    expect(next).toEqual(expect.arrayContaining(["간", "강"]));
  });

  it("감의 종성 쉬움은 받침을 뺀 가다", () => {
    expect(candidatesFor("감", "jong", "easy")).toEqual(["가"]);
  });

  it("ㅐ의 어려움 오답에 ㅔ를 넣지 않는다", () => {
    expect(candidatesFor("새", "jung", "hard")).not.toContain("세");
  });
});

describe("buildChoices", () => {
  it("정답을 포함한 서로 다른 보기 4개를 준다", () => {
    for (const seed of [1, 7, 99, 1234]) {
      const built = buildChoices("감", rngFrom(seed));
      expect(built.choices).toHaveLength(4);
      expect(new Set(built.choices).size).toBe(4);
      expect(built.choices).toContain("감");
    }
  });
});
