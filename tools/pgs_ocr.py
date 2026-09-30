"""블루레이 그림 자막(PGS .sup) → 영어 SRT (Tesseract OCR)

사용:
    ffmpeg -i 영화.mkv -map 0:s:0 -c copy 영화.en.sup          # 영어 PGS 트랙만 뽑기 (한 번)
    python tools/pgs_ocr.py 영화.en.sup 작업폴더                # → 작업폴더/ocr.srt · png/ · list.txt

★ Tesseract는 **프로세스 한 번**으로 모든 그림을 읽는다(목록 파일 입력, 쪽 구분 \\f).
  그림마다 프로세스를 띄우면 수천 번이 되어 PC가 먹통이 된 적이 있다 (2026-09-13 hardsub 사고).
  OMP_THREAD_LIMIT=2 · 낮은 우선순위로 돌려 다른 일(TRADEMY API)을 덜 방해한다.

PGS 구조: 세그먼트 "PG" + PTS(90kHz) + DTS + 종류(1) + 길이(2)
  0x14 PDS 팔레트(id, Y, Cr, Cb, A) · 0x15 ODS 그림(RLE) · 0x16 PCS 화면 구성 · 0x17 WDS 창 · 0x80 끝
  그림이 있는 PCS의 PTS에 뜨고, 다음 PCS(그림 0개이거나 다른 그림)에서 사라진다.
"""
import os
import struct
import subprocess
import sys

from PIL import Image

TESSERACT = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def read_segments(path):
    """세그먼트를 차례로 돌려준다: (pts초, 종류, 데이터)"""
    with open(path, "rb") as f:
        buf = f.read()
    i = 0
    n = len(buf)
    while i + 13 <= n:
        if buf[i:i + 2] != b"PG":
            raise ValueError(f"PG 표시가 없다: {i}")
        pts = struct.unpack(">I", buf[i + 2:i + 6])[0] / 90000.0
        kind = buf[i + 10]
        size = struct.unpack(">H", buf[i + 11:i + 13])[0]
        yield pts, kind, buf[i + 13:i + 13 + size]
        i += 13 + size


def decode_rle(data, width, height):
    """PGS RLE → 팔레트 번호 bytearray (width*height)"""
    out = bytearray(width * height)
    x = y = 0
    i = 0
    n = len(data)
    while i < n and y < height:
        b = data[i]
        i += 1
        if b != 0:
            if x < width:
                out[y * width + x] = b
            x += 1
            continue
        c = data[i]
        i += 1
        if c == 0:  # 줄 끝
            x = 0
            y += 1
            continue
        flag = c & 0xC0
        if flag == 0x00:
            run, color = c & 0x3F, 0
        elif flag == 0x40:
            run, color = ((c & 0x3F) << 8) | data[i], 0
            i += 1
        elif flag == 0x80:
            run, color = c & 0x3F, data[i]
            i += 1
        else:
            run, color = ((c & 0x3F) << 8) | data[i], data[i + 1]
            i += 2
        if color:
            start = y * width + x
            end = y * width + min(width, x + run)
            out[start:end] = bytes([color]) * (end - start)
        x += run
    return out


def parse_display_sets(path):
    """화면 구성 단위로 모은다: [{pts, objects:[(id, x, y)], palette:{}, ods:{id:(w,h,rle)}}]"""
    sets = []
    cur = None
    palettes = {}
    objects = {}   # id → [w, h, bytearray]
    for pts, kind, data in read_segments(path):
        if kind == 0x16:  # PCS
            num = data[10]
            objs = []
            p = 11
            for _ in range(num):
                oid = struct.unpack(">H", data[p:p + 2])[0]
                cropped = data[p + 3]
                ox, oy = struct.unpack(">HH", data[p + 4:p + 8])
                objs.append((oid, ox, oy))
                p += 8 + (8 if cropped & 0x40 else 0)
            cur = {"pts": pts, "state": data[7], "pal_id": data[9], "objects": objs, "new_ods": False}
        elif kind == 0x14:  # PDS
            pid = data[0]
            pal = dict(palettes.get(pid, {}))
            for j in range(2, len(data) - 4, 5):
                idx, yy, cr, cb, a = data[j:j + 5]
                pal[idx] = (yy, a)
            palettes[pid] = pal
        elif kind == 0x15:  # ODS
            oid = struct.unpack(">H", data[0:2])[0]
            seq = data[3]
            if seq & 0x80:  # 첫 조각
                w, h = struct.unpack(">HH", data[7:11])
                objects[oid] = [w, h, bytearray(data[11:])]
            elif oid in objects:
                objects[oid][2].extend(data[4:])
            if cur is not None:
                cur["new_ods"] = True
        elif kind == 0x80:  # 끝
            if cur is not None:
                cur["palette"] = dict(palettes.get(cur["pal_id"], {}))
                cur["ods"] = {oid: (o[0], o[1], bytes(o[2])) for oid, o in objects.items()}
                sets.append(cur)
                cur = None
    return sets


