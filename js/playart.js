// 🎮 일상 행동 장면 그림 (2026-10-18, 아버님 "이대로 해") — 📺 TV · 🎮 게임기 · 💻 컴퓨터 · 🎹 피아노
// 순수 함수 · DOM 없음(HTML·SVG 글자) → node에서 그림 시안 페이지도 이것으로 만든다 · 움직임은 css(.pshow-…)가, 차례는 playshow.js가
// 장면은 방을 가까이서 본 모습: 그 방의 벽지·바닥 색 위에 기기 그림(코드로 그림 — 이모지는 기기마다 모양이 달라 화면 칸을 맞출 수 없다) ·
// 🧑 캐릭터(avatarart) · 🤝 파트너 그림(받아 둔 그림 주소)
import { avatarSvg } from './avatarart.js';

/** 기기 id → 장면 이름 */
export const SCENE_OF = { f_tv: 'tv', f_game: 'game', f_pc: 'pc', f_piano: 'piano', f_table: 'meal' };
/** 🎹 건반 여덟 (도~높은 도) — 이름 · 주파수(Hz) */
export const KEYS = [
  { ko: '도', hz: 262 }, { ko: '레', hz: 294 }, { ko: '미', hz: 330 }, { ko: '파', hz: 349 },
  { ko: '솔', hz: 392 }, { ko: '라', hz: 440 }, { ko: '시', hz: 494 }, { ko: '도', hz: 523 },
];

const LINE = '#3b302b';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
/** 그림 주소 — 받아 둔 그림(blob·data)·앱 안 주소·https만 (다른 것은 그리지 않는다) */
const safeUrl = (u) => (typeof u === 'string' && /^(blob:|data:image\/|https:\/\/|\.?\/?[\w./-]+$)/.test(u) ? u : '');

// ── 받침에 맞는 조사 (이름 끝 글자가 한글이 아니면 받침 없는 쪽) ──
const jong = (w) => {
  const c = String(w || '').slice(-1).charCodeAt(0) - 0xac00;
  return c >= 0 && c <= 11171 ? c % 28 : 0;
};
const iga = (w) => (jong(w) ? '이' : '가');
const wa = (w) => (jong(w) ? '과' : '와');

/** 🧑 나를 부르는 말 — 이름표가 비면 "나"(내가 · 나와 · 나의) */
export function whoOf(name) {
  const n = typeof name === 'string' ? name : '';
  if (!n) return { subj: '내가', with: '나와', of: '나의', bare: '나' };
  return { subj: `${n}${iga(n)}`, with: `${n}${wa(n)}`, of: `${n}의`, bare: n };
}

/**
 * 장면 말 (순수) — { start: [말…], end } · ctx = { mon: 파트너 이름|'', name: 이름표, heart, lv, chain: [이름…] } · day = 날 번호(📺 소식을 날마다 바꾼다)
 * 아이 화면 규칙: "오늘 몇 번 남음" 같은 셈은 쓰지 않는다 · 포켓몬 사실은 말하지 않는다(앱 안의 레벨·진화 줄만)
 */
export function playLines(scene, ctx = {}, day = 0) {
  const M = ctx.mon || '';
  const W = whoOf(ctx.name);
  const pick = (list, n) => {
    const out = [];
    for (let i = 0; i < Math.min(n, list.length); i++) out.push(list[(Math.abs(Math.floor(day)) + i) % list.length]);
    return out;
  };
  const withM = M ? `${M}${wa(M)} ` : '';
  const did = { tv: 'TV를 봤어요', game: '게임을 했어요', pc: '컴퓨터를 했어요', piano: '피아노를 쳤어요', meal: '밥을 먹었어요' }[scene] || '놀았어요';
  const icon = { tv: '📺', game: '🎮', pc: '💻', piano: '🎹', meal: '🍚' }[scene] || '🏠';
  const end = ctx.heart && M ? `💗 ${M}${wa(M)} 더 친해졌어요` : `${icon} ${withM}${did}`;
  let start = [];
  if (scene === 'tv') {
    start = M
      ? pick([
        `📰 오늘의 소식 — ${M}${iga(M)} ${W.with} 함께 TV를 보러 왔어요`,
        `🎤 ${M}의 한마디 — "같이 보니까 더 재밌어!"`,
        `📢 알림 — 오늘 가장 신난 포켓몬은 ${M}!`,
        `🌤️ 날씨 — 내일도 우리 집은 맑음! 놀기 좋은 날이에요`,
        `📺 다음 순서 — ${M}${wa(M)} ${W.of} 즐거운 하루`,
      ], 2)
      : pick([`📰 오늘의 소식 — ${W.subj} TV를 보러 왔어요`, '🌤️ 날씨 — 내일도 우리 집은 맑음! 놀기 좋은 날이에요', '📺 다음 순서 — 포켓몬 친구들의 즐거운 하루'], 2);
  } else if (scene === 'game') {
    start = [M ? `🎮 ${M}${wa(M)} 같이 게임 시작!` : '🎮 게임 시작!', '⭐ 별을 모아요!'];
  } else if (scene === 'pc') {
    const chain = Array.isArray(ctx.chain) && ctx.chain.length > 1 ? `🧬 ${ctx.chain.join(' → ')}` : '';
    start = M ? [`💻 ${M} 도감을 열었어요`, ...(ctx.lv ? [`⭐ ${M} Lv ${ctx.lv}`] : []), ...(chain ? [chain] : [])] : ['💻 포켓몬 도감을 열었어요'];
  } else if (scene === 'meal') {
    start = [M ? `🍚 ${M}${wa(M)} 같이 밥 먹어요` : '🍚 밥 먹어요', '😋 냠냠 — 맛있다!'];
  } else if (scene === 'piano') {
    start = [M ? `🎹 건반을 눌러 ${M}에게 들려줘요` : '🎹 건반을 눌러 봐요'];
  }
  return { start, end, tip: M ? '' : '🤝 포켓몬을 눌러 [🤝 파트너로!]를 고르면 같이 놀아요' };
}

