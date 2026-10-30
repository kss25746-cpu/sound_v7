"use no memo";

// A는 React Compiler가 켜져 있고(app.json experiments.reactCompiler) B는 아니었다.
// 이 파일은 렌더 중 ref 읽기 등 컴파일러가 가정하는 규칙을 어긴다. 그대로 컴파일하면
// 잘못 메모이즈될 수 있어 **명시적으로 옵트아웃한다.** 규칙을 맞춰 고치면 이 줄을 지운다.

import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,

} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

// Context 및 컴포넌트 임포트
import { useCorrectConfetti } from '../components/CorrectConfetti';
import { LandscapeBackButton } from '../components/LandscapeBackButton';
import MissionProgressIcon from '../components/MissionProgressIcon';
import {
  clampRound,
  FreeModePanel,
  InstrumentControlBar,
  TrainingModePanel,
  useInstrumentMetrics,
} from '../components/instrument';
import { CONSOLE, CONSOLE_BAR_HEIGHT } from '../constants/consoleTheme';
import { CONTROL_BAR, INSTRUMENT_ACCENT } from '../constants/instrumentTheme';
import { FALLING_COLORS, FALLING_LAYOUT, getLaneColorMap, getSolfege } from '../constants/fallingTheme';
import { colors, fontSize, opacity } from '../constants/musicTrainingTheme';
import * as mt from '../constants/musicTrainingLayout';
import { ClearContext } from '../context/ClearContext';
import { StarContext } from '../context/StarContext';
import { RippleLayer } from '../components/RippleLayer';
import { ParticleVisualizer } from '../components/ParticleVisualizer';
import { MiniKeyboardMap } from '../components/MiniKeyboardMap';
import { FallingNoteTrack } from '../components/FallingNoteTrack';
import { FallingReplayPrompt, FallingResultOverlay } from '../components/FallingResultOverlays';
import { songs, type Song, type SongScale } from '../data/songs';
import { useStopAudioOnBlur } from "@/hooks/use-stop-audio-on-blur";
import type { Difficulty, Note } from '../types/music';
import {
  MUSIC_PROGRESS_KEY,
  MUSIC_SOUND_PRESET_KEY,
  allNotes,
  difficultyLevels,
  isBlackKeyMap,
  level1_absoluteBeginner,
  level2_beginner,
  level3_intermediate,
  level4_advanced,
  level5_specialTraining,
  noteToKeyMap,
  presetSoundFiles,
  soundPresets,
  whiteIdxRefById,
  type MusicProgress,
  type SoundPreset,
} from '../constants/music';
import {
  HIT_WINDOW_MS,
  computeFocusStart,
  getFallingClearTarget,
  getFallingMaxMisses,
  getFallingNoteId,
  type FallingResult,
  type FallingTrackMetrics,
  type ScheduledFallingNote,
} from './musicTrainingHelpers';
import { sendRecord } from '@/chongyeon/hooks/useSyncGameData';



const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PIANO = INSTRUMENT_ACCENT.piano;

/**
 * 카운트인(3 → 2 → 1 → Start). 숫자 하나가 머무는 시간과 `Start`가 머무는 시간.
 *
 * 예전 700/500(합 2.6초)에 트랙 도입 박까지 붙으면 첫 음까지 5초가 넘었다.
 */
const PREVIEW_STEP_MS = 500;
const PREVIEW_START_MS = 300;

/**
 * **트랙을 켜는 지점.** `previewCount`가 이 값까지 내려오면 노트가 내려오기 시작한다.
 *
 * 예전에는 카운트인이 **전부 끝난 뒤에야**(`previewCount === null`) 트랙이 돌아서,
 * 3-2-1 동안 1.8초가 통째로 정지 화면이었다. 겹쳐 놓으면 숫자를 세는 사이에
 * 노트가 이미 내려와, 첫 음까지 걸리는 시간이 약 1초 줄어든다.
 *
 * `0`(= 완전히 겹침)이 아니라 `1`인 이유: 카운트인 시작과 동시에 켜면 `Start`가
 * 사라지고 첫 음이 닿기까지 최악 0.4초밖에 안 남는다. 노트가 다가오는 걸 볼 새가 없다.
 */
const PREVIEW_PLAY_FROM = 1;

/**
 * 트랙이 돌기 시작한 뒤 카운트인에 **남아 있는** 시간.
 *
 * 첫 노트는 이 시간이 지나기 전에 판정선에 닿으면 안 된다 — 아직 `2`를 세고 있는데
 * 음이 떨어지는 꼴이 된다. 아래 `introMinMs`로 트랙에 이 하한을 넘긴다.
 */
const PREVIEW_REMAINING_AFTER_PLAY_MS = PREVIEW_PLAY_FROM * PREVIEW_STEP_MS + PREVIEW_START_MS;

/** 카운트인이 걷힌 뒤 노트가 다가오는 걸 지켜볼 최소 시간 */
const PREVIEW_APPROACH_MARGIN_MS = 600;

/**
 * 정답 뒤 다음 문제음까지. 원래 1초였는데 **콘페티가 다 걷힐 때까지** 기다리도록 늘렸다.
 *
 * 콘페티 총 지속은 `(발 수 − 1) × 간격 + 한 발`이라 지금 설정으로 2.1초다
 * (`CorrectConfetti`의 `CORRECT_CONFETTI_BURST_COUNT`·`_GAP_MS`·`_DURATION_MS`).
 * **저쪽을 늘리면 이 값도 같이 봐야 한다** — 안 그러면 다음 문제음 위로 콘페티가 남는다.
 *
 * 미션 성공 분기는 2.5초라 아직 콘페티(2.1초)보다 길어 건드리지 않는다.
 * 다만 여유가 0.4초뿐이니, 콘페티를 더 늘리면 **그 분기도 함께** 봐야 한다.
 */
const NEXT_QUESTION_DELAY_MS = 2150;

const useAutoFocusViewport = ({
  currentNote,
  viewportStartIdx,
  setViewportStartIdx,
  totalWhite,
  viewportSize = 14,
}: {
  currentNote: string | null;
  viewportStartIdx: number;
  setViewportStartIdx: React.Dispatch<React.SetStateAction<number>>;
  totalWhite: number;
  viewportSize?: number;
}) => {
  const startRef = useRef(viewportStartIdx);

  useEffect(() => {
    startRef.current = viewportStartIdx;
  }, [viewportStartIdx]);

  useEffect(() => {
    if (currentNote == null) return;
    const noteWhiteIdx = whiteIdxRefById.get(currentNote);
    if (noteWhiteIdx == null) return;

    const base = startRef.current;
    const target = computeFocusStart(noteWhiteIdx, base, viewportSize, totalWhite);
    if (target === base) return;

    startRef.current = target;
    setViewportStartIdx(target);
  }, [currentNote, totalWhite, viewportSize, setViewportStartIdx]);
};

/**
 * 상주시킬 건반 플레이어 수.
 *
 * 안드로이드는 **앱(UID)당 동시 AudioTrack을 약 40개로 제한**한다. `createAudioPlayer`는
 * 재생 여부와 무관하게 만드는 즉시 트랙 하나를 잡으므로(내부에서 `prepare()`까지 한다),
 * 52개를 미리 만들면 한도를 넘겨 **만들어지자마자 죽고 `play()`가 무음이 된다.**
 * 넘겼을 때 뜨는 로그: `AF::Track: no more tracks available` / `Cannot create AudioTrack`.
 *
 * 12인 이유: 동물 12 · 단어 8 · 드럼 5 = **25개가 앱 수명 동안 상주**하므로
 * 이 화면 몫은 15 안팎이다. 한도는 12로 둔다. 예전 15는 그 계산 없이 고른 값이었다.
 *
 * 화면에는 27건반(백건 16 + 흑건 11)이 보이므로 **12는 한 화면을 다 못 덮는다.**
 * 처음 누르는 음과 축출된 음을 다시 누를 때 지연이 있다. 한도 안에서의 의도된 절충이다.
 * 한도가 차면 새로 만들지 않고 **가장 오래된 플레이어를 멈추고 음원만 바꿔(`replace`) 쓴다.**
 * 울리는 음을 건너뛰고 새로 만들던 시절엔 12를 넘어 디코더 오류로 건반이 무음이 됐다.
 *
 * 근거: `docs/재생-키포인트.md` · `docs/피아노기타-무음-원인과-해결_2026-10-26.md`
 */
const CACHE_LIMIT = 12;

/** AsyncStorage에서 읽은 값은 남의 손을 거친 문자열이다. `soundPresets`와 대조해야 한다 */
const isSoundPreset = (value: string | null): value is SoundPreset =>
  soundPresets.some(preset => preset.id === value);

type TrainingMode = 'random' | 'falling' | null;

