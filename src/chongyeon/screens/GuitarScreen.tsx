"use no memo";

// A는 React Compiler가 켜져 있고(app.json experiments.reactCompiler) B는 아니었다.
// 이 파일은 렌더 중 ref 읽기 등 컴파일러가 가정하는 규칙을 어긴다. 그대로 컴파일하면
// 잘못 메모이즈될 수 있어 **명시적으로 옵트아웃한다.** 규칙을 맞춰 고치면 이 줄을 지운다.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useCorrectConfetti } from '../components/CorrectConfetti';
import { LandscapeBackButton } from '../components/LandscapeBackButton';
import MissionProgressIcon from '../components/MissionProgressIcon';
import {
  useInstrumentMetrics,
  type DifficultyLevel,
} from '../components/instrument';
import {
  getGuitarFit,
  inlay,
  press,
  stringGauge,
  stringMaterial,
  vibration,
} from '../constants/guitarLayout';
import { colors, opacity } from '../constants/guitarTheme';
import { useStopAudioOnBlur } from "@/hooks/use-stop-audio-on-blur";
import { ClearContext } from '../context/ClearContext';
import { StarContext } from '../context/StarContext';
import { useSyncGameData } from '../hooks/useSyncGameData';
import { Ionicons } from '@expo/vector-icons';

const GUITAR_LEVELS: DifficultyLevel[] = ['1단계', '2단계', '3단계', '4단계'].map(name => ({
  name,
  label: name,
}));

const FEEDBACK = {
  idle: '자유 연주 중',
  start: '훈련 시작!',
  correct: '정답입니다! 🎸',
  wrong: '틀렸습니다! 다시 들어보세요.',
} as const;

const STAR_GOAL = 3;
const CLEAR_GOAL = 5;

/**
 * 정답 뒤 다음 문제음까지. 원래 1.2초였는데 **콘페티가 다 걷힐 때까지** 기다리도록 늘렸다.
 *
 * 콘페티 총 지속은 `(발 수 − 1) × 간격 + 한 발`이라 지금 설정으로 2.1초다
 * (`CorrectConfetti`의 `CORRECT_CONFETTI_BURST_COUNT`·`_GAP_MS`·`_DURATION_MS`).
 * **저쪽을 늘리면 이 값도 같이 봐야 한다** — 안 그러면 다음 문제음 위로 콘페티가 남는다.
 */
const NEXT_QUESTION_DELAY_MS = 2150;

/**
 * 현 진동의 scaleY 하한.
 *
 * `vibration.byString`의 amplitude는 1.6~2.6이라 `1 - amplitude`가 그대로면
 * 음수(-0.6 ~ -1.6)가 된다. 1px 굵기의 현이 0 근처를 지나면 **끊겨 보인다.**
 * 감쇠만으로는 첫 왕복을 막지 못해 하한을 둔다. 실기기에서 먼저 조정할 값이다.
 */
const VIBRATION_MIN_SCALE = 0.25;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** 햅틱은 미지원 기기·웹에서 reject 된다. 실패해도 연주는 그대로 진행한다 */
const tapFeedback = (style: Haptics.ImpactFeedbackStyle) => {
  Haptics.impactAsync(style).catch(() => { });
};

// 1. 기타용 노트 타입 정의 (총 28개)
type GuitarNote =
  | 'E2' | 'F2' | 'F#2' | 'G2' | 'G#2' | 'A2' | 'A#2' | 'B2'
  | 'C3' | 'C#3' | 'D3' | 'D#3' | 'E3' | 'F3' | 'F#3' | 'G3' | 'G#3' | 'A3' | 'A#3' | 'B3'
  | 'C4' | 'C#4' | 'D4' | 'D#4' | 'E4' | 'F4' | 'F#4' | 'G4';

const guitarSounds: { [key in GuitarNote]: any } = {
  'E2': require('@/assets/chongyeon/sounds/guitar/E2.m4a'), 'F2': require('@/assets/chongyeon/sounds/guitar/F2.m4a'),
  'F#2': require('@/assets/chongyeon/sounds/guitar/F_sharp2.m4a'), 'G2': require('@/assets/chongyeon/sounds/guitar/G2.m4a'),
  'G#2': require('@/assets/chongyeon/sounds/guitar/G_sharp2.m4a'), 'A2': require('@/assets/chongyeon/sounds/guitar/A2.m4a'),
  'A#2': require('@/assets/chongyeon/sounds/guitar/A_sharp2.m4a'), 'B2': require('@/assets/chongyeon/sounds/guitar/B2.m4a'),
  'C3': require('@/assets/chongyeon/sounds/guitar/C3.m4a'), 'C#3': require('@/assets/chongyeon/sounds/guitar/C_sharp3.m4a'),
  'D3': require('@/assets/chongyeon/sounds/guitar/D3.m4a'), 'D#3': require('@/assets/chongyeon/sounds/guitar/D_sharp3.m4a'),
  'E3': require('@/assets/chongyeon/sounds/guitar/E3.m4a'), 'F3': require('@/assets/chongyeon/sounds/guitar/F3.m4a'),
  'F#3': require('@/assets/chongyeon/sounds/guitar/F_sharp3.m4a'), 'G3': require('@/assets/chongyeon/sounds/guitar/G3.m4a'),
  'G#3': require('@/assets/chongyeon/sounds/guitar/G_sharp3.m4a'), 'A3': require('@/assets/chongyeon/sounds/guitar/A3.m4a'),
  'A#3': require('@/assets/chongyeon/sounds/guitar/A_sharp3.m4a'), 'B3': require('@/assets/chongyeon/sounds/guitar/B3.m4a'),
  'C4': require('@/assets/chongyeon/sounds/guitar/C4.m4a'), 'C#4': require('@/assets/chongyeon/sounds/guitar/C_sharp4.m4a'),
  'D4': require('@/assets/chongyeon/sounds/guitar/D4.m4a'), 'D#4': require('@/assets/chongyeon/sounds/guitar/D_sharp4.m4a'),
  'E4': require('@/assets/chongyeon/sounds/guitar/E4.m4a'), 'F4': require('@/assets/chongyeon/sounds/guitar/F4.m4a'),
  'F#4': require('@/assets/chongyeon/sounds/guitar/F_sharp4.m4a'), 'G4': require('@/assets/chongyeon/sounds/guitar/G4.m4a'),
};

