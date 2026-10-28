// 💌 아빠·엄마 한 줄 메시지 (2026-10-18, 아버님 "이대로 진행") — 고쳐 읽기 · 목록 · 읽음 · 카드 글자(글자만) · 📤 글 · 받기(10분에 한 번 · 못 받으면 그대로) · 잇기
// node --test tests/familymsg.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MSG_PATH, MSG_LEN, MSG_SHOW, FROM, msgOf, msgsOf, seenOf, unreadOf, markSeen, localMsg, whenOf, letterHtml, pastHtml, readMd } from '../js/familymsg.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const T = new Date(2026, 9, 18, 19, 30).getTime();
const m = (id, from, text, at) => ({ id, from, text, at });

test('💌 고쳐 읽기 — 아빠·엄마만 · 글은 한 줄로(줄바꿈·제어 글자 → 빈칸) · 앞뒤 빈칸 없이 · 80자까지(그림 글자도 한 자) · 시각은 수 또는 "YYYY-MM-DD HH:MM"', () => {
  assert.deepEqual(Object.keys(FROM), ['아빠', '엄마']);
  assert.equal(MSG_PATH, 'family/messages.json');
  assert.deepEqual(msgOf(m('a1', '아빠', '  멋졌어!\n최고  ', T)), { id: 'a1', from: '아빠', text: '멋졌어! 최고', at: T });
  assert.equal(msgOf({ id: 'a2', from: '엄마', text: '좋아', at: '2026-10-18 09:05' }).at, new Date(2026, 9, 18, 9, 5).getTime());
  assert.equal([...msgOf(m('a3', '아빠', '😀'.repeat(200), T)).text].length, MSG_LEN);
  for (const bad of [m('', '아빠', 'x', T), m('a b', '아빠', 'x', T), m('a4', '삼촌', 'x', T), m('a5', '아빠', '   ', T), m('a6', '아빠', 'x', 0), m('a7', '아빠', 'x', 'nope'), null, 'x', [1]]) assert.equal(msgOf(bad), null, JSON.stringify(bad));
  assert.equal(msgOf(m('toString', '아빠', 'x', T)).id, 'toString', 'id는 글자일 뿐');
});

test('📚 목록 — 깨진 것 버림 · 같은 id는 먼저 온 것 · 보낸 시각 차례 · 여러 목록 합치기(받은 것 + 이 기기에서 쓴 것)', () => {
  const list = msgsOf([m('b', '엄마', '둘', T + 2), m('a', '아빠', '하나', T + 1), m('a', '아빠', '바뀐 하나', T + 9), { bad: 1 }], [m('l1', '아빠', '집에서', T + 3)]);
  assert.deepEqual(list.map((x) => x.id), ['a', 'b', 'l1']);
  assert.equal(list[0].text, '하나');
  assert.deepEqual(msgsOf('x', null), []);
  const many = msgsOf(Array.from({ length: 80 }, (_, i) => m(`k${i}`, '아빠', `${i}`, T + i)));
  assert.equal(many.length, 60, '최근 60개');
  assert.equal(many[0].id, 'k20');
});

test('👀 읽음 — 안 읽은 것은 오래된 것부터 · 읽음 표시는 새 객체 · 처음 읽은 시각 그대로 · 목록에 없는 표시는 지움 · 깨진 표시는 버림', () => {
  const list = msgsOf([m('a', '아빠', '하나', T), m('b', '엄마', '둘', T + 1)]);
  assert.deepEqual(unreadOf(list, {}).map((x) => x.id), ['a', 'b']);
  const s0 = { zz: 5 };
  const s1 = markSeen(s0, 'a', T + 100, list);
  assert.deepEqual(s1, { a: T + 100 }, '목록에 없는 zz는 지운다');
  assert.deepEqual(s0, { zz: 5 }, '입력은 그대로');
  assert.deepEqual(markSeen(s1, 'a', T + 999, list), { a: T + 100 }, '두 번 눌러도 처음 시각');
  assert.deepEqual(unreadOf(list, s1).map((x) => x.id), ['b']);
  assert.deepEqual(seenOf({ a: 'x', b: -1, c: 3, 'd e': 4 }), { c: 3 });
  assert.deepEqual(markSeen({ q: 1 }, 'a', 9, []), { q: 1, a: 9 }, '목록이 비면(아직 못 받음) 지우지 않는다');
});

test('✍️ 📊에서 쓴 말 — 이 기기 id(l…) · 빈 글·모르는 사람은 null', () => {
  assert.deepEqual(localMsg('엄마', ' 수고했어 ', T), { id: `l${T}`, from: '엄마', text: '수고했어', at: T });
  assert.equal(localMsg('엄마', '   ', T), null);
  assert.equal(localMsg('누나', '안녕', T), null);
});

