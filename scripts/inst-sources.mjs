/**
 * 악기 소리 탭 음원 — 원본 출처표. `fetch-inst-src.mjs`와 `prep-inst-wav.mjs`가 같이 쓴다.
 *
 * 출처: **University of Iowa Electronic Music Studios, Musical Instrument Samples**
 * (https://theremin.music.uiowa.edu/MIS.html)
 *
 * 왜 여기인가 — 넷 다 필요했다:
 *
 * 1. **네 악기가 한 출처에 다 있다.** 피아노·기타·바이올린·플루트. 출처를 섞으면
 *    악기마다 녹음한 방이 달라져 「음색이 아니라 울림으로 고르기」가 된다.
 * 2. **무향실 녹음이라 잔향이 없다.** 사운드폰트 렌더에서 리버브를 꺼야 했던
 *    이유가 그대로 해결된다. `주의`: **피아노만 예외**다 — 작은 교습실 스테레오
 *    녹음이다. 실기기 청취에서 피아노만 울린다 싶으면 그때 손봐야 한다.
 * 3. **이용 제한이 없다.** 원문: "these recordings have been freely available on this
 *    website and may be downloaded and used for any projects, without restrictions."
 *    → 크레딧 화면이 필요 없다(이 앱엔 그 화면이 없고 탭이 6개라 못 늘린다).
 * 4. **실물 연주 녹음이다.** 합의된 종착지가 「실물 녹음 wav」였다 —
 *    사운드폰트 임시본 단계를 건너뛴다.
 *
 * `주의`: 원본은 **커밋하지 않는다**(83MB). `.inst-src/`는 gitignore돼 있고,
 * `node scripts/fetch-inst-src.mjs`로 언제든 다시 받는다.
 */

/** 세기는 넷 다 `mf`로 고정한다. 크기 차이는 prep이 맞추지만 연주 세기가 다르면 음색 자체가 달라진다. */
export const DYNAMIC = "mf";

/**
 * 기음 넷. `src/training/inst/instSession.ts`의 `INST_NOTES_HZ`와 같은 값이어야 한다.
 * 파일 이름에 쓰는 `id`가 이 표의 본체다 — Hz는 분절한 음이 맞는지 확인하는 데만 쓴다.
 */
export const NOTES = [
  { id: "g4", hz: 392.0 },
  { id: "a4", hz: 440.0 },
  { id: "c5", hz: 523.25 },
  { id: "e5", hz: 659.26 },
];

const BASE = "https://theremin.music.uiowa.edu/sound%20files/MIS";

/**
 * 원본 파일 ↔ 그 안에서 뽑을 음.
 *
 * 피아노만 음별 파일이고 나머지 셋은 **반음계 묶음**이다(한 파일에 여러 음).
 * 그래서 prep이 파일을 분절한 뒤 **자기상관으로 기음을 재어** 목표 음을 찾는다 —
 * 순서로 세지 않는다. 무음 판정이 흔들려도(감쇠 중간에 끊기는 등) 안전하도록.
 *
 * 줄 선택(`sul*`)은 그 음을 **낮은 포지션에서 편하게 내는 줄**로 골랐다.
 * 높은 프렛·높은 포지션은 같은 악기라도 소리가 얇아진다.
 */
export const SOURCES = [
  // 피아노 — 음별 파일. 넷 중 유일하게 스테레오(교습실 녹음).
  { file: "Piano.mf.G4.aiff", url: `${BASE}/Piano_Other/piano/Piano.mf.G4.aiff`, instrument: "piano", notes: ["g4"] },
  { file: "Piano.mf.A4.aiff", url: `${BASE}/Piano_Other/piano/Piano.mf.A4.aiff`, instrument: "piano", notes: ["a4"] },
  { file: "Piano.mf.C5.aiff", url: `${BASE}/Piano_Other/piano/Piano.mf.C5.aiff`, instrument: "piano", notes: ["c5"] },
  { file: "Piano.mf.E5.aiff", url: `${BASE}/Piano_Other/piano/Piano.mf.E5.aiff`, instrument: "piano", notes: ["e5"] },

  // 기타 — 1번 줄(높은 E). G4·A4는 3·5프렛, C5·E5는 8·12프렛. 96kHz/24bit라 prep이 44.1로 내린다.
  {
    file: "Guitar.mf.sul_E.E4B4.mono.aif",
    url: `${BASE}/Piano_Other/guitar/Guitar.mf.sul_E.E4B4.mono.aif`,
    instrument: "guitar",
    notes: ["g4", "a4"],
  },
  {
    file: "Guitar.mf.sul_E.C5B5.mono.aif",
    url: `${BASE}/Piano_Other/guitar/Guitar.mf.sul_E.C5B5.mono.aif`,
    instrument: "guitar",
    notes: ["c5", "e5"],
  },

  // 바이올린 — 활(arco). G4·A4는 D선, C5·E5는 A선. 이웃한 두 줄이라 음색이 튀지 않는다.
  {
    file: "Violin.arco.mf.sulD.D4A4.aiff",
    url: `${BASE}/Strings/violin/Violin.arco.mf.sulD.D4A4.aiff`,
    instrument: "violin",
    notes: ["g4", "a4"],
  },
  {
    file: "Violin.arco.mf.sulA.C5C6.aiff",
    url: `${BASE}/Strings/violin/Violin.arco.mf.sulA.C5C6.aiff`,
    instrument: "violin",
    notes: ["c5", "e5"],
  },

  // 플루트 — **비브라토 있는 쪽(vib)** 을 쓴다. 바이올린(활)은 비브라토가 있는데
  // 플루트만 없으면 「떨리면 바이올린」이 되어 음색이 아니라 떨림으로 고를 수 있다.
  {
    file: "Flute.vib.mf.B3B4.aiff",
    url: `${BASE}/Woodwinds/flute/Flute.vib.mf.B3B4.aiff`,
    instrument: "flute",
    notes: ["g4", "a4"],
  },
  {
    file: "Flute.vib.mf.C5B5.aiff",
    url: `${BASE}/Woodwinds/flute/Flute.vib.mf.C5B5.aiff`,
    instrument: "flute",
    notes: ["c5", "e5"],
  },
];

/** 원본을 두는 곳. 저장소에 커밋하지 않는다. */
export const SRC_DIR = ".inst-src";

export function noteHz(id) {
  const note = NOTES.find((n) => n.id === id);
  if (!note) {
    throw new Error(`모르는 음: ${id}`);
  }
  return note.hz;
}