/**
 * 화면에 그리는 프렛. 줄 6개 × 4프렛 = **24개**다.
 *
 * `guitarSounds`(28개)와 수가 다르다 — `G#2` `C#3` `F#3` `D#4`는 소리는 있지만
 * **누를 자리가 없다.** 그래서 출제 후보를 이 목록으로 거른다(`getVisibleNoteSet`).
 * 거르지 않으면 3단계 16.7% · 4단계 14.3%가 **정답을 누를 수단이 없는 문제**가 되어
 * 「틀렸습니다」만 반복된다.
 *
 * 프렛을 늘리거나 줄이면 출제 후보가 **자동으로 따라온다** — 두 곳을 손으로 맞추지 않는다.
 */
const GUITAR_STRINGS: { name: string; notes: GuitarNote[] }[] = [
  { name: '1번줄(E)', notes: ['E4', 'F4', 'F#4', 'G4'] },
  { name: '2번줄(B)', notes: ['B3', 'C4', 'C#4', 'D4'] },
  { name: '3번줄(G)', notes: ['G3', 'G#3', 'A3', 'A#3'] },
  { name: '4번줄(D)', notes: ['D3', 'D#3', 'E3', 'F3'] },
  { name: '5번줄(A)', notes: ['A2', 'A#2', 'B2', 'C3'] },
  { name: '6번줄(E)', notes: ['E2', 'F2', 'F#2', 'G2'] },
];

/** 프렛보드에 실제로 있는 음. 출제 후보의 상한이다 */
const FRETBOARD_NOTES = new Set<GuitarNote>(
  GUITAR_STRINGS.reduce<GuitarNote[]>((acc, str) => acc.concat(str.notes), [])
);

const GUITAR_PROGRESS_KEY = '@MiniGameApp:guitarProgress';

/**
 * 상주시킬 기타 플레이어 수. 피아노(`MusicTrainingScreen`)와 같은 이유·같은 값이다.
 *
 * 안드로이드는 앱당 동시 AudioTrack을 약 40개로 제한하고, `createAudioPlayer`는 만드는
 * 즉시 트랙을 잡는다. 28개를 미리 만들면 앱 전체 한도에 걸려 **만들어지자마자 죽는다.**
 * 배경 상주(동물 12 · 단어 8 · 드럼 5 = 25)를 빼면 이 화면 몫은 15 안팎이다.
 * 한도가 차면 새로 만들지 않고 **가장 오래된 플레이어를 멈추고 음원만 바꿔(`replace`) 쓴다.**
 *
 * 근거: `docs/기타-재생-캐시.md` · `docs/재생-키포인트.md` · `docs/피아노기타-무음-원인과-해결_2026-10-26.md`
 */
const CACHE_LIMIT = 12;

/** 채점 강조 상태. 문자열이라 애니메이션 의존성 배열에서 안정적이다 */
type GradedState = 'none' | 'correct' | 'wrong';

type GuitarFit = ReturnType<typeof getGuitarFit>;

type GuitarScreenProps = {
  onBack: () => void;
};

/**
 * 프렛 칸 하나.
 *
 * 누름 표현(항목 1)을 칸마다 따로 들고 있어야 해서 컴포넌트로 뺐다.
 * `Pressable`의 `pressed`만으로는 **뗄 때 `press.releaseMs`에 걸쳐 돌아오는 것**을
 * 표현할 수 없다(즉시 전환된다). 누를 때는 즉시, 뗄 때는 120ms 복귀로 맞추려고
 * 공유값 하나를 쓴다 — 현 진동(항목 2)에 이미 들어온 라이브러리를 그대로 쓴다.
 */
