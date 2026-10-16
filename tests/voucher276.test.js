// 🎟️ v276 (2026-10-17) 테스트: node --test tests/voucher276.test.js
// ① 아버님 "앞으로 저 교환권에는 파일 이름도 같이 써놔줘" — 영상 교환권마다 아빠 PC 폴더와 파일 이름(📊 카드 · 아이의 "아빠에게 보여주세요" 카드)
// ② 아버님 "피카츄 자전거 벨은 사줬어. 더이상 앱에서 안보여도 돼" — 📊 "건네줬어요"를 안 눌러도 건넨 것으로 (GIVEN_BY_DAD)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LOCKED, GIFTS, GIVEN_BY_DAD, fileLabel, pendingGifts, ticketId, previewGift, nextTarget } from '../js/unlock.js';
import { suggestTitle } from '../js/importfiles.js';
import { giftsGiven } from '../js/xp.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('📁 교환권마다 파일 한 줄: F:\\per\\mp3 다음부터 + 영상 이름만 — 영상 이름이 id라 가져오기 제목이 저절로 교환권 제목', () => {
  for (const c of LOCKED) {
    assert.ok(fileLabel(c), `${c.id}에 folder가 없다 — 새 교환권엔 폴더를 꼭 적는다`);
    assert.match(c.folder, /^\d{6}\\[a-z0-9_]+$/, `${c.id} 폴더 꼴(날짜\\짧은이름)`);
    assert.ok(c.folder.endsWith(`\\${c.id}`), `${c.id} 폴더 끝 = id`);
    assert.equal(fileLabel(c), `\\${c.folder} — ${c.id}.mp4`);
    assert.equal(suggestTitle(`${c.id}.mp4`), c.ko, `${c.id} — 가져오기에서 제목이 "${c.ko}"로 채워져야 배달로 인정된다`);
  }
  // 아버님이 정하신 꼴 그대로 — "mp3까지는 내가 아니까 그 다음의 \260918\prime_suspect — prime_suspect.mp4 이것만"
  const ps = LOCKED.find((c) => c.id === 'prime_suspect');
  assert.equal(ps.ko, '피카츄가 유력 용의자');
  assert.equal(fileLabel(ps), '\\260918\\prime_suspect — prime_suspect.mp4');
  assert.ok(!/per|mp3\\|srt/.test(fileLabel(ps)), '앞 경로·자막 이름은 안 보인다');
  assert.equal(fileLabel(null), '');
  assert.equal(fileLabel({ id: 'x' }), '', '폴더 없는 것은 빈 글 (화면은 줄을 안 그린다)');
});

test('🎁 아빠가 건넨 벨: 📊 "건네줬어요"를 안 눌러도 건넨 것 — 아이 화면의 "아빠에게 보여주세요"·📊 알림이 사라진다 · 누른 날이 있으면 그 날', () => {
  assert.deepEqual(GIVEN_BY_DAD, { bell: '2026-10-17' });
  assert.ok(GIFTS.some((g) => g.id === 'bell'), '벨 정의는 남는다 (교환권 줄·옛 기록이 깨지지 않게)');
  const g = giftsGiven();
  assert.equal(g.bell, '2026-10-17', '창의 프로필이 비어 있어도');
  const bag = { [ticketId('bell')]: 1 };
  assert.deepEqual(pendingGifts(bag, g), [], '받았지만 안 건넨 선물에서 빠진다');
  assert.deepEqual(pendingGifts(bag, {}).map((x) => x.id), ['bell'], '(기록만 보면 아직 안 건넴 — GIVEN_BY_DAD가 없으면 남았다)');
  // 벨 교환권을 가진 기기에선 미리 보기·지금 모으는 것으로도 안 나온다
  const owned = ['iconic', 'bell', 'wild2', 'prime_suspect'];
  assert.equal(previewGift(owned), null);
  assert.equal(nextTarget(owned), null);
  // 벨 교환권이 **없는** 기기(새 기기·옛 백업)에서도 다시 목표·미리 보기로 서지 않는다 (Codex 85차 P1)
  assert.equal(previewGift([]), null, '미리 보기에 벨 없음');
  assert.equal(nextTarget([]).id, 'iconic');
  assert.equal(nextTarget(['iconic']).id, 'wild2', '벨을 건너뛰고 다음 영상');
  assert.equal(previewGift(['iconic']), null);
  // 건넨 선물이 없으면 예전 줄 그대로 (줄의 짜임은 그대로 — gift.test)
  assert.equal(nextTarget(['iconic'], {}).id, 'bell');
});

test('🔌 화면 연결: 📊 넣어줘야 할 영상에 파일 줄 · 아이 "아빠에게 보여주세요" 카드에 파일 줄 · ⚙ 선물 사진 칸은 다 건넸으면 숨김 · 긴 경로 줄바꿈 · sw', () => {
  const st = src('js/stats.js');
  assert.match(st, /const f = fileLabel\(t\);\s*if \(f\) c0\.appendChild\(el\('p', 'stats-note ticket-files', `📁 \$\{f\}`\)\);/);
  const lib = src('js/library.js');
  const wc = lib.slice(lib.indexOf('function waitingCard(c) {'), lib.indexOf('function lockedCard('));
  assert.ok(wc.includes('const f = fileLabel(c);') && wc.includes('p.textContent = `📁 아빠용: ${f}`;'), '아이 카드에도');
  assert.ok(wc.includes('<p class="next-files" hidden></p>') && wc.includes('p.hidden = false; }'), '파일이 있으면 줄을 드러낸다 (없으면 숨긴 채)');
  const xp = src('js/xp.js');
  assert.match(xp, /export function giftsGiven\(\) \{\s*return \{ \.\.\.GIVEN_BY_DAD, \.\.\.\(profile\.giftsGiven \|\| \{\}\) \};/, '📊에서 누른 날이 뒤에 — 그 날이 이긴다');
  const gf = src('js/gift.js');
  assert.match(gf, /const g = GIFTS\.find\(\(x\) => !GIVEN_BY_DAD\[x\.id\]\);\s*if \(!g\) \{ const fs = btn\.closest\('fieldset'\); if \(fs\) fs\.hidden = true; return; \}/);
  assert.match(src('index.html'), /<fieldset class="field set-group">\s*<legend class="field-label">🎁 선물 교환권 사진/, '숨기는 칸은 그 fieldset');
  const css = src('css/style.css');
  assert.match(css, /\.next-files \{[^}]*overflow-wrap: anywhere;/);
  assert.match(css, /\.ticket-files \{ overflow-wrap: anywhere; \}/);
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src('sw.js')) || [])[1]) >= 276, 'sw v276 이상');
});