test('🖼️ 카드 글자 — 보낸 사람·때 · 글은 글자로만(태그 못 들어감) · 단추 둘 · 지난 말은 새것부터 최근 20개 · 셈 말 없음', () => {
  assert.deepEqual([whenOf(new Date(2026, 9, 18, 8).getTime()), whenOf(new Date(2026, 9, 18, 13).getTime()), whenOf(new Date(2026, 9, 18, 19).getTime()), whenOf(new Date(2026, 9, 18, 23).getTime())], ['10/18 아침', '10/18 낮', '10/18 저녁', '10/18 밤']);
  const h = letterHtml(msgOf(m('x1', '엄마', '<img src=x onerror=alert(1)> 잘했어', T)));
  assert.ok(h.includes('data-id="x1"') && h.includes('엄마가 보낸 말') && h.includes('👩'));
  assert.ok(!h.includes('<img') && h.includes('&lt;img'));
  assert.ok(h.includes('💗 고마워요') && h.includes('💌 지난 말 보기'));
  assert.equal(letterHtml(null), '');
  const list = msgsOf(Array.from({ length: 30 }, (_, i) => m(`p${i}`, i % 2 ? '엄마' : '아빠', `말 ${i}`, T + i)));
  const ph = pastHtml(list);
  assert.equal((ph.match(/<li>/g) || []).length, MSG_SHOW);
  assert.ok(ph.indexOf('말 29') < ph.indexOf('말 28'), '새것부터');
  assert.ok(!ph.includes('말 9<'), '오래된 것은 빠짐');
  assert.match(pastHtml([]), /아직 받은 말이 없어요/);
  for (const s of [h, ph]) assert.doesNotMatch(s.replace(/data-id="[^"]*"/g, '').replace(/\d{1,2}\/\d{1,2}/g, ''), /\d+\s*(개|번)|남음|남았/);
});

test('📤 family/read.md — 무엇이 왔고 언제 읽었나 · 태블릿에서 쓴 말 표시 · 아직', () => {
  const list = msgsOf([m('a', '아빠', '하나', T), m(`l${T + 5}`, '엄마', '집에서', T + 5)]);
  const md = readMd(list, { a: T + 60000 }, '2026-10-18');
  assert.ok(md.startsWith('# 💌 한 줄 메시지 — 읽었나 (2026-10-18 · 이 기기 기준'), '어느 기기 기준인지 밝힌다 (Codex 95차 #3)');
  // 물려받은 칸 이름 id(toString)도 안 읽은 것 — 읽음 확인은 그 객체 자신의 칸만 (Codex 95차 #5)
  const odd = msgsOf([m('toString', '아빠', '이상한 id', T), m('constructor', '엄마', '또', T + 1)]);
  assert.deepEqual(unreadOf(odd, {}).map((x) => x.id), ['toString', 'constructor']);
  assert.deepEqual(markSeen({}, 'toString', T + 9, odd), { toString: T + 9 });
  assert.match(readMd(odd, {}, '2026-10-18'), /"이상한 id" — 아직/);
  assert.ok(md.includes('👨 아빠: "하나" — 💗 읽음 10/18 19:31'));
  assert.ok(md.includes('👩 엄마(태블릿에서): "집에서" — 아직'));
  assert.match(readMd([], {}, '2026-10-18'), /받은 말 없음/);
});

// ───────────────────── 받기 (familyview — localStorage 흉내) ─────────────────────

function fakeStorage() {
  const m0 = new Map();
  return { getItem: (k) => (m0.has(k) ? m0.get(k) : null), setItem: (k, v) => { m0.set(k, String(v)); }, removeItem: (k) => m0.delete(k), _m: m0 };
}

test('📥 받기 — 10분에 한 번까지(force면 바로) · 받으면 이 기기에 두고 바뀌었을 때만 true · 못 받으면(빈 목록·오류) 받아 둔 것 그대로 · 쓴 말과 합쳐짐', async () => {
  globalThis.localStorage = fakeStorage();
  const fv = await import('../js/familyview.js');
  let calls = 0;
  let reply = [m('a', '아빠', '하나', T)];
  const deps = (now) => ({ now: () => now, readList: async (p) => { calls++; assert.equal(p, MSG_PATH); if (reply instanceof Error) throw reply; return reply; } });
  assert.equal(await fv.syncFamily(false, deps(T)), true);
  assert.equal(await fv.syncFamily(false, deps(T + 60000)), false, '10분 안에는 안 받음');
  assert.equal(calls, 1);
  assert.equal(await fv.syncFamily(true, deps(T + 60000)), false, 'force — 받았지만 같으면 false');
  assert.equal(calls, 2);
  reply = [];
  assert.equal(await fv.syncFamily(false, deps(T + 11 * 60000)), false);
  assert.deepEqual(fv.allMsgs().map((x) => x.id), ['a'], '빈 목록이면 받아 둔 것 그대로');
  reply = new Error('net');
  assert.equal(await fv.syncFamily(true, deps(T + 12 * 60000)), false);
  assert.deepEqual(fv.allMsgs().map((x) => x.id), ['a'], '오류여도 그대로');
  // 모두 깨진 목록(날짜 오타 등)이 와도 받아 둔 것을 지우지 않는다 · 받지 않은 줄은 📥 받기 줄에 ⚠️로 (Codex 95차 #2 · #6)
  const notes = [];
  reply = [{ id: 'z', from: '아빠', text: '오타', at: '오타' }];
  assert.equal(await fv.syncFamily(true, { ...deps(T + 12 * 60000), noteCheck: async (c) => { notes.push(c); } }), false);
  assert.deepEqual(fv.allMsgs().map((x) => x.id), ['a'], '깨진 목록이어도 그대로');
  assert.deepEqual(notes, [{ rows: 1, bad: 1 }]);
  reply = [m('a', '아빠', '하나', T), m('b', '엄마', '둘', T + 1)];
  assert.equal(await fv.syncFamily(true, { ...deps(T + 13 * 60000), noteCheck: async (c) => { notes.push(c); } }), true);
  assert.deepEqual(notes[1], { rows: 2, bad: 0 });
  const l = fv.addLocal('엄마', '집에서 남김');
  assert.ok(l.ok && l.msg.id.startsWith('l'));
  assert.deepEqual(fv.addLocal('엄마', '  '), { ok: false, why: 'empty' });
  // 쓴 말은 지금 시각(진짜 시계)으로 찍히니 차례는 보지 않는다
  assert.deepEqual(fv.allMsgs().map((x) => x.text).sort(), ['둘', '집에서 남김', '하나']);
  assert.match(fv.familyReadMd('2026-10-18'), /엄마\(태블릿에서\): "집에서 남김" — 아직/);
  // 저장소가 막힌 기기(사생활 창 등)에서도 멈추지 않는다
  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.deepEqual(fv.allMsgs(), []);
  assert.deepEqual(fv.addLocal('아빠', '되나'), { ok: false, why: 'save' }, '못 쓰면 남겼다고 하지 않는다 (Codex 95차 #1)');
  assert.equal(fv.familyReadMd('2026-10-18'), '', '받은 말이 없는 기기는 read.md를 안 올린다 (Codex 95차 #3)');
  assert.doesNotThrow(() => fv.renderLetter(null));
  delete globalThis.localStorage;
});

test('🔌 잇기 — 홈 맨 위(받기는 기다리지 않고) · 📊 한 줄 쓰기(📤 카드 다음) · 📤 family/read.md(못 만들면 그것만 빼고) · 앱 셸', () => {
  const home = read('js/home.js');
  assert.ok(home.includes('refreshLetter(letterBox()).catch(() => {});'));
  const fv = read('js/familyview.js');
  assert.ok(fv.includes('main.insertBefore(box, main.firstChild);'), '"오늘은 무엇을 공부할까?" 위');
  const st = read('js/stats.js');
  // 📤 카드 다음 — v361부터 그 사이에 ☁️ 자동 백업 카드(renderCloudCard)가 하나 선다
  assert.match(st, /renderUploadCard\(main\); \/\/ 📤 Claude에게 기록 보내기\n(  renderCloudCard\(main\);[^\n]*\n)?  renderLetterCard\(main\);/);
  assert.ok(st.includes("const box = card('💌 진우에게 한 줄');"));
  const up = read('js/upload.js');
  assert.ok(up.includes("getFamily ? await Promise.resolve().then(() => getFamily(today)).catch(() => null) : null;"));
  assert.ok(up.includes("[{ path: 'family/read.md', text: family }]"));
  assert.ok(up.includes('getFamily: familyNow,'));
  const sw = read('sw.js');
  assert.ok(sw.includes("'./js/familymsg.js'") && sw.includes("'./js/familyview.js'"));
});

test('📥 📊 받기 줄에 💌 메시지 — 받지 않은 줄이 있으면 ⚠️ + "메시지 확인해 줘" (Codex 95차 #6)', async () => {
  const { readSummary, PRIVATE_FAMILY } = await import('../js/upload.js');
  assert.equal(PRIVATE_FAMILY, MSG_PATH);
  const fmt = () => '10/18 12:00';
  assert.match(readSummary({ [MSG_PATH]: { ok: true, at: 1, n: 3 } }, fmt), /💌 메시지 ✅ 10\/18 12:00 \(3개\)/);
  assert.match(readSummary({ [MSG_PATH]: { ok: true, at: 1, n: 2, check: { rows: 2, bad: 1 } } }, fmt), /💌 메시지 ⚠️ .*받지 않은 줄 1 · Claude에게 "메시지 확인해 줘"/);
  assert.match(readSummary({ [MSG_PATH]: { ok: false, at: 1, why: '인터넷' } }, fmt), /💌 메시지 ❌/);
});
