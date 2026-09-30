// 🔢 숫자판 답칸 화면 — mathpad.js(순수 규칙)가 정한 칸을 그린다. 채점은 하지 않는다:
// "확인"을 누르면 onSubmit(친 답)을 부르고, math.js가 matchTyped로 보기 번호를 찾아 원래 채점 길(answer)로 보낸다.
//
// 모양 (2026-10-01, 아버님 "시작하자" — 수가 답인 ① 계산은 보기 대신 직접 쓴다):
//   [수] [분수] ([대분수])  ← 아이가 바꾼다 (분수 × 자연수의 "분모에도 곱함" 오답은 분수라 칸을 고정하면 못 친다)
//   칸: 수 [ 12.5 ] cm² · 분수 분자/분모 세로 · 대분수 [2] + 분자/분모 · 비 [ 8 ] : [ 5 ]
//   숫자 키 · (음수 줄기면 − / + 키) · ⌫ · 확인 · 🤷 모르겠어요
// 칸을 눌러 고르고 숫자를 친다 — 여러 자리를 치므로 저절로 다음 칸으로 넘어가지 않는다.
import { readTyped } from './mathpad.js';

const MODE_LABEL = { num: '수', frac: '분수', mixed: '대분수', ratio: '비' };
const FIELDS = { num: ['x'], frac: ['n', 'd'], mixed: ['w', 'n', 'd'], ratio: ['a', 'b'] };
const FIELD_LABEL = { x: '답', n: '분자', d: '분모', w: '자연수', a: '앞', b: '뒤' };
const DOT_OK = new Set(['x', 'a', 'b']); // 소수점을 칠 수 있는 칸
const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'];
const MAX = 7;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/**
 * 숫자판 한 벌.
 * @param {{modes:string[], start:string, unit:string, signed:boolean}} spec padSpec의 결과
 * @param {{onSubmit:(typed:{text:string,val:object}) => void, onIdk:() => void}} hooks
 * @returns {HTMLElement}
 */
