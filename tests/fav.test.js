// 💖 내 문장 (2026-10-02, 아버님 "전부 진행"): node --test tests/fav.test.js
// 아이가 영상 화면·📜 대사에서 고른 문장 — 🔁 복습·✍️ 받아쓰기·에세이에 먼저 나온다. 고르기 자체에는 보상이 없다.
// ⭐는 이미 "발음 80% 정복" 표시라 💖를 쓴다. 차례가 아닌 💖는 복습 회차에 하루 한 번 덤(연습 — 일정 그대로).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pickReviews, pickFavExtra, favList, FAV_ICON } from '../js/review.js';
import { mergeStatRecord } from '../js/db.js';
import { slimStats, withStart, startOfKey } from '../js/backup.js';
import { pickPrompts } from '../js/essay.js';

const T = '2026-10-02';
const rec = (start, patch = {}) => ({ key: `v|${start * 10}`, itemId: 'v', start, en: `Line ${start}.`, ko: '', done: true, box: 1, dueAt: '2026-10-01', lastAt: start, speakSkipped: 0, bestRatio: 0.5, ...patch });

test('💖 아이콘은 ⭐(발음 정복)와 다르다', () => {
  assert.equal(FAV_ICON, '💖');
  const css = fs.readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.script-item\.star \.en::before \{ content: '⭐ '; \}/, '⭐는 그대로 정복 표시');
});

test('🔁 차례인 문장 중 💖가 먼저 — 넘긴 문장·낮은 box보다도', () => {
  const list = [rec(1, { speakSkipped: 2, box: 0 }), rec(2, { box: 0 }), rec(3, { box: 3, fav: true })];
  assert.deepEqual(pickReviews(list, T, 2).map((r) => r.start), [3, 1]);
  assert.deepEqual(pickReviews(list.map((r) => ({ ...r, fav: false })), T, 2).map((r) => r.start), [1, 2], '💖가 없으면 옛 순서 그대로');
  assert.deepEqual(pickReviews([rec(4, { fav: true, dueAt: '2026-10-09' })], T, 3), [], '💖라도 차례가 아니면 차례 목록엔 안 든다');
});

test('💖 덤: 끝낸 문장 · 차례 아님 · 이번 회차에 없음 · 오늘 안 푼 것 — 덤으로 푼 지 오래된 것부터', () => {
  const later = '2026-10-09';
  const list = [
    rec(1, { fav: true, dueAt: later, favDay: '2026-09-30' }),
    rec(2, { fav: true, dueAt: later }),                       // 덤으로 푼 적 없음 → 먼저
    rec(3, { fav: true, dueAt: later, done: false }),          // 아직 안 끝낸 문장
    rec(4, { fav: true }),                                      // 오늘 차례 — 차례 목록 몫
    rec(5, { fav: true, dueAt: later, favDay: T }),             // 오늘 이미 덤으로 풀었다
    rec(6, { dueAt: later }),                                   // 안 고름
    rec(7, { fav: false, favAt: 9, dueAt: later }),             // 뺐다
  ];
  assert.equal(pickFavExtra(list, T).start, 2);
  assert.equal(pickFavExtra(list, T, ['v|20']).start, 1, '이번 회차에 이미 들었으면 다음 것');
  assert.equal(pickFavExtra(list, T, ['v|20', 'v|10']), null);
  assert.equal(pickFavExtra([], T), null);
  // 👑 졸업한 문장도 고른 거면 덤으로 (일정이 없어 차례가 영영 안 온다)
  assert.equal(pickFavExtra([rec(8, { fav: true, box: 5, dueAt: '' })], T).start, 8);
});

test('📊 💖 목록은 최근에 고른 것부터, 뺀 것은 빠진다', () => {
  const list = favList([rec(1, { fav: true, favAt: 5 }), rec(2, { fav: false, favAt: 9 }), rec(3, { fav: true, favAt: 7 }), null]);
  assert.deepEqual(list.map((r) => r.start), [3, 1]);
});

test('💾 병합: 💖는 나중에 누른 쪽(favAt) — 뺀 문장이 옛 백업으로 되살아나지 않고, 옛 기록(favAt 없음)은 건드리지 않는다', () => {
  const base = rec(1);
  const on = { ...base, fav: true, favAt: 100 };
  const off = { ...base, fav: false, favAt: 200 };
  assert.equal(mergeStatRecord('sentenceStats', off, on).fav, false, '기기(뺌, 나중) + 옛 백업(고름) = 뺌');
  assert.equal(mergeStatRecord('sentenceStats', on, off).fav, false, '순서를 바꿔도 같다');
  assert.equal(mergeStatRecord('sentenceStats', off, on).favAt, 200);
  assert.equal(mergeStatRecord('sentenceStats', on, base).fav, true, '💖 모르는 옛 백업이 고른 것을 지우지 않는다');
  assert.equal(mergeStatRecord('sentenceStats', base, on).fav, true, '💖 모르는 창의 기록 위에 고른 것이 남는다');
  assert.equal(mergeStatRecord('sentenceStats', base, { ...base }).fav, undefined, '둘 다 모르면 필드를 만들지 않는다');
  const d = mergeStatRecord('sentenceStats', { ...on, favDay: '2026-10-01' }, { ...on, favDay: '2026-09-28' });
  assert.equal(d.favDay, '2026-10-01', '덤으로 푼 날은 늦은 날 (오늘 또 덤으로 안 나오게)');
});

