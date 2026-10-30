import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppState,
  type AppStateStatus,
  BackHandler,
  View,
  Text,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HomeScreen from "./HomeScreen";
import ToneStage from "./ToneStage";
import WordStage from "./WordStage";
import PairStage from "./PairStage";
import ResultScreen from "./ResultScreen";
import { PauseModal } from "./PauseModal";
import { SeaBackground, WaveButton, HeroMark, StageHeader, type StageExit } from "./Sea";
import { C, S, T, SEA_TEXT_SHADOW } from "./theme";

import { audio } from "./audioAdapter";
import { confirmEndSession } from "@/training/confirmEndSession";
import {
  appendFreqFindSessionRecord,
  getLatestFreqFindSession,
  type SavedFreqFindSessionRecord,
} from "@/training/sessionStore";
import { StatsScreen } from "@/training/StatsScreen";
import {
  buildStage1,
  gradeStage1,
  buildStage2,
  gradeStage2,
  buildStage3,
  gradeStage3,
  buildStage4,
  gradeStage4,
  weakBandsOf,
  stage4AnchorBands,
  summarize,
  countPracticeFirstPass,
  type Stage1Item,
  type WordStageItem,
  type PairStageItem,
  type GradeState,
  type SummaryResult,
} from "./testEngine";
import { BAND_INFO, type BandKey } from "./words";

type ScreenName = "home" | "interlude" | "s1" | "s2" | "s3" | "s4" | "result";

interface InterludeInfo {
  title: string;
  desc: string;
  next: ScreenName;
  buttonTitle?: string;
}

const EMPTY_GRADES: GradeState = { s1: null, s2: null, s3: null, s4: null };

interface AppProps {
  onBack?: () => void;
}

