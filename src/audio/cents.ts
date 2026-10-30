/** cent → 주파수 비. 1200 cent = 1 옥타브. */
export function centsToRatio(cents: number): number {
  return 2 ** (cents / 1200);
}

/** 기준 Hz에 cent 차를 적용한 주파수. */
export function hzFromCents(referenceHz: number, cents: number): number {
  return referenceHz * centsToRatio(cents);
}

/**
 * `hzFromCents`의 별칭. HarmoniTune `pitchUtils.centsToFreq`를 흡수한 것(§4-3).
 * 수식이 동일(`base * 2^(cents/1200)`)해 새 구현 없이 이름만 잇는다.
 */
export function centsToFreq(baseHz: number, cents: number): number {
  return hzFromCents(baseHz, cents);
}

/**
 * 주파수를 허용 대역으로 자른다. (HarmoniTune `pitchUtils.clampFreq` 흡수)
 *
 * 한도는 호출부가 넘긴다 — 이 모듈이 트레이닝 상수(AUDIO)를 역참조하지 않도록.
 */
export function clampFreq(
  hz: number,
  minHz: number,
  maxHz: number,
): { clamped: number; wasOverLimit: boolean } {
  if (hz < minHz) {
    return { clamped: minHz, wasOverLimit: true };
  }
  if (hz > maxHz) {
    return { clamped: maxHz, wasOverLimit: true };
  }
  return { clamped: hz, wasOverLimit: false };
}
