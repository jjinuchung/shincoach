// 🛑 v292 블랙박스 — 2026-10-18 아버님 "영상 컨텐츠를 잘 따라하다가 갑자기 앱이 강제 종료처럼 되버린다고 하던데 원인 분석이 가능할려나?" → "진행하자"
// 꺼지는 순간에는 아무것도 못 적는다 → 살아 있는 동안 박동을 이 기기에 적고, 정상으로 닫히면(pagehide) 지운다.
// 다음에 켤 때 남은 박동 = 인사 없이 끝난 창 → usage/crash-log.md (보던 중 꺼짐 / 내려 둔 사이 닫힘 · 🗑 Chrome이 버린 창)
// node --test tests/blackbox292.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { crashOf, addCrash, crashLogText, crashLine, BEAT_MS, SETTLE_MS, BEAT_PREFIX, LOG_KEY, CRASH_DAYS, HEAP_EVERY, SPANS_KEEP } from '../js/blackbox.js';
import { gatherFiles } from '../js/upload.js';

const T = '2026-10-18';
const at = (hm, day = T) => new Date(`${day}T${hm}:00`).getTime();

test('🛑 남은 박동 → 꺼진 기록 한 줄 — 보이던 창은 보던 중 꺼짐 · 내린 창은 내려 둔 사이 닫힘(🗑은 그쪽에만) · 깨진 박동은 없음', () => {
  const b = { sid: 's', t0: at('11:00'), at: at('11:47'), vis: 1, view: 'player', over: ['shadow-overlay', 7], title: '스폰지밥', vt: 1392.7, play: 1, speak: 1, mic: 312, heap: 182.4, heapMax: 1024, nodes: 2310, err: '', ver: 'v292' };
  const fg = crashOf(b, { discarded: true });
  assert.deepEqual([fg.kind, fg.up, fg.vt, fg.heap, fg.over, fg.discarded], ['fg', 47, 1392, 182, ['shadow-overlay'], undefined], '보던 중 꺼짐에는 🗑을 안 붙인다');
  const bg = crashOf({ ...b, vis: 0 }, { discarded: true });
  assert.deepEqual([bg.kind, bg.discarded], ['bg', 1]);
  for (const bad of [null, 'x', {}, { at: 0 }, { at: 'x' }]) assert.equal(crashOf(bad), null);
  assert.equal(crashOf({ ...b, title: 'x'.repeat(300), err: 'e'.repeat(300) }).title.length, 80, '긴 글은 자른다');
});

test('🛑 꺼진 기록 더하기 — 같은 박동은 한 번 · 최근 14일 · 40줄 · 오래된 것부터', () => {
  let log = null;
  const ev = (t, kind = 'fg') => ({ at: t, kind });
  log = addCrash(log, ev(at('10:00')), T);
  log = addCrash(log, ev(at('10:00')), T);
  assert.equal(log.crashes.length, 1, '같은 박동');
  log = addCrash(log, ev(at('09:00'), 'bg'), T);
  log = addCrash(log, ev(at('09:00', '2026-10-01')), T);
  assert.deepEqual(log.crashes.map((c) => c.at), [at('09:00'), at('10:00')], `${CRASH_DAYS}일 넘은 것은 뺀다 · 차례`);
  for (let i = 0; i < 50; i++) log = addCrash(log, ev(at('12:00') + i), T);
  assert.equal(log.crashes.length, 40);
  assert.deepEqual(addCrash({ crashes: [null, { at: 5, kind: 'x' }, 'z'] }, null, T), { crashes: [] }, '깨진 줄은 버린다');
});