export function padBox(spec, { onSubmit, onIdk }) {
  const box = el('div', 'math-pad');
  let mode = spec.start;
  let parts = { sign: '', x: '', w: '', n: '', d: '', a: '', b: '' };
  let focus = FIELDS[mode][0];
  let done = false;

  // 칸 바꾸기 — 한 가지뿐이면(비) 안 보인다
  const modeRow = el('div', 'math-pad-modes');
  if (spec.modes.length > 1) {
    box.appendChild(el('p', 'math-pad-lead', '✍️ 답을 직접 써요 — 분수면 [분수]를 눌러요'));
    for (const m of spec.modes) {
      const b = el('button', 'btn math-pad-mode', MODE_LABEL[m]);
      b.type = 'button';
      b.dataset.mode = m;
      b.addEventListener('click', () => {
        if (done || mode === m) return;
        mode = m; parts = { ...parts, x: '', w: '', n: '', d: '', a: '', b: '' }; focus = FIELDS[m][0];
        paint();
      });
      modeRow.appendChild(b);
    }
    box.appendChild(modeRow);
  } else {
    box.appendChild(el('p', 'math-pad-lead', '✍️ 답을 직접 써요'));
  }

  const show = el('div', 'math-pad-show');
  box.appendChild(show);

  const keys = el('div', 'math-pad-keys');
  const keyBtns = {};
  for (const k of KEYS) {
    const b = el('button', `btn math-pad-key${k === '⌫' ? ' is-del' : ''}`, k);
    b.type = 'button';
    b.addEventListener('click', () => press(k));
    keyBtns[k] = b;
    keys.appendChild(b);
  }
  if (spec.signed) {
    for (const [k, lab] of [['-', '− 음수'], ['+', '+ 양수']]) {
      const b = el('button', 'btn math-pad-key is-sign', lab);
      b.type = 'button';
      b.dataset.sign = k;
      b.addEventListener('click', () => { if (done) return; parts.sign = parts.sign === k ? '' : k; paint(); });
      keyBtns[k] = b;
      keys.appendChild(b);
    }
  }
  box.appendChild(keys);

  const row = el('div', 'math-pad-actions');
  const ok = el('button', 'btn btn-primary btn-big-wide math-pad-ok', '확인');
  ok.type = 'button';
  ok.addEventListener('click', () => {
    if (done) return;
    const typed = readTyped(mode, parts, spec);
    if (!typed) return;
    done = true;
    paint();
    onSubmit(typed);
  });
  const idk = el('button', 'btn math-pad-idk', '🤷 모르겠어요');
  idk.type = 'button';
  idk.addEventListener('click', () => { if (done) return; done = true; paint(); onIdk(); });
  row.appendChild(ok);
  row.appendChild(idk);
  box.appendChild(row);

  function press(k) {
    if (done) return;
    const v = parts[focus] || '';
    if (k === '⌫') parts[focus] = v.slice(0, -1);
    else if (k === '.') { if (DOT_OK.has(focus) && !v.includes('.') && v.length < MAX) parts[focus] = v ? `${v}.` : '0.'; }
    else if (v.length < MAX) parts[focus] = v === '0' ? k : v + k;
    paint();
  }

  /** 칸 하나 — 누르면 그 칸에 친다 */
  function field(f) {
    const b = el('button', `math-pad-field${f === focus ? ' is-focus' : ''}${parts[f] ? '' : ' is-empty'}`, parts[f] || '');
    b.type = 'button';
    b.setAttribute('aria-label', `${FIELD_LABEL[f]} 칸${parts[f] ? ` — ${parts[f]}` : ''}`);
    b.addEventListener('click', () => { if (done) return; focus = f; paint(); });
    return b;
  }

  function paint() {
    for (const b of modeRow.querySelectorAll('.math-pad-mode')) b.classList.toggle('on', b.dataset.mode === mode);
    show.innerHTML = '';
    const line = el('div', `math-pad-line mode-${mode}`);
    if (parts.sign) line.appendChild(el('span', 'math-pad-sign', parts.sign === '-' ? '−' : '+'));
    if (mode === 'num') line.appendChild(field('x'));
    else if (mode === 'ratio') { line.appendChild(field('a')); line.appendChild(el('span', 'math-pad-colon', ':')); line.appendChild(field('b')); }
    else {
      if (mode === 'mixed') line.appendChild(field('w'));
      const fr = el('span', 'math-pad-frac');
      fr.appendChild(field('n'));
      fr.appendChild(el('span', 'math-pad-bar'));
      fr.appendChild(field('d'));
      line.appendChild(fr);
    }
    if (spec.unit) line.appendChild(el('span', 'math-pad-unit', spec.unit));
    show.appendChild(line);
    keyBtns['.'].disabled = done || !DOT_OK.has(focus);
    for (const k of ['-', '+']) if (keyBtns[k]) keyBtns[k].classList.toggle('on', parts.sign === k);
    const ready = !!readTyped(mode, parts, spec);
    ok.disabled = done || !ready;
    idk.disabled = done;
    box.classList.toggle('is-done', done);
    for (const b of box.querySelectorAll('.math-pad-key, .math-pad-mode, .math-pad-field')) if (done) b.disabled = true;
  }
  paint();
  return box;
}

/** 답한 뒤(또는 🎒에서 돌아와 다시 그릴 때) — 숫자판 자리에 "✍️ 내 답"만. render: 분수를 위아래로 그리는 함수(math.js의 richNode) */
export function padAnswered(text, ok, render = null) {
  const p = el('p', `math-pad-answered ${ok ? 'ok' : 'no'}`);
  p.appendChild(document.createTextNode('✍️ 내 답: '));
  p.appendChild(render ? render(text) : document.createTextNode(text));
  p.appendChild(document.createTextNode(' '));
  p.appendChild(el('span', 'mark', ok ? '✔' : '✘'));
  return p;
}
