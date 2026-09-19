// 🕺 움직이는 도트 그림 (PokeAPI 5세대 애니메이션 스프라이트)
//
// 왜 그림을 두 가지 쓰나: 도감·퍼즐처럼 그림을 **크게** 보는 자리는 지금의 고화질 일러스트가 예쁘고,
// 여러 마리가 작게 뛰노는 연출(🔤 단어 연결의 무대)은 **진짜로 움직이는** 도트 그림이 제격이다.
// 명단 100마리 전부 이 그림이 있는 것을 확인했다 (2026-09-19).
//
// 저장은 **기존 characters 스토어에 'anim{id}' 키로** 넣는다. 새 스토어를 만들려면 DB 버전을
// 올려야 하는데, 저장이 깨져 앱이 멈춘 적이 있어(v68) 스키마는 건드리지 않는다.
// `loadCharacters`는 ROSTER의 **숫자 id**만 통과시키므로 이 레코드는 도감·퍼즐에 섞이지 않는다.
//
// ★ GIF는 원본 그대로 저장한다 — 캔버스로 줄이면 **첫 프레임만 남아 애니메이션이 죽는다**
//   (그래서 pokemon.js의 prepare()를 쓰지 않는다).
import { getCharacters, putCharacter } from './db.js';

const ANIM_URL = (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`;

/** characters 스토어에서 쓰는 키 (숫자 id와 안 겹치게) */
export const animKey = (id) => `anim${Number(id)}`;

const urls = new Map();   // id → objectURL
const missing = new Set(); // 받아 봤지만 없던 id (계속 다시 시도하지 않게)

/** 받아둔 움직이는 그림 주소 (없으면 null) */
export function animUrl(id) {
  return urls.get(Number(id)) || null;
}

/** 앱을 열 때 이미 받아둔 것을 메모리에 올림 (오프라인에서도 보이게) */
export async function loadAnims() {
  let recs = [];
  try { recs = await getCharacters(); } catch { return 0; }
  let n = 0;
  for (const r of recs) {
    if (!r || !r.blob || typeof r.id !== 'string' || !r.id.startsWith('anim')) continue;
    const id = Number(r.id.slice(4));
    if (!id || urls.has(id)) continue;
    urls.set(id, URL.createObjectURL(r.blob));
    n++;
  }
  return n;
}

/**
 * 움직이는 그림 한 장 확보. 없거나 인터넷이 없으면 null (호출부가 일러스트로 대체).
 * 한 번 없다고 나온 id는 다시 안 받는다.
 */
export async function ensureAnim(id) {
  const key = Number(id);
  if (!key || missing.has(key)) return null;
  if (urls.has(key)) return urls.get(key);

  const saved = (await getCharacters().catch(() => [])).find((c) => c.id === animKey(key) && c.blob);
  if (saved) {
    const url = URL.createObjectURL(saved.blob);
    urls.set(key, url);
    return url;
  }
  try {
    const res = await fetch(ANIM_URL(key), { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    await putCharacter({ id: animKey(key), ko: '', en: '', blob, anchor: null, savedAt: Date.now() });
    const url = URL.createObjectURL(blob);
    urls.set(key, url);
    return url;
  } catch (e) {
    missing.add(key);
    console.warn('움직이는 그림 받기 실패:', key, e);
    return null;
  }
}

/** 여러 장 — 하나가 실패해도 나머지는 받는다 (인터넷이 끊겨도 받아둔 건 그대로 쓴다) */
export async function ensureAnims(ids) {
  const out = [];
  for (const id of [...new Set((ids || []).map(Number))].filter(Boolean)) {
    const url = await ensureAnim(id);
    if (url) out.push({ id, url });
  }
  return out;
}
