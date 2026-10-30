import {
  INSTRUMENT_IDS,
  instrumentLabel,
  type InstrumentId,
} from "@/training/inst/instruments";
import {
  INST_NOTE_IDS,
  type InstNoteId,
} from "@/training/inst/instSounds";

/**
 * 악기 소리 식별 세션 — 한 음을 듣고 어느 악기인지 넷 중에서 고른다.
 *
 * 「듣고 고르기」 틀은 링 6·문장 듣기와 같다. 다른 점은 **무음 시행이 없다**는
 * 것이다. 링 6은 「들렸나」를 보는 검출 과제라 무음이 필요하지만, 여기는
 * 「무엇이었나」를 보는 식별 과제여서 무음은 답할 수 없는 문항이 된다.
 */

export type Rng = () => number;

/**
 * 시행마다 굴리는 기음은 `instSounds.ts`의 `INST_NOTES`(G4·A4·C5·E5)다.
 *
 * **음고를 고정하면 안 된다** — 한 악기가 늘 같은 높이로 나오면 음색이 아니라
 * 높이를 외워서 고를 수 있다. 그래서 한 악기의 세 시행에는 **서로 다른 음**을 준다.
 * 넷 다 같은 목록에서 뽑으므로 음역 자체는 단서가 되지 않는다.
 *
 * `주의`: **악기마다 음을 다르게 주면 안 된다.** 한 악기만 낮추면 「낮은 소리 =
 * 그 악기」가 되어 위 문장이 깨진다. 넷이 같은 목록을 쓰되 **목록 자체를 넷 다
 * 편한 자리에 놓는다** — 왜 그 옥타브인지는 `instSounds.ts`에 적어 뒀다.
 */

/** 악기당 시행 수. 넷 × 3 = 12문항 — 링 6(8)보다 길고 문장 듣기(18)보다 짧다. */
export const REPEATS_PER_INSTRUMENT = 3;

export const INST_TRIAL_COUNT =
  INSTRUMENT_IDS.length * REPEATS_PER_INSTRUMENT;

export type InstTrial = {
  target: InstrumentId;
  /** 이 시행에서 쓸 기음. 음원 파일을 고르는 열쇠다(`instSounds.ts`). */
  note: InstNoteId;
};

export type InstOutcome = {
  target: InstrumentId;
  choice: InstrumentId;
  correct: boolean;
};

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
 * 같은 악기가 연달아 나오지 않게 순서를 짠다.
 *
 * 섞고 나서 겹치면 다시 섞는 식으로 하면 언제 끝날지 알 수 없다. 대신 **남은
 * 개수가 가장 많은 것 중에서** 직전과 다른 것을 고른다 — 개수가 고른 묶음에서는
 * 이 방법이 막다른 길에 빠지지 않는다.
 */
function orderWithoutRuns(
  counts: Map<InstrumentId, number>,
  rng: Rng,
): InstrumentId[] {
  const order: InstrumentId[] = [];
  let previous: InstrumentId | null = null;

  for (;;) {
    const available = [...counts.entries()].filter(
      ([id, left]) => left > 0 && id !== previous,
    );
    if (available.length === 0) {
      break;
    }
    const most = Math.max(...available.map(([, left]) => left));
    const best = available.filter(([, left]) => left === most);
    const picked = best[Math.floor(rng() * best.length)] ?? best[0];
    if (!picked) {
      break;
    }
    const [id, left] = picked;
    counts.set(id, left - 1);
    order.push(id);
    previous = id;
  }

  return order;
}

/**
 * 12시행. 악기마다 3번씩 나오고, 같은 악기가 연달아 오지 않으며,
 * 한 악기의 세 시행은 서로 다른 높이로 난다.
 */
