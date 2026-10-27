// 🎬 영상 문장 문제 v350 (2026-10-27 — 원고 두 번 검수 「이대로」 · 쪽지 안 자리 ① 고르기 하나를 영상 문장 문제로)
//  규칙: checkVideoQ(원고 한 줄) · videoRows · normSay · pickVideoQ(배운 단원 · 방금 → 전에 · 쉬는 문제 · 영상 이름) · 낸 기록(videoSeenOf·merge·쉬는 날) ·
//  dealNote 고르기 수 · dealVideo · grammarRule이 낸 기록을 적는다 · 📤 🎬 줄 · 받기(syncVideoQs — 10분 · 빈 목록이면 받아 둔 것 그대로 · 시간 넘음)
//  쪽지(작은 가짜 DOM): 둘째 자리에 끼운다 · 🎬 머리·🔊 · 영상 문제를 틀려도 ⭐는 단원 문제로만 · ⚡💰 계단엔 들어감 · 같은 날 같은 문제는 쉰다
//  ★ 진우가 본 영상 대사는 공개 저장소에 두지 않는다 — 여기 문장은 모두 지어낸 것 (진짜 원고는 비공개 grammar/video.json)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { emptyProfile } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile } from '../js/xp.js';
import { SOLVED, STAR_COINS, allUnits, checkVideoQ, dealNote, dealVideo, NOTE_SHAPE, VIDEO_REST, videoSeenOf, mergeVideoSeen, videoResting, grammarRule, grammarMd } from '../js/grammar.js';
import { normSay, videoRows, pickVideoQ, syncVideoQs, videoList, VIDEO_PATH, VIDEO_MAX_ROWS, SYNC_MS } from '../js/grammarvideo.js';
import { PRIVATE_GRAMMAR_VIDEO, readSummary } from '../js/upload.js';
import { dayNum } from '../js/korean.js';

const RAW = JSON.parse(readFileSync(new URL('../coach/english/grammar.json', import.meta.url), 'utf8'));
const TYPES = RAW.types;
const UNITS = allUnits(RAW);
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const tick = () => new Promise((r) => setTimeout(r, 0));
const settle = async () => { for (let i = 0; i < 20; i++) await tick(); };
const NOW = Date.now();
const D0 = dayNum(NOW);

// 이 기기 저장소 (grammarvideo.js가 받아 둔 원고를 둔다)
const LS = new Map();
globalThis.localStorage = { getItem: (k) => (LS.has(k) ? LS.get(k) : null), setItem: (k, v) => { LS.set(k, String(v)); }, removeItem: (k) => { LS.delete(k); } };

// ── 지어낸 원고 세 줄 (꼴은 진짜 원고와 같다) ──
const OK = (t) => ({ t, ok: true });
const P = (t, type, why) => ({ t, type, why });
const VR = () => [
  { id: 'V901', unit: 'G1', from: '시험 영상', say: 'Pikachu is very fast!', kind: 'pick', en: 'Pikachu ___ very fast!', ko: '피카츄는 아주 빨라!',
    opts: [OK('is'), P('are', 'bepick', '피카츄는 한 마리라 is예요.'), P('am', 'bepick', 'am은 I(나)하고만 써요.')] },
  { id: 'V902', unit: 'G1', from: '시험 영상', say: 'We are ready now.', kind: 'type', en: 'We ___ ready now.', ko: '우린 이제 준비됐어.', hint: 'am · is · are', ans: ['are'],
    traps: { is: ['bepick', 'we(우리)는 여럿이라 are예요.'] }, why: 'we(우리)는 여럿이라 are예요.' },
  { id: 'V903', unit: 'G2', from: '다른 영상', say: 'Is it your ball?', kind: 'pick', ask: '우리말에 맞는 문장을 고르세요.', ko: '그거 네 공이야?',
    opts: [OK('Is it your ball?'), P('It is your ball.', 'order', '물을 때는 Is가 맨 앞으로 가요.'), P('Are it your ball?', 'bepick', 'it은 하나라 Is예요.')] },
];

// ───────────────────── 규칙 ─────────────────────

