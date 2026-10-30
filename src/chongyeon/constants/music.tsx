import type { Difficulty, Note } from '../types/music';

export type SoundPreset = 'preset1' | 'preset2' | 'preset3' | 'preset4' | 'preset5';

/**
 * 음원 프리셋. **화면에 보이는 순서가 이 배열 순서다.**
 *
 * 순서는 **`preset1~5` 그대로**(= 옛 라벨 `-50% ~ +50%`의 순서)다.
 * 한때 밝기 실측 순(`preset1,2,4,3,5`)으로 세웠다가 **되돌렸다** —
 * 실기기에서 들어보니 **옛 순서가 맞았다**(사용자 청취, 2026-09-17).
 *
 * | 라벨 | id | 밝기(스펙트럼 중심) | 옛 라벨 |
 * |---|---|---|---|
 * | 1번 | `preset1` | 1257 Hz | -50% |
 * | 2번 | `preset2` | 1350 Hz | -25% |
 * | 3번 | `preset3` | 2002 Hz | 0%  ← 기본값 |
 * | 4번 | `preset4` | 1795 Hz | +25% |
 * | 5번 | `preset5` | 2110 Hz | +50% |
 *
 * `주의` **3번·4번의 밝기 숫자가 뒤집혀 보인다.** 그래도 순서는 이대로 둔다.
 * 측정 쪽 전제(「업로드 순서 = preset 번호 순서」)가 틀렸을 수 있고,
 * 그때는 저 두 값이 서로 바뀐다 → `docs/음원프리셋-작업기록.md`.
 * **귀가 이긴 자리다.**
 *
 * 라벨이 `-50%`류가 아닌 이유는 그건 **음량을 뜻하는데 음량은 안 변하기**
 * 때문이다(5개가 0.2 dB 안에서 같다 — 이 측정은 순서와 무관하게 유효하다).
 * 2글자로 줄인 이유는 폭이다. 제어반에서 이 칸의 몫이 모드마다 달라
 * 자연 연주 모드에서는 훈련 모드의 약 58%밖에 안 된다
 * (→ `MusicTrainingScreen`의 `soundPresetRow`).
 */
export const soundPresets: { id: SoundPreset; label: string }[] = [
  { id: 'preset1', label: '1번' },
  { id: 'preset2', label: '2번' },
  { id: 'preset3', label: '3번' },
  { id: 'preset4', label: '4번' },
  { id: 'preset5', label: '5번' },
];

