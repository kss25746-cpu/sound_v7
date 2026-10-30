#!/usr/bin/env python3
from gtts import gTTS
from pathlib import Path

# 테스트 단어
WORDS = ['아주', '우주']

# 출력 폴더
output_dir = Path(__file__).parent.parent / 'assets' / 'sounds' / 'generated_words'
output_dir.mkdir(parents=True, exist_ok=True)

print("🎵 음성 파일 생성 시작...\n")

for word in WORDS:
    output_path = output_dir / f"{word}.mp3"
    
    try:
        tts = gTTS(text=word, lang='ko', slow=False)
        tts.save(str(output_path))
        print(f"✓ 생성 완료: {word}.mp3")
    except Exception as e:
        print(f"✗ 오류 ({word}): {e}")

print(f"\n✅ 완료! 파일 위치: {output_dir}")