// 🔢 세계관(포켓몬 70% / 본 영상 30%)과 분수 그림: node --test tests/mathworld.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FRACTION, WORLDS, POKEMON_SHARE, makeQuestion, makeRound, checkContent } from '../js/mathgen.js';
import { barSvg, pizzaSvg, barsSvg, figureSvg, renderFigures } from '../js/mathdraw.js';

const content = JSON.parse(readFileSync(new URL('../coach/math/fraction.json', import.meta.url), 'utf8'));
const allWorlds = { pokemon: [], toystory: [], minions: [], moana: [] };
const names = ['리자몽', '뮤츠', '루카리오'];
const castOf = (w) => WORLDS[w].cast;
// 세계를 알아보는 실마리 — 출연진 이름 + 그 세계에만 있는 낱말
const HINT = {
  pokemon: /포켓몬|HP|몬스터볼|나무열매|오랭|배지|경험치|상처약|로켓단/,
  toystory: /릴리패드|결혼식|터틀 태그|대포딜|지미 딘|장난감|카우걸|사료|슬립오버/,
  minions: /바나나|미니언|필름|머핀|영화|팝콘|괴물|아이린/,
  moana: /코코넛|모투누이|카누|카카모라|테 카|테 피티|낚싯바늘|타마토아|바다|노를/,
};
const inWorld = (q, w) => castOf(w).some((n) => q.q.includes(n)) || HINT[w].test(q.q) || (w === 'pokemon' && names.some((n) => q.q.includes(n)));

test('세계 목록: 포켓몬 + 진우가 본 영상 셋, 출연진은 한국어 이름', () => {
  assert.deepEqual(Object.keys(WORLDS), ['pokemon', 'toystory', 'minions', 'moana']);
  for (const w of Object.values(WORLDS)) {
    assert.ok(w.cast.length >= 5, `${w.label} 출연진 ${w.cast.length}명`);
    assert.ok(w.cast.every((n) => /[가-힣]/.test(n)), `${w.label} 이름은 한글`);
  }
  assert.equal(POKEMON_SHARE, 0.7);
});

test('★ 영상을 안 넘기면 포켓몬만 나온다 (안 본 영상의 등장인물은 스포일러다)', () => {
  for (const c of FRACTION) {
    for (let s = 1; s <= 80; s++) {
      const q = makeQuestion(c.id, 'calc', s, { names });
      for (const w of ['toystory', 'minions', 'moana']) {
        for (const n of castOf(w)) assert.ok(!q.q.includes(n), `${c.id}/${s}: 안 본 영상의 ${n}이 나왔다`);
      }
    }
  }
});

test('★ 영상을 넘기면 대략 30%가 영상 세계 (씨앗 2,000개)', () => {
  let video = 0; const N = 2000;
  for (let s = 1; s <= N; s++) {
    const q = makeQuestion('frac.add', 'calc', s, { names, worlds: allWorlds });
    if (['toystory', 'minions', 'moana'].some((w) => inWorld(q, w))) video++;
  }
  const share = video / N;
  assert.ok(share > 0.24 && share < 0.36, `영상 세계 비율 ${(share * 100).toFixed(1)}% — 30% 근처여야 한다`);
});

test('영상 하나만 봤으면 그 영상만 나온다', () => {
  const only = { pokemon: [], moana: [] };
  let moana = 0;
  for (let s = 1; s <= 300; s++) {
    const q = makeQuestion('frac.divnat', 'calc', s, { names, worlds: only });
    assert.ok(!inWorld(q, 'toystory') && !inWorld(q, 'minions'), `${s}: 안 본 영상`);
    if (inWorld(q, 'moana')) moana++;
  }
  assert.ok(moana > 40, `모아나 ${moana}회 — 나오긴 한다`);
});

