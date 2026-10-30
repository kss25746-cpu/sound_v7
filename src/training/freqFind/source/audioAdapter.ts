import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";
import { playPureTone, stopPureTone } from "@/audio/pureTone";
import { stopAmTone } from "@/audio/amTone";
import {
  stopAllHearingAudio,
  registerAudioStopper,
} from "@/audio/audioFocus";
import { hasWordAudio, getWordAudio } from "./wordAudioAssets";

export interface AudioEngine {
  init?: () => Promise<void>;
  playTone?: (hz: number, level: number, ms: number) => Promise<void>;
  playWord?: (word: string, level?: number) => Promise<void>;
  stop?: () => Promise<void> | void;
}

let engine: AudioEngine | null = null;

/** 소리 찾기 재생에 곱하는 고정값. 폰 음량과는 별개다. */
const BASE_VOLUME = 0.6;

let wordPlayer: AudioPlayer | null = null;
let wordPlayGen = 0;
let wordTimer: ReturnType<typeof setTimeout> | null = null;
let pendingWordResolve: (() => void) | null = null;

export function ensureWordPlayer(): AudioPlayer {
  if (!wordPlayer) {
    wordPlayer = createAudioPlayer(null, { updateInterval: 100 });
  }
  return wordPlayer;
}

function resolvePendingWord(): void {
  if (wordTimer !== null) {
    clearTimeout(wordTimer);
    wordTimer = null;
  }
  const resolve = pendingWordResolve;
  pendingWordResolve = null;
  resolve?.();
}

export function stopWordAudio(): void {
  wordPlayGen += 1;
  wordPlayer?.pause();
  resolvePendingWord();
}

// 오디오 포커스 중단 시스템에 단어 플레이어 스토퍼 등록
registerAudioStopper(stopWordAudio);

export function setEngine(impl: AudioEngine | null): void {
  engine = impl;
}

/** 1단계 순음 게인. `level`(문항 크기) × 0.6 × 0.25, 0.02~0.35. */
function calibratedToneGain(level: number, volume: number): number {
  return Math.max(0.02, Math.min(0.35, level * volume * 0.25));
}

const wait = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

export interface PlayToneParams {
  hz: number;
  level?: number;
  ms?: number;
  pan?: number;
}

export interface PlayWordOptions {
  level?: number;
}

export const audio = {
  async init(): Promise<void> {
    // 오디오 모드(setAudioModeAsync)는 앱 시작 때 `AudioManagerProvider`가 한 번만 건다.
    // 여기서 다시 걸면 설정 지점이 둘로 갈린다 — `_layout.tsx` 주석의 규칙.
    if (engine?.init) return engine.init();
  },

  async playTone({ hz, level = 1, ms = 1000, pan }: PlayToneParams): Promise<void> {
    if (engine?.playTone) return engine.playTone(hz, level, ms);
    if (__DEV__) console.log(`[audio] tone ${hz}Hz lv${level} pan${pan ?? 0} (${ms}ms)`);
    try {
      // level 0~1 relative range multiplied by the fixed 0.6
      const gain = calibratedToneGain(level, BASE_VOLUME);
      await playPureTone({
        frequencyHz: hz,
        gain,
        durationSec: ms / 1000,
        pan,
      });
    } catch (e) {
      if (__DEV__) console.warn("[audio] playTone failed, fallback to wait", e);
      await wait(ms);
    }
  },

  async playWord(word: string, { level = 1 }: PlayWordOptions = {}): Promise<void> {
    if (engine?.playWord) return engine.playWord(word, level);
    if (__DEV__) console.log(`[audio] word "${word}" lv${level} (baseVol=${BASE_VOLUME})`);

    const effectiveVolume = Math.max(0.1, Math.min(1.0, level * BASE_VOLUME));

    // 1. 사전 녹음된 음원이 등록되어 있으면 expo-audio로 지연 없이 고품질 재생
    if (hasWordAudio(word)) {
      stopWordAudio();
      const gen = wordPlayGen;
      // 전에는 여기서 `configureHearingAudioMode()` + `setHearingAudioActive(true)`를
      // 다시 걸었다. `audio.stop()`이 expo-audio 전역 스위치를 끈 채로 남겨서, 되살리지
      // 않으면 3·4단계가 무음이었기 때문이다. 그런데 그 전역 스위치는 이 탭만이 아니라
      // **앱 전체**를 끄던 것이라(소리 구분·문장 듣기·악기 탭 무음) `stopAllHearingAudio`
      // 에서 걷어냈다. 이제 전역 on/off는 `audio-manager.tsx`의 AppState 게이트가
      // 백그라운드/포그라운드 한 쌍으로만 다루므로 여기서 되살릴 것이 없다.
      // 오디오 모드도 앱 시작 때 `AudioManagerProvider`가 한 번만 건다.

      const player = ensureWordPlayer();
      const source = getWordAudio(word);
      if (!source) return;

      player.replace(source);
      try {
        player.volume = effectiveVolume;
      } catch {
        // volume setting fallback
      }
      if (player.seekTo) {
        await player.seekTo(0);
      }
      if (gen !== wordPlayGen) return;

      return new Promise<void>((resolve) => {
        let isDone = false;
        let subscription: { remove: () => void } | null = null;
        pendingWordResolve = () => {
          if (!isDone) {
            isDone = true;
            subscription?.remove();
            if (wordTimer !== null) {
              clearTimeout(wordTimer);
              wordTimer = null;
            }
            resolve();
          }
        };

        // 안전 타이머가 끝내면 소리도 끊는다. promise만 끝내면 화면은 「재생 끝」인데
        // 소리는 남아 다음 문항 위로 겹친다. 음원은 가장 긴 것도 1.01초(사탕·셔츠.wav)다.
        wordTimer = setTimeout(() => {
          if (gen === wordPlayGen) wordPlayer?.pause();
          resolvePendingWord();
        }, 2000);

        subscription = player.addListener(
          "playbackStatusUpdate",
          (status: any) => {
            if (gen !== wordPlayGen) {
              resolvePendingWord();
              return;
            }
            if (status.error) {
              if (__DEV__) console.warn("[audio] word audio error", status.error);
              resolvePendingWord();
              return;
            }
            if (status.didJustFinish) {
              resolvePendingWord();
            }
          }
        );

        player.play();
      });
    }

    // 2. 음원이 아직 없는 단어는 기존 TTS(expo-speech)로 안전하게 폴백
    return new Promise((resolve) => {
      let isDone = false;
      const finish = () => {
        if (!isDone) {
          isDone = true;
          resolve();
        }
      };
      // fallback safety timeout
      const timer = setTimeout(finish, 1600);

      try {
        Speech.speak(word, {
          language: "ko-KR",
          rate: 0.9,
          pitch: 1.0,
          volume: effectiveVolume,
          onDone: () => {
            clearTimeout(timer);
            finish();
          },
          onError: () => {
            clearTimeout(timer);
            finish();
          },
        });
      } catch (err) {
        clearTimeout(timer);
        if (__DEV__) console.warn("[audio] Speech.speak failed", err);
        finish();
      }
    });
  },

  async stop(): Promise<void> {
    stopWordAudio();
    if (engine?.stop) {
      await engine.stop();
      return;
    }
    try {
      await stopAllHearingAudio();
    } catch {
      stopPureTone();
      stopAmTone();
      Speech.stop();
    }
  },
};

