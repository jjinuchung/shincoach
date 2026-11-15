// v428 📰 신문 칸 — 📤 보고·검사·자료 칸 (2026-11-15 아버님 기본안 다섯 「추천대로」) — node --test tests/news428rep.test.js
//  📤 국어 요약(korreport)에 「📰 신문 기사」 절 · 읽은 글·자주 틀린 물음 줄에 📰 · 🖊️ 논술 절에 신문 주제 줄(nonsulNewsDay) ·
//  upload.korReportNow가 이 기기 사본(news.loadNews)을 넘김 · check.mjs가 공개 저장소의 news/ 자리를 막음 · privcheck가 news/n1~n4.json을 앱과 같은 검사로
//  ★ 기사 글은 저작권 — 이 시험의 기사·주제는 모두 지어낸 것이다(실제 기사 문장·제목을 넣지 않는다)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { circled, checkContent, validCards, dayNum } from '../js/korean.js';
import { checkNonsul, allTopics } from '../js/nonsul.js';
import { allWords } from '../js/korwords.js';
import { allPuzzles } from '../js/korpuzzle.js';
import { NEWS_ORDER } from '../js/kordrip.js';
import { NEWS_PATHS } from '../js/news.js';
import { PRIVATE_MAX_BYTES } from '../js/upload.js';
import { korReportText, korReportFromRaw, readLines, newsLines, newsNonsulLines } from '../js/korreport.js';
import { checkPrivateDir, newsProblems, isNewsPath, publicNewsHits, PUBLIC_NEWS_DIRS } from '../tools/privcheck.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const R = (n) => JSON.parse(read(`coach/korean/${n}.json`));
const DATA = R('reading');
const CARDS = validCards(DATA);
const NS = R('nonsul');
const BASE = { cards: CARDS, words: allWords(R('words'), CARDS), puzzles: allPuzzles(R('puzzles'), CARDS) };
const TODAY = '2026-11-15';
const T = new Date(2026, 10, 15, 12).getTime();
const D = dayNum(T);
const svg = () => '<svg>';

