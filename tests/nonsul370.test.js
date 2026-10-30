// 🖊️ 논술 v370 (2026-10-30 아버님 「과목에 문제를 더 만들어야 하는 건 없어?」 → 기본안 「추천대로」 → 원고 「이대로」)
//  다섯째 묶음 30(N93~N122 — 찬반 20 + 📖 독서 10 · 끝에 붙임) · 새 주제는 하루 넷까지(넷째 묶음 30개를 이틀 만에 다 해 다음 묶음까지 비었다) —
//  오늘 처음 끝낸 주제(d0)를 센다 · 다시 볼 주제·⭐ 연습은 그대로 · 다 열면 아이 화면에 「새 주제는 내일 또 와요!」(셈 없이)
// node --test tests/nonsul370.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { allTopics, planTopic, nonsulWaitNew, nonsulRule, NEW_TOPICS_PER_DAY, SOLVED } from '../js/nonsul.js';
import { dayNum } from '../js/korean.js';
import { mergePuzzles } from '../js/korpuzzle.js';
import { emptyProfile } from '../js/db.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const LIST = allTopics(JSON.parse(read('coach/korean/nonsul.json')));
const IDS = LIST.map((t) => t.id);
const NOW = new Date(2026, 9, 31, 9).getTime();
const D0 = dayNum(NOW);
const DAY = 86400000;
const MIN = 60000;
const body = (src, head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); return src.slice(i, src.indexOf('\n}\n', i)); };
/** 판 하나 끝내기 — planTopic이 준 주제를 ok로 (없으면 null) */
const playNext = (p, at, ok = true) => {
  const id = planTopic(LIST, p.nonsul, at);
  if (id) assert.equal(nonsulRule(p, { id, ok, from: p.nonsul && p.nonsul[id] ? p.nonsul[id].at : 0 }, at, IDS).ok, true);
  return id;
};

test('🖊️ v370: 하루 새 주제는 넷 — 다섯째 판엔 새 주제가 없고 「내일 또」 · 다음 날 다시 넷 (원고 차례 그대로)', () => {
  assert.equal(NEW_TOPICS_PER_DAY, 4);
  const p = emptyProfile();
  const got = [];
  for (let day = 0; day < 3; day++) {
    for (let k = 0; k < 6; k++) {
      const at = NOW + day * DAY + k * 10 * MIN;
      const id = playNext(p, at);
      if (k < 4) { assert.ok(id, `${day}일째 ${k + 1}번째`); got.push(id); }
      else {
        assert.equal(id, null, `${day}일째 ${k + 1}번째 판엔 새 주제가 없다`);
        assert.equal(nonsulWaitNew(LIST, p.nonsul, at), true, '안 해 본 주제가 남았으니 「내일 또」');
      }
    }
  }
  assert.deepEqual(got, IDS.slice(0, 12), '사흘에 열둘 — 원고 차례 그대로');
  assert.equal(nonsulWaitNew(LIST, p.nonsul, NOW + 3 * DAY), false, '새 날 아침엔 기다리지 않는다');
  assert.equal(planTopic(LIST, p.nonsul, NOW + 3 * DAY), IDS[12]);
});

test('🖊️ v370: 틀린 판도 새 주제로 센다 · 다시 볼 주제는 넷을 다 열어도 나온다 · 그 주제를 다시 푼 날엔 새로 안 센다', () => {
  const p = emptyProfile();
  for (let k = 0; k < 4; k++) assert.ok(playNext(p, NOW + k * MIN, k !== 0), '첫 판은 틀림');
  assert.equal(p.nonsul[IDS[0]].box, 0);
  assert.equal(planTopic(LIST, p.nonsul, NOW + 5 * MIN), null, '틀린 판도 오늘 연 새 주제');
  // 다음 날 — 다시 볼 IDS[0]이 먼저 · 그 뒤 새 주제 넷(IDS[0]은 어제 연 주제라 오늘 셈에 안 든다)
  const D1 = NOW + DAY;
  assert.equal(playNext(p, D1), IDS[0]);
  assert.equal(p.nonsul[IDS[0]].d0, D0, '처음 연 날은 그대로');
  const next4 = [1, 2, 3, 4].map((k) => playNext(p, D1 + k * MIN));
  assert.deepEqual(next4, IDS.slice(4, 8));
  assert.equal(planTopic(LIST, p.nonsul, D1 + 9 * MIN), null);
  // 넷을 다 연 날에도 다시 볼 주제(어제 틀린 것)는 나온다
  const q = emptyProfile();
  playNext(q, NOW, false); // IDS[0] 틀림 → 내일
  const D2 = NOW + DAY;
  q.nonsul = { ...q.nonsul };
  for (const id of IDS.slice(1, 5)) q.nonsul[id] = { box: SOLVED, due: 0, at: D2, miss: 0, d0: D0 + 1 };
  assert.equal(planTopic(LIST, q.nonsul, D2 + MIN), IDS[0], '다시 볼 주제는 막지 않는다');
});

