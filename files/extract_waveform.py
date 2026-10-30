#!/usr/bin/env python3
"""
음성 파일 생성 + 파형 데이터 추출 통합 스크립트

사용법:
1. pip install librosa numpy gTTS
2. python scripts/extract_waveform.py
"""

import os
import json
import librosa
import numpy as np
from pathlib import Path
from gtts import gTTS

def generate_word_sounds(words_list, output_dir):
    """
    단어별 음성 파일 생성 (gTTS 사용)
    
    Args:
        words_list: 단어 목록
        output_dir: 출력 디렉토리
    """
    print("🎤 음성 파일 생성 시작...\n")
    
    for word in words_list:
        audio_path = output_dir / f"{word}.mp3"
        
        # 이미 있으면 스킵
        if audio_path.exists():
            print(f"✓ 이미 있음: {word}.mp3")
            continue
        
        try:
            tts = gTTS(text=word, lang='ko', slow=False)
            tts.save(str(audio_path))
            print(f"✓ 생성 완료: {word}.mp3")
        except Exception as e:
            print(f"✗ 오류 ({word}): {e}")
    
    print()

def extract_waveform(audio_path, num_samples=30):
    """
    오디오 파일에서 파형 데이터 추출
    
    Args:
        audio_path: MP3 파일 경로
        num_samples: 추출할 샘플 수 (기본값: 30)
    
    Returns:
        0~1 사이로 정규화된 진폭 배열
    """
    try:
        # 오디오 파일 로드
        y, sr = librosa.load(audio_path, sr=None, duration=None)
        
        # 진폭 계산 (RMS Energy)
        hop_length = len(y) // num_samples
        if hop_length == 0:
            hop_length = 1
        
        # RMS Energy 계산
        rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]
        
        # 정규화 (0~1 사이)
        if np.max(rms) > 0:
            rms_normalized = rms / np.max(rms)
        else:
            rms_normalized = rms
        
        # 샘플 수에 맞게 리샘플링
        if len(rms_normalized) > num_samples:
            indices = np.linspace(0, len(rms_normalized)-1, num_samples, dtype=int)
            samples = rms_normalized[indices]
        elif len(rms_normalized) < num_samples:
            # 부족한 부분은 0으로 패딩
            padding = np.zeros(num_samples - len(rms_normalized))
            samples = np.concatenate([rms_normalized, padding])
        else:
            samples = rms_normalized
        
        # 소수점 2자리로 반올림
        return [round(float(val), 2) for val in samples]
    
    except Exception as e:
        print(f"⚠️  오류 발생 ({audio_path}): {e}")
        # 기본값 반환
        return [0.5] * num_samples

def main():
    # 프로젝트 루트 경로
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    audio_dir = project_root / 'assets' / 'sounds' / 'generated_words'
    
    # 단어 목록 (wordSounds.ts에서 사용하는 단어들)
    words_from_pairs = [
        '물', '불', '산', '살', '코', '쿠', '사', '싸', '달', '탈', 
        '눈', '룬', '나', '라', '밤', '밥', '고기', '도기',
        '머리', '멀리', '길', '빌', '칼', '문', '민', '돌', '놀', 
        '손', '돈', '말', '멀', '비', '피', '닭', '봄', '몸',
        '아주', '우주' 
    ]
    
    waveform_data = {}
    waveform_data_slow = {}
    
    # ✅ 1단계: 음성 파일 생성
    generate_word_sounds(words_from_pairs, audio_dir)
    
    # ✅ 2단계: 파형 데이터 추출
    print("🎵 파형 데이터 추출 시작...\n")
    
    # 각 단어별로 오디오 파일 분석
    for word in words_from_pairs:
        audio_path = audio_dir / f"{word}.mp3"
        
        if audio_path.exists():
            print(f"✓ 분석 중: {word} (30개 + 60개 샘플)")
            waveform_data[word] = extract_waveform(str(audio_path), num_samples=30)
            waveform_data_slow[word] = extract_waveform(str(audio_path), num_samples=60)
        else:
            print(f"⚠️  파일 없음: {word}.mp3")
            # 기본값 설정
            waveform_data[word] = [0.5] * 30
            waveform_data_slow[word] = [0.5] * 60
    
    # TypeScript 형식으로 출력
    print("\n" + "="*60)
    print("생성된 파형 데이터 (TypeScript 형식):")
    print("="*60 + "\n")
    
    print("export const WAVEFORM_DATA: WaveformAmplitudes = {")
    
    # 쉬운 난이도
    easy_words = ['물', '불', '산', '살', '코', '쿠', '사', '싸', '달', '탈', 
                  '눈', '룬', '나', '라', '밤', '밥', '고기', '도기', '아주', '우주']
    
    print("  // 쉬운 난이도 (보통: 30개 샘플)")
    for i, word in enumerate(easy_words):
        if word in waveform_data:
            data = waveform_data[word]
            line = f"  '{word}': {data}"
            if i < len(easy_words) - 1:
                line += ","
            print(line)
    
    print()
    print("  // 보통 난이도 (보통: 30개 샘플)")
    normal_words = ['머리', '멀리', '길', '빌', '칼', '문', '민', '돌', '놀', 
                    '손', '돈', '말', '멀', '비', '피', '닭', '봄', '몸']
    
    for i, word in enumerate(normal_words):
        if word in waveform_data:
            data = waveform_data[word]
            line = f"  '{word}': {data}"
            if i < len(normal_words) - 1:
                line += ","
            print(line)
    
    print("};")
    
    print("\n" + "="*60)
    print("느림 모드용 파형 데이터 (60개 샘플):")
    print("="*60 + "\n")
    
    print("export const WAVEFORM_DATA_SLOW: WaveformAmplitudes = {")
    
    print("  // 쉬운 난이도 (느림: 60개 샘플)")
    for i, word in enumerate(easy_words):
        if word in waveform_data_slow:
            data = waveform_data_slow[word]
            line = f"  '{word}': {data}"
            if i < len(easy_words) - 1:
                line += ","
            print(line)
    
    print()
    print("  // 보통 난이도 (느림: 60개 샘플)")
    for i, word in enumerate(normal_words):
        if word in waveform_data_slow:
            data = waveform_data_slow[word]
            line = f"  '{word}': {data}"
            if i < len(normal_words) - 1:
                line += ","
            print(line)
    
    print("};")
    
    print("\n" + "="*60)
    print("✅ 완료!")
    print("\n💡 이 출력을 복사하여 constants/waveformData.ts 파일에 붙여넣으세요.")
    print("   - WAVEFORM_DATA: 보통 모드용 (30개 샘플)")
    print("   - WAVEFORM_DATA_SLOW: 느림 모드용 (60개 샘플)")

if __name__ == "__main__":
    main()

