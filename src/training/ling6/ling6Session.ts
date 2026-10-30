import {
  LING6_SOUNDS,
  LING6_SOUND_IDS,
  type Ling6Choice,
  type Ling6SoundId,
} from "@/training/ling6/sounds";

export type Ling6Trial = {
  target: Ling6Choice;
};

export type Ling6TrialOutcome = {
  target: Ling6Choice;
  correct: boolean;
};

export type Ling6PhonemeMap = Record<Ling6SoundId, boolean>;

/** 하루 점검 기록. 무음 시행은 넣지 않는다. 통과 개수는 0~6. */
export type Ling6DailySummary = {
  passCount: number;
  byPhoneme: Ling6PhonemeMap;
};

/** 소리 시행 = 6음소 각 1회. 예측 방지를 위해 무음 2회를 섞는다. */
export const SOUND_TRIAL_COUNT = LING6_SOUND_IDS.length;
export const SILENCE_TRIAL_COUNT = 2;
export const TOTAL_TRIAL_COUNT = SOUND_TRIAL_COUNT + SILENCE_TRIAL_COUNT;

/** 고음역. 그리드 아래쪽·변화 문구용. */
export const LING6_HIGH_FREQ_IDS: readonly Ling6SoundId[] = ["sh", "s"];

export type Rng = () => number;

function shuffleInPlace<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const current = items[i];
    const swap = items[j];
    if (current === undefined || swap === undefined) {
      continue;
    }
    items[i] = swap;
    items[j] = current;
  }
  return items;
}

/**
 * 6개 소리를 한 번씩 섞고, 무음 2개를 끼운다.
 * 첫 시행은 소리로 둔다(과제를 바로 이해하게).
 */
export function createLing6Trials(rng: Rng = Math.random): Ling6Trial[] {
  const sounds: Ling6SoundId[] = [...LING6_SOUND_IDS];
  shuffleInPlace(sounds, rng);
  const trials: Ling6Trial[] = sounds.map((id) => ({ target: id }));

  for (let n = 0; n < SILENCE_TRIAL_COUNT; n += 1) {
    const pos = 1 + Math.floor(rng() * trials.length);
    trials.splice(pos, 0, { target: "silence" });
  }

  return trials;
}

export function scoreLing6Choice(
  target: Ling6Choice,
  choice: Ling6Choice,
): boolean {
  return target === choice;
}

/** 소리 시행만 모아 음소별 통과/실패. 같은 음소가 두 번이면 나중 값이 남는다. */
export function collectPhonemeResults(
  outcomes: readonly Ling6TrialOutcome[],
): Partial<Record<Ling6SoundId, boolean>> {
  const map: Partial<Record<Ling6SoundId, boolean>> = {};
  for (const outcome of outcomes) {
    if (outcome.target === "silence") {
      continue;
    }
    map[outcome.target] = outcome.correct;
  }
  return map;
}

export function isCompletePhonemeMap(
  map: Partial<Record<Ling6SoundId, boolean>>,
): map is Ling6PhonemeMap {
  return LING6_SOUND_IDS.every((id) => typeof map[id] === "boolean");
}

export function passCountOf(map: Ling6PhonemeMap): number {
  return LING6_SOUND_IDS.reduce(
    (sum, id) => sum + (map[id] ? 1 : 0),
    0,
  );
}

export function highFreqPassCount(map: Ling6PhonemeMap): number {
  return LING6_HIGH_FREQ_IDS.reduce(
    (sum, id) => sum + (map[id] ? 1 : 0),
    0,
  );
}

export function toDailySummary(map: Ling6PhonemeMap): Ling6DailySummary {
  return {
    passCount: passCountOf(map),
    byPhoneme: map,
  };
}

/**
 * 그래프·요약 옆 문구. 판정("청력은 ○○")이 아니라 직전 **날짜 기록**과 비교.
 */
export function ling6ProgressCopy(
  previousPass: number | null,
  thisPass: number,
): string | null {
  if (previousPass === null) {
    return null;
  }
  const delta = thisPass - previousPass;
  if (delta > 0) {
    return `지난 기록보다 ${delta}개 늘었어요`;
  }
  if (delta < 0) {
    return `지난 기록보다 ${-delta}개 줄었어요`;
  }
  return "지난 기록과 같은 개수를 맞혔어요";
}

export function ling6ResultCopy(passCount: number): string {
  return `이번 기록에서 6개 중 ${passCount}개를 맞혔어요`;
}

/**
 * 고음 2개(/ʃ/·/s/)가 지난주 기록보다 늘었을 때만. 판정 문구 아님.
 */
export function ling6HighFreqCopy(
  previousWeek: Ling6PhonemeMap | null,
  current: Ling6PhonemeMap,
): string | null {
  if (previousWeek === null) {
    return null;
  }
  if (highFreqPassCount(current) > highFreqPassCount(previousWeek)) {
    return "고음(/s/·/ʃ/)이 지난주보다 좋아지고 있어요";
  }
  return null;
}

/** 약점 창. 달력이 아니라 실기록 최근 N건. */
export const LING6_WEAKNESS_WINDOW = 7;
/** 창 안에서 이 횟수 이상 아쉬울 때만 강조. 격차·2위 비교 없음. */
export const LING6_WEAKNESS_MISS_THRESHOLD = 4;

export type Ling6WeaknessDay = {
  dateKey: string;
  byPhoneme: Ling6PhonemeMap;
};

export type Ling6WeaknessSnapshot = {
  /** 7건 미만이면 false. 카드 자체를 숨김. */
  ready: boolean;
  missCounts: Record<Ling6SoundId, number>;
  highlighted: Ling6SoundId[];
  copy: string | null;
};

function emptyMissCounts(): Record<Ling6SoundId, number> {
  return {
    m: 0,
    u: 0,
    a: 0,
    i: 0,
    sh: 0,
    s: 0,
  };
}

function ipaOf(id: Ling6SoundId): string {
  const sound = LING6_SOUNDS.find((item) => item.id === id);
  return sound?.ipa ?? id;
}

/** 강조된 음소만. 없으면 null(가짜 약점 문구 금지). */
export function ling6WeaknessCopy(
  ids: readonly Ling6SoundId[],
): string | null {
  if (ids.length === 0) {
    return null;
  }
  const labels = ids.map((id) => `/${ipaOf(id)}/`).join("·");
  return `요즘 ${labels}가 아쉬운 날이 많아요`;
}

/**
 * 최근 7건에서 음소별 아쉬움 횟수. 4회 이상만 강조.
 * 표본이 부족하면 ready=false.
 */
export function ling6WeaknessSnapshot(
  records: readonly Ling6WeaknessDay[],
): Ling6WeaknessSnapshot {
  if (records.length < LING6_WEAKNESS_WINDOW) {
    return {
      ready: false,
      missCounts: emptyMissCounts(),
      highlighted: [],
      copy: null,
    };
  }

  const window = [...records]
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .slice(0, LING6_WEAKNESS_WINDOW);

  const missCounts = emptyMissCounts();
  for (const record of window) {
    for (const id of LING6_SOUND_IDS) {
      if (!record.byPhoneme[id]) {
        missCounts[id] += 1;
      }
    }
  }

  const highlighted = LING6_SOUND_IDS.filter(
    (id) => missCounts[id] >= LING6_WEAKNESS_MISS_THRESHOLD,
  );

  return {
    ready: true,
    missCounts,
    highlighted,
    copy: ling6WeaknessCopy(highlighted),
  };
}
