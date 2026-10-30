import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioSource,
} from "expo-audio";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";

import {
  setHearingAudioActive,
  stopAllHearingAudio,
} from "@/audio/audioFocus";
import {
  releaseOutputKeepAlivePlayer,
  setOutputKeepAliveSuspended,
} from "@/audio/outputKeepAlive";

/**
 * 파일 재생 오디오 세션 + 짧은 샘플 상주 풀.
 *
 * B(`chongyeon-0708/context/AudioManager.tsx`)에서 이식했다. 디자인은 안 가져오고
 * **오디오 코어만** 살렸다. 정본: `docs/merge-chongyeon-audio.md` §2.1 · §6.
 *
 * 세 가지 일을 한다.
 *
 * 1. **오디오 모드를 앱 시작 때 한 번 설정한다.** 앱 전체에서 유일한 설정 지점이다.
 *    재생할 때마다 설정하면 네이티브 세션 재구성 지연이 첫 소리 앞에 그대로 붙는다.
 *    (이 Provider가 생기면서 `instPlay`·`ling6Play`·`sentClosed/play`의
 *    `setAudioModeAsync` 세 벌을 걷었다. 정본 §2.2-1 · §6-3.)
 * 2. **지연이 치명적인 짧은 샘플용 상주 풀.** 사운드 키마다 플레이어를 하나씩 만들어
 *    재사용한다(타격마다 생성·파괴하지 않는다). 같은 키를 다시 재생하면 겹치지 않고
 *    처음부터 다시 난다 — 같은 소리가 겹쳐 울리면 "두 번 친 것"으로 들려 문제를 방해한다.
 *    서로 다른 키는 각자 플레이어를 가지므로 자연히 겹쳐 난다.
 * 3. **백그라운드 게이트.** 백그라운드로 가면 앱 소리를 모두 끊고, 출력 킵얼라이브
 *    (`outputKeepAlive.ts`)도 세웠다가 돌아오면 되살린다. 킵얼라이브 자체는 화면들이
 *    `useOutputKeepAlive()`로 함께 붙잡는 별도 모듈이다(2026-10-15 이 Provider에서 분리).
 *
 * `주의`: **여기 담는 것은 개수가 적고 오래 쓰는 샘플뿐이다.** `createAudioPlayer`는
 * 재생 여부와 무관하게 만드는 즉시 AudioTrack 하나를 잡고, 안드로이드는 앱(UID)당
 * 동시 AudioTrack을 약 40개로 제한한다. 화면 전용으로 여러 개를 물고 있어야 하는 쪽은
 * 이 풀이 아니라 화면이 직접 들고 이탈할 때 `remove()`로 반납한다
 * (`use-stop-audio-on-blur.ts`). 근거: `docs/재생-키포인트.md` (실기기
 * `no more tracks` / AudioTrack ≈ 40).
 *
 * 합성 엔진(`pureTone.ts`·`amTone.ts`, react-native-audio-api)은 **이 예산과 별개다.**
 * Oboe/AAudio 스트림이라 AudioTrack ~40과 같은 풀이 아니다. 정본 §4.3.
 */

type SoundEntry = { readonly key: string; readonly source: AudioSource };

/** 예열용 무음 재생 길이. 샘플을 끝까지 돌릴 필요 없이 오디오 싱크만 열면 된다 */
const WARM_UP_PLAY_MS = 250;
/** 로드 완료를 기다리는 간격 · 횟수 (최대 3초) */
const LOAD_POLL_MS = 100;
const LOAD_POLL_LIMIT = 30;

type AudioManagerValue = {
  /** 화면 진입 시 미리 플레이어를 만들어 첫 터치 지연을 없앤다. */
  preloadSounds: (entries: readonly SoundEntry[]) => void;
  playSound: (soundKey: string, source: AudioSource) => void;
  stopAllSounds: () => void;
  getCurrentTab: () => string;
  setCurrentTab: (tab: string) => void;
  isPlaying: (soundKey: string) => boolean;
};

const AudioManagerContext = createContext<AudioManagerValue | null>(null);

function releasePlayer(player: AudioPlayer): void {
  try {
    player.remove();
  } catch (error) {
    console.warn("AudioManager: 플레이어 해제 실패", error);
  }
}