test('🖊️ v370: ⭐ 연습은 그대로 · 원고를 다 해 봤으면 「내일 또」가 아니라 「다 했어요」 · 옛날에 연 주제는 오늘 셈에 안 든다', () => {
  const st = {};
  IDS.slice(0, 4).forEach((id, i) => { st[id] = { box: SOLVED, due: 0, at: NOW + i, miss: 0, d0: D0 }; });
  assert.equal(planTopic(LIST, st, NOW + MIN), null);
  assert.equal(planTopic(LIST, st, NOW + MIN, true), IDS[0], '⭐ 연습은 막지 않는다');
  // 다 해 봤다 — 새 주제가 없으니 기다릴 것도 없다
  const all = Object.fromEntries(IDS.map((id, i) => [id, { box: SOLVED, due: 0, at: NOW + i, miss: 0, d0: i < 4 ? D0 : D0 - 1 }]));
  assert.equal(nonsulWaitNew(LIST, all, NOW + MIN), false);
  // 어제 연 주제 넷 + 처음 배운 날이 없는 옛 칸(d0 0) — 오늘 셈은 0
  const old = {};
  IDS.slice(0, 4).forEach((id, i) => { old[id] = { box: SOLVED, due: 0, at: NOW - DAY + i, miss: 0, d0: D0 - 1 }; });
  IDS.slice(4, 8).forEach((id, i) => { old[id] = { box: SOLVED, due: 0, at: NOW - 2 * DAY + i, miss: 0 }; });
  assert.equal(planTopic(LIST, old, NOW), IDS[8]);
  assert.equal(nonsulWaitNew(LIST, old, NOW), false);
  assert.equal(nonsulWaitNew(LIST, {}, NOW), false);
  assert.equal(nonsulWaitNew([], st, NOW), false, '원고를 못 받았으면 기다리지 않는다');
});

test('🖊️ v370: 두 기기 — 실제 병합(mergePuzzles, db.js)으로 합쳐 넷이면 「내일 또」 · 어느 쪽으로 합쳐도 같다 · 같은 주제는 한 번 · ⭐는 남는다', () => {
  const a = emptyProfile();
  const b = emptyProfile();
  playNext(a, NOW); playNext(a, NOW + MIN); // IDS[0] ⭐ · IDS[1] ⭐
  playNext(b, NOW + 2 * MIN, false); // 합치기 전 — 같은 IDS[0]을 더 나중에 틀림
  const books = LIST.filter((t) => t.card).slice(0, 2).map((t) => t.id); // 📖 국어 글 끝 단추로 둘
  books.forEach((id, k) => assert.equal(nonsulRule(b, { id, ok: true, from: 0 }, NOW + (3 + k) * MIN, IDS).ok, true));
  assert.equal(planTopic(LIST, a.nonsul, NOW + 6 * MIN), IDS[2], '한 기기만으로는 둘');
  assert.equal(planTopic(LIST, b.nonsul, NOW + 6 * MIN), IDS[1], '다른 기기만으로는 셋');
  const m = mergePuzzles(a.nonsul, b.nonsul);
  assert.deepEqual(mergePuzzles(b.nonsul, a.nonsul), m, '어느 쪽으로 합쳐도 같다');
  assert.equal(Object.keys(m).length, 4);
  assert.equal(m[IDS[0]].box, SOLVED, '⭐는 나중 오답과 합쳐도 남는다');
  assert.equal(m[IDS[0]].d0, D0);
  assert.equal(planTopic(LIST, m, NOW + 6 * MIN), null);
  assert.equal(nonsulWaitNew(LIST, m, NOW + 6 * MIN), true);
});