/** 화면 속 파트너 그림 (SVG image) — 그림이 없으면 몬스터볼 */
function monImage(url, x, y, s, cls) {
  const u = safeUrl(url);
  if (u) return `<image class="${cls}" href="${esc(u)}" x="${x}" y="${y}" width="${s}" height="${s}" preserveAspectRatio="xMidYMid meet"/>`;
  const cx = x + s / 2;
  const cy = y + s / 2;
  const r = s * 0.32;
  return `<g class="${cls}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="${LINE}" stroke-width="1.4"/><path d="M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} Z" fill="#e5484d" stroke="${LINE}" stroke-width="1.4"/><circle cx="${cx}" cy="${cy}" r="${r * 0.3}" fill="#fff" stroke="${LINE}" stroke-width="1.4"/></g>`;
}
/** 별 꼭짓점 */
function star(cx, cy, R) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const d = i % 2 ? R * 0.42 : R;
    pts.push(`${(cx + d * Math.cos(a)).toFixed(1)},${(cy + d * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

/** 📺 TV — 낮은 장 위 · 켜지면(.is-on) 화면에 파트너 + 아래에 소식 띠가 흐른다 */
export function tvSvg(url, uid = 'p') {
  const id = esc(uid).replace(/[^\w-]/g, '');
  return `<svg class="pv pv-tv" viewBox="0 0 120 104" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
    + `<rect x="8" y="78" width="104" height="22" rx="3" fill="#b07a45" stroke="${LINE}" stroke-width="1.6"/><line x1="60" y1="81" x2="60" y2="97" stroke="#7a4c22" stroke-width="1.4"/><circle cx="54" cy="89" r="1.6" fill="#f2d07a"/><circle cx="66" cy="89" r="1.6" fill="#f2d07a"/>`
    + `<rect x="52" y="72" width="16" height="7" fill="#2d333b"/>`
    + `<rect x="6" y="4" width="108" height="70" rx="7" fill="#2d333b" stroke="${LINE}" stroke-width="1.6"/>`
    + `<rect x="13" y="11" width="94" height="54" rx="3" fill="#10161f"/>`
    + `<clipPath id="pv-tvclip-${id}"><rect x="13" y="11" width="94" height="54" rx="3"/></clipPath>`
    + `<g class="pv-on" clip-path="url(#pv-tvclip-${id})"><rect x="13" y="11" width="94" height="54" fill="#bfe6ff"/><circle cx="60" cy="34" r="24" fill="#e7f6ff"/>`
    + monImage(url, 40, 13, 40, 'pv-onmon')
    + `<rect x="13" y="54" width="94" height="11" fill="#e5484d"/><g class="pv-tick"><text x="16" y="62" font-size="7" font-weight="700" fill="#fff">📰 포켓몬 뉴스 · 오늘의 주인공 · 📰 포켓몬 뉴스 · 오늘의 주인공 ·</text></g></g>`
    + `<circle class="pv-led" cx="106" cy="70" r="1.5"/>`
    + '</svg>';
}