test('🎬 checkVideoQ: 지어낸 세 줄은 통과 · 빈칸+정답 ≠ say · 「우리말에 맞는 문장」 정답 ≠ say · 번호·단원·kind·talk·say·from', () => {
  for (const q of VR()) assert.deepEqual(checkVideoQ(q, TYPES), [], q.id);
  const bad = (patch, base = 0) => checkVideoQ({ ...VR()[base], ...patch }, TYPES);
  assert.ok(bad({ en: 'Pikachu ___ so fast!' }).some((m) => m.includes('say와 달라요')), '빈칸에 정답을 넣으면 say');
  assert.ok(bad({ en: 'We ___ ready.' }, 1).some((m) => m.includes('say와 달라요')), '쳐 넣기도 ans[0]으로');
  assert.ok(bad({ say: 'Is it my ball?' }, 2).some((m) => m.includes('우리말에 맞는 문장')), '우리말에 맞는 문장 — 정답 = say');
  assert.ok(bad({ id: 'X901' }).length && bad({ id: 'V9' }).length, '번호 V숫자 셋 이상');
  assert.ok(bad({ unit: '1' }).length && bad({ kind: 'order' }).length && bad({ say: '' }).length && bad({ from: ' ' }).length);
  assert.ok(bad({ talk: ['A: ___'], en: undefined }).length, '영상 문제에 talk는 없다');
  assert.ok(bad({ opts: [OK('is'), P('are', 'nosuch', '왜')] }).length, '모르는 오개념 · 보기 수');
  assert.deepEqual(checkVideoQ(null, TYPES), ['줄이 객체가 아님']);
});

test('🎬 normSay·videoRows: 소문자·둥근 따옴표·문장부호 무시 · 깨진 줄·같은 번호·같은 (대사, 영상)은 빠진다 · 상한', () => {
  assert.equal(normSay('  We’re   READY—now!! '), "we're ready now");
  assert.equal(normSay('"Wait..." he said.'), 'wait he said');
  const list = [...VR(), { ...VR()[0], id: 'V904' }, { ...VR()[0], id: 'V901', from: '셋째 영상' }, { ...VR()[0], id: 'V905', from: '셋째 영상' }, { id: 'V906' }, null];
  const got = videoRows(list, TYPES);
  assert.deepEqual(got.rows.map((q) => q.id), ['V901', 'V902', 'V903', 'V905'], '같은 대사라도 다른 영상이면 따로');
  assert.equal(got.bad, 4, '같은 (대사, 영상) · 같은 번호 · 깨진 줄 · null');
  const odd = videoRows([{ ...VR()[0], id: 'V907', en: 123 }, { ...VR()[1], id: 'V908', ans: 'are' }, ...VR()], TYPES);
  assert.deepEqual([odd.rows.length, odd.bad], [3, 2], '꼴이 아주 깨진 줄(en이 글이 아님 · ans가 목록이 아님)도 던지지 않고 그 줄만 뺀다 (🔍 Codex 154차)');
  const many = Array.from({ length: VIDEO_MAX_ROWS + 3 }, (_, i) => ({ ...VR()[0], id: `V${1000 + i}`, from: `영상${i}` }));
  const cap = videoRows(many, TYPES);
  assert.deepEqual([cap.rows.length, cap.bad], [VIDEO_MAX_ROWS, 3]);
});

