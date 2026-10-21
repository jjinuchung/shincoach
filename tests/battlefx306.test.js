// 🐸 v306 기술 그림 (2026-10-21 진우 요청 → 아버님 "이대로 진행") — 내 포켓몬이 공격할 때 그 포켓몬의 움직이는 장면을 한 번.
//  개굴닌자: 보통 공격은 물수리검 장면 · 🌟는 메가리자몽X와 맞붙는 장면 · 강한 기술 이름도 「물수리검」(PokeAPI 594).
//  애니 장면이라 공개 저장소에 그림·주소를 두지 않는다 → 비공개 저장소 fx/fx.json + fx/*.gif를 📤 열쇠로 받아 이 기기 그림 저장소에.
// node --test tests/battlefx306.test.js
import { fakeIdb } from './fakeidb.js'; // ★ db.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { FX_PATH, FX_MAX_BYTES, FX_MS, SYNC_MS, FX_LOAD_WAIT_MS, FX_LIST_MS, FX_GET_MS, fxKey, fxRows, fxPick, isGif, loadFx, forgetFx, syncFx, fxFor, playFx, stopFx } from '../js/battlefx.js';
import { movesOf, MOVES, SIGNATURE } from '../js/battle.js';
import * as UP from '../js/upload.js';
import { getCharacters } from '../js/db.js';

const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); } };
const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const body = (s, head) => { const i = s.indexOf(head); assert.ok(i >= 0, head); return s.slice(i, s.indexOf('\n}\n', i)); };
const gif = (tag) => new Blob([`GIF89a${tag}`], { type: 'image/gif' });
const LIST = [
  { id: 658, when: 'hit', file: 'fx/greninja_water_shuriken.gif', ms: 1600, v: 1, note: '물수리검' },
  { id: 658, when: 'star', file: 'fx/greninja_vs_mega_charizard_x.gif', ms: 2500, v: 1 },
];
const T0 = new Date(2026, 9, 21, 20).getTime();
/** 가짜 받기 — 무엇을 몇 번 받았나 */
function fakeDeps(list, files = {}) {
  const calls = { read: 0, raw: [], notes: [] };
  return {
    calls,
    deps: (now) => ({
      now: () => now,
      readList: async (p) => { calls.read++; assert.equal(p, FX_PATH); return typeof list === 'function' ? list() : list; },
      getRaw: async (file) => { calls.raw.push(file); const f = files[file]; if (f instanceof Error) throw f; return f === undefined ? gif(file) : f; },
      noteCheck: async (c) => { calls.notes.push(c); },
    }),
  };
}

test('🐸 fxRows: 쓸 줄만 — 포켓몬 번호·때(hit|star)·fx/ 아래 .gif(소문자) · 길이는 0.5~4초로 자름 · 판 없으면 1 · 같은 포켓몬·같은 때는 앞의 것', () => {
  const { rows, bad } = fxRows([
    ...LIST,
    { id: 658, when: 'hit', file: 'fx/other.gif' }, // 같은 때 둘 — 앞의 것
    { id: 0, when: 'hit', file: 'fx/a.gif' },
    { id: 25, when: 'miss', file: 'fx/a.gif' },
    { id: 25, when: 'hit', file: 'fx/../secret.gif' },
    { id: 25, when: 'hit', file: 'fx/A.gif' },
    { id: 25, when: 'hit', file: 'https://example.com/a.gif' },
    { id: 25, when: 'hit', file: 'fx/a.png' },
    null, 'x',
    { id: '6', when: 'star', file: 'fx/b-2.gif', ms: 99999, v: 0 },
    { id: 7, when: 'hit', file: 'fx/c_3.gif', ms: 100, v: 4 },
    { id: 9, when: 'hit', file: 'fx/d.gif' },
  ]);
  assert.equal(bad, 9);
  assert.deepEqual(rows, [
    { id: 658, when: 'hit', file: 'fx/greninja_water_shuriken.gif', ms: 1600, v: 1 },
    { id: 658, when: 'star', file: 'fx/greninja_vs_mega_charizard_x.gif', ms: 2500, v: 1 },
    { id: 6, when: 'star', file: 'fx/b-2.gif', ms: FX_MS.max, v: 1 },
    { id: 7, when: 'hit', file: 'fx/c_3.gif', ms: FX_MS.min, v: 4 },
    { id: 9, when: 'hit', file: 'fx/d.gif', ms: FX_MS.def, v: 1 },
  ]);
  assert.deepEqual(fxRows(null), { rows: [], bad: 0 });
  assert.deepEqual(fxRows({ id: 658 }), { rows: [], bad: 0 }, '목록이 아니면 빈 것');
});

