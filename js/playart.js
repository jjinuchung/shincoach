// 🎮 일상 행동 장면 그림 (2026-10-18, 아버님 "이대로 해") — 📺 TV · 🎮 게임기 · 💻 컴퓨터 · 🎹 피아노
// 순수 함수 · DOM 없음(HTML·SVG 글자) → node에서 그림 시안 페이지도 이것으로 만든다 · 움직임은 css(.pshow-…)가, 차례는 playshow.js가
// 장면은 방을 가까이서 본 모습: 그 방의 벽지·바닥 색 위에 기기 그림(코드로 그림 — 이모지는 기기마다 모양이 달라 화면 칸을 맞출 수 없다) ·
// 🧑 캐릭터(avatarart) · 🤝 파트너 그림(받아 둔 그림 주소)
import { avatarSvg } from './avatarart.js';

/** 기기 id → 장면 이름 · 🛏️ 가구 놀기(v365)는 가구 id → 장면 (책 더미·책장은 같은 그림책 · 큰 화분·해바라기는 같은 물 주기) */
export const SCENE_OF = {
  f_tv: 'tv', f_game: 'game', f_pc: 'pc', f_piano: 'piano', f_table: 'meal',
  f_bed: 'nap', f_sofa: 'sofa', f_cushion: 'pet', f_teddy: 'teddy', f_books: 'book', f_shelf: 'book',
  f_plant: 'plant', f_flower: 'flower', f_window: 'window', f_toybox: 'toy',
};
/** 진우가 직접 하는 장면 — 시간 제한 없이 [다 했어요]로 닫는다 (🎹 피아노 · 🤗 쓰다듬기 · 💧 물 주기) → 닫기 단추 말 */
export const HANDS_ON = { piano: '🎹 다 쳤어요', pet: '🤗 다 했어요', plant: '💧 다 줬어요', flower: '💧 다 줬어요' };
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
const eul = (w) => (jong(w) ? '을' : '를');

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
  const did = {
    tv: 'TV를 봤어요', game: '게임을 했어요', pc: '컴퓨터를 했어요', piano: '피아노를 쳤어요', meal: '밥을 먹었어요',
    nap: '낮잠을 잤어요', sofa: '소파에서 쉬었어요', teddy: '인형 놀이를 했어요', book: '그림책을 읽었어요',
    plant: '화분에 물을 줬어요', flower: '해바라기에 물을 줬어요', window: '창밖을 봤어요', toy: '장난감으로 놀았어요',
  }[scene] || '놀았어요';
  const icon = { tv: '📺', game: '🎮', pc: '💻', piano: '🎹', meal: '🍚', nap: '😴', sofa: '🛋️', pet: '🤗', teddy: '🧸', book: '📖', plant: '💧', flower: '💧', window: '🔭', toy: '🧩' }[scene] || '🏠';
  // 🤗 쓰다듬기는 「○○와 …」가 아니라 「○○를 쓰다듬어 줬어요」 — 파트너가 없으면 쿠션만
  const plain = scene === 'pet' ? (M ? `🤗 ${M}${eul(M)} 쓰다듬어 줬어요` : '🐾 쿠션을 폭신폭신 눌러 봤어요') : `${icon} ${withM}${did}`;
  const end = ctx.heart && M ? `💗 ${M}${wa(M)} 더 친해졌어요` : plain;
  /** 직접 하는 장면이 다 됐을 때 한 줄 (🤗 · 💧) — 없으면 '' */
  let extra = '';
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
  } else if (scene === 'nap') {
    start = [M ? `😴 ${withM}이불 속에 쏙 — 쿨쿨` : '😴 이불 속에 쏙 — 쿨쿨', '☀️ 잘 잤다! 기지개 쭉~'];
  } else if (scene === 'sofa') {
    start = M
      ? [`🛋️ ${withM}소파에 나란히 앉았어요`, `💬 ${M}: "${pick(PAL_SAY, 1)[0]}"`, `💬 ${W.bare}: "${pick(ME_SAY, 1)[0]}"`]
      : ['🛋️ 소파에 폭 앉았어요', `💬 ${W.bare}: "아, 편하다!"`];
  } else if (scene === 'pet') {
    start = [M ? `🤗 ${M}${eul(M)} 손가락으로 쓰다듬어 줘요` : '🐾 폭신한 쿠션을 눌러 봐요'];
    extra = M ? `💗 ${M}${iga(M)} 좋아해요!` : '🐾 폭신폭신!';
  } else if (scene === 'teddy') {
    start = M
      ? [`🧸 ${withM}인형 놀이 시작!`, '🧸 휙 — 받았다!', `🤗 ${M}${iga(M)} 곰인형을 꼭 안았어요`]
      : ['🧸 곰인형을 높이 던져요', '🧸 휙 — 받았다!'];
  } else if (scene === 'book') {
    const s = storyOf(day, W, M || '포켓몬 친구');
    start = [`📖 「${s.title}」`, ...s.pages];
  } else if (scene === 'plant' || scene === 'flower') {
    start = [scene === 'plant' ? `💧 ${withM}큰 화분에 물을 줘요` : `💧 ${withM}해바라기에 물을 줘요`];
    extra = scene === 'plant' ? '🌿 잎이 쑥쑥 자랐어요!' : '🌻 해바라기가 활짝 피었어요!';
  } else if (scene === 'window') {
    const sky = ['day', 'dusk', 'night'].includes(ctx.sky) ? ctx.sky : 'day';
    const look = sky === 'night' ? '🌙 달님이 떴어요 — 별도 반짝반짝'
      : sky === 'dusk' ? '🌇 하늘이 노을로 물들었어요'
        : rainbowOf(day) ? '🌈 와, 무지개다!' : `☁️ 저 구름은 꼭 ${M || '솜사탕'} 같아!`;
    start = [`🔭 ${withM}창밖을 봐요`, look];
  } else if (scene === 'toy') {
    const t = toyOf(day);
    start = ['🧩 장난감 상자를 열었어요', t === 'blocks' ? `🧱 ${withM}블록을 높이높이 쌓아요` : t === 'top' ? '🌀 팽이가 빙글빙글 돌아요' : `⚽ ${withM}공을 톡톡 주고받아요`];
  }
  return { start, end, tip: M ? '' : '🤝 포켓몬을 눌러 [🤝 파트너로!]를 고르면 같이 놀아요', extra };
}