/** 🎮 게임기 — 화면 + 앞의 게임기 본체 · 화면에서 파트너가 뛰고 별이 흘러온다 · 점수(.pv-score)는 playshow가 바꾼다 · 끝나면 CLEAR! */
export function gameSvg(url, uid = 'p') {
  const id = esc(uid).replace(/[^\w-]/g, '');
  const stars = [[88, 36], [118, 28], [148, 40]].map(([x, y]) => `<polygon points="${star(x, y, 4.6)}" fill="#ffd43b" stroke="#c99a06" stroke-width="0.8"/>`).join('');
  return `<svg class="pv pv-game" viewBox="0 0 120 104" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
    + `<rect x="8" y="80" width="104" height="20" rx="3" fill="#7c8aa0" stroke="${LINE}" stroke-width="1.6"/>`
    + `<rect x="38" y="70" width="44" height="12" rx="3" fill="#eef1f6" stroke="${LINE}" stroke-width="1.4"/><line x1="44" y1="76" x2="66" y2="76" stroke="#9aa4b4" stroke-width="1.6" stroke-linecap="round"/><circle class="pv-led" cx="75" cy="76" r="1.6"/>`
    + `<rect x="10" y="4" width="100" height="62" rx="5" fill="#1f2430" stroke="${LINE}" stroke-width="1.6"/><rect x="56" y="66" width="8" height="5" fill="#1f2430"/>`
    + `<rect x="15" y="9" width="90" height="52" rx="2" fill="#10161f"/>`
    + `<clipPath id="pv-gmclip-${id}"><rect x="15" y="9" width="90" height="52" rx="2"/></clipPath>`
    + `<g class="pv-on" clip-path="url(#pv-gmclip-${id})"><rect x="15" y="9" width="90" height="52" fill="#8fd3ff"/><circle cx="92" cy="18" r="5" fill="#fff3a6"/>`
    + `<rect x="15" y="50" width="90" height="11" fill="#4caf50"/><rect x="15" y="50" width="90" height="2.5" fill="#2e7d32"/>`
    + `<g class="pv-stars">${stars}</g>`
    + `<g class="pv-jump">${monImage(url, 22, 30, 21, 'pv-gamemon')}</g>`
    + `<text class="pv-score" x="101" y="17" font-size="6.5" font-weight="800" fill="#1f2430" text-anchor="end">⭐ 0</text>`
    + `<g class="pv-clear"><rect x="30" y="22" width="60" height="18" rx="4" fill="#fff" stroke="#e5484d" stroke-width="1.6"/><text x="60" y="35" font-size="10" font-weight="900" fill="#e5484d" text-anchor="middle">CLEAR!</text></g></g>`
    + '</svg>';
}
/** 🎮 손에 든 게임 조종기 (작은 그림) */
export function padSvg(cls) {
  return `<svg class="${esc(cls)}" viewBox="0 0 40 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
    + `<path d="M8 3 L32 3 Q39 3 39 12 Q39 23 32 21 L27 17 L13 17 L8 21 Q1 23 1 12 Q1 3 8 3 Z" fill="#eef1f6" stroke="${LINE}" stroke-width="1.6" stroke-linejoin="round"/>`
    + `<rect x="7" y="9" width="10" height="3.6" rx="1" fill="${LINE}"/><rect x="10.2" y="5.8" width="3.6" height="10" rx="1" fill="${LINE}"/>`
    + '<circle cx="29" cy="8.6" r="2.4" fill="#e5484d"/><circle cx="33" cy="13" r="2.4" fill="#3b82f6"/>'
    + '</svg>';
}