test('🛑 usage/crash-log.md 글 — 읽는 법 · 셈 · 줄마다 자리·영상·마이크·연 지·메모리·요소·오류·판 · 없으면 없다고 · 지금 시각은 안 적는다', () => {
  const log = {
    crashes: [
      crashOf({ t0: at('11:00'), at: at('11:47'), vis: 1, view: 'player', over: ['shadow-overlay'], title: '스폰지밥', vt: 1392, play: 1, speak: 1, mic: 312, heap: 182, heapMax: 1024, nodes: 2310, err: 'boom', ver: 'v292' }),
      crashOf({ t0: at('12:00'), at: at('12:30'), vis: 0, view: 'home', ver: 'v292' }, { discarded: true }),
      crashOf({ t0: at('13:00'), at: at('13:05'), vis: 1, view: 'math', ver: 'v292' }),
    ],
  };
  const text = crashLogText(log, T);
  assert.match(text, /^🛑 앱이 저절로 꺼진 기록 \(최근 14일 · 이 태블릿\)/);
  assert.ok(text.includes('## 보던 중 꺼짐 2번 · 내려 둔 사이 닫힘 1번'), '셈이 뒤바뀌면 안 된다');
  assert.ok(text.includes('- 10-18 13:05 · 보던 중 꺼짐 · 🔢 수학 · 연 지 5분 · v292'), text);
  assert.ok(text.includes('- 10-18 11:47 · 보던 중 꺼짐 · 🎤 영어 · 🗣 따라 말하기 · 「스폰지밥」 23:12 재생 중 · 🎤 마이크 듣는 중 · 마이크 312번째 · 연 지 47분 · 메모리 182/1024 MB · 요소 2,310 · 마지막 오류 "boom" · v292'), text);
  assert.ok(text.includes('- 10-18 12:30 · 내려 둔 사이 닫힘 🗑 · 🏠 홈 · 연 지 30분 · v292'), text);
  assert.equal(crashLogText(log, T), text, '같은 기록이면 같은 글 (올릴 때마다 바뀌지 않게)');
  assert.ok(crashLogText(null, T).includes('(최근 14일 저절로 꺼진 기록 없음)'));
  assert.ok(crashLogText(log, '2026-11-30').includes('보던 중 꺼짐 0번'), '오래된 것은 글에서 빠진다');
  assert.doesNotThrow(() => crashLogText({ crashes: [{ at: 'x' }, null, { at: at('10:00'), kind: 'fg', over: 'x' }] }, T));
  assert.match(crashLine({ at: at('10:00'), kind: 'fg', view: 'player', title: '긴 영화', vt: 3723, play: 0, up: 5 }), /「긴 영화」 1:02:03 멈춤/);
});

/** 가짜 브라우저 — blackbox.js(위쪽 규칙 + 아래쪽 박동)를 vm에서 돌린다 */
function loadBox({ store = new Map(), discarded = false, throwing = false } = {}) {
  let src = readFileSync(new URL('../js/blackbox.js', import.meta.url), 'utf8');
  src = src.replace(/^export /gm, '');
  const on = { win: {}, doc: {} };
  const timers = [];
  let now = at('11:00');
  const els = { 'view-player': { hidden: false }, 'view-home': { hidden: true }, video: { currentTime: 61.4, paused: false }, 'player-title': { textContent: '토이 스토리' }, review: { hidden: false }, 'shadow-overlay': { hidden: true } };
  const ls = {
    get length() { return store.size; },
    key: (i) => [...store.keys()][i],
    getItem: (k) => { if (throwing) throw new Error('quota'); return store.has(k) ? store.get(k) : null; },
    setItem: (k, v) => { if (throwing) throw new Error('quota'); store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
  };
  const document = {
    hidden: false, wasDiscarded: discarded,
    getElementById: (id) => els[id] || null,
    querySelectorAll: (sel) => (sel === '[id^="view-"]' ? Object.entries(els).filter(([k]) => k.startsWith('view-')).map(([id, e]) => ({ id, hidden: e.hidden })) : []),
    getElementsByTagName: () => ({ length: 1234 }),
    addEventListener: (t, fn) => { (on.doc[t] ||= []).push(fn); },
  };
  const window = { addEventListener: (t, fn) => { (on.win[t] ||= []).push(fn); } };
  const ctx = vm.createContext({
    console, JSON, Math, Number, String, Array, Object, Map, Set, Promise, RegExp,
    Date: class extends Date { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } },
    localStorage: ls, document, window,
    performance: { memory: { usedJSHeapSize: 150 * 1048576, jsHeapSizeLimit: 1024 * 1048576 } },
    caches: { keys: async () => ['shincoach-v291', 'shincoach-v292', 'other'] },
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    setInterval: (fn, ms) => { timers.push({ fn, ms, every: true }); return timers.length; },
  });
  vm.runInContext(src, ctx);
  const fire = (where, t, ev = {}) => (on[where][t] || []).forEach((fn) => fn(ev));
  const beats = () => [...store.entries()].filter(([k]) => k.startsWith(BEAT_PREFIX)).map(([k, v]) => [k, JSON.parse(v)]);
  return {
    ctx, store, els, document, timers, fire, beats,
    run: (code) => vm.runInContext(code, ctx),
    advance: (ms) => { now += ms; },
    settle: () => { for (const t of timers.filter((x) => !x.every && x.ms === SETTLE_MS)) t.fn(); },
    log: () => JSON.parse(store.get(LOG_KEY) || 'null'),
  };
}

