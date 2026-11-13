// 🎹 음악(피아노) 과목 — 규칙 (v402, 2026-11-08 · 아버님·어머님·진우 기본안 판 3 「추천대로」)
//
// 진우가 선생님 없이 악보를 보고 칠 건반을 찾게 한다. 한 무대(악보 · 떨어지는 막대 · 건반)를 두 가지로 쓴다:
//   🎹 태블릿으로 치기 — 진우가 화면 건반을 누른다 · 맞는 건반을 칠 때까지 기다린다 · 고르지 않은 손은 앱이 친다
//      → 끝까지 치고 맞게 누른 비율이 PASS_OK를 넘으면 💰 (한 줄 COIN.line · 곡 전체 COIN.all · 하루 TAP_DAY번까지)
//   🎧 듣고 따라 치기 — 앱이 연주하고 진우는 보면대 앞 진짜 피아노로 따라 친다 (어머님 바람)
//      → 앱이 그 줄을 끝까지 연주한 뒤 「다 쳤어요 ✋」 = 음표 한 칸 (하루 LISTEN_DAY칸까지 · 💰 없음)
//      → 다섯 칸(NOTES_PER_MON)마다 🎹 음악 포켓몬 한 마리가 온다(v404 기본안 「이대로」 — 잡기 없음 · 아직 안 만난 것 가운데 MON_WEIGHT대로 ·
//        다 만났으면 만난 것 가운데 또) · 칸은 v402부터 셌다 — 그때 찬 칸 몫은 음악 화면에 처음 들어올 때(monsDueRule) 온다
//   (v413 아버님 11-10 「태블릿으로 쳐도 곡을 10번 완주하면 포켓몬」 → 기본안 「추천대로」) 🎹 태블릿으로 치기도 「곡 전체」를 잘(goodPass) 끝까지 친 판이
//      🎹 건반 한 칸 · 열 칸(TAPS_PER_MON)마다 음악 포켓몬 — ♪ 칸과 따로 센다(taps · tapMons) · v420부터 한 곡을 하루에 열 번 연달아(날 칸 run · won) ·
//      끝날 때 박자 판정(beatScore — 음표마다 제때 눌렀나 × 맞게 누른 비율) → 🎉 빵빠레 · 👏 짝짝 · 🎺 뿌우~ (진우 바람 · 보상과는 상관없음)
// 도움은 잠그지 않는다 — 네 단계(1 막대 · 2 계이름 · 3 건반 빛 · 4 악보만)를 처음부터 고르고, 끝나면 한 단계 걷기를 권하기만.
// ⏳ 하루 40분은 음악만 따로(timelimit.js 'music') — 🎮 게임기 판을 세는 공부 시간(timelimit.SUBJECTS)에는 넣지 않는다.
//
// 곡 표기 (pianosongs.js 공개 연습곡 · 비공개 저장소 music/songs.json — 진우 책 곡은 저작권이 있어 공개 저장소에 두지 않는다):
//   { id, ko, by?, bpm, beats, lines:[줄 첫 마디(1부터)], segno?, fine?, dsAlFine?, chords?:{마디:[이름]}, dyn?:{마디:'mf'},
//     right:[마디마다 한 칸], left:[…] }
//   한 칸 = 빈칸으로 나눈 '음:박:손가락' — 화음 'B4+G5:2:1+5' · 쉼표 'R:1' · 붙임줄은 끝에 '~'(다음 같은 음과 이어 한 번만 친다)
//   (v403) pickup?: 못갖춘마디 박 수 — 첫 칸이 그 마디(책처럼 0번) · 마지막 마디는 beats 또는 beats - pickup
//          play?: [[첫, 끝], …] 곡 전체 연주 차례(도돌이표·1·2번 괄호) · repeats?: [{from, to}] · endings?: [{label, bars:[…]}] (그림만)
//          ottava?: [{hand, from, to, shift}] — 그 마디들은 적힌 자리보다 shift 옥타브 소리(8vb = -1) · 마디 번호는 모두 책 번호
//
// ★ 이 파일은 아무것도 import하지 않는다 — 시험이 DOM·IndexedDB 없이 부른다.

/** 🎹 태블릿으로 치기 — 맞게 누른 비율이 이만큼 넘어야 💰 (화면에는 비율을 보이지 않는다) */
export const PASS_OK = 0.7;
/** 💰 한 줄 · 곡 전체 */
export const COIN = { line: 5, all: 15 };
/** 💰를 받는 하루 횟수 — 곡 상관없이 (v407 아버님 11-09 「5번까지 줘도 될 거 같은데」 · v406까지 3) */
export const TAP_DAY = 5;
/** 그날 💰 받은 횟수를 읽을 때의 상한 — 한도(TAP_DAY)로 자르지 않는다: 한도를 바꾼 뒤 옛 판 창이 횟수를 깎아 저장하면 한도가 다시 열린다 (Codex 212차 P2) */
const PAID_KEEP = 99;
/** 🎧 「다 쳤어요」 음표 칸 — 하루 셈 */
export const LISTEN_DAY = 3;
/** 음표 칸 다섯마다 음악 포켓몬 (v404) */
export const NOTES_PER_MON = 5;
/**
 * 🎹 건반 칸 — 한 곡을 하루에 이만큼 연달아 「곡 전체」를 잘 치면 음악 포켓몬 한 마리 (v413 아버님 「곡을 10번 완주하면」 →
 * v420 11-12 아버님 「하루에 한 곡을 연달아서 10번을 완주해서 치지 않으면 포켓몬을 주지 않는 걸로」 기본안 「추천대로」) ·
 * 다른 곡을 잘 끝까지 치면 처음부터 · 못 친 판·한 줄 연습은 안 셈·안 끊음 · 자정이면 처음부터 · 하루 한 마리
 */
export const TAPS_PER_MON = 10;
const SONG_RE = /^[a-z0-9_-]{1,40}$/i;
/** 그날 🎹 건반 칸을 읽을 때의 상한 — 하루 몫으로 자르지 않는다: PAID_KEEP과 같은 까닭 (Codex 217차 P2) */
const TAPS_KEEP = 99;
/** 🎹 음악 포켓몬 한 마리마다의 무게 — 흔함 4 · 보통 3 · 희귀 2 · 전설 1 (v404 기본안 ② · 흔한 아이가 자주, 전설은 대개 뒤쪽에) */
export const MON_WEIGHT = { 1: 4, 2: 3, 3: 2, 4: 1 };
/** 한 번에 줄 음악 포켓몬 상한 (밀린 몫이 많아도 창이 끝없이 이어지지 않게 — 나머지는 다음 「다 쳤어요」·다음 들어올 때) */
export const MONS_AT_ONCE = 5;
/** 도움 단계 */
export const LEVELS = [1, 2, 3, 4];
/** 빠르기 막대 — 원래 빠르기의 몇 배 (아버님: 단추 대신 밀어서) */
export const SPEED = { min: 0.4, max: 1.2, step: 0.05, def: 0.75 };
/** 날마다 남기는 칸 수 · 연습 기록 줄 수 */
export const KEEP_DAYS = 14;
export const LOG_MAX = 60;
/** 곡 하나의 상한 (비공개 원고가 깨져도 화면이 버티게) */
export const MAX_BARS = 200;
/** 하루 칸 (db.js DAILY_SUMS — 📤 usage 한 줄) : 끝까지 친 판 · 그 가운데 잘 친 판 · 받은 💰 · 「다 쳤어요」 · 센 음표 칸 · 온 음악 포켓몬(v404) · 🐾 안내 창을 「알겠어요!」로 닫은 번(v405) ·
 *  🎹 자유롭게 치기(v408) 연 번 · 누른 건반 · 친 초(쉰 틈은 10초까지만) ·
 *  (v413) 🎹 건반 칸을 센 판 · 박자 판정 🎉·👏·🎺 판 수 · 연주 중 화면이 STALL.ms 넘게 멈칫한 번 · 그 가운데 STALL.long 넘은 번 ·
 *  (v414) 연주 중 소리 멎음 번 · 그 가운데 MUTE.long 넘은 번 · 소리 장치가 꺼져 있던 번 · 느린 장면 번 · 그 시간 합(ms) · 건반 누름이 끊긴 번 ·
 *  (v417) 🎧 「다 쳤어요」를 누른 번(어른 확인 전 — 확인 뒤 저장된 번은 pnListenN) · 그 확인 창에서 비밀번호가 틀린 번 */