test('🖊️ v370: 처음 날(d0)이 없는 옛 미완성 주제를 다시 풀어도 오늘 새 주제로 안 센다 — 그 뒤 새 주제 넷 (Codex 174차)', () => {
  const p = emptyProfile();
  IDS.slice(0, 4).forEach((id, i) => { p.nonsul[id] = { box: 0, due: D0 - 1, at: NOW - 2 * DAY + i, miss: 1 }; }); // d0을 적기 전 칸 · 다시 볼 주제
  const again = [0, 1, 2, 3].map((k) => playNext(p, NOW + k * MIN));
  assert.deepEqual(again, IDS.slice(0, 4), '다시 볼 주제부터');
  for (const id of again) { assert.equal(p.nonsul[id].box, SOLVED); assert.equal(p.nonsul[id].d0, 0, '처음 날은 모르는 그대로'); }
  const fresh = [4, 5, 6, 7].map((k) => playNext(p, NOW + k * MIN));
  assert.deepEqual(fresh, IDS.slice(4, 8), '새 주제는 그대로 넷');
  assert.equal(planTopic(LIST, p.nonsul, NOW + 9 * MIN), null);
});

test('🖊️ v370: 자정 전에 시작해 자정 뒤에 끝낸 판은 끝낸 날의 새 주제', () => {
  const p = emptyProfile();
  const night = new Date(2026, 9, 31, 23, 50).getTime();
  for (let k = 0; k < 3; k++) playNext(p, night + k * MIN); // 그날 셋
  const id = planTopic(LIST, p.nonsul, night + 9 * MIN); // 23:59에 넷째를 시작
  assert.equal(id, IDS[3]);
  const after = new Date(2026, 10, 1, 0, 2).getTime();
  assert.equal(dayNum(after), dayNum(night) + 1);
  assert.equal(nonsulRule(p, { id, ok: true, from: 0 }, after, IDS).ok, true);
  assert.equal(p.nonsul[id].d0, dayNum(after), '끝낸 날');
  const more = [1, 2, 3].map((k) => playNext(p, after + k * MIN)); // 새 날은 하나를 연 셈 — 셋 더
  assert.deepEqual(more, IDS.slice(4, 7));
  assert.equal(planTopic(LIST, p.nonsul, after + 5 * MIN), null);
});

test('🖊️ v370: 같은 새 주제를 두 창에서 끝내면 한 번만 센다 — 늦게 끝낸 창은 연습', () => {
  const p = emptyProfile();
  const id = planTopic(LIST, p.nonsul, NOW); // 두 창 모두 새 주제로 시작(from 0)
  assert.equal(nonsulRule(p, { id, ok: true, from: 0 }, NOW + MIN, IDS).practice, false);
  const before = { ...p.nonsul[id] };
  assert.equal(nonsulRule(p, { id, ok: false, from: 0 }, NOW + 2 * MIN, IDS).practice, true, '그 사이 다른 창이 옮김 → 연습');
  assert.deepEqual(p.nonsul[id], before, '칸 그대로');
  const rest = [3, 4, 5].map((k) => playNext(p, NOW + k * MIN));
  assert.deepEqual(rest, IDS.slice(1, 4), '셋 더');
  assert.equal(planTopic(LIST, p.nonsul, NOW + 9 * MIN), null);
});

test('🖊️ v370: 넷을 연 날 📖로 독서 주제를 열고 어제 틀린 주제를 다시 끝내도 — 새 주제는 내일 · 다음 날은 원고 차례대로 넷', () => {
  const p = emptyProfile();
  playNext(p, NOW - DAY, false); // 어제 IDS[0] 틀림 → 오늘 다시 볼 주제
  IDS.slice(1, 5).forEach((id, i) => { p.nonsul[id] = { box: SOLVED, due: 0, at: NOW + i, miss: 0, d0: D0 }; }); // 오늘 넷
  const book = LIST.find((t) => t.card).id; // 📖 국어 글 끝 단추 — planTopic을 거치지 않는다
  assert.equal(nonsulRule(p, { id: book, ok: true, from: 0 }, NOW + 10 * MIN, IDS).ok, true);
  assert.equal(p.nonsul[book].d0, D0, '📖로 연 주제도 오늘 연 주제');
  assert.equal(playNext(p, NOW + 11 * MIN), IDS[0], '다시 볼 주제는 그대로 나온다');
  assert.equal(p.nonsul[IDS[0]].d0, D0 - 1, '어제 연 주제 — 오늘 셈에 안 든다');
  assert.equal(planTopic(LIST, p.nonsul, NOW + 12 * MIN), null);
  assert.equal(nonsulWaitNew(LIST, p.nonsul, NOW + 12 * MIN), true);
  const next = [1, 2, 3, 4].map((k) => playNext(p, NOW + DAY + k * MIN));
  assert.deepEqual(next, IDS.slice(5, 9));
});