test('🐸 fxPick: 🌟면 🌟 장면(없으면 보통 장면) · 보통 공격은 보통 장면만 · 그 포켓몬 줄이 없으면 null', () => {
  const { rows } = fxRows([...LIST, { id: 6, when: 'star', file: 'fx/only_star.gif' }, { id: 7, when: 'hit', file: 'fx/only_hit.gif' }]);
  assert.equal(fxPick(rows, 7, true).file, 'fx/only_hit.gif', '🌟 장면이 없으면 보통 장면');
  assert.equal(fxPick(rows, 658, false).file, 'fx/greninja_water_shuriken.gif');
  assert.equal(fxPick(rows, 658, true).file, 'fx/greninja_vs_mega_charizard_x.gif');
  assert.equal(fxPick(rows, '658', true).file, 'fx/greninja_vs_mega_charizard_x.gif');
  assert.equal(fxPick(rows, 6, true).file, 'fx/only_star.gif');
  assert.equal(fxPick(rows, 6, false), null, '🌟 장면만 있으면 보통 공격엔 안 나온다');
  assert.equal(fxPick(rows, 25, true), null);
  assert.equal(fxPick(null, 658, false), null);
});

test('🐸 isGif: GIF87a·GIF89a만 — 오류 글(HTML)·빈 것은 그림 저장소에 넣지 않는다', async () => {
  assert.equal(await isGif(gif('x')), true);
  assert.equal(await isGif(new Blob(['GIF87a....'])), true);
  assert.equal(await isGif(new Blob(['<!doctype html>'])), false);
  assert.equal(await isGif(new Blob([])), false);
  assert.equal(await isGif(null), false);
});

test('★ 🐸 받기(가짜 IndexedDB): 목록 → 두 그림을 받아 그림 저장소에 · 10분 안엔 다시 안 받음 · 같은 판은 다시 안 받음 · 다시 켜면 받아 둔 것으로(인터넷 없이) · 판이 바뀐 그림만 다시', async () => {
  forgetFx(); store.clear();
  const f = fakeDeps([...LIST, { id: 0, when: 'hit', file: 'fx/x.gif' }]);
  assert.equal(fxFor(658, false), null, '받기 전엔 없다');
  assert.equal(await syncFx(false, f.deps(T0)), 2);
  assert.deepEqual(f.calls.raw, LIST.map((r) => r.file));
  assert.deepEqual(f.calls.notes, [{ rows: 3, bad: 1 }], '빠진 줄은 📊 받기 줄에');
  const saved = (await getCharacters()).filter((c) => String(c.id).startsWith('fx:'));
  assert.deepEqual(saved.map((c) => [c.id, c.v]).sort(), [[fxKey(LIST[1].file), 1], [fxKey(LIST[0].file), 1]]);
  assert.equal(fxFor(658, false).ms, 1600);
  assert.equal(fxFor(658, true).ms, 2500);
  assert.equal(fxFor(25, false), null);
  // 10분 안 — 목록도 안 읽는다 · force면 읽지만 같은 판이라 그림은 안 받는다
  assert.equal(await syncFx(false, f.deps(T0 + SYNC_MS - 1)), 0);
  assert.equal(f.calls.read, 1);
  assert.equal(await syncFx(true, f.deps(T0 + 1000)), 0);
  assert.deepEqual([f.calls.read, f.calls.raw.length], [2, 2]);
  // 앱을 다시 켬 — 메모리는 비고, 받아 둔 목록·그림으로 바로(받기 없이)
  forgetFx();
  assert.equal(fxFor(658, false), null);
  assert.equal(await loadFx(), 2);
  assert.equal(fxFor(658, true).ms, 2500);
  assert.equal(await (await fxFor(658, false).blob.slice(0, 6).text()), 'GIF89a');
  forgetFx();
  await loadFx();
  assert.equal(await syncFx(true, f.deps(T0 + SYNC_MS)), 0, '다시 켠 뒤에도 같은 판은 저장된 것으로');
  assert.equal(f.calls.raw.length, 2);
  // 물수리검 그림만 판이 바뀜 → 그것만 다시 · GitHub raw 형식(application/vnd.github.raw)으로 와도 image/gif로 감싸 둔다
  const g = fakeDeps([{ ...LIST[0], v: 2 }, LIST[1]], { [LIST[0].file]: new Blob(['GIF89av2'], { type: 'application/vnd.github.raw' }) });
  assert.equal(await syncFx(true, g.deps(T0 + 2 * SYNC_MS)), 1);
  assert.deepEqual(g.calls.raw, [LIST[0].file]);
  assert.equal(fakeIdb.get('characters', fxKey(LIST[0].file)).v, 2);
  assert.equal(await fxFor(658, false).blob.text(), 'GIF89av2');
  assert.equal(fxFor(658, false).blob.type, 'image/gif');
  assert.equal(fakeIdb.get('characters', fxKey(LIST[0].file)).blob.type, 'image/gif');
});

