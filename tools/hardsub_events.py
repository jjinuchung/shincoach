"""영상에 구워진(하드섭) 한글 자막을 **ffmpeg 한 번**으로 훑어 자막이 바뀌는 때(사건)를 찾고,
사건마다 자막 띠 그림 하나와 읽기용 시트를 만든다 (2026-11-14 수퍼 소닉 3).

hardsub_frames.py는 영어 큐마다 ffmpeg를 새로 띄워 PC를 재부팅시킨 적이 있다(쿵푸팬더4).
이 도구는 ffmpeg 하나가 띠만 잘라 회색 원시 영상으로 파이프에 흘리고, 파이썬이 받아 가며 가른다.
영어 자막이 없어도 된다 — 사건의 시각이 곧 한글 자막의 시각.

사용법:
  python tools/hardsub_events.py <영상> <출력폴더> [--y0 600] [--h 200] [--fps 4] [--per-sheet 20]

출력:
  <출력폴더>/events.json : [{i, start, end, png, box}]  (box = 띠 안 글자 범위 x0,y0,x1,y1)
  <출력폴더>/ev/0001.png  : 사건마다 띠 그림(글자 범위만, 원래 해상도 회색)
  <출력폴더>/sheet_NN.png : 번호 + 그림 행 — Read(비전)로 읽어 번호별 한글을 적는다

글자 찾기: 흰 글자(밝기 ≥ 200) 둘레에 어두운 테두리(≤ 70)가 붙은 화소만 센다 — 밝은 배경(흰 벽)은 테두리가 없어 빠진다.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

for st in (sys.stdout, sys.stderr):
    try:
        st.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def set_idle_priority():
    if sys.platform != "win32":
        return
    try:
        import ctypes
        ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x00000040)
    except Exception as e:
        print(f"[warn] 우선순위 조정 실패: {e}", file=sys.stderr)


def text_mask(g):
    """흰 글자 + 둘레 어두운 테두리 → 글자 화소(0/1)"""
    white = g >= 200
    dark_near = cv2.erode(g, np.ones((7, 7), np.uint8)) <= 70  # 7×7 안에 어두운 화소가 있음
    m = (white & dark_near).astype(np.uint8)
    # 홀로 떨어진 점(불꽃·네온 반짝임)을 지운다
    return cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))


def small(m):
    """견주기용으로 8배 줄인 글자 지도(덩어리 모양만)"""
    h, w = m.shape
    return cv2.resize(m * 255, (w // 8, h // 8), interpolation=cv2.INTER_AREA) > 40


def iou(a, b):
    u = np.logical_or(a, b).sum()
    return 1.0 if u == 0 else np.logical_and(a, b).sum() / u


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("out")
    ap.add_argument("--y0", type=int, default=600, help="띠 위쪽 y (원래 해상도)")
    ap.add_argument("--h", type=int, default=200, help="띠 높이")
    ap.add_argument("--fps", type=float, default=4.0)
    ap.add_argument("--min-px", type=int, default=400, help="글자로 볼 최소 화소 수(원래 해상도)")
    ap.add_argument("--per-sheet", type=int, default=20)
    ap.add_argument("--threads", type=int, default=4)
    ap.add_argument("--ss", type=float, default=0.0, help="시험용 시작 초")
    ap.add_argument("--t", type=float, default=0.0, help="시험용 길이 초(0 = 끝까지)")
    args = ap.parse_args()

    set_idle_priority()
    out = Path(args.out)
    (out / "ev").mkdir(parents=True, exist_ok=True)

    probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width",
                            "-of", "csv=p=0", args.video], capture_output=True, text=True, check=True)
    W, H = int(probe.stdout.strip()), args.h
    cut = (["-ss", str(args.ss)] if args.ss else []) + (["-t", str(args.t)] if args.t else [])
    cmd = ["ffmpeg", "-v", "error", "-threads", str(args.threads), *cut, "-i", args.video, "-an", "-sn",
           "-vf", f"fps={args.fps},crop={W}:{H}:0:{args.y0},format=gray",
           "-f", "rawvideo", "-pix_fmt", "gray", "-"]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, bufsize=W * H * 8)
    try:
        import psutil  # ffmpeg도 Idle로
        psutil.Process(proc.pid).nice(psutil.IDLE_PRIORITY_CLASS)
    except Exception:
        pass

    frame_bytes = W * H
    events = []
    cur = None  # {start, sm, best_n, best_frame, best_mask, last}
    n = 0

    def close(c, end_t):
        if c is None:
            return
        if end_t - c["start"] < 0.3:  # 한 장만 스친 것(장면 전환의 흰 번쩍임)은 버린다
            return
        m = c["best_mask"]
        ys, xs = np.nonzero(m)
        x0, x1 = max(0, xs.min() - 12), min(W, xs.max() + 13)
        y0, y1 = max(0, ys.min() - 10), min(H, ys.max() + 11)
        i = len(events) + 1
        crop = c["best_frame"][y0:y1, x0:x1]
        name = f"ev/{i:04d}.png"
        cv2.imwrite(str(out / name), crop)
        events.append({"i": i, "start": round(c["start"], 2), "end": round(end_t, 2), "png": name,
                       "box": [int(x0), int(y0 + args.y0), int(x1), int(y1 + args.y0)]})

    while True:
        buf = proc.stdout.read(frame_bytes)
        if len(buf) < frame_bytes:
            break
        t = args.ss + n / args.fps
        n += 1
        g = np.frombuffer(buf, np.uint8).reshape(H, W)
        m = text_mask(g)
        cnt = int(m.sum())
        if cnt < args.min_px:
            close(cur, t)
            cur = None
            continue
        sm = small(m)
        if cur is not None and iou(sm, cur["sm"]) >= 0.55:
            cur["last"] = t
            if cnt > cur["best_n"]:  # 글자가 가장 또렷한(화소가 많은) 장을 남긴다
                cur.update(best_n=cnt, best_frame=g.copy(), best_mask=m)
            continue
        close(cur, t)
        cur = {"start": t, "sm": sm, "best_n": cnt, "best_frame": g.copy(), "best_mask": m, "last": t}
        if n % 2000 == 0:
            print(f"   {t / 60:.1f}분 · 사건 {len(events)}", flush=True)
    close(cur, args.ss + n / args.fps)
    proc.wait()

    (out / "events.json").write_text(json.dumps(events, ensure_ascii=False, indent=1), encoding="utf-8")

    # 시트: 번호 + 그림(0.75배) 행
    per = args.per_sheet
    for s in range(0, len(events), per):
        rows = []
        for e in events[s:s + per]:
            im = cv2.imread(str(out / e["png"]), cv2.IMREAD_GRAYSCALE)
            im = cv2.resize(im, None, fx=0.75, fy=0.75, interpolation=cv2.INTER_AREA)
            row = np.full((im.shape[0] + 16, 1500), 255, np.uint8)
            cv2.putText(row, f"{e['i']:04d}", (8, row.shape[0] // 2 + 12), cv2.FONT_HERSHEY_SIMPLEX, 1.1, 0, 2)
            w = min(im.shape[1], 1500 - 130)
            row[8:8 + im.shape[0], 130:130 + w] = im[:, :w]
            rows.append(row)
            rows.append(np.full((4, 1500), 160, np.uint8))
        cv2.imwrite(str(out / f"sheet_{s // per + 1:02d}.png"), np.vstack(rows))
    print(f"끝: 장 {n} · 사건 {len(events)} · 시트 {(len(events) + per - 1) // per} → {out}", flush=True)


if __name__ == "__main__":
    main()
