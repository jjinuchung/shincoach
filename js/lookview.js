// 📖 풀이 돌아보기 화면 부품 (v248) — 틀린 문제 풀이 한 줄씩 열기 · 🔍 셋 중 고르기. 규칙은 lookback.js, 그리기는 여기.
//
// 연 줄 수(open)·고르기 마침(rq)·한 번 틀림(rqMiss)은 이 답의 기록(st — 개념 편 r.answers[r.at] · 🎯 c.results[c.at])에 적는다 —
// 🎒·📊에 다녀와 다시 그려도 그대로. 점수·보상·노트·tries는 안 건드린다.
// Codex 60차 #2: 새로 연 줄은 화면 읽기 프로그램이 읽어 주고(role=status), 단추가 사라지거나 잠기면 초점을 다음 할 일로 옮긴다.
// 안내는 색에만 기대지 않는다(👉 표시). 맨 위에서 DOM을 건드리지 않는다 — 시험은 가짜 document로 누른다.

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** 초점만 옮기고 화면은 안 밀기 */
export function focusQuiet(e) {
  if (!e || typeof e.focus !== 'function') return;
  try { e.focus({ preventScroll: true }); } catch { e.focus(); }
}

/** 화면 읽기 프로그램이 조용히 읽어 주는 자리 */
function statusEl(cls) {
  const p = el('p', cls);
  p.setAttribute('role', 'status');
  p.setAttribute('aria-live', 'polite');
  return p;
}

/** 한 줄(요소 묶음)의 글 — 묶음 안의 다른 요소를 담은 그릇(상자·목록)은 빼고 (숨은 줄까지 읽지 않게) */
function lineText(u) {
  return u.filter((e) => !u.some((o) => o !== e && typeof e.contains === 'function' && e.contains(o)))
    .map((e) => e.textContent || '').join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * 📖 한 줄씩 열기 — units: 줄마다 함께 보일 요소 묶음(이미 화면 차례대로 붙어 있다). ready(): 🔍 고르기를 마쳤나.
 * 부르는 쪽이 `say`(읽어 주는 자리)는 늘, `btn`은 done이 아닐 때 붙인다.
 * @returns {{btn:HTMLElement, say:HTMLElement, done:boolean, onDone:(Function|null), refresh:Function}}
 *   done: 그릴 때 이미 다 열렸다(onDone은 아이가 마지막 줄을 열 때만 — 한 번)
 */
export function lineReveal(units, st, ready) {
  const btn = el('button', 'btn math-line-btn');
  btn.type = 'button';
  const say = statusEl('sr-only');
  const out = { btn, say, done: false, onDone: null, refresh: null };
  if (typeof st.open !== 'number') st.open = ready() ? Math.min(1, units.length) : 0; // 첫 줄은 바로 (🔍가 있으면 고른 결과가 첫 줄)
  const show = (byKid) => {
    units.forEach((u, k) => { for (const e of u) e.hidden = k >= st.open; });
    const left = units.length - st.open;
    btn.hidden = !ready() || left <= 0;
    btn.textContent = `▶ 다음 줄 보기 (${left}줄 남았어요)`;
    if (ready() && left <= 0 && !out.done) {
      out.done = true;
      if (byKid) { btn.remove(); if (out.onDone) out.onDone(); }
    }
  };
  btn.addEventListener('click', () => {
    if (out.done) return;
    if (st.open < units.length) { st.open += 1; say.textContent = lineText(units[st.open - 1]); }
    show(true);
    if (!out.done) btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  // 🔍 고르기를 마쳤을 때 — 고른 단추가 사라졌으니 초점을 "다음 줄"로 (줄이 없으면 onDone 쪽이 옮긴다)
  out.refresh = () => { show(true); if (!out.done) focusQuiet(btn); };
  show(false);
  return out;
}

/**
 * 🔍 내 답 돌아보기 — 셋 중 내 답의 까닭을 고른다. 틀리면 맞는 문장에 👉를 붙여 칠하고 그것만 누를 수 있게(다시 고르기).
 * o: { title, lead?(요소), node?(글 → 노드, 분수 글은 richNode), result(box, 맞는 문장) — 고른 뒤 이 자리에 남길 모양,
 *      onFirst?(맞음 0|1) — 처음 누른 문장이 맞았나 (📊 첫 선택 기록, v252) }
 */
export function reviewQuizEl(qz, st, o, onPass) {
  const node = o.node || ((t) => document.createTextNode(t));
  const box = el('div', 'math-review');
  const settle = () => { box.innerHTML = ''; box.className = 'math-review is-done'; o.result(box, qz.opts[qz.ok]); };
  if (st.rq) { settle(); return box; }
  box.appendChild(el('div', 'math-solve-h', o.title));
  if (o.lead) box.appendChild(o.lead);
  const list = el('div', 'math-review-opts');
  const msg = statusEl('math-review-msg');
  msg.textContent = '맞혀도 틀려도 점수는 그대로예요 — 내 답에 맞는 까닭을 찾아요';
  const btns = qz.opts.map((t, k) => {
    const b = el('button', 'btn math-review-opt');
    b.type = 'button';
    b.appendChild(node(t));
    b.addEventListener('click', () => {
      if (st.rq) return;
      // 첫 선택만 알린다(v252) — 한 번 틀리면 맞는 문장만 누를 수 있어 그 뒤는 첫 선택이 아니다
      if (!st.rqMiss && o.onFirst) o.onFirst(k === qz.ok ? 1 : 0);
      if (k === qz.ok) { st.rq = 1; settle(); onPass(); return; }
      st.rqMiss = 1;
      hint(true);
    });
    list.appendChild(b);
    return b;
  });
  // 한 번만 불린다 — 틀린 보기를 한 번 누르면 나머지가 잠겨 또 틀릴 수 없다 (🎒 복원은 rqMiss로 처음부터 그린다)
  const hint = (byKid) => {
    btns.forEach((b, k) => {
      if (k === qz.ok) { b.classList.add('is-hint'); b.insertBefore(el('span', 'math-review-point', '👉 '), b.firstChild); }
      else { b.disabled = true; b.classList.add('is-off'); }
    });
    msg.textContent = '🔍 👉 표시한 문장이 내 답에 맞는 까닭이에요 — 읽고 눌러 보세요';
    if (byKid) focusQuiet(btns[qz.ok]); // 누른 단추가 잠겼다 — 초점을 누를 수 있는 문장으로
  };
  box.appendChild(list);
  box.appendChild(msg);
  if (st.rqMiss) hint(false);
  return box;
}