test('🖊️ v370 원고: Codex 174차 — 편이 헷갈리거나 단정하던 문장은 없다 · 생각 이유로 바꾼 칸은 근거 줄 없음', () => {
  const txt = JSON.stringify(LIST);
  for (const s of [
    '손으로 직접 쓰면 낱말이 머리에 더 잘 남아요.', '글씨를 바르게 쓰는 연습도 함께 할 수 있어요.', // N95 펜 태블릿에도 맞는 말
    '한 타입만 모으면 모두 같은 약점을 갖게 돼요.', '개굴닌자는 물 타입이면서 악 타입이에요.', // N98
    '사서 선생님께서도 점심시간에는 쉬셔야 해요.', // N102 글 7줄은 가정
    '모두 오른쪽으로 걸으면 마주 오는 사람과 덜 부딪쳐요.', '화장실부터 먼저 다녀오면 덜 서두르게 돼요.', // N111 제안을 사실처럼
    '포켓몬 행사에는 피카츄 탈을 쓴 사람이 나오기도 해요.', '줄을 서는 동안 다른 일을 아무것도 못 해요.', // N112
    '설문을 하면 모두의 생각을 고르게 들을 수 있어요.', // N117 두 편을 다 돕는다
    '감기 기운이 있을 때 찬 것을 먹으면 목이 아파요.', // N119 의학 단정
    '잘 미끄러지지 않는 신발을 신고 천천히 걸으면 돼요.', '그래도 나는 눈이 온다고 공부를 미루면 안 된다고 생각해요.', // N110 안전
    '아빠는 일찍 출근하셔서 선물을 직접 주지 못하셨어요.', // N120 반대편 근거가 아님
    '달리기 결승선에는 체크무늬 깃발이 걸려요.', '선생님이 하시면 실수 없이 결과를 볼 수 있어요.', // N116·N109
  ]) assert.ok(!txt.includes(`"${s}"`), s);
  const t = (id) => LIST.find((x) => x.id === id);
  assert.deepEqual(t('N102').no.ev, [[], [1], []]);
  assert.deepEqual(t('N120').no.ev, [[3, 4], [], []]);
  assert.ok(!t('N93').intro.includes('아무도'), 'K116 2줄은 「거의 없었습니다」');
});

test('🖊️ v370 화면: 첫 화면·판 끝 — 넷을 다 열면 「새 주제는 내일 또 와요!」(숫자 없이) · 📖 국어 글 끝 단추는 막지 않는다', () => {
  const v = read('js/nonsulview.js');
  const text = /const NEW_WAIT_TEXT = '([^']+)';/.exec(v);
  assert.ok(text, 'NEW_WAIT_TEXT');
  assert.equal(text[1], '새 주제는 내일 또 와요!');
  assert.doesNotMatch(text[1], /\d|개|번/, '남은 수·셈 없이');
  const home = body(v, 'function renderHome() {');
  assert.ok(home.includes('const wait = !next && nonsulWaitNew(S.list, st, Date.now());'), '할 주제가 없을 때만');
  assert.ok(home.includes("if (wait) card.appendChild(el('p', 'ns-note ns-wait', NEW_WAIT_TEXT));"));
  assert.ok(home.includes("else if (practice) card.appendChild(btn('btn btn-primary btn-big-wide ns-start', '⭐ 주제 다시 해 보기 (연습)'"), '⭐ 연습 단추는 그대로');
  assert.ok(home.includes("else if (!wait) card.appendChild(el('p', 'ns-note', '오늘 할 주제를 다 했어요 — 내일 다시 만나요!'));"), '두 말이 겹치지 않게');
  assert.ok(v.includes("else if (res.ok && nonsulWaitNew(S.list, nonsulMap(), Date.now())) box.appendChild(el('p', 'ns-done-line ns-wait', NEW_WAIT_TEXT));"), '판 끝 — 「다음 주제」 단추 대신');
  assert.ok(body(v, 'function startRound(practice, want = \'\') {').includes('const id = want || planTopic('), '📖 국어 글에서 연 주제(want)는 planTopic을 거치지 않는다');
});
