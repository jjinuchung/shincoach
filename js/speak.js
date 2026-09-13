// 말하기 확인: 따라 말하기 시간에 마이크로 듣고 "말했는지"(소리 에너지) + 가능하면 "비슷하게 말했는지"(음성 인식) 판정
// 구형 브라우저 호환을 위해 최신 문법(?., ??, ||=)은 쓰지 않는다.

const RMS_MIN = 0.012;        // 말소리 판정 문턱의 하한 (조용한 마이크 고려)
const RMS_MAX_THRESHOLD = 0.022; // 문턱의 상한 — 태블릿 마이크가 작아(최대 RMS ~0.03) 이보다 높으면 아이 목소리를 놓침
const NOISE_MULT = 2.5;       // 배경 소음의 몇 배 이상이면 말소리
const NOISE_WINDOW_MS = 100;  // 소음 바닥 추정 창 (창 평균의 최솟값 = 말 사이 쉬는 구간의 소음)
const SILENCE_END_MS = 1300;  // 말한 뒤 이만큼 조용하면 끝난 것으로
const PASS_RATIO = 0.4;       // 음성 인식: 단어 일치율 기준
// 내용 없는 짧은 단어 — 이것만 맞아서는 "따라 말했다"고 보지 않음
const STOP_WORDS = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'my', 'a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'is', 'am', 'are', 'was', 'be', 'and', 'or', 'but', 'so', 'do', 'oh', 'uh', 'um', 'ah', 'yes', 'no', 'ok', 'okay', 'hey', 'this', 'that', 'what', 'for', 'with', 'up', 'not', "don't", "it's", "i'm"]);

let micStream = null;         // 마이크 스트림은 한 번 열면 재사용 (매번 권한 프롬프트 방지)
let audioCtx = null;

function SpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/** 마이크·소리분석 준비. 실패하면 null (권한 거부, 미지원) */
export async function prepareMic() {
  if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx || audioCtx.state === 'closed') audioCtx = new AC();
  if (audioCtx.resume) audioCtx.resume().catch(() => {});
  if (micStream && micStream.getAudioTracks().some((t) => t.readyState === 'live')) return micStream;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return micStream;
  } catch (err) {
    micStream = null;
    return null;
  }
}

/** 마이크 끄기 (학습 종료·백그라운드). 다음 prepareMic()에서 다시 연다 */
export function releaseMic() {
  if (micStream) micStream.getTracks().forEach((t) => t.stop());
  micStream = null;
}

/** 텍스트 → 비교용 단어 배열 */
export function normalizeWords(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter((w) => w.length > 0);
}

/** 두 단어가 "비슷한" 발음/철자인지 (아이 발음 오차 허용) */
function similarWord(a, b) {
  if (a === b) return true;
  const strip = (w) => w.replace(/[^a-z]/g, '');
  a = strip(a); b = strip(b);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
  // 편집 거리 1 (4글자 이상) / 2 (7글자 이상)
  const d = editDistance(a, b);
  if (a.length >= 4 && d <= 1) return true;
  if (a.length >= 7 && d <= 2) return true;
  return false;
}

function editDistance(a, b) {
  const m = a.length; const n = b.length;
  const dp = [];
  for (let i = 0; i <= m; i++) { dp[i] = [i]; }
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[m][n];
}

/**
 * 원문과 인식 결과 비교 → { matched, total, ratio, passed, matchedWords, contentMatched }
 * 통과 기준:
 *  - 1~2단어 문장: 1단어 이상
 *  - 그 외: 일치율 ≥ 40%  또는  (2단어 이상 일치 + 그중 내용어 1개 이상, 6단어 이하 문장)
 *           또는 (3단어 이상 일치 + 내용어 1개 이상)
 *  → "I you" 같은 대명사 나열만으로는 긴 문장을 통과할 수 없음
 */
export function scoreTranscript(target, transcript) {
  const tw = normalizeWords(target);
  const sw = normalizeWords(transcript);
  const used = new Array(sw.length).fill(false);
  const matchedWords = [];
  let matched = 0;
  for (const w of tw) {
    let hit = -1;
    for (let i = 0; i < sw.length; i++) { if (!used[i] && similarWord(w, sw[i])) { hit = i; break; } }
    if (hit >= 0) { used[hit] = true; matched++; matchedWords.push(w); }
  }
  const total = tw.length;
  const ratio = total ? matched / total : 0;
  const contentMatched = matchedWords.filter((w) => !STOP_WORDS.has(w)).length;
  let passed;
  if (total === 0) passed = true;
  else if (total <= 2) passed = matched >= 1;
  else passed = ratio >= PASS_RATIO || (matched >= 2 && contentMatched >= 1 && total <= 6) || (matched >= 3 && contentMatched >= 1);
  return { matched, total, ratio, passed, matchedWords, contentMatched };
}

/**
 * 말하기 확인 실행
 * @param {{ target: string, durationSec: number, onLevel?: (level:number, spokenMs:number)=>void, onInterim?: (text:string)=>void }} opts
 * @returns {{ promise: Promise<Result>, stop: () => void, cancel: () => void }}
 *   stop()   = "다 말했어요" → 지금까지 들은 것으로 바로 판정
 *   cancel() = 문장 이동/닫기 → 판정 없이 정리 (결과는 { method: 'cancelled' })
 *   Result: { passed, method: 'speech'|'energy'|'none'|'cancelled', transcript, score, spokenMs, reason }
 */
