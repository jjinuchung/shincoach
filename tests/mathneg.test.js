// 🔢 E 음수 줄기 — 사다리·배움 원고·아빠 카드·수직선 그림: node --test tests/mathneg.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NEGATIVE, conceptById, checkContent, gradeLabel } from '../js/mathneg.js';
import { FRACTION } from '../js/mathgen.js';
import { lineSvg, walkSvg, figureSvg, renderFigures } from '../js/mathdraw.js';

const content = JSON.parse(readFileSync(new URL('../coach/math/negative.json', import.meta.url), 'utf8'));
const ids = NEGATIVE.map((c) => c.id);

test('사다리: 9개념, id 유일, needs는 앞 개념만 가리킨다, 분수 줄기와 id가 안 겹친다', () => {
  assert.equal(NEGATIVE.length, 9);
  assert.equal(new Set(ids).size, ids.length);
  NEGATIVE.forEach((c, i) => {
    assert.ok(c.id.startsWith('neg.'), c.id);
    assert.ok(c.name && c.idea, `${c.id}: name·idea`);
    for (const n of c.needs) assert.ok(ids.indexOf(n) < i, `${c.id}가 뒤 개념 ${n}을 요구`);
    if (i > 0) assert.ok(c.needs.length, `${c.id}: 첫 개념 말고는 잠금이 있어야`);
  });
  for (const f of FRACTION) assert.equal(conceptById(f.id), null);
  assert.equal(conceptById('neg.mean').name, '0보다 작은 수');
});

test('학년 표시: 전부 중1 — 7은 "중1", 분수 줄기의 4·5·6은 "초4·5·6"', () => {
  for (const c of NEGATIVE) assert.equal(gradeLabel(c.grade), '중1');
  assert.equal(gradeLabel(4), '초4');
  assert.equal(gradeLabel(6), '초6');
  assert.equal(gradeLabel(8), '중2');
});

test('★ 원고 형식: checkContent가 negative.json을 통과시킨다 (check.mjs가 배포 전에 같은 검사를 한다)', () => {
  assert.deepEqual(checkContent(content), []);
});

test('원고 내용: 개념마다 배움 3장 이상·확인 질문 2개 이상·한 줄 요약·아빠 카드', () => {
  for (const c of NEGATIVE) {
    const v = content[c.id];
    assert.ok(v, `${c.id} 내용`);
    assert.ok(v.lesson.length >= 3 && v.lesson.length <= 6, `${c.id}: 배움 ${v.lesson.length}장 (3~6장)`);
    const checks = v.lesson.filter((s) => s.check);
    assert.ok(checks.length >= 2, `${c.id}: 확인 질문 ${checks.length}개`);
    // 한 장은 한 화면 — 초4가 읽을 양. 규칙표가 있는 곱셈 2장만 조금 길다
    for (const [i, s] of v.lesson.entries()) assert.ok(s.say.length <= 320, `${c.id}.lesson[${i}] ${s.say.length}자 — 한 장이 너무 길다`);
    assert.ok(v.rule.length <= 60, `${c.id}.rule ${v.rule.length}자`);
    assert.ok(v.dad.traps.length >= 2, `${c.id}: 헷갈리는 자리 ${v.dad.traps.length}개`);
    assert.ok(v.dad.say.length >= 2, `${c.id}: 아빠가 말할 거리 ${v.dad.say.length}개`);
  }
});

test('확인 질문: 정답이 오답과 다르고, 오답은 1~2개, 틀렸을 때 한 마디가 있다', () => {
  for (const c of NEGATIVE) {
    for (const [i, s] of content[c.id].lesson.entries()) {
      if (!s.check) continue;
      const { q, ok, no, why } = s.check;
      assert.ok(q && ok && why, `${c.id}.lesson[${i}]`);
      assert.ok(no.length >= 1 && no.length <= 2);
      assert.ok(!no.includes(ok));
    }
  }
});

