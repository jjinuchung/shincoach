// 🔢 수학 — 분수 줄기의 개념 사다리와 문제 생성기 (순수 함수, 화면 없음)
//
// 설계 원칙 (아버님 요구에서 나온 것):
// ① **객관식만** — 태블릿에 펜이 없고 손글씨 인식도 못 한다. 아이는 연습장에서 풀고 답만 고른다.
// ② **개념 하나가 학습 단위** — 문제를 많이 푸는 게 목적이 아니라 개념을 이해했는지 보는 것.
// ③ **한 개념을 세 얼굴로 묻는다** — calc(할 줄 아는가) / misread(왜 틀렸는지 아는가) / why(진짜 이해했는가).
//    세 개를 다 통과해야 그날 "안다"가 되고, 라이트너로 며칠 뒤 다시 물어야 👑 이해 완료.
// ④ ★ **오답은 흔한 오개념으로 채운다** — 그래야 객관식이 이해 검증이 된다.
//    `1/2 + 1/3`의 오답에 `2/5`를 넣으면, 그걸 고른 아이는 **분모끼리 더했다**는 게 정확히 드러난다.
//    오답마다 `tag`(오개념 이름)를 달아 두어 틀린 답이 곧 진단이 된다 (영어의 `missedWords`와 같은 자리).
//
// ⑤ ★ **문제 속 세계는 포켓몬, 문제 속 사람은 진우다** (아버님 요구). "철수가 피자를"이 아니라
//    "푸린이 피자를", "진우가 몬스터볼을". 자기가 문제 안에 있으면 남의 일이 아니게 된다.
//    포켓몬 이름은 화면이 넘겨 준다 (도감에서 **진우가 잡은 포켓몬**을 우선) — 여기서는 이름만 끼운다.
//    문제는 기기에서 오프라인으로 만들므로 소재(나무열매·HP·몬스터볼·배지·경험치)는 미리 틀로 적어 둔다.
//
// 학년은 순서가 아니라 **표시**다. 진우는 선행 중이라 진단으로 시작점을 잡고 사다리를 오른다.

import { barSvg, pizzaSvg, barsSvg, figureSvg } from './mathdraw.js';

// ───────────────────── 이야기 재료 ─────────────────────

/** 도감에서 이름을 못 받았을 때 쓰는 기본 출연진 (명단에 다 있는 것들) */
export const DEFAULT_CAST = ['피카츄', '파이리', '꼬부기', '이상해씨', '푸린', '이브이'];

/** 받침 유무로 조사 고르기: josa('피카츄', '이', '가') → '가' (catch.js와 같은 규칙 — 그쪽은 화면 모듈이라 안 끌어온다) */
export function josa(word, withBatchim, without) {
  const ch = String(word || '').slice(-1);
  const code = ch.charCodeAt(0) - 0xAC00;
  if (code < 0 || code > 11171) return without;
  return code % 28 === 0 ? without : withBatchim;
}

/**
 * 숫자 뒤 조사 — 읽는 소리로 정한다. 3(삼)·6(육)·0(십·백)은 받침, 1·7·8은 ㄹ받침이라 '으로'가 아니라 '로'.
 * numJosa(3, '으로', '로') → '으로', numJosa(8, '으로', '로') → '로', numJosa(2, '을', '를') → '를'
 */
export function numJosa(n, withBatchim, without) {
  const last = Math.abs(Math.trunc(Number(n) || 0)) % 10;
  const batchim = [0, 1, 3, 6, 7, 8].includes(last);
  if (!batchim) return without;
  if (withBatchim === '으로' && [1, 7, 8].includes(last)) return without; // ㄹ받침 뒤에는 '로'
  return withBatchim;
}

/**
 * 이야기 틀에 이름을 끼운다.
 *   {me} {mon} {mon2}          — 이름
 *   {mon/이/가} {me/아/야}      — 이름 + 받침에 맞는 조사
 */
export function fill(tpl, cast) {
  return String(tpl).replace(/\{(me|mon|mon2)(?:\/([^/}]+)\/([^}]+))?\}/g, (_, who, a, b) => {
    const name = cast[who] || '';
    return a === undefined ? name : name + josa(name, a, b);
  });
}

/**
 * 세계관 — 포켓몬이 기본(70%), 나머지 30%는 **진우가 끝까지 본 영어 영상**의 세계 (아버님 요구).
 * 영상 세계는 화면이 `opts.worlds`로 넘긴다 (본 영상만) — 안 본 영상의 등장인물은 나오지 않는다.
 * 각 세계의 출연진(한국어 이름)은 여기 둔다. 포켓몬은 도감에서 잡은 것이 `opts.names`로 온다.
 */
export const WORLDS = {
  pokemon: { label: '포켓몬', cast: DEFAULT_CAST },
  toystory: { label: '토이 스토리 5', cast: ['보니', '제시', '버즈', '우디', '불즈아이', '포키', '돌리', '렉스', '블레이즈', '릴리패드'] },
  minions: { label: '미니언즈', cast: ['제임스', '헨리', '에드', '딕', '맥스', '도르트', '구미', '하워드', '필립스'] },
  moana: { label: '모아나', cast: ['모아나', '마우이', '헤이헤이', '푸아', '탈라 할머니', '투이 족장'] },
};
export const POKEMON_SHARE = 0.7;

/**
 * 출연진 뽑기 — 세계를 먼저 정하고(포켓몬 70% / 본 영상 30%), 그 세계에서 서로 다른 둘.
 * 줄기마다 같은 규칙이라 내보낸다 (mathneg.js가 쓴다).
 * @returns {{me:string, mon:string, mon2:string, world:string}}
 */
export function castOf(r, opts) {
  const others = Object.keys((opts && opts.worlds) || {}).filter((w) => w !== 'pokemon' && WORLDS[w]);
  let world = 'pokemon';
  if (others.length && r() >= POKEMON_SHARE) world = pick(r, others);
  let pool;
  if (world === 'pokemon') pool = (opts && opts.names && opts.names.length) ? opts.names : DEFAULT_CAST;
  else pool = (opts.worlds[world] && opts.worlds[world].length) ? opts.worlds[world] : WORLDS[world].cast;
  const mon = pick(r, pool);
  // 둘째 출연은 첫째를 뺀 풀에서 — 잡은 포켓몬이 한 마리뿐이면 기본 출연진으로 채운다
  // (Codex 리뷰 #9: 같은 이름 둘이면 "리자몽의 열매는 리자몽의 몇 배?" 같은 문제가 나온다)
  let rest = pool.filter((n) => n !== mon);
  if (!rest.length) rest = (world === 'pokemon' ? DEFAULT_CAST : WORLDS[world].cast).filter((n) => n !== mon);
  const mon2 = rest.length ? pick(r, rest) : mon;
  // recent: 화면이 넘기는 "방금 나온 이야기 틀" — 같은 개념을 다시 풀 때 같은 이야기가 또 나오지 않게 (2026-09-20 아버님: "피자 얘기가 너무 반복")
  // want: 이 이야기 틀로 (🔁 쌍둥이·🤔 오답 노트 — 같은 틀, 숫자만 다르게). {k, key}면 그 얼굴(kind)의 문항에만 —
  //       한 편(makeRound)의 다른 얼굴까지 끌려가면 안 된다 (Codex 2차 #7: ③ 키가 계산 문항의 더하기/빼기까지 정해 버렸다)
  const w = opts && opts.want;
  return { me: (opts && opts.me) || '진우', mon, mon2, world, recent: (opts && opts.recent) || [], want: (w && typeof w === 'object') ? (w.key || '') : (w || ''), wantKind: (w && typeof w === 'object') ? (w.k || '') : '', key: '' };
}

/**
 * 세계에 맞는 이야기 틀 고르기 — 그 세계 틀이 없으면 포켓몬 틀로.
 * `c.want`가 있으면 그 틀로(쌍둥이). 아니면 `c.recent`에 있는 틀은 피한다 (다 최근 것이면 전부에서).
 * 고른 틀은 `c.key`에 남겨 화면이 다음 편에 recent로 넘긴다.
 */
export function worldPick(r, c, pools) {
  const all = Object.values(pools).flat();
  let list = (c && pools[c.world] && pools[c.world].length) ? pools[c.world] : pools.pokemon;
  if (c && c.want) {
    const same = all.filter((t) => tplKey(t) === c.want);
    if (same.length) { const t = same[0]; c.key = tplKey(t); return t; }
  }
  const fresh = list.filter((t) => !(c && c.recent && c.recent.includes(tplKey(t))));
  const t = pick(r, fresh.length ? fresh : list);
  if (c) c.key = tplKey(t);
  return t;
}