export const PIANO_DAILY = ['pnTapN', 'pnTapOk', 'pnCoins', 'pnListenN', 'pnNotes', 'pnMons', 'pnIntro', 'pnFreeN', 'pnFreeKeys', 'pnFreeSec',
  'pnTapSlots', 'pnFan', 'pnClap', 'pnBoo', 'pnStallN', 'pnStallLong',
  'pnMuteN', 'pnMuteLong', 'pnMuteOff', 'pnSlowN', 'pnSlowMs', 'pnCancelN', 'pnListenAsk', 'pnPinBad'];
/** 🎺 박자 판정 등급 → 하루 칸 (v413) */
export const GRADE_DAILY = { great: 'pnFan', good: 'pnClap', boo: 'pnBoo' };
/** 연주 중 화면 멈칫 (v413 — 「멈췄다가 3~4초 뒤 풀린다」가 태블릿이 버거워 멈춘 것인지 가르려고) · ms 이상이면 셈 · long 이상은 따로 */
export const STALL = { ms: 1000, long: 2500 };
/** 연주 중 소리 멎음 (v414 — 「멈췄을 때 건반 소리가 안 났다 · 누른 모양은 보였다」: 화면은 도는데 소리 엔진 시계가 안 간 것) · ms 이상이면 셈 · long 이상은 따로 */
export const MUTE = { ms: 500, long: 2500 };
/** 연주 중 느린 장면 (v414) — 화면 한 장 사이가 ms 이상이고 STALL.ms 아래(⚠️ 멈칫이 못 잡는 「기어가기」) */
export const SLOW = { ms: 200 };

const LETTERS = 'CDEFGAB';
const SEMI = [0, 2, 4, 5, 7, 9, 11];
const SOL = ['도', '레', '미', '파', '솔', '라', '시'];
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const nz = (v) => { const n = Math.floor(Number(v) || 0); return n > 0 ? n : 0; };
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const EPS = 1e-6;

// ───────────────────── 음 ─────────────────────

/** 'G#4' → { li, acc, oct, d(흰건반 차례 — 오선 자리), midi } · 아니면 null */
export function parseNote(s) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(String(s || ''));
  if (!m) return null;
  const li = LETTERS.indexOf(m[1]);
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const oct = Number(m[3]);
  return { li, acc, oct, d: oct * 7 + li, midi: 12 * (oct + 1) + SEMI[li] + acc };
}

/** 계이름 '도'·'파♯'·'시♭' */
export function solOf(n) {
  if (!n) return '';
  return SOL[n.li] + (n.acc > 0 ? '♯' : n.acc < 0 ? '♭' : '');
}

/** midi → 흰건반 차례(검은 건반은 왼쪽 흰건반) */
const WHITE_OF = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
export function whiteIdx(midi) {
  return Math.floor(midi / 12) * 7 + WHITE_OF[((midi % 12) + 12) % 12];
}
export function isBlack(midi) {
  return [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);
}
export function midiOfWhite(wi) {
  return 12 * Math.floor(wi / 7) + SEMI[((wi % 7) + 7) % 7];
}

// ───────────────────── 곡 읽기 ─────────────────────

/** 책의 첫 마디 번호 — 못갖춘마디가 있으면 0(책이 1로 세면 pickupBar: 1 → song.first) · 없으면 1 */
export const firstNum = (song) => (Number.isInteger(song.first) ? song.first : song.pickup ? 0 : 1);
/** 원고 차례(0부터) → 책의 마디 번호 */
export const barNum = (song, i) => i + firstNum(song);

/** 한 마디 글 → { groups:[{ notes:[parseNote+finger], rest, dur, tie, t }], t:박 합 } · 깨졌으면 { bad } — 박 합은 부르는 쪽이 본다 */
function readBar(text, beats) {
  const out = [];
  let t = 0;
  const toks = String(text == null ? '' : text).trim().split(/\s+/).filter(Boolean);
  if (!toks.length) return { bad: '빈 마디' };
  for (const raw of toks) {
    const tie = raw.endsWith('~');
    const [ns, ds, fs = ''] = raw.replace(/~$/, '').split(':');
    const dur = Number(ds);
    if (!(dur > 0) || dur > beats * 2) return { bad: `박 ${ds}` };
    if (ns === 'R') {
      if (tie) return { bad: '쉼표에 붙임줄' };
      out.push({ rest: true, notes: [], dur, t, tie: false });
    } else {
      const names = ns.split('+');
      const fins = fs ? fs.split('+') : [];
      if (fins.length && fins.length !== names.length) return { bad: `손가락 수 ${raw}` };
      const notes = [];
      for (let k = 0; k < names.length; k += 1) {
        const n = parseNote(names[k]);
        if (!n || n.midi < 21 || n.midi > 108) return { bad: `음 ${names[k]}` };
        const f = fins[k] ? Number(fins[k]) : 0;
        if (fins[k] && !(Number.isInteger(f) && f >= 1 && f <= 5)) return { bad: `손가락 ${fins[k]}` };
        notes.push({ ...n, name: names[k], finger: f });
      }
      out.push({ rest: false, notes, dur, t, tie });
    }
    t += dur;
  }
  return { groups: out, t };
}

/** 곡 전체 연주 차례(원고 차례 0부터) — play가 있으면 그대로 · 없으면 처음부터 끝까지(D.S. al Fine이면 세뇨로 돌아가 피네까지) */
function fullOrder(song) {
  const f = firstNum(song);
  if (Array.isArray(song.play) && song.play.length) return song.play.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a - f + i));
  const order = Array.from({ length: song.n }, (_, i) => i);
  if (song.ds) for (let b = song.segno - f; b <= song.fine - f; b += 1) order.push(b);
  return order;
}

/** 책 번호 마디 목록 칸 하나가 [첫, 끝] 안의 정수인지 */
const inBars = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

/**
 * 곡 원고 → 쓸 수 있는 곡 (순수) · 깨졌으면 { ok:false, bad:[까닭] }
 * 붙임줄(~)은 같은 손·같은 음으로만 이어진다 — 곡 전체 연주 차례대로 본다(되돌아가는 자리를 넘어도 · 곡 끝에서 끊기면 안 됨)
 * 줄 첫 마디는 책의 첫 마디부터 늘어나야 · 세뇨·피네·차례·도돌이표·괄호·옥타브는 마디 안 · 마디 번호는 모두 책 번호
 */
