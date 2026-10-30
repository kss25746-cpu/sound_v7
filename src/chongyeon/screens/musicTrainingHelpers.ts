import type { Song, SongScale } from '../data/songs';
import type { Note } from '../types/music';

/**
 * 판정 창(ms). 노트가 판정선에 닿기 **전후로** 이만큼씩 열려 있다(총 1초).
 *
 * 예전 300ms는 리듬게임 기준이었다. **이 앱이 재려는 것은 박자가 아니라 음높이다** —
 * 밀리초 정밀도는 청력이 아니라 시각·운동 반응을 잰다. 창을 넉넉히 열어
 * "제때 눌렀나"가 아니라 "맞는 건반을 눌렀나"만 남긴다.
 *
 * 여러 후보가 창 안에 들어오면 부르는 쪽이 **가장 가까운 것**을 고르므로,
 * 창이 넓어도 연속음이 엉키지 않는다.
 */
export const HIT_WINDOW_MS = 500;

export interface ScheduledFallingNote {
  id: string;
  note: Note;
  expectedTimestamp: number;
  hitX?: number;
  hitY?: number;
  hit: boolean;
  reached: boolean;
  missed: boolean;
  beat: number;
  timeoutId?: ReturnType<typeof setTimeout>;
}

export interface FallingTrackMetrics {
  x: number;
  y: number;
  judgmentLineY: number;
  laneWidth: number;
  laneStartX: number;
}

export interface FallingResult {
  title: string;
  totalNotes: number;
  /** 맞는 건반을 누른 음의 수. 등급은 나누지 않는다 — `HIT_WINDOW_MS` 주석 참고 */
  hits: number;
  cleared: boolean;
}

export type FallingTempoMode = 'normal' | 'slow';

export const fallingScaleLabels: Record<SongScale, string> = {
  penta5: '5음',
  white8: '8음',
};

export const fallingTempoLabels: Record<FallingTempoMode, string> = {
  normal: '보통',
  slow: '느림',
};

export const computeFocusStart = (
  noteWhiteIdx: number,
  currentStart: number,
  viewportSize: number,
  totalWhite: number
) => {
  // 14건반 페이지 스냅에 맞춘 포커싱 처리
  if (noteWhiteIdx <= 13) return 0;
  if (noteWhiteIdx <= 27) return 14;
  return 16;
};

export const getFallingNoteId = (note: Note, beat: number) => `${note}-${beat}`;

export const getFallingClearTarget = (song: Song | null) => (song?.scale === 'penta5' ? 70 : 80);

/** 틀림 허용 비율. 곡 길이에 곱한 뒤 소수점은 버린다. */
export const FALLING_MAX_MISS_RATIO = 0.2;

export const getFallingMaxMisses = (totalNotes: number) =>
  Math.floor(totalNotes * FALLING_MAX_MISS_RATIO);
