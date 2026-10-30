// wordAssets.ts — 주파수 검사 단어 이미지 자산 매핑
import { ImageSourcePropType } from "react-native";
import { BandKey, WORDS } from "./words";

export const WORD_IMAGES: Record<string, ImageSourcePropType> = {
  가게: require("../../../../assets/words/가게.webp"),
  가구: require("../../../../assets/words/가구.webp"),
  가방: require("../../../../assets/words/가방.webp"),
  가수: require("../../../../assets/words/가수.webp"),
  나무: require("../../../../assets/words/나무.webp"),
  나물: require("../../../../assets/words/나물.webp"),
  노루: require("../../../../assets/words/노루.webp"),
  누나: require("../../../../assets/words/누나.webp"),
  눈물: require("../../../../assets/words/눈물.webp"),
  마늘: require("../../../../assets/words/마늘.webp"),
  마루: require("../../../../assets/words/마루.webp"),
  머리: require("../../../../assets/words/머리.webp"),
  바늘: require("../../../../assets/words/바늘.webp"),
  바퀴: require("../../../../assets/words/바퀴.webp"),
  사자: require("../../../../assets/words/사자.webp"),
  사탕: require("../../../../assets/words/사탕.webp"),
  상자: require("../../../../assets/words/상자.webp"),
  새우: require("../../../../assets/words/새우.webp"),
  셔츠: require("../../../../assets/words/셔츠.webp"),
  시소: require("../../../../assets/words/시소.webp"),
  시장: require("../../../../assets/words/시장.webp"),
  아빠: require("../../../../assets/words/아빠.webp"),
  언니: require("../../../../assets/words/언니.webp"),
  엄마: require("../../../../assets/words/엄마.webp"),
  오빠: require("../../../../assets/words/오빠.webp"),
  오리: require("../../../../assets/words/오리.webp"),
  이마: require("../../../../assets/words/이마.webp"),
  자루: require("../../../../assets/words/자루.webp"),
  주사: require("../../../../assets/words/주사.webp"),
  주스: require("../../../../assets/words/주스.webp"),
  치즈: require("../../../../assets/words/치즈.webp"),
  칫솔: require("../../../../assets/words/칫솔.webp"),
  코피: require("../../../../assets/words/코피.webp"),
  폭포: require("../../../../assets/words/폭포.webp"),
  하늘: require("../../../../assets/words/하늘.webp"),
  허리: require("../../../../assets/words/허리.webp"),
  호박: require("../../../../assets/words/호박.webp"),
};

// 4단계 대립쌍 전용. 노래는 WORDS.low에도 있어 WORD_IMAGES에 넣으면 2·3단계 출제가 바뀐다.
export const PAIR_ONLY_IMAGES: Record<string, ImageSourcePropType> = {
  고래: require("../../../../assets/words/고래.webp"),
  노래: require("../../../../assets/words/노래.webp"),
  이사: require("../../../../assets/words/이사.webp"),
  폭소: require("../../../../assets/words/폭소.webp"),
};

export function hasWordImage(word: string): boolean {
  return Boolean(WORD_IMAGES[word]);
}

export function getWordImage(word: string): ImageSourcePropType | undefined {
  return WORD_IMAGES[word];
}

export function hasPairImage(word: string): boolean {
  return Boolean(WORD_IMAGES[word] ?? PAIR_ONLY_IMAGES[word]);
}

export function getPairImage(word: string): ImageSourcePropType | undefined {
  return WORD_IMAGES[word] ?? PAIR_ONLY_IMAGES[word];
}

// 특정 대역의 단어 중 이미지가 존재하는 단어만 필터링
export function getImageWords(band: BandKey): string[] {
  return WORDS[band].filter((w) => hasWordImage(w));
}