def render(ds):
    """한 화면 구성을 OCR용 흑백 그림으로 — 글자 속(밝고 불투명)은 검정, 테두리·배경은 흰색"""
    boxes = []
    for oid, ox, oy in ds["objects"]:
        if oid in ds["ods"]:
            w, h, _ = ds["ods"][oid]
            boxes.append((ox, oy, ox + w, oy + h))
    if not boxes:
        return None
    x0 = min(b[0] for b in boxes)
    y0 = min(b[1] for b in boxes)
    x1 = max(b[2] for b in boxes)
    y1 = max(b[3] for b in boxes)
    pad = 24
    img = Image.new("L", (x1 - x0 + pad * 2, y1 - y0 + pad * 2), 255)
    pal = ds["palette"]
    lut = [255] * 256
    for idx, (yy, a) in pal.items():
        # 밝기 × 불투명도 → 글자 속만 진하게 (검은 테두리는 밝기가 낮아 흰색으로 빠진다)
        lut[idx] = 255 - (yy * a // 255)
    for oid, ox, oy in ds["objects"]:
        if oid not in ds["ods"]:
            continue
        w, h, rle = ds["ods"][oid]
        idx = decode_rle(rle, w, h)
        part = Image.frombytes("L", (w, h), bytes(idx)).point(lut)
        img.paste(part, (ox - x0 + pad, oy - y0 + pad))
    return img


def ts(sec):
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main():
    sup, work = sys.argv[1], sys.argv[2]
    png_dir = os.path.join(work, "png")
    os.makedirs(png_dir, exist_ok=True)
    sets = parse_display_sets(sup)

    # 화면 구성 → 자막 조각(시작, 끝, 그림). 그림 0개 PCS가 끝, 새 그림이 오면 앞 조각을 거기서 끊는다.
    cues = []
    prev_sig = None
    for ds in sets:
        if cues and cues[-1]["end"] is None:
            sig = (tuple(ds["objects"]), ds["new_ods"])
            # 새 그림 없이 같은 자리 재표시(팔레트만 바뀜 = 페이드)는 같은 조각으로 둔다
            if ds["objects"] and not ds["new_ods"] and tuple(ds["objects"]) == prev_sig:
                continue
            cues[-1]["end"] = ds["pts"]
        if ds["objects"]:
            img = render(ds)
            if img is not None:
                cues.append({"start": ds["pts"], "end": None, "img": img})
                prev_sig = tuple(ds["objects"])
    if cues and cues[-1]["end"] is None:
        cues[-1]["end"] = cues[-1]["start"] + 3.0

    list_path = os.path.join(work, "list.txt")
    with open(list_path, "w", encoding="utf-8") as lf:
        for i, c in enumerate(cues, 1):
            p = os.path.join(png_dir, f"{i:04d}.png")
            c["img"].save(p)
            lf.write(os.path.abspath(p) + "\n")
    print(f"화면 구성 {len(sets)} → 자막 {len(cues)}개, 그림 저장 끝", flush=True)

    env = dict(os.environ, OMP_THREAD_LIMIT="2")
    out_base = os.path.join(work, "ocr")
    creation = 0x00004000 if os.name == "nt" else 0  # BELOW_NORMAL_PRIORITY_CLASS
    subprocess.run([TESSERACT, list_path, out_base, "--psm", "6", "-l", "eng"],
                   check=True, env=env, creationflags=creation)
    with open(out_base + ".txt", encoding="utf-8") as f:
        pages = f.read().split("\f")
    if pages and not pages[-1].strip():
        pages = pages[:-1]
    if len(pages) != len(cues):
        raise SystemExit(f"쪽 수({len(pages)})와 자막 수({len(cues)})가 다르다")

    with open(os.path.join(work, "ocr.srt"), "w", encoding="utf-8") as f:
        for i, (c, text) in enumerate(zip(cues, pages), 1):
            lines = [ln.strip() for ln in text.strip().splitlines() if ln.strip()]
            f.write(f"{i}\n{ts(c['start'])} --> {ts(c['end'])}\n" + "\n".join(lines) + "\n\n")
    print(f"ocr.srt {len(cues)}개 저장", flush=True)


if __name__ == "__main__":
    main()
