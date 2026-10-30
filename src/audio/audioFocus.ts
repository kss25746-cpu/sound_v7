import { setAudioModeAsync, setIsAudioActiveAsync } from "expo-audio";
import * as Speech from "expo-speech";
import { stopPureTone } from "@/audio/pureTone";
import { stopAmTone } from "@/audio/amTone";

/**
 * 청력 / 주파수 훈련 전용 오디오 포커스 모드 설정.
 *
 * - playsInSilentMode: true (무음 모드에서도 테스트 소리 정상 출력)
 * - interruptionMode: "doNotMix" (중요: 전화, 알림, 타 앱 소리와 섞이지 않고 배타적 오디오 포커스 획득 및 상호 일시정지)
 * - shouldPlayInBackground: false (백그라운드 진입 시 소리 자동 중단)
 */
export async function configureHearingAudioMode(): Promise<void> {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
      shouldPlayInBackground: false,
    });
  } catch (err) {
    if (__DEV__) {
      console.warn("[audioFocus] Failed to set audio mode:", err);
    }
  }
}

/**
 * expo-audio **전역** 오디오 서브시스템 on/off.
 *
 * `주의`: 이것은 화면·모듈 단위 스위치가 아니라 **앱 전역 플래그 하나**다.
 * 네이티브(`expo-audio/android/.../AudioModule.kt`)는 `audioEnabled` 변수 하나를 두고,
 * 꺼져 있으면 앱 안의 **모든** `AudioPlayer.play()`가 `Log.e("Audio has been disabled")`만
 * 남기고 조용히 반환한다. 예외도 콜백도 없어 **JS 쪽에서는 무음을 감지할 수 없다.**
 * 되돌리는 것도 이 함수뿐이다 — `setAudioModeAsync`는 이 값을 건드리지 않는다.
 *
 * 그래서 **끄는 곳과 켜는 곳이 반드시 한 쌍이어야 한다.** 부르는 곳은
 * `audio-manager.tsx`의 AppState 게이트 **한 곳뿐**이다(백그라운드 off / 포그라운드 on).
 * 화면·세션이 자기 소리를 멈추려고 이걸 부르면 **다른 탭까지 전부 무음**이 된다.
 * 화면 단위 정지는 `stopAllHearingAudio()`나 각 모듈의 stop 함수를 쓸 것.
 *
 * 경위: 소리 찾기가 `stopAllHearingAudio()` 안에서 이걸 껐다가 켜지 않아
 * 소리 구분·문장 듣기·악기 탭이 통째로 무음이 됐다(2026-09-23 수정).
 */
export async function setHearingAudioActive(active: boolean): Promise<void> {
  try {
    await setIsAudioActiveAsync(active);
  } catch (err) {
    if (__DEV__) {
      console.warn(`[audioFocus] Failed to set audio active (${active}):`, err);
    }
  }
}

type AudioStopper = () => void | Promise<void>;
const registeredStoppers = new Set<AudioStopper>();

/**
 * 특정 모듈이나 세션이 소리 중단 콜백을 등록할 수 있는 레지스트리.
 */
export function registerAudioStopper(stopper: AudioStopper): () => void {
  registeredStoppers.add(stopper);
  return () => {
    registeredStoppers.delete(stopper);
  };
}

/**
 * 지금 나고 있는 청력 관련 소리를 모두 끊는다.
 * 순음(PureTone) · 변조음(AmTone) · TTS · 등록된 모듈별 스토퍼.
 *
 * `주의`: **전역 스위치(`setHearingAudioActive`)는 건드리지 않는다.** 이 함수는 화면 이탈·
 * 단계 전환처럼 자주 불리는 경로에 걸려 있어서, 여기서 전역을 끄면 다른 탭이 통째로
 * 무음이 된다(2026-09-23 이전 실제 버그). 전역 on/off는 `audio-manager.tsx`의
 * AppState 게이트가 백그라운드/포그라운드 한 쌍으로만 다룬다.
 */
export async function stopAllHearingAudio(): Promise<void> {
  // 1. 네이티브 오디오 API 순음 즉시 컷
  try {
    stopPureTone();
  } catch {
    // ignore
  }

  // 2. AM 변조음 즉시 컷
  try {
    stopAmTone();
  } catch {
    // ignore
  }

  // 3. TTS 음성 즉시 컷
  try {
    Speech.stop();
  } catch {
    // ignore
  }

  // 4. 등록된 모듈별 스토퍼 실행 (ling6, inst, freq wordAudio 등)
  for (const stopper of registeredStoppers) {
    try {
      const res = stopper();
      if (res && typeof (res as Promise<void>).then === "function") {
        await res;
      }
    } catch {
      // ignore
    }
  }
}