test('checkContent가 잡는 것: 없는 개념·오답에 정답·확인 질문 부족·아빠 카드 빠짐', () => {
  const base = JSON.parse(JSON.stringify(content));
  assert.ok(checkContent({ ...base, 'neg.nope': base['neg.mean'] }).some((m) => m.includes('없는 개념')));
  const dup = JSON.parse(JSON.stringify(base)); dup['neg.mean'].lesson[0].check.no[0] = dup['neg.mean'].lesson[0].check.ok;
  assert.ok(checkContent(dup).some((m) => m.includes('오답에 정답')));
  const few = JSON.parse(JSON.stringify(base)); few['neg.add'].lesson = few['neg.add'].lesson.map((s) => ({ say: s.say }));
  assert.ok(checkContent(few).some((m) => m.includes('확인 질문이 2개')));
  const nodad = JSON.parse(JSON.stringify(base)); delete nodad['neg.sub'].dad;
  assert.ok(checkContent(nodad).some((m) => m.includes('아빠 카드')));
  const badFig = JSON.parse(JSON.stringify(base)); badFig['neg.line'].lesson[0].say += ' [line 5..-5]';
  assert.ok(checkContent(badFig).some((m) => m.includes('못 그리는')));
  const missing = JSON.parse(JSON.stringify(base)); delete missing['neg.mixed'];
  assert.ok(checkContent(missing).some((m) => m.includes('내용 없음')));
});

test('수직선 그림: 눈금·0 굵게·점, 세로, 걷기 화살표', () => {
  const l = lineSvg(-5, 5, { dots: [-3] });
  assert.ok(l.startsWith('<svg') && l.includes('aria-label="수직선 -5부터 5, 점 -3"'));
  assert.equal((l.match(/<text /g) || []).length, 11, '눈금 라벨 11개');
  assert.equal((l.match(/<circle /g) || []).length, 1);
  assert.ok(l.includes('font-weight="700">0<'), '0은 굵게');
  const v = lineSvg(-6, 6, { dots: [-5], vertical: true });
  assert.ok(v.includes('세로 수직선') && (v.match(/<text /g) || []).length === 13);
  assert.equal(lineSvg(3, 3), '', '범위가 없으면 빈 글자');
  const w = walkSvg(2, -3);
  assert.ok(w.includes('2에서 왼쪽으로 3칸 걸어 -1'));
  assert.equal((w.match(/<circle /g) || []).length, 2, '출발·도착 점');
  assert.ok(w.includes('>−3<'), '화살표 위 −3 표시 (진짜 마이너스)');
  assert.ok(walkSvg(-5, 3).includes('-5에서 오른쪽으로 3칸 걸어 -2'));
  assert.ok(walkSvg(0, 0).includes('점 0'), '안 걸으면 점만');
  // 유리수 점 (정수가 아닌 자리)
  assert.ok(lineSvg(-3, 3, { dots: [-1.5, -0.5] }).includes('점 -1.5, -0.5'));
});

test('지시문: [line] [vline] [walk] — 진짜 마이너스(−)로 써도 그려진다, 이상한 건 빈 글자', () => {
  assert.ok(figureSvg('line -5..5'));
  assert.ok(figureSvg('line -6..6 @-5,-3').includes('점 -5, -3'));
  assert.ok(figureSvg('vline -6..6 @-5').includes('세로'));
  assert.ok(figureSvg('walk 2 -3').includes('왼쪽'));
  assert.ok(figureSvg('walk -5 +3').includes('오른쪽'));
  assert.ok(figureSvg('line −5..5 @−3').includes('점 -3'), 'U+2212');
  assert.equal(figureSvg('line 5..-5'), '');
  assert.equal(figureSvg('walk 2'), '');
  const out = renderFigures('앞 [walk 2 -3] 뒤 [bar 1/2]');
  assert.ok(out.startsWith('앞 <svg') && out.includes('뒤 <svg'));
});

test('★ 원고 속 그림 지시문은 전부 그려진다 (화면에서 조용히 사라지는 지시문이 없다)', () => {
  let n = 0;
  for (const c of NEGATIVE) {
    for (const s of content[c.id].lesson) {
      for (const f of s.say.match(/\[[a-z]+ [^\]]+\]/g) || []) { n++; assert.ok(figureSvg(f.slice(1, -1)), `${c.id}: ${f}`); }
    }
  }
  assert.ok(n >= 8, `그림 ${n}개 — 음수의 뜻·수직선·덧셈·뺄셈에는 그림이 있어야`);
});
