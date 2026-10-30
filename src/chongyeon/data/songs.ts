/**
 * songs.ts
 * ------------------------------------------------------------------
 * 청능 훈련 피아노 낙하노트 모드용 음원 데이터
 *
 * - 5음(penta5): C4·D4·E4·G4·A4 (청능 훈련 최적 주파수 대역인 가온도 C4 기준으로 통일)
 * - 8음(white8): C4·D4·E4·F4·G4·A4·B4·C5 (백건 1옥타브)
 * - beat: 4분음표 1박 기준 판정선 도달 시점 (0.5 = 8분음표 지원)
 */

import type { Note } from '../types/music';

export type SongScale = 'penta5' | 'white8';
export type WarmupType = 'five-note' | 'eight-note' | 'long-form';

export interface SongNote {
  note: Note;
  beat: number;
  /**
   * 음 길이(박). 트랙에서 **노트 막대의 세로 길이**가 된다.
   *
   * 비워두면 `다음 음까지의 간격`(최대 1박)으로 잡는다 — 단선율이라 그 편이
   * 악보와 어긋나지 않고, 8곡 전체에 길이를 손으로 박아 넣지 않아도 된다.
   * 길게 끄는 음처럼 **간격으로 못 맞히는 자리에만** 적어주면 된다.
   * (예: 2박짜리 온음은 뒤에 쉼표가 붙어 간격이 2박이라도 폴백은 1박으로 본다)
   */
  duration?: number;
}

export interface Song {
  id: string;
  title: string;
  origin: 'original' | 'public_domain';
  scale: SongScale;
  warmupType: WarmupType;
  tags: string[];
  description: string;
  palette: Note[];
  normalBpm: number;
  slowBpm: number;
  notes: SongNote[];
}

// 청능 훈련 주파수 해상도를 위해 C4 대역으로 통일
const PENTA5: Note[] = ['C4', 'D4', 'E4', 'G4', 'A4'];
const WHITE8: Note[] = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
/** 아리랑만 높은 레(D5)가 필요하다. 8음(C4–C5) 뒤에 한 건반을 붙인다. */
const ARIRANG: Note[] = [...WHITE8, 'D5'];

