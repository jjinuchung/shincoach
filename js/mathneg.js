// 🔢 수학 — E 음수 줄기 (중1 「정수와 유리수」): 개념 사다리 + 사람이 쓴 내용의 형식 검사 (순수 함수, 화면 없음)
//
// 분수 줄기(mathgen.js)와 다른 점 하나 — **처음 배우는 줄기**다 (아버님 결정, 2026-09-20).
// 분수는 진우가 선행으로 이미 배운 것이라 📖 이야기 한 편(300~450자) → 문항으로 충분했지만,
// 음수는 학원도 안 다니고 누가 알려 준 적도 없는 개념이다. 한 문단 읽고 문제부터 풀면 틀리고 → 다시 읽고 → 또 틀리는 루프가 된다.
// 그래서 개념마다 📖 대신 **단계식 배움(lesson)** 을 둔다:
//   설명 한 조각(say) → 확인 질문 하나(check) → 다음 조각 … → 한 줄 요약(rule)
// 읽기만 하지 않고 매 장 손을 움직인다. 첫 개념은 배움을 다 거쳐야 문항이 열린다 (화면이 잠근다).
//
// ★ 그리고 **아빠 카드(dad)** — 개념마다 반 장. 저녁 10분에 아빠가 처음 소개하고(뭐라고 말할지·비유·활동·
//   진우가 낼 법한 오개념과 그때 할 말·통과 기준), 반복·검증·복습은 앱이 한다. 학원 선생님 일 중 "처음 소개"만 사람이.
//   앱의 배움은 아빠가 못 한 날에도 혼자 갈 수 있게 자립적으로 쓰되, 아빠 카드가 붙으면 훨씬 잘 붙는다.
//
// 왜 E가 분수 다음인가: 중1 첫 고비(부호 규칙이 무너지면 문자와 식·방정식이 전부 무너진다), D 문자와 식은 음수 없이 못 간다(x+5=3),
// 오답=오개념이 제일 선명하고(−3−5=−2 "빼기를 더하기로", (−2)×(−3)=−6 "음×음=음"), 유리수는 분수 줄기를 그대로 쓴다.
//
// 문제 생성기(①②③⭐)는 다음 단계에서 이 파일에 붙는다 — 지금은 사다리와 내용 검사만.

import { figureSvg } from './mathdraw.js';

/** 학년 표시 — 7은 중1. 분수 줄기는 4·5·6(초)이라 숫자로 통일하고 표시만 바꾼다 */
export function gradeLabel(g) {
  return g >= 7 ? `중${g - 6}` : `초${g}`;
}

/**
 * 개념 사다리 — `needs`가 잠금이다. 학년은 전부 중1이라 표시일 뿐이고, 진단으로 시작점을 잡는다.
 * `idea`는 사다리 카드와 배움 끝에 보이는 한 줄.
 */
export const NEGATIVE = [
  { id: 'neg.mean', grade: 7, name: '0보다 작은 수', needs: [],
    idea: '0보다 작은 수가 있어요. 앞에 −를 붙여 써요. 서로 반대인 것(위/아래, 벌기/쓰기)을 +와 −로 나타내요.' },
  { id: 'neg.line', grade: 7, name: '수직선에서 크기 비교', needs: ['neg.mean'],
    idea: '수직선에서 오른쪽이 커요. 음수는 0에 가까울수록 커요. 0에서 떨어진 거리가 절댓값이에요.' },
  { id: 'neg.add', grade: 7, name: '음수가 있는 덧셈', needs: ['neg.line'],
    idea: '더하기는 수직선에서 걷기예요. 양수를 더하면 오른쪽으로, 음수를 더하면 왼쪽으로.' },
  { id: 'neg.sub', grade: 7, name: '음수가 있는 뺄셈', needs: ['neg.add'],
    idea: '빼기는 반대수 더하기예요. 3 − 5 = 3 + (−5). 음수를 빼면 오히려 더해져요: 3 − (−5) = 8.' },
  { id: 'neg.addsub', grade: 7, name: '덧셈·뺄셈 섞인 계산', needs: ['neg.sub'],
    idea: '2 − 5 + 3은 (+2) + (−5) + (+3)이에요. 전부 덧셈으로 보고 양수끼리·음수끼리 모으면 편해요.' },
  { id: 'neg.mul', grade: 7, name: '음수가 있는 곱셈', needs: ['neg.addsub'],
    idea: '같은 부호끼리 곱하면 +, 다른 부호끼리 곱하면 −. 음수 × 음수 = 양수는 규칙표에서 스스로 찾아요.' },
  { id: 'neg.div', grade: 7, name: '음수가 있는 나눗셈', needs: ['neg.mul'],
    idea: '나눗셈은 곱셈의 반대예요. 부호 규칙은 곱셈과 똑같아요. 0으로는 못 나눠요.' },
  { id: 'neg.frac', grade: 7, name: '음의 분수와 소수', needs: ['neg.div'],
    idea: '분수·소수에도 부호가 붙어요(유리수). 부호는 정수 규칙대로, 숫자는 분수 줄기에서 하던 대로.' },
  { id: 'neg.mixed', grade: 7, name: '섞인 계산과 거듭제곱', needs: ['neg.frac'],
    idea: '괄호 → 거듭제곱 → 곱셈·나눗셈 → 덧셈·뺄셈 순서. (−2)² = 4 이지만 −2² = −4 예요.' },
];

