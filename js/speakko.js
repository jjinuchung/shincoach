// 🔊 한국어 읽어 주기 (v244, 2026-10-12 아버님 "이대로 진행") — 브라우저 음성 합성(speechSynthesis)으로 한국어를 읽는다
// 1단계: ⚙ 설정의 "🔊 한국어 읽어 주기 확인"(태블릿에 한국어 음성이 있는지 · 소리가 나는지) · 2단계 🎧 듣고 답하기가 같은 모듈을 쓴다
// 주의: 안드로이드 Chrome은 음성 목록을 늦게 준다(voiceschanged) · 소리는 누른 뒤에만 난다 · 마이크 음성 인식(speak.js)과 동시에 쓰지 않는다
//       (태블릿에서 마이크 스트림을 잡으면 인식이 소리를 못 받았다 — android-speech-mic-conflict, 읽어 주기는 마이크를 쓰지 않는다)
// Codex 56차: 시작한 뒤 멈춘 읽기를 ✅로 보이지 않게(ok·started 따로) · 끝 알림이 없으면 "끝났는지 모름" · 한국어 음성이 늦게 오면 끝까지 기다림 ·
//            목록에 없는 것과 없는 것을 가름 · 기다림 타이머는 끝나면 지운다

/** 한국어 음성만 — lang이 ko, ko-KR, ko_KR … (kok 콘칸어는 아니다) */
export function koVoicesOf(list) {
  return (Array.isArray(list) ? list : []).filter((v) => v && /^ko([-_]|$)/i.test(String(v.lang || '')));
}

/**
 * 음성 목록 — want(목록)가 참이 될 때까지 voiceschanged를 ms까지 기다린다(첫 소식에 멈추지 않는다 — 영어만 먼저 오고 한국어가 뒤에 오는 기기)
 * 끝내 참이 안 되면 그때의 목록으로 끝난다
 */
export function waitVoices(synth, ms = 1500, want = (l) => l.length > 0) {
  const now = () => { try { return synth.getVoices() || []; } catch { return []; } };
  return new Promise((resolve) => {
    const first = now();
    if (want(first)) { resolve(first); return; }
    let timer = null;
    const finish = () => {
      if (timer === null) return;
      clearTimeout(timer);
      timer = null;
      try { synth.removeEventListener('voiceschanged', check); } catch { /* 옛 브라우저 */ }
      resolve(now());
    };
    const check = () => { if (want(now())) finish(); };
    timer = setTimeout(finish, ms);
    try { synth.addEventListener('voiceschanged', check); } catch { /* 옛 브라우저 — 시간만 기다림 */ }
  });
}

// 읽는 중인 말 — 끝날 때까지 붙잡아 둔다 (크롬은 아무도 안 잡은 말을 치워 버려 끝 알림(onend)이 안 오는 일이 있다 — 🎧 줄마다 읽기에서 줄 사이가 길어졌다)
const KEEP = new Set();
let sayNo = 0; // 마지막으로 넣은 말의 번호 — 시간이 다 된 옛 말이 새 말을 끊지 않게 (Codex 57차 #2)

/** 시작 기다림(ms) — 이때까지 시작 알림도 없고 말하는 중도 아니면 소리 없음 */
export const START_MS = 6000;
/** 말하는 중인지 살피는 간격(ms) — 시작한 뒤 speaking이 두 번 이어 거짓이면 끝 알림 없이 끝난 것 */
export const POLL_MS = 250;
/** 끝 기다림(ms) — 시작한 뒤부터 · 글자 수와 빠르기에 맞춰 넉넉히 (🐢 천천히는 더 길게) */
export function endWaitMs(text, rate = 1) {
  const r = Number(rate) > 0 ? Number(rate) : 1;
  return 3000 + Math.round((String(text || '').length * 250) / r);
}

/**
 * 한국어 한 덩이 읽기 — Promise<{ ok, started, why? }>
 * ok = 끝 알림(onend)까지 왔다 · started = 소리를 내기 시작했다는 알림(onstart)이 왔다(또는 시작 기다림 끝에 말하는 중이었다) ·
 * why = 'none'(읽어 주기 없음) | 'silent'(아무 소식 없음) | 'noend'(시작했지만 끝 알림이 없음) | 오류 이름(interrupted …)
 * Codex 57차 #2: 시작 기다림과 끝 기다림을 나눈다 · 시작한 뒤 말하는 중이 아니게 되면 바로 끝(기다리지 않음) ·
 *               시간이 다 되면 그 말이 아직 마지막 말일 때만 기기에서도 지운다(cancel — 늦게 소리가 나지 않게 · 새 말은 건드리지 않음)
 * @param {string} text
 * @param {{rate?:number, pitch?:number, voice?:object, win?:object, timeout?:number, startMs?:number, endMs?:number}} [o] timeout은 두 기다림 모두
 */
