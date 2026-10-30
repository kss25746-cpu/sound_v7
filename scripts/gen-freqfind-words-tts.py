"""소리 찾기 2~4단계 단어 52개를 edge-tts 여성 음성으로 다시 만든다.

단어 목록은 `src/training/freqFind/source/wordAudioAssets.ts`의 require 경로에서 읽는다.
결과는 `assets/words/audio/<단어>.wav`(44.1kHz 모노 16비트)를 덮어쓴다.

준비: pip install edge-tts imageio-ffmpeg numpy
실행: python scripts/gen-freqfind-words-tts.py
"""
import asyncio, os, re, subprocess, tempfile, wave
import numpy as np
import edge_tts, imageio_ffmpeg

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_TS = os.path.join(ROOT, "src", "training", "freqFind", "source", "wordAudioAssets.ts")
OUT = os.path.join(ROOT, "assets", "words", "audio")

VOICE = "ko-KR-SunHiNeural"
RATE = "+0%"
SR = 44100
LEAD, TAIL, FADE = 0.15, 0.20, 0.005
TARGET_RMS_DB = -18.0
PEAK_CAP_DB = -1.0
FF = imageio_ffmpeg.get_ffmpeg_exe()


def words():
    with open(ASSETS_TS, encoding="utf-8") as f:
        return re.findall(r'words/audio/([^"/]+)\.wav', f.read())


def read_wav(path):
    with wave.open(path) as w:
        return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768


def write_wav(path, x):
    y = np.clip(np.round(x * 32767), -32768, 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes())


def frame_db(x, ms=10):
    n = int(SR * ms / 1000)
    e = np.array([np.sqrt(np.mean(x[i:i + n] ** 2)) + 1e-9 for i in range(0, len(x) - n, n)])
    return 20 * np.log10(e), n


def process(x):
    """앞뒤 무음(최대 대비 −40dB 아래)을 자르고 5ms 페이드, 말소리 RMS −18dB(최고 −1dB 상한), 여백을 붙인다."""
    db, n = frame_db(x)
    on = np.where(db > db.max() - 40)[0]
    y = x[on[0] * n:(on[-1] + 1) * n].copy()
    f = int(SR * FADE)
    ramp = np.linspace(0, 1, f)
    y[:f] *= ramp
    y[-f:] *= ramp[::-1]
    sdb, _ = frame_db(y)
    active = np.concatenate([y[i * n:(i + 1) * n] for i in np.where(sdb > sdb.max() - 30)[0]])
    gain = 10 ** (TARGET_RMS_DB / 20) / np.sqrt(np.mean(active ** 2))
    cap = 10 ** (PEAK_CAP_DB / 20)
    gain = min(gain, cap / (np.abs(y).max() + 1e-12))
    y *= gain
    return np.concatenate([np.zeros(int(SR * LEAD)), y, np.zeros(int(SR * TAIL))])


async def main():
    ws = words()
    with tempfile.TemporaryDirectory() as tmp:
        mp3, raw = os.path.join(tmp, "t.mp3"), os.path.join(tmp, "t.wav")
        for w in ws:
            await edge_tts.Communicate(w, VOICE, rate=RATE).save(mp3)
            subprocess.run([FF, "-y", "-loglevel", "error", "-i", mp3, "-ac", "1", "-ar", str(SR),
                            "-sample_fmt", "s16", raw], check=True)
            y = process(read_wav(raw))
            write_wav(os.path.join(OUT, f"{w}.wav"), y)
            print(f"{w}\t{len(y) / SR:.2f}s")
    print(f"{len(ws)} files")


if __name__ == "__main__":
    asyncio.run(main())
