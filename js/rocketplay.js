// 🚀 로켓단 배틀 실행 — 수학·영어 공통 (2026-10-09, 3단계). 과목이 주는 것은 문제(quiz)뿐이고,
// 저장(한 문제씩·빼앗기·이기기 — 그 배틀 id로 한 번만)과 화면(rocketview)은 여기서 묶는다.
import { ROSTER } from './pokemon.js';
import { getPartner, rocketSaveStep, rocketLose, rocketWin, rocketHideout } from './xp.js';
import { openRocket } from './rocketview.js';

/** 포켓몬 하나를 화면용으로 { id, ko, url } — chars: loadCharacters의 목록(그림 주소) */
export function monView(id, chars) {
  const n = Number(id);
  const r = ROSTER.find((m) => m.id === n);
  const c = (chars || []).find((x) => x && x.id === n);
  return { id: n, ko: r ? r.ko : String(n), url: c ? c.url : '' };
}

/**
 * 로켓단 화면을 열고 끝날 때까지 기다린다 (새 배틀·이어 가기 공통)
 * @param {{cur:object, resume:boolean, quiz:Function, chars?:Array, kid?:string}} o
 */
export function playRocket({ cur, resume, quiz, chars = [], kid = '진우' }) {
  return openRocket({
    cur,
    resume,
    kid,
    target: monView(cur.target, chars),
    partner: monView(getPartner() || cur.target, chars),
    quiz,
    saveStep: (ok) => rocketSaveStep(cur.id, ok),
    lose: () => rocketLose(cur.target, cur.id),
    hideout: () => rocketHideout().map((h) => ({ ...monView(h.id, chars), n: h.n })),
    win: (backId) => rocketWin(backId, cur.id),
  });
}