export default function App({ onBack }: AppProps) {
  const [screen, setScreen] = useState<ScreenName>("home");
  const [stage1Items, setStage1Items] = useState<Stage1Item[]>([]);
  const [stage2Items, setStage2Items] = useState<WordStageItem[]>([]);
  const [stage3Items, setStage3Items] = useState<WordStageItem[]>([]);
  const [stage4Items, setStage4Items] = useState<PairStageItem[]>([]);

  const [grades, setGrades] = useState<GradeState>(EMPTY_GRADES);
  const [interlude, setInterlude] = useState<InterludeInfo | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  // 「여정 끝내기」 확인 창이 떠 있는 동안. 단계에 일시정지로 넘겨 다음 문항·결과 저장 타이머를 멈춘다
  const [isExitConfirming, setIsExitConfirming] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [isCustomTraining, setIsCustomTraining] = useState(false);
  const [customTrainBand, setCustomTrainBand] = useState<BandKey | null>(null);
  const [latestRecord, setLatestRecord] = useState<SavedFreqFindSessionRecord | null>(null);
  const [customSummary, setCustomSummary] = useState<SummaryResult | null>(null);

  useEffect(() => {
    void audio.init();
    return () => {
      void audio.stop();
    };
  }, []);

  useEffect(() => {
    let unmounted = false;
    void getLatestFreqFindSession().then((rec) => {
      if (!unmounted) setLatestRecord(rec);
    });
    return () => {
      unmounted = true;
    };
  }, []);

  /** 통계에서 지운 뒤에도 결과 지도·홈 카드가 옛 메모리를 보여 주지 않게 저장소를 다시 읽는다. */
  const closeStats = useCallback(() => {
    void getLatestFreqFindSession()
      .catch(() => null)
      .then((rec) => {
        setLatestRecord(rec);
        if (!rec) {
          setGrades(EMPTY_GRADES);
          setCustomSummary(null);
          setScreen((s) => (s === "result" ? "home" : s));
        }
        setShowStats(false);
      });
  }, []);

  const goInterlude = (
    title: string,
    desc: string,
    next: ScreenName,
    buttonTitle?: string
  ) => {
    setInterlude({ title, desc, next, buttonTitle });
    setScreen("interlude");
  };

  const start = () => {
    setIsCustomTraining(false);
    setCustomTrainBand(null);
    setCustomSummary(null);
    setGrades(EMPTY_GRADES);
    setStage1Items(buildStage1());
    setScreen("s1");
  };

  const handleCustomTrain = useCallback((band: BandKey) => {
    setIsCustomTraining(true);
    setCustomTrainBand(band);
    const customItems = buildStage3([band]);
    setStage3Items(customItems);
    goInterlude(
      `연습 · ${BAND_INFO[band].name}`,
      `흐릿했던 ${BAND_INFO[band].name}(${BAND_INFO[band].range})의 단어들을 집중적으로 청취하며 귀의 감각을 깨워봅니다.`,
      "s3"
    );
  }, []);

  const handleReturnToResult = useCallback(() => {
    void audio.stop();
    setIsPaused(false);
    setIsCustomTraining(false);
    setCustomTrainBand(null);
    setScreen("result");
  }, []);

  const handleViewResult = useCallback((record?: SavedFreqFindSessionRecord) => {
    if (record) {
      if (record.grades) setGrades(record.grades);
      if (record.summary) setCustomSummary(record.summary);
    }
    setIsCustomTraining(false);
    setCustomTrainBand(null);
    setScreen("result");
  }, []);

  const finishS1 = (answers: Record<string, boolean>) => {
    const s1 = gradeStage1(stage1Items, answers);
    setGrades((g) => ({ ...g, s1 }));
    setStage2Items(buildStage2());
    // 1→2단계는 막간 없이 바로 넘어간다(2026-09-14). 2단계 화면이 자동 재생으로
    // 시작해 설명이 없어도 되고, 홈의 「여정은 네 단계입니다」에 같은 안내가 있다.
    // 규칙이 바뀌는 3·4단계 앞의 막간은 남긴다.
    setScreen("s2");
  };

  const finishS2 = (answers: Record<string, string>) => {
    const s2 = gradeStage2(stage2Items, answers);
    const nextGrades = { ...grades, s2 };
    setGrades(nextGrades);

    const weak = weakBandsOf(s2);
    if (weak.length === 0) {
      const nextSummary = summarize(nextGrades);
      const rec: SavedFreqFindSessionRecord = {
        id: `freqFind-${Date.now()}`,
        track: "freqFind",
        savedAt: new Date().toISOString(),
        grades: nextGrades,
        summary: nextSummary,
      };
      setLatestRecord(rec);
      void appendFreqFindSessionRecord(rec);
      setScreen("result");
      return;
    }
    setStage3Items(buildStage3(weak));
    goInterlude(
      "3단계 · 깊이 들어가기",
      "확인이 필요한 깊이만 다시 봅니다.\n보기 네 개가 모두 같은 깊이에서 나오므로, 나머지를 지워서 맞히는 방법은 통하지 않습니다.",
      "s3"
    );
  };

  const finishS3 = (answers: Record<string, string>) => {
    if (isCustomTraining) {
      void audio.stop();
      const { total, correct } = countPracticeFirstPass(stage3Items, answers);
      const band = customTrainBand ?? stage3Items[0]?.band;
      const name = band ? BAND_INFO[band].name : "이 대역";
      goInterlude(
        `${name} 연습 끝`,
        `${total}문제 중 ${correct}개 맞혔어요`,
        "result",
        "결과로 돌아가기"
      );
      return;
    }
    const s3 = gradeStage3(stage3Items, answers);
    const nextGrades = { ...grades, s3 };
    setGrades(nextGrades);

    const stillWeak = weakBandsOf(s3);
    const strong = stage4AnchorBands(grades.s2, s3);
    const s4Items =
      stillWeak.length && strong.length ? buildStage4(stillWeak, strong) : [];

    if (s4Items.length === 0) {
      const nextSummary = summarize(nextGrades);
      const rec: SavedFreqFindSessionRecord = {
        id: `freqFind-${Date.now()}`,
        track: "freqFind",
        savedAt: new Date().toISOString(),
        grades: nextGrades,
        summary: nextSummary,
      };
      setLatestRecord(rec);
      void appendFreqFindSessionRecord(rec);
      setScreen("result");
      return;
    }
    setStage4Items(s4Items);
    goInterlude(
      "4단계 · 마주 보는 두 소리",
      "한 음소만 다른 두 단어를 나란히 냅니다.\n약한 깊이와 잘 들리는 깊이를 직접 비교합니다.",
      "s4"
    );
  };

  const finishS4 = (answers: Record<string, string>) => {
    const s4 = gradeStage4(stage4Items, answers);
    const nextGrades = { ...grades, s4 };
    setGrades(nextGrades);
    const nextSummary = summarize(nextGrades);
    const rec: SavedFreqFindSessionRecord = {
      id: `freqFind-${Date.now()}`,
      track: "freqFind",
      savedAt: new Date().toISOString(),
      grades: nextGrades,
      summary: nextSummary,
    };
    setLatestRecord(rec);
    void appendFreqFindSessionRecord(rec);
    setScreen("result");
  };

  const summary = useMemo(
    () => customSummary ?? summarize(grades),
    [grades, customSummary]
  );

  const isStageActive = ["interlude", "s1", "s2", "s3", "s4"].includes(screen);

  // 백그라운드 전환 및 오디오 포커스 상실 시 즉시 소리 컷 & 일시정지 모달 활성화
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        if (isStageActive) {
          void audio.stop();
          setIsPaused(true);
        }
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [isStageActive, screen]);

  // 전역 오디오 스위치는 `audio-manager.tsx`의 AppState 게이트가 포그라운드 복귀 때
  // 이미 켠다. 여기서 또 켜면 끄는 쪽과 켜는 쪽이 갈려 추적이 어려워진다.
  const handleResume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const handlePauseExit = useCallback(() => {
    setIsPaused(false);
    void audio.stop();
    setScreen("home");
  }, []);

  const stageName = useMemo(() => {
    switch (screen) {
      case "s1":
        return "1단계 · 소리의 파동";
      case "s2":
        return "2단계 · 바다 둘러보기";
      case "s3":
        return isCustomTraining
          ? customTrainBand
            ? `연습 · ${BAND_INFO[customTrainBand].name}`
            : "연습"
          : "3단계 · 깊이 들어가기";
      case "s4":
        return "4단계 · 마주 보는 두 소리";
      case "interlude":
        return interlude?.title ?? "단계 이동";
      default:
        return undefined;
    }
  }, [screen, interlude, isCustomTraining, customTrainBand]);

  const handleStageExit = useCallback(() => {
    confirmEndSession(
      () => {
        void audio.stop();
        setIsPaused(false);
        setIsExitConfirming(false);
        setScreen("home");
      },
      {
        title: "여정 끝내기",
        onOpen: () => {
          void audio.stop();
          setIsExitConfirming(true);
        },
        onCancel: () => {
          setIsExitConfirming(false);
        },
      }
    );
  }, []);

  const stageExit: StageExit = useMemo(
    () =>
      isCustomTraining
        ? {
            title: "결과로 돌아가기",
            accessibilityLabel: "결과로 돌아가기",
            icon: "chevronLeft",
            onPress: handleReturnToResult,
          }
        : {
            title: "중단",
            accessibilityLabel: "측정 중단하고 메인으로 가기",
            icon: "close",
            onPress: handleStageExit,
          },
    [isCustomTraining, handleReturnToResult, handleStageExit]
  );

  useEffect(() => {
    const onBackPress = () => {
      if (showStats) {
        closeStats();
        return true;
      }
      if (isPaused) {
        handleResume();
        return true;
      }
      if (isStageActive) {
        if (isCustomTraining) {
          handleReturnToResult();
          return true;
        }
        handleStageExit();
        return true;
      }
      if (screen === "result") {
        setScreen("home");
        return true;
      }
      if (screen === "home") {
        if (onBack) {
          onBack();
          return true;
        }
        return false;
      }
      return false;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [
    showStats,
    isPaused,
    isStageActive,
    isCustomTraining,
    screen,
    handleResume,
    handleStageExit,
    handleReturnToResult,
    closeStats,
    onBack,
  ]);

  if (showStats) {
    return (
      <StatsScreen
        initialKind="freqFind"
        onBack={closeStats}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.abyss }}>
      {screen === "home" && (
        <HomeScreen
          onStart={start}
          onBack={onBack}
          onOpenStats={() => setShowStats(true)}
          onViewResult={handleViewResult}
          recentSession={latestRecord}
        />
      )}

      {screen === "interlude" && interlude && (
        <Interlude
          title={interlude.title}
          desc={interlude.desc}
          buttonTitle={interlude.buttonTitle}
          exit={stageExit}
          onNext={() => {
            if (interlude.next === "result") {
              setIsCustomTraining(false);
              setCustomTrainBand(null);
            }
            setScreen(interlude.next);
          }}
        />
      )}

      {screen === "s1" && (
        <ToneStage
          items={stage1Items}
          onDone={finishS1}
          paused={isPaused || isExitConfirming}
          exit={stageExit}
        />
      )}

      {screen === "s2" && (
        <WordStage
          items={stage2Items}
          stageLabel="2단계 · 바다 둘러보기"
          onDone={finishS2}
          paused={isPaused || isExitConfirming}
          exit={stageExit}
        />
      )}

      {screen === "s3" && (
        <WordStage
          items={stage3Items}
          stageLabel={isCustomTraining ? "연습 · 깊이 들어가기" : "3단계 · 깊이 들어가기"}
          onDone={finishS3}
          paused={isPaused || isExitConfirming}
          isCustomTraining={isCustomTraining}
          exit={stageExit}
        />
      )}

      {screen === "s4" && (
        <PairStage
          items={stage4Items}
          onDone={finishS4}
          paused={isPaused || isExitConfirming}
          exit={stageExit}
        />
      )}

      {screen === "result" && (
        <ResultScreen
          summary={summary}
          onRestart={start}
          onOpenStats={() => setShowStats(true)}
          onHome={() => setScreen("home")}
          onExit={onBack}
          onCustomTrain={handleCustomTrain}
        />
      )}

      <PauseModal
        visible={isPaused}
        onResume={handleResume}
        onExit={handlePauseExit}
        stageName={stageName}
      />
    </View>
  );
}