export function runSpeakCheck(opts) {
  const target = opts.target || '';
  const needMs = Math.max(600, Math.min(4000, opts.durationSec * 1000 * 0.4)); // 말해야 하는 최소 시간
  const maxMs = Math.max(4000, opts.durationSec * 1000 * 2.2 + 2500);

  let resolveOuter = null;
  let finished = false;
  let cancelled = false;
  let stopRequested = false;
  let finishFn = null; // 마이크 준비가 끝나면 채워짐

  const promise = new Promise((resolve) => { resolveOuter = resolve; });

  function settle(result) {
    if (finished) return;
    finished = true;
    resolveOuter(result);
  }

  const handle = {
    promise,
    stop() {
      if (finishFn) finishFn('tap');
      else stopRequested = true; // 마이크 준비 전에 탭 → 준비되자마자 판정
    },
    cancel() {
      cancelled = true;
      if (finishFn) finishFn('cancel');
      else settle({ passed: false, method: 'cancelled', transcript: '', score: null, spokenMs: 0, reason: 'cancel' });
    },
  };

  (async () => {
    const stream = await prepareMic();
    if (cancelled || finished) { settle({ passed: false, method: 'cancelled', transcript: '', score: null, spokenMs: 0, reason: 'cancel' }); return; }
    if (!stream) { settle({ passed: true, method: 'none', transcript: '', score: null, spokenMs: 0, reason: 'mic-unavailable' }); return; }

    // ── 소리 에너지 추적 ──
    let src; let analyser;
    try {
      src = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
    } catch (err) {
      settle({ passed: true, method: 'none', transcript: '', score: null, spokenMs: 0, reason: 'audio-error' });
      return;
    }
    const buf = new Uint8Array(analyser.fftSize);
    // 소음 바닥: 100ms 창 평균의 최솟값 (아이가 바로 말을 시작해도 말 사이 쉬는 구간에서 바닥이 잡힘)
    let noiseFloor = Infinity; let winSum = 0; let winN = 0; let winStart = 0;
    let spokenMs = 0; let lastTick = performance.now(); let lastLoud = 0; let everLoud = false;
    const started = performance.now();
    let raf = 0;

    // ── 음성 인식 (있으면) ──
    let transcript = '';
    let rec = null;
    let recEnded = false;
    const SR = SpeechRecognitionCtor();
    if (SR && navigator.onLine) {
      try {
        rec = new SR();
        rec.lang = 'en-US';
        rec.interimResults = true;
        rec.maxAlternatives = 3;
        rec.onresult = (e) => {
          let finalText = ''; let interim = '';
          for (let i = 0; i < e.results.length; i++) {
            const r = e.results[i];
            // 대안 중 원문과 가장 잘 맞는 것을 택함
            let best = r[0].transcript; let bestScore = -1;
            for (let k = 0; k < r.length; k++) {
              const s = scoreTranscript(target, r[k].transcript).matched;
              if (s > bestScore) { bestScore = s; best = r[k].transcript; }
            }
            if (r.isFinal) finalText += best + ' '; else interim += best + ' ';
          }
          transcript = (finalText + interim).trim();
          if (opts.onInterim) opts.onInterim(transcript);
        };
        rec.onerror = () => { recEnded = true; };
        rec.onend = () => { recEnded = true; if (everLoud && spokenMs >= needMs) finish('speech-end'); };
        rec.start();
      } catch (e) { rec = null; }
    }

    function cleanup() {
      cancelAnimationFrame(raf);
      try { src.disconnect(); } catch (e) { /* 무시 */ }
      if (rec) { try { rec.onend = null; rec.onresult = null; rec.onerror = null; rec.abort ? rec.abort() : rec.stop(); } catch (e) { /* 무시 */ } rec = null; }
    }

    function finish(reason) {
      if (finished) return;
      cleanup();
      if (reason === 'cancel') { settle({ passed: false, method: 'cancelled', transcript: '', score: null, spokenMs: Math.round(spokenMs), reason }); return; }
      let score = null; let passed; let method;
      if (transcript) {
        score = scoreTranscript(target, transcript);
        method = 'speech';
        passed = score.passed;
      } else {
        method = 'energy';
        passed = spokenMs >= needMs;
      }
      settle({ passed, method, transcript, score, spokenMs: Math.round(spokenMs), reason });
    }
    finishFn = finish;
    if (cancelled) { finish('cancel'); return; }
    if (stopRequested) { finish('tap'); return; }

    const tick = () => {
      if (finished) return;
      const now = performance.now();
      const dt = now - lastTick; lastTick = now;
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      const rms = Math.sqrt(sum / buf.length);
      const elapsed = now - started;
      // 소음 바닥 갱신
      if (!winStart) winStart = now;
      winSum += rms; winN++;
      if (now - winStart >= NOISE_WINDOW_MS) {
        noiseFloor = Math.min(noiseFloor, winSum / winN);
        winSum = 0; winN = 0; winStart = now;
      }
      const floor = Number.isFinite(noiseFloor) ? noiseFloor : 0;
      const threshold = Math.min(RMS_MAX_THRESHOLD, Math.max(RMS_MIN, floor * NOISE_MULT));
      const loud = elapsed >= 150 && rms > threshold;
      if (loud) { spokenMs += dt; lastLoud = now; everLoud = true; }
      if (opts.onLevel) opts.onLevel(Math.min(1, rms / 0.15), spokenMs);
      // 종료 조건: 충분히 말한 뒤 조용해짐 / 최대 시간
      if (everLoud && spokenMs >= needMs && now - lastLoud > SILENCE_END_MS && (!rec || recEnded || now - lastLoud > SILENCE_END_MS + 1500)) { finish('silence'); return; }
      if (elapsed > maxMs) { finish('timeout'); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  })().catch((err) => {
    console.warn('말하기 확인 오류:', err);
    settle({ passed: true, method: 'none', transcript: '', score: null, spokenMs: 0, reason: 'error' });
  });

  return handle;
}
