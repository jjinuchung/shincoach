"""사람이 교정한 문장들을 whisper의 단어 타이밍에 맞춰 SRT로 만든다.

whisper는 문장을 길게 뭉쳐 놓거나(한 큐에 3~4문장) 문장부호를 빠뜨리는데,
섀도잉·받아쓰기는 **한 문장 단위**여야 한다. 타임코드를 손으로 적으면 반드시 어긋나므로
교정한 문장을 단어 타이밍에 붙여 시작·끝을 자동으로 찾는다.

사용:
  python tools/align_srt.py <words.json> <교정문장.txt> <출력.srt> [--min-dur 0.4]

교정문장.txt: 한 줄에 한 문장 (순서대로). 빈 줄·# 로 시작하는 줄은 무시.
  - 인식된 단어를 기준으로 맞추므로, 문장부호·대소문자는 마음대로 고쳐도 된다
  - 단어를 조금 바꾸거나(오인식 교정) 빼도 되지만, 순서는 영상과 같아야 한다
  - 버릴 구간(울음소리 등)은 **앞에 ~ 를 붙여** 남겨 둔다: `~Pika pika!`
    자막에는 안 나오지만 그 자리를 지나갔다고 알려 줘야 뒤 문장이 제자리를 찾는다.
    (그냥 지우면, 내가 고친 이름이 인식 결과에 아예 없을 때 뒤 문장이 몇 초 당겨진다)
"""
import argparse
import io
import json
import re
import sys

for st in (sys.stdout, sys.stderr):
    try:
        st.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def norm(w):
    """비교용: 소문자 + 영문자·숫자·아포스트로피만"""
    return re.sub(r"[^a-z0-9']", "", w.lower().replace("’", "'"))


def load_words(path):
    """words.json → [(정규화 단어, 시작, 끝)]"""
    segs = json.load(io.open(path, encoding="utf-8"))
    out = []
    for seg in segs:
        for w in seg.get("words", []):
            n = norm(w.get("w", ""))
            if n:
                out.append((n, float(w["s"]), float(w["e"])))
    return out


def load_lines(path):
    out = []
    for raw in io.open(path, encoding="utf-8"):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        out.append(line)
    return out


def score_at(rec, pos, mine, n=3):
    """rec[pos]부터 mine의 앞 n단어가 얼마나 맞는지"""
    hit = 0
    for i in range(min(n, len(mine))):
        if pos + i < len(rec) and rec[pos + i][0] == mine[i]:
            hit += 1
    return hit


def fmt(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("words")
    ap.add_argument("lines")
    ap.add_argument("out")
    ap.add_argument("--min-dur", type=float, default=0.4, help="이보다 짧은 큐는 버림")
    ap.add_argument("--window", type=int, default=40, help="시작 위치를 찾을 때 앞으로 훑는 단어 수")
    args = ap.parse_args()

    rec = load_words(args.words)
    lines = load_lines(args.lines)
    print(f"인식 단어 {len(rec)}개 / 교정 문장 {len(lines)}줄")

    cursor = 0
    cues = []
    weak = []
    for idx, text in enumerate(lines, 1):
        skip = text.startswith("~")  # 자막에는 안 넣지만 자리는 지나간다
        if skip:
            text = text[1:].strip()
        mine = [norm(w) for w in text.split()]
        mine = [w for w in mine if w]
        if not mine:
            continue
        # 시작 위치: 커서부터 window 안에서 앞 단어들이 가장 잘 맞는 자리
        # ~줄(울음소리 등)은 커서 바로 근처에만 있다 — 멀리서 같은 단어를 찾아 붙으면 뒤 문장이 통째로 밀린다 (2026-09-22 beary_icy: ~Beartic!이 40단어 뒤 진짜 Beartic에 붙었다)
        window = min(args.window, 6) if skip else args.window
        best_pos, best = cursor, -1
        for pos in range(cursor, min(cursor + window, len(rec))):
            sc = score_at(rec, pos, mine)
            if sc > best:
                best, best_pos = sc, pos
            if sc == min(3, len(mine)):
                break
        if cursor >= len(rec):  # 인식 단어를 다 썼는데 문장이 남았다 — 앞에서 ~줄이 단어를 너무 많이 먹었거나 인식이 빠진 것
            print(f"[warn] {idx}행부터는 인식 단어가 남지 않아 마지막 단어 시각에 붙인다: {text[:40]}")
            best_pos = len(rec) - 1
        start_i = best_pos
        end_i = min(start_i + len(mine) - 1, len(rec) - 1)
        # 끝 위치 보정: 마지막 단어가 주변에 있으면 거기까지
        last = mine[-1]
        for d in range(-3, 4):
            j = end_i + d
            if start_i <= j < len(rec) and rec[j][0] == last:  # 시작보다 앞의 같은 단어(앞 줄의 return!)를 잡으면 한 단어짜리가 된다
                end_i = j
                break
        if end_i < start_i:
            end_i = start_i
        s, e = rec[start_i][1], rec[end_i][2]
        if best < min(2, len(mine)) and not skip:
            weak.append((idx, text[:50], best))
        if not skip:
            cues.append((s, e, text))
        cursor = end_i + 1

    # 겹침 정리 + 너무 짧은 큐 제외
    cues.sort(key=lambda c: c[0])
    body, dropped = [], 0
    n = 0
    for i, (s, e, text) in enumerate(cues):
        if i + 1 < len(cues):
            e = min(e, cues[i + 1][0] - 0.01)
        if e - s < args.min_dur:
            dropped += 1
            continue
        n += 1
        body += [str(n), f"{fmt(s)} --> {fmt(e)}", text, ""]

    io.open(args.out, "w", encoding="utf-8", newline="\n").write("\n".join(body))
    print(f"{args.out}: {n}줄 저장 (너무 짧아 제외 {dropped}줄)")
    if weak:
        print("⚠ 붙일 자리를 확신하지 못한 줄 (확인 필요):")
        for idx, text, sc in weak:
            print(f"   {idx}행 (앞단어 일치 {sc}/3): {text}")
    else:
        print("모든 줄이 인식 단어에 맞춰졌다")


if __name__ == "__main__":
    main()
