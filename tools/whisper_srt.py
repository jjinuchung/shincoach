"""로컬 음성 인식(faster-whisper)으로 영상/음성에서 SRT 자막 초안을 만든다.

사용법:
  python tools/whisper_srt.py <미디어파일> [--model large-v3] [--lang en|ko|auto]
                              [--out 출력.srt] [--prompt "힌트 문장"]

- 출력: <미디어파일 이름>.whisper.srt (문장/줄 단위) + .words.json (단어별 타이밍, 교정용)
- 노래는 오인식이 있으므로 결과를 화면 가사·공식 가사와 대조해 교정할 것
- 이 PC는 TRADEMY API가 상시 실행 중 → 프로세스 우선순위를 Idle로 낮춰서 돌린다
"""
import argparse
import json
import sys
from pathlib import Path


def set_idle_priority():
    """Windows에서 현재 프로세스를 Idle 우선순위로 (다른 서비스에 영향 최소화)"""
    if sys.platform != "win32":
        return
    try:
        import ctypes
        IDLE_PRIORITY_CLASS = 0x00000040
        kernel32 = ctypes.windll.kernel32
        kernel32.SetPriorityClass(kernel32.GetCurrentProcess(), IDLE_PRIORITY_CLASS)
    except Exception as e:  # 우선순위 조정 실패는 치명적이지 않음
        print(f"[warn] 우선순위 조정 실패: {e}", file=sys.stderr)


def fmt_time(sec: float) -> str:
    """초 → SRT 타임코드 (HH:MM:SS,mmm)"""
    if sec < 0:
        sec = 0
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def write_srt(segments, path: Path):
    lines = []
    for i, seg in enumerate(segments, 1):
        lines.append(str(i))
        lines.append(f"{fmt_time(seg['start'])} --> {fmt_time(seg['end'])}")
        lines.append(seg["text"])
        lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("media", help="영상/음성 파일 경로")
    ap.add_argument("--model", default="large-v3", help="whisper 모델 (large-v3, medium, small, turbo)")
    ap.add_argument("--lang", default="auto", help="언어 코드 (en, ko) 또는 auto")
    ap.add_argument("--out", help="출력 SRT 경로 (기본: <미디어>.whisper.srt)")
    ap.add_argument("--prompt", default=None, help="인식 힌트 문장 (고유명사·스타일)")
    ap.add_argument("--vad", action="store_true", help="무음 구간 필터 사용 (노래엔 비권장)")
    ap.add_argument("--force", action="store_true", help="무음/저확률 판정 끄기 (음악 때문에 통째로 건너뛴 구간용)")
    ap.add_argument("--offset", type=float, default=0.0, help="잘라낸 클립이면 원본 기준 시작 초 (출력 시간에 더함)")
    ap.add_argument("--threads", type=int, default=4, help="CPU 스레드 수 (기본 4, 다른 서비스 배려)")
    args = ap.parse_args()

    media = Path(args.media)
    if not media.exists():
        sys.exit(f"파일 없음: {media}")
    out_srt = Path(args.out) if args.out else media.with_suffix(".whisper.srt")
    out_words = out_srt.with_suffix(".words.json")

    set_idle_priority()

    from faster_whisper import WhisperModel

    print(f"[1/3] 모델 로드: {args.model} (처음이면 다운로드, 수 GB)", flush=True)
    model = WhisperModel(args.model, device="cpu", compute_type="int8", cpu_threads=args.threads)

    lang = None if args.lang == "auto" else args.lang
    print(f"[2/3] 인식 시작: {media.name} (lang={args.lang})", flush=True)
    segments_iter, info = model.transcribe(
        str(media),
        language=lang,
        beam_size=5,
        word_timestamps=True,
        vad_filter=args.vad,
        condition_on_previous_text=False,  # 노래에서 같은 줄 반복 환각 방지
        initial_prompt=args.prompt,
        no_speech_threshold=None if args.force else 0.6,
        log_prob_threshold=None if args.force else -1.0,
    )
    print(f"   감지 언어: {info.language} (확률 {info.language_probability:.2f}), 길이 {info.duration:.1f}s", flush=True)

    segments = []
    for seg in segments_iter:
        text = seg.text.strip()
        if not text:
            continue
        words = [
            {"w": w.word.strip(), "s": round(w.start + args.offset, 3), "e": round(w.end + args.offset, 3), "p": round(w.probability, 2)}
            for w in (seg.words or [])
        ]
        segments.append({"start": round(seg.start + args.offset, 3), "end": round(seg.end + args.offset, 3), "text": text, "words": words})
        print(f"   {fmt_time(seg.start + args.offset)} --> {fmt_time(seg.end + args.offset)}  {text}", flush=True)

    print(f"[3/3] 저장: {out_srt} ({len(segments)}줄), {out_words}", flush=True)
    write_srt(segments, out_srt)
    out_words.write_text(json.dumps(segments, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
