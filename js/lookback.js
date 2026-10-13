// 📖 풀이 돌아보기 (v248, 노가다 탈출구 막기 2단계 — 아버님 "이대로 진행", 2026-10-13)
//
// 틀린 문제의 풀이는 한꺼번에 펼치면 훑고 넘기기 쉽다 → 첫 줄만 보이고 "▶ 다음 줄"로 한 줄씩 연다(화면은 math.js).
// 고를 수 있는 문제는 먼저 "🔍 내 답은 왜 틀렸을까?"를 셋 중 하나 고른다 — 내 답의 까닭 + 다른 틀린 보기의 까닭 둘.
// 까닭 문장이 둘보다 적으면 억지로 셋을 만들지 않는다(문장을 지어내면 답이 둘이 될 수 있다 — Codex 59차 PART 3).
// ★ 고르기는 사람이 확인해 **켠 칸만**(🎯 칸의 `quiz: true` · 개념 편 풀이의 `solve.quiz === true`) — Codex 60차 #1:
//   출처가 다른 문장이어도 내 답에 함께 맞을 수 있다(직사각형 ↔ 평행사변형, "바르게 계산한 식을 물었어요").
//   생성기 까닭 263가지를 읽혀 보니 105가지가 걸렸다("분모는 그대로 두고…"처럼 고치는 말은 다른 틀린 답에도 맞는다) →
//   개념 편·💎는 지금 켠 곳이 없다(한 줄씩 열기만). 새 칸은 셋 중 정답이 하나뿐인지 확인한 뒤에 켠다.
// 순수 함수만. 점수·보상·노트·tries는 여기 결과로 바뀌지 않는다(돌아보기는 읽기 확인이다).
// (mathchal.js는 아무것도 import하지 않는 파일이라 🎯 고르기도 여기에 둔다)

import { checkPart, notesFor } from './mathchal.js';

/**
 * 한 덩이 설명 → 줄(문장) 목록. 마침표·물음표·느낌표 뒤 빈칸과 줄바꿈에서 나눈다.
 *  · **굵게** 안에서는 안 나눈다 — 나누면 별표 짝이 깨져 글자로 보인다
 *  · 소수(0.6)·닫는 따옴표(…요.")처럼 마침표 뒤가 빈칸이 아니면 안 나눈다
 *  · "1." 같은 번호만 남는 조각은 다음 문장에 붙인다
 */
export function splitLines(text) {
  const s = String(text == null ? '' : text);
  const out = [];
  let cur = '';
  let bold = false;
  const push = () => {
    const t = cur.trim();
    cur = '';
    if (!t) return;
    if (/^\d+[.)]$/.test(t)) { cur = t; return; } // 번호만 — 다음 문장 앞에 그대로 (뒤 빈칸은 다음 글자로 붙는다)
    out.push(t);
  };
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '*' && s[i + 1] === '*') { bold = !bold; cur += '**'; i += 1; continue; }
    if (ch === '\n' && !bold) { push(); continue; }
    cur += ch;
    if (!bold && (ch === '.' || ch === '!' || ch === '?') && /\s/.test(s[i + 1] || '')) push();
  }
  push();
  if (cur.trim()) out.push(cur.trim()); // 끝에 번호만 남았으면 그대로
  return out;
}

/** 씨앗 하나로 같은 차례 (mulberry32) — 🎒에 다녀와 다시 그려도 보기 차례가 그대로 */
function rngOf(seed) {
  let s = Math.floor(Number(seed) || 0) >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mixed(list, rnd) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 🔍 셋 중 하나 고르기 — 내 까닭(mine) + 다른 까닭 둘. 같은 글은 하나로 센다.
 * @returns {{opts:string[], ok:number}|null} 다른 까닭이 둘보다 적으면 null (고르기 없이 한 줄씩 열기만)
 */
export function reviewQuiz(mine, others, seed = 0) {
  const m = String(mine == null ? '' : mine).trim();
  if (!m) return null;
  const rest = [...new Set((others || []).map((x) => String(x == null ? '' : x).trim()).filter((x) => x && x !== m))];
  if (rest.length < 2) return null;
  const rnd = rngOf(seed);
  const opts = mixed([m, ...mixed(rest, rnd).slice(0, 2)], rnd);
  return { opts, ok: opts.indexOf(m) };
}

/**
 * 개념 편 문항의 🔍 고르기 — 고른 보기의 오개념 까닭(solve.why[tag]) + 화면에 있던 다른 틀린 보기의 까닭.
 * 풀이에 `quiz: true`를 단 문항만(사람이 확인한 틀) · 🤷 모르겠어요·짐작한 답(이름표 없음)·까닭 문장이 없는 이름표는 고르기 없음.
 */
export function conceptQuiz(q, ch, seed = 0) {
  const s = q && q.solve;
  if (!s || s.quiz !== true || !s.why || !ch || ch.ok || ch.idk || !ch.tag) return null;
  const mine = s.why[ch.tag];
  if (!mine) return null;
  const others = (q.choices || []).filter((x) => x && !x.ok && x.tag && x.tag !== ch.tag && s.why[x.tag]).map((x) => s.why[x.tag]);
  return reviewQuiz(mine, others, seed);
}

/**
 * 🎯 도전 문제의 🔍 고르기 — 틀린 칸 중 처음으로 고를 수 있는 칸 하나. 칸에 `quiz: true`를 단 곳만(사람이 확인한 칸)
 *  · 고르기(choice): 고른 틀린 보기의 까닭(notes) + 정답이 아닌 다른 보기의 까닭
 *  · 숫자판(num): 낸 수가 흔한 틀린 수(numNotes)면 그 까닭 + 다른 흔한 틀린 수의 까닭
 *  · 여러 개 고르기·순서·그래프는 틀린 까닭이 하나로 안 정해져 고르기 없음
 * @returns {{opts:string[], ok:number, part:number, key:string, num:boolean, label:string}|null}
 */
export function chalQuiz(item, given, seed = 0) {
  const parts = (item && item.parts) || [];
  const list = Array.isArray(given) ? given : [given];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const kind = (p && p.input) || 'num';
    if (!p || p.quiz !== true || (kind !== 'choice' && kind !== 'num') || checkPart(p, list[i])) continue;
    const mine = notesFor(p, list[i]).find((n) => n.picked && !n.ok);
    if (!mine) continue;
    const others = kind === 'num'
      ? Object.values(p.numNotes || {})
      : (p.choices || []).filter((c) => String(c) !== String(list[i]) && String(c) !== String(p.answer)).map((c) => (p.notes || {})[c]);
    const qz = reviewQuiz(mine.note, others, seed + i * 7919);
    if (qz) return { ...qz, part: i, key: String(mine.t), num: !!mine.num, label: p.label || '' };
  }
  return null;
}
