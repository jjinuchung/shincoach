// 🎟️ v280 (2026-10-17) 테스트: node --test tests/voucher280.test.js
// ① 폰 폭 수학 머리줄 — 칩(Lv·⚡·💰·🔷)이 길어 📊가 화면 밖으로 밀렸다 → 단추는 줄지 않게, 좁은 폭에선 칩만 둘째 줄로
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('📱 수학 머리줄: 칩은 줄 수 있고(…) 단추·⏳은 안 줄며, 560px 아래에선 칩만 둘째 줄 가운데로', () => {
  const css = src('css/style.css');
  assert.match(css, /\.math-chip \{ flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; \}/);
  assert.match(css, /#view-math \.topbar > \.btn-icon, #view-math \.topbar > \.time-chip \{ flex-shrink: 0; \}/);
  const m = /@media \(max-width: 560px\) \{\s*#view-math \.topbar \{ flex-wrap: wrap; row-gap: 0; \}[\s\S]*?\n\}/.exec(css);
  assert.ok(m, '560px 아래 규칙');
  assert.match(m[0], /#view-math \.topbar::after \{ content: ''; order: 1; flex-basis: 100%; \}/, '줄을 끊는 빈 칸');
  assert.match(m[0], /#view-math \.math-chip \{ order: 2; margin: 6px auto 0; \}/, '칩은 끊은 줄 뒤로');
  // 칩이 수학 머리줄 안에 있다 (다른 화면 머리줄은 그대로)
  const html = src('index.html');
  const hdr = /<section id="view-math"[\s\S]*?<\/header>/.exec(html)[0];
  assert.match(hdr, /id="math-chip" class="level-chip math-chip"/);
  assert.match(hdr, /data-open="stats"/);
  assert.ok(Number(/CACHE_VERSION = 'v(\d+)'/.exec(src('sw.js'))[1]) >= 280);
});

// ② 아버님 "이대로 해" — 만들어 두고 교환권 밖이던 두 편을 다음 교환권으로 (🔥 아르세우스 먼저 → ❄️ 툰베어)
import { existsSync } from 'node:fs';
import { LOCKED, NEED, needOf, fileLabel, nextTarget, previewGift, nextLocked, findVoucher } from '../js/unlock.js';
import { suggestTitle } from '../js/importfiles.js';

const NEW = [
  { id: 'arceus', ko: '아르세우스 연대기 최고의 기술', file: '\\260923\\arceus — arceus.mp4', poster: 485, minutes: 9, sentences: 67,
    cast: [[485, '히드런'], [815, '에이스번'], [818, '인텔리레온'], [393, '팽도리']], teaser: 'Pikachu, use Thunderbolt on the whirlpool!' },
  { id: 'beary_icy', ko: '툰베어의 얼음 고민', file: '\\260922\\beary_icy — beary_icy.mp4', poster: 614, minutes: 3, sentences: 29,
    cast: [[614, '툰베어'], [143, '잠만보'], [727, '어흥염'], [663, '파이어로']], teaser: 'Even Kyurem would be shocked to see it!' },
];

test('🎟️ 새 교환권 두 장: 유력 용의자 다음에 🔥 아르세우스 → ❄️ 툰베어 · 제목·파일·나오는 포켓몬(PokeAPI 대조)·값·조건', () => {
  const ids = LOCKED.map((c) => c.id);
  assert.deepEqual(ids.slice(ids.indexOf('prime_suspect')), ['prime_suspect', 'arceus', 'beary_icy'], '순서가 곧 등장 순서');
  for (const n of NEW) {
    const c = LOCKED.find((x) => x.id === n.id);
    assert.ok(c, n.id);
    assert.equal(c.ko, n.ko);
    assert.equal(fileLabel(c), n.file, `${n.id} 교환권에 적히는 파일`);
    assert.equal(suggestTitle(`${n.id}.mp4`), n.ko, '가져오기에서 제목이 저절로 — 배달 판정');
    assert.equal(c.poster, n.poster);
    assert.deepEqual(c.cast.map((m) => [m.id, m.ko]), n.cast);
    assert.equal(c.teaser, n.teaser);
    assert.equal(c.minutes, n.minutes);
    assert.equal(c.sentences, n.sentences);
    assert.equal(c.price, 2000, '값은 앞 교환권과 같다');
    assert.deepEqual(needOf(c), NEED, '조건도 같다');
    assert.equal(findVoucher(n.id), c);
  }
});

test('🎟️ 진우처럼 교환권 셋을 가졌고 🔔 벨은 건넸으면 — 다음 목표 🔥 아르세우스 → 사면 ❄️ 툰베어 → 둘 다면 없음 (선물 미리 보기 없음)', () => {
  const have = ['iconic', 'bell', 'wild2', 'prime_suspect'];
  assert.equal(nextTarget(have).id, 'arceus');
  assert.equal(nextTarget([...have, 'arceus']).id, 'beary_icy');
  assert.equal(nextTarget([...have, 'arceus', 'beary_icy']), null);
  assert.equal(previewGift(have), null);
  // 벨 교환권이 없는 기기(새 기기·옛 백업)에서도 건넨 벨이 다시 서지 않는다 (Codex 85차 그대로)
  assert.equal(nextTarget(['iconic', 'wild2', 'prime_suspect']).id, 'arceus');
  assert.equal(nextLocked(['iconic', 'wild2', 'prime_suspect']).id, 'arceus');
});

test('🖼️ 표지: 명단 밖 포켓몬(히드런)도 그림으로 — 캐릭터 그림이 없으면 출연 그림(artUrl), 받은 뒤에도 끼운다', () => {
  const lib = src('js/library.js');
  assert.match(lib, /const url = characterUrl\(c\.poster\) \|\| artUrl\(c\.poster\);/);
  const fc = /function fillCast\(root, c\) \{[\s\S]*?\n\}/.exec(lib)[0];
  assert.match(fc, /root\.querySelector\('\.next-poster'\)/);
  assert.match(fc, /!poster\.querySelector\('img'\)/, '이미 그림이면 그대로');
  assert.match(fc, /const pu = characterUrl\(c\.poster\) \|\| artUrl\(c\.poster\);/);
  assert.match(fc, /poster\.appendChild\(img\)/);
  // ensureCast가 표지도 받는다: 표지는 나오는 포켓몬 중 하나 (unlock.test 규칙)
  for (const c of LOCKED) assert.ok(c.cast.some((m) => m.id === c.poster), c.id);
});

// 아빠 PC에서만: 문장 수·미리 듣는 문장이 실제 영어 자막과 같은지 (자료 폴더가 없으면 건너뜀)
const MP3 = 'F:/per/mp3';
test('📼 (아빠 PC) 문장 수 = 영어 자막 줄 수 · 미리 듣는 문장은 자막에 그대로 있다', { skip: !existsSync(MP3) && '자료 폴더 없음' }, () => {
  for (const n of NEW) {
    const c = LOCKED.find((x) => x.id === n.id);
    const srt = readFileSync(`${MP3}/${c.folder.replace(/\\/g, '/')}/${c.id}.en.srt`, 'utf8').replace(/\r/g, '');
    const cues = srt.split(/\n\n+/).filter((b) => /-->/.test(b));
    assert.equal(cues.length, c.sentences, `${c.id} 문장 수`);
    assert.ok(cues.some((b) => b.split('\n').slice(2).join(' ').trim() === c.teaser), `${c.id} 미리 듣는 문장이 자막 한 줄과 같다`);
  }
});