function FretCell({
  note,
  height,
  fontSize,
  active,
  gradedState,
  onPressIn,
}: {
  note: GuitarNote;
  height: number;
  fontSize: number;
  active: boolean;
  gradedState: GradedState;
  onPressIn: (note: GuitarNote) => void;
}) {
  const pressProgress = useSharedValue(0);

  const baseBg =
    gradedState === 'correct' ? colors.correctFill
      : gradedState === 'wrong' ? colors.wrongFill
        : colors.cellBg;
  const baseBorder =
    gradedState === 'correct' ? colors.correctBorder
      : gradedState === 'wrong' ? colors.wrongBorder
        : colors.cellBorder;

  const animatedStyle = useAnimatedStyle(() => {
    // **채점 강조가 누름 색보다 우선한다.** 누르고 있는 동안에도 정·오답이 보여야 한다.
    // 칸이 내려앉는 것(translateY)은 채점과 무관하게 그대로 둔다.
    const tint = gradedState === 'none' ? pressProgress.value : 0;
    return {
      backgroundColor: interpolateColor(tint, [0, 1], [baseBg, colors.cellBgPressed]),
      borderColor: interpolateColor(tint, [0, 1], [baseBorder, colors.cellBorderPressed]),
      transform: [{ translateY: pressProgress.value * press.translateY }],
    };
  }, [gradedState, baseBg, baseBorder]);

  return (
    <AnimatedPressable
      disabled={!active}
      accessibilityRole="button"
      accessibilityLabel={note}
      accessibilityState={{ disabled: !active }}
      onPressIn={() => {
        pressProgress.value = 1;
        onPressIn(note);
      }}
      onPressOut={() => {
        pressProgress.value = withTiming(0, { duration: press.releaseMs });
      }}
      style={[
        styles.fretCell,
        { height },
        !active && styles.fretCellInactive,
        animatedStyle,
      ]}
    >
      <Text style={[styles.fretText, { fontSize }]}>{note}</Text>
    </AnimatedPressable>
  );
}

/**
 * 줄 한 개 = 라벨 + 현 + (개방현 · 너트 · 1~3프렛).
 *
 * 현 진동(항목 2)이 **눌린 줄 하나만** 움직여야 해서 줄마다 공유값이 필요하다.
 * 부모의 `.map()` 안에서는 훅을 쓸 수 없으므로 컴포넌트로 뺐다.
 */
function GuitarStringRow({
  str,
  index,
  fit,
  visibleNoteSet,
  gradedNote,
  onNotePress,
}: {
  str: { name: string; notes: GuitarNote[] };
  index: number;
  fit: GuitarFit;
  visibleNoteSet: Set<GuitarNote>;
  gradedNote: { note: GuitarNote; correct: boolean } | null;
  onNotePress: (note: GuitarNote) => void;
}) {
  const gauge = stringGauge[index];
  const material = stringMaterial[index];
  const { amplitude, durationMs } = vibration.byString[index];

  const scaleY = useSharedValue(1);
  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scaleY.value }],
  }));

  /**
   * scaleY 를 1 → 1+amp → 1-amp … 로 `vibration.cycles`회 왕복시키며
   * 진폭을 선형으로 줄이고 1 로 끝낸다. 굵은 줄일수록 크고 느리다.
   */
  const pluck = useCallback(() => {
    const half = durationMs / (vibration.cycles * 2);
    const steps: number[] = [];
    for (let i = 0; i < vibration.cycles; i++) {
      const amp = amplitude * (1 - i / vibration.cycles);
      steps.push(withTiming(1 + amp, { duration: half }));
      steps.push(withTiming(Math.max(VIBRATION_MIN_SCALE, 1 - amp), { duration: half }));
    }
    steps.push(withTiming(1, { duration: half }));
    scaleY.value = withSequence(...(steps as [number, ...number[]]));
  }, [amplitude, durationMs, scaleY]);

  const handlePressIn = useCallback(
    (note: GuitarNote) => {
      // 현 진동과 채점·소리·햅틱은 같은 onPressIn에서 함께 시작한다
      pluck();
      onNotePress(note);
    },
    [pluck, onNotePress],
  );

  const gradedStateOf = (note: GuitarNote): GradedState =>
    gradedNote?.note !== note ? 'none' : gradedNote.correct ? 'correct' : 'wrong';

  const [openNote, ...fretNotes] = str.notes;

  return (
    <View style={[styles.stringRow, { gap: fit.labelGap }]}>
      <Text
        style={[styles.stringName, { width: fit.labelWidth, fontSize: fit.stringLabel }]}
        numberOfLines={1}
      >
        {str.name}
      </Text>
      <View style={[styles.fretArea, { gap: fit.cellGap }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.stringLine,
            {
              height: gauge,
              marginTop: -gauge / 2,
              backgroundColor: material === 'wound' ? colors.stringWound : colors.stringPlain,
            },
            lineStyle,
          ]}
        />
        <FretCell
          note={openNote}
          height={fit.cellHeight}
          fontSize={fit.note}
          active={visibleNoteSet.has(openNote)}
          gradedState={gradedStateOf(openNote)}
          onPressIn={handlePressIn}
        />
        <View style={[styles.nut, { width: fit.nutWidth, height: fit.nutHeight }]} />
        {fretNotes.map(note => (
          <FretCell
            key={note}
            note={note}
            height={fit.cellHeight}
            fontSize={fit.note}
            active={visibleNoteSet.has(note)}
            gradedState={gradedStateOf(note)}
            onPressIn={handlePressIn}
          />
        ))}
      </View>
    </View>
  );
}

