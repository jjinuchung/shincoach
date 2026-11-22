// 😀 아이 화면 글의 그림 문자는 태블릿이 그리는 것(Emoji 12 이하)만 (v436 · 2026-11-22) — node --test tests/emoji12.test.js
// 🪜 개념 사다리·🛝 놀이터·🪄 마법·🛟 기록 되돌리기가 태블릿에서 네모·다른 글자로 보였다(v435 계단 걷기에서 찾음).
// js 파일의 글자(' · " · `)와 index.html에서 Emoji 13 이후 글자를 찾는다 — 설명 글(주석)은 화면에 안 나오니 뺀다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { newerEmoji, newerIn, stringsOf } from './emojiver.js';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
/** 11/14에 끝난 🚚 이사 이벤트 — 더는 화면에 안 나온다(옛 기록 그대로 둠) */
const SKIP = new Set(['js/moveday.js']);

test('😀 판정 — 13 이후 글자·ZWJ 묶음은 잡고 12 이하는 통과 · 글자만 뽑기는 글자 속 /* · // 를 주석으로 안 읽는다', () => {
  for (const e of ['🪜', '🪴', '🪟', '🫧', '🪄', '🛝', '🛟', '🪨', '🪵', '🧋', '🥲', '🛻', '🦣', '🦤', '🦫', '🦬', '🦭', '⚧']) assert.ok(newerEmoji(e.codePointAt(0)), e);
  for (const e of ['🪑', '🪐', '🩹', '🪀', '🧗', '🤸', '🔮', '💾', '🧊', '🥕', '🍦', '🧀', '🥫', '🧈', '🥟', '🦢', '🦩', '❄', '🔥']) assert.ok(!newerEmoji(e.codePointAt(0)), e);
  assert.deepEqual(newerIn('🐻‍❄️ 북극곰'), ['ZWJ']);
  assert.deepEqual(newerIn('🐈‍⬛'), ['ZWJ']);
  assert.deepEqual(newerIn('❤️‍🔥'), ['ZWJ']);
  assert.deepEqual(newerIn('👨‍👩‍👦 가족 · ❄️ 냉동실'), [], '옛 ZWJ 묶음과 따로 쓴 ❄는 괜찮다');
  assert.deepEqual(stringsOf("const a = 'image/*'; // 🪜 설명\nconst b = '🪜';\n/* '🪵' */ const c = `x`;"), ["'image/*'", "'🪜'", '`x`']);
  assert.deepEqual(stringsOf('const u = "http://x"; // 끝'), ['"http://x"']);
});

test('😀 js 글자 · index.html에 Emoji 13 이후 글자 없음 (끝난 🚚 이사 이벤트 파일만 뺌)', () => {
  const files = readdirSync(new URL('js/', root)).filter((f) => f.endsWith('.js')).map((f) => `js/${f}`).filter((f) => !SKIP.has(f));
  assert.ok(files.length > 200);
  const bad = [];
  for (const f of files) {
    for (const s of stringsOf(read(f))) {
      const hit = newerIn(s);
      if (hit.length) bad.push(`${f}: ${hit.join('')} ← ${s.slice(0, 60)}`);
    }
  }
  const html = read('index.html').replace(/<!--[\s\S]*?-->/g, '');
  const hit = newerIn(html);
  if (hit.length) bad.push(`index.html: ${hit.join('')}`);
  assert.deepEqual(bad, []);
});