export const songs: Song[] = [
  // ══════════════════════════════════════════════════════
  //  5음 (PENTA5 · C4 D4 E4 G4 A4)
  // ══════════════════════════════════════════════════════

  // ── 5음 1 · 핫 크로스 번 (Hot Cross Buns · 전통 · PD) ──
  {
    id: 'pd_hotcross',
    title: '핫 크로스 번',
    origin: 'public_domain',
    scale: 'penta5',
    warmupType: 'five-note',
    tags: ['5음', '짧음', '반복', '퍼블릭 도메인'],
    description: '도·레·미 3음만 오가며 상대음정과 리듬 지각을 여는 몸풀기 곡',
    palette: PENTA5,
    normalBpm: 88,
    slowBpm: 70,
    notes: [
      { note: 'E4', beat: 0 }, { note: 'D4', beat: 1 }, { note: 'C4', beat: 2, duration: 2 },
      { note: 'E4', beat: 4 }, { note: 'D4', beat: 5 }, { note: 'C4', beat: 6, duration: 2 },
      { note: 'C4', beat: 8 }, { note: 'C4', beat: 8.5 },
      { note: 'C4', beat: 9 }, { note: 'C4', beat: 9.5 },
      { note: 'D4', beat: 10 }, { note: 'D4', beat: 10.5 },
      { note: 'D4', beat: 11 }, { note: 'D4', beat: 11.5 },
      { note: 'E4', beat: 12 }, { note: 'D4', beat: 13 }, { note: 'C4', beat: 14, duration: 2 },
    ],
  },

  // ── 5음 2 · 메리의 어린 양 (Mary Had a Little Lamb · 전통 · PD) ──
  // 사용 음 = C·D·E·G (5음 내 완벽 수용 가능하므로 white8에서 5음으로 이동)
  {
    id: 'pd_mary',
    title: '메리의 어린 양',
    origin: 'public_domain',
    scale: 'penta5',
    warmupType: 'five-note',
    tags: ['5음', '익숙한 멜로디', '반복', '퍼블릭 도메인'],
    description: '4개 음(도·레·미·솔)으로 반복 선율 패턴을 인지하는 기초 훈련곡',
    palette: PENTA5,
    normalBpm: 92,
    slowBpm: 74,
    notes: [
      { note: 'E4', beat: 0 }, { note: 'D4', beat: 1 }, { note: 'C4', beat: 2 }, { note: 'D4', beat: 3 },
      { note: 'E4', beat: 4 }, { note: 'E4', beat: 5 }, { note: 'E4', beat: 6, duration: 2 },
      { note: 'D4', beat: 8 }, { note: 'D4', beat: 9 }, { note: 'D4', beat: 10, duration: 2 },
      { note: 'E4', beat: 12 }, { note: 'G4', beat: 13 }, { note: 'G4', beat: 14, duration: 2 },
      { note: 'E4', beat: 16 }, { note: 'D4', beat: 17 }, { note: 'C4', beat: 18 }, { note: 'D4', beat: 19 },
      { note: 'E4', beat: 20 }, { note: 'E4', beat: 21 }, { note: 'E4', beat: 22 }, { note: 'E4', beat: 23 },
      { note: 'D4', beat: 24 }, { note: 'D4', beat: 25 }, { note: 'E4', beat: 26 }, { note: 'D4', beat: 27 },
      { note: 'C4', beat: 28, duration: 4 },
    ],
  },

  // ── 5음 3 · 링 어라운드 더 로지 (Ring Around the Rosie · 전통 · PD) ──
  {
    id: 'pd_ring',
    title: '링 어라운드 더 로지',
    origin: 'public_domain',
    scale: 'penta5',
    warmupType: 'five-note',
    tags: ['5음', '5음 전체', '도약진행', '퍼블릭 도메인'],
    description: '5음 전체를 폭넓게 오가며 음고 도약을 인지하는 훈련곡',
    palette: PENTA5,
    normalBpm: 96,
    slowBpm: 76,
    notes: [
      { note: 'G4', beat: 0 }, { note: 'G4', beat: 1 }, { note: 'E4', beat: 2 }, { note: 'A4', beat: 3 },
      { note: 'G4', beat: 4 }, { note: 'E4', beat: 5 },
      { note: 'G4', beat: 7 }, { note: 'G4', beat: 8 }, { note: 'E4', beat: 9 }, { note: 'A4', beat: 10 },
      { note: 'G4', beat: 11 }, { note: 'E4', beat: 12 },
      { note: 'A4', beat: 14 }, { note: 'A4', beat: 15 },
      { note: 'G4', beat: 16 }, { note: 'E4', beat: 17 }, { note: 'D4', beat: 18 }, { note: 'C4', beat: 19 },
    ],
  },

  // ══════════════════════════════════════════════════════
  //  8음 (WHITE8 · C4 D4 E4 F4 G4 A4 B4 C5)
  // ══════════════════════════════════════════════════════

  // ── 8음 1 · 나비야 (Hänschen klein · 독일 민요 · PD) ────
  // 사용 음 = C4·D4·E4·F4·G4 (계단식 하행/상행 훈련에 최적)
  {
    id: 'pd_butterfly',
    title: '나비야',
    origin: 'public_domain',
    scale: 'white8',
    warmupType: 'eight-note',
    tags: ['8음', '대표 동요', '순차진행', '퍼블릭 도메인'],
    description: '3도 하행과 순차 상행이 어우러져 피아노 건반 위치와 음계를 익히기 가장 좋은 곡',
    palette: WHITE8,
    normalBpm: 84,
    slowBpm: 68,
    notes: [
      { note: 'G4', beat: 0 }, { note: 'E4', beat: 1 }, { note: 'E4', beat: 2, duration: 2 },
      { note: 'F4', beat: 4 }, { note: 'D4', beat: 5 }, { note: 'D4', beat: 6, duration: 2 },
      { note: 'C4', beat: 8 }, { note: 'D4', beat: 9 }, { note: 'E4', beat: 10 }, { note: 'F4', beat: 11 },
      { note: 'G4', beat: 12 }, { note: 'G4', beat: 13 }, { note: 'G4', beat: 14, duration: 2 },
      { note: 'G4', beat: 16 }, { note: 'E4', beat: 17 }, { note: 'E4', beat: 18, duration: 2 },
      { note: 'F4', beat: 20 }, { note: 'D4', beat: 21 }, { note: 'D4', beat: 22, duration: 2 },
      { note: 'C4', beat: 24 }, { note: 'E4', beat: 25 }, { note: 'G4', beat: 26 }, { note: 'G4', beat: 27 },
      { note: 'E4', beat: 28, duration: 4 },
      // 2절. 1절과 같은 8마디. 1절 끝 음이 32박까지 찬다.
      { note: 'G4', beat: 32 }, { note: 'E4', beat: 33 }, { note: 'E4', beat: 34, duration: 2 },
      { note: 'F4', beat: 36 }, { note: 'D4', beat: 37 }, { note: 'D4', beat: 38, duration: 2 },
      { note: 'C4', beat: 40 }, { note: 'D4', beat: 41 }, { note: 'E4', beat: 42 }, { note: 'F4', beat: 43 },
      { note: 'G4', beat: 44 }, { note: 'G4', beat: 45 }, { note: 'G4', beat: 46, duration: 2 },
      { note: 'G4', beat: 48 }, { note: 'E4', beat: 49 }, { note: 'E4', beat: 50, duration: 2 },
      { note: 'F4', beat: 52 }, { note: 'D4', beat: 53 }, { note: 'D4', beat: 54, duration: 2 },
      { note: 'C4', beat: 56 }, { note: 'E4', beat: 57 }, { note: 'G4', beat: 58 }, { note: 'G4', beat: 59 },
      { note: 'E4', beat: 60, duration: 4 },
    ],
  },

  // ── 8음 2 · 반짝반짝 작은별 (Ah! vous dirai-je, maman · PD) ──
  {
    id: 'pd_twinkle',
    title: '반짝반짝 작은별',
    origin: 'public_domain',
    scale: 'white8',
    warmupType: 'eight-note',
    tags: ['8음', '익숙한 멜로디', '5도 도약', '퍼블릭 도메인'],
    description: '완전5도 도약 후 2도 순차 하행하는 전형적인 음향 패턴 훈련곡',
    palette: WHITE8,
    normalBpm: 80,
    slowBpm: 64,
    notes: [
      { note: 'C4', beat: 0 }, { note: 'C4', beat: 1 }, { note: 'G4', beat: 2 }, { note: 'G4', beat: 3 },
      { note: 'A4', beat: 4 }, { note: 'A4', beat: 5 }, { note: 'G4', beat: 6, duration: 2 },
      { note: 'F4', beat: 8 }, { note: 'F4', beat: 9 }, { note: 'E4', beat: 10 }, { note: 'E4', beat: 11 },
      { note: 'D4', beat: 12 }, { note: 'D4', beat: 13 }, { note: 'C4', beat: 14, duration: 2 },
      { note: 'G4', beat: 16 }, { note: 'G4', beat: 17 }, { note: 'F4', beat: 18 }, { note: 'F4', beat: 19 },
      { note: 'E4', beat: 20 }, { note: 'E4', beat: 21 }, { note: 'D4', beat: 22, duration: 2 },
      { note: 'G4', beat: 24 }, { note: 'G4', beat: 25 }, { note: 'F4', beat: 26 }, { note: 'F4', beat: 27 },
      { note: 'E4', beat: 28 }, { note: 'E4', beat: 29 }, { note: 'D4', beat: 30, duration: 2 },
      { note: 'C4', beat: 32 }, { note: 'C4', beat: 33 }, { note: 'G4', beat: 34 }, { note: 'G4', beat: 35 },
      { note: 'A4', beat: 36 }, { note: 'A4', beat: 37 }, { note: 'G4', beat: 38, duration: 2 },
      { note: 'F4', beat: 40 }, { note: 'F4', beat: 41 }, { note: 'E4', beat: 42 }, { note: 'E4', beat: 43 },
      { note: 'D4', beat: 44 }, { note: 'D4', beat: 45 }, { note: 'C4', beat: 46, duration: 2 },
    ],
  },

  // ── 8음 3 · 환희의 송가 (Beethoven 교향곡 9번 · PD) ────
  {
    id: 'pd_ode',
    title: '환희의 송가',
    origin: 'public_domain',
    scale: 'white8',
    warmupType: 'eight-note',
    tags: ['8음', '순차진행', '클래식', '퍼블릭 도메인'],
    description: '계단처럼 이어지는 이웃 음 순차 진행으로 미세 음정 차이를 구분하는 곡',
    palette: WHITE8,
    normalBpm: 96,
    slowBpm: 76,
    notes: [
      { note: 'E4', beat: 0 }, { note: 'E4', beat: 1 }, { note: 'F4', beat: 2 }, { note: 'G4', beat: 3 },
      { note: 'G4', beat: 4 }, { note: 'F4', beat: 5 }, { note: 'E4', beat: 6 }, { note: 'D4', beat: 7 },
      { note: 'C4', beat: 8 }, { note: 'C4', beat: 9 }, { note: 'D4', beat: 10 }, { note: 'E4', beat: 11 },
      { note: 'E4', beat: 12, duration: 1.5 }, { note: 'D4', beat: 13.5 }, { note: 'D4', beat: 14, duration: 2 },
      { note: 'E4', beat: 16 }, { note: 'E4', beat: 17 }, { note: 'F4', beat: 18 }, { note: 'G4', beat: 19 },
      { note: 'G4', beat: 20 }, { note: 'F4', beat: 21 }, { note: 'E4', beat: 22 }, { note: 'D4', beat: 23 },
      { note: 'C4', beat: 24 }, { note: 'C4', beat: 25 }, { note: 'D4', beat: 26 }, { note: 'E4', beat: 27 },
      { note: 'D4', beat: 28, duration: 1.5 }, { note: 'C4', beat: 29.5 }, { note: 'C4', beat: 30, duration: 2 },
      // B 파트 마디 정규화 (4/4 박자 유지)
      { note: 'D4', beat: 32 }, { note: 'D4', beat: 33 }, { note: 'E4', beat: 34 }, { note: 'C4', beat: 35 },
      { note: 'D4', beat: 36 }, { note: 'E4', beat: 37 }, { note: 'F4', beat: 37.5 }, { note: 'E4', beat: 38 }, { note: 'C4', beat: 39 },
      { note: 'D4', beat: 40 }, { note: 'E4', beat: 41 }, { note: 'F4', beat: 41.5 }, { note: 'E4', beat: 42 }, { note: 'D4', beat: 43 },
      { note: 'C4', beat: 44 }, { note: 'D4', beat: 45 }, { note: 'G4', beat: 46, duration: 2 },
      // 마지막 재현부
      { note: 'E4', beat: 48 }, { note: 'E4', beat: 49 }, { note: 'F4', beat: 50 }, { note: 'G4', beat: 51 },
      { note: 'G4', beat: 52 }, { note: 'F4', beat: 53 }, { note: 'E4', beat: 54 }, { note: 'D4', beat: 55 },
      { note: 'C4', beat: 56 }, { note: 'C4', beat: 57 }, { note: 'D4', beat: 58 }, { note: 'E4', beat: 59 },
      { note: 'D4', beat: 60, duration: 1.5 }, { note: 'C4', beat: 61.5 }, { note: 'C4', beat: 62, duration: 2 },
    ],
  },

  // ── 8음 4 · 성자의 행진 (When the Saints Go Marching In · 전통 · PD) ──
  {
    id: 'pd_saints',
    title: '성자의 행진',
    origin: 'public_domain',
    scale: 'white8',
    warmupType: 'long-form',
    tags: ['8음', '당김음', '도약진행', '퍼블릭 도메인'],
    description: '못갖춘마디와 리듬 당김음을 통해 시간적 청지각 순발력을 기르는 행진곡',
    palette: WHITE8,
    normalBpm: 112,
    slowBpm: 88,
    notes: [
      // 4/4. 못갖춘마디라 0박은 쉼. 쉼표 음은 두지 않는다.
      { note: 'C4', beat: 1 }, { note: 'E4', beat: 2 }, { note: 'F4', beat: 3 },
      { note: 'G4', beat: 4, duration: 4 },
      { note: 'C4', beat: 9 }, { note: 'E4', beat: 10 }, { note: 'F4', beat: 11 },
      { note: 'G4', beat: 12, duration: 4 },
      { note: 'C4', beat: 17 }, { note: 'E4', beat: 18 }, { note: 'F4', beat: 19 },
      { note: 'G4', beat: 20, duration: 2 }, { note: 'E4', beat: 22, duration: 2 },
      { note: 'C4', beat: 24, duration: 2 }, { note: 'E4', beat: 26, duration: 2 },
      { note: 'D4', beat: 28, duration: 4 },
      // 32박은 쉼
      { note: 'E4', beat: 33 }, { note: 'E4', beat: 34 }, { note: 'D4', beat: 35 },
      { note: 'C4', beat: 36, duration: 4 },
      { note: 'E4', beat: 40, duration: 2 }, { note: 'G4', beat: 42, duration: 2 },
      { note: 'G4', beat: 44 }, { note: 'F4', beat: 45, duration: 3 },
      // 48·49박은 쉼
      { note: 'E4', beat: 50 }, { note: 'F4', beat: 51 },
      { note: 'G4', beat: 52, duration: 2 }, { note: 'E4', beat: 54, duration: 2 },
      // 56박 이후는 두 자료가 잘려 미확인
      { note: 'C4', beat: 56, duration: 2 }, { note: 'D4', beat: 58, duration: 2 },
      { note: 'C4', beat: 60, duration: 4 },
    ],
  },

  // ── 8음 5 · 아리랑 (한국 전래 민요 · PD) ──
  // 솔=D4 · 라=E4 · 도=G4 · 레=A4 · 미=B4. 「나를」의 솔만 D5.
  // 3/4. 점4분+8분 묶음. 8음은 C5에서 끝나 이 곡 팔레트만 D5를 포함한다.
  {
    id: 'pd_arirang',
    title: '아리랑',
    origin: 'public_domain',
    scale: 'white8',
    warmupType: 'eight-note',
    tags: ['8음', '전통 민요', '퍼블릭 도메인'],
    description: '본조 아리랑 1절. 솔은 D4이고, 「나를」의 솔만 D5다',
    palette: ARIRANG,
    normalBpm: 76,
    slowBpm: 60,
    notes: [
      // 아리랑 아리랑 아라리요
      { note: 'D4', beat: 0, duration: 1.5 }, { note: 'E4', beat: 1.5 }, { note: 'D4', beat: 2 }, { note: 'E4', beat: 2.5 },
      { note: 'G4', beat: 3, duration: 1.5 }, { note: 'A4', beat: 4.5 }, { note: 'G4', beat: 5 }, { note: 'A4', beat: 5.5 },
      { note: 'B4', beat: 6 }, { note: 'A4', beat: 7 }, { note: 'B4', beat: 7.5 }, { note: 'G4', beat: 8 }, { note: 'E4', beat: 8.5 },
      { note: 'D4', beat: 9, duration: 1.5 }, { note: 'E4', beat: 10.5 }, { note: 'D4', beat: 11 }, { note: 'E4', beat: 11.5 },
      // 아리랑 고개로 넘어간다
      { note: 'G4', beat: 12, duration: 1.5 }, { note: 'A4', beat: 13.5 }, { note: 'G4', beat: 14 }, { note: 'A4', beat: 14.5 },
      { note: 'B4', beat: 15 }, { note: 'A4', beat: 15.5 }, { note: 'G4', beat: 16 }, { note: 'E4', beat: 16.5 }, { note: 'D4', beat: 17 }, { note: 'E4', beat: 17.5 },
      { note: 'G4', beat: 18, duration: 1.5 }, { note: 'A4', beat: 19.5 }, { note: 'G4', beat: 20 },
      { note: 'G4', beat: 21, duration: 3 },
      // 나를 버리고 가시는 님은. 솔 묶음만 D5.
      // 「나~를」2박+1박, 「버리고」는 각 1박. 이 박 나눔은 악보로 확인하지 않았다.
      { note: 'D5', beat: 24, duration: 2 }, { note: 'D5', beat: 26 },
      { note: 'D5', beat: 27 }, { note: 'B4', beat: 28 }, { note: 'A4', beat: 29 },
      { note: 'B4', beat: 30 }, { note: 'A4', beat: 31 }, { note: 'B4', beat: 31.5 }, { note: 'G4', beat: 32 }, { note: 'E4', beat: 32.5 },
      { note: 'D4', beat: 33, duration: 1.5 }, { note: 'E4', beat: 34.5 }, { note: 'D4', beat: 35 }, { note: 'E4', beat: 35.5 },
      // 십리도 못 가서 발병 난다
      { note: 'G4', beat: 36, duration: 1.5 }, { note: 'A4', beat: 37.5 }, { note: 'G4', beat: 38 }, { note: 'A4', beat: 38.5 },
      { note: 'B4', beat: 39 }, { note: 'A4', beat: 39.5 }, { note: 'G4', beat: 40 }, { note: 'E4', beat: 40.5 }, { note: 'D4', beat: 41 }, { note: 'E4', beat: 41.5 },
      { note: 'G4', beat: 42, duration: 1.5 }, { note: 'A4', beat: 43.5 }, { note: 'G4', beat: 44 },
      { note: 'G4', beat: 45, duration: 3 },
    ],
  },
];

export const songsByScale = (scale: SongScale): Song[] =>
  songs.filter((s) => s.scale === scale);