export function readSong(raw) {
  const bad = [];
  if (!isObj(raw)) return { ok: false, bad: ['곡이 아님'] };
  const id = String(raw.id || '').trim();
  if (!/^[a-z0-9_-]{1,40}$/i.test(id)) bad.push('id');
  const ko = String(raw.ko || '').trim().slice(0, 40);
  if (!ko) bad.push('이름');
  const beats = Number(raw.beats);
  if (![2, 3, 4].includes(beats)) bad.push('박자');
  const bpm = Number(raw.bpm);
  if (!(bpm >= 30 && bpm <= 240)) bad.push('빠르기');
  const R = Array.isArray(raw.right) ? raw.right : null;
  const L = Array.isArray(raw.left) ? raw.left : null;
  if (!R || !L || !R.length || R.length !== L.length || R.length > MAX_BARS) bad.push('마디 수');
  const pickup = raw.pickup == null ? 0 : Number(raw.pickup);
  // 숫자가 아니면(오타) 「못갖춘마디 없음」으로 넘기지 않는다 (Codex 207차 P3-5)
  if (raw.pickup != null && !(Number.isFinite(pickup) && (pickup === 0 || (pickup > 0 && pickup < beats && R && R.length >= 2)))) bad.push('못갖춘마디');
  if (bad.length) return { ok: false, bad };
  const n = R.length;
  // 못갖춘마디를 책이 0으로 세는지 1로 세는지는 책마다 다르다 — pickupBar: 1이면 못갖춘마디가 1마디 (v403)
  if (raw.pickupBar != null && !(pickup && [0, 1].includes(raw.pickupBar))) bad.push('못갖춘마디 번호');
  const f = pickup ? (raw.pickupBar === 1 ? 1 : 0) : 1;
  const last = n - 1 + f;
  const handKo = (hand) => (hand === 'R' ? '오른손' : '왼손');
  // 박자 바꿈(v403) — meter {책 마디 번호: 박} · 그 마디부터 끝까지(다음 바꿈까지) · 첫 박자는 beats
  const meters = Array(n).fill(beats);
  const meter = {};
  if (raw.meter != null) {
    if (!isObj(raw.meter) || Object.keys(raw.meter).length > 20) bad.push('박자 바꿈');
    else {
      for (const [k, v] of Object.entries(raw.meter)) {
        const num = Number(k);
        const val = Number(v);   // 빠르기 바꿈처럼 글자 "4"도 숫자로 (Codex 208차)
        if (!inBars(num, f + 1, last) || ![2, 3, 4].includes(val)) { bad.push('박자 바꿈'); break; }
        meter[num] = val;
      }
      for (let b = 0, cur = beats; b < n; b += 1) { if (meter[b + f]) cur = meter[b + f]; meters[b] = cur; }
    }
  }
  // 빠르기 바꿈(v403) — tempo {책 마디 번호: ♩ 빠르기} · 그 마디부터 · 없으면 bpms를 두지 않는다(옛 곡 그대로)
  let bpms = null;
  if (raw.tempo != null) {
    if (!isObj(raw.tempo) || Object.keys(raw.tempo).length > 20) bad.push('빠르기 바꿈');
    else {
      const at = {};
      for (const [k, v] of Object.entries(raw.tempo)) {
        const num = Number(k);
        if (!inBars(num, f + 1, last) || !(Number(v) >= 30 && Number(v) <= 240)) { bad.push('빠르기 바꿈'); break; }
        at[num] = Number(v);
      }
      bpms = Array(n);
      for (let b = 0, cur = bpm; b < n; b += 1) { if (at[b + f]) cur = at[b + f]; bpms[b] = cur; }
    }
  }
  // 마디 길이 — 못갖춘마디는 pickup박 · 그때 마지막 마디는 그 박자 또는 남은 박 · 나머지는 그 마디 박자 · 두 손이 같아야
  const allowed = (b) => (pickup && b === 0 ? [pickup] : pickup && b === n - 1 ? [meters[b], meters[b] - pickup] : [meters[b]]);
  const bars = { R: [], L: [] };
  const lens = [];
  for (const [hand, list] of [['R', R], ['L', L]]) {
    for (let b = 0; b < n; b += 1) {
      const r = readBar(list[b], meters[b]);
      if (r.bad) { bad.push(`${handKo(hand)} ${b + f}마디 ${r.bad}`); bars[hand].push([]); continue; }
      bars[hand].push(r.groups);
      if (!allowed(b).some((v) => Math.abs(r.t - v) <= EPS)) bad.push(`${handKo(hand)} ${b + f}마디 박 합 ${r.t}`);
      else if (hand === 'R') lens[b] = r.t;
      else if (lens[b] != null && Math.abs(lens[b] - r.t) > EPS) bad.push(`${b + f}마디 두 손 박 합이 다름`);
    }
  }
  const lines = Array.isArray(raw.lines) && raw.lines.length ? raw.lines.map(Number) : [f];
  if (lines[0] !== f || lines.some((v, i) => !inBars(v, f, last) || (i && v <= lines[i - 1]))) bad.push('줄 첫 마디');
  const segno = raw.segno == null ? 0 : Number(raw.segno);
  const fine = raw.fine == null ? 0 : Number(raw.fine);
  const ds = raw.dsAlFine === true;
  if (segno && !inBars(segno, Math.max(1, f), last)) bad.push('세뇨');
  if (fine && !inBars(fine, segno || Math.max(1, f), last)) bad.push('피네');
  if (ds && !(segno && fine)) bad.push('D.S. al Fine에 세뇨·피네가 없음');
  // 연주 차례(도돌이표·1·2번 괄호) — 모든 마디가 한 번은 나와야 · D.S.와 함께 쓰지 않는다
  let play = null;
  if (raw.play != null) {
    const ok = Array.isArray(raw.play) && raw.play.length >= 1 && raw.play.length <= 20
      && raw.play.every((p) => Array.isArray(p) && p.length === 2 && inBars(p[0], f, last) && inBars(p[1], p[0], last));
    if (!ok) bad.push('연주 차례');
    else {
      play = raw.play.map(([a, b]) => [a, b]);
      const seen = new Set(play.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i)));
      if (seen.size !== n) bad.push('연주 차례에 빠진 마디');
      if (play.reduce((s, [a, b]) => s + b - a + 1, 0) > MAX_BARS * 3) bad.push('연주 차례가 너무 김');
      if (ds) bad.push('D.S.와 연주 차례를 함께 씀');
    }
  }
  // 도돌이표·괄호는 그림만 — 연주 차례(play)가 있어야 소리와 맞는다
  const repeats = [];
  if (raw.repeats != null) {
    if (!Array.isArray(raw.repeats) || raw.repeats.length > 10) bad.push('도돌이표');
    else for (const r of raw.repeats) {
      if (!isObj(r) || !inBars(r.from, f, last) || !inBars(r.to, r.from, last)) { bad.push('도돌이표'); break; }
      repeats.push({ from: r.from, to: r.to });
    }
  }
  const endings = [];
  if (raw.endings != null) {
    if (!Array.isArray(raw.endings) || raw.endings.length > 10) bad.push('괄호');
    else for (const e of raw.endings) {
      const label = isObj(e) ? String(e.label || '').trim().slice(0, 4) : '';
      if (!label || !Array.isArray(e.bars) || !e.bars.length || e.bars.length > 20 || !e.bars.every((v) => inBars(v, f, last))) { bad.push('괄호'); break; }
      endings.push({ label, bars: [...new Set(e.bars)].sort((a, b) => a - b) });
    }
  }
  if ((repeats.length || endings.length) && !play) bad.push('도돌이표·괄호가 있으면 연주 차례도');
  // 옥타브(8va·8vb) — 그 손의 그 마디들은 적힌 자리(그림)는 두고 소리(midi)만 옮긴다
  const ottava = [];
  if (raw.ottava != null) {
    if (!Array.isArray(raw.ottava) || raw.ottava.length > 20) bad.push('옥타브');
    else for (const o of raw.ottava) {
      if (!isObj(o) || !['R', 'L'].includes(o.hand) || ![-1, 1].includes(o.shift) || !inBars(o.from, f, last) || !inBars(o.to, o.from, last)) { bad.push('옥타브'); break; }
      // 같은 손의 구간이 겹치면 두 번 옮겨져 두 옥타브가 된다 — 깨진 원고로 (Codex 207차 P2-2)
      if (ottava.some((p) => p.hand === o.hand && o.from <= p.to && p.from <= o.to)) { bad.push('옥타브 구간이 겹침'); break; }
      ottava.push({ hand: o.hand, from: o.from, to: o.to, shift: o.shift });
    }
  }
  if (bad.length) return { ok: false, bad };
  for (const o of ottava) {
    for (let b = o.from - f; b <= o.to - f; b += 1) {
      for (const g of bars[o.hand][b]) for (const x of g.notes) {
        x.midi += 12 * o.shift;
        if (x.midi < 21 || x.midi > 108) bad.push(`${handKo(o.hand)} ${b + f}마디 옥타브 옮긴 음이 건반 밖`);
      }
    }
  }
  // 붙임줄 — 곡 전체 연주 차례에서 다음 음이 같은 음이어야 (D.S.·도돌이로 돌아가는 자리도 · 곡 끝에서 끊기면 안 됨)
  const order = fullOrder({ n, pickup, first: f, play, ds, segno, fine });   // first를 빼면 pickupBar 1인 곡의 차례가 한 마디 밀린다
  for (const hand of ['R', 'L']) {
    const flat = order.flatMap((b) => bars[hand][b].map((g) => ({ g, b })));
    const said = new Set();
    flat.forEach(({ g, b }, i) => {
      if (!g.tie) return;
      const nx = flat[i + 1];
      const same = nx && !nx.g.rest && nx.g.notes.map((x) => x.midi).join() === g.notes.map((x) => x.midi).join();
      const msg = `${handKo(hand)} ${b + f}마디 붙임줄이 같은 음으로 안 이어짐`;
      if (!same && !said.has(msg)) { said.add(msg); bad.push(msg); }
    });
  }
  if (bad.length) return { ok: false, bad };
  const chords = {};
  if (isObj(raw.chords)) for (const [k, v] of Object.entries(raw.chords)) if (Array.isArray(v)) chords[k] = v.map((x) => String(x).slice(0, 12)).slice(0, 4);
  const dyn = {};
  if (isObj(raw.dyn)) for (const [k, v] of Object.entries(raw.dyn)) dyn[k] = String(v).slice(0, 4);
  return {
    ok: true,
    song: {
      id, ko, by: String(raw.by || '').slice(0, 40), from: String(raw.from || '').slice(0, 120), bpm, beats, n, lines, segno, fine, ds,
      pickup, first: f, lens, meters, meter, bpms, play, repeats, endings, ottava, chords, dyn, bars,
    },
  };
}