test('🎬 pickVideoQ: 배운 단원만 · 방금(지금 영상) 먼저 — 차례대로 · 없으면 전에(안 낸 문제 먼저 → 최근에 말한 것) · 영상 이름까지 맞아야 · 쉬는 문제는 건너뜀', () => {
  const rows = VR();
  const cue = { start: 3 };
  const base = { rows, learned: ['G1', 'G2'], seen: {}, today: D0 };
  const a = pickVideoQ({ ...base, now: [{ en: 'nothing here', title: '시험 영상' }, { en: 'we are READY now', title: '시험 영상', cue }, { en: 'Pikachu is very fast!', title: '시험 영상' }] });
  assert.deepEqual([a.q.id, a.tier, a.title, a.cue], ['V902', 'now', '시험 영상', cue], '방금 끝낸 차례(최근 것부터)로 · 글자는 normSay로');
  assert.equal(pickVideoQ({ ...base, learned: ['G2'], now: [{ en: 'We are ready now.', title: '시험 영상' }] }), null, '안 배운 단원은 안 낸다');
  assert.equal(pickVideoQ({ ...base, now: [{ en: 'We are ready now.', title: '다른 영상' }] }), null, '영상 이름이 다르면 다른 대사로 본다');
  const before = [{ en: 'Pikachu is very fast!', title: '시험 영상', at: 100 }, { en: 'Is it your ball?', title: '다른 영상', at: 5 }];
  const b = pickVideoQ({ ...base, now: [], before, seen: { V901: { d: D0 - VIDEO_REST.ok, w: 0 } } });
  assert.deepEqual([b.q.id, b.tier, b.title, b.cue], ['V903', 'before', '다른 영상', null], '안 낸 문제 먼저');
  const c = pickVideoQ({ ...base, now: [], before });
  assert.equal(c.q.id, 'V901', '둘 다 안 냈으면 최근에 말한 것');
  assert.equal(pickVideoQ({ ...base, now: [{ en: 'Pikachu is very fast!', title: '시험 영상' }], before: [], seen: { V901: { d: D0 - VIDEO_REST.ok + 1, w: 0 } } }), null, '맞힌 문제는 14일 쉰다');
  assert.equal(pickVideoQ({ ...base, now: [{ en: 'Pikachu is very fast!', title: '시험 영상' }], seen: { V901: { d: D0 - VIDEO_REST.miss + 1, w: 1 } } }), null, '틀린 문제는 2일 쉰다');
  assert.equal(pickVideoQ({ ...base, now: [{ en: 'Pikachu is very fast!', title: '시험 영상' }], seen: { V901: { d: D0 - VIDEO_REST.miss, w: 1 } } }).q.id, 'V901', '틀린 문제는 2일 뒤 다시');
  assert.equal(pickVideoQ({ ...base, rows: [] }), null);
  assert.equal(pickVideoQ({ ...base, now: null, before: undefined }), null, '깨진 입력');
});

test('🎬 낸 기록: 꼴 다듬기(번호 V숫자 · 날 양수) · 병합은 늦은 날 · 같은 날이면 틀림 · 쉬는 날', () => {
  assert.deepEqual(videoSeenOf({ V001: { d: 5, w: 1 }, V002: { d: 6, w: 0 }, X1: { d: 9 }, V003: { d: -1 }, V004: 3, V005: { d: 7, w: 'yes' } }), { V001: { d: 5, w: 1 }, V002: { d: 6, w: 0 }, V005: { d: 7, w: 1 } });
  assert.deepEqual(videoSeenOf(null), {});
  assert.deepEqual(mergeVideoSeen({ V001: { d: 5, w: 1 }, V002: { d: 9, w: 0 } }, { V001: { d: 7, w: 0 }, V002: { d: 9, w: 1 }, V003: { d: 2, w: 0 } }),
    { V001: { d: 7, w: 0 }, V002: { d: 9, w: 1 }, V003: { d: 2, w: 0 } });
  assert.equal(videoResting({ V001: { d: 10, w: 0 } }, 'V001', 10 + VIDEO_REST.ok - 1), true);
  assert.equal(videoResting({ V001: { d: 10, w: 0 } }, 'V001', 10 + VIDEO_REST.ok), false);
  assert.equal(videoResting({}, 'V001', 10), false);
  assert.deepEqual(VIDEO_REST, { ok: 14, miss: 2 });
});

test('🎬 dealNote 고르기 수 · dealVideo: 고르기 1 + 꼬리 하나 · 기본은 그대로 · 수는 0~NOTE_SHAPE.pick 안 · 영상 칸은 i -1 · 보기를 섞는다', () => {
  const u = UNITS[0];
  const rng = () => 0.3;
  assert.equal(dealNote(u, 0, rng).length, NOTE_SHAPE.pick + NOTE_SHAPE.tail, '기본은 v349 그대로');
  const one = dealNote(u, 0, rng, 1);
  assert.deepEqual(one.map((d) => d.kind === 'pick'), [true, false], '고르기 1 + 꼬리');
  assert.equal(dealNote(u, 0, rng, 0).filter((d) => d.kind === 'pick').length, 0);
  assert.equal(dealNote(u, 0, rng, 9).filter((d) => d.kind === 'pick').length, NOTE_SHAPE.pick, '많아도 상한');
  const q = VR()[0];
  const d = dealVideo(q, { tier: 'now', title: '시험 영상', cue: { start: 1 } }, () => 0);
  assert.deepEqual([d.i, d.kind, d.v.id, d.tier, d.title, d.cue.start, [...d.opts].sort().join()], [-1, 'pick', 'V901', 'now', '시험 영상', 1, '0,1,2']);
  assert.notDeepEqual(d.opts, [0, 1, 2], '보기 차례를 섞는다 (정답이 늘 같은 자리에 있지 않게)');
  const t = dealVideo(VR()[1], { tier: 'x' });
  assert.deepEqual([t.kind, t.tier, t.opts, t.cue], ['type', 'before', undefined, null], '모르는 tier는 전에 · 쳐 넣기는 보기 없음');
});

