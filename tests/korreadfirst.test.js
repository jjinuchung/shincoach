// 📖 글 먼저 (v260, 2026-10-15 아버님 "이대로 진행") — 읽기 글은 글 끝의 [문제 보기]를 누르기 전에는 물음·보기를 숨긴다 ·
// 🎧 듣기 글은 그대로("다 들은 뒤") · 다시 읽는 글도 같다 · 시간 제한 없음 · 누른 때(문제 보기까지 초)는 📤 읽은 기록 q → 국어 요약
// + 🌳 수학 줄기 고르기·사다리에서 얼마나 했고·남았고·며칠 밀렸는지 쓰지 않기(아버님: 압박되고 쫓기는 기분)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readOf, readsOf, mergeReads, korFinishRule, dayNum } from '../js/korean.js';
import { emptyProfile, cloneProfile } from '../js/db.js';
import { readLines } from '../js/korreport.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/korean/reading.json'));
const IDS = DATA.cards.map((c) => c.id);
const T0 = new Date(2026, 9, 15, 12, 0, 0).getTime();
const D0 = dayNum(T0);
const pf = () => cloneProfile({ ...emptyProfile() });
const body = (src, head) => src.slice(src.indexOf(head), src.indexOf('\n}\n', src.indexOf(head)));

test('📖 읽은 기록 q(문제 보기까지 초): readLog는 [문제 보기]를 눌렀을 때만 · 🎧는 없음 · readOf는 수만 받고 읽은 초를 넘지 않게 · 옛 줄은 그대로 · 병합에도 남음', async () => {
  const { readLog, readFirst } = await import('../js/koreanview.js');
  const card = { qs: [{ opts: [1, 2, 3, 4] }, { opts: [1, 2, 3, 4] }] };
  const st = { wrong: [], evFirst: false, hint2: false };
  const r = { card, qs: [st, st], t0: 5000, sec: 90, firstSec: 40, askAt: 35, ls: null };
  assert.deepEqual(readLog(r), { t: 5000, s: 90, a: 40, n: 2, f: 2, x: 0, e: 0, h: 0, m: '', q: 35 });
  assert.ok(!('q' in readLog({ ...r, askAt: -1 })), '안 눌렀으면 q 없음');
  assert.ok(!('q' in readLog({ ...r, askAt: -1, ls: { text: false } })), '🎧 들음은 q 없음');
  // 글 먼저는 읽기 글에서 [문제 보기]를 누르기 전까지만
  assert.equal(readFirst({ ...r, askAt: -1 }), true);
  assert.equal(readFirst({ ...r, askAt: 0 }), false, '0초에 눌러도 누른 것');
  assert.equal(readFirst({ ...r, askAt: -1, ls: { text: true } }), false, '🎧 글로 읽기는 들은 뒤 규칙');
  assert.equal(readFirst(null), false);
  // readOf — q는 0 이상 수만 · 읽은 초 s를 넘지 않게 · 없으면 키도 없다
  const base = { c: 'K42', t: T0, d: D0, s: 60, a: 50, n: 4, f: 2, x: 0, e: 0, h: 0, g: 1, m: '' };
  assert.equal(readOf({ ...base, q: 20 }).q, 20);
  assert.equal(readOf({ ...base, q: 999 }).q, 60, '읽은 초를 넘지 않게');
  assert.equal(readOf({ ...base, q: 20.7 }).q, 20);
  for (const bad of [-1, '20', null, NaN, undefined]) assert.ok(!('q' in readOf({ ...base, q: bad })), `q ${String(bad)}`);
  assert.deepEqual(Object.keys(readOf(base)), ['c', 't', 'd', 's', 'a', 'n', 'f', 'x', 'e', 'h', 'g', 'm'], '옛 줄(v258·v259)은 꼴 그대로');
  assert.equal(mergeReads([readOf({ ...base, q: 20 })], []).at(-1).q, 20);
  assert.equal(readsOf([{ ...base, q: 20 }, { ...base, q: 20 }]).length, 1);
  // Codex 71차 #2: 옛 앱을 거쳐 q가 지워진 사본과 합쳐도 q가 남는다 — 두 차례 모두 · 여러 번 합쳐도
  const withQ = readOf({ ...base, q: 20 });
  const noQ = readOf(base);
  assert.deepEqual(mergeReads([withQ], [noQ]), [withQ]);
  assert.deepEqual(mergeReads([noQ], [withQ]), [withQ]);
  assert.deepEqual(mergeReads(mergeReads([noQ], [withQ]), [noQ, noQ]), [withQ]);
  // 나머지가 다르면 q와 상관없이 늘 같은 쪽(차례와 상관없이) — 큰 쪽 기록
  const more = readOf({ ...base, s: 80 });
  assert.deepEqual(mergeReads([withQ], [more]), mergeReads([more], [withQ]));
  assert.equal(mergeReads([withQ], [more]).length, 1);
  // 다 읽을 때 그대로 적힘
  const p = pf();
  korFinishRule(p, 'K42', T0, {}, IDS, 0, { read: { t: T0, s: 60, a: 50, n: 4, f: 2, x: 0, e: 0, h: 0, m: '', q: 20 } });
  assert.equal(p.korReads.at(-1).q, 20);
});