export const presetSoundFiles: Record<SoundPreset, { [key in Note]: any }> = {
  preset1: {
    'C1': require('@/assets/chongyeon/sounds/piano_mp4/preset1/C1.mp3'), 'C#1': require('@/assets/chongyeon/sounds/piano_mp4/preset1/C_sharp1.mp3'),
    'D1': require('@/assets/chongyeon/sounds/piano_mp4/preset1/D1.mp3'), 'D#1': require('@/assets/chongyeon/sounds/piano_mp4/preset1/D_sharp1.mp3'),
    'E1': require('@/assets/chongyeon/sounds/piano_mp4/preset1/E1.mp3'), 'F1': require('@/assets/chongyeon/sounds/piano_mp4/preset1/F1.mp3'),
    'F#1': require('@/assets/chongyeon/sounds/piano_mp4/preset1/F_sharp1.mp3'), 'G1': require('@/assets/chongyeon/sounds/piano_mp4/preset1/G1.mp3'),
    'G#1': require('@/assets/chongyeon/sounds/piano_mp4/preset1/G_sharp1.mp3'), 'A1': require('@/assets/chongyeon/sounds/piano_mp4/preset1/A1.mp3'),
    'A#1': require('@/assets/chongyeon/sounds/piano_mp4/preset1/A_sharp1.mp3'), 'B1': require('@/assets/chongyeon/sounds/piano_mp4/preset1/B1.mp3'),
    'C2': require('@/assets/chongyeon/sounds/piano_mp4/preset1/C2.mp3'), 'C#2': require('@/assets/chongyeon/sounds/piano_mp4/preset1/C_sharp2.mp3'),
    'D2': require('@/assets/chongyeon/sounds/piano_mp4/preset1/D2.mp3'), 'D#2': require('@/assets/chongyeon/sounds/piano_mp4/preset1/D_sharp2.mp3'),
    'E2': require('@/assets/chongyeon/sounds/piano_mp4/preset1/E2.mp3'), 'F2': require('@/assets/chongyeon/sounds/piano_mp4/preset1/F2.mp3'),
    'F#2': require('@/assets/chongyeon/sounds/piano_mp4/preset1/F_sharp2.mp3'), 'G2': require('@/assets/chongyeon/sounds/piano_mp4/preset1/G2.mp3'),
    'G#2': require('@/assets/chongyeon/sounds/piano_mp4/preset1/G_sharp2.mp3'), 'A2': require('@/assets/chongyeon/sounds/piano_mp4/preset1/A2.mp3'),
    'A#2': require('@/assets/chongyeon/sounds/piano_mp4/preset1/A_sharp2.mp3'), 'B2': require('@/assets/chongyeon/sounds/piano_mp4/preset1/B2.mp3'),
    'C3': require('@/assets/chongyeon/sounds/piano_mp4/preset1/C3.mp3'), 'C#3': require('@/assets/chongyeon/sounds/piano_mp4/preset1/C_sharp3.mp3'),
    'D3': require('@/assets/chongyeon/sounds/piano_mp4/preset1/D3.mp3'), 'D#3': require('@/assets/chongyeon/sounds/piano_mp4/preset1/D_sharp3.mp3'),
    'E3': require('@/assets/chongyeon/sounds/piano_mp4/preset1/E3.mp3'), 'F3': require('@/assets/chongyeon/sounds/piano_mp4/preset1/F3.mp3'),
    'F#3': require('@/assets/chongyeon/sounds/piano_mp4/preset1/F_sharp3.mp3'), 'G3': require('@/assets/chongyeon/sounds/piano_mp4/preset1/G3.mp3'),
    'G#3': require('@/assets/chongyeon/sounds/piano_mp4/preset1/G_sharp3.mp3'), 'A3': require('@/assets/chongyeon/sounds/piano_mp4/preset1/A3.mp3'),
    'A#3': require('@/assets/chongyeon/sounds/piano_mp4/preset1/A_sharp3.mp3'), 'B3': require('@/assets/chongyeon/sounds/piano_mp4/preset1/B3.mp3'),
    'C4': require('@/assets/chongyeon/sounds/piano_mp4/preset1/C4.mp3'), 'C#4': require('@/assets/chongyeon/sounds/piano_mp4/preset1/C_sharp4.mp3'),
    'D4': require('@/assets/chongyeon/sounds/piano_mp4/preset1/D4.mp3'), 'D#4': require('@/assets/chongyeon/sounds/piano_mp4/preset1/D_sharp4.mp3'),
    'E4': require('@/assets/chongyeon/sounds/piano_mp4/preset1/E4.mp3'), 'F4': require('@/assets/chongyeon/sounds/piano_mp4/preset1/F4.mp3'),
    'F#4': require('@/assets/chongyeon/sounds/piano_mp4/preset1/F_sharp4.mp3'), 'G4': require('@/assets/chongyeon/sounds/piano_mp4/preset1/G4.mp3'),
    'G#4': require('@/assets/chongyeon/sounds/piano_mp4/preset1/G_sharp4.mp3'), 'A4': require('@/assets/chongyeon/sounds/piano_mp4/preset1/A4.mp3'),
    'A#4': require('@/assets/chongyeon/sounds/piano_mp4/preset1/A_sharp4.mp3'), 'B4': require('@/assets/chongyeon/sounds/piano_mp4/preset1/B4.mp3'),
    'C5': require('@/assets/chongyeon/sounds/piano_mp4/preset1/C5.mp3'), 'C#5': require('@/assets/chongyeon/sounds/piano_mp4/preset1/C_sharp5.mp3'),
    'D5': require('@/assets/chongyeon/sounds/piano_mp4/preset1/D5.mp3'), 'D#5': require('@/assets/chongyeon/sounds/piano_mp4/preset1/D_sharp5.mp3'),
  },
  preset2: {
    'C1': require('@/assets/chongyeon/sounds/piano_mp4/preset2/C1.mp3'), 'C#1': require('@/assets/chongyeon/sounds/piano_mp4/preset2/C_sharp1.mp3'),
    'D1': require('@/assets/chongyeon/sounds/piano_mp4/preset2/D1.mp3'), 'D#1': require('@/assets/chongyeon/sounds/piano_mp4/preset2/D_sharp1.mp3'),
    'E1': require('@/assets/chongyeon/sounds/piano_mp4/preset2/E1.mp3'), 'F1': require('@/assets/chongyeon/sounds/piano_mp4/preset2/F1.mp3'),
    'F#1': require('@/assets/chongyeon/sounds/piano_mp4/preset2/F_sharp1.mp3'), 'G1': require('@/assets/chongyeon/sounds/piano_mp4/preset2/G1.mp3'),
    'G#1': require('@/assets/chongyeon/sounds/piano_mp4/preset2/G_sharp1.mp3'), 'A1': require('@/assets/chongyeon/sounds/piano_mp4/preset2/A1.mp3'),
    'A#1': require('@/assets/chongyeon/sounds/piano_mp4/preset2/A_sharp1.mp3'), 'B1': require('@/assets/chongyeon/sounds/piano_mp4/preset2/B1.mp3'),
    'C2': require('@/assets/chongyeon/sounds/piano_mp4/preset2/C2.mp3'), 'C#2': require('@/assets/chongyeon/sounds/piano_mp4/preset2/C_sharp2.mp3'),
    'D2': require('@/assets/chongyeon/sounds/piano_mp4/preset2/D2.mp3'), 'D#2': require('@/assets/chongyeon/sounds/piano_mp4/preset2/D_sharp2.mp3'),
    'E2': require('@/assets/chongyeon/sounds/piano_mp4/preset2/E2.mp3'), 'F2': require('@/assets/chongyeon/sounds/piano_mp4/preset2/F2.mp3'),
    'F#2': require('@/assets/chongyeon/sounds/piano_mp4/preset2/F_sharp2.mp3'), 'G2': require('@/assets/chongyeon/sounds/piano_mp4/preset2/G2.mp3'),
    'G#2': require('@/assets/chongyeon/sounds/piano_mp4/preset2/G_sharp2.mp3'), 'A2': require('@/assets/chongyeon/sounds/piano_mp4/preset2/A2.mp3'),
    'A#2': require('@/assets/chongyeon/sounds/piano_mp4/preset2/A_sharp2.mp3'), 'B2': require('@/assets/chongyeon/sounds/piano_mp4/preset2/B2.mp3'),
    'C3': require('@/assets/chongyeon/sounds/piano_mp4/preset2/C3.mp3'), 'C#3': require('@/assets/chongyeon/sounds/piano_mp4/preset2/C_sharp3.mp3'),
    'D3': require('@/assets/chongyeon/sounds/piano_mp4/preset2/D3.mp3'), 'D#3': require('@/assets/chongyeon/sounds/piano_mp4/preset2/D_sharp3.mp3'),
    'E3': require('@/assets/chongyeon/sounds/piano_mp4/preset2/E3.mp3'), 'F3': require('@/assets/chongyeon/sounds/piano_mp4/preset2/F3.mp3'),
    'F#3': require('@/assets/chongyeon/sounds/piano_mp4/preset2/F_sharp3.mp3'), 'G3': require('@/assets/chongyeon/sounds/piano_mp4/preset2/G3.mp3'),
    'G#3': require('@/assets/chongyeon/sounds/piano_mp4/preset2/G_sharp3.mp3'), 'A3': require('@/assets/chongyeon/sounds/piano_mp4/preset2/A3.mp3'),
    'A#3': require('@/assets/chongyeon/sounds/piano_mp4/preset2/A_sharp3.mp3'), 'B3': require('@/assets/chongyeon/sounds/piano_mp4/preset2/B3.mp3'),
    'C4': require('@/assets/chongyeon/sounds/piano_mp4/preset2/C4.mp3'), 'C#4': require('@/assets/chongyeon/sounds/piano_mp4/preset2/C_sharp4.mp3'),
    'D4': require('@/assets/chongyeon/sounds/piano_mp4/preset2/D4.mp3'), 'D#4': require('@/assets/chongyeon/sounds/piano_mp4/preset2/D_sharp4.mp3'),
    'E4': require('@/assets/chongyeon/sounds/piano_mp4/preset2/E4.mp3'), 'F4': require('@/assets/chongyeon/sounds/piano_mp4/preset2/F4.mp3'),
    'F#4': require('@/assets/chongyeon/sounds/piano_mp4/preset2/F_sharp4.mp3'), 'G4': require('@/assets/chongyeon/sounds/piano_mp4/preset2/G4.mp3'),
    'G#4': require('@/assets/chongyeon/sounds/piano_mp4/preset2/G_sharp4.mp3'), 'A4': require('@/assets/chongyeon/sounds/piano_mp4/preset2/A4.mp3'),
    'A#4': require('@/assets/chongyeon/sounds/piano_mp4/preset2/A_sharp4.mp3'), 'B4': require('@/assets/chongyeon/sounds/piano_mp4/preset2/B4.mp3'),
    'C5': require('@/assets/chongyeon/sounds/piano_mp4/preset2/C5.mp3'), 'C#5': require('@/assets/chongyeon/sounds/piano_mp4/preset2/C_sharp5.mp3'),
    'D5': require('@/assets/chongyeon/sounds/piano_mp4/preset2/D5.mp3'), 'D#5': require('@/assets/chongyeon/sounds/piano_mp4/preset2/D_sharp5.mp3'),
  },
  preset3: {
    'C1': require('@/assets/chongyeon/sounds/piano_mp4/preset3/C1.mp3'), 'C#1': require('@/assets/chongyeon/sounds/piano_mp4/preset3/C_sharp1.mp3'),
    'D1': require('@/assets/chongyeon/sounds/piano_mp4/preset3/D1.mp3'), 'D#1': require('@/assets/chongyeon/sounds/piano_mp4/preset3/D_sharp1.mp3'),
    'E1': require('@/assets/chongyeon/sounds/piano_mp4/preset3/E1.mp3'), 'F1': require('@/assets/chongyeon/sounds/piano_mp4/preset3/F1.mp3'),
    'F#1': require('@/assets/chongyeon/sounds/piano_mp4/preset3/F_sharp1.mp3'), 'G1': require('@/assets/chongyeon/sounds/piano_mp4/preset3/G1.mp3'),
    'G#1': require('@/assets/chongyeon/sounds/piano_mp4/preset3/G_sharp1.mp3'), 'A1': require('@/assets/chongyeon/sounds/piano_mp4/preset3/A1.mp3'),
    'A#1': require('@/assets/chongyeon/sounds/piano_mp4/preset3/A_sharp1.mp3'), 'B1': require('@/assets/chongyeon/sounds/piano_mp4/preset3/B1.mp3'),
    'C2': require('@/assets/chongyeon/sounds/piano_mp4/preset3/C2.mp3'), 'C#2': require('@/assets/chongyeon/sounds/piano_mp4/preset3/C_sharp2.mp3'),
    'D2': require('@/assets/chongyeon/sounds/piano_mp4/preset3/D2.mp3'), 'D#2': require('@/assets/chongyeon/sounds/piano_mp4/preset3/D_sharp2.mp3'),
    'E2': require('@/assets/chongyeon/sounds/piano_mp4/preset3/E2.mp3'), 'F2': require('@/assets/chongyeon/sounds/piano_mp4/preset3/F2.mp3'),
    'F#2': require('@/assets/chongyeon/sounds/piano_mp4/preset3/F_sharp2.mp3'), 'G2': require('@/assets/chongyeon/sounds/piano_mp4/preset3/G2.mp3'),
    'G#2': require('@/assets/chongyeon/sounds/piano_mp4/preset3/G_sharp2.mp3'), 'A2': require('@/assets/chongyeon/sounds/piano_mp4/preset3/A2.mp3'),
    'A#2': require('@/assets/chongyeon/sounds/piano_mp4/preset3/A_sharp2.mp3'), 'B2': require('@/assets/chongyeon/sounds/piano_mp4/preset3/B2.mp3'),
    'C3': require('@/assets/chongyeon/sounds/piano_mp4/preset3/C3.mp3'), 'C#3': require('@/assets/chongyeon/sounds/piano_mp4/preset3/C_sharp3.mp3'),
    'D3': require('@/assets/chongyeon/sounds/piano_mp4/preset3/D3.mp3'), 'D#3': require('@/assets/chongyeon/sounds/piano_mp4/preset3/D_sharp3.mp3'),
    'E3': require('@/assets/chongyeon/sounds/piano_mp4/preset3/E3.mp3'), 'F3': require('@/assets/chongyeon/sounds/piano_mp4/preset3/F3.mp3'),
    'F#3': require('@/assets/chongyeon/sounds/piano_mp4/preset3/F_sharp3.mp3'), 'G3': require('@/assets/chongyeon/sounds/piano_mp4/preset3/G3.mp3'),
    'G#3': require('@/assets/chongyeon/sounds/piano_mp4/preset3/G_sharp3.mp3'), 'A3': require('@/assets/chongyeon/sounds/piano_mp4/preset3/A3.mp3'),
    'A#3': require('@/assets/chongyeon/sounds/piano_mp4/preset3/A_sharp3.mp3'), 'B3': require('@/assets/chongyeon/sounds/piano_mp4/preset3/B3.mp3'),
    'C4': require('@/assets/chongyeon/sounds/piano_mp4/preset3/C4.mp3'), 'C#4': require('@/assets/chongyeon/sounds/piano_mp4/preset3/C_sharp4.mp3'),
    'D4': require('@/assets/chongyeon/sounds/piano_mp4/preset3/D4.mp3'), 'D#4': require('@/assets/chongyeon/sounds/piano_mp4/preset3/D_sharp4.mp3'),
    'E4': require('@/assets/chongyeon/sounds/piano_mp4/preset3/E4.mp3'), 'F4': require('@/assets/chongyeon/sounds/piano_mp4/preset3/F4.mp3'),
    'F#4': require('@/assets/chongyeon/sounds/piano_mp4/preset3/F_sharp4.mp3'), 'G4': require('@/assets/chongyeon/sounds/piano_mp4/preset3/G4.mp3'),
    'G#4': require('@/assets/chongyeon/sounds/piano_mp4/preset3/G_sharp4.mp3'), 'A4': require('@/assets/chongyeon/sounds/piano_mp4/preset3/A4.mp3'),
    'A#4': require('@/assets/chongyeon/sounds/piano_mp4/preset3/A_sharp4.mp3'), 'B4': require('@/assets/chongyeon/sounds/piano_mp4/preset3/B4.mp3'),
    'C5': require('@/assets/chongyeon/sounds/piano_mp4/preset3/C5.mp3'), 'C#5': require('@/assets/chongyeon/sounds/piano_mp4/preset3/C_sharp5.mp3'),
    'D5': require('@/assets/chongyeon/sounds/piano_mp4/preset3/D5.mp3'), 'D#5': require('@/assets/chongyeon/sounds/piano_mp4/preset3/D_sharp5.mp3'),
  },
  preset4: {
    'C1': require('@/assets/chongyeon/sounds/piano_mp4/preset4/C1.mp3'), 'C#1': require('@/assets/chongyeon/sounds/piano_mp4/preset4/C_sharp1.mp3'),
    'D1': require('@/assets/chongyeon/sounds/piano_mp4/preset4/D1.mp3'), 'D#1': require('@/assets/chongyeon/sounds/piano_mp4/preset4/D_sharp1.mp3'),
    'E1': require('@/assets/chongyeon/sounds/piano_mp4/preset4/E1.mp3'), 'F1': require('@/assets/chongyeon/sounds/piano_mp4/preset4/F1.mp3'),
    'F#1': require('@/assets/chongyeon/sounds/piano_mp4/preset4/F_sharp1.mp3'), 'G1': require('@/assets/chongyeon/sounds/piano_mp4/preset4/G1.mp3'),
    'G#1': require('@/assets/chongyeon/sounds/piano_mp4/preset4/G_sharp1.mp3'), 'A1': require('@/assets/chongyeon/sounds/piano_mp4/preset4/A1.mp3'),
    'A#1': require('@/assets/chongyeon/sounds/piano_mp4/preset4/A_sharp1.mp3'), 'B1': require('@/assets/chongyeon/sounds/piano_mp4/preset4/B1.mp3'),
    'C2': require('@/assets/chongyeon/sounds/piano_mp4/preset4/C2.mp3'), 'C#2': require('@/assets/chongyeon/sounds/piano_mp4/preset4/C_sharp2.mp3'),
    'D2': require('@/assets/chongyeon/sounds/piano_mp4/preset4/D2.mp3'), 'D#2': require('@/assets/chongyeon/sounds/piano_mp4/preset4/D_sharp2.mp3'),
    'E2': require('@/assets/chongyeon/sounds/piano_mp4/preset4/E2.mp3'), 'F2': require('@/assets/chongyeon/sounds/piano_mp4/preset4/F2.mp3'),
    'F#2': require('@/assets/chongyeon/sounds/piano_mp4/preset4/F_sharp2.mp3'), 'G2': require('@/assets/chongyeon/sounds/piano_mp4/preset4/G2.mp3'),
    'G#2': require('@/assets/chongyeon/sounds/piano_mp4/preset4/G_sharp2.mp3'), 'A2': require('@/assets/chongyeon/sounds/piano_mp4/preset4/A2.mp3'),
    'A#2': require('@/assets/chongyeon/sounds/piano_mp4/preset4/A_sharp2.mp3'), 'B2': require('@/assets/chongyeon/sounds/piano_mp4/preset4/B2.mp3'),
    'C3': require('@/assets/chongyeon/sounds/piano_mp4/preset4/C3.mp3'), 'C#3': require('@/assets/chongyeon/sounds/piano_mp4/preset4/C_sharp3.mp3'),
    'D3': require('@/assets/chongyeon/sounds/piano_mp4/preset4/D3.mp3'), 'D#3': require('@/assets/chongyeon/sounds/piano_mp4/preset4/D_sharp3.mp3'),
    'E3': require('@/assets/chongyeon/sounds/piano_mp4/preset4/E3.mp3'), 'F3': require('@/assets/chongyeon/sounds/piano_mp4/preset4/F3.mp3'),
    'F#3': require('@/assets/chongyeon/sounds/piano_mp4/preset4/F_sharp3.mp3'), 'G3': require('@/assets/chongyeon/sounds/piano_mp4/preset4/G3.mp3'),
    'G#3': require('@/assets/chongyeon/sounds/piano_mp4/preset4/G_sharp3.mp3'), 'A3': require('@/assets/chongyeon/sounds/piano_mp4/preset4/A3.mp3'),
    'A#3': require('@/assets/chongyeon/sounds/piano_mp4/preset4/A_sharp3.mp3'), 'B3': require('@/assets/chongyeon/sounds/piano_mp4/preset4/B3.mp3'),
    'C4': require('@/assets/chongyeon/sounds/piano_mp4/preset4/C4.mp3'), 'C#4': require('@/assets/chongyeon/sounds/piano_mp4/preset4/C_sharp4.mp3'),
    'D4': require('@/assets/chongyeon/sounds/piano_mp4/preset4/D4.mp3'), 'D#4': require('@/assets/chongyeon/sounds/piano_mp4/preset4/D_sharp4.mp3'),
    'E4': require('@/assets/chongyeon/sounds/piano_mp4/preset4/E4.mp3'), 'F4': require('@/assets/chongyeon/sounds/piano_mp4/preset4/F4.mp3'),
    'F#4': require('@/assets/chongyeon/sounds/piano_mp4/preset4/F_sharp4.mp3'), 'G4': require('@/assets/chongyeon/sounds/piano_mp4/preset4/G4.mp3'),
    'G#4': require('@/assets/chongyeon/sounds/piano_mp4/preset4/G_sharp4.mp3'), 'A4': require('@/assets/chongyeon/sounds/piano_mp4/preset4/A4.mp3'),
    'A#4': require('@/assets/chongyeon/sounds/piano_mp4/preset4/A_sharp4.mp3'), 'B4': require('@/assets/chongyeon/sounds/piano_mp4/preset4/B4.mp3'),
    'C5': require('@/assets/chongyeon/sounds/piano_mp4/preset4/C5.mp3'), 'C#5': require('@/assets/chongyeon/sounds/piano_mp4/preset4/C_sharp5.mp3'),
    'D5': require('@/assets/chongyeon/sounds/piano_mp4/preset4/D5.mp3'), 'D#5': require('@/assets/chongyeon/sounds/piano_mp4/preset4/D_sharp5.mp3'),
  },
  preset5: {
    'C1': require('@/assets/chongyeon/sounds/piano_mp4/preset5/C1.mp3'), 'C#1': require('@/assets/chongyeon/sounds/piano_mp4/preset5/C_sharp1.mp3'),
    'D1': require('@/assets/chongyeon/sounds/piano_mp4/preset5/D1.mp3'), 'D#1': require('@/assets/chongyeon/sounds/piano_mp4/preset5/D_sharp1.mp3'),
    'E1': require('@/assets/chongyeon/sounds/piano_mp4/preset5/E1.mp3'), 'F1': require('@/assets/chongyeon/sounds/piano_mp4/preset5/F1.mp3'),
    'F#1': require('@/assets/chongyeon/sounds/piano_mp4/preset5/F_sharp1.mp3'), 'G1': require('@/assets/chongyeon/sounds/piano_mp4/preset5/G1.mp3'),
    'G#1': require('@/assets/chongyeon/sounds/piano_mp4/preset5/G_sharp1.mp3'), 'A1': require('@/assets/chongyeon/sounds/piano_mp4/preset5/A1.mp3'),
    'A#1': require('@/assets/chongyeon/sounds/piano_mp4/preset5/A_sharp1.mp3'), 'B1': require('@/assets/chongyeon/sounds/piano_mp4/preset5/B1.mp3'),
    'C2': require('@/assets/chongyeon/sounds/piano_mp4/preset5/C2.mp3'), 'C#2': require('@/assets/chongyeon/sounds/piano_mp4/preset5/C_sharp2.mp3'),
    'D2': require('@/assets/chongyeon/sounds/piano_mp4/preset5/D2.mp3'), 'D#2': require('@/assets/chongyeon/sounds/piano_mp4/preset5/D_sharp2.mp3'),
    'E2': require('@/assets/chongyeon/sounds/piano_mp4/preset5/E2.mp3'), 'F2': require('@/assets/chongyeon/sounds/piano_mp4/preset5/F2.mp3'),
    'F#2': require('@/assets/chongyeon/sounds/piano_mp4/preset5/F_sharp2.mp3'), 'G2': require('@/assets/chongyeon/sounds/piano_mp4/preset5/G2.mp3'),
    'G#2': require('@/assets/chongyeon/sounds/piano_mp4/preset5/G_sharp2.mp3'), 'A2': require('@/assets/chongyeon/sounds/piano_mp4/preset5/A2.mp3'),
    'A#2': require('@/assets/chongyeon/sounds/piano_mp4/preset5/A_sharp2.mp3'), 'B2': require('@/assets/chongyeon/sounds/piano_mp4/preset5/B2.mp3'),
    'C3': require('@/assets/chongyeon/sounds/piano_mp4/preset5/C3.mp3'), 'C#3': require('@/assets/chongyeon/sounds/piano_mp4/preset5/C_sharp3.mp3'),
    'D3': require('@/assets/chongyeon/sounds/piano_mp4/preset5/D3.mp3'), 'D#3': require('@/assets/chongyeon/sounds/piano_mp4/preset5/D_sharp3.mp3'),
    'E3': require('@/assets/chongyeon/sounds/piano_mp4/preset5/E3.mp3'), 'F3': require('@/assets/chongyeon/sounds/piano_mp4/preset5/F3.mp3'),
    'F#3': require('@/assets/chongyeon/sounds/piano_mp4/preset5/F_sharp3.mp3'), 'G3': require('@/assets/chongyeon/sounds/piano_mp4/preset5/G3.mp3'),
    'G#3': require('@/assets/chongyeon/sounds/piano_mp4/preset5/G_sharp3.mp3'), 'A3': require('@/assets/chongyeon/sounds/piano_mp4/preset5/A3.mp3'),
    'A#3': require('@/assets/chongyeon/sounds/piano_mp4/preset5/A_sharp3.mp3'), 'B3': require('@/assets/chongyeon/sounds/piano_mp4/preset5/B3.mp3'),
    'C4': require('@/assets/chongyeon/sounds/piano_mp4/preset5/C4.mp3'), 'C#4': require('@/assets/chongyeon/sounds/piano_mp4/preset5/C_sharp4.mp3'),
    'D4': require('@/assets/chongyeon/sounds/piano_mp4/preset5/D4.mp3'), 'D#4': require('@/assets/chongyeon/sounds/piano_mp4/preset5/D_sharp4.mp3'),
    'E4': require('@/assets/chongyeon/sounds/piano_mp4/preset5/E4.mp3'), 'F4': require('@/assets/chongyeon/sounds/piano_mp4/preset5/F4.mp3'),
    'F#4': require('@/assets/chongyeon/sounds/piano_mp4/preset5/F_sharp4.mp3'), 'G4': require('@/assets/chongyeon/sounds/piano_mp4/preset5/G4.mp3'),
    'G#4': require('@/assets/chongyeon/sounds/piano_mp4/preset5/G_sharp4.mp3'), 'A4': require('@/assets/chongyeon/sounds/piano_mp4/preset5/A4.mp3'),
    'A#4': require('@/assets/chongyeon/sounds/piano_mp4/preset5/A_sharp4.mp3'), 'B4': require('@/assets/chongyeon/sounds/piano_mp4/preset5/B4.mp3'),
    'C5': require('@/assets/chongyeon/sounds/piano_mp4/preset5/C5.mp3'), 'C#5': require('@/assets/chongyeon/sounds/piano_mp4/preset5/C_sharp5.mp3'),
    'D5': require('@/assets/chongyeon/sounds/piano_mp4/preset5/D5.mp3'), 'D#5': require('@/assets/chongyeon/sounds/piano_mp4/preset5/D_sharp5.mp3'),
  },
};