export function AudioManagerProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  /** 사운드 키 → 상주 플레이어 */
  const poolRef = useRef<Map<string, AudioPlayer>>(new Map());
  /**
   * 예열 **되돌리기 타이머.** 키마다 하나.
   *
   * 예열 중에 그 악기를 실제로 치면 이 타이머를 먼저 끊는다. 안 끊으면 뒤늦게 도는 `pause()`가
   * 막 시작한 타격을 잘라 **그 한 번이 무음**이 된다 — 예열이 증상을 고치는 대신 만든다.
   */
  const warmUpTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  /** 예열이 끝난(= AudioTrack이 만들어진) 키. 재진입 때 다시 예열하지 않는다 */
  const warmedKeysRef = useRef<Set<string>>(new Set());
  const currentTabRef = useRef<string>("");

  /**
   * `doNotMix` = 훈련 중에는 바깥 앱(유튜브·음악 등) 소리를 끊는다.
   * 청각 훈련 중 바깥 소리가 섞이면 훈련이 오염되고 기록값도 믿을 수 없다는 판단이다.
   * 앱 **안**의 소리끼리는 이 설정과 무관하게 같이 난다.
   *
   * `미검증`: `doNotMix`와 `AudioContext`(합성 엔진)를 한 앱에서 같이 쓴 실기기.
   * 정본 §5.2 · §7.
   */
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "doNotMix",
    }).catch((error) =>
      console.warn("AudioManager: 오디오 모드 설정 실패", error),
    );
  }, []);

  const getPlayer = useCallback(
    (soundKey: string, source: AudioSource): AudioPlayer => {
      const pooled = poolRef.current.get(soundKey);
      if (pooled) {
        return pooled;
      }

      const player = createAudioPlayer(source);
      poolRef.current.set(soundKey, player);
      return player;
    },
    [],
  );

  /** 예열 타이머를 끊고 음소거를 되돌린다. 예열의 흔적을 남기지 않는 유일한 출구다. */
  const cancelWarmUp = useCallback((soundKey: string) => {
    const timer = warmUpTimersRef.current.get(soundKey);
    if (timer === undefined) {
      return;
    }
    clearTimeout(timer);
    warmUpTimersRef.current.delete(soundKey);

    const player = poolRef.current.get(soundKey);
    if (!player) {
      return;
    }
    try {
      player.muted = false;
    } catch (error) {
      console.warn(`AudioManager: ${soundKey} 음소거 해제 실패`, error);
    }
  }, []);

  /**
   * **플레이어별 AudioTrack 예열 — 키마다 딱 한 번.**
   *
   * 프리로드(`createAudioPlayer`)가 네이티브에서 하는 일은 `setMediaSource()` + `prepare()`,
   * 즉 **미디어 준비까지**다. 출력 경로(ExoPlayer의 AudioTrack)는 그 플레이어를 **처음 재생할 때**
   * 비로소 만들어진다. 드럼 샘플은 전부 0.5초라 그 생성 지연이 샘플을 통째로 먹어 첫 타격이
   * "아무 소리도 안 난 것"으로 들렸다.
   *
   * 그래서 프리로드 직후 **음소거로 0.25초만** 흘려 싱크를 열어 둔다. 끝까지 재생해
   * `didJustFinish`를 기다리지 않는 이유: 그 이벤트가 브리지를 건너오는 사이에 사용자가 그 악기를
   * 치면 뒤늦은 `pause()`가 막 시작한 타격을 끊는다. 되돌리기는 **취소 가능한 타이머로만** 하고,
   * 실제 타격이 들어오면 `playSound`가 `cancelWarmUp`으로 먼저 끊는다.
   *
   * 예열이 없애는 것은 AudioTrack **생성** 비용뿐이다. 몇 초 쉬면 출력 스트림이 다시 standby로
   * 내려가고 오디오 포커스도 반납되는데, 그쪽은 `useOutputKeepAlive()`가 맡는다.
   */
  const warmUpPlayer = useCallback((soundKey: string) => {
    const player = poolRef.current.get(soundKey);
    if (!player || warmedKeysRef.current.has(soundKey)) {
      return;
    }

    // 기다림은 안쪽 함수로 재귀한다 — `useCallback` 값이 자기 자신을 참조하면
    // React Compiler 린트(react-hooks/immutability)가 막는다.
    const run = (attempt: number): void => {
      if (warmedKeysRef.current.has(soundKey)) {
        return; // 기다리는 사이에 실제로 쳤다 — 그 타격이 곧 예열이다
      }

      // 로드 전에도 `play()`는 버려지지 않는다(ExoPlayer가 playWhenReady를 걸어 둔다).
      // 다만 예열은 실제로 소리를 흘려보내야 뜻이 있으므로 READY가 될 때까지 기다린다.
      if (!player.isLoaded) {
        if (attempt >= LOAD_POLL_LIMIT) {
          return;
        }
        warmUpTimersRef.current.set(
          soundKey,
          setTimeout(() => {
            warmUpTimersRef.current.delete(soundKey);
            run(attempt + 1);
          }, LOAD_POLL_MS),
        );
        return;
      }

      try {
        player.muted = true;
        player.play();
      } catch (error) {
        console.warn(`AudioManager: ${soundKey} 예열 실패`, error);
        try {
          player.muted = false;
        } catch {
          /* 다음 타격의 cancelWarmUp이 다시 시도한다 */
        }
        return;
      }

      warmedKeysRef.current.add(soundKey);
      warmUpTimersRef.current.set(
        soundKey,
        setTimeout(() => {
          warmUpTimersRef.current.delete(soundKey);
          try {
            player.pause();
            void player.seekTo(0).catch(() => {});
            player.muted = false;
          } catch (error) {
            console.warn(`AudioManager: ${soundKey} 예열 되돌리기 실패`, error);
          }
        }, WARM_UP_PLAY_MS),
      );
    };

    run(0);
  }, []);

  const preloadSounds = useCallback(
    (entries: readonly SoundEntry[]) => {
      for (const { key, source } of entries) {
        try {
          const created = getPlayer(key, source);
          warmUpPlayer(key);
          // 임시 진단 로그 (원인 확정 후 제거). 개발 빌드에서 에셋은 Metro가 http로 주므로
          // 로드가 네트워크에 걸린다 — 1초 뒤에도 ready가 아니면 그게 원인이다.
          if (__DEV__) {
            console.log(`[DRUMDBG] preload ${key} src=${JSON.stringify(source)}`);
            setTimeout(() => {
              console.log(
                `[DRUMDBG] preload+1s ${key} ` +
                  JSON.stringify(created.currentStatus),
              );
            }, 1000);
          }
        } catch (error) {
          console.warn(`AudioManager: ${key} 프리로드 실패`, error);
        }
      }
    },
    [getPlayer, warmUpPlayer],
  );

  const playSound = useCallback(
    (soundKey: string, source: AudioSource) => {
      try {
        const player = getPlayer(soundKey, source);

        // 예열이 돌고 있으면 **먼저 끊는다.** 뒤늦은 되돌리기 `pause()`가 이 타격을 자르는 것을
        // 막고, 음소거도 여기서 풀린다. 이 키는 더 예열하지 않는다(실제 타격이 곧 예열이다).
        cancelWarmUp(soundKey);
        warmedKeysRef.current.add(soundKey);

        // 재생 중이어도 겹치지 않고 처음부터 다시 (↻ 다시 듣기가 이 경로를 탄다).
        // 한 번 끝까지 난 플레이어는 ExoPlayer STATE_ENDED에 머무는데, 이 `seekTo(0)`가
        // 그 상태를 READY로 되돌린다 — 두 번째 타격부터 무음이 되지 않는 이유다.
        //
        // `주의`: 여기서 `player.isLoaded`를 보고 분기하지 말 것. 네이티브 `isLoaded`는
        // `playbackState == STATE_READY`라서 **한 번 울린 플레이어는 계속 false**이고(ENDED),
        // 그 상태를 "아직 로드 안 됐다"로 읽으면 멀쩡한 악기를 영구 무음으로 만든다.
        // 로드 전 `play()`도 버려지지 않는다 — ExoPlayer가 playWhenReady를 걸어 두고
        // READY가 되면 알아서 낸다.
        void player.seekTo(0).catch(() => {});
        player.play();

        // 임시 진단 로그 (원인 확정 후 제거).
        // `play()` 직후의 동기 읽기는 아직 메인 스레드에 반영되기 전이라 뜻이 없다.
        // 300ms 뒤 **전체 상태**를 본다 — playbackState(idle/buffering/ready/ended)와 error가 답이다.
        if (__DEV__) {
          setTimeout(() => {
            console.log(
              `[DRUMDBG] +300ms ${soundKey} ` +
                JSON.stringify(player.currentStatus),
            );
          }, 300);
        }
      } catch (error) {
        console.warn(`AudioManager: ${soundKey} 재생 실패`, error);
      }
    },
    [getPlayer, cancelWarmUp],
  );

  /** 재생만 멈춘다. 상주 플레이어는 유지해 재진입 시 즉시 반응하도록 한다. */
  const stopAllSounds = useCallback(() => {
    // 예열 타이머를 모두 끊는다 — 안 그러면 떠난 화면에서 뒤늦게 pause·음소거가 돌아간다.
    for (const soundKey of [...warmUpTimersRef.current.keys()]) {
      cancelWarmUp(soundKey);
    }
    for (const player of poolRef.current.values()) {
      try {
        player.pause();
        void player.seekTo(0).catch(() => {});
      } catch (error) {
        console.warn("AudioManager: 재생 중지 실패", error);
      }
    }
  }, [cancelWarmUp]);

  /**
   * 앱 전역 오디오 게이트 — **백그라운드/포그라운드 한 쌍.**
   *
   * `setIsAudioActiveAsync`는 앱 전역 플래그 하나라, 끄는 곳과 켜는 곳이 갈리면
   * 한쪽 화면이 다른 탭까지 통째로 무음으로 만든다(`audioFocus.ts` 주석 참고).
   * 그래서 **여기 한 곳에서만** 다룬다 — 화면·세션은 이 함수를 부르지 않는다.
   *
   * 백그라운드에서는 합성 엔진(`pureTone`·`amTone`)과 TTS도 같이 끊는다.
   * 이 둘은 expo-audio가 아니라 `shouldPlayInBackground: false`가 닿지 않는다 —
   * 홈 버튼을 눌러도 순음이 계속 나가던 경로가 여기였다.
   *
   * `inactive`는 안드로이드에서 자주 오지는 않지만(알림창을 내릴 때 등) 끊는 쪽이
   * 안전하므로 같이 처리한다. 다시 `active`가 되면 되살린다.
   *
   * **세션 진행을 멈추는 일은 여기서 하지 않는다** — 소리만 끊는다.
   * 문항이 혼자 넘어가지 않게 하는 것은 각 세션 화면의 `use-pause-on-background.ts`.
   */
  useEffect(() => {
    const handleChange = (next: AppStateStatus) => {
      if (next === "active") {
        void setHearingAudioActive(true);
        // 백그라운드에서 껐던 킵얼라이브를, 붙잡은 화면이 남아 있으면 되살린다
        setOutputKeepAliveSuspended(false);
        return;
      }
      void stopAllHearingAudio();
      stopAllSounds();
      setOutputKeepAliveSuspended(true);
      void setHearingAudioActive(false);
    };

    const sub = AppState.addEventListener("change", handleChange);
    return () => {
      sub.remove();
      // 정리 시 전역 플래그는 켠 채로 돌려 놓는다(꺼진 채 남으면 앱 전체가 무음).
      void setHearingAudioActive(true);
    };
  }, [stopAllSounds]);

  const setCurrentTab = useCallback(
    (newTab: string) => {
      if (currentTabRef.current === newTab) {
        return;
      }
      stopAllSounds();
      currentTabRef.current = newTab;
    },
    [stopAllSounds],
  );

  const isPlaying = useCallback(
    (soundKey: string): boolean =>
      poolRef.current.get(soundKey)?.playing ?? false,
    [],
  );

  // 앱 종료 시 전체 해제
  useEffect(() => {
    const pool = poolRef.current;

    return () => {
      for (const player of pool.values()) {
        releasePlayer(player);
      }
      pool.clear();
      releaseOutputKeepAlivePlayer();
    };
  }, []);

  const value = useMemo(
    () => ({
      preloadSounds,
      playSound,
      stopAllSounds,
      getCurrentTab: () => currentTabRef.current,
      setCurrentTab,
      isPlaying,
    }),
    [preloadSounds, playSound, stopAllSounds, setCurrentTab, isPlaying],
  );

  return (
    <AudioManagerContext.Provider value={value}>
      {children}
    </AudioManagerContext.Provider>
  );
}

export function useAudioManager(): AudioManagerValue {
  const context = useContext(AudioManagerContext);
  if (!context) {
    throw new Error("useAudioManager는 AudioManagerProvider 안에서만 쓴다");
  }
  return context;
}
