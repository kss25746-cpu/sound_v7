"use no memo";

// A는 React Compiler가 켜져 있고(app.json experiments.reactCompiler) B는 아니었다.
// 이 파일은 렌더 중 ref 읽기 등 컴파일러가 가정하는 규칙을 어긴다. 그대로 컴파일하면
// 잘못 메모이즈될 수 있어 **명시적으로 옵트아웃한다.** 규칙을 맞춰 고치면 이 줄을 지운다.

import { Ionicons } from "@expo/vector-icons";
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, FlatList, TouchableWithoutFeedback, Dimensions, Image, Modal, Animated as RNAnimated, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from 'expo-router';
import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DrumGameOverScreen from './DrumGameOverScreen';
import InteractiveDrumSet, { type InteractiveDrumSetRef } from '../components/game/InteractiveDrumSet';
import { InstrumentType, DRUM_INSTRUMENTS } from '../constants/drumSounds';
import { LAYOUT } from '../constants/layout';
import * as drum from '../constants/drumLayout';
import { useAudioManager } from "@/audio/audio-manager";
import { useOutputKeepAlive } from "@/hooks/use-output-keep-alive";
import { useGameLogic } from '../hooks/useDrumLogic';
import * as Haptics from 'expo-haptics';
import { colors, fontSize, opacity } from '../constants/drumTheme';
import Svg, { Circle, G, Path } from 'react-native-svg';

const DRUM_BACKGROUND_IMAGE = require('@/assets/chongyeon/images/drum_m.webp');
const DRUM_BACKGROUND_ASSET = Image.resolveAssetSource(DRUM_BACKGROUND_IMAGE);
const DRUM_BACKGROUND_ASPECT_RATIO = DRUM_BACKGROUND_ASSET.width / DRUM_BACKGROUND_ASSET.height;

// 설정 드롭다운: 문제 수 옵션 (세그먼티드 컨트롤의 칸 = 이 배열의 원소)
const QUESTION_COUNTS = [5, 10, 15, 20] as const;
/** 하단 왼쪽 버튼에 scale 펄스를 주기 위한 애니메이션 래핑 (절대 위치 스타일 유지) */
const AnimatedTouchable = RNAnimated.createAnimatedComponent(TouchableOpacity);

interface DrumStickIconProps {
  /** bead(스틱 끝 알)가 향하는 쪽 = 이동 방향 */
  readonly direction: 'left' | 'right';
  readonly color?: string;
  readonly opacity?: number;
}

/**
 * 하단 이동 버튼용 드럼 스틱 아이콘 (버트 - 몸통 - bead).
 * path는 가로로 눕힌 한 벌만 두고, 45° 기울임 + 좌우 반전을 회전각으로 처리한다.
 * (오른쪽 = 우상향 -45°, 왼쪽 = 좌상향 225° → 두 각이 세로축 기준 대칭)
 * 회전 중심(16,16)에서 가장 먼 점이 15 이내라 32 뷰박스 안에서 잘리지 않음.
 */
function DrumStickIcon({ direction, color = colors.drumStickIcon, opacity = 1 }: DrumStickIconProps) {
  return (
    <Svg width={drum.drumStick.iconSize} height={drum.drumStick.iconSize} viewBox="0 0 32 32">
      <G
        transform={`rotate(${direction === 'left' ? 225 : -45}, 16, 16)`}
        fill={color}
        opacity={opacity}
      >
        {/* 손에 쥐는 버트 쪽 둥근 끝 */}
        <Circle cx="3.6" cy="16" r="2.6" />
        {/* 몸통: 버트(굵음) → 넥(가늘어짐) */}
        <Path d="M3.6 13.4 L23.4 14.7 L23.4 17.3 L3.6 18.6 Z" />
        {/* 타격면 bead */}
        <Circle cx="25.8" cy="16" r="4" />
      </G>
    </Svg>
  );
}

type DrumScreenProps = {
  onBack: () => void;
};

