import React, { useCallback, useEffect, useRef, useState } from "react";
import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Rive, { Fit } from "rive-react-native";

/** `resourceName`(`res/raw`) 대신 metro 에셋. 이유는 `RiveAnimalGame` · `app_go8.md` */
const CONFETTI_RIVE = require("@/assets/chongyeon/rive/confetti.riv");

/** `confetti.riv` 안에는 `Gauge`와 `Confetti` 두 아트보드가 들어 있다. 쓰는 쪽은 뒤쪽이다 */
const ARTBOARD = "Confetti";
const STATE_MACHINE = "State Machine 1";

/**
 * 한 발을 보여줄 시간. **이 시간이 지나면 언마운트해서 끊는다.**
 *
 * `Burst` 애니메이션은 파일 자체가 **루프**다 (`loopValue = 1`, 120프레임 = 60fps 기준 2초).
 * 즉 그냥 두면 영원히 반복한다 — 드럼 결과 화면이 실제로 그렇게 쓴다.
 * 정답 콘페티는 한 발로 끝나야 하므로 **화면이 직접 시간을 재서 걷는다.**
 *
 * 1400은 한 바퀴(2초)보다 짧다. 뒤 30%가 잘리는 셈인데, 다음 문제까지의 간격과 맞바꾼 값이다.
 * 한 바퀴를 다 보여주려면 2000으로 올리고 `NEXT_QUESTION_DELAY_MS`도 함께 올리면 된다.
 *
 * 이 값을 늘리면 기타·피아노의 `NEXT_QUESTION_DELAY_MS`도 같이 봐야 한다 —
 * 다음 문제음이 콘페티보다 먼저 나면 걷히는 중에 다음 문제가 겹친다.
 */
export const CORRECT_CONFETTI_DURATION_MS = 1400;

/**
 * ⚙️ **가로 화면 확대 배율 — 조절은 이 숫자 하나로 끝난다.**
 *
 * 아트보드가 400 × 800(세로가 2배)이라 가로 화면에서 `Contain`은 **높이에 묶인다.**
 * 800 × 360 화면이면 `min(800/400, 360/800) = 0.45`라 180 × 360으로 그려져
 * **폭의 22%**만 차지한다 — 가운데 좁고 긴 띠로 보이는 이유다.
 * 그렇다고 `Cover`로 가면 배율이 2.0이 되어 세로 1600px, 아트보드의 가운데 22%만 남는다.
 *
 * 그래서 그 사이를 배율로 잡는다. 2면 360 × 720 — 폭은 화면의 45%, 위아래는 절반씩 잘린다.
 * 올릴수록 커지고 더 잘린다. 4.4쯤이면 `Cover`와 같아진다.
 *
 * 키우는 방법이 `transform: scale`이 아니라 **뷰 자체를 크게 잡는 것**인 이유 —
 * `rive-android`(10.x)는 `TextureView`에 그린다. 뷰 변환은 **이미 구운 텍스처**를 늘려서
 * 2배면 뭉개진다. 뷰를 키우면 Rive가 그 크기로 **처음부터 벡터를 그린다.**
 */
export const LANDSCAPE_CONFETTI_SCALE = 3;

interface CorrectConfettiProps {
  /**
   * 세로 화면(드럼 결과)은 `Cover`, 가로 화면(기타·피아노)은 `Contain`이다.
   *
   * 아트보드가 세로로 길어서 **가로 화면에서 `Cover`로 채우면 크게 잘린다** — 확대된 조각만 보인다.
   * 반대로 세로 화면에서 `Contain`은 화면을 다 못 덮어 위아래가 빈다.
   */
  fit?: Fit;
  /**
   * 레이어를 덮어쓸 때만 넘긴다. 기본값은 악기 UI(기타 20 · 피아노 99)보다 위인 100이고,
   * 드럼 결과 카드처럼 **덮으면 안 되는 형제**가 있는 곳은 낮춰서 넘긴다.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * 확대 배율. 기본값은 `fit`이 정한다 — 가로 화면(`Contain`)만 키우면 되고
   * 세로 화면(`Cover`)은 이미 화면을 채우므로 1이다. 값은 `LANDSCAPE_CONFETTI_SCALE`에서 본다.
   */
  scale?: number;
}