/** 줄 k의 마디(원고 차례 0부터) [첫, 끝+1) */
export function lineBars(song, k) {
  const f = firstNum(song);
  const a = song.lines[k] - f;
  const b = k + 1 < song.lines.length ? song.lines[k + 1] - f : song.n;
  return [a, b];
}

/**
 * 연주 차례 — 원고 차례(0부터) 목록 (순수)
 * line < 0(곡 전체): play가 있으면 그 차례(도돌이표·1·2번 괄호) · 없으면 처음부터 끝까지, D.S. al Fine이면 세뇨로 돌아가 피네에서 끝
 * 줄 하나: 그 줄 마디만(되돌이 없이)
 */
export function playOrder(song, line = -1) {
  if (line >= 0 && line < song.lines.length) {
    const [a, b] = lineBars(song, line);
    return Array.from({ length: b - a }, (_, i) => a + i);
  }
  return fullOrder(song);
}

/**
 * 연주판 — 차례대로 펼친 마디 · 소리 낼 음(붙임줄은 한 번) · 그릴 머리 (순수)
 * @returns {{ bars:[{src, at, len}], notes:[{hand, midi, d, li, acc, t, dur, finger, src}], heads:[{hand, t, dur, notes, rest, tie, src, gi}], end }}
 *   t·at·len·end는 박(0부터) · src는 원래 마디(원고 차례 0부터) · len은 그 마디 박 수(못갖춘마디·마지막 마디는 짧을 수 있다)
 */
export function perform(song, line = -1) {
  const order = playOrder(song, line);
  let at = 0;
  const bars = order.map((src) => {
    const len = Array.isArray(song.lens) && song.lens[src] > 0 ? song.lens[src] : song.beats;
    const b = { src, at, len };
    at += len;
    return b;
  });
  const heads = [];
  const notes = [];
  for (const hand of ['R', 'L']) {
    let hold = null; // 붙임줄로 이어 가는 중인 소리
    const mine = []; // 이 손의 머리 (차례대로)
    bars.forEach(({ src, at }, bi) => {
      bars[bi].first = bi === 0 || bars[bi - 1].src !== src - 1; // 되돌아온 첫 마디(세뇨) — 그림에 표시
      bar(song.bars[hand][src]).forEach((g, gi) => {
        const t = at + g.t;
        const h = { hand, t, dur: g.dur, notes: g.notes, rest: g.rest, tie: g.tie, src, gi };
        heads.push(h);
        mine.push(h);
        if (g.rest) { hold = null; return; }
        if (hold && hold.next === t && hold.key === g.notes.map((x) => x.midi).join()) {
          for (const s of hold.list) s.dur += g.dur;
        } else {
          hold = { list: g.notes.map((x) => { const s = { hand, midi: x.midi, d: x.d, li: x.li, acc: x.acc, t, dur: g.dur, finger: x.finger, src }; notes.push(s); return s; }) };
        }
        hold = g.tie ? { ...hold, next: t + g.dur, key: g.notes.map((x) => x.midi).join() } : null;
      });
    });
    // 그릴 붙임줄은 이 차례에서 정말 이어지는 것만 — 줄 연습(원고 차례)에서는 곡 전체 차례의 이음이 다른 음에 닿을 수 있다 (Codex 207차 P3-3)
    const key = (h) => h.notes.map((x) => x.midi).join();
    mine.forEach((h, i) => {
      if (!h.tie) return;
      const nx = mine[i + 1];
      h.tie = !!nx && !nx.rest && key(nx) === key(h) && Math.abs(nx.t - (h.t + h.dur)) < EPS;
    });
  }
  notes.sort((a, b) => a.t - b.t || a.midi - b.midi);
  heads.sort((a, b) => a.t - b.t);
  return { bars, notes, heads, end: at };
}
const bar = (gs) => (Array.isArray(gs) ? gs : []);

/** 박 t에서의 빠르기 (순수) — tempo 바꿈이 없으면 곡 빠르기 · 시작 전(t<0)은 첫 마디 빠르기 */
export function bpmAt(song, perf, t) {
  if (!Array.isArray(song.bpms) || !perf || !perf.bars.length) return song.bpm;
  const b = perf.bars.find((x) => t < x.at + x.len) || perf.bars[perf.bars.length - 1];
  return song.bpms[b.src] || song.bpm;
}

/**
 * 박 t부터 dur박이 몇 초인지 (순수 · 빠르기 배율 1) — 빠르기가 바뀌는 마디를 걸치면 마디마다 그 빠르기로 나눠 더한다
 * (시작 때의 빠르기 하나로 재면 ♩64 → ♩150 자리의 첫 음이 두 배 넘게 길게 울렸다 — Codex 208차 P2)
 */
export function secsOf(song, perf, t, dur) {
  if (!Array.isArray(song.bpms) || !perf || !perf.bars.length) return (dur * 60) / song.bpm;
  let sec = 0;
  let left = dur;
  for (const b of perf.bars) {
    const lo = Math.max(t, b.at);
    const hi = Math.min(t + dur, b.at + b.len);
    if (hi <= lo) continue;
    sec += ((hi - lo) * 60) / (song.bpms[b.src] || song.bpm);
    left -= hi - lo;
  }
  return left > EPS ? sec + (left * 60) / bpmAt(song, perf, t) : sec;   // 연주판 밖(그럴 일은 드물다)은 가까운 마디 빠르기로
}

/**
 * 1·2번 괄호 한 조각의 모양 (순수) — 책 번호 num 마디에서
 * open: 괄호의 첫 마디(왼쪽 갈고리 + 「1.」) · close: 괄호의 끝 마디이고 그 끝에서 되돌아갈 때(도돌이표 끝)만 오른쪽 갈고리
 * (배열에서 몇째인지로 정하면 괄호 묶음이 둘인 곡에서 되돌아가지 않는 2번 괄호도 닫혔다 — Codex 207차 P3-4)
 */
export function endingShape(song, e, num) {
  const end = e.bars[e.bars.length - 1];
  return { open: e.bars[0] === num, close: end === num && (song.repeats || []).some((r) => r.to === end) };
}

/**
 * 🎹 태블릿으로 치기 — 기다릴 걸음 (순수): 진우가 치는 손의 음을 같은 때끼리 묶는다
 * @param {'R'|'L'|'B'} hands
 * @returns {Array<{t:number, need:number[]}>}
 */
export function stepsOf(perf, hands) {
  const m = new Map();
  for (const s of perf.notes) {
    if (hands !== 'B' && s.hand !== hands) continue;
    const k = s.t.toFixed(4);
    if (!m.has(k)) m.set(k, { t: s.t, need: [] });
    if (!m.get(k).need.includes(s.midi)) m.get(k).need.push(s.midi);
  }
  return [...m.values()].sort((a, b) => a.t - b.t);
}

/** 보여 줄 건반 창 — 흰건반 차례 [lo, hi] (순수) · 그 음들 + 양옆 pad · 적어도 minKeys개 (88건반 양 끝에서도) */
export function keyWindow(midis, pad = 1, minKeys = 12) {
  const ws = (midis.length ? midis : [60]).map(whiteIdx);
  const A0 = whiteIdx(21);
  const C8 = whiteIdx(108);
  let lo = Math.min(...ws) - pad;
  let hi = Math.max(...ws) + pad;
  while (hi - lo + 1 < minKeys) { if ((hi - lo) % 2) lo -= 1; else hi += 1; }
  // 88건반 밖으로 나간 만큼 반대쪽으로 옮긴 뒤 자른다 — 자르기만 하면 맨 아래·맨 위 곡에서 건반이 적어진다 (Codex 204차 P3-8)
  if (lo < A0) { hi += A0 - lo; lo = A0; }
  if (hi > C8) { lo -= hi - C8; hi = C8; }
  return { lo: Math.max(A0, lo), hi: Math.min(C8, hi) };
}

/** 🎹 칠 때가 이만큼(박) 남았으면 미리 눌러도 맞음 */
export const EARLY = 0.6;

/**
 * 🎹 누른 건반 판정 (순수) — st = 지금 기다리는 걸음 { t, need, got:Set } · t = 지금 박
 * → 'ok'(칠 음) · 'bad'(칠 때가 가까운데 다른 건반) · 'plain'(아직 멀거나 이미 누른 음 — 세지 않음)
 * ★ 틀린 건반은 기다리는 동안만이 아니라 「가까울 때」 모두 센다 — 건반을 마구 눌러 미리 맞혀도 비율이 오르지 않게
 */
export function pressKind(st, t, waiting, midi) {
  if (!st) return 'plain';
  if (!waiting && st.t - t > EARLY) return 'plain';
  if (!st.need.includes(midi)) return 'bad';
  return st.got && st.got.has(midi) ? 'plain' : 'ok';
}

