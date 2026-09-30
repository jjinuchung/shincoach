"""OCR 교차 확인 — 그림을 2배로 키워 한 번 더 읽고, 정리한 글이 첫째와 다른 조각만 뽑는다

사용:
    python tools/pgs_ocr_check.py 작업폴더          # pgs_ocr.py가 만든 작업폴더 (png/ · ocr.txt)
    → 작업폴더/diff_clean.tsv  (OCR번호 · 첫째 · 둘째)

왜: 사전 대조(sdh_clean --known)는 **있는 낱말로 잘못 읽은 것**을 못 잡는다 ("So, so" → "SO, SO").
    두 번 읽어 다른 곳만 그림(png/번호.png)으로 확인하면 된다. 원래 크기 쪽이 대체로 더 맞았다(호퍼스 2026-10-01).
★ Tesseract는 한 번만 부른다 (목록 파일 입력) — 그림마다 띄우지 않는다.
"""
import os
import subprocess
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sdh_clean import clean  # noqa: E402

TESSERACT = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def main():
    work = sys.argv[1]
    png, png2 = os.path.join(work, "png"), os.path.join(work, "png2")
    os.makedirs(png2, exist_ok=True)
    names = sorted(n for n in os.listdir(png) if n.endswith(".png"))
    list2 = os.path.join(work, "list2.txt")
    with open(list2, "w", encoding="utf-8") as lf:
        for n in names:
            im = Image.open(os.path.join(png, n))
            im.resize((im.width * 2, im.height * 2), Image.LANCZOS).save(os.path.join(png2, n))
            lf.write(os.path.abspath(os.path.join(png2, n)) + "\n")
    env = dict(os.environ, OMP_THREAD_LIMIT="2")
    creation = 0x00004000 if os.name == "nt" else 0  # BELOW_NORMAL_PRIORITY_CLASS
    subprocess.run([TESSERACT, list2, os.path.join(work, "ocr2"), "--psm", "6", "-l", "eng"],
                   check=True, env=env, creationflags=creation,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    with open(os.path.join(work, "ocr.txt"), encoding="utf-8") as f:
        a = f.read().split("\f")
    with open(os.path.join(work, "ocr2.txt"), encoding="utf-8") as f:
        b = f.read().split("\f")
    rows = []
    for i, (x, y) in enumerate(zip(a, b), 1):
        cx, cy = clean(x.strip()), clean(y.strip())
        if cx != cy:
            rows.append(f"{i:04d}\t{cx.replace(chr(10), ' / ')}\t{cy.replace(chr(10), ' / ')}")
    with open(os.path.join(work, "diff_clean.tsv"), "w", encoding="utf-8") as f:
        f.write("\n".join(rows) + "\n")
    print(f"조각 {len(names)} · 정리한 글이 다른 곳 {len(rows)} → diff_clean.tsv")


if __name__ == "__main__":
    main()
