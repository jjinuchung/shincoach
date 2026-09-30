"""청각장애인용(SDH) 영어 자막 → 따라 말하기용 영어 SRT

사용:
    python tools/sdh_clean.py ocr.srt 출력.en.srt [--fix 고칠목록.tsv] [--known 기존1.en.srt 기존2.en.srt ...]

하는 일:
  · [bell ringing] [student 1] 같은 소리 설명·화자 이름표를 뺀다 (줄을 넘어가도, 닫는 괄호를 잘못 읽어도)
  · OCR이 기울임 I를 "|" "/"로 읽은 것을 고친다 ("| need" · "/'m" · "Am/a" · "A//")
  · 노래 가사의 ♪를 OCR이 > ? £ f 2 S 로 읽은 것 → 기존 자막(모아나)과 같은 "♪ 가사 ♪"
  · 두 사람 대사는 기존 자막과 같은 "- A" / "- B" 모양, 한 사람만 남으면 "-"를 뗀다
  · 글자가 하나도 안 남은 조각(소리 설명뿐)은 버린다
  · --fix: 사람이 그림(png)을 보고 고친 글 — "OCR번호<TAB>글"(줄바꿈은 \\n, 글이 DROP이면 버림). 규칙보다 먼저 적용
  · --known: 기존 영어 자막에 한 번도 안 나온 낱말을 모아 보여 준다 (OCR 오류·고유명사 검토용)
  · 출력 옆에 .map(정리본 번호 → OCR 번호 = png 이름)을 남겨 그림을 찾아보게 한다
"""
import re
import sys

TIME = re.compile(r"(\d\d:\d\d:\d\d,\d\d\d) --> (\d\d:\d\d:\d\d,\d\d\d)")
TAG = re.compile(r"\[[^\]]*\]", re.S)
WORD = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?")
# ♪를 잘못 읽은 글자 — 줄 앞: > ? £ » ♪ 또는 "2 " / 줄 끝: > £ f Lf ♪
NOTE_START = re.compile(r"^(?:[>?£»♪~]|2(?= ))\s*")
NOTE_END = re.compile(r"\s+(?:[>£f♪»]|Lf)$")
NOTE_END_LYRIC = re.compile(r"\s+[+$#}P2S]$")   # 가사 줄일 때만 — 끝에 홀로 남은 한 글자도 ♪


def read_srt(path):
    with open(path, encoding="utf-8-sig") as f:
        blocks = re.split(r"\n\s*\n", f.read().replace("\r\n", "\n").strip())
    cues = []
    for b in blocks:
        lines = b.split("\n")
        for i, ln in enumerate(lines):
            m = TIME.search(ln)
            if m:
                cues.append((m.group(1), m.group(2), "\n".join(lines[i + 1:])))
                break
    return cues


def fix_ocr(line):
    line = line.replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"').replace("\u201d", '"')
    line = line.replace("I|'", "I'").replace("|", "I")                # 세로 막대는 자막에 없다 → I
    line = re.sub(r"\bA//", "All", line)                               # "A// good" → "All good"
    line = re.sub(r"(?<![A-Za-z])/'", "I'", line)                      # "/'m" → "I'm"
    line = re.sub(r"(?<![A-Za-z])/(?=[tfns]\b)", "I", line)            # 기울임 It·If·In·Is → "/t" "/f" "/n" "/s"
    line = re.sub(r"(?<=[a-z])/(?=[a-z])", " I ", line)                # "Am/a" → "Am I a"
    line = re.sub(r"^(-?\s*)/\s*(?=[a-z])", r"\1I ", line)            # "/ love" · "/am" → "I love" · "I am"
    line = re.sub(r"(?<=\s)/(?=\s|[a-z])", "I ", line).replace("I  ", "I ")  # 문장 가운데 " / " · " /a"
    line = re.sub(r"(?<=[a-z] )1(?= [a-z])", "I", line)                # "all 1 see" → "all I see"
    line = re.sub(r"\b7(?=h[a-z])", "T", line)                         # "7his" → "This"
    line = re.sub(r"\bnO\b", "no", line)
    line = re.sub(r"(?<=[a-z] )Is\b", "is", line)                     # "This Is a" — 기울임 i를 대문자로 읽음
    line = re.sub(r"^\.\.(?!\.)", "...", line)                         # "..and" → "...and"
    line = re.sub(r"\bl(?='(?:m|ll|ve|d)\b)", "I", line)               # l'm → I'm
    line = re.sub(r"(?<![A-Za-z'])l(?![A-Za-z'])", "I", line)          # 홀로 선 l → I
    line = re.sub(r"\bls\b", "Is", line)                               # ls → Is
    line = re.sub(r"\bI Know\b", "I know", line)                       # 기울임 k를 대문자로 읽음
    line = re.sub(r"\b([Yy]ou|[Tt]hey|[Ww]e)re\b", r"\1're", line)     # youre → you're (아포스트로피 빠짐)
    line = re.sub(r"(?<=[a-z])'\?$", "?", line)                        # life'? → life?
    return line


