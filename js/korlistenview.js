// 🎧 듣고 답하기 화면 조각 (v245) — 듣기 카드를 열면 글 상자 대신 이 상자 (koreanview가 부른다 — 이 파일은 koreanview를 import하지 않는다)
// 규칙은 korlisten.js(순수), 소리는 speakko.sayKo(한국어 음성 · 시작/끝/소리 없음 가름)
//  · ▶ 듣기 · 🐢 천천히 · ⏹ 멈추기 — 처음 끝까지 들으면 물음이 나오고, 그 뒤엔 몇 번이든 다시 듣는다
//  · 대화·토의는 말하는 사람 칸에 🔊 (글은 안 보인다) · 한 사람 글은 줄 점(●○)으로 어디쯤인지
//  · 소리가 시작되지 않으면 📄 글로 읽고 풀기를 크게 — 소리가 났어도 안 들리면 🔇 (🟩는 듣고 풀 때만)
//  · 읽기는 한 번에 하나(seq) — 새로 누르거나 멈추거나 카드·화면을 떠나면 앞의 읽기는 그 자리에서 그만
//  · Codex 57차: 끝 알림이 빠진 줄이 있으면 "끝까지 들렸나요?" ✅를 눌러야 물음(#1) · 지난 음성이 목록에서 사라지면 다시 찾음(#5) ·
//               읽는 동안은 상자를 새로 그리지 않고 칩·점·글자만(초점이 ⏹에 머문다) · 끝·실패는 알림 칸에 한 번(#6)
//  · 📍 근거 줄 읽어 주기(v363, playEvSay)도 같은 읽기 번호(seq)·음성을 쓴다 — 국어 읽기 글에서 근거를 찾은 뒤 한 번
import { listenPlan, runPlan, neverStarted, listenNote, scriptRows, fullyHeard, unsure, listenAnnounce, evSayPlan } from './korlisten.js';
import { sayKo, waitVoices, koVoicesOf, VOICE_WAIT_MS } from './speakko.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** 듣기 상태 새로 (koreanview가 카드를 열 때) — heard 처음 끝까지 들음 · text 📄 글로 읽고 푸는 중 · playing 읽는 중 · prep 음성 준비 중 ·
 *  at 지금 줄(-1 없음) · who 지금 말하는 사람 · slow 🐢 · res 마지막 읽기 결과(runPlan) */
export function newListenState() {
  return { heard: false, text: false, playing: false, prep: false, at: -1, who: '', slow: false, res: null };
}

let seq = 0; // 지금 읽기 번호 — 바뀌면 앞의 읽기는 그만
/** 누른 뒤 첫 말까지(ms) — 🌿 음악이 빠지는 시간(calm.js CALM.ttsFade 0.25초)보다 짧지 않게 (v317 — 전에는 80) */
export const TTS_LEAD_MS = 250;
let voiceP = null; // 한국어 음성 (찾은 것을 쓰되 누를 때마다 아직 목록에 있나 본다 · 못 찾았으면 다음에 다시)

function synthOf() {
  const w = typeof window !== 'undefined' ? window : null;
  return w && w.speechSynthesis && typeof w.SpeechSynthesisUtterance === 'function' ? w.speechSynthesis : null;
}

/** 그 음성이 지금 목록에 아직 있나 — 태블릿 TTS 설정을 바꾸면 사라질 수 있다 */
export function voiceListed(synth, v) {
  let list = [];
  try { list = synth.getVoices() || []; } catch { return false; }
  return !!v && list.some((x) => x === v || (x && x.voiceURI === v.voiceURI && x.name === v.name && x.lang === v.lang));
}

async function koVoice(synth) {
  if (voiceP) {
    const had = await voiceP;
    if (had && voiceListed(synth, had)) return had;
    voiceP = null; // 사라졌거나 못 찾았다 — 다시 찾는다
  }
  const p = waitVoices(synth, VOICE_WAIT_MS, (l) => koVoicesOf(l).length > 0).then((l) => koVoicesOf(l)[0] || null).catch(() => null);
  voiceP = p;
  const v = await p;
  if (!v && voiceP === p) voiceP = null;
  return v;
}

/** 음성을 못 쓰게 됐다는 오류 — 다음에 누르면 음성을 다시 찾는다 */
const VOICE_GONE = new Set(['voice-unavailable', 'language-unavailable']);

