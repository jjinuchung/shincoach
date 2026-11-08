// 🎟️ 아쿠아리움 손님 맞이 화면 (v401 · 기본안 판 2 「이대로」) — 규칙은 aquatour.js · 아쿠아리움 창(aquaview) 안에서 탭·패널 자리를 빌려 쓴다
// 흐름: (한 주의 첫 손님 앞이면 📊 지난주 장부) → 띵동! 손님 도착 → 🎟️ 매표 문제 → 🎤 해설 질문 셋(2·3·3단계) → 🧾 정산(xp.tourEnd — 한 트랜잭션)
// 문제는 낚시터와 같은 원천(journeyview.loadSources)·같은 과목 몫(덜 한 과목이 더 자주) · 차례 줄은 'aqua'로 낚시와 따로 · 🐟 물고기 수학은 수조에 든 물고기로
// 문제 카드 꼴과 글자 모양은 낚시터 카드(lk- 양식)를 그대로 빌린다 · 틀려도 표값은 그대로 · 아이 화면에 남은 손님·셈 문구 없음
// 하루 기록: 매표·해설 과목마다·단계마다·장부 낸/맞힌 수 · 맞이한 무리 · 받은 💰 (daily aq… — 📤 🎟️ 줄)

import { getProfileSnapshot, lakeRaw, nonsulDayMap, tourEnd, tourBook } from './xp.js';
import { aquaOf } from './aquarium.js';
import { TOUR_LVS, TIP, BOOK_COIN, TOUR_Q, TOUR_LV_Q, TOUR_PAY, TOUR_FM, TOUR_BOOK, TOUR_GROUPS, TOUR_COINS, TOUR_AT, groupSize, ticketOf, tourDay, tourAtBook, seekTourQ, waitingOf, waitingDay, pickVisitors, favOf, payForm, payQuestion, bookOf, jong } from './aquatour.js';
import { SUBJECTS, pickSubject, askOrder, speciesOf } from './fishing.js';
import { fishMathQ, fishMathReady } from './fishmath.js';
import { lvFor } from './lakelevel.js';
import { asker, mathMix, sharesOf, dailyQueue, canListen, fmNode, fmChart } from './lakeview.js';
import { listDaily, getDaily, applyDailyDelta } from './db.js';
import { clockDay, ensureToday } from './timelimit.js';
import { studySec } from './minigame.js';
import { dailyNow } from './gameview.js';
import { ROSTER, characterUrl, artUrl, loadCharacters } from './pokemon.js';
import { sfx } from './sfx.js';

const T = { gen: 0, on: false, box: null, recent: [], onEnd: null, onPaid: null };
const AT = tourAtBook(); // 과목마다 넘긴 자리 (같은 앱 안 — 저장이 늦거나 실패해도 다시 열면 그 뒤부터 · Codex 206차)
if (typeof location !== 'undefined' && /[?&]nosw=1/.test(location.search)) window.__tour = T; // 걷기용

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const monKo = (id) => { const r = ROSTER.find((x) => x.id === Number(id)); return r ? r.ko : '손님'; };
const monUrl = (id) => { try { return characterUrl(id) || artUrl(id) || ''; } catch { return ''; } };
const fishKo = (k) => { const sp = speciesOf(k); return sp ? sp.ko : ''; };
const ga = (w) => `${w}${jong(w) ? '이' : '가'}`;
const eunN = (w) => `${w}${jong(w) ? '은' : '는'}`;

function speak(word) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'en-US';
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  } catch { /* 소리 없이 */ }
}
/** 지금 그날 공부한 초 (🎮 게임기 판·🐾 손님과 같은 셈 — 아직 저장 안 한 과목 초까지) */
function secNow() {
  try { return studySec(dailyNow()); } catch { return 0; }
}
/** 그날(day) 공부한 초 — 시계가 아직 그날이면 지금 셈 · 자정을 넘겼으면 그날 저장된 기록으로 (정산은 시작한 날 몫 — Codex 203차) */
async function secOf(day) {
  if (day === clockDay()) return secNow();
  try { return studySec(await getDaily(day)); } catch { return 0; }
}

export function tourActive() {
  return T.on;
}
/** 손님 맞이를 멈춤 (창을 닫을 때) — 저장 안 한 정산은 없던 일 · 낸 문제 기록은 이미 적힘 */
export function stopTour() {
  T.gen += 1;
  T.on = false;
  if (T.box) { T.box.replaceChildren(); T.box.hidden = true; }
}

