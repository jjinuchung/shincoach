// 🚀 로켓단 습격 2단계 — 화면 연결 테스트 (DOM은 node에서 못 돌린다 → 연결 규칙을 소스에서 본다, 화면은 헤드리스로 확인)
// node --test tests/rocketwire.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const math = src('js/math.js');
const view = src('js/rocketview.js');
const app = src('js/app.js');
const play = src('js/rocketplay.js');
const player = src('js/player.js');
/**
 * 함수 몸통 (다음 최상위 function·export까지) — 주석 줄(// …)은 지운다: 호출을 주석으로 막아도 글자는 남아
 * 테스트가 속았다 (변이 검사가 찾음)
 */
const body = (s, name) => {
  const i = s.indexOf(`function ${name}(`);
  assert.ok(i >= 0, `${name} 없음`);
  const ends = ['\nfunction ', '\nasync function ', '\nexport '].map((t) => s.indexOf(t, i + 10)).filter((x) => x > 0);
  return s.slice(i, ends.length ? Math.min(...ends) : undefined).split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l)).join('\n');
};

test('🔢 문항을 끝낼 때마다 maybeRocket — 맞았는지를 넘기고, ⚔️ 배틀 판정 뒤(오늘 푼 수가 먼저 오른다)', () => {
  const a = body(math, 'answer');
  const b = a.indexOf('maybeBattle();'); const r = a.indexOf('maybeRocket(!!ch.ok);');
  assert.ok(b > 0 && r > b, '배틀 판정 다음에 로켓단');
});

test('🚀 나오는 편: 개념 편·연습·확인·☀️ 섞어 풀기만 — 진단·❓·💎·🤔 노트에서는 안 나온다 · 연속 정답은 그 편들에서만 센다', () => {
  const m = /const ROCKET_MODES = \[([^\]]+)\];/.exec(math);
  assert.ok(m);
  const modes = m[1].split(',').map((x) => x.trim().replace(/'/g, ''));
  assert.deepEqual(modes, ['learn', 'practice', 'review', 'mix']);
  for (const no of ['diag', 'ask', 'special', 'notes']) assert.ok(!modes.includes(no), no);
  const f = body(math, 'maybeRocket');
  assert.ok(f.indexOf('ROCKET_MODES.includes(r.mode)') < f.indexOf('ui.rocketStreak = ok'), '다른 편에서는 연속 정답을 세지도 않는다');
  assert.match(f, /ui\.rocketStreak = ok \? \(ui\.rocketStreak \|\| 0\) \+ 1 : 0;/, '틀리면 0부터');
});

test('🚀 마지막 문항 뒤에는 안 연다 — 걸 때(maybeRocket)도 열 때(advance)도 · 배틀·로켓단이 겹치지 않는다', () => {
  const f = body(math, 'maybeRocket');
  assert.match(f, /if \(r\.at >= r\.qs\.length - 1\) return;/);
  assert.match(f, /ui\.rocketPending \|\| ui\.rocketOpen \|\| ui\.battlePending \|\| ui\.battleOpen\) return;/);
  const adv = body(math, 'advance');
  assert.match(adv, /if \(ui\.rocketPending && !last\) \{ startRocket\(go\); return; \}/);
  assert.match(adv, /ui\.rocketPending = false;/, '마지막 문항이면 걸어 둔 것을 지운다');
});

test('🚀 등장 판정은 shouldRocket(오늘 푼 수·연속 정답·오늘 로켓단 수·남은 시간) — 헤드리스 강제는 ?nosw=1에서만', () => {
  const f = body(math, 'maybeRocket');
  assert.match(f, /shouldRocket\(\{ subject: 'math', doneToday: ui\.today\.q, streak: ui\.rocketStreak, todayCount: ui\.today\.rockets \|\| 0, leftSec, lastAt: rocketLastAt\('math'\) \}\)/, '20분 간격은 수학의 마지막 등장 시각으로');
  assert.match(f, /const leftSec = t && !t\.off \? t\.left : null;/, '제한을 끄면 남은 시간을 안 본다');
  assert.match(body(math, 'rocketForced'), /\/\[\?&\]nosw=1\/\.test\(location\.search\) && !!window\.__rocketForce/);
  assert.match(math, /rockets: \(d && Number\(d\[ROCKET\.field\.math\]\)\) \|\| 0/, '오늘 로켓단 수를 저장된 기록에서 읽는다');
});

