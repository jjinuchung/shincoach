// 📮 v415 (2026-11-11 아버님 「추천대로」) — 💌 편지 포켓몬이 보낸 말 — node --test tests/family415.test.js
//   { from: 포켓몬 이름, mon: 도감 번호 } · 카드에 그 포켓몬 그림 자리 · [📮 답장하러 가기](읽음 + 우체통) · 아빠·엄마 카드는 그대로
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FROM, MON_ICON, msgOf, msgsOf, iconOf, gaOf, letterHtml, pastHtml, readMd } from '../js/familymsg.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const T = new Date(2026, 10, 11, 19, 30).getTime();
const mon = (id, from, text, n = 314, at = T) => ({ id, from, text, at, mon: n });

test('📮 고쳐 읽기 — 번호(1~1025)가 맞으면 한글 이름 1~8자 · 아빠·엄마 이름은 안 됨 · 번호가 틀리면 아빠·엄마만 · 보내는 이는 여전히 둘', () => {
  assert.deepEqual(Object.keys(FROM), ['아빠', '엄마']);
  assert.deepEqual(msgOf(mon('n1', '네오비트', '  보고 싶어\n진우야 ')), { id: 'n1', from: '네오비트', text: '보고 싶어 진우야', at: T, mon: 314 });
  assert.equal(msgOf({ id: 'n2', from: '볼비트', text: '안녕', at: '2026-11-11 19:30', mon: 313 }).mon, 313);
  for (const bad of [mon('b1', '아빠', '안녕'), mon('b2', 'Illumise', '안녕'), mon('b3', '네오비트비트비트비', '안녕'), mon('b4', '', '안녕'), mon('b5', '네오 비트', '안녕'), mon('b6', '네오비트', '   ')]) {
    assert.equal(msgOf(bad), null, JSON.stringify(bad));
  }
  for (const n of [0, -1, 1026, 3.5, '314', null]) assert.equal(msgOf(mon('c', '네오비트', '안녕', n)), null, `번호 ${n}이면 포켓몬이 아니다 → 아빠·엄마만`);
  assert.deepEqual(msgOf({ id: 'd', from: '아빠', text: '잘했어', at: T, mon: 'x' }), { id: 'd', from: '아빠', text: '잘했어', at: T }, '이상한 번호는 버리고 아빠 말 그대로');
  assert.deepEqual(msgsOf([mon('n1', '네오비트', '하나'), { id: 'a', from: '아빠', text: '둘', at: T + 1 }]).map((m) => [m.from, m.mon || 0]), [['네오비트', 314], ['아빠', 0]]);
});

test('📮 「가/이」 · 표시 — 받침이 있으면 「이」 · 아빠 👨 엄마 👩 포켓몬 📮', () => {
  assert.deepEqual(['아빠', '엄마', '네오비트', '볼비트', '피카츄', '뮤', '라프라스'].map(gaOf), Array(7).fill('가'));
  assert.deepEqual(['팬텀', '루카리온', '랄토스'.slice(0, 2) + '곰'].map(gaOf), ['이', '이', '이']);
  assert.equal(gaOf(''), '가');
  assert.equal(gaOf('ABC'), '가', '한글이 아니면 「가」');
  assert.deepEqual([iconOf({ from: '아빠' }), iconOf({ from: '엄마' }), iconOf({ from: '네오비트', mon: 314 }), iconOf(null)], ['👨', '👩', MON_ICON, '']);
});