export function DrumScreen({ onBack }: DrumScreenProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  /** 좁은 폰에서는 헤더 「⚙ N문제」를 「⚙ N」으로 줄인다 (drumLayout.ts 2절) */
  const isNarrowHeader = windowWidth < drum.header.narrowWidth;
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [backgroundViewport, setBackgroundViewport] = useState({ width: 0, height: 0 });

  const audioManager = useAudioManager();
  const headerFlashAnim = useRef(new RNAnimated.Value(0)).current;

  // 상태 관리
  const [questionCount, setQuestionCount] = useState<typeof QUESTION_COUNTS[number]>(5); // 문제 수 (5, 10, 15, 20)
  const [isGameOver, setIsGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalMaxScore, setFinalMaxScore] = useState(0);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isSoundTestExpanded, setIsSoundTestExpanded] = useState(true); // 사운드 테스트 아코디언 상태 - 초기 열림
  const [isGameAudioPlaying, setIsGameAudioPlaying] = useState(false); // 게임 오디오 재생 상태
  const [isGameMode, setIsGameMode] = useState(false); // 레거시 (HorizontalDrumScroller에 isQuizActive 전달로 대체)

  const [isQuizActive, setIsQuizActive] = useState(false); // 통합 퀴즈 모드 활성화
  const [countdown, setCountdown] = useState<number | null>(null); // 퀴즈 시작 카운트다운 (3,2,1,0)
  /** 퀴즈 시작 시 고정된 페이지 인덱스. 게임 중 스크롤 시 이와 다르면 강제 종료 */
  const [quizStartScrollIndex, setQuizStartScrollIndex] = useState<number | null>(null);

  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false); // 톱니 탭 시 헤더 바로 아래 패널 열림
  /** 헤더 실측 높이(상단 인셋 포함). 설정 드롭다운을 헤더 바로 아래에 붙이는 기준 */
  const [headerHeight, setHeaderHeight] = useState(0);

  // 드럼 오버레이(캐릭터+순환 버튼)를 ScrollView 밖에서 고정 표시용
  const drumScrollXRef = useRef(new RNAnimated.Value(0));
  const [drumContainerWidth, setDrumContainerWidth] = useState(windowWidth);
  const [currentDrumScrollIndex, setCurrentDrumScrollIndex] = useState(0);
  const horizontalDrumScrollerRef = useRef<HorizontalDrumScrollerRef>(null);
  const isStartingQuizRef = useRef(false);
  /**
   * 악기명 레이블용. 페이지(2~5악기)마다 드럼 세트가 따로 있고 각자 선택 악기를 들고 있어서,
   * 하나로 합치면 페이지를 넘겨도 이전 페이지에서 고른 이름이 그대로 남는다.
   * 페이지별로 담고 현재 보이는 페이지 것만 그린다. null = 아직 아무 악기도 안 고름.
   */
  const [instrumentByPage, setInstrumentByPage] = useState<(InstrumentType | null)[]>(
    () => Array<InstrumentType | null>(ANIMATED_FLATLIST_PAGES).fill(null)
  );
  /** 현재 보이는 페이지 = 악기 수 (설정에서 제거, 화면이 곧 선택) */
  const instrumentCount = currentDrumScrollIndex + 2;
  /** 지금 보이는 페이지에서 고른 악기. 다른 페이지 선택은 이 화면에 뜨지 않는다 */
  const labelInstrument = instrumentByPage[currentDrumScrollIndex] ?? null;
  /**
   * 레이블과 헤더 사이 간격. 고정 px로 두면 작은 폰에서 답답하고 태블릿에서 붕 뜬다.
   * 화면 높이에 비례시키되 양 끝을 묶어 극단으로 가지 않게 한다.
   */
  const instrumentLabelGap = Math.min(24, Math.max(8, Math.round(windowHeight * 0.02)));
  /**
   * 레이블 칩의 실측 높이. 레이블을 제 높이만큼 더 내리라는 요구라, 내리는 양이 곧 이 값이다.
   * 고정 50으로 두지 않는 이유는 기기 글꼴 배율이 크면 칩이 minHeight보다 커지기 때문이다.
   * 초기값을 minHeight와 맞춰 두어 실측 전 첫 프레임에서도 자리가 튀지 않는다.
   */
  // `as const` 토큰은 넓혀지지 않는 리터럴 타입(50)이라 useState가 그대로 굳는다.
  // 실측값을 담아야 하므로 number로 명시한다 (예전 지역 const는 자동으로 넓혀졌다).
  const [instrumentLabelHeight, setInstrumentLabelHeight] = useState<number>(drum.instrumentLabel.minHeight);
  const viewportAspectRatio = backgroundViewport.width > 0 && backgroundViewport.height > 0
    ? backgroundViewport.width / backgroundViewport.height
    : 0;
  const renderedBackgroundHeight = viewportAspectRatio > 0
    ? (viewportAspectRatio > DRUM_BACKGROUND_ASPECT_RATIO
      ? backgroundViewport.height
      : backgroundViewport.width / DRUM_BACKGROUND_ASPECT_RATIO)
    : 0;
  const backgroundBottomGap = Math.max(0, (backgroundViewport.height - renderedBackgroundHeight) / 2);
  const fixedButtonBottomOffset = Math.max(-70, Math.round((backgroundBottomGap - drum.fixedButton.height) / 2) - 45);

  // 설정 변경 콜백 (세그먼트 터치 시 호출, Haptic 포함)
  const handleQuestionCountChange = useCallback((value: typeof QUESTION_COUNTS[number]) => {
    Haptics.selectionAsync?.();
    setQuestionCount(value);
  }, []);

  // audioManager를 ref에 넣어 useFocusEffect 의존성 제거 → 클린업은 탭 포커스 잃을 때만 1회 실행
  const audioManagerRef = useRef(audioManager);
  audioManagerRef.current = audioManager;

  // 화면에 머무는 동안 오디오 출력 경로를 깨어 있게 붙잡아 둔다. 이어폰 출력은 소리가 몇 초 끊기면
  // 절전으로 내려가 다음 소리 앞부분을 먹는다 — 0.5초짜리 드럼 샘플은 통째로 사라진다.
  // 아래 예열보다 **먼저** 켜져야 하므로 이 화면의 다른 useFocusEffect보다 위에 둔다.
  // (docs/이어폰-앞부분잘림_2026-10-15.md)
  useOutputKeepAlive();

  useFocusEffect(
    React.useCallback(() => {
      // 탭에 들어올 때 (포커스 얻음)
      audioManagerRef.current?.setCurrentTab('drum');
      // 첫 타격 지연 제거: 드럼 샘플 5개(≈540KB)를 미리 로드하고 플레이어별 AudioTrack을 예열한다.
      audioManagerRef.current?.preloadSounds(
        Object.entries(DRUM_INSTRUMENTS).map(([key, instrument]) => ({
          key,
          source: instrument.sound,
        }))
      );

      return () => {
        // 탭을 떠날 때 (포커스 잃음) - 게임 상태 정리
        // 소리를 끊는 이상 퀴즈는 이어질 수 없다. 예약된 다음 라운드·카운트다운까지 함께 끊지
        // 않으면 떠난 탭에서 라운드가 혼자 넘어가고, 돌아왔을 때 답을 못 내는 상태로 굳는다.
        exitQuizRef.current();
        setIsGameStarted(false);
        setIsGameOver(false);
        setFinalScore(0);
        setFinalMaxScore(0);
        setIsGameAudioPlaying(false);
        // 울리던 드럼 소리를 끊는다. 플레이어 5개는 그대로 남아 재진입 시 즉시 반응한다
        audioManagerRef.current?.stopAllSounds();
      };
    }, [])
  );



  const toggleSettingsPanel = () => setIsSettingsExpanded((v) => !v);
  const closeSettingsOnOutsideTouch = () => { if (isSettingsExpanded) setIsSettingsExpanded(false); };

  // 드럼 스크롤 시 인덱스 반영
  const handleDrumScrollIndexChange = useCallback((index: number) => {
    setCurrentDrumScrollIndex(index);
  }, []);

  // 각 페이지의 선택 악기를 받아 그 페이지 자리에만 담는다 (레이블 표시용)
  const handleInstrumentChange = useCallback((instrument: InstrumentType | null, pageIndex: number) => {
    setInstrumentByPage((prev) => {
      if (prev[pageIndex] === instrument) return prev; // 같은 값이면 리렌더 없이 통과
      const next = [...prev];
      next[pageIndex] = instrument;
      return next;
    });
  }, []);



  // 게임 완료
  const handleGameComplete = (score: number, maxScore: number) => {
    console.log('🏁 게임 완료 콜백 호출됨!');
    console.log('🏁 게임 완료 - 설정 적용 결과:', {
      score,
      maxScore,
      finalQuestionCount: questionCount,
      finalInstrumentCount: instrumentCount
    });
    console.log('🏁 isGameOver를 true로 설정');
    setFinalScore(score);
    setFinalMaxScore(maxScore);
    setIsGameOver(true);
    console.log('🎯 게임 완료 - isGameStarted: false');
    setIsGameStarted(false);
    // 게임 오버 오버레이가 전체 화면에 표시되므로 스크롤 불필요
  };

  // 통합 퀴즈용 게임 로직 (오버레이 UI에서 사용)
  const gameLogic = useGameLogic({
    questionCount,
    instrumentCount,
    onGameComplete: handleGameComplete,
  });
  const {
    currentInstrument,
    gameState,
    score,
    round,
    answerHistory,
    showFeedback,
    feedbackMessage,
    maxRounds,
    startNewRound,
    handleAnswer,
    resetGame,
    startPlaying,
    stopPendingRounds,
  } = gameLogic;

  // 게임 중 사용자가 다른 페이지로 스크롤 시 퀴즈 강제 종료 → 사운드 체크 모드로 복귀
  const quizScrollLockRef = useRef(false);

  /**
   * 진행 중인 카운트다운을 무효화하는 표. 시작할 때마다 하나 올리고, 기다림이 끝날 때
   * 번호가 그대로인지 본다 — 다르면 그 사이에 그만둔 것이므로 아무것도 하지 않는다.
   *
   * `await`는 취소되지 않는다. 표가 없으면 「그만하기」를 눌러도 남은 카운트다운이 끝까지 돌아
   * **접은 퀴즈가 `playing`으로 들어간다.**
   */
  const quizRunIdRef = useRef(0);
  /** 카운트다운 대기 타이머. 끊을 때 `clearTimeout`과 함께 `resolve`도 해서 대기를 깨운다 */
  const quizWaitersRef = useRef<Map<ReturnType<typeof setTimeout>, () => void>>(new Map());
  const cancelQuizWaits = useCallback(() => {
    quizWaitersRef.current.forEach((resolve, id) => {
      clearTimeout(id);
      resolve();
    });
    quizWaitersRef.current.clear();
  }, []);
  const waitInQuiz = useCallback((delayMs: number) => new Promise<void>((resolve) => {
    const id = setTimeout(() => {
      quizWaitersRef.current.delete(id);
      resolve();
    }, delayMs);
    quizWaitersRef.current.set(id, resolve);
  }), []);

  /**
   * 퀴즈를 접는 유일한 통로 — 「그만하기」·「나가기」·페이지 이탈·탭 이탈이 다 여기로 온다.
   * 한 군데라도 빼먹으면 그 길로 나갔을 때만 타이머가 살아남는다 (세션 49 피아노 재점검 참고).
   */
  const exitQuiz = useCallback(() => {
    quizRunIdRef.current += 1; // 진행 중인 카운트다운 무효화
    cancelQuizWaits();
    stopPendingRounds();
    isStartingQuizRef.current = false;
    quizScrollLockRef.current = false;
    setCountdown(null);
    setIsQuizActive(false);
    setQuizStartScrollIndex(null);
  }, [cancelQuizWaits, stopPendingRounds]);
  /** 탭 포커스 클린업은 의존성이 빈 배열이라(재구독 방지) 최신 함수를 ref로 본다 */
  const exitQuizRef = useRef(exitQuiz);
  exitQuizRef.current = exitQuiz;

  // 퀴즈 시작: 설정된 악기 수 페이지로 전환 → 카운트다운 → 첫 문제 재생
  const handleStartQuiz = useCallback(async () => {
    // 이미 퀴즈 시작 중이면 무시 (연타 방지)
    if (isStartingQuizRef.current) {
      console.log('⚠️ 퀴즈 시작 중 - 중복 호출 무시');
      return;
    }
    isStartingQuizRef.current = true;

    const runId = ++quizRunIdRef.current;
    quizScrollLockRef.current = true;
    setQuizStartScrollIndex(currentDrumScrollIndex);
    setIsQuizActive(true);
    resetGame();
    setIsGameOver(false);
    setFinalScore(0);
    setFinalMaxScore(0);

    /**
     * 캐릭터를 초기 위치로 되돌린다.
     *
     * 연주모드에서 마지막에 친 악기 위에 캐릭터가 앉은 채로 넘어오면, 첫 문제가 마침 그 악기일 때
     * 정답 자리에 이미 서 있는 셈이 된다(마커 초록도 남는다). 라운드 사이에는
     * moveToNeutralPosition이 비켜 주는데 진입 첫 문제에만 그 처리가 없었다.
     * 카운트다운 동안 돌아가므로 첫 문제가 나갈 때는 이미 제자리다.
     */
    horizontalDrumScrollerRef.current?.resetCharacterToInitial();

    // 헤더 배경 플래시 애니메이션
    RNAnimated.sequence([
      RNAnimated.timing(headerFlashAnim, { toValue: 1, duration: drum.motion.headerFlashDurationMs, useNativeDriver: false }),
      RNAnimated.timing(headerFlashAnim, { toValue: 0, duration: drum.motion.headerFlashDurationMs, useNativeDriver: false }),
    ]).start();

    void waitInQuiz(drum.motion.quizScrollUnlockMs).then(() => {
      if (quizRunIdRef.current === runId) quizScrollLockRef.current = false;
    });
    for (let i = 2; i > 0; i--) {
      setCountdown(i);
      await waitInQuiz(drum.motion.countdownStepMs);
      if (quizRunIdRef.current !== runId) return; // 그 사이에 그만뒀다
    }
    setCountdown(0);
    await waitInQuiz(drum.motion.countdownEndMs);
    if (quizRunIdRef.current !== runId) return;
    setCountdown(null);
    startPlaying();
    isStartingQuizRef.current = false;
  }, [currentDrumScrollIndex, resetGame, startPlaying, waitInQuiz]);

  useEffect(() => {
    if (!isQuizActive || quizStartScrollIndex === null) return;
    if (quizScrollLockRef.current) return; // 시작 직후 자동 스크롤은 무시
    if (currentDrumScrollIndex !== quizStartScrollIndex) {
      exitQuiz();
    }
  }, [isQuizActive, quizStartScrollIndex, currentDrumScrollIndex, exitQuiz]);

  // 문제 출제 시 소리만 재생 (힌트 없이)
  useEffect(() => {
    if (isQuizActive && gameState === 'playing' && currentInstrument) {
      audioManager.playSound(currentInstrument, DRUM_INSTRUMENTS[currentInstrument].sound);
    }
  }, [isQuizActive, gameState, currentInstrument]);

  /** 퀴즈모드 ↻(다시 듣기) 활성 조건. 라운드마다 켜졌다 꺼지므로 회색 처리만 하고 버튼은 계속 렌더 */
  const isReplayEnabled = isQuizActive && gameState === 'playing' && !showFeedback && !!currentInstrument;

  /** ↻ 눌림 피드백용 스케일 펄스. 정답 악기를 하이라이트하면 답이 노출되므로 버튼 자체만 반응 */
  const replayPulseAnim = useRef(new RNAnimated.Value(1)).current;
  const pulseReplayButton = useCallback(() => {
    replayPulseAnim.setValue(1);
    RNAnimated.sequence([
      RNAnimated.timing(replayPulseAnim, { toValue: drum.motion.replayPulseScale, duration: drum.motion.replayPulseUpMs, useNativeDriver: true }),
      RNAnimated.timing(replayPulseAnim, { toValue: 1, duration: drum.motion.replayPulseDownMs, useNativeDriver: true }),
    ]).start();
  }, [replayPulseAnim]);

  // 피드백 전 마지막 선택 악기 저장용
  const lastAnsweredInstrumentRef = useRef<InstrumentType | null>(null);

  // 피드백이 끝난 후 캐릭터를 중립 위치로 이동 (다음 문제 준비)
  const prevShowFeedbackRef = useRef(showFeedback);
  useEffect(() => {
    // showFeedback이 true → false로 바뀔 때 (피드백 종료)
    if (prevShowFeedbackRef.current && !showFeedback && isQuizActive && lastAnsweredInstrumentRef.current) {
      console.log('🎯 피드백 종료 - 캐릭터 중립 위치로 이동:', lastAnsweredInstrumentRef.current);
      horizontalDrumScrollerRef.current?.moveToNeutralPosition(lastAnsweredInstrumentRef.current);
    }
    prevShowFeedbackRef.current = showFeedback;
  }, [showFeedback, isQuizActive]);


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* 전체 화면 배경: contain으로 한 영역 안에 맞춤 */}
        <View
          style={[StyleSheet.absoluteFill, styles.backgroundImageWrapper]}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setBackgroundViewport({ width, height });
          }}
        >
          <Image
            source={DRUM_BACKGROUND_IMAGE}
            style={{ width: windowWidth, height: windowHeight }}
            resizeMode="contain"
          />
        </View>
        {/* 콘텐츠: 상단 인셋은 헤더가 직접 흡수(헤더 배경이 상태바 뒤까지 이어짐) + 하단 탭 공간 확보 */}
        <View
          style={[
            styles.contentWrapper,
            { paddingBottom: insets.bottom },
          ]}
        >
          {/* 고정 헤더: ← 제목 ······ 버튼들 (안드로이드 상단바 구조, drumLayout.ts 1·4절) */}
          <RNAnimated.View
            onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
            style={[
        styles.fixedHeader,
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: drum.header.paddingH,
          paddingTop: insets.top + drum.header.paddingTopOffset,
          paddingBottom: drum.header.paddingBottom,
          // 불투명(알파 1) 유지 필수 — 근거는 drumTheme.ts의 colors.headerFlash 주석
          backgroundColor: headerFlashAnim.interpolate({
            inputRange: [0, 1, 2],
            outputRange: [...colors.headerFlash]
          })
        }
      ]}>
            <TouchableOpacity
              onPress={onBack}
              style={styles.headerBackButton}
              hitSlop={drum.header.backHitSlop}
              activeOpacity={opacity.headerPressed}
              accessibilityRole="button"
              accessibilityLabel="나가기"
            >
              <Ionicons name="arrow-back" size={drum.header.backIconSize} color={colors.headerBackIcon} />
            </TouchableOpacity>

            {/* 모드 이름은 판·테두리 없이 글자색으로만 — 누를 수 없는 것이 버튼처럼 보이지 않게 */}
            <Text style={styles.headerTitle} numberOfLines={1}>
              <Text style={isQuizActive ? styles.headerTitleQuiz : styles.headerTitlePlay}>
                {isQuizActive ? '퀴즈모드' : '연주모드'}
              </Text>
              {isQuizActive && ` · ${round}/${questionCount} 회`}
            </Text>

            {!isQuizActive ? (
              <>
                <TouchableOpacity
                  onPress={toggleSettingsPanel}
                  style={[styles.headerButton, styles.headerButtonSecondary]}
                  activeOpacity={opacity.headerPressed}
                  accessibilityRole="button"
                  accessibilityLabel={`문제 수 설정, ${questionCount}문제`}
                >
                  <Ionicons name="settings-outline" size={drum.header.buttonIconSize} color={colors.headerSecondaryText} />
                  <Text style={[styles.headerButtonText, styles.headerButtonTextSecondary]}>
                    {isNarrowHeader ? questionCount : `${questionCount}문제`}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleStartQuiz}
                  style={[styles.headerButton, styles.headerButtonPrimary]}
                  activeOpacity={opacity.headerPressed}
                  accessibilityRole="button"
                >
                  <Ionicons name="ear-outline" size={drum.header.buttonIconSize} color={colors.headerPrimaryText} />
                  <Text style={[styles.headerButtonText, styles.headerButtonTextPrimary]}>듣기연습</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  RNAnimated.sequence([
                    RNAnimated.timing(headerFlashAnim, { toValue: 2, duration: drum.motion.headerFlashDurationMs, useNativeDriver: false }),
                    RNAnimated.timing(headerFlashAnim, { toValue: 0, duration: drum.motion.headerFlashDurationMs, useNativeDriver: false }),
                  ]).start();
                  exitQuiz();
                }}
                style={[styles.headerButton, styles.headerButtonSecondary]}
                activeOpacity={opacity.headerPressed}
                accessibilityRole="button"
              >
                <Ionicons name="close" size={drum.header.buttonIconSize} color={colors.headerSecondaryText} />
                <Text style={[styles.headerButtonText, styles.headerButtonTextSecondary]}>그만하기</Text>
              </TouchableOpacity>
            )}
          </RNAnimated.View>

          {/* 설정 패널: 톱니 탭 시 헤더 바로 아래 열림, 바깥 터치로 닫기 */}
          {!isQuizActive && isSettingsExpanded && (
            <>
              <View style={[styles.settingsDropdownPanel, { top: headerHeight }]}>
                <QuestionCountSelector value={questionCount} onChange={handleQuestionCountChange} />
              </View>
              <TouchableWithoutFeedback onPress={closeSettingsOnOutsideTouch}>
                <View style={[styles.settingsDropdownBackdrop, { top: headerHeight + drum.segmented.panelHeight }]} />
              </TouchableWithoutFeedback>
            </>
          )}

          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollContainer}
            contentContainerStyle={[styles.scrollContent, { flex: 1, justifyContent: 'center' }]}
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
          >
            {/* 드럼 세트 (연주 + 퀴즈 시 정답 제출) */}
            <View style={[styles.section, styles.sectionDrum]}>
              <View>
                <HorizontalDrumScroller
                  ref={horizontalDrumScrollerRef}
                  scrollX={drumScrollXRef}
                  onContainerLayout={setDrumContainerWidth}
                  onScrollIndexChange={handleDrumScrollIndexChange}
                  onInstrumentPlay={() => {}}
                  onInstrumentChange={handleInstrumentChange}
                  isGameAudioPlaying={isQuizActive && gameState === 'playing'}
                  isGameMode={isQuizActive}
                  isQuizWaiting={isQuizActive && gameState === 'playing'}
                  onAnswerSubmit={(instrument) => {
                    lastAnsweredInstrumentRef.current = instrument;
                    handleAnswer(instrument);
                  }}
                  scrollEnabled={!isQuizActive}
                />
              </View>
            </View>
          </ScrollView>

          {/*
            듣기연습 첫 문제 안내. 헤더 바로 아래, 1회째만.
            악기명 레이블은 퀴즈 중 숨기므로 그 자리를 쓴다. 터치는 통과.
          */}
          {isQuizActive && !isGameOver && round === 1 && (
            <View
              style={[
                styles.quizHintFixed,
                { top: headerHeight + instrumentLabelGap },
              ]}
              pointerEvents="none"
              accessibilityLiveRegion="polite"
            >
              <Text style={styles.quizHintText}>들린 악기에 캐릭터를 가져가세요</Text>
            </View>
          )}

          {/*
            현재 악기 레이블 — ScrollView 밖에 둔다. 안에 두면 드럼 세트 위로 올릴 때
            FlatList 셀에 잘려 뒤 배경이 드러난다. 세로 기준은 헤더 실측 높이(상단 인셋 포함).
            거기에 칩 높이를 한 번 더 더해 제 높이만큼 아래로 내린다.
            퀴즈 중에는 정답을 알려주는 셈이라 숨긴다.
          */}
          {!isQuizActive && labelInstrument && (
            <View
              style={[
                styles.instrumentLabelFixed,
                { top: headerHeight + instrumentLabelGap + instrumentLabelHeight },
              ]}
              pointerEvents="none"
            >
              <View
                style={styles.currentInstrumentDisplay}
                onLayout={(event) => {
                  // 같은 값이면 setState를 부르지 않는다 — onLayout → 리렌더 → onLayout 반복을 막는다
                  const measured = Math.round(event.nativeEvent.layout.height);
                  setInstrumentLabelHeight((prev) => (prev === measured ? prev : measured));
                }}
              >
                <Text style={styles.currentInstrumentText}>
                  {DRUM_INSTRUMENTS[labelInstrument].name}
                </Text>
              </View>
            </View>
          )}

          {/* 드럼 캐릭터+순환 버튼 오버레이 (결과창 떠 있을 때는 미표시) */}
          {!(isQuizActive && isGameOver) && (
            <View style={[styles.drumOverlayFixed, { bottom: insets.bottom + fixedButtonBottomOffset }]} pointerEvents="box-none">
              <View
                style={[styles.drumOverlayClip, { width: drumContainerWidth }]}
                pointerEvents="box-none"
              >
                <RNAnimated.View
                  pointerEvents="box-none"
                  style={[
                    styles.fixedDrumOverlayInner,
                    {
                      width: drumContainerWidth * 4,
                      transform: [{
                        translateX: drumScrollXRef.current.interpolate({
                          inputRange: [0, drumContainerWidth * 3],
                          outputRange: [0, -drumContainerWidth * 3],
                        }),
                      }],
                    },
                  ]}
                >
                  {[0, 1, 2, 3].map((pageIndex) => (
                    <View key={pageIndex} style={[styles.drumOverlayPageCell, { width: drumContainerWidth }]}>
                      {/* 왼쪽 버튼: 연습모드 = ◀ 역순 이동 / 퀴즈모드 = ↻ 다시 듣기 */}
                      <AnimatedTouchable
                        style={[
                          styles.fixedReplayButton,
                          isQuizActive && !isReplayEnabled && styles.fixedReplayButtonDisabled,
                          { transform: [{ scale: replayPulseAnim }] }
                        ]}
                        onPress={() => {
                          if (!isQuizActive) {
                            horizontalDrumScrollerRef.current?.moveToPrevInstrumentForCurrentPage();
                          } else if (isReplayEnabled && currentInstrument) {
                            pulseReplayButton();
                            audioManager.playSound(currentInstrument, DRUM_INSTRUMENTS[currentInstrument].sound);
                          }
                        }}
                        activeOpacity={opacity.segmentedPressed}
                        disabled={isQuizActive && !isReplayEnabled}
                      >
                        {isQuizActive ? (
                          <Text
                            style={[styles.fixedReplayButtonText, !isReplayEnabled && styles.fixedReplayButtonTextDisabled]}
                            numberOfLines={1}
                          >
                            ↻
                          </Text>
                        ) : (
                          <DrumStickIcon direction="left" />
                        )}
                      </AnimatedTouchable>
                      {!isQuizActive && (
                        <View style={styles.pageIndicator} pointerEvents="none">
                          <Text style={styles.pageIndicatorText}>
                            {pageIndex + 1}/{ANIMATED_FLATLIST_PAGES}
                          </Text>
                        </View>
                      )}
                      {/* 오른쪽 ▶ 순차 이동: 퀴즈모드에서는 회색 처리 대신 언마운트 */}
                      {!isQuizActive && (
                        <TouchableOpacity
                          style={styles.fixedCycleButton}
                          onPress={() => horizontalDrumScrollerRef.current?.moveToNextInstrumentForCurrentPage()}
                          activeOpacity={opacity.segmentedPressed}
                        >
                          <DrumStickIcon direction="right" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </RNAnimated.View>
              </View>
            </View>
          )}

          {/* 퀴즈 오버레이: 카운트다운 (0일 때는 표시하지 않아 숫자 0이 안 보이게) */}
          {countdown !== null && countdown !== 0 && (
            <View style={[StyleSheet.absoluteFill, styles.quizOverlayCenter, styles.countdownOverlayUp]} pointerEvents="none">
              <Text style={styles.countdownText}>
                {countdown}
              </Text>
            </View>
          )}

          {/* 퀴즈 오버레이: 정답 ⭕ / 오답 ❌ (정답! 포함 시에만 정답, 오답 메시지엔 '정답은'이라 includes('정답')만 쓰면 오답도 정답으로 나감) */}
          {showFeedback && (
            <View style={[StyleSheet.absoluteFill, styles.quizOverlayCenter, styles.countdownOverlayUp]} pointerEvents="none">
              <Text style={[styles.countdownText, feedbackMessage.includes('정답!') ? styles.feedbackCorrect : styles.feedbackWrong]}>
                {feedbackMessage.includes('정답!') ? '⭕' : '❌'}
              </Text>
            </View>
          )}

          {/*
            게임 종료 결과창. 조건부 View + zIndex였을 때는 뒤로가기가 이 창이 아니라
            **탭을 나갔다.** 뒤로가기는 「나가기」와 같은 길로 보낸다 (세션 47 냉장고 완료 ·
            49 피아노 결과와 같은 처방). Modal 안에서는 절대배치가 아니라 flex로 채운다.
          */}
          <Modal
            visible={isQuizActive && isGameOver}
            transparent
            statusBarTranslucent
            animationType="fade"
            onRequestClose={exitQuiz}
          >
            <View style={styles.gameOverOverlay}>
              <DrumGameOverScreen
                score={finalScore}
                maxScore={finalMaxScore}
                onRestart={handleStartQuiz}
                onGoHome={exitQuiz}
              />
            </View>
          </Modal>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    zIndex: drum.zIndex.container,
  },
  backgroundImageWrapper: {
    zIndex: drum.zIndex.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
    zIndex: drum.zIndex.content,
  },
  fixedHeader: {
    backgroundColor: colors.headerBg,
    elevation: drum.header.elevation,
    zIndex: drum.zIndex.header,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: drum.scroll.paddingTop,  // 고정 헤더와의 간격
    paddingBottom: drum.scroll.paddingBottom,
  },

  // 섹션 스타일
  section: {
    marginHorizontal: drum.section.marginH,
    marginVertical: drum.section.marginV,
  },
  /** 사운드 테스트(드럼) 영역 - 중앙 정렬 */
  sectionDrum: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: drum.section.drumMarginTop,
  },
  // ── 헤더. 버튼 등급 셋(주·보조·아이콘)과 색 두 역할은 drumLayout.ts 4절
  headerBackButton: {
    width: drum.header.backButtonSize,
    height: drum.header.backButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** 남는 폭만 쓴다 — 버튼이 먼저 자리를 잡고, 모자라면 제목이 말줄임된다 */
  headerTitle: {
    flex: 1,
    marginLeft: drum.header.titleMarginLeft,
    fontSize: drum.header.titleFontSize,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerTitlePlay: {
    color: colors.headerTitlePlay,
  },
  headerTitleQuiz: {
    color: colors.headerTitleQuiz,
  },
  /** 알약 버튼 공통 — 주·보조가 높이·패딩·간격을 같이 쓴다 */
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: drum.header.buttonHeight,
    paddingHorizontal: drum.header.buttonPaddingH,
    marginLeft: drum.header.buttonGap,
    borderRadius: drum.header.pillRadius,
    gap: drum.header.buttonIconGap,
  },
  headerButtonPrimary: {
    backgroundColor: colors.headerPrimaryBg,
    elevation: drum.header.primaryElevation,
  },
  headerButtonSecondary: {
    backgroundColor: colors.headerSecondaryBg,
    borderWidth: drum.header.buttonBorderWidth,
    borderColor: colors.headerSecondaryBorder,
    elevation: drum.header.secondaryElevation,
  },
  headerButtonText: {
    fontSize: drum.header.buttonFontSize,
    fontWeight: 'bold',
  },
  headerButtonTextPrimary: {
    color: colors.headerPrimaryText,
  },
  headerButtonTextSecondary: {
    color: colors.headerSecondaryText,
  },
  // 횡스크롤 컨테이너
  horizontalScrollContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  /**
   * 악기명 레이블 줄. 헤더 아래 가로 전체를 잡고 가운데 정렬만 한다 —
   * 폭을 고정하고 translateX로 반쯤 밀던 이전 방식과 달리 글자 길이·화면 폭을 안 탄다.
   * zIndex는 설정 드롭다운보다 낮게: 드롭다운이 열리면 그쪽이 위다 (drumLayout.ts 4절).
   */
  instrumentLabelFixed: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: drum.zIndex.instrumentLabel,
  },
  quizHintFixed: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: drum.zIndex.instrumentLabel,
    paddingHorizontal: LAYOUT.spacingMD,
  },
  quizHintText: {
    maxWidth: '100%',
    backgroundColor: colors.quizHintBg,
    color: colors.quizHintText,
    fontSize: drum.quizHint.fontSize,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: LAYOUT.spacingMD,
    paddingVertical: LAYOUT.spacingSM,
    borderRadius: drum.quizHint.borderRadius,
    elevation: drum.quizHint.elevation,
    borderWidth: drum.quizHint.borderWidth,
    borderColor: colors.quizHintBorder,
  },
  currentInstrumentDisplay: {
    minWidth: drum.instrumentLabel.minWidth,
    minHeight: drum.instrumentLabel.minHeight,
    backgroundColor: colors.instrumentLabelBg,
    paddingHorizontal: drum.instrumentLabel.paddingH,
    paddingVertical: drum.instrumentLabel.paddingV,
    borderRadius: drum.instrumentLabel.borderRadius,
    elevation: drum.instrumentLabel.elevation,
    borderWidth: drum.instrumentLabel.borderWidth,
    borderColor: colors.instrumentLabelBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentInstrumentText: {
    color: colors.instrumentLabelText,
    fontSize: fontSize.instrumentLabel,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: drum.instrumentLabel.letterSpacing,
    lineHeight: drum.instrumentLabel.lineHeight,
  },
  /** 드럼 오버레이를 contentWrapper 하단에 고정. zIndex로 탭 바 위에 그리기 */
  drumOverlayFixed: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: drum.overlay.height,
    paddingHorizontal: drum.overlay.paddingH,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: drum.zIndex.drumOverlay,
    elevation: drum.zIndex.drumOverlay,
  },
  /** 한 페이지 너비만 보이도록 클리핑 → 카드당 캐릭터+버튼 1세트만 표시 */
  drumOverlayClip: {
    height: '100%',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  fixedDrumOverlayInner: {
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  /** 4페이지 오버레이에서 페이지당 한 칸 (캐릭터+버튼이 이 안에서 절대 위치) */
  drumOverlayPageCell: {
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  /** 순환 버튼: 가로 긴 직사각형, 반응형 */
  fixedCycleButton: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: drum.fixedButton.cycleMarginLeft,
    width: drum.fixedButton.width,
    height: drum.fixedButton.height,
    backgroundColor: colors.fixedButtonBg,
    borderRadius: drum.fixedButton.radius,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: drum.fixedButton.elevation,
  },
  /** 왼쪽 버튼(연습=◀ / 퀴즈=↻): 순환 버튼과 대칭(좌측), 가로 긴 직사각형, 반응형 */
  fixedReplayButton: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: drum.fixedButton.replayMarginLeft,
    width: drum.fixedButton.width,
    height: drum.fixedButton.height,
    backgroundColor: colors.fixedButtonBg,
    borderRadius: drum.fixedButton.radius,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: drum.fixedButton.replayPaddingH,
    elevation: drum.fixedButton.elevation,
  },
  fixedReplayButtonDisabled: {
    backgroundColor: colors.fixedButtonDisabledBg,
    opacity: opacity.replayDisabled,
    elevation: 0,
  },
  fixedReplayButtonTextDisabled: {
    opacity: opacity.replayTextDisabled,
  },
  fixedReplayButtonText: {
    fontSize: drum.fixedButton.iconFontSize,
    color: colors.fixedButtonText,
    fontWeight: 'bold',
  },
  /** 연주 버튼 사이 페이지 표시. 1/4 = 2악기 화면. 터치는 좌우 버튼으로 통과 */
  pageIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: drum.fixedButton.height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageIndicatorText: {
    fontSize: drum.fixedButton.pageIndicatorFontSize,
    fontWeight: 'bold',
    color: colors.pageIndicatorText,
  },
  fixedCycleButtonText: {
    fontSize: drum.fixedButton.iconFontSize,
    color: colors.fixedButtonText,
    fontWeight: 'bold',
  },

  settingsDropdownPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: drum.zIndex.settingsPanel,
    height: drum.segmented.panelHeight,
    paddingVertical: drum.segmented.panelPaddingV,
    paddingHorizontal: drum.segmented.panelPaddingH,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.settingsPanelBg,
    borderBottomWidth: drum.segmented.panelBorderBottomWidth,
    borderBottomColor: colors.settingsPanelBorder,
    elevation: drum.segmented.panelElevation,
  },
  settingsDropdownBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: drum.zIndex.settingsBackdrop,
    backgroundColor: 'transparent',
  },
  /** 세그먼티드 컨트롤 트랙. 칸 폭은 실측 너비에서 계산되므로 매직넘버 없이 항상 정렬됨 */
  segmentedTrack: {
    width: drum.segmented.trackWidth,
    height: drum.segmented.trackHeight,
    alignSelf: 'center',
    flexDirection: 'row',
    padding: drum.segmented.trackPadding,
    borderRadius: drum.segmented.pillRadius,
    backgroundColor: colors.segmentedTrackBg,
  },
  /** 선택 칸을 따라 미끄러지는 pill. 폭은 실측 후 인라인으로 주입 */
  segmentedIndicator: {
    position: 'absolute',
    top: drum.segmented.trackPadding,
    bottom: drum.segmented.trackPadding,
    left: drum.segmented.trackPadding,
    borderRadius: drum.segmented.pillRadius,
    backgroundColor: colors.segmentedIndicatorBg,
  },
  segmentedItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedItemText: {
    fontSize: drum.segmented.fontSize,
    fontWeight: '700',
    color: colors.segmentedItemText,
  },
  segmentedItemTextSelected: {
    color: colors.segmentedItemTextSelected,
  },

  /** Modal 안이라 절대배치·zIndex가 필요 없다 — 판 전체를 flex로 채운다 */
  gameOverOverlay: {
    flex: 1,
    backgroundColor: colors.gameOverScrim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quizOverlayCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: drum.zIndex.quizOverlay,
  },
  countdownOverlayUp: {
    paddingBottom: drum.quizOverlay.countdownPaddingBottom,
  },
  countdownText: {
    fontSize: fontSize.countdown,
    fontWeight: 'bold',
    color: colors.countdownText,
    textShadowColor: colors.countdownShadow,
    textShadowOffset: drum.quizOverlay.shadowOffset,
    textShadowRadius: drum.quizOverlay.shadowRadius,
  },
  feedbackCorrect: {
    color: colors.feedbackCorrect,
  },
  feedbackWrong: {
    color: colors.feedbackWrong,
  },
});