/** 맞게 누른 비율로 잘 쳤나 (순수) — 누른 게 하나도 없으면 아니다 */
export function goodPass(ok, bad) {
  const a = nz(ok);
  const b = nz(bad);
  return a > 0 && a / (a + b) >= PASS_OK - EPS;
}

/**
 * 🎺 박자 판정 (v413 진우 바람 — 판 끝 효과음) — 걸음(같은 때 칠 음)마다 제때 눌렀나:
 *   막대가 닿기 전에 다 눌렀으면 early(남은 박)가 BEAT.early 안이면 한 점 · 더 일찍이면 반 점(EARLY 넘게 일찍 누른 건 세지도 않는다)
 *   막대가 닿은 뒤 기다리게 했으면 late(기다린 박 — 한 화면에 0.25초까지만 넣어 태블릿 멈칫은 아이 탓이 안 된다)가 BEAT.late 안이면 한 점 · BEAT.lateHalf 안이면 반 점
 * 점수(0~100) = 걸음 점수 평균 × 맞게 누른 비율 · 등급: 잘 치지 못했으면(goodPass 아님) 🎺 · great 이상 🎉 · good 이상 👏 · 아래는 🎺
 * ★ 아이 화면에는 점수를 쓰지 않는다 — 소리·그림만 · 점수는 📤 music.md에 (문턱은 기록을 보고 맞춘다)
 */
export const BEAT = { early: 0.35, late: 0.35, lateHalf: 1, great: 80, good: 50 };
export function stepPoint(st) {
  if (!isObj(st)) return 0;
  const late = Number(st.late);
  if (st.late != null && Number.isFinite(late)) return late <= BEAT.late + EPS ? 1 : late <= BEAT.lateHalf + EPS ? 0.5 : 0;
  const early = Number(st.early);
  if (st.early != null && Number.isFinite(early)) return early <= BEAT.early + EPS ? 1 : 0.5;
  return 1;
}
export function beatScore(steps, ok, bad) {
  const list = Array.isArray(steps) ? steps : [];
  const a = nz(ok);
  const b = nz(bad);
  if (!list.length || !a) return 0;
  const pts = list.reduce((s, st) => s + stepPoint(st), 0) / list.length;
  return Math.round(100 * pts * (a / (a + b)));
}
export function beatGrade(score, ok, bad) {
  if (!goodPass(ok, bad)) return 'boo';
  const g = Number(score) || 0;
  return g >= BEAT.great ? 'great' : g >= BEAT.good ? 'good' : 'boo';
}

/** 다음에 권할 도움 걷기 (아이 화면 말) */
export function nextHint(lv) {
  return ['', '다음엔 막대 없이 해 볼까요?', '다음엔 계이름 없이 해 볼까요?', '다음엔 건반 빛 없이 해 볼까요?', '악보만 보고 끝까지 쳤어요!'][lv] || '';
}

// ───────────────────── 저장 (profile.piano) ─────────────────────

/** 지역 날짜 "YYYY-MM-DD" */
export function dayKeyOf(now = Date.now()) {
  const d = new Date(now);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 연습 기록 한 줄 고쳐 읽기 — 깨졌으면 null */
function logRow(r) {
  if (!isObj(r)) return null;
  const at = Number(r.at);
  if (!(at > 0) || !['t', 'l', 'p'].includes(r.m)) return null;
  if (r.m === 'p' && !/^\d{1,4}$/.test(String(r.s))) return null; // 🎹 음악 포켓몬이 온 줄(v404) — s는 포켓몬 번호
  return {
    at, m: r.m, s: String(r.s || '').slice(0, 40), n: Number.isInteger(r.n) && r.n >= -1 && r.n < MAX_BARS ? r.n : -1,
    h: ['R', 'L', 'B'].includes(r.h) ? r.h : 'B', lv: LEVELS.includes(r.lv) ? r.lv : 1,
    sp: Math.round(Math.min(SPEED.max, Math.max(SPEED.min, Number(r.sp) || SPEED.def)) * 100) / 100,
    ok: nz(r.ok), bad: nz(r.bad), c: nz(r.c), x: r.x === 1 ? 1 : 0,
    // 🎹 치기 줄(v413) — g 박자 점수(0~100) · st 그 판의 가장 긴 화면 멈칫(ms · STALL.ms 넘은 것만) · x는 🎹 건반 칸을 셌나
    ...(r.m === 't' && Number.isInteger(r.g) && r.g >= 0 && r.g <= 100 ? { g: r.g } : {}),
    ...(r.m === 't' && nz(r.st) >= STALL.ms ? { st: Math.min(600000, nz(r.st)) } : {}),
    ...(r.m === 't' && nz(r.mu) >= MUTE.ms ? { mu: Math.min(600000, nz(r.mu)) } : {}), // v414 — 그 판의 가장 긴 소리 멎음(ms)
  };
}

/**
 * profile.piano 고쳐 읽기 (순수) → { days:{날:{paid, coins, notes, taps?}}, notes, mons, taps, tapMons, log:[…] }
 * days는 빈 날을 빼고 늦은 날 KEEP_DAYS개 · notes(모든 음표 칸)는 날 칸 합보다 작을 수 없다 ·
 * mons(받은 음악 포켓몬 수 · v404)는 다섯 칸 묶음 수보다 클 수 없다 — 묶음 수 − mons = 아직 안 온 몫
 * (v413) taps = 모든 🎹 건반 칸 · tapMons = 건반 칸 열 묶음으로 받은 음악 포켓몬 수 — ♪ 칸과 같은 꼴로 따로 · 날 칸 taps는 있을 때만(옛 날 칸 꼴 그대로)
 */
export function pianoOf(raw) {
  const src = isObj(raw) ? raw : {};
  const ds = isObj(src.days) ? src.days : {};
  const kept = Object.entries(ds).filter(([k, e]) => DAY_RE.test(k) && isObj(e))
    .map(([k, e]) => {
      const t = Math.min(TAPS_KEEP, nz(e.taps));
      const run = runOf(e.run);
      return [k, { paid: Math.min(PAID_KEEP, nz(e.paid)), coins: nz(e.coins), notes: Math.min(LISTEN_DAY, nz(e.notes)), ...(t ? { taps: t } : {}), ...(run ? { run } : {}), ...(e.won ? { won: 1 } : {}) }];
    })
    .filter(([, e]) => e.paid || e.coins || e.notes || e.taps || e.run || e.won)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, KEEP_DAYS);
  const days = Object.fromEntries(kept);
  const dayNotes = kept.reduce((a, [, e]) => a + e.notes, 0);
  const log = (Array.isArray(src.log) ? src.log : []).map(logRow).filter(Boolean).sort((a, b) => a.at - b.at).slice(-LOG_MAX);
  const notes = Math.max(nz(src.notes), dayNotes);
  const taps = Math.max(nz(src.taps), kept.reduce((a, [, e]) => a + nz(e.taps), 0));
  return { days, notes, mons: Math.min(nz(src.mons), Math.floor(notes / NOTES_PER_MON)), taps, tapMons: Math.min(nz(src.tapMons), Math.floor(taps / TAPS_PER_MON)), log };
}

/**
 * 🎹 연주 중(메뉴를 접은 때) 건반 높이 (v420 · 순수) — H = 그림판 높이 · keysH0 = 접기 전 비율의 건반 높이 · up0 = 접기 전 위쪽(악보·막대) 높이 ·
 * 위쪽은 접기 전 높이 그대로, 남는 높이는 건반 · 접기 전 비율보다 작지 않게 · 그림판의 60%까지 · up0을 모르면 keysH0
 */
export function playKeysH(H, keysH0, up0) {
  return up0 > 0 ? Math.round(Math.min(H * 0.6, Math.max(keysH0, H - up0))) : keysH0;
}

/** 그날 🎹 연달아 (v420) — { s: 곡, n: 1~TAPS_PER_MON } · 이상하면 null */
function runOf(r) {
  const n = isObj(r) ? Math.floor(Number(r.n)) : 0;
  const at = isObj(r) ? nz(r.at) : 0; // 마지막으로 센 때 (Codex 223차 P2-1 — 병합은 나중 기록)
  return isObj(r) && SONG_RE.test(String(r.s || '')) && n >= 1 && n <= TAPS_PER_MON ? { s: String(r.s), n, ...(at ? { at } : {}) } : null;
}
/**
 * 두 기록의 그날 연달아 중 나중에 센 쪽 (병합) — 횟수가 큰 쪽을 고르면 옛 백업이 이미 끊긴 연달아(다른 곡을 치기 전 아홉 번)를 되살렸다 (Codex 223차 P2-1) ·
 * 센 때가 같거나 없으면 더 간 쪽 · 그래도 같으면 앞
 */
