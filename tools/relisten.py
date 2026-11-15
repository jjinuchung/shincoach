"""의심 구간만 모아 **모델을 한 번 싣고** 다시 인식한다 (2026-11-14 수퍼 소닉 3).

verify_lines.py는 줄마다 ffmpeg로 잘라 다시 부른다 — 긴 영화의 의심 구간 수백 곳에는 맞지 않는다.
이 도구는 16 kHz 모노 wav를 한 번 읽어 구간을 numpy로 잘라 넘긴다(ffmpeg 0번).
GPU(4 GB)는 하나뿐이라 에이전트들이 저마다 돌리지 말고 이 한 프로세스로 모아서 돌린다.

사용법:
  python tools/relisten.py <16k모노.wav> <구간.json> <출력.json> [--device cuda] [--prompt "고유명사"]

구간.json: [{"id": "c03-1", "from": 661.2, "to": 664.0}, …]  (초 · 원본 기준)
출력.json: [{"id", "from", "to", "a": {"text", "words"}, "b": {"text", "words"}}]
  a = 고유명사 힌트를 주고 · b = 힌트 없이 — 둘 다 무음·저확률 판정을 끈다(놓친 말을 찾으려고)
  words = [{"w", "s", "e", "p"}] (시각은 원본 기준)
"""
import argparse
import json
import sys
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from whisper_srt import add_cuda_dlls, set_idle_priority  # noqa: E402

for st in (sys.stdout, sys.stderr):
    try:
        st.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def load_wav(path):
    with wave.open(str(path), "rb") as w:
        if w.getframerate() != 16000 or w.getnchannels() != 1 or w.getsampwidth() != 2:
            sys.exit("16 kHz · 모노 · 16비트 wav만 받는다 (ffmpeg -ac 1 -ar 16000 -c:a pcm_s16le)")
        raw = w.readframes(w.getnframes())
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0


def run(model, audio, start, prompt):
    segs, _ = model.transcribe(
        audio, language="en", beam_size=5, word_timestamps=True, vad_filter=False,
        condition_on_previous_text=False, initial_prompt=prompt,
        no_speech_threshold=None, log_prob_threshold=None,
    )
    text, words = [], []
    for seg in segs:
        t = seg.text.strip()
        if t:
            text.append(t)
        for w in seg.words or []:
            words.append({"w": w.word.strip(), "s": round(w.start + start, 3), "e": round(w.end + start, 3),
                          "p": round(w.probability, 2)})
    return {"text": " ".join(text), "words": words}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("wav")
    ap.add_argument("ranges")
    ap.add_argument("out")
    ap.add_argument("--device", default="cuda", choices=["cpu", "cuda"])
    ap.add_argument("--model", default="large-v3")
    ap.add_argument("--prompt", default=None)
    ap.add_argument("--pad", type=float, default=0.4, help="앞뒤 여유 초")
    ap.add_argument("--threads", type=int, default=4)
    args = ap.parse_args()

    set_idle_priority()
    if args.device == "cuda":
        add_cuda_dlls()
    from faster_whisper import WhisperModel
    ct = "int8_float16" if args.device == "cuda" else "int8"
    model = WhisperModel(args.model, device=args.device, compute_type=ct, cpu_threads=args.threads)

    audio = load_wav(args.wav)
    total = len(audio) / 16000
    ranges = json.loads(Path(args.ranges).read_text(encoding="utf-8"))
    out = []
    for k, r in enumerate(ranges, 1):
        a = max(0.0, float(r["from"]) - args.pad)
        b = min(total, float(r["to"]) + args.pad)
        clip = audio[int(a * 16000):int(b * 16000)]
        row = {"id": r["id"], "from": round(a, 2), "to": round(b, 2),
               "a": run(model, clip, a, args.prompt), "b": run(model, clip, a, None)}
        out.append(row)
        print(f"[{k}/{len(ranges)}] {r['id']} {a:.1f}~{b:.1f}  A: {row['a']['text']}  |  B: {row['b']['text']}", flush=True)
        if k % 20 == 0:  # 도중에 죽어도 앞부분은 남게
            Path(args.out).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    Path(args.out).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"끝: 구간 {len(out)} → {args.out}")


if __name__ == "__main__":
    main()