export function sayKo(text, o = {}) {
  const win = o.win || (typeof window !== 'undefined' ? window : null);
  return new Promise((resolve) => {
    const synth = win && win.speechSynthesis;
    const U = win && win.SpeechSynthesisUtterance;
    if (!synth || typeof U !== 'function') { resolve({ ok: false, started: false, why: 'none' }); return; }
    const my = ++sayNo;
    let started = false;
    let done = false;
    let timer = null;
    let poll = null;
    let quiet = 0;
    let u = null;
    const end = (ok, why) => {
      if (done) return;
      done = true;
      if (timer !== null) clearTimeout(timer);
      if (poll !== null) clearInterval(poll);
      timer = null;
      poll = null;
      if (u) KEEP.delete(u);
      resolve(ok ? { ok, started } : { ok, started, why });
    };
    // 시간이 다 됐다 — 아직 마지막 말이면 기기의 줄에서도 지우고 끝낸다
    const drop = (why) => {
      if (done) return;
      if (my === sayNo) { try { synth.cancel(); } catch { /* 없어도 */ } }
      end(false, why);
    };
    // 말하는 중인가 — 모르는 브라우저는 null(살피지 않고 기다림만)
    const speaking = () => { try { return typeof synth.speaking === 'boolean' ? synth.speaking : null; } catch { return null; } };
    const onStarted = () => {
      if (started || done) return;
      started = true;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => drop('noend'), o.endMs || o.timeout || endWaitMs(text, o.rate));
      if (speaking() === null) return;
      poll = setInterval(() => {
        quiet = speaking() === false ? quiet + 1 : 0;
        if (quiet >= 2) end(false, 'noend'); // 말은 끝났는데 끝 알림이 없다 — 기다리지 않고 다음 줄
      }, POLL_MS);
    };
    try {
      u = new U(String(text || ''));
      KEEP.add(u);
      u.lang = 'ko-KR';
      if (o.voice) u.voice = o.voice;
      u.rate = Number(o.rate) || 1;
      u.pitch = Number(o.pitch) || 1;
      u.onstart = onStarted;
      u.onend = () => end(true);
      u.onerror = (e) => end(false, (e && e.error) || 'error');
      synth.speak(u);
      // 시작 알림이 없는 기기 — 기다림 끝에 말하는 중이면 시작한 것으로, 아니면 소리 없음(줄에서 지운다)
      timer = setTimeout(() => { if (speaking()) onStarted(); else drop('silent'); }, o.startMs || o.timeout || START_MS);
    } catch (e) {
      end(false, String((e && e.message) || e));
    }
  });
}

export const CHECK_TEXT = '안녕하세요. 신코치가 한국어로 읽어 드려요.';

/** ⚙ 확인 결과 한 줄 (순수) — r = { supported, total, ko, ok, started, why } */
export function ttsCheckLine(r) {
  if (!r || !r.supported) return '⚠️ 이 브라우저는 소리 내어 읽기를 못 해요 — Chrome을 최신으로 바꿔 주세요';
  const listed = r.ko ? `한국어 음성 ${r.ko}개` : `한국어 음성이 목록에 없어요(음성 ${r.total}개)`;
  if (r.started && r.ok) {
    return r.ko
      ? `✅ ${listed} · 끝까지 읽었어요 — 소리가 들렸으면 🎧 듣고 답하기를 쓸 수 있어요`
      : `✅ 끝까지 읽었어요 — 다만 ${listed}. 다른 목소리로 읽었을 수 있으니 한국어로 들렸는지 알려 주세요`;
  }
  if (r.started && r.why === 'noend') return `🔸 ${listed} · 읽기는 시작됐지만 끝났는지 확인하지 못했어요 — 문장이 끝까지 들렸는지 알려 주세요`;
  if (r.started) return `⚠️ ${listed} · 읽다가 멈췄어요${r.why ? ` (${r.why})` : ''} — 한 번 더 눌러 보세요`;
  if (!r.ko) return `⚠️ ${listed} — 읽기도 시작되지 않았어요. 태블릿 설정에서 '텍스트 음성 변환(TTS)'을 찾아 한국어 음성을 받아 주세요`;
  return `⚠️ ${listed}가 있지만 읽기가 시작되지 않았어요${r.why ? ` (${r.why})` : ''} — 소리를 켜고 한 번 더 눌러 보세요`;
}

/**
 * ⚙ 🔊 한국어 읽어 주기 확인 — 한국어 음성이 목록에 올 때까지(최대 VOICE_WAIT_MS) 기다렸다가 한 문장을 읽는다
 * → { supported, total, ko, ok, started, why } · 읽기 바로 앞에서 한 번 더 cancel(앞서 누른 확인이 기다리다 먼저 넣은 말을 지운다)
 */
export const VOICE_WAIT_MS = 2500;
export async function ttsCheck(win = typeof window !== 'undefined' ? window : null) {
  const synth = win && win.speechSynthesis;
  if (!synth || typeof win.SpeechSynthesisUtterance !== 'function') return { supported: false, total: 0, ko: 0, ok: false, started: false };
  try { synth.cancel(); } catch { /* 없어도 */ }
  const voices = await waitVoices(synth, VOICE_WAIT_MS, (l) => koVoicesOf(l).length > 0);
  const ko = koVoicesOf(voices);
  try { synth.cancel(); } catch { /* 없어도 */ }
  const said = await sayKo(CHECK_TEXT, { win, voice: ko[0] });
  return { supported: true, total: voices.length, ko: ko.length, ok: said.ok, started: said.started, why: said.why };
}