const laterRun = (a, b) => {
  if (!a) return b || null;
  if (!b) return a;
  const ta = nz(a.at);
  const tb = nz(b.at);
  if (ta !== tb) return tb > ta ? b : a;
  return b.n > a.n ? b : a;
};

/** 깊은 복사 (xp·db fromStored) */
export function copyPiano(raw) {
  const p = pianoOf(raw);
  return { days: Object.fromEntries(Object.entries(p.days).map(([k, e]) => [k, { ...e }])), notes: p.notes, mons: p.mons, taps: p.taps, tapMons: p.tapMons, log: p.log.map((r) => ({ ...r })) }; // run은 pianoOf가 새로 만든다(runOf)
}

/**
 * 백업 병합 (순수) — 날마다 칸은 큰 쪽(옛 백업으로 그날 한도를 다시 열지 못하게) · 모든 음표 칸·받은 음악 포켓몬 수는 큰 쪽(줄지 않는다 —
 * 옛 백업으로 받은 수가 줄면 같은 묶음 몫이 한 번 더 왔다) · 🎹 건반 칸·그것으로 받은 수(v413)도 같은 꼴 ·
 * 연습 기록은 합집합(같은 때·같은 방법·같은 곡은 한 줄) · 둘 다 없으면 null
 */
export function mergePiano(a, b) {
  if (!isObj(a) && !isObj(b)) return null;
  const x = pianoOf(a);
  const y = pianoOf(b);
  const days = { ...x.days };
  for (const [k, e] of Object.entries(y.days)) {
    const o = days[k];
    const t = o ? Math.max(nz(o.taps), nz(e.taps)) : 0;
    const run = o ? laterRun(o.run, e.run) : null; // 🎹 연달아는 나중에 센 쪽 · 받은 날은 OR (v420 · Codex 223차 P2-1)
    days[k] = o ? { paid: Math.max(o.paid, e.paid), coins: Math.max(o.coins, e.coins), notes: Math.max(o.notes, e.notes), ...(t ? { taps: t } : {}), ...(run ? { run } : {}), ...(o.won || e.won ? { won: 1 } : {}) } : { ...e };
  }
  const seen = new Map();
  for (const r of [...x.log, ...y.log]) seen.set(`${r.at}:${r.m}:${r.s}`, r);
  return pianoOf({ days, notes: Math.max(x.notes, y.notes), mons: Math.max(x.mons, y.mons), taps: Math.max(x.taps, y.taps), tapMons: Math.max(x.tapMons, y.tapMons), log: [...seen.values()] });
}

/**
 * 음표 칸 — 지금 찬 칸(0~5) · 지금까지 찬 묶음 수 (순수)
 * mons(받은 음악 포켓몬 수 · v404)를 주면: 아직 안 온 몫이 있을 때만 가득(5) · 온 뒤엔 다시 0부터 차오른다
 * mons를 안 주면 v402처럼 다섯이 막 찼으면 5 · per = 한 묶음 칸 수(🎹 건반 칸은 TAPS_PER_MON · v413)
 */
export function slotsOf(notes, mons, per = NOTES_PER_MON) {
  const n = nz(notes);
  const sets = Math.floor(n / per);
  if (mons != null) return { filled: sets > nz(mons) ? per : n % per, sets };
  return { filled: n && n % per === 0 ? per : n % per, sets };
}

/**
 * 🎹 음악 포켓몬 하나 고르기 (순수 · v404) — 아직 안 만난 것(caught 0) 가운데 MON_WEIGHT대로 · 다 만났으면 모두 가운데 · 후보가 없으면 0
 * @param {Array<{id:number, r:number}>} pool 음악 포켓몬과 등급(1 흔함 ~ 4 전설 — xp가 저장된 프로필의 등급으로 만든다)
 * @param {object} caught profile.caught · @param {() => number} rng 0 이상 1 미만
 */
export function pickMusicMon(pool, caught, rng = Math.random) {
  const list = (Array.isArray(pool) ? pool : []).filter((m) => isObj(m) && Number.isInteger(m.id) && m.id > 0 && MON_WEIGHT[m.r]);
  const got = isObj(caught) ? caught : {};
  const fresh = list.filter((m) => !(Number(got[m.id]) > 0));
  const from = fresh.length ? fresh : list;
  const total = from.reduce((a, m) => a + MON_WEIGHT[m.r], 0);
  if (!total) return 0;
  let x = Math.min(Math.max(Number(rng()) || 0, 0), 1 - EPS) * total;
  for (const m of from) {
    x -= MON_WEIGHT[m.r];
    if (x < 0) return m.id;
  }
  return from[from.length - 1].id;
}

/**
 * 받을 차례가 된 음악 포켓몬을 준다 (순수 · 트랜잭션 안) — 다섯 칸 묶음 수가 받은 수(tr.mons)보다 크면 그만큼(한 번에 MONS_AT_ONCE까지) ·
 * 도감 칸(p.caught)에 하나씩 더하고 연습 기록에 'p' 줄 · 후보(pool)가 없으면 아무것도 안 준다(몫은 남는다)
 * → { got: 준 id 목록, firsts: 그때 처음 만났나(got과 같은 차례) } — 마지막 새 아이와 또 온 아이가 한꺼번에 와도 창 말이 맞게 (Codex 209차 P3)
 */
function giveMons(p, tr, pool, rng, now) {
  const got = [];
  const firsts = [];
  // ♪ 다섯 칸 묶음(mons) 몫 다음에 🎹 건반 열 칸 묶음(tapMons · v413) 몫 — 한 번에 모두 MONS_AT_ONCE까지
  for (const [k, n, per] of [['mons', 'notes', NOTES_PER_MON], ['tapMons', 'taps', TAPS_PER_MON]]) {
    while (tr[k] < Math.floor(tr[n] / per) && got.length < MONS_AT_ONCE) {
      const caught = isObj(p.caught) ? p.caught : {};
      const id = pickMusicMon(pool, caught, rng);
      if (!id) break;
      firsts.push(!(nz(caught[id]) > 0));
      p.caught = { ...caught, [id]: nz(caught[id]) + 1 };
      tr[k] += 1;
      got.push(id);
      pushLog(tr, { at: now, m: 'p', s: String(id) });
    }
  }
  return { got, firsts };
}

/** 오늘 칸 (순수) */
export function todayOf(p, now = Date.now()) {
  const tr = pianoOf(p && p.piano);
  return tr.days[dayKeyOf(now)] || { paid: 0, coins: 0, notes: 0 };
}

/** 요청 확인 — 곡·줄·손·단계·빠르기 */
function reqOk(r) {
  return isObj(r) && /^[a-z0-9_-]{1,40}$/i.test(String(r.song || '')) && Number.isInteger(r.line) && r.line >= -1 && r.line < MAX_BARS
    && ['R', 'L', 'B'].includes(r.hand) && LEVELS.includes(r.lv) && Number(r.sp) >= SPEED.min - EPS && Number(r.sp) <= SPEED.max + EPS;
}
function pushLog(tr, row) {
  tr.log = [...tr.log, logRow(row)].filter(Boolean).slice(-LOG_MAX);
}
/** 시계가 뒤로 갔나 — 남은 날이 모두 오늘보다 늦으면 (오늘 칸을 새로 만들어 한도를 다시 여는 길을 막는다) */
function clockBack(tr, today) {
  const ks = Object.keys(tr.days);
  return !own(tr.days, today) && ks.length > 0 && ks.every((k) => k > today);
}

/**
 * 🎹 태블릿으로 치기 한 판 끝 (순수 — xp.houseDo 안에서 저장된 프로필로) → { ok, coins, good, slot, taps, tapMons, got, firsts, why? }
 * req = { song, line(-1 곡 전체), hand, lv, sp, ok(맞게 누른 수), bad(틀리게 누른 수), g?(박자 점수 0~100 · v413), st?(가장 긴 화면 멈칫 ms · v413), mu?(가장 긴 소리 멎음 ms · v414) }
 * 잘 쳤고(goodPass) 오늘 TAP_DAY번 안이면 💰(coins·coinsEarned 함께) · 아니면 기록만(why 'try' | 'cap')
 * (v413) 🎹 건반 칸 — slot: 'ok'(셈) · 'try'(잘 치지 못함) · 'line'(한 줄 연습 — 「곡 전체」만 센다) · 'cap'(오늘 음악 포켓몬을 이미 받음) ·
 *   💰 한도와 따로 · (v420) 그날 한 곡을 연달아 — run { s, n }: 같은 곡이면 n+1 · 다른 곡을 잘 끝까지 치면 그 곡으로 1부터(restart) ·
 *   n이 TAPS_PER_MON이 되면 won · 모든 칸(tr.taps)·날 칸(taps)은 열 묶음째로 늘어 음악 포켓몬이 같은 트랜잭션에서 온다(pool · rng — got) ·
 *   못 친 판·한 줄 연습은 run을 건드리지 않는다
 */
