/** 한글 음절 → 초성·중성·종성 인덱스. 조합형 한글만. */

export const CHO = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
] as const;

export const JUNG = [
  "ㅏ",
  "ㅐ",
  "ㅑ",
  "ㅒ",
  "ㅓ",
  "ㅔ",
  "ㅕ",
  "ㅖ",
  "ㅗ",
  "ㅘ",
  "ㅙ",
  "ㅚ",
  "ㅛ",
  "ㅜ",
  "ㅝ",
  "ㅞ",
  "ㅟ",
  "ㅠ",
  "ㅡ",
  "ㅢ",
  "ㅣ",
] as const;

export const JONG = [
  "",
  "ㄱ",
  "ㄲ",
  "ㄳ",
  "ㄴ",
  "ㄵ",
  "ㄶ",
  "ㄷ",
  "ㄹ",
  "ㄺ",
  "ㄻ",
  "ㄼ",
  "ㄽ",
  "ㄾ",
  "ㄿ",
  "ㅀ",
  "ㅁ",
  "ㅂ",
  "ㅄ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
] as const;

const SYLLABLE_BASE = 0xac00;
const CHO_COUNT = CHO.length;
const JUNG_COUNT = JUNG.length;
const JONG_COUNT = JONG.length;

export type Jamo = {
  cho: number;
  jung: number;
  jong: number;
};

export function decompose(syllable: string): Jamo | null {
  if (syllable.length !== 1) {
    return null;
  }
  const code = syllable.codePointAt(0);
  if (code == null) {
    return null;
  }
  const index = code - SYLLABLE_BASE;
  if (index < 0 || index >= CHO_COUNT * JUNG_COUNT * JONG_COUNT) {
    return null;
  }
  const jong = index % JONG_COUNT;
  const jung = Math.floor(index / JONG_COUNT) % JUNG_COUNT;
  const cho = Math.floor(index / (JUNG_COUNT * JONG_COUNT));
  return { cho, jung, jong };
}

export function compose(jamo: Jamo): string | null {
  if (
    jamo.cho < 0 ||
    jamo.cho >= CHO_COUNT ||
    jamo.jung < 0 ||
    jamo.jung >= JUNG_COUNT ||
    jamo.jong < 0 ||
    jamo.jong >= JONG_COUNT
  ) {
    return null;
  }
  const code =
    SYLLABLE_BASE + (jamo.cho * JUNG_COUNT + jamo.jung) * JONG_COUNT + jamo.jong;
  return String.fromCodePoint(code);
}

export function replaceCho(syllable: string, cho: number): string | null {
  const jamo = decompose(syllable);
  if (!jamo) {
    return null;
  }
  return compose({ ...jamo, cho });
}

export function replaceJung(syllable: string, jung: number): string | null {
  const jamo = decompose(syllable);
  if (!jamo) {
    return null;
  }
  return compose({ ...jamo, jung });
}

export function replaceJong(syllable: string, jong: number): string | null {
  const jamo = decompose(syllable);
  if (!jamo) {
    return null;
  }
  return compose({ ...jamo, jong });
}

/**
 * 종성 대표음(7종 + 없음). 실제 발음 중화에 가깝게 묶는다.
 * `주의`: 겹받침 실현은 단어·위치에 따라 달라 여기 매핑은 근사다.
 */
export function realizedJong(jong: number): number {
  if (jong === 0) {
    return 0;
  }
  if (jong === 1 || jong === 2 || jong === 3 || jong === 9 || jong === 24) {
    return 1;
  }
  if (jong === 4 || jong === 5 || jong === 6) {
    return 4;
  }
  if (
    jong === 7 ||
    jong === 19 ||
    jong === 20 ||
    jong === 22 ||
    jong === 23 ||
    jong === 25 ||
    jong === 27
  ) {
    return 7;
  }
  if (jong === 8 || jong === 12 || jong === 15) {
    return 8;
  }
  if (jong === 16 || jong === 10) {
    return 16;
  }
  if (
    jong === 17 ||
    jong === 11 ||
    jong === 13 ||
    jong === 14 ||
    jong === 18 ||
    jong === 26
  ) {
    return 17;
  }
  if (jong === 21) {
    return 21;
  }
  return jong;
}