test('🛑 박동 — 켜면 이 창 박동을 적고(화면·겹친 창·영상 제목·재생 자리·메모리·요소) · 5초마다(보일 때만) · 내리면 vis 0을 바로 · 정상으로 닫히면 지운다', async () => {
  const b = loadBox();
  b.run('initBlackbox()');
  await new Promise((r) => setTimeout(r, 0)); // 앱 판(caches) 읽기
  let [[key, beat]] = b.beats();
  assert.ok(key.startsWith(BEAT_PREFIX));
  assert.deepEqual([beat.vis, beat.view, beat.over, beat.title, beat.vt, beat.play, Math.round(beat.heap), beat.nodes], [1, 'player', ['review'], '토이 스토리', 61, 1, 150, 1234]);
  const every = b.timers.find((t) => t.every);
  assert.equal(every.ms, BEAT_MS);
  b.advance(BEAT_MS); every.fn();
  [[, beat]] = b.beats();
  assert.equal(beat.ver, 'v292', '앱 판 = 가장 큰 캐시');
  assert.equal(beat.at, at('11:00') + BEAT_MS);
  b.document.hidden = true; b.fire('doc', 'visibilitychange');
  [[, beat]] = b.beats();
  assert.equal(beat.vis, 0, '내릴 때 바로');
  const before = beat.at; b.advance(BEAT_MS); every.fn();
  assert.equal(b.beats()[0][1].at, before, '내려 둔 동안은 박동을 안 적는다');
  b.document.hidden = false;
  b.fire('win', 'shincoach:micstart'); b.fire('win', 'shincoach:micstart');
  assert.deepEqual([b.beats()[0][1].mic, b.beats()[0][1].speak], [2, 1], '마이크를 켠 수 · 듣는 중');
  b.fire('win', 'shincoach:micend'); b.fire('win', 'error', { message: 'x is not defined' });
  assert.deepEqual([b.beats()[0][1].speak, b.beats()[0][1].err], [0, 'x is not defined']);
  // 오류가 연달아 나도(매 화면마다 같은 오류) 바로 쓰는 것은 1초에 한 번까지 — 다음 박동이 마지막 오류를 적는다
  b.fire('win', 'error', { message: 'again' });
  assert.equal(b.beats()[0][1].err, 'x is not defined', '1초 안의 오류는 바로 안 쓴다');
  b.advance(1000); b.fire('win', 'error', { message: 'later' });
  assert.equal(b.beats()[0][1].err, 'later');
  b.fire('win', 'pagehide');
  assert.equal(b.beats().length, 0, '정상으로 닫히면 지운다');
  // 실제 Chrome은 떠날 때 pagehide 다음에 visibilitychange(숨김)를 보낸다 (v292 헤드리스에서 확인) — 그때 다시 쓰면 정상 종료가 꺼진 기록이 된다
  b.document.hidden = true; b.fire('doc', 'visibilitychange'); b.fire('win', 'error', { message: 'late' }); b.advance(BEAT_MS); b.timers.find((t) => t.every).fn();
  assert.equal(b.beats().length, 0, '닫힌 뒤에는 박동을 다시 안 쓴다');
  b.document.hidden = false;
  b.fire('win', 'pageshow', { persisted: true });
  assert.equal(b.beats().length, 1, 'bfcache에서 돌아오면 다시');
});

