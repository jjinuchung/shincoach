// 🏷️ 앱 판 번호 (v314, 2026-10-22 아버님 "2와 3번 진행하자") — 📤 usage/날짜.md 맨 위에 "앱 판 vNNN"을 적어
// 태블릿이 새 판을 받았는지(⭐ 변신·🎮 게임 같은 새 기능이 돌고 있는지) 기록만 보고 알게 한다.
// ★ 배포할 때 sw.js CACHE_VERSION과 같이 올린다 — 다르면 tools/check.mjs가 막는다(올리는 걸 잊지 않게)
// 아무것도 import하지 않는다 · upload.js가 앱을 켤 때 함께 불러 판을 묶는다(올릴 때 처음 불러오면 새로 들어온 판을 적을 수 있다 — 🔍 Codex 120차 #6)

/** 지금 돌고 있는 코드의 판 */
export const APP_VERSION = 'v425';

/** 판 글자 → 수 ('v314' → 314) · 꼴이 틀리면 0 */
export function versionNum(v) {
  const m = /^v(\d+)$/.exec(String(v || ''));
  return m ? Number(m[1]) : 0;
}

/** 다 받은 판에만 들어가는 표시 (sw.js SHELL_DONE과 같은 이름 · v425) */
export const SHELL_DONE = './__shell-done__';

/**
 * 이 기기에 받아 둔 판 (서비스워커 캐시 이름 shincoach-vNNN 가운데 가장 큰 것) — 못 알면 ''
 * v425부터 **다 받은 표시가 있는 캐시만** 센다 — 받는 중인 판을 「받아 둔 새 판」으로 적지 않게 (Codex 228차 P3) · 표시 없는 옛 캐시(v424까지)는 안 셈
 */
export async function cachedVersion() {
  try {
    const names = await caches.keys();
    const vs = [];
    for (const n of names) {
      const m = /^shincoach-v(\d+)$/.exec(n);
      if (m && await (await caches.open(n)).match(SHELL_DONE)) vs.push(Number(m[1]));
    }
    return vs.length ? `v${Math.max(...vs)}` : '';
  } catch { return ''; }
}

/**
 * 📤 사용 기록 머리의 판 줄 (순수) — run 지금 도는 코드 · cached 받아 둔 판(없으면 '')
 * 받아 둔 판이 더 크면 "새 판을 받아 두었지만 아직 옛 코드가 돈다"(앱을 닫았다 다시 열면 바뀐다)
 */
export function versionLine(run, cached) {
  const r = versionNum(run);
  const c = versionNum(cached);
  if (!r) return '앱 판 (모름)';
  return c > r ? `앱 판 ${run} (지금 도는 코드) · 받아 둔 새 판 ${cached} — 앱을 닫았다 다시 열면 바뀌어요` : `앱 판 ${run} (지금 도는 코드)`;
}