// ───────────────────── 🛏️ 가구 놀기 (v365 — 아버님 기본안 「이대로」) ─────────────────────
// 진우가 가진 가구로도 논다 — 침대·소파·쿠션·곰인형·책·화분·창문·장난감 상자 · 말에 포켓몬 사실은 쓰지 않는다(📺 소식과 같은 규칙)

/** 🛋️ 소파에서 하는 말 — 놀이 말만(공부·셈 없음) · 날마다 하나 */
const PAL_SAY = ['오늘 재밌었어!', '같이 있으니까 좋다!', '소파가 폭신폭신해!', '내일은 뭐 하고 놀까?', '헤헤, 조금 졸려…'];
const ME_SAY = ['나도 좋아!', '내일도 같이 놀자!', '우리 최고!', '조금만 더 쉬자!'];

const dayIx = (day) => Math.abs(Math.floor(Number(day) || 0));
/** 🧩 그날 장난감 (장면 말과 그림이 같은 것을 고르게 — 날 번호로) */
export const TOYS = ['blocks', 'top', 'ball'];
export function toyOf(day) { return TOYS[dayIx(day) % TOYS.length]; }
/** 🌈 낮 하늘에 무지개가 뜨는 날 (네 날에 한 번) */
export function rainbowOf(day) { return dayIx(day) % 4 === 1; }
/** 🔭 창밖 하늘 — 태블릿 시계의 시(0~23) → 'day' 낮 | 'dusk' 노을 | 'night' 밤 */
export function skyOf(hour) {
  const h = Number(hour);
  if (!Number.isFinite(h)) return 'day';
  if (h >= 6 && h < 17) return 'day';
  if (h >= 17 && h < 19) return 'dusk';
  return 'night';
}

