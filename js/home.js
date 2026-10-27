// 🏠 과목 고르기 — 앱을 켜면 가장 먼저 나오는 화면.
//
// 왜 이 화면이 있는가: 수학을 두 번째 과목으로 붙이면서 **영어 학습 흐름을 건드리지 않기** 위해서다.
// 도감·코인·레벨·기록은 과목이 함께 쓰고(그래야 "수학을 해서 마스터볼을 산다"가 성립한다),
// 학습 화면만 여기서 갈라진다. 새 과목이 생기면 SUBJECTS에 한 줄을 더한다.

import { ROSTER, loadCharacters, characterUrl, artUrl } from './pokemon.js';
import { dailyBonus, bonusText } from './mathbonus.js';
import { korBonusFor } from './korday.js'; // ✨ 국어·논술 카드 오늘의 보너스 (v329)
import { getLook, getProfileSnapshot, onProfileReload } from './xp.js';
import { dailyDone } from './mathprog.js';
import { todayKey } from './track.js';
import { homePalOf } from './homeplay.js'; // 🤝 홈 화면 파트너 — 누구를 보일지 (순수)
import { mountHomePal } from './homepal.js'; // 🤝 홈 화면 파트너 — 그리기·걷기
import { letterBox, refreshLetter } from './familyview.js'; // 💌 아빠·엄마 한 줄 메시지 (v288)

const $ = (id) => document.getElementById(id);

/** 🤝 홈 화면 파트너 (2026-10-18) — 💗 10부터 화면 아래를 걸어 다닌다 · mountHomePal의 { refresh } */
let pal = null;
/** 지금 보일 파트너와 그림 — 🌈 이로치로 만들었으면 그 그림(과목 카드와 같은 규칙) · 그림이 없으면 url '' (🐾) */
function palNow() {
  const p = homePalOf(getProfileSnapshot());
  if (!p) return null;
  const look = getLook(p.id);
  const r = ROSTER.find((x) => x.id === p.id);
  return { ...p, url: (look && look.shinyUrl) || characterUrl(p.id) || artUrl(p.id) || '', ko: r ? r.ko : '' };
}

/**
 * 과목 카드.
 * `mascot`은 명단(ROSTER)의 포켓몬 id — 그림을 아직 안 받았으면 `emoji`로 대신한다.
 * `ready: false`면 눌러도 학습으로 안 가고 안내만 뜬다 (만드는 중인 과목).
 */
export const SUBJECTS = [
  {
    key: 'english',
    title: 'English',
    ko: '영어 섀도잉',
    desc: '영상 보고 따라 말하기',
    emoji: '🎤',
    mascot: 39,   // 푸린 — 노래하는 포켓몬이라 "따라 말하기"와 어울린다
    view: 'library',
    ready: true,
  },
  {
    key: 'math',
    title: 'Math',
    ko: '수학',
    desc: '분수부터 차근차근',
    emoji: '🔢',
    mascot: 65,   // 후딘 — IQ 5000, 계산이 특기
    view: 'math',
    ready: true,
  },
  {
    key: 'korean',
    title: 'Korean',
    ko: '국어',
    desc: '글 읽고 작품 카드 모으기',
    emoji: '📚',
    mascot: 201,  // 안농 — 글자 모양 포켓몬 (2026-10-11 국어)
    view: 'korean',
    ready: true,
  },
  {
    key: 'nonsul',
    title: 'Opinion',
    ko: '논술',
    desc: '내 의견과 이유 말하기',
    emoji: '🖊️',
    mascot: 441,  // 페라페 — 사람 말을 따라 하는 포켓몬 · 논술 전용 100마리 중 하나 (2026-10-20)
    view: 'nonsul',
    ready: true,
  },
  // 📝 영어 문법 카드(v348)는 v349에서 걷었다 — 아버님 10-27 "과목을 새롭게 만들자는 게 아니었다" → 🎬 영상 따라 하기 사이 📝 문법 쪽지(grammarnote.js)
];

/**
 * 카드에 쓸 그림을 고른다. 받아둔 캐릭터에 마스코트가 있으면 그 그림,
 * 없으면 그림 없이(이모지로 대신) 그린다 — **엉뚱한 포켓몬으로 대신 채우지 않는다**
 * (진우가 바로 알아본다. 빈 자리가 틀린 그림보다 낫다).
 *
 * @param {number} mascotId 명단 포켓몬 id
 * @param {Array<{id:number, url:string}>} characters 기기에 받아둔 캐릭터
 * @returns {{url:string, ko:string}|null}
 */
export function pickMascot(mascotId, characters, shinyUrlOf) {
  if (!mascotId) return null;
  const hit = (characters || []).find((c) => c && c.id === mascotId && c.url);
  if (!hit) return null;
  const known = ROSTER.find((r) => r.id === mascotId);
  const shiny = typeof shinyUrlOf === 'function' ? shinyUrlOf(mascotId) : null; // 🌈 그 마스코트를 이로치로 만들었으면 홈에서도 (하나뿐인 <img> 직접 생성 자리)
  return { url: shiny || hit.url, ko: known ? known.ko : '' };
}