export function conceptById(id) {
  return NEGATIVE.find((c) => c.id === id) || null;
}

/** 자리표시 `{me}` `{mon/이/가}` 가 아닌 중괄호는 잘못 쓴 것 (mathgen.checkContent와 같은 규칙) */
function badPlaceholders(txt) {
  const leak = String(txt || '').match(/\{[^}]*\}/g) || [];
  return leak.filter((l) => !/^\{(me|mon|mon2)(\/[^/}]+\/[^}]+)?\}$/.test(l));
}
/** 못 그리는 그림 지시문 — 화면에서 조용히 사라지므로 여기서 잡는다 */
function badFigures(txt) {
  const figs = String(txt || '').match(/\[[a-z]+ [^\]]+\]/g) || [];
  return figs.filter((f) => !figureSvg(f.slice(1, -1)));
}

/**
 * coach/math/negative.json 형식 검사 — 배포로 실려 가므로 check.mjs가 부른다.
 *   lesson: [{ say, check?: { q, ok, no: [1~2개], why } }, …] 3장 이상, 확인 질문 2개 이상
 *   rule:   한 줄 요약 (배움 끝과 사다리 카드에)
 *   dad:    { goal, say: [문장…], do, traps: [{ kid, dad }…], pass }
 * @returns {string[]} 문제 목록 (비어 있으면 통과)
 */
export function checkContent(content) {
  const bad = [];
  if (!content || typeof content !== 'object') return ['내용이 객체가 아님'];
  for (const [id, v] of Object.entries(content)) {
    if (id === '_') continue;
    if (!conceptById(id)) { bad.push(`${id}: 없는 개념`); continue; }
    const lesson = v.lesson;
    if (!Array.isArray(lesson) || lesson.length < 3) { bad.push(`${id}.lesson: 3장 이상 필요`); }
    else {
      let checks = 0;
      lesson.forEach((step, i) => {
        if (!step || !step.say) bad.push(`${id}.lesson[${i}]: say 필요`);
        const c = step && step.check;
        if (c) {
          checks++;
          if (!c.q || !c.ok || !Array.isArray(c.no) || c.no.length < 1 || c.no.length > 2) bad.push(`${id}.lesson[${i}].check: q·ok·no(1~2개) 필요`);
          else if (c.no.includes(c.ok)) bad.push(`${id}.lesson[${i}].check: 오답에 정답이 있음`);
          else if (new Set(c.no).size !== c.no.length) bad.push(`${id}.lesson[${i}].check: 오답이 겹침`);
          if (!c.why) bad.push(`${id}.lesson[${i}].check: why(틀렸을 때 한 마디) 필요`);
        }
        for (const txt of [step && step.say, c && c.q, c && c.why]) {
          for (const l of badPlaceholders(txt)) bad.push(`${id}.lesson[${i}]: 잘못된 자리표시 ${l}`);
          for (const f of badFigures(txt)) bad.push(`${id}.lesson[${i}]: 못 그리는 그림 지시문 ${f}`);
        }
      });
      if (checks < 2) bad.push(`${id}.lesson: 확인 질문이 2개 이상 있어야 배움이 됨`);
    }
    if (!v.rule) bad.push(`${id}.rule: 한 줄 요약 필요`);
    const d = v.dad;
    if (!d || typeof d !== 'object') bad.push(`${id}.dad: 아빠 카드 필요`);
    else {
      if (!d.goal) bad.push(`${id}.dad.goal 필요`);
      if (!Array.isArray(d.say) || !d.say.length) bad.push(`${id}.dad.say: 말할 거리 1개 이상`);
      if (!d.do) bad.push(`${id}.dad.do: 같이 해 볼 활동 필요`);
      if (!Array.isArray(d.traps) || !d.traps.length) bad.push(`${id}.dad.traps: 헷갈리는 자리 1개 이상`);
      else d.traps.forEach((t, i) => { if (!t || !t.kid || !t.dad) bad.push(`${id}.dad.traps[${i}]: kid·dad 필요`); });
      if (!d.pass) bad.push(`${id}.dad.pass: 통과 기준 필요`);
    }
  }
  for (const c of NEGATIVE) if (!content[c.id]) bad.push(`${c.id}: 내용 없음`);
  return bad;
}
