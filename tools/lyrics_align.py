"""가사 타임테이블(tsv)의 각 줄에 단어별 시작 시간을 붙인다 (노래방식 하이라이트용).

원리: 줄 몇 개씩(≤ 28초) 묶어 그 구간 오디오만 faster-whisper에 넣되, 그 구간의 영어 가사를
initial_prompt로 주고 무음/저확률 판정을 꺼서(--force) 가사를 거의 그대로 받아쓰게 한다.
그러면 단어 타임스탬프가 실제 노래에 맞춰 나오므로, 그것을 tsv 줄의 단어에 붙인다.
(한국어 줄은 영어 모드에서 못 받아쓰므로 단어 시간 없음 → 앱이 글자 수 비례로 추정)

사용법:
  python tools/lyrics_align.py <미디어> <타임테이블.tsv> [--out words.json] [--model large-v3]
  → words.json: { "줄번호(0부터)": [{"w": 단어, "s": 시작초}, …] }  (시간 못 잡은 단어는 s=null)
  이어서: python tools/lyrics_to_srt.py <tsv> --words words.json  → .en.vtt (노래방 태그)
"""
import argparse
import difflib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lyrics_to_srt import parse_table  # noqa: E402
from whisper_srt import set_idle_priority  # noqa: E402

CHUNK_SEC = 28.0     # whisper 창(30초)보다 조금 작게
PAD_BEFORE = 0.3
PAD_AFTER = 0.5
MIN_SIM = 0.6        # 이 이상 닮은 단어만 시간 채택


def is_english(text: str) -> bool:
    return re.search(r"[A-Za-z]", text) is not None and re.search(r"[가-힣]", text) is None


def norm(tok: str) -> str:
    return re.sub(r"[^a-z0-9]", "", tok.lower().replace("’", "'"))