test('🎬 grammarRule: 낸 영상 문제를 적는다(낸 날 · 틀렸나) · 번호 꼴이 아니면 안 적는다 · 본 문제는 단원 문제만 · 📤 🎬 줄은 번호만', () => {
  const p = { grammar: {}, grammarSeen: {}, grammarMiss: {}, grammarDay: {} };
  const ids = UNITS.map((u) => u.id);
  const r = grammarRule(p, { id: 'G1', ok: true, from: 0, qs: [0, 8], miss: { bepick: 1 }, video: { id: 'V902', w: true } }, NOW, ids, { rng: () => 0.9 });
  assert.equal(r.solved, true, '⭐는 ans.ok(단원 문제)로');
  assert.deepEqual(p.grammarVideo, { V902: { d: D0, w: 1 } });
  assert.equal(p.grammarSeen.G1, 1 | (1 << 8), '본 문제는 넘긴 단원 문제만');
  assert.equal(p.grammarMiss.bepick, 1, '영상 문제 오개념도 센다');
  grammarRule(p, { id: 'G1', ok: false, qs: [1], video: { id: 'V901', w: false } }, NOW, ids, { rng: () => 0.9 });
  assert.deepEqual(p.grammarVideo, { V902: { d: D0, w: 1 }, V901: { d: D0, w: 0 } });
  grammarRule(p, { id: 'G1', ok: false, qs: [1], video: { id: 'V902', w: false } }, NOW, ids, { rng: () => 0.9 });
  assert.deepEqual(p.grammarVideo.V902, { d: D0, w: 1 }, '같은 날 다른 창이 맞힘으로 저장해도 틀림이 남는다 (🔍 Codex 154차)');
  grammarRule(p, { id: 'G1', ok: false, qs: [1], video: { id: 'V902', w: false } }, NOW + 86400000, ids, { rng: () => 0.9 });
  assert.deepEqual(p.grammarVideo.V902, { d: D0 + 1, w: 0 }, '다음 날 맞히면 맞힘');
  delete p.grammarVideo.V902;
  p.grammarVideo.V902 = { d: D0, w: 1 };
  grammarRule(p, { id: 'G1', ok: false, qs: [2], video: { id: 'nope', w: true } }, NOW, ids, { rng: () => 0.9 });
  grammarRule(p, { id: 'G1', ok: false, qs: [2], video: 'V903' }, NOW, ids, { rng: () => 0.9 });
  assert.deepEqual(Object.keys(p.grammarVideo).sort(), ['V901', 'V902'], '깨진 video는 안 적는다');
  const md = grammarMd({ units: UNITS, types: TYPES, profile: p, today: '2026-10-27', now: NOW });
  assert.ok(md.includes('## 🎬 영상 문장 문제') && md.includes('- 낸 문제 2 · 최근 7일 2 · 마지막에 틀린 문제 1 (V902)'), md);
  assert.ok(grammarMd({ units: UNITS, types: TYPES, profile: {}, today: '2026-10-27', now: NOW }).includes('(아직 없음 — 📤 열쇠가 있고'), '없으면 왜 없는지');
});

