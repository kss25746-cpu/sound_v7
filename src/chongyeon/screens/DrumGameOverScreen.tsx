import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Text, Pressable, LayoutChangeEvent } from "react-native";
import Rive, { Fit } from "rive-react-native";
import { CorrectConfetti } from "../components/CorrectConfetti";
import { colors, opacity } from "../constants/drumGameOverTheme";
import * as over from "../constants/drumGameOverLayout";

/** `resourceName`(`res/raw`) 대신 metro 에셋. 이유는 `RiveAnimalGame` · `app_go8.md` */
const PROGRESS_BOX_RIVE = require("@/assets/chongyeon/rive/pro_box33.riv");


interface DrumGameOverScreenProps {
  score: number;
  maxScore: number;
  onRestart: () => void;
  /**
   * 주 버튼 글자. 기본값은 드럼의 「다시 하기」다.
   */
  restartLabel?: string;
  /**
   * 결과를 접고 **돌아갈 화면이 있을 때만** 넘긴다. 안 넘기면 「나가기」를 그리지 않는다.
   *
   * 드럼은 퀴즈를 접고 **연주 모드**로 돌아가므로 넘긴다.
   */
  onGoHome?: () => void;
}

/**
 * 결과 등급. 메시지와 색을 **한 표에** 둔다 — 따로 두면 한쪽만 고쳐져 어긋난다.
 * 색을 한 톤씩 내린 이유는 `drumGameOverTheme.ts`에 적었다.
 */
const RESULT_TIERS = {
  perfect: { message: "완벽해요!", color: colors.tierPerfect },
  good: { message: "잘했어요!", color: colors.tierGood },
  tryAgain: { message: "아쉬워요!", color: colors.tierTryAgain },
} as const;