interface QuestionCountSelectorProps {
  readonly value: typeof QUESTION_COUNTS[number];
  readonly onChange: (value: typeof QUESTION_COUNTS[number]) => void;
}

/**
 * 문제 수 세그먼티드 컨트롤.
 * 칸 폭 = (실측 트랙 폭 - 패딩) / 항목 수 이므로, pill이 그려지는 위치와 터치 영역이
 * 화면 크기·회전과 무관하게 항상 같은 좌표계를 쓴다. (이전 Rive 구현의 정렬 어긋남 원인 제거)
 */
function QuestionCountSelector({ value, onChange }: QuestionCountSelectorProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const segmentWidth = trackWidth > 0
    ? (trackWidth - drum.segmented.trackPadding * 2) / QUESTION_COUNTS.length
    : 0;
  const selectedIndex = Math.max(0, QUESTION_COUNTS.indexOf(value));
  const indicatorX = useRef(new RNAnimated.Value(0)).current;
  /** 첫 실측 때는 애니메이션 없이 즉시 배치. 안 그러면 패널 열 때마다 pill이 왼쪽에서 날아옴 */
  const hasPositionedRef = useRef(false);

  useEffect(() => {
    if (segmentWidth === 0) return;
    const toValue = selectedIndex * segmentWidth;
    if (!hasPositionedRef.current) {
      hasPositionedRef.current = true;
      indicatorX.setValue(toValue);
      return;
    }
    RNAnimated.spring(indicatorX, {
      toValue,
      useNativeDriver: true,
      speed: drum.motion.segmentedSpringSpeed,
      bounciness: drum.motion.segmentedSpringBounciness,
    }).start();
  }, [selectedIndex, segmentWidth, indicatorX]);

  return (
    <View
      style={styles.segmentedTrack}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      accessibilityRole="radiogroup"
    >
      {segmentWidth > 0 && (
        <RNAnimated.View
          pointerEvents="none"
          style={[
            styles.segmentedIndicator,
            { width: segmentWidth, transform: [{ translateX: indicatorX }] },
          ]}
        />
      )}
      {QUESTION_COUNTS.map((count) => (
        <TouchableOpacity
          key={count}
          style={styles.segmentedItem}
          activeOpacity={opacity.segmentedPressed}
          onPress={() => onChange(count)}
          accessibilityRole="radio"
          accessibilityState={{ selected: count === value }}
          accessibilityLabel={`${count}문제`}
        >
          <Text style={[
            styles.segmentedItemText,
            count === value && styles.segmentedItemTextSelected,
          ]}>
            {count}문제
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// 횡스크롤 드럼 섹션 컴포넌트
interface HorizontalDrumScrollerProps {
  readonly onInstrumentPlay: (instrumentName: string) => void;
  /**
   * 페이지마다 InteractiveDrumSet이 따로 있고 각자 선택 악기를 들고 있다.
   * 어느 페이지에서 온 알림인지 함께 넘겨야 부모가 현재 보이는 페이지 것만 그릴 수 있다.
   */
  readonly onInstrumentChange: (instrument: InstrumentType | null, pageIndex: number) => void;
  readonly isGameAudioPlaying: boolean;
  readonly isGameMode: boolean;
  /** 퀴즈 정답 대기 시 true → 악기 터치가 정답 제출로 전달됨 */
  readonly isQuizWaiting?: boolean;
  readonly onAnswerSubmit?: (instrument: InstrumentType) => void;
  /** false면 가로 스크롤 비활성화 (퀴즈 중 고정) */
  readonly scrollEnabled?: boolean;
  /** 부모에서 스크롤 위치 동기화용 (오버레이를 ScrollView 밖에서 그릴 때 사용) */
  readonly scrollX?: React.MutableRefObject<RNAnimated.Value>;
  readonly onContainerLayout?: (width: number) => void;
  readonly onScrollIndexChange?: (index: number) => void;
}

export interface HorizontalDrumScrollerRef {
  moveToNextInstrumentForCurrentPage: () => void;
  /** 현재 페이지에서 악기 순서를 역방향으로 한 칸 이동 */
  moveToPrevInstrumentForCurrentPage: () => void;
  /** 설정된 악기 수 페이지(0~3)로 스크롤 */
  scrollToPage: (index: number) => void;
  /** 현재 페이지의 캐릭터를 중립 위치로 이동 (다음 문제 준비용) */
  moveToNeutralPosition: (instrument: InstrumentType) => void;
  /** 현재 페이지의 캐릭터를 초기 위치로 되돌리고 악기 선택 해제 (퀴즈 진입용) */
  resetCharacterToInitial: () => void;
}

const ANIMATED_FLATLIST_PAGES = 4;
const AnimatedFlatList = RNAnimated.createAnimatedComponent(FlatList);

const HorizontalDrumScroller = React.forwardRef<HorizontalDrumScrollerRef, Readonly<HorizontalDrumScrollerProps>>(
  function HorizontalDrumScroller(
    { onInstrumentPlay, onInstrumentChange, isGameAudioPlaying, isGameMode, isQuizWaiting = false, onAnswerSubmit, scrollEnabled = true, scrollX: scrollXRef, onContainerLayout, onScrollIndexChange },
    ref
  ) {
    const flatListRef = useRef<FlatList>(null);
    const hasScrolled = useRef(false);
    const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width);
    const [currentScrollIndex, setCurrentScrollIndex] = useState(0);
    const drumSetRefs = useRef<(InteractiveDrumSetRef | null)[]>([]);
    const scrollXInternal = useRef(new RNAnimated.Value(0)).current;
    const scrollX = scrollXRef?.current ?? scrollXInternal;

    // 컨테이너의 실제 너비 측정
    const handleContainerLayout = useCallback((event: any) => {
      const { width } = event.nativeEvent.layout;
      console.log('📏 실제 컨테이너 너비:', width);
      setContainerWidth(width);
      onContainerLayout?.(width);
    }, [onContainerLayout]);

    // FlatList 레이아웃 완료 후 스크롤
    const handleFlatListLayout = useCallback(() => {
      if (!hasScrolled.current && flatListRef.current) {
        console.log('📐 FlatList 레이아웃 완료 - 스크롤 시도');
        setTimeout(() => {
          // scrollToOffset으로 정확히 0 위치로 이동
          flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
          hasScrolled.current = true;
          console.log('✅ 초기 스크롤 완료 (offset: 0)');
        }, 50);
      }
    }, []);

    const instrumentSections = [
      { count: 2 },
      { count: 3 },
      { count: 4 },
      { count: 5 }
    ];

    const getItemLayout = (_: any, index: number) => ({
      length: containerWidth,
      offset: containerWidth * index,
      index,
    });

    const onScrollEnd = useCallback((e: any) => {
      const x = e.nativeEvent.contentOffset.x;
      const index = Math.round(x / containerWidth);
      const safeIndex = Math.min(index, instrumentSections.length - 1);
      setCurrentScrollIndex(safeIndex);
      onScrollIndexChange?.(safeIndex);
    }, [containerWidth, instrumentSections.length, onScrollIndexChange]);

    const onScroll = useMemo(
      () =>
        RNAnimated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        ),
      [scrollX]
    );

    const moveToNextInstrumentForCurrentPage = useCallback(() => {
      drumSetRefs.current[currentScrollIndex]?.moveToNextInstrument();
    }, [currentScrollIndex]);

    const moveToPrevInstrumentForCurrentPage = useCallback(() => {
      drumSetRefs.current[currentScrollIndex]?.moveToPrevInstrument();
    }, [currentScrollIndex]);

    const scrollToPage = useCallback((index: number) => {
      const safeIndex = Math.max(0, Math.min(index, instrumentSections.length - 1));
      const offset = safeIndex * containerWidth;
      flatListRef.current?.scrollToOffset({ offset, animated: true });
    }, [containerWidth, instrumentSections.length]);

    const moveToNeutralPosition = useCallback((instrument: InstrumentType) => {
      drumSetRefs.current[currentScrollIndex]?.moveToNeutralPosition(instrument);
    }, [currentScrollIndex]);

    const resetCharacterToInitial = useCallback(() => {
      drumSetRefs.current[currentScrollIndex]?.resetToInitialPosition();
    }, [currentScrollIndex]);

    React.useImperativeHandle(ref, () => ({
      moveToNextInstrumentForCurrentPage,
      moveToPrevInstrumentForCurrentPage,
      scrollToPage,
      moveToNeutralPosition,
      resetCharacterToInitial,
    }), [moveToNextInstrumentForCurrentPage, moveToPrevInstrumentForCurrentPage, scrollToPage, moveToNeutralPosition, resetCharacterToInitial]);

    return (
      <View
        style={styles.horizontalScrollContainer}
        onLayout={handleContainerLayout}
      >
        <AnimatedFlatList
          ref={flatListRef}
          horizontal
          pagingEnabled
          scrollEnabled={scrollEnabled}
          showsHorizontalScrollIndicator={false}
          data={instrumentSections}
          keyExtractor={(item: unknown) => (item as { count: number }).count.toString()}
          snapToAlignment="center"
          snapToInterval={containerWidth || Dimensions.get('window').width}
          decelerationRate={0.95}
          getItemLayout={getItemLayout}
          contentOffset={{ x: 0, y: 0 }}
          onLayout={handleFlatListLayout}
          onScroll={onScroll}
          onMomentumScrollEnd={onScrollEnd}
          onScrollEndDrag={onScrollEnd}
          scrollEventThrottle={16}
          onScrollToIndexFailed={(info) => {
            console.log('❌ 스크롤 실패, 재시도:', info.index);
            const wait = new Promise(resolve => setTimeout(resolve, 500));
            wait.then(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
            });
          }}
          renderItem={(info) => {
            const { item, index } = info;
            const row = item as { count: number };
            return (
              <View style={{ width: containerWidth, justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                <InteractiveDrumSet
                  ref={(el) => { drumSetRefs.current[index] = el; }}
                  numInstruments={row.count as 2 | 3 | 4 | 5}
                  isGameAudioPlaying={isGameAudioPlaying}
                  onInstrumentPlay={(instrument) => onInstrumentPlay(instrument)}
                  onInstrumentChange={(inst) => onInstrumentChange(inst, index)}
                  isGameMode={isGameMode}
                  isQuizWaiting={isQuizWaiting}
                  onAnswerSubmit={onAnswerSubmit}
                  hideCycleButton
                />
              </View>
            );
          }}
        />
      </View>
    );
  });