// ───────────────────── 지어낸 기사 ─────────────────────
const LINES = 24;
/** 지어낸 신문 카드 — n 번호 · 24줄 · 근거는 ②·㉑·㉓·㉔ */
function card(n, o = {}) {
  const lines = ['[제목] 해오름 마을에 반딧불 공원이 생겼다'];
  for (let k = 2; k <= LINES; k++) lines.push(`해오름 마을 소식 ${k}번째 문장이에요.`);
  const evQ = (i, ev) => ({
    id: `K${n}-${i}`, skill: '내용 확인', q: `${i}번 물음 — 기사에 쓰여 있는 것은 무엇인가요?`,
    opts: [
      { t: `맞는 보기 ${i}`, ok: true },
      { t: `지어낸 보기 ${i}`, type: 'make', why: `기사에 없는 말이에요. ${circled(ev)}을 다시 보세요.` },
      { t: `반대 보기 ${i}`, type: 'flip', why: '기사와 반대로 읽었어요.' },
      { t: `한 부분 보기 ${i}`, type: 'detail', why: '한 부분만 말하고 있어요.' },
    ],
    ev: [ev], evQ: '어느 문장에서 알 수 있나요?', evNote: `${circled(ev)}에 쓰여 있어요.`,
  });
  return {
    id: `K${n}`, kind: 'news', layout: 'rows', icon: '🌳', title: o.title || `반딧불 공원 소식 ${n}`, genre: '신문 기사', skill: '기사 읽기',
    source: '지어낸 어린이신문 2026년 2월 2일 3면 · 시험 기자',
    meta: ['📰 신문 기사', '[4국02-01] 시험'], news: { article: `${n - 700}-1`, paper: '지어낸 어린이신문', date: '2026년 2월 2일', page: '3면' },
    deco: { captions: ['공원에 모인 아이들(지어낸 사진 설명)'] },
    words: [['공원', '여럿이 쉬고 놀 수 있게 꾸민 곳']],
    lines,
    qs: [evQ(1, 2), evQ(2, 21), evQ(3, 23), evQ(4, 24), {
      id: `K${n}-5`, skill: '중심 생각', q: '이 기사가 전하는 중심 내용은 무엇인가요?',
      opts: [
        { t: '마을에 공원이 새로 생겼다', ok: true },
        { t: '공원이 문을 닫았다', type: 'flip', why: '반대예요. 제목을 다시 보세요.' },
        { t: '이야기 한 줄만', type: 'detail', why: '한 부분이에요.' },
        { t: '눈이 많이 내렸다', type: 'make', why: '기사에 없는 이야기예요.' },
      ],
      ev: null, doneNote: '제목과 첫 문장을 이어 읽으면 보여요.', hint2: '제목을 다시 읽어 보세요.',
    }],
    ...o.extra,
  };
}
/** 지어낸 신문 논술 주제 — 카드 n과 같은 번호 */
function topic(n, o = {}) {
  return {
    id: `N${n}`, icon: '🌙', card: `K${n}`, intro: '반딧불 공원 기사를 읽고 생각해 봐요.', q: '마을 공원은 밤에도 열어야 할까요?',
    yes: { label: '열어야 해요', claim: '나는 밤에도 열어야 한다고 생각해요.', close: '그래도 나는 밤에도 여는 것이 좋다고 생각해요.', reasons: ['낮에 바쁜 사람도 공원에 갈 수 있어요.', '밤에 반딧불을 볼 수 있어요.', '어른들이 일을 마치고 올 수 있어요.'], ev: [[21], [22], []] },
    no: { label: '닫아야 해요', claim: '나는 밤에는 닫아야 한다고 생각해요.', close: '그래도 나는 밤에는 쉬는 것이 좋다고 생각해요.', reasons: ['일하는 사람도 쉬어야 해요.', '밤에는 전기를 많이 써요.', '밤길은 어두워서 위험해요.'], ev: [[23], [], [24]] },
    off: [{ t: '공원 의자는 초록색이에요.', why: '밤에 여는 것과 상관없는 말이에요.', ev: [5] }, { t: '공원에 수영장이 생겼어요.', why: '글에 없는 이야기예요. 기사에 수영장 말은 없어요.', made: true }],
    ...o,
  };
}
const row = (n, o = {}) => ({ card: card(n, o.card), ...(o.noTopic ? {} : { topic: topic(n, o.topic) }) });
/** 읽은 기록 한 줄 (korean.readOf 꼴) */
const rd = (c, o = {}) => ({ c, t: T + (o.t || 0), d: D, s: 200, a: 60, n: 5, f: 3, x: 0, e: 0, h: 0, g: 1, m: '', ...o });

