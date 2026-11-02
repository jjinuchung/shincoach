// 📸 액자 사진 화면 (v384 — 2026-11-02 아버님 기본안 「추천대로」) — 📷 앨범 탭 · 🔍 크게 보기 · 벽 🖼️ 액자 속 작은 사진
// 규칙은 photo.js(순수), 저장은 xp.takePhoto·hangPhoto(houseDo) — 이 파일은 그리기만 하고, 누르면 무엇을 할지는 houseview가 준다(o.onPick …)
// 진우 화면 규칙: 「N장 남음」 같은 셈은 쓰지 않는다 · 무엇을 빼는지는 그림과 날짜로 보여 준다(kid-visible-feedback)
import { photoStageHtml, photoCaption, skyOf } from './playart.js';
import { dayNum } from './korean.js';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
/** 사진 무대마다 다른 이름 — 한 화면에 여러 장이어도 그림 안 이름이 겹치지 않게 */
let seq = 0;

/** 찍은 날 「11월 3일」 (순수) */
export function photoDate(at) {
  const d = new Date(at);
  return Number.isFinite(d.getTime()) ? `${d.getMonth() + 1}월 ${d.getDate()}일` : '';
}
/** 사진 아래 두 줄 (순수) — { date: 「11월 3일」, line: 「📺 개굴닌자와 TV를 봤어요」 } · ko = 파트너 이름(없으면 혼자) · gko = 🐾 손님 이름(v385) */
export function photoLabel(rec, ko, gko = '') {
  return { date: photoDate(rec.at), line: photoCaption(rec.scene, rec.mon ? ko : '', rec.g ? gko : '') };
}

/**
 * 사진 한 장 그림 (DOM) — o = { monKo(id), monUrl(id) → 그림 주소|'' , queueArt(id, node) → Promise<주소|''> }
 * 파트너·🐾 손님 그림을 아직 안 받았으면 🐾로 그리고, 받아 오면 다시 그린다(그 자리가 아직 화면에 있을 때만)
 */
export function photoEl(rec, o, cls = 'photo-art') {
  const box = el('div', cls);
  const draw = () => {
    seq = (seq + 1) % 1e6;
    const d = new Date(rec.at);
    box.innerHTML = photoStageHtml(rec, {
      ko: rec.mon ? o.monKo(rec.mon) : '', url: rec.mon ? o.monUrl(rec.mon) || '' : '',
      gko: rec.g ? o.monKo(rec.g) : '', gurl: rec.g ? o.monUrl(rec.g) || '' : '',
      day: dayNum(rec.at), sky: skyOf(d.getHours()), uid: `ph${seq}`,
    });
  };
  draw();
  if (typeof o.queueArt === 'function') {
    for (const id of [rec.mon, rec.g]) {
      if (id && !o.monUrl(id)) o.queueArt(id, box).then((u) => { if (u && box.isConnected) draw(); }).catch(() => {});
    }
  }
  return box;
}

/** 사진 카드 (그림 + 날짜 + 한 줄) — tag = 'button'이면 누를 수 있다 */
function cardEl(rec, o, tag, extra = '') {
  const c = el(tag, `photo-card${extra}`);
  if (tag === 'button') c.type = 'button';
  const lb = photoLabel(rec, rec.mon ? o.monKo(rec.mon) : '', rec.g ? o.monKo(rec.g) : '');
  c.appendChild(photoEl(rec, o));
  c.appendChild(el('span', 'photo-date', lb.date));
  c.appendChild(el('span', 'photo-line', lb.line));
  c.setAttribute('aria-label', `${lb.date} ${lb.line}`);
  return c;
}

/**
 * 📷 앨범 (DOM) — o = { list: 사진들(새것부터), hung: Set(걸린 사진 id), mode: 'view' | 'hang' | 'drop', pending: 새 사진(drop일 때), sel: 고른 사진 id,
 *   onPick(id), onDrop(id), onCancel(), monKo, monUrl, queueArt }
 *  · view: 누르면 크게 보기 · hang: 누르면 그 사진을 액자에 · drop(앨범이 가득 참): 누르면 고르고 → [🗑️ 이 사진 빼고 새 사진 넣기]
 */