test('🚀 여는 순서: 노릴 포켓몬·파트너 → 오늘 몫(수학 하루 3번)과 배틀 기록을 한 저장에서(rocketAdmit) → 화면 · 기다리는 사이 나갔으면 안 연다', () => {
  const f = body(math, 'startRocket');
  const i = (t) => { const k = f.indexOf(t); assert.ok(k > 0, t); return k; };
  assert.ok(i('rocketPick()') < i("rocketAdmit(todayKey(), ROCKET.field.math, ROCKET.maxPerDay, rocketNew({ subject: 'math', target: target.id, stem: ui.stem }))"));
  assert.ok(i('rocketAdmit(') < i('runRocket(b.cur, !b.ok, after)'), '진행 중인 배틀이면(b.ok false·busy) 몫을 안 쓰고 이어 가기로');
  assert.ok(!/claimDailyCount\(/.test(f), '몫만 따로 먼저 쓰지 않는다 — 배틀을 못 열면 몫이 사라졌다 (Codex 43차 #3)');
  assert.match(f, /if \(!b\.cur \|\| b\.cur\.subject !== 'math' \|\| run !== ui\.run \|\| mathHidden\(\)\) \{ after\(\); return; \}/, '영어 배틀이 진행 중이면 수학에서 열지 않는다 · 기다리는 사이 나갔으면');
  assert.match(f, /if \(b\.ok\) ui\.today\.rockets = /, '오늘 수는 연 배틀만');
});

test('🚀 화면에 넘기는 저장 함수는 그 배틀 id로 — 한 문제씩·빼앗기·이기기 (같은 배틀은 한 번만) · 수학·영어 공통 실행기(rocketplay)', () => {
  const f = body(play, 'playRocket');
  assert.match(f, /saveStep: \(ok\) => rocketSaveStep\(cur\.id, ok\)/);
  assert.match(f, /lose: \(\) => rocketLose\(cur\.target, cur\.id\)/);
  assert.match(f, /win: \(backId\) => rocketWin\(backId, cur\.id\)/);
  assert.match(f, /partner: monView\(getPartner\(\) \|\| cur\.target, chars\)/);
  const m = body(math, 'runRocket');
  assert.match(m, /playRocket\(\{ cur, resume, kid: \(ui\.opts && ui\.opts\.me\) \|\| '진우', chars: ui\.chars, quiz: \(box, hooks\) => battleQuiz\(box, hooks, cur\.stem\) \}\)/, '수학 문제는 배틀 문제(기록하지 않음)를 그 줄기에서');
  assert.match(m, /finally \{[\s\S]*ui\.rocketOpen = false;[\s\S]*if \(after\) after\(\);/, '화면이 어떻게 끝나도 다음 문항으로');
});

test('🚀 이어 가기: 수학 화면을 열면(사다리를 그린 뒤) · 앱을 열면 끝나지 않은 수학 배틀이 있을 때 수학 화면으로 — 시간이 다 됐으면 다음에', () => {
  const r = body(math, 'renderMath');
  assert.match(r, /else renderLadder\(state\);\s*resumeRocketIfAny\(\);/);
  const f = body(math, 'resumeRocketIfAny');
  assert.match(f, /profileReady\(\)\.then/, '프로필을 다 읽은 뒤에');
  assert.match(f, /cur\.subject !== 'math'/);
  assert.match(f, /if \(ui\.round \|\| isLocked\('math'\)\) return;/);
  assert.match(f, /runRocket\(cur, true, null\)/);
  assert.match(app, /Promise\.all\(\[timeReady, profileReady\(\)\]\)\.then\(\(\) => \{\s*const rc = rocketCurrent\(\);\s*if \(!rc \|\| views\.home\.hidden\) return;\s*if \(rc\.subject === 'math' && !isLocked\('math'\)\) showView\('math'\);\s*else if \(rc\.subject === 'en' && !isLocked\('english'\)\) resumeEnglishRocket\(\)/, '앱을 열면 — 수학은 수학 화면에서, 영어는 홈에서 바로(저장된 단어로) · 홈에 있을 때만 · 시간이 남았을 때만');
  assert.match(src('js/xp.js'), /if \(readyResolve\) \{ readyResolve\(\); readyResolve = null; \}/, 'initProfile이 끝나면 풀린다');
});

test('🎬 화면(rocketview): ⏭ 모르겠어요는 틀린 것 · 한 문제마다 먼저 저장하고 그린다 · 지면 그림보다 먼저 저장 · 이기면 아지트에서 하나 고르기', () => {
  assert.match(view, /const correct = !!r\.correct && !r\.skipped;/);
  const save = view.indexOf('const saved = await persist(() => o.saveStep(correct));');
  const draw = view.indexOf('if (correct) await attack(o.partner); else await armDown();');
  assert.ok(save > 0 && draw > save, '저장 → 그림 (그림 중에 꺼져도 맞힌 수가 남는다)');
  const lose = view.indexOf('const l = await persist(() => o.lose());');
  assert.ok(lose > 0 && view.indexOf('await snatch(', lose) > lose, '빼앗기 저장 → 그물 그림');
  assert.match(view, /const held = o\.hideout\(\);/);
  assert.match(view, /const w = await persist\(\(\) => o\.win\(backId\)\);/);
  assert.match(view, /const w = await persist\(\(\) => o\.win\(null\)\);/, '아지트가 비어도 이긴 것은 저장');
  assert.match(view, /if \(!saved\.ok\)/, '다른 창이 끝낸 배틀이면 더 묻지 않는다');
});

test('🎬 저장이 안 되면(💾) "다시 저장·나중에"를 묻는다 — 메모리로 이어 가지 않는다 · 나중에면 화면을 닫고 배틀은 저장된 데까지 남아 다음에 이어진다 (Codex 43차 #2)', () => {
  const f = body(view, 'persist');
  assert.match(f, /if \(!r \|\| r\.why !== 'save'\) return r;/, '저장 실패만 다시 묻는다(이미 끝난 배틀 등은 그대로)');
  assert.match(f, /button\('다시 저장', true/);
  assert.match(f, /button\('나중에', false/);
  assert.match(f, /if \(!again \|\| !ui\.open\) return null;/, '나중에면 그만둔다(다시 묻지 않는다)');
  for (const t of ['const saved = await persist(', 'const w = await persist(() => o.win(backId));', 'const w = await persist(() => o.win(null));', 'const l = await persist(() => o.lose());']) {
    const k = view.indexOf(t);
    assert.ok(k > 0, t);
    assert.match(view.slice(k, k + 200), /\n\s*if \(!(saved|w|l)\) return;/, `${t} — 나중에면 닫는다`);
  }
  assert.match(view, /if \(!l\.ok\) \{ msg\('다른 화면에서 이미 끝난 배틀이에요\.'\); await finish\('닫기'\); return; \}/, '다른 화면이 먼저 끝낸 진 배틀을 "빈손"이라고 하지 않는다');
  const xp = src('js/xp.js');
  for (const fn of ['rocketSaveStep', 'rocketLose', 'rocketWin', 'rocketAdmit']) {
    assert.match(body(xp, fn), /\(\) => \(\{ ok: false, why: 'save' \}\)\)/, `${fn}: 저장이 안 되면 메모리로 이어 가지 않는다`);
  }
  assert.ok(!/gainXp\(ROCKET\.winXp\)|gainCoins\(ROCKET\.winCoins\)/.test(xp), '⚡💰는 이기기 저장 안에서 (따로 더하지 않는다, Codex 43차 #1)');
});

test('🎬 구호·외침·효과음 — 확인받을 대사는 한곳에(MOTTO·BLAST) · 앱 셸이 rocketview.js를 들고 간다', async () => {
  assert.match(view, /export const MOTTO = \[/);
  assert.match(view, /export const BLAST = '/);
  assert.match(view, /나옹! 바로 그거다옹!/);
  const sfx = src('js/sfx.js');
  for (const k of ['siren', 'zap', 'boom', 'twinkle']) assert.match(sfx, new RegExp(`  ${k}\\(\\) \\{`), k);
  for (const k of ['siren', 'zap', 'boom', 'twinkle']) assert.match(view, new RegExp(`sfx\\.${k}\\(\\)`), `화면이 ${k}을 쓴다`);
  assert.match(src('sw.js'), /'\.\/js\/rocketview\.js'/);
  const css = src('css/style.css');
  for (const k of ['rocket-descend', 'rocket-blast', 'rocket-star', 'rocket-net', 'rocket-shot', 'rocket-boom']) assert.match(css, new RegExp(`@keyframes ${k} `), k);
});

// ───────── 3단계: 영어 ─────────

test('🔤 영어: 문장을 처음 끝낼 때마다 maybeRocketEn(배틀 판정 다음) · 연달아 끝낸 수를 센다 · 배틀·로켓단이 겹치지 않는다 · 부모 보기에서는 안 센다', () => {
  const md = body(player, 'markDone');
  const b = md.indexOf('maybeBattle(after);'); const r = md.indexOf('maybeRocketEn(after);');
  assert.ok(b > 0 && r > b);
  const f = body(player, 'maybeRocketEn');
  const pm = f.indexOf('if (state.parentMode) return;');
  assert.ok(pm >= 0 && pm < f.indexOf('state.rocketStreak = (state.rocketStreak || 0) + 1;'), '부모 보기에서는 세지도 않는다');
  assert.match(f, /state\.rocketPending \|\| state\.rocketOpen \|\| state\.battlePending \|\| state\.battleOpen \|\| isRocketOpen\(\)\) return;/);
  assert.match(f, /shouldRocket\(\{ subject: 'en', doneToday: todayDone, streak: state\.rocketStreak, todayCount: track\.todayRocketsEn\(\), leftSec, lastAt: rocketLastAt\('en'\) \}\)/, '20분 간격은 영어의 마지막 등장 시각으로');
  assert.match(f, /const t = rocketTimeStatus\('english'\);/, '영어 남은 시간');
  assert.match(f, /if \(!rocketTargets\(\)\.length \|\| !getPartner\(\)\) return;/, '노릴 포켓몬·싸울 파트너가 없으면 안 건다');
});

test('🔤 영어: 문장 전환에서 연다 — 다음 문장으로 가기 전(배틀보다 먼저) · 마지막 문장에서도', () => {
  const i = player.indexOf('if (state.rocketPending) {\n    const nextIdx = state.idx + 1;\n    startRocketEn(() => goTo(nextIdx, { force: true }));'.replace(/\n/g, player.includes('\r\n') ? '\r\n' : '\n'));
  const j = player.indexOf('// ⚔️ 배틀이 걸려 있으면 다음 문장으로 가기 전에');
  assert.ok(i > 0 && j > i, '로켓단이 배틀보다 먼저');
  assert.match(player, /if \(state\.rocketPending\) startRocketEn\(\(\) => \{\}\);[^\n]*\n\s*else if \(state\.battlePending\) startBattle/);
});

test('🔤 영어: 여는 순서 — 노릴 포켓몬·파트너·낼 단어 → 오늘 몫(영어 하루 3번)과 배틀 기록을 한 저장에서 → 화면 · 수학 배틀이 진행 중이면 안 연다', () => {
  const f = body(player, 'startRocketEn');
  const at = (t) => { const k = f.indexOf(t); assert.ok(k > 0, t); return k; };
  assert.ok(at('state.rocketOpen = true;') < at('await listVocabViews()'), '준비할 때부터 막는다 (Codex 43차 #4)');
  assert.ok(at('rocketPick()') < at('track.admitRocketEn(ROCKET.maxPerDay'));
  assert.ok(at('wordQuestion(records)') < at('track.admitRocketEn('), '낼 단어가 없으면 몫을 쓰지 않는다');
  assert.match(f, /track\.admitRocketEn\(ROCKET\.maxPerDay, \(date, field, max\) => rocketAdmit\(date, field, max, cur\)\)/, '몫과 배틀 기록을 한 트랜잭션에서 (Codex 43차 #3)');
  assert.match(f, /b\.cur\.subject !== 'en'/);
  const tr = src('js/track.js');
  assert.ok(!/markRocketEn/.test(tr), '몫만 따로 쓰는 길은 없앴다');
  assert.match(body(tr, 'admitRocketEn'), /await flush\(\);[\s\S]*const r = await admit\(date, 'rocketEn', max\);[\s\S]*adoptSaved\(date, r\.daily\)/, '보기값을 먼저 맞추고, 저장된 오늘 기록을 받아 온다');
  assert.match(tr, /export function todayRocketsEn\(\) \{\s*return t\.daily \? \(Number\(t\.daily\.rocketEn\) \|\| 0\) : 0;/, '영어 몫은 영어 칸(rocketEn) — 수학과 따로');
  const run = body(player, 'runRocketEn');
  assert.match(run, /if \(!video\.paused\) video\.pause\(\);/, '영상을 멈춘다');
  assert.match(run, /setBattleOpen\(true\);/, '뒤 화면을 못 누르게');
  assert.match(run, /quiz: wordQuiz\(\(\) => listVocabViews\(\)\)/, '본 단어의 뜻 고르기');
  assert.match(run, /finally \{[\s\S]*setBattleOpen\(false\);[\s\S]*if \(state\.open\) continueFn\(\);/);
});

test('🔤 영어 이어 가기: 앱을 열 때 영상 없이 저장된 단어로 — 낼 단어가 없으면 다음에(배틀은 남는다)', () => {
  const f = body(player, 'resumeEnglishRocket');
  assert.match(f, /cur\.subject !== 'en'/);
  assert.match(f, /if \(!wordQuestion\(records\)\) return false;/);
  assert.match(f, /playRocket\(\{ cur, resume: true, chars: state\.characters, quiz: wordQuiz\(\(\) => listVocabViews\(\)\) \}\)/);
  assert.match(src('js/rocketquiz.js'), /if \(!q\) \{ finish\(\{ correct: false, skipped: false, interrupted: true \}\); return; \}/, '없는 문제로 틀리게 하지 않는다');
});

test('📊 🚀 로켓단 카드(물리친 수·진 수·아지트) · 도감 🚀(아지트에 있으면) · 앱 셸이 새 파일을 들고 간다 · v217', () => {
  const st = src('js/stats.js');
  assert.match(st, /const rk = rocketRecord\(\);\s*const held = rocketHideout\(\);/);
  assert.match(st, /if \(rk\.won \|\| rk\.lost \|\| held\.length\)/);
  const dex = src('js/pokedex.js');
  assert.match(dex, /rocketHeldOf\(p\.mons\[m\.id\]\) > 0 \? '🚀'/, '다 빼앗겼으면 🚀');
  assert.match(dex, /if \(n > 0 && have > 0 && rocketHeldOf\(p\.mons\[m\.id\]\) > 0\) cell\.appendChild\(el\('div', 'rocket-held', '🚀'\)\);/);
  const sw = src('sw.js');
  for (const f of ['rocket', 'rocketview', 'rocketplay', 'rocketquiz']) assert.match(sw, new RegExp(`^\\s*'\\./js/${f}\\.js',`, 'm'), `앱 셸(주석 아닌 줄)에 ${f}.js`);
  assert.match(sw, /const CACHE_VERSION = 'v220';/);
});

test('🚀⚔️ 배틀과 로켓단은 한 번에 하나 — 서로 걸려 있거나 열려 있으면 걸지 않는다 (수학·영어 둘 다)', () => {
  assert.match(body(math, 'maybeBattle'), /if \(ui\.battlePending \|\| ui\.battleOpen \|\| ui\.rocketPending \|\| ui\.rocketOpen\) return;/);
  assert.match(body(player, 'maybeBattle'), /state\.battlePending \|\| state\.rocketPending \|\| state\.rocketOpen\) return;/);
  assert.match(body(math, 'maybeRocket'), /ui\.battlePending \|\| ui\.battleOpen\) return;/);
  assert.match(body(player, 'maybeRocketEn'), /state\.battlePending \|\| state\.battleOpen \|\| isRocketOpen\(\)\) return;/);
});
