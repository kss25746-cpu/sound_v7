// testEngine.ts
import {
  BANDS,
  BAND_INFO,
  WORDS,
  pairsFor,
  type BandKey,
  type MinimalPair,
} from "./words";
import { hasWordImage, hasPairImage, getImageWords } from "./wordAssets";

const shuffle = <T>(arr: readonly T[] | T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const pick = <T>(arr: readonly T[], n: number): T[] => shuffle(arr).slice(0, n);

/* ------------------------------------------------------------------ */
/* 1단계 — 순음                                                        */
/* ------------------------------------------------------------------ */

export const TONE_LEVELS = [1.0, 0.55, 0.28] as const;

export interface Stage1Item {
  id: string;
  stage: 1;
  band: BandKey;
  hz: number;
  level: number;
  levelIndex: number;
}

export function buildStage1(): Stage1Item[] {
  const items: Stage1Item[] = [];
  BANDS.forEach((band) => {
    TONE_LEVELS.forEach((level, i) => {
      items.push({
        id: `t-${band}-${i}`,
        stage: 1,
        band,
        hz: BAND_INFO[band].toneHz,
        level,
        levelIndex: i,
      });
    });
  });
  return shuffle(items);
}

export type ToneStatus = "ok" | "watch" | "weak";

export interface Stage1GradeBand {
  heard: number;
  total: number;
  status: ToneStatus;
}

export type Stage1Grade = Record<BandKey, Stage1GradeBand>;

// answers: { [itemId]: true(들림) | false(안 들림) }
export function gradeStage1(
  items: Stage1Item[],
  answers: Record<string, boolean>
): Stage1Grade {
  const r = {} as Record<BandKey, { heard: number; total: number; status?: ToneStatus }>;
  BANDS.forEach((b) => (r[b] = { heard: 0, total: 0 }));
  items.forEach((it) => {
    r[it.band].total += 1;
    if (answers[it.id]) r[it.band].heard += 1;
  });
  BANDS.forEach((b) => {
    const { heard, total } = r[b];
    r[b].status = heard === total ? "ok" : heard >= Math.ceil(total / 2) ? "watch" : "weak";
  });
  return r as Stage1Grade;
}

/* ------------------------------------------------------------------ */
/* 2단계 — 단어 스크리닝 (방식 A)                                      */
/* ------------------------------------------------------------------ */

export const ITEMS_PER_BAND_S2 = 5; // 대역당 5문항 × 3대역 = 15문항

export type WordDisplayType = "image" | "text";

export interface WordStageItem {
  id: string;
  stage: 2 | 3;
  mode: "A" | "B";
  band: BandKey;
  answer: string;
  options: string[];
  displayType: WordDisplayType;
}

export function buildStage2(): WordStageItem[] {
  const items: WordStageItem[] = [];
  BANDS.forEach((band) => {
    const imgWords = getImageWords(band);
    const textWords = WORDS[band].filter((w) => !hasWordImage(w));

    // 대역당 5문항: 이미지 3문항 + 텍스트 2문항 균형 출제
    const textTargetCount = Math.min(2, textWords.length);
    const imgTargetCount = ITEMS_PER_BAND_S2 - textTargetCount;

    const imgTargets = pick(imgWords, imgTargetCount);
    const textTargets = pick(textWords, textTargetCount);
    const others = BANDS.filter((b) => b !== band);

    // 1) 그림 문항 생성 (4개 보기 모두 이미지 보유 단어)
    imgTargets.forEach((answer, i) => {
      const [b1, b2] = shuffle(others);
      const b1Pool = getImageWords(b1).length >= 2 ? getImageWords(b1) : WORDS[b1];
      const b2Pool = getImageWords(b2).length >= 1 ? getImageWords(b2) : WORDS[b2];
      const distractors = [...pick(b1Pool, 2), ...pick(b2Pool, 1)];
      const options = shuffle([answer, ...distractors]);
      const displayType: WordDisplayType = options.every(hasWordImage) ? "image" : "text";

      items.push({
        id: `w2-${band}-${items.length}`,
        stage: 2,
        mode: "A",
        band,
        answer,
        options,
        displayType,
      });
    });

    // 2) 텍스트 문항 생성 (추상어 등 텍스트 단어를 포함하여 글자 카드로 출제)
    textTargets.forEach((answer, i) => {
      const [b1, b2] = shuffle(others);
      const distractors = [...pick(WORDS[b1], 2), ...pick(WORDS[b2], 1)];
      const options = shuffle([answer, ...distractors]);
      const displayType: WordDisplayType = options.every(hasWordImage) ? "image" : "text";

      items.push({
        id: `w2-${band}-${items.length}`,
        stage: 2,
        mode: "A",
        band,
        answer,
        options,
        displayType,
      });
    });
  });
  return shuffle(items);
}

export type ChoiceStatus = "pass" | "suspect" | "weak" | "partial" | "skip" | "unknown";

export interface ChoiceGradeBand {
  correct: number;
  total: number;
  status: ChoiceStatus;
}

export type ChoiceGrade = Record<BandKey, ChoiceGradeBand>;

// answers: { [itemId]: '선택한 단어' }
export function gradeChoice<T extends { id: string; band: BandKey; answer: string }>(
  items: T[],
  answers: Record<string, string>,
  thresholds: (correct: number, total: number) => ChoiceStatus
): ChoiceGrade {
  const r = {} as Record<BandKey, { correct: number; total: number; status?: ChoiceStatus }>;
  BANDS.forEach((b) => (r[b] = { correct: 0, total: 0 }));
  items.forEach((it) => {
    r[it.band].total += 1;
    if (answers[it.id] === it.answer) r[it.band].correct += 1;
  });
  BANDS.forEach((b) => {
    r[b].status = r[b].total === 0 ? "skip" : thresholds(r[b].correct, r[b].total);
  });
  return r as ChoiceGrade;
}

export const gradeStage2 = (
  items: WordStageItem[],
  answers: Record<string, string>
): ChoiceGrade =>
  gradeChoice(items, answers, (c) => (c >= 4 ? "pass" : c === 3 ? "suspect" : "weak"));

/* ------------------------------------------------------------------ */
/* 3단계 — 단어 정밀 (방식 B)                                          */
/* ------------------------------------------------------------------ */

export const ITEMS_PER_BAND_S3 = 6;

// targetBands: 2단계에서 suspect / weak 로 나온 대역
export function buildStage3(targetBands: BandKey[]): WordStageItem[] {
  const items: WordStageItem[] = [];
  targetBands.forEach((band) => {
    const imgWords = getImageWords(band);
    const textWords = WORDS[band].filter((w) => !hasWordImage(w));

    // 취약 대역당 6문항: 이미지 3문항 + 텍스트 3문항 균형 출제
    const imgTargetCount = imgWords.length >= 4 ? 3 : 0;
    const textTargetCount = ITEMS_PER_BAND_S3 - imgTargetCount;

    // 1) 그림 문항 (4개 보기 모두 이미지 보유 단어)
    for (let i = 0; i < imgTargetCount; i++) {
      const four = pick(imgWords, 4);
      const answer = four[Math.floor(Math.random() * four.length)];
      const options = shuffle(four);
      const displayType: WordDisplayType = options.every(hasWordImage) ? "image" : "text";

      items.push({
        id: `w3-${band}-${items.length}`,
        stage: 3,
        mode: "B",
        band,
        answer,
        options,
        displayType,
      });
    }

    // 2) 텍스트 문항 (텍스트 단어를 포함하여 글자 카드로 출제)
    for (let i = 0; i < textTargetCount; i++) {
      let four: string[];
      if (textWords.length > 0) {
        const txtPick = pick(textWords, Math.min(2, textWords.length));
        const remainPool = WORDS[band].filter((w) => !txtPick.includes(w));
        four = [...txtPick, ...pick(remainPool, 4 - txtPick.length)];
      } else {
        four = pick(WORDS[band], 4);
      }
      const answer = four[Math.floor(Math.random() * four.length)];
      const options = shuffle(four);
      const displayType: WordDisplayType = options.every(hasWordImage) ? "image" : "text";

      items.push({
        id: `w3-${band}-${items.length}`,
        stage: 3,
        mode: "B",
        band,
        answer,
        options,
        displayType,
      });
    }
  });
  return shuffle(items);
}

export const gradeStage3 = (
  items: WordStageItem[],
  answers: Record<string, string>
): ChoiceGrade =>
  gradeChoice(items, answers, (c, t) => (c >= t - 1 ? "pass" : "weak"));

/** 연습 재출제 id 접미사. 이미 붙은 문항은 또 뒤에 붙이지 않는다. */
export const PRACTICE_RETRY_ID_SUFFIX = "-retry";

export function isPracticeRetryItem(item: Pick<WordStageItem, "id">): boolean {
  return item.id.endsWith(PRACTICE_RETRY_ID_SUFFIX);
}

/** 정답 단어·보기 집합은 유지하고, 보기 순서만 섞은 재출제 문항을 만든다. */
export function reshufflePracticeItem(item: WordStageItem): WordStageItem {
  return {
    ...item,
    id: `${item.id}${PRACTICE_RETRY_ID_SUFFIX}`,
    options: shuffle(item.options),
  };
}

/**
 * 연습: 틀린 문항만 맨 뒤에 한 번 붙인다. 맞췄거나 이미 재출제분이면 큐를 그대로 둔다.
 */
export function appendPracticeRetryIfNeeded(
  queue: WordStageItem[],
  item: WordStageItem,
  picked: string
): WordStageItem[] {
  if (picked === item.answer || isPracticeRetryItem(item)) return queue;
  return [...queue, reshufflePracticeItem(item)];
}

/** 연습 끝 안내용. 처음 낸 문항만 센다(재시도 제외). */
export function countPracticeFirstPass(
  items: WordStageItem[],
  answers: Record<string, string>
): { total: number; correct: number } {
  const first = items.filter((it) => !isPracticeRetryItem(it));
  return {
    total: first.length,
    correct: first.filter((it) => answers[it.id] === it.answer).length,
  };
}

/* ------------------------------------------------------------------ */
/* 4단계 — 대립쌍 (상대 판정)                                          */
/* ------------------------------------------------------------------ */

export const ITEMS_PER_BAND_S4 = 6;

export interface PairStageItem {
  id: string;
  stage: 4;
  band: BandKey;
  versus: BandKey;
  diff: string;
  answer: string;
  options: string[];
  displayType: WordDisplayType;
}

export function buildStage4(weakBands: BandKey[], strongBands: BandKey[]): PairStageItem[] {
  const items: PairStageItem[] = [];
  weakBands.forEach((weak) => {
    const strong = strongBands.find((s) => pairsFor(weak, s).length > 0);
    if (!strong) return;

    const pairs = pairsFor(weak, strong);
    const imagePairs = pairs.filter((p) => hasPairImage(p.a.word) && hasPairImage(p.b.word));

    // 4단계 100% 순수 그림(Picture-pointing) 원칙:
    // 시각적 문자 단서(Visual Cue) 편향을 차단하고 스피드 퀴즈형 피날레 완주를 위해
    // 이미지 쌍이 존재하는 경우 순수 이미지 쌍만으로 풀을 구성한다.
    const pool: MinimalPair[] = imagePairs.length > 0 ? shuffle(imagePairs) : shuffle(pairs);

    // 한 쌍은 정답을 바꿔 최대 두 번만 낸다. 쌍 수가 적으면 문항 수도 줄어든다.
    const first = pool.map((p) => ({ pair: p, weakAnswer: Math.random() < 0.5 }));
    const second = first.map((c) => ({ pair: c.pair, weakAnswer: !c.weakAnswer }));
    const picks = shuffle([...first, ...shuffle(second)].slice(0, ITEMS_PER_BAND_S4));

    picks.forEach(({ pair: p, weakAnswer }, i) => {
      const weakSide = p.a.band === weak ? p.a : p.b;
      const strongSide = p.a.band === weak ? p.b : p.a;

      const answerEntry = weakAnswer ? weakSide : strongSide;
      const otherEntry = weakAnswer ? strongSide : weakSide;
      const options = shuffle([answerEntry.word, otherEntry.word]);
      const displayType: WordDisplayType = options.every(hasPairImage) ? "image" : "text";

      items.push({
        id: `p4-${weak}-${i}`,
        stage: 4,
        band: weak,
        versus: strong,
        diff: p.diff,
        answer: answerEntry.word,
        options,
        displayType,
      });
    });
  });
  return items;
}

export const gradeStage4 = (
  items: PairStageItem[],
  answers: Record<string, string>
): ChoiceGrade =>
  gradeChoice(items, answers, (c, t) => {
    const rate = c / t;
    return rate >= 0.83 ? "pass" : rate >= 0.6 ? "partial" : "weak";
  });

/* ------------------------------------------------------------------ */
/* 진행 제어 · 최종 종합                                               */
/* ------------------------------------------------------------------ */

export const weakBandsOf = (grade: Partial<ChoiceGrade>): BandKey[] =>
  BANDS.filter((b) => grade[b]?.status === "suspect" || grade[b]?.status === "weak");

export const passBandsOf = (grade: Partial<ChoiceGrade>): BandKey[] =>
  BANDS.filter((b) => grade[b]?.status === "pass");

/**
 * 4단계 상대가 될 또렷 대역.
 * 2단계 통과와 3단계 통과를 합쳐 심해, 중층, 수면 순으로 돌려준다.
 * 또렷이 없으면 빈 배열이다.
 */
export function stage4AnchorBands(
  s2: Partial<ChoiceGrade> | null | undefined,
  s3: Partial<ChoiceGrade> | null | undefined
): BandKey[] {
  const clear = new Set<BandKey>([
    ...passBandsOf(s2 ?? {}),
    ...passBandsOf(s3 ?? {}),
  ]);
  return BANDS.filter((b) => clear.has(b));
}

export interface BandSummary {
  tone: Stage1GradeBand | null;
  screen: ChoiceGradeBand | null;
  fine: ChoiceGradeBand | null;
  versus: ChoiceGradeBand | null;
  final: ChoiceStatus;
}

export type SummaryResult = Record<BandKey, BandSummary>;

export interface GradeState {
  s1: Stage1Grade | null;
  s2: ChoiceGrade | null;
  s3: ChoiceGrade | null;
  s4: ChoiceGrade | null;
}

/**
 * 최종 판정(`final`)은 2·3단계로만 정한다. 4단계는 `versus`에 「대립쌍 x/y」 참고 점수로만 남긴다
 * (2026-10-23 결정). 대역당 4문항인 짝이 있어 점수가 25% 단위로 거칠고, 3단계에서 이미 흐릿한
 * 대역만 다시 보는 단계라 판정을 바꿀 근거로 약하다. 그래서 `final`이 `partial`이 되는 일은 없다.
 */
export function summarize({ s1, s2, s3, s4 }: GradeState): SummaryResult {
  const out = {} as SummaryResult;
  BANDS.forEach((b) => {
    let final: ChoiceStatus = s2?.[b]?.status ?? "unknown";
    if (s3?.[b] && s3[b].status !== "skip") {
      final = s3[b].status === "pass" ? "pass" : "weak";
    }
    out[b] = {
      tone: s1?.[b] ?? null,
      screen: s2?.[b] ?? null,
      fine: s3?.[b] ?? null,
      versus: s4?.[b] ?? null,
      final,
    };
  });
  return out;
}

export const FINAL_LABEL: Record<string, string> = {
  pass: "또렷",
  suspect: "주의",
  weak: "흐릿",
  partial: "일부 흐릿",
  unknown: "미측정",
};