// ───────────────────── 📤 국어 요약 ─────────────────────
test('📤 국어 요약 — 📰 신문 기사 절(별·처음 날·틀린 물음 · 완료 기록 없는 기사는 번호만) · 공개 글 절과 셈이 섞이지 않는다 · 읽은 글·자주 틀린 물음 줄에 📰와 제목', () => {
  const news = [card(790, { title: '반딧불 공원이 문을 열었어요' }), card(791, { title: '해오름 시장에 새 다리가 놓였어요' }), card(792)];
  const p = {
    korDone: { 'K790:1': D - 1, 'K790:2': D, 'K3:1': D, 'K799:1': D - 3 }, // K799 = 받아 둔 기사에 없는 기사의 별 기록
    korQMiss: { 'K790-2': 2, 'K791-4': 1, 'K3-1': 1 },
    korReads: [rd('K790', { g: 2 }), rd('K3', { t: 1 })],
  };
  const t = korReportText(p, { ...BASE, news }, TODAY, []);
  const L = t.split('\n');
  assert.ok(t.includes(`## 글 — ${CARDS.length}편 중 별을 받은 글 1편 (★★★ 0 · ★★ 0 · ★ 1)`), '공개 글 절은 공개 카드만 센다');
  const h = L.findIndex((l) => l.startsWith('## 📰 신문 기사 (v428'));
  assert.ok(h > L.findIndex((l) => l.startsWith('## 글 — ')) && h < L.indexOf('## 잘못 읽기 (모두 합친 수)'), '공개 글 절 다음 · 잘못 읽기 앞');
  assert.equal(L[h + 1], '- 3편 중 별을 받은 기사 1편 (★★★ 0 · ★★ 1 · ★ 0)');
  assert.equal(L[h + 2], '- 📰 K790 「반딧불 공원이 문을 열었어요」 ★★ — 처음 11-14 · 틀린 물음 K790-2(2)');
  assert.equal(L[h + 3], '- 📰 K791 「해오름 시장에 새 다리가 놓였어요」 ☆ — 별 없음 · 틀린 물음 K791-4(1)');
  assert.equal(L[h + 4], '- 완료 기록이 없는 기사 1편(아직 안 열린 기사도 들어요): K792');
  assert.ok(L[h + 5].startsWith('- 받아 둔 기사에 없는데 별 기록이 있는 기사 1편(') && L[h + 5].endsWith('): K799'), '받아 둔 기사 밖의 별 기록도 조용히 빠지지 않는다');
  // 공개 「완료 기록이 없는 글」에 신문 기사가 끼지 않는다
  const un = L.find((l) => l.startsWith('- 완료 기록이 없는 글 '));
  assert.ok(un && !un.includes('K790') && !un.includes('K792'));
  // 읽은 글 — 제목이 붙고 📰 (「?」로 새지 않는다)
  const r = L.find((l) => l.includes('K790 「'));
  assert.ok(r.startsWith('- 11-15 📰 K790 「반딧불 공원이 문을 열었어요」 ★★ 새로'), r);
  assert.ok(!/K7\d\d 「\?」/.test(t), '신문 카드를 받아 두었으면 제목 없는 줄이 없다');
  assert.ok(L.some((l) => l.startsWith('- 11-15 K3 「')), '공개 글 줄은 그대로(📰 없음)');
  // 자주 틀린 물음 — 신문 물음도 같은 목록에 📰로
  const top = L.filter((l) => /^- K\d+-\d /.test(l));
  assert.deepEqual(top.map((l) => l.split(' ')[1]), ['K790-2', 'K3-1', 'K791-4']);
  assert.ok(top[0].startsWith('- K790-2 📰 「반딧불 공원이 문을 열었어요」 내용 확인 — 2번 · 물음: 2번 물음'));
  assert.ok(!top[1].includes('📰'));
});

test('📤 국어 요약 — 신문 기사를 받아 두지 못한 기기: 별 기록이 있으면 번호만 한 줄 · 기록도 없으면 절이 없고 v428 전과 같은 글', () => {
  const p = { korDone: { 'K790:1': D, 'K805:1': D, 'K3:1': D }, korQMiss: { 'K790-1': 3 }, korReads: [rd('K790')] };
  const t = korReportText(p, BASE, TODAY, []);
  assert.ok(t.includes('## 📰 신문 기사 (v428'));
  assert.ok(t.includes('- 이 기기에 받아 둔 기사가 없어 제목을 못 붙였어요 — 별 기록이 있는 기사 2편: K790 · K805\n'));
  assert.ok(t.includes('- 11-15 📰 K790 (이 기기에 받아 둔 기사에 없어 제목 모름) ★ 새로'), '읽은 글 줄도 「?」 대신 까닭');
  assert.ok(!/K7\d\d 「\?」/.test(t), '「K7xx 「?」」로 새지 않는다');
  assert.ok(!t.includes('K790-1'), '물음을 모르면 자주 틀린 물음에 넣지 않는다(옛 규칙 그대로)');
  const plain = { korDone: { 'K3:1': D } };
  const a = korReportText(plain, BASE, TODAY, []);
  assert.ok(!a.includes('📰 신문'), '신문 기록이 없으면 절이 없다');
  assert.equal(korReportText(plain, { ...BASE, news: [], newsTopics: [] }, TODAY, []), a, '빈 신문 목록은 없는 것과 같다');
  assert.deepEqual(newsLines([], {}, {}), []);
  assert.deepEqual(newsLines(null, null, null), []);
});

