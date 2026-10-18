// 🎤 소리 낱말(감탄사) — 영어 자막에 적혀 있어도 음성 인식이 글자로 잘 못 바꾸는 소리 (v292, 2026-10-18 아버님 "진행하자")
//
// whoa·huh·hmm·uh·ooh·ow… 는 단어장에 뜻이 있어서(📖 단어 패널에 보이게) "영어 문장"으로 세어졌다 →
// "Huh?" 한 줄도 마이크로 확인했고, 인식기가 소리를 글자로 못 바꿔 진우가 아무리 따라 해도 "다시 한번!"이 나왔다
// (태블릿 자막 16편 · 확인하는 줄 9,253 중 감탄사만 있는 줄 461 — 스폰지밥 9% · 미니언즈 11.6%).
//   · 감탄사만 있는 줄 → 미니언즈어 줄처럼 확인 없이 따라 해 보는 줄 (vocab.isSpeakable) · 🔁 복습에도 안 넣는다 (review.isDue)
//   · 섞인 줄("Whoa! Look at that!") → 소리 낱말은 채점에서 뺀다 (speak.scoreTranscript·wordResults)
// ★ hey·yeah·wow·oops·ouch·yay·no 같은 진짜 낱말은 넣지 않는다 — 인식도 잘 되고 배울 말이다 (아버님이 고른 경계)
// ★ 이 파일은 아무것도 import하지 않는다 (speak.js·vocab.js·review.js·track.js가 함께 쓴다)

/** 소리 낱말 — 자막에 흔한 꼴 그대로 (소문자) */
const SOUNDS = new Set([
  'whoa', 'woah', 'huh', 'hmm', 'hm', 'hmph', 'mm', 'mmm', 'mhm', 'uh', 'uhh', 'um', 'umm', 'er', 'erm',
  'ah', 'aah', 'ahh', 'oh', 'ohh', 'ooh', 'oooh', 'ow', 'oww', 'aw', 'aww', 'eh', 'sh', 'shh', 'psst',
  'phew', 'whew', 'whee', 'ugh', 'argh', 'arg', 'gah', 'grr', 'ha', 'hah', 'heh', 'aha', 'wha', 'eek', 'oof',
  'pfft', 'tsk', 'yeehaw', 'woohoo', 'whoohoo', 'wahoo', 'yippee', 'woo', 'whoo', 'hoo',
]);
/** 같은 글자를 셋 넘게 늘인 꼴("Whoaaa" "Ahhhh" "Hmmmm")을 한 글자로 줄였을 때의 밑꼴 */
const SQUEEZED = new Set(['whoa', 'woah', 'wo', 'huh', 'hm', 'hmph', 'm', 'mhm', 'uh', 'um', 'er', 'ah', 'a', 'oh', 'o', 'ow', 'aw', 'eh', 'sh', 'phew', 'whew', 'whe', 'ugh', 'argh', 'arg', 'ar', 'gah', 'gr', 'wha', 'ek', 'h']);
/** 웃음 — haha · hehe · hohoho · ahaha · mwahaha */
const LAUGH = /^(?:(?:ha|he|ho|hi){2,}h?|a(?:ha)+h?|[bm]?wa(?:ha)+h?)$/;

/** 비교용으로 정리한 낱말 하나(소문자 영문자)가 소리 낱말인가 */
export function isSoundWord(word) {
  const w = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return false;
  if (SOUNDS.has(w) || LAUGH.test(w)) return true;
  // 같은 글자가 셋 이어질 때만 줄여 본다 — 둘이면 진짜 낱말과 겹친다(off → of · too → to)
  if (/(.)\1\1/.test(w)) {
    const s = w.replace(/(.)\1+/g, '$1');
    return SQUEEZED.has(s) || LAUGH.test(s);
  }
  return false;
}

/** 자막의 공백 조각 하나("Uh-oh!" "Whoa," "Ha-ha-ha")가 소리뿐인가 — 붙임표로 이은 것은 조각마다 */
export function isSoundToken(token) {
  const parts = String(token || '').toLowerCase().split('-').map((p) => p.replace(/[^a-z]/g, '')).filter(Boolean);
  return parts.length > 0 && parts.every(isSoundWord);
}

/**
 * 감탄사만 있는 줄인가 ("Huh?" · "Whoa, whoa, whoa!" · "Uh-oh.") — 영문자 낱말이 하나도 없으면 아니다.
 * 단어장 없이 정한다 — 🔁 복습 판정(review.isDue)은 단어장을 읽기 전에도 돈다. 그래서 이름도 낱말로 센다:
 * "Oh, Gengar!"는 여기서는 아니다(이름 외침은 vocab.isSpeakable이 단어장으로 가린다 — 자막은 "Uh… No?"처럼
 * 감탄사 뒤 낱말을 대문자로 쓰기도 해서 단어장 없이 이름을 가르면 진짜 낱말까지 빠진다)
 */
export function soundOnly(text) {
  const raw = String(text || '').replace(/[♪♫]/g, ' ').split(/\s+/).filter(Boolean);
  let counted = 0;
  for (const tok of raw) {
    if (!/[a-z]/i.test(tok)) continue; // 문장부호·다른 문자만 있는 조각
    if (!isSoundToken(tok)) return false;
    counted++;
  }
  return counted > 0;
}