test('🎬 받기(syncVideoQs): 받아 두고 빠진 줄을 적는다 · 10분 안엔 다시 안 받음 · 빈 목록(열쇠·파일·인터넷 없음)이면 받아 둔 것 그대로 · 시간 넘으면 그대로 · 상한', async () => {
  LS.clear();
  let reads = 0;
  const checks = [];
  let clock = 1000;
  const deps = (list, extra = {}) => ({ now: () => clock, readList: async (p) => { reads++; assert.equal(p, VIDEO_PATH); return list; }, types: async () => TYPES, noteCheck: async (c) => { checks.push(c); }, ...extra });
  assert.equal(await syncVideoQs(false, deps([...VR(), { id: 'broken' }])), 4);
  assert.deepEqual([reads, videoList().length, checks.at(-1)], [1, 4, { rows: 4, bad: 1 }], '받아 둔 줄 · 빠진 줄 1');
  clock += SYNC_MS - 1;
  assert.equal(await syncVideoQs(false, deps([])), 4);
  assert.equal(reads, 1, '10분 안엔 안 받는다');
  clock += 1;
  assert.equal(await syncVideoQs(false, deps([])), 4, '빈 목록이면 받아 둔 것 그대로');
  assert.equal(reads, 2);
  assert.equal(await syncVideoQs(true, deps(VR().slice(0, 1))), 1, 'force — 새 목록으로 바꾼다');
  assert.equal(videoList()[0].id, 'V901');
  assert.equal(await syncVideoQs(true, deps(null, { readList: () => new Promise(() => {}), listMs: 20 })), 1, '멈춘 받기는 끊고 그대로');
  const many = Array.from({ length: VIDEO_MAX_ROWS + 2 }, (_, i) => ({ ...VR()[0], id: `V${1000 + i}`, from: `영상${i}` }));
  assert.equal(await syncVideoQs(true, deps(many)), VIDEO_MAX_ROWS);
  assert.deepEqual(checks.at(-1), { rows: VIDEO_MAX_ROWS + 2, bad: 2 }, '넘친 줄도 빠진 줄로');
  // 오개념 목록 받기가 멈춰도 받기는 끝난다 (다음 받기가 묶이지 않게 — 🔍 Codex 154차)
  const before = reads;
  assert.equal(await syncVideoQs(true, deps(VR(), { types: () => new Promise(() => {}), typesMs: 20 })), 3);
  assert.equal(await syncVideoQs(true, deps(VR())), 3, '다음 받기가 바로 돈다');
  assert.equal(reads, before + 2);
  // 이 기기 저장 공간이 차서 못 두면 받아 둔 것 그대로 · 📥 ⚠️ (✅로 보이지 않게 — 🔍 Codex 154차)
  const setItem = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = (k, v) => { if (k === 'shincoach.grammarVideo') throw new Error('QuotaExceededError'); LS.set(k, String(v)); };
  try {
    assert.equal(await syncVideoQs(true, deps(VR().slice(0, 2))), 3, '받아 둔 3줄 그대로');
    assert.deepEqual(checks.at(-1), { rows: 2, bad: 2 }, '받은 줄 모두 받지 않은 문제로');
  } finally { globalThis.localStorage.setItem = setItem; }
  LS.set('shincoach.grammarVideo', '{깨짐');
  assert.deepEqual(videoList(), [], '깨진 저장은 빈 목록');
});

test('🎬 배선: 경로는 비공개 저장소 한 곳(📥 받기 줄 이름) · sw · 공개 저장소에 원고 파일 없음 · 쪽지·player 연결', () => {
  assert.equal(VIDEO_PATH, PRIVATE_GRAMMAR_VIDEO);
  assert.ok(readSummary({ [VIDEO_PATH]: { at: 0, ok: true, n: 3, check: { rows: 4, bad: 1 } } }, () => '시각').includes('🎬 영상 문장 문제 ⚠️ 시각 (3개 — 받지 않은 문제 1 · Claude에게 "영상 문장 문제 확인해 줘")'));
  assert.match(read('sw.js'), /^ {2}'\.\/js\/grammarvideo\.js',/m, '앱 셸에 (주석 아님)');
  for (const p of ['grammar/video.json', 'coach/english/video.json', 'coach/grammar/video.json']) assert.ok(!existsSync(new URL(`../${p}`, import.meta.url)), `공개 저장소에 ${p} 없음`);
  const note = read('js/grammarnote.js');
  assert.ok(note.includes('dealNote(u, grammarSeenMap()[id] || 0, Math.random, vq ? NOTE_SHAPE.pick - 1 : NOTE_SHAPE.pick)') && note.includes('deal.splice(Math.min(1, deal.length), 0, dealVideo(vq.q, vq))'), '둘째 고르기 자리');
  assert.ok(note.includes("qs: r.deal.filter((d) => !d.v).map((d) => d.i)"), '본 문제는 단원 문제만');
  const pl = read('js/player.js');
  assert.ok(pl.includes('onListen: listenGrammarCue,') && pl.includes('onDone: () => { stopGrammarCue(); setGrammarOpen(false); go(); },'));
  assert.ok(read('js/db.js').includes('out.grammarVideo = mergeVideoSeen(cur.grammarVideo, rec.grammarVideo);'), '병합');
  assert.deepEqual(emptyProfile().grammarVideo, {});
});

