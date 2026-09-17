"""애매한 줄만 그 구간을 잘라 다시 인식해 대조한다 (추측 대신 근거).

포켓몬 이름·기술명은 한 번의 인식으로 확정하면 틀리기 쉽다(Max Booze→Max Ooze, Gren Snarl→Grimmsnarl).
구간을 따로 떼어 앞뒤 맥락 없이 다시 들으면 다른 후보가 나오고, 두 번 같으면 그때 확정한다.

사용:
  python tools/verify_lines.py <미디어> <whisper.srt> 12,41,77-80 [--prompt "힌트"] [--pad 0.5]
  (번호는 whisper.srt의 줄 번호. 12,41 처럼 쉼표로, 77-80 처럼 범위로도 준다)
"""
import argparse
import io
import re
import subprocess
import sys
import tempfile
from pathlib import Path

for st in (sys.stdout, sys.stderr):
    try:
        st.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def parse_srt(path):
    """SRT → {번호: (시작초, 끝초, 대사)}"""
    def sec(t):
        h, m, rest = t.split(":")
        s, ms = rest.split(",")
        return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000

    out = {}
    text = io.open(path, encoding="utf-8").read().replace("﻿", "")
    for block in re.split(r"\n\n+", text.strip()):
        rows = block.split("\n")
        if len(rows) < 3:
            continue
        num = int(rows[0].strip())
        a, b = [x.strip() for x in rows[1].split("-->")]
        out[num] = (sec(a), sec(b), " ".join(rows[2:]).strip())
    return out


def parse_nums(spec):
    nums = []
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-")
            nums += list(range(int(a), int(b) + 1))
        else:
            nums.append(int(part))
    return sorted(set(nums))


def set_idle_priority():
    if sys.platform != "win32":
        return
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetPriorityClass(kernel32.GetCurrentProcess(), 0x00000040)
    except Exception:
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("media")
    ap.add_argument("srt")
    ap.add_argument("nums", help="확인할 줄 번호 (12,41,77-80)")
    ap.add_argument("--prompt", default=None, help="고유명사 힌트")
    ap.add_argument("--pad", type=float, default=0.5, help="앞뒤 여유 초")
    ap.add_argument("--model", default="large-v3")
    ap.add_argument("--threads", type=int, default=4)
    args = ap.parse_args()

    cues = parse_srt(args.srt)
    nums = [n for n in parse_nums(args.nums) if n in cues]
    if not nums:
        sys.exit("확인할 줄이 없습니다 (번호가 SRT에 있는지 확인)")

    set_idle_priority()
    from faster_whisper import WhisperModel
    print(f"모델 로드: {args.model}", flush=True)
    model = WhisperModel(args.model, device="cpu", compute_type="int8", cpu_threads=args.threads)

    tmp = Path(tempfile.mkdtemp(prefix="verify_"))
    print(f"{len(nums)}개 구간 재인식\n", flush=True)
    for n in nums:
        s, e, draft = cues[n]
        a = max(0.0, s - args.pad)
        dur = (e - s) + args.pad * 2
        wav = tmp / f"{n}.wav"
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-ss", f"{a:.2f}", "-t", f"{dur:.2f}",
             "-i", args.media, "-ac", "1", "-ar", "16000", str(wav)],
            check=True,
        )
        segs, _ = model.transcribe(str(wav), language="en", beam_size=5,
                                   condition_on_previous_text=False, initial_prompt=args.prompt)
        heard = " ".join(x.text.strip() for x in segs).strip()
        same = heard.lower().rstrip(".!?") == draft.lower().rstrip(".!?")
        print(f"[{n}] {s:.2f}s")
        print(f"   초안: {draft}")
        print(f"   재인식: {heard}  {'✅ 같음' if same else '⚠ 다름'}")
        print(flush=True)


main()