test('📖 국어 요약: 머리말에 "문제 보기까지" 뜻 · 모은 줄에 평균(누른 줄만, 몇 번) · 줄마다 "문제 보기까지 N초 · 첫 답까지 M초" · 옛 줄·🎧는 첫 답까지만', () => {
  const row = (o) => ({ c: 'K42', t: T0, d: D0, s: 90, a: 50, n: 4, f: 2, x: 0, e: 0, h: 0, g: 1, m: '', ...o });
  const L = readLines([row({ q: 30 }), row({ t: T0 + 1, q: 50 }), row({ t: T0 + 2, c: 'K36', m: 'listen' })], DATA.cards, '2026-10-15');
  assert.match(L[1], /문제 보기까지 = 글을 연 뒤 📖 \[문제 보기\]를 누를 때까지\(v260부터, 🎧 빼고\)/);
  assert.match(L[1], /시간은 화면이 보이고 2분 안에 손을 댄 동안만 셈 — 오래 조용히 읽은 시간은 일부 빠질 수 있음/, 'Codex 71차 #3 — 쉼 규칙을 그대로 말한다');
  assert.match(L[2], /📖 문제 보기까지 평균 40초\(2번\)/);
  const lines = L.slice(3);
  assert.equal(lines.filter((x) => x.includes('(문제 보기까지 30초 · 첫 답까지 50초)')).length, 1);
  assert.equal(lines.filter((x) => x.includes('(문제 보기까지 50초 · 첫 답까지 50초)')).length, 1);
  assert.ok(lines.some((x) => x.includes('K36') && x.includes('(첫 답까지 50초)') && !x.includes('문제 보기까지')), '🎧 줄은 첫 답까지만');
  const old = readLines([row({})], DATA.cards, '2026-10-15');
  assert.ok(!old[2].includes('문제 보기까지 평균'), '누른 줄이 없으면 평균 말도 없다');
});

test('📖 화면 배선: 글을 열면 물음을 숨김(askAt -1) · 글 상자 맨 끝에 [문제 보기] · 누르면 그때 읽은 초를 적고 단추만 거둔 뒤 첫 물음 · 🎧 기다림 다음에 글 먼저 · 기록에 q · css · sw', async () => {
  const src = read('js/koreanview.js');
  assert.ok(body(src, 'function openCard(id) {').includes('askAt: -1,'), '열 때마다 다시 숨김(다시 읽기도)');
  const rr = body(src, 'function renderRead() {');
  assert.ok(rr.includes('if (readFirst(r)) p.appendChild(askGoEl(r.card));'), '글 상자 맨 끝(낱말·작품 정보 뒤)');
  assert.ok(rr.indexOf('p.appendChild(askGoEl(r.card))') > rr.indexOf('const p = passageEl(r.card);'));
  assert.ok(body(src, 'export function readFirst(r) {').includes('return !!r && !r.ls && !(r.askAt >= 0);'));
  const sa = body(src, 'function showAsks() {');
  assert.ok(sa.includes('if (!readFirst(r)) return;') && sa.includes('r.askAt = r.sec;') && sa.indexOf('r.askAt = r.sec;') < sa.indexOf('renderQ();') && sa.includes("document.querySelector('#korean-main .kor-askgo')") && sa.includes('bringQ();'));
  assert.ok(!sa.includes('renderRead()'), '글 상자는 다시 그리지 않는다(읽던 자리)');
  const rq = body(src, 'function renderQ() {');
  const listenGate = rq.indexOf('if (r.ls && !r.ls.heard && !r.ls.text) {');
  const readGate = rq.indexOf('if (readFirst(r)) {');
  assert.ok(listenGate > 0 && readGate > listenGate && readGate < rq.indexOf('const q = r.card.qs[r.qi];'), '물음을 그리기 전에 막는다');
  assert.ok(rq.includes('📖 글을 끝까지 읽고, 글 상자 맨 아래 [문제 보기]를 눌러요 — 물음 ${r.card.qs.length}개'), '가로 화면은 글 상자 안을 굴려 맨 아래 (Codex 71차 #3)');
  const { IDLE_SEC } = await import('../js/timelimit.js');
  assert.equal(IDLE_SEC, 120, '요약 머리말의 "2분"과 같다');
  assert.ok(src.includes('`📝 문제 보기 (물음 ${card.qs.length}개)`'));
  assert.ok(body(src, 'export function readLog(r) {').includes('...(r.askAt >= 0 ? { q: r.askAt } : {}),'));
  assert.ok(!/setTimeout|setInterval/.test(body(src, 'function askGoEl(card) {') + sa), '일부러 기다리게 하지 않는다');
  const css = read('css/style.css');
  for (const c of ['.kor-askgo {', '.kor-askgo-note {']) assert.ok(css.includes(c), c);
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 260, 'sw는 v260 이상');
});

