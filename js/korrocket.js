// 🚀 로켓단 습격 — 국어·논술 (v327, 2026-10-23 아버님 "이대로") — 규칙은 rocket.js(과목 'kor' — ROCKET·shouldRocket), 저장·화면은
// 영어·수학과 같은 길(xp.rocketAdmit 한 트랜잭션 → rocketplay.playRocket — 5문제 3승 쫓아냄 · 3패 빼앗김 · 🚀 아지트에서 되찾기).
// 과목이 주는 것은 문제뿐: 국어에서 나오면 🔤 낱말 뜻, 논술에서 나오면 의견에 알맞은 이유(v325 배틀 문제 — korbattle·korbattleview.battleQuiz)
//  · 나오는 때: 처음 고른 답이 맞은 것이 ROCKET.streak번 이어지면(국어 글 물음 · 논술 ② 이유 · ③ 반대 의견 — 글·판을 넘어 이어 센다)
//    다음으로 넘어가는 단추에서(국어는 글의 마지막 물음 뒤에는 안 — 다 푼 글의 저장을 지킨다, 수학과 같다)
//  · 오늘 국어 글·논술 판을 ROCKET.minDone.kor개 끝낸 뒤 · 국어·논술 합쳐 하루 ROCKET.maxPerDay번(rocketKor — 영어·수학과 따로) ·
//    20분 간격 · 남은 국어 시간 5분 이상 · 파트너가 있고 노릴 포켓몬이 있을 때
//  · 앱이 꺼져도 다음에 그 화면(시작한 곳 — 배틀 기록의 stem 'korean' | 'nonsul')에 들어오면 이어 간다
// 이 파일은 koreanview·nonsulview를 import하지 않는다(부르는 쪽이 화면 상태·문제 원천을 건넨다)
import { ROCKET, shouldRocket, rocketNew } from './rocket.js';
import { rocketPick, rocketTargets, rocketAdmit, rocketCurrent, rocketLastAt, profileReady, getPartner } from './xp.js';
import { playRocket } from './rocketplay.js';
import { isRocketOpen } from './rocketview.js';
import { getDaily, applyDailyDelta } from './db.js';
import { todayKey } from './track.js';
import { status as timeStatus, isLocked } from './timelimit.js';
import { loadCharacters } from './pokemon.js';
import { battleQuiz, overlayOpen } from './korbattleview.js';

// streak = 처음 고른 답이 맞은 것이 이어진 수 · pending = 다음 단추에서 열 화면('korean' | 'nonsul' | '') · open = 로켓단 화면이 떠 있나 ·
// today = 오늘 끝낸 글·판 수(done)·나온 수(rockets) — 들어올 때 하루 기록에서 읽고, 끝낼 때마다 더한다
const K = { streak: 0, pending: '', open: false, today: { d: '', done: 0, rockets: 0 } };

/** 헤드리스 시험용 — ?nosw=1에서 window.__rocketForce면 확률·조건 없이 (수학·영어와 같은 깃발 · 파트너·노릴 포켓몬·화면 조건은 그대로) */
function forced() {
  return typeof location !== 'undefined' && /[?&]nosw=1/.test(location.search) && !!window.__rocketForce;
}

function today() {
  const d = todayKey();
  if (K.today.d !== d) K.today = { d, done: 0, rockets: 0 }; // 자정을 넘김
  return K.today;
}

/** 오늘 끝낸 국어 글·논술 판 수와 로켓단이 나온 수를 하루 기록에서 읽어 둔다 (국어·논술 화면에 들어올 때) */
export async function loadKorRocketToday() {
  const t = today();
  try {
    const d = await getDaily(t.d);
    if (K.today !== t) return;
    t.done = Math.max(t.done, ((d && Number(d.korReads)) || 0) + ((d && Number(d.nsRounds)) || 0));
    t.rockets = Math.max(t.rockets, (d && Number(d[ROCKET.field.kor])) || 0);
  } catch { /* 못 읽으면 지금 센 것으로 */ }
}

/**
 * 글 한 편·논술 한 판을 끝냈다(저장됨) — 오늘 끝낸 수 +1 · 논술은 하루 기록 nsRounds에도(국어 글은 korFinish가 korReads를 이미 적는다)
 * @param {'korean'|'nonsul'} kind
 */
