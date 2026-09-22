// 🎮 포켓몬 캐릭터: 문장 퍼즐에서 단어를 "들고 있는" 캐릭터
// 그림(공식 일러스트)은 닌텐도 저작물이라 저장소에 넣지 않고, 앱이 처음 한 번 인터넷(PokeAPI 스프라이트)에서 받아
// 기기 IndexedDB에 보관한다 (영상과 같은 취급). 이후엔 오프라인에서도 사용.
import { getCharacters, putCharacter } from './db.js';

/**
 * 명단: 처음 40마리(Lv1) + 레벨 마일스톤에서 열리는 20마리씩(Lv5·10·15) + 2026-09-20에 더한 60마리(Lv1)
 *       + 2026-09-22 🔢 수학 전용 150마리(`subject: 'math'`, Lv1). unlock 없으면 1.
 * 여기에 추가하면 ⚙ "받기"가 없는 것만 받아옴. ★ 늘릴 때 battle.TYPE_OF(타입)·xp.RARITY_IDS(등급)도 같이 — 빠지면 조용히 노말·보통이 된다
 * 이름·타입·등급은 tools/roster_candidates.mjs·tools/math_roster.mjs(PokeAPI)로 받은 것만 쓴다 (기억으로 쓰면 틀린다)
 *
 * subject — 🎯 **어디서 잡히나**만 가른다: 없으면 영어(퍼즐 정답 뒤 잡기), 'math'면 수학(☀️ 완주·개념 편 통과 뒤 잡기).
 * 도감·파트너·배틀·꾸미기·상점·레벨·코인은 과목이 한 몸이다 (아버님 2026-09-22: "모으는 곳은 한 곳이어야 재미가 안 반감된다").
 * 왜 새 150을 더했나: 아이가 영어(쉬움·🎯 하루 4회)만 골라서, 수학에서만 만나는 얼굴이 있어야 수학으로 간다.
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

  // ── 2026-09-20 진우가 흔함·보통을 거의 다 잡아서 60마리 추가 (아버님 요청). 1~9세대 고르게, 전설 없음.
  //    등급은 PokeAPI 포획률로 — ≥120 흔함(42) · 45~119 보통(16, 스타터·아공이류) · <45 희귀(메타몽·앱솔). 전부 Lv1부터
  // 1세대
  { id: 10, ko: '캐터피', en: 'Caterpie' },
  { id: 16, ko: '구구', en: 'Pidgey' },
  { id: 50, ko: '디그다', en: 'Diglett' },
  { id: 60, ko: '발챙이', en: 'Poliwag' },
  { id: 74, ko: '꼬마돌', en: 'Geodude' },
  { id: 79, ko: '야돈', en: 'Slowpoke' },
  { id: 81, ko: '코일', en: 'Magnemite' },
  { id: 132, ko: '메타몽', en: 'Ditto' },
  // 2세대
  { id: 161, ko: '꼬리선', en: 'Sentret' },
  { id: 183, ko: '마릴', en: 'Marill' },
  { id: 185, ko: '꼬지모', en: 'Sudowoodo' },
  { id: 214, ko: '헤라크로스', en: 'Heracross' },
  { id: 216, ko: '깜지곰', en: 'Teddiursa' },
  { id: 228, ko: '델빌', en: 'Houndour' },
  { id: 241, ko: '밀탱크', en: 'Miltank' },
  // 3세대
  { id: 252, ko: '나무지기', en: 'Treecko' },
  { id: 255, ko: '아차모', en: 'Torchic' },
  { id: 258, ko: '물짱이', en: 'Mudkip' },
  { id: 263, ko: '지그제구리', en: 'Zigzagoon' },
  { id: 311, ko: '플러시', en: 'Plusle' },
  { id: 312, ko: '마이농', en: 'Minun' },
  { id: 359, ko: '앱솔', en: 'Absol' },
  // 4세대
  { id: 390, ko: '불꽃숭이', en: 'Chimchar' },
  { id: 399, ko: '비버니', en: 'Bidoof' },
  { id: 403, ko: '꼬링크', en: 'Shinx' },
  { id: 417, ko: '파치리스', en: 'Pachirisu' },
  { id: 418, ko: '브이젤', en: 'Buizel' },
  { id: 427, ko: '이어롤', en: 'Buneary' },
  { id: 443, ko: '딥상어동', en: 'Gible' },
  // 5세대
  { id: 501, ko: '수댕이', en: 'Oshawott' },
  { id: 506, ko: '요테리', en: 'Lillipup' },
  { id: 570, ko: '조로아', en: 'Zorua' },
  { id: 572, ko: '치라미', en: 'Minccino' },
  { id: 587, ko: '에몽가', en: 'Emolga' },
  { id: 607, ko: '불켜미', en: 'Litwick' },
  { id: 613, ko: '코고미', en: 'Cubchoo' },
  // 6세대
  { id: 653, ko: '푸호꼬', en: 'Fennekin' },
  { id: 661, ko: '화살꼬빈', en: 'Fletchling' },
  { id: 674, ko: '판짱', en: 'Pancham' },
  { id: 679, ko: '단칼빙', en: 'Honedge' },
  { id: 702, ko: '데덴네', en: 'Dedenne' },
  { id: 714, ko: '음뱃', en: 'Noibat' },
  // 7세대
  { id: 722, ko: '나몰빼미', en: 'Rowlet' },
  { id: 725, ko: '냐오불', en: 'Litten' },
  { id: 744, ko: '암멍이', en: 'Rockruff' },
  { id: 759, ko: '포곰곰', en: 'Stufful' },
  { id: 761, ko: '달콤아', en: 'Bounsweet' },
  { id: 777, ko: '토게데마루', en: 'Togedemaru' },
  // 8세대
  { id: 813, ko: '염버니', en: 'Scorbunny' },
  { id: 831, ko: '우르', en: 'Wooloo' },
  { id: 835, ko: '멍파치', en: 'Yamper' },
  { id: 872, ko: '누니머기', en: 'Snom' },
  { id: 877, ko: '모르페코', en: 'Morpeko' },
  { id: 885, ko: '드라꼰', en: 'Dreepy' },
  // 9세대
  { id: 909, ko: '뜨아거', en: 'Fuecoco' },
  { id: 915, ko: '맛보돈', en: 'Lechonk' },
  { id: 921, ko: '빠모', en: 'Pawmi' },
  { id: 926, ko: '쫀도기', en: 'Fidough' },
  { id: 940, ko: '찌리비', en: 'Wattrel' },
  { id: 957, ko: '어리짱', en: 'Tinkatink' },
  // ── 🔢 수학 전용 150마리 (2026-09-22, 아버님 결정: 기존 161은 그대로, 새 얼굴을 수학에서만 잡히게 — 흔함 60 · 보통 45 · 희귀 30 · 전설 15) ──
  // 이름·등급·타입은 tools/math_roster.mjs(PokeAPI 종 1..1025 캐시)로 받은 것만. 도감·파트너·배틀·꾸미기는 영어와 한 몸(subject는 🎯 잡기 후보에만 쓴다)
  { id: 17, ko: '피죤', en: 'Pidgeotto', subject: 'math' }, // 흔함 g1
  { id: 20, ko: '레트라', en: 'Raticate', subject: 'math' }, // 흔함 g1
  { id: 21, ko: '깨비참', en: 'Spearow', subject: 'math' }, // 흔함 g1
  { id: 27, ko: '모래두지', en: 'Sandshrew', subject: 'math' }, // 흔함 g1
  { id: 41, ko: '주뱃', en: 'Zubat', subject: 'math' }, // 흔함 g1
  { id: 43, ko: '뚜벅쵸', en: 'Oddish', subject: 'math' }, // 흔함 g1
  { id: 56, ko: '망키', en: 'Mankey', subject: 'math' }, // 흔함 g1
  { id: 77, ko: '포니타', en: 'Ponyta', subject: 'math' }, // 흔함 g1
  { id: 96, ko: '슬리프', en: 'Drowzee', subject: 'math' }, // 흔함 g1
  { id: 100, ko: '찌리리공', en: 'Voltorb', subject: 'math' }, // 흔함 g1
  { id: 111, ko: '뿔카노', en: 'Rhyhorn', subject: 'math' }, // 흔함 g1
  { id: 120, ko: '별가사리', en: 'Staryu', subject: 'math' }, // 흔함 g1
  { id: 163, ko: '부우부', en: 'Hoothoot', subject: 'math' }, // 흔함 g2
  { id: 170, ko: '초라기', en: 'Chinchou', subject: 'math' }, // 흔함 g2
  { id: 191, ko: '해너츠', en: 'Sunkern', subject: 'math' }, // 흔함 g2
  { id: 201, ko: '안농', en: 'Unown', subject: 'math' }, // 흔함 g2
  { id: 204, ko: '피콘', en: 'Pineco', subject: 'math' }, // 흔함 g2
  { id: 206, ko: '노고치', en: 'Dunsparce', subject: 'math' }, // 흔함 g2
  { id: 209, ko: '블루', en: 'Snubbull', subject: 'math' }, // 흔함 g2
  { id: 231, ko: '코코리', en: 'Phanpy', subject: 'math' }, // 흔함 g2
  { id: 261, ko: '포챠나', en: 'Poochyena', subject: 'math' }, // 흔함 g3
  { id: 262, ko: '그라에나', en: 'Mightyena', subject: 'math' }, // 흔함 g3
  { id: 276, ko: '테일로', en: 'Taillow', subject: 'math' }, // 흔함 g3
  { id: 287, ko: '게을로', en: 'Slakoth', subject: 'math' }, // 흔함 g3
  { id: 293, ko: '소곤룡', en: 'Whismur', subject: 'math' }, // 흔함 g3
  { id: 300, ko: '에나비', en: 'Skitty', subject: 'math' }, // 흔함 g3
  { id: 304, ko: '가보리', en: 'Aron', subject: 'math' }, // 흔함 g3
  { id: 320, ko: '고래왕자', en: 'Wailmer', subject: 'math' }, // 흔함 g3
  { id: 328, ko: '톱치', en: 'Trapinch', subject: 'math' }, // 흔함 g3
  { id: 361, ko: '눈꼬마', en: 'Snorunt', subject: 'math' }, // 흔함 g3
  { id: 396, ko: '찌르꼬', en: 'Starly', subject: 'math' }, // 흔함 g4
  { id: 404, ko: '럭시오', en: 'Luxio', subject: 'math' }, // 흔함 g4
  { id: 415, ko: '세꿀버리', en: 'Combee', subject: 'math' }, // 흔함 g4
  { id: 420, ko: '체리버', en: 'Cherubi', subject: 'math' }, // 흔함 g4
  { id: 431, ko: '나옹마', en: 'Glameow', subject: 'math' }, // 흔함 g4
  { id: 449, ko: '히포포타스', en: 'Hippopotas', subject: 'math' }, // 흔함 g4
  { id: 453, ko: '삐딱구리', en: 'Croagunk', subject: 'math' }, // 흔함 g4
  { id: 507, ko: '하데리어', en: 'Herdier', subject: 'math' }, // 흔함 g5
  { id: 509, ko: '쌔비냥', en: 'Purrloin', subject: 'math' }, // 흔함 g5
  { id: 519, ko: '콩둘기', en: 'Pidove', subject: 'math' }, // 흔함 g5
  { id: 551, ko: '깜눈크', en: 'Sandile', subject: 'math' }, // 흔함 g5
  { id: 580, ko: '꼬지보리', en: 'Ducklett', subject: 'math' }, // 흔함 g5
  { id: 595, ko: '파쪼옥', en: 'Joltik', subject: 'math' }, // 흔함 g5
  { id: 627, ko: '수리둥보', en: 'Rufflet', subject: 'math' }, // 흔함 g5
  { id: 659, ko: '파르빗', en: 'Bunnelby', subject: 'math' }, // 흔함 g6
  { id: 662, ko: '불화살빈', en: 'Fletchinder', subject: 'math' }, // 흔함 g6
  { id: 667, ko: '레오꼬', en: 'Litleo', subject: 'math' }, // 흔함 g6
  { id: 677, ko: '냐스퍼', en: 'Espurr', subject: 'math' }, // 흔함 g6
  { id: 710, ko: '호바귀', en: 'Pumpkaboo', subject: 'math' }, // 흔함 g6
  { id: 731, ko: '콕코구리', en: 'Pikipek', subject: 'math' }, // 흔함 g7
  { id: 736, ko: '턱지충이', en: 'Grubbin', subject: 'math' }, // 흔함 g7
  { id: 742, ko: '에블리', en: 'Cutiefly', subject: 'math' }, // 흔함 g7
  { id: 749, ko: '머드나기', en: 'Mudbray', subject: 'math' }, // 흔함 g7
  { id: 819, ko: '탐리스', en: 'Skwovet', subject: 'math' }, // 흔함 g8
  { id: 827, ko: '훔처우', en: 'Nickit', subject: 'math' }, // 흔함 g8
  { id: 833, ko: '깨물부기', en: 'Chewtle', subject: 'math' }, // 흔함 g8
  { id: 856, ko: '몸지브림', en: 'Hatenna', subject: 'math' }, // 흔함 g8
  { id: 924, ko: '두리쥐', en: 'Tandemaus', subject: 'math' }, // 흔함 g9
  { id: 938, ko: '빈나두', en: 'Tadbulb', subject: 'math' }, // 흔함 g9
  { id: 967, ko: '모토마', en: 'Cyclizar', subject: 'math' }, // 흔함 g9
  { id: 38, ko: '나인테일', en: 'Ninetales', subject: 'math' }, // 보통 g1
  { id: 55, ko: '골덕', en: 'Golduck', subject: 'math' }, // 보통 g1
  { id: 64, ko: '윤겔라', en: 'Kadabra', subject: 'math' }, // 보통 g1
  { id: 93, ko: '고우스트', en: 'Haunter', subject: 'math' }, // 보통 g1
  { id: 105, ko: '텅구리', en: 'Marowak', subject: 'math' }, // 보통 g1
  { id: 115, ko: '캥카', en: 'Kangaskhan', subject: 'math' }, // 보통 g1
  { id: 127, ko: '쁘사이저', en: 'Pinsir', subject: 'math' }, // 보통 g1
  { id: 128, ko: '켄타로스', en: 'Tauros', subject: 'math' }, // 보통 g1
  { id: 156, ko: '마그케인', en: 'Quilava', subject: 'math' }, // 보통 g2
  { id: 159, ko: '엘리게이', en: 'Croconaw', subject: 'math' }, // 보통 g2
  { id: 169, ko: '크로뱃', en: 'Crobat', subject: 'math' }, // 보통 g2
  { id: 184, ko: '마릴리', en: 'Azumarill', subject: 'math' }, // 보통 g2
  { id: 199, ko: '야도킹', en: 'Slowking', subject: 'math' }, // 보통 g2
  { id: 229, ko: '헬가', en: 'Houndoom', subject: 'math' }, // 보통 g2
  { id: 247, ko: '데기라스', en: 'Pupitar', subject: 'math' }, // 보통 g2
  { id: 256, ko: '영치코', en: 'Combusken', subject: 'math' }, // 보통 g3
  { id: 259, ko: '늪짱이', en: 'Marshtomp', subject: 'math' }, // 보통 g3
  { id: 319, ko: '샤크니아', en: 'Sharpedo', subject: 'math' }, // 보통 g3
  { id: 350, ko: '밀로틱', en: 'Milotic', subject: 'math' }, // 보통 g3
  { id: 371, ko: '아공이', en: 'Bagon', subject: 'math' }, // 보통 g3
  { id: 372, ko: '쉘곤', en: 'Shelgon', subject: 'math' }, // 보통 g3
  { id: 387, ko: '모부기', en: 'Turtwig', subject: 'math' }, // 보통 g4
  { id: 391, ko: '파이숭이', en: 'Monferno', subject: 'math' }, // 보통 g4
  { id: 394, ko: '팽태자', en: 'Prinplup', subject: 'math' }, // 보통 g4
  { id: 444, ko: '한바이트', en: 'Gabite', subject: 'math' }, // 보통 g4
  { id: 461, ko: '포푸니라', en: 'Weavile', subject: 'math' }, // 보통 g4
  { id: 470, ko: '리피아', en: 'Leafeon', subject: 'math' }, // 보통 g4
  { id: 471, ko: '글레이시아', en: 'Glaceon', subject: 'math' }, // 보통 g4
  { id: 498, ko: '뚜꾸리', en: 'Tepig', subject: 'math' }, // 보통 g5
  { id: 571, ko: '조로아크', en: 'Zoroark', subject: 'math' }, // 보통 g5
  { id: 614, ko: '툰베어', en: 'Beartic', subject: 'math' }, // 보통 g5
  { id: 625, ko: '절각참', en: 'Bisharp', subject: 'math' }, // 보통 g5
  { id: 634, ko: '디헤드', en: 'Zweilous', subject: 'math' }, // 보통 g5
  { id: 656, ko: '개구마르', en: 'Froakie', subject: 'math' }, // 보통 g6
  { id: 657, ko: '개굴반장', en: 'Frogadier', subject: 'math' }, // 보통 g6
  { id: 697, ko: '견고라스', en: 'Tyrantrum', subject: 'math' }, // 보통 g6
  { id: 701, ko: '루차불', en: 'Hawlucha', subject: 'math' }, // 보통 g6
  { id: 728, ko: '누리공', en: 'Popplio', subject: 'math' }, // 보통 g7
  { id: 745, ko: '루가루암', en: 'Lycanroc', subject: 'math' }, // 보통 g7
  { id: 776, ko: '폭거북스', en: 'Turtonator', subject: 'math' }, // 보통 g7
  { id: 816, ko: '울머기', en: 'Sobble', subject: 'math' }, // 보통 g8
  { id: 849, ko: '스트린더', en: 'Toxtricity', subject: 'math' }, // 보통 g8
  { id: 884, ko: '두랄루돈', en: 'Duraludon', subject: 'math' }, // 보통 g8
  { id: 912, ko: '꾸왁스', en: 'Quaxly', subject: 'math' }, // 보통 g9
  { id: 1000, ko: '타부자고', en: 'Gholdengo', subject: 'math' }, // 보통 g9
  { id: 34, ko: '니드킹', en: 'Nidoking', subject: 'math' }, // 희귀 g1
  { id: 36, ko: '픽시', en: 'Clefable', subject: 'math' }, // 희귀 g1
  { id: 76, ko: '딱구리', en: 'Golem', subject: 'math' }, // 희귀 g1
  { id: 157, ko: '블레이범', en: 'Typhlosion', subject: 'math' }, // 희귀 g2
  { id: 160, ko: '장크로다일', en: 'Feraligatr', subject: 'math' }, // 희귀 g2
  { id: 181, ko: '전룡', en: 'Ampharos', subject: 'math' }, // 희귀 g2
  { id: 208, ko: '강철톤', en: 'Steelix', subject: 'math' }, // 희귀 g2
  { id: 254, ko: '나무킹', en: 'Sceptile', subject: 'math' }, // 희귀 g3
  { id: 306, ko: '보스로라', en: 'Aggron', subject: 'math' }, // 희귀 g3
  { id: 330, ko: '플라이곤', en: 'Flygon', subject: 'math' }, // 희귀 g3
  { id: 375, ko: '메탕구', en: 'Metang', subject: 'math' }, // 희귀 g3
  { id: 392, ko: '초염몽', en: 'Infernape', subject: 'math' }, // 희귀 g4
  { id: 395, ko: '엠페르트', en: 'Empoleon', subject: 'math' }, // 희귀 g4
  { id: 405, ko: '렌트라', en: 'Luxray', subject: 'math' }, // 희귀 g4
  { id: 468, ko: '토게키스', en: 'Togekiss', subject: 'math' }, // 희귀 g4
  { id: 500, ko: '염무왕', en: 'Emboar', subject: 'math' }, // 희귀 g5
  { id: 503, ko: '대검귀', en: 'Samurott', subject: 'math' }, // 희귀 g5
  { id: 612, ko: '액스라이즈', en: 'Haxorus', subject: 'math' }, // 희귀 g5
  { id: 635, ko: '삼삼드래', en: 'Hydreigon', subject: 'math' }, // 희귀 g5
  { id: 655, ko: '마폭시', en: 'Delphox', subject: 'math' }, // 희귀 g6
  { id: 681, ko: '킬가르도', en: 'Aegislash', subject: 'math' }, // 희귀 g6
  { id: 706, ko: '미끄래곤', en: 'Goodra', subject: 'math' }, // 희귀 g6
  { id: 727, ko: '어흥염', en: 'Incineroar', subject: 'math' }, // 희귀 g7
  { id: 730, ko: '누리레느', en: 'Primarina', subject: 'math' }, // 희귀 g7
  { id: 815, ko: '에이스번', en: 'Cinderace', subject: 'math' }, // 희귀 g8
  { id: 818, ko: '인텔리레온', en: 'Inteleon', subject: 'math' }, // 희귀 g8
  { id: 823, ko: '아머까오', en: 'Corviknight', subject: 'math' }, // 희귀 g8
  { id: 908, ko: '마스카나', en: 'Meowscarada', subject: 'math' }, // 희귀 g9
  { id: 914, ko: '웨이니발', en: 'Quaquaval', subject: 'math' }, // 희귀 g9
  { id: 998, ko: '드닐레이브', en: 'Baxcalibur', subject: 'math' }, // 희귀 g9
  { id: 243, ko: '라이코', en: 'Raikou', subject: 'math' }, // 전설 g2
  { id: 244, ko: '앤테이', en: 'Entei', subject: 'math' }, // 전설 g2
  { id: 245, ko: '스이쿤', en: 'Suicune', subject: 'math' }, // 전설 g2
  { id: 379, ko: '레지스틸', en: 'Registeel', subject: 'math' }, // 전설 g3
  { id: 385, ko: '지라치', en: 'Jirachi', subject: 'math' }, // 전설 g3
  { id: 491, ko: '다크라이', en: 'Darkrai', subject: 'math' }, // 전설 g4
  { id: 492, ko: '쉐이미', en: 'Shaymin', subject: 'math' }, // 전설 g4
  { id: 494, ko: '비크티니', en: 'Victini', subject: 'math' }, // 전설 g5
  { id: 717, ko: '이벨타르', en: 'Yveltal', subject: 'math' }, // 전설 g6
  { id: 791, ko: '솔가레오', en: 'Solgaleo', subject: 'math' }, // 전설 g7
  { id: 792, ko: '루나아라', en: 'Lunala', subject: 'math' }, // 전설 g7
  { id: 807, ko: '제라오라', en: 'Zeraora', subject: 'math' }, // 전설 g7
  { id: 893, ko: '자루도', en: 'Zarude', subject: 'math' }, // 전설 g8
  { id: 1007, ko: '코라이돈', en: 'Koraidon', subject: 'math' }, // 전설 g9
  { id: 1008, ko: '미라이돈', en: 'Miraidon', subject: 'math' }, // 전설 g9
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

// ── 🌈 이로치 그림 (2026-09-22 4c) ──
// PokeAPI의 이로치 공식 일러스트를 변신 그림과 같은 방식으로 받아 기기에만 둔다. 같은 characters 스토어에 **문자열 키 "25:shiny"** 로 —
// 숫자 id(일반 그림)를 덮어쓰지 않고 새 스토어도 필요 없다 (Codex 7차 설계). loadCharacters는 명단 숫자 id만 보므로 섞이지 않는다.
const SHINY_URL = (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${id}.png`;
const shinyKey = (id) => `${Number(id)}:shiny`;
const shinyUrls = new Map(); // monId → object URL (받아 둔 것만)

/** 받아 둔 이로치 그림 주소 (없으면 null) — 동기·캐시만. 받는 건 ensureShiny */
export function shinyUrl(id) {
  return shinyUrls.get(Number(id)) || null;
}