test('📤 🖊️ 논술 절 — 📰 신문 논술 줄(열린 주제 = ★ 받은 기사 · ⭐ · 다시 볼 · 해 본 · 판을 끝낸 날은 nonsulNewsDay) · 다시 볼 주제는 기사 제목과 · 생활 논술 줄은 그대로', () => {
  const news = [card(790, { title: '반딧불 공원이 문을 열었어요' }), card(791), card(792)];
  const topics = [topic(790), topic(791), topic(792)];
  const prof = {
    korDone: { 'K790:1': D - 2, 'K791:1': D - 1 },
    nonsul: { N790: { box: 0, due: D + 1, at: T, miss: 1, d0: D }, N791: { box: 1, due: 0, at: T - 5, miss: 0, d0: D - 1 }, N5: { box: 1, due: 0, at: T, miss: 0, d0: D } },
    nonsulNewsDay: { [D]: 1, [D - 1]: 1 },
    nonsulDay: { [D]: 1, [D - 1]: 1, [D - 2]: 1 },
  };
  const L = newsNonsulLines(topics, news, prof, T);
  assert.equal(L.length, 2);
  assert.ok(L[0].startsWith('- 📰 신문 논술 (v428 — '));
  assert.ok(L[0].endsWith('): 열린 주제 2/3 · ⭐ 처음부터 다 맞힌 주제 1/3 · 다시 볼 주제 1 · 해 본 주제 2 · 최근 7일 중 판을 끝낸 날 2'), L[0]);
  assert.equal(L[1], '- 📰 다시 볼 신문 주제: N790 「반딧불 공원이 문을 열었어요」');
  // 날 칸이 없으면(논술 칸이 아직 안 만든 옛 프로필) 0 — 생활 논술 날(nonsulDay)을 세지 않는다
  assert.ok(newsNonsulLines(topics, news, { ...prof, nonsulNewsDay: undefined }, T)[0].endsWith('최근 7일 중 판을 끝낸 날 0'));
  assert.deepEqual(newsNonsulLines([], news, prof, T), [], '신문 주제가 없으면 줄이 없다');
  // 요약 글 안 — 생활 논술 세 줄 다음 · 생활 논술 줄은 생활 주제만 센다
  const pub = allTopics(NS);
  const t = korReportText(prof, { ...BASE, nonsul: pub, news, newsTopics: topics }, TODAY, []);
  const S = t.split('\n');
  const i = S.indexOf('## 🖊️ 논술');
  assert.ok(S[i + 1].startsWith('- 🖊️ 논술: ⭐ 처음부터 다 맞힌 주제 1/') && S[i + 1].includes(`/${pub.length} · `) && S[i + 1].endsWith('최근 7일 중 판을 끝낸 날 3'));
  assert.ok(S[i + 4].startsWith('- 📰 신문 논술 (v428') && S[i + 5].startsWith('- 📰 다시 볼 신문 주제: '));
  // 생활 논술 원고가 없어도 신문 주제가 있으면 절이 생긴다 · 둘 다 없으면 절이 없다
  const only = korReportText(prof, { ...BASE, news, newsTopics: topics }, TODAY, []).split('\n');
  const j = only.indexOf('## 🖊️ 논술');
  assert.ok(j > 0 && only[j + 1].startsWith('- 📰 신문 논술 (v428') && only[j + 2].startsWith('- 📰 다시 볼 신문 주제: '), '생활 논술 세 줄 없이 신문 줄만');
  assert.ok(!korReportText(prof, { ...BASE, news }, TODAY, []).includes('## 🖊️ 논술'));
});