test('모든 개념·세계에서 이름 자리가 채워지고 보기가 온전하다', () => {
  for (const c of FRACTION) {
    for (const w of ['toystory', 'minions', 'moana']) {
      let hit = 0;
      for (let s = 1; s <= 120; s++) {
        const q = makeQuestion(c.id, 'calc', s, { names, worlds: { pokemon: [], [w]: [] } });
        assert.ok(!/\{(me|mon|mon2)/.test(q.q), '자리표시 없음');
        assert.equal(q.choices.length, 4);
        assert.equal(q.choices.filter((x) => x.ok).length, 1);
        if (inWorld(q, w)) hit++;
      }
      assert.ok(hit >= 15, `${c.id}/${w}: 120번 중 ${hit}번 — 그 세계 틀이 실제로 쓰인다`);
    }
  }
});

test('오개념 문항도 영상 세계의 인물이 틀리고 진우가 고친다', () => {
  let hit = false;
  for (let s = 1; s <= 200; s++) {
    const q = makeQuestion('frac.add', 'misread', s, { names, worlds: allWorlds });
    assert.ok(q.q.includes('진우야'));
    if (inWorld(q, 'toystory') || inWorld(q, 'minions') || inWorld(q, 'moana')) hit = true;
  }
  assert.ok(hit);
});

test('⭐ 특별 문제: 영상 것은 본 영상일 때만, 출연진 세계와 맞추려 한다', () => {
  const videoSpecials = FRACTION.reduce((a, c) => a + content[c.id].special.filter((s) => s.world && s.world !== 'pokemon').length, 0);
  assert.ok(videoSpecials >= 20, `영상 특별 문제 ${videoSpecials}개`);
  for (let s = 1; s <= 200; s++) {
    const q = makeQuestion('frac.add', 'special', s, { content, names });
    for (const w of ['toystory', 'minions', 'moana']) assert.ok(!inWorld(q, w), '영상을 안 넘기면 영상 특별 문제는 안 나온다');
  }
  let video = 0;
  for (let s = 1; s <= 400; s++) {
    const q = makeQuestion('frac.add', 'special', s, { content, names, worlds: allWorlds });
    if (['toystory', 'minions', 'moana'].some((w) => inWorld(q, w))) video++;
  }
  assert.ok(video > 60 && video < 200, `영상 특별 문제 ${video}/400 — 대략 30%`);
  const r = makeRound('frac.add', 3, { content, names, worlds: allWorlds });
  assert.equal(r.length, 4);
});

test('분수 그림: 막대·피자·나란한 막대가 숫자대로 그려진다', () => {
  const bar = barSvg(8, 7);
  assert.equal((bar.match(/<rect/g) || []).length, 8, '8칸');
  assert.equal((bar.match(/--frac-fill,/g) || []).length, 7, '7칸 칠함');
  assert.ok(bar.includes('aria-label="막대 8칸 중 7/8"'));

  const add = barSvg(8, 3, { n2: 2 });
  assert.equal((add.match(/--frac-fill2,/g) || []).length, 2, '두 번째 색 2칸');

  const mixed = barSvg(8, 19);
  assert.equal((mixed.match(/<rect/g) || []).length, 24, '19/8은 세 줄(24칸)');
  assert.equal((mixed.match(/--frac-fill,/g) || []).length, 19);

  const pz = pizzaSvg(4, 1);
  assert.equal((pz.match(/<path/g) || []).length, 4);
  assert.equal((pz.match(/--frac-fill,/g) || []).length, 1);
  assert.ok(pizzaSvg(16, 3).includes('<rect'), '조각이 너무 많으면 막대로');

  const cmp = barsSvg([{ n: 1, d: 4 }, { n: 1, d: 6 }]);
  assert.equal((cmp.match(/<rect/g) || []).length, 10);
  assert.equal(barsSvg([]), '');
});

test('그림 지시문: [bar 7/8] [pizza 1/4] [bars 1/2 1/3] [bar 3/6+2/6], 모르는 것은 빈 글자', () => {
  assert.ok(figureSvg('bar 7/8').includes('<svg'));
  assert.ok(figureSvg('pizza 1/4').includes('<path'));
  assert.ok(figureSvg('bars 1/2 1/3').includes('<svg'));
  assert.ok(figureSvg('bar 3/6+2/6').includes('--frac-fill2'));
  assert.equal(figureSvg('cube 1/2'), '');
  assert.equal(figureSvg('bar 3/6+2/7'), '', '분모가 다르면 한 막대에 못 그린다');
  const out = renderFigures('앞 [bar 7/8] 뒤');
  assert.ok(out.startsWith('앞 <svg') && out.endsWith('</svg> 뒤'));
  assert.deepEqual(checkContent(content), [], '이야기 속 그림 지시문이 전부 그려진다');
  assert.ok(checkContent({ 'frac.add': { story: { title: 't', text: '[cube 1/2]' } } }).some((s) => /못 그리는/.test(s)));
});

test('생성 문항에 그림이 붙는 개념과 안 붙는 개념', () => {
  const withFig = ['frac.mean', 'frac.same', 'frac.common'];
  for (const id of withFig) assert.ok(makeQuestion(id, 'calc', 5).figure.includes('<svg'), `${id}: 그림 있음`);
  for (const id of ['frac.mul', 'frac.div', 'frac.divnat', 'frac.mulnat', 'frac.add']) {
    assert.equal(makeQuestion(id, 'calc', 5).figure, '', `${id}: 곱셈·나눗셈은 그림이 답을 흘리거나 헷갈리게 해서 안 그린다`);
  }
  assert.equal(makeQuestion('frac.mean', 'misread', 5).figure, '');
});