function DrumGameOverScreen({
  score,
  maxScore,
  onRestart,
  restartLabel = "다시 하기",
  onGoHome,
}: DrumGameOverScreenProps) {
  // 점수에 따른 등급(메시지 + 색)
  const clampedMaxScore = Math.max(maxScore, 1);
  // `maxScore`가 0이면 만점이 아니다 — learn 「그만하기」는 **한 문제도 안 푼 채** 접을 수 있어
  // `0/0`이 들어온다. 막지 않으면 콘페티가 깔리고 「완벽해요!」가 뜬다
  const isPerfect = maxScore > 0 && score === maxScore;
  const tier =
    isPerfect
      ? RESULT_TIERS.perfect
      : score >= clampedMaxScore * 0.7
        ? RESULT_TIERS.good
        : RESULT_TIERS.tryAgain;

  // 카드 폭 실측. 이 컴포넌트는 드럼(전체 화면 오버레이)과 learn(페이지 안)에서 함께 쓰는데
  // 두 호스트의 폭이 달라 화면 폭만으로는 못 맞춘다.
  // 소수점 끝자리가 흔들리면 onLayout → 리렌더 → onLayout이 도니 반올림한다 (세션 32).
  const [measuredCardWidth, setMeasuredCardWidth] = useState(0);
  const handleCardLayout = (event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width);
    setMeasuredCardWidth(prev => (prev === width ? prev : width));
  };

  // 실측 전 첫 프레임은 **하한**으로 그린다. 큰 값으로 어림잡으면 폭이 좁은 호스트(learn)에서
  // 한 프레임 동안 게이지가 카드 밖으로 삐져나온다. 작게 시작해 실측 후 커지는 편이 안전하다.
  const gaugeWidth = measuredCardWidth
    ? Math.max(over.gauge.minWidth, Math.round(Math.min(measuredCardWidth - over.card.padding * 2, over.gauge.maxWidth)))
    : over.gauge.minWidth;
  const gaugeHeight = Math.round(gaugeWidth / over.gauge.aspect);

  // Rive 진행 게이지 컨트롤용 ref
  const riveRef = useRef<any>(null);

  // 점수 비율(0~1) → 0~100 구간 값으로 변환
  const targetGaugeValue = (score / clampedMaxScore) * 100;

  // 결과 화면이 열릴 때 게이지가 0 → targetGaugeValue 까지 짧게 차오르게 함
  useEffect(() => {
    if (!riveRef.current) return;

    const duration = over.motion.fillDurationMs; // 전체 애니메이션 시간(ms)
    const steps = over.motion.fillSteps;
    const stepTime = duration / steps;
    const stepDelta = targetGaugeValue / steps;

    let current = 0;
    let cancelled = false;
    let timeoutId: any;

    // 초기값 0으로 리셋
    riveRef.current.setInputState("State Machine 1", "Number 1", 0);

    const tick = () => {
      if (cancelled || !riveRef.current) return;
      current += stepDelta;
      const clamped = Math.min(current, targetGaugeValue);

      riveRef.current.setInputState("State Machine 1", "Number 1", clamped);

      if (clamped < targetGaugeValue) {
        timeoutId = setTimeout(tick, stepTime);
      }
    };

    tick();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [targetGaugeValue]);

  return (
    <View style={styles.container}>
      <View style={styles.resultWrapper}>
        <View style={styles.resultContent}>


          {/* 점수 카드 */}
          <View style={styles.scoreCard} onLayout={handleCardLayout}>
            {/* 점수와 진행 바를 함께 배치 */}
            <View style={styles.scoreContainer}>


              {/* 점수 진행 바 - Rive 게이지 */}
              <View style={styles.progressBar}>
                <Rive
                  ref={riveRef}
                  source={PROGRESS_BOX_RIVE}
                  stateMachineName="State Machine 1"
                  style={{ width: gaugeWidth, height: gaugeHeight }}
                  autoplay
                />
              </View>
              <Text style={styles.scoreMessage}>{tier.message}</Text>
              <Text style={[styles.scoreCombined, { color: tier.color }]}>
                {score}/{maxScore}
              </Text>
            </View>


          </View>

          {/* 버튼 — 주 동작만 채우고, 결과를 닫는 나가기는 아웃라인으로 구분한다.
              `onGoHome`이 없으면 주 버튼 하나가 칸을 채운다.
              글자는 `restartLabel`. 드럼 기본은 「다시 하기」. */}
          <View style={styles.buttonContainer}>
            <Pressable
              onPress={onRestart}
              accessibilityRole="button"
              accessibilityLabel={restartLabel}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.pressedButton,
              ]}
            >
              <Text style={styles.buttonText}>{restartLabel}</Text>
            </Pressable>

            {onGoHome && (
              <Pressable
                onPress={onGoHome}
                accessibilityRole="button"
                accessibilityLabel="나가기"
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.secondaryButton,
                  pressed && styles.pressedButton,
                ]}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>나가기</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
      {/*
        만점 콘페티. 정답 순간에 터지는 것과 **같은 컴포넌트**다 — 다만 여기선 걷지 않는다.
        `Burst`가 루프라, 켜 두면 결과창이 떠 있는 내내 계속 돈다 (기타·피아노는 훅이 걷는다).

        `fit`·`style` 모두 모듈 상수라 카드 폭 실측(`onLayout`)으로 게이지가 다시 그려져도
        `React.memo`가 걸러 준다 — 안 그러면 리렌더마다 콘페티가 처음부터 다시 돈다.
      */}
      {isPerfect && <CorrectConfetti fit={Fit.Cover} style={styles.confettiOverlay} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    padding: over.scene.padding,
    justifyContent: "center",
    alignItems: "center",
  },
  // 자리잡기(`absoluteFill`)는 `CorrectConfetti`가 이미 하고, 여기선 **층만** 덮어쓴다.
  // 기본값 100을 그대로 쓰면 안 된다 — 이 화면은 콘페티가 결과 카드를 덮으면 점수가 가린다
  confettiOverlay: {
    zIndex: over.zIndex.confetti,
    elevation: over.zIndexElevation.confetti,
  },
  resultWrapper: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: over.zIndex.result,
  },
  resultContent: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: over.scene.contentPaddingHorizontal,
  },

  scoreCard: {
    backgroundColor: colors.cardBg,
    borderRadius: over.card.borderRadius,
    padding: over.card.padding,
    width: "100%",
    maxWidth: over.card.maxWidth,
    alignSelf: "center",
    alignItems: "center",
    // 그림자는 elevation으로만 낸다 (규칙 4 — 안드로이드 전용 앱).
    // learn 탭은 배경이 밝아(#F0F2F5) 그림자가 없으면 흰 카드가 배경에 묻으므로
    // 옅은 테두리를 함께 둔다.
    elevation: over.card.elevation,
    borderWidth: over.card.borderWidth,
    borderColor: colors.cardBorder,
    marginBottom: over.card.marginBottom,
  },
  scoreCombined: {
    marginTop: over.card.scoreMarginTop,
    fontSize: over.card.scoreFontSize,
    fontWeight: "bold",
    // 색은 등급에 따라 렌더에서 준다 (RESULT_TIERS)
    textAlign: "center",
  },
  scoreContainer: {
    alignItems: "center",
    marginBottom: over.card.scoreContainerMarginBottom,
  },
  scoreMessage: {
    fontSize: over.card.messageFontSize,
    color: colors.message,
    marginTop: over.card.messageMarginTop,
    fontWeight: "bold",
  },
  progressBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: over.gauge.marginTop,
    gap: over.gauge.gap,
  },
  buttonContainer: {
    width: "100%",
    maxWidth: over.card.maxWidth,
    alignSelf: "center",
    gap: over.button.gap,
    marginTop: over.button.containerMarginTop,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flex: 1,
    borderRadius: over.button.borderRadius,
    backgroundColor: colors.actionBg,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: over.button.paddingVertical,
    paddingHorizontal: over.button.paddingHorizontal,
    minHeight: over.button.minHeight,
    borderWidth: over.button.borderWidth,
    borderColor: colors.actionBorder,
  },
  secondaryButton: {
    backgroundColor: colors.secondaryBg,
  },
  buttonText: {
    fontSize: over.button.fontSize,
    fontWeight: "bold",
    color: colors.actionText,
  },
  secondaryButtonText: {
    color: colors.secondaryText,
  },
  pressedButton: {
    transform: [{ scale: over.button.pressedScale }],
    opacity: opacity.pressed,
  },
});

export default DrumGameOverScreen;