/** 카드를 누르면 어디로 가는가 — 화면 이름, 또는 아직 없으면 안내 문구 */
export function subjectTarget(subject) {
  if (!subject) return { view: null, hint: '' };
  if (subject.ready && subject.view) return { view: subject.view, hint: '' };
  return { view: null, hint: `${subject.emoji} ${subject.ko}은 아빠랑 만드는 중이에요 — 조금만 기다려 줘!` };
}

/** 과목 카드 하나 (그리기 — 시험이 가짜 화면으로 부른다, v330) */
export function cardEl(subject, mascot, onPick) {
  const li = document.createElement('li');
  li.className = `home-card is-${subject.key}` + (subject.ready ? '' : ' soon'); // 과목 색은 키로 (v323 — 차례로 달면 새 과목이 색 없이 나온다)

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'home-card-btn';
  btn.setAttribute('aria-label', `${subject.title} ${subject.ko}`);

  const stage = document.createElement('span');
  stage.className = 'home-card-mon';
  if (mascot) {
    const img = document.createElement('img');
    img.src = mascot.url; // pickMascot이 이로치면 이미 그 그림
    img.alt = mascot.ko;
    img.draggable = false;
    stage.appendChild(img);
  } else {
    // 그림을 아직 안 받았을 때 (⚙ 설정에서 받기 전, 또는 오프라인 첫 실행)
    stage.classList.add('no-img');
    stage.textContent = subject.emoji;
  }

  const name = document.createElement('span');
  name.className = 'home-card-title';
  name.textContent = `${subject.emoji} ${subject.title}`;

  const sub = document.createElement('span');
  sub.className = 'home-card-desc';
  sub.textContent = subject.ready ? subject.desc : `${subject.ko} — 준비 중`;

  btn.appendChild(stage);
  btn.appendChild(name);
  btn.appendChild(sub);
  // 🔁 밀린 복습 칩 (영어 카드) — 복습은 영상 안에 숨어 있어서 아이가 있는 줄을 몰랐다 (2026-09-23)
  if (subject.reviewDue > 0) {
    const chip = document.createElement('span');
    chip.className = 'home-card-review';
    chip.textContent = `🔁 복습 ${subject.reviewDue}문장이 기다려요`;
    btn.appendChild(chip);
  }
  // ✨ 오늘의 보너스 칩 (수학 카드) — 아직 안 받았으면 카드가 반짝이고, 받았으면 차분하게 "받았어요"
  if (subject.bonus) {
    const chip = document.createElement('span');
    chip.className = 'home-card-bonus' + (subject.bonus.got ? ' got' : '');
    chip.textContent = subject.bonus.got ? `✅ 오늘의 보너스 ${subject.bonus.text} 받았어요` : `✨ 오늘의 보너스 ${subject.bonus.text}`;
    btn.appendChild(chip);
    if (!subject.bonus.got) {
      li.classList.add('sparkle');
      const tip = document.createElement('span');
      tip.className = 'home-card-bonus-tip';
      tip.textContent = subject.bonus.tip || '☀️ 오늘의 수학 완주하면 받아요'; // 📚·🖊️ 카드는 제 말(v329 korday.BONUS_TIP)
      btn.appendChild(tip);
      for (let i = 0; i < 4; i++) { const sp = document.createElement('i'); sp.className = `spark s${i + 1}`; sp.textContent = '✨'; sp.setAttribute('aria-hidden', 'true'); btn.appendChild(sp); }
    }
  }
  btn.addEventListener('click', () => onPick(subject));
  li.appendChild(btn);
  return li;
}

/**
 * 수학 카드에 얹을 오늘의 보너스 — {text, got}. 기록을 못 읽어도 카드는 떠야 하므로 실패하면 null.
 * @param {object|null} m 수학 레코드 (db.getMath)
 * @param {string} today track.todayKey()
 */
export function mathBonusFor(m, today) {
  try {
    const b = dailyBonus(today);
    return { text: bonusText(b), got: dailyDone(m, today) > 0 };
  } catch { return null; }
}

/**
 * 카드 하나에 얹을 것 (순수) — 수학: ✨·📬 · 영어: 🔁 복습 · 국어·논술: ✨
 * 🔁 복습 칩은 영어 카드에만 — 영어 문장 복습 수라서(예전엔 수학을 뺀 모든 카드에 넘겨 국어·논술 카드에도 「복습 N문장」이 붙었다, v330)
 * @param {object} s SUBJECTS 한 줄 · @param {{bonus?:object, unread?:number, reviewDue?:number, korBonus?:object}} x
 */
export function cardSubject(s, { bonus = null, unread = 0, reviewDue = 0, korBonus = {} } = {}) {
  if (s.key === 'math') return { ...s, bonus, ...(unread ? { desc: `📬 아빠 답장 ${unread}개 — 먼저 읽어요` } : {}) };
  if (s.key === 'english') return { ...s, reviewDue };
  const kb = korBonus && Object.hasOwn(korBonus, s.key) ? korBonus[s.key] : null;
  return kb ? { ...s, bonus: kb } : { ...s };
}