export function GuitarScreen({ onBack }: GuitarScreenProps) {
  const [isReady, setIsReady] = useState(false);
  const [activeNotes, setActiveNotes] = useState<{ [key in GuitarNote]?: boolean }>({});
  const [isTraining, setIsTraining] = useState(false);
  const [currentNote, setCurrentNote] = useState<GuitarNote | null>(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string>(FEEDBACK.idle);
  const [difficulty, setDifficulty] = useState('1단계');
  const [progress, setProgress] = useState<any>({});
  /** 채점 직후 해당 칸만 강조. 다음 문제·종료 때 지운다 */
  const [gradedNote, setGradedNote] = useState<{ note: GuitarNote; correct: boolean } | null>(null);

  // 최대 CACHE_LIMIT개. 맨 앞이 가장 최근에 낸 음이다
  const soundCache = useRef<{ [key in GuitarNote]?: any }>({});
  const recentlyUsedNotes = useRef<GuitarNote[]>([]);

  /**
   * 정답을 맞힌 뒤 다음 문제가 나올 때까지(1.2초) 채점을 막는 빗장.
   *
   * 없으면 그 사이 **같은 프렛을 또 눌러도 정답**이라 점수·누적성공이 계속 오르고
   * `playNextQuestion` 타이머가 겹겹이 쌓인다. 5점이면 클리어라 **한 문제 연타로
   * 클리어된다.** 프렛은 `onPressIn`이라 더 쉽게 걸린다.
   *
   * 렌더에서 읽지 않으므로 ref다 — state면 연타가 같은 렌더의 옛 값을 본다
   * (세션 47 `isAnimating`과 같은 처방). **소리는 그대로 낸다.** 막는 것은 채점뿐이다.
   */
  const isScoringLockedRef = useRef(false);

  /**
   * 정답 콘페티. 드럼 만점 화면(`DrumGameOverScreen`)과 같은 Rive 아트보드를 쓰되
   * **정답마다 몇 발씩** 터지고, 각자 정해진 시간 뒤에 언마운트되어 걷힌다.
   * (`Burst`는 루프라 안 걷으면 계속 돈다 — 드럼 결과 화면이 그 쪽이다.)
   */
  const { burstConfetti, clearConfetti, confettiOverlay } = useCorrectConfetti();

  /** 예약된 타이머. `matchGame`과 같은 방식으로 모아서 정리한다 (`matchGame.tsx:66`) */
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearPendingTimers = () => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current.length = 0;
  };

  /**
   * `score`의 동기 사본과 **유일한 쓰기 통로.**
   * 피아노와 같다 — 정답이 `score + 1`로 렌더 클로저를 읽으면 한 프레임에
   * 두 프렛이 들어올 때 점수가 하나만 오른다. 오답 −1도 여기를 탄다.
   */
  const scoreRef = useRef(0);
  const applyScore = useCallback((next: number) => {
    scoreRef.current = next;
    setScore(next);
  }, []);

  /** `progress`의 현재 값. 연타에서 렌더 클로저의 옛 값으로 덮어쓰지 않으려고 함께 든다 */
  const progressRef = useRef<any>({});

  const { syncData } = useSyncGameData();
  /**
   * 이번 문제가 시작된 시각. `response_time_seconds`의 기준이다.
   *
   * 전에는 state였고 `playSound(...).then()` **안에서만** 찍었다. 그래서 첫 문제에서
   * 소리가 나기 전에 프렛을 누르면 `null || 0`이 되어 `(Date.now() − 0)/1000`,
   * 곧 **17억 초**가 기록됐다. 두 번째 세션은 앞 세션 시각이 남아 그만큼 기록됐다.
   * 출제할 때 **동기로** 한 번 찍고 재생이 시작되면 다시 찍는다 — 비는 구간이 없다.
   * 렌더에서 읽지 않으므로 state가 아니라 ref다.
   */
  const questionStartTimeRef = useRef<number | null>(null);
  const [repeatCount, setRepeatCount] = useState(0);
  const [sessionLog, setSessionLog] = useState<any[]>([]);

  const starContext = useContext(StarContext);
  const clearContext = useContext(ClearContext);

  // 1. 초기화 (오디오 모드 및 화면 방향)
  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        // 화면 방향은 악기 묶음 화면이 단독으로 건다. 여기서 걸면 피아노와 서로 덮어쓴다.
        // 오디오 모드는 `AudioManagerProvider`가 앱 시작 시 1회 설정한다(4-B에서 일원화).
        const saved = await AsyncStorage.getItem(GUITAR_PROGRESS_KEY);
        if (saved && isMounted) {
          const loaded = JSON.parse(saved);
          progressRef.current = loaded;
          setProgress(loaded);
        }
      } finally {
        if (isMounted) setIsReady(true);
      }
    }
    init();

    return () => {
      isMounted = false;
      clearPendingTimers();
      // 사운드 해제
      for (const player of Object.values(soundCache.current)) {
        player?.remove();
      }
      soundCache.current = {};
      recentlyUsedNotes.current = [];
    };
  }, []);

  useEffect(() => {
    if (Object.keys(progress).length > 0) {
      AsyncStorage.setItem(GUITAR_PROGRESS_KEY, JSON.stringify(progress));
    }
  }, [progress]);

  /**
   * 🎸 탭을 떠날 때 기타 소리를 끊고 **플레이어를 해제한다.**
   * 탭은 언마운트되지 않으므로 언마운트 클린업은 탭 전환 때 실행되지 않는다.
   *
   * 이전에는 `pause()`만 하고 캐시를 남겼다. 그런데 `pause()`는 소리만 멈추고
   * **AudioTrack은 계속 붙잡는다.** 기타를 다녀오면 피아노·단어가 앱 전체 한도에 걸렸다.
   * 자리를 돌려주려면 해제해야 한다. 재진입 첫 음 지연은 그 대가다.
   */
  const isScreenFocused = useStopAudioOnBlur(() => {
    for (const player of Object.values(soundCache.current)) {
      try {
        player?.remove();
      } catch (e) { }
    }
    soundCache.current = {};
    recentlyUsedNotes.current = [];
  });

  /**
   * 가장 오래 안 쓴 음의 플레이어를 캐시에서 떼어 돌려준다(해제하지 않는다).
   * **울리는 중이어도 가져온다** — 멈추고 새 음으로 바꿔 쓴다. 건너뛰고 새로 만들면
   * 한도를 넘어 디코더가 모자라고, 그 뒤에 만든 음이 무음이 됐다(피아노에서 확인).
   */
  const takeLeastRecentlyUsedPlayer = () => {
    const oldest = recentlyUsedNotes.current.pop();
    if (!oldest) return undefined;
    const player = soundCache.current[oldest];
    delete soundCache.current[oldest];
    return player;
  };

  // 2. 사운드 재생 (expo-audio 방식: 폴리포니 지원)
  const playSound = async (note: GuitarNote) => {
    // 정답을 맞히면 1.2초 뒤에 다음 문제음이 예약된다(:224). 그 사이에 탭을 떠났다면
    // 다른 탭에서 기타 소리가 울리므로 재생하지 않는다. (문제 출제 흐름 자체는 그대로 두고
    // 소리만 내지 않는다 — 돌아와서 '다시 듣기'를 누르면 들린다)
    if (!isScreenFocused.current) return;

    try {
      let player = soundCache.current[note];
      if (!player) {
        const source = guitarSounds[note];
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
          // 재사용하므로 그 음은 계속 무음이다 — 탭을 나갔다 오거나(`useStopAudioOnBlur`)
          // LRU에 밀려날 때까지. 캐시에서 빼두면 다음 터치 때 새로 만들어 바로 회복한다.
          // 플레이어가 음을 바꿔 가며 쓰이므로 지금 맡은 음은 캐시에서 찾는다.
          try {
            createdPlayer.addListener('playbackStatusUpdate', (status: any) => {
              if (!status?.error) return;
              const owner = (Object.keys(soundCache.current) as GuitarNote[])
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

      // 방금 낸 음을 맨 앞으로 (맨 뒤가 가장 오래 안 쓴 음 = 축출 대상)
      recentlyUsedNotes.current = recentlyUsedNotes.current.filter(n => n !== note);
      recentlyUsedNotes.current.unshift(note);

      // 탭을 떠날 때 pause()만 하면 currentTime이 0이어도 play()가 무음이 된다.
      // 동물게임과 같이 항상 되감은 뒤 재생한다.
      await player.seekTo(0);
      if (!isScreenFocused.current) return;
      player.play();
    } catch (error) {
      console.log(`재생 실패: ${note}`, error);
    }
  };

  const getVisibleNoteSet = useCallback((level: string) => {
    const allNotesList = Object.keys(guitarSounds) as GuitarNote[];
    // 화면에 프렛이 없는 음은 후보에서 뺀다 — 누를 수단이 없는 문제가 나오지 않게
    const onFretboard = (notes: GuitarNote[]) =>
      new Set<GuitarNote>(notes.filter(n => FRETBOARD_NOTES.has(n)));
    switch (level) {
      case '1단계': return onFretboard(['E2', 'A2', 'D3', 'G3', 'B3', 'E4']);
      case '2단계': return onFretboard(allNotesList.filter(n => !n.includes('#')));
      case '3단계': return onFretboard(allNotesList.slice(0, 18));
      case '4단계': return onFretboard(allNotesList);
      default: return onFretboard(['E2', 'A2', 'D3', 'G3', 'B3', 'E4']);
    }
  }, []);

  const playNextQuestion = useCallback(() => {
    const visibleNotes = Array.from(getVisibleNoteSet(difficulty));
    const randomNote = visibleNotes[Math.floor(Math.random() * visibleNotes.length)];
    // 출제 시각을 **먼저** 찍는다. 재생을 기다리는 동안 눌려도 기준이 비어 있지 않도록
    questionStartTimeRef.current = Date.now();
    isScoringLockedRef.current = false;
    setGradedNote(null);
    setCurrentNote(randomNote);
    setRepeatCount(0);
    // 재생이 실제로 시작되면 그때로 다시 찍는다 (첫 음은 플레이어를 만드느라 늦는다)
    playSound(randomNote).then(() => {
      questionStartTimeRef.current = Date.now();
    });
  }, [difficulty, getVisibleNoteSet]);

  const startTraining = () => {
    // 앞 세션에서 예약된 문제 출제가 남아 있으면 새 문제를 곧바로 덮어쓴다
    clearPendingTimers();
    isScoringLockedRef.current = false;
    setIsTraining(true);
    applyScore(0);
    setSessionLog([]);
    setFeedback(FEEDBACK.start);
    playNextQuestion();
  };

  // ✅ 데이터 전송 로직이 포함된 stopTraining
  const stopTraining = () => {
    if (isTraining && sessionLog.length > 0) {
      const correctCount = sessionLog.filter(l => l.is_correct).length;
      const payload = {
        difficulty_level: difficulty,
        total_attempts: sessionLog.length,
        correct_count: correctCount,
        accuracy_rate: parseFloat(((correctCount / sessionLog.length) * 100).toFixed(1)),
        detailed_logs: sessionLog
      };
      console.log("🚀 [의료 데이터 전송] guitar:", payload);
      syncData('guitar', payload);
    }

    // 정답 뒤 `NEXT_QUESTION_DELAY_MS` 안에 종료하면 예약된 `playNextQuestion`이 살아 남아
    // 훈련이 끝난 뒤에 문제음이 나고 `currentNote`가 다시 세팅된다 — 아래 초기화가 뒤집힌다
    clearPendingTimers();
    clearConfetti();
    isScoringLockedRef.current = false;
    questionStartTimeRef.current = null;

    setIsTraining(false);
    setCurrentNote(null);
    setGradedNote(null);
    setFeedback(FEEDBACK.idle);
  };

  /**
   * 미션 창 「초기화」. 기타 기록(누적·최고점)만 지운다 — 별·클리어는 미션 창이 `guitar_*`만 지운다.
   * 문제를 지우므로 훈련도 끝낸다. 출제가 비면 프렛이 채점되지 않아 훈련 중 상태로 멈춘다.
   */
  const handleResetProgress = async () => {
    try {
      await AsyncStorage.removeItem(GUITAR_PROGRESS_KEY);
      clearPendingTimers();
      clearConfetti();
      isScoringLockedRef.current = false;
      questionStartTimeRef.current = null;
      progressRef.current = {};
      setProgress({});
      applyScore(0);
      setSessionLog([]);
      setIsTraining(false);
      setCurrentNote(null);
      setGradedNote(null);
      setFeedback(FEEDBACK.idle);
    } catch (e) {
      console.error('Failed to reset guitar progress.', e);
    }
  };

  const handleNotePress = useCallback((note: GuitarNote) => {
    // 누름 햅틱은 **대기·훈련 모두** 난다. 채점 여부와 무관하다 —
    // 칸 눌림·현 진동과 같은 onPressIn 시점이다
    tapFeedback(Haptics.ImpactFeedbackStyle.Light);

    // 소리는 늘 낸다. 막는 것은 채점뿐이다 — 악기 화면이라 프렛은 언제나 울려야 한다
    playSound(note);
    if (!isTraining || !currentNote || isScoringLockedRef.current) return;

    const isCorrect = note === currentNote;
    const startedAt = questionStartTimeRef.current;
    // 프렛 onPressIn. 렌더가 아니다.
    // eslint-disable-next-line react-hooks/purity -- 채점 시각
    const responseTime = startedAt === null ? 0 : (Date.now() - startedAt) / 1000;

    setSessionLog(prev => [...prev, {
      target_note: currentNote,
      selected_note: note,
      is_correct: isCorrect,
      response_time_seconds: parseFloat(responseTime.toFixed(2)),
      repeat_listens: repeatCount
    }]);

    if (isCorrect) {
      // 정답일 때만 한 단계 센 햅틱을 한 번 더 겹친다
      tapFeedback(Haptics.ImpactFeedbackStyle.Medium);
      // 눈으로도. 다음 문제음(`NEXT_QUESTION_DELAY_MS`)이 나오기 전에 스스로 걷힌다
      burstConfetti();

      // 다음 문제가 나올 때까지 채점을 잠근다. 여기서 안 잠그면 같은 프렛 연타가 계속 정답이다
      isScoringLockedRef.current = true;

      const newScore = scoreRef.current + 1;
      applyScore(newScore);
      // 렌더 클로저의 `progress`가 아니라 ref를 읽는다 — 연속 정답에서 옛 값으로 덮어쓰지 않게
      const currentProgress = progressRef.current[difficulty] || { cumulativeSuccesses: 0, highestScore: 0 };
      const newCumulativeSuccesses = currentProgress.cumulativeSuccesses + 1;
      const nextProgress = {
        ...progressRef.current,
        [difficulty]: {
          cumulativeSuccesses: newCumulativeSuccesses,
          highestScore: Math.max(currentProgress.highestScore, newScore),
        }
      };
      progressRef.current = nextProgress;
      setProgress(nextProgress);
      if (newCumulativeSuccesses >= STAR_GOAL) {
        starContext?.addStar(`guitar_${difficulty}`);
      }
      if (newScore >= CLEAR_GOAL) clearContext?.markAsCleared(`guitar_${difficulty}`);
      setGradedNote({ note, correct: true });
      setFeedback(FEEDBACK.correct);
      timerRefs.current.push(setTimeout(playNextQuestion, NEXT_QUESTION_DELAY_MS));
    } else {
      applyScore(Math.max(0, scoreRef.current - 1));
      setGradedNote({ note, correct: false });
      setFeedback(FEEDBACK.wrong);
      // 프렛 onPressIn. 렌더가 아니다.
      // eslint-disable-next-line react-hooks/purity -- 오답 후 출제 시각
      questionStartTimeRef.current = Date.now();
    }
  }, [
    isTraining, currentNote, repeatCount, difficulty,
    applyScore, playNextQuestion, starContext, clearContext, burstConfetti,
  ]);

  const { usableWidth, usableHeight, safeAreaFrameStyle } = useInstrumentMetrics();
  const fit = getGuitarFit(usableWidth, usableHeight);
  const visibleNoteSet = getVisibleNoteSet(difficulty);
  const currentProgress = progress[difficulty] || { cumulativeSuccesses: 0, highestScore: 0 };
  const ringTotal = isTraining ? STAR_GOAL : CLEAR_GOAL;
  const ringCurrent = isTraining
    ? Math.min(currentProgress.cumulativeSuccesses || 0, STAR_GOAL)
    : Math.min(currentProgress.highestScore || 0, CLEAR_GOAL);
  const feedbackColor =
    feedback === FEEDBACK.correct ? colors.accent
      : feedback === FEEDBACK.wrong ? colors.dangerText
        : feedback === FEEDBACK.start ? colors.info
          : colors.textMuted;

  /**
   * 인레이 점의 가로 위치 (항목 6).
   *
   * 한 줄의 가로 구성: [라벨 labelWidth] labelGap [개방현] gap [너트] gap [1프렛] gap [2프렛] gap [3프렛]
   * → 유연 칸 4개 + 너트 1개 + 간격 4개. 칸 폭은 남는 폭을 4등분한 값이다.
   * `left`는 `fretboardArea`의 테두리 상자 기준이라 `padH`를 더해 시작한다.
   */
  const fretAreaWidth = usableWidth - fit.padH * 2 - fit.labelWidth - fit.labelGap;
  const fretCellWidth = (fretAreaWidth - fit.nutWidth - fit.cellGap * 4) / 4;
  const inlayLeft =
    fit.padH + fit.labelWidth + fit.labelGap
    + inlay.fret * fretCellWidth + fit.nutWidth + (inlay.fret + 1) * fit.cellGap
    + fretCellWidth / 2 - fit.inlaySize / 2;

  if (!isReady) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.cellText} />
      </View>
    );
  }

  return (
    <SafeAreaView edges={[]} style={styles.fullScreen}>
      <View style={[styles.midgroundLayer, safeAreaFrameStyle]} pointerEvents="box-none">
        <View style={[
          styles.fretboardArea,
          {
            paddingTop: fit.padTop,
            paddingHorizontal: fit.padH,
            paddingBottom: fit.padBottom,
            rowGap: fit.rowGap,
          },
        ]}>
          {/*
            인레이 점 — 3프렛 칸 중앙, 3번줄과 4번줄 사이 높이에 한 개.
            줄이 6개라 그 경계는 프렛보드의 세로 중앙이다.
            **첫 자식**이라 프렛 칸 뒤에 깔린다.
          */}
          {fretCellWidth > 0 && (
            <View
              pointerEvents="none"
              style={[
                styles.inlay,
                {
                  left: Math.max(0, inlayLeft),
                  width: fit.inlaySize,
                  height: fit.inlaySize,
                  borderRadius: fit.inlaySize / 2,
                  marginTop: -fit.inlaySize / 2,
                },
              ]}
            />
          )}

          {GUITAR_STRINGS.map((str, idx) => (
            <GuitarStringRow
              key={str.name}
              str={str}
              index={idx}
              fit={fit}
              visibleNoteSet={visibleNoteSet}
              gradedNote={gradedNote}
              onNotePress={handleNotePress}
            />
          ))}
        </View>

        <View style={[
          styles.controlBar,
          {
            height: fit.barHeight,
            paddingHorizontal: fit.barPadH,
            gap: fit.barGap,
          },
        ]}>
          <LandscapeBackButton
            color={colors.exitIcon}
            style={[styles.exitButton, { width: fit.touch, height: fit.touch }]}
            onBack={onBack}
          />

          <View style={[styles.scoreBlock, { width: fit.scoreBlockWidth }]}>
            <Text style={[styles.scoreText, { fontSize: fit.score }]}>점수 {score}</Text>
            <Text style={[styles.feedbackText, { color: feedbackColor, fontSize: fit.feedback }]} numberOfLines={2}>
              {feedback}
            </Text>
          </View>

          {isTraining ? (
            <View style={[
              styles.lockedStage,
              { width: fit.lockedStageWidth, height: fit.touch },
            ]}>
              <Ionicons name="lock-closed" size={fit.lockIcon} color={colors.textMuted} />
              <Text style={[styles.lockedStageText, { fontSize: fit.chip }]}>{difficulty}</Text>
            </View>
          ) : (
            <View style={[
              styles.chipGroup,
              { padding: fit.chipGroupPadding, gap: fit.chipGroupGap },
            ]}>
              {GUITAR_LEVELS.map(({ name, label }) => {
                const selected = difficulty === name;
                return (
                  <Pressable
                    key={name}
                    onPress={() => setDifficulty(name)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={label}
                    style={[
                      styles.chip,
                      { width: fit.chipWidth, height: fit.touch },
                      selected && styles.chipSelected,
                    ]}
                  >
                    <Text style={[styles.chipText, { fontSize: fit.chip }, selected && styles.chipTextSelected]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={styles.spacer} />

          <MissionProgressIcon
            gameId="guitar"
            title="기타 미션"
            missionText="난이도별 누적 3회 성공"
            clearText="최고 점수 5점 달성"
            levelNames={GUITAR_LEVELS.map(({ name }) => name)}
            progressItems={GUITAR_LEVELS.map(({ name: d }) => ({
              // 모달의 링이 누적 횟수를 각도로 그린다 — 문자열이 아니라 숫자를 그대로 넘긴다
              name: d,
              count: progress[d]?.cumulativeSuccesses || 0,
              best: progress[d]?.highestScore || 0,
              star: !!starContext?.starData[`guitar_${d}`],
              cleared: !!clearContext?.clearData[`guitar_${d}`],
            }))}
            onReset={handleResetProgress}
            renderTrigger={({ onPress }) => (
              <GuitarMissionRing
                current={ringCurrent}
                total={ringTotal}
                size={fit.touch}
                radius={fit.missionRingRadius}
                strokeWidth={fit.missionRingWidth}
                fontSize={fit.ring}
                onPress={onPress}
              />
            )}
          />

          <View style={[styles.actionArea, { gap: fit.actionGap }]}>
            {isTraining ? (
              <>
                <Pressable
                  onPress={() => {
                    if (!currentNote) return;
                    setRepeatCount(r => r + 1);
                    playSound(currentNote);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="다시 듣기"
                  style={[
                    styles.replayButton,
                    { height: fit.touch, paddingHorizontal: fit.actionPadH },
                  ]}
                >
                  <Text style={[styles.replayText, { fontSize: fit.action }]}>다시 듣기</Text>
                </Pressable>
                <Pressable
                  onPress={stopTraining}
                  accessibilityRole="button"
                  accessibilityLabel="훈련 종료"
                  style={[
                    styles.stopButton,
                    { height: fit.touch, paddingHorizontal: fit.actionPadH },
                  ]}
                >
                  <Text style={[styles.stopText, { fontSize: fit.action }]}>훈련 종료</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={startTraining}
                accessibilityRole="button"
                accessibilityLabel="훈련 모드"
                style={[
                  styles.startButton,
                  { height: fit.touch, paddingHorizontal: fit.primaryPadH },
                ]}
              >
                <Text style={[styles.startText, { fontSize: fit.primary }]}>훈련 모드</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* 정답 콘페티 — 가장 위, 손가락은 통과시킨다 */}
      {confettiOverlay}
    </SafeAreaView>
  );
}

function GuitarMissionRing({
  current,
  total,
  size,
  radius,
  strokeWidth,
  fontSize,
  onPress,
}: {
  current: number;
  total: number;
  size: number;
  radius: number;
  strokeWidth: number;
  fontSize: number;
  onPress: () => void;
}) {
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = total <= 0 ? 0 : Math.min(1, current / total);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`미션 ${current}/${total}`}
      style={[styles.missionRing, { width: size, height: size }]}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.ringTrack}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.info}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - ratio)}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <Text style={[styles.missionRingText, { fontSize }]}>{current}/{total}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: colors.screenBg, flexDirection: 'column' },
  loadingScreen: { flex: 1, backgroundColor: colors.screenBg, justifyContent: 'center', alignItems: 'center' },
  midgroundLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'column',
    zIndex: 2,
  },

  fretboardArea: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.boardBorder,
  },
  inlay: {
    position: 'absolute',
    top: '50%',
    backgroundColor: colors.inlay,
    zIndex: 0,
  },
  stringRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stringName: {
    color: colors.textLabel,
    fontWeight: '700',
    textAlign: 'right',
  },
  fretArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  stringLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    zIndex: 0,
  },
  nut: {
    borderRadius: 1,
    backgroundColor: colors.nut,
    zIndex: 1,
  },
  fretCell: {
    flex: 1,
    borderRadius: 4,
    backgroundColor: colors.cellBg,
    borderWidth: 1,
    borderColor: colors.cellBorder,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  fretCellInactive: {
    opacity: opacity.inactiveCell,
  },
  fretText: {
    color: colors.cellText,
    fontWeight: '700',
  },

  controlBar: {
    backgroundColor: colors.barBg,
    borderTopWidth: 1,
    borderTopColor: colors.barBorder,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
    elevation: 20,
  },
  exitButton: {
    borderRadius: 8,
    backgroundColor: colors.exitBg,
    borderWidth: 1,
    borderColor: colors.exitBorder,
  },
  scoreBlock: {
    justifyContent: 'center',
    flexShrink: 1,
    gap: 3,
  },
  scoreText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  feedbackText: {
    fontWeight: '700',
  },
  chipGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.chipGroupBg,
    borderWidth: 1,
    borderColor: colors.chipGroupBorder,
    borderRadius: 9,
    flexShrink: 1,
  },
  chip: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.info,
  },
  chipText: {
    color: colors.textMuted,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: colors.infoOn,
  },
  lockedStage: {
    borderRadius: 9,
    backgroundColor: colors.chipGroupBg,
    borderWidth: 1,
    borderColor: colors.chipGroupBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    flexShrink: 1,
  },
  lockedStageText: {
    color: colors.textMuted,
    fontWeight: '700',
    flexShrink: 1,
  },
  spacer: {
    flex: 1,
    minWidth: 0,
  },
  missionRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionRingText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  actionArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  startButton: {
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startText: {
    color: colors.accentOn,
    fontWeight: '700',
  },
  replayButton: {
    borderRadius: 8,
    backgroundColor: colors.info,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replayText: {
    color: colors.infoOn,
    fontWeight: '700',
  },
  stopButton: {
    borderRadius: 8,
    backgroundColor: colors.exitBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopText: {
    color: colors.dangerText,
    fontWeight: '700',
  },
});