/** 📖 그림책 이야기 여섯 — 나(W = whoOf)·파트너(F)가 주인공 · 세 쪽 · 날마다 하나 */
const STORIES = [
  (W, F) => ({ title: '구름 기차', pages: [`어느 날, ${F}${iga(F)} 하늘에서 구름 기차를 봤어요.`, `${W.subj} 손을 흔들자 기차가 "뿌우!" 하고 내려왔어요.`, '둘은 구름 기차를 타고 별 마을까지 다녀왔답니다.'] }),
  (W, F) => ({ title: '데굴데굴 단추', pages: [`${W.subj} 입은 옷에서 단추 하나가 데굴데굴 굴러갔어요.`, `${F}${iga(F)} 소파 밑까지 쫓아가 단추를 찾아 왔어요.`, '"고마워!" 둘은 손바닥을 짝 마주쳤어요.'] }),
  (W, F) => ({ title: '비 오는 날', pages: ['비가 톡톡, 창문을 두드렸어요.', `${F}${iga(F)} 우산을 들고 와서 "같이 쓰자!" 했어요.`, '웅덩이를 첨벙첨벙 건너며 둘은 깔깔 웃었어요.'] }),
  (W, F) => ({ title: '딸기 케이크', pages: [`${W.subj} ${F}에게 줄 딸기 케이크를 만들었어요.`, `딸기를 올리다가 ${F}${iga(F)} 하나를 냠 먹었어요.`, '"하나만 더!" 둘은 남은 딸기를 사이좋게 나눴어요.'] }),
  (W, F) => ({ title: '심심한 달님', pages: ['밤하늘 달님이 혼자 심심해 보였어요.', `${W.subj} ${F}${wa(F)} 함께 노래를 불러 주었어요.`, '달님이 방긋 웃으며 별똥별을 보내 주었어요.'] }),
  (W, F) => ({ title: '숨바꼭질', pages: [`${F}${iga(F)} "숨바꼭질 하자!" 하고 숨었어요.`, `커튼 뒤? 침대 밑? ${W.subj} 집 안을 살금살금 찾았어요.`, `"찾았다!" 장난감 상자 속에서 ${F}${iga(F)} 빼꼼 웃었어요.`] }),
];
export const STORY_COUNT = STORIES.length;
/** 📖 그날 이야기 { title, pages: [셋] } */
export function storyOf(day, W, F) {
  return STORIES[dayIx(day) % STORIES.length](W || whoOf(''), F || '포켓몬 친구');
}

/** 🛏️ 침대 — 뒤 판(머리판·요·베개)과 앞 판(이불·틀·발판): 캐릭터는 그 사이에 앉아 이불을 덮는다 */
export function bedSvg(part) {
  const head = `<svg class="pv pv-bed" viewBox="0 0 140 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
    + `<rect x="4" y="8" width="16" height="58" rx="5" fill="#a8703f" stroke="${LINE}" stroke-width="1.6"/><rect x="8" y="15" width="8" height="20" rx="2" fill="#c98b52"/>`
    + `<rect x="16" y="33" width="118" height="12" rx="3" fill="#fffdf7" stroke="${LINE}" stroke-width="1.2"/>`
    + `<ellipse cx="34" cy="32" rx="14" ry="7" fill="#fff" stroke="${LINE}" stroke-width="1.3"/>`
    + '</svg>';
  if (part !== 'front') return head;
  const dots = [[40, 46], [62, 44], [84, 46], [106, 44]].map(([x, y]) => `<polygon points="${star(x, y, 2.6)}" fill="#fff" opacity="0.9"/>`).join('');
  return `<svg class="pv pv-bed" viewBox="0 0 140 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
    + `<path d="M18 40 Q30 34 44 38 Q58 33 72 38 Q86 33 100 38 Q114 34 128 39 L130 54 L16 54 Z" fill="#74c0fc" stroke="${LINE}" stroke-width="1.5" stroke-linejoin="round"/>${dots}`
    + `<rect x="12" y="52" width="124" height="9" rx="3" fill="#c98b52" stroke="${LINE}" stroke-width="1.5"/>`
    + `<rect x="126" y="30" width="10" height="34" rx="3" fill="#a8703f" stroke="${LINE}" stroke-width="1.5"/>`
    + `<rect x="16" y="61" width="6" height="8" fill="#8a5a2b"/><rect x="118" y="61" width="6" height="8" fill="#8a5a2b"/>`
    + '</svg>';
}

