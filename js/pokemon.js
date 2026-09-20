// 🎮 포켓몬 캐릭터: 문장 퍼즐에서 단어를 "들고 있는" 캐릭터
// 그림(공식 일러스트)은 닌텐도 저작물이라 저장소에 넣지 않고, 앱이 처음 한 번 인터넷(PokeAPI 스프라이트)에서 받아
// 기기 IndexedDB에 보관한다 (영상과 같은 취급). 이후엔 오프라인에서도 사용.
import { getCharacters, putCharacter } from './db.js';

/**
 * 명단: 처음 40마리(Lv1) + 레벨 마일스톤에서 열리는 20마리씩(Lv5·10·15). unlock 없으면 1.
 * 여기에 추가하면 ⚙ "받기"가 없는 것만 받아옴
 */
export const ROSTER = [
  { id: 25, ko: '피카츄', en: 'Pikachu' },
  { id: 4, ko: '파이리', en: 'Charmander' },
  { id: 6, ko: '리자몽', en: 'Charizard' },
  { id: 7, ko: '꼬부기', en: 'Squirtle' },
  { id: 9, ko: '거북왕', en: 'Blastoise' },
  { id: 1, ko: '이상해씨', en: 'Bulbasaur' },
  { id: 3, ko: '이상해꽃', en: 'Venusaur' },
  { id: 133, ko: '이브이', en: 'Eevee' },
  { id: 39, ko: '푸린', en: 'Jigglypuff' },
  { id: 52, ko: '나옹', en: 'Meowth' },
  { id: 54, ko: '고라파덕', en: 'Psyduck' },
  { id: 58, ko: '가디', en: 'Growlithe' },
  { id: 94, ko: '팬텀', en: 'Gengar' },
  { id: 130, ko: '갸라도스', en: 'Gyarados' },
  { id: 131, ko: '라프라스', en: 'Lapras' },
  { id: 143, ko: '잠만보', en: 'Snorlax' },
  { id: 149, ko: '망나뇽', en: 'Dragonite' },
  { id: 150, ko: '뮤츠', en: 'Mewtwo' },
  { id: 151, ko: '뮤', en: 'Mew' },
  { id: 152, ko: '치코리타', en: 'Chikorita' },
  { id: 155, ko: '브케인', en: 'Cyndaquil' },
  { id: 158, ko: '리아코', en: 'Totodile' },
  { id: 175, ko: '토게피', en: 'Togepi' },
  { id: 197, ko: '블래키', en: 'Umbreon' },
  { id: 384, ko: '레쿠쟈', en: 'Rayquaza' },
  { id: 393, ko: '팽도리', en: 'Piplup' },
  { id: 448, ko: '루카리오', en: 'Lucario' },
  { id: 658, ko: '개굴닌자', en: 'Greninja' },
  { id: 700, ko: '님피아', en: 'Sylveon' },
  { id: 778, ko: '따라큐', en: 'Mimikyu' },
  { id: 2, ko: '이상해풀', en: 'Ivysaur' },
  { id: 5, ko: '리자드', en: 'Charmeleon' },
  { id: 8, ko: '어니부기', en: 'Wartortle' },
  { id: 172, ko: '피츄', en: 'Pichu' },
  { id: 194, ko: '우파', en: 'Wooper' },
  { id: 280, ko: '랄토스', en: 'Ralts' },
  { id: 447, ko: '리오르', en: 'Riolu' },
  { id: 179, ko: '메리프', en: 'Mareep' },
  { id: 37, ko: '식스테일', en: 'Vulpix' },
  { id: 35, ko: '삐삐', en: 'Clefairy' },
  // ── Lv5에 열림 ──
  { id: 26, ko: '라이츄', en: 'Raichu', unlock: 5 },
  { id: 59, ko: '윈디', en: 'Arcanine', unlock: 5 },
  { id: 68, ko: '괴력몬', en: 'Machamp', unlock: 5 },
  { id: 95, ko: '롱스톤', en: 'Onix', unlock: 5 },
  { id: 104, ko: '탕구리', en: 'Cubone', unlock: 5 },
  { id: 113, ko: '럭키', en: 'Chansey', unlock: 5 },
  { id: 129, ko: '잉어킹', en: 'Magikarp', unlock: 5 },
  { id: 134, ko: '샤미드', en: 'Vaporeon', unlock: 5 },
  { id: 135, ko: '쥬피썬더', en: 'Jolteon', unlock: 5 },
  { id: 136, ko: '부스터', en: 'Flareon', unlock: 5 },
  { id: 12, ko: '버터플', en: 'Butterfree', unlock: 5 },
  { id: 63, ko: '캐이시', en: 'Abra', unlock: 5 },
  { id: 92, ko: '고오스', en: 'Gastly', unlock: 5 },
  { id: 147, ko: '미뇽', en: 'Dratini', unlock: 5 },
  { id: 246, ko: '애버라스', en: 'Larvitar', unlock: 5 },
  { id: 66, ko: '알통몬', en: 'Machop', unlock: 5 },
  { id: 116, ko: '쏘드라', en: 'Horsea', unlock: 5 },
  { id: 187, ko: '통통코', en: 'Hoppip', unlock: 5 },
  { id: 220, ko: '꾸꾸리', en: 'Swinub', unlock: 5 },
  { id: 19, ko: '꼬렛', en: 'Rattata', unlock: 5 },
  // ── Lv10에 열림 ──
  { id: 144, ko: '프리져', en: 'Articuno', unlock: 10 },
  { id: 145, ko: '썬더', en: 'Zapdos', unlock: 10 },
  { id: 146, ko: '파이어', en: 'Moltres', unlock: 10 },
  { id: 196, ko: '에브이', en: 'Espeon', unlock: 10 },
  { id: 248, ko: '마기라스', en: 'Tyranitar', unlock: 10 },
  { id: 249, ko: '루기아', en: 'Lugia', unlock: 10 },
  { id: 250, ko: '칠색조', en: 'Ho-Oh', unlock: 10 },
  { id: 251, ko: '세레비', en: 'Celebi', unlock: 10 },
  { id: 282, ko: '가디안', en: 'Gardevoir', unlock: 10 },
  { id: 445, ko: '한카리아스', en: 'Garchomp', unlock: 10 },
  { id: 65, ko: '후딘', en: 'Alakazam', unlock: 10 },
  { id: 123, ko: '스라크', en: 'Scyther', unlock: 10 },
  { id: 125, ko: '에레브', en: 'Electabuzz', unlock: 10 },
  { id: 137, ko: '폴리곤', en: 'Porygon', unlock: 10 },
  { id: 142, ko: '프테라', en: 'Aerodactyl', unlock: 10 },
  { id: 148, ko: '신뇽', en: 'Dragonair', unlock: 10 },
  { id: 212, ko: '핫삼', en: 'Scizor', unlock: 10 },
  { id: 257, ko: '번치코', en: 'Blaziken', unlock: 10 },
  { id: 260, ko: '대짱이', en: 'Swampert', unlock: 10 },
  { id: 91, ko: '파르셀', en: 'Cloyster', unlock: 10 },
  // ── Lv15에 열림 ──
  { id: 382, ko: '가이오가', en: 'Kyogre', unlock: 15 },
  { id: 383, ko: '그란돈', en: 'Groudon', unlock: 15 },
  { id: 483, ko: '디아루가', en: 'Dialga', unlock: 15 },
  { id: 484, ko: '펄기아', en: 'Palkia', unlock: 15 },
  { id: 487, ko: '기라티나', en: 'Giratina', unlock: 15 },
  { id: 493, ko: '아르세우스', en: 'Arceus', unlock: 15 },
  { id: 643, ko: '레시라무', en: 'Reshiram', unlock: 15 },
  { id: 644, ko: '제크로무', en: 'Zekrom', unlock: 15 },
  { id: 716, ko: '제르네아스', en: 'Xerneas', unlock: 15 },
  { id: 888, ko: '자시안', en: 'Zacian', unlock: 15 },
  { id: 889, ko: '자마젠타', en: 'Zamazenta', unlock: 15 }, // 진우 요청 (2026-09-20) — 자시안의 짝, PokeAPI 889 확인
  { id: 373, ko: '보만다', en: 'Salamence', unlock: 15 },
  { id: 376, ko: '메타그로스', en: 'Metagross', unlock: 15 },
  { id: 380, ko: '라티아스', en: 'Latias', unlock: 15 },
  { id: 381, ko: '라티오스', en: 'Latios', unlock: 15 },
  { id: 386, ko: '테오키스', en: 'Deoxys', unlock: 15 },
  { id: 887, ko: '드래펄트', en: 'Dragapult', unlock: 15 },
  { id: 645, ko: '랜드로스', en: 'Landorus', unlock: 15 },
  { id: 646, ko: '큐레무', en: 'Kyurem', unlock: 15 },
  { id: 800, ko: '네크로즈마', en: 'Necrozma', unlock: 15 },
  { id: 890, ko: '무한다이노', en: 'Eternatus', unlock: 15 },
];

