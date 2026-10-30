import { compose, decompose, realizedJong } from "@/training/wrs/wrsHangul";

describe("wrsHangul", () => {
  it("감은 ㄱ·ㅏ·ㅁ으로 분해된다", () => {
    expect(decompose("감")).toEqual({ cho: 0, jung: 0, jong: 16 });
  });

  it("분해한 음절을 다시 합치면 같다", () => {
    for (const word of ["감", "가", "깜", "캄", "값", "넋", "겉", "새"]) {
      const jamo = decompose(word);
      expect(jamo).not.toBeNull();
      if (!jamo) {
        continue;
      }
      expect(compose(jamo)).toBe(word);
    }
  });

  it("받침 ㅄ·ㅅ은 대표음 ㅂ·ㄷ으로 본다", () => {
    const baps = decompose("값");
    const ot = decompose("옷");
    expect(baps).not.toBeNull();
    expect(ot).not.toBeNull();
    if (!baps || !ot) {
      return;
    }
    expect(realizedJong(baps.jong)).toBe(17);
    expect(realizedJong(ot.jong)).toBe(7);
  });
});
