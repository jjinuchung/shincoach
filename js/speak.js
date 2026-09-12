// 말하기 확인: 따라 말하기 시간에 마이크로 듣고 "말했는지"(소리 에너지) + 가능하면 "비슷하게 말했는지"(음성 인식) 판정
// 구형 브라우저 호환을 위해 최신 문법(?., ??, ||=)은 쓰지 않는다.

const RMS_MIN = 0.012;        // 이보다 작으면 무음으로 봄 (조용한 마이크 고려, 절대 하한)
const NOISE_MULT = 2.5;       // 배경 소음의 몇 배 이상이면 말소리
const SILENCE_END_MS = 1300;  // 말한 뒤 이만큼 조용하면 끝난 것으로
const PASS_RATIO = 0.4;       // 음성 인식: 단어 일치율 기준

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
  if (!audioCtx) audioCtx = new AC();
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
 * 원문과 인식 결과 비교 → { matched, total, ratio, passed, matchedWords }
 * 기준: 일치율 ≥ PASS_RATIO 이거나 2단어 이상 일치 (1~2단어 문장은 1개 이상)
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
  const passed = total === 0 ? true : (total <= 2 ? matched >= 1 : (ratio >= PASS_RATIO || matched >= 2));
  return { matched, total, ratio, passed, matchedWords };
}

/**
 * 말하기 확인 실행
 * @param {{ target: string, durationSec: number, onLevel?: (level:number, spokenMs:number)=>void, onInterim?: (text:string)=>void }} opts
 * @returns {Promise<{ passed:boolean, method:'speech'|'energy'|'none', transcript:string, score:object|null, spokenMs:number, reason:string }>}
 *   외부에서 stop()을 부르면 즉시 판정 (오버레이 탭 = "다 말했어요")
 */
export function runSpeakCheck(opts) {
  const target = opts.target || '';
  const needMs = Math.max(600, Math.min(4000, opts.durationSec * 1000 * 0.4)); // 말해야 하는 최소 시간
  const maxMs = Math.max(4000, opts.durationSec * 1000 * 2.2 + 2500);
  let resolved = false;
  let stopFn = () => {};

  const promise = new Promise(async (resolve) => {
    const stream = await prepareMic();
    if (!stream) { resolve({ passed: true, method: 'none', transcript: '', score: null, spokenMs: 0, reason: 'mic-unavailable' }); return; }

    // ── 소리 에너지 추적 ──
    const src = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    src.connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    let noise = 0; let noiseFrames = 0;
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

    function finish(reason) {
      if (resolved) return;
      resolved = true;
      cancelAnimationFrame(raf);
      try { src.disconnect(); } catch (e) { /* 무시 */ }
      if (rec) { try { rec.onend = null; rec.stop(); } catch (e) { /* 무시 */ } }
      let score = null; let passed; let method;
      if (transcript) {
        score = scoreTranscript(target, transcript);
        method = 'speech';
        passed = score.passed;
        // 인식은 됐지만 너무 안 맞고, 말소리도 충분하면 → 에너지 기준으로 구제하지 않음(아무 말 방지). 단, 인식이 원문과 전혀 무관하고 아주 짧으면 재시도 유도
      } else {
        method = 'energy';
        passed = spokenMs >= needMs;
      }
      resolve({ passed, method, transcript, score, spokenMs: Math.round(spokenMs), reason });
    }
    stopFn = () => finish('tap');

    const tick = () => {
      if (resolved) return;
      const now = performance.now();
      const dt = now - lastTick; lastTick = now;
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      const rms = Math.sqrt(sum / buf.length);
      const elapsed = now - started;
      if (elapsed < 350) { noise += rms; noiseFrames++; }           // 처음 0.35초: 배경 소음 측정
      const noiseLevel = noiseFrames ? noise / noiseFrames : 0;
      const threshold = Math.max(RMS_MIN, noiseLevel * NOISE_MULT);
      const loud = elapsed >= 350 && rms > threshold;
      if (loud) { spokenMs += dt; lastLoud = now; everLoud = true; }
      if (opts.onLevel) opts.onLevel(Math.min(1, rms / 0.15), spokenMs);
      // 종료 조건: 충분히 말한 뒤 조용해짐 / 최대 시간
      if (everLoud && spokenMs >= needMs && now - lastLoud > SILENCE_END_MS && (!rec || recEnded || now - lastLoud > SILENCE_END_MS + 1500)) { finish('silence'); return; }
      if (elapsed > maxMs) { finish('timeout'); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });

  return { promise, stop: () => stopFn() };
}