export function korRocketDone(kind) {
  const t = today();
  t.done += 1;
  if (kind === 'nonsul') applyDailyDelta(t.d, { nsRounds: 1 }).catch(() => {});
}

/**
 * 처음 고른 답 하나 — 이어진 수를 세고, 차례가 맞으면 다음 단추에서 열 로켓단을 걸어 둔다 (틀리면 0부터)
 * @param {boolean} ok @param {'korean'|'nonsul'} kind 지금 화면
 */
export function korRocketTally(ok, kind) {
  K.streak = ok ? K.streak + 1 : 0;
  if (!ok || K.pending || K.open || isRocketOpen()) return;
  if (!forced()) {
    const t = timeStatus('korean');
    const leftSec = t && !t.off ? t.left : null;
    const d = today();
    if (!shouldRocket({ subject: 'kor', doneToday: d.done, streak: K.streak, todayCount: d.rockets, leftSec, lastAt: rocketLastAt('kor') })) return;
  }
  if (!rocketTargets().length || !getPartner()) return;
  K.pending = kind;
}

/** 다음 단추에서 열 로켓단이 걸려 있나 — 그 화면이면 true */
export function korRocketPending(kind) {
  return K.pending === kind;
}

/**
 * 걸어 둔 로켓단을 지운다 — 열지 않고 넘어가는 자리(국어 글의 마지막 물음 · 논술 판 끝 · 그만두기)에서 (수학 advance와 같다).
 * 안 지우면 걸린 채 남아 다른 화면의 로켓단을 막거나, 한참 뒤 다음 글의 엉뚱한 자리에서 열린다
 */
export function korRocketClear() {
  K.pending = '';
}

/**
 * 로켓단 문제 원천 — makeQ()가 준 (seen → 문제)에서 첫 문제가 실제로 나올 때만, 못 받으면 null (🔍 Codex 131차 #1:
 *   문제 없이 열면 battleQuiz가 ⏭ 넘김을 돌려주고 로켓단은 그것을 틀린 것으로 센다 — 문제 하나 못 보고 3패·빼앗김)
 * 이번 습격에 낸 문제가 바닥나면 처음부터 다시 낸다(같은 문제가 또 나오는 편이 저절로 지는 것보다 낫다)
 * @param {() => Promise<Function|null>|Function|null} makeQ
 * @returns {Promise<((seen:Set<string>) => object|null)|null>}
 */
export async function quizSource(makeQ) {
  let getQ = null;
  try { getQ = await makeQ(); } catch { return null; }
  if (typeof getQ !== 'function') return null;
  try { if (!getQ(new Set())) return null; } catch { return null; }
  return (seen) => { try { return getQ(seen) || getQ(new Set()); } catch { return null; } };
}

/** 로켓단을 띄워 끝날 때까지 — 문제는 quizSource가 확인한 getQ(seen → 문제)로 · 끝나면 after() */
async function runKorRocket(cur, resume, getQ, after) {
  K.open = true;
  try {
    let chars = [];
    try { chars = (await loadCharacters()) || []; } catch { chars = []; }
    const seen = new Set(); // 이번 습격에 낸 문제 — 같은 낱말·주제가 거듭 나오지 않게
    await playRocket({ cur, resume, chars, quiz: (box, hooks) => battleQuiz(box, hooks, () => getQ(seen), seen) });
  } finally {
    K.open = false;
    if (after) after();
  }
}

/**
 * 걸어 둔 로켓단을 연다 — 노릴 포켓몬을 고르고, 문제 원천을 확인한 뒤, 오늘 몫(rocketKor)과 배틀 기록을 한 트랜잭션에서 → 화면. 열지 못하면 바로 after()
 * @param {{kind:'korean'|'nonsul', visible:() => boolean, makeQ:() => Promise<Function|null>, after:() => void}} o
 *   visible = 그 화면(그 글·그 판)이 아직 떠 있나 · makeQ = 문제 원천(seen → 문제)을 주는 함수
 */