test('🖼️ 카드 — 포켓몬이면 이름+「가 보낸 말」 · 그림 자리(번호) · [📮 답장하러 가기] · 글은 글자로만 · 아빠·엄마 카드 글자는 v414 그대로', () => {
  const h = letterHtml(msgOf(mon('n1', '네오비트', '<b>슬퍼</b>ㅠㅠ')));
  assert.ok(h.includes('class="letter is-mon"') && h.includes('aria-label="네오비트가 보낸 말"') && h.includes('💌 네오비트가 보낸 말 <span>📮 11/11 저녁</span>'));
  assert.ok(h.includes('<span class="letter-mon" data-mon="314" aria-hidden="true">📮</span>'), '그림 자리 — 못 넣으면 📮');
  assert.ok(h.includes('&lt;b&gt;슬퍼&lt;/b&gt;ㅠㅠ') && !h.includes('<b>'));
  assert.deepEqual([...h.matchAll(/class="btn[^"]*"/g)].map((x) => x[0]), ['class="btn btn-primary letter-ok"', 'class="btn letter-go"', 'class="btn letter-past"'], '고마워요 · 답장하러 가기 · 지난 말');
  assert.ok(h.includes('📮 답장하러 가기'));
  assert.ok(letterHtml(msgOf(mon('g1', '팬텀', '안녕', 94))).includes('💌 팬텀이 보낸 말'), '받침이 있으면 「이」');
  // 아빠 카드는 v414와 한 글자도 다르지 않다
  const dad = letterHtml(msgOf({ id: 'a1', from: '아빠', text: '멋졌어', at: T }));
  assert.equal(dad, '<section class="letter" data-id="a1" aria-label="아빠가 보낸 말"><p class="letter-from">💌 아빠가 보낸 말 <span>👨 11/11 저녁</span></p><p class="letter-text">멋졌어</p><div class="letter-foot"><button type="button" class="btn btn-primary letter-ok">💗 고마워요</button><button type="button" class="btn letter-past">💌 지난 말 보기</button></div></section>');
  assert.ok(!dad.includes('letter-go') && !dad.includes('letter-mon'));
  const list = msgsOf([{ id: 'a', from: '엄마', text: '하나', at: T }, mon('n1', '네오비트', '둘', 314, T + 1)]);
  const ph = pastHtml(list);
  assert.ok(ph.includes('<span class="letter-who">📮 네오비트 · 11/11 저녁</span>둘') && ph.includes('<span class="letter-who">👩 엄마 · 11/11 저녁</span>하나'));
  const md = readMd(list, { n1: T + 60000 }, '2026-11-11');
  assert.ok(md.startsWith('# 💌 한 줄 메시지 — 읽었나 (2026-11-11 · 이 기기 기준 — [💗 고마워요] 또는 [📮 답장하러 가기]를 누른 때)\n'), '읽음 = 두 단추 다 (Codex 219차 P3-2)');
  assert.ok(md.includes('📮 네오비트(포켓몬 편지): "둘" — 💗 읽음 11/11 19:31'));
  assert.ok(md.includes('👩 엄마: "하나" — 아직'));
});

// ───────────────────── 화면 (familyview — 가짜 칸) ─────────────────────

function fakeStorage(init = {}) {
  const m0 = new Map(Object.entries(init).map(([k, v]) => [k, JSON.stringify(v)]));
  return { getItem: (k) => (m0.has(k) ? m0.get(k) : null), setItem: (k, v) => { m0.set(k, String(v)); }, removeItem: (k) => m0.delete(k), _m: m0 };
}
function fakeBox() {
  const on = {};
  const qs = [];
  return { dataset: {}, innerHTML: '', qs, addEventListener: (t, f) => { on[t] = f; }, querySelectorAll: (sel) => { qs.push(sel); return []; }, click(cls, id) {
    const btn = { classList: { contains: (c) => c === cls }, closest: (s) => (s === '.letter' ? { dataset: { id } } : null) };
    on.click({ target: { closest: (s) => (s === 'button' ? btn : null) } });
  } };
}

test('📮 [답장하러 가기] — 읽음으로 하고 우체통 길을 부른다 · [💗 고마워요]는 길을 안 부른다 · 길이 없으면 읽음만 · 다음 말로 넘어간다', async () => {
  const cache = [mon('n1', '네오비트', '슬퍼ㅠㅠ'), { id: 'a1', from: '아빠', text: '잘했어', at: T + 1 }];
  globalThis.localStorage = fakeStorage({ 'shincoach.familyCache': cache });
  const fv = await import('../js/familyview.js');
  const box = fakeBox();
  let went = 0;
  fv.setLetterGo(() => { went += 1; });
  fv.renderLetter(box);
  assert.ok(box.innerHTML.includes('data-id="n1"') && box.innerHTML.includes('letter-go'), '안 읽은 맨 앞 — 네오비트');
  assert.deepEqual(box.qs, ['.letter-mon[data-mon]'], '그린 뒤 그림 자리를 찾는다');
  box.click('letter-go', 'n1');
  assert.equal(went, 1, '우체통으로');
  assert.ok(JSON.parse(globalThis.localStorage.getItem('shincoach.familySeen')).n1 > 0, '읽음');
  assert.ok(box.innerHTML.includes('data-id="a1"') && !box.innerHTML.includes('letter-go'), '다음 말(아빠)로 · 아빠 카드엔 길 단추 없음');
  box.click('letter-ok', 'a1');
  assert.equal(went, 1, '고마워요는 길을 안 부른다');
  assert.ok(box.innerHTML.includes('💌 지난 말 보기'));
  // 길이 없을 때(시험·옛 홈) — 읽음만
  globalThis.localStorage = fakeStorage({ 'shincoach.familyCache': [mon('n2', '네오비트', '또', 314, T + 5)] });
  fv.setLetterGo(null);
  const b2 = fakeBox();
  fv.renderLetter(b2);
  assert.doesNotThrow(() => b2.click('letter-go', 'n2'));
  assert.ok(JSON.parse(globalThis.localStorage.getItem('shincoach.familySeen')).n2 > 0);
  // 함수가 아닌 길은 없는 것으로 — 눌러도 멈추지 않는다
  fv.setLetterGo('x');
  globalThis.localStorage = fakeStorage({ 'shincoach.familyCache': [mon('n3', '네오비트', '셋', 314, T + 9)] });
  const b3 = fakeBox();
  fv.renderLetter(b3);
  assert.doesNotThrow(() => b3.click('letter-go', 'n3'));
  delete globalThis.localStorage;
});

test('🖼️ 그림 넣기 — 다 그려진 뒤에만 📮와 바꾼다 · 못 그리면 📮 그대로 · 그새 카드가 바뀌었으면 안 붙임 (Codex 219차 P3-1)', async () => {
  const { putArt } = await import('../js/familyview.js');
  const doc = { createElement: (t) => ({ tag: t }) };
  const spot = () => ({ isConnected: true, textContent: '📮', kids: [], appendChild(x) { this.kids.push(x); } });
  // 다 그려지면 바꾼다
  const s1 = spot();
  const img = putArt(s1, 'blob:a', doc);
  assert.deepEqual([img.tag, img.src, img.alt, img.width, img.height], ['img', 'blob:a', '', 72, 72]);
  assert.deepEqual([s1.textContent, s1.kids.length], ['📮', 0], '그리기 전엔 📮 그대로');
  img.onload();
  assert.deepEqual([s1.textContent, s1.kids], ['', [img]], '그린 뒤 그림으로');
  // 못 그리면(깨진 파일) — onload가 안 온다 → 📮 그대로
  const s2 = spot();
  putArt(s2, 'blob:broken', doc);
  assert.deepEqual([s2.textContent, s2.kids.length], ['📮', 0]);
  // 그리는 사이 카드가 바뀌면(읽음 → 다음 말) 옛 자리에 안 붙인다
  const s3 = spot();
  const i3 = putArt(s3, 'blob:b', doc);
  s3.isConnected = false;
  i3.onload();
  assert.deepEqual([s3.textContent, s3.kids.length], ['📮', 0]);
  // 주소가 없거나 이미 떨어진 자리 — 그림을 만들지도 않는다
  assert.equal(putArt(spot(), '', doc), null);
  assert.equal(putArt({ ...spot(), isConnected: false }, 'blob:c', doc), null);
});

test('🔌 잇기 — 홈이 길을 준다(⏳ 영어 시간 관문 → 우체통) · 그림은 그때 불러옴 · 📊 보낸 말 목록 표시 · CSS · sw v415', () => {
  const home = read('js/home.js');
  assert.ok(home.includes("setLetterGo(() => import('./timeup.js').then(({ guardStart }) => guardStart('english', () => showView('letters'))).catch(() => {}));"));
  assert.ok(home.includes('refreshLetter(letterBox()).catch(() => {});'), '홈 맨 위 그대로');
  const fv = read('js/familyview.js');
  assert.match(fv, /import\('\.\/pokemon\.js'\)\.then\(\(\{ characterUrl, ensureArt \}\) =>/);
  assert.ok(fv.includes("box.querySelectorAll('.letter-mon[data-mon]')"));
  assert.ok(read('js/stats.js').includes('${iconOf(m)} ${m.from}'), '📊 보낸 말 목록에 「undefined」가 안 뜨게');
  const css = read('css/style.css');
  for (const s of ['.letter.is-mon {', '.letter-row {', '.letter-mon {', '.letter-mon img {', '.letter-go {']) assert.ok(css.includes(s), s);
  assert.ok(Number((/CACHE_VERSION = 'v(\d+)'/.exec(read('sw.js')) || [])[1]) >= 415, 'sw v415 이상');
  assert.ok(Number((/APP_VERSION = 'v(\d+)'/.exec(read('js/version.js')) || [])[1]) >= 415, '앱 판 v415 이상');
});