test('🛑 다음에 켤 때 — 남은 박동이 그대로면 끝난 창(기록 + 지움) · 그새 바뀌면 살아 있는 다른 창 · 🗑은 가장 최근에 내린 창에만 · 저장이 막혀도 던지지 않는다', () => {
  const store = new Map();
  const old = (sid, vis, t) => store.set(BEAT_PREFIX + sid, JSON.stringify({ sid, t0: t - 47 * 60000, at: t, vis, view: 'player', title: '스폰지밥', vt: 100, play: 1, mic: 9 }));
  old('dead', 1, at('10:40'));
  old('bg1', 0, at('09:00'));
  old('bg2', 0, at('10:00'));
  old('alive', 1, at('10:59'));
  const b = loadBox({ store, discarded: true });
  b.run('initBlackbox()');
  assert.equal(b.log(), null, '곧바로 정하지 않는다');
  old('alive', 1, at('11:00')); // 다른 창이 그새 박동
  b.settle();
  const log = b.log();
  assert.deepEqual(log.crashes.map((c) => [c.kind, c.at, c.discarded || 0]), [['bg', at('09:00'), 0], ['bg', at('10:00'), 1], ['fg', at('10:40'), 0]]);
  assert.deepEqual(log.crashes[2].up, 47);
  const left = b.beats().map(([k]) => k.slice(BEAT_PREFIX.length)).sort();
  assert.equal(left.includes('dead') || left.includes('bg1') || left.includes('bg2'), false, '끝난 창의 박동은 지운다');
  assert.ok(left.includes('alive'), '살아 있는 창은 그대로');
  // 막힌 저장소
  assert.doesNotThrow(() => loadBox({ throwing: true }).run('initBlackbox()'));
});

test('🛑 📤 잇기 — gatherFiles에 crashLog를 주면 usage/crash-log.md · 안 주면 없음(옛 부름) · sendOnce는 blackbox.crashLogNow를 · 앱이 켤 때 initBlackbox · 앱 셸에 두 파일', async () => {
  const base = { getMath: async () => null, listDaily: async () => [], mathReportText: () => '', asksText: () => '', collectTodo: () => [], today: T };
  assert.ok(!(await gatherFiles(base)).some((f) => f.path === 'usage/crash-log.md'));
  const files = await gatherFiles({ ...base, crashLog: '🛑 기록\n' });
  assert.equal(files.find((f) => f.path === 'usage/crash-log.md').text, '🛑 기록\n');
  const up = readFileSync(new URL('../js/upload.js', import.meta.url), 'utf8');
  assert.match(up, /const crashLog = await import\('\.\/blackbox\.js'\)\.then\(\(bb\) => bb\.crashLogNow\(today\)\)\.catch\(\(\) => null\);/, '못 만들어도 나머지는 올린다');
  assert.ok(up.includes('usagePlaces: usage ? usage.PLACES : undefined, crashLog, verLine, getReward: rewardNow,')); // v314 🏷️ 앱 판 줄이 사이에
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.ok(app.includes("import { initBlackbox } from './blackbox.js';"));
  assert.match(app, /\n {2}initBlackbox\(\);/);
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(sw.includes("'./js/blackbox.js',") && sw.includes("'./js/sounds.js',"));
  // 아이 화면에는 아무것도 안 그린다 — 블랙박스는 DOM을 읽기만 한다
  const bbSrc = readFileSync(new URL('../js/blackbox.js', import.meta.url), 'utf8');
  assert.equal(/textContent\s*=|innerHTML|appendChild|createElement/.test(bbSrc), false);
});

