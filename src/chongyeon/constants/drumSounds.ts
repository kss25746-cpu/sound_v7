export interface DrumInstrument {
  name: string;
  description: string;
  sound: any;
  image: any;
}

export const DRUM_INSTRUMENTS= {
  kick: {
    name: '킥드럼',
    description: '둔탁하고 깊은 저음',
    // 원본 Kick.wav만 IEEE float 32bit · peak 1.197(0dBFS 초과)로 나머지 넷(16bit PCM)과 포맷이 달랐다.
    // 그 float 원본이 2악기 페이지에서 「안 들림/들림」 교대 증상을 냈다(docs/drum-무음-원인추적 §3 시도 4).
    //
    // Kick_orig16.wav = 원본을 **기기에서 들리던 소리 그대로** 16bit PCM으로 옮긴 것. 안드로이드는 float 출력 때
    // ±1.0에서 잘라 내므로 원본도 그 지점에서 잘라(2876샘플) 음량은 줄이지 않았다. 재생 시 소리 대비 SNR 93dB.
    // 앞서 쓰던 Kick_pcm16.wav는 피크를 -0.2dB로 낮춰 원본보다 약 1.5dB 작고 찌그러짐이 없어 달리 들렸다.
    //
    // `주의`: 소리의 약 99%가 500Hz 아래라 폰 스피커에서는 거의 안 들린다. 타격음을 섞은 Kick_attack.wav는
    // 소리가 어색해 되돌렸다. 악기별 소리는 나중에 따로 조정한다. Kick.wav · Kick_pcm16 · Kick_attack은 옆에 남겨 둔다.
    sound: require('@/assets/chongyeon/sounds/drum_sound/Kick_orig16.wav'),
    image: require('@/assets/chongyeon/images/kick_drum.png'),
  },
  snare: {
    name: '스네어',
    description: '날카롭게 튀는 소리',
    sound: require('@/assets/chongyeon/sounds/drum_sound/Snare_15.wav'),
    image: require('@/assets/chongyeon/images/snare_drum.png'),
  },
  hihat: {
    name: '하이햇',
    description: '짧고 선명한 금속음',
    sound: require('@/assets/chongyeon/sounds/drum_sound/HiHatOpen_15.wav'),
    image: require('@/assets/chongyeon/images/hihat_n.png'),
  },
  cymbal: {
    name: '심벌',
    description: '긴 울림의 금속음',
    sound: require('@/assets/chongyeon/sounds/drum_sound/Crash_15.wav'),
    image: require('@/assets/chongyeon/images/crash.png'),
  },
  tom: {
    name: '탐',
    description: '중음역의 둥근 소리',
    sound: require('@/assets/chongyeon/sounds/drum_sound/Tom_20.wav'),
    image: require('@/assets/chongyeon/images/tom_fit.png'),
  },
}  as const satisfies Record<string, DrumInstrument>;



export const DIFFICULTY_LEVELS = {
  beginner: {
    name: '초급',
    instruments: ['kick', 'snare'] as const,
    rounds: 5,
    description: '2가지 악기'
  },
  intermediate_3: {
    name: '중급',
    instruments: ['kick', 'snare', 'hihat'] as const,
    rounds: 7,
    description: '3가지 악기'
  },
  intermediate_4: {
    name: '상급',
    instruments: ['kick', 'snare', 'hihat', 'cymbal'] as const,
    rounds: 8,
    description: '4가지 악기'
  },
  intermediate: {
    name: '고급',
    instruments: ['kick', 'snare', 'hihat', 'cymbal', 'tom'] as const,
    rounds: 10,
    description: '5가지 악기'
  }
};

export type InstrumentType = keyof typeof DRUM_INSTRUMENTS;
export type DifficultyType = keyof typeof DIFFICULTY_LEVELS;
