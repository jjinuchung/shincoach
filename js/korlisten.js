// 🎧 듣고 답하기 (v245, 2026-10-12 아버님 "이대로 진행") — 듣기 카드를 소리로 읽는 차례·빠르기·목소리 높낮이 (순수 — 화면 없음)
// 원고 꼴·검사는 korean.js(isListen · speakerOf · checkListen), 화면은 korlistenview.js, 소리는 speakko.sayKo
//  · 줄마다 끊어 읽는다 — 긴 말은 기기가 중간에 끊고(안드로이드), 줄이 바뀌면 화면에 "지금 말하는 사람"을 보여 줄 수 있다
//  · 대화·토의는 사람마다 목소리 높낮이를 달리(PITCH, who 차례대로) — 한 사람 글은 보통 높이
//  · 처음 끝까지 들어야 물음이 나온다 — 끝까지 = 줄마다 끝 알림까지 왔다 · 끝 알림이 안 온 줄이 있으면(그런 기기가 있다)
//    끝났는지 모르니 "끝까지 들렸나요?" ✅를 눌러야 물음이 나온다 (Codex 57차 #1 — 시작만 하고 잘린 읽기를 다 들은 것으로 보지 않는다)
//  · 소리가 시작되지 않으면 📄 글로 읽고 풀기 (별·💰·🎯는 같고 🟩만 듣고 풀 때)
import { speakerOf } from './korean.js';

/** 읽는 빠르기 — 보통 · 🐢 천천히 (태블릿에서 들어 보고 조절) */
export const RATE = { normal: 0.9, slow: 0.7 };
/** 말하는 사람마다 목소리 높낮이 (who 차례대로 — 첫 사람은 보통) */
export const PITCH = [1.0, 1.3, 0.8, 1.15];
/** 줄 사이 쉼(ms) — 같은 사람 · 사람이 바뀔 때 (🐢 천천히는 SLOW_GAP배) */
export const GAP = { same: 350, change: 700 };
export const SLOW_GAP = 1.5;

/**
 * 읽을 차례 → [{ i 줄 번호(0부터), who, text, rate, pitch, gap 그 줄 앞의 쉼(ms) }]
 * @param {object} card 듣기 카드
 * @param {boolean} slow 🐢 천천히
 */
export function listenPlan(card, slow = false) {
  const lines = card && Array.isArray(card.lines) ? card.lines : [];
  const who = card && card.listen && Array.isArray(card.listen.who) ? card.listen.who : [];
  const rate = slow ? RATE.slow : RATE.normal;
  const k = slow ? SLOW_GAP : 1;
  let prev = null;
  return lines.map((line, i) => {
    const s = speakerOf(card, line);
    const at = who.indexOf(s.who);
    const gap = i === 0 ? 0 : Math.round((s.who !== prev ? GAP.change : GAP.same) * k);
    prev = s.who;
    return { i, who: s.who, text: s.text, rate, pitch: at >= 0 ? PITCH[at % PITCH.length] : PITCH[0], gap };
  });
}

/** 다 푼 뒤 보여 줄 들은 글 → [{ who, text }] */
export function scriptRows(card) {
  return (card && Array.isArray(card.lines) ? card.lines : []).map((line) => speakerOf(card, line));
}

/**
 * 차례대로 읽는다 — say(text, { rate, pitch }) → Promise<{ ok, started, why? }> (speakko.sayKo 꼴)
 *  · alive()가 거짓이 되면(멈춤·다른 카드·화면 나감) 그 자리에서 그만 → { done: false, why: 'stop' }
 *  · 소리가 시작되지 않은 줄 → 그만 { done: false, why: 'silent'·'none'·오류 이름, started: 앞 줄에서 소리를 냈나 }
 *  · 시작했지만 끝 알림이 없던 줄('noend')은 넘어간다(그런 기기가 있다) · 시작한 뒤 멈춘 줄(interrupted …)은 그만
 * @returns {Promise<{done:boolean, why?:string, at?:number, started:boolean, noend:number}>}
 */
export async function runPlan(plan, { say, alive = () => true, onLine = () => {}, wait = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  let started = false;
  let noend = 0;
  for (const p of plan) {
    if (!alive()) return { done: false, why: 'stop', at: p.i, started, noend };
    if (p.gap > 0) {
      await wait(p.gap);
      if (!alive()) return { done: false, why: 'stop', at: p.i, started, noend };
    }
    onLine(p);
    let r;
    try { r = await say(p.text, { rate: p.rate, pitch: p.pitch }); } catch (e) { r = { ok: false, started: false, why: String((e && e.message) || e) }; }
    if (!alive()) return { done: false, why: 'stop', at: p.i, started, noend };
    if (r && r.started) started = true;
    if (r && r.ok) continue;
    if (r && r.started && r.why === 'noend') { noend++; continue; } // 끝까지 가 보되, 다 들었는지는 아이에게 묻는다(unsure)
    return { done: false, why: (r && r.why) || 'silent', at: p.i, started, noend };
  }
  return { done: true, started, noend };
}

/** 끝까지 들었다고 할 수 있나 — 모든 줄이 끝 알림까지 왔다 */
export function fullyHeard(res) {
  return !!res && res.done === true && !res.noend;
}

/** 끝까지 갔지만 끝 알림이 빠진 줄이 있다 — 끝났는지 모르니 "끝까지 들렸나요?" (✅ 끝까지 들렸어요를 눌러야 물음) */
export function unsure(res) {
  return !!res && res.done === true && res.noend > 0;
}

/** 소리가 아예 시작되지 않았나 — 그러면 📄 글로 읽고 풀기를 크게 */
export function neverStarted(res) {
  return !!res && !res.done && res.why !== 'stop' && !res.started;
}

/** 🎧 상자 아래 한 줄 (순수) — runPlan 결과 · 처음 다 들었나 → 말 ('' = 아무 말 없음) */
export function listenNote(res, heard) {
  if (!res) return heard ? '' : '끝까지 들으면 물음이 나와요';
  if (res.done) return res.noend && !heard ? '끝났는지 확인하지 못했어요 — 끝까지 들렸나요? 중간에 끊겼으면 ▶ 다시 들어요' : '';
  if (res.why === 'stop') return heard ? '' : '멈췄어요 — 처음부터 끝까지 들으면 물음이 나와요';
  if (res.why === 'none') return '이 기기는 소리 내어 읽기를 못 해요 — 📄 글로 읽고 풀어요';
  if (!res.started) return '소리가 시작되지 않았어요 — 소리를 켜고 ▶ 다시 눌러 보거나, 📄 글로 읽고 풀어요';
  return `읽다가 멈췄어요 (${res.why}) — ▶ 다시 들어 보세요`;
}

/** 🎧 읽기가 끝났을 때 알림 칸(.kor-live)에 한 번 (순수) — 줄마다는 알리지 않는다(들을 글과 겹친다) ·
 *  first 이번에 처음 다 들었다 · qn 물음 수 (Codex 57차 #6) */
export function listenAnnounce(res, heard, first = false, qn = 0) {
  if (!res) return '';
  if (first) return `다 들었어요 — 물음 ${qn}개가 나왔어요`;
  if (res.why === 'stop') return '멈췄어요';
  if (unsure(res) && !heard) return listenNote(res, heard);
  if (res.done) return '다 들었어요';
  return listenNote(res, heard);
}