/** 읽기를 그만 (멈추기 · 카드를 닫음 · 국어 화면을 떠남 · 앱을 내림) — 상태 칸은 부른 쪽이 고친다 */
export function stopListening() {
  seq++;
  const synth = synthOf();
  if (synth) { try { synth.cancel(); } catch { /* 없어도 */ } }
}

// ── 📍 근거 줄 읽어 주기 (v363) ──
/** 근거를 찾은 뒤 읽기 — 줄마다 소리가 이만큼(ms) 안에 시작되지 않으면 그만(보기가 열린다 · 잠긴 보기 앞에서 오래 기다리지 않게) */
export const EV_SAY_START_MS = 3000;
let evSeq = -1; // 마지막 근거 읽기의 번호 — 아직 seq와 같으면 읽는 중일 수 있다

/** 이 기기에 소리 내어 읽기가 있나 — 없으면 보기를 잠그지 않는다(지금처럼 바로 연다) */
export function sayReady() {
  return !!synthOf();
}

/**
 * 칠한 근거와 물음을 한 번 읽는다 (korlisten.evSayPlan) — hooks { alive() 그 물음이 아직 떠 있나, onLine(p) 읽는 줄(p.i · 물음은 0) }
 * → runPlan 결과 { done, why, started, noend } · 읽기 없음·한국어 음성 없음·읽을 근거 없음은 { done: false, why: 'none', started: false }
 *   🎧 듣기와 같은 읽기 번호(seq) — 새 읽기·stopListening·stopEvSay면 그 자리에서 그만('stop')
 */
export async function playEvSay(card, q, hooks = {}) {
  stopListening(); // 앞의 읽기를 끊는다(다시 듣기를 거듭 눌렀을 때)
  const my = ++seq;
  evSeq = my;
  const none = { done: false, why: 'none', started: false, noend: 0 };
  const synth = synthOf();
  const plan = evSayPlan(card, q);
  if (!synth || !plan.length) return none;
  const alive = () => my === seq && (!hooks.alive || hooks.alive());
  const stop = { done: false, why: 'stop', started: false, noend: 0 };
  // 🌿 잔잔한 음악이 먼저 빠지게 (🎧 ▶와 같은 알림 — calm.js)
  if (typeof window !== 'undefined' && window.dispatchEvent) window.dispatchEvent(new CustomEvent('shincoach:ttsstart'));
  const voice = await koVoice(synth);
  if (!alive()) return stop;
  if (!voice) return none; // 한국어 음성이 없다 — 다른 말 목소리로 읽으면 알아듣지 못한다
  await new Promise((r) => setTimeout(r, TTS_LEAD_MS)); // 끊은 바로 뒤의 말을 놓치는 기기 · 음악이 빠지는 동안
  if (!alive()) return stop;
  const res = await runPlan(plan, {
    say: (text, o) => sayKo(text, { ...o, voice, startMs: EV_SAY_START_MS }),
    alive,
    onLine: hooks.onLine || (() => {}),
  });
  if (VOICE_GONE.has(res.why)) voiceP = null;
  return res;
}

/** 근거 읽기가 지금 읽는 중이면 그만 (보기를 골랐다 · 다음 물음) — 🎧 듣기 읽기는 건드리지 않는다 */
export function stopEvSay() {
  if (evSeq === seq) stopListening();
}

/** 지금 읽는 중이면 멈추고 상태를 "멈춤"으로 → 멈춘 게 있었나 */
export function haltListen(ls) {
  if (!ls || !ls.playing) { stopListening(); return false; }
  stopListening();
  ls.playing = false;
  ls.prep = false;
  ls.res = { done: false, why: 'stop', started: true, noend: 0 };
  ls.at = -1;
  ls.who = '';
  return true;
}

/**
 * 처음부터 읽기 — hooks: { alive() 그 카드가 아직 열려 있나, onChange() 상자를 다시 그려라, onHeard() 처음 끝까지 들었다,
 *                         onLine() 줄이 바뀌었다(없으면 onChange) · onEnd(말) 끝·실패 알림 한 번 }
 */