/** 💻 컴퓨터 — 책상 위 노트북 · 화면에 파트너 도감 쪽(이름·레벨·💗) · 줄은 하나씩 나타난다(.pv-line, --i) */
export function pcSvg(url, dex = {}) {
  const lines = [];
  if (dex.name) lines.push(`<text class="pv-line" style="--i:0" x="66" y="31" font-size="7.5" font-weight="800" fill="#1f2a44">${esc(dex.name)}</text>`);
  if (dex.lv) lines.push(`<text class="pv-line" style="--i:1" x="66" y="41" font-size="6.2" font-weight="700" fill="#3b4a6b">⭐ Lv ${esc(dex.lv)}</text>`);
  if (dex.bond) lines.push(`<text class="pv-line" style="--i:2" x="66" y="50" font-size="6.2" font-weight="700" fill="#c2255c">💗 ${esc(dex.bond)}</text>`);
  if (!dex.name) lines.push('<text class="pv-line" style="--i:0" x="66" y="35" font-size="6.5" font-weight="800" fill="#1f2a44">포켓몬 도감</text>');
  return `<svg class="pv pv-pc" viewBox="0 0 140 104" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
    + `<rect x="4" y="70" width="132" height="8" rx="2" fill="#c08446" stroke="${LINE}" stroke-width="1.4"/><rect x="4" y="76" width="132" height="3" fill="#8a5a2b"/>`
    + `<rect x="12" y="79" width="7" height="23" fill="#8a5a2b"/><rect x="121" y="79" width="7" height="23" fill="#8a5a2b"/>`
    + `<rect x="30" y="6" width="80" height="58" rx="4" fill="#39424e" stroke="${LINE}" stroke-width="1.6"/>`
    + `<rect x="34" y="10" width="72" height="50" rx="1.5" fill="#10161f"/>`
    + `<g class="pv-on"><rect x="34" y="10" width="72" height="50" rx="1.5" fill="#fff"/><rect x="34" y="10" width="72" height="8" fill="#3b82f6"/>`
    + `<circle cx="38.5" cy="14" r="1.4" fill="#ff8787"/><circle cx="42.5" cy="14" r="1.4" fill="#ffd43b"/><text x="70" y="16.3" font-size="5" font-weight="700" fill="#fff" text-anchor="middle">포켓몬 도감</text>`
    + `<rect x="37" y="22" width="26" height="26" rx="3" fill="#eef4ff"/>${monImage(url, 37, 22, 26, 'pv-pcmon')}${lines.join('')}`
    + `<rect class="pv-caret" x="66" y="53" width="7" height="1.6" fill="#3b82f6"/></g>`
    + `<path d="M24 64 L116 64 L124 71 L16 71 Z" fill="#aab4c0" stroke="${LINE}" stroke-width="1.4" stroke-linejoin="round"/><rect x="62" y="65.5" width="16" height="2" rx="1" fill="#7d8896"/>`
    + '</svg>';
}

/** 🎹 피아노 — 위에 악보 · 흰건반 14개 가운데 여덟(.pv-k0~7)이 아래 건반 단추와 이어진다(누르면 .is-k○ 동안 노랗게) */
export function pianoSvg() {
  const whites = [];
  const blacks = [];
  for (let i = 0; i < 14; i++) {
    const x = 14 + i * 8;
    const k = i - 3; // 넷째 흰건반부터 여덟이 도~도
    whites.push(`<rect class="pv-white${k >= 0 && k < 8 ? ` pv-k${k}` : ''}" x="${x}" y="54" width="8" height="15" fill="#fffdf7" stroke="${LINE}" stroke-width="0.9"/>`);
    // 검은건반은 도·레·파·솔·라 오른쪽에 (미·시 뒤에는 없다) · 맨 끝 건반 뒤에는 없다
    if (i < 13 && [0, 1, 3, 4, 5].includes((i - 3 + 7) % 7)) blacks.push(`<rect x="${x + 5.2}" y="54" width="5.2" height="9" rx="0.8" fill="#1d1612"/>`);
  }
  return `<svg class="pv pv-piano" viewBox="0 0 140 104" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
    + `<rect x="10" y="12" width="120" height="78" rx="4" fill="#3a2a22" stroke="${LINE}" stroke-width="1.6"/>`
    + `<rect x="6" y="6" width="128" height="10" rx="3" fill="#2c1f19" stroke="${LINE}" stroke-width="1.4"/>`
    + `<rect x="46" y="20" width="48" height="24" rx="2" fill="#fffdf5" stroke="#cbb89c" stroke-width="1"/>`
    + [26, 31, 36].map((y) => `<line x1="50" y1="${y}" x2="90" y2="${y}" stroke="#cbb89c" stroke-width="0.7"/>`).join('')
    + `<text x="56" y="34" font-size="9" fill="#3a2a22">♪</text><text x="70" y="30" font-size="9" fill="#3a2a22">♫</text><text x="82" y="36" font-size="9" fill="#3a2a22">♪</text>`
    + `<rect x="10" y="50" width="120" height="22" fill="#2c1f19"/>`
    + whites.join('') + blacks.join('')
    + `<rect x="16" y="90" width="8" height="12" fill="#2c1f19"/><rect x="116" y="90" width="8" height="12" fill="#2c1f19"/><rect x="62" y="96" width="16" height="4" rx="2" fill="#d4af37"/>`
    + '</svg>';
}

