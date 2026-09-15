// 말하기 확인: 가능하면 음성 인식으로 "비슷하게 말했는지", 안 되는 기기에서는 마이크 소리 에너지로 "말했는지"만 판정
// 구형 브라우저 호환을 위해 최신 문법(?., ??, ||=)은 쓰지 않는다.

const RMS_MIN = 0.012;        // 말소리 판정 문턱의 하한 (조용한 마이크 고려)
const RMS_MAX_THRESHOLD = 0.022; // 문턱의 상한 — 태블릿 마이크가 작아(최대 RMS ~0.03) 이보다 높으면 아이 목소리를 놓침
const NOISE_MULT = 2.5;       // 배경 소음의 몇 배 이상이면 말소리
const NOISE_WINDOW_MS = 100;  // 소음 바닥 추정 창 (창 평균의 최솟값 = 말 사이 쉬는 구간의 소음)
const SILENCE_END_MS = 1300;  // 말한 뒤 이만큼 조용하면 끝난 것으로
const PASS_RATIO = 0.4;       // 음성 인식: 단어 일치율 기준
// 내용 없는 짧은 단어 — 이것만 맞아서는 "따라 말했다"고 보지 않음
export const STOP_WORDS = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'my', 'a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'is', 'am', 'are', 'was', 'be', 'and', 'or', 'but', 'so', 'do', 'oh', 'uh', 'um', 'ah', 'yes', 'no', 'ok', 'okay', 'hey', 'this', 'that', 'what', 'for', 'with', 'up', 'not', "don't", "it's", "i'm"]);

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

/** 진단용: prepareMic() 뒤의 AudioContext (실전과 같은 조건으로 분석기를 붙여 볼 때) */
export function getAudioContext() {
  return audioCtx;
}

/** 마이크 끄기 (학습 종료·백그라운드). 다음 prepareMic()에서 다시 연다 */
export function releaseMic() {
  if (micStream) micStream.getTracks().forEach((t) => t.stop());
  micStream = null;
}

/**
 * 비교 전에 글자 모양을 통일한다.
 * 자막에는 굽은 아포스트로피(’)가 흔한데 음성 인식은 곧은 것(')을 준다 —
 * 통일하지 않으면 "Don’t"가 don·t로 쪼개져 아이가 제대로 말해도 틀린 것으로 나온다.
 */