export function tapRule(p, req, now, pool = [], rng = Math.random) {
  if (!reqOk(req) || !Number.isFinite(Number(req.ok)) || !Number.isFinite(Number(req.bad))) return { ok: false, why: 'bad' };
  const tr = pianoOf(p.piano);
  const today = dayKeyOf(now);
  if (clockBack(tr, today)) return { ok: false, why: 'clock' };
  const good = goodPass(req.ok, req.bad);
  const day = tr.days[today] || { paid: 0, coins: 0, notes: 0 };
  const next = { ...day };
  let coins = 0;
  let why = good ? '' : 'try';
  if (good && day.paid >= TAP_DAY) why = 'cap';
  if (good && !why) {
    coins = req.line < 0 ? COIN.all : COIN.line;
    next.paid = day.paid + 1;
    next.coins = day.coins + coins;
    p.coins = nz(p.coins) + coins;
    p.coinsEarned = nz(p.coinsEarned) + coins; // 낚시(fishing.catchRule)와 같이 — 번 💰는 함께 오른다
  }
  const slot = !good ? 'try' : req.line >= 0 ? 'line' : day.won ? 'cap' : 'ok';
  const restart = slot === 'ok' && !!day.run && day.run.s !== req.song;
  if (slot === 'ok') {
    const n = Math.min(TAPS_PER_MON, (day.run && day.run.s === req.song ? day.run.n : 0) + 1);
    next.run = { s: req.song, n, at: nz(now) };
    if (n >= TAPS_PER_MON) {
      // 열 번 연달아 — 열 칸 묶음 하나(옛 판 칸이 남아 있어도 묶음 하나만 더해 한 마리 · 날 칸 합이 모든 칸을 넘지 않게 날 칸도 열째로)
      next.won = 1;
      next.taps = nz(day.taps) + TAPS_PER_MON;
      tr.taps += TAPS_PER_MON;
    }
  }
  if (coins || slot === 'ok') tr.days[today] = next;
  const g = Number(req.g);
  pushLog(tr, { at: now, m: 't', s: req.song, n: req.line, h: req.hand, lv: req.lv, sp: req.sp, ok: req.ok, bad: req.bad, c: coins, x: slot === 'ok' ? 1 : 0,
    ...(Number.isInteger(g) ? { g } : {}), st: req.st, mu: req.mu });
  const { got, firsts } = giveMons(p, tr, pool, rng, now);
  p.piano = tr;
  const run = runOf(next.run || day.run);
  return { ok: true, coins, good, slot, run, won: !!(next.won || day.won), restart, taps: tr.taps, tapMons: tr.tapMons, got, firsts, ...(why ? { why } : {}) };
}

/**
 * 🎧 「다 쳤어요 ✋」 (순수) → { ok, counted, notes(모든 칸), mons(받은 수), got:[온 음악 포켓몬 id], why? }
 * 오늘 LISTEN_DAY칸 안이면 음표 한 칸 · 아니면 기록만(why 'cap') · 다섯 칸 묶음이 차면 음악 포켓몬이 온다(pool · rng — v404)
 */
export function listenRule(p, req, now, pool = [], rng = Math.random) {
  if (!reqOk(req)) return { ok: false, why: 'bad' };
  const tr = pianoOf(p.piano);
  const today = dayKeyOf(now);
  if (clockBack(tr, today)) return { ok: false, why: 'clock' };
  const day = tr.days[today] || { paid: 0, coins: 0, notes: 0 };
  const counted = day.notes < LISTEN_DAY;
  if (counted) {
    tr.days[today] = { ...day, notes: day.notes + 1 };
    tr.notes += 1;
  }
  pushLog(tr, { at: now, m: 'l', s: req.song, n: req.line, h: req.hand, lv: req.lv, sp: req.sp, ok: 0, bad: 0, c: 0, x: counted ? 1 : 0 });
  const { got, firsts } = giveMons(p, tr, pool, rng, now);
  p.piano = tr;
  return { ok: true, counted, notes: tr.notes, mons: tr.mons, got, firsts, ...(counted ? {} : { why: 'cap' }) };
}

/**
 * 🎹 밀린 음악 포켓몬 (순수 · v404) — 음악 화면에 들어올 때: v402·v403 때 찬 다섯 칸 몫 · 저장이 실패해 못 받은 몫 → { ok, got, mons, notes }
 * 칸을 세지 않고 몫만 준다 · 날짜와 상관없다(시계가 뒤로 가도 이미 찬 칸의 몫은 그대로)
 */
export function monsDueRule(p, now, pool = [], rng = Math.random) {
  const tr = pianoOf(p.piano);
  const { got, firsts } = giveMons(p, tr, pool, rng, now);
  if (got.length) p.piano = tr;
  return { ok: true, got, firsts, mons: tr.mons, notes: tr.notes };
}

// ───────────────────── 📤 ─────────────────────

/** 📤 usage 하루 한 줄 (순수) — 하루 칸(PIANO_DAILY)으로 · 한 것이 없으면 '' */
export function pianoDayLine(d) {
  const g = (k) => nz(d && d[k]);
  if (!g('pnTapN') && !g('pnListenN') && !g('pnMons') && !g('pnIntro') && !g('pnFreeN') && !g('pnFreeKeys') && !g('pnStallN')
    && !g('pnMuteN') && !g('pnSlowN') && !g('pnCancelN') && !g('pnListenAsk') && !g('pnPinBad')) return ''; // 밀린 포켓몬만 받은 날도 (Codex 209차 P3) · 안내만 본 날도 (v405) · 자유롭게 치기만 한 날도 (v408) · 멈칫만 있던 날도 (v413) · 소리 멎음·느린 장면·누름 끊김만 있던 날도 (v414) · 누르기만 하고 확인을 못 받은 날도 (v417)
  const parts = [];
  if (g('pnTapN')) {
    // (v413) 🎹 건반 칸 · 박자 판정 — 셈이 있을 때만 붙인다(옛 날 줄 꼴 그대로)
    const slot = g('pnTapSlots') ? ` · 🎹 건반 칸 ${g('pnTapSlots')}` : '';
    const beat = g('pnFan') || g('pnClap') || g('pnBoo') ? ` · 박자 🎉${g('pnFan')} 👏${g('pnClap')} 🎺${g('pnBoo')}` : '';
    parts.push(`🎹 태블릿 치기 끝까지 ${g('pnTapN')}판(잘 친 판 ${g('pnTapOk')} · 💰${g('pnCoins')}${slot}${beat})`);
  }
  // v417 — 누른 번이 있는 날은 「누름 · 어른 확인 · 비밀번호 틀림」 (옛 날은 옛 줄 그대로)
  if (g('pnListenAsk') || g('pnPinBad')) parts.push(`🎧 듣고 따라 치기 「다 쳤어요」 누름 ${g('pnListenAsk')}번 · 어른 확인 ${g('pnListenN')}번(음표 칸 ${g('pnNotes')}) · 비밀번호 틀림 ${g('pnPinBad')}번`);
  else if (g('pnListenN')) parts.push(`🎧 듣고 따라 치기 「다 쳤어요」 ${g('pnListenN')}번(음표 칸 ${g('pnNotes')})`);
  if (g('pnMons')) parts.push(`🐾 음악 포켓몬 ${g('pnMons')}마리 옴`);
  if (g('pnIntro')) parts.push(`🐾 음악 포켓몬 안내 창 ${g('pnIntro')}번 봄`);
  if (g('pnFreeN') || g('pnFreeKeys')) {
    const sec = g('pnFreeSec');
    parts.push(`🎹 자유롭게 치기 ${g('pnFreeN')}번 열고 ${sec < 60 ? '1분 안' : `${Math.round(sec / 60)}분`} · 건반 ${g('pnFreeKeys')}번`);
  }
  if (g('pnStallN')) parts.push(`⚠️ 연주 중 화면 멈칫 ${g('pnStallN')}번(${STALL.long / 1000}초 넘게 ${g('pnStallLong')}번)`); // v413
  // v414 — 멈춤이 소리 쪽인지 · 화면이 기어간 것인지 · 손가락을 가로챈 것인지
  if (g('pnMuteN')) parts.push(`🔇 연주 중 소리 멎음 ${g('pnMuteN')}번(${MUTE.long / 1000}초 넘게 ${g('pnMuteLong')}번 · 소리 장치 꺼짐 ${g('pnMuteOff')}번)`);
  if (g('pnSlowN')) parts.push(`🐢 연주 중 느린 장면 ${g('pnSlowN')}번(모두 ${(g('pnSlowMs') / 1000).toFixed(1)}초)`);
  if (g('pnCancelN')) parts.push(`✋ 건반 누름 끊김 ${g('pnCancelN')}번`);
  return parts.join(' · ');
}