/** 이 레벨에서 열려 있는 명단 */
/**
 * ⭐ 변신 폼 — PokeAPI의 폼 그림 id (메가진화 / 거다이맥스).
 * 명단 100마리 중 30마리가 변신할 수 있다. 그림은 필요할 때만 받는다(ensureForm).
 * 라이츄·개굴닌자 메가는 최신작 자료라 아이가 아는 것과 다를 수 있다.
 */
export const FORMS = {
  3: { mega: 10033, gmax: 10195 },   // 이상해꽃
  6: { mega: 10034, gmax: 10196 },   // 리자몽
  9: { mega: 10036, gmax: 10197 },   // 거북왕
  12: { gmax: 10198 },               // 버터플
  25: { gmax: 10199 },               // 피카츄
  26: { mega: 10304 },               // 라이츄
  52: { gmax: 10200 },               // 나옹
  65: { mega: 10037 },               // 후딘
  68: { gmax: 10201 },               // 괴력몬
  94: { mega: 10038, gmax: 10202 },  // 팬텀
  130: { mega: 10041 },              // 갸라도스
  131: { gmax: 10204 },              // 라프라스
  133: { gmax: 10205 },              // 이브이
  142: { mega: 10042 },              // 프테라
  143: { gmax: 10206 },              // 잠만보
  149: { mega: 10281 },              // 망나뇽
  150: { mega: 10043 },              // 뮤츠
  212: { mega: 10046 },              // 핫삼
  248: { mega: 10049 },              // 마기라스
  257: { mega: 10050 },              // 번치코
  260: { mega: 10064 },              // 대짱이
  282: { mega: 10051 },              // 가디안
  373: { mega: 10089 },              // 보만다
  376: { mega: 10076 },              // 메타그로스
  380: { mega: 10062 },              // 라티아스
  381: { mega: 10063 },              // 라티오스
  384: { mega: 10079 },              // 레쿠쟈
  445: { mega: 10058 },              // 한카리아스
  448: { mega: 10059 },              // 루카리오
  658: { mega: 10294 },              // 개굴닌자
};