function canon(text) {
  return String(text).replace(/[‘’ʼ´`]/g, "'");
}

/** 텍스트 → 비교용 단어 배열 (영문자·숫자가 하나도 없는 토큰은 채점 대상이 아님) */
export function normalizeWords(text) {
  return canon(text).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/)
    .map((w) => w.replace(/^'+/, '').replace(/'+$/, '')) // 따옴표로 감싼 'hello' → hello
    .filter((w) => /[a-z0-9]/.test(w));
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

/** 두 단어의 편집 거리 (받아쓰기 오답 만들 때도 쓴다) */
export function editDistance(a, b) {
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
 * 원문 단어 자리 ↔ 들린 단어를 **순서를 지키며** 맞춘다 (피드백 전용).
 *
 * 통과 판정(scoreTranscript)은 "몇 개나 맞았나"만 보면 되지만, 화면에 "이 자리를 놓쳤다"고
 * 표시하려면 자리가 맞아야 한다. 앞에서부터 먼저 걸리는 것을 소비하면
 * "walking walk"를 "walk"라고 말했을 때 엉뚱하게 앞의 walking이 맞은 것으로 나온다.
 * 그래서 정확히 같은 단어를 2점, 비슷한 단어를 1점으로 두고 점수가 가장 높은 정렬을 고른다.
 * (같은 단어가 여러 번 나오면 어느 자리를 말한 것인지는 소리 없이는 알 수 없다 — 한계)
 */
function alignHits(tw, sw) {
  const m = tw.length;
  const n = sw.length;
  const pair = (i, j) => (tw[i] === sw[j] ? 2 : (similarWord(tw[i], sw[j]) ? 1 : 0));
  const dp = [];
  for (let i = 0; i <= m; i++) dp.push(new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      const s = pair(i, j);
      dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1], s ? s + dp[i + 1][j + 1] : 0);
    }
  }
  const hits = new Array(m).fill(false);
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    const s = pair(i, j);
    if (s && dp[i][j] === s + dp[i + 1][j + 1]) { hits[i] = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return hits;
}

/**
 * 화면에 보여줄 단어별 결과 → [{ text, ok, skip }]
 * text는 원문 그대로("Where", "going?") — 아이가 자막에서 본 모습과 같아야 한다.
 * 토큰은 공백 기준이라 srt.wordTimings와 자리가 1:1로 맞는다 (단어 하나만 다시 듣기에 쓴다).
 * "well-known"처럼 한 토큰이 비교용으로는 두 단어가 되는 경우, 둘 다 맞아야 ok.
 */
export function wordResults(target, transcript) {
  const tw = normalizeWords(target);
  const sw = normalizeWords(transcript);
  const hits = alignHits(tw, sw); // 통과 판정과 달리 자리를 지키는 정렬
  const out = [];
  let i = 0;
  const raws = String(target).split(/\s+/).filter(Boolean);
  for (const raw of raws) {
    const norm = normalizeWords(raw);
    if (norm.length === 0) { out.push({ text: raw, ok: true, skip: true, missed: [] }); continue; } // 구두점·화자 표시 등
    const missed = [];
    for (let k = 0; k < norm.length; k++) { if (!hits[i + k]) missed.push(norm[k]); }
    i += norm.length;
    // missed는 기록용 — 화면 토큰("well-known")이 아니라 실제로 못 말한 단어("known")를 남긴다
    out.push({ text: raw, ok: missed.length === 0, skip: false, missed });
  }
  return out;
}

/**
 * 원문과 인식 결과 비교 → { matched, total, ratio, passed, matchedWords, contentMatched, hits }
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
  // 화면 표시용 자리 정보는 순서를 지키는 정렬로 따로 구한다 (통과 기준은 위 느슨한 셈 그대로)
  const hits = alignHits(tw, sw);
  const total = tw.length;
  const ratio = total ? matched / total : 0;
  const contentMatched = matchedWords.filter((w) => !STOP_WORDS.has(w)).length;
  let passed;
  if (total === 0) passed = true;
  else if (total <= 2) passed = matched >= 1;
  else passed = ratio >= PASS_RATIO || (matched >= 2 && contentMatched >= 1 && total <= 6) || (matched >= 3 && contentMatched >= 1);
  return { matched, total, ratio, passed, matchedWords, contentMatched, hits };
}

/**
 * 말하기 확인 실행 — 두 방식 중 하나로 판정
 *   1) 음성 인식(Web Speech, 인터넷 필요): 들린 단어를 원문과 비교. 마이크는 인식 엔진이 직접 씀 (getUserMedia를 열지 않음)
 *   2) 소리 에너지(getUserMedia): 인식을 못 쓰는 기기/오프라인 — "말소리를 문장 길이만큼 냈는지"만 봄
 * 안드로이드 Chrome은 getUserMedia로 마이크를 잡고 있으면 음성 인식이 소리를 못 받아 조용히 실패한다(audiostart→audioend).
 * 그래서 인식 방식일 때는 마이크 스트림을 먼저 놓고(releaseMic) 인식만 돌리며, 인식이 안 되는 것으로 확인되면(srBroken) 그 뒤로는 에너지 방식.
 * @param {{ target: string, durationSec: number, onLevel?: (level:number, spokenMs:number)=>void, onInterim?: (text:string)=>void }} opts
 * @returns {{ promise: Promise<Result>, stop: () => void, cancel: () => void }}
 *   stop()   = "다 말했어요" → 지금까지 들은 것으로 바로 판정
 *   cancel() = 문장 이동/닫기 → 판정 없이 정리 (결과는 { method: 'cancelled' })
 *   Result: { passed, method: 'speech'|'energy'|'none'|'cancelled', transcript, score, spokenMs, reason, srError }
 *   srError: 음성 인식을 못 쓴 이유 — 'unsupported'(브라우저 미지원) | 'offline' | 'start-failed' | 브라우저 오류명(audio-capture·network·not-allowed·no-speech…) | 'no-result'(오류 없이 결과만 없음)
 */
export function runSpeakCheck(opts) {
  const SR = SpeechRecognitionCtor();
  // 막혀 있어도 잠시 뒤에는 다시 시도한다 — 와이파이가 순간 끊기거나 아이가 두 번 조용했던 것뿐일 수 있다
  if (srBroken && srBrokenAt && Date.now() - srBrokenAt >= SR_RETRY_MS) resetRecognition();
  if (!srBroken && SR && navigator.onLine) return runWithRecognition(opts, SR);
  const why = !SR ? 'unsupported' : !navigator.onLine ? 'offline' : srBrokenWhy;
  logAttempt({ method: 'energy', ok: false, srError: why });
  return runWithEnergy(opts, why);
}

// 음성 인식이 안 되는 것으로 확인되면 그동안은 에너지 방식으로.
// 다만 **영구가 아니다**: 일시적인 문제(와이파이 끊김, 아이가 조용했던 것, 인식 서버 지연)와
// 구조적인 문제(기기가 인식을 못 씀)를 텍스트만으로 구분할 수 없어서,
// 일정 시간이 지나면 다시 인식을 시도한다. 그렇지 않으면 한 번 빠진 뒤 앱을 껐다 켤 때까지
// 계속 "말 길이로 판정"만 하게 된다 (실사용에서 실제로 그랬음).
let srBroken = false;
let srBrokenWhy = '';
let srBrokenAt = 0;
let srFailStreak = 0;
/** 이만큼 지나면 인식을 다시 시도 (학습 중이라 너무 길면 그 사이 계속 소리 길이로 판정된다) */
const SR_RETRY_MS = 60 * 1000;
/** 실패가 이만큼 이어지면 그때 폴백 */
const SR_FAIL_LIMIT = 3;
/**
 * 진짜로 못 쓰는 상태 — 권한·마이크·서비스 자체가 막힌 경우만.
 * network(구글 서버 순간 불안)와 start-failed(앞 인식이 덜 정리된 채 start)는
 * 안드로이드에서 일시적으로 흔해서, 한 번 났다고 폴백하면 멀쩡한 기기가 소리 길이 판정에 갇힌다.
 */
const SR_FATAL = { 'audio-capture': 1, 'not-allowed': 1, 'service-not-allowed': 1 };

// 최근 말하기 시도 기록 (⚙ 진단용) — 태블릿에서 "왜 인식이 멈췄나"를 추측하지 않고 보기 위해
const srLog = [];
function logAttempt(e) {
  srLog.push({ at: Date.now(), ...e });
  if (srLog.length > 12) srLog.shift();
}
/** 최근 말하기 시도 기록 (최신이 뒤) */
export function speakLog() {
  return srLog.slice();
}

/** 콘텐츠를 새로 열 때: 인식을 다시 시도해 봄 (인터넷이 돌아왔을 수 있음) */
export function resetRecognition() {
  srBroken = false;
  srBrokenWhy = '';
  srBrokenAt = 0;
  srFailStreak = 0;
}

/** 진단용: 지금 인식이 막힌 상태인지 */
export function recognitionState() {
  const retryInSec = srBroken && srBrokenAt ? Math.max(0, Math.ceil((SR_RETRY_MS - (Date.now() - srBrokenAt)) / 1000)) : 0;
  return { broken: srBroken, why: srBrokenWhy, retryInSec, failStreak: srFailStreak };
}

function cancelledResult(spokenMs) {
  return { passed: false, method: 'cancelled', transcript: '', score: null, spokenMs: Math.round(spokenMs || 0), reason: 'cancel', srError: '' };
}

/** 1) 음성 인식 방식 */
function runWithRecognition(opts, SR) {
  const target = opts.target || '';
  const maxMs = Math.max(5000, opts.durationSec * 1000 * 2.2 + 3000);
  let resolveOuter = null;
  let finished = false;
  let transcript = '';
  let srError = '';
  let spokenMs = 0;
  let speechStart = 0;
  let stopTimer = null;
  let maxTimer = null;
  let fallback = null; // 인식이 못 쓰는 상태로 판명 → 에너지 방식 핸들
  const started = performance.now();

  const promise = new Promise((resolve) => { resolveOuter = resolve; });
  function settle(result) {
    if (finished) return;
    finished = true;
    clearTimeout(stopTimer); clearTimeout(maxTimer);
    resolveOuter(result);
  }

  releaseMic(); // ★ 마이크를 인식 엔진에 넘김 (스트림을 잡고 있으면 안드로이드에서 인식이 소리를 못 받음)

  let rec = null;
  try {
    rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.maxAlternatives = 3;
  } catch (e) { rec = null; }
  if (!rec) return useEnergy('no-ctor', true); // 생성자 자체가 안 되면 이 기기는 못 쓴다

  function cleanup() {
    if (!rec) return;
    try { rec.onresult = null; rec.onerror = null; rec.onend = null; rec.onsoundstart = null; rec.onspeechstart = null; rec.onspeechend = null; rec.abort ? rec.abort() : rec.stop(); } catch (e) { /* 무시 */ }
    rec = null;
  }

  /**
   * 에너지(소리 길이) 방식으로 넘김.
   * permanent면 그 뒤 문장들도 당분간 에너지로 (SR_RETRY_MS 뒤 자동 재시도),
   * 아니면 **이번 문장만** — 일시적인 실패로 멀쩡한 기기를 가두지 않기 위해.
   */
  function useEnergy(why, permanent) {
    if (finished) return handle;
    cleanup();
    if (permanent) { srBroken = true; srBrokenWhy = why; srBrokenAt = Date.now(); }
    fallback = runWithEnergy(opts, why);
    fallback.promise.then(settle);
    return handle;
  }

  function judge(reason) {
    if (finished) return;
    cleanup();
    if (transcript) {
      srFailStreak = 0; // 한 번이라도 들렸으면 이 기기는 멀쩡하다
      const score = scoreTranscript(target, transcript);
      logAttempt({ method: 'speech', ok: true, srError: '', words: transcript.split(/\s+/).length });
      settle({ passed: score.passed, method: 'speech', transcript, score, spokenMs: Math.round(spokenMs), reason, srError: '' });
      return;
    }
    if (!srError || srError === 'aborted') srError = 'no-result';
    // 권한·마이크·서비스가 막힌 건 바로 포기
    if (SR_FATAL[srError]) { logAttempt({ method: 'speech', ok: false, srError, fatal: true }); useEnergy(srError, true); return; }
    // no-speech = 마이크로 듣긴 했는데 아이가 말을 안 한 것. 인식은 멀쩡하므로 연속 실패로 세지 않는다
    // (조용한 문장이 몇 개 이어졌다고 소리 길이 판정으로 빠지면 안 된다)
    if (srError === 'no-speech') {
      srFailStreak = 0;
      logAttempt({ method: 'speech', ok: false, srError });
      settle({ passed: false, method: 'speech', transcript: '', score: null, spokenMs: Math.round(spokenMs), reason, srError });
      return;
    }
    srFailStreak++;
    logAttempt({ method: 'speech', ok: false, srError, streak: srFailStreak });
    if (srFailStreak >= SR_FAIL_LIMIT) { useEnergy(srError, true); return; }
    settle({ passed: false, method: 'speech', transcript: '', score: null, spokenMs: Math.round(spokenMs), reason, srError });
  }

  rec.onsoundstart = () => { if (opts.onLevel) opts.onLevel(0.7, 350); };
  rec.onspeechstart = () => { speechStart = performance.now(); if (opts.onLevel) opts.onLevel(0.8, 350); };
  rec.onspeechend = () => { if (speechStart) spokenMs += performance.now() - speechStart; speechStart = 0; };
  rec.onresult = (e) => {
    let finalText = ''; let interim = '';
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i];
      // 대안 중 원문과 가장 잘 맞는 것을 택함
      let best = r[0].transcript; let bestScore = -1;
      for (let k = 0; k < r.length; k++) {
        const sc = scoreTranscript(target, r[k].transcript).matched;
        if (sc > bestScore) { bestScore = sc; best = r[k].transcript; }
      }
      if (r.isFinal) finalText += best + ' '; else interim += best + ' ';
    }
    transcript = (finalText + interim).trim();
    if (opts.onInterim && transcript) opts.onInterim(transcript);
  };
  rec.onerror = (e) => { srError = (e && e.error) || 'error'; };
  rec.onend = () => { if (speechStart) { spokenMs += performance.now() - speechStart; speechStart = 0; } judge('speech-end'); };

  const handle = {
    promise,
    stop() {
      if (finished) return;
      if (fallback) { fallback.stop(); return; }
      // "다 말했어요" 탭 → 인식을 멈추고 마지막 결과를 잠깐 기다림 (onend에서 판정). 안 오면 지금까지 것으로
      try { if (rec) rec.stop(); } catch (e) { /* 무시 */ }
      clearTimeout(stopTimer);
      stopTimer = setTimeout(() => judge('tap'), 1500);
    },
    cancel() {
      if (finished) return;
      if (fallback) { fallback.cancel(); return; }
      cleanup();
      settle(cancelledResult(spokenMs));
    },
  };

  try {
    rec.start();
  } catch (e) {
    // 앞 문장의 인식이 아직 정리되지 않았을 때 자주 난다 (안드로이드) — 이번 문장만 소리 길이로
    srFailStreak++;
    logAttempt({ method: 'speech', ok: false, srError: 'start-failed', streak: srFailStreak });
    return useEnergy('start-failed', srFailStreak >= SR_FAIL_LIMIT);
  }
  maxTimer = setTimeout(() => { if (!finished && !fallback) handle.stop(); }, maxMs);
  void started;
  return handle;
}

/** 2) 소리 에너지 방식 (인식을 못 쓸 때). srError = 인식을 못 쓴 이유 (결과에 실어 화면·진단에 표시) */
function runWithEnergy(opts, srError) {
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
      else settle(cancelledResult(0));
    },
  };

  (async () => {
    const stream = await prepareMic();
    if (cancelled || finished) { settle(cancelledResult(0)); return; }
    if (!stream) { settle({ passed: true, method: 'none', transcript: '', score: null, spokenMs: 0, reason: 'mic-unavailable', srError }); return; }

    // ── 소리 에너지 추적 ──
    let src; let analyser;
    try {
      src = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
    } catch (err) {
      settle({ passed: true, method: 'none', transcript: '', score: null, spokenMs: 0, reason: 'audio-error', srError });
      return;
    }
    const buf = new Uint8Array(analyser.fftSize);
    // 소음 바닥: 100ms 창 평균의 최솟값 (아이가 바로 말을 시작해도 말 사이 쉬는 구간에서 바닥이 잡힘)
    let noiseFloor = Infinity; let winSum = 0; let winN = 0; let winStart = 0;
    let spokenMs = 0; let lastTick = performance.now(); let lastLoud = 0; let everLoud = false;
    const started = performance.now();
    let raf = 0;

    function cleanup() {
      cancelAnimationFrame(raf);
      try { src.disconnect(); } catch (e) { /* 무시 */ }
    }

    function finish(reason) {
      if (finished) return;
      cleanup();
      if (reason === 'cancel') { settle(cancelledResult(spokenMs)); return; }
      settle({ passed: spokenMs >= needMs, method: 'energy', transcript: '', score: null, spokenMs: Math.round(spokenMs), reason, srError });
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
      if (everLoud && spokenMs >= needMs && now - lastLoud > SILENCE_END_MS) { finish('silence'); return; }
      if (elapsed > maxMs) { finish('timeout'); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  })().catch((err) => {
    console.warn('말하기 확인 오류:', err);
    settle({ passed: true, method: 'none', transcript: '', score: null, spokenMs: 0, reason: 'error', srError });
  });

  return handle;
}
