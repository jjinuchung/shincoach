// 🎯 던지기 예약 장부 (Codex 49차 #1·#2) — 🔢 수학·📚 국어 잡기가 같이 쓴다
//
// 잡기 화면을 띄우기 **전에** 기회 하나를 저장소에서 뺀다(두 창이 같은 기회를 두 번 던지지 못하게). 그런데
// "아직 안 던졌다"는 사실이 메모리에만 있어서, 뺀 뒤 판정 전에 앱이 꺼지거나 새로 고침되면 기회가 영영 사라졌고,
// 돌려주는 저장이 실패해도 결과를 안 보고 잊었다. 그래서 뺀 기회마다 **기기(localStorage)에 한 줄**을 적는다:
//   - 판정이 나는 순간(catch의 attempt — 동기) 지운다 → 쓴 기회
//   - 돌려주기가 저장되면 지운다 → 돌려준 기회
//   - 그 밖(꺼짐·새로 고침·돌려주기 실패)은 줄이 남는다 → 다음에 그 과목에 들어오면 돌려준다(settleHolds)
// 다른 창에서 아직 열려 있는 잡기는 건드리지 않는다 — 열린 동안 HOLD_BEAT_MS마다 beat을 새로 적고,
// beat이 HOLD_STALE_MS 넘게 멈춘 다른 창의 줄만 돌려준다. 이 창의 줄은 지금 쓰는 중(live)이 아니면 바로 돌려준다.

export const HOLD_BEAT_MS = 10 * 1000;
export const HOLD_STALE_MS = 60 * 1000;
export const HOLD_MAX = 50; // 줄이 이보다 많으면 가장 오래된 것부터 버린다(깨진 기록이 끝없이 늘지 않게)

const RID = /^[a-z0-9]{1,40}$/;
const time = (v) => { const n = Math.floor(Number(v)); return Number.isSafeInteger(n) && n >= 0 ? n : 0; };

/** 저장된 장부 고쳐 읽기 (순수) — { rid: { page, at, beat, claim?, claimAt? } } · 모르는 꼴은 버린다 */
export function holdsOf(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const rows = [];
  for (const rid of Object.keys(raw)) {
    const h = raw[rid];
    if (!RID.test(rid) || !h || typeof h !== 'object') continue;
    const page = typeof h.page === 'string' && RID.test(h.page) ? h.page : '';
    const at = time(h.at);
    const row = { page, at, beat: Math.max(at, time(h.beat)) };
    if (typeof h.claim === 'string' && RID.test(h.claim)) { row.claim = h.claim; row.claimAt = time(h.claimAt); }
    rows.push([rid, row]);
  }
  rows.sort((a, b) => b[1].at - a[1].at);
  for (const [rid, row] of rows.slice(0, HOLD_MAX)) out[rid] = row;
  return out;
}

export function holdAdd(map, rid, page, now) {
  const m = holdsOf(map);
  if (RID.test(rid)) m[rid] = { page: RID.test(page) ? page : '', at: time(now), beat: time(now) };
  return holdsOf(m);
}
export function holdDrop(map, rid) {
  const m = holdsOf(map);
  delete m[rid];
  return m;
}
export function holdBeat(map, rid, now) {
  const m = holdsOf(map);
  if (m[rid]) m[rid].beat = Math.max(m[rid].beat, time(now));
  return m;
}
/** 돌려주려고 잡는다 — 다른 창이 같은 줄을 같이 돌려주지 않게(HOLD_STALE_MS 동안) */
export function holdClaim(map, rid, page, now) {
  const m = holdsOf(map);
  if (m[rid]) { m[rid].claim = page; m[rid].claimAt = time(now); }
  return m;
}

/**
 * 지금 돌려줄 줄 (순수) — 오래된 것부터
 * - 이 창의 줄: 지금 쓰는 중(live)이 아니면
 * - 다른 창의 줄: beat이 HOLD_STALE_MS 넘게 멈췄으면(창이 닫혔다)
 * - 다른 창이 HOLD_STALE_MS 안에 돌려주려고 잡은 줄은 빼고
 */
export function holdsDue(map, { page, live, now }) {
  const m = holdsOf(map);
  const t = time(now);
  const busy = live instanceof Set ? live : new Set(live || []);
  return Object.keys(m)
    .filter((rid) => {
      const h = m[rid];
      if (h.claim && h.claim !== page && t - h.claimAt < HOLD_STALE_MS) return false;
      if (h.page === page) return !busy.has(rid);
      return t - h.beat >= HOLD_STALE_MS;
    })
    .sort((a, b) => m[a].at - m[b].at);
}

/** 다른 창의 줄이 오래돼 돌려줄 수 있게 될 때까지 남은 ms (순수) — 기다릴 줄이 없으면 null */
export function holdsWait(map, { page, now }) {
  const m = holdsOf(map);
  const t = time(now);
  let w = null;
  for (const rid of Object.keys(m)) {
    const h = m[rid];
    if (h.page === page) continue;
    const left = HOLD_STALE_MS - (t - h.beat);
    if (left > 0 && (w === null || left < w)) w = left;
  }
  return w;
}

/**
 * 돌려주기 저장 결과 → 'ok' · 'none'(돌려줄 게 없다 — 줄만 지운다) · 'fail'(저장 안 됨 — 줄을 남긴다) (순수)
 * xp.houseDo는 저장 실패를 오류 대신 {ok:false, why:'save'}로 준다 — .catch()만 보면 놓친다 (Codex 49차 #2)
 */
