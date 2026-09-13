"""hardsub_frames.py의 index.json + 사람이/AI가 시트를 읽어 적은 텍스트(tsv) → 한글 srt.

읽기 파일 형식 (탭 구분, 한 줄 = 한 큐; 두 줄 자막은 ' / '로 구분):
  0007	가장 높은 산에서 가장 낮은 골짜기까지 / 타이 렁이 살아있음을 알리라.

사용법:
  python tools/hardsub_srt.py <index.json> <읽기.tsv> [<읽기2.tsv> …] --out <한글.srt>

- 시트에 안 실린 큐(dup_of)는 앞 큐의 텍스트를 이어받고, 같은 텍스트가 연속되면 한 큐로 합침
  (영어 큐 두 개에 한글 자막 하나가 걸쳐 있는 경우 → 한글 큐 하나가 두 영어 큐를 덮음)
- 자막 없는 큐(has_text=false)나 읽기 파일에 없는 번호는 건너뜀 → 보고
"""
import argparse
import json
import sys
from pathlib import Path


def fmt_time(sec: float) -> str:
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("index")
    ap.add_argument("readings", nargs="+")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    index = json.loads(Path(args.index).read_text(encoding="utf-8"))
    text_by_i = {}
    for rp in args.readings:
        for ln, raw in enumerate(Path(rp).read_text(encoding="utf-8-sig").splitlines(), 1):
            if not raw.strip() or raw.startswith("#"):
                continue
            parts = raw.split("\t", 1)
            if len(parts) != 2 or not parts[0].strip().isdigit():
                sys.exit(f"{rp}:{ln}: 형식 오류: {raw!r}")
            i = int(parts[0])
            t = parts[1].strip().replace(" / ", "\n")
            if t:
                text_by_i[i] = t

    missing = []
    cues = []  # [start, end, text]
    for e in index:
        if not e["has_text"]:
            continue
        i = e["i"]
        src = e["dup_of"] if e["dup_of"] is not None else i
        # dup 체인 따라가기
        seen = 0
        while src not in text_by_i and seen < 5:
            nxt = next((x["dup_of"] for x in index if x["i"] == src), None)
            if nxt is None:
                break
            src, seen = nxt, seen + 1
        t = text_by_i.get(src)
        if t is None:
            missing.append(i)
            continue
        if cues and cues[-1][2] == t and e["start"] - cues[-1][1] < 1.5:
            cues[-1][1] = max(cues[-1][1], e["end"])  # 같은 자막이 이어짐 → 늘림
        else:
            cues.append([e["start"], e["end"], t])

    out = []
    for n, (s, e, t) in enumerate(cues, 1):
        out += [str(n), f"{fmt_time(s)} --> {fmt_time(e)}", t, ""]
    Path(args.out).write_text("\n".join(out), encoding="utf-8")
    print(f"{args.out}: 한글 큐 {len(cues)}개 (영어 큐 {len(index)}개 중 자막 있음 {sum(1 for e in index if e['has_text'])})")
    if missing:
        print(f"읽기 누락 {len(missing)}개: {missing[:30]}{' …' if len(missing) > 30 else ''}")


if __name__ == "__main__":
    main()