/** 수조 아래 한 줄 — 기다리는 손님이 있으면 🎟️ 단추 · 아니면 짧은 말 (셈 없음) */
export function guestBar(box, onStart) {
  if (!box) return;
  box.replaceChildren();
  let w = null;
  try { w = waitingOf(getProfileSnapshot(), Date.now(), secNow()); } catch { w = null; }
  if (w && w.waiting) {
    const b = el('button', 'aq-guest-go', '🎟️ 손님이 왔어요!');
    b.type = 'button';
    b.addEventListener('click', () => onStart());
    box.appendChild(b);
    return;
  }
  const say = !w ? '' : w.empty ? '🐟 수조에 물고기를 넣으면 손님이 와요' : w.full ? '🎟️ 손님들이 내일 또 와요' : '🎟️ 공부하고 오면 손님이 와요';
  if (say) box.appendChild(el('p', 'aq-guest-note', say));
}

// ───────────── 카드 ─────────────

function visitorRow(ids, on, done) {
  const row = el('div', 'aq-vis-row');
  ids.forEach((id, i) => {
    const v = el('span', `aq-vis${i === on ? ' is-on' : ''}${done(i) ? ' is-done' : ''}`);
    const url = monUrl(id);
    if (url) {
      const img = el('img');
      img.alt = '';
      img.src = url;
      img.addEventListener('error', () => { img.replaceWith(el('span', 'aq-vis-paw', '🐾')); });
      v.appendChild(img);
    } else v.appendChild(el('span', 'aq-vis-paw', '🐾'));
    v.appendChild(el('span', 'aq-vis-name', monKo(id)));
    row.appendChild(v);
  });
  return row;
}
/** 새 카드 한 장 (손님 줄 + 카드) — 옛 것을 지우고 그린다 */
function sheet(ids, on, done) {
  const box = T.box;
  box.replaceChildren();
  if (ids && ids.length) box.appendChild(visitorRow(ids, on, done || (() => false)));
  const card = el('div', 'aq-card');
  box.appendChild(card);
  return card;
}
/** 단추 하나를 누를 때까지 (창이 닫히면 영영 안 끝남 — 그 흐름은 버려진다) */
function waitBtn(card, text, cls = 'lk-go') {
  return new Promise((resolve) => {
    const b = el('button', cls, text);
    b.type = 'button';
    b.addEventListener('click', () => { b.disabled = true; resolve(); }, { once: true });
    card.appendChild(b);
    try { b.focus(); } catch { /* 무시 */ }
  });
}
/** 물음 글 — em(밑줄 낱말)이 있으면 그 낱말만 <u> (낚시터 카드와 같다) */
function qText(box, q) {
  const t = String(q.q || q.text || '');
  const i = q.em ? t.indexOf(q.em) : -1;
  if (i < 0) { box.appendChild(document.createTextNode(t)); return; }
  box.appendChild(document.createTextNode(t.slice(0, i)));
  box.appendChild(el('u', 'lk-em', q.em));
  box.appendChild(document.createTextNode(t.slice(i + q.em.length)));
}
/**
 * 문제 한 장 → true(맞힘) | false · head = 카드 머리(누가 묻나) · okSay = 맞혔을 때 한 줄 · next = 다음 단추 글
 * 문제 꼴은 낚시터와 같다 — 수학 qNode · 영어 word(🔊) · listen(🔊 소리만) · 국어·논술 q · sentence · tip · 틀린 보기의 hint
 */