// 2.5D 타격감을 제공하는 개별 피아노 건반 컴포넌트 (UI 스레드 구동)
const PianoKey = React.memo(({
  note,
  isBlack,
  isVisible,
  width,
  height,
  leftPosition,
  onPressIn,
  onPressOut,
  showKeyLabels,
  keyboardLabel,
  accentColor,
  displayLabel,
  labelSize,
}: {
  note: Note;
  isBlack: boolean;
  isVisible: boolean;
  width: number;
  height: number;
  leftPosition?: number;
  onPressIn: (note: Note, event: any) => void;
  onPressOut: (note: Note) => void;
  showKeyLabels: boolean;
  keyboardLabel?: string;
  /** 낙하 트랙의 레인 색. 건반 머리에 띠로 깔아 **노트 색 = 건반**을 잇는다 */
  accentColor?: string;
  /** 음이름(C4) 대신 보일 글자. 낙하 모드에서는 계이름(도)이 먼저다 */
  displayLabel?: string;
  /** 건반 폭에서 나온 글자 크기. `getKeyLabelSize` 참고 — 스타일에 박힌 값이 아니다 */
  labelSize: number;
}) => {
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      backgroundColor: isBlack
        ? (translateY.value > 0 ? colors.blackKeyPressed : colors.blackKeyIdle)
        : (translateY.value > 0 ? colors.whiteKeyPressed : colors.whiteKeyIdle),
    };
  });

  const handlePressIn = (event: any) => {
    if (!isVisible) return;

    // Y축으로 즉시 눌림 작동 (백건 18px, 흑건 14px)
    translateY.value = isBlack ? mt.motion.blackKeyPressTranslateY : mt.motion.keyPressTranslateY;

    onPressIn(note, event);
  };

  const handlePressOut = () => {
    if (!isVisible) return;

    // 부드럽게 원위치로 복구
    translateY.value = withTiming(0, { duration: 80 });

    onPressOut(note);
  };

  if (isBlack) {
    return (
      <AnimatedPressable
        disabled={!isVisible}
        style={[
          styles.blackKey,
          { width, height, left: leftPosition },
          animatedStyle,
          !isVisible && styles.keyDisabled,
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Text
          style={[
            styles.blackKeyTextLabel,
            { fontSize: labelSize },
            !isVisible && styles.keyLabelDisabled,
          ]}
        >
          {note}
        </Text>
        {showKeyLabels && keyboardLabel && (
          <Text style={[styles.blackKeyLabel, !isVisible && styles.keyLabelDisabled]}>{keyboardLabel}</Text>
        )}
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      disabled={!isVisible}
      style={[
        styles.whiteKey,
        { width, height },
        animatedStyle,
        !isVisible && styles.whiteKeyDisabled,
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {accentColor && (
        <View style={[styles.keyAccent, { backgroundColor: accentColor }]} pointerEvents="none" />
      )}
      <Text
        style={[
          styles.keyTextLabel,
          { fontSize: labelSize },
          !isVisible && styles.keyLabelDisabled,
        ]}
      >
        {displayLabel ?? note}
      </Text>
      {showKeyLabels && keyboardLabel && (
        <Text style={[styles.whiteKeyLabel, !isVisible && styles.keyLabelDisabled]}>{keyboardLabel}</Text>
      )}
    </AnimatedPressable>
  );
});

// React.memo라 이름이 안 붙는다. 개발자 도구·에러 스택에서 보이게 직접 준다.
PianoKey.displayName = "PianoKey";

/**
 * 건반 글자 크기를 **건반 폭에서 뽑는다.**
 *
 * 예전에는 `keyTextLabel`에 박힌 고정값 하나와 낙하 모드에만 넘기던 `labelSize: 22`,
 * 이렇게 두 벌이었다. 그런데 실제로 달라지는 건 모드가 아니라 **한 칸의 폭**이다 —
 * 난이도가 건반 수를 8·15·16으로 바꾸므로 같은 화면에서도 폭이 두 배까지 벌어진다.
 * 하필 제일 넓은 8건반이 **1단계(입문)** 라, 글자가 가장 커야 할 화면에서 가장 작아 보였다.
 *
 * 상·하한을 두는 이유: 비례만 시키면 5음 낙하(한 칸 약 160px)에서 글자가 건반을
 * 잡아먹는다. 상한 22는 낙하 모드가 쓰던 값 그대로다 — 그래서 이 식을 깔면
 * **낙하 모드의 특별 취급을 지워도 화면이 안 바뀐다.**
 */
const getKeyLabelSize = (whiteKeyWidth: number) => clampRound(whiteKeyWidth * 0.34, 15, 22);

/** 검은건반은 폭이 흰건반의 0.6이라 글자도 따라 줄인다(17 → 13, 22 → 17) */
const getBlackKeyLabelSize = (whiteLabelSize: number) => Math.round(whiteLabelSize * 0.76);

/**
 * 낙하 모드에서만 주는 건반 장식.
 *
 * 트랙과 건반이 **같은 색·같은 글자**를 써야 "떨어지는 노란 도 → 노란 도 건반"이
 * 한눈에 이어진다. 평소(훈련·자유 연주) 건반은 그대로 둔다 — 레인이 없으니
 * 색을 입힐 근거도 없다.
 *
 * 글자 **크기**는 여기 없다. 그건 모드가 아니라 건반 폭이 정한다(`getKeyLabelSize`).
 */
type KeyboardDecor = {
  /** 줄 위아래 마진을 없앤다. 낙하 모드는 세로가 급하다 */
  compact?: boolean;
  accentColors?: Record<string, string>;
  labelOf?: (note: Note) => string;
};

// 옥타브 시프트 뷰포트 하의 건반 렌더링
const renderPianoViewportRow = (
  notes: Note[],
  visibleNotes: Set<Note>,
  activeNotes: any,
  handlers: any,
  dynamicStyles: any,
  showKeyLabels: boolean,
  viewportStartIdx: number,
  viewportSize: number,
  decor: KeyboardDecor = {}
) => {
  const whiteKeys = notes.filter(note => !isBlackKeyMap[note]);
  // 모드가 아니라 **이 줄의 실제 건반 폭**이 글자 크기를 정한다
  const whiteLabelSize = getKeyLabelSize(dynamicStyles.whiteKeyWidth);
  const blackLabelSize = getBlackKeyLabelSize(whiteLabelSize);

  // 전체 백건 중 현재 뷰포트에 포함될 14개의 백건 필터링
  const visibleWhiteKeys = whiteKeys.slice(viewportStartIdx, viewportStartIdx + viewportSize);
  const visibleWhiteKeySet = new Set(visibleWhiteKeys);

  // 뷰포트 내 백건들에 인접한 흑건들만 도출
  const visibleBlackKeys = notes.filter(note => {
    if (!isBlackKeyMap[note]) return false;

    // 이 흑건에 바로 선행하는 백건 찾기
    const noteName = note.substring(0, note.length - 1);
    const octave = note.substring(note.length - 1);
    let precedingWhiteKeyNote: Note | undefined;
    switch (noteName) {
      case 'C#': precedingWhiteKeyNote = `C${octave}` as Note; break;
      case 'D#': precedingWhiteKeyNote = `D${octave}` as Note; break;
      case 'F#': precedingWhiteKeyNote = `F${octave}` as Note; break;
      case 'G#': precedingWhiteKeyNote = `G${octave}` as Note; break;
      case 'A#': precedingWhiteKeyNote = `A${octave}` as Note; break;
    }
    return precedingWhiteKeyNote ? visibleWhiteKeySet.has(precedingWhiteKeyNote) : false;
  });

  const getBlackKeyPosition = (note: Note): number | null => {
    const { whiteKeyWidth, blackKeyWidth } = dynamicStyles;
    const noteName = note.substring(0, note.length - 1);
    const octave = note.substring(note.length - 1);
    let precedingWhiteKeyNote: Note | undefined;
    switch (noteName) {
      case 'C#': precedingWhiteKeyNote = `C${octave}` as Note; break;
      case 'D#': precedingWhiteKeyNote = `D${octave}` as Note; break;
      case 'F#': precedingWhiteKeyNote = `F${octave}` as Note; break;
      case 'G#': precedingWhiteKeyNote = `G${octave}` as Note; break;
      case 'A#': precedingWhiteKeyNote = `A${octave}` as Note; break;
    }
    if (!precedingWhiteKeyNote) return null;
    const index = visibleWhiteKeys.indexOf(precedingWhiteKeyNote);
    if (index === -1) return null;
    // 뷰포트 상대적 위치로 흑건 위치 계산
    return (index + 1) * whiteKeyWidth - (blackKeyWidth / 2);
  };

  return (
    <View style={[styles.rowContainer, decor.compact && styles.rowContainerCompact]}>
      {visibleWhiteKeys.map(note => {
        const isVisible = visibleNotes.has(note);
        return (
          <PianoKey
            key={note}
            note={note}
            isBlack={false}
            isVisible={isVisible}
            width={dynamicStyles.whiteKeyWidth}
            height={dynamicStyles.whiteKeyHeight}
            onPressIn={handlers.handleNotePressIn}
            onPressOut={handlers.handleNotePressOut}
            showKeyLabels={showKeyLabels}
            keyboardLabel={noteToKeyMap[note]}
            accentColor={decor.accentColors?.[note]}
            displayLabel={decor.labelOf?.(note)}
            labelSize={whiteLabelSize}
          />
        );
      })}
      {visibleBlackKeys.map(note => {
        const isVisible = visibleNotes.has(note);
        const leftPosition = getBlackKeyPosition(note);
        if (leftPosition === null) return null;
        return (
          <PianoKey
            key={note}
            note={note}
            isBlack={true}
            isVisible={isVisible}
            width={dynamicStyles.blackKeyWidth}
            height={dynamicStyles.blackKeyHeight}
            leftPosition={leftPosition}
            onPressIn={handlers.handleNotePressIn}
            onPressOut={handlers.handleNotePressOut}
            showKeyLabels={showKeyLabels}
            keyboardLabel={noteToKeyMap[note]}
            labelSize={blackLabelSize}
          />
        );
      })}
    </View>
  );
};

type MusicTrainingScreenProps = {
  onBack: () => void;
};

export function MusicTrainingScreen({ onBack }: MusicTrainingScreenProps) {

  // 데이터 수집 상태
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [repeatCount, setRepeatCount] = useState(0);
  const [sessionLog, setSessionLog] = useState<any[]>([]);

  /**
   * 정답 뒤 다음 문제가 나올 때까지의 **채점 빗장.**
   *
   * `currentNote`는 1초(미션 성공은 2.5초) 뒤에야 바뀐다. 그 사이 같은 건반을 또 누르면
   * 계속 정답이라 **한 문제 연타로 5점(클리어)**이 됐다. 막는 것은 **채점뿐**이다 —
   * 소리는 그대로 낸다. 렌더에서 읽지 않으므로 state가 아니라 ref다.
   */
  const isScoringLockedRef = useRef(false);

  /**
   * 정답 처리용 타이머 모음 (`matchGame.tsx:66`과 같은 방식).
   *
   * 담아두지 않으면 「훈련 종료」·난이도 변경 뒤에도 예약된 `playNextQuestion`이 살아나
   * **끝난 훈련에서 문제음이 나고**, 바꾸기 전 난이도의 음이 출제된다.
   * 터진 타이머는 자기 id를 스스로 뺀다 — 한 훈련 동안 쌓이지 않게.
   */
  /**
   * 정답 콘페티. 드럼 만점 화면(`DrumGameOverScreen`)과 같은 Rive 아트보드를 쓰되
   * **정답마다 몇 발씩** 터지고, 각자 정해진 시간 뒤에 언마운트되어 걷힌다.
   * (`Burst`는 루프라 안 걷으면 계속 돈다 — 드럼 결과 화면이 그 쪽이다.)
   */
  const { burstConfetti, clearConfetti, confettiOverlay } = useCorrectConfetti();

  const trainingTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const clearTrainingTimers = useCallback(() => {
    trainingTimersRef.current.forEach(clearTimeout);
    trainingTimersRef.current.clear();
  }, []);
  const scheduleTrainingTimer = useCallback((run: () => void, delayMs: number) => {
    const id = setTimeout(() => {
      trainingTimersRef.current.delete(id);
      run();
    }, delayMs);
    trainingTimersRef.current.add(id);
  }, []);

  const KEYBOARD_ENABLED = false;
  const VISUALIZER_MODE: 'ripple' | 'particle' = 'particle'; // 스위치 제공 ('ripple'로 변경 시 이전 물결로 복구)
  /**
   * 제어반 「★ 정답: …」 줄. 훈련은 듣고 찾는 것이라 꺼 둔다.
   * 맞힌 뒤 「정답!」과 4단계 옥타브 주황 안내(`leftOctaveGuide`·`rightOctaveGuide`)는
   * 이 스위치와 별개다. 옥타브 안내는 정답이 화면 밖에 있으면 찾을 길이 없어서 항상 켠다.
   */
  const SHOW_ANSWER_HINT = false;
  const [isReady, setIsReady] = useState(false);

  // 청능 훈련 상태 관리
  const [activeNotes, setActiveNotes] = useState<{ [key in Note]?: boolean }>({});
  const [mode, setMode] = useState<TrainingMode>(null);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('3단계');
  const [progress, setProgress] = useState<MusicProgress>({});
  const [soundPreset, setSoundPreset] = useState<SoundPreset>('preset3');
  /**
   * **재생 경로는 이 ref만 읽는다.** `playSound`를 부르는 `playNextQuestion`·
   * `handleNotePressIn`이 `useCallback`으로 묶여 있어 state를 그대로 읽으면
   * 바꾸기 전 프리셋의 클로저가 남는다(deps에 넣으면 출제 타이머가 끊긴다).
   */
  const soundPresetRef = useRef<SoundPreset>('preset3');
  /**
   * `score`·`progress`의 동기 사본과 **유일한 쓰기 통로.**
   *
   * 정답 처리가 `score + 1` · `{...progress}`로 **렌더 클로저 값**을 읽고 있었다
   * (오답 쪽만 updater였다). 한 프레임에 두 건반이 들어오면 둘이 같은 값을 계산해
   * 점수·누적이 하나만 오른다. updater 안에서는 `addStar`를 못 부르므로(세션 40)
   * 사본을 두되, **쓰는 자리를 아래 둘로 좁혀** 두 곳이 갈라지지 않게 한다.
   */
  const scoreRef = useRef(0);
  const progressRef = useRef<MusicProgress>({});
  const applyScore = useCallback((next: number) => {
    scoreRef.current = next;
    setScore(next);
  }, []);
  const applyProgress = useCallback((next: MusicProgress) => {
    progressRef.current = next;
    setProgress(next);
  }, []);
  const [showMissionSuccess, setShowMissionSuccess] = useState(false);
  const [hasShownMissionSuccess, setHasShownMissionSuccess] = useState(false);

  // 낙하노트 모드 상태 관리
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [selectedSongScale, setSelectedSongScale] = useState<SongScale>('penta5');
  const [selectedSongId, setSelectedSongId] = useState(songs.find(song => song.scale === 'penta5')?.id ?? songs[0]?.id ?? '');
  /** 자유 모드 Tempo 슬라이더 값. 0 = slowBpm(느림) ~ 1 = normalBpm(보통) 보간 비율 */
  const [tempoRatio, setTempoRatio] = useState(1);
  const [lastFallingResult, setLastFallingResult] = useState<FallingResult | null>(null);
  const [showFallingReplayPrompt, setShowFallingReplayPrompt] = useState(false);
  const scheduledNotesRef = useRef<ScheduledFallingNote[]>([]);
  const [hitNoteIds, setHitNoteIds] = useState<string[]>([]);
  const [missNoteIds, setMissNoteIds] = useState<string[]>([]);
  const [fallingResult, setFallingResult] = useState<FallingResult | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [judgmentPulseKey, setJudgmentPulseKey] = useState(0);
  const [missPulseKey, setMissPulseKey] = useState(0);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackMetricsRef = useRef<FallingTrackMetrics | null>(null);
  const isTraining = mode !== null;
  const isFallingNoteActive = mode === 'falling';
  const availableFallingSongs = songs.filter(song => song.scale === selectedSongScale);
  const selectedFallingSong = availableFallingSongs.find(song => song.id === selectedSongId)
    ?? availableFallingSongs[0]
    ?? songs[0]
    ?? null;
  const activeFallingSong = currentSong ?? selectedFallingSong;
  // 예전 보통/느림 2단 토글을 슬라이더 보간으로 바꿨다. 곡 재생은 BPM 스케줄링이라
  // (오디오 playbackRate가 아니라) slowBpm↔normalBpm 사이를 잇는 게 맞다
  const activeFallingBpm = activeFallingSong
    ? Math.round(
        activeFallingSong.slowBpm
        + (activeFallingSong.normalBpm - activeFallingSong.slowBpm) * tempoRatio
      )
    : 72;

  const clearFallingNoteTimers = useCallback(() => {
    scheduledNotesRef.current.forEach((scheduledNote) => {
      if (scheduledNote.timeoutId) {
        clearTimeout(scheduledNote.timeoutId);
      }
    });
    scheduledNotesRef.current = [];
  }, []);

  const handleNoteSchedule = useCallback((note: Note, expectedTimestamp: number, beat: number) => {
    const id = getFallingNoteId(note, beat);
    if (scheduledNotesRef.current.some(scheduledNote => scheduledNote.id === id)) {
      return;
    }

    scheduledNotesRef.current.push({
      id,
      note,
      expectedTimestamp,
      hit: false,
      reached: false,
      missed: false,
      beat,
    });
  }, []);

  const handleTrackNoteHit = useCallback((note: Note, beat: number, reachedTimestamp: number, hitX: number, hitY: number) => {
    const id = getFallingNoteId(note, beat);
    const targetNote = scheduledNotesRef.current.find(scheduledNote => scheduledNote.id === id);
    if (!targetNote || targetNote.reached) {
      return;
    }

    targetNote.reached = true;
    targetNote.hitX = hitX;
    targetNote.hitY = hitY;

    /**
     * 여기서는 소리를 내지 않는다. 자유 모드는 사용자가 누른 건반만 난다.
     * 곡이 같은 건반을 치면 손소리와 겹친다.
     */
    // 타이머 id를 노트에 기록해야 clearFallingNoteTimers가 실제로 취소할 수 있다.
    // 기록하지 않으면 다시하기·재시작 때 이전 판의 미스 판정이 살아남아
    // 같은 id(음+박)로 새로 예약된 노트에 미스를 꽂는다.
    targetNote.timeoutId = setTimeout(() => {
      const latestNote = scheduledNotesRef.current.find(scheduledNote => scheduledNote.id === id);
      if (latestNote && !latestNote.hit && !latestNote.missed) {
        latestNote.missed = true;
        setMissNoteIds(prev => [...prev, id]);
        setMissPulseKey(prev => prev + 1);
      }
    }, HIT_WINDOW_MS);
  }, []);

  // 대기(자유 연주) 건반은 훈련 난이도와 분리. 훈련 종료 후에도 항상 3단계 레이아웃.
  const keyboardDifficulty: Difficulty = mode === 'random' ? difficulty : '3단계';

  // 옥타브 시프트 뷰포트 상태 (난이도에 따라 백건 개수 가변)
  const getViewportSize = () => {
    if (keyboardDifficulty === '1단계') return 8;
    if (keyboardDifficulty === '2단계') return 15;
    return 16; // 3단계(중급) 및 4단계(상급)에서 16건반 지원
  };
  const VIEWPORT_SIZE = getViewportSize();

  const [viewportStartIdx, setViewportStartIdx] = useState(14);
  const [fallingTrackWidth, setFallingTrackWidth] = useState(0);
  /** `fallingModeLayout`의 잰 높이(패딩 포함). 트랙 높이를 여기서 직접 뺀다 — 렌더의 `fallingTrackHeight` 참고 */
  const [fallingLayoutHeight, setFallingLayoutHeight] = useState(0);

  // 1, 2, 3단계에서는 시작 옥타브 인덱스를 C3(14)로 강제 고정
  const isFixedViewport = keyboardDifficulty === '1단계' || keyboardDifficulty === '2단계' || keyboardDifficulty === '3단계';
  const currentStartIdx = isFixedViewport ? 14 : viewportStartIdx;

  // 옥타브 버튼 애니메이션용 Shared Values
  const leftArrowOpacity = useSharedValue(1);
  const leftArrowTranslateX = useSharedValue(0);
  const rightArrowOpacity = useSharedValue(1);
  const rightArrowTranslateX = useSharedValue(0);

  // 옥타브 가이드 애니메이션 제어
  useEffect(() => {
    if (!isTraining || !currentNote) {
      leftArrowOpacity.value = withTiming(1, { duration: 200 });
      leftArrowTranslateX.value = withTiming(0, { duration: 200 });
      rightArrowOpacity.value = withTiming(1, { duration: 200 });
      rightArrowTranslateX.value = withTiming(0, { duration: 200 });
      return;
    }

    const noteWhiteIdx = whiteIdxRefById.get(currentNote);
    if (noteWhiteIdx == null) return;

    // 오직 4단계(상급) 모드에서만 화면 밖에 음이 있을 때 화살표 힌트 가이드 애니메이션 기동
    const isGuideActive = difficulty === '4단계';
    const showLeftGuide = isGuideActive && noteWhiteIdx < currentStartIdx;
    const showRightGuide = isGuideActive && noteWhiteIdx >= currentStartIdx + VIEWPORT_SIZE;

    if (showLeftGuide) {
      leftArrowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 500, easing: Easing.ease }),
          withTiming(1, { duration: 500, easing: Easing.ease })
        ),
        -1,
        true
      );
      leftArrowTranslateX.value = withRepeat(
        withSequence(
          withTiming(-6, { duration: 400, easing: Easing.ease }),
          withTiming(0, { duration: 400, easing: Easing.ease })
        ),
        -1,
        true
      );
    } else {
      leftArrowOpacity.value = withTiming(1, { duration: 200 });
      leftArrowTranslateX.value = withTiming(0, { duration: 200 });
    }

    if (showRightGuide) {
      rightArrowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 500, easing: Easing.ease }),
          withTiming(1, { duration: 500, easing: Easing.ease })
        ),
        -1,
        true
      );
      rightArrowTranslateX.value = withRepeat(
        withSequence(
          withTiming(6, { duration: 400, easing: Easing.ease }),
          withTiming(0, { duration: 400, easing: Easing.ease })
        ),
        -1,
        true
      );
    } else {
      rightArrowOpacity.value = withTiming(1, { duration: 200 });
      rightArrowTranslateX.value = withTiming(0, { duration: 200 });
    }
  }, [isTraining, currentNote, currentStartIdx, difficulty, VIEWPORT_SIZE]);

  // 터치 물결 효과용 Shared Values
  const touchX = useSharedValue(0);
  const touchY = useSharedValue(0);
  const rippleProgress = useSharedValue(0);
  const triggerTime = useSharedValue(0); // 파티클 트리거용 시간 Shared Value

  // 오디오 플레이어 캐시 (최대 CACHE_LIMIT개). 맨 앞이 가장 최근에 친 음이다
  const soundCache = useRef<{ [key in Note]?: any }>({});
  const recentlyUsedNotes = useRef<Note[]>([]);

  /**
   * 캐시된 플레이어를 전부 해제하고 LRU를 비운다.
   * 탭 이탈(`useStopAudioOnBlur`)·프리셋 변경·저장값 로드가 모두 이걸 쓴다.
   *
   * ref만 건드리므로 `useCallback([])`이 안전하다. **여기 있는 이유는 위치 때문이다** —
   * 아래 마운트 `useEffect`가 deps에 넣으려면 그 줄보다 먼저 만들어져 있어야 한다.
   */
  const releaseAllSoundPlayers = useCallback(() => {
    for (const player of Object.values(soundCache.current)) {
      try {
        player?.remove();
      } catch (e) { }
    }
    soundCache.current = {};
    recentlyUsedNotes.current = [];
  }, []);
  const starContext = useContext(StarContext) as any;
  const clearContext = useContext(ClearContext) as any;

  const { height, width, insets, safeAreaFrameStyle, missionIconStyle } = useInstrumentMetrics();

  // 자동 옥타브 포커싱 훅 결합 (기존 포커싱 기능은 완전히 비활성화하여 수동 이동 유도)
  useAutoFocusViewport({
    currentNote: null,
    viewportStartIdx,
    setViewportStartIdx,
    totalWhite: allNotes.filter(n => !isBlackKeyMap[n]).length,
    viewportSize: VIEWPORT_SIZE,
  });

  // 초기화 및 라이프사이클 관리
  useEffect(() => {
    let isMounted = true;

    // 화면 방향은 악기 묶음 화면이 단독으로 건다. 여기서 걸면 기타와 서로 덮어쓴다.
    // 오디오 모드는 `AudioManagerProvider`가 앱 시작 시 1회 설정한다(4-B에서 일원화).
    setIsReady(true);

    // 저장 기록 로드
    const loadProgress = async () => {
      try {
        const savedProgress = await AsyncStorage.getItem(MUSIC_PROGRESS_KEY);
        if (savedProgress) {
          applyProgress(JSON.parse(savedProgress));
        }
      } catch (e) {
        console.error('Failed to load music progress.', e);
      }
    };
    loadProgress();

    /**
     * 저장된 프리셋 복원. **ref를 state와 같이 세운다** — 재생 경로는 ref만 읽는다.
     * 읽는 동안 건반을 눌렀다면 이전 프리셋 플레이어가 캐시에 남아 있으므로 비운다
     * (캐시가 비어 있으면 무해하다).
     */
    const loadSoundPreset = async () => {
      try {
        const saved = await AsyncStorage.getItem(MUSIC_SOUND_PRESET_KEY);
        if (!isSoundPreset(saved) || saved === soundPresetRef.current) return;
        soundPresetRef.current = saved;
        setSoundPreset(saved);
        releaseAllSoundPlayers();
      } catch (e) {
        console.error('Failed to load sound preset.', e);
      }
    };
    loadSoundPreset();

    return () => {
      isMounted = false;
      clearFallingNoteTimers();
      clearTrainingTimers();
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
      }
      // 사운드 리소스 안전 해제 (메모리 누수 차단)
      for (const player of Object.values(soundCache.current)) {
        try {
          player?.remove();
        } catch (e) {
          console.warn('Failed to release audio player on unmount', e);
        }
      }
      // 캐시 강제 소거로 핫 리로드 시 발생하는 release 충돌 해결
      soundCache.current = {};
      recentlyUsedNotes.current = [];
    };
  }, [clearFallingNoteTimers, clearTrainingTimers, applyProgress, releaseAllSoundPlayers]);

  // 저장 기록 동기화
  useEffect(() => {
    if (Object.keys(progress).length > 0) {
      AsyncStorage.setItem(MUSIC_PROGRESS_KEY, JSON.stringify(progress)).catch(e =>
        console.error('Failed to save music progress.', e)
      );
    }
  }, [progress]);

  useEffect(() => {
    if (!isFallingNoteActive || previewCount === null) return;

    previewTimerRef.current = setTimeout(() => {
      setPreviewCount(prev => {
        if (prev === null) return null;
        return prev > 0 ? prev - 1 : null;
      });
    }, previewCount === 0 ? PREVIEW_START_MS : PREVIEW_STEP_MS);

    return () => {
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
    };
  }, [isFallingNoteActive, previewCount]);

  const handleSelectSongScale = (scale: SongScale) => {
    setSelectedSongScale(scale);
    const firstSongForScale = songs.find(song => song.scale === scale);
    if (firstSongForScale) {
      setSelectedSongId(firstSongForScale.id);
    }
  };

  const handleCycleFallingSong = useCallback((direction: 1 | -1 = 1) => {
    const list = songs.filter(song => song.scale === selectedSongScale);
    if (list.length === 0) return;
    const currentIndex = list.findIndex(song => song.id === selectedSongId);
    const nextSong = list[(Math.max(currentIndex, 0) + direction + list.length) % list.length];
    setSelectedSongId(nextSong.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [selectedSongScale, selectedSongId]);

  const getVisibleNoteSet = (): Set<Note> => {
    switch (keyboardDifficulty) {
      case '1단계': return new Set(level1_absoluteBeginner);
      case '2단계': return new Set(level2_beginner);
      case '3단계': return new Set(level3_intermediate);
      case '4단계': return new Set(level4_advanced);
      case '5단계': return new Set(level5_specialTraining);
      default: return new Set(level3_intermediate);
    }
  };
  const visibleNoteSet = getVisibleNoteSet();

  const handleTrackMetrics = useCallback((metrics: FallingTrackMetrics) => {
    trackMetricsRef.current = metrics;
  }, []);

  const triggerFallingHitEffect = useCallback((note: Note, fallbackX?: number, fallbackY?: number) => {
    const metrics = trackMetricsRef.current;
    const laneIndex = currentSong?.palette.indexOf(note) ?? -1;
    const canUseTrackMetrics = metrics && laneIndex >= 0;
    const hitX = canUseTrackMetrics
      ? metrics.x + metrics.laneStartX + laneIndex * metrics.laneWidth + metrics.laneWidth / 2
      : fallbackX ?? width / 2;
    const hitY = canUseTrackMetrics
      ? metrics.y + metrics.judgmentLineY
      : fallbackY ?? height / 2;

    touchX.value = hitX;
    touchY.value = hitY;
    triggerTime.value = Date.now();
    setJudgmentPulseKey(prev => prev + 1);
  }, [currentSong, height, touchX, touchY, triggerTime, width]);

  const resetFallingStats = () => {
    setHitNoteIds([]);
    setMissNoteIds([]);
    setFallingResult(null);
    setLastFallingResult(null);
    setShowFallingReplayPrompt(false);
    setJudgmentPulseKey(0);
    setMissPulseKey(0);
  };

  /**
   * 가장 오래 안 쓴 음의 플레이어를 캐시에서 떼어 돌려준다(해제하지 않는다).
   * **울리는 중이어도 가져온다** — 멈추고 새 음으로 바꿔 쓴다. 건너뛰고 새로 만들면
   * 한도를 넘어 디코더가 모자라고, 그 뒤에 만든 건반이 무음이 됐다.
   */
  const takeLeastRecentlyUsedPlayer = () => {
    const oldest = recentlyUsedNotes.current.pop();
    if (!oldest) return undefined;
    const player = soundCache.current[oldest];
    delete soundCache.current[oldest];
    return player;
  };

  const playNoteFile = async (note: Note) => {
    try {
      let player = soundCache.current[note];
      if (!player) {
        const source = presetSoundFiles[soundPresetRef.current][note];
        // 한도가 찼으면 새로 만들지 않고 가장 오래된 플레이어의 음원만 바꾼다.
        // 플레이어(=AudioTrack·디코더) 수가 CACHE_LIMIT를 넘지 않는다.
        const reused = recentlyUsedNotes.current.length >= CACHE_LIMIT
          ? takeLeastRecentlyUsedPlayer()
          : undefined;
        if (reused) {
          reused.pause();
          reused.replace(source);
          player = reused;
        } else {
          player = createAudioPlayer(source);
          const createdPlayer = player;

          // 죽은 플레이어는 예외도 로그도 없이 무음이 된다. 유일한 통보 경로가 이 이벤트다.
          //
          // 알리기만 하면 **죽은 플레이어가 캐시에 남는다.** 다음 터치도 같은 플레이어를
          // 재사용하므로 그 건반은 계속 무음이다 — 탭을 나갔다 오거나(`useStopAudioOnBlur`)
          // LRU에 밀려날 때까지. 캐시에서 빼두면 다음 터치 때 새로 만들어 바로 회복한다.
          // 플레이어가 음을 바꿔 가며 쓰이므로 지금 맡은 음은 캐시에서 찾는다.
          try {
            createdPlayer.addListener('playbackStatusUpdate', (status: any) => {
              if (!status?.error) return;
              const owner = (Object.keys(soundCache.current) as Note[])
                .find(n => soundCache.current[n] === createdPlayer);
              console.warn(`[audio] '${owner ?? note}' 재생 에러:`, status.error);

              // 이미 캐시에서 빠졌다면(해제·교체 중) 건드리지 않는다
              if (!owner) return;
              delete soundCache.current[owner];
              recentlyUsedNotes.current = recentlyUsedNotes.current.filter(n => n !== owner);
              try { createdPlayer.remove(); } catch (e) { }
            });
          } catch (e) { }
        }
        soundCache.current[note] = player;
      }

      // 방금 친 음을 맨 앞으로 (맨 뒤가 가장 오래 안 쓴 음 = 축출 대상)
      recentlyUsedNotes.current = recentlyUsedNotes.current.filter(n => n !== note);
      recentlyUsedNotes.current.unshift(note);

      // 탭을 떠날 때 pause()만 하면 currentTime이 0이어도 play()가 무음이 된다.
      // 동물게임과 같이 항상 되감은 뒤 재생한다.
      await player.seekTo(0);
      player.play();
      return true;
    } catch (error) {
      console.log(`'${note}' 음원 재생 실패:`, error);
      return false;
    }
  };

  const playSound = (note: Note) => {
    void playNoteFile(note);
  };

  /**
   * 🎹 탭을 떠날 때 건반 소리를 끊고 **플레이어를 해제한다.**
   * 탭은 언마운트되지 않으므로 위 언마운트 클린업은 탭 전환 때 실행되지 않는다.
   *
   * 이전에는 `pause()`만 하고 캐시를 남겼다(재진입 첫 음 지연을 피하려고).
   * 그런데 `pause()`는 소리만 멈추고 **AudioTrack은 계속 붙잡는다.** 그래서 피아노를
   * 다녀오면 기타·단어 탭까지 앱 전체 한도에 걸려 무음이 됐다.
   * **자리를 돌려주려면 해제해야 한다.** 재진입 첫 음 지연은 그 대가로 받아들인 것이다.
   */
  useStopAudioOnBlur(releaseAllSoundPlayers);

  const playNextQuestion = useCallback(() => {
    let notesToUse: Note[];
    switch (difficulty) {
      case '1단계': notesToUse = level1_absoluteBeginner; break;
      case '2단계': notesToUse = level2_beginner; break;
      case '3단계': notesToUse = level3_intermediate; break;
      case '4단계': notesToUse = level4_advanced; break;
      case '5단계': notesToUse = level5_specialTraining; break;
      default: notesToUse = level3_intermediate; break;
    }
    const randomIndex = Math.floor(Math.random() * notesToUse.length);
    const randomNote = notesToUse[randomIndex];
    setCurrentNote(randomNote);
    setRepeatCount(0);
    // 응답 시간의 기준은 **출제하는 이 자리에서 동기로** 찍는다.
    // 여기서 안 찍으면 기준이 `null`이라 첫 문제들은 `null || 0` → 응답시간 0초로,
    // 한 번 오답을 낸 뒤로는 **그 오답 시각**이 다음 문제들의 기준으로 남는다.
    // 서버 `detailed_logs`에 그대로 담긴다.
    setQuestionStartTime(Date.now());
    isScoringLockedRef.current = false;
    playSound(randomNote);
  }, [difficulty]);

  const handleDifficultyChange = (name: Difficulty) => {
    setDifficulty(name);
    if (mode === 'random') {
      // 예약된 출제를 먼저 끊는다. 남겨두면 바꾸기 전 난이도의 음이 뒤늦게 나온다
      clearTrainingTimers();
      isScoringLockedRef.current = false;
      setCurrentNote(null);
      applyScore(0);
      setFeedback(`난이도가 ${name}로 변경되었습니다. [문제 재생]을 누르세요.`);
    }
  };

  /**
   * 음원 프리셋 변경. **캐시를 통째로 비워야 한다** — `soundCache`의 키가 음 이름뿐이라
   * 비우지 않으면 바꾸기 전 프리셋으로 만든 플레이어를 그대로 재사용한다.
   * 울리는 중인 음도 끊기지만, 탭 이탈 때와 같은 대가다.
   */
  const handleSoundPresetChange = (name: SoundPreset) => {
    if (name === soundPresetRef.current) return;
    soundPresetRef.current = name;
    setSoundPreset(name);
    releaseAllSoundPlayers();

    // 쓰는 자리를 이 한 곳으로 좁힌다. state를 보는 `useEffect`로 저장하면
    // 마운트 직후 기본값을 한 번 덮어써서 로드와 순서가 엉킨다
    AsyncStorage.setItem(MUSIC_SOUND_PRESET_KEY, name).catch(e =>
      console.error('Failed to save sound preset.', e)
    );

    // 캐시를 비웠으므로 **울리던 문제음이 끊긴다.** 난이도 변경과 같은 자리로 되돌린다.
    // 점수는 건드리지 않는다 — 난이도와 달리 프리셋은 문제의 범위를 바꾸지 않는다.
    if (mode === 'random') {
      clearTrainingTimers();
      isScoringLockedRef.current = false;
      setCurrentNote(null);
      const label = soundPresets.find(preset => preset.id === name)?.label ?? name;
      // 라벨이 `1번`이라 「소리」를 붙여야 말이 된다 — 조사도 라벨에 안 붙는다
      setFeedback(`음원이 ${label} 소리로 변경되었습니다. [문제 재생]을 누르세요.`);
    }
  };

  const startTraining = () => {
    clearFallingNoteTimers();
    clearTrainingTimers();
    isScoringLockedRef.current = false;
    setQuestionStartTime(null);
    setMode('random');
    applyScore(0);
    setSessionLog([]); // 세션 로그 초기화
    setFeedback('난이도를 선택하고 [문제 재생]을 눌러 시작하세요!');
    setShowMissionSuccess(false);
    setHasShownMissionSuccess(false);
    setCurrentSong(null);
    setCurrentNote(null);
  };

  const handleResetProgress = async () => {
    try {
      await AsyncStorage.removeItem(MUSIC_PROGRESS_KEY);
      // 문제를 지우므로 예약된 출제도 함께 끊는다 — 안 끊으면 초기화 직후 되살아난다
      clearTrainingTimers();
      isScoringLockedRef.current = false;
      applyProgress({});
      applyScore(0);
      setCurrentNote(null);
      setFeedback('기록이 초기화되었습니다.');
    } catch (e) {
      console.error('Failed to reset music progress.', e);
    }
  };

  const startFallingNoteMode = (songToPlay: Song | null = selectedFallingSong) => {
    if (!songToPlay) return;

    clearFallingNoteTimers();
    clearTrainingTimers();
    isScoringLockedRef.current = false;
    setMode('falling');
    applyScore(0);
    resetFallingStats();
    setCurrentNote(null);
    setPreviewCount(3);
    setCurrentSong(songToPlay);
  };

  const stopTraining = () => {
    // 훈련 종료시 데이터 전송
    if (mode === 'random' && sessionLog.length > 0) {
      const correctCount = sessionLog.filter(log => log.is_correct).length;
      
      const medicalDataPayload = {
        difficulty_level: difficulty,
        total_attempts: sessionLog.length,
        correct_count: correctCount,
        accuracy_rate: parseFloat(((correctCount / sessionLog.length) * 100).toFixed(1)),
        detailed_logs: sessionLog // 모든 건반 터치 기록 포함
      };

      console.log("🚀 [의료 데이터 전송] music:", medicalDataPayload);
      void sendRecord('music', medicalDataPayload);
    }
    
    clearFallingNoteTimers();
    clearTrainingTimers();
    clearConfetti();
    isScoringLockedRef.current = false;
    setQuestionStartTime(null);
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    setMode(null);
    setCurrentNote(null);
    setCurrentSong(null);
    setPreviewCount(null);
    resetFallingStats();
    setShowMissionSuccess(false);
    setHasShownMissionSuccess(false);
    setFeedback('');
  };

  const handleSongEnd = useCallback(() => {
    const totalNotes = currentSong?.notes.length ?? 0;
    const hits = scheduledNotesRef.current.filter(note => note.hit).length;
    const misses = Math.max(0, totalNotes - hits);
    const accuracy = totalNotes > 0 ? Math.round((hits / totalNotes) * 100) : 0;
    const clearTarget = getFallingClearTarget(currentSong);
    const cleared = accuracy >= clearTarget && misses <= getFallingMaxMisses(totalNotes);

    setLastFallingResult({
      title: currentSong?.title ?? '낙하노트',
      totalNotes,
      hits,
      cleared,
    });
    clearFallingNoteTimers();
    setMode(null);
    setCurrentNote(null);
    setPreviewCount(null);
    setShowFallingReplayPrompt(true);
  }, [clearFallingNoteTimers, currentSong]);

  const replayFallingSong = () => {
    startFallingNoteMode(currentSong ?? selectedFallingSong);
  };

  /** 뒤로가기로 리플레이 안내를 닫는다. 결과는 버리고 대기 화면으로 돌아간다 */
  const dismissFallingReplayPrompt = () => {
    setShowFallingReplayPrompt(false);
    setLastFallingResult(null);
    setCurrentSong(null);
  };

  const showLastFallingResult = () => {
    if (!lastFallingResult) return;
    setShowFallingReplayPrompt(false);
    setFallingResult(lastFallingResult);
    setCurrentSong(null);
  };

  const closeFallingResult = () => {
    setFallingResult(null);
    setLastFallingResult(null);
    setCurrentSong(null);
  };

  const repeatSound = () => {
    if (currentNote) {
      setRepeatCount(prev => prev + 1); // 횟수 증가
      playSound(currentNote);
    }
  };

  const handleNotePressIn = useCallback((note: Note, event: any) => {
    // 1. 소리 재생
    playSound(note);
    setActiveNotes(prev => ({ ...prev, [note]: true }));

    // 2. 터치한 절대 좌표 위치(pageX, pageY)를 이용한 물결(Ripple) 이펙트 트리거
    const nativeEvent = event?.nativeEvent;
    if (nativeEvent && !isFallingNoteActive) {
      const { pageX, pageY } = nativeEvent;
      touchX.value = pageX;
      touchY.value = pageY;
      triggerTime.value = Date.now(); // 파티클 트리거 시간 갱신

      rippleProgress.value = 0;
      rippleProgress.value = withSequence(
        withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 0 })
      );
    }

    // 3. 청능 훈련 채점 판단
    if (mode === 'falling' && currentSong) {
      const now = Date.now();
      const targetCandidate = scheduledNotesRef.current
        .map((scheduledNote, index) => ({
          index,
          drift: Math.abs(scheduledNote.expectedTimestamp - now),
          scheduledNote,
        }))
        .filter(({ drift, scheduledNote }) =>
          !scheduledNote.hit && !scheduledNote.missed && scheduledNote.note === note && drift <= HIT_WINDOW_MS
        )
        .sort((a, b) => a.drift - b.drift)[0];
      const targetIndex = targetCandidate?.index ?? -1;

      if (targetIndex !== -1) {
        const hitNote = scheduledNotesRef.current[targetIndex];
        scheduledNotesRef.current[targetIndex].hit = true;
        // 판정이 끝났으니 대기 중인 미스 타이머를 즉시 해제한다.
        if (hitNote.timeoutId) {
          clearTimeout(hitNote.timeoutId);
          scheduledNotesRef.current[targetIndex].timeoutId = undefined;
        }
        setHitNoteIds(prev => [...prev, hitNote.id]);

        triggerFallingHitEffect(note, hitNote.hitX ?? nativeEvent?.pageX, hitNote.hitY ?? nativeEvent?.pageY);

        // 등급이 없으니 "잘 맞혔다"가 아니라 **"맞혔다"**에 대한 촉각 신호다
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
      } else {
        setMissPulseKey(prev => prev + 1);
      }
    } else if (mode === 'random' && currentNote) {
      // 정답을 맞힌 뒤 다음 문제가 나오기 전까지는 **채점하지 않는다.**
      // 소리는 위 1번에서 이미 냈다 — 막는 것은 채점뿐이다
      if (isScoringLockedRef.current) return;

      const isCorrect = note === currentNote;
      const responseTime = questionStartTime ? (Date.now() - questionStartTime) / 1000 : 0;

      // 이번 터치에 대한 상세 정보 로그 저장
      const attemptRecord = {
        target_note: currentNote,
        selected_note: note,
        is_correct: isCorrect,
        response_time_seconds: parseFloat(responseTime.toFixed(2)), // 💡 반응 시간은 소수점 2자리
        repeat_listens: repeatCount
      };
      setSessionLog(prev => [...prev, attemptRecord]);

      if (isCorrect) {
        isScoringLockedRef.current = true;
        // 눈으로도. 다음 문제음(`NEXT_QUESTION_DELAY_MS`)이 나오기 전에 스스로 걷힌다
        burstConfetti();

        const newScore = scoreRef.current + 1;
        applyScore(newScore);

        const currentProgress = progressRef.current[difficulty] || { cumulativeSuccesses: 0, highestScore: 0 };
        const newCumulativeSuccesses = currentProgress.cumulativeSuccesses + 1;

        const updatedProgress = {
          ...progressRef.current,
          [difficulty]: {
            cumulativeSuccesses: newCumulativeSuccesses,
            highestScore: Math.max(currentProgress.highestScore, newScore),
          },
        };
        applyProgress(updatedProgress);

        // 조건을 넘긴 뒤로는 **정답마다** 다시 부르고 있었다.
        // 두 Provider가 안에서도 막지만(`StarContext.addStar` · `ClearContext.markAsCleared`),
        // 부르는 쪽에서 한 번만 부르는 것이 뜻이 분명하다
        const missionKey = `music_${difficulty}`;
        if (newCumulativeSuccesses >= 3 && !starContext?.starData?.[missionKey]) {
          starContext?.addStar(missionKey);
        }
        if (newScore >= 5 && !clearContext?.clearData?.[missionKey]) {
          clearContext?.markAsCleared(missionKey);
        }

        if (newScore >= 5 && !hasShownMissionSuccess) {
          // 훈련 세션당 1회만 성공 피드백을 제공해 반복 모달을 방지
          setHasShownMissionSuccess(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowMissionSuccess(true);
          setFeedback('정답!');
          scheduleTrainingTimer(() => {
            setShowMissionSuccess(false);
            setFeedback('다음 문제');
            playNextQuestion();
          }, 2500);
        } else {
          setFeedback('정답!');
          scheduleTrainingTimer(() => {
            setFeedback('다음 문제');
            playNextQuestion();
          }, NEXT_QUESTION_DELAY_MS);
        }
      } else {
        applyScore(Math.max(0, scoreRef.current - 1));
        setFeedback('오답! 다시 들어보세요.');
        // 오답 시 재시도 시간을 새로 재기 위해 타이머 리셋
        setQuestionStartTime(Date.now());
      }
    }
  }, [mode, currentNote, currentSong, isFallingNoteActive, playNextQuestion, difficulty, hasShownMissionSuccess, starContext, clearContext, triggerFallingHitEffect, questionStartTime, repeatCount, applyScore, applyProgress, scheduleTrainingTimer, burstConfetti]);

  const handleNotePressOut = useCallback((note: Note) => {
    setActiveNotes(prev => {
      const newActiveNotes = { ...prev };
      delete newActiveNotes[note];
      return newActiveNotes;
    });
  }, []);

  const handleShiftLeft = () => {
    setViewportStartIdx(0);
  };

  const handleShiftRight = () => {
    setViewportStartIdx(14);
  };


  const isFallingResultVisible = fallingResult !== null;
  const shouldUseFallingBottomPanel = isFallingNoteActive || isFallingResultVisible || showFallingReplayPrompt;
  /** 대기 화면 = 자유 모드 패널. 훈련도 아니고 결과 오버레이도 아닐 때만이다 */
  const isFreeModePanelVisible = !isTraining && !shouldUseFallingBottomPanel;
  /** 청능 훈련 제어반. 낙하 결과·리플레이 안내가 떠 있으면 그쪽이 먼저다 */
  const isTrainingPanelVisible = mode === 'random' && !shouldUseFallingBottomPanel;
  /**
   * 콘솔(네이비+노랑) 제어반이 서는가.
   *
   * **높이와 색을 두 모드가 같이 봐야 한다.** 자유→훈련으로 넘어갈 때 제어반 높이가
   * 바뀌면 그만큼 건반이 위아래로 튀고, 색이 바뀌면 같은 화면의 아래쪽만 다른 앱이 된다.
   */
  const isConsolePanelVisible = isFreeModePanelVisible || isTrainingPanelVisible;
  /**
   * **연주 중에는 제어반을 아예 걷는다.**
   *
   * 낙하 모드의 제어반(76px)에는 뒤로가기와 「훈련 종료」 둘뿐이었다. 가로모드에서
   * 세로 76px은 트랙 높이의 절반에 가깝다 — 가장 비싼 공간을 가장 안 쓰는 UI가
   * 먹고 있었다. 「종료」는 트랙 위 작은 오버레이 버튼으로 옮긴다.
   */
  const isFallingPlaying = isFallingNoteActive;
  const bottomPanelHeight = isFallingPlaying
    ? 0
    : shouldUseFallingBottomPanel
      ? CONTROL_BAR.compactHeight
      : isConsolePanelVisible
        ? CONSOLE_BAR_HEIGHT
        : CONTROL_BAR.standardHeight;

  /**
   * 두 오버레이가 깔고 앉을 프레임.
   *
   * 오버레이는 `midgroundLayer`의 **형제**라 인셋을 자동으로 받지 못한다.
   * 제어반은 `safeAreaFrameStyle`(인셋 안쪽)에 들어 있으니 오버레이도 같은 프레임을
   * 쓰고, 거기서 제어반 높이만큼 더 띄워야 둘이 같은 자리를 본다.
   * 인셋을 빼면 `insets.bottom`만큼 제어반을 파고들고, 가로모드 노치 쪽
   * `insets.left`/`right`만큼 카운트다운 숫자가 옆으로 밀린다
   */
  const overlayFrameStyle = {
    ...safeAreaFrameStyle,
    bottom: insets.bottom + bottomPanelHeight,
  };
  const usableWidth = Math.max(1, width - insets.left - insets.right);
  const usableHeight = Math.max(1, height - insets.top - insets.bottom);
  const PIANO_AREA_PADDING = 20;
  const pianoAreaWidth = Math.max(1, usableWidth - PIANO_AREA_PADDING);
  const availablePlayHeight = Math.max(1, usableHeight - bottomPanelHeight - 20);
  const standardWhiteKeyHeight = Math.max(80, usableHeight - bottomPanelHeight - 90);
  /**
   * 낙하 모드 건반 높이.
   *
   * 예전 `0.4`는 연주 영역의 40%를 건반에 줬다. 제어반(76)까지 빼고 나면 트랙에
   * 148px밖에 안 남아, 40px짜리 노트가 트랙의 27%를 차지했다. 건반은 **어디를
   * 누를지만 보이면 되고** 세로 길이는 트랙이 써야 한다.
   */
  const fallingWhiteKeyHeight = Math.max(84, Math.min(120, availablePlayHeight * 0.26));
  /**
   * 낙하 트랙 높이 — **flex 분배에 맡기지 않고 직접 준다.**
   *
   * `flex: 1`만 줬을 때 실기기에서 트랙이 남은 자리(276)보다 크게(370·330) 잡히는
   * 회차가 있었다. 그만큼 건반이 화면 밖으로 밀려 아예 안 보이거나 윗부분만 보였다
   * (2026-10-26, 진입할 때마다 값이 달랐다). 바깥 틀 높이는 매번 맞았으니 그 높이에서
   * 위 여백과 건반을 빼 명시한다. 측정 전(0)에는 기존 flex로 둔다
   */
  const fallingTrackHeight = fallingLayoutHeight > 0
    ? Math.max(0, fallingLayoutHeight - mt.falling.layoutPaddingTop - mt.falling.trackMarginBottom - fallingWhiteKeyHeight)
    : null;
  const fallingNotePalette = isFallingNoteActive ? currentSong?.palette ?? null : null;
  /** 트랙 레인과 **같은 함수**에서 나온 색·계이름. 두 쪽이 갈라지면 연결이 깨진다 */
  const fallingLaneColors = fallingNotePalette ? getLaneColorMap(fallingNotePalette) : null;
  const pianoNotes: Note[] = fallingNotePalette ?? allNotes;
  const pianoVisibleNoteSet: Set<Note> = fallingNotePalette ? new Set<Note>(fallingNotePalette) : visibleNoteSet;
  const pianoViewportStartIdx = fallingNotePalette ? 0 : currentStartIdx;
  const pianoViewportSize = fallingNotePalette ? fallingNotePalette.length : VIEWPORT_SIZE;

  const measuredPianoAreaWidth = isFallingNoteActive && fallingTrackWidth > 0
    ? fallingTrackWidth
    : pianoAreaWidth;
  const dynamicWhiteKeyWidth = measuredPianoAreaWidth / pianoViewportSize;
  const dynamicStyles = {
    whiteKeyWidth: dynamicWhiteKeyWidth,
    blackKeyWidth: dynamicWhiteKeyWidth * 0.6,
    whiteKeyHeight: isFallingNoteActive ? fallingWhiteKeyHeight : standardWhiteKeyHeight,
    blackKeyHeight: (isFallingNoteActive ? fallingWhiteKeyHeight : standardWhiteKeyHeight) * 0.65,
  };

  const handlers = { handleNotePressIn, handleNotePressOut };

  /**
   * 옥타브 버튼의 세 상태.
   *
   * 색이 셋이라(노랑 = 누를 수 있음 · 회색 = 끝 · 주황 = 정답이 저쪽에 있음)
   * 스타일 배열만으로는 안 된다 — **아이콘과 글자 색까지** 같이 정해야 하기 때문이다.
   * 주황은 평상시 노랑과 구분되는 유일한 콘솔 색이다(`CONSOLE.presetDot`).
   */
  const octaveNoteIdx = currentNote ? whiteIdxRefById.get(currentNote) ?? 0 : 0;
  const isOctaveGuideActive = isTraining && currentNote !== null && difficulty === '4단계';
  const leftOctaveDisabled = viewportStartIdx === 0;
  const rightOctaveDisabled = viewportStartIdx === 14;
  const leftOctaveGuide = isOctaveGuideActive && octaveNoteIdx < viewportStartIdx;
  const rightOctaveGuide = isOctaveGuideActive && octaveNoteIdx >= viewportStartIdx + VIEWPORT_SIZE;
  const leftOctaveInk = leftOctaveDisabled ? CONSOLE.dim : CONSOLE.selectedText;
  const rightOctaveInk = rightOctaveDisabled ? CONSOLE.dim : CONSOLE.selectedText;

  const fallingResultHits = fallingResult ? fallingResult.hits : 0;
  const fallingResultMisses = fallingResult
    ? Math.max(0, fallingResult.totalNotes - fallingResultHits)
    : 0;
  const fallingResultAccuracy = fallingResult && fallingResult.totalNotes > 0
    ? Math.round((fallingResultHits / fallingResult.totalNotes) * 100)
    : 0;
  // 미션 모달의 링이 누적 횟수를 각도로 그린다 — 문장으로 합치지 않고 숫자를 그대로 넘긴다
  const progressItems = difficultyLevels.map(level => {
    const levelProgress = progress[level.name] || { cumulativeSuccesses: 0, highestScore: 0 };
    return {
      name: level.label,
      count: levelProgress.cumulativeSuccesses,
      best: levelProgress.highestScore,
      star: !!starContext?.starData[`music_${level.name}`],
      cleared: !!clearContext?.clearData[`music_${level.name}`],
    };
  });

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.screenBg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.loadingIndicator} />
      </View>
    );
  }

  return (
    <SafeAreaView edges={[]} style={styles.fullScreen}>
      <MissionProgressIcon
        gameId="music"
        title="피아노 미션"
        missionText="각 난이도에서 정답 누적 3회"
        clearText="각 난이도에서 총점 5점 달성"
        levelNames={difficultyLevels.map(level => level.name)}
        progressItems={progressItems}
        style={missionIconStyle}
        onReset={handleResetProgress}
      />
      {/* 2. Midground Layer (Piano & 훈련 인터페이스) */}
      <View
        style={[styles.midgroundLayer, safeAreaFrameStyle]}
        pointerEvents="box-none"
      >
        {/* 상단 피아노 건반 영역 */}
        <View style={styles.pianoArea} pointerEvents="box-none">
          {isFallingNoteActive && currentSong ? (
            <View
              style={styles.fallingModeLayout}
              pointerEvents="box-none"
              onLayout={(event) => {
                const nextHeight = event.nativeEvent.layout.height;
                setFallingLayoutHeight(prev => Math.abs(prev - nextHeight) < 0.5 ? prev : nextHeight);
              }}
            >
              <View
                style={[
                  styles.fallingTrackArea,
                  fallingTrackHeight !== null && { flex: 0, height: fallingTrackHeight },
                ]}
                pointerEvents="none"
                onLayout={(event) => {
                  const nextWidth = event.nativeEvent.layout.width;
                  setFallingTrackWidth(prev => Math.abs(prev - nextWidth) < 0.5 ? prev : nextWidth);
                }}
              >
                <FallingNoteTrack
                  song={currentSong}
                  bpm={activeFallingBpm}
                  onNoteSchedule={handleNoteSchedule}
                  onNoteHit={handleTrackNoteHit}
                  onSongEnd={handleSongEnd}
                  hitNoteIds={hitNoteIds}
                  missNoteIds={missNoteIds}
                  judgmentPulseKey={judgmentPulseKey}
                  missPulseKey={missPulseKey}
                  onTrackMetrics={handleTrackMetrics}
                  dynamicWhiteKeyWidth={dynamicWhiteKeyWidth}
                  laneStartX={0}
                  // 카운트인이 다 끝나길 기다리지 않는다 — `PREVIEW_PLAY_FROM` 주석 참고
                  isPlaying={isFallingNoteActive && (previewCount === null || previewCount <= PREVIEW_PLAY_FROM)}
                  introMinMs={PREVIEW_REMAINING_AFTER_PLAY_MS + PREVIEW_APPROACH_MARGIN_MS}
                />
              </View>

              {/* 걷어낸 제어반을 대신하는 종료 버튼. 트랙 위 모서리라 자리를 안 먹는다 */}
              <Pressable
                onPress={stopTraining}
                accessibilityRole="button"
                accessibilityLabel="연주 종료"
                style={styles.fallingExitButton}
                hitSlop={mt.falling.exitHitSlop}
              >
                <Ionicons name="close" size={mt.falling.exitIconSize} color={FALLING_COLORS.judgment} />
                <Text style={styles.fallingExitText}>종료</Text>
              </Pressable>

              {/*
                연주 중 유일한 수치. 점수·콤보가 아니라 **맞은 음 / 전체 음**이다 —
                콤보는 연속 성공을 상 주는 리듬게임 장치라 청능에서 뜻이 없다.
                제어반을 걷어냈으니 자리는 트랙 위 가운데를 쓴다(좌:종료, 우:미션 아이콘).
              */}
              <View style={styles.fallingHud} pointerEvents="none">
                <Text style={styles.fallingHudValue}>{hitNoteIds.length}</Text>
                <Text style={styles.fallingHudTotal}> / {currentSong.notes.length}</Text>
              </View>

              <View
                style={[styles.fallingKeyboardArea, { height: fallingWhiteKeyHeight }]}
                pointerEvents="box-none"              >
                <View style={[styles.pianoContainer, styles.fallingPianoContainer]} pointerEvents="box-none">
                  <View style={styles.pianoWrapper} pointerEvents="box-none">
                    {renderPianoViewportRow(
                      pianoNotes,
                      pianoVisibleNoteSet,
                      activeNotes,
                      handlers,
                      dynamicStyles,
                      KEYBOARD_ENABLED,
                      pianoViewportStartIdx,
                      pianoViewportSize,
                      {
                        compact: true,
                        accentColors: fallingLaneColors ?? undefined,
                        labelOf: getSolfege,
                      }
                    )}
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <>
              {!isFixedViewport && (
                <View style={styles.octaveController}>
                  <Animated.View style={{
                    opacity: leftArrowOpacity,
                    transform: [{ translateX: leftArrowTranslateX }]
                  }}>
                    <TouchableOpacity
                      style={[
                        styles.octaveBtn,
                        leftOctaveDisabled && styles.octaveBtnDisabled,
                        leftOctaveGuide && styles.octaveBtnHighlight,
                      ]}
                      onPress={handleShiftLeft}
                      disabled={leftOctaveDisabled}
                    >
                      <Ionicons name="chevron-back" size={mt.octave.btnIconSize} color={leftOctaveInk} />
                      <Text style={[styles.octaveBtnText, { color: leftOctaveInk }]}>옥타브 낮춤</Text>
                    </TouchableOpacity>
                  </Animated.View>

                  {/* 중앙 미니 피아노 맵 배치 */}
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <MiniKeyboardMap
                      viewportStartIdx={currentStartIdx}
                      setViewportStartIdx={setViewportStartIdx}
                      currentNote={currentNote}
                      isTraining={isTraining}
                      viewportSize={VIEWPORT_SIZE}
                    />
                  </View>

                  <Animated.View style={{
                    opacity: rightArrowOpacity,
                    transform: [{ translateX: rightArrowTranslateX }]
                  }}>
                    <TouchableOpacity
                      style={[
                        styles.octaveBtn,
                        rightOctaveDisabled && styles.octaveBtnDisabled,
                        rightOctaveGuide && styles.octaveBtnHighlight,
                      ]}
                      onPress={handleShiftRight}
                      disabled={rightOctaveDisabled}
                    >
                      <Text style={[styles.octaveBtnText, { color: rightOctaveInk }]}>옥타브 높임</Text>
                      <Ionicons name="chevron-forward" size={mt.octave.btnIconSize} color={rightOctaveInk} />
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              )}

              <View style={styles.pianoContainer} pointerEvents="box-none">
                <View style={styles.pianoWrapper} pointerEvents="box-none">
                  {renderPianoViewportRow(
                    pianoNotes,
                    pianoVisibleNoteSet,
                    activeNotes,
                    handlers,
                    dynamicStyles,
                    KEYBOARD_ENABLED,
                    pianoViewportStartIdx,
                    pianoViewportSize
                  )}
                </View>
              </View>
            </>
          )}
        </View>

        {/* 하단 미션 제어반 — 연주 중에는 통째로 걷는다(`isFallingPlaying` 주석 참고) */}
        {!isFallingPlaying && (
        <InstrumentControlBar
          height={bottomPanelHeight}
          background={isConsolePanelVisible ? CONSOLE.panel : PIANO.bar}
          paddingVertical={
            shouldUseFallingBottomPanel
              ? 5
              : isConsolePanelVisible
                ? 0
                : CONTROL_BAR.paddingVertical
          }
          style={isConsolePanelVisible ? styles.consoleBar : undefined}
        >
          {isFreeModePanelVisible ? (
            /* 대기 화면 — 레이아웃 C · 네이비 + 노랑 */
            <FreeModePanel
              onBack={onBack}
              soundPreset={soundPreset}
              onSelectPreset={handleSoundPresetChange}
              songTitle={selectedFallingSong?.title ?? ''}
              onCycleSong={handleCycleFallingSong}
              selectedScale={selectedSongScale}
              onSelectScale={handleSelectSongScale}
              tempoRatio={tempoRatio}
              onTempoRatioChange={setTempoRatio}
              onStartPerformance={() => startFallingNoteMode()}
              onStartTraining={startTraining}
            />
          ) : isTrainingPanelVisible ? (
            /* 청능 훈련 — 자유 모드와 같은 네이비 + 노랑 */
            <TrainingModePanel
              onBack={onBack}
              score={score}
              feedback={feedback}
              hint={SHOW_ANSWER_HINT ? currentNote : null}
              levels={difficultyLevels}
              difficulty={difficulty}
              onSelectDifficulty={handleDifficultyChange}
              soundPreset={soundPreset}
              onSelectPreset={handleSoundPresetChange}
              hasQuestion={currentNote !== null}
              onPlayQuestion={playNextQuestion}
              onRepeat={repeatSound}
              onStop={stopTraining}
            />
          ) : (
            /*
              남는 경우는 하나뿐이다 — 낙하 결과·리플레이 안내가 떠 있는 compact(76) 바.
              오버레이가 화면을 덮고 있으므로 바에는 **나가는 길만** 둔다.
            */
            <LandscapeBackButton style={styles.landscapeBackButton} onBack={onBack} />
          )}
        </InstrumentControlBar>
        )}
      </View>

      {/* 미션 성공 오버레이 (터치 차단 포함) */}
      {showMissionSuccess && (
        <View style={[styles.missionOverlay, overlayFrameStyle]}>
          <View style={styles.missionOverlayBox}>
            <Text style={styles.missionOverlayText}>★ 미션 성공! ★</Text>
            <Text style={styles.missionOverlaySubText}>자유롭게 계속 도전해보세요!</Text>
          </View>
        </View>
      )}

      {isFallingNoteActive && previewCount !== null && (
        <View style={[styles.previewOverlay, overlayFrameStyle]} pointerEvents="none">
          <Text style={styles.previewText}>{previewCount === 0 ? 'Start' : previewCount}</Text>
        </View>
      )}

      {showFallingReplayPrompt && lastFallingResult && !fallingResult && (
        <FallingReplayPrompt
          result={lastFallingResult}
          onReplay={replayFallingSong}
          onShowResult={showLastFallingResult}
          onDismiss={dismissFallingReplayPrompt}
        />
      )}

      {fallingResult && !isTraining && (
        <FallingResultOverlay
          result={fallingResult}
          accuracy={fallingResultAccuracy}
          hits={fallingResultHits}
          misses={fallingResultMisses}
          onClose={closeFallingResult}
        />
      )}

      {/* 3. Ripple Effect Layer / Particle Visualizer (가장 상위 레이어 zIndex: 99 강제 배치) */}
      <View style={styles.rippleContainer} pointerEvents="none">
        {VISUALIZER_MODE === 'particle' ? (
          <ParticleVisualizer
            touchX={touchX}
            touchY={touchY}
            triggerTime={triggerTime}
            particleCount={mt.particles.count}
            particleSizeScale={isFallingNoteActive ? mt.particles.scaleWhileFalling : mt.particles.scale}
            particleSpeedScale={isFallingNoteActive ? mt.particles.scaleWhileFalling : mt.particles.scale}
            maxParticles={isFallingNoteActive ? mt.particles.maxWhileFalling : mt.particles.max}
          />
        ) : (
          <RippleLayer touchX={touchX} touchY={touchY} rippleProgress={rippleProgress} />
        )}
      </View>

      {/* 정답 콘페티 — 리플·파티클보다 위, 손가락은 통과시킨다 */}
      {confettiOverlay}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: colors.screenBg,
    flexDirection: 'column',
  },
  midgroundLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'column',
    zIndex: mt.zIndex.midground,
  },
  landscapeBackButton: {
    marginRight: mt.scene.backButtonMarginRight,
  },
  /** 자유·훈련 제어반 공통. 패널이 자기 여백을 들고 있어 바깥은 0이다 */
  consoleBar: {
    paddingHorizontal: mt.scene.consoleBarPaddingHorizontal,
    borderTopColor: CONSOLE.shadow,
  },
  pianoArea: {
    flex: 1,
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: mt.scene.pianoAreaPaddingTop,
  },
  /**
   * 가로 여백을 뺐다. 레인이 넓을수록 노트가 굵게 보이고, 좌우 10px은 트랙
   * 배경(네이비)과 화면 배경(검정) 사이에 테두리처럼 보이는 띠만 만들었다.
   */
  fallingModeLayout: {
    flex: 1,
    width: '100%',
    /** 내용이 길어져도 화면 아래로 밀리지 않게, 부모 높이 안에서 줄어든다 */
    minHeight: 0,
    paddingTop: mt.falling.layoutPaddingTop,
  },
  fallingTrackArea: {
    flex: 1,
    width: '100%',
    // 판정선이 트랙 바닥에 붙었다. 여기서 더 띄우면 노트가 다시 허공에서 멎는다
    marginBottom: mt.falling.trackMarginBottom,
    minHeight: 0,
    overflow: 'hidden',
  },
  fallingKeyboardArea: {
    width: '100%',
    justifyContent: 'center',
    /**
     * 높이는 렌더에서 `fallingWhiteKeyHeight`로 준다.
     * 자식 건반이 첫 측정에서 0이어도 트랙이 이 자리를 못 먹게 하려고다.
     */
    flexShrink: 0,
    zIndex: mt.zIndex.fallingKeyboard,
    elevation: mt.zIndexElevation.fallingKeyboard,
  },
  /**
   * 좌상단이다 — 우상단은 `MissionProgressIcon`이 이미 쓴다(`missionIconStyle`).
   * 나가는 버튼이 왼쪽인 것은 제어반의 `LandscapeBackButton`과도 같은 방향이다.
   */
  fallingExitButton: {
    position: 'absolute',
    top: mt.falling.exitTop,
    left: mt.falling.exitLeft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: mt.falling.exitGap,
    paddingVertical: mt.falling.exitPaddingVertical,
    paddingHorizontal: mt.falling.exitPaddingHorizontal,
    borderRadius: mt.falling.pillBorderRadius,
    backgroundColor: colors.hudBg,
    borderWidth: mt.falling.pillBorderWidth,
    borderColor: colors.exitBorder,
    zIndex: mt.zIndex.fallingOverlay,
    elevation: mt.zIndexElevation.fallingOverlay,
  },
  fallingExitText: {
    color: FALLING_COLORS.judgment,
    fontSize: fontSize.fallingExit,
    fontWeight: '800',
  },
  /**
   * 우상단 — `MissionProgressIcon`(오른쪽 끝) **왼쪽**에 붙인다.
   *
   * 가운데에 두면 가운데 레인으로 떨어지는 노트를 가린다. 위쪽 두 모서리는 이미
   * UI 자리라(왼쪽 종료 · 오른쪽 미션) 여기 붙이면 트랙 가운데가 깨끗하게 남는다.
   * `right`로 **오른쪽 변을 못 박아야** 폭이 내용에 맞게 줄어든다 —
   * `alignSelf`만으로는 절대배치 자식의 폭이 잡히지 않는다.
   */
  fallingHud: {
    position: 'absolute',
    top: mt.falling.hudTop,
    right: mt.falling.hudRight,
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingVertical: mt.falling.hudPaddingVertical,
    paddingHorizontal: mt.falling.hudPaddingHorizontal,
    borderRadius: mt.falling.pillBorderRadius,
    backgroundColor: colors.hudBg,
    zIndex: mt.zIndex.fallingOverlay,
    elevation: mt.zIndexElevation.fallingOverlay,
  },
  fallingHudValue: {
    color: FALLING_COLORS.judgment,
    fontSize: fontSize.fallingHudValue,
    fontWeight: '900',
  },
  fallingHudTotal: {
    color: colors.hudTotal,
    fontSize: fontSize.fallingHudTotal,
    fontWeight: '800',
  },
  keyAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: FALLING_LAYOUT.keyAccentHeight,
  },
  /**
   * 건반 위 옥타브 이동 줄. **아래 제어반과 같은 네이비 상자**다 —
   * 예전 회색(rgba(41,41,41,.8)) + 파랑 버튼은 콘솔이 노랑으로 바뀐 뒤로
   * 화면 위아래가 서로 다른 앱처럼 보이게 만들었다.
   */
  octaveController: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: mt.octave.width,
    backgroundColor: CONSOLE.panel,
    borderWidth: mt.octave.borderWidth,
    borderColor: CONSOLE.shadow,
    borderRadius: mt.octave.borderRadius,
    padding: mt.octave.padding,
    marginBottom: mt.octave.marginBottom,
  },
  octaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CONSOLE.selected,
    paddingVertical: mt.octave.btnPaddingVertical,
    paddingHorizontal: mt.octave.btnPaddingHorizontal,
    borderRadius: mt.octave.btnBorderRadius,
  },
  /** 4단계에서 정답이 화면 밖에 있을 때. 노랑과 **구분되는** 주황이라야 뜻이 산다 */
  octaveBtnHighlight: {
    backgroundColor: CONSOLE.presetDot,
  },
  octaveBtnDisabled: {
    backgroundColor: CONSOLE.idleBtn,
  },
  octaveBtnText: {
    fontSize: fontSize.octaveBtn,
    fontWeight: '800',
    marginHorizontal: mt.octave.btnTextMarginHorizontal,
  },
  pianoContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: mt.scene.pianoContainerPaddingHorizontal,
  },
  fallingPianoContainer: {
    flex: 0,
    paddingHorizontal: mt.falling.pianoContainerPaddingHorizontal,
  },
  pianoWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContainer: {
    flexDirection: 'row',
    position: 'relative',
    marginVertical: mt.keyboard.rowMarginVertical,
  },
  /** 낙하 모드. 위아래 8px씩이 그대로 트랙에서 빠져나간 높이였다 */
  rowContainerCompact: {
    marginVertical: mt.keyboard.rowMarginVerticalCompact,
  },
  whiteKey: {
    borderWidth: mt.keyboard.whiteBorderWidth,
    borderColor: PIANO.keys.whiteBorder,
    backgroundColor: PIANO.keys.white,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: mt.keyboard.whitePaddingBottom,
    // 2.5D 입체감 그림자
    elevation: mt.keyboard.whiteElevation,
    borderBottomLeftRadius: mt.keyboard.keyBorderRadius,
    borderBottomRightRadius: mt.keyboard.keyBorderRadius,
  },
  blackKey: {
    position: 'absolute',
    backgroundColor: PIANO.keys.black,
    borderRadius: mt.keyboard.keyBorderRadius,
    zIndex: mt.zIndex.blackKey,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: mt.keyboard.blackPaddingBottom,
    // 2.5D 입체감 그림자
    elevation: mt.keyboard.blackElevation,
    borderBottomLeftRadius: mt.keyboard.keyBorderRadius,
    borderBottomRightRadius: mt.keyboard.keyBorderRadius,
  },
  /**
   * 건반 음이름. **`fontSize`가 여기 없는 것은 의도다** — 크기는 건반 폭에서 나오고
   * (`getKeyLabelSize`) 렌더에서 얹는다. 여기 기본값을 두면 곧 두 벌이 되어 갈라진다.
   */
  keyTextLabel: {
    color: PIANO.keys.label,
    fontWeight: 'bold',
    marginBottom: mt.keyboard.labelMarginBottom,
  },
  blackKeyTextLabel: {
    color: PIANO.keys.labelOnBlack,
    fontWeight: 'bold',
    marginBottom: mt.keyboard.labelMarginBottom,
  },
  whiteKeyLabel: {
    fontSize: fontSize.whiteKeyLabel,
    color: PIANO.keys.labelSub,
    fontWeight: '600',
  },
  blackKeyLabel: {
    fontSize: fontSize.blackKeyLabel,
    color: PIANO.keys.labelSub,
    fontWeight: '600',
  },
  /**
   * 0.25는 검은 배경 위에서 건반을 **지워버렸다.** 0.4면 "여기 건반이 있는데
   * 이번 난이도에서는 안 쓴다"가 보인다 — 범위가 좁아진 것이지 건반이 없어진 게 아니다.
   */
  whiteKeyDisabled: {
    backgroundColor: PIANO.keys.whiteDisabled,
    borderColor: PIANO.keys.whiteBorderDisabled,
    opacity: opacity.keyDisabled,
  },
  keyDisabled: {
    opacity: opacity.keyDisabled,
  },
  keyLabelDisabled: {
    color: PIANO.keys.labelDisabled,
  },
  rippleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: mt.zIndex.ripple,
    elevation: mt.zIndexElevation.ripple,
  },
  missionOverlay: {
    // 하단 제어반을 제외한 피아노 영역 전체를 덮어 터치를 막는다.
    // 네 변은 렌더에서 `overlayFrameStyle`로 준다 — 인셋은 기기마다,
    // 제어반 높이는 모드마다 다르다 (평소 110 · 낙하 76). 고정값은 어긋난다
    position: 'absolute',
    backgroundColor: colors.missionScrim,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: mt.zIndex.missionOverlay,
  },
  missionOverlayBox: {
    backgroundColor: CONSOLE.panel,
    paddingVertical: mt.mission.boxPaddingVertical,
    paddingHorizontal: mt.mission.boxPaddingHorizontal,
    borderRadius: mt.mission.boxBorderRadius,
    borderWidth: mt.mission.boxBorderWidth,
    borderColor: PIANO.highlight,
    alignItems: 'center',
    elevation: mt.mission.boxElevation,
  },
  missionOverlayText: {
    color: PIANO.highlight,
    fontSize: fontSize.missionOverlay,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  missionOverlaySubText: {
    color: colors.missionSubText,
    fontSize: fontSize.missionOverlaySub,
    fontWeight: '600',
    marginTop: mt.mission.subTextMarginTop,
    textAlign: 'center',
  },
  previewOverlay: {
    // 위치는 `missionOverlay`와 같은 이유로 렌더에서 준다. 숫자가 연주 영역
    // 한가운데에 오려면 제어반 높이와 인셋을 둘 다 알아야 한다
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: mt.zIndex.previewOverlay,
  },
  previewText: {
    color: PIANO.highlight,
    fontSize: fontSize.preview,
    fontWeight: '900',
    textShadowColor: PIANO.highlight,
    textShadowRadius: mt.preview.textShadowRadius,
  },
});