// 흑건 여부 맵 (52음 전체)
export const isBlackKeyMap: { [key in Note]: boolean } = {
  'C1': false, 'C#1': true, 'D1': false, 'D#1': true, 'E1': false, 'F1': false, 'F#1': true, 'G1': false, 'G#1': true, 'A1': false, 'A#1': true, 'B1': false,
  'C2': false, 'C#2': true, 'D2': false, 'D#2': true, 'E2': false, 'F2': false, 'F#2': true, 'G2': false, 'G#2': true, 'A2': false, 'A#2': true, 'B2': false,
  'C3': false, 'C#3': true, 'D3': false, 'D#3': true, 'E3': false, 'F3': false, 'F#3': true, 'G3': false, 'G#3': true, 'A3': false, 'A#3': true, 'B3': false,
  'C4': false, 'C#4': true, 'D4': false, 'D#4': true, 'E4': false, 'F4': false, 'F#4': true, 'G4': false, 'G#4': true, 'A4': false, 'A#4': true, 'B4': false,
  'C5': false, 'C#5': true, 'D5': false, 'D#5': true,
};

export const allNotes = Object.keys(isBlackKeyMap) as Note[];
export const whiteNotes = allNotes.filter(note => !isBlackKeyMap[note]);

// 각 Note별 백건 인덱스 맵 구성 (포커싱 및 매핑용)
export const whiteIdxRefById = new Map<string, number>();
let whiteCount = 0;
let lastWhiteIdx = 0;
allNotes.forEach(note => {
  const isBlack = isBlackKeyMap[note];
  if (isBlack) {
    whiteIdxRefById.set(note, lastWhiteIdx);
  } else {
    whiteIdxRefById.set(note, whiteCount);
    lastWhiteIdx = whiteCount;
    whiteCount++;
  }
});