def sim(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    # gettin' ↔ getting, glowin' ↔ glowing 같은 축약형
    if len(a) >= 4 and len(b) >= 4 and (a.startswith(b[:-1]) or b.startswith(a[:-1])):
        return 0.9
    return difflib.SequenceMatcher(None, a, b).ratio()


def align(tokens, words):
    """줄의 단어(tokens)와 whisper 단어(words)를 순서 유지 정렬 → 토큰별 시작 시간(없으면 None)"""
    n, m = len(tokens), len(words)
    GAP = -0.3
    score = [[0.0] * (m + 1) for _ in range(n + 1)]
    back = [[None] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        score[i][0] = i * GAP
        back[i][0] = "up"
    for j in range(1, m + 1):
        score[0][j] = j * GAP
        back[0][j] = "left"
    tn = [norm(t) for t in tokens]
    wn = [norm(w["w"]) for w in words]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            s = sim(tn[i - 1], wn[j - 1])
            diag = score[i - 1][j - 1] + (s if s >= MIN_SIM else -0.5)
            up = score[i - 1][j] + GAP
            left = score[i][j - 1] + GAP
            best = max(diag, up, left)
            score[i][j] = best
            back[i][j] = "diag" if best == diag else ("up" if best == up else "left")
    starts = [None] * n
    i, j = n, m
    while i > 0 or j > 0:
        move = back[i][j]
        if move == "diag":
            if sim(tn[i - 1], wn[j - 1]) >= MIN_SIM:
                starts[i - 1] = words[j - 1]["s"]
            i, j = i - 1, j - 1
        elif move == "up":
            i -= 1
        else:
            j -= 1
    # 단조 증가 보장: 앞 단어보다 빠른 시간은 버림
    prev = -1.0
    for k in range(n):
        if starts[k] is None:
            continue
        if starts[k] < prev:
            starts[k] = None
        else:
            prev = starts[k]
    return starts


def chunk_rows(rows):
    """연속 줄을 ≤ CHUNK_SEC 묶음으로. 각 묶음: (시작, 끝, [줄 인덱스])"""
    chunks = []
    cur = []
    for idx, (start, end, en, ko) in enumerate(rows):
        if cur and end - rows[cur[0]][0] > CHUNK_SEC:
            chunks.append(cur)
            cur = []
        cur.append(idx)
    if cur:
        chunks.append(cur)
    return [(rows[c[0]][0], rows[c[-1]][1], c) for c in chunks]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("media")
    ap.add_argument("table")
    ap.add_argument("--out", help="출력 json (기본: <tsv 이름>.words.json)")
    ap.add_argument("--model", default="large-v3")
    ap.add_argument("--threads", type=int, default=4)
    args = ap.parse_args()

    rows = parse_table(Path(args.table))
    out_path = Path(args.out) if args.out else Path(args.table).with_suffix(".words.json")
    set_idle_priority()

    from faster_whisper import WhisperModel
    from faster_whisper.audio import decode_audio

    print(f"[1/3] 모델 로드: {args.model}", flush=True)
    model = WhisperModel(args.model, device="cpu", compute_type="int8", cpu_threads=args.threads)
    print(f"[2/3] 오디오 디코드: {args.media}", flush=True)
    audio = decode_audio(args.media, sampling_rate=16000)
    sr = 16000

    result = {}
    chunks = chunk_rows(rows)
    for ci, (c_start, c_end, idxs) in enumerate(chunks, 1):
        en_lines = [rows[i][2] for i in idxs if is_english(rows[i][2])]
        if not en_lines:
            continue
        a = max(0.0, c_start - PAD_BEFORE)
        b = c_end + PAD_AFTER
        clip = audio[int(a * sr):int(b * sr)]
        prompt = " ".join(en_lines)
        print(f"[{ci}/{len(chunks)}] {a:.1f}~{b:.1f}s 줄 {idxs[0] + 1}~{idxs[-1] + 1}: {prompt[:60]}…", flush=True)
        segments, _ = model.transcribe(
            clip, language="en", beam_size=5, word_timestamps=True, vad_filter=False,
            condition_on_previous_text=False, initial_prompt=prompt,
            no_speech_threshold=None, log_prob_threshold=None,
        )
        words = []
        for seg in segments:
            for w in seg.words or []:
                words.append({"w": w.word.strip(), "s": round(w.start + a, 3), "e": round(w.end + a, 3)})
        print("   whisper:", " ".join(w["w"] for w in words)[:200], flush=True)

        for i in idxs:
            start, end, en, ko = rows[i]
            if not is_english(en):
                continue
            tokens = en.split()
            window = [w for w in words if start - 0.5 <= w["s"] <= end + 0.2]
            starts = align(tokens, window)
            got = sum(1 for s in starts if s is not None)
            if got < len(tokens) * 0.7:
                # 묶음에서 놓친 줄(반복 구절·건너뜀)은 그 줄 구간만 다시 받아쓰기
                a2, b2 = max(0.0, start - PAD_BEFORE), end + PAD_AFTER
                segs2, _ = model.transcribe(
                    audio[int(a2 * sr):int(b2 * sr)], language="en", beam_size=5, word_timestamps=True, vad_filter=False,
                    condition_on_previous_text=False, initial_prompt=en,
                    no_speech_threshold=None, log_prob_threshold=None,
                )
                words2 = [{"w": w.word.strip(), "s": round(w.start + a2, 3)} for seg in segs2 for w in (seg.words or [])]
                starts2 = align(tokens, words2)
                got2 = sum(1 for s in starts2 if s is not None)
                if got2 > got:
                    starts, got = starts2, got2
                    print(f"   (줄 {i + 1} 단독 재시도 → {got2}/{len(tokens)})", flush=True)
            result[str(i)] = [{"w": t, "s": s} for t, s in zip(tokens, starts)]
            flag = "" if got >= len(tokens) * 0.7 else "  ⚠ 매칭 적음"
            print(f"   줄 {i + 1:2d} {got}/{len(tokens)}: " + " ".join(f"{t}@{s:.1f}" if s is not None else f"{t}@?" for t, s in zip(tokens, starts)) + flag, flush=True)

    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"[3/3] 저장: {out_path} ({len(result)}줄)", flush=True)


if __name__ == "__main__":
    main()