/**
 * 📤 usage/music.md (순수) — 모든 음표 칸 · 최근 연습 기록 (새것부터)
 * @param {object} raw profile.piano · @param {string} today · @param {(id:string)=>string} nameOf 곡 id → 이름
 * @param {{at:number, ok:boolean, name?:string, note?:string, why?:string}|null} [midi] ⚙ 집 피아노 연결 확인 결과(이 기기)
 * @param {(id:number)=>string} [monName] 포켓몬 번호 → 이름 (🎹 음악 포켓몬이 온 줄 · v404)
 */
export function pianoMd(raw, today, nameOf = (s) => s, midi = null, monName = (id) => `#${id}`) {
  const tr = pianoOf(raw);
  if (!tr.log.length && !tr.notes && !tr.taps && !midi) return '';
  const midiLine = midi ? `🎹 집 피아노 연결 확인 (${dayKeyOf(midi.at)}): ${midi.ok ? `잡힘 — ${String(midi.name || '이름 없음').slice(0, 60)}${midi.note ? ` · 마지막에 누른 건반 ${String(midi.note).slice(0, 12)}` : ' · 건반 신호는 아직 못 받음'}` : `안 됨 — ${String(midi.why || '').slice(0, 80)}`}` : '';
  const sl = slotsOf(tr.notes);
  const tk = slotsOf(tr.taps, null, TAPS_PER_MON);
  // 🎹 연달아 (v420) — 늦은 날부터 일주일 · 「곡」 n/10 · 받은 날 🐾
  // 오늘부터 7일 안(쉰 날이 있어도 더 옛날은 안 씀 · Codex 223차 P3)
  const week = DAY_RE.test(String(today)) ? (() => { const d = new Date(`${today}T12:00:00`); d.setDate(d.getDate() - 6); return dayKeyOf(d.getTime()); })() : '';
  const runs = Object.entries(tr.days).filter(([k, e]) => e.run && (!week || (k >= week && k <= today))).map(([k, e]) => `${k.slice(5)} 「${nameOf(e.run.s)}」 ${e.run.n}/${TAPS_PER_MON}${e.won ? ' 🐾' : ''}`);
  const HAND = { R: '오른손', L: '왼손', B: '양손' };
  const hm = (t) => { const d = new Date(t); return `${dayKeyOf(t).slice(5)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const lines = [`🎹 음악 연습 기록 (${today}) — v402부터`, '', '## 읽는 법',
    `- 🎹 태블릿 치기 = 화면 건반으로 끝까지 친 판 · 맞게/틀리게 누른 수(맞는 건반을 기다리는 동안 다른 건반) · 맞게 누른 비율 70% 넘고 하루 ${TAP_DAY}번 안이면(곡 상관없이 · v406까지 3번) 💰(한 줄 5 · 곡 전체 15)`,
    '- 🎧 듣고 따라 치기 = 앱이 끝까지 연주한 뒤 진우가 「✋ 피아노로 다 쳤어요」(v404까지 「다 쳤어요 ✋」)를 누른 것 — 진짜로 쳤는지는 앱이 모른다(피아노 연결 전)(누른 때와 ⏳ 음악 시간으로 보기) · v417부터는 누른 뒤 아빠·엄마가 부모 비밀번호로 확인한 것만 이 줄에 남는다 · 하루 세 칸까지 음표 칸 · 다섯 칸마다 🐾 음악 포켓몬 한 마리가 옴(v404)',
    `- 🎹 건반 칸(v413) = 🎹 태블릿 치기로 「곡 전체」를 잘(맞게 70% 넘게) 끝까지 친 판 — 줄 끝 「🎹 칸」 · v420부터 **한 곡을 하루에 ${TAPS_PER_MON}번 연달아** 쳐야 🐾 음악 포켓몬 한 마리(다른 곡을 잘 끝까지 치면 처음부터 · 못 친 판·한 줄 연습은 안 셈·안 끊음 · 자정이면 처음부터 · 하루 한 마리 · 💰 한도와 따로 — 「🎹 연달아」 줄) · v419까지는 곡 섞기·날 넘김도 이어 열 칸마다`,
    `- 박자(v413) = 판 끝 판정 점수 — 음표마다 제때 눌렀나(막대가 닿기 전 ${BEAT.early}박 안 · 닿은 뒤 기다리게 한 게 ${BEAT.late}박 안이면 한 점 · ${BEAT.lateHalf}박 안이면 반 점) 평균 × 맞게 누른 비율 → 🎉 빵빠레 ${BEAT.great}점 이상 · 👏 짝짝 ${BEAT.good}점 이상 · 🎺 뿌우~ 그 아래(맞게 70% 아래도) — 아이 화면엔 점수 없이 소리·그림만 · 보상과 상관없음`,
    `- 멈칫(v413) = 그 판 동안 화면이 ${STALL.ms / 1000}초 넘게 멈춘 가장 긴 시간(태블릿이 버거워 멈춘 것 — 아이가 ⏸로 멈춘 것은 안 셈)`,
    `- 소리 멎음(v414) = 그 판 동안 화면은 도는데 소리 엔진 시계가 ${MUTE.ms / 1000}초 넘게 안 간 가장 긴 시간(앱이 소리를 끈 것이 아님 — 태블릿·브라우저 쪽)`,
    '- 줄 = 책의 한 줄(그 곡 원고의 lines) · 도움 1 막대·계이름·건반 빛 → 2 막대 없이 → 3 계이름도 없이 → 4 악보만 · 빠르기 = 원래 빠르기의 %',
    '', ...(midiLine ? [midiLine] : []), `음표 칸 모두 ${tr.notes} (다섯 칸 묶음 ${sl.sets} · 온 음악 포켓몬 ${tr.mons}${sl.sets > tr.mons ? ` · 아직 안 온 몫 ${sl.sets - tr.mons} — 음악 화면에 들어오면 옴` : ''})`,
    ...(tr.taps || tr.tapMons ? [`🎹 건반 칸 모두 ${tr.taps} (열 칸 묶음 ${tk.sets} · 온 음악 포켓몬 ${tr.tapMons}${tk.sets > tr.tapMons ? ` · 아직 안 온 몫 ${tk.sets - tr.tapMons} — 음악 화면에 들어오면 옴` : ''})`] : []),
    ...(runs.length ? [`🎹 연달아(v420 — 날마다 마지막 곡) ${runs.join(' · ')}`] : []),
    '', '## 최근 연습 (새것부터)'];
  for (const r of [...tr.log].reverse()) {
    if (r.m === 'p') { lines.push(`- ${hm(r.at)} 🐾 음악 포켓몬이 옴 — ${monName(Number(r.s))}`); continue; }
    const where = `${nameOf(r.s)} ${r.n < 0 ? '곡 전체' : `${r.n + 1}째 줄`}`;
    const head = `${hm(r.at)} ${r.m === 't' ? '🎹 치기' : '🎧 따라 치기'} · ${where} · ${HAND[r.h]} · 도움 ${r.lv} · ${Math.round(r.sp * 100)}%`;
    if (r.m === 't') {
      const all = r.ok + r.bad;
      const grade = r.g == null ? '' : ` · 박자 ${r.g}점 ${{ great: '🎉', good: '👏', boo: '🎺' }[beatGrade(r.g, r.ok, r.bad)]}`;
      lines.push(`- ${head} · 맞게 ${r.ok}/${all}${all ? ` (${Math.round((r.ok / all) * 100)}%)` : ''}${r.c ? ` · 💰${r.c}` : ''}${r.x ? ' · 🎹 칸' : ''}${grade}${r.st ? ` · 멈칫 ${(r.st / 1000).toFixed(1)}초` : ''}${r.mu ? ` · 소리 멎음 ${(r.mu / 1000).toFixed(1)}초` : ''}`);
    } else lines.push(`- ${head} · ${r.x ? '음표 한 칸' : '(오늘 칸은 다 참)'}`);
  }
  return `${lines.join('\n')}\n`;
}
