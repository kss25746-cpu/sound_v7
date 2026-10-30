import { WRS_WORDS, WRS_WORD_SET } from "@/training/wrs/wrsWords";

describe("wrsWords", () => {
  it("단음절 200개이고 중복이 없다", () => {
    expect(WRS_WORDS).toHaveLength(200);
    expect(WRS_WORD_SET.size).toBe(200);
    expect(WRS_WORDS.every((word) => word.length === 1)).toBe(true);
  });
});
