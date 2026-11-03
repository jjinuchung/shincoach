// 💡 오늘의 글감 (v388 — 2026-11-03 아버님 기본안 「추천대로」 · 원고 30 「이대로」)
//   ✍️ 오늘의 에세이는 배운 문장의 뒤 4~8단어를 「내 이야기」로 바꿔 쓰는데, 무엇을 쓸지는 아이에게 맡겨져 있었다 →
//   고를 거리를 하나 놓는다. 시작 화면에 그날 글감 셋(무리마다 하나) + 「✏️ 내 마음대로」 —
//   고르면 쓰기 칸 위에 물음 한 줄 + 영어 낱말 다섯(뜻 · 누르면 🔊 · 칸에 넣지는 않음 — 손으로 쳐 보는 것이 철자 연습).
//   고르지 않아도 지금과 똑같이 쓴다 · 세 문장 모두 같은 글감 · 보기 문장은 없음(베끼기 쉬워서).
//   보상은 그대로 · 글감 낱말을 쓰면 칭찬 한 줄만 · 글 내용을 두고 아무 말도 하지 않는다.
//   기록: 하루 기록 essays의 글마다 topic(글감 번호)·tw(쓴 글감 낱말 — 고른 글감이 있을 때만) → 📊 에세이 카드 · 📤 essay/todo · english/날짜.md
// 순수 — DOM·저장소 없음

/** 무리 셋 — 하루 셋은 무리마다 하나 · step은 무리 글감 수(10)와 서로소여야 열흘 동안 모두 다르다(7일 안에 다시 안 나옴) */
export const TOPIC_GROUPS = [
  { id: 'A', name: '🎮 좋아하는 것', step: 1, shift: 0 },
  { id: 'B', name: '🏠 내 하루', step: 3, shift: 1 },
  { id: 'C', name: '✨ 상상', step: 7, shift: 2 },
];