export function refundOutcome(r) {
  if (r && r.ok) return 'ok';
  return r && r.why === 'none' ? 'none' : 'fail';
}

/** 새 이름 — 시각 + 난수 (영문 소문자·숫자) */
export function newRid(rng = Math.random, now = Date.now()) {
  const r = Math.floor((Number(rng()) || 0) * 36 ** 6).toString(36).padStart(6, '0');
  return `${time(now).toString(36)}${r}`.slice(0, 40);
}

/** 이 창(탭)의 이름 — sessionStorage에 두어 **새로 고쳐도 같은 창**(남은 줄을 바로 돌려준다). 못 쓰면 이번 실행만의 이름 */
export const PAGE_ID = (() => {
  const KEY = 'shincoach.pageId';
  try {
    const ss = globalThis.sessionStorage;
    const v = ss && ss.getItem(KEY);
    if (v && RID.test(v)) return v;
    const id = newRid();
    if (ss) ss.setItem(KEY, id);
    return id;
  } catch { return newRid(); }
})();

/**
 * 과목 하나의 장부 — localStorage 한 칸. 읽기·쓰기가 실패해도(사생활 창·꽉 참) 던지기는 그대로 된다(줄만 못 남김)
 * @param {string} key localStorage 열쇠
 * @param {{ls?:Storage, page?:string, now?:()=>number, timers?:{setInterval:Function, clearInterval:Function}}} [o] 시험용 바꿔 끼우기
 */
export function holdStore(key, o = {}) {
  const ls = o.ls || (() => { try { return globalThis.localStorage; } catch { return null; } })();
  const page = o.page || PAGE_ID;
  const now = o.now || (() => Date.now());
  const timers = o.timers || globalThis;
  const live = new Set();
  let settling = null;
  const read = () => { try { return holdsOf(JSON.parse((ls && ls.getItem(key)) || '{}')); } catch { return {}; } };
  const write = (m) => {
    try {
      if (!ls) return false;
      if (Object.keys(m).length) ls.setItem(key, JSON.stringify(m)); else ls.removeItem(key);
      return true;
    } catch { return false; }
  };

  /**
   * 기회 하나를 뺐다 — 줄을 적고 살아 있다는 표시를 시작한다
   * @returns {{rid:string, judged:()=>void, refund:(giveBack:()=>Promise<'ok'|'none'|'fail'>)=>Promise<boolean>}}
   *   judged = 판정이 났다(동기 — 줄을 지운다) · refund = 돌려준다(저장되면 줄을 지우고 true, 아니면 줄을 남기고 false)
   */
  function track(rid = newRid()) {
    live.add(rid);
    write(holdAdd(read(), rid, page, now()));
    let timer = null;
    try { timer = timers.setInterval(() => { if (live.has(rid)) write(holdBeat(read(), rid, now())); }, HOLD_BEAT_MS); } catch { timer = null; }
    const stop = () => { live.delete(rid); if (timer !== null) { try { timers.clearInterval(timer); } catch { /* 무시 */ } timer = null; } };
    let state = 'open';
    return {
      rid,
      judged() {
        if (state !== 'open') return;
        state = 'judged';
        stop();
        write(holdDrop(read(), rid));
      },
      async refund(giveBack) {
        if (state !== 'open') return state === 'refunded';
        state = 'refunding';
        stop(); // 이제 이 창이 쓰는 줄이 아니다 — 실패하면 다음 settle이 다시 돌려준다
        let r = 'fail';
        try { r = await giveBack(); } catch { r = 'fail'; }
        if (r === 'ok' || r === 'none') { write(holdDrop(read(), rid)); state = 'refunded'; return true; }
        state = 'failed';
        return false;
      },
    };
  }

  /**
   * 남은 줄을 돌려준다 — 하나씩, 저장이 실패하면 거기서 멈춘다(다음에 다시). 이 창 안에서 두 번 겹쳐 돌지 않는다
   * @param {()=>Promise<'ok'|'none'|'fail'>} giveBack 기회 하나를 돌려주는 저장 ('none' = 돌려줄 게 없다 — 줄만 지운다)
   * @returns {Promise<number>} 돌려준 수
   */
  function settle(giveBack) {
    if (settling) return settling;
    settling = (async () => {
      let n = 0;
      for (const rid of holdsDue(read(), { page, live, now: now() })) {
        // 돌려주는 사이(저장 기다림) 다른 창이 잡았거나 지웠을 수 있다 — 하나씩 바로 앞에서 다시 본다
        if (!holdsDue(read(), { page, live, now: now() }).includes(rid)) continue;
        write(holdClaim(read(), rid, page, now()));
        let r = 'fail';
        try { r = await giveBack(); } catch { r = 'fail'; }
        if (r !== 'ok' && r !== 'none') break;
        write(holdDrop(read(), rid));
        if (r === 'ok') n++;
      }
      return n;
    })().finally(() => { settling = null; });
    return settling;
  }

  /** 다른 창의 줄이 돌려줄 때가 될 때까지 남은 ms (없으면 null) — 그때 다시 settle하려고 */
  const waitMs = () => holdsWait(read(), { page, now: now() });

  return { track, settle, waitMs, list: read, live };
}
