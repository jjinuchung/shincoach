"""영상에 구워진(하드섭) 자막을 읽어 내기 위한 준비: 영어 srt의 큐 시각마다 자막 띠를 잘라
흰 글자만 남긴(이진화) 이미지로 만들고, 여러 개를 번호 붙여 한 장(시트)에 모은다.
→ 시트를 Read(비전)로 읽어 번호별 한글을 적으면 `hardsub_srt.py`가 srt로 조립한다.
(오프라인 OCR(tesseract/easyocr)은 한글 자막에서 오자가 많아 사람이/AI가 직접 읽는 편이 정확)

사용법:
  python tools/hardsub_frames.py <영상> <영어.srt> <출력폴더> [--band 850:230] [--scale 0.45] [--per-sheet 28]

출력:
  <출력폴더>/index.json  : [{i, start, end, en, has_text, dup_of}] (dup_of = 같은 자막이 이어지는 앞 큐 번호)
  <출력폴더>/sheet_NN.png: 번호 + 자막 이미지 행 (has_text이고 dup가 아닌 큐만)
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np


def parse_srt(path: Path):
    text = path.read_text(encoding="utf-8-sig", errors="replace").replace("\r\n", "\n")
    cues = []
    for block in re.split(r"\n[ \t]*\n+", text):
        lines = [l for l in block.split("\n") if l.strip()]
        if len(lines) < 2:
            continue
        li = 1 if "-->" in lines[1] else (0 if "-->" in lines[0] else -1)
        if li < 0:
            continue
        m = re.match(r"(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)", lines[li])
        if not m:
            continue
        g = [int(x) for x in m.groups()]
        start = g[0] * 3600 + g[1] * 60 + g[2] + g[3] / 1000
        end = g[4] * 3600 + g[5] * 60 + g[6] + g[7] / 1000
        body = " ".join(lines[li + 1:])
        # 앱의 cleanText와 비슷하게: 효과음 설명·화자 표시 제거 → 비면 대사 아님
        clean = re.sub(r"<[^>]+>|\([^)]*\)|\[[^\]]*\]", "", body)
        clean = re.sub(r"(^|\s)-?\s*[A-Z][A-Z0-9 .'\-]{0,24}:\s*", " ", clean).strip(" -")
        if not clean.strip():
            continue
        cues.append({"start": round(start, 3), "end": round(end, 3), "en": clean.strip()})
    return cues


def grab(video: str, t: float, band: str):
    """ffmpeg로 t초의 자막 띠(crop) 한 장 → BGR ndarray"""
    y0, h = band.split(":")
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", f"{t:.3f}", "-i", video, "-frames:v", "1",
           "-vf", f"crop=iw:{h}:0:{y0}", "-f", "image2pipe", "-vcodec", "png", "-"]
    data = subprocess.run(cmd, capture_output=True).stdout
    if not data:
        return None
    return cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)


def binarize(img):
    """흰 자막 글자만 남겨 검은 글자/흰 배경으로. 글자가 없으면 None. → (이진 이미지, 글자 픽셀 수)"""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    white = ((hsv[:, :, 2] > 190) & (hsv[:, :, 1] < 60)).astype(np.uint8) * 255
    # 자막 글자는 검은 테두리가 있음 → 어두운 픽셀 바로 옆의 흰 픽셀만 남겨 하늘·구름 같은 밝은 배경을 걸러냄
    dark = (hsv[:, :, 2] < 70).astype(np.uint8) * 255
    near_dark = cv2.dilate(dark, np.ones((7, 7), np.uint8)) > 0
    # 흰 덩어리(연결 요소)별로: 픽셀 대부분이 어두운 테두리 가까이에 있으면 글자, 아니면(구름·눈밭) 버림
    # 글자가 밝은 배경과 붙어 한 덩어리가 된 경우엔 통째로 버리지 않고 테두리 근처 픽셀만 남김(속이 빈 글자라도 읽힘)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(white, connectivity=8)
    mask = np.zeros_like(white)
    for k in range(1, n):
        area = stats[k, cv2.CC_STAT_AREA]
        if area < 6:
            continue
        comp = labels == k
        h_k, w_k = stats[k, cv2.CC_STAT_HEIGHT], stats[k, cv2.CC_STAT_WIDTH]
        if h_k <= 90 and w_k <= 200 and near_dark[comp].mean() >= 0.6:
            mask[comp] = 255
        else:
            mask[comp & near_dark] = 255
    # 자막은 가로로 넓게 퍼진 덩어리: 세로로 뭉친 작은 잡티는 행 프로젝션으로 걸러냄
    rows = (mask > 0).sum(axis=1)
    keep = rows > mask.shape[1] * 0.01
    # 8px 미만으로 얇게 이어지는 행(가는 선 잡티)은 글자 줄이 아님
    run_start = None
    for y in range(len(keep) + 1):
        on = y < len(keep) and keep[y]
        if on and run_start is None:
            run_start = y
        elif not on and run_start is not None:
            if y - run_start < 8:
                keep[run_start:y] = False
            run_start = None
    if keep.sum() < 8:
        return None, 0
    ys = np.where(keep)[0]
    y0, y1 = max(ys.min() - 10, 0), min(ys.max() + 10, mask.shape[0])
    sub = mask[y0:y1]
    xs = np.where((sub > 0).sum(axis=0) > 0)[0]
    if len(xs) == 0:
        return None, 0
    x0, x1 = max(xs.min() - 16, 0), min(xs.max() + 16, mask.shape[1])
    crop = 255 - sub[:, x0:x1]
    return crop, int((sub > 0).sum())


def same_image(a, b):
    """같은 자막이 계속 떠 있는지 (크기 비슷 + 같은 크기로 맞춘 뒤 픽셀 차이 작음)"""
    if a is None or b is None:
        return False
    if abs(a.shape[0] - b.shape[0]) > 8 or abs(a.shape[1] - b.shape[1]) > 16:
        return False
    size = (400, 60)
    ra = cv2.resize(a, size, interpolation=cv2.INTER_AREA) < 128
    rb = cv2.resize(b, size, interpolation=cv2.INTER_AREA) < 128
    return (ra != rb).mean() < 0.04


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("srt")
    ap.add_argument("out")
    ap.add_argument("--band", default="850:230", help="자막 띠 y0:높이 (원본 해상도 기준)")
    ap.add_argument("--scale", type=float, default=0.45, help="시트에 넣을 때 축소 비율")
    ap.add_argument("--per-sheet", type=int, default=28)
    ap.add_argument("--limit", type=int, default=0, help="테스트용: 앞 N개 큐만")
    args = ap.parse_args()

    out = Path(args.out)
    (out / "samples").mkdir(parents=True, exist_ok=True)
    cues = parse_srt(Path(args.srt))
    if args.limit:
        cues = cues[: args.limit]
    print(f"대사 큐 {len(cues)}개", flush=True)

    # 중단됐던 작업 이어하기: 부분 index.json이 있으면 그 뒤부터
    index = []
    prev_img = None
    prev_i = None
    partial = out / "index.partial.json"
    if partial.exists():
        index = json.loads(partial.read_text(encoding="utf-8"))
        last = next((e for e in reversed(index) if e["has_text"] and e["dup_of"] is None), None)
        if last is not None:
            prev_img = cv2.imread(str(out / "samples" / f"{last['i']:04d}.png"), 0)
            prev_i = last["i"]
        print(f"  이어하기: {len(index)}개 완료된 상태에서 재개", flush=True)
    for i, c in enumerate(cues):
        if i < len(index):
            continue
        dur = c["end"] - c["start"]
        best, best_n = None, 0
        for frac in (0.45, 0.2, 0.75):  # 가운데 → 앞 → 뒤 순으로 자막이 떠 있는 순간 찾기
            t = c["start"] + dur * frac
            img = grab(args.video, t, args.band)
            if img is None:
                continue
            b, n = binarize(img)
            if n > best_n:
                best, best_n = b, n
            if best_n > 400:
                break
        entry = {"i": i, "start": c["start"], "end": c["end"], "en": c["en"], "has_text": best is not None, "dup_of": None}
        if best is not None:
            if same_image(best, prev_img) and prev_i is not None:
                entry["dup_of"] = prev_i
            else:
                cv2.imwrite(str(out / "samples" / f"{i:04d}.png"), best)
                prev_img, prev_i = best, i
        else:
            prev_img, prev_i = None, None
        index.append(entry)
        if i % 50 == 0:
            partial.write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")
        if i % 100 == 0:
            print(f"  {i}/{len(cues)} ({c['start']:.0f}s)", flush=True)
    (out / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    if partial.exists():
        partial.unlink()

    # 시트 만들기
    rows = [e for e in index if e["has_text"] and e["dup_of"] is None]
    sheet_w = 1400
    label_w = 90
    sheet_no = 0
    k = 0
    while k < len(rows):
        tiles = []
        for e in rows[k:k + args.per_sheet]:
            img = cv2.imread(str(out / "samples" / f"{e['i']:04d}.png"), 0)
            img = cv2.resize(img, None, fx=args.scale, fy=args.scale, interpolation=cv2.INTER_AREA)
            h, w = img.shape
            if w > sheet_w - label_w:
                img = cv2.resize(img, (sheet_w - label_w, int(h * (sheet_w - label_w) / w)), interpolation=cv2.INTER_AREA)
                h, w = img.shape
            tile = np.full((h + 10, sheet_w), 255, np.uint8)
            tile[5:5 + h, label_w:label_w + w] = img
            cv2.putText(tile, f"{e['i']:04d}", (4, min(h, 30)), cv2.FONT_HERSHEY_SIMPLEX, 0.9, 0, 2)
            cv2.line(tile, (0, h + 9), (sheet_w, h + 9), 200, 1)
            tiles.append(tile)
        sheet = np.vstack(tiles)
        sheet_no += 1
        cv2.imwrite(str(out / f"sheet_{sheet_no:02d}.png"), sheet)
        k += args.per_sheet
    n_text = sum(1 for e in index if e["has_text"])
    print(f"자막 있음 {n_text}, 그중 중복 제외 {len(rows)} → 시트 {sheet_no}장 ({out})", flush=True)


if __name__ == "__main__":
    main()
