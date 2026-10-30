import {
  WORD_AUDIOS,
  hasWordAudio,
  getWordAudio,
  setWordAudioForTest,
  clearWordAudiosForTest,
} from "../wordAudioAssets";

describe("wordAudioAssets", () => {
  beforeEach(() => {
    clearWordAudiosForTest();
  });

  afterEach(() => {
    clearWordAudiosForTest();
  });

  it("WORD_AUDIOS 객체에 2·3·4단계 전체 52개 표준 단어가 매핑되어 있다", () => {
    const keys = Object.keys(WORD_AUDIOS);
    expect(keys.length).toBe(52);
    expect(keys).toContain("엄마");
    expect(keys).toContain("가방");
    expect(keys).toContain("사탕");
    expect(keys).toContain("바늘");
    expect(keys).toContain("도배");
  });

  it("등록된 단어는 hasWordAudio가 true를 반환하고 getWordAudio가 음원 소스를 반환한다", () => {
    expect(hasWordAudio("엄마")).toBe(true);
    expect(getWordAudio("엄마")).toBeDefined();

    expect(hasWordAudio("가방")).toBe(true);
    expect(getWordAudio("가방")).toBeDefined();
  });

  it("등록되지 않은 단어는 hasWordAudio가 false이고 getWordAudio가 undefined이다", () => {
    expect(hasWordAudio("미등록테스트단어")).toBe(false);
    expect(getWordAudio("미등록테스트단어")).toBeUndefined();
  });

  it("setWordAudioForTest로 동적 오버라이드 및 clearWordAudiosForTest로 초기화가 동작한다", () => {
    const mockAudio = 99999;
    setWordAudioForTest("미등록테스트단어", mockAudio);

    expect(hasWordAudio("미등록테스트단어")).toBe(true);
    expect(getWordAudio("미등록테스트단어")).toBe(mockAudio);

    clearWordAudiosForTest();
    expect(hasWordAudio("미등록테스트단어")).toBe(false);
    expect(getWordAudio("미등록테스트단어")).toBeUndefined();
  });
});