/**
 * 콘페티 한 아트보드를 **정답 순간**(기타·피아노 훈련)과 **만점 결과**(`DrumGameOverScreen`)가
 * 함께 쓴다. 처음엔 결과 화면이 따로 한 벌 들고 있었는데, 에셋 경로·아트보드 이름·상태머신 이름이
 * 두 군데 적혀 있어 **한쪽만 고쳐질 자리**였다 — 실제로 달라야 하는 건 `fit`과 레이어뿐이다.
 *
 * 드럼은 **만점에만** 터진다 — 문항별로는 `⭕`/`❌` 피드백만 있고 콘페티는 결과 화면 몫이다.
 *
 * 되감기를 ref(`reset()` + `play()`)로 하려다 **멈춘 프레임만 남았다.** 두 가지가 겹친다 —
 * 네이티브 `reset()`은 metro 에셋(`url` 경로)에서 `artboardRenderer?.reset()`을 부르는데
 * 이게 비면 아무 일도 안 하고(`RiveReactNativeView.kt:348`), 인자 없는 `play()`는
 * `animationName=''`이라 상태머신을 다시 돌리는 호출이 아니다(`Rive.js:352`).
 *
 * 그래서 **드럼 결과 화면이 실제로 하던 방식**으로 되돌렸다 — 새로 마운트하고 `autoplay`.
 * 부르는 쪽이 `key`를 갈아 끼우면 상태머신이 처음부터 새로 돈다 (`useCorrectConfetti`).
 */
export const CorrectConfetti = React.memo(function CorrectConfetti({
  fit = Fit.Contain,
  style,
  scale = fit === Fit.Contain ? LANDSCAPE_CONFETTI_SCALE : 1,
}: CorrectConfettiProps) {
  return (
    <View style={[styles.overlay, style]} pointerEvents="none" importantForAccessibility="no">
      <Rive
        source={CONFETTI_RIVE}
        artboardName={ARTBOARD}
        stateMachineName={STATE_MACHINE}
        autoplay
        fit={fit}
        style={scale === 1 ? StyleSheet.absoluteFill : overscanStyle(scale)}
        onError={error => console.warn("[콘페티] Rive 로드 실패", error)}
      />
    </View>
  );
});

/**
 * 화면보다 `scale`배 큰 자리를 잡고 **가운데를 맞춘다.** 네 변을 같은 비율만큼 밖으로 밀면
 * 폭·높이가 `100% + 2 × inset`이 되므로, 2배면 각 변이 -50%다.
 * 넘치는 부분은 오버레이(`overflow: hidden`)가 잘라낸다.
 */
function overscanStyle(scale: number): ViewStyle {
  const inset = `${(-(scale - 1) / 2) * 100}%` as DimensionValue;
  return { position: "absolute", left: inset, right: inset, top: inset, bottom: inset };
}

/**
 * ⚙️ **한 번의 정답에 터뜨릴 발 수**와 **발 사이 간격 —— 조절은 이 둘로 한다.**
 *
 * `rive-react-native`에는 재생 속도를 낮출 방법이 없다 (9.8.5 `RiveProps`·`RiveRef`에
 * `speed`가 없고, `rive-android` 10.4.5에도 없다. `confetti.riv`의 상태머신은 입력이 아예 없다).
 * 그래서 **한 발을 늦추는 대신 여러 발을 시차로 겹친다** — 조각 하나하나는 그대로지만
 * 쏟아지는 시간이 길어진다. 진짜로 느리게 하려면 Rive 파일에서 타임라인을 늘려야 한다.
 *
 * 총 지속 = `(발 수 - 1) × 간격 + durationMs` — 지금 값이면 2 × 350 + 1400 = **2.1초**다.
 * 기타·피아노는 다음 문제음을 그 뒤(`NEXT_QUESTION_DELAY_MS` = 2.15초)로 미뤄 두었다.
 * **여기를 늘리면 저쪽도 같이 늘려야 한다** — 안 그러면 다음 문제 위로 콘페티가 남는다.
 */
export const CORRECT_CONFETTI_BURST_COUNT = 3;
export const CORRECT_CONFETTI_BURST_GAP_MS = 350;