/** 🍚 밥상 — 식탁을 가까이서: 내 밥그릇 · 달걀 접시 · 파트너 밥그릇(포켓몬 먹이) · 김(.pv-steam) · 먹으면 줄어드는 음식(.pv-food) */
export function mealSvg() {
  const steam = (x) => `<path class="pv-steam" d="M${x} 20 q-3 -4 0 -8 q3 -4 0 -8" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity="0.85"/>`;
  return `<svg class="pv pv-meal" viewBox="0 0 140 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
    + `<rect x="10" y="44" width="8" height="20" fill="#8a5a2b"/><rect x="122" y="44" width="8" height="20" fill="#8a5a2b"/>`
    + `<rect x="2" y="30" width="136" height="12" rx="5" fill="#d9a066" stroke="${LINE}" stroke-width="1.4"/><rect x="4" y="40" width="132" height="5" fill="#a86f38"/>`
    + `<g class="pv-on">${steam(36)}${steam(44)}${steam(104)}</g>`
    + `<ellipse class="pv-food" cx="40" cy="27" rx="11.5" ry="6" fill="#fffdf5" stroke="#d8ccb6" stroke-width="0.8"/>`
    + `<path d="M28 27 Q40 41 52 27 Z" fill="#e5484d" stroke="#a61e22" stroke-width="1.2"/>`
    + `<line x1="56" y1="12" x2="60" y2="30" stroke="#8a5a2b" stroke-width="1.6" stroke-linecap="round"/><line x1="60" y1="11" x2="62" y2="30" stroke="#8a5a2b" stroke-width="1.6" stroke-linecap="round"/>`
    + `<ellipse cx="76" cy="32" rx="12" ry="3.4" fill="#fff" stroke="#c9bba6" stroke-width="0.9"/><g class="pv-food"><ellipse cx="76" cy="30.4" rx="7" ry="2.6" fill="#fff" stroke="#e9e2d4" stroke-width="0.6"/><circle cx="76" cy="30.2" r="2.1" fill="#fcc419"/></g>`
    + `<g class="pv-food">${[[98, 26], [103, 24], [108, 26], [101, 28], [106, 28], [104, 26.5]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5" fill="#b9722f" stroke="#7a4c22" stroke-width="0.6"/>`).join('')}</g>`
    + `<path d="M92 28 Q104 40 116 28 Z" fill="#4dabf7" stroke="#1c7ed6" stroke-width="1.2"/><circle cx="104" cy="33" r="1.6" fill="#fff"/>`
    + '</svg>';
}

/**
 * 장면 무대 (순수 HTML 글자) — o = { look, name, mon: { ko, url } | null, wall, floor, lv, bond, tier, uid }
 * 자리(왼쪽·폭)는 css가 장면마다(.pshow-stage.is-tv …) 정한다
 */
export function stageHtml(scene, o = {}) {
  const uid = String(o.uid === undefined ? 'p' : o.uid).replace(/[^\w-]/g, '');
  const color = (c, d) => (typeof c === 'string' && /^#[0-9a-f]{3,8}$/i.test(c) ? c : d);
  const mon = o.mon && typeof o.mon === 'object' ? o.mon : null;
  const url = mon ? safeUrl(mon.url) : '';
  const tier = [1, 2, 3].includes(o.tier) ? o.tier : 0; // 💗 단계 테두리 (homeplay.bondTier)
  let dev = '';
  if (scene === 'tv') dev = tvSvg(url, uid);
  else if (scene === 'game') dev = gameSvg(url, uid);
  else if (scene === 'pc') dev = pcSvg(url, mon ? { name: mon.ko, lv: o.lv, bond: o.bond } : {});
  else if (scene === 'piano') dev = pianoSvg();
  else if (scene === 'meal') dev = mealSvg();
  const me = avatarSvg(o.look, { uid: `play-${uid}`, cls: 'pshow-me-art', title: whoOf(o.name).bare });
  const pal = mon
    ? `<div class="pshow-pal${tier ? ` is-bond${tier}` : ''}">${url ? `<img class="pshow-pal-img" src="${esc(url)}" alt="${esc(mon.ko || '')}" draggable="false">` : '<span class="pshow-pal-img is-emoji">🐾</span>'}${scene === 'game' ? padSvg('pshow-pad is-pal') : ''}</div>`
    : '';
  return `<div class="pshow-stage is-${esc(scene)}" style="--pw:${color(o.wall, '#fbf3e4')};--pf:${color(o.floor, '#e2c79f')}">`
    + '<div class="pshow-wall"></div><div class="pshow-floor"></div>'
    + `<div class="pshow-dev">${dev}</div>`
    + `<div class="pshow-me">${me}${scene === 'game' ? padSvg('pshow-pad is-me') : ''}</div>`
    + pal
    + '<div class="pshow-fx" aria-hidden="true"></div>'
    + '</div>';
}