test('🔍 Codex 98차 ④ 두 창 — 숨긴 채 살아 있는 창 A를 B가 "내려 둔 사이 닫힘"으로 적어도, A가 다시 보이면 자기 이름의 기록을 지운다 · 진짜로 끝난 창의 기록은 그대로', () => {
  const store = new Map();
  const A = loadBox({ store });
  A.run('initBlackbox()');
  const sidA = A.beats()[0][0].slice(BEAT_PREFIX.length);
  A.document.hidden = true; A.fire('doc', 'visibilitychange'); // 내려 둠 — 박동 vis 0, 그 뒤로는 안 씀
  store.set(BEAT_PREFIX + 'dead', JSON.stringify({ sid: 'dead', t0: at('09:00'), at: at('09:30'), vis: 1, view: 'home' }));
  const B = loadBox({ store });
  B.run('initBlackbox()');
  B.settle();
  assert.deepEqual(B.log().crashes.map((c) => [c.sid, c.kind]).sort(), [['dead', 'fg'], [sidA, 'bg']].sort(), 'B는 A가 살아 있는지 알 수 없다');
  A.document.hidden = false; A.fire('doc', 'visibilitychange'); // A가 다시 보인다
  assert.deepEqual(A.log().crashes.map((c) => [c.sid, c.kind]), [['dead', 'fg']], '살아 돌아온 창의 기록은 지운다');
  assert.ok(A.beats().some(([k]) => k === BEAT_PREFIX + sidA), 'A는 박동을 다시 적는다');
  assert.equal(crashLine(A.log().crashes[0]).includes('dead'), false, '글에 창 이름은 안 나온다');
});

