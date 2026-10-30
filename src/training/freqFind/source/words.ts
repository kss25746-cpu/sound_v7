// words.ts
// 검사 콘텐츠 데이터. 로직(testEngine)과 분리되어 있으므로 여기만 고치면 문항이 바뀐다.

export type BandKey = "low" | "mid" | "high";

export const BANDS: readonly BandKey[] = ["low", "mid", "high"];

export interface BandDetail {
  key: BandKey;
  name: string;
  range: string;
  consonants: readonly string[];
  toneHz: number;
}

// 자음 3단 배타 구획(확정)
//   L ≤ 500 Hz            : ㄴ ㅁ ㄹ
//   M 600 ~ 3,350 Hz      : ㄱ ㄲ ㅋ / ㅂ ㅃ ㅍ / ㅎ
//   H 3,350 ~ 7,000 Hz    : ㄷ ㄸ ㅌ / ㅈ ㅉ ㅊ / ㅅ ㅆ
export const BAND_INFO: Record<BandKey, BandDetail> = {
  low: {
    key: "low",
    name: "저대역",
    range: "≤ 500 Hz",
    consonants: ["ㄴ", "ㅁ", "ㄹ"],
    toneHz: 250, // 1단계 순음 대표 주파수
  },
  mid: {
    key: "mid",
    name: "중대역",
    range: "600 ~ 3,350 Hz",
    consonants: ["ㄱ", "ㄲ", "ㅋ", "ㅂ", "ㅃ", "ㅍ", "ㅎ"],
    toneHz: 1000,
  },
  high: {
    key: "high",
    name: "고대역",
    range: "3,350 ~ 7,000 Hz",
    consonants: ["ㄷ", "ㄸ", "ㅌ", "ㅈ", "ㅉ", "ㅊ", "ㅅ", "ㅆ"],
    toneHz: 4000,
  },
};

// 검사에 실제로 사용하는 단어 (자체 검증 PASS 판정만)
export const WORDS: Record<BandKey, readonly string[]> = {
  low: ["엄마", "언니", "오리", "나무", "눈물", "나라", "노루", "누나", "머리", "마루", "마늘", "노래", "나물", "이마"],
  mid: ["가방", "바퀴", "호박", "아빠", "오빠", "가게", "가구", "코피", "폭포", "바보", "고배", "부고"],
  high: ["사탕", "새우", "셔츠", "칫솔", "사자", "상자", "시소", "시장", "시차", "주스", "주소", "주사", "치즈"],
};

// 보류(WEAK) — 기본 검사에서는 제외. 필요하면 WORDS에 합쳐서 쓴다.
export const WORDS_WEAK: Record<BandKey, readonly string[]> = {
  low: ["오이", "우유"],
  mid: ["코코아"],
  high: [],
};

// 제외(FAIL) — 대역 순도가 떨어져 검사에 쓰지 않는다. 재투입 방지용으로 남겨 둔다.
export const WORDS_EXCLUDED: Record<BandKey, readonly string[]> = {
  low: ["모자", "나비"],
  mid: ["포도", "구두", "파도", "토끼", "도마"],
  high: ["사과", "시계", "수박", "수건", "소금"],
};

export interface MinimalPairItem {
  word: string;
  band: BandKey;
}

export interface MinimalPair {
  a: MinimalPairItem;
  b: MinimalPairItem;
  diff: string;
  verified: boolean;
}

// 최소대립쌍 (4단계용)
// 규칙: 정답을 가르는 음소 1개만 다르고 나머지 음절은 완전 동일해야 한다.
export const MINIMAL_PAIRS: readonly MinimalPair[] = [
  // 저 ↔ 중
  { a: { word: "마늘", band: "low" }, b: { word: "바늘", band: "mid" }, diff: "ㅁ / ㅂ", verified: false },
  { a: { word: "마늘", band: "low" }, b: { word: "하늘", band: "mid" }, diff: "ㅁ / ㅎ", verified: false },
  { a: { word: "머리", band: "low" }, b: { word: "허리", band: "mid" }, diff: "ㅁ / ㅎ", verified: false },
  { a: { word: "노래", band: "low" }, b: { word: "고래", band: "mid" }, diff: "ㄴ / ㄱ", verified: false },

  // 저 ↔ 고
  { a: { word: "마루", band: "low" }, b: { word: "자루", band: "high" }, diff: "ㅁ / ㅈ", verified: false },
  { a: { word: "나물", band: "low" }, b: { word: "사물", band: "high" }, diff: "ㄴ / ㅅ", verified: false },
  { a: { word: "이마", band: "low" }, b: { word: "이사", band: "high" }, diff: "ㅁ / ㅅ", verified: false },
  { a: { word: "나이", band: "low" }, b: { word: "사이", band: "high" }, diff: "ㄴ / ㅅ", verified: false },

  // 중 ↔ 고
  { a: { word: "가구", band: "mid" }, b: { word: "가수", band: "high" }, diff: "ㄱ / ㅅ", verified: false },
  { a: { word: "가방", band: "mid" }, b: { word: "가상", band: "high" }, diff: "ㅂ / ㅅ", verified: false },
  { a: { word: "폭포", band: "mid" }, b: { word: "폭소", band: "high" }, diff: "ㅍ / ㅅ", verified: false },
  { a: { word: "고배", band: "mid" }, b: { word: "도배", band: "high" }, diff: "ㄱ / ㄷ", verified: false },
];

export function pairsFor(bandA: BandKey, bandB: BandKey): MinimalPair[] {
  return MINIMAL_PAIRS.filter(
    (p) =>
      (p.a.band === bandA && p.b.band === bandB) ||
      (p.a.band === bandB && p.b.band === bandA)
  );
}
