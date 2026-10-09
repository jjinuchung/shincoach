// 🚀 로켓단 영어 배틀 문제 (2026-10-09, 3단계) — 영상에서 본 단어(vocabViews)의 뜻 고르기.
// 말하기 대신 단어 뜻: 태블릿 음성 인식이 불안정하다(안드로이드 Chrome 마이크·인식 동시 사용 문제).
// 영상과 무관하게 저장된 단어 기록만 쓰므로, 앱을 다시 열어 영상 없이 이어 가도 문제를 낼 수 있다.
// 문제를 낸 것은 기록하지 않는다(복습 칸·단어 상자를 건드리지 않음) — 수학 배틀 문제와 같은 성격.
import { quizChoices } from './review.js';

/** 낼 수 있는 단어 — 뜻이 있고 한 번 이상 본 것 */
export function wordPool(records) {
  return (records || []).filter((r) => r && r.word && r.meaning && (Number(r.views) || 0) >= 1);
}

/**
 * 단어 문제 하나 { word, meaning, choices } — 보기가 3개 이상 될 때만(아니면 null).
 * 여러 번 본 단어(2번 이상)부터, 이번 배틀에 이미 낸 단어(recent)는 빼고
 */
export function wordQuestion(records, rng = Math.random, recent = []) {
  const pool = wordPool(records);
  if (pool.length < 3) return null;
  const fresh = pool.filter((r) => !recent.includes(r.word));
  const seen = fresh.filter((r) => (Number(r.views) || 0) >= 2);
  const list = seen.length >= 3 ? seen : fresh.length ? fresh : pool;
  for (let t = 0; t < 8; t++) {
    const rec = list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
    const choices = quizChoices(rec, pool, rng);
    if (choices.length >= 3) return { word: rec.word, meaning: String(rec.meaning), choices };
  }
  return null;
}

/** 영어 단어 소리 (기기에 음성이 있으면) */
function sayWord(word) {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'en-US';
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  } catch { /* 소리 없이 */ }
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/**
 * 로켓단 배틀에 넘길 영어 문제 함수 — 수학 battleQuiz와 같은 약속: (box, hooks) → Promise<{correct, skipped, interrupted}>
 * @param {() => Promise<Array>} getRecords 단어 기록을 읽는다 (listVocabViews)
 */
export function wordQuiz(getRecords) {
  const recent = [];
  return (box, hooks) => new Promise((resolve) => {
    let done = false;
    let picked = false;
    const finish = (r) => { if (done) return; done = true; resolve(r); };
    if (hooks && hooks.register) hooks.register(() => finish({ correct: false, skipped: false, interrupted: true }));
    Promise.resolve(getRecords()).catch(() => []).then((records) => {
      if (done) return;
      const q = wordQuestion(records, Math.random, recent);
      // 낼 단어가 없으면 이 배틀은 멈춘 채 둔다(저장된 배틀은 다음에 이어 간다) — 없는 문제로 틀리게 하지 않는다
      if (!q) { finish({ correct: false, skipped: false, interrupted: true }); return; }
      recent.push(q.word);
      if (/[?&]nosw=1/.test(location.search)) window.__rocketWordQ = q; // 헤드리스 검증용 (개발 모드에서만)
      box.appendChild(el('div', 'battle-quiz-label', '🔤 단어 뜻'));
      const qt = el('div', 'battle-quiz-q rocket-word');
      qt.appendChild(el('span', 'rocket-word-en', q.word));
      const hear = el('button', 'btn rocket-word-hear', '🔊');
      hear.type = 'button';
      hear.setAttribute('aria-label', '단어 듣기');
      hear.addEventListener('click', () => sayWord(q.word));
      qt.appendChild(hear);
      qt.appendChild(el('div', 'rocket-word-ask', '무슨 뜻일까요?'));
      box.appendChild(qt);
      sayWord(q.word);
      const list = el('div', 'battle-quiz-choices');
      const skip = el('button', 'btn battle-quiz-skip', '⏭ 모르겠어요');
      skip.type = 'button';
      q.choices.forEach((text) => {
        const b = el('button', 'btn battle-quiz-choice', text);
        b.type = 'button';
        b.addEventListener('click', () => {
          if (done || picked) return;
          picked = true;
          [...list.children].forEach((x) => { x.disabled = true; });
          skip.disabled = true;
          const ok = text === q.meaning;
          b.classList.add(ok ? 'ok' : 'no');
          if (!ok) { const right = q.choices.indexOf(q.meaning); if (right >= 0) list.children[right].classList.add('ok'); }
          setTimeout(() => finish({ correct: ok, skipped: false, interrupted: false }), ok ? 350 : 900);
        });
        list.appendChild(b);
      });
      box.appendChild(list);
      skip.addEventListener('click', () => {
        if (done || picked) return;
        picked = true;
        [...list.children].forEach((x) => { x.disabled = true; });
        finish({ correct: false, skipped: true, interrupted: false });
      });
      box.appendChild(skip);
    });
  });
}
