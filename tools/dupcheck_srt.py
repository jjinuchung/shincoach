"""새 영상의 인식 결과가 기존 학습 자료(*.en.srt)와 얼마나 겹치는지 본다 — 만들기 전에 알리기 위해.

같은 채널의 "모음" 클립들은 같은 장면을 돌려쓴다. 제목만으로는 못 가르므로 대사를 대조한다.
문장을 정규화(소문자·문장부호 제거)해 4단어 이상인 줄만, 기존 줄과 0.85 이상 비슷하면 겹친 것으로 센다.

사용: python tools/dupcheck_srt.py <새.srt> <기존 자료 루트 폴더> [--min-words 4] [--ratio 0.85]
"""
import argparse
import difflib
import io
import re
import sys
from pathlib import Path

for st in (sys.stdout, sys.stderr):
    try:
        st.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def srt_lines(path):
    text = io.open(path, encoding="utf-8", errors="replace").read()
    out = []
    for block in re.split(r"\n\n+", text.strip()):
        lines = [l for l in block.split("\n") if l.strip()]
        if len(lines) >= 3:
            out.append(" ".join(lines[2:]))
    return out


def norm(s):
    s = s.lower()
    s = re.sub(r"[^a-z0-9' ]+", " ", s)
    return " ".join(s.split())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("new_srt")
    ap.add_argument("root")
    ap.add_argument("--min-words", type=int, default=4)
    ap.add_argument("--ratio", type=float, default=0.85)
    a = ap.parse_args()

    new = [norm(l) for l in srt_lines(a.new_srt)]
    new = [l for l in new if len(l.split()) >= a.min_words]
    new_path = Path(a.new_srt).resolve()
    corpus = {}
    for p in Path(a.root).rglob("*.en.srt"):
        if p.resolve() == new_path:
            continue
        corpus[p] = [norm(l) for l in srt_lines(p)]

    print(f"새 자료 문장 {len(new)}개 (≥{a.min_words}단어) · 기존 자료 {len(corpus)}개")
    if not new:
        return
    per_file = []
    for p, lines in corpus.items():
        if not lines:
            continue
        hit = 0
        for l in new:
            m = difflib.get_close_matches(l, lines, n=1, cutoff=a.ratio)
            if m:
                hit += 1
        if hit:
            per_file.append((hit / len(new), hit, p))
    per_file.sort(reverse=True)
    if not per_file:
        print("겹치는 문장 없음 — 새 자료입니다.")
        return
    for r, hit, p in per_file[:8]:
        print(f"{r*100:5.1f}%  {hit:3d}줄  {p}")
    top = per_file[0]
    if top[0] >= 0.3:
        print(f"⚠️ {top[2].name}와 {top[0]*100:.0f}% 겹칩니다 — 만들기 전에 확인이 필요합니다.")


if __name__ == "__main__":
    main()
