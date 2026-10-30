import {
  appendPracticeRetryIfNeeded,
  buildStage1,
  buildStage2,
  buildStage3,
  buildStage4,
  countPracticeFirstPass,
  stage4AnchorBands,
  gradeStage1,
  gradeStage2,
  gradeStage3,
  gradeStage4,
  isPracticeRetryItem,
  PRACTICE_RETRY_ID_SUFFIX,
  reshufflePracticeItem,
  type ChoiceGrade,
  type WordStageItem,
} from "../testEngine";
import { hasPairImage, hasWordImage } from "../wordAssets";
import { BANDS, WORDS, type BandKey } from "../words";

describe("testEngine Stage 2, 3, 4 Item Generation", () => {
  test("Stage 2 generates both image and text items across all bands", () => {
    const items = buildStage2();
    expect(items).toHaveLength(15); // 3 bands * 5 items

    const imageItems = items.filter((it) => it.displayType === "image");
    const textItems = items.filter((it) => it.displayType === "text");

    expect(imageItems.length).toBeGreaterThan(0);
    expect(textItems.length).toBeGreaterThan(0);
    expect(imageItems.length + textItems.length).toBe(15);

    // Verify per band: each band should have both image and text items
    BANDS.forEach((band) => {
      const bandItems = items.filter((it) => it.band === band);
      expect(bandItems).toHaveLength(5);
      const bandImg = bandItems.filter((it) => it.displayType === "image");
      const bandTxt = bandItems.filter((it) => it.displayType === "text");
      expect(bandImg.length).toBeGreaterThanOrEqual(1);
      expect(bandTxt.length).toBeGreaterThanOrEqual(1);
    });
  });

  test("Stage 3 generates both image and text items for target bands", () => {
    const items = buildStage3(["low", "mid", "high"]);
    expect(items).toHaveLength(18); // 3 bands * 6 items

    BANDS.forEach((band) => {
      const bandItems = items.filter((it) => it.band === band);
      expect(bandItems).toHaveLength(6);
      const bandImg = bandItems.filter((it) => it.displayType === "image");
      const bandTxt = bandItems.filter((it) => it.displayType === "text");
      expect(bandImg.length).toBeGreaterThanOrEqual(1);
      expect(bandTxt.length).toBeGreaterThanOrEqual(1);
    });
  });

  test("Stage 4 generates 100% picture-pointing items when image pairs exist", () => {
    // low vs mid (마늘/바늘, 마늘/하늘, 머리/허리, 노래/고래) → 6
    // low vs high (마루/자루, 이마/이사) → 4, mid vs high (가구/가수, 폭포/폭소) → 4
    const pairsToTest: [BandKey[], BandKey[], number][] = [
      [["low"], ["mid"], 6],
      [["low"], ["high"], 4],
      [["mid"], ["high"], 4],
    ];

    pairsToTest.forEach(([weak, strong, count]) => {
      const items = buildStage4(weak, strong);
      expect(items).toHaveLength(count);
      expect(items.every((it) => it.displayType === "image")).toBe(true);
    });
  });

  test("Stage 4 never repeats the same pair with the same answer", () => {
    const pairsToTest: [BandKey[], BandKey[]][] = [
      [["low"], ["mid"]],
      [["low"], ["high"]],
      [["mid"], ["high"]],
    ];

    for (let run = 0; run < 50; run++) {
      pairsToTest.forEach(([weak, strong]) => {
        const items = buildStage4(weak, strong);
        const keys = items.map((it) => `${[...it.options].sort().join("/")}:${it.answer}`);
        expect(new Set(keys).size).toBe(items.length);
      });
    }
  });

  test("Stage 4 asks both the weak-side and the strong-side word", () => {
    for (let run = 0; run < 50; run++) {
      const items = buildStage4(["low"], ["high"]);
      const weakAnswers = items.filter((it) => WORDS.low.includes(it.answer));
      expect(weakAnswers.length).toBeGreaterThan(0);
      expect(weakAnswers.length).toBeLessThan(items.length);
    }
  });

  test("Stage 4 anchor is any clear band from stage 2 or stage 3", () => {
    const grade = (
      low: ChoiceGrade[BandKey]["status"],
      mid: ChoiceGrade[BandKey]["status"],
      high: ChoiceGrade[BandKey]["status"]
    ): ChoiceGrade => {
      const cell = (status: ChoiceGrade[BandKey]["status"]) => ({
        correct: status === "pass" ? 5 : 0,
        total: status === "skip" ? 0 : 5,
        status,
      });
      return { low: cell(low), mid: cell(mid), high: cell(high) };
    };

    expect(
      stage4AnchorBands(grade("weak", "weak", "weak"), grade("pass", "weak", "pass"))
    ).toEqual(["low", "high"]);

    expect(
      stage4AnchorBands(grade("weak", "weak", "weak"), grade("weak", "weak", "weak"))
    ).toEqual([]);

    expect(
      stage4AnchorBands(grade("weak", "pass", "weak"), grade("pass", "skip", "weak"))
    ).toEqual(["low", "mid"]);

    const items = buildStage4(
      ["mid"],
      stage4AnchorBands(grade("weak", "weak", "weak"), grade("pass", "weak", "pass"))
    );
    expect(items).toHaveLength(6);
    expect(items.every((it) => it.versus === "low" && it.band === "mid")).toBe(true);
  });

  test("Stage 4 pair-only images stay out of stages 2 and 3", () => {
    expect(hasWordImage("노래")).toBe(false);
    expect(hasPairImage("노래")).toBe(true);
    for (let run = 0; run < 20; run++) {
      const stage23 = [...buildStage2(), ...buildStage3(["low", "mid", "high"])];
      const withSong = stage23.filter((it) => it.options.includes("노래"));
      expect(withSong.every((it) => it.displayType === "text")).toBe(true);
    }
  });
});