export function albumBox(o) {
  const sec = el('div', `house-sec photo-album is-${o.mode}`);
  const title = o.mode === 'drop' ? '📷 앨범이 가득 찼어요' : o.mode === 'hang' ? '🖼️ 액자에 걸 사진을 골라요' : '📷 앨범';
  sec.appendChild(el('h3', 'house-h', title));
  let note = '';
  if (o.mode === 'drop') note = '새 사진을 넣으려면 뺄 사진을 하나 골라요';
  else if (!o.list.length) note = '놀기가 끝나면 📸 사진 찍기를 눌러 남겨요 — 벽에 건 🖼️ 액자에 걸 수 있어요';
  else if (o.mode === 'view') note = '사진을 누르면 크게 봐요 · 🖼️ 액자를 눌러 사진을 걸어요';
  if (note) sec.appendChild(el('p', 'photo-note', note));
  if (o.mode !== 'view') {
    const back = el('button', 'btn photo-cancel', o.mode === 'drop' ? '그만두기 (새 사진은 안 넣어요)' : '그만두기');
    back.type = 'button';
    back.addEventListener('click', () => o.onCancel());
    sec.appendChild(back);
  }
  if (o.mode === 'drop' && o.pending) {
    const row = el('div', 'photo-new');
    row.appendChild(el('span', 'photo-new-tag', '📸 새 사진'));
    row.appendChild(cardEl({ ...o.pending, at: o.pending.at || Date.now() }, o, 'div', ' is-new'));
    sec.appendChild(row);
  }
  if (o.list.length) {
    const grid = el('div', 'photo-grid');
    for (const rec of o.list) {
      const c = cardEl(rec, o, 'button', o.sel === rec.id ? ' is-sel' : '');
      if (o.hung && o.hung.has(rec.id)) c.appendChild(el('span', 'photo-hung', '🖼️ 걸었어요'));
      c.addEventListener('click', () => o.onPick(rec.id));
      grid.appendChild(c);
    }
    sec.appendChild(grid);
  }
  if (o.mode === 'drop' && o.sel && o.list.some((x) => x.id === o.sel)) {
    const go = el('button', 'btn btn-primary photo-drop', '🗑️ 고른 사진을 빼고 새 사진 넣기');
    go.type = 'button';
    go.addEventListener('click', () => o.onDrop(o.sel));
    sec.appendChild(go);
  }
  return sec;
}

// ───────────────────── 🔍 크게 보기 ─────────────────────
let big = null;
let bigFocus = null;
/** 닫을 때 돌아갈 단추가 사라졌으면(그새 다시 그림) 대신 갈 곳 — o.backTo() (집은 [📷 앨범] 탭) */
let bigBack = null;
function focusBigClose() {
  const c = big && big.querySelector('.photo-big-close');
  if (c) { try { c.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ } }
}
/** 크게 보기 (DOM — 처음 부를 때 만든다) · 닫기 단추 · 바깥을 눌러도 · Esc로도 닫힌다 · 떠 있는 동안 초점은 이 안에 (Codex 187차 #5) */
export function showPhotoBig(rec, o) {
  if (!big) {
    big = el('div', 'photo-big');
    big.hidden = true;
    big.setAttribute('role', 'dialog');
    big.setAttribute('aria-modal', 'true');
    big.setAttribute('aria-label', '사진 크게 보기');
    big.innerHTML = '<div class="photo-big-card"><div class="photo-big-slot"></div><p class="photo-big-date"></p><p class="photo-big-line"></p><button type="button" class="btn btn-primary photo-big-close">닫기</button></div>';
    document.body.appendChild(big);
    big.addEventListener('click', (e) => { if (e.target === big) closePhotoBig(); });
    big.querySelector('.photo-big-close').addEventListener('click', () => closePhotoBig());
    // ⌨️ Esc = 닫기 · Tab = 누를 것이 닫기 하나뿐이라 그 자리 (가려진 집 화면으로 빠지지 않게)
    big.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePhotoBig(); } else if (e.key === 'Tab') { e.preventDefault(); focusBigClose(); }
    });
    document.addEventListener('focusin', (e) => { if (!big.hidden && !big.contains(e.target)) focusBigClose(); });
  }
  const lb = photoLabel(rec, rec.mon ? o.monKo(rec.mon) : '', rec.g ? o.monKo(rec.g) : '');
  const slot = big.querySelector('.photo-big-slot');
  slot.innerHTML = '';
  slot.appendChild(photoEl(rec, o, 'photo-art is-big'));
  big.querySelector('.photo-big-date').textContent = lb.date;
  big.querySelector('.photo-big-line').textContent = lb.line;
  if (big.hidden) { bigFocus = document.activeElement; bigBack = typeof o.backTo === 'function' ? o.backTo : null; } // 떠 있는 채 다시 열면 처음 자리 그대로
  big.hidden = false;
  focusBigClose();
}
export function closePhotoBig() {
  if (!big || big.hidden) return;
  big.hidden = true;
  const slot = big.querySelector('.photo-big-slot');
  if (slot) slot.innerHTML = '';
  let back = bigFocus;
  if (!(back && back.isConnected) && bigBack) { try { back = bigBack(); } catch { back = null; } } // 그새 다시 그려 단추가 사라졌으면 대신 갈 곳
  bigFocus = null;
  bigBack = null;
  if (back && back.isConnected && typeof back.focus === 'function') { try { back.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ } }
}