// ───────────────────── 쪽지 (작은 가짜 DOM) ─────────────────────

class El {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.className = ''; this._text = ''; this.attrs = {}; this.listeners = {}; this.hidden = false; this.disabled = false; this.value = ''; this.type = ''; this.scrollTop = 0; this.placeholder = ''; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  set innerHTML(v) { if (!v) { this.children = []; this._text = ''; } }
  get innerHTML() { return ''; }
  appendChild(c) { this.children.push(c); return c; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  fire(t) { for (const fn of this.listeners[t] || []) fn({ preventDefault() {} }); }
  focus() {}
}
const roots = {};
globalThis.document = { getElementById: (id) => roots[id] || null, createElement: (t) => new El(t), createTextNode: (t) => ({ textContent: String(t), children: [] }) };
globalThis.fetch = async (url) => (String(url).includes('grammar.json') ? { ok: true, json: async () => JSON.parse(JSON.stringify(RAW)) } : { ok: false, status: 404 });
const all = (el, out = []) => { for (const c of el.children || []) { if (c instanceof El) { out.push(c); all(c, out); } } return out; };
const has = (el, cls) => el.className.split(' ').includes(cls);
const main = () => roots['grammar-note-main'];
const text = () => main().textContent;
const buttons = () => all(main()).filter((e) => e.tagName === 'BUTTON');
const press = (label) => { const b = buttons().find((x) => !x.disabled && x.textContent.includes(label)); assert.ok(b, `단추 「${label}」 — 화면: ${text().slice(0, 160)}`); b.fire('click'); return b; };
const opts = () => buttons().filter((b) => has(b, 'gr-opt'));
const optText = (b) => b.children[1].textContent;
function freshRoots() {
  roots['grammar-note'] = new El('div');
  roots['grammar-note'].hidden = true;
  roots['grammar-note-main'] = new El('div');
}
let initDone = false;
const stored = () => fakeIdb.get('profile', 'me');
async function seed(p) {
  if (!initDone) { await initProfile(); initDone = true; }
  await flushProfile();
  const cur = stored() || emptyProfile();
  fakeIdb.put('profile', { ...cur, ...p, id: 'me', updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
}
/** 지금 문제를 푼다 — wrong번 틀린 뒤 맞힘 (영상 문제는 d.v) */
function solve(note, k, wrong) {
  const d = note.deal[k];
  const q = d.v || note.u.qs[d.i];
  if (d.kind === 'pick') {
    const bad = q.opts.filter((o) => !o.ok).map((o) => o.t);
    for (let w = 0; w < wrong; w++) opts().find((b) => optText(b) === bad[w]).fire('click');
    opts().find((b) => optText(b) === q.opts.find((o) => o.ok).t).fire('click');
  } else if (d.kind === 'type') {
    const submit = (v) => { const f = all(main()).find((e) => e.tagName === 'FORM'); all(f).find((e) => e.tagName === 'INPUT').value = v; f.fire('submit'); };
    for (let w = 0; w < wrong; w++) submit(Object.keys(q.traps || {})[0] || 'zzqq');
    submit(q.ans[0]);
  } else {
    const place = (order) => { for (const t of order) { const b = all(main()).filter((e) => has(e, 'gr-tile') && !has(e, 'is-placed')).find((x) => x.textContent === t); b.fire('click'); } press('확인'); };
    for (let w = 0; w < wrong; w++) { place(q.tiles.slice().reverse()); press('모두 빼기'); }
    place(q.tiles);
  }
  assert.ok(text().includes('✓ 맞아요!'), `${note.id} ${k + 1}번 맞음 — ${text().slice(0, 160)}`);
}
const G1STAR = { G1: { box: SOLVED, due: 0, at: 100, miss: 0, d0: D0 - 3 } };

test('🎬 쪽지: 방금 따라 한 문장 → 둘째 자리 · 머리(🎬 방금 · 다른 단원 이름 · 🔊) · 영상 문제를 틀려도 단원 ⭐ · 계단엔 틀린 수 · 낸 기록 · 같은 날엔 쉬고 다음 문장', async () => {
  const m = await import('../js/grammarnote.js');
  assert.equal(await m.loadGrammar(), true);
  await seed({ coins: 0, coinsEarned: 0, grammar: G1STAR, grammarKnown: {}, grammarSeen: {}, grammarMiss: {}, grammarDay: {}, grammarVideo: {}, grammarGift: { n: 0, day: 0, id: 0 }, caught: {} });
  freshRoots();
  const cue = { start: 3, end: 4 };
  const src = { list: VR(), now: [{ en: 'We are ready now.', title: '시험 영상', cue }, { en: 'Pikachu is very fast!', title: '시험 영상', cue: { start: 1 } }], before: [] };
  const note = m.prepareNote(NOW, src);
  assert.equal(note.id, 'G2', '쪽지 단원은 다음 새 단원');
  assert.deepEqual(note.deal.map((d) => (d.v ? d.v.id : d.kind)), ['pick', 'V902', note.deal[2].kind], '고르기 1 + 🎬 + 꼬리 — 쪽지는 그대로 셋');
  assert.ok(note.deal[2].kind === 'type' || note.deal[2].kind === 'order');
  note.rolls = [0.5, 0.5];
  const rewards = [];
  const heard = [];
  m.openGrammarNote(note, { onReward: async (w) => { rewards.push(w); return { xp: 20, coin: 3 }; }, onDone: () => {}, onListen: (c) => heard.push(c) });
  press('문제 풀기');
  solve(note, 0, 0);
  press('다음');
  assert.ok(text().includes('🎬 방금 따라 한 문장') && text().includes(`📘 ${UNITS[0].title}`), `머리 — ${text().slice(0, 200)}`);
  press('🔊 그 장면 다시 듣기');
  assert.deepEqual(heard, [cue], '그 장면');
  solve(note, 1, 1);
  press('다음');
  assert.ok(!text().includes('🎬'), '꼬리 문제엔 🎬 머리가 없다');
  solve(note, 2, 0);
  press('다 했어요');
  await settle();
  assert.deepEqual(rewards, [1], '⚡💰 계단엔 영상 문제 틀림도');
  assert.ok(text().includes('⭐ 처음부터 다 맞혔어요!'), `단원 문제는 다 맞혔으니 ⭐ — ${text()}`);
  const s = stored();
  assert.deepEqual([s.grammar.G2.box, s.coins], [SOLVED, STAR_COINS]);
  assert.deepEqual(s.grammarVideo, { V902: { d: D0, w: 1 } }, '낸 기록 — 틀림');
  assert.equal(s.grammarSeen.G2.toString(2).split('').filter((x) => x === '1').length, 2, '본 문제는 단원 문제 둘');
  assert.equal(s.grammarMiss.bepick, 1, '영상 문제 오개념도 센다');
  press('계속하기');
  // 같은 날 다음 쪽지 — V902는 쉰다 → 다음 문장 V901
  const n2 = m.prepareNote(NOW, src);
  assert.equal(n2.deal[1].v && n2.deal[1].v.id, 'V901');
});

test('🎬 쪽지: 전에 따라 한 문장 → 「영상 이름」에서 · 🔊 없음(cue 없음·onListen 없음) · 맞는 문장이 없거나 원고가 없으면 지금 쪽지 그대로(고르기 둘)', async () => {
  const m = await import('../js/grammarnote.js');
  await m.loadGrammar();
  await seed({ grammar: { ...G1STAR, G2: { box: SOLVED, due: 0, at: 101, miss: 0, d0: D0 - 3 } }, grammarSeen: {}, grammarVideo: {} });
  freshRoots();
  const src = { list: VR(), now: [], before: [{ en: 'Is it your ball?', title: '다른 영상', at: 9, cue: null }] };
  const note = m.prepareNote(NOW, src);
  assert.equal(note.deal[1].v.id, 'V903');
  note.rolls = [0.5, 0.5];
  const rewards = [];
  m.openGrammarNote(note, { onReward: async (w) => { rewards.push(w); return null; }, onDone: () => {}, onListen: () => assert.fail('cue가 없으면 부르지 않는다') });
  if (note.concept) press('문제 풀기');
  solve(note, 0, 0);
  press('다음');
  assert.ok(text().includes('🎬 「다른 영상」에서 따라 한 문장'), text().slice(0, 160));
  assert.ok(!buttons().some((b) => b.textContent.includes('🔊')), '들려줄 장면이 없으면 단추도 없다 (들려줄 길이 있어도)');
  assert.ok(text().includes('📘 '), 'G2 문제 — 쪽지 단원과 다르면 단원 이름');
  solve(note, 1, 1); // 🎬 고르기를 한 번 틀림
  press('다음');
  solve(note, 2, 0);
  press('다 했어요');
  await settle();
  assert.deepEqual(rewards, [1], '고르기 틀림도 계단에');
  const s = stored();
  assert.equal(s.grammar[note.id].box, SOLVED, '영상 고르기를 틀려도 단원 ⭐');
  assert.deepEqual(s.grammarVideo.V903, { d: D0, w: 1 }, '틀림으로 적힌다');
  press('계속하기');
  const plain = m.prepareNote(NOW, { list: VR(), now: [{ en: 'nothing', title: '시험 영상' }], before: [] });
  assert.ok(plain.deal.every((d) => !d.v) && plain.deal.filter((d) => d.kind === 'pick').length === NOTE_SHAPE.pick, '맞는 문장이 없으면 그대로');
  assert.ok(m.prepareNote(NOW, null).deal.every((d) => !d.v), 'src 없음');
  const odd = m.prepareNote(NOW, { list: [{ ...VR()[0], id: 'V907', en: 123 }, ...VR()], now: [{ en: 'Pikachu is very fast!', title: '시험 영상' }], before: [] });
  assert.equal(odd.deal[1].v && odd.deal[1].v.id, 'V901', '깨진 줄이 끼어 있어도 나머지로 고른다');
  LS.clear();
  assert.ok(m.prepareNote(NOW, { now: [{ en: 'We are ready now.', title: '시험 영상' }], before: [] }).deal.every((d) => !d.v), '받아 둔 원고가 없으면 그대로');
});

test('🎬 쪽지: 저장이 안 되면 [다시 저장하기] — ⚡💰는 한 번 · 다시 저장하면 영상 기록도 들어간다', async () => {
  const m = await import('../js/grammarnote.js');
  await m.loadGrammar();
  await seed({ grammar: G1STAR, grammarKnown: {}, grammarSeen: {}, grammarVideo: {} });
  freshRoots();
  const note = m.prepareNote(NOW, { list: VR(), now: [{ en: 'Pikachu is very fast!', title: '시험 영상', cue: { start: 1 } }], before: [] });
  assert.equal(note.deal[1].v.id, 'V901');
  note.rolls = [0.5, 0.5];
  let paid = 0;
  m.openGrammarNote(note, { onReward: async () => { paid++; return { xp: 30, coin: 5 }; }, onDone: () => {} });
  if (note.concept) press('문제 풀기');
  for (let k = 0; k < 2; k++) { solve(note, k, 0); press('다음'); }
  solve(note, 2, 0);
  fakeIdb.failNext('profile');
  press('다 했어요');
  await settle();
  assert.ok(text().includes('저장이 안 됐어요'));
  assert.equal((stored().grammarVideo || {}).V901, undefined, '저장 실패 = 없던 일');
  press('다시 저장하기');
  await settle();
  assert.equal(paid, 1, '⚡💰는 쪽지마다 한 번');
  assert.deepEqual(stored().grammarVideo.V901, { d: D0, w: 0 }, '다시 저장하면 영상 기록도');
  assert.equal(stored().grammar[note.id].box, SOLVED);
  press('계속하기');
});

test('🎬 쪽지: 아직 배운 단원이 없으면(첫 쪽지) 영상 문제를 안 낸다 · 프로필 사본은 낸 기록을 다듬어 읽는다', async () => {
  const m = await import('../js/grammarnote.js');
  await m.loadGrammar();
  await seed({ grammar: {}, grammarKnown: {}, grammarSeen: {}, grammarVideo: { V001: { d: 5, w: 1 }, X1: { d: 3 }, V002: 'x' } });
  const n = m.prepareNote(NOW, { list: VR(), now: [{ en: 'We are ready now.', title: '시험 영상' }, { en: 'Pikachu is very fast!', title: '시험 영상' }], before: [] });
  assert.equal(n.id, 'G1');
  assert.ok(n.deal.every((d) => !d.v), '쪽지 단원(G1)을 아직 안 배웠다 — 영상 문제 없음');
  const { getProfileSnapshot } = await import('../js/xp.js');
  assert.deepEqual(getProfileSnapshot().grammarVideo, { V001: { d: 5, w: 1 } }, '깨진 기록은 읽을 때 빠진다');
});