const practiceItem = (over: Partial<WordStageItem> = {}): WordStageItem => ({
  id: "w3-high-0",
  stage: 3,
  mode: "B",
  band: "high",
  answer: "사탕",
  options: ["사탕", "신발", "시계", "수박"],
  displayType: "text",
  ...over,
});

describe("practice retry (D4 ②·④)", () => {
  test("buildStage3 for one band stays at 6 items", () => {
    expect(buildStage3(["high"])).toHaveLength(6);
  });

  test("reshuffle keeps answer and option set, new retry id", () => {
    const item = practiceItem();
    const next = reshufflePracticeItem(item);
    expect(next.answer).toBe("사탕");
    expect(next.band).toBe("high");
    expect(next.displayType).toBe("text");
    expect(next.id).toBe(`w3-high-0${PRACTICE_RETRY_ID_SUFFIX}`);
    expect(isPracticeRetryItem(next)).toBe(true);
    expect(new Set(next.options)).toEqual(new Set(item.options));
    expect(next.options).toHaveLength(item.options.length);
  });

  test("wrong first try appends one reshuffled copy at the end", () => {
    const a = practiceItem({ id: "a", answer: "사탕" });
    const b = practiceItem({ id: "b", answer: "시계", options: ["시계", "수박", "신발", "사탕"] });
    const queue = [a, b];
    const next = appendPracticeRetryIfNeeded(queue, a, "신발");
    expect(next).toHaveLength(3);
    expect(next[0]).toBe(a);
    expect(next[1]).toBe(b);
    expect(next[2].answer).toBe("사탕");
    expect(isPracticeRetryItem(next[2])).toBe(true);
    expect(new Set(next[2].options)).toEqual(new Set(a.options));
  });

  test("correct answer does not append", () => {
    const item = practiceItem();
    const queue = [item];
    expect(appendPracticeRetryIfNeeded(queue, item, "사탕")).toBe(queue);
  });

  test("retry item wrong again does not append a second time", () => {
    const item = practiceItem();
    const retry = reshufflePracticeItem(item);
    const queue = [item, retry];
    expect(appendPracticeRetryIfNeeded(queue, retry, "신발")).toBe(queue);
  });

  test("first-pass count ignores retry answers", () => {
    const a = practiceItem({ id: "a", answer: "사탕" });
    const b = practiceItem({ id: "b", answer: "시계" });
    const retry = reshufflePracticeItem(a);
    const counted = countPracticeFirstPass(
      [a, b, retry],
      { a: "사탕", b: "신발", [retry.id]: "사탕" }
    );
    expect(counted).toEqual({ total: 2, correct: 1 });
  });
});