/** 글감 30 — 낱말은 [영어, 뜻] · 가족 글감은 아빠·엄마만(없는 식구를 지어내지 않음) · 가게·상표·포켓몬 이름은 낱말에 안 넣음 */
export const TOPICS = [
  { id: 'A1', icon: '🎣', name: '낚시', q: '낚시에서 있었던 일이나, 낚고 싶은 물고기', words: [['caught', '잡았다'], ['huge', '아주 큰'], ['boat', '배'], ['octopus', '문어'], ['river', '강']] },
  { id: 'A2', icon: '🐸', name: '개굴닌자', q: '개굴닌자와 하루를 같이 보낸다면', words: [['ninja', '닌자'], ['water', '물'], ['fast', '빠른'], ['jump', '뛰어오르다'], ['secret', '비밀']] },
  { id: 'A3', icon: '🐾', name: '포켓몬 배틀', q: '내 포켓몬이 배틀에서 이긴 이야기', words: [['battle', '배틀'], ['win', '이기다'], ['attack', '공격'], ['partner', '파트너'], ['strong', '강한']] },
  { id: 'A4', icon: '🧱', name: '레고', q: '레고로 만든 것이나, 만들고 싶은 것', words: [['build', '만들다'], ['tower', '탑'], ['castle', '성'], ['pieces', '조각들'], ['spaceship', '우주선']] },
  { id: 'A5', icon: '⚽', name: '축구', q: '공을 차고 뛰어논 이야기', words: [['kick', '차다'], ['goal', '골'], ['team', '팀'], ['score', '골을 넣다'], ['run', '달리다']] },
  { id: 'A6', icon: '🍔', name: '좋아하는 음식', q: '가장 좋아하는 음식과, 그걸 먹은 날', words: [['favorite', '가장 좋아하는'], ['delicious', '맛있는'], ['hungry', '배고픈'], ['dinner', '저녁밥'], ['share', '나눠 먹다']] },
  { id: 'A7', icon: '🎬', name: '재미있게 본 영상', q: '재미있게 본 만화나 영화의 한 장면', words: [['scene', '장면'], ['funny', '웃긴'], ['hero', '주인공'], ['watched', '봤다'], ['ending', '끝 장면']] },
  { id: 'A8', icon: '🐶', name: '좋아하는 동물', q: '키우고 싶거나 좋아하는 동물', words: [['pet', '반려동물'], ['cute', '귀여운'], ['feed', '먹이를 주다'], ['walk', '산책시키다'], ['tail', '꼬리']] },
  { id: 'A9', icon: '🎮', name: '좋아하는 게임', q: '가장 재미있는 게임과, 어려운 판을 깬 이야기', words: [['level', '판'], ['tricky', '까다로운'], ['practice', '연습하다'], ['clear', '(판을) 깨다'], ['best', '최고의']] },
  { id: 'A10', icon: '📚', name: '좋아하는 책', q: '재미있게 읽은 책 이야기', words: [['story', '이야기'], ['read', '읽다'], ['page', '쪽'], ['character', '등장인물'], ['exciting', '신나는']] },
  { id: 'B1', icon: '🏫', name: '학교 쉬는 시간', q: '학교 쉬는 시간에 한 일', words: [['friend', '친구'], ['recess', '쉬는 시간'], ['class', '수업'], ['laugh', '웃다'], ['together', '함께']] },
  { id: 'B2', icon: '🌧️', name: '오늘 날씨', q: '오늘 하늘과 날씨', words: [['rain', '비'], ['sunny', '맑은'], ['cold', '추운'], ['umbrella', '우산'], ['wind', '바람']] },
  { id: 'B3', icon: '🛏️', name: '내 방', q: '내 방에 있는 것, 내 방에서 하는 일', words: [['room', '방'], ['bed', '침대'], ['desk', '책상'], ['window', '창문'], ['messy', '어질러진']] },
  { id: 'B4', icon: '🌙', name: '잠들기 전', q: '잠들기 전에 하는 일이나, 꾼 꿈', words: [['dream', '꿈'], ['sleep', '자다'], ['dark', '어두운'], ['blanket', '이불'], ['quiet', '조용한']] },
  { id: 'B5', icon: '🚲', name: '자전거', q: '자전거를 타고 간 곳', words: [['ride', '타다'], ['bell', '벨'], ['helmet', '헬멧'], ['park', '공원'], ['wheel', '바퀴']] },
  { id: 'B6', icon: '🎂', name: '생일', q: '생일에 하고 싶은 일이나, 받고 싶은 선물', words: [['birthday', '생일'], ['cake', '케이크'], ['gift', '선물'], ['party', '파티'], ['candles', '초']] },
  { id: 'B7', icon: '👨‍👩‍👦', name: '아빠·엄마와', q: '아빠나 엄마와 같이 한 일', words: [['dad', '아빠'], ['mom', '엄마'], ['weekend', '주말'], ['helped', '도왔다'], ['trip', '나들이']] },
  { id: 'B8', icon: '🛝', name: '놀이터', q: '밖에서 뛰어논 이야기', words: [['slide', '미끄럼틀'], ['swing', '그네'], ['climb', '오르다'], ['sand', '모래'], ['outside', '밖에서']] },
  { id: 'B9', icon: '🌅', name: '아침', q: '아침에 일어나서 한 일', words: [['morning', '아침'], ['breakfast', '아침밥'], ['late', '늦은'], ['hurry', '서두르다'], ['brush', '(이를) 닦다']] },
  { id: 'B10', icon: '🎨', name: '그림', q: '그린 그림이나, 그리고 싶은 그림', words: [['draw', '그리다'], ['color', '색칠하다'], ['paper', '종이'], ['picture', '그림'], ['bright', '밝은']] },
  { id: 'C1', icon: '🦸', name: '내가 히어로라면', q: '내가 가진 힘이 하나 있다면', words: [['power', '힘'], ['fly', '날다'], ['save', '구하다'], ['invisible', '보이지 않는'], ['city', '도시']] },
  { id: 'C2', icon: '🐉', name: '내가 만든 포켓몬', q: '새 포켓몬을 하나 만든다면', words: [['type', '타입'], ['evolve', '진화하다'], ['wings', '날개'], ['horn', '뿔'], ['name', '이름']] },
  { id: 'C3', icon: '🚀', name: '우주 여행', q: '우주선을 타고 간다면', words: [['rocket', '로켓'], ['planet', '행성'], ['moon', '달'], ['stars', '별들'], ['alien', '외계인']] },
  { id: 'C4', icon: '🏝️', name: '보물섬', q: '보물섬에서 찾은 것', words: [['island', '섬'], ['treasure', '보물'], ['map', '지도'], ['pirate', '해적'], ['gold', '금']] },
  { id: 'C5', icon: '🤖', name: '내 로봇', q: '나를 도와주는 로봇이 있다면', words: [['robot', '로봇'], ['button', '단추'], ['clean', '청소하다'], ['homework', '숙제'], ['helper', '도우미']] },
  { id: 'C6', icon: '⏰', name: '시간 여행', q: '옛날이나 미래로 간다면', words: [['future', '미래'], ['past', '과거'], ['dinosaur', '공룡'], ['travel', '여행하다'], ['year', '해(년)']] },
  { id: 'C7', icon: '🐜', name: '아주 작아진다면', q: '개미만큼 작아진다면', words: [['tiny', '아주 작은'], ['giant', '거대한'], ['ant', '개미'], ['hide', '숨다'], ['grass', '풀']] },
  { id: 'C8', icon: '🪄', name: '마법', q: '마법을 하나 쓸 수 있다면', words: [['magic', '마법'], ['wand', '지팡이'], ['spell', '주문'], ['disappear', '사라지다'], ['wish', '소원']] },
  { id: 'C9', icon: '🦁', name: '동물이 된다면', q: '하루 동안 동물이 된다면', words: [['lion', '사자'], ['bird', '새'], ['swim', '헤엄치다'], ['roar', '으르렁거리다'], ['forest', '숲']] },
  { id: 'C10', icon: '🧪', name: '내 발명품', q: '세상에 없는 물건을 만든다면', words: [['invent', '발명하다'], ['machine', '기계'], ['idea', '생각'], ['press', '누르다'], ['amazing', '놀라운']] },
];