/** 🛋️ 소파 — 뒤 판(등받이·쿠션)과 앞 판(앉는 자리·팔걸이): 둘은 그 사이에 앉는다 */
export function sofaSvg(part) {
  if (part !== 'front') {
    return `<svg class="pv pv-sofa" viewBox="0 0 140 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
      + `<rect x="12" y="10" width="116" height="36" rx="12" fill="#38c9a0" stroke="${LINE}" stroke-width="1.6"/>`
      + `<rect x="24" y="16" width="40" height="24" rx="8" fill="#63e6be" stroke="${LINE}" stroke-width="1.2"/><rect x="76" y="16" width="40" height="24" rx="8" fill="#63e6be" stroke="${LINE}" stroke-width="1.2"/>`
      + '</svg>';
  }
  return `<svg class="pv pv-sofa" viewBox="0 0 140 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
    + `<rect x="12" y="40" width="116" height="18" rx="7" fill="#20b48a" stroke="${LINE}" stroke-width="1.6"/><line x1="70" y1="42" x2="70" y2="56" stroke="#168a69" stroke-width="1.4"/>`
    + `<rect x="2" y="26" width="20" height="36" rx="9" fill="#38c9a0" stroke="${LINE}" stroke-width="1.6"/><rect x="118" y="26" width="20" height="36" rx="9" fill="#38c9a0" stroke="${LINE}" stroke-width="1.6"/>`
    + `<rect x="10" y="62" width="6" height="7" fill="#8a5a2b"/><rect x="124" y="62" width="6" height="7" fill="#8a5a2b"/>`
    + '</svg>';
}

/** 🐾 파트너 쿠션 — 가까이서 본 큰 방석 (발바닥 무늬) */
export function cushionSvg() {
  return `<svg class="pv pv-cushion" viewBox="0 0 100 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
    + `<ellipse cx="50" cy="28" rx="46" ry="14" fill="#f783ac" stroke="${LINE}" stroke-width="1.6"/><ellipse cx="50" cy="24" rx="38" ry="8" fill="#faa2c1"/>`
    + `<ellipse cx="50" cy="27" rx="7" ry="4.4" fill="#fcc2d7"/>${[[40, 20.5], [46, 18.2], [54, 18.2], [60, 20.5]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.3" fill="#fcc2d7"/>`).join('')}`
    + '</svg>';
}

/** 🧸 곰인형 (던지고 받는 것) */
export function teddySvg() {
  return `<svg class="pv pv-teddy" viewBox="0 0 40 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
    + `<circle cx="9" cy="8" r="5.5" fill="#c08446" stroke="${LINE}" stroke-width="1.3"/><circle cx="31" cy="8" r="5.5" fill="#c08446" stroke="${LINE}" stroke-width="1.3"/><circle cx="9" cy="8" r="2.6" fill="#e9b97a"/><circle cx="31" cy="8" r="2.6" fill="#e9b97a"/>`
    + `<ellipse cx="9" cy="31" rx="4" ry="5.5" fill="#c08446" stroke="${LINE}" stroke-width="1.2"/><ellipse cx="31" cy="31" rx="4" ry="5.5" fill="#c08446" stroke="${LINE}" stroke-width="1.2"/>`
    + `<ellipse cx="20" cy="33" rx="10" ry="9.5" fill="#c08446" stroke="${LINE}" stroke-width="1.3"/><ellipse cx="20" cy="35" rx="5.5" ry="5" fill="#e9b97a"/>`
    + `<ellipse cx="13" cy="41" rx="4.5" ry="2.8" fill="#c08446" stroke="${LINE}" stroke-width="1.1"/><ellipse cx="27" cy="41" rx="4.5" ry="2.8" fill="#c08446" stroke="${LINE}" stroke-width="1.1"/>`
    + `<circle cx="20" cy="15" r="11" fill="#c08446" stroke="${LINE}" stroke-width="1.4"/><ellipse cx="20" cy="19" rx="5.2" ry="3.8" fill="#e9b97a"/>`
    + `<circle cx="15.5" cy="13" r="1.4" fill="${LINE}"/><circle cx="24.5" cy="13" r="1.4" fill="${LINE}"/><ellipse cx="20" cy="17.6" rx="1.8" ry="1.3" fill="${LINE}"/>`
    + `<path d="M17.6 20.6 Q20 22.4 22.4 20.6" fill="none" stroke="${LINE}" stroke-width="1" stroke-linecap="round"/><path d="M17 26 L20 28 L23 26 L20 24.6 Z" fill="#e5484d"/>`
    + '</svg>';
}

/** 📖 펼친 그림책 — 왼쪽 쪽에 파트너 그림 · 넘어가는 쪽(.pv-page)은 쪽마다 playshow가 다시 넘긴다 */
export function bookSvg(url) {
  const lines = (x1, x2, ys) => ys.map((y) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#d8ccb6" stroke-width="1.4" stroke-linecap="round"/>`).join('');
  return `<svg class="pv pv-book" viewBox="0 0 120 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
    + `<path d="M4 58 L60 62 L116 58 L116 12 L60 16 L4 12 Z" fill="#e03131" stroke="${LINE}" stroke-width="1.5" stroke-linejoin="round"/>`
    + `<path d="M9 54 Q34 51 60 58 L60 15 Q34 8 9 10 Z" fill="#fffdf5" stroke="${LINE}" stroke-width="1.3" stroke-linejoin="round"/>`
    + `<path d="M111 54 Q86 51 60 58 L60 15 Q86 8 111 10 Z" fill="#fffdf5" stroke="${LINE}" stroke-width="1.3" stroke-linejoin="round"/>`
    + `<rect x="16" y="15" width="34" height="26" rx="3" fill="#e7f5ff"/>${monImage(url, 20, 15, 26, 'pv-bookmon')}${lines(17, 50, [46, 50])}`
    + lines(68, 104, [20, 25, 30, 35, 40, 45, 50])
    + `<path class="pv-page" d="M60 15 Q86 8 111 10 L111 54 Q86 51 60 58 Z" fill="#fff8e6" stroke="${LINE}" stroke-width="1.1" stroke-linejoin="round"/>`
    + '</svg>';
}

/** 💧 화분 — 큰 화분(잎) · 해바라기(봉오리 → 꽃) · 물을 줄 때마다 .pv-grow가 자란다(playshow가 is-g1~3) */
export function potSvg(kind) {
  const pot = `<path d="M15 64 L45 64 L41 88 L19 88 Z" fill="#d9480f" stroke="${LINE}" stroke-width="1.5" stroke-linejoin="round"/><rect x="12" y="58" width="36" height="8" rx="2.5" fill="#e8590c" stroke="${LINE}" stroke-width="1.4"/><ellipse cx="30" cy="59" rx="15" ry="2.6" fill="#5c3d2e"/>`;
  let plant;
  if (kind === 'flower') {
    const petals = Array.from({ length: 12 }, (_, i) => `<ellipse cx="30" cy="8.5" rx="2.6" ry="6" fill="#ffd43b" stroke="#e0a800" stroke-width="0.7" transform="rotate(${i * 30} 30 16)"/>`).join('');
    plant = `<g class="pv-grow"><path d="M30 58 L30 18" stroke="#2f9e44" stroke-width="2.6" stroke-linecap="round"/>`
      + `<path d="M30 44 Q18 40 15 31 Q25 31 30 40" fill="#51cf66" stroke="#2b8a3e" stroke-width="1"/><path d="M30 36 Q42 32 45 23 Q35 23 30 32" fill="#51cf66" stroke="#2b8a3e" stroke-width="1"/>`
      + `<circle class="pv-bud" cx="30" cy="16" r="5" fill="#69db7c" stroke="#2b8a3e" stroke-width="1"/>`
      + `<g class="pv-bloom">${petals}<circle cx="30" cy="16" r="5.6" fill="#7a4c22" stroke="${LINE}" stroke-width="0.9"/></g></g>`;
  } else {
    const leaf = (d) => `<path d="${d}" fill="#40c057" stroke="#2b8a3e" stroke-width="1.1" stroke-linejoin="round"/>`;
    plant = `<g class="pv-grow"><path d="M30 58 Q29 40 30 22 M30 46 Q22 38 18 30 M30 40 Q38 32 43 24" fill="none" stroke="#2f9e44" stroke-width="2.2" stroke-linecap="round"/>`
      + leaf('M18 30 Q6 26 6 14 Q18 16 20 28 Z') + leaf('M43 24 Q55 20 55 8 Q43 10 41 22 Z') + leaf('M30 22 Q22 12 30 2 Q38 12 30 22 Z')
      + leaf('M30 50 Q16 52 10 44 Q20 40 30 48 Z') + leaf('M30 52 Q44 54 50 46 Q40 42 30 50 Z') + '</g>';
  }
  return `<svg class="pv pv-pot is-${kind === 'flower' ? 'flower' : 'plant'}" viewBox="0 0 60 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${plant}${pot}</svg>`;
}
/** 💧 손에 든 물뿌리개 (작은 그림) */
export function canSvg(cls) {
  return `<svg class="${esc(cls)}" viewBox="0 0 40 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
    + `<path d="M8 10 Q4 4 10 3 L22 3 Q28 4 25 10" fill="none" stroke="${LINE}" stroke-width="2" stroke-linecap="round"/>`
    + `<rect x="6" y="9" width="22" height="16" rx="4" fill="#4dabf7" stroke="${LINE}" stroke-width="1.5"/>`
    + `<path d="M27 15 L37 8 L39 11 L29 19 Z" fill="#339af0" stroke="${LINE}" stroke-width="1.3" stroke-linejoin="round"/><circle cx="12" cy="16" r="2" fill="#a5d8ff"/>`
    + '</svg>';
}

/** 🔭 창문 — 커튼 · 창틀 · 하늘(sky: 'day' | 'dusk' | 'night' · 낮에 rainbow면 무지개) */
export function windowSvg(sky = 'day', rainbow = false, uid = 'p') {
  const id = esc(uid).replace(/[^\w-]/g, '');
  let view;
  if (sky === 'night') {
    const stars = [[24, 16], [36, 26], [58, 14], [30, 42], [46, 36], [80, 40], [62, 30]].map(([x, y], i) => `<polygon class="pv-twinkle" style="--i:${i}" points="${star(x, y, 2.2)}" fill="#fff3bf"/>`).join('');
    view = `<rect x="16" y="8" width="68" height="52" fill="#1c2a52"/>${stars}<circle cx="70" cy="20" r="8" fill="#fff3bf"/><circle cx="74" cy="17" r="7" fill="#1c2a52"/><path d="M16 60 Q36 46 54 54 Q70 46 84 52 L84 60 Z" fill="#0b1430"/>`;
  } else if (sky === 'dusk') {
    view = `<rect x="16" y="8" width="68" height="18" fill="#ff8787"/><rect x="16" y="26" width="68" height="16" fill="#ffa94d"/><rect x="16" y="42" width="68" height="18" fill="#ffe066"/>`
      + `<circle cx="50" cy="56" r="10" fill="#ff922b"/><path d="M16 60 Q36 48 54 55 Q70 48 84 53 L84 60 Z" fill="#7048e8" opacity="0.75"/>`;
  } else {
    const cloud = (x, y, s) => `<g class="pv-cloud" style="--d:${s}s"><ellipse cx="${x}" cy="${y}" rx="9" ry="4.5" fill="#fff"/><ellipse cx="${x - 6}" cy="${y + 1.5}" rx="6" ry="3.6" fill="#fff"/><ellipse cx="${x + 6}" cy="${y + 1.5}" rx="6" ry="3.6" fill="#fff"/></g>`;
    const bow = rainbow ? ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'].map((c, i) => `<path d="M${22 + i * 3} 60 A${28 - i * 3} ${28 - i * 3} 0 0 1 ${78 - i * 3} 60" fill="none" stroke="${c}" stroke-width="3"/>`).join('') : '';
    view = `<rect x="16" y="8" width="68" height="52" fill="#8fd3ff"/>${bow}<circle cx="72" cy="20" r="7" fill="#ffd43b"/>${cloud(32, 22, 9)}${cloud(56, 38, 12)}<path d="M16 60 Q36 48 54 55 Q70 48 84 53 L84 60 Z" fill="#8ce99a"/>`;
  }
  return `<svg class="pv pv-window" viewBox="0 0 100 72" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
    + `<rect x="12" y="4" width="76" height="60" rx="3" fill="#b07a45" stroke="${LINE}" stroke-width="1.6"/>`
    + `<clipPath id="pv-winclip-${id}"><rect x="16" y="8" width="68" height="52"/></clipPath><g clip-path="url(#pv-winclip-${id})">${view}</g>`
    + `<rect x="49" y="8" width="2" height="52" fill="#b07a45"/><rect x="16" y="33" width="68" height="2" fill="#b07a45"/>`
    + `<path d="M2 2 Q12 36 5 70 L17 70 Q21 36 15 2 Z" fill="#ffa8a8" stroke="${LINE}" stroke-width="1.3"/><path d="M98 2 Q88 36 95 70 L83 70 Q79 36 85 2 Z" fill="#ffa8a8" stroke="${LINE}" stroke-width="1.3"/>`
    + `<rect x="8" y="62" width="84" height="6" rx="2" fill="#c98b52" stroke="${LINE}" stroke-width="1.3"/>`
    + '</svg>';
}

/** 🧩 장난감 상자 — 뚜껑(.pv-lid)이 열리고 옆에 그날 장난감 하나(toy: blocks 블록 · top 팽이 · ball 공) */
export function toyboxSvg(toy = 'blocks') {
  let t;
  if (toy === 'top') {
    t = `<g class="pv-toy pv-spin"><path d="M80 20 L96 36 L82 56 L80 58 L78 56 L64 36 Z" fill="#9775fa" stroke="${LINE}" stroke-width="1.4" stroke-linejoin="round"/>`
      + `<path d="M66 33 L94 33 L92 38 L68 38 Z" fill="#ffd43b"/><rect x="77" y="12" width="6" height="9" rx="2" fill="#e03131" stroke="${LINE}" stroke-width="1.1"/></g>`;
  } else if (toy === 'ball') {
    t = `<g class="pv-toy pv-bounce"><circle cx="80" cy="44" r="11" fill="#ff6b6b" stroke="${LINE}" stroke-width="1.5"/><path d="M69 44 Q80 36 91 44" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M71 49 Q80 55 89 49" fill="none" stroke="#ffd43b" stroke-width="2.4"/></g>`;
  } else {
    const block = (cls, x, y, c, k) => `<g class="pv-toy ${cls}"><rect x="${x}" y="${y}" width="18" height="14" rx="2" fill="${c}" stroke="${LINE}" stroke-width="1.3"/><text x="${x + 9}" y="${y + 10.5}" font-size="9" font-weight="800" fill="#fff" text-anchor="middle">${k}</text></g>`;
    t = block('pv-b1', 70, 42, '#fa5252', 'ㄱ') + block('pv-b2', 73, 28, '#fab005', 'ㄴ') + block('pv-b3', 70, 14, '#228be6', 'ㄷ');
  }
  return `<svg class="pv pv-toybox" viewBox="0 0 110 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
    + `<rect x="6" y="26" width="42" height="30" rx="3" fill="#4dabf7" stroke="${LINE}" stroke-width="1.6"/><rect x="6" y="36" width="42" height="5" fill="#ffd43b"/>`
    + `<circle cx="20" cy="26" r="6" fill="#ff8787" stroke="${LINE}" stroke-width="1.2"/>`
    + `<rect class="pv-lid" x="3" y="19" width="48" height="8" rx="3" fill="#339af0" stroke="${LINE}" stroke-width="1.5"/>`
    + t
    + '</svg>';
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
  // 🛏️ 가구 놀기 (v365) — 침대·소파는 앞 판(front)이 둘 앞을 가린다 · 하늘·장난감·이야기는 날 번호(o.day)·하늘(o.sky)로
  else if (scene === 'nap') dev = bedSvg();
  else if (scene === 'sofa') dev = sofaSvg();
  else if (scene === 'pet') dev = cushionSvg();
  else if (scene === 'teddy') dev = `<div class="pv-tossx"><div class="pv-tossy">${teddySvg()}</div></div>`;
  else if (scene === 'book') dev = bookSvg(url);
  else if (scene === 'plant' || scene === 'flower') dev = potSvg(scene);
  else if (scene === 'window') dev = windowSvg(['day', 'dusk', 'night'].includes(o.sky) ? o.sky : 'day', rainbowOf(o.day), uid);
  else if (scene === 'toy') dev = toyboxSvg(toyOf(o.day));
  const front = scene === 'nap' ? bedSvg('front') : scene === 'sofa' ? sofaSvg('front') : '';
  const hand = scene === 'game' ? padSvg('pshow-pad is-me') : scene === 'plant' || scene === 'flower' ? canSvg('pshow-can') : '';
  const me = avatarSvg(o.look, { uid: `play-${uid}`, cls: 'pshow-me-art', title: whoOf(o.name).bare });
  const pal = mon
    ? `<div class="pshow-pal${tier ? ` is-bond${tier}` : ''}">${url ? `<img class="pshow-pal-img" src="${esc(url)}" alt="${esc(mon.ko || '')}" draggable="false">` : '<span class="pshow-pal-img is-emoji">🐾</span>'}${scene === 'game' ? padSvg('pshow-pad is-pal') : ''}</div>`
    : '';
  return `<div class="pshow-stage is-${esc(scene)}${mon ? '' : ' is-alone'}" style="--pw:${color(o.wall, '#fbf3e4')};--pf:${color(o.floor, '#e2c79f')}">`
    + '<div class="pshow-wall"></div><div class="pshow-floor"></div>'
    + `<div class="pshow-dev">${dev}</div>`
    + `<div class="pshow-me">${me}${hand}</div>`
    + pal
    + (front ? `<div class="pshow-front">${front}</div>` : '')
    + (scene === 'nap' ? '<div class="pshow-dim"></div><div class="pshow-sun"></div>' : '')
    + '<div class="pshow-fx" aria-hidden="true"></div>'
    + '</div>';
}
