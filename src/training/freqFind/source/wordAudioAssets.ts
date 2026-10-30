// wordAudioAssets.ts — 주파수 검사 단어 사전 녹음 음원 자산 매핑
// 사전 녹음 음원(WAV/M4A)이 준비되면 require()로 등록하며, 등록되지 않은 단어는 TTS로 안전하게 폴백합니다.

export type AudioSource = number | string | { uri: string };

/**
 * 사전 녹음된 단어 음원 매핑 테이블.
 * 2·3·4단계 전체 단어(저/중/고대역 및 최소대립쌍)에 대해 고품질 표준화 WAV 음원이 탑재되어 있습니다.
 */
export const WORD_AUDIOS: Record<string, AudioSource> = {
  // 저대역 (Low Band)
  엄마: require("../../../../assets/words/audio/엄마.wav"),
  언니: require("../../../../assets/words/audio/언니.wav"),
  오리: require("../../../../assets/words/audio/오리.wav"),
  나무: require("../../../../assets/words/audio/나무.wav"),
  눈물: require("../../../../assets/words/audio/눈물.wav"),
  나라: require("../../../../assets/words/audio/나라.wav"),
  노루: require("../../../../assets/words/audio/노루.wav"),
  누나: require("../../../../assets/words/audio/누나.wav"),
  머리: require("../../../../assets/words/audio/머리.wav"),
  마루: require("../../../../assets/words/audio/마루.wav"),
  마늘: require("../../../../assets/words/audio/마늘.wav"),
  노래: require("../../../../assets/words/audio/노래.wav"),
  나물: require("../../../../assets/words/audio/나물.wav"),
  이마: require("../../../../assets/words/audio/이마.wav"),

  // 중대역 (Mid Band)
  가방: require("../../../../assets/words/audio/가방.wav"),
  바퀴: require("../../../../assets/words/audio/바퀴.wav"),
  호박: require("../../../../assets/words/audio/호박.wav"),
  아빠: require("../../../../assets/words/audio/아빠.wav"),
  오빠: require("../../../../assets/words/audio/오빠.wav"),
  가게: require("../../../../assets/words/audio/가게.wav"),
  가구: require("../../../../assets/words/audio/가구.wav"),
  코피: require("../../../../assets/words/audio/코피.wav"),
  폭포: require("../../../../assets/words/audio/폭포.wav"),
  바보: require("../../../../assets/words/audio/바보.wav"),
  고배: require("../../../../assets/words/audio/고배.wav"),
  부고: require("../../../../assets/words/audio/부고.wav"),

  // 고대역 (High Band)
  사탕: require("../../../../assets/words/audio/사탕.wav"),
  새우: require("../../../../assets/words/audio/새우.wav"),
  셔츠: require("../../../../assets/words/audio/셔츠.wav"),
  칫솔: require("../../../../assets/words/audio/칫솔.wav"),
  사자: require("../../../../assets/words/audio/사자.wav"),
  상자: require("../../../../assets/words/audio/상자.wav"),
  시소: require("../../../../assets/words/audio/시소.wav"),
  시장: require("../../../../assets/words/audio/시장.wav"),
  시차: require("../../../../assets/words/audio/시차.wav"),
  주스: require("../../../../assets/words/audio/주스.wav"),
  주소: require("../../../../assets/words/audio/주소.wav"),
  주사: require("../../../../assets/words/audio/주사.wav"),
  치즈: require("../../../../assets/words/audio/치즈.wav"),

  // 4단계 최소대립쌍 추가 단어
  바늘: require("../../../../assets/words/audio/바늘.wav"),
  하늘: require("../../../../assets/words/audio/하늘.wav"),
  허리: require("../../../../assets/words/audio/허리.wav"),
  고래: require("../../../../assets/words/audio/고래.wav"),
  자루: require("../../../../assets/words/audio/자루.wav"),
  사물: require("../../../../assets/words/audio/사물.wav"),
  이사: require("../../../../assets/words/audio/이사.wav"),
  나이: require("../../../../assets/words/audio/나이.wav"),
  사이: require("../../../../assets/words/audio/사이.wav"),
  가수: require("../../../../assets/words/audio/가수.wav"),
  가상: require("../../../../assets/words/audio/가상.wav"),
  폭소: require("../../../../assets/words/audio/폭소.wav"),
  도배: require("../../../../assets/words/audio/도배.wav"),
};

// 테스트 및 런타임 동적 주입을 위한 레지스트리
const testAudioOverrides = new Map<string, AudioSource>();

export function hasWordAudio(word: string): boolean {
  return testAudioOverrides.has(word) || Boolean(WORD_AUDIOS[word]);
}

export function getWordAudio(word: string): AudioSource | undefined {
  return testAudioOverrides.get(word) ?? WORD_AUDIOS[word];
}

/** 단위 테스트 또는 동적 음원 주입용 헬퍼 */
export function setWordAudioForTest(word: string, source: AudioSource): void {
  testAudioOverrides.set(word, source);
}

/** 테스트 종료 후 오버라이드 초기화 */
export function clearWordAudiosForTest(): void {
  testAudioOverrides.clear();
}