export const whiteIdxMap: Record<string, number> = {};
whiteIdxRefById.forEach((val, key) => { whiteIdxMap[key] = val; });

export const difficultyLevels: { name: Difficulty, label: string }[] = [
  { name: '1단계', label: '입문' },
  { name: '2단계', label: '초급' },
  { name: '3단계', label: '중급' },
  { name: '4단계', label: '상급' },
  { name: '5단계', label: '전문' },
];

// 키보드-음계 매핑 (물리 건반 단축키용)
export const keyToNoteMap: { [key: string]: Note } = {
  'q': 'C3', 'w': 'D3', 'e': 'E3', 'r': 'F3', 't': 'G3', 'y': 'A3', 'u': 'B3',
  'i': 'C4', 'o': 'D4', 'p': 'E4', '[': 'F4', ']': 'G4', '\\': 'A4', 'a': 'B4',
  's': 'C5', 'd': 'D5',
  'Q': 'C#3', 'W': 'D#3', 'R': 'F#3', 'T': 'G#3', 'Y': 'A#3',
  'I': 'C#4', 'O': 'D#4', '{': 'F#4', '}': 'G#4', '|': 'A#4',
  'S': 'C#5', 'D': 'D#5',
  'f': 'C1', 'g': 'D1', 'h': 'E1', 'j': 'F1', 'k': 'G1', 'l': 'A1', ';': 'B1',
  "'": 'C2', 'z': 'D2', 'x': 'E2', 'c': 'F2', 'v': 'G2', 'b': 'A2', 'n': 'B2',
  'F': 'C#1', 'G': 'D#1', 'J': 'F#1', 'K': 'G#1', 'L': 'A#1',
  '"': 'C#2', 'Z': 'D#2', 'C': 'F#2', 'V': 'G#2', 'B': 'A#2',
};

export const noteToKeyMap = Object.entries(keyToNoteMap).reduce((acc, [key, note]) => {
  acc[note] = key;
  return acc;
}, {} as { [note in Note]?: string });

export const level1_absoluteBeginner: Note[] = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4'];
export const level2_beginner: Note[] = allNotes.slice(allNotes.indexOf('C3'), allNotes.indexOf('C5') + 1).filter(note => !isBlackKeyMap[note]);
export const level3_intermediate: Note[] = allNotes.slice(allNotes.indexOf('C3'), allNotes.indexOf('B4') + 1);
export const level4_advanced: Note[] = allNotes;
export const level5_specialTraining: Note[] = allNotes.filter(note => isBlackKeyMap[note]);

export const MUSIC_PROGRESS_KEY = '@MiniGameApp:musicProgress';

/** 고른 음원 프리셋. 값은 `SoundPreset`이고, 읽을 때 `soundPresets`와 대조해 검증한다 */
export const MUSIC_SOUND_PRESET_KEY = '@MiniGameApp:musicSoundPreset';

export interface MusicProgress {
  [difficulty: string]: {
    cumulativeSuccesses: number;
    highestScore: number;
  };
}