function askCard(card, q, { head, okSay, next }) {
  const me = T.gen;
  const top = el('div', 'lk-card-head');
  if (head) top.appendChild(el('span', 'lk-stage', head));
  top.appendChild(el('span', 'lk-subj', q.label || ''));
  card.appendChild(top);
  const qBox = el('div', 'lk-q');
  const hear = (word) => {
    const hb = el('button', 'lk-hear', '🔊');
    hb.type = 'button';
    hb.setAttribute('aria-label', '다시 듣기');
    hb.addEventListener('click', () => speak(word));
    qBox.appendChild(hb);
    speak(word);
  };
  if (typeof q.qNode === 'function') qBox.appendChild(q.qNode());
  else if (q.listen) { qText(qBox, q); hear(q.listen); } else if (q.word) {
    qBox.appendChild(el('span', 'lk-word', q.word));
    qBox.appendChild(document.createTextNode(' 의 뜻은?'));
    hear(q.word);
  } else qText(qBox, q);
  if (q.sentence) qBox.appendChild(el('div', 'lk-sent', q.sentence));
  card.appendChild(qBox);
  if (q.tip) card.appendChild(el('p', 'lk-tip', q.tip));
  const box = el('div', 'lk-choices');
  card.appendChild(box);
  try { if (/[?&]nosw=1/.test(location.search)) window.__tourQ = q; } catch { /* 무시 */ } // 걷기용
  return new Promise((resolve) => {
    let picked = false;
    q.choices.forEach((c, i) => {
      const b = el('button', 'lk-choice');
      b.type = 'button';
      if (typeof c.node === 'function') b.appendChild(c.node()); else b.textContent = c.text;
      b.setAttribute('aria-label', `${i + 1}번 ${c.text}`);
      b.addEventListener('click', async () => {
        if (picked || me !== T.gen) return;
        picked = true;
        box.querySelectorAll('button').forEach((x) => { x.disabled = true; });
        const ok = !!c.ok;
        b.classList.add(ok ? 'is-ok' : 'is-no');
        if (!ok) box.querySelectorAll('button')[q.choices.findIndex((x) => x.ok)].classList.add('is-ans');
        try { (ok ? sfx.ding : sfx.wrong)(); } catch { /* 무시 */ }
        if (q.reveal) qBox.appendChild(el('div', 'lk-reveal', q.reveal));
        if (q.sayAfter) speak(q.sayAfter);
        if (ok) card.appendChild(el('p', 'aq-card-ok', okSay || '정답!'));
        else {
          const right = q.choices.find((x) => x.ok);
          card.appendChild(el('p', 'lk-hint', c.hint || (q.solve ? `정답은 ${right ? right.text : ''}. ${q.solve}` : `정답은 ${right ? right.text : ''}`)));
        }
        await waitBtn(card, ok ? next : '알겠어요');
        if (me === T.gen) resolve(ok);
      });
      box.appendChild(b);
    });
  });
}

// ───────────── 흐름 ─────────────