/** 이야기 틀의 이름표 — 숫자를 지운 글. 틀은 숫자가 끼워진 뒤에 오므로 "피자 4조각"과 "피자 5조각"이 같은 틀로 잡혀야 한다 */
export function tplKey(t) {
  // 숫자 뒤 조사는 숫자를 따라 바뀐다(3을/2를, 6과/5와) — 같은 틀이 다른 키가 되지 않게 한 모양으로
  return String(t || '').replace(/\d+/g, '#')
    .replace(/#(을|를)/g, '#을').replace(/#(이|가)/g, '#이').replace(/#(은|는)/g, '#은').replace(/#(과|와)/g, '#과').replace(/#(으로|로)/g, '#로');
}

// ───────────────────── 씨앗 난수 (같은 씨앗이면 같은 문제 — 테스트가 가능해진다) ─────────────────────

/** mulberry32 — 짧고 고르게 퍼진다. Math.random을 쓰면 문제를 재현할 수 없어 테스트를 못 붙인다 */
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
export const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
/** 분모 d와 서로소인 분자 — 약분을 묻는 개념이 아닌 곳에서 3/6 같은 수가 나오면 산만하다 */
const coprime = (r, d) => { let n = int(r, 1, d - 1); for (let i = 0; i < 20 && gcd(n, d) !== 1; i++) n = int(r, 1, d - 1); return n; };

/** 제자리 섞기 (보기 순서를 고정하면 아이가 "늘 두 번째가 정답"을 외운다) */
export function shuffle(r, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ───────────────────── 분수 계산 도우미 ─────────────────────

export function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
export function lcm(a, b) { return Math.abs(a * b) / gcd(a, b); }

/** 기약분수로 (분모가 1이면 자연수로 보이게 하는 건 표시 쪽 일) */
export function reduce(n, d) { const g = gcd(n, d); return { n: n / g, d: d / g }; }

/** 화면에 쓸 글자 — 분모가 1이면 자연수, 가분수는 그대로 (대분수 변환은 개념이라 따로 묻는다) */
export function fracText(n, d) {
  if (d === 1) return String(n);
  return `${n}/${d}`;
}

/** 대분수 글자 ("1 2/3") */
export function mixedText(w, n, d) {
  if (!w) return fracText(n, d);
  if (!n) return String(w);
  return `${w} ${n}/${d}`;
}

/**
 * 오답용 분수 글자 — **기약분수로 맞춰서** 낸다. 정답만 약분돼 있으면 "혼자 다른 모양"이 정답 힌트가 된다.
 * 분모 0이나 음수처럼 말이 안 되는 것은 빈 글자('')로 돌려 choices()가 버리게 한다.
 */
function fr(n, d) {
  if (!d || n < 0 || d < 0) return '';
  const q = reduce(n, d);
  return fracText(q.n, q.d);
}

/** 정답 근처의 "계산 실수" 오답 — 오개념 오답끼리 겹쳐 모자랄 때만 쓴다 (보기가 둘뿐이면 찍어서 맞는다) */
function nearMiss(answer, k) {
  const m = /^(\d+)(?:\/(\d+))?$/.exec(answer);
  if (!m) return '';
  const n = Number(m[1]);
  const d = m[2] ? Number(m[2]) : 1;
  const tries = [[n + 1, d], [n, d + 1], [n + 2, d], [n, d + 2], [n + 1, d + 1], [n + 3, d], [n, d + 3]];
  const [tn, td] = tries[k % tries.length];
  return fr(tn, td);
}

/**
 * 보기 글자의 값 — "5/6" · "3" · "2 3/8" → {n, d}. 수가 아니면 null.
 * 보기끼리 **값**으로 비교하려고 쓴다: `3/6 − 2/6`의 오답 "6/36"(곱셈으로 풂)은 글자는 달라도 정답 1/6과 같은 값이라
 * 그걸 고른 아이는 맞은 것이다 (Codex 리뷰 #2 — 글자만 비교하면 맞은 답을 틀렸다고 하고 오개념까지 기록한다)
 */
export function valueOf(text) {
  const s = String(text || '').trim();
  let m;
  if ((m = /^(\d+) (\d+)\/(\d+)$/.exec(s))) return { n: Number(m[1]) * Number(m[3]) + Number(m[2]), d: Number(m[3]) };
  if ((m = /^(\d+)\/(\d+)$/.exec(s))) return { n: Number(m[1]), d: Number(m[2]) };
  if ((m = /^(\d+)$/.exec(s))) return { n: Number(m[1]), d: 1 };
  return null;
}
const sameValue = (a, b) => !!(a && b && a.d && b.d && a.n * b.d === b.n * a.d);

/** 보기 네 개 만들기 — 정답 하나 + 오개념 오답. 글자가 같거나 **값이 같으면** 하나로 (정답이 두 번 나오면 안 된다) */
function choices(r, answer, wrongs) {
  const seen = new Set([answer]);
  const vals = [valueOf(answer)];
  const list = [{ text: answer, ok: true }];
  const dup = (t) => { const v = valueOf(t); return seen.has(t) || (v && vals.some((x) => sameValue(x, v))); };
  const add = (t, tag) => { seen.add(t); vals.push(valueOf(t)); list.push({ text: t, ok: false, tag }); };
  for (const w of wrongs) {
    if (!w || !w.text || dup(w.text) || list.length >= 4) continue;
    add(w.text, w.tag);
  }
  for (let k = 0; list.length < 4 && k < 20; k++) {
    const alt = nearMiss(answer, k);
    if (alt && !dup(alt)) add(alt, '계산 실수');
  }
  return shuffle(r, list);
}

/**
 * 문항 한 개.
 * `q`는 이야기 문장, `expr`은 그 아래 크게 보여 줄 식(계산 문항만). 화면이 둘을 따로 그린다 —
 * 이야기만 있으면 식을 찾아 읽어야 하고, 식만 있으면 재미가 없다.
 */
export function ask(concept, kind, q, chs, o = {}) {
  return { concept, kind, q, expr: o.expr || '', hint: o.hint || '', figure: o.figure || '', choices: chs, solve: o.solve || null };
}

/**
 * 📖 풀이 — 틀린 직후 보기 아래에 펼쳐지는 카드의 재료 (2026-09-21, 진우: "왜 틀렸는지 한 문장 말고 그림이랑 풀이를").
 *   steps: 이렇게 풀어요 (2~4줄, 이 문제의 숫자로)
 *   why:   오개념 이름표 → 왜 그 실수인가 (이 문제의 숫자로). 없으면 whyAny
 *   whyAny: 어느 오답이든 같은 설명 (② 오개념 문항처럼 "포켓몬이 무엇을 잘못했나"가 하나일 때)
 *   figure: 정답 그림 (SVG). compare: 내 답과 정답을 막대로 나란히 그려도 되는 문항인가 (분수 모양 답)
 *   rule:  다음에 기억할 것 한 줄
 *   numline: 내 답과 정답을 **수직선에 점 두 개**로 나란히 그려도 되는 문항인가 (음수 줄기 — 정수 답)
 */
export function solve(steps, o = {}) {
  return { steps, why: o.why || {}, whyAny: o.whyAny || '', figure: o.figure || '', compare: !!o.compare, numline: !!o.numline, rule: o.rule || '' };
}

// ───────────────────── 개념 사다리 (A. 분수 줄기) ─────────────────────
//
// `needs`는 선행 개념. 앞을 👑 하지 않으면 뒤가 🔒으로 잠긴다 (보이게 잠그고 벌어서 열게 — 🎟️ 교환권과 같은 방식).
// `why`는 손으로 쓴 문항 묶음이다. 개념 이해를 직접 찌르는 자리라 생성기로는 못 만든다.

export const FRACTION = [
  {
    id: 'frac.mean', grade: 4, name: '분수가 무엇인가', needs: [],
    idea: '분수는 **똑같이 나눈 조각**을 세는 말이에요. 아래(분모)는 몇 조각으로 나눴나, 위(분자)는 그중 몇 개인가.',
    calc(r, c) {
      const d = pick(r, [3, 4, 5, 6, 8]);
      const n = int(r, 1, d - 1);
      const pools = {
        pokemon: [
          `{me/이/가} {mon/과/와} 피자를 똑같이 ${d}조각으로 나눴어요. {mon/이/가} ${n}조각을 먹었어요. {mon/이/가} 먹은 피자는 전체의 얼마일까요?`,
          `{mon}의 HP 막대는 ${d}칸이에요. 배틀에서 ${n}칸이 줄었어요. 줄어든 HP는 전체의 얼마일까요?`,
          `체육관 배지는 모두 ${d}개예요. {me/이/가} 그중 ${n}개를 모았어요. 얼마를 모았나요?`,
          `{mon/이/가} 나무열매 ${d}개를 똑같은 크기로 늘어놓고 ${n}개를 먹었어요. 먹은 열매는 전체의 얼마일까요?`,
        ],
        toystory: [
          `보니가 {mon/과/와} 포키의 결혼식 케이크를 똑같이 ${d}조각으로 잘랐어요. {mon/이/가} ${n}조각을 먹었어요. 먹은 케이크는 전체의 얼마일까요?`,
          `릴리패드의 배터리 막대는 ${d}칸이에요. 보니가 터틀 태그를 하다가 ${n}칸을 썼어요. 쓴 배터리는 전체의 얼마일까요?`,
          `제시가 대포딜에게 당근 ${d}개를 똑같은 크기로 늘어놓고 ${n}개를 줬어요. 준 당근은 전체의 얼마일까요?`,
        ],
        minions: [
          `제임스가 바나나 ${d}개를 똑같이 늘어놓았는데 헨리가 ${n}개를 먹어 버렸어요. 헨리가 먹은 바나나는 전체의 얼마일까요?`,
          `영화 필름 한 통은 ${d}칸이에요. 맥스 감독이 ${n}칸을 찍었어요. 찍은 필름은 전체의 얼마일까요?`,
          `{mon/이/가} 도르트의 블루베리 머핀 ${d}개 중 ${n}개를 몰래 먹었어요. 먹은 머핀은 전체의 얼마일까요?`,
        ],
        moana: [
          `모투누이 섬의 코코넛 나무 ${d}그루 중 ${n}그루가 병들었어요. 병든 나무는 전체의 얼마일까요?`,
          `{mon/이/가} 코코넛 ${d}개를 똑같은 크기로 늘어놓고 ${n}개를 헤이헤이에게 줬어요. 준 코코넛은 전체의 얼마일까요?`,
          `카카모라 ${d}마리가 쫓아왔는데 ${n}마리가 카누에 올라탔어요. 올라탄 카카모라는 전체의 얼마일까요?`,
        ],
      };
      const story = worldPick(r, c, pools); // 포켓몬 틀 넷도 여기서 — 방금 나온 이야기(피자…)는 피한다
      // 이 개념은 분수 "모양"을 묻는 것이라 약분하지 않고 쓴 그대로 보여 준다 (3/1을 3으로 바꾸면 오개념이 안 보인다)
      // 그림: 피자 이야기는 원, 나머지는 막대 — 그림을 분수로 읽는 것이 이 개념의 알맹이다
      const fig = /케이크|피자/.test(story) ? pizzaSvg(d, n) : barSvg(d, n);
      return ask(this.id, 'calc', fill(story, c), choices(r, `${n}/${d}`, [
        { text: `${d}/${n}`, tag: '위아래를 바꿔 씀' },
        { text: `${n}/${d - n}`, tag: '남은 조각을 분모로 씀' },
        { text: `${d - n}/${d}`, tag: '먹은 것과 남은 것을 헷갈림' },
      ]), { figure: fig, solve: solve([
        `① 전체를 똑같이 ${d}조각으로 나눴어요 → 아래(분모)는 ${d}`,
        `② 그중 ${n}조각 → 위(분자)는 ${n}`,
        `③ 답: ${n}/${d}`,
      ], {
        why: {
          '위아래를 바꿔 씀': `${d}/${n}${numJosa(n, '은', '는')} "${n}조각으로 나눈 것 중 ${d}조각"이라는 뜻이에요. 아래가 전체 조각 수(${d}), 위가 그중 몇 개(${n})예요.`,
          '남은 조각을 분모로 씀': `아래(분모)는 남은 조각이 아니라 **전체** 조각 수예요. 전체는 ${d}조각이니까 분모는 ${d}.`,
          '먹은 것과 남은 것을 헷갈림': `${d - n}/${d}${numJosa(d, '은', '는')} **남은** 조각이에요. 문제는 ${n}조각 쪽을 물었어요 — 그림에서 칠해진 칸을 세어 봐요.`,
          '계산 실수': `조각 수를 다시 세어 봐요. 전체 ${d}칸, 그중 ${n}칸.`,
        },
        figure: fig, compare: true, rule: '아래 = 몇 조각으로 나눴나, 위 = 그중 몇 개.',
      }) });
    },
    misread(r, c) {
      const d = pick(r, [4, 6, 8]);
      return ask(this.id, 'misread', fill(`{mon/이/가} "${d}조각으로 나눈 것 중 1조각"을 ${d}/1 이라고 썼어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, '위아래를 바꿔 썼어요', [
        { text: '조각 수를 잘못 셌어요', tag: '오개념을 못 짚음' },
        { text: '더하기를 빼먹었어요', tag: '오개념을 못 짚음' },
        { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
      ]), { solve: solve([
        `① "${d}조각으로 나눈 것 중 1조각" → 나눈 조각 수 ${d}${numJosa(d, '은', '는')} 아래, 그중 1은 위`,
        `② 바르게 쓰면 1/${d}`,
      ], {
        whyAny: fill(`{mon/이/가} 위아래를 바꿔 썼어요. ${d}/1${numJosa(1, '은', '는')} "통째로 ${d}판"이라는 뜻이지, 한 판의 조각 하나가 아니에요.`, c),
        figure: barSvg(d, 1), rule: '아래 = 몇 조각으로 나눴나, 위 = 그중 몇 개.',
      }) });
    },
    why: [
      { q: '분모(아래 숫자)는 무엇을 말하나요?', ok: '전체를 몇 조각으로 똑같이 나눴는지', no: ['먹은 조각이 몇 개인지', '남은 조각이 몇 개인지', '조각이 얼마나 큰지'] },
      { q: '피자 2/5와 2/7 중 어느 것이 더 클까요? 왜일까요?', ok: '2/5 — 적게 나눌수록 한 조각이 크니까', no: ['2/7 — 아래 숫자가 더 크니까', '2/7 — 나눈 조각이 많으니까', '똑같아요 — 위 숫자가 같으니까'] },
    ],
  },

  {
    id: 'frac.same', grade: 4, name: '같은 분모끼리 더하고 빼기', needs: ['frac.mean'],
    idea: '조각의 **크기가 같으면** 개수만 세면 돼요. 분모는 그대로 두고 분자만 더하거나 빼요.',
    calc(r, c) {
      const d = pick(r, [5, 6, 7, 8, 9, 10]);
      const a = int(r, 1, d - 2);
      const b = int(r, 1, d - a - 1);
      // 🔁 쌍둥이(c.want)면 방금 것과 같은 셈(더하기/빼기)이어야 한다 — 빼기 틀은 전부 "남은 …"으로 끝난다
      const plus = c.want ? !/남은/.test(c.want) : r() < 0.6;
      const [x, y] = plus ? [a, b] : [a + b, b];
      const ansN = plus ? a + b : a;
      const story = plus ? worldPick(r, c, {
        pokemon: [
          `{mon/이/가} 오랭열매를 ${x}/${d}개 먹고, {mon2/이/가} ${y}/${d}개 먹었어요. 둘이 먹은 열매는 모두 얼마일까요?`,
          `{me/이/가} 아침에 ${x}/${d}시간, 저녁에 ${y}/${d}시간 {mon/과/와} 놀았어요. 모두 몇 시간 놀았을까요?`,
          `{mon}의 경험치가 ${x}/${d} 차 있었는데 배틀에서 ${y}/${d}만큼 더 찼어요. 지금 경험치는 얼마일까요?`,
        ],
        toystory: [
          `포키와 카렌 베벌리의 결혼식! {mon/이/가} 케이크를 ${x}/${d}판, {mon2/이/가} ${y}/${d}판 먹었어요. 둘이 먹은 케이크는 모두 얼마일까요?`,
          `보니가 아침에 ${x}/${d}시간, 저녁에 ${y}/${d}시간 {mon/과/와} 놀았어요. 모두 몇 시간 놀았을까요?`,
        ],
        minions: [
          `{mon/이/가} 바나나를 ${x}/${d}개, {mon2/이/가} ${y}/${d}개 먹었어요. 둘이 먹은 바나나는 모두 얼마일까요?`,
          `맥스 감독이 아침에 ${x}/${d}시간, 저녁에 ${y}/${d}시간 미니언 영화를 찍었어요. 모두 몇 시간 찍었을까요?`,
        ],
        moana: [
          `{mon/이/가} 코코넛을 ${x}/${d}개, 헤이헤이가 ${y}/${d}개 먹었어요. 둘이 먹은 코코넛은 모두 얼마일까요?`,
          `모아나가 낮에 ${x}/${d}, 밤에 ${y}/${d}만큼 바다를 건넜어요. 모두 얼마나 건넜을까요?`,
        ],
      }) : worldPick(r, c, {
        pokemon: [
          `{mon}의 HP가 ${x}/${d} 남아 있었는데 배틀에서 ${y}/${d}만큼 줄었어요. 남은 HP는 얼마일까요?`,
          `{me/이/가} 포켓몬 푸드 ${x}/${d}통을 가지고 있었는데 {mon}에게 ${y}/${d}통을 줬어요. 남은 푸드는 얼마일까요?`,
        ],
        toystory: [
          `릴리패드의 배터리가 ${x}/${d} 남아 있었는데 보니가 픽 더 풉 게임에 ${y}/${d}를 썼어요. 남은 배터리는 얼마일까요?`,
          `블레이즈가 지미 딘의 사료 ${x}/${d}통을 가지고 있었는데 ${y}/${d}통을 줬어요. 남은 사료는 얼마일까요?`,
        ],
        minions: [
          `도르트의 블루베리 머핀이 ${x}/${d}개 남아 있었는데 고양이 플로이드가 ${y}/${d}개를 먹어 버렸어요. 남은 머핀은 얼마일까요?`,
          `{mon}에게 바나나 ${x}/${d}개가 있었는데 {mon2}에게 ${y}/${d}개를 줬어요. 남은 바나나는 얼마일까요?`,
        ],
        moana: [
          `마우이의 낚싯바늘 힘이 ${x}/${d} 남아 있었는데 테 카와 싸우다 ${y}/${d}만큼 썼어요. 남은 힘은 얼마일까요?`,
          `모아나의 물통에 물이 ${x}/${d} 남았는데 ${y}/${d}를 마셨어요. 남은 물은 얼마일까요?`,
        ],
      });
      // 답은 약분하지 않는다 — 이 단계는 "분모 그대로, 분자만"을 보는 자리다 (약분은 다음 개념)
      const op = plus ? '+' : '−';
      return ask(this.id, 'calc', fill(story, c), choices(r, `${ansN}/${d}`, [
        plus ? { text: `${ansN}/${d + d}`, tag: '분모끼리도 더함' } : { text: `${x + y}/${d}`, tag: '빼지 않고 더함' },
        { text: `${x}/${d}`, tag: '한쪽만 씀' },
        { text: `${x * y}/${d * d}`, tag: '곱셈으로 풂' },
        { text: `${ansN}/${d * 2}`, tag: '분모를 두 배로' },
      ]), { expr: `${x}/${d} ${op} ${y}/${d}`, hint: '연습장에 풀고 답을 골라요', figure: plus ? barSvg(d, x, { n2: y }) : barSvg(d, x), solve: solve([
        `① 분모가 같아요(${d}) → 조각 크기가 같아서 개수만 세면 돼요`,
        `② 분자만 ${plus ? '더해요' : '빼요'}: ${x} ${op} ${y} = ${ansN}`,
        `③ 분모는 그대로 → 답: ${ansN}/${d}`,
      ], {
        why: {
          '분모끼리도 더함': `분모를 더하면 조각이 ${d}칸에서 ${d + d}칸으로 바뀌어요. 조각 크기가 달라지면 안 돼요 — 분모는 ${d} 그대로.`,
          '빼지 않고 더함': `"남은"을 물었으니 빼야 해요. ${x} − ${y} = ${ansN}.`,
          '한쪽만 씀': `한쪽 수만 썼어요. 두 분자를 ${plus ? '더해야' : '빼야'} 해요: ${x} ${op} ${y} = ${ansN}.`,
          '곱셈으로 풂': `곱셈이 아니라 ${plus ? '덧셈' : '뺄셈'}이에요. 조각 개수를 ${plus ? '합치는' : '덜어내는'} 거예요.`,
          '분모를 두 배로': `분모는 한 판을 몇 조각으로 나눴나예요. ${plus ? '더해도' : '빼도'} 한 판은 ${d}조각 그대로예요.`,
          '계산 실수': `${x} ${op} ${y}${numJosa(y, '을', '를')} 다시 해 봐요: ${ansN}. 분모는 ${d} 그대로.`,
        },
        figure: plus ? barSvg(d, x, { n2: y }) : barSvg(d, ansN), compare: true, rule: '같은 분모면 분자만 더하거나 뺀다. 분모는 그대로.',
      }) });
    },
    misread(r, c) {
      const d = pick(r, [5, 7, 9]);
      const a = int(r, 1, 3);
      const b = int(r, 1, 3);
      return ask(this.id, 'misread', fill(`{mon/이/가} ${a}/${d} + ${b}/${d} = ${a + b}/${d + d} 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, '분모끼리도 더했어요', [
        { text: '분자를 안 더했어요', tag: '오개념을 못 짚음' },
        { text: '약분을 안 했어요', tag: '오개념을 못 짚음' },
        { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
      ]), { solve: solve([
        `① 분모가 같아요(${d}) → 조각 크기가 같아요`,
        `② 분자만 더해요: ${a} + ${b} = ${a + b} → ${a + b}/${d}`,
      ], {
        whyAny: fill(`{mon/이/가} 분모끼리 더해서 조각이 ${d}칸에서 ${d + d}칸이 됐어요. 분모는 그대로 ${d}여야 해요.`, c),
        figure: barSvg(d, a, { n2: b }), rule: '같은 분모면 분자만 더하거나 뺀다. 분모는 그대로.',
      }) });
    },
    why: [
      { q: '같은 분모끼리 더할 때 분모는 왜 그대로 두나요?', ok: '조각의 크기가 그대로라서 — 개수만 늘어난 거예요', no: ['분모는 원래 안 더하는 규칙이라서', '더하면 숫자가 너무 커져서', '분자가 더 중요해서'] },
      { q: '나무열매 1/8 + 3/8 을 말로 하면?', ok: '8조각 중 1개에 3개를 더해 4개', no: ['8조각에 8조각을 더한 것', '1개와 3개를 곱한 것', '8조각 중 4개를 나눈 것'] },
    ],
  },

  {
    id: 'frac.mixed', grade: 4, name: '대분수와 가분수', needs: ['frac.same'],
    idea: '가분수는 **한 판이거나 한 판을 넘은 조각 수**예요. 한 판이 몇 조각인지 세어서 덜어내면 대분수가 돼요.',
    calc(r, c) {
      const d = pick(r, [3, 4, 5, 6, 8]);
      const w = int(r, 2, 4); // 1이면 "분모에도 곱함"이 정답과 같아져 오개념이 안 보인다
      const n = coprime(r, d);
      const imp = w * d + n;
      const toMixed = c.want ? /대분수/.test(c.want) : r() < 0.5; // 🔁 쌍둥이면 같은 방향(대분수로/가분수로)
      if (toMixed) {
        const story = worldPick(r, c, {
          pokemon: [
            `{mon/이/가} 피자를 ${imp}/${d}판 먹었어요. 몇 판하고 몇 조각일까요? (대분수로)`,
            `{me/이/가} 포켓몬 푸드를 ${imp}/${d}통 모았어요. 대분수로 나타내면?`,
          ],
          toystory: [`보니가 결혼식 피자를 ${imp}/${d}판 시켰어요. 몇 판하고 몇 조각일까요? (대분수로)`],
          minions: [`미니언들이 바나나를 ${imp}/${d}개 먹었어요. 몇 개하고 몇 조각일까요? (대분수로)`],
          moana: [`모투누이의 어부들이 물고기를 ${imp}/${d}바구니 잡았어요. 한 바구니가 ${d}마리예요. 몇 바구니하고 몇 마리일까요? (대분수로)`],
        });
        return ask(this.id, 'calc', fill(story, c), choices(r, mixedText(w, n, d), [
          { text: mixedText(n, w, d), tag: '자연수와 분자를 바꿔 씀' },
          { text: mixedText(w, n, d + 1), tag: '분모를 바꿔 버림' },
          { text: mixedText(w + 1, n, d), tag: '한 판을 더 셈' },
          { text: mixedText(w - 1, n, d), tag: '한 판을 덜 셈' },
        ]), { expr: `${imp}/${d} → 대분수`, figure: barSvg(d, imp), solve: solve([
          `① 한 판은 ${d}조각 → ${imp}조각 안에 한 판이 몇 번? ${imp} ÷ ${d} = ${w}, 나머지 ${n}`,
          `② 판 수 ${w}${numJosa(w, '은', '는')} 앞에, 남은 ${n}조각은 분수로: ${w} ${n}/${d}`,
          `③ 답: ${mixedText(w, n, d)} (그림에서 꽉 찬 줄이 ${w}개, 남은 칸이 ${n}개)`,
        ], {
          why: {
            '자연수와 분자를 바꿔 씀': `앞의 큰 수는 **몇 판**(${w}), 분자는 **남은 조각**(${n})이에요. 두 자리가 바뀌었어요.`,
            '분모를 바꿔 버림': `한 판이 ${d}조각이라는 건 안 변해요. 분모 ${d}${numJosa(d, '은', '는')} 그대로.`,
            '한 판을 더 셈': `${imp}조각에 ${d}조각짜리 판은 ${w}개예요 (${w} × ${d} = ${w * d}, 남는 건 ${n}). ${w + 1}판이면 ${(w + 1) * d}조각이라 너무 많아요.`,
            '한 판을 덜 셈': `${w - 1}판이면 ${(w - 1) * d}조각이고 남은 조각이 ${n + d}개 — 아직 한 판(${d}조각)이 더 들어 있어요.`,
            '계산 실수': `${imp} ÷ ${d}${numJosa(d, '을', '를')} 다시 해 봐요: ${w} 판, 나머지 ${n}.`,
          },
          figure: barSvg(d, imp), compare: true, rule: '한 판 = 분모만큼의 조각. 판 수를 앞에, 남은 조각을 분수로.',
        }) });
      }
      const story = worldPick(r, c, {
        pokemon: [
          `{mon/이/가} 오랭열매를 ${mixedText(w, n, d)}개 먹었어요. 조각으로만 세면 몇 조각일까요? (가분수로)`,
          `{me/이/가} {mon/과/와} 피자 ${mixedText(w, n, d)}판을 먹었어요. 가분수로 나타내면?`,
        ],
        toystory: [`블레이즈가 지미 딘에게 사료 ${mixedText(w, n, d)}통을 줬어요. 조각으로만 세면 몇 조각일까요? (가분수로)`],
        minions: [`맥스 감독이 팝콘 ${mixedText(w, n, d)}통을 샀어요. 가분수로 나타내면?`],
        moana: [`모아나가 코코넛 ${mixedText(w, n, d)}개를 카누에 실었어요. 조각으로만 세면 몇 조각일까요? (가분수로)`],
      });
      // 가분수 답은 약분하지 않는다 — "몇 조각"을 세는 자리
      return ask(this.id, 'calc', fill(story, c), choices(r, `${imp}/${d}`, [
        { text: `${w + n}/${d}`, tag: '자연수를 곱하지 않고 더함' },
        { text: `${w * n}/${d}`, tag: '자연수에 분자를 곱함' },
        { text: `${imp}/${d * w}`, tag: '분모에도 곱함' },
        { text: `${w * d}/${d}`, tag: '분자를 안 더함' },
      ]), { expr: `${mixedText(w, n, d)} → 가분수`, solve: solve([
        `① 한 판은 ${d}조각 → ${w}판은 ${w} × ${d} = ${w * d}조각`,
        `② 남은 ${n}조각을 더해요: ${w * d} + ${n} = ${imp}`,
        `③ 답: ${imp}/${d}`,
      ], {
        why: {
          '자연수를 곱하지 않고 더함': `${w}${numJosa(w, '은', '는')} 조각이 아니라 **판**이에요. 판을 조각으로 바꾸려면 ${d}${numJosa(d, '을', '를')} 곱해야 해요: ${w} × ${d} = ${w * d}.`,
          '자연수에 분자를 곱함': `${w} × ${n}이 아니라 ${w} × ${d}예요 — 한 판이 ${d}조각이니까요.`,
          '분모에도 곱함': `분모는 "한 판이 몇 조각"이라 안 변해요. ${d} 그대로.`,
          '분자를 안 더함': `${w}판은 ${w * d}조각이고, 남은 ${n}조각도 더해야 해요: ${w * d} + ${n} = ${imp}.`,
          '계산 실수': `${w} × ${d} + ${n}${numJosa(n, '을', '를')} 다시 해 봐요: ${imp}.`,
        },
        figure: barSvg(d, imp), compare: true, rule: '판 수 × 한 판의 조각 수 + 남은 조각 = 조각 전부.',
      }) });
    },
    misread(r, c) {
      const d = pick(r, [4, 5, 6]);
      const w = int(r, 2, 3);
      const n = coprime(r, d);
      return ask(this.id, 'misread', fill(`{mon/이/가} ${mixedText(w, n, d)} = ${w + n}/${d} 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, `자연수 ${w}${numJosa(w, '을', '를')} 분모 ${d}${numJosa(d, '과', '와')} 곱하지 않고 그냥 더했어요`, [
        { text: '분모를 안 바꿨어요', tag: '오개념을 못 짚음' },
        { text: '약분을 안 했어요', tag: '오개념을 못 짚음' },
        { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
      ]), { solve: solve([
        `① ${w}판은 ${w} × ${d} = ${w * d}조각`,
        `② ${w * d} + ${n} = ${w * d + n} → ${w * d + n}/${d}`,
      ], {
        whyAny: fill(`${w}${numJosa(w, '은', '는')} 판 수라 조각으로 바꾸려면 ${d}${numJosa(d, '을', '를')} 곱해야 하는데, {mon/이/가} 그냥 더해서 ${w + n}/${d}${numJosa(d, '이', '가')} 됐어요.`, c),
        figure: barSvg(d, w * d + n), rule: '판 수 × 한 판의 조각 수 + 남은 조각 = 조각 전부.',
      }) });
    },
    why: [
      { q: '피자 2와 1/3판을 가분수로 바꿀 때 2 × 3 을 하는 이유는?', ok: '한 판이 3조각이니 두 판은 6조각이라서', no: ['분모와 자연수는 항상 곱하는 규칙이라서', '3이 더 큰 수라서', '분자를 크게 만들어야 해서'] },
      { q: '7/7 은 얼마인가요?', ok: '1 — 한 판을 다 채운 것', no: ['7 — 조각이 7개라서', '0 — 다 먹어서', '7/7 그대로 둬요'] },
    ],
  },

  {
    id: 'frac.equal', grade: 5, name: '크기가 같은 분수·약분', needs: ['frac.mixed'],
    idea: '조각을 **더 잘게 쪼개도 양은 그대로**예요. 위아래에 같은 수를 곱하거나 나누면 크기가 안 변해요.',
    calc(r, c) {
      const base = pick(r, [{ n: 1, d: 2 }, { n: 2, d: 3 }, { n: 3, d: 4 }, { n: 2, d: 5 }, { n: 3, d: 5 }, { n: 5, d: 6 }]);
      const k = int(r, 2, 5);
      const n = base.n * k;
      const d = base.d * k;
      const story = worldPick(r, c, {
        pokemon: [
          `{mon/이/가} 피자 ${n}/${d}판을 먹었어요. 같은 양을 가장 간단한 분수로 나타내면?`,
          `포켓몬 센터에서 {mon}의 HP가 ${n}/${d}만큼 회복됐어요. 약분하면 얼마일까요?`,
          `{me/이/가} 몬스터볼 ${d}개 중 ${n}개를 던졌어요. 던진 볼은 전체의 얼마인지 약분해서 나타내면?`,
        ],
        toystory: [
          `보니의 장난감 ${d}개 중 ${n}개가 차고로 갔어요. 차고로 간 장난감은 전체의 얼마인지 약분해서 나타내면?`,
          `릴리패드가 ${n}/${d}만큼 충전됐어요. 약분하면 얼마일까요?`,
        ],
        minions: [
          `미니언 ${d}마리 중 ${n}마리가 딕을 따라 도르트에게 갔어요. 따라간 미니언은 전체의 얼마인지 약분해서 나타내면?`,
          `제임스가 영화 필름을 ${n}/${d}만큼 찍었어요. 약분하면 얼마일까요?`,
        ],
        moana: [
          `타마토아의 반짝이는 보물 ${d}개 중 ${n}개가 진짜 금이에요. 진짜 금은 전체의 얼마인지 약분해서 나타내면?`,
          `모아나가 테 피티까지 가는 길의 ${n}/${d}만큼 왔어요. 약분하면 얼마일까요?`,
        ],
      });
      // 문제의 분수와 오답은 약분하지 않고 그대로 (약분을 묻는 문제에서 오답을 약분해 주면 안 된다)
      const kJ = numJosa(k, '으로', '로');
      return ask(this.id, 'calc', fill(story, c), choices(r, fracText(base.n, base.d), [
        { text: `${base.n}/${d}`, tag: '분자만 나눔' },
        { text: `${n}/${base.d}`, tag: '분모만 나눔' },
        { text: `${n - 1}/${d - 1}`, tag: '나누지 않고 뺌' },
        { text: `${base.n + 1}/${base.d + 1}`, tag: '계산 실수' },
      ]), { expr: `${n}/${d} → 약분`, solve: solve([
        `① ${n}${numJosa(n, '과', '와')} ${d}${numJosa(d, '을', '를')} **둘 다** 나눌 수 있는 수를 찾아요: ${k}`,
        `② 위아래를 똑같이 ${k}${kJ} 나눠요: ${n} ÷ ${k} = ${base.n}, ${d} ÷ ${k} = ${base.d}`,
        `③ 답: ${base.n}/${base.d} — 조각을 크게 합쳤을 뿐, 양은 그대로예요`,
      ], {
        why: {
          '분자만 나눔': `위만 나누면 양이 줄어들어요 — ${base.n}/${d}${numJosa(d, '은', '는')} ${n}/${d}보다 작아요. 위아래를 **똑같이** ${k}${kJ} 나눠야 양이 그대로예요.`,
          '분모만 나눔': `아래만 나누면 조각이 커져서 양이 늘어나요. 위아래를 똑같이 ${k}${kJ} 나눠요.`,
          '나누지 않고 뺌': `약분은 빼기가 아니라 **나누기**예요. ${n} − 1, ${d} − 1을 하면 양이 달라져요.`,
          '계산 실수': `${n} ÷ ${k}, ${d} ÷ ${k}${numJosa(k, '을', '를')} 다시 해 봐요: ${base.n}, ${base.d}.`,
        },
        figure: barsSvg([{ n, d }, { n: base.n, d: base.d }]), compare: true, rule: '위아래를 같은 수로 나누면 양은 그대로.',
      }) });
    },
    misread(r, c) {
      const k = int(r, 2, 4);
      const n = 2 * k;
      const d = 3 * k;
      return ask(this.id, 'misread', fill(`{mon/이/가} ${n}/${d} 를 약분해서 2/${d} 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, '분자만 나누고 분모는 그대로 뒀어요', [
        { text: '분모만 나눴어요', tag: '오개념을 못 짚음' },
        { text: '더 나눌 수 있는데 멈췄어요', tag: '오개념을 못 짚음' },
        { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
      ]), { solve: solve([
        `① ${n}${numJosa(n, '과', '와')} ${d}${numJosa(d, '을', '를')} 둘 다 ${k}${numJosa(k, '으로', '로')} 나눌 수 있어요`,
        `② ${n} ÷ ${k} = 2, ${d} ÷ ${k} = 3 → 2/3`,
      ], {
        whyAny: fill(`{mon/이/가} 분자만 ${k}${numJosa(k, '으로', '로')} 나누고 분모 ${d}${numJosa(d, '은', '는')} 그대로 뒀어요. 그러면 양이 줄어요 — 위아래를 똑같이 나눠야 해요.`, c),
        figure: barsSvg([{ n, d }, { n: 2, d: 3 }]), rule: '위아래를 같은 수로 나누면 양은 그대로.',
      }) });
    },
    why: [
      { q: '약분할 때 위아래를 **같은 수로** 나누는 이유는?', ok: '조각 수와 나눈 수가 같은 비율로 줄어야 양이 그대로라서', no: ['분수는 항상 작게 만들어야 해서', '분모가 작으면 계산이 쉬워서', '규칙이 그렇게 정해져 있어서'] },
      { q: '피자 4/6 과 2/3 은 왜 같은 양인가요?', ok: '4/6의 조각 두 개를 하나로 합치면 2/3가 되니까', no: ['숫자가 비슷해서', '둘 다 1보다 작아서', '4 − 2 = 2, 6 − 3 = 3이라서'] },
    ],
  },

  {
    id: 'frac.common', grade: 5, name: '통분', needs: ['frac.equal'],
    idea: '분모가 다르면 **조각의 크기가 달라서** 바로 셀 수 없어요. 먼저 같은 크기로 맞추는 것이 통분이에요.',
    calc(r, c) {
      const [a, b] = pick(r, [[2, 3], [3, 4], [4, 6], [6, 8], [2, 5], [3, 5]]);
      const L = lcm(a, b);
      const story = worldPick(r, c, {
        pokemon: [
          `{mon/이/가} 나무열매 1/${a}개, {mon2/이/가} 1/${b}개를 먹었어요. 누가 더 먹었는지 비교하려면 분모를 **가장 작은** 얼마로 맞춰야 할까요?`,
          `{me/이/가} 피자 1/${a}판, {mon/이/가} 1/${b}판을 먹었어요. 둘을 더하려면 먼저 분모를 **가장 작은** 얼마로 통분해야 할까요?`,
        ],
        toystory: [`제시는 1/${a}시간, 버즈는 1/${b}시간 보니와 놀았어요. 누가 더 오래 놀았는지 비교하려면 분모를 **가장 작은** 얼마로 맞춰야 할까요?`],
        minions: [`{mon/이/가} 바나나 1/${a}개, {mon2/이/가} 1/${b}개를 먹었어요. 누가 더 먹었는지 비교하려면 분모를 **가장 작은** 얼마로 맞춰야 할까요?`],
        moana: [`모아나는 하루의 1/${a}, 마우이는 1/${b}만큼 노를 저었어요. 누가 더 저었는지 비교하려면 분모를 **가장 작은** 얼마로 맞춰야 할까요?`],
      });
      const mul = (x) => { const out = []; for (let i = 1; x * i <= L || out.length < 4; i++) out.push(x * i); return out.join(', '); }; // L까지는 꼭 보이게 (Codex #5)
      const big = Math.max(a, b); const small = Math.min(a, b);
      return ask(this.id, 'calc', fill(story, c), choices(r, String(L), [
        { text: String(a + b), tag: '분모끼리 더함' },
        { text: String(a * b), tag: '최소공배수가 아닌 곱' },
        { text: String(L * 2), tag: '최소가 아닌 공배수' },
        { text: String(Math.max(a, b)), tag: '큰 분모를 그냥 씀' },
      ]), { expr: `1/${a} 과 1/${b} → 가장 작은 공통 분모는?`, figure: barsSvg([{ n: 1, d: a }, { n: 1, d: b }]), solve: solve([
        `① ${a}의 배수: ${mul(a)}…  ${b}의 배수: ${mul(b)}…`,
        `② 둘 다에 있는 **가장 작은** 수: ${L}`,
        `③ 답: ${L} → 1/${a} = ${L / a}/${L}, 1/${b} = ${L / b}/${L} (이제 조각 크기가 같아요)`,
      ], {
        why: {
          '분모끼리 더함': `${a} + ${b} = ${a + b}${numJosa(a + b, '은', '는')} ${a}${numJosa(a, '과', '와')} ${b} 둘 다의 배수가 아니에요. 공통 분모는 **둘 다로 나누어떨어지는 수**여야 해요.`,
          '최소공배수가 아닌 곱': `${a * b}도 공통 분모는 되지만 **가장 작은** 건 ${L}이에요. 큰 수로 통분하면 계산만 커져요.`,
          '최소가 아닌 공배수': `${L * 2}도 되지만 문제는 **가장 작은** 공통 분모를 물었어요 — ${L}.`,
          '큰 분모를 그냥 씀': `${big}${numJosa(big, '은', '는')} ${small}${numJosa(small, '으로', '로')} 나누어떨어지지 않아요. 둘 다의 배수여야 해요.`,
          '계산 실수': `${a}의 배수와 ${b}의 배수를 다시 써 봐요. 처음으로 겹치는 수가 ${L}.`,
        },
        figure: barsSvg([{ n: L / a, d: L }, { n: L / b, d: L }]), rule: '공통 분모는 두 분모의 공배수. 그중 가장 작은 게 최소공배수.',
      }) });
    },
    misread(r, c) {
      const d = pick(r, [6, 8, 10]);
      const half = d / 2;
      return ask(this.id, 'misread', fill(`{mon/이/가} 1/2 를 분모 ${d}${numJosa(d, '으로', '로')} 통분해서 1/${d} 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, `분모에 곱한 만큼 분자에도 곱해야 해요 (${half}/${d})`, [
        { text: '분모를 잘못 골랐어요', tag: '오개념을 못 짚음' },
        { text: '약분을 먼저 해야 해요', tag: '오개념을 못 짚음' },
        { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
      ]), { solve: solve([
        `① 분모 2를 ${d}${numJosa(d, '으로', '로')} 만들려면 ${half}${numJosa(half, '을', '를')} 곱한 거예요`,
        `② 분자에도 똑같이 ${half}${numJosa(half, '을', '를')} 곱해요: 1 × ${half} = ${half} → ${half}/${d}`,
      ], {
        whyAny: fill(`{mon/이/가} 분모에만 ${half}${numJosa(half, '을', '를')} 곱하고 분자는 그대로 둬서 양이 줄었어요. 1/${d}${numJosa(d, '은', '는')} 1/2보다 훨씬 작아요.`, c),
        figure: barsSvg([{ n: 1, d: 2 }, { n: half, d }]), rule: '통분: 분모에 곱한 만큼 분자에도 곱한다.',
      }) });
    },
    why: [
      { q: '통분은 왜 하나요?', ok: '조각의 크기를 같게 만들어 셀 수 있게 하려고', no: ['숫자를 크게 만들려고', '분모를 없애려고', '약분을 쉽게 하려고'] },
      { q: '통분해도 분수의 크기가 안 변하는 이유는?', ok: '위아래에 같은 수를 곱했으니까', no: ['분모만 바꿨으니까', '분자는 그대로니까', '큰 수로 바꿨으니까'] },
    ],
  },

  {
    id: 'frac.add', grade: 5, name: '분모가 다른 분수의 덧셈·뺄셈', needs: ['frac.common'],
    idea: '통분해서 **조각 크기를 맞춘 뒤** 분자만 더하고 빼요. 마지막에 약분해요.',
    calc(r, c) {
      const [d1, d2] = pick(r, [[2, 3], [3, 4], [4, 6], [2, 5], [3, 5], [4, 5], [6, 8]]);
      const n1 = coprime(r, d1);
      const n2 = coprime(r, d2);
      const L = lcm(d1, d2);
      const sum = n1 * (L / d1) + n2 * (L / d2);
      const story = worldPick(r, c, {
        pokemon: [
          `{mon/이/가} 오랭열매 ${n1}/${d1}개를 먹고 {mon2/이/가} ${n2}/${d2}개를 먹었어요. 둘이 먹은 열매는 모두 얼마일까요?`,
          `{me/이/가} 아침에 ${n1}/${d1}시간, 저녁에 ${n2}/${d2}시간 {mon/과/와} 산책했어요. 모두 몇 시간일까요?`,
          `{mon/이/가} 피자 ${n1}/${d1}판, {me/이/가} ${n2}/${d2}판을 먹었어요. 둘이 먹은 피자는 모두?`,
        ],
        toystory: [
          `보니가 아침에 ${n1}/${d1}시간, 저녁에 ${n2}/${d2}시간 {mon/과/와} 놀았어요. 모두 몇 시간일까요?`,
          `블레이즈의 농장에서 대포딜이 당근 ${n1}/${d1}개, 지미 딘이 ${n2}/${d2}개를 먹었어요. 둘이 먹은 당근은 모두?`,
        ],
        minions: [
          `{mon/이/가} 바나나 ${n1}/${d1}개, {mon2/이/가} ${n2}/${d2}개를 먹었어요. 둘이 먹은 바나나는 모두 얼마일까요?`,
          `맥스 감독이 아침에 ${n1}/${d1}시간, 저녁에 ${n2}/${d2}시간 영화를 찍었어요. 모두 몇 시간일까요?`,
        ],
        moana: [
          `모아나가 낮에 ${n1}/${d1}, 밤에 ${n2}/${d2}만큼 바다를 건넜어요. 모두 얼마나 건넜을까요?`,
          `푸아가 코코넛 ${n1}/${d1}개, 헤이헤이가 ${n2}/${d2}개를 먹었어요. 둘이 먹은 코코넛은 모두?`,
        ],
      });
      const m1 = n1 * (L / d1); const m2 = n2 * (L / d2);
      const LJ = numJosa(L, '으로', '로');
      return ask(this.id, 'calc', fill(story, c), choices(r, fr(sum, L), [
        { text: fr(n1 + n2, d1 + d2), tag: '분모끼리 더함' },   // ★ 가장 흔한 오개념
        { text: fr(n1 + n2, L), tag: '통분 없이 분자만 더함' },
        { text: fr(n1 * n2, L), tag: '분자를 곱함' },
        { text: fr(n1 * (L / d1) + n2, L), tag: '한쪽만 통분함' },
      ]), { expr: `${n1}/${d1} + ${n2}/${d2}`, hint: '연습장에 통분부터 해 보세요', solve: solve([
        `① 분모가 달라요(${d1}, ${d2}) → 조각 크기가 달라서 바로 못 더해요`,
        `② 통분: 분모를 ${L}${LJ}. ${n1}/${d1} = ${m1}/${L}, ${n2}/${d2} = ${m2}/${L}`,
        `③ 분자만 더해요: ${m1} + ${m2} = ${sum} → ${sum}/${L}${fr(sum, L) !== `${sum}/${L}` ? ` = ${fr(sum, L)} (약분)` : ''}`,
      ], {
        why: {
          '분모끼리 더함': `조각 크기가 다른데 그냥 더했어요. ${d1}칸짜리와 ${d2}칸짜리는 크기가 달라서 먼저 ${L}칸으로 맞춰야 해요.`,
          '통분 없이 분자만 더함': `분모를 ${L}${LJ} 바꿨으면 분자도 같이 바꿔야 해요: ${n1} → ${m1}, ${n2} → ${m2}.`,
          '분자를 곱함': `더하기 문제예요. 곱하면 안 돼요. 통분한 뒤 분자를 **더해요**: ${m1} + ${m2}.`,
          '한쪽만 통분함': `한쪽만 ${L}칸으로 바꾸고 다른 쪽은 그대로 뒀어요. 둘 다 바꿔야 해요: ${m1}/${L}${numJosa(L, '과', '와')} ${m2}/${L}.`,
          '계산 실수': `분모는 ${L} 그대로 두고 분자만 ${m1} + ${m2} = ${sum}. 위아래를 다시 확인해 봐요.`,
        },
        figure: barsSvg([{ n: m1, d: L }, { n: m2, d: L }]), compare: true, rule: '분모가 다르면 통분 먼저, 그다음 분자만 더한다.',
      }) });
    },
    misread(r, c) {
      const [d1, d2] = pick(r, [[2, 3], [3, 4], [2, 5]]);
      const L = lcm(d1, d2);
      return ask(this.id, 'misread', fill(`{mon/이/가} 1/${d1} + 1/${d2} = 2/${d1 + d2} 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, '분모끼리 더했어요 — 조각 크기를 먼저 맞춰야 해요', [
        { text: '분자를 안 더했어요', tag: '오개념을 못 짚음' },
        { text: '약분을 안 했어요', tag: '오개념을 못 짚음' },
        { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
      ]), { solve: solve([
        `① 통분: 분모 ${L} → ${L / d1}/${L} + ${L / d2}/${L}`,
        `② 분자만 더해요: ${L / d1} + ${L / d2} = ${L / d1 + L / d2} → ${L / d1 + L / d2}/${L}`,
      ], {
        whyAny: fill(`조각 크기가 다른데 {mon/이/가} 분모끼리 더했어요. 2/${d1 + d2}${numJosa(d1 + d2, '은', '는')} 1/${d1}보다도 작아요 — 더했는데 작아지면 이상하죠? 먼저 ${L}칸으로 맞춰야 해요.`, c),
        figure: barsSvg([{ n: L / d1, d: L }, { n: L / d2, d: L }]), rule: '분모가 다르면 통분 먼저, 그다음 분자만 더한다.',
      }) });
    },
    why: [
      { q: '1/2 + 1/3 이 2/5 가 **아닌** 이유를 가장 잘 말한 것은?', ok: '반쪽에 1/3을 더하면 반보다 커야 하는데 2/5는 반보다 작아서', no: ['분모를 곱해야 하니까', '분자를 곱해야 하니까', '대분수로 바꿔야 하니까'] },
      { q: '분모가 다른 분수를 바로 더할 수 없는 이유는?', ok: '조각의 크기가 서로 달라서', no: ['숫자가 커서', '분자가 달라서', '약분이 안 돼서'] },
    ],
  },

  {
    id: 'frac.mulnat', grade: 5, name: '분수 × 자연수', needs: ['frac.add'],
    idea: '2/3 × 4 는 **2/3을 네 번 더한 것**이에요. 조각의 크기(분모)는 그대로, 개수(분자)만 늘어나요.',
    calc(r, c) {
      const d = pick(r, [3, 4, 5, 6, 8]);
      const n = coprime(r, d);
      const k = int(r, 2, 6);
      const story = worldPick(r, c, {
        pokemon: [
          `{mon/이/가} 하루에 나무열매를 ${n}/${d}개 먹어요. ${k}일 동안 먹는 열매는 모두 얼마일까요?`,
          `{mon}의 기술 한 번이 상대 HP를 ${n}/${d}만큼 깎아요. ${k}번 쓰면 모두 얼마나 깎을까요?`,
          `{me/이/가} 포켓몬 푸드를 한 마리에 ${n}/${d}통씩 줘요. ${k}마리에게 주면 모두 몇 통일까요?`,
        ],
        toystory: [
          `릴리패드는 하루에 배터리를 ${n}/${d}만큼 써요. ${k}일 동안 쓰는 배터리는 모두 얼마일까요?`,
          `지미 딘은 하루에 사료를 ${n}/${d}통 먹어요. ${k}일 동안 먹는 사료는 모두 얼마일까요?`,
        ],
        minions: [
          `미니언 한 마리는 하루에 바나나를 ${n}/${d}개 먹어요. ${k}마리가 먹으면 모두 얼마일까요?`,
          `괴물 하워드는 한 걸음에 마을의 ${n}/${d}을 부숴요. ${k}걸음이면 모두 얼마나 부술까요?`,
        ],
        moana: [
          `카누 한 척은 하루에 바다를 ${n}/${d}만큼 건너요. ${k}일이면 모두 얼마나 건널까요?`,
          `헤이헤이는 하루에 코코넛을 ${n}/${d}개 먹어요. ${k}일 동안 먹는 코코넛은 모두 얼마일까요?`,
        ],
      });
      const ans = fr(n * k, d);
      return ask(this.id, 'calc', fill(story, c), choices(r, ans, [
        { text: `${n * k}/${d * k}`, tag: '분모에도 곱함' },       // ★ 가장 흔한 오개념 — 약분하면 원래 수라 그대로 보여 준다
        { text: fr(n, d * k), tag: '분모에만 곱함' },
        { text: fr(n + k, d), tag: '곱하지 않고 더함' },
        { text: fr(n * k, d + k), tag: '분모에 더함' },
      ]), { expr: `${n}/${d} × ${k}`, solve: solve([
        `① ${n}/${d} × ${k}${numJosa(k, '은', '는')} ${n}/${d}${numJosa(n, '을', '를')} ${k}번 더한 거예요`,
        `② 조각 크기(분모 ${d})는 그대로, 개수(분자)만 ${k}배: ${n} × ${k} = ${n * k}`,
        `③ 답: ${n * k}/${d}${ans !== `${n * k}/${d}` ? ` = ${ans} (약분)` : ''}`,
      ], {
        why: {
          '분모에도 곱함': `분모에도 곱하면 ${n * k}/${d * k}인데, 약분하면 다시 ${n}/${d}예요 — 하나도 안 늘어난 거예요. 조각 크기는 그대로, 개수만 늘어요.`,
          '분모에만 곱함': `분모에 곱하면 조각이 더 잘게 쪼개져서 오히려 **작아져요**. 곱해야 할 건 분자예요.`,
          '곱하지 않고 더함': `분자에 ${k}${numJosa(k, '을', '를')} 더하면 조각이 ${k}개 늘어날 뿐이에요. 필요한 건 ${n}조각짜리 ${k}묶음이니까 **곱해요**: ${n} × ${k} = ${n * k}.`,
          '분모에 더함': `분모는 조각 크기라 건드리지 않아요. 분자에 ${k}${numJosa(k, '을', '를')} 곱해요: ${n} × ${k} = ${n * k}.`,
          '계산 실수': `분모 ${d}${numJosa(d, '은', '는')} 그대로, 분자만 ${n} × ${k} = ${n * k}. 위아래를 다시 확인해 봐요.`,
        },
        figure: n * k <= d * 4 ? barSvg(d, n * k) : '', compare: true, rule: '분수 × 자연수: 분자에만 곱한다.',
      }) });
    },
    misread(r, c) {
      const d = pick(r, [3, 5, 7]);
      const k = int(r, 2, 4);
      return ask(this.id, 'misread', fill(`{mon/이/가} 2/${d} × ${k} = ${2 * k}/${d * k} 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, '분모에도 곱했어요 — 조각 크기는 안 변해요', [
        { text: '분자에 안 곱했어요', tag: '오개념을 못 짚음' },
        { text: '더해야 하는데 곱했어요', tag: '오개념을 못 짚음' },
        { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
      ]), { solve: solve([
        `① 2/${d} × ${k}${numJosa(k, '은', '는')} 2/${d}${numJosa(2, '을', '를')} ${k}번 더한 것`,
        `② 분자만 ${k}배: 2 × ${k} = ${2 * k} → ${2 * k}/${d}`,
      ], {
        whyAny: fill(`{mon/이/가} 분모에도 ${k}${numJosa(k, '을', '를')} 곱했어요. ${2 * k}/${d * k}${numJosa(d * k, '은', '는')} 약분하면 다시 2/${d} — 하나도 안 늘어난 거예요.`, c),
        figure: barSvg(d, 2 * k), rule: '분수 × 자연수: 분자에만 곱한다.',
      }) });
    },
    why: [
      { q: '2/3 × 4 에서 분모 3이 그대로인 이유는?', ok: '조각의 크기는 안 변하고 개수만 네 배가 되니까', no: ['3이 4보다 작아서', '분모는 곱하지 않는 규칙이라서', '약분할 거라서'] },
      { q: '나무열매 1/5 × 5 는 왜 1인가요?', ok: '1/5짜리 조각 다섯 개면 한 개가 되니까', no: ['5를 두 번 썼으니까', '분모와 분자가 같아지니까 0', '5 × 5 = 25라서'] },
    ],
  },

  {
    id: 'frac.mul', grade: 5, name: '분수 × 분수', needs: ['frac.mulnat'],
    idea: '1/2 × 1/3 은 **반의 1/3**이에요. 조각을 또 나누는 거라 분모끼리, 분자끼리 곱해요. 통분은 안 해도 돼요 (해도 답은 같지만 손만 더 가요).',
    calc(r, c) {
      const d1 = pick(r, [2, 3, 4, 5]);
      const d2 = pick(r, [3, 4, 5, 6]);
      const n1 = coprime(r, d1);
      const n2 = coprime(r, d2);
      const L = lcm(d1, d2);
      const story = worldPick(r, c, {
        pokemon: [
          `{mon/이/가} 피자 ${n1}/${d1}판을 가지고 있어요. 그중 ${n2}/${d2}${numJosa(n2, '을', '를')} {mon2}에게 줬어요. {mon2/이/가} 받은 피자는 한 판의 얼마일까요?`,
          `{me}의 밭 ${n1}/${d1}에 나무열매를 심었고, 그중 ${n2}/${d2}에서 열매가 열렸어요. 열매가 열린 곳은 밭 전체의 얼마일까요?`,
          `{mon}의 HP가 ${n1}/${d1} 남았는데, 그중 ${n2}/${d2}${numJosa(n2, '을', '를')} 상대 기술에 잃었어요. 잃은 HP는 전체의 얼마일까요?`,
        ],
        toystory: [
          `보니의 장난감 상자 ${n1}/${d1}이 인형이고, 그중 ${n2}/${d2}가 카우걸 인형이에요. 카우걸 인형은 상자 전체의 얼마일까요?`,
          `보니가 케이크 ${n1}/${d1}판을 가지고 있어요. 그중 ${n2}/${d2}${numJosa(n2, '을', '를')} {mon}에게 줬어요. {mon/이/가} 받은 케이크는 한 판의 얼마일까요?`,
        ],
        minions: [
          `제임스의 영화 ${n1}/${d1}이 괴물 장면이고, 그중 ${n2}/${d2}에 아이린이 나와요. 아이린이 나오는 장면은 영화 전체의 얼마일까요?`,
          `{mon/이/가} 바나나 ${n1}/${d1}개를 가지고 있어요. 그중 ${n2}/${d2}${numJosa(n2, '을', '를')} {mon2}에게 줬어요. {mon2/이/가} 받은 바나나는 한 개의 얼마일까요?`,
        ],
        moana: [
          `모투누이 섬의 ${n1}/${d1}이 코코넛 밭이고, 그중 ${n2}/${d2}가 병들었어요. 병든 밭은 섬 전체의 얼마일까요?`,
          `모아나가 코코넛 ${n1}/${d1}개를 가지고 있어요. 그중 ${n2}/${d2}${numJosa(n2, '을', '를')} 마우이에게 줬어요. 마우이가 받은 코코넛은 한 개의 얼마일까요?`,
        ],
      });
      const ans = fr(n1 * n2, d1 * d2);
      return ask(this.id, 'calc', fill(story, c), choices(r, ans, [
        { text: fr(n1 * (L / d1) * n2 * (L / d2), L), tag: '통분한 뒤 분모를 한 번만 씀' },
        { text: fr(n1 * n2, d1 + d2), tag: '분모끼리 더함' },
        { text: fr(n1 + n2, d1 + d2), tag: '전부 더함' },
        { text: fr(n1 * n2, L), tag: '분모를 최소공배수로' },
      ]), { expr: `${n1}/${d1} × ${n2}/${d2}`, solve: solve([
        `① "${n1}/${d1}의 ${n2}/${d2}"는 조각을 **또 나누는** 거예요 → 곱셈`,
        `② 위끼리 곱하고, 아래끼리 곱해요: ${n1} × ${n2} = ${n1 * n2}, ${d1} × ${d2} = ${d1 * d2}`,
        `③ 답: ${n1 * n2}/${d1 * d2}${ans !== `${n1 * n2}/${d1 * d2}` ? ` = ${ans} (약분)` : ''}`,
      ], {
        why: {
          '통분한 뒤 분모를 한 번만 씀': `통분은 해도 괜찮지만, 곱셈이면 분모도 곱해야 해요(${L} × ${L}). 분모를 한 번만 쓰면 답이 커져요.`,
          '분모끼리 더함': `곱셈에서는 분모끼리 **곱해요**: ${d1} × ${d2} = ${d1 * d2}.`,
          '전부 더함': `곱셈 문제예요. "…의 ${n2}/${d2}"는 곱하기예요. 더하면 오히려 커져요.`,
          '분모를 최소공배수로': `곱셈은 통분이 필요 없어요. 분모끼리 그냥 곱해요: ${d1} × ${d2} = ${d1 * d2}.`,
          '계산 실수': `${n1} × ${n2}, ${d1} × ${d2}${numJosa(d2, '을', '를')} 다시 해 봐요: ${n1 * n2}, ${d1 * d2}.`,
        },
        compare: true, rule: '분수 × 분수: 위끼리, 아래끼리 곱한다. 통분 필요 없음.',
      }) });
    },
    misread(r, c) {
      // 통분 자체는 틀린 게 아니다 (해도 답은 같다). 틀린 건 통분한 뒤 **분모를 한 번만 쓰는 것** — 그 계산을 보여 준다
      const d1 = pick(r, [2, 3]);
      const d2 = pick(r, [4, 5]);
      const L = lcm(d1, d2);
      const a = L / d1; const b = L / d2; // 1/d1 = a/L, 1/d2 = b/L
      return ask(this.id, 'misread', fill(`{mon/이/가} 1/${d1} × 1/${d2} 를 풀려고 분모 ${L}${numJosa(L, '으로', '로')} 통분해서 ${a}/${L} × ${b}/${L} 로 만든 뒤, 분자만 곱해서 ${a * b}/${L} 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, `분모끼리도 곱해야 해요 — ${L} × ${L}로. (통분은 안 해도 되지만 틀린 건 아니에요)`, [
        { text: '통분한 분모가 틀렸어요', tag: '오개념을 못 짚음' },
        { text: '분자를 곱하면 안 돼요', tag: '오개념을 못 짚음' },
        { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
      ]), { solve: solve([
        `① 통분한 채로 곱해도 돼요: 위끼리 ${a} × ${b} = ${a * b}, 아래끼리 ${L} × ${L} = ${L * L}`,
        `② ${a * b}/${L * L} = 1/${d1 * d2} — 통분 안 하고 1/${d1} × 1/${d2} = 1/${d1 * d2} 해도 같아요`,
      ], {
        whyAny: fill(`통분까지는 괜찮아요. 하지만 곱셈이면 분모도 곱해야 하는데(${L} × ${L}) {mon/이/가} 분모를 한 번만 써서 답이 커졌어요.`, c),
        rule: '분수 × 분수: 위끼리, 아래끼리 곱한다. 통분 필요 없음.',
      }) });
    },
    why: [
      { q: '피자 1/2 × 1/3 이 1/2보다 **작아지는** 이유는?', ok: '반쪽의 1/3만 가져온 거라서', no: ['곱하면 항상 커지는데 잘못 계산한 것', '분모가 커져서 그냥 작아 보이는 것', '1보다 작은 수는 곱하면 항상 0에 가까워서'] },
      { q: '덧셈은 통분해야 하는데 곱셈은 왜 통분이 필요 없나요?', ok: '더할 때는 조각 크기를 맞춰야 하지만, 곱셈은 조각을 또 나누는 것이라서 (해도 답은 같아요)', no: ['곱셈이 더 쉬운 계산이라서', '곱셈은 약분으로 대신하니까', '통분하면 답이 커져서'] },
    ],
  },

  {
    id: 'frac.divnat', grade: 6, name: '분수 ÷ 자연수', needs: ['frac.mul'],
    idea: '2/3 ÷ 4 는 **2/3을 넷으로 나누는 것**이에요. 조각이 더 잘게 쪼개지니 분모가 커져요.',
    calc(r, c) {
      const d = pick(r, [3, 4, 5, 6, 7]);
      const n = coprime(r, d);
      const k = int(r, 2, 5);
      const story = worldPick(r, c, {
        pokemon: [
          `{mon/이/가} 나무열매 ${n}/${d}개를 포켓몬 ${k}마리가 똑같이 나눠 먹어요. 한 마리가 먹는 양은 얼마일까요?`,
          `{me/이/가} 포켓몬 푸드 ${n}/${d}통을 ${k}마리에게 똑같이 나눠 줘요. 한 마리 몫은 얼마일까요?`,
          `{mon/이/가} 피자 ${n}/${d}판을 ${k}일 동안 똑같이 나눠 먹어요. 하루에 먹는 양은?`,
        ],
        toystory: [
          `제시가 당근 ${n}/${d}개를 말 ${k}마리에게 똑같이 나눠 줘요. 한 마리 몫은 얼마일까요?`,
          `보니가 결혼식 케이크 ${n}/${d}판을 ${k}일 동안 똑같이 나눠 먹어요. 하루에 먹는 양은?`,
        ],
        minions: [
          `제임스가 바나나 ${n}/${d}개를 미니언 ${k}마리에게 똑같이 나눠 줘요. 한 마리 몫은 얼마일까요?`,
          `맥스 감독이 필름 ${n}/${d}통을 ${k}장면에 똑같이 나눠 써요. 한 장면에 쓰는 필름은?`,
        ],
        moana: [
          `탈라 할머니가 코코넛 ${n}/${d}개를 아이 ${k}명에게 똑같이 나눠 줘요. 한 명 몫은 얼마일까요?`,
          `모아나가 물 ${n}/${d}통을 ${k}일 동안 똑같이 나눠 마셔요. 하루에 마시는 물은?`,
        ],
      });
      const kJ = numJosa(k, '으로', '로');
      return ask(this.id, 'calc', fill(story, c), choices(r, fr(n, d * k), [
        { text: fr(n * k, d), tag: '나누지 않고 곱함' },
        { text: fr(n, d + k), tag: '분모에 더함' },
        { text: fr(Math.max(1, Math.round(n / k)), d), tag: '분자를 억지로 나눔' },
        { text: fr(n * k, d * k), tag: '위아래 다 곱함' },
      ]), { expr: `${n}/${d} ÷ ${k}`, solve: solve([
        `① ${n}/${d}${numJosa(n, '을', '를')} ${k}${kJ} 똑같이 나눠요 → 한 몫은 더 **작아져야** 해요`,
        `② 조각을 ${k}배 잘게 쪼개요 = 분모에 ${k}${numJosa(k, '을', '를')} 곱해요: ${d} × ${k} = ${d * k}`,
        `③ 답: ${n}/${d * k}${fr(n, d * k) !== `${n}/${d * k}` ? ` = ${fr(n, d * k)} (약분)` : ''}`,
      ], {
        why: {
          '나누지 않고 곱함': `나누면 한 몫은 **작아져야** 해요. ${n * k}/${d}${numJosa(d, '은', '는')} 오히려 커졌어요.`,
          '분모에 더함': `분모에 더하는 게 아니라 **곱해요**: ${d} × ${k} = ${d * k}.`,
          '분자를 억지로 나눔': `${n}${numJosa(n, '은', '는')} ${k}${kJ} 나누어떨어지지 않아요. 분자가 나누어떨어질 때는 분자를 나눠도 되지만, 안 될 땐 분모에 ${k}${numJosa(k, '을', '를')} 곱하면 언제나 돼요.`,
          '위아래 다 곱함': `위아래에 같은 수를 곱하면 양이 그대로예요 — 나눈 게 아니에요. 분모에만 곱해요.`,
          '계산 실수': `분자 ${n}${numJosa(n, '은', '는')} 그대로, 분모만 ${d} × ${k} = ${d * k}. 다시 해 봐요.`,
        },
        figure: barsSvg([{ n, d }, { n, d: d * k }]), compare: true, rule: '분수 ÷ 자연수: 분모에 곱한다 (= × 1/자연수).',
      }) });
    },
    misread(r, c) {
      const d = pick(r, [5, 7, 9]);
      const k = pick(r, [2, 4]); // 3은 안 된다 — "3을 3으로 나누려다 막혔다"는 말이 안 된다 (Codex 2026-09-21 #2)
      const kJ = numJosa(k, '으로', '로');
      return ask(this.id, 'misread', fill(`{mon/이/가} 3/${d} ÷ ${k} 를 풀 때 분자 3을 ${k}${kJ} 나누려다 막혔어요. {me/아/야}, 어떻게 하면 될까?`, c), choices(r, `분모에 ${k}${numJosa(k, '을', '를')} 곱하면 돼요 (3/${d * k})`, [
        { text: `분자에 ${k}${numJosa(k, '을', '를')} 곱해요`, tag: '곱셈으로 착각' },
        { text: '나누어떨어질 때까지 통분해요', tag: '통분으로 착각' },
        { text: '나눌 수 없는 문제예요', tag: '나눗셈이 안 된다고 생각' },
      ]), { solve: solve([
        `① 3/${d} ÷ ${k}: 분자 3을 ${k}${kJ} 못 나누면 분모에 ${k}${numJosa(k, '을', '를')} 곱해요`,
        `② ${d} × ${k} = ${d * k} → 3/${d * k} (조각이 ${k}배 잘게 쪼개진 것)`,
      ], {
        why: {
          '곱셈으로 착각': `분자에 곱하면 커져요. 나누는 거니까 작아져야 해요.`,
          '통분으로 착각': `통분은 더하기·빼기 때 하는 거예요. 나눗셈은 분모에 곱하면 끝이에요.`,
          '나눗셈이 안 된다고 생각': `분자가 안 나누어떨어져도 돼요 — 분모에 ${k}${numJosa(k, '을', '를')} 곱하면 항상 나눌 수 있어요.`,
        },
        figure: barsSvg([{ n: 3, d }, { n: 3, d: d * k }]), rule: '분수 ÷ 자연수: 분모에 곱한다.',
      }) });
    },
    why: [
      { q: '2/3 ÷ 4 에서 분모가 커지는 이유는?', ok: '조각을 넷으로 더 잘게 쪼갠 것이라서', no: ['나눗셈은 항상 분모를 키우는 규칙이라서', '4가 3보다 커서', '분자를 못 나눠서'] },
      { q: '÷ 4 와 × 1/4 는 왜 같은가요?', ok: '넷으로 나누는 것과 1/4만큼 가져오는 것이 같은 뜻이라서', no: ['나눗셈은 곱셈으로 바꿔 쓰는 규칙이라서', '4와 1/4을 곱하면 1이라서', '둘 다 답이 작아져서'] },
    ],
  },

  {
    id: 'frac.div', grade: 6, name: '분수 ÷ 분수 (뒤집어 곱하기)', needs: ['frac.divnat'],
    idea: '÷ 2/3 는 **× 3/2** 와 같아요. "2/3짜리가 몇 개 들어가나"를 묻는 것이라 뒤집어 곱해요.',
    calc(r, c) {
      const d1 = pick(r, [2, 3, 4, 5]);
      const n1 = coprime(r, d1);
      let d2 = pick(r, [2, 3, 4, 5]);
      let n2 = coprime(r, d2);
      // 같은 수끼리 나누면(1/2 ÷ 1/2) 답이 1이라 뒤집는지 안 뒤집는지 드러나지 않는다
      while (n1 * d2 === n2 * d1) { d2 = pick(r, [2, 3, 4, 5]); n2 = coprime(r, d2); }
      const story = worldPick(r, c, {
        pokemon: [
          `{mon/이/가} 나무열매 ${n1}/${d1}개, {mon2/이/가} ${n2}/${d2}개를 가지고 있어요. {mon}의 열매는 {mon2}의 몇 배일까요?`,
          `{me}의 포켓몬 푸드는 ${n1}/${d1}통, {mon}의 푸드는 ${n2}/${d2}통이에요. {me}의 푸드는 {mon}의 몇 배일까요?`,
          `{mon}의 HP ${n1}/${d1}${numJosa(n1, '을', '를')} 채우려면 한 번에 ${n2}/${d2}씩 회복하는 상처약이 몇 병 필요할까요?`,
        ],
        toystory: [
          `제시의 사과는 ${n1}/${d1}개, 불즈아이의 사과는 ${n2}/${d2}개예요. 제시의 사과는 불즈아이의 몇 배일까요?`,
          `릴리패드의 배터리 ${n1}/${d1}${numJosa(n1, '을', '를')} 채우려면 한 번에 ${n2}/${d2}씩 충전하는 걸 몇 번 해야 할까요?`,
        ],
        minions: [
          `{mon}의 바나나는 ${n1}/${d1}개, {mon2}의 바나나는 ${n2}/${d2}개예요. {mon}의 바나나는 {mon2}의 몇 배일까요?`,
          `제임스의 영화 ${n1}/${d1}${numJosa(n1, '을', '를')} 찍으려면 한 통에 ${n2}/${d2}씩 찍는 필름이 몇 통 필요할까요?`,
        ],
        moana: [
          `마우이의 코코넛은 ${n1}/${d1}개, 헤이헤이의 코코넛은 ${n2}/${d2}개예요. 마우이의 코코넛은 헤이헤이의 몇 배일까요?`,
          `테 피티까지 남은 길 ${n1}/${d1}${numJosa(n1, '을', '를')} 하루에 ${n2}/${d2}씩 가면 며칠이 걸릴까요?`,
        ],
      });
      const ans = fr(n1 * d2, d1 * n2);
      return ask(this.id, 'calc', fill(story, c), choices(r, ans, [
        { text: fr(n1 * n2, d1 * d2), tag: '뒤집지 않고 곱함' },          // ★
        { text: fr(d1 * n2, n1 * d2), tag: '앞 분수를 뒤집음' },          // ★
        { text: fr(d1 * d2, n1 * n2), tag: '둘 다 뒤집음' },
        { text: fr(n1 * d2, d1 + n2), tag: '분모를 더함' },
      ]), { expr: `${n1}/${d1} ÷ ${n2}/${d2}`, hint: '연습장에 뒤집어 곱해 보세요', solve: solve([
        `① ÷ ${n2}/${d2}${numJosa(n2, '은', '는')} × ${d2}/${n2}${numJosa(d2, '과', '와')} 같아요 — **뒤의 분수**를 뒤집어요`,
        `② ${n1}/${d1} × ${d2}/${n2} = ${n1 * d2}/${d1 * n2} (위끼리, 아래끼리 곱해요)`,
        `③ 답: ${ans}${ans !== `${n1 * d2}/${d1 * n2}` ? ` (${n1 * d2}/${d1 * n2}${numJosa(n1 * d2, '을', '를')} 약분)` : ''}`,
      ], {
        why: {
          '뒤집지 않고 곱함': `나눗셈은 뒤의 분수를 **뒤집어서** 곱해요. 그냥 곱하면 곱셈 답(${fr(n1 * n2, d1 * d2)})이 나와요.`,
          '앞 분수를 뒤집음': `뒤집는 건 나누는 수, 즉 **뒤의 분수**(${n2}/${d2} → ${d2}/${n2})예요. 앞의 ${n1}/${d1}${numJosa(n1, '은', '는')} 그대로.`,
          '둘 다 뒤집음': `둘 다 뒤집으면 ${d1}/${n1} × ${d2}/${n2} = ${fr(d1 * d2, n1 * n2)} — 이건 곱셈 답(${fr(n1 * n2, d1 * d2)})을 거꾸로 한 거지 나눗셈 답이 아니에요. 앞은 그대로 두고 **뒤의 분수 하나만** 뒤집어요: ${n1}/${d1} × ${d2}/${n2}.`,
          '분모를 더함': `나눗셈에 더하기는 없어요. 뒤집어서 위끼리·아래끼리 곱해요.`,
          '계산 실수': `${n1} × ${d2}, ${d1} × ${n2}${numJosa(n2, '을', '를')} 다시 해 봐요: ${n1 * d2}, ${d1 * n2}.`,
        },
        compare: true, rule: '÷ 분수 = × 뒤집은 분수. 뒤의 것만 뒤집는다.',
      }) });
    },
    misread(r, c) {
      const d1 = pick(r, [2, 3]);
      const n2 = int(r, 1, 2);
      const d2 = pick(r, [3, 5]);
      return ask(this.id, 'misread', fill(`{mon/이/가} 1/${d1} ÷ ${n2}/${d2} 를 풀 때 **앞의 분수**를 뒤집어서 ${d1} × ${n2}/${d2} 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, '뒤집는 것은 뒤의 분수예요', [
        { text: '둘 다 뒤집어야 해요', tag: '둘 다 뒤집기' },
        { text: '뒤집지 말고 그냥 곱해야 해요', tag: '뒤집지 않기' },
        { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
      ]), { solve: solve([
        `① 뒤집는 건 뒤의 분수: ${n2}/${d2} → ${d2}/${n2}`,
        `② 1/${d1} × ${d2}/${n2} = ${fr(d2, d1 * n2)}`,
      ], {
        why: {
          '둘 다 뒤집기': `둘 다 뒤집으면 ${d1} × ${d2}/${n2} = ${fr(d1 * d2, n2)}${numJosa(d1 * d2, '이', '가')} 되는데, 정답은 ${fr(d2, d1 * n2)}예요. 앞의 1/${d1}${numJosa(d1, '은', '는')} 그대로 두고 뒤의 분수 하나만 뒤집어요.`,
          '뒤집지 않기': `뒤집지 않으면 곱셈이 돼요. 나눗셈은 뒤의 분수를 뒤집어 곱해요.`,
        },
        whyAny: fill(`{mon/이/가} **앞의** 분수를 뒤집었어요. 뒤집는 건 나누는 수, 즉 뒤의 분수예요.`, c),
        rule: '÷ 분수 = × 뒤집은 분수. 뒤의 것만 뒤집는다.',
      }) });
    },
    why: [
      { q: '피자 1판 ÷ 1/4 = 4 인 이유를 가장 잘 말한 것은?', ok: '한 판에 1/4짜리 조각이 네 개 들어가니까', no: ['1과 4를 곱했으니까', '나누면 항상 커지니까', '분모가 4라서'] },
      { q: '÷ 2/3 를 × 3/2 로 바꾸는 이유는?', ok: '2/3씩 몇 묶음인지 세는 것과 3/2배 하는 것이 같아서', no: ['나눗셈은 뒤집는 규칙이라서', '2/3과 3/2를 곱하면 1이라서', '곱셈이 더 쉬워서'] },
    ],
  },
];

/** 개념 id → 개념 */
export function conceptById(id) {
  return FRACTION.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 ─────────────────────

/**
 * 개념 하나의 문항 한 개.
 * @param {string} conceptId
 * @param {'calc'|'misread'|'why'} kind
 * @param {number} seed 같은 씨앗이면 같은 문제 (복습에서 같은 문제를 다시 낼 때 쓴다)
 * @param {{names?:string[], me?:string}} [opts] 출연진 — names는 포켓몬 이름(도감에서 잡은 것 우선), me는 아이 이름
 */
export function makeQuestion(conceptId, kind, seed, opts) {
  const c = conceptById(conceptId);
  if (!c) return null;
  const r = rng(seed);
  const cast = castOf(r, opts);
  if (cast.wantKind && cast.wantKind !== kind) cast.want = ''; // 다른 얼굴의 want는 이 문항에 안 쓴다
  if (kind === 'why' || kind === 'special') return humanQuestion(c, kind, r, cast, opts);
  const q = kind === 'misread' ? c.misread(r, cast) : c.calc(r, cast);
  return q ? { ...q, key: cast.key || (kind === 'misread' ? 'misread' : '') } : q; // 계산 문항은 worldPick이 고른 이야기 틀이 key, ② 오개념 문항은 틀이 하나라 고정 key(쌍둥이용)
}

/**
 * 사람이 쓴 문항 하나 — ③ why(coach/math/*.json의 why, 없으면 코드 안의 예비) · ⭐ special(파일에만).
 * 줄기마다 같은 규칙이라 mathneg.js도 이걸 쓴다. ⭐가 없으면 null (화면은 건너뛴다).
 */
export function humanQuestion(c, kind, r, cast, opts) {
  const extra = (opts && opts.content && opts.content[c.id]) || null;
  // 방금 나온 문항은 피한다 — 사람이 쓴 문항은 개수가 유한해서, 다시 풀 때 같은 게 또 나오면 답을 외운다
  const avoid = (pool, keyOf) => { const fresh = pool.filter((x) => !cast.recent.includes(tplKey(keyOf(x)))); return fresh.length ? fresh : pool; };
  // 🤔 오답 노트의 문항을 다시 낼 때(want) — 사람이 쓴 문항은 글이 곧 열쇠라 tplKey(q)로 찾는다
  const wanted = (pool, keyOf) => (cast.want ? pool.find((x) => tplKey(keyOf(x)) === cast.want) : null);
  if (kind === 'why') {
    // 사람이 쓴 것(coach/math/fraction.json)이 있으면 그쪽 — 코드 안의 것은 파일을 못 받았을 때의 예비
    const all = (extra && Array.isArray(extra.why) && extra.why.length) ? extra.why : (c.why || []);
    if (!all.length) return null;
    const pool = avoid(all, (w) => w.q);
    const w = wanted(all, (x) => x.q) || pool[Math.floor(r() * pool.length)];
    const chs = shuffle(r, [
      { text: fill(w.ok, cast), ok: true },
      ...w.no.map((t) => ({ text: fill(t, cast), ok: false, tag: '개념을 다르게 이해함' })),
    ]);
    // 사람이 쓴 풀이(explain: 왜 정답인가 + 끌리는 오답은 왜 아닌가) — 2차(2026-09-21). 단계는 없고 "왜 그런가" 한 덩이
    const ex = w.explain && w.explain.text ? solve([], { whyAny: fill(w.explain.text, cast), figure: w.explain.figure ? figureSvg(String(w.explain.figure).replace(/^\[|\]$/g, '')) : '', rule: c.idea }) : null;
    return { ...ask(c.id, 'why', fill(w.q, cast), chs, { hint: '왜 그런지 생각해 보세요', solve: ex }), key: tplKey(w.q) };
  }
  if (kind === 'special') {
    // ⭐ 사람이 쓴 특별 문제 — 이야기가 풍부한 대신 개수가 유한하다. 없으면 null (화면은 건너뛴다)
    // 영상 세계의 문제(`world`)는 **진우가 본 영상**일 때만 (opts.worlds에 있을 때만) 낸다
    const seen = (opts && opts.worlds) || {};
    const all = (extra && Array.isArray(extra.special)) ? extra.special : [];
    const pool = all.filter((s) => !s.world || s.world === 'pokemon' || seen[s.world]);
    if (!pool.length) return null;
    // 세계 비율을 특별 문제에도 — 출연진과 같은 세계의 문제가 있으면 그것을 우선
    const sameWorld = pool.filter((s) => (s.world || 'pokemon') === cast.world);
    const from = avoid(sameWorld.length ? sameWorld : pool, (x) => x.q);
    const s = wanted(pool, (x) => x.q) || from[Math.floor(r() * from.length)];
    const chs = shuffle(r, [
      { text: fill(s.ok, cast), ok: true },
      ...(s.no || []).map((w) => ({ text: fill(w.text, cast), ok: false, tag: w.tag || '오개념' })),
    ]);
    // 사람이 쓴 풀이 — 이 문제의 숫자로 쓴 단계 + 오개념별 한 마디 (2차)
    const e = s.explain;
    const ex = e && Array.isArray(e.steps) && e.steps.length ? solve(e.steps.map((t) => fill(t, cast)), {
      why: Object.fromEntries(Object.entries(e.why || {}).map(([k, v]) => [k, fill(v, cast)])),
      figure: e.figure ? figureSvg(String(e.figure).replace(/^\[|\]$/g, '')) : '', compare: true, rule: c.idea,
    }) : null;
    return { ...ask(c.id, 'special', fill(s.q, cast), chs, { expr: s.expr || '', hint: '연습장에 풀고 답을 골라요', figure: s.figure ? figureSvg(s.figure) : '', solve: ex }), key: tplKey(s.q) };
  }
  return null;
}

/**
 * 개념 한 편 = 세 얼굴로 세 문항 (+ ⭐ 특별 문제가 있으면 하나 더).
 * 하나라도 틀리면 그 개념은 아직 "안다"가 아니다.
 */
export function makeRound(conceptId, seed, opts) {
  const out = ['calc', 'misread', 'why'].map((k, i) => makeQuestion(conceptId, k, seed + i * 7919, opts));
  const sp = makeQuestion(conceptId, 'special', seed + 3 * 7919, opts);
  if (sp) out.push(sp);
  return out;
}

/**
 * 📖 개념 이야기 — 사람이 쓴 글에 출연진을 끼워 돌려준다. 없으면 코드 안의 한 줄(idea)로.
 * @returns {{title:string, text:string}}
 */
export function conceptStory(conceptId, seed, opts) {
  const c = conceptById(conceptId);
  if (!c) return null;
  const cast = castOf(rng(seed), opts);
  const extra = (opts && opts.content && opts.content[conceptId]) || null;
  if (extra && extra.story && extra.story.text) {
    return { title: fill(extra.story.title || c.name, cast), text: fill(extra.story.text, cast) };
  }
  return { title: c.name, text: fill(c.idea, cast) };
}

/**
 * 사람이 쓴 내용 파일 검사 — 배포 전에 돌린다 (tools/check.mjs). 문제가 없으면 [].
 * 손으로 쓴 JSON은 정답을 빠뜨리거나 개념 id를 잘못 적기 쉽다.
 */
export function checkContent(content) {
  const bad = [];
  if (!content || typeof content !== 'object') return ['내용이 객체가 아님'];
  for (const [id, v] of Object.entries(content)) {
    if (id === '_') continue;
    if (!conceptById(id)) { bad.push(`${id}: 없는 개념`); continue; }
    checkHuman(id, v, bad, valueOf);
  }
  return bad;
}

/**
 * 사람이 쓴 ③ why · ⭐ special · 📖 story · 풀이(explain)의 형식 검사 — 줄기 공통 (mathneg.js는 부호 있는 valueOf를 넘긴다).
 * 찾은 문제는 `bad`에 밀어 넣는다.
 */
export function checkHuman(id, v, bad, valueFn) {
  {
    // 정답과 **값**이 같은 오답은 정답이 둘인 문항이다 (Codex 2차 #1: "4/2 — 앞을 뒤집음"이 정답 2와 같았다). 앞의 수 부분만 본다
    const headVal = (t) => { const v = valueFn(String(t || '').split(' — ')[0].trim()); return v && v.d > 0 ? v : null; };
    const sameVal = (a, b) => !!(a && b && a.n * b.d === b.n * a.d);
    for (const [i, w] of (v.why || []).entries()) {
      if (!w.q || !w.ok || !Array.isArray(w.no) || w.no.length !== 3) bad.push(`${id}.why[${i}]: q·ok·no(3개) 필요`);
      else if (w.no.includes(w.ok)) bad.push(`${id}.why[${i}]: 오답에 정답이 있음`);
      else for (const t of w.no) if (sameVal(headVal(w.ok), headVal(t))) bad.push(`${id}.why[${i}]: 오답 "${t}"가 정답과 같은 값`);
    }
    for (const [i, s] of (v.special || []).entries()) {
      if (!s.q || !s.ok || !Array.isArray(s.no) || s.no.length !== 3) { bad.push(`${id}.special[${i}]: q·ok·no(3개) 필요`); continue; }
      const texts = s.no.map((w) => w && w.text);
      if (texts.some((t) => !t)) bad.push(`${id}.special[${i}]: 오답 text 없음`);
      if (texts.includes(s.ok)) bad.push(`${id}.special[${i}]: 오답에 정답이 있음`);
      if (new Set(texts).size !== 3) bad.push(`${id}.special[${i}]: 오답이 겹침`);
      for (const t of texts) if (sameVal(headVal(s.ok), headVal(t))) bad.push(`${id}.special[${i}]: 오답 "${t}"가 정답과 같은 값`);
      if (s.no.some((w) => w && !w.tag)) bad.push(`${id}.special[${i}]: 오답에 오개념 이름(tag) 없음`);
      if (s.world && !WORLDS[s.world]) bad.push(`${id}.special[${i}]: 모르는 세계 ${s.world}`);
    }
    if (v.story && (!v.story.text || !v.story.title)) bad.push(`${id}.story: title·text 필요`);
    // 풀이(explain, 2차): ③은 text, ⭐는 steps(2줄↑) + 오답마다 why. 그림 지시문은 그려져야 한다
    for (const [i, w] of (v.why || []).entries()) {
      if (!w.explain) { bad.push(`${id}.why[${i}]: 풀이(explain.text) 없음`); continue; }
      if (!w.explain.text) bad.push(`${id}.why[${i}]: explain.text 필요`);
      if (w.explain.figure && !figureSvg(String(w.explain.figure).replace(/^\[|\]$/g, ''))) bad.push(`${id}.why[${i}]: 못 그리는 풀이 그림 ${w.explain.figure}`);
    }
    for (const [i, sp] of (v.special || []).entries()) {
      const e = sp.explain;
      if (!e) { bad.push(`${id}.special[${i}]: 풀이(explain) 없음`); continue; }
      if (!Array.isArray(e.steps) || e.steps.length < 2) bad.push(`${id}.special[${i}]: explain.steps 2줄 이상`);
      for (const w of (sp.no || [])) if (w && w.tag && !(e.why || {})[w.tag]) bad.push(`${id}.special[${i}]: 오답 "${w.tag}"에 풀이 없음`);
      for (const t of Object.keys(e.why || {})) if (!(sp.no || []).some((w) => w && w.tag === t)) bad.push(`${id}.special[${i}]: 풀이의 이름표 "${t}"가 보기에 없음`);
      if (e.figure && !figureSvg(String(e.figure).replace(/^\[|\]$/g, ''))) bad.push(`${id}.special[${i}]: 못 그리는 풀이 그림 ${e.figure}`);
    }
    for (const txt of [v.story && v.story.text, ...(v.why || []).map((w) => w.q), ...(v.special || []).map((s) => s.q)]) {
      const leak = String(txt || '').match(/\{[^}]*\}/g) || [];
      for (const l of leak) if (!/^\{(me|mon|mon2)(\/[^/}]+\/[^}]+)?\}$/.test(l)) bad.push(`${id}: 잘못된 자리표시 ${l}`);
      // 그림 지시문 [bar 7/8] — 못 그리는 지시문은 화면에서 조용히 사라지므로 여기서 잡는다
      const figs = String(txt || '').match(/\[[a-z]+ [^\]]+\]/g) || [];
      for (const f of figs) if (!figureSvg(f.slice(1, -1))) bad.push(`${id}: 못 그리는 그림 지시문 ${f}`);
    }
    for (const [i, s] of (v.special || []).entries()) {
      if (s.figure && !figureSvg(s.figure)) bad.push(`${id}.special[${i}]: 못 그리는 그림 ${s.figure}`);
    }
  }
}

// ───────────────────── 📏 시작점 진단 ─────────────────────

/**
 * 줄기를 처음 열 때 "어디서부터 할까?"를 잡는 5문제.
 * 사다리에서 **고르게 떨어진** 개념의 calc 문항만 낸다 (개념 설명 없이 바로 푸는 것이라 계산만).
 * 선행한 아이에게 초4 분수 덧셈을 처음부터 시키면 지루해서 앱을 떠난다.
 */
export function diagnosticSet(seed, n = 5, opts) {
  return diagnosticOf(FRACTION, makeQuestion, seed, n, opts);
}

/** 진단 문제 뽑기의 공통 부분 — 줄기(list)와 그 줄기의 makeQuestion을 받는다 (mathneg.js도 쓴다) */
export function diagnosticOf(list, makeQ, seed, n, opts) {
  const step = (list.length - 1) / (n - 1);
  const picked = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.round(i * step);
    if (!picked.includes(idx)) picked.push(idx);
  }
  return picked.map((idx, i) => makeQ(list[idx].id, 'calc', seed + i * 104729, opts));
}

/**
 * 진단 결과로 시작점을 정한다 — **틀린 가장 앞 개념**부터.
 * 다 맞으면 마지막 개념까지 👑로 보고 그다음(아직 없으면 마지막)에서 시작한다.
 * @param {Array<{concept:string, correct:boolean}>} answers 낸 순서대로
 * @returns {{startId:string, knownIds:string[]}} 시작 개념과 "이미 아는 것"으로 칠 개념들
 */
export function placeFrom(answers) {
  return placeFromOf(FRACTION, answers);
}
export function placeFromOf(ladderList, answers) {
  const order = ladderList.map((c) => c.id);
  const list = (answers || []).filter((a) => a && order.includes(a.concept));
  const firstWrong = list.find((a) => !a.correct);
  if (!firstWrong) {
    return { startId: order[order.length - 1], knownIds: order.slice(0, -1) };
  }
  const at = order.indexOf(firstWrong.concept);
  // 틀린 개념 **바로 앞**까지만 아는 것으로 친다 (틀린 자리가 진짜 구멍이다)
  return { startId: order[at], knownIds: order.slice(0, at) };
}

/** 사다리 상태 — 👑 이해완료 / ▶ 지금 / 🔒 아직 (앞 개념을 마쳐야 열린다) */
export function ladder(doneIds) {
  return ladderOf(FRACTION, doneIds);
}
export function ladderOf(list, doneIds) {
  const done = new Set(doneIds || []);
  let openFound = false;
  return list.map((c) => {
    const ready = (c.needs || []).every((id) => done.has(id));
    let state;
    if (done.has(c.id)) state = 'done';
    else if (ready && !openFound) { state = 'now'; openFound = true; }
    else state = ready ? 'open' : 'locked';
    return { id: c.id, name: c.name, grade: c.grade, state };
  });
}
