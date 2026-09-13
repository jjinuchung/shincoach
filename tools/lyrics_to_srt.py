"""가사 타임테이블(탭 구분 텍스트) → 영어/한글 SRT 두 개 생성.

입력 형식 (한 줄 = 한 큐, 탭 구분, '#'로 시작하면 주석):
  시작초<TAB>끝초<TAB>영어(원문)<TAB>한글
  18.8	22.2	I was a ghost, I was alone.	난 유령 같았어, 혼자였어.

사용법:
  python tools/lyrics_to_srt.py <타임테이블.tsv> [--prefix 출력이름] [--tail 0.3]
  → <prefix>.en.srt, <prefix>.ko.srt (기본 prefix = 입력 파일명에서 확장자 제거)

- 앱의 문장 합치기(mergeIntoSentences)는 줄 끝에 . ! ? 가 없으면 다음 줄과 합치므로
  노래 가사는 줄마다 마침표를 붙이는 것을 권장 (없으면 경고 출력)
- 시작/끝이 이전 큐와 겹치거나 역전되면 오류
- --tail: 모든 큐의 끝을 N초 늘림 (기본 0.3). 노래는 마지막 음절을 다음 줄 시작까지 끌기 때문에
  타임테이블의 끝(= 다음 줄 시작)에서 멈추면 "voi…"처럼 잘림. 다음 줄과 겹쳐도 앱은 문제없음
  (findCueIndex는 뒤 큐 우선, 한글 매칭은 50% 이상 겹침 기준)
"""
import argparse
import json
import sys
from pathlib import Path

SENTENCE_END = ".!?…"


def fmt_time(sec: float) -> str:
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def parse_table(path: Path):
    rows = []
    for ln, raw in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), 1):
        line = raw.rstrip("\n")
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        parts = line.split("\t")
        if len(parts) < 4:
            sys.exit(f"{path}:{ln}: 열이 4개 미만 (시작, 끝, 영어, 한글)")
        try:
            start, end = float(parts[0]), float(parts[1])
        except ValueError:
            sys.exit(f"{path}:{ln}: 시간 형식 오류: {parts[0]!r} {parts[1]!r}")
        en, ko = parts[2].strip(), parts[3].strip()
        if end <= start:
            sys.exit(f"{path}:{ln}: 끝({end}) <= 시작({start})")
        if rows and start < rows[-1][0]:
            sys.exit(f"{path}:{ln}: 시작 시간이 이전 큐보다 빠름")
        if rows and start < rows[-1][1]:
            print(f"[warn] {ln}행: 이전 큐 끝({rows[-1][1]})과 겹침 (시작 {start})", file=sys.stderr)
        if en and en.rstrip("\"'”’)")[-1:] not in SENTENCE_END:  # 앱과 같이 닫는 따옴표는 무시
            print(f"[warn] {ln}행: 영어 줄 끝에 문장부호 없음 → 앱에서 다음 줄과 합쳐질 수 있음: {en}", file=sys.stderr)
        rows.append((start, end, en, ko))
    return rows


def write_srt(rows, col: int, path: Path, tail: float = 0.0):
    out = []
    n = 0
    for start, end, en, ko in rows:
        text = (en, ko)[col]
        if not text:
            continue
        n += 1
        out += [str(n), f"{fmt_time(start)} --> {fmt_time(end + tail)}", text, ""]
    path.write_text("\n".join(out), encoding="utf-8")
    return n


def fmt_vtt(sec: float) -> str:
    return fmt_time(sec).replace(",", ".")


def karaoke_line(text: str, words, start: float) -> str:
    """단어 앞에 <hh:mm:ss.mmm> 태그 (lyrics_align.py 결과; 시간 없는 단어는 태그 없이 → 앱이 보간)"""
    tokens = text.split()
    if not words or len(words) != len(tokens) or any(w["w"] != t for w, t in zip(words, tokens)):
        return text  # 단어 목록이 안 맞으면 태그 없이 (앱이 글자 수 비례로 추정)
    parts = []
    for w in words:
        s = w.get("s")
        parts.append((f"<{fmt_vtt(max(s, start))}>" if s is not None else "") + w["w"])
    return " ".join(parts)


def write_vtt(rows, path: Path, words_by_line: dict, tail: float = 0.0):
    """영어 VTT (노래방 태그 포함). words_by_line: {"줄번호": [{"w","s"}, …]}"""
    out = ["WEBVTT", ""]
    n = 0
    for i, (start, end, en, ko) in enumerate(rows):
        if not en:
            continue
        n += 1
        out += [str(n), f"{fmt_vtt(start)} --> {fmt_vtt(end + tail)}", karaoke_line(en, words_by_line.get(str(i)), start), ""]
    path.write_text("\n".join(out), encoding="utf-8")
    return n


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("table", help="탭 구분 타임테이블 파일")
    ap.add_argument("--prefix", help="출력 파일 접두어 (기본: 입력 파일명)")
    ap.add_argument("--tail", type=float, default=0.3, help="큐 끝에 더할 여유(초). 잘리면 올리고, 다음 줄이 많이 들리면 내림")
    ap.add_argument("--words", help="lyrics_align.py가 만든 단어 시간 json → 영어는 .en.vtt(노래방 태그)로 출력")
    args = ap.parse_args()

    table = Path(args.table)
    prefix = Path(args.prefix) if args.prefix else table.with_suffix("")
    rows = parse_table(table)
    if args.words:
        words_by_line = json.loads(Path(args.words).read_text(encoding="utf-8"))
        n_en = write_vtt(rows, prefix.with_name(prefix.name + ".en.vtt"), words_by_line, args.tail)
        en_name = f"{prefix}.en.vtt"
    else:
        n_en = write_srt(rows, 0, prefix.with_name(prefix.name + ".en.srt"), args.tail)
        en_name = f"{prefix}.en.srt"
    n_ko = write_srt(rows, 1, prefix.with_name(prefix.name + ".ko.srt"), args.tail)
    print(f"{en_name} ({n_en}큐), {prefix}.ko.srt ({n_ko}큐) 생성 (끝 여유 +{args.tail}s)")


if __name__ == "__main__":
    main()
