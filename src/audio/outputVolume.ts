import { requireOptionalNativeModule, type NativeModule } from "expo";

/**
 * 미디어 볼륨 감쇠(dB) — 로컬 네이티브 모듈 `modules/output-volume`의 JS 쪽.
 *
 * 0이 최대 볼륨, 내릴수록 음수(예: 중간 볼륨 USB 이어폰 ≈ −25dB).
 * 모듈이 없거나(빌드 전 · 테스트) 값을 못 읽으면 `null`이다. 쓰는 쪽은 `null`을 안전한 쪽으로 다룬다.
 */
type OutputVolumeEvents = {
  onChange: (event: { db: number | null }) => void;
};

declare class OutputVolumeModule extends NativeModule<OutputVolumeEvents> {
  getMusicVolumeDb(): number | null;
}

const native = requireOptionalNativeModule<OutputVolumeModule>("OutputVolume");

export function getMusicVolumeDb(): number | null {
  try {
    return native?.getMusicVolumeDb() ?? null;
  } catch {
    return null;
  }
}

/** 볼륨이나 출력 장치가 바뀌면 새 감쇠 dB로 부른다. 돌려받은 함수로 끊는다. */
export function subscribeMusicVolumeDb(listener: (db: number | null) => void): () => void {
  if (!native) {
    return () => {};
  }
  const subscription = native.addListener("onChange", (event) => listener(event.db));
  return () => subscription.remove();
}