test('🛟 기록 사본: 💖(뺀 것도 favAt째로)는 남긴다 — 아이가 고른 건 다시 만들 수 없다', () => {
  const slim = slimStats([{ key: 'a|1', itemId: 'a', fav: true, favAt: 5 }, { key: 'a|2', itemId: 'a', fav: false, favAt: 6 }, { key: 'a|3', itemId: 'a', plays: 3 }]);
  assert.deepEqual(slim, [{ key: 'a|1', itemId: 'a', fav: true, favAt: 5 }, { key: 'a|2', itemId: 'a', fav: false, favAt: 6 }]);
});

test('✍️ 에세이: 💖 문장이 먼저 (점수가 낮아도)', () => {
  const list = [
    { en: "I can't believe I just caught a Gengar in the tall grass!", done: true, box: 3, speakPass: 2, lastAt: 9 },
    { en: 'We will go to the park after school with my friends.', done: true, box: 0, lastAt: 1, fav: true },
  ];
  assert.match(pickPrompts(list, 1)[0].rec.en, /the park/);
  assert.match(pickPrompts(list.map((r) => ({ ...r, fav: false })), 1)[0].rec.en, /I can't believe/, '💖가 없으면 옛 순서');
});

test('🖥 화면 배선: 💖 칩·📜 줄 버튼(줄 클릭으로 안 번짐)·문장 바뀔 때 칩 갱신·덤은 일정을 안 건드림·📊 카드', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const src = fs.readFileSync(new URL('../js/player.js', import.meta.url), 'utf8');
  const stats = fs.readFileSync(new URL('../js/stats.js', import.meta.url), 'utf8');
  const rv = fs.readFileSync(new URL('../js/review.js', import.meta.url), 'utf8');
  assert.match(html, /<button id="btn-fav" class="btn btn-chip btn-fav"/);
  assert.match(src, /\$\('btn-fav'\)\.addEventListener\('click', \(\) => toggleFav\(state\.idx\)\)/);
  assert.match(src, /fav\.addEventListener\('click', \(e\) => \{ e\.stopPropagation\(\); toggleFav\(i\); \}\);/);
  assert.match(src, /function highlightScript\(\) \{\s*updateFavChip\(\);/);
  assert.match(src, /onSentence: \(cue, passed, item\) => \{\s*if \(item && item\.extra\) return favExtraDone\(cue, passed, practice\);/);
  assert.match(src, /onDictation: \(item, passed\) => \{\s*if \(item && item\.extra\) return favExtraDone\(item\.cue, passed, practice\);/);
  assert.match(src, /function favExtraDone\(cue, passed, practice\) \{\s*if \(practice\) return null;\s*track\.favPractice\(cue\);/);
  assert.ok(!/function favExtraDone[\s\S]{0,300}track\.review\(/.test(src), '덤은 track.review(일정)를 부르지 않는다');
  assert.match(rv, /o\.onSentence\(cue, passed, o\.items\[ui\.i\]\)/, '복습 화면이 문항을 넘긴다');
  assert.match(stats, /favList\(records\)/);
});

test('🛟 사본 → 빈 저장소 복구: 💖 문장이 글·시작 시각째로 돌아와 📊 목록과 덤에 쓰인다 · 옛 사본은 열쇠로 시작 시각을 채운다 (Codex 20차 #3)', () => {
  const full = { key: 'video|100', itemId: 'video', start: 10, en: 'I would like to go to the park today.', ko: '오늘 공원에 가고 싶어.', done: true, box: 2, dueAt: '2026-10-09', fav: true, favAt: 123, favDay: '2026-10-01', plays: 9 };
  const plain = { key: 'video|205', itemId: 'video', start: 20.5, en: 'Long line.', ko: '긴 줄.', done: true, box: 1, dueAt: '2026-10-03', plays: 4 };
  const slim = slimStats([full, plain]);
  assert.equal(slim[0].start, 10);
  assert.equal(slim[0].en, full.en);
  assert.equal(slim[0].ko, full.ko);
  assert.equal(slim[0].favDay, '2026-10-01');
  assert.equal(slim[1].start, 20.5, '💖 아닌 문장도 시작 시각은 남긴다 — 복습 진도가 그 문장을 찾게');
  assert.equal(slim[1].en, undefined, '💖 아닌 문장의 글은 안 담는다 (사본을 작게)');
  const restored = withStart(slim).map((r) => mergeStatRecord('sentenceStats', undefined, r));
  const list = favList(restored);
  assert.equal(list.length, 1);
  assert.equal(list[0].en, full.en, '📊에 undefined가 아니라 그 문장');
  assert.equal(pickFavExtra(restored, '2026-10-02').start, 10, '시작 시각이 있어 영상의 그 문장과 이어진다');
  // 옛 사본(시작 시각이 없던 때) — 열쇠에서 되살린다
  const old = [{ key: 'video|100', itemId: 'video', done: true, box: 2, dueAt: '2026-10-09' }, { key: 'video|205', itemId: 'video', box: 1 }, { key: 'nokey', itemId: 'v', box: 1 }];
  assert.deepEqual(withStart(old).map((r) => r.start), [10, 20.5, undefined]);
  assert.equal(startOfKey('a|b|30'), 3, '영상 id에 |가 있어도 마지막 칸');
  assert.equal(startOfKey('x|'), null);
  // 옛 💖(favAt 없이 고른 것)도 사본에 남는다
  assert.deepEqual(slimStats([{ key: 'k|1', itemId: 'k', fav: true }])[0].fav, true);
  const bk = fs.readFileSync(new URL('../js/backup.js', import.meta.url), 'utf8');
  assert.match(bk, /importStats\(\{ \.\.\.snap, sentenceStats: withStart\(snap\.sentenceStats\) \}\)/, '복구는 withStart를 거친다');
});