interface UseCorrectConfettiOptions {
  durationMs?: number;
  /** `CorrectConfetti`의 프롭을 그대로 넘긴다 — 오버레이를 훅이 대신 그려주므로 */
  fit?: Fit;
  style?: StyleProp<ViewStyle>;
  scale?: number;
  burstCount?: number;
  burstGapMs?: number;
}

/**
 * 정답 콘페티. 한 번 부르면 `CORRECT_CONFETTI_BURST_COUNT`발이 시차를 두고 터지고
 * 각자 `durationMs` 뒤에 **언마운트되어** 걷힌다.
 *
 * 걷는 쪽이 이 훅밖에 없다 — `Burst`는 루프라 안 걷으면 영원히 돈다
 * (`CORRECT_CONFETTI_DURATION_MS` 참고).
 *
 * 쓰는 쪽은 기타·피아노 **훈련 모드**뿐이다. 드럼 결과 화면은 만점 동안 **계속 돌리는** 것이라
 * 훅을 거치지 않고 `CorrectConfetti`를 직접 그린다 — 그래서 여기 겹치기·걷기는 드럼에 닿지 않는다.
 *
 * 훈련을 접거나(`clearConfetti`) 화면을 떠나면 예약된 발과 걷기를 **함께** 푼다. 안 풀면
 * 끝난 훈련 위에 콘페티가 남는다 (기타 `timerRefs` · 피아노 `scheduleTrainingTimer`와 같은 이유).
 */
export function useCorrectConfetti({
  durationMs = CORRECT_CONFETTI_DURATION_MS,
  fit,
  style,
  scale,
  burstCount = CORRECT_CONFETTI_BURST_COUNT,
  burstGapMs = CORRECT_CONFETTI_BURST_GAP_MS,
}: UseCorrectConfettiOptions = {}) {
  /**
   * 지금 살아 있는 발들의 id. 겹쳐 터지므로 하나가 아니라 **목록**이다.
   * id는 계속 올라가는 번호라 `key`로 쓰면 **연속 정답에도** 상태머신이 처음부터 새로 돈다.
   */
  const [liveBursts, setLiveBursts] = useState<number[]>([]);
  const nextBurstIdRef = useRef(0);
  /** 예약된 발·걷기를 한 자리에 모아 둔다 — 접을 때 한 번에 끊으려고 */
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const cancelTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current.clear();
  };

  const schedule = (run: () => void, delayMs: number) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      run();
    }, delayMs);
    timersRef.current.add(id);
  };

  const burstConfetti = useCallback(() => {
    // 앞선 정답의 남은 발은 버린다. 안 그러면 연속 정답에 발이 계속 쌓인다
    cancelTimers();
    setLiveBursts([]);

    for (let i = 0; i < burstCount; i += 1) {
      const fire = () => {
        const id = nextBurstIdRef.current++;
        setLiveBursts(prev => [...prev, id]);
        schedule(() => setLiveBursts(prev => prev.filter(x => x !== id)), durationMs);
      };
      // 첫 발은 기다리지 않는다 — 정답과 같은 프레임에 터져야 반응으로 읽힌다
      if (i === 0) fire();
      else schedule(fire, i * burstGapMs);
    }
  }, [burstCount, burstGapMs, durationMs]);

  const clearConfetti = useCallback(() => {
    cancelTimers();
    setLiveBursts([]);
  }, []);

  useEffect(() => cancelTimers, []);

  /** 화면 최상단에 그대로 꽂으면 된다. 안 터졌으면 `null`이라 아무것도 안 그린다 */
  const confettiOverlay = liveBursts.length > 0 ? (
    <>
      {liveBursts.map(id => (
        <CorrectConfetti key={id} fit={fit} style={style} scale={scale} />
      ))}
    </>
  ) : null;

  return { burstConfetti, clearConfetti, confettiOverlay };
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    // 리플·파티클(피아노 `rippleContainer`가 zIndex·elevation 모두 99)보다 위.
    // 안드로이드는 `elevation`으로도 순서를 가리므로 **둘 다** 넘겨야 한다 —
    // 처음에 12로 뒀다가 악기 UI(기타 20 · 피아노 99) 밑에 깔려 아예 안 보였다
    zIndex: 100,
    elevation: 100,
    // 확대분(`overscanStyle`)이 화면 밖까지 그리지 않게 자른다
    overflow: "hidden",
  },
});