export function createInstTrials(rng: Rng = Math.random): InstTrial[] {
  const counts = new Map<InstrumentId, number>(
    INSTRUMENT_IDS.map((id) => [id, REPEATS_PER_INSTRUMENT]),
  );
  const order = orderWithoutRuns(counts, rng);

  // 악기별로 음을 섞어 두고 나온 차례대로 하나씩 꺼낸다.
  const notesLeft = new Map<InstrumentId, InstNoteId[]>(
    INSTRUMENT_IDS.map((id) => [id, shuffleInPlace([...INST_NOTE_IDS], rng)]),
  );

  return order.map((id) => {
    const queue = notesLeft.get(id) ?? [];
    const note = queue.shift() ?? INST_NOTE_IDS[0] ?? "a4";
    return { target: id, note };
  });
}

export function scoreInstChoice(
  target: InstrumentId,
  choice: InstrumentId,
): boolean {
  return target === choice;
}

/** 한 세션의 숫자 요약. 저장·통계가 쓰는 값이며 점수·진단이 아니다. */
export type InstSummary = {
  trialCount: number;
  correctCount: number;
  percent: number;
};

export function summarizeInst(
  outcomes: readonly InstOutcome[],
): InstSummary {
  const trialCount = outcomes.length;
  const correctCount = outcomes.filter((row) => row.correct).length;
  const percent =
    trialCount === 0 ? 0 : Math.round((100 * correctCount) / trialCount);
  return { trialCount, correctCount, percent };
}

export type InstrumentTally = {
  trialCount: number;
  correctCount: number;
};

/**
 * 악기별 맞힌 수. 요약 화면에서만 쓴다 — **저장소에는 안 넣는다**
 * (기록 형식을 percent 셋으로 두어 단어·문장 듣기와 같은 추세 그림을 쓴다).
 */
export function collectInstrumentResults(
  outcomes: readonly InstOutcome[],
): Record<InstrumentId, InstrumentTally> {
  const tally = Object.fromEntries(
    INSTRUMENT_IDS.map((id) => [id, { trialCount: 0, correctCount: 0 }]),
  ) as Record<InstrumentId, InstrumentTally>;

  for (const outcome of outcomes) {
    const row = tally[outcome.target];
    row.trialCount += 1;
    if (outcome.correct) {
      row.correctCount += 1;
    }
  }
  return tally;
}

/** 요약 한 줄. 다 못 채우고 끝냈으면 기록에 안 남는다는 것까지 말해 준다. */
export function instResultCopy(summary: InstSummary): string {
  if (summary.trialCount <= 0) {
    return "연습이 짧아서 기록할 내용이 없어요";
  }
  if (summary.trialCount < INST_TRIAL_COUNT) {
    return `${summary.trialCount}개 중 ${summary.correctCount}개를 맞혔어요. ${INST_TRIAL_COUNT}개를 다 고르지 않아 기록에는 안 남겼어요`;
  }
  return `${INST_TRIAL_COUNT}개 중 ${summary.correctCount}개를 맞혔어요`;
}

/**
 * 이번 연습에서 가장 아쉬웠던 악기 id. 판정이 아니라 **이번 기록**이다.
 * 다 맞혔거나, 넷이 같은 횟수로 틀리면 null. 동점이 둘·셋이면 같이 돌려준다.
 */
export function instWeakestIds(
  tally: Record<InstrumentId, InstrumentTally>,
): InstrumentId[] | null {
  const missed = INSTRUMENT_IDS.map((id) => ({
    id,
    miss: tally[id].trialCount - tally[id].correctCount,
  })).filter((row) => row.miss > 0);

  if (missed.length === 0) {
    return null;
  }
  const worst = Math.max(...missed.map((row) => row.miss));
  const leaders = missed.filter((row) => row.miss === worst);
  if (leaders.length === 0 || leaders.length === INSTRUMENT_IDS.length) {
    return null;
  }
  return leaders.map((row) => row.id);
}

/** 요약 문장. 화면은 그림으로 바꾸고, 읽기 전용 라벨·테스트가 쓴다. */
export function instWeakestCopy(
  tally: Record<InstrumentId, InstrumentTally>,
): string | null {
  const ids = instWeakestIds(tally);
  if (!ids) {
    return null;
  }
  const names = ids.map((id) => instrumentLabel(id)).join("·");
  return `이번엔 ${names} 소리가 가장 아쉬웠어요`;
}
