import {
  ACTIONS,
  sceneIdOf,
  SUBJECTS,
  type ActionId,
  type SceneId,
  type SubjectId,
} from "@/training/sentClosed/scenes";

export type Rng = () => number;

export type TrialKind = "A" | "B";

export type ChoiceTriple = readonly [SceneId, SceneId, SceneId];

/** A형 = 행동 변별(같은 주어 행). B형 = 주어 변별(같은 행동 열). */
export type ClosedSentTrial = {
  id: string;
  kind: TrialKind;
  target: SceneId;
  /** 격자에서 나온 세트. 표시 순서와 다를 수 있음. */
  choiceSet: ChoiceTriple;
  /** 화면에 그릴 순서. */
  choices: ChoiceTriple;
};

export type ClosedSentOutcome = {
  target: SceneId;
  choice: SceneId;
  correct: boolean;
};

function rowOf(subject: SubjectId): ChoiceTriple {
  return [
    sceneIdOf(subject, "phone"),
    sceneIdOf(subject, "medicine"),
    sceneIdOf(subject, "umbrella"),
  ];
}

function colOf(action: ActionId): ChoiceTriple {
  return [
    sceneIdOf("father", action),
    sceneIdOf("mother", action),
    sceneIdOf("postman", action),
  ];
}

function toTriple(ids: readonly SceneId[]): ChoiceTriple {
  const first = ids[0];
  const second = ids[1];
  const third = ids[2];
  if (!first || !second || !third) {
    throw new Error("choice set must have 3 scenes");
  }
  return [first, second, third];
}

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

function shuffleTriple(set: ChoiceTriple, rng: Rng): ChoiceTriple {
  return toTriple(shuffleInPlace([...set], rng));
}

function buildCanonicalTrials(): readonly ClosedSentTrial[] {
  const trials: ClosedSentTrial[] = [];
  let aIndex = 1;
  for (const subject of SUBJECTS) {
    const choiceSet = rowOf(subject);
    for (const action of ACTIONS) {
      const target = sceneIdOf(subject, action);
      trials.push({
        id: `A${aIndex}`,
        kind: "A",
        target,
        choiceSet,
        choices: choiceSet,
      });
      aIndex += 1;
    }
  }
  let bIndex = 1;
  for (const action of ACTIONS) {
    const choiceSet = colOf(action);
    for (const subject of SUBJECTS) {
      const target = sceneIdOf(subject, action);
      trials.push({
        id: `B${bIndex}`,
        kind: "B",
        target,
        choiceSet,
        choices: choiceSet,
      });
      bIndex += 1;
    }
  }
  return trials;
}

/** A1–A9 다음 B1–B9. 칸 순서는 격자 그대로. */
export const SENT_CLOSED_TRIALS: readonly ClosedSentTrial[] =
  buildCanonicalTrials();

/** 짧은 한 판. 전체 18개 중에서 뽑는다. */
export const SENT_CLOSED_SHORT_COUNT = 9;

/** 한 판의 문항 수. 9(짧게) 또는 18(전부). */
export type SentClosedSessionLength = 9 | 18;

/**
 * 전체 한 판 = 격자에서 나오는 A9 + B9.
 *
 * `SENT_CLOSED_TRIALS.length`로 두면 타입이 `number`가 되어 `SentClosedSessionLength`
 * 자리에 못 들어간다(타입 에러 5건의 뿌리였다). 리터럴로 고정하고, 격자 구성이 바뀌어
 * 개수가 달라지면 **불러오는 순간 터지게** 검사를 둔다 — 조용히 어긋나는 것보다 낫다.
 */
export const SENT_CLOSED_TRIAL_COUNT = 18 satisfies SentClosedSessionLength;

if (SENT_CLOSED_TRIALS.length !== SENT_CLOSED_TRIAL_COUNT) {
  throw new Error(
    `문장 듣기 문항 수가 ${SENT_CLOSED_TRIAL_COUNT}개가 아니다: ${SENT_CLOSED_TRIALS.length}개. ` +
      "격자를 바꿨다면 SENT_CLOSED_TRIAL_COUNT와 SentClosedSessionLength를 같이 고칠 것.",
  );
}

export function isSentClosedSessionLength(
  value: number,
): value is SentClosedSessionLength {
  return (
    value === SENT_CLOSED_SHORT_COUNT || value === SENT_CLOSED_TRIAL_COUNT
  );
}

/**
 * 문항 순서와 각 문항의 칸 위치를 섞는다.
 * `count`가 9면 섞은 18개 앞에서 9개만 쓴다. 정답 세트(행/열)는 그대로다.
 */
export function createSentClosedTrials(
  rng: Rng = Math.random,
  count: SentClosedSessionLength = SENT_CLOSED_TRIAL_COUNT,
): ClosedSentTrial[] {
  const shuffled = shuffleInPlace(
    SENT_CLOSED_TRIALS.map((trial) => ({
      ...trial,
      choices: shuffleTriple(trial.choiceSet, rng),
    })),
    rng,
  );
  return shuffled.slice(0, count);
}

export function scoreSentClosedChoice(
  target: SceneId,
  choice: SceneId,
): boolean {
  return target === choice;
}

/** 한 세션의 숫자 요약. 저장·통계가 쓰는 값이며 점수·진단이 아니다. */
export type SentClosedSummary = {
  trialCount: number;
  correctCount: number;
  percent: number;
};

export function summarizeSentClosed(
  outcomes: readonly ClosedSentOutcome[],
): SentClosedSummary {
  const trialCount = outcomes.length;
  const correctCount = outcomes.filter((row) => row.correct).length;
  const percent =
    trialCount === 0 ? 0 : Math.round((100 * correctCount) / trialCount);
  return { trialCount, correctCount, percent };
}

/** 요약 일지. 맞힌 개수·비율은 안 넣는다. */
export function sentClosedResultCopy(
  trialCount: number,
  plannedCount: SentClosedSessionLength = SENT_CLOSED_TRIAL_COUNT,
): string {
  if (trialCount <= 0) {
    return "연습이 짧아서 기록할 내용이 없어요";
  }
  if (trialCount !== plannedCount) {
    return `${trialCount}개를 고르고 마쳤어요. ${plannedCount}개를 다 고르지 않아 기록에는 안 남겼어요`;
  }
  return `문장 ${plannedCount}개를 들었어요`;
}