def clean(text):
    text = re.sub(r"(?<![\[\w])l([a-z]+)\]", r"[\1]", text)            # "lyelps]" = "[yelps]"
    text = TAG.sub("", text)
    text = re.sub(r"\[[^\]]*$", "", text, flags=re.S)                  # 닫는 괄호를 못 읽은 설명은 끝까지 버린다
    speakers = []   # [[줄, ...], ...]
    lyric = False
    for raw in text.split("\n"):
        ln = raw.strip()
        dash = ln.startswith("-")
        if dash:
            ln = ln.lstrip("-").strip()
        if NOTE_START.search(ln):
            lyric = True
            ln = NOTE_START.sub("", ln)
            ln = re.sub(r"(?<=[a-z])S$", "", ln)                       # "OhS" "Heys" — 붙어 읽힌 ♪
        if NOTE_END.search(ln):
            lyric = True
            ln = NOTE_END.sub("", ln)
        if lyric:
            ln = NOTE_END_LYRIC.sub("", ln)
        ln = fix_ocr(ln.strip())
        if not ln:
            continue
        if dash or not speakers:
            speakers.append([ln])
        else:
            speakers[-1].append(ln)
    speakers = [[x for x in sp if x] for sp in speakers]
    speakers = [sp for sp in speakers if any(re.search(r"[A-Za-z]", x) for x in sp)]
    if not speakers:
        return ""
    if len(speakers) == 1:
        out = "\n".join(speakers[0])
    else:
        out = "\n".join("- " + " ".join(sp) for sp in speakers)
    return f"♪ {out} ♪" if lyric else out


def read_fixes(path):
    fixes = {}
    with open(path, encoding="utf-8") as f:
        for ln in f:
            ln = ln.rstrip("\n")
            if not ln.strip() or ln.startswith("#"):
                continue
            num, text = ln.split("\t", 1)
            fixes[int(num)] = text.replace("\\n", "\n")
    return fixes


def main():
    args = sys.argv[1:]
    known_paths = []
    if "--known" in args:
        k = args.index("--known")
        known_paths = args[k + 1:]
        args = args[:k]
    fixes = {}
    if "--fix" in args:
        k = args.index("--fix")
        fixes = read_fixes(args[k + 1])
        args = args[:k] + args[k + 2:]
    src, dst = args
    out = []
    dropped = 0
    used = set()
    for n, (start, end, text) in enumerate(read_srt(src), 1):
        if n in fixes:
            used.add(n)
            t = "" if fixes[n] == "DROP" else fixes[n]
        else:
            t = clean(text)
        if t:
            out.append((start, end, t, n))
        else:
            dropped += 1
    if set(fixes) - used:
        raise SystemExit(f"고칠 목록에 없는 번호: {sorted(set(fixes) - used)}")
    with open(dst, "w", encoding="utf-8") as f:
        for i, (s, e, t, _) in enumerate(out, 1):
            f.write(f"{i}\n{s} --> {e}\n{t}\n\n")
    with open(dst + ".map", "w", encoding="utf-8") as f:
        for i, (s, _, t, n) in enumerate(out, 1):
            f.write(f"{i}\t{n:04d}\t{s}\t{t.replace(chr(10), ' / ')}\n")
    print(f"{len(out)}개 남김 · 버림 {dropped}개 · 손으로 고침 {len(fixes)}개 → {dst}")

    if known_paths:
        known = set()
        for p in known_paths:
            for _, _, t in read_srt(p):
                known.update(w.lower() for w in WORD.findall(t))
        seen = {}
        for i, (_, _, t, n) in enumerate(out, 1):
            for w in WORD.findall(t):
                if w.lower() not in known:
                    seen.setdefault(w, []).append(n)
        print(f"\n기존 자막에 없는 낱말 {len(seen)}개 (낱말 · 횟수 · 첫 OCR 번호):")
        for w, where in sorted(seen.items(), key=lambda kv: (-len(kv[1]), kv[0].lower())):
            print(f"  {w} {len(where)} #{where[0]:04d}")


if __name__ == "__main__":
    main()
