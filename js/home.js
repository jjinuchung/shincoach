// 🏠 과목 고르기 — 앱을 켜면 가장 먼저 나오는 화면.
//
// 왜 이 화면이 있는가: 수학을 두 번째 과목으로 붙이면서 **영어 학습 흐름을 건드리지 않기** 위해서다.
// 도감·코인·레벨·기록은 과목이 함께 쓰고(그래야 "수학을 해서 마스터볼을 산다"가 성립한다),
// 학습 화면만 여기서 갈라진다. 새 과목이 생기면 SUBJECTS에 한 줄을 더한다.

import { ROSTER, loadCharacters } from './pokemon.js';

const $ = (id) => document.getElementById(id);

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
export function pickMascot(mascotId, characters) {
  if (!mascotId) return null;
  const hit = (characters || []).find((c) => c && c.id === mascotId && c.url);
  if (!hit) return null;
  const known = ROSTER.find((r) => r.id === mascotId);
  return { url: hit.url, ko: known ? known.ko : '' };
}

/** 카드를 누르면 어디로 가는가 — 화면 이름, 또는 아직 없으면 안내 문구 */
export function subjectTarget(subject) {
  if (!subject) return { view: null, hint: '' };
  if (subject.ready && subject.view) return { view: subject.view, hint: '' };
  return { view: null, hint: `${subject.emoji} ${subject.ko}은 아빠랑 만드는 중이에요 — 조금만 기다려 줘!` };
}

function cardEl(subject, mascot, onPick) {
  const li = document.createElement('li');
  li.className = 'home-card' + (subject.ready ? '' : ' soon');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'home-card-btn';
  btn.setAttribute('aria-label', `${subject.title} ${subject.ko}`);

  const stage = document.createElement('span');
  stage.className = 'home-card-mon';
  if (mascot) {
    const img = document.createElement('img');
    img.src = mascot.url;
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
  btn.addEventListener('click', () => onPick(subject));
  li.appendChild(btn);
  return li;
}

/**
 * 카드를 그린다. 그림은 기기에 받아둔 것만 쓰므로 인터넷이 없어도 화면은 항상 뜬다.
 * @param {(view:string)=>void} showView
 */
export async function renderHome(showView) {
  const list = $('home-subjects');
  const hint = $('home-hint');
  if (!list) return;
  let chars = [];
  try { chars = await loadCharacters(); } catch { chars = []; } // 그림이 없어도 카드는 떠야 한다

  const pick = (subject) => {
    const { view, hint: msg } = subjectTarget(subject);
    if (view) { hint.hidden = true; showView(view); return; }
    hint.textContent = msg;
    hint.hidden = false;
  };

  const frag = document.createDocumentFragment();
  for (const s of SUBJECTS) frag.appendChild(cardEl(s, pickMascot(s.mascot, chars), pick));
  list.innerHTML = '';
  list.appendChild(frag);
  hint.hidden = true;
}

/** 영어 화면의 ← 버튼만 여기서 맡는다 (🎒·📊·🚪는 각자의 모듈이 이미 맡고 있다) */
export function initHome({ showView }) {
  const back = $('btn-library-back');
  if (back) back.addEventListener('click', () => showView('home'));
}