/** 앱을 열 때 받아 둔 이로치 그림을 메모리에 올림 (오프라인에서도 보이게) */
export async function loadShiny() {
  const recs = await readAllOnce();
  for (const r of recs) {
    if (!r || r.variant !== 'shiny' || !r.blob || !r.monId || shinyUrls.has(r.monId)) continue;
    shinyUrls.set(Number(r.monId), URL.createObjectURL(r.blob));
  }
  return shinyUrls.size;
}

/** 이로치 그림을 확보한다 — 스톤을 쓴 그 한 마리만, 그때 받는다. 실패하면 null (일반 그림으로 보이고 ✨ 배지만) */
export async function ensureShiny(id) {
  const key = Number(id);
  if (!key) return null;
  if (shinyUrls.has(key)) return shinyUrls.get(key);
  const saved = (await getCharacters().catch(() => [])).find((c) => c && c.id === shinyKey(key) && c.blob);
  if (saved) {
    const url = URL.createObjectURL(saved.blob);
    shinyUrls.set(key, url);
    return url;
  }
  try {
    const res = await fetch(SHINY_URL(key), { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const made = await prepare(await res.blob());
    await putCharacter({ id: shinyKey(key), monId: key, variant: 'shiny', ko: `shiny:${key}`, en: '', blob: made.blob, anchor: made.anchor, savedAt: Date.now() });
    const url = URL.createObjectURL(made.blob);
    shinyUrls.set(key, url);
    return url;
  } catch (e) {
    console.warn('이로치 그림 받기 실패:', key, e);
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
// 시작 때 loadCharacters·loadForms·loadShiny가 같은 스토어를 세 번 통째로 읽지 않게 — 2초 안의 호출은 한 번의 읽기를 나눠 쓴다 (Codex 8차)
let recsOnce = null;
function readAllOnce() {
  if (!recsOnce) {
    recsOnce = getCharacters().catch(() => []);
    recsOnce.then(() => setTimeout(() => { recsOnce = null; }, 2000), () => { recsOnce = null; });
  }
  return recsOnce;
}

export async function loadForms() {
  const known = new Set();
  for (const f of Object.values(FORMS)) { if (f.mega) known.add(f.mega); if (f.gmax) known.add(f.gmax); }
  const recs = await readAllOnce();
  for (const r of recs) {
    if (!r.blob || !known.has(r.id) || formUrls.has(r.id)) continue;
    formUrls.set(r.id, URL.createObjectURL(r.blob));
  }
  return formUrls.size;
}

export function unlockedRoster(level) {
  return ROSTER.filter((r) => (r.unlock || 1) <= level);
}

const subjectById = new Map(ROSTER.map((r) => [r.id, r.subject === 'math' ? 'math' : 'english']));

/** 이 포켓몬은 어느 과목에서 잡히나 — 'math' | 'english' (명단에 없으면 영어) */
export function subjectOf(id) {
  return subjectById.get(id) || 'english';
}

/**
 * 🎯 잡기 후보 풀 — 그 과목에서 잡히는 것만 (subject 없으면 전체: ⚙ 연습·⚔️ 배틀 상대).
 * 목록은 "기기에 그림이 있는 캐릭터" 배열(loadCharacters)이든 명단이든 id만 있으면 된다.
 */
export function forSubject(list, subject) {
  if (!subject) return (list || []).slice();
  return (list || []).filter((c) => c && subjectOf(c.id) === subject);
}

/**
 * 🧩 퍼즐에 단어를 들고 나올 캐릭터 — 영어 것 + **이미 잡은** 수학 포켓몬 (잡은 뒤에는 어디든 놀러 온다).
 * 잡기 후보는 따로 forSubject(…, 'english')로 거른다 — 수학 포켓몬이 영어에서 또 잡히면 "수학에서만"이 무너진다.
 * @param {Array<{id:number}>} list 열린 캐릭터
 * @param {(id:number) => boolean} caught 잡았나
 */
export function forPuzzle(list, caught) {
  return (list || []).filter((c) => c && (subjectOf(c.id) === 'english' || (typeof caught === 'function' && caught(c.id))));
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
  try { recs = force ? await getCharacters() : await readAllOnce(); } catch { recs = []; }
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
export async function downloadCharacters(onProgress, limit, subject) {
  const have = new Set((await loadCharacters()).map((c) => c.id));
  // limit이 있으면 그만큼만 — 한 번에 수십 마리를 받다 느린 와이파이에서 끊기면
  // 받은 것도 없이 끝나기 때문에, 자동 받기는 조금씩 나눠 받는다.
  // subject('math')를 주면 그 과목 것부터 — 명단 뒤쪽의 수학 150마리가 영어 다음에 오므로, 수학 화면은 제 것을 먼저 받는다
  const todo = forSubject(ROSTER, subject).filter((r) => !have.has(r.id)).slice(0, limit && limit > 0 ? limit : undefined);
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