test('★ 🐸 받기: 못 받은 그림·GIF가 아닌 것은 넣지 않고 나머지는 받는다(📊에 ⚠️) · 빈 목록·모두 깨진 목록이면 받아 둔 것 그대로 · 두 번 불러도 한 번만 받는다', async () => {
  forgetFx(); store.clear();
  const f = fakeDeps(LIST, { [LIST[0].file]: new Blob(['<html>오류</html>']), [LIST[1].file]: new Error('인터넷') });
  const before = (await getCharacters()).length;
  // 앞 시험이 남긴 그림 저장소는 그대로라 같은 판은 다시 안 받는다 — 판을 올려 새로 받게
  const L3 = LIST.map((r) => ({ ...r, v: 3 }));
  const f3 = fakeDeps(L3, { [LIST[0].file]: new Blob(['<html>오류</html>']), [LIST[1].file]: new Error('인터넷') });
  assert.equal(await syncFx(true, f3.deps(T0)), 0);
  assert.deepEqual(f3.calls.notes, [{ rows: 2, bad: 2 }], '못 받은 그림 둘');
  assert.equal(fakeIdb.get('characters', fxKey(LIST[0].file)).v, 2, 'HTML은 넣지 않는다 — 옛 판이 그대로');
  assert.equal((await getCharacters()).length, before);
  void f;
  // 하나만 실패 — 다른 하나는 받는다
  const f4 = fakeDeps(L3, { [LIST[1].file]: new Error('인터넷') });
  assert.equal(await syncFx(true, f4.deps(T0 + 1)), 1);
  assert.deepEqual(f4.calls.notes, [{ rows: 2, bad: 1 }]);
  assert.equal(fakeIdb.get('characters', fxKey(LIST[0].file)).v, 3);
  // 빈 목록(파일 없음·열쇠 없음·인터넷 없음)·모두 깨진 목록 — 받아 둔 목록 그대로
  const e = fakeDeps([]);
  assert.equal(await syncFx(true, e.deps(T0 + 2)), 0);
  assert.deepEqual(e.calls.notes, [], '빈 목록은 적을 것이 없다');
  assert.ok(fxFor(658, false), '그대로 나온다');
  const b = fakeDeps([{ id: 'x' }, { id: 658, when: 'hit', file: 'nope.gif' }]);
  assert.equal(await syncFx(true, b.deps(T0 + 3)), 0);
  assert.deepEqual(b.calls.notes, [{ rows: 2, bad: 2 }]);
  assert.ok(fxFor(658, false), '모두 깨진 목록이어도 그대로');
  forgetFx(); await loadFx();
  assert.ok(fxFor(658, false), '다시 켜도 그대로 — 깨진 목록을 받아 두지 않았다');
  // 두 곳(앱 켜기·배틀 열기)이 같이 불러도 한 번만
  const c = fakeDeps(LIST.map((r) => ({ ...r, v: 5 })));
  const [x, y] = await Promise.all([syncFx(true, c.deps(T0 + 4)), syncFx(true, c.deps(T0 + 4))]);
  assert.deepEqual([x, y, c.calls.read, c.calls.raw.length], [2, 2, 1, 2]);
});