// ───────── v426 — 끝나기 전 일 · 최근 숨음 · 메모리 흐름 · 다음 창(간격과 열린 방식) (11-14 아버님 「영어 영상 하던 중에 갑자기 영어 콘텐츠에서 나가졌어 — 화면이 까매진 건 아니고 바로 다시 들어가 이어 했어」 · Codex 229차 「추천대로」) ─────────
test('🛑 v426 기록 한 줄 — 끝나기 전 일은 「N초 전」(0~한 시간 · 범위는 밀리초로 먼저 · 아는 것만 · 가까운 것부터) · 최근 숨음 · 메모리 흐름(둘 이상) · 다음 창(아는 방식만 · 있는 그대로)', () => {
  const end = at('10:22');
  const b = { sid: 's', t0: end - 58 * 60000, at: end, vis: 0, view: 'player', title: '레고 원피스 1화', vt: 933, play: 0, mic: 197, ver: 'v426',
    t: { hide: end - 3000, touch: end - 40000, mic: end - 12000, play: end + 5000, pause: 'x', freeze: end - 4000 * 1000, bogus: end - 1000, micEnd: end - 10400 },
    h: [20, 35, 'x', -1, 83],
    sp: [[end - 50000, 1200], [end - 130000, 400], ['x', 3], [end + 1000, 5], [end - 3700000, 9000], [end - 20000, 3000]] };
  const ev = crashOf(b, { now: end + 4000, nav: 'reload' });
  assert.deepEqual(ev.ago, { hide: 3, touch: 40, mic: 12, micEnd: 10 }, '나중 때·글자·한 시간 넘은 것·모르는 이름은 뺀다');
  assert.deepEqual([ev.mem, ev.gap, ev.nav], [[20, 35, 83], 4, 'reload']);
  assert.deepEqual(ev.hid, [[50, 1], [130, 0], [20, 3]], '숨은 순간 — 한 시간 안·깨진 것·미래는 빼고 [몇 초 전, 몇 초]');
  // 경계 (Codex 229차 P3-1) — 1ms 미래는 빼고, 정확히 한 시간은 넣고, 한 시간 + 1ms는 뺀다
  const edge = crashOf({ ...b, t: { hide: end + 1, touch: end - 3600000, mic: end - 3600001 }, sp: undefined });
  assert.deepEqual(edge.ago, { touch: 3600 });
  for (const k of ['weird', 'toString', 'constructor', '__proto__', '']) assert.equal(crashOf(b, { now: end + 4000, nav: k }).nav, undefined, `모르는 방식 ${k} (상속 이름도 · Codex 229차 P3-2)`);
  assert.equal(crashOf(b, { now: end - 1 }).gap, undefined, '거꾸로 간 시계는 간격 없음');
  assert.equal(crashOf({ ...b, h: Array.from({ length: 9 }, (_, i) => i + 1) }).mem.length, 6, '메모리는 마지막 여섯');
  assert.equal(crashOf({ ...b, sp: Array.from({ length: 9 }, (_, i) => [end - (i + 1) * 1000, 100]) }).hid.length, 5, '숨음은 마지막 다섯');
  const line = crashLine(ev);
  assert.ok(line.includes(' · 끝나기 전: 숨음 3초 전, 마이크 끔 10초 전, 마이크 켬 12초 전, 손댐 40초 전 · 최근 숨음: 20초 전 3초, 50초 전 1초, 2분 전 1초 안 · 메모리 흐름 20→35→83 MB · 다음 창 4초 뒤(다시 불러옴 reload)'), line);
  assert.ok(line.indexOf('v426') < line.indexOf('끝나기 전'), '옛 줄 꼴 뒤에 붙인다');
  assert.ok(crashLine({ ...ev, gap: 300, nav: 'navigate' }).includes('다음 창 5분 뒤(새로 엶 navigate)'));
  assert.ok(crashLine({ ...ev, gap: 7300, nav: 'toString' }).endsWith('다음 창 2시간 뒤'), '저장값이 깨져도 상속 이름은 안 쓴다');
  const plain = crashLine({ ...ev, ago: undefined, hid: undefined, mem: [44], gap: 0 });
  assert.equal(/끝나기 전|최근 숨음|메모리 흐름|다음 창/.test(plain), false, '없으면 안 쓴다(메모리 하나뿐이면 흐름 아님)');
  assert.doesNotThrow(() => crashLine({ at: end, kind: 'bg', ago: 'x', hid: 'y', mem: 'y', gap: 'z' }));
  assert.doesNotThrow(() => crashLine({ at: end, kind: 'bg', hid: [null, 'x', [1]] }));
  const read = crashLogText({ crashes: [ev] }, '2026-10-18');
  assert.ok(read.includes('- (v426) 끝나기 전 = 마지막으로 적어 둔 때에서 거슬러'), '읽는 법');
  assert.ok(read.includes('기록 없음 ≠ 안 함') && read.includes('다시 켜진 까닭(사람이 새로고침했는지 Chrome이 저절로 살렸는지)은 몰라요') && read.includes('보이는 동안 5분마다'), '읽는 법은 있는 그대로 (Codex 229차 P2)');
  assert.equal(/저절로 다시 켜짐/.test(read), false);
});

