import type { ImageSourcePropType } from "react-native";

/**
 * 악기 소리 식별 — 보기 넷.
 *
 * 건반 · 퉁기는 줄 · 활 켜는 줄 · 부는 관을 하나씩 골랐다. 같은 계열을 둘 넣으면
 * (예: 기타와 하프) 음색 차이가 너무 작아 「듣고 고르기」가 아니라 찍기가 된다.
 *
 * 소리는 **실물 연주 녹음**이다. 음원 16개(악기 넷 × 음 넷)는 `instSounds.ts`가
 * 들고 있다 — 이 표는 화면에 보이는 것(이름·설명·그림)만 안다.
 */
export type InstrumentId = "piano" | "guitar" | "violin" | "flute";

export type Instrument = {
  id: InstrumentId;
  /** 보기 칸에 크게 뜨는 이름. */
  label: string;
  /** 이름 아래 한 줄 — 악기 이름을 몰라도 소리의 성격으로 고를 수 있게. */
  family: string;
  image: ImageSourcePropType;
};

/**
 * 보기 칸 고정 순서. 재생 순서는 세션이 섞고, **칸 위치는 바꾸지 않는다**
 * (링 6와 같은 규칙 — 매번 자리가 바뀌면 고령 사용자가 위치를 못 익힌다).
 */
export const INSTRUMENTS: readonly Instrument[] = [
  {
    id: "piano",
    label: "피아노",
    family: "두드리는 건반",
    image: require("@/assets/4-inst/piano.webp"),
  },
  {
    id: "guitar",
    label: "기타",
    family: "퉁기는 줄",
    image: require("@/assets/4-inst/guitar.webp"),
  },
  {
    id: "violin",
    label: "바이올린",
    family: "활로 켜는 줄",
    image: require("@/assets/4-inst/violin.webp"),
  },
  {
    id: "flute",
    label: "플루트",
    family: "입으로 부는 관",
    image: require("@/assets/4-inst/flute.webp"),
  },
];

export const INSTRUMENT_IDS: readonly InstrumentId[] = INSTRUMENTS.map(
  (instrument) => instrument.id,
);

const INSTRUMENT_MAP: ReadonlyMap<InstrumentId, Instrument> = new Map(
  INSTRUMENTS.map((instrument) => [instrument.id, instrument]),
);

export function instrumentOf(id: InstrumentId): Instrument {
  const instrument = INSTRUMENT_MAP.get(id);
  if (!instrument) {
    throw new Error(`unknown instrument: ${id}`);
  }
  return instrument;
}

export function instrumentLabel(id: InstrumentId): string {
  return instrumentOf(id).label;
}