test('🐸 playFx: 그림이 없거나 칸이 없으면 바로 false(배틀을 세우지 않는다)', async () => {
  forgetFx(); store.clear();
  assert.equal(await playFx(null, 658, false), false);
  assert.equal(await playFx({}, 25, false), false);
});

test('📥 getRawFile: raw 머리글·Bearer 열쇠·main 가지 · 없으면 null · 크면 받기 전에(길이 머리글)·받은 뒤에도 big · 빈 것도 big · 못 받으면 까닭', async () => {
  const calls = [];
  const mk = (status, blob, len) => async (url, opt) => { calls.push({ url, headers: opt.headers }); return { status, headers: { get: (k) => (k === 'content-length' && len !== undefined ? String(len) : null) }, blob: async () => { if (!blob) throw new Error('끊김'); return blob; } }; };
  const g = gif('abc');
  assert.equal(await UP.getRawFile({ fetchFn: mk(200, g, g.size), token: 'tok', path: 'fx/a.gif', maxBytes: 100 }), g);
  assert.equal(calls[0].url, 'https://api.github.com/repos/jjinuchung/shincoach-data/contents/fx/a.gif?ref=main');
  assert.equal(calls[0].headers.Accept, 'application/vnd.github.raw');
  assert.equal(calls[0].headers.Authorization, 'Bearer tok');
  assert.equal(await UP.getRawFile({ fetchFn: mk(404), token: 't', path: 'fx/a.gif', maxBytes: 100 }), null);
  const fail = async (fetchFn, re) => assert.rejects(UP.getRawFile({ fetchFn, token: 't', path: 'fx/a.gif', maxBytes: 5 }), re);
  let blobAsked = false;
  await fail(async () => ({ status: 200, headers: { get: () => '6' }, blob: async () => { blobAsked = true; return gif(''); } }), (e) => e.status === 'big');
  assert.equal(blobAsked, false, '길이 머리글로 받기 전에 멈춘다');
  await fail(mk(200, gif('123456789')), (e) => e.status === 'big');
  await fail(mk(200, new Blob([])), (e) => e.status === 'big');
  await fail(mk(401), (e) => e.status === 401 && /열쇠/.test(e.message));
  await fail(mk(200, null), (e) => e.status === 0);
  await fail(async () => { throw new Error('오프라인'); }, (e) => e.status === 0);
  assert.equal(FX_MAX_BYTES, 8 * 1000 * 1000);
});

test('📊 받기 줄: 🐸 기술 그림 ✅ · 빠진 줄·못 받은 그림은 ⚠️ "받지 않은 그림 n · Claude에게 「기술 그림 확인해 줘」"', () => {
  assert.equal(UP.PRIVATE_FX, FX_PATH);
  const fmt = () => 't';
  assert.match(UP.readSummary({ [FX_PATH]: { ok: true, at: 1, n: 2 } }, fmt), /🐸 기술 그림 ✅ t \(2개\)/);
  assert.match(UP.readSummary({ [FX_PATH]: { ok: true, at: 1, n: 2, check: { rows: 2, bad: 1 } } }, fmt), /🐸 기술 그림 ⚠️ t \(2개 — 받지 않은 그림 1 · Claude에게 "기술 그림 확인해 줘"\)/);
  assert.match(UP.readSummary({ [FX_PATH]: { ok: true, at: 1, n: 0, missing: true } }, fmt), /🐸 기술 그림 · 아직 없음/);
});

test('🐸 전용 기술: 개굴닌자의 강한 기술은 물수리검(PokeAPI water-shuriken 594 · 물) · 확실한 기술은 물 타입 그대로', () => {
  assert.deepEqual(SIGNATURE[658], { strong: '물수리검', emoji: '💧' });
  const m = movesOf(658);
  assert.deepEqual([m[0].key, m[0].name, m[1].key, m[1].name], ['strong', '물수리검', 'safe', MOVES.water.safe]);
  assert.ok(src('js/battle.js').includes('water-shuriken 594'), 'PokeAPI로 확인한 이름');
});