test('🛑 v426 박동 — 숨음·다시 보임·손댐·마이크 켬/끔·영상 재생/멈춤·❄️ 얼림/깨어남·오류의 때를 적고(얼림·깨어남은 바로 · 손댐은 다음 박동에) · 숨었다 돌아온 길이 · 메모리는 보일 때 5분마다 한 번 마지막 여섯', () => {
  const b = loadBox();
  b.run('initBlackbox()');
  const t0 = at('11:00');
  const every = b.timers.find((t) => t.every);
  const last = () => b.beats()[0][1];
  assert.deepEqual(last().h, [150], '켤 때 한 번');
  b.advance(1000); b.fire('doc', 'pointerdown');
  assert.equal(last().t, undefined, '손댐은 바로 쓰지 않는다 (Codex 229차)');
  b.advance(BEAT_MS); every.fn();
  assert.equal(last().t.touch, t0 + 1000, '다음 박동에 적힌다');
  b.advance(1000); b.fire('doc', 'play');
  b.advance(1000); b.fire('doc', 'pause');
  b.advance(1000); b.fire('win', 'shincoach:micstart');
  const s = t0 + 1000 + BEAT_MS;
  assert.deepEqual([last().t.play, last().t.pause, last().t.mic], [s + 1000, s + 2000, s + 3000], '마이크 켬은 바로 적는다(그 앞 것들도 함께)');
  b.advance(1000); b.fire('win', 'shincoach:micend');
  b.advance(1000); b.fire('win', 'error', { message: 'boom' });
  assert.deepEqual([last().t.micEnd, last().t.err], [s + 4000, s + 5000]);
  b.advance(1000); b.document.hidden = true; b.fire('doc', 'visibilitychange');
  assert.deepEqual([last().vis, last().t.hide], [0, s + 6000], '숨으면 그때를 바로');
  b.advance(1000); b.fire('doc', 'freeze');
  assert.equal(last().t.freeze, s + 7000, '얼리면 바로 적는다(숨은 동안에도)');
  b.advance(1000); b.fire('doc', 'resume'); b.document.hidden = false; b.fire('doc', 'visibilitychange');
  assert.deepEqual([last().t.resume, last().t.show, last().vis], [s + 8000, s + 8000, 1]);
  assert.deepEqual(last().sp, [[s + 6000, 2000]], '숨었다 돌아온 길이 [숨은 때, 밀리초]');
  b.fire('doc', 'visibilitychange');
  assert.equal(last().sp.length, 1, '숨지 않고 보임만 또 오면 안 늘린다');
  for (let i = 0; i < 6; i++) { b.document.hidden = true; b.fire('doc', 'visibilitychange'); b.advance(500); b.document.hidden = false; b.fire('doc', 'visibilitychange'); }
  assert.equal(last().sp.length, 5, '최근 다섯');
  assert.deepEqual(last().sp[4][1], 500);
  // 메모리 — 5분이 안 됐으면 안 적고, 5분마다 한 번 · 마지막 여섯 · 숨은 동안엔 안 잰다
  b.advance(BEAT_MS); every.fn();
  assert.deepEqual(last().h, [150]);
  for (let i = 1; i <= 7; i++) { b.ctx.performance.memory.usedJSHeapSize = (150 + i * 10) * 1048576; b.advance(HEAP_EVERY); every.fn(); }
  assert.deepEqual(last().h, [170, 180, 190, 200, 210, 220]);
  b.document.hidden = true; b.ctx.performance.memory.usedJSHeapSize = 999 * 1048576; b.advance(HEAP_EVERY); every.fn();
  assert.deepEqual(last().h, [170, 180, 190, 200, 210, 220], '숨은 동안엔 안 잰다');
  b.document.hidden = false; b.fire('doc', 'visibilitychange');
  assert.deepEqual(last().h, [170, 180, 190, 200, 210, 220], '다시 보여도 숨은 동안 잰 것이 없다');
  // 재다 오류가 나도 박동은 그대로
  Object.defineProperty(b.ctx.performance, 'memory', { get() { throw new Error('막힘'); }, configurable: true });
  b.advance(HEAP_EVERY);
  assert.doesNotThrow(() => every.fn());
});