/** 💰가 들어옴 — 창 위 💰를 바로 */
function paid() {
  try { if (T.onPaid) T.onPaid(); } catch { /* 무시 */ }
}
/** 수조에 든 물고기만 남긴 낚시 기록 — 🐟 물고기 수학을 수조 물고기로 */
function tankRaw(p) {
  const lk = lakeRaw();
  const keep = new Set(aquaOf(p).fish);
  return { ...lk, dex: Object.fromEntries(Object.entries((lk && lk.dex) || {}).filter(([k]) => keep.has(k))) };
}
const seedNow = () => ((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0) || 1;

/** 📊 지난주 장부 — 막대그래프 + 질문 둘 → xp.tourBook (못 적으면 다음에 또 볼 수 있다) · day = 장부를 연 날(자정을 넘겨 덮어도 그날 기준 — Codex 206차) */
async function runBook(book, log, alive, day) {
  let good = 0;
  for (let i = 0; i < book.qs.length; i++) {
    const card = sheet([], -1);
    card.appendChild(el('b', 'aq-card-title', `📊 ${book.title}`));
    card.appendChild(fmChart({ bars: book.bars.map((b) => ({ ko: b.ko, v: b.v })), unit: book.unit }));
    const ok = await askCard(card, book.qs[i], { head: '', okSay: `정답! 💰${BOOK_COIN}`, next: i + 1 < book.qs.length ? '다음 질문' : '장부 덮기' });
    if (!alive()) return;
    log.put({ [TOUR_BOOK[0]]: 1, [TOUR_BOOK[1]]: ok ? 1 : 0 });
    if (ok) good += 1;
  }
  let r = null;
  try { r = await tourBook({ week: book.week, good, day }); } catch { r = null; }
  if (r && r.ok && r.coins) log.put({ [TOUR_COINS]: r.coins }); // 💰가 들어갔으면 창을 닫았어도 📤에 (Codex 203차)
  if (!alive()) return;
  if (r && r.ok && r.coins) paid();
  if (r && !r.ok && r.why === 'save') {
    const card = sheet([], -1);
    card.appendChild(el('p', 'lk-hint', '장부를 적지 못했어요 — 다음에 다시 볼 수 있어요'));
    await waitBtn(card, '알겠어요');
  }
}

/** 🎟️ 손님 맞이 시작 — box = 창 안 자리 · onEnd = 끝나거나 그만둘 때(창이 다시 그린다) · onPaid = 💰가 들어온 때(창 위 💰를 바로 고친다) */
export async function startTour(box, onEnd, onPaid) {
  if (T.on) return;
  T.gen += 1;
  const me = T.gen;
  const alive = () => me === T.gen && T.on;
  T.on = true;
  T.box = box;
  T.onEnd = onEnd;
  T.onPaid = onPaid || null;
  box.hidden = false;
  const finish = () => { if (me !== T.gen) return; T.on = false; box.replaceChildren(); box.hidden = true; const f = T.onEnd; T.onEnd = null; if (f) { try { f(); } catch { /* 무시 */ } } };
  const wait = sheet([], -1);
  wait.appendChild(el('p', 'aq-card-say', '손님을 맞을 준비를 하고 있어요…'));
  try {
    const [{ loadSources }] = await Promise.all([import('./journeyview.js'), loadCharacters().catch(() => null)]);
    let src = null;
    try { src = await loadSources(); } catch { src = null; }
    try { await ensureToday(); } catch { /* 시계가 읽은 날 그대로 */ } // 자정을 막 넘겼으면 시계의 날 바꿈부터 (Codex 206차)
    if (!alive()) return;
    // 시작한 날과 그날 공부 초를 한꺼번에 — 기다리는 손님 다시 보기 · 무리 번호 · 정산 · 하루 기록이 모두 이 날을 본다 (Codex 206차)
    const today = clockDay();
    const sec0 = secNow(); // 아직 저장 안 한 초까지 — 날이 바뀌며 그 초를 못 적어도 시작할 때 받은 자격은 그대로
    const secAt = async () => Math.max(sec0, await secOf(today));
    // 하루 기록은 맞이를 시작한 날에 — 자정을 넘겨 끝내도 💰를 적는 날(정산 규칙)과 같게 · 다시 적을 때도 (Codex 203차)
    const log = dailyQueue(applyDailyDelta, () => today);
    let days = [];
    try { days = await listDaily(); } catch { days = []; }
    if (!alive()) return;
    const d = days.find((x) => x && x.date === today) || null;
    // 📊 한 주의 첫 손님 앞에 지난주 장부
    const book = bookOf(getProfileSnapshot(), Date.now());
    if (book) { await runBook(book, log, alive, today); if (!alive()) return; }
    const sec = await secAt();
    if (!alive()) return;
    const p = getProfileSnapshot();
    if (!waitingDay(p, today, sec).waiting) { finish(); return; }
    const n = groupSize(p);
    const t = ticketOf(p);
    const rec = tourDay(p, today);
    const ids = pickVisitors(p, today, rec.n, n);
    const doneTo = (k) => (i) => i < k;

    // 띵동!
    let card = sheet(ids, -1);
    card.appendChild(el('b', 'aq-card-title', '띵동! 손님이 왔어요'));
    card.appendChild(el('p', 'aq-card-say', '수조를 보러 왔대요. 표를 팔고 수조를 안내해 줘요!'));
    try { sfx.success(); } catch { /* 무시 */ }
    await waitBtn(card, '🎟️ 맞이하기', 'aq-btn');
    if (!alive()) return;

    // 🎟️ 매표
    const seed = seedNow();
    const pq = payQuestion({ n, t, form: payForm(rec.n, rec.g, t, seed), prev: rec.g, seed });
    card = sheet(ids, -1);
    const payOk = await askCard(card, pq, { head: '「표 주세요!」', okSay: '딱 맞아요! 표를 건넸어요.', next: '수조 안내하기' });
    if (!alive()) return;
    log.put({ [TOUR_PAY[0]]: 1, [TOUR_PAY[1]]: payOk ? 1 : 0 });

    // 🎤 해설 셋 — 2·3·3단계 · 과목은 낚시터와 같은 몫
    const raw = tankRaw(p);
    const fmReady = (() => { try { return fishMathReady(raw); } catch { return false; } })();
    const avail = SUBJECTS.filter((s) => (src && src[s]) || (s === 'math' && fmReady));
    const shares = avail.length ? sharesOf(days, nonsulDayMap(), today, avail) : {};
    // 차례 줄에서 넘긴 자리는 낸 문제와 따로 적는다 — 단계가 낮아 버린 문제까지 넘겨 다시 열면 그 뒤부터 (Codex 203차)
    const start = AT.start(d, today);
    const pos = { ...start };
    const stepped = (s, step) => { pos[s] += step; AT.moved(today, s, pos[s]); log.put({ [TOUR_AT[s]]: step }); };
    const inner = mathMix(asker(src || {}, today, start, 'aqua', stepped), (sd, avoid, lv) => {
      const q = fishMathQ(raw, sd, avoid, lv, null);
      return q ? { ...q, qNode: () => fmNode(q) } : null;
    });
    let good = 0;
    for (let i = 0; i < TOUR_LVS.length && avail.length; i++) {
      // 1단계로 내려온 문제는 버리고 더 찾는다(판 2 — seekTourQ) · 끝내 2·3단계를 못 만들면 이 질문은 건너뛴다(표값은 그대로)
      const found = seekTourQ(askOrder(shares, T.recent, pickSubject(shares, T.recent)), (s) => inner(s, seedNow(), lvFor(s, TOUR_LVS[i], { listen: canListen() })));
      if (!found) continue;
      const { q, subj } = found;
      T.recent.push(subj);
      if (T.recent.length > 6) T.recent.shift();
      const who = i < ids.length ? monKo(ids[i]) : '손님';
      card = sheet(ids, i, doneTo(i));
      const ok = await askCard(card, q, { head: `${who}의 질문`, okSay: `정답! 🎤 팁 💰${TIP}`, next: i + 1 < TOUR_LVS.length ? '다음 손님' : '🧾 정산하기' });
      if (!alive()) return;
      const lv = TOUR_LV_Q[q.lv] ? { [TOUR_LV_Q[q.lv][0]]: 1, [TOUR_LV_Q[q.lv][1]]: ok ? 1 : 0 } : {};
      log.put({ [TOUR_Q[subj][0]]: 1, [TOUR_Q[subj][1]]: ok ? 1 : 0, ...(q.fm ? { [TOUR_FM[0]]: 1, [TOUR_FM[1]]: ok ? 1 : 0 } : {}), ...lv });
      if (ok) good += 1;
    }

    // 🧾 정산 — 저장된 프로필로 한 트랜잭션 (못 적으면 🔁 다시) · 시작한 날(day)과 그날 몇째 무리(k)로 — 같은 무리는 한 번만 ·
    // 공부 초는 그날 것을 받을 때마다 다시 · 시작할 때 센 초보다 적게 보지 않는다 (Codex 203·206차)
    const likes = favOf(p, seed, n);
    const req = { day: today, k: rec.n, n, t, good, likes, visitors: ids };
    for (;;) {
      req.sec = await secAt();
      if (!alive()) return;
      let r = null;
      try { r = await tourEnd(req); } catch { r = null; }
      if (r && r.ok) log.put({ [TOUR_GROUPS]: 1, [TOUR_COINS]: r.coins }); // 💰가 들어갔으면 창을 닫았어도 📤에 (Codex 203차)
      if (!alive()) return;
      card = sheet(ids, -1, () => true);
      if (r && r.ok) {
        paid();
        try { sfx.success(); } catch { /* 무시 */ }
        card.appendChild(el('b', 'aq-card-title', '🧾 정산'));
        const pay = el('div', 'aq-pay');
        pay.appendChild(el('span', '', `🎟️ 표값 💰${r.fare}`));
        if (r.tips) pay.appendChild(el('span', '', `🎤 해설 팁 💰${r.tips}`));
        pay.appendChild(el('strong', '', `모두 💰${r.coins} 받았어요`));
        card.appendChild(pay);
        if (ids[0] && likes[0]) card.appendChild(el('p', 'aq-card-say', `${monKo(ids[0])}: 「${ga(fishKo(likes[0]))} 제일 멋졌어요! 또 올게요.」`));
        if (ids[1] && likes[1]) card.appendChild(el('p', 'aq-card-say', `${eunN(monKo(ids[1]))} ${ga(fishKo(likes[1]))} 제일 멋졌대요.`));
        await waitBtn(card, '수조로 돌아가기');
        break;
      }
      const why = (r && r.why) || 'save';
      if (why === 'save') {
        card.appendChild(el('p', 'lk-hint', '표값을 적지 못했어요 — 한 번 더 눌러 봐요'));
        await waitBtn(card, '🔁 다시 받기');
        if (!alive()) return;
        continue;
      }
      card.appendChild(el('p', 'lk-hint', why === 'clock' ? '오늘은 표값을 적을 수 없어요 — 아빠에게 말해요' : '손님들이 벌써 구경을 마쳤어요'));
      await waitBtn(card, '수조로 돌아가기');
      break;
    }
    if (!alive()) return;
    log.flush().catch(() => {});
    finish();
  } catch (err) {
    if (me !== T.gen) return; // 닫힌 옛 맞이의 오류는 새로 연 창에 안 띄운다 (Codex 203차)
    finish();
    throw err;
  }
}