const BY_ID = new Map(TOPICS.map((t) => [t.id, t]));
/** 글감 번호 → 글감 (없으면 null) */
export function topicById(id) {
  return BY_ID.get(id) || null;
}
/** '🎣 낚시' */
export function topicLabel(t) {
  return t && t.icon ? `${t.icon} ${t.name}` : '';
}
const groupOf = (id) => String(id || '').replace(/\d+$/, '');

/** 'YYYY-MM-DD' → 1970-01-01부터 날 수 (못 읽으면 NaN) */
export function dayIndex(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''));
  if (!m) return NaN;
  return Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000);
}

/** 그날 글감 셋 (무리 차례) — 날짜로만 정해 같은 날 다시 열어도 같은 셋 · 날짜를 못 읽으면 [] */
export function dayTopics(date) {
  const d = dayIndex(date);
  if (!Number.isFinite(d)) return [];
  return TOPIC_GROUPS.map((g) => {
    const list = TOPICS.filter((t) => groupOf(t.id) === g.id);
    const n = list.length;
    return list[(((d * g.step + g.shift) % n) + n) % n];
  });
}

/** 한 음절 「자음 · 모음 하나 · 자음」 — 이런 동사는 -ing·-ed 앞에서 끝 자음을 겹쳐 쓴다(star → starring) · w·x·y는 안 겹친다(drawing · fixed · played) */
const CVC = /^[^aeiou]*[aeiou][b-df-hj-np-tvz]$/;
/** -ing·-ed를 뗀 바탕 b의 꼴들 — 겹자음이면 겹친 꼴·하나 꼴 · 안 겹친 한 음절 CVC면 끝 e를 뗀 것만(staring은 stare — star가 아니다, 🔍 Codex 191차 #1) */
function addStem(out, b) {
  out.add(b + 'e');
  if (/([b-df-hj-np-tv-z])\1$/.test(b)) { out.add(b); out.add(b.slice(0, -1)); }
  else if (!CVC.test(b)) out.add(b);
}
/** 낱말 하나가 될 수 있는 바탕 꼴들 — -s·-es·-ies·-ed·-ied·-ing (끝 e·겹자음까지) · 바꾸지 않은 꼴도 늘 들어 있다 · verb=false면 -ed·-ied·-ing은 안 뗀다 */
function forms(w, verb = true) {
  const s = String(w || '').toLowerCase().replace(/'s$/, '').replace(/[^a-z]/g, '');
  const out = new Set(s ? [s] : []);
  if (s.length > 4 && (s.endsWith('ies') || (verb && s.endsWith('ied')))) out.add(s.slice(0, -3) + 'y');
  if (verb && s.length > 5 && s.endsWith('ing')) addStem(out, s.slice(0, -3));
  if (verb && s.length > 4 && s.endsWith('ed')) addStem(out, s.slice(0, -2));
  if (s.length > 4 && /(s|x|z|ch|sh|o)es$/.test(s)) out.add(s.slice(0, -2)); // boxes · watches · heroes
  if (s.length > 3 && s.endsWith('s') && !s.endsWith('ss')) out.add(s.slice(0, -1));
  return out;
}
/** 동사가 아닌 글감 낱말 — -ed·-ing 꼴과 맞추지 않는다(pasted는 paste — past가 아니다, 🔍 Codex 191차 #1) */
const NOT_VERB = new Set(['past']);

/**
 * 글에 쓴 글감 낱말 (순수) — 글감 차례대로 · 같은 낱말은 한 번 · 낱말 꼴이 바뀌어도(kicked · stars → star) 같은 낱말
 * @param {object|null} topic 글감 · @param {string} text 아이가 쓴 글
 * @returns {string[]} 글감 낱말(원고 그대로)
 */
export function topicHits(topic, text) {
  if (!topic || !Array.isArray(topic.words)) return [];
  const toks = String(text || '').toLowerCase().split(/[^a-z']+/).filter(Boolean);
  const seen = new Set();
  const plain = new Set(); // -ed·-ing을 안 뗀 꼴만 (동사가 아닌 낱말과 맞출 때)
  for (const tk of toks) { for (const f of forms(tk)) seen.add(f); for (const f of forms(tk, false)) plain.add(f); }
  return topic.words.map(([en]) => en).filter((en) => {
    const verb = !NOT_VERB.has(en);
    const pool = verb ? seen : plain;
    return [...forms(en, verb)].some((f) => pool.has(f));
  });
}

/** 다 쓴 뒤 칭찬 한 줄 (아이 화면 — 셈 없이 낱말만) · 쓴 글감 낱말이 없으면 '' */
export function praiseLine(hits) {
  return Array.isArray(hits) && hits.length ? `💡 글감 낱말을 썼어요: ${hits.join(' · ')}` : '';
}

/** 하루 기록 글 목록에서 쓴 글만 */
const writtenOf = (d) => (d && Array.isArray(d.essays) ? d.essays : []).filter((e) => e && e.id && e.written);

/**
 * 하루 한 줄 (📤 english/날짜.md — 순수) — 쓴 글이 없으면 ''
 * ' · ✍️ 에세이 3 · 💡 🎣 낚시(글감 낱말 쓴 글 2)' · 고른 글감 없이 쓴 글은 '글감 안 고름'
 */
export function topicDayText(d) {
  const list = writtenOf(d);
  if (!list.length) return '';
  const picked = [];
  for (const e of list) {
    const t = topicById(e.topic);
    if (!t) continue;
    let p = picked.find((x) => x.t === t);
    if (!p) picked.push(p = { t, hit: 0 });
    if (Array.isArray(e.tw) && e.tw.length) p.hit += 1;
  }
  const free = list.filter((e) => !topicById(e.topic)).length;
  const parts = picked.map((p) => `${topicLabel(p.t)}(글감 낱말 쓴 글 ${p.hit})`);
  if (free) parts.push(`글감 안 고름 ${free}`);
  return ` · ✍️ 에세이 ${list.length} · 💡 ${parts.join(' · ')}`;
}

/**
 * 💡 최근 7일 글감 요약 (📊 에세이 카드 — 순수) — 에세이를 쓴 날 · 그 가운데 글감을 고른 날 · 글감 낱말을 쓴 글/고른 글감으로 쓴 글 · 많이 고른 글감
 * @param {Array<{date:string, essays?:Array}>} days 하루 기록 · @param {string} today 'YYYY-MM-DD'
 * @returns {string} 쓴 글이 없으면 ''
 */
export function topicWeekLine(days, today) {
  const end = dayIndex(today);
  if (!Number.isFinite(end)) return '';
  let essayDays = 0;
  let topicDays = 0;
  let onTopic = 0;
  let hit = 0;
  const count = new Map();
  for (const d of Array.isArray(days) ? days : []) {
    const k = dayIndex(d && d.date);
    if (!(k <= end && k > end - 7)) continue;
    const list = writtenOf(d);
    if (!list.length) continue;
    essayDays += 1;
    const mine = list.filter((e) => topicById(e.topic));
    if (mine.length) topicDays += 1;
    for (const e of mine) {
      onTopic += 1;
      if (Array.isArray(e.tw) && e.tw.length) hit += 1;
      count.set(e.topic, (count.get(e.topic) || 0) + 1);
    }
  }
  if (!essayDays) return '';
  const top = [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3)
    .map(([id, n]) => `${topicLabel(topicById(id))} ${n}`);
  return `💡 글감(최근 7일): 에세이 쓴 날 ${essayDays}일 중 글감 고른 날 ${topicDays}일 · 글감 낱말을 쓴 글 ${hit}/${onTopic}${top.length ? ` · 고른 글감 ${top.join(' · ')}` : ''}`;
}