test('🐸 화면 연결: ⚔️ 말하기·수학 턴은 공격이 들어갈 때만(데미지 > 0) 맞기 전에 그림 · 🚀 파트너 공격도 · 받기는 앱 켜기·배틀·로켓단 열 때 · sw · 공개 저장소엔 그림·주소 없음', () => {
  const b = src('js/battle.js');
  for (const head of ['async function playerTurn(', 'async function quizTurn(']) {
    const f = body(b, head);
    const i = f.indexOf("if (dmg > 0) { await moveFx(tier === 'star'); if (!alive()) return; }");
    assert.ok(i > 0 && i < f.indexOf("hitFx('enemy'"), `${head} 맞기 전에 · 데미지가 있을 때만 · 끝나면 배틀이 그대로인지`);
    assert.ok(f.indexOf("$('battle-msg').textContent = `${tierMsg}") < i, '메시지(데미지 몇)를 먼저 보여 주고');
  }
  assert.ok(body(b, 'function moveFx(').includes("playFx($('battle-stage'), ui.my && ui.my.id, star)"));
  assert.ok(body(b, 'export function openBattle(').includes('syncFx()'));
  assert.ok(!body(b, 'async function enemyTurn(').includes('moveFx'), '상대 공격엔 안 나온다');
  const r = src('js/rocketview.js');
  const at = body(r, 'async function attack(');
  assert.ok(at.includes('const mv = movesOf(partner.id)[0];') && at.includes('${mv.name}'), '로켓단에서도 전용 기술 이름');
  assert.ok(at.indexOf("await playFx($('.rocket-sky'), partner.id, false)") < at.indexOf("replay($('.rocket-partner'), 'lunge')"), '그림 → 돌진');
  assert.ok(at.includes('if (!ui.open) return;'));
  assert.ok(!/\bMOVES\b|typeOf/.test(r), '로켓단은 옛 타입 기술표를 직접 안 쓴다');
  assert.ok(body(r, 'export async function openRocket(').includes('syncFx()'));
  const a = src('js/app.js');
  assert.ok(a.includes("import { loadFx, syncFx } from './battlefx.js';") && /loadFx\(\)\.catch\(\(\) => 0\)\.then\(\(\) => setTimeout\(\(\) => \{ syncFx\(\)/.test(a));
  assert.ok(src('sw.js').includes("'./js/battlefx.js'"), '오프라인에서도 열리게');
  assert.ok(/\.fx-play \{[^}]*position: absolute/.test(src('css/style.css')));
  // 공개 저장소: 받아 온 곳 주소(블로그·검색 미리보기)와 그림 파일을 두지 않는다
  for (const f of readdirSync(new URL('../js/', import.meta.url))) {
    assert.ok(!/pstatic|blogfiles|ruliweb/.test(src(`js/${f}`)), `js/${f}에 받아 온 곳 주소 없음`);
  }
  assert.ok(!existsSync(new URL('../fx', import.meta.url)), '공개 저장소에 fx/ 그림 폴더 없음');
});

// ── 🔍 Codex 112차 (아버님 "추천대로") ──

test('🔍 Codex 112차 #1: 🌟 그림을 아직 못 받았으면(목록엔 있어도) 받아 둔 보통 그림으로 대신 · 받고 나면 🌟 그림', async () => {
  forgetFx(); store.clear();
  const L = [{ id: 658, when: 'hit', file: 'fx/t1_hit.gif', ms: 1200 }, { id: 658, when: 'star', file: 'fx/t1_star.gif', ms: 2400 }];
  const f = fakeDeps(L, { 'fx/t1_star.gif': new Error('인터넷') });
  assert.equal(await syncFx(true, f.deps(T0)), 1);
  assert.deepEqual([fxFor(658, true).file, fxFor(658, true).ms], ['fx/t1_hit.gif', 1200], '🌟인데 🌟 그림이 없다 → 보통 그림');
  assert.equal(fxFor(658, false).file, 'fx/t1_hit.gif');
  const g = fakeDeps(L);
  assert.equal(await syncFx(true, g.deps(T0 + 1)), 1);
  assert.deepEqual(g.calls.raw, ['fx/t1_star.gif'], '못 받은 것만 다시');
  assert.equal(fxFor(658, true).file, 'fx/t1_star.gif');
});

test('🔍 Codex 112차 #2: 와이파이가 붙은 채 멈춰도 받기가 끝난다 — 그림 한 장은 끊고(신호) 다음 그림으로 · 늦게 와도 저장 안 함 · 목록이 멈추면 빈 목록 · 다음 받기가 막히지 않는다', { timeout: 5000 }, async () => {
  assert.deepEqual([FX_LIST_MS, FX_GET_MS], [30 * 1000, 60 * 1000]);
  forgetFx(); store.clear();
  const L = [{ id: 658, when: 'hit', file: 'fx/t2_hang.gif' }, { id: 658, when: 'star', file: 'fx/t2_ok.gif' }];
  let signal = null;
  let late = null;
  const notes = [];
  const deps = {
    now: () => T0, getMs: 30, listMs: 30,
    readList: async () => L,
    getRaw: (file, sig) => (file === 'fx/t2_hang.gif' ? new Promise((res) => { signal = sig; late = res; }) : Promise.resolve(gif('ok'))),
    noteCheck: async (c) => { notes.push(c); },
  };
  assert.equal(await syncFx(true, deps), 1, '멈춘 그림은 끊고 다음 그림은 받는다');
  assert.equal(signal && signal.aborted, true, '멈춘 받기에 끊기 신호');
  assert.deepEqual(notes, [{ rows: 2, bad: 1 }], '못 받은 그림 하나로 셈');
  late(gif('늦게'));
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(fakeIdb.get('characters', fxKey('fx/t2_hang.gif')), undefined, '늦게 온 그림은 저장되지 않는다');
  assert.equal(fxFor(658, true).file, 'fx/t2_ok.gif', '받은 🌟 그림은 나온다');
  assert.equal(fxFor(658, false), null, '보통 그림은 못 받았다 — 🌟 그림으로 거꾸로 대신하지 않는다');
  // 목록이 멈춤 → 빈 목록(받아 둔 것 그대로) · 다음 받기는 새로 시작
  let reads = 0;
  const hang = { ...deps, readList: () => { reads++; return new Promise(() => {}); } };
  const t0 = Date.now();
  assert.equal(await syncFx(true, hang), 0);
  assert.ok(Date.now() - t0 < 2000, '목록 시간 상한에서 끝남');
  assert.equal(await syncFx(true, hang), 0);
  assert.equal(reads, 2, '앞 받기가 끝났으니 다음 받기가 새로 읽는다');
  assert.equal(fxFor(658, true).file, 'fx/t2_ok.gif', '받아 둔 것 그대로');
  // getRawFile은 신호를 fetch에 넘긴다
  const ctl = new AbortController();
  let seen = null;
  await UP.getRawFile({ fetchFn: async (u, o) => { seen = o.signal; return { status: 404 }; }, token: 't', path: 'fx/a.gif', maxBytes: 9, signal: ctl.signal });
  assert.equal(seen, ctl.signal);
});

/** 가짜 화면 — playFx가 쓰는 것만 */
function fakeEl(tag) {
  const ls = {};
  return {
    tag, children: [], parent: null, attrs: {}, className: '', src: '',
    setAttribute(k, v) { this.attrs[k] = v; },
    appendChild(c) { c.parent = this; this.children.push(c); return c; },
    addEventListener(type, fn) { (ls[type] = ls[type] || []).push(fn); },
    fire(type) { for (const fn of ls[type] || []) fn({ stopPropagation() {} }); },
    remove() { if (this.parent) { this.parent.children = this.parent.children.filter((x) => x !== this); this.parent = null; } },
    querySelectorAll(sel) { return this.children.filter((c) => sel === '.fx-play' && c.className === 'fx-play'); },
  };
}

test('🔍 Codex 112차 시험: playFx(가짜 화면·가짜 시계) — 열림·오류·누름·끝내 안 열림 어느 길이든 한 번 끝나고 주소도 한 번 정리 · 늦게 열려도 다시 안 잼 · 남은 덮개는 지움 · stopFx는 틀던 것을 모두 바로', async (t) => {
  forgetFx(); store.clear();
  const f = fakeDeps([{ id: 658, when: 'hit', file: 'fx/t3_hit.gif', ms: 1000 }]);
  assert.equal(await syncFx(true, f.deps(T0)), 1);
  const made = [];
  const revoked = [];
  const oc = URL.createObjectURL;
  const orv = URL.revokeObjectURL;
  URL.createObjectURL = (b) => { const u = oc.call(URL, b); made.push(u); return u; };
  URL.revokeObjectURL = (u) => { revoked.push(u); orv.call(URL, u); };
  globalThis.document = { createElement: fakeEl };
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const mockedSet = globalThis.setTimeout;
  let timers = 0;
  globalThis.setTimeout = (...a) => { timers++; return mockedSet(...a); };
  const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
  const play = (box) => { const st = { v: null }; playFx(box, 658, false).then((v) => { st.v = v; }); return st; };
  const once = (u) => revoked.filter((x) => x === u).length;
  try {
    // 열림 → 그림 길이만큼 → 끝
    const box = fakeEl('div');
    const a = play(box);
    const btn = box.children[0];
    assert.equal(btn.className, 'fx-play');
    assert.equal(btn.attrs['aria-label'], '기술 장면 — 누르면 넘어가요');
    const img = btn.children[0];
    assert.equal(img.src, made.at(-1), '틀 때마다 새 주소');
    img.fire('load');
    t.mock.timers.tick(999); await flush();
    assert.equal(a.v, null, '그림 길이 전엔 그대로');
    t.mock.timers.tick(1); await flush();
    assert.deepEqual([a.v, box.children.length, once(img.src)], [true, 0, 1]);
    // 누름 → 바로 · 늦게 열려도 다시 안 잰다
    const b = play(box);
    const img2 = box.children[0].children[0];
    box.children[0].fire('click'); await flush();
    assert.equal(b.v, true);
    const before = timers;
    img2.fire('load');
    assert.equal(timers, before, '끝난 뒤 늦게 열려도 타이머를 다시 만들지 않는다');
    t.mock.timers.tick(10000); await flush();
    assert.equal(once(img2.src), 1, '주소는 한 번만 정리');
    // 오류 → 바로
    const c = play(box);
    const img3 = box.children[0].children[0];
    img3.fire('error'); await flush();
    assert.deepEqual([c.v, once(img3.src), box.children.length], [true, 1, 0]);
    // 끝내 안 열림 → 그림 길이 + 기다림
    const d = play(box);
    t.mock.timers.tick(1000 + FX_LOAD_WAIT_MS - 1); await flush();
    assert.equal(d.v, null);
    t.mock.timers.tick(1); await flush();
    assert.equal(d.v, true);
    // 앞에서 남은 덮개는 지우고 시작
    const old = fakeEl('button'); old.className = 'fx-play'; box.appendChild(old);
    const e = play(box);
    assert.deepEqual([box.children.length, box.children[0] !== old], [1, true]);
    // stopFx — 두 칸에서 틀던 것을 모두 바로 끝(주소도 한 번씩)
    const box2 = fakeEl('div');
    const g = play(box2);
    const urls = [box.children[0].children[0].src, box2.children[0].children[0].src];
    stopFx(); await flush();
    assert.deepEqual([e.v, g.v, box.children.length, box2.children.length], [true, true, 0, 0]);
    assert.deepEqual(urls.map(once), [1, 1]);
    stopFx(); await flush();
    assert.deepEqual(urls.map(once), [1, 1], '두 번 불러도 그대로');
  } finally {
    globalThis.setTimeout = mockedSet;
    t.mock.timers.reset();
    URL.createObjectURL = oc;
    URL.revokeObjectURL = orv;
    delete globalThis.document;
  }
});

test('🔍 Codex 112차: ⚔️ 배틀이 닫히면 틀던 그림도 바로 끝(다시 연 무대에 안 남음 · 기다리던 턴은 alive()로 멈춤)', () => {
  const b = src('js/battle.js');
  assert.ok(b.includes("import { playFx, syncFx, stopFx } from './battlefx.js';"));
  const c = body(b, 'export function closeBattle(');
  assert.ok(c.indexOf('stopFx();') > c.indexOf('if (!ui.open) return;'), '열려 있던 배틀을 닫을 때');
});