/** 이 포켓몬이 할 수 있는 변신 { mega?, gmax? } (없으면 null) */
export function formsOf(id) {
  return FORMS[id] || null;
}

const formUrls = new Map(); // 폼 그림 id → object URL (받아둔 것만)

/** 받아둔 변신 그림 주소 (없으면 null) */
export function formUrl(monId, kind) {
  const f = FORMS[monId];
  const fid = f && f[kind];
  return fid ? (formUrls.get(fid) || null) : null;
}

/**
 * 변신 그림을 확보한다. 100마리를 받을 때 폼까지 다 받으면 데이터가 두 배가 되므로,
 * **메가스톤을 끼우거나 다이스프를 먹일 때** 그때 한 장만 받는다. 실패하면 null(원래 그림으로 보여줌).
 */
export async function ensureForm(monId, kind) {
  const f = FORMS[monId];
  const fid = f && f[kind];
  if (!fid) return null;
  if (formUrls.has(fid)) return formUrls.get(fid);
  const saved = (await getCharacters().catch(() => [])).find((c) => c.id === fid && c.blob);
  if (saved) {
    const url = URL.createObjectURL(saved.blob);
    formUrls.set(fid, url);
    return url;
  }
  try {
    const res = await fetch(ART_URL(fid), { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const made = await prepare(await res.blob());
    await putCharacter({ id: fid, ko: `form:${monId}:${kind}`, en: '', blob: made.blob, anchor: made.anchor, savedAt: Date.now() });
    const url = URL.createObjectURL(made.blob);
    formUrls.set(fid, url);
    return url;
  } catch (e) {
    console.warn('변신 그림 받기 실패:', monId, kind, e);
    return null;
  }
}

// ── 🎟️ 예고 포스터용 그림 ──
// 아직 못 잡은·명단에 없는 포켓몬도 보여줘야 하므로 따로 둔다.
// 저장 방식은 캐릭터·변신 그림과 같다 — **PokeAPI에서 한 번 받아 기기에만** (저장소에 파일을 두지 않는다).
const artUrls = new Map();

/** 받아둔 포스터 그림 주소 (없으면 null) */
export function artUrl(id) {
  return artUrls.get(Number(id)) || null;
}

/** 포스터 그림 한 장 확보. 실패하면 null (호출부가 이모지로 대체) */
export async function ensureArt(id) {
  const key = Number(id);
  if (!key) return null;
  if (artUrls.has(key)) return artUrls.get(key);
  const saved = (await getCharacters().catch(() => [])).find((c) => c.id === key && c.blob);
  if (saved) {
    const url = URL.createObjectURL(saved.blob);
    artUrls.set(key, url);
    return url;
  }
  try {
    const res = await fetch(ART_URL(key), { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const made = await prepare(await res.blob());
    // 명단(ROSTER)에 없는 id는 loadCharacters가 걸러내므로 도감·퍼즐에는 안 나온다
    await putCharacter({ id: key, ko: byKo(key), en: '', blob: made.blob, anchor: made.anchor, savedAt: Date.now() });
    const url = URL.createObjectURL(made.blob);
    artUrls.set(key, url);
    return url;
  } catch (e) {
    console.warn('포스터 그림 받기 실패:', key, e);
    return null;
  }
}

function byKo(id) {
  const r = ROSTER.find((x) => x.id === id);
  return r ? r.ko : `art:${id}`;
}

/** 여러 장을 한꺼번에 (실패한 건 조용히 건너뜀) */
export async function ensureCast(ids = []) {
  await Promise.all(ids.map((id) => ensureArt(id).catch(() => null)));
  return ids.map((id) => ({ id: Number(id), url: artUrl(id) })).filter((c) => c.url);
}

/** 앱을 열 때 이미 받아둔 변신 그림을 메모리에 올림 (오프라인에서도 보이게) */
export async function loadForms() {
  const known = new Set();
  for (const f of Object.values(FORMS)) { if (f.mega) known.add(f.mega); if (f.gmax) known.add(f.gmax); }
  const recs = await getCharacters().catch(() => []);
  for (const r of recs) {
    if (!r.blob || !known.has(r.id) || formUrls.has(r.id)) continue;
    formUrls.set(r.id, URL.createObjectURL(r.blob));
  }
  return formUrls.size;
}

export function unlockedRoster(level) {
  return ROSTER.filter((r) => (r.unlock || 1) <= level);
}

export function isUnlocked(id, level) {
  const r = ROSTER.find((m) => m.id === id);
  return !!r && (r.unlock || 1) <= level;
}

/** 다음 해금 레벨 (더 없으면 0) */
export function nextUnlockLevel(level) {
  const lv = [...new Set(ROSTER.map((r) => r.unlock || 1))].filter((u) => u > level).sort((a, b) => a - b);
  return lv.length ? lv[0] : 0;
}

/** 그 레벨에서 새로 열리는 마리 수 */
export function unlockCountAt(level) {
  return ROSTER.filter((r) => (r.unlock || 1) === level).length;
}

const ART_URL = (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
const STORE_SIZE = 256; // 원본 475px → 256px로 줄여 저장 (퍼즐에선 100px 이하로 보임, 용량 1/4)

let cache = null; // 로드된 캐릭터 [{ id, ko, en, url }] — 객체 URL은 앱이 살아 있는 동안 유지

/** 기기에 저장된 캐릭터 목록 (그림 객체 URL 포함). 없으면 [] */
export async function loadCharacters(force = false) {
  if (cache && !force) return cache;
  let recs = [];
  try { recs = await getCharacters(); } catch { recs = []; }
  const byId = new Map(ROSTER.map((r) => [r.id, r]));
  const usable = recs.filter((r) => r.blob && byId.has(r.id));
  cache = usable.map((r) => ({
    id: r.id, ko: byId.get(r.id).ko, en: byId.get(r.id).en, unlock: byId.get(r.id).unlock || 1,
    url: URL.createObjectURL(r.blob), anchor: r.anchor || null,
  }));
  // 예전에 받아둔 그림에는 머리 위치가 없다 — 조용히 계산해 채운다 (다시 받을 필요 없음)
  const missing = usable.filter((r) => !r.anchor);
  if (missing.length) {
    Promise.all(missing.map(async (r) => {
      const anchor = await anchorOf(r.blob);
      if (!anchor) return;
      await putCharacter({ ...r, anchor }).catch(() => {});
      const hit = cache && cache.find((c) => c.id === r.id);
      if (hit) hit.anchor = anchor;
    })).catch(() => {});
  }
  return cache;
}

/** 그림에서 찾아둔 머리 위치 (장식을 얹을 자리). 아직 못 받았거나 계산 전이면 null */
export function anchorFor(id) {
  if (!cache) return null;
  const c = cache.find((x) => x.id === id);
  return (c && c.anchor) || null;
}

/** 아직 안 받은 캐릭터 수 */
export async function missingCount() {
  const have = new Set((await loadCharacters()).map((c) => c.id));
  return ROSTER.filter((r) => !have.has(r.id)).length;
}

/** 큰 원본 PNG를 STORE_SIZE 정사각형 PNG로 축소 (안 되면 원본 그대로) */
/**
 * 그림에서 "머리 꼭대기"를 찾는다 → { x, y } (그림 크기에 대한 0~1 비율).
 *
 * 포켓몬마다 캔버스 안에서 머리 위치가 제각각이라(라프라스는 왼쪽 위, 파이리는 가운데)
 * 장식을 늘 가운데 위에 붙이면 엉뚱한 데 얹힌다. 위에서부터 처음 만나는 불투명 픽셀 줄을
 * 찾고, 그 줄 근처의 가로 중심을 머리로 본다. 대부분의 포켓몬은 머리·귀·뿔이 가장 높다.
 */
export function headAnchor(ctx, size) {
  let data;
  try { data = ctx.getImageData(0, 0, size, size).data; } catch { return null; }
  const A = 40; // 이 정도 불투명하면 그림의 일부
  let topY = -1;
  for (let y = 0; y < size && topY < 0; y++) {
    for (let x = 0; x < size; x++) {
      if (data[(y * size + x) * 4 + 3] > A) { topY = y; break; }
    }
  }
  if (topY < 0) return null;
  // 꼭대기에서 이만큼을 "머리"로 보고 가로 중심을 구한다.
  // 너무 얇으면(6%) 피카츄처럼 귀 한쪽만 잡혀 모자가 귀에 얹히고, 너무 두꺼우면(25%) 몸통이 섞인다.
  const band = Math.max(2, Math.round(size * 0.15));
  let sum = 0;
  let n = 0;
  for (let y = topY; y < Math.min(size, topY + band); y++) {
    for (let x = 0; x < size; x++) {
      if (data[(y * size + x) * 4 + 3] > A) { sum += x; n++; }
    }
  }
  if (!n) return null;
  return { x: +((sum / n) / size).toFixed(3), y: +(topY / size).toFixed(3) };
}

/** 큰 원본 PNG → 축소 PNG + 머리 위치 */
async function prepare(blob) {
  try {
    const bmp = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = STORE_SIZE;
    canvas.height = STORE_SIZE;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bmp, 0, 0, STORE_SIZE, STORE_SIZE);
    bmp.close();
    const anchor = headAnchor(ctx, STORE_SIZE);
    const out = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    return { blob: out || blob, anchor };
  } catch {
    return { blob, anchor: null };
  }
}

/** 이미 받아둔 그림에서 머리 위치만 뒤늦게 계산 (앱을 업데이트해도 다시 받지 않게) */
async function anchorOf(blob) {
  const r = await prepare(blob);
  return r.anchor;
}

/**
 * 명단 중 아직 없는 캐릭터를 인터넷에서 받아 저장. onProgress(done, total, name)
 * 반환: { ok: 받은 수, fail: 실패 수 } — 일부 실패해도 받은 것은 남고, 다시 누르면 없는 것만 이어서 받음
 */
export async function downloadCharacters(onProgress, limit) {
  const have = new Set((await loadCharacters()).map((c) => c.id));
  // limit이 있으면 그만큼만 — 한 번에 수십 마리를 받다 느린 와이파이에서 끊기면
  // 받은 것도 없이 끝나기 때문에, 자동 받기는 조금씩 나눠 받는다
  const todo = ROSTER.filter((r) => !have.has(r.id)).slice(0, limit && limit > 0 ? limit : undefined);
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < todo.length; i++) {
    const r = todo[i];
    if (onProgress) onProgress(i, todo.length, r.ko);
    try {
      const res = await fetch(ART_URL(r.id), { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const made = await prepare(await res.blob());
      await putCharacter({ id: r.id, ko: r.ko, en: r.en, blob: made.blob, anchor: made.anchor, savedAt: Date.now() });
      ok++;
    } catch (e) {
      console.warn('캐릭터 받기 실패:', r.ko, e);
      fail++;
    }
  }
  if (onProgress) onProgress(todo.length, todo.length, '');
  await loadCharacters(true);
  return { ok, fail };
}

/** 퍼즐 한 판에 쓸 캐릭터 n마리를 무작위로 (부족하면 있는 만큼) */
/**
 * 이미 받아 둔 그림의 주소 (없으면 null) — 표지처럼 한 마리만 쓰고 싶을 때.
 * loadCharacters()를 먼저 부르지 않았으면 캐시가 비어 있으니 null이다 (호출부가 이모지로 대체).
 */
export function characterUrl(id) {
  const c = (cache || []).find((x) => x.id === Number(id));
  return c ? c.url : null;
}

export function pickCharacters(chars, n, rng = Math.random) {
  const a = (chars || []).slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a.slice(0, n);
}