test('📤 받은 원고 + 📰 사본 (korReportFromRaw의 다섯째 칸) — 깨진 카드·겹친 id·짝 없는 주제·깨진 주제는 빼고 · 다섯째 칸이 없거나 깨져도 요약은 그대로 · 🔤 낱말에 기사 낱말도', () => {
  const raw4 = [DATA, R('words'), R('puzzles'), NS];
  const p = { korDone: { 'K790:1': D, 'K791:1': D }, korQMiss: { 'K790-3': 1 } };
  const broken = card(793, { extra: { qs: card(793).qs.slice(0, 4) } }); // 물음 넷 — 신문 카드는 다섯
  const nw = {
    cards: [card(790), card(791), broken, card(790, { title: '겹친 번호' })],
    topics: [topic(790), topic(791, { card: 'K790' }), topic(799), topic(793)],
  };
  const t = korReportFromRaw(p, [...raw4, nw], TODAY, []);
  assert.ok(t.includes('- 2편 중 별을 받은 기사 2편 (★★★ 0 · ★★ 0 · ★ 2)'), '깨진 K793·겹친 K790은 뺌');
  assert.ok(!t.includes('겹친 번호') && !t.includes('K793'));
  assert.ok(t.includes(': 열린 주제 1/1 · '), '주제는 짝 카드가 있고 검사를 통과한 N790 하나만');
  assert.ok(t.includes('- K790-3 📰 「반딧불 공원 소식 790」'));
  // 🔤 — 기사 📖 낱말(★ 받은 기사)도 센다(앱 🔤 칸과 같게)
  const plain = korReportFromRaw(p, raw4, TODAY, []);
  assert.equal(plain, korReportText(p, { ...BASE, nonsul: allTopics(NS) }, TODAY, []), '다섯째 칸이 없으면 v428 전과 같은 글');
  const passage = (s) => s.split('\n').find((l) => l.startsWith('- 📖 '));
  assert.ok(passage(plain) && passage(t));
  assert.notEqual(passage(t), passage(plain), '📖 낱말 줄에 기사 낱말이 더해진다');
  for (const bad of [null, 'x', { cards: 'x' }, { cards: [], topics: [topic(790)] }, { topics: [topic(790)] }]) {
    const s = korReportFromRaw(p, [...raw4, bad], TODAY, []);
    assert.ok(typeof s === 'string' && s.includes('## 📰 신문 기사') && s.includes('받아 둔 기사가 없어'), `깨진 사본 ${JSON.stringify(bad)} — 요약은 그대로 · 신문은 번호만`);
    assert.ok(!s.includes('📰 신문 논술'));
  }
  // 공개 원고가 깨졌으면 신문 사본이 있어도 null (옛 규칙 그대로 — 좋은 요약을 덮지 않게)
  assert.equal(korReportFromRaw(p, [{ cards: [] }, R('words'), R('puzzles'), NS, nw], TODAY, []), null);
});

test('📤 upload.korReportNow — 이 기기 사본(news.loadNews)을 다섯째 칸으로 · 못 읽으면 null 칸(신문 절만 빠짐) · 꼴 검사(korReportFromRaw)를 그대로 거친다', () => {
  const u = read('js/upload.js');
  const fn = u.slice(u.indexOf('async function korReportNow(today, days) {'), u.indexOf('\n}\n', u.indexOf('async function korReportNow(today, days) {')));
  const at = fn.indexOf("try { raw.push(await (await import('./news.js')).loadNews()); } catch { raw.push(null); }");
  assert.ok(at > fn.indexOf("fetch('./coach/korean/nonsul.json')"), '논술 원고(넷째) 다음 다섯째');
  assert.ok(at < fn.indexOf('return kr.korReportFromRaw(p, raw, today, days);'));
  assert.ok(!/^import .*news\.js/m.test(u), 'upload.js는 news.js를 쓸 때만 불러온다(news.js도 upload.js를 쓸 때만 — 순환 없음)');
});