export async function playListen(card, ls, slow, hooks) {
  stopListening(); // 앞의 읽기를 끊는다
  const my = ++seq;
  const alive = () => my === seq && hooks.alive();
  // 🌿 잔잔한 음악(calm.js, v317)에게 먼저 알린다 — 첫 말이 음악에 묻히지 않게 음악이 빠질 틈을 둔다 (🔍 Codex 123차 #1)
  if (typeof window !== 'undefined' && window.dispatchEvent) window.dispatchEvent(new CustomEvent('shincoach:ttsstart'));
  Object.assign(ls, { playing: true, prep: true, slow: !!slow, res: null, at: -1, who: '' });
  hooks.onChange();
  const synth = synthOf();
  const voice = synth ? await koVoice(synth) : null;
  if (synth) await new Promise((r) => setTimeout(r, TTS_LEAD_MS)); // 끊은 바로 뒤의 말을 놓치는 기기가 있다 · 음악이 빠지는 동안
  if (!alive()) return;
  ls.prep = false;
  const res = await runPlan(listenPlan(card, slow), {
    say: (text, o) => sayKo(text, { ...o, ...(voice ? { voice } : {}) }),
    alive,
    onLine: (p) => { ls.at = p.i; ls.who = p.who; (hooks.onLine || hooks.onChange)(); },
  });
  if (my !== seq) return; // 멈춤·새 읽기가 이어받았다 — 상태는 그쪽이
  if (VOICE_GONE.has(res.why)) voiceP = null;
  Object.assign(ls, { playing: false, prep: false, at: -1, who: '', res });
  hooks.onChange();
  const first = fullyHeard(res) && !ls.heard;
  if (first) { ls.heard = true; hooks.onHeard(); }
  if (hooks.onEnd) hooks.onEnd(listenAnnounce(res, ls.heard, first, Array.isArray(card.qs) ? card.qs.length : 0));
}

/** ✅ 끝까지 들렸어요 — 끝 알림이 빠진 줄이 있어 끝났는지 모를 때 아이가 확인 → 물음이 나온다 · 확인했나 */
export function confirmHeard(ls) {
  if (!ls || ls.heard || ls.playing || !unsure(ls.res)) return false;
  ls.heard = true;
  return true;
}

/** 상자 가운데 한 줄 (순수) */
function statusText(ls, n) {
  if (ls.prep) return '소리를 준비하는 중…';
  if (ls.playing) return `${ls.slow ? '🐢 천천히 ' : ''}듣는 중… ${Math.max(1, ls.at + 1)} / ${n}${ls.who ? ` · 🔊 ${ls.who}` : ''}`;
  return ls.heard ? '다시 듣고 싶으면 언제든 눌러요' : '잘 듣고 물음에 답해요'; // "끝까지 들으면 물음" · 멈춤 · 소리 없음은 아래 한 줄(listenNote)
}

/**
 * 읽는 동안 줄이 바뀌면 — 상자를 새로 그리지 않고 칩·점·가운데 줄만 바꾼다(⏹ 단추와 초점은 그대로) · 바꿨나
 * (읽는 중 ↔ 아님이 바뀌면 단추가 달라지니 false — 부른 쪽이 새로 그린다)
 */
export function syncListenBox(box, card, ls) {
  if (!box || box.dataset.playing !== (ls.playing ? '1' : '0')) return false;
  for (const c of box.querySelectorAll('.kor-listen-chip')) {
    const on = ls.playing && ls.who === c.dataset.who;
    c.classList.toggle('is-on', on);
    c.textContent = `${on ? '🔊' : '🙂'} ${c.dataset.who}`;
  }
  box.querySelectorAll('.kor-listen-dot').forEach((d, i) => {
    d.classList.toggle('is-past', ls.playing && i < ls.at);
    d.classList.toggle('is-on', ls.playing && i === ls.at);
  });
  const st = box.querySelector('.kor-listen-status');
  if (st) st.textContent = statusText(ls, Array.isArray(card.lines) ? card.lines.length : 0);
  return true;
}

/**
 * 🎧 상자 — act: { play(slow), stop(), toText(), heard() ✅ 끝까지 들렸어요 }
 */