function Interlude({
  title,
  desc,
  onNext,
  buttonTitle = "계속 내려가기",
  exit,
}: {
  title: string;
  desc: string;
  onNext: () => void;
  buttonTitle?: string;
  exit?: StageExit;
}) {
  const insets = useSafeAreaInsets();
  return (
    <SeaBackground scene="neutral">
      <View
        style={{
          flex: 1,
          paddingTop: Math.max(insets.top + 10, 44),
          paddingBottom: Math.max(insets.bottom + 20, 44),
          paddingHorizontal: Math.max(insets.left, insets.right, S.pad * 1.5),
        }}
      >
        <StageHeader exit={exit} />
        <View style={styles.interlude}>
          <HeroMark icon="frequency" />
          <Text style={[T.title, SEA_TEXT_SHADOW, { textAlign: "center", marginTop: 16 }]}>
            {title}
          </Text>
          <Text
            style={[
              T.sub,
              SEA_TEXT_SHADOW,
              { textAlign: "center", marginTop: 12, marginBottom: 36 },
            ]}
          >
            {desc}
          </Text>
          <WaveButton title={buttonTitle} icon="chevronRight" onPress={onNext} />
        </View>
      </View>
    </SeaBackground>
  );
}

const styles = StyleSheet.create({
  interlude: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: S.pad * 1.5,
  },
});

