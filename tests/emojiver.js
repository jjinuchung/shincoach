// 😀 Emoji 13 이후 글자 판정 (시험 도움 파일 — 시험 아님) · 태블릿 글꼴은 Emoji 12까지만 그린다 (v436)
/** Emoji 12 이하인 U+1FA70~1FAFF 글자 (🩰🩱🩲🩳 · 🩸🩹🩺 · 🪀🪁🪂 · 🪐🪑🪒🪓🪔🪕) — 그 밖의 이 칸은 13 이후 */
const ok12 = (cp) => (cp >= 0x1fa70 && cp <= 0x1fa73) || (cp >= 0x1fa78 && cp <= 0x1fa7a) || (cp >= 0x1fa80 && cp <= 0x1fa82) || (cp >= 0x1fa90 && cp <= 0x1fa95);
/**
 * 다른 칸의 13 이후 글자 — 🤌 🥲 🥷 🥸 🧋 🧌 🛖 🛗 🛜 🛝 🛞 🛟 🛻 🛼 🟰 🥹 ·
 * 13.0 동물 🦣 🦤 🦫 🦬 🦭 · ⚧ (리뷰 워크플로)
 */
const SINGLES = new Set([0x1f90c, 0x1f972, 0x1f977, 0x1f978, 0x1f9cb, 0x1f9cc, 0x1f6d6, 0x1f6d7, 0x1f6dc, 0x1f6dd, 0x1f6de, 0x1f6df, 0x1f6fb, 0x1f6fc, 0x1f7f0, 0x1f979,
  0x1f9a3, 0x1f9a4, 0x1f9ab, 0x1f9ac, 0x1f9ad, 0x26a7]);
/** 태블릿에 없는(Emoji 13 이후) 글자인가 — cp = codePointAt(0) */
export const newerEmoji = (cp) => SINGLES.has(cp) || (cp >= 0x1fa70 && cp <= 0x1faff && !ok12(cp));
/** 13 이후 ZWJ 묶음 — 🐻‍❄️ · 🐈‍⬛ · ❤️‍🔥 · ❤️‍🩹 (글자 하나하나는 옛 글자라 따로 본다: ZWJ 바로 뒤가 ❄ · ⬛ · 🔥 · 🩹) */
const ZWJ_TAIL = /‍(?:❄|⬛|\u{1F525}|\u{1FA79})/u;
/** 글 하나에 태블릿에 없는 그림 문자가 있으면 그것들(없으면 []) */
export function newerIn(s) {
  const out = [...s].filter((ch) => newerEmoji(ch.codePointAt(0)));
  if (ZWJ_TAIL.test(s)) out.push('ZWJ');
  return out;
}
/**
 * js 소스의 글자(' · " · `)만 — 주석은 버린다. 글자를 먼저 맞추고 주석은 다음 갈래라 글자 안의 // · /*('image/*' 같은)를 주석으로 읽지 않는다
 * (전에는 주석을 먼저 지워 'image/*'에서 코드 수십 줄을 건너뛰었다 — 리뷰 워크플로)
 */
export function stringsOf(code) {
  const re = /('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;
  const out = [];
  for (let m = re.exec(code); m; m = re.exec(code)) if (m[1]) out.push(m[1]);
  return out;
}