test('🌳 수학: 줄기 고르기·사다리 머리에 얼마나 했고·남았고·며칠 밀렸는지 쓰지 않는다 (차례·단추는 그대로 · ⏰ 보너스는 받을 수 있을 때만 말함)', () => {
  const src = read('js/math.js');
  const pk = body(src, 'function renderStemPicker(state) {');
  assert.ok(pk.includes("started ? '하던 줄기 — 이어서 해요'"));
  assert.ok(pk.includes('for (const key of stemPickOrder(state, today))'), '밀린 줄기를 위로 놓는 차례는 그대로(말은 없이)');
  const ld = src.slice(src.indexOf('function renderLadder(state) {'), src.indexOf('// 💎 스페셜 문제', src.indexOf('function renderLadder(state) {')));
  assert.ok(ld.includes("head.appendChild(el('h2', '', '🪜 개념 사다리'));"));
  assert.ok(ld.includes("'🔁 오늘 다시 확인하기 — 정말 아는지 볼까?'") && ld.includes("'🤔 틀렸던 유형 다시 풀기 — 이번엔 맞혀서 지워요'") && ld.includes("'🤔 오늘 틀린 유형은 내일부터 다시 풀 수 있어요.'"));
  for (const s of [pk, ld]) assert.ok(!/개를 알아요|개념 \$\{|일 지남|일 지난|기다려요|\$\{due\.length\}개|\$\{notesDue\.length\}개|\$\{nc\.all\}개/.test(s), '셈·밀린 날 말이 없다');
  // Codex 71차 #1 — 사다리 칸·도우미 단추 글까지: 📚 그림 배움 단추 · 칸마다 🤔 다시 볼 유형 · 🔁 아빠 답장 문제 (👑까지 N번은 상을 향한 진행이라 그대로 — 아버님)
  const bb = body(src, 'function bridgeBtn(state, key, label) {');
  assert.ok(bb.includes('`📚 ${label} — ${st.code} ${st.label}`') && !/칸\)|\$\{done\}/.test(bb), '📚 단추에 몇 칸 했는지 없음');
  const rungs = src.slice(src.indexOf("const li = el('li', `math-rung ${r.state}"), src.indexOf('list.appendChild(li);', src.indexOf("const li = el('li', `math-rung ${r.state}")));
  assert.ok(rungs.includes("${r.notes ? ' · 🤔 다시 볼 유형 있어요' : ''}") && !rungs.includes('다시 볼 유형 ${'), '칸마다 다시 볼 유형은 있다는 것만');
  assert.ok(src.includes('`🔁 아빠 답장 문제 풀어보기 — 맞히면 ⚡${ASK_REWARD.xp}`') && !src.includes('아빠 답장 문제 풀어보기 ${'), '아빠 답장 문제 수 없음');
  assert.ok(read('js/mathprog.js').includes('(👑까지 ${r.left}번)'), '👑까지는 그대로(상 진행 — 아버님 결정)');
  assert.ok(!/math-stem-due|math-due-sum/.test(read('css/style.css') + src), '쓰지 않는 꾸밈도 지움');
});