export async function startKorRocket({ kind, visible, makeQ, after }) {
  K.pending = '';
  K.streak = 0;
  const target = rocketPick();
  if (!target || !getPartner() || !visible() || overlayOpen()) { after(); return; }
  // 문제부터 — 원고를 못 받으면 몫을 쓰지 않고 열지 않는다 (🔍 Codex 131차 #1) · 받는 사이 화면을 떠났거나 다른 창이 떴으면 그만
  const getQ = await quizSource(makeQ);
  if (!getQ || !visible() || overlayOpen()) { after(); return; }
  const b = await rocketAdmit(todayKey(), ROCKET.field.kor, ROCKET.maxPerDay, rocketNew({ subject: 'kor', target: target.id, stem: kind }));
  if (b.ok) today().rockets = Math.max(today().rockets + 1, Number(b.daily && b.daily[ROCKET.field.kor]) || 0);
  // 진행 중인 배틀이 있으면(다른 창·앞 배틀) 몫을 쓰지 않고 그것을 이어 간다 — 다른 과목·다른 화면의 배틀이면 그 화면에서 이어 가므로 여기서는 열지 않는다
  if (!b.cur || b.cur.subject !== 'kor' || b.cur.stem !== kind || !visible()) { after(); return; }
  await runKorRocket(b.cur, !b.ok, getQ, after);
}

/**
 * 다음 단추에서 로켓단을 열고, 끝나면 다음으로 한 번만 (🔍 Codex 131차 #2) — 기다리는 자리(at: 국어 물음 번호 · 논술 걸음)를 r.rocketWait에 적어 두어
 *   · 원고를 받거나 저장하는 사이 화면을 다시 그려도(🎧 「글로 읽고 풀기」 등) 새 단추가 잠기고(부르는 쪽이 r.rocketWait를 보고 잠근다)
 *   · 끝난 뒤 next()는 그 자리를 기다리던 때 한 번만 — 그 사이 넘어갔으면(다른 길로 r.rocketWait를 지움) 안 부른다
 *   · 열다가 깨져도 기다림을 풀고 next() — 단추가 영영 잠기지 않게
 * @param {object} r 읽던 글·풀던 판의 상태 @param {number|string} at
 * @param {{kind:'korean'|'nonsul', visible:() => boolean, makeQ:() => Promise<Function|null>, next:() => void}} o
 */
export function korRocketAt(r, at, { kind, visible, makeQ, next }) {
  r.rocketWait = at;
  const done = () => {
    if (r.rocketWait !== at) return;
    r.rocketWait = null;
    next();
  };
  return startKorRocket({ kind, visible, makeQ, after: done }).catch(done);
}

/**
 * 끝나지 않은 국어·논술 로켓단이 있으면 이어 간다 (아버님 결정 (다): 앱이 꺼져도 다음에 열면 이어진다 — 도망칠 수도 억울할 수도 없게)
 * 문제 원천을 못 받으면 열지 않고 저장된 습격을 그대로 둔다 — 다음에 들어올 때 다시 (🔍 Codex 131차 #1)
 * @param {{kind:'korean'|'nonsul', visible:() => boolean, busy:() => boolean, makeQ:() => Promise<Function|null>, after?:() => void}} o
 *   busy = 읽던 글·풀던 판이 있다(그것을 마친 뒤에)
 */
export function resumeKorRocketIfAny({ kind, visible, busy, makeQ, after = null }) {
  // ⏳ 시간이 다 됐으면 다시 열 수 있을 때 · 원고를 받는 사이에도 바뀔 수 있어 받은 뒤 한 번 더 본다
  const can = (cur) => !!cur && cur.subject === 'kor' && cur.stem === kind && !K.open && !isRocketOpen() && visible() && !busy() && !overlayOpen() && !isLocked('korean');
  return profileReady().then(async () => {
    if (!can(rocketCurrent())) return false;
    const getQ = await quizSource(makeQ);
    const cur = rocketCurrent(); // 받는 사이 다른 창이 끝냈을 수도
    if (!getQ || !can(cur)) return false;
    runKorRocket(cur, true, getQ, after);
    return true;
  }).catch(() => false);
}

/** 🧪 시험용 — 지금 상태 (streak·pending·open·today) */
export function korRocketState() {
  return { streak: K.streak, pending: K.pending, open: K.open, today: { ...K.today } };
}