export function listenBoxEl(card, ls, act) {
  const box = el('div', `kor-listen${ls.playing ? ' is-playing' : ''}`);
  box.dataset.playing = ls.playing ? '1' : '0';
  const top = el('div', 'kor-listen-top');
  top.appendChild(el('span', 'kor-listen-badge', '🎧 듣기 카드'));
  top.appendChild(el('span', 'kor-listen-form', `${card.icon} ${card.genre}`));
  box.appendChild(top);
  box.appendChild(el('h3', 'kor-listen-title', `「${card.title}」`));
  const who = card.listen && Array.isArray(card.listen.who) ? card.listen.who : [];
  const n = Array.isArray(card.lines) ? card.lines.length : 0;
  if (who.length) {
    const row = el('div', 'kor-listen-who');
    for (const w of who) {
      const on = ls.playing && ls.who === w;
      const chip = el('span', `kor-listen-chip${on ? ' is-on' : ''}`, `${on ? '🔊' : '🙂'} ${w}`);
      chip.dataset.who = w;
      row.appendChild(chip);
    }
    box.appendChild(row);
  }
  const dots = el('div', 'kor-listen-dots');
  dots.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < n; i++) dots.appendChild(el('span', `kor-listen-dot${ls.playing && i < ls.at ? ' is-past' : ''}${ls.playing && i === ls.at ? ' is-on' : ''}`));
  box.appendChild(dots);
  box.appendChild(el('p', 'kor-listen-status', statusText(ls, n)));
  const btns = el('div', 'kor-listen-btns');
  if (ls.playing) {
    const stop = el('button', 'btn btn-primary kor-listen-stop', '⏹ 멈추기');
    stop.type = 'button';
    stop.dataset.act = 'stop';
    stop.addEventListener('click', () => act.stop());
    btns.appendChild(stop);
  } else {
    if (!ls.heard && unsure(ls.res)) {
      // 끝 알림이 빠진 줄이 있었다 — 끝까지 들렸으면 아이가 ✅ (Codex 57차 #1)
      const yes = el('button', 'btn btn-primary kor-listen-yes', '✅ 끝까지 들렸어요');
      yes.type = 'button';
      yes.dataset.act = 'heard';
      yes.addEventListener('click', () => act.heard());
      btns.appendChild(yes);
    }
    const again = !!(ls.heard || ls.res);
    const play = el('button', `btn${!ls.heard && unsure(ls.res) ? '' : ' btn-primary'} kor-listen-play`, again ? '▶ 다시 듣기' : '▶ 듣기');
    play.type = 'button';
    play.dataset.act = 'play';
    play.addEventListener('click', () => act.play(false));
    btns.appendChild(play);
    const slow = el('button', 'btn kor-listen-slow', '🐢 천천히 듣기');
    slow.type = 'button';
    slow.dataset.act = 'slow';
    slow.addEventListener('click', () => act.play(true));
    btns.appendChild(slow);
  }
  box.appendChild(btns);
  const note = listenNote(ls.res, ls.heard);
  if (note) box.appendChild(el('p', `kor-listen-note${ls.res && !ls.res.done && ls.res.why !== 'stop' ? ' is-no' : ''}${!ls.heard && unsure(ls.res) ? ' is-ask' : ''}`, note));
  // 📄 글로 읽고 풀기 — 소리가 시작조차 안 됐으면 크게, 아니면 작게(🔇 안 들려요)
  const big = neverStarted(ls.res);
  const t = el('button', big ? 'btn btn-primary kor-listen-text is-big' : 'btn btn-small kor-listen-text', big ? '📄 글로 읽고 풀기' : '🔇 소리가 안 들려요 — 글로 읽고 풀기 (🟩는 듣고 풀 때만)');
  t.type = 'button';
  t.dataset.act = 'text';
  t.addEventListener('click', () => act.toText());
  box.appendChild(t);
  return box;
}

/** 📜 들은 글 보기 (다 푼 뒤 · 접힌 상자) — 말한 사람 이름과 함께 */
export function scriptEl(card, open = false) {
  const det = el('details', 'kor-script');
  if (open) det.open = true;
  det.appendChild(el('summary', '', '📜 들은 글 보기'));
  for (const r of scriptRows(card)) {
    const p = el('p', 'kor-script-line');
    if (r.who) p.appendChild(el('b', '', `${r.who}: `));
    p.appendChild(document.createTextNode(r.text));
    det.appendChild(p);
  }
  return det;
}