// ───────────────────── 🔒 비공개 검사 (check.mjs --private) ─────────────────────
test('🔒 privcheck — news/n1~n4.json 중 있는 것을 앱과 같은 검사로 · 신문만 있는 폴더도 검사한 것 · 깨진 줄·주제·겹친 id·NEWS_ORDER 밖·줄 꼴·다른 파일 이름·크기·JSON', () => {
  const dir = mkdtempSync(join(tmpdir(), 'news428-'));
  const put = (rel, v) => writeFileSync(join(dir, rel), typeof v === 'string' ? v : JSON.stringify(v));
  try {
    mkdirSync(join(dir, 'news'));
    put('news/n1.json', [row(790), row(791, { noTopic: true })]);
    assert.deepEqual(checkPrivateDir(dir, svg), { errors: [], checked: ['news/n1.json'] }, '신문만 올릴 때도 「검사할 파일이 없음」이 아니다');
    const errs = (v, rel = 'news/n2.json') => { put(rel, v); const e = checkPrivateDir(dir, svg).errors; rmSync(join(dir, rel)); return e; };
    let e = errs([row(790)]);
    assert.equal(e.length, 1, e.join('\n'));
    assert.ok(e[0].includes('news/n2.json[0]') && e[0].includes('id가 겹쳐요'), '앞 파일(n1)과 겹친 id — 앱은 앞 파일 것을 쓴다');
    e = errs([row(787)]);
    assert.ok(e.length === 1 && e[0].includes('K787는 kordrip NEWS_ORDER에 없어'), '아버님이 뺀 기사(K787)는 앱이 열지 않는다');
    assert.ok(errs([row(900)])[0].includes('NEWS_ORDER에 없어'));
    e = errs([{ card: card(792, { extra: { qs: card(792).qs.slice(0, 4) } }) }, row(793, { topic: { id: 'N794' } }), { card: card(795), topic: topic(795), note: '메모' }, 'x']);
    assert.ok(e.some((m) => m.includes('[0]') && m.includes('물음은 정확히 5개')), e.join('\n'));
    assert.ok(e.some((m) => m.includes('[1]') && m.includes('주제 ')), '깨진 주제(번호가 카드와 다름)');
    assert.ok(e.some((m) => m.includes('[2]') && m.includes('줄에는 card·topic만 — note')));
    assert.ok(e.some((m) => m.includes('[3]') && m.includes('줄은 { card, topic? }')));
    e = errs([row(792)], 'news/n5.json');
    assert.ok(e.length === 1 && e[0].includes('n5.json') && e[0].includes('만 받아요'), '앱은 n1~n4만 받는다');
    assert.ok(errs('[').some((m) => m.startsWith('JSON 오류:')));
    assert.ok(errs({ list: [] }).some((m) => m.includes('배열이 아님')));
    assert.ok(errs(`${' '.repeat(PRIVATE_MAX_BYTES)}[]`).some((m) => m.startsWith('크기 오류:')), '앱이 통째로 안 받을 크기는 올리기 전에');
    // 다른 비공개 파일과 함께
    mkdirSync(join(dir, 'essay'));
    put('essay/fixes.json', [{ fixed: '고친 글' }]);
    assert.deepEqual(checkPrivateDir(dir, svg), { errors: [], checked: ['essay/fixes.json', 'news/n1.json'] });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('🔒 privcheck newsProblems — 넷이 다 있으면 NEWS_ORDER의 기사가 모두 있어야 · 한 파일만 고쳐 올릴 때는 빠진 것을 묻지 않는다 · 104편 26편씩이면 통과', () => {
  assert.equal(NEWS_ORDER.length, 104);
  const files = Object.fromEntries(NEWS_PATHS.map((p, k) => [p, NEWS_ORDER.slice(k * 26, (k + 1) * 26).map((id) => row(Number(id.slice(1)), { noTopic: k % 2 === 1 }))]));
  assert.deepEqual(newsProblems(files), []);
  const short = { ...files, 'news/n4.json': files['news/n4.json'].slice(0, 24) };
  const e = newsProblems(short);
  assert.equal(e.length, 1);
  assert.ok(e[0].includes('NEWS_ORDER의 기사 2편이 네 파일에 없어요') && e[0].includes('K748 K761'), e[0]);
  assert.deepEqual(newsProblems({ 'news/n4.json': short['news/n4.json'] }), [], '한 파일만이면 빠진 것은 안 묻는다');
  assert.deepEqual(newsProblems({}), []);
  assert.deepEqual(newsProblems(null), []);
});

// ───────────────────── 🔒 공개 저장소 막음 (check.mjs) ─────────────────────
test('🔒 check.mjs — 공개 저장소에 news/ 자리(어느 깊이든 · 빈 폴더 자리도)가 있으면 실패 · js/news.js 같은 파일 이름은 괜찮다 · 지금 저장소는 깨끗 · .context 자료는 git이 무시', () => {
  for (const p of ['news/n1.json', 'coach/korean/news/n2.json', 'a\\news\\b.json', 'x/news/']) assert.equal(isNewsPath(p), true, p);
  for (const p of ['js/news.js', 'js/newsview.js', 'tests/news428rep.test.js', 'tests/kornews265.test.js', 'newsroom/a.json', 'kornews/a.json', 'news.json']) assert.equal(isNewsPath(p), false, p);
  assert.deepEqual(PUBLIC_NEWS_DIRS, ['news', 'coach/news', 'coach/korean/news']);
  assert.deepEqual(publicNewsHits(['js/news.js', 'news/n1.json', 'coach/news/a.json', 'news/n1.json'], (d) => d === 'coach/korean/news'), ['coach/korean/news/', 'news/n1.json', 'coach/news/a.json']);
  assert.deepEqual(publicNewsHits(['js/news.js'], () => false), []);
  // 지금 저장소 — git이 올릴 수 있는 파일 중 news/ 안의 것이 없다
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n').filter(Boolean);
  assert.ok(files.length > 100);
  assert.deepEqual(publicNewsHits(files), []);
  // 비공개 저장소에 올릴 자료(make_upload.mjs가 만드는 곳)는 git이 무시한다
  assert.equal(spawnSync('git', ['check-ignore', '-q', '.context/news1114/upload/news/n1.json']).status, 0, '.context는 git 무시');
  // check.mjs가 실제로 부른다
  const chk = read('tools/check.mjs');
  assert.ok(chk.includes("execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard']") && chk.includes('for (const f of publicNewsHits(tracked)) { bad++;'));
});

test('🔒 check.mjs 길 — 공개 원고 검사(checkContent·checkNonsul)가 신문 카드(kind news · K701~K999)·신문 주제(N701~N999)를 막는다', () => {
  const chk = read('tools/check.mjs');
  assert.ok(chk.includes('for (const msg of checkContent(data)) { bad++;') && chk.includes("readFileSync('coach/korean/reading.json', 'utf8')"), 'reading.json → korean.checkContent');
  assert.ok(chk.includes('for (const msg of checkNonsul(nonsul)) { bad++;') && chk.includes("readFileSync('coach/korean/nonsul.json', 'utf8')"), 'nonsul.json → nonsul.checkNonsul');
  assert.deepEqual(checkContent(DATA), [], '지금 공개 원고는 통과');
  assert.deepEqual(checkNonsul(NS), []);
  // 신문 카드를 그대로 공개 원고에 넣으면 · kind만 바꿔 넣어도(번호 몫) 막힌다
  const asIs = checkContent({ ...DATA, cards: [...DATA.cards, card(790)] });
  assert.ok(asIs.some((m) => m.startsWith('K790:') && m.includes('신문')), asIs.join('\n'));
  const { news: _n, deco: _d, ...rest } = card(791);
  const disguised = checkContent({ ...DATA, cards: [...DATA.cards, { ...rest, kind: 'practice' }] });
  assert.ok(disguised.some((m) => m.includes('K701~K999는 신문 몫')), disguised.join('\n'));
  const ns = checkNonsul({ ...NS, topics: [...NS.topics, topic(790)] });
  assert.ok(ns.some((m) => m.includes('N701~N999는 신문 몫')), ns.join('\n'));
});

test('📤 readLines — 신문 기사 줄은 📰 · 받아 둔 카드가 있으면 제목 · 없으면 「?」 대신 까닭 · 모르는 공개 카드는 옛 규칙대로 「?」', () => {
  const L = readLines([rd('K790'), rd('K3', { t: 1 })], [...CARDS, card(790)], TODAY);
  assert.ok(L.some((l) => l.startsWith('- 11-15 📰 K790 「반딧불 공원 소식 790」 ★ 새로')));
  assert.ok(L.some((l) => l.startsWith('- 11-15 K3 「')));
  assert.ok(readLines([rd('K790')], CARDS, TODAY).some((l) => l.startsWith('- 11-15 📰 K790 (이 기기에 받아 둔 기사에 없어 제목 모름) ★ 새로')), '사본이 없으면 번호와 📰 · 까닭');
  assert.ok(readLines([rd('K600')], CARDS, TODAY).some((l) => l.startsWith('- 11-15 K600 「?」 ★ 새로')), '신문 몫 밖의 모르는 카드는 그대로');
});

test('📰 check.mjs — git 파일 목록을 못 읽으면 통과가 아니라 실패(「검사할 수 없음」) (🔍 Codex 230차 #4)', () => {
  const chk = readFileSync(new URL('../tools/check.mjs', import.meta.url), 'utf8');
  const at = chk.indexOf("execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard']");
  const line = chk.slice(at, chk.indexOf('\n', at));
  assert.ok(line.includes("catch { bad++; console.error('공개 저장소 신문 경로 검사를 못 했어요"), '실패면 bad를 올린다');
  assert.ok(!line.includes('catch { tracked = []; }'), '빈 목록으로 넘어가지 않는다');
});
