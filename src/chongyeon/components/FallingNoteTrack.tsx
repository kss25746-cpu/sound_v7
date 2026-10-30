"use no memo";

// A는 React Compiler가 켜져 있고(app.json experiments.reactCompiler) B는 아니었다.
// 이 파일은 렌더 중 ref 읽기 등 컴파일러가 가정하는 규칙을 어긴다. 그대로 컴파일하면
// 잘못 메모이즈될 수 있어 **명시적으로 옵트아웃한다.** 규칙을 맞춰 고치면 이 줄을 지운다.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Canvas,
  Group,
  Line,
  Rect,
  RoundedRect,
  Text,
  useFont,
  vec,
  type SkFont,
} from '@shopify/react-native-skia';
import {
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { DoHyeon_400Regular } from '@expo-google-fonts/do-hyeon';
import { Song } from '../data/songs';
import {
  FALLING_COLORS,
  FALLING_LAYOUT,
  LEAD_SECONDS,
  getLaneColors,
  getSolfege,
} from '../constants/fallingTheme';
import type { Note } from '../types/music';

interface FallingNoteTrackProps {
  song: Song | null;
  isPlaying: boolean;
  bpm?: number;
  onNoteSchedule?: (note: Note, expectedTimestamp: number, beat: number) => void;
  onNoteHit?: (note: Note, beat: number, reachedTimestamp: number, hitX: number, hitY: number) => void;
  onSongEnd?: () => void;
  dynamicWhiteKeyWidth?: number;
  laneStartX?: number;
  /**
   * 첫 노트가 판정선에 닿기까지 **최소한 이만큼**은 걸리게 한다(ms).
   *
   * 부모가 카운트인이 남아 있는 채로 트랙을 켜기 때문에 필요하다 — 이 하한이 없으면
   * 아직 숫자를 세고 있는데 음이 떨어질 수 있다. 리드 시간(`LEAD_SECONDS`)이
   * 이미 넉넉해서 지금 값으로는 걸리지 않지만, **걸리지 않는다는 사실이
   * 우연이 아니라 강제된 것**이 되게 둔다.
   */
  introMinMs?: number;
  hitNoteIds?: string[];
  missNoteIds?: string[];
  judgmentPulseKey?: number;
  missPulseKey?: number;
  onTrackMetrics?: (metrics: {
    x: number;
    y: number;
    judgmentLineY: number;
    laneWidth: number;
    laneStartX: number;
  }) => void;
}

const LANE_MARGIN = 10;

const getNoteId = (note: Note, beat: number) => `${note}-${beat}`;

/**
 * 판정선 Y.
 *
 * 예전에는 바닥에서 24px 띄웠다. 그 24px에 트랙 마진·건반 마진이 더해져 노트가
 * **건반 위 약 38px 허공에서 도착**했고, "떨어지는 노트 = 내가 누를 건반"이라는
 * 연결이 그만큼 흐려졌다. 이제는 바닥에 붙인다 — 펄스 때 선이 굵어지므로
 * 굵기 절반만 안으로 들여 아래쪽이 잘리지 않게 한다.
 */
const computeJudgmentLineY = (trackHeight: number) =>
  Math.max(40, trackHeight - FALLING_LAYOUT.judgmentStrokePulse / 2);

type LaidOutNote = {
  id: string;
  note: Note;
  beat: number;
  /** 판정선 도달 시점(= 원래 beat + 도입 박) */
  targetBeat: number;
  durBeats: number;
  laneIndex: number;
};

export const FallingNoteTrack: React.FC<FallingNoteTrackProps> = ({
  song,
  isPlaying,
  bpm = 72,
  onNoteSchedule,
  onNoteHit,
  onSongEnd,
  dynamicWhiteKeyWidth,
  laneStartX = LANE_MARGIN,
  introMinMs = 0,
  hitNoteIds = [],
  missNoteIds = [],
  judgmentPulseKey = 0,
  missPulseKey = 0,
  onTrackMetrics,
}) => {
  const trackRef = useRef<View>(null);
  const trackOriginX = useSharedValue(0);
  const trackOriginY = useSharedValue(0);
  /**
   * 창 크기로 시작하면 안 된다. 앱을 처음 켤 때는 아직 세로 높이인 경우가 있고,
   * 그 값으로 판정선을 그리면 건반 자리에 노트가 떨어진다.
   * 0으로 두고, 아래 `onLayout`이 트랙 상자만 잰 뒤에 그린다.
   */
  const [trackSize, setTrackSize] = useState({ width: 0, height: 0 });
  const trackWidth = trackSize.width;
  const trackHeight = trackSize.height;
  const judgmentLineY = computeJudgmentLineY(trackHeight);

  const [judgmentPulse, setJudgmentPulse] = useState(false);
  const [missPulse, setMissPulse] = useState(false);

  // ── 박자·치수 ────────────────────────────────────────────────
  const effectiveBpm = bpm;
  /**
   * 화면에 담기는 박 수. **시간이 기준이고 박은 결과다.**
   * 박을 고정(예전 `LEAD_BEATS = 4`)하면 120BPM 곡이 72BPM 곡보다 1.7배 빨리
   * 흘러 곡마다 체감 난이도가 달라진다.
   */
  const leadBeats = Math.max(1, (LEAD_SECONDS / 60) * effectiveBpm);
  /** 1박의 세로 길이. 노트 막대 길이가 여기서 나온다 */
  const beatPx = judgmentLineY / leadBeats;
  /**
   * 첫 노트가 나오기 전 도입 박.
   *
   * 조건은 둘이다 — **리드보다 길 것**(그래야 첫 노트가 화면 밖에서 출발한다), 그리고
   * **`introMinMs`보다 길 것**(부모의 카운트인이 끝나기 전에 첫 음이 닿지 않게).
   * 예전에는 여기에 `최소 4박`을 더 걸었는데, 느린 곡에서는 그 4박이 순전히
   * 기다리는 시간이었다. 올림만 하면 박은 여전히 정수라 마디 느낌도 그대로다.
   */
  const introBeats = Math.max(
    Math.ceil(leadBeats),
    Math.ceil((introMinMs / 60000) * effectiveBpm)
  );

  // `?? []`를 그대로 두면 곡이 없을 때 렌더마다 새 배열이라 아래 메모가 전부 깨진다
  const palette = useMemo(() => song?.palette ?? [], [song]);
  const laneCount = Math.max(1, palette.length);
  const laneWidth = dynamicWhiteKeyWidth ?? (trackWidth - LANE_MARGIN * 2) / laneCount;
  const noteWidth = Math.max(8, laneWidth - FALLING_LAYOUT.noteInset * 2);

  // ── 진행 시계 (UI 스레드) ────────────────────────────────────
  const startTimestamp = useSharedValue(-1);
  const currentTime = useSharedValue(0);
  /**
   * 경과 박. 노트 위치·판정·곡 종료가 **모두 이 하나를 본다.**
   * 이전에는 세 곳이 각자 `currentTime / 1000 / 60 * bpm`을 다시 계산했다.
   */
  const currentBeat = useSharedValue(0);
  const songEndFired = useSharedValue(false);
  /**
   * 판정선을 지나보낸 노트의 개수.
   *
   * 예전에는 노트마다 `useDerivedValue` 하나가 도달을 감시했다(60음 곡 = 프레임당
   * 워크릿 60개). 노트는 박 순으로 정렬돼 있으니 **커서 하나**면 충분하다.
   */
  const hitCursor = useSharedValue(0);

  const [baseTimestamp, setBaseTimestamp] = useState<number | null>(null);
  const scheduledKeyRef = useRef<string | null>(null);

  // ── 레인 ─────────────────────────────────────────────────────
  const laneColors = useMemo(() => getLaneColors(palette), [palette]);
  const lanes = useMemo(
    () =>
      palette.map((note, index) => ({
        note,
        color: laneColors[index],
        label: getSolfege(note),
        x: laneStartX + index * laneWidth,
      })),
    [palette, laneColors, laneStartX, laneWidth]
  );

  /**
   * 노트 배치. 박 순으로 정렬해 둔다 — 위 `hitCursor`가 정렬을 전제로 한다.
   *
   * `duration`을 안 적은 음은 **다음 음까지의 간격**(최대 1박)으로 본다.
   * 단선율이라 그 편이 악보와 어긋나지 않는다.
   */
  const laidOutNotes = useMemo<LaidOutNote[]>(() => {
    if (!song) return [];
    const laneIndexOf = new Map<string, number>();
    song.palette.forEach((note, index) => laneIndexOf.set(note, index));

    const sorted = [...song.notes].sort((a, b) => a.beat - b.beat);
    return sorted.map((songNote, index) => {
      const next = sorted[index + 1];
      const gapDur = next ? Math.min(Math.max(next.beat - songNote.beat, 0.25), 1) : 1;
      return {
        id: getNoteId(songNote.note, songNote.beat),
        note: songNote.note,
        beat: songNote.beat,
        targetBeat: songNote.beat + introBeats,
        durBeats: songNote.duration ?? gapDur,
        laneIndex: laneIndexOf.get(songNote.note) ?? -1,
      };
    });
  }, [song, introBeats]);

  /** 판정 커서가 UI 스레드에서 훑을 최소 정보. 렌더 객체를 통째로 넘기지 않는다 */
  const reachPayload = useMemo(
    () =>
      laidOutNotes.map((n) => ({
        note: n.note,
        beat: n.beat,
        targetBeat: n.targetBeat,
        laneIndex: n.laneIndex,
      })),
    [laidOutNotes]
  );

  /** `includes`는 노트 × 노트라 곡이 길수록 제곱으로 는다. 조회는 Set으로 */
  const hitSet = useMemo(() => new Set(hitNoteIds), [hitNoteIds]);
  const missSet = useMemo(() => new Set(missNoteIds), [missNoteIds]);

  // ── 계이름 글자 ──────────────────────────────────────────────
  const labelFontSize = Math.round(Math.max(13, Math.min(26, laneWidth * 0.3)));
  const font = useFont(DoHyeon_400Regular, labelFontSize);
  /** 계이름은 7종뿐이다. 노트마다 재는 대신 한 번 재서 돌려 쓴다 */
  const labelWidths = useMemo(() => {
    const widths: Record<string, number> = {};
    if (!font) return widths;
    lanes.forEach((lane) => {
      widths[lane.label] = font.measureText(lane.label).width;
    });
    return widths;
  }, [font, lanes]);

  // ── 트랙 원점 측정 ───────────────────────────────────────────
  const measureTrackOrigin = (measuredWidth?: number, measuredHeight?: number) => {
    const widthForLane = measuredWidth ?? trackWidth;
    const heightForLine = measuredHeight ?? trackHeight;
    if (heightForLine <= 0) return;

    trackRef.current?.measureInWindow((x, y) => {
      trackOriginX.value = x;
      trackOriginY.value = y;
      if (song) {
        const measuredLaneWidth =
          dynamicWhiteKeyWidth ?? (widthForLane - LANE_MARGIN * 2) / song.palette.length;
        onTrackMetrics?.({
          x,
          y,
          judgmentLineY: computeJudgmentLineY(heightForLine),
          laneWidth: measuredLaneWidth,
          laneStartX,
        });
      }
    });
  };

  // ── 판정선 펄스 ──────────────────────────────────────────────
  useEffect(() => {
    if (judgmentPulseKey === 0) return;
    setJudgmentPulse(true);
    const timer = setTimeout(() => setJudgmentPulse(false), 140);
    return () => clearTimeout(timer);
  }, [judgmentPulseKey]);

  useEffect(() => {
    if (missPulseKey === 0) return;
    setMissPulse(true);
    const timer = setTimeout(() => setMissPulse(false), 180);
    return () => clearTimeout(timer);
  }, [missPulseKey]);

  /**
   * 멈춰 있는 동안 1회성 상태를 되돌린다.
   *
   * `startFallingNoteMode`가 카운트다운을 먼저 띄우므로 **매 판 앞에 반드시
   * `isPlaying === false` 구간이 있다.** 그래서 여기서 되돌리면 충분하다 —
   * 재생 중에 손대면 첫 프레임과 경합한다.
   */
  useEffect(() => {
    if (isPlaying) return;
    startTimestamp.value = -1;
    currentTime.value = 0;
    currentBeat.value = 0;
    songEndFired.value = false;
    hitCursor.value = 0;
    scheduledKeyRef.current = null;
    setBaseTimestamp(null);
  }, [isPlaying, song?.id, startTimestamp, currentTime, currentBeat, songEndFired, hitCursor]);

  /**
   * 곡 종료 판정용 박. **`song` 객체를 워크릿에 넘기지 않으려고** 숫자로 접어 둔다
   * (워크릿은 렌더마다 다시 만들어지고, 그때마다 클로저가 UI 스레드로 직렬화된다).
   */
  const songEndBeat = useMemo(() => {
    if (!song || song.notes.length === 0) return 0;
    let lastBeat = 0;
    let lastDuration = 1;
    for (const songNote of song.notes) {
      if (songNote.beat < lastBeat) continue;
      lastBeat = songNote.beat;
      lastDuration = songNote.duration ?? 1;
    }
    // 끝 음이 2박보다 길면 그 길이만큼 기다린다. 짧은 끝 음은 예전처럼 2박이다.
    return lastBeat + introBeats + Math.max(2, lastDuration);
  }, [song, introBeats]);

  useFrameCallback((frame) => {
    if (!isPlaying) {
      startTimestamp.value = -1;
      return;
    }

    if (startTimestamp.value === -1) {
      startTimestamp.value = frame.timestamp;
      // `Date.now()`는 **워크릿 안**에서 찍힌다 = UI 스레드의 이 프레임 시각이다.
      // 부모의 판정(`expectedTimestamp`)이 이 값을 원점으로 삼는다
      runOnJS(setBaseTimestamp)(Date.now());
    }

    currentTime.value = frame.timestamp - startTimestamp.value;
    currentBeat.value = (currentTime.value / 60000) * effectiveBpm;

    if (!songEndFired.value && songEndBeat > 0 && currentBeat.value > songEndBeat) {
      songEndFired.value = true;
      if (onSongEnd) runOnJS(onSongEnd)();
    }
  }, true);

  /**
   * 노트가 판정선에 닿는 순간을 부모에게 알린다(미스 타이머 시작점).
   *
   * 노트마다 감시자를 두는 대신 커서를 앞으로만 밀어, **프레임당 워크릿 하나**로 끝낸다.
   */
  useAnimatedReaction(
    () => currentBeat.value,
    (beat) => {
      if (!isPlaying || !onNoteHit) return;
      while (hitCursor.value < reachPayload.length) {
        const item = reachPayload[hitCursor.value];
        if (item.targetBeat > beat) break;
        hitCursor.value += 1;
        if (item.laneIndex < 0) continue;

        const reachedTimestamp = Date.now();
        const hitX = trackOriginX.value + laneStartX + item.laneIndex * laneWidth + laneWidth / 2;
        const hitY = trackOriginY.value + judgmentLineY;
        runOnJS(onNoteHit)(item.note, item.beat, reachedTimestamp, hitX, hitY);
      }
    },
    [reachPayload, isPlaying, onNoteHit, laneStartX, laneWidth, judgmentLineY]
  );

  // 재생이 시작되어 baseTimestamp가 세팅되면, 모든 노트의 스케줄을 부모에게 전달합니다.
  useEffect(() => {
    if (!isPlaying || baseTimestamp === null || !onNoteSchedule || !song) {
      return;
    }

    const scheduleKey = `${song.id}-${baseTimestamp}`;
    if (scheduledKeyRef.current === scheduleKey) {
      return;
    }

    scheduledKeyRef.current = scheduleKey;
    laidOutNotes.forEach((n) => {
      // targetBeat에 도입 박이 이미 들어 있다
      const hitTimeMs = (n.targetBeat / effectiveBpm) * 60 * 1000;
      onNoteSchedule(n.note, baseTimestamp + hitTimeMs, n.beat);
    });
  }, [baseTimestamp, effectiveBpm, isPlaying, song, onNoteSchedule, laidOutNotes]);

  // ── 렌더 ─────────────────────────────────────────────────────
  if (!song) return null;

  const lastLaneX = lanes.length > 0 ? lanes[lanes.length - 1].x + laneWidth : trackWidth;
  const firstLaneX = lanes.length > 0 ? lanes[0].x : 0;

  return (
    <View
      ref={trackRef}
      style={styles.container}
      onLayout={(event) => {
        const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
        setTrackSize((prev) =>
          Math.abs(prev.width - nextWidth) < 0.5 && Math.abs(prev.height - nextHeight) < 0.5
            ? prev
            : { width: nextWidth, height: nextHeight },
        );
        measureTrackOrigin(nextWidth, nextHeight);
      }}
    >
      {trackHeight > 0 && trackWidth > 0 && (
      <Canvas style={styles.canvas}>
        {/* 레인 밴드 — 선 하나보다 교대 면이 눈으로 훑기 쉽다 */}
        {lanes
          .filter((_, index) => index % 2 === 1)
          .map((lane) => (
            <Rect
              key={`band-${lane.note}`}
              x={lane.x}
              y={0}
              width={laneWidth}
              height={trackHeight}
              color={FALLING_COLORS.laneBand}
            />
          ))}

        {/* 레인 경계 */}
        {lanes.map((lane) => (
          <Line
            key={`line-${lane.note}`}
            p1={vec(lane.x, 0)}
            p2={vec(lane.x, trackHeight)}
            color={FALLING_COLORS.laneLine}
            strokeWidth={1}
          />
        ))}
        <Line
          p1={vec(lastLaneX, 0)}
          p2={vec(lastLaneX, trackHeight)}
          color={FALLING_COLORS.laneLine}
          strokeWidth={1}
        />

        {/* 착지 패드 — 노트가 닿을 자리를 레인 색으로 미리 알려준다 */}
        {lanes.map((lane) => (
          <RoundedRect
            key={`pad-${lane.note}`}
            x={lane.x + FALLING_LAYOUT.noteInset}
            y={judgmentLineY - FALLING_LAYOUT.padHeight}
            width={noteWidth}
            height={FALLING_LAYOUT.padHeight}
            r={4}
            color={lane.color}
            opacity={0.18}
          />
        ))}

        {/* 판정선 */}
        <Line
          p1={vec(firstLaneX, judgmentLineY)}
          p2={vec(lastLaneX, judgmentLineY)}
          color={
            missPulse
              ? FALLING_COLORS.judgmentMiss
              : judgmentPulse
                ? FALLING_COLORS.judgmentHit
                : FALLING_COLORS.judgment
          }
          strokeWidth={
            judgmentPulse || missPulse
              ? FALLING_LAYOUT.judgmentStrokePulse
              : FALLING_LAYOUT.judgmentStroke
          }
        />

        {/* 노트 */}
        {laidOutNotes.map((n, index) => {
          if (n.laneIndex < 0) return null;
          const lane = lanes[n.laneIndex];
          const noteHeight = Math.max(
            FALLING_LAYOUT.minNoteHeight,
            n.durBeats * beatPx - FALLING_LAYOUT.noteGap
          );
          const isHit = hitSet.has(n.id);
          const isMiss = missSet.has(n.id);
          return (
            <FallingNote
              key={`note-${n.id}-${index}`}
              targetBeat={n.targetBeat}
              currentBeat={currentBeat}
              leadBeats={leadBeats}
              judgmentLineY={judgmentLineY}
              x={lane.x + FALLING_LAYOUT.noteInset}
              width={noteWidth}
              height={noteHeight}
              color={isMiss ? FALLING_COLORS.miss : isHit ? FALLING_COLORS.hit : lane.color}
              label={lane.label}
              labelWidth={labelWidths[lane.label] ?? 0}
              labelFontSize={labelFontSize}
              font={font}
              isHit={isHit}
              isMiss={isMiss}
              isPlaying={isPlaying}
            />
          );
        })}
      </Canvas>
      )}
    </View>
  );
};

type FallingNoteProps = {
  targetBeat: number;
  currentBeat: SharedValue<number>;
  leadBeats: number;
  judgmentLineY: number;
  x: number;
  width: number;
  height: number;
  color: string;
  label: string;
  labelWidth: number;
  labelFontSize: number;
  font: SkFont | null;
  isHit: boolean;
  isMiss: boolean;
  isPlaying: boolean;
};

/**
 * 노트 한 개.
 *
 * **착지한 자리에 그려 두고 `transform`으로 끌어올린다.** 막대와 계이름이 한
 * `Group`을 타므로 글자용 파생값이 따로 필요 없다 — 노트당 파생값은 위치 1 + 투명도 1.
 */
const FallingNote: React.FC<FallingNoteProps> = ({
  targetBeat,
  currentBeat,
  leadBeats,
  judgmentLineY,
  x,
  width,
  height,
  color,
  label,
  labelWidth,
  labelFontSize,
  font,
  isHit,
  isMiss,
  isPlaying,
}) => {
  const resolveOpacity = useSharedValue(1);

  useEffect(() => {
    if (isHit || isMiss) {
      resolveOpacity.value = 1;
      resolveOpacity.value = withTiming(0, { duration: isHit ? 200 : 320 });
      return;
    }
    resolveOpacity.value = 1;
  }, [isHit, isMiss, resolveOpacity]);

  const transform = useDerivedValue(() => {
    const distanceBeats = targetBeat - currentBeat.value;
    return [{ translateY: -(distanceBeats / leadBeats) * judgmentLineY }];
  });

  const opacity = useDerivedValue(() => {
    if (!isPlaying) return 0;
    if (isHit || isMiss) return resolveOpacity.value;
    const distanceBeats = targetBeat - currentBeat.value;
    // 판정선 1박 아래(=지나간 직후)부터 화면 상단까지만 그린다
    return distanceBeats <= leadBeats && distanceBeats >= -1 ? 1 : 0;
  });

  const top = judgmentLineY - height;
  const showLabel = font !== null && height >= FALLING_LAYOUT.minLabelHeight;

  return (
    <Group transform={transform} opacity={opacity}>
      <RoundedRect
        x={x}
        y={top}
        width={width}
        height={height}
        r={FALLING_LAYOUT.noteRadius}
        color={color}
      />
      {showLabel && (
        <Text
          x={x + (width - labelWidth) / 2}
          // measureText는 베이스라인 기준이라 글자 높이의 약 1/3을 내려야 가운데에 온다
          y={top + height / 2 + labelFontSize * 0.36}
          text={label}
          font={font}
          color={FALLING_COLORS.noteLabel}
        />
      )}
    </Group>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FALLING_COLORS.track,
  },
  canvas: {
    flex: 1,
  },
});