test('🛑 v426 닫힌 뒤(pagehide) 얼림·깨어남이 와도 박동을 다시 안 쓴다 · bfcache로 돌아오면(pageshow persisted)만 다시 (Codex 229차)', () => {
  const b = loadBox();
  b.run('initBlackbox()');
  b.fire('win', 'pagehide');
  assert.equal(b.beats().length, 0);
  b.fire('doc', 'freeze'); b.fire('doc', 'resume'); b.document.hidden = true; b.fire('doc', 'visibilitychange');
  assert.equal(b.beats().length, 0, '닫힌 뒤 얼림·깨어남·숨음은 안 쓴다');
  b.document.hidden = false;
  b.fire('win', 'pageshow', { persisted: false });
  assert.equal(b.beats().length, 0, 'bfcache가 아니면 그대로');
  b.fire('win', 'pageshow', { persisted: true });
  assert.equal(b.beats().length, 1);
});

test('🛑 v426 다음에 켤 때 — 가장 최근에 끝난 창에만 다음 창 간격(이 창이 켜진 때까지)과 열린 방식 · 방식을 못 알면 간격만 · 가장 최근 것이 그새 살아 있으면 옛 창에도 안 붙인다', () => {
  const store = new Map();
  const old = (sid, vis, t, extra = {}) => store.set(BEAT_PREFIX + sid, JSON.stringify({ sid, t0: t - 58 * 60000, at: t, vis, view: 'player', title: '레고 원피스 1화', vt: 258, mic: 76, ...extra }));
  old('older', 1, at('09:14'));
  old('newest', 0, at('10:59') + 50000, { t: { hide: at('10:59') + 47000 } });
  const b = loadBox({ store });
  b.ctx.performance.getEntriesByType = (k) => (k === 'navigation' ? [{ type: 'reload' }] : []);
  b.run('initBlackbox()');
  b.settle();
  const [o, n] = b.log().crashes;
  assert.deepEqual([o.gap, o.nav], [undefined, undefined], '옛 창에는 안 붙인다');
  assert.deepEqual([n.gap, n.nav, n.ago], [10, 'reload', { hide: 3 }]);
  assert.ok(crashLine(n).includes('끝나기 전: 숨음 3초 전 · 다음 창 10초 뒤(다시 불러옴 reload)'), crashLine(n));
  // 방식을 못 알면(옛 Chrome · 막힘) 간격만
  const s2 = new Map();
  s2.set(BEAT_PREFIX + 'x', JSON.stringify({ sid: 'x', t0: at('10:00'), at: at('10:58'), vis: 0, view: 'home' }));
  const b2 = loadBox({ store: s2 });
  b2.ctx.performance.getEntriesByType = () => { throw new Error('없음'); };
  b2.run('initBlackbox()');
  b2.settle();
  assert.deepEqual([b2.log().crashes[0].gap, b2.log().crashes[0].nav], [120, undefined]);
  // 가장 최근 것이 그새 살아 있는 다른 창이면(박동이 바뀜) — 옛 창에도 간격을 넘겨 붙이지 않는다 (Codex 229차)
  const s3 = new Map();
  const put3 = (sid, t) => s3.set(BEAT_PREFIX + sid, JSON.stringify({ sid, t0: t - 60000, at: t, vis: 0, view: 'home' }));
  put3('gone', at('10:30'));
  put3('alive', at('10:59'));
  const b3 = loadBox({ store: s3 });
  b3.ctx.performance.getEntriesByType = () => [{ type: 'navigate' }];
  b3.run('initBlackbox()');
  put3('alive', at('11:00'));
  b3.settle();
  assert.deepEqual(b3.log().crashes.map((c) => [c.sid, c.gap, c.nav]), [['gone', undefined, undefined]]);
  assert.match(readFileSync(new URL('../js/version.js', import.meta.url), 'utf8'), /APP_VERSION = 'v4(2[6-9]|[3-9]\d)'/);
});