/** 홈 카드를 그린 날 — ✨ 칩은 그날 보너스라 자정이 지나면 다시 그린다 (v329 🔍 Codex 133차 #3 — 수학 칩도 같이) */
let homeDay = '';
/** 홈을 그린 뒤 날짜가 바뀌었나 (그린 적이 없으면 아니다) */
export function homeStale(today = todayKey()) {
  return !!homeDay && homeDay !== today;
}

/**
 * 카드를 그린다. 그림은 기기에 받아둔 것만 쓰므로 인터넷이 없어도 화면은 항상 뜬다.
 * @param {(view:string)=>void} showView
 */
export async function renderHome(showView) {
  const list = $('home-subjects');
  const hint = $('home-hint');
  if (!list) return;
  homeDay = todayKey(); // 먼저 적는다 — 그리는 동안 1초 시계가 또 부르지 않게
  let chars = [];
  try { chars = await loadCharacters(); } catch { chars = []; } // 그림이 없어도 카드는 떠야 한다

  const pick = (subject) => {
    const { view, hint: msg } = subjectTarget(subject);
    if (view) { hint.hidden = true; showView(view); return; }
    hint.textContent = msg;
    hint.hidden = false;
  };

  // 📬 아빠의 답장이 와 있으면 수학 카드에 먼저 알린다 (읽어야 ☀️가 열린다) · ✨ 오늘의 보너스도 수학 카드에
  let unread = 0;
  let bonus = null;
  try {
    const { getMath } = await import('./db.js'); const { unreadAsks } = await import('./mathask.js');
    const m = await getMath();
    unread = unreadAsks(m).length;
    bonus = mathBonusFor(m, todayKey());
  } catch { unread = 0; }
  // 🔁 영어 카드에 "복습 N문장이 기다려요" — 밀린 문장이 있는 영상이 기기에 있을 때만
  let reviewDue = 0;
  try {
    const { getAllSentenceStats, listItems } = await import('./db.js');
    const { pickDueItem, reviewable } = await import('./review.js');
    const [records, items] = await Promise.all([getAllSentenceStats(), listItems()]);
    // 🚫 복습에 안 쓰는 콘텐츠는 뺀다 (목록의 🔁 버튼과 같은 기준이어야 숫자가 어긋나지 않는다)
    const ids = (items || []).filter((it) => it && !it.broken && reviewable(it)).map((it) => it.id);
    const { reviewRoundSize } = await import('./player.js');
    const pickDue = pickDueItem(records, todayKey(), ids);
    // 밀린 전체가 아니라 **지금 풀 문항 수** (목록 버튼과 같은 숫자여야 한다)
    reviewDue = pickDue ? Math.min(pickDue.due, reviewRoundSize()) : 0;
  } catch { reviewDue = 0; }
  // ✨ 국어·논술 카드도 제 보너스 (v329 — 그 과목 그날 첫 끝냄에 받음 · 받았나는 오늘 하루 기록) · 못 읽으면 칩 없이
  const korBonus = {};
  try {
    const { getDaily } = await import('./db.js');
    const day = todayKey();
    const d = await getDaily(day);
    for (const k of ['korean', 'nonsul']) korBonus[k] = korBonusFor(d, day, k);
  } catch { /* 칩 없이 */ }
  const frag = document.createDocumentFragment();
  const shinyOf = (id) => { const l = getLook(id); return l && l.shinyUrl ? l.shinyUrl : null; };
  for (const s of SUBJECTS) frag.appendChild(cardEl(cardSubject(s, { bonus, unread, reviewDue, korBonus }), pickMascot(s.mascot, chars, shinyOf), pick));
  list.innerHTML = '';
  list.appendChild(frag);
  hint.hidden = true;
  // 🎒 포켓몬 대여행 카드 (v341) — 화면 모듈은 처음 그릴 때 불러온다(못 불러와도 과목 카드는 그대로)
  import('./journeyview.js').then((m) => m.mountJourneyCard($('home-journey'))).catch(() => {});
  if (pal) pal.refresh(); // 🤝 그 사이 💗·파트너가 바뀌었을 수 있다
  // 💌 맨 위 편지 — 가진 것으로 바로 그리고, 받아 와서 바뀌면 다시 (못 받아도 홈은 그대로)
  refreshLetter(letterBox()).catch(() => {});
}

/** 영어 화면의 ← 버튼만 여기서 맡는다 (🎒·📊·🚪는 각자의 모듈이 이미 맡고 있다) */
export function initHome({ showView }) {
  const back = $('btn-library-back');
  if (back) back.addEventListener('click', () => showView('home'));
  // 🤝 홈 화면 파트너 — 한 번만 붙이고, 다른 창에서 돌아와 프로필을 다시 읽으면 다시 본다
  const view = $('view-home');
  if (view && !pal) {
    pal = mountHomePal(view, { getPal: palNow });
    onProfileReload(() => pal.refresh());
  }
}
