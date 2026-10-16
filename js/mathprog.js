// 🔢 수학 진도 규칙 (순수 함수) — 화면(math.js)과 저장(db.js updateMath)이 이 규칙을 쓴다
//
// 개념 하나의 기록: { done, box, dueAt, passes, fails, lastAt }
//  - done: 처음으로 한 편(①②③⭐)을 **다 맞혀** "안다"가 된 상태. 사다리에서 다음 개념이 열린다
//  - box·dueAt: 영어 문장 복습과 같은 라이트너(1·2·4·7·14일). box가 GRADUATED(5)에 닿으면 👑 이해 완료
//  "정말로 이해한 게 맞는지 검증하고 또 검증"(아버님)이 곧 이 라이트너다 — 그날 맞힌 것은 "안다"이지 "이해 완료"가 아니다.

import { schedule, isDue, enroll, addDays, daysBetween, GRADUATED, STAGES } from './review.js';
import * as fractionGen from './mathgen.js';
import * as negativeGen from './mathneg.js';
import * as mixedGen from './mathmix.js';
import * as decimalGen from './mathdec.js';
import * as ratioGen from './mathrat.js';
import * as factorGen from './mathfac.js';
import * as correspondGen from './mathcor.js';
import * as areaGen from './matharea.js';
import * as shapeGen from './mathshape.js';
import * as dataGen from './mathdata.js';
import * as rangeGen from './mathrange.js';
import * as symGen from './mathsym.js';
import * as circleGen from './mathcircle.js';
import * as cuboidGen from './mathcuboid.js';
import * as solidGen from './mathsolid.js';
import * as exprGen from './mathexpr.js';
import * as equGen from './mathequ.js';
import * as coordGen from './mathcoord.js';
import * as spaceGen from './mathspace.js';
import * as fdivGen from './mathfdiv.js';
import * as fmulGen from './mathfmul.js';
import * as faddGen from './mathfadd.js';
import * as dmulGen from './mathdmul.js';
import * as ddivGen from './mathddiv.js';
import * as bigGen from './mathbig.js';
import * as angGen from './mathangle.js';
import * as mdGen from './mathmuldiv.js';
import * as mvGen from './mathmove.js';
import { rfOk } from './mathchal.js'; // 🔍 첫 선택 한 줄의 꼴 (Codex 64차) — mathchal.js는 아무것도 import하지 않는다

/**
 * 🌳 줄기 — 개념 사다리 하나 = 생성기 모듈 하나. 화면(math.js)은 `STEMS[key]`만 바꿔 끼운다 (2026-09-21, E 음수 3단계).
 *   list: 개념 배열 · gen: makeQuestion/makeRound/diagnosticSet/placeFrom/ladder 를 가진 모듈 · file: 사람이 쓴 내용
 *   lesson: true면 처음 배울 때 📖 이야기 대신 단계식 배움(gen.lessonOf)으로 — 처음 배우는 줄기 (아버님 결정 2026-09-20)
 * 개념 id는 줄기 접두사('frac.'·'neg.')로 갈라져 저장소(m.concepts)는 하나를 같이 쓴다.
 */
export const STEMS = {
  fraction: { key: 'fraction', code: 'A', label: '분수 줄기', range: '초4 → 초6', list: fractionGen.FRACTION, gen: fractionGen, file: './coach/math/fraction.json', lesson: false, intro: '분수 문제 5개를 먼저 풀어 볼게요. 어려운 게 나와도 괜찮아요 — 진우가 어디까지 아는지 보려는 거예요.' },
  negative: { key: 'negative', code: 'E', label: '음수 줄기', range: '중1', list: negativeGen.NEGATIVE, gen: negativeGen, file: './coach/math/negative.json', lesson: true, intro: '음수 문제 5개를 먼저 풀어 볼게요. 처음 보는 거면 못 풀어도 돼요 — 그러면 첫 개념부터 차근차근 배워요.' },
  // B 혼합계산 — 진우가 직접 만들어 달라고 한 줄기 (2026-09-23). 초5 자연수 → 초6 분수·소수
  mixed: { key: 'mixed', code: 'B', label: '혼합계산 줄기', range: '초5 → 초6', list: mixedGen.MIXED, gen: mixedGen, file: './coach/math/mixed.json', lesson: true, intro: '섞인 계산 문제 5개를 먼저 풀어 볼게요. 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  // C 소수 — 어머님 숙제(만점왕 4-2)의 지금 단원 · 🎯 도전 문제 3단원과 겹친다 (2026-09-30 아버님 결정). 초4 덧뺄 → 초6 나눗셈
  decimal: { key: 'decimal', code: 'C', label: '소수 줄기', range: '초4 → 초6', list: decimalGen.DECIMAL, gen: decimalGen, file: './coach/math/decimal.json', lesson: true, pick: '📏 진단 5문제 → 모르는 칸부터 한 장씩 배워요 (학교 소수 단원)', intro: '소수 문제 5개를 먼저 풀어 볼게요. 학교에서 배운 것도, 아직 안 배운 것도 있어요 — 어디부터 하면 될지 보려는 거예요.' },
  // F 비와 비율 — 비율 = 분수 = 소수 = 백분율이라 A·C를 다시 쓰며 굳힌다 · 문제 이야기는 진우의 게임(잡힐 확률 %, 🛒 할인) (2026-09-30 아버님 "진행 순서 제안대로"). 초6 9칸
  ratio: { key: 'ratio', code: 'F', label: '비와 비율 줄기', range: '초6', list: ratioGen.RATIO, gen: ratioGen, file: './coach/math/ratio.json', lesson: true, intro: '비와 비율 문제 5개를 먼저 풀어 볼게요. 처음 보는 말이 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  // G 약수와 배수 — A 분수의 약분·통분과 F의 간단한 자연수의 비가 최대공약수·최소공배수를 안다고 치는데 가르치는 칸이 없었다 (2026-09-30). 초5 8칸
  factor: { key: 'factor', code: 'G', label: '약수와 배수 줄기', range: '초5', list: factorGen.FACTOR, gen: factorGen, file: './coach/math/factor.json', lesson: true, intro: '약수와 배수 문제 5개를 먼저 풀어 볼게요. 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  // H 규칙과 대응 — F 비례식·중1 정비례·D 문자와 식이 "두 양의 대응 관계를 식으로 쓴다"를 안다고 치는데 가르치는 칸이 없었다 (2026-09-30 아버님 "다음 줄기로 규칙과 대응"). 초4 규칙 찾기 2칸 + 초5 6칸
  correspond: { key: 'correspond', code: 'H', label: '규칙과 대응 줄기', range: '초4 → 초5', list: correspondGen.CORRESPOND, gen: correspondGen, file: './coach/math/correspond.json', lesson: true, pick: '📏 진단 5문제 → 모르는 칸부터 한 장씩 배워요 (초4 규칙 찾기부터)', intro: '규칙과 대응 문제 5개를 먼저 풀어 볼게요. 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  // I 다각형의 둘레와 넓이 — 줄기 일곱 개가 전부 수·식이라 도형·측정 칸이 하나도 없었다 (2026-09-30 아버님 "「다각형의 둘레와 넓이」 줄기로 하자"). 초5 9칸
  area: { key: 'area', code: 'I', label: '둘레와 넓이 줄기', range: '초5', list: areaGen.AREA, gen: areaGen, file: './coach/math/area.json', lesson: true, pick: '📏 진단 5문제 → 모르는 칸부터 한 장씩 배워요 (둘레부터)', intro: '둘레와 넓이 문제 5개를 먼저 풀어 볼게요. 그림을 잘 보고, 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  // J 삼각형·사각형 — 도형 성질 칸이 없었고, I가 평행사변형·사다리꼴·마름모 이름과 포함관계를 안다고 친다 (2026-09-30 아버님 "새 줄기로 가자" → J). 초4-2 = 지금 학기, 9칸 + v268 ⭐ 활용 1칸
  shape: { key: 'shape', code: 'J', label: '삼각형·사각형 줄기', range: '초4', list: shapeGen.SHAPE, gen: shapeGen, file: './coach/math/shape.json', lesson: true, pick: '📏 진단 5문제 → 모르는 칸부터 한 장씩 배워요 (수직과 평행부터 — 학교 4-2 도형)', intro: '삼각형·사각형 문제 5개를 먼저 풀어 볼게요. 그림을 잘 보고, 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  // K 자료와 그래프 — 교과 영역 넷 중 자료와 가능성이 0칸이었다 · 지금 학기 4-2 5단원 꺾은선그래프 · 🎯 도전 문제 5단원과 그래프 그림을 같이 쓴다 (2026-10-01 아버님 "설계 가자"). 초4 → 초6 9칸
  data: { key: 'data', code: 'K', label: '자료와 그래프 줄기', range: '초4 → 초6', list: dataGen.DATA, gen: dataGen, file: './coach/math/data.json', lesson: true, pick: '📏 진단 5문제 → 모르는 칸부터 한 장씩 배워요 (막대그래프부터 — 학교 4-2 꺾은선그래프)', intro: '그래프 문제 5개를 먼저 풀어 볼게요. 눈금을 잘 보고, 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  // L 수의 범위와 어림하기 — 4-2(지금 학기)·5-1(다음 학기) 단원은 줄기가 다 있고 5-2 1단원이 처음 빈 자리 · 경계 수 넣기/빼기·자리·5·두 번 반올림처럼 오개념이 뚜렷하다 (2026-10-01 아버님 "L로 가자"). 초5 9칸
  range: { key: 'range', code: 'L', label: '수의 범위와 어림하기 줄기', range: '초5', list: rangeGen.RANGE, gen: rangeGen, file: './coach/math/range.json', lesson: true, pick: '📏 진단 5문제 → 모르는 칸부터 한 장씩 배워요 (이상과 이하부터 — 학교 5-2 첫 단원)', intro: '수의 범위와 어림 문제 5개를 먼저 풀어 볼게요. 수직선을 잘 보고, 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  // M 합동과 대칭 — 5-2에서 L 다음으로 빈 단원 · J의 모눈 도형을 그대로 쓰고 완성하기는 ✍️ 모눈 판에 직접 찍는다 (2026-10-01 아버님 "합동과 대칭 → 원의 넓이 → 직육면체·부피·겉넓이"). 초5 9칸
  sym: { key: 'sym', code: 'M', label: '합동과 대칭 줄기', range: '초5', list: symGen.SYM, gen: symGen, file: './coach/math/sym.json', lesson: true, pick: '📏 진단 5문제 → 모르는 칸부터 한 장씩 배워요 (도형의 합동부터 — 학교 5-2 3단원)', intro: '합동과 대칭 문제 5개를 먼저 풀어 볼게요. 모눈 그림을 잘 보고, 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  // N 원의 넓이 — I 다각형 넓이 · M 다음 도형·측정의 남은 큰 칸, 6-2 5단원 「원의 둘레와 넓이」 11차시로 범위 확인 (2026-10-02 아버님 "이대로 진행하자"). 초6 7칸, N1은 초3 복습 · 3.14 곱셈이 많아 C 소수 줄기가 먼저면 편하다
  circle: { key: 'circle', code: 'N', label: '원의 넓이 줄기', range: '초6', list: circleGen.CIRCLE, gen: circleGen, file: './coach/math/circle.json', lesson: true, pick: '📏 진단 5문제 → 모르는 칸부터 한 장씩 배워요 (원의 중심·반지름부터 — 학교 6-2 5단원 · C 소수 줄기를 먼저 하면 3.14 셈이 편해요)', intro: '원 문제 5개를 먼저 풀어 볼게요. 그림에서 반지름인지 지름인지 잘 보고, 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  // O 직육면체 → 부피·겉넓이 — N 다음 도형·측정의 마지막 큰 칸, 5-2 5단원 「직육면체」 + 6-1 6단원 「직육면체의 부피와 겉넓이」 지도서 흐름도로 범위 확인 (2026-10-02 아버님 "이대로 진행"). O1~O4 초5 · O5~O9 초6 · 겉넓이는 직사각형 넓이의 합이라 I 줄기가 먼저면 편하다
  cuboid: { key: 'cuboid', code: 'O', label: '직육면체 줄기', range: '초5 → 초6', list: cuboidGen.CUBOID, gen: cuboidGen, file: './coach/math/cuboid.json', lesson: true, pick: '📏 진단 5문제 → 모르는 칸부터 한 장씩 배워요 (직육면체와 정육면체부터 — 학교 5-2 5단원 · I 둘레와 넓이 줄기를 먼저 하면 겉넓이가 쉬워요)', intro: '직육면체 문제 5개를 먼저 풀어 볼게요. 그림의 점선(숨은 모서리)까지 잘 보고, 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  // P 입체도형 — O 다음 초6에 남은 입체 칸, 6-1 2단원 「각기둥과 각뿔」 + 6-2 6단원 「원기둥, 원뿔, 구」 지도서 흐름도·2022 성취기준으로 범위 확인(각뿔·원뿔 전개도는 안 다룸) (2026-10-02 아버님 "P 입체도형 줄기 가보자"). 초6 9칸 · 직육면체 겨냥도·전개도와 원주율을 다시 쓴다
  solid: { key: 'solid', code: 'P', label: '입체도형 줄기', range: '초6', list: solidGen.SOLID, gen: solidGen, file: './coach/math/solid.json', lesson: true, pick: '📏 진단 5문제 → 모르는 칸부터 한 장씩 배워요 (각기둥과 각뿔부터 — 학교 6-1 2단원 · O 직육면체 → N 원의 넓이 줄기를 먼저 하면 쉬워요)', intro: '입체도형 문제 5개를 먼저 풀어 볼게요. 그림의 점선(숨은 모서리)과 밑면을 잘 보고, 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  // D 문자와 식 — 처음부터 D 자리를 비워 둔 줄기, 중1 「문자의 사용과 식」 2022 성취기준 [9수02-01·02]로 범위 확인 (2026-10-03 아버님 "D 문자와 식 먼저 가고 다음에 일차방정식 가자").
  // 중1 9칸 · E 음수가 계수·대입에, H의 □·△ 식이 문자로 다시 나온다 · 수 답은 숫자판(± 늘 켬, mathpad.padSpec), 식 답은 보기 · 문자 분수는 세로로(mathdraw.richParts)
  expr: { key: 'expr', code: 'D', label: '문자와 식 줄기', range: '중1', list: exprGen.EXPR, gen: exprGen, file: './coach/math/expr.json', lesson: true, pick: '📏 진단 5문제 → 모르는 칸부터 한 장씩 배워요 (문자를 사용한 식부터 — 중1 · E 음수 줄기를 먼저 하면 쉬워요 · H 규칙과 대응의 □·△ 식이 문자로 바뀌어요)', intro: '문자와 식 문제 5개를 먼저 풀어 볼게요. 부호(−)와 괄호를 잘 보고, 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  // Q 일차방정식 — D 다음 칸, 중1 「일차방정식」 2022 성취기준 [9수02-03·04]로 범위 확인 (2026-10-03 아버님 "D 문자와 식 먼저 가고 다음에 일차방정식 가자").
  // 중1 9칸 · D의 분배법칙·동류항·괄호 앞 −가 풀이에, H의 □ 구하기가 방정식으로 · 해는 숫자판(± 늘 켬, mathpad.padSpec), 등식·바꾼 식은 보기 · 저울 그림 [scale](Q3·Q4·Q6)
  equation: { key: 'equation', code: 'Q', label: '일차방정식 줄기', range: '중1', list: equGen.EQU, gen: equGen, file: './coach/math/equation.json', lesson: true, pick: '📏 진단 5문제 → 모르는 칸부터 한 장씩 배워요 (등식과 방정식부터 — 중1 · D 문자와 식 줄기를 먼저 하면 쉬워요 · H 규칙과 대응의 □ 구하기가 방정식으로 바뀌어요)', intro: '일차방정식 문제 5개를 먼저 풀어 볼게요. 부호(−)와 괄호를 잘 보고, 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  // R 좌표평면과 그래프 — Q 다음 칸, 중1 「좌표평면과 그래프」 2022 성취기준 [9수02-05·06·07]로 범위 확인 (2026-10-05 아버님 "니가 추천하는 순서대로 가보자" → 설계안 "이대로 진행하자").
  // 중1 9칸 · E 음수가 좌표의 부호로, H 규칙과 대응의 식이 정비례·반비례로 · 수 답은 숫자판(± 늘 켬, mathpad.padSpec), 좌표·식·문장 답은 보기 · 좌표평면 그림 [plane] · R2 점 고르기는 ✍️ 좌표평면 판(drawview mode 'plane')
  coord: { key: 'coord', code: 'R', label: '좌표평면과 그래프 줄기', range: '중1', list: coordGen.COORD, gen: coordGen, file: './coach/math/coord.json', lesson: true, pick: '📏 진단 5문제 → 모르는 칸부터 한 장씩 배워요 (순서쌍과 좌표부터 — 중1 · E 음수 줄기를 먼저 하면 쉬워요 · H 규칙과 대응이 정비례·반비례로 바뀌어요)', intro: '좌표평면과 그래프 문제 5개를 먼저 풀어 볼게요. x좌표·y좌표의 순서와 부호(−)를 잘 보고, 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  // S 공간과 입체 — R 다음 칸, 초6 2학기 「공간과 입체」 미래엔 6-2 지도서 134~135쪽 흐름도·2022 성취기준 [6수03-09·10]으로 범위 확인 (2026-10-06 아버님 "다음 줄기 「공간과 입체」 해보자" → 설계안 "이대로 진행하자").
  // 초6 9칸 · O 직육면체의 쌓기나무 세기가 위·앞·옆에서 본 모양으로 · 개수는 숫자판, 방향·본 모양·쌓은 모양은 보기 · 쌓기나무 그림 [stack]·[views]·[top]·[layers] · 본 모양 고르기(S1·S2·S5)는 ✍️ 칸 칠하기 판(drawview mode 'cells', S1·S5는 v195)
  space: { key: 'space', code: 'S', label: '공간과 입체 줄기', range: '초6', list: spaceGen.SPACE, gen: spaceGen, file: './coach/math/space.json', lesson: true, pick: '📏 진단 5문제 → 모르는 칸부터 한 장씩 배워요 (어느 방향에서 보았나부터 — 학교 6-2 3단원 · O 직육면체 줄기를 먼저 하면 쉬워요)', intro: '공간과 입체 문제 5개를 먼저 풀어 볼게요. 보는 쪽(앞·옆·위)과 뒤에 숨은 쌓기나무를 잘 보고, 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  // T 분수의 나눗셈 — A 분수 줄기의 나눗셈은 두 칸뿐이고 배움 장이 없다 · "뒤집어 곱하기"만 외우면 까닭 없이 보기를 찍기 쉽다. 미래엔 6-1·6-2 지도서 86쪽 흐름도·2022 [6수01-10·11]로 범위 확인
  // (2026-10-06 아버님 "초등 줄기(분수의 나눗셈)를 먼저 하자" → 설계안 "이대로 진행하자"). 초6 9칸 · 사다리에서 A 바로 뒤 · 답은 숫자판(수·분수·대분수 칸, 약분 안 한 답도 맞음) · 나눗셈 막대 [fbar take|share|unit]은 배움·② 일부에만
  fracdiv: { key: 'fracdiv', code: 'T', label: '분수의 나눗셈 줄기', range: '초6', list: fdivGen.FDIV, gen: fdivGen, file: './coach/math/fracdiv.json', lesson: true, pick: '📏 진단 5문제 → 모르는 칸부터 한 장씩 배워요 (나눗셈의 몫을 분수로 나타내기부터 —학교 6-1·6-2 분수의 나눗셈 · A 분수 줄기(분수 × 분수까지)를 먼저 하면 쉬워요)', intro: '분수의 나눗셈 문제 5개를 먼저 풀어 볼게요. 무엇을 무엇으로 나누는지 잘 보고, 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  // U 분수의 곱셈 — A 분수 줄기의 곱셈도 두 칸뿐이고 배움 장이 없다 · 분수 × 자연수는 "분모에도 곱함" 같은 한 오개념에 몰리기 쉽다. 미래엔 5-2 지도서 134쪽 흐름도(12차시)·166쪽 넓이 모델·2022 [6수01-09]로 범위 확인
  // (2026-10-07 아버님 "분수의 곱셈 줄기(초5-2) 진행하자" → 설계안 "이대로 진행"). 초5 9칸 · 사다리에서 A 바로 뒤·T 앞(A → U → T) · 답은 숫자판(약분 안 한 답도 맞음) · 곱셈 그림 [fmul rep|part|area]은 배움·② 일부에만
  fracmul: { key: 'fracmul', code: 'U', label: '분수의 곱셈 줄기', range: '초5', list: fmulGen.FMUL, gen: fmulGen, file: './coach/math/fracmul.json', lesson: true, pick: '📏 진단 5문제 → 모르는 칸부터 한 장씩 배워요 (분수 × 자연수부터 — 학교 5-2 분수의 곱셈 · A 분수 줄기(약분·통분까지)를 먼저 하면 쉬워요)', intro: '분수의 곱셈 문제 5개를 먼저 풀어 볼게요. 무엇에 무엇을 곱하는지 잘 보고, 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  // V 분수의 덧셈·뺄셈 — A 분수 줄기의 덧셈·뺄셈은 진분수끼리 두 칸뿐이고(대분수·받아내림 없음) 배움 장이 없다 · 분모가 다른 분수의 덧셈·뺄셈은 "통분 없이 분자만 더함" 같은 한 오개념에 몰리기 쉽다.
  // 미래엔 4-2 교과서 1단원·5-1 지도서 248쪽 흐름도·2022 [4수01-15]·[6수01-08]로 범위 확인 (2026-10-07 아버님 "분수의 덧셈·뺄셈 줄기 가자" → 설계안 "이대로 진행").
  // V1~V5 초4 + v269 ⭐ 4학년 활용(받아내림 칸 뒤 · 5학년 칸을 막지 않음 · 진단에서 뺌) · V6~V9 초5 · 사다리에서 A 바로 뒤·U 앞(A → V → U → T) · 4학년 칸 답은 분모를 그대로 둔 꼴(숫자판은 약분한 답도 맞음) · 뺄셈 막대 [fsub]는 배움·② 일부에만
  fracadd: { key: 'fracadd', code: 'V', label: '분수의 덧셈·뺄셈 줄기', range: '초4 → 초5', list: faddGen.FADD, gen: faddGen, file: './coach/math/fracadd.json', lesson: true, pick: '📏 진단 5문제 → 모르는 칸부터 한 장씩 배워요 (분모가 같은 분수의 덧셈부터 — 학교 4-2 1단원·5-1 5단원 분수의 덧셈과 뺄셈 · 분모가 다른 칸은 A 분수 줄기를 먼저 하면 쉬워요)', intro: '분수의 덧셈·뺄셈 문제 5개를 먼저 풀어 볼게요. 더하는지 빼는지, 분모가 같은지 잘 보고, 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  // W 소수의 곱셈 — C 소수 줄기의 곱셈은 두 칸뿐이고 배움 장이 없다 · 소수의 곱셈은 "소수점 찍기" 오류(소수점을 빼먹음·자리 수를 더하지 않음)에 몰리기 쉽고 자리 수가 늘수록 많아진다(2022 미래엔 5-2 지도서).
  // 2015 미래엔 5-2 지도서 4단원 237쪽 차시 계획·2022 [6수01-13]으로 범위 확인 (2026-10-07 아버님 "Codex 37차를 먼저 끝낸 후에 W 설계부터" → 설계안 "이대로 진행").
  // 초5 8칸 · 사다리에서 C 소수 바로 뒤(C → W) · 답은 숫자판(끝자리 0을 지우지 않은 답도 맞음) · 고르기("곱이 N보다 큰 것은 어느 것")는 보기 그대로 · 소수 곱셈 그림 [dmul rep|band|area]은 배움·② 일부에만
  decmul: { key: 'decmul', code: 'W', label: '소수의 곱셈 줄기', range: '초5', list: dmulGen.DMUL, gen: dmulGen, file: './coach/math/decmul.json', lesson: true, pick: '📏 진단 5문제 → 모르는 칸부터 한 장씩 배워요 (소수 × 자연수부터 — 학교 5-2 4단원 소수의 곱셈 · C 소수 줄기(자릿값·10배와 1/10)를 먼저 하면 쉬워요)', intro: '소수의 곱셈 문제 5개를 먼저 풀어 볼게요. 무엇에 무엇을 곱하는지, 소수점이 어디에 있는지 잘 보고, 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  // X 소수의 나눗셈 — C 소수 줄기의 나눗셈은 두 칸뿐이고 배움 장이 없다 · 지도서가 꼽은 흔한 오류는 몫의 소수점 위치·몫의 0을 빠뜨림·0을 내리지 않고 멈춤·나누는 수만 옮김이다.
  // 2015 미래엔 지도서 6-1 3단원(169쪽)·6-2 3단원(183쪽) 차시 계획·2022 [6수01-14]·[6수01-15]로 범위 확인 (2026-10-07 아버님 "X 소수의 나눗셈 줄기 하자" → 설계안 "이대로 진행").
  // 초6 10칸(6-1 나누는 수가 자연수 X1~X5 · 6-2 나누는 수가 소수 X6~X10) · 사다리에서 W 소수의 곱셈 바로 뒤(C → W → X) · 답은 숫자판(끝자리 0을 지우지 않은 답도 맞음) · 고르기("몫이 N보다 큰 것은 어느 것")는 보기 그대로
  //   · 6-2 칸 글엔 "나머지" 대신 "나누어 주고 남는 양"(지도서 181쪽) · 나눗셈 그림 [ddiv share|fit]은 배움·② 일부에만
  decdiv: { key: 'decdiv', code: 'X', label: '소수의 나눗셈 줄기', range: '초6', list: ddivGen.DDIV, gen: ddivGen, file: './coach/math/decdiv.json', lesson: true, pick: '📏 진단 5문제 → 모르는 칸부터 한 장씩 배워요 (소수 ÷ 자연수부터 — 학교 6-1·6-2 3단원 소수의 나눗셈 · W 소수의 곱셈 줄기를 먼저 하면 쉬워요)', intro: '소수의 나눗셈 문제 5개를 먼저 풀어 볼게요. 무엇을 무엇으로 나누는지, 소수점이 어디에 있는지 잘 보고, 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  // Y 큰 수 — 사다리에 4-1 단원이 없었다 · 큰 수의 자릿값(네 자리씩 끊어 읽기)은 L 어림·AA 곱셈과 나눗셈의 바탕 · 지도서가 꼽은 흔한 오류는 자리 수를 잘못 셈·0인 자리를 빼고 씀·세 자리 쉼표와 네 자리 단위 혼동·앞자리만 비교다.
  // 2022 [4수01-01·02](진우 4학년 책이 2022판)·2015 비상 4-1 지도서 118쪽 흐름도로 범위 확인 (2026-10-08 아버님 "다음 줄기로 4-1 단원 시작하자" → 네 줄기 설계안 "이대로 진행하자").
  // 초4 8칸(10000 → 다섯 자리 수 → 십만·백만·천만 → 억 → 조 → 뛰어 세기 → 크기 비교 → ⭐ 활용) · 사다리에서 B 혼합계산 바로 앞(T → Y → B) · 8자리 이하 답은 숫자판, 9자리 이상·만/억/조를 섞어 쓴 꼴·읽은 말은 보기
  //   · 수는 9000조 미만·쉼표 없이 · 자릿값 표 [place]는 배움·② 일부에만
  bignum: { key: 'bignum', code: 'Y', label: '큰 수 줄기', range: '초4', list: bigGen.BIG, gen: bigGen, file: './coach/math/bignum.json', lesson: true, pick: '📏 진단 5문제 → 모르는 칸부터 한 장씩 배워요 (10000과 다섯 자리 수부터 — 학교 4-1 1단원 큰 수 · 큰 수는 일의 자리부터 네 자리씩 끊어 읽어요)', intro: '큰 수 문제 5개를 먼저 풀어 볼게요. 몇 자리 수인지, 숫자가 어느 자리에 있는지 잘 보고, 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  // Z 각도 — 사다리에 각도의 바탕(1°·각도기·예각과 둔각·어림·합과 차)이 없었다 — J 줄기의 "삼각형·사각형의 각의 합" 칸 하나뿐 · 지도서가 꼽은 흔한 오류는 변이 길면 각도도 크다고 봄·각도기의 반대쪽 눈금을 읽음·중심과 밑금을 안 맞춤·예각과 둔각을 바꿔 앎·잰 값의 오차다.
  // 천재 2022 4-1 지도서 2단원 11차시 흐름·2022 [4수03-02]·[4수03-24]·[4수03-25]로 범위 확인 (2026-10-08 아버님 "Z 각도 줄기의 칸별 설계안" → "이대로 진행").
  // 초4 8칸(각의 크기 비교 → 각도와 각도기 → 예각과 둔각 → 어림 → 합과 차 → 삼각형 180° → 사각형 360° → ⭐ 일직선과 ㉠) · 사다리에서 I 둘레와 넓이 다음·J 삼각형·사각형 바로 앞(I → Z → J) · 각도 답은 숫자판(단위 °), 어림·예각과 둔각 고르기("어느 것")는 보기
  //   · 각은 5의 배수·180° 이하(사각형의 합 360° 빼고) · J의 "각의 합" 칸은 그대로(4-2 응용) · 그림 [ang]·[fan]·[prot]·삼각형·사각형 ext(㉠)는 배움·문항 일부에
  angle: { key: 'angle', code: 'Z', label: '각도 줄기', range: '초4', list: angGen.ANGLE, gen: angGen, file: './coach/math/angle.json', lesson: true, pick: '📏 진단 5문제 → 모르는 칸부터 한 장씩 배워요 (각의 크기 비교부터 — 학교 4-1 2단원 각도 · 각의 크기는 변의 길이가 아니라 두 변이 벌어진 정도예요)', intro: '각도 문제 5개를 먼저 풀어 볼게요. 두 변이 얼마나 벌어졌는지 잘 보고, 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  // AA 곱셈과 나눗셈 — 4-1 네 단원 중 셋째 · (세 자리)×(두 자리)와 나누는 수가 두 자리인 나눗셈이 처음 나온다 · 지도서가 꼽은 흔한 오류는 몇을 곱한 결과가 0으로 끝날 때 0을 하나만 씀·부분곱의 자리·어림한 몫을 고치지 않음·나머지가 나누는 수보다 큼·몫을 십의 자리에 씀이다.
  // 천재 2022 4-1 지도서 3단원 차례·2022 [4수01-04]·[4수01-05]·[4수01-07]·[4수01-08]로 범위 확인 (2026-10-08 아버님 "그다음 줄기는 AA 곱셈과 나눗셈 시작하자" → 칸별 설계안 "이대로 진행하자").
  // 초4 8칸((세 자리)×(몇십) → ×(두 자리) → (두 자리)÷(두 자리) → ÷(몇십) → 몫 한 자리 → 몫 두 자리 → 어림 → ⭐ 활용) · 사다리에서 Y 큰 수 다음·B 혼합계산 바로 앞(Y → AA → B) ·
  //   · 곱은 다섯 자리·나누어지는 수는 세 자리까지 · 나머지가 있는 답은 "4 … 5"(숫자판 [몫 … 나머지]) · 세로셈 그림 [vmul]·[vdiv]는 배움·② 일부에만
  // AB 평면도형의 이동 — 4-1 네 단원의 마지막 · 처음으로 도형을 머릿속에서 움직여 본다(5-2 M 합동과 대칭의 바탕) · 연구·지도서가 꼽은 흔한 생각은 출발한 점도 셈·
  //   두 도형 사이의 빈칸을 민 길이로 봄·밀기를 뒤집기와 헷갈림·위쪽과 아래쪽으로 뒤집은 모양이 다르다고 봄·돌리는 방향을 반대로 봄·180° 돌리기를 위아래 뒤집기로 봄이다.
  // 천재 2022 4-1 지도서 4단원 12차시·2022 [4수03-04]·[4수03-05]로 범위 확인 (2026-10-09 아버님 "4-1의 마지막 줄기인 AB 평면도형의 이동을 설계부터" → 칸별 설계안 "이대로 진행").
  // 초4 8칸(점의 이동 → 밀기 → 뒤집기 → 뒤집기의 성질 → 돌리기 → 돌리기의 성질 → 무늬의 규칙 → ⭐ 활용) · 사다리에서 Z 각도 다음·J 삼각형·사각형 바로 앞(Z → AB → J — 90°·180°는 각도에서 배운다)
  //   · 두 움직임을 잇는 문항 없음(2022) · 답은 ㉠~㉣·말·수 · ✍️ 모눈점 찍기·모눈 칸 칠하기 판(drawview mpoint·mcells)
  move: { key: 'move', code: 'AB', label: '평면도형의 이동 줄기', range: '초4', list: mvGen.MOVE, gen: mvGen, file: './coach/math/move.json', lesson: true, pick: '📏 진단 5문제 → 모르는 칸부터 한 장씩 배워요 (점의 이동부터 — 학교 4-1 4단원 평면도형의 이동 · 돌린 도형은 위쪽 부분이 어디로 가는지 따라가요)', intro: '평면도형의 이동 문제 5개를 먼저 풀어 볼게요. 모눈과 모양을 잘 보고, 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
  muldiv: { key: 'muldiv', code: 'AA', label: '곱셈과 나눗셈 줄기', range: '초4', list: mdGen.MULDIV, gen: mdGen, file: './coach/math/muldiv.json', lesson: true, pick: '📏 진단 5문제 → 모르는 칸부터 한 장씩 배워요 ((세 자리 수) × (몇십)부터 — 학교 4-1 3단원 곱셈과 나눗셈 · 몇십을 곱하면 몇을 곱한 것의 10배예요)', intro: '곱셈과 나눗셈 문제 5개를 먼저 풀어 볼게요. 자리를 잘 맞추고, 어려운 게 나와도 괜찮아요 — 어디부터 배우면 될지 보려는 거예요.' },
};
export const STEM_ORDER = ['fraction', 'fracadd', 'fracmul', 'fracdiv', 'bignum', 'muldiv', 'mixed', 'decimal', 'decmul', 'decdiv', 'expr', 'negative', 'ratio', 'factor', 'correspond', 'area', 'angle', 'move', 'shape', 'data', 'range', 'sym', 'circle', 'cuboid', 'solid', 'equation', 'coord', 'space'];
/** 개념 id → 줄기 (없으면 null) */
export function stemOf(id) {
  return Object.values(STEMS).find((s) => s.list.some((c) => c.id === id)) || null;
}
/** 학년 표시 — 7은 중1 (mathneg.gradeLabel과 같은 규칙) */
export function gradeLabel(g) {
  return g >= 7 ? `중${g - 6}` : `초${g}`;
}

/** 보상 — 영어 쪽 규모에 맞춤 (문장 완료 +2, 퍼즐 정답 30, 복습 회차 30) */
export const REWARD = {
  q: { xp: 3, coin: 1 },          // 문항 하나 정답
  firstPass: { xp: 40, coin: 12 }, // 개념을 처음으로 다 맞힘 → 🎯 잡기 1회
  reviewPass: { xp: 25, coin: 8 }, // 복습에서 다 맞힘
  crown: { xp: 60, coin: 20 },     // 👑 이해 완료 (라이트너 졸업)
  diag: { xp: 2, coin: 1 },        // 진단 문항 정답
  fix: { xp: 1, coin: 0 },         // 🔁 틀린 뒤 풀이를 읽고 쌍둥이 문제를 맞힘 (편의 통과 여부는 안 바뀐다)
  daily: { xp: 20, coin: 6 },      // ☀️ 오늘의 수학 완주 — 하루 첫 번만. 복습 통과보다 작게 (누르기만으로 큰 보상이 되지 않게, 아버님 결정 2026-09-21)
  // 💎 스페셜 (2026-09-26) — 한 문제가 여러 걸음이라 문항 값을 개념 편보다 높게.
  // 🏅 배지 하나를 채우면 보너스 + 🔷 수학스톤 1, 여덟 개를 다 모으면 🏆 챔피언 보상 한 번
  special: { xp: 8, coin: 3 },
  badge: { xp: 50, coin: 20, stone: 1 },
  gym: { xp: 200, coin: 300, stone: 3, ball: 'masterball', beast: 1 }, // 🕳 울트라홀이 열린다 → ⚪ 비스트볼 하나를 함께 (첫 만남용)
};

/** 진단 결과로 "아는 것"으로 친 개념의 첫 복습까지 며칠 — 진단은 한 문제뿐이라 곧 다시 확인한다 */
export const PLACED_RECHECK_DAYS = 3;

/** 영상 제목 → 세계관 (없으면 null). 진우가 끝까지 본 영상만 문제에 출연시키려고 쓴다 */
export function worldOfTitle(title) {
  const t = String(title || '');
  if (/토이\s*스토리|toy\s*story/i.test(t)) return 'toystory';
  if (/미니언|minion/i.test(t)) return 'minions';
  if (/모아나|moana/i.test(t)) return 'moana';
  return null;
}

/** 끝까지 봤다고 칠 진행률(%) — 마지막 몇 문장은 자막 사고로 못 끝내는 일이 있어 100은 안 잡는다 */
export const SEEN_PCT = 90;

/**
 * 영상 목록·진행률에서 "본 영상 세계" 목록을 만든다.
 * @param {Array<{title:string, pct:number}>} summaries stats.contentSummary 결과
 * @returns {Object<string, string[]>} mathgen의 opts.worlds 모양 ({ toystory: [], ... }). 포켓몬은 항상 포함
 */
export function seenWorlds(summaries) {
  const out = { pokemon: [] };
  for (const s of (summaries || [])) {
    const w = worldOfTitle(s && s.title);
    if (w && (Number(s.pct) || 0) >= SEEN_PCT) out[w] = [];
  }
  return out;
}

export function doneIds(m) {
  return Object.entries((m && m.concepts) || {}).filter(([, v]) => v && v.done).map(([k]) => k);
}

// ── 🥚 배우는 중 → 🐣 안다 (2026-10-01, 아버님 결정 ②) ──
// 배운 날 첫 편을 다 맞힌 것은 배움 카드 바로 뒤 "따라 하기"라 이해의 증거가 아니다(배움 카드를 보고
// 바로 풀면 새 줄기 칸의 첫 편은 다 맞히기 쉽고, 그러면 줄기 하나를 금방 끝낼 수 있다). 그래서 배운 날 통과 = 🥚 배우는 중(box 0), 다음 날 이후 확인을 통과해야 🐣 안다(box ≥ 1).
// 아이콘은 이미 STAGES(🥚 🐣 🐥 ⭐ 🏅 👑) 그대로다 — 이름만 맞춘다. 데이터는 안 바뀌고 box로 계산한다(옮기기 없음).
// done은 그대로 "다음 칸이 열리는 조건"이고, 대신 한 줄기에 🥚가 LEARNING_MAX개면 새 칸을 잠근다(state 'wait').
/** 한 줄기에 동시에 둘 수 있는 🥚 배우는 중 칸 — 이만큼 차면 다음 칸은 확인한 뒤에 열린다 (9칸 줄기 ≈ 최소 5일) */
export const LEARNING_MAX = 2;

/**
 * 개념 하나의 단계.
 * 'learning' 🥚 배운 날 통과·확인 전(또는 확인에서 틀려 다시 0) / 'placed' 📏 진단으로 친 칸(확인 전) /
 * 'known' 🐣 다음 날 이후 확인을 통과 / 'crowned' 👑 / null 아직 못 배움
 */
export function stageOf(rec) {
  if (!rec || !rec.done) return null;
  const box = rec.box || 0;
  if (box >= GRADUATED) return 'crowned';
  if (rec.placed) return 'placed';
  return box >= 1 ? 'known' : 'learning';
}

/** 사다리 상태 + 각 개념의 복습 정보 (줄기별 — 기본은 분수) */
export function ladderOf(m, today, stem = 'fraction') {
  const done = doneIds(m);
  const S = STEMS[stem] || STEMS.fraction;
  const concepts = (m && m.concepts) || {};
  const base = S.gen.ladder(done);
  // 🥚가 LEARNING_MAX개면 새로 배울 칸(▶·○)을 잠근다 — 진단으로 친 칸(📏)은 세지 않는다
  const full = base.filter((row) => stageOf(concepts[row.id]) === 'learning').length >= LEARNING_MAX;
  return base.map((row) => {
    const rec = concepts[row.id] || null;
    const box = rec ? (rec.box || 0) : 0;
    const state = full && (row.state === 'now' || row.state === 'open') ? 'wait' : row.state;
    const stage = stageOf(rec);
    return {
      ...row,
      state,
      stage,
      box,
      left: Math.max(0, GRADUATED - box), // 👑까지 남은 확인 횟수
      crowned: !!rec && rec.done && box >= GRADUATED,
      due: !!rec && rec.done && isDue(rec, today),
      // 다음 확인까지 며칠 (오늘이면 0, 👑·못 배움은 null) — 사다리 칸이 "🔁 3일 뒤 확인하면 🔷"라고 말한다 (③)
      dueIn: rec && rec.done && rec.dueAt && box < GRADUATED ? Math.max(0, daysBetween(today, rec.dueAt)) : null,
      notes: rec && Array.isArray(rec.notes) ? rec.notes.length : 0, // 🤔 다시 볼 유형 수
      // 📏 진단으로 친 칸은 box 1로 시작해 🐣로 보였다 — 확인 전이라 📏로
      icon: stage === 'placed' ? '📏' : rec && rec.done ? STAGES[Math.min(box, STAGES.length - 1)] : (state === 'now' ? '▶' : state === 'open' ? '○' : '🔒'),
    };
  });
}

// ── ③ 복습 보상 안내 (2026-10-01, 아버님 "전부 진행") ──
// 🔷 수학스톤은 배운 날 첫 통과와 **확인 차례(dueAt)의 통과**에서만 나온다(stoneReward). 차례가 아닌 날 다시 풀면 연습이라
// ⚡💰뿐인데 아이 화면엔 그게 안 보여 "왜 이번엔 🔷가 없지?"가 된다 — 사다리 칸·연습 첫 화면·잠긴 날에 미리 말한다.
/** 날 수 → "내일" / "N일 뒤" */
function whenText(n) {
  return n <= 1 ? '내일' : `${n}일 뒤`;
}

/** 이 칸을 확인 차례에 통과하면 받는 🔷 — 지급 규칙(stoneReward)에 그대로 물어본다. 👑이 되는 마지막 확인은 +2 */
export function checkStones(row) {
  return stoneReward({ mode: 'review', result: { passed: true, crowned: !!row && row.left === 1 } });
}
const stonesText = (row) => { const n = checkStones(row); return `🔷${n > 1 ? n : ''}`; };

/** 사다리 칸 부제 (학년 뒤) — 언제 확인하고, 그때 무엇을 받는지 */
export function rungSub(r) {
  if (r.state === 'locked') return '앞 개념을 먼저 알아야 열려요';
  if (r.state === 'wait') return `🥚 배우는 중인 칸 ${LEARNING_MAX}개를 먼저 확인하면 열려요`;
  if (r.crowned) return '이해 완료!';
  const fresh = r.stage === 'learning' || r.stage === 'placed'; // 확인을 통과하면 🐣 "안다"가 되는 칸
  const st = stonesText(r);
  if (r.due) {
    if (fresh) return `🔁 오늘 확인! 통과하면 🐣 "안다" + ${st}`;
    return r.left === 1 ? `🔁 오늘 마지막 확인! 통과하면 👑 + ${st}` : `🔁 오늘 확인! 통과하면 ${st}`;
  }
  const when = r.dueIn ? whenText(r.dueIn) : '며칠 뒤';
  if (r.stage === 'learning') return `🥚 배우는 중 — ${when} 확인하면 🐣 + ${st}`;
  if (r.stage === 'placed') return `📏 진단에서 맞힌 칸 — ${when} 확인하면 🐣 + ${st}`;
  if (r.state === 'done') return r.left === 1 ? `알아요 · 🔁 ${when} 마지막 확인 — 통과하면 👑 + ${st}` : `알아요 · 🔁 ${when} 확인하면 ${st} (👑까지 ${r.left}번)`;
  return r.state === 'now' ? '지금 배울 차례' : '배울 수 있어요';
}

/**
 * 연습 편 첫 화면 한 줄 — 확인 차례가 아닌 아는 칸을 다시 풀 때만(applyRound가 practice로 판정하는 것과 같은 조건). 막지 않고 알리기만.
 * 🍀는 오늘 LUCKY.max번을 다 받았으면 말하지 않는다.
 * @returns {string|null}
 */
export function practiceNote(rec, today, luck, pay = 1) {
  if (!rec || !rec.done || isDue(rec, today)) return null;
  const clover = luck && luck.d === today && (Number(luck.n) || 0) >= LUCKY.max ? '' : ' (🍀 가끔 몬스터볼)';
  // 🔁 같은 날 둘째 편부터는 문항 ⚡💰가 줄어든다(repeatPay, v250) — "⚡💰만"이라 해 놓고 안 주지 않게
  const get = pay >= 1 ? '⚡💰만' : pay > 0 ? '⚡💰 반만' : '⚡💰 없이';
  if ((rec.box || 0) >= GRADUATED) return `👑 이해 완료한 칸이라 연습이에요 — ${get}${clover}`;
  const n = rec.dueAt ? Math.max(1, daysBetween(today, rec.dueAt)) : 1;
  return `연습이에요 — ${get}${clover}. 🔷는 ${whenText(n)} 확인 날에`;
}

// ── 🔁 같은 날 다시 풀기 · ⏹ 그만둔 편 (2026-10-13, 노가다 탈출구 막기 3단계, v250) ──
// 같은 날 같은 개념을 되풀이해 문항 ⚡💰를 캐는 길과, 틀린 뒤 ←·앱 닫기로 흔적 없이 새 편을 받는 길을 막는다.
// 다 맞혀 통과하는 편(처음·확인)은 늘 다 받는다 — 줄이는 것은 통과 못 한 편과 연습 편의 문항 몫뿐.

/** 개념 편 일지 줄의 mode — 끝낸 편(learn·review·practice)과 그만둔 편(quit) */
const CONCEPT_MODES = new Set(['learn', 'review', 'practice', 'quit']);
/** 같은 날 같은 개념 k번 푼 뒤의 편이 받는 문항 ⚡💰 몫 — 첫 편 다, 둘째 반, 셋째부터 0 */
export const REPEAT_PAY = [1, 0.5, 0];
export function repeatPay(k) {
  return REPEAT_PAY[Math.min(Math.max(0, Math.trunc(Number(k) || 0)), REPEAT_PAY.length - 1)];
}

/**
 * 그날(day) 이 개념을 이미 푼 편 수 — 일지에서 센다(끝낸 편 + 그만둔 편). 같은 편(rid)은 한 번만, 지금 편(rid)은 빼고.
 * 따로 카운터를 두지 않는다 — 일지는 기기·백업을 합칠 때 시각(t)으로 겹치지 않게 모이므로(mergeMath) 두 기기의 편이 다 세어지고,
 * 같은 백업을 다시 넣어도 늘지 않는다 (Codex 60차 PART 3의 "기기별 카운터를 max로 합쳐 더하기"와 같은 성질).
 * 날은 편을 **시작한 날** — 자정을 넘겨 끝낸 편은 일지에 sd(시작한 날)가 함께 있다, 그만둔 편의 d는 처음부터 시작한 날 (Codex 62차 #2).
 * 일지는 최근 LOG_MAX줄만 남지만 오늘 줄이 밀려나려면 하루에 그보다 많이 풀어야 한다(⏳ 하루 시간 안에서는 안 생긴다 — Codex 62차 #3①, 보류)
 */
export function sameDayRounds(m, id, day, rid) {
  const seen = new Set();
  let n = 0;
  for (const e of (m && Array.isArray(m.log) ? m.log : [])) {
    if (!e || e.id !== id || (e.sd || e.d) !== day || !CONCEPT_MODES.has(e.mode)) continue;
    if (e.rid !== undefined) {
      if (e.rid === rid || seen.has(e.rid)) continue;
      seen.add(e.rid);
    }
    n += 1;
  }
  return n;
}

/**
 * 이 개념을 그날 한 편 더 풀면 — { k: 이미 푼 편 수, pay: 문항 몫, practice: 연습 편인가, text: 첫 문항 위 한 줄(줄지 않으면 null) }
 * 화면이 편을 열 때와 "🤔 한 번 더" 단추에 미리 보여 준다 — 아이가 받기 전에 안다
 */
export function repeatNote(m, id, day) {
  const k = sameDayRounds(m, id, day);
  const pay = repeatPay(k);
  const rec = m && m.concepts && m.concepts[id];
  const practice = !!(rec && rec.done && !isDue(rec, day));
  const text = pay >= 1 ? null : practice
    ? `🔁 오늘 이 개념 ${k + 1}번째 편이라 문항 ⚡💰가 ${pay ? '반이에요' : '없어요'}`
    : `🔁 오늘 이 개념 ${k + 1}번째 편 — 다 맞혀 통과하면 ⚡💰를 다 받고, 아니면 문항 ⚡💰는 ${pay ? '반만 받아요' : '없어요'}`;
  return { k, pay, practice, text };
}

/**
 * 🥚 2칸 잠금이 걸린 날 사다리 위 안내 (잠금이 없으면 null). 🥚 칸 하나가 오늘 확인 차례면 오늘 풀 수 있다고 말한다.
 * @param {Array} rows ladderOf 결과
 */
export function waitNote(rows) {
  if (!(rows || []).some((r) => r.state === 'wait')) return null;
  const eggs = rows.filter((r) => r.stage === 'learning');
  // 몇 칸을 확인해야 열리나 — 🥚가 LEARNING_MAX보다 적어져야 한다. 확인에서 틀리면 🥚가 셋이 될 수 있어 "하나 확인하면"이 아니다.
  // "☀️에서"라고 하지 않는다 — ☀️는 한 칸만 확인하고, 🐣 칸이 먼저 뽑히기도 한다 (Codex 20차 #6)
  const need = Math.max(1, eggs.length - (LEARNING_MAX - 1));
  const which = need === 1 ? '🥚 칸 하나' : `🥚 칸 ${need}개`;
  if (eggs.some((r) => r.due)) return `🥚 오늘 확인할 🥚 칸이 있어요 — ${which}를 확인해서 통과하면 새 칸이 열려요`;
  const n = eggs.length ? Math.min(...eggs.map((r) => r.dueIn || 1)) : 1;
  // "새 칸은" — 오늘 할 다른 확인(🐣·👑)이 남아 있을 수 있어 "오늘은 여기까지"만 쓰면 다 끝난 줄 안다
  return `🥚 새 칸은 오늘 여기까지 — ${whenText(n)} ${which}를 확인해서 통과하면 열려요. 그동안 🎯 도전 문제 · 💎 스페셜 · 🌳 다른 줄기`;
}

/** 🔁 확인 편 문항 수 — 일곱 줄기는 한 편이 ①②뿐이라 확인이 두 문제였다(② 4지선다는 찍어도 25%). 난이도는 그대로, 증거를 두 배로 */
export const REVIEW_MIN = 4;

/**
 * 🔁 확인 편을 REVIEW_MIN문항까지 늘린다 (순수). 같은 개념·같은 수준에서 **다른 틀(key)** 부터, 모자라면 숫자만 다른 같은 틀.
 * 이미 그만큼이면(분수 줄기 ①②③⭐) 그대로. 순서는 원래 편 뒤에 덧붙인다(① ② ① ②).
 * @param {Array<{q:string, key?:string}>} qs 원래 편 (makeRound)
 * @param {(t:number) => Array} more t번째 다른 씨앗의 편
 */
export function widenRound(qs, more, min = REVIEW_MIN) {
  const out = [...(qs || [])];
  const keys = new Set(out.map((q) => q && q.key).filter(Boolean));
  const texts = new Set(out.map((q) => q && q.q));
  for (let pass = 0; pass < 2 && out.length < min; pass++) { // 0: 다른 틀만 · 1: 같은 틀이라도 문제 글이 다르면
    for (let t = 1; t <= 6 && out.length < min; t++) {
      for (const q of more(t + pass * 6) || []) {
        if (out.length >= min) break;
        if (!q || texts.has(q.q)) continue;
        if (pass === 0 && q.key && keys.has(q.key)) continue;
        out.push(q);
        texts.add(q.q);
        if (q.key) keys.add(q.key);
      }
    }
  }
  return out;
}

/** 오늘 다시 확인할(복습) 개념 id들 — 사다리 순서대로 */
export function dueIds(m, today, stem = 'fraction') {
  return ladderOf(m, today, stem).filter((r) => r.due).map((r) => r.id);
}

/** 지금 배울 개념 (사다리의 ▶). 다 끝났으면 null */
export function nowId(m, stem = 'fraction') {
  const row = ladderOf(m, '0000-00-00', stem).find((r) => r.state === 'now');
  return row ? row.id : null;
}

/** 진단을 아직 안 했는가 (줄기별) */
export function needsPlacement(m, strand = 'fraction') {
  return !(m && m.placed && m.placed[strand]);
}

/**
 * 📏 진단 결과 반영 — 틀린 가장 앞 개념 앞까지를 "안다"로 치되, 며칠 뒤 복습에서 **다시 확인**한다.
 * @param {object} m 복사본 (updateMath 안에서)
 * @param {Array<{concept:string, correct:boolean}>} answers
 */
export function applyPlacement(m, answers, today, strand = 'fraction', missTags = []) {
  const { startId, knownIds } = (STEMS[strand] || STEMS.fraction).gen.placeFrom(answers);
  m.placed = m.placed || {};
  m.placed[strand] = today;
  m.concepts = m.concepts || {};
  m.miss = m.miss || {};
  for (const id of knownIds) {
    if (m.concepts[id] && m.concepts[id].done) continue; // 이미 배운 것은 그대로
    m.concepts[id] = { done: true, box: 1, dueAt: addDays(today, PLACED_RECHECK_DAYS), passes: 1, fails: 0, lastAt: Date.now(), schedAt: Date.now(), placed: true };
  }
  // 진단에서 고른 오개념도 부모 화면에 쌓는다 (Codex 리뷰 #8 — 버려지고 있었다)
  for (const t of (missTags || [])) if (t) m.miss[t] = (m.miss[t] || 0) + 1;
  const ok = (answers || []).filter((a) => a && a.correct).length;
  pushLog(m, { d: today, t: Date.now(), id: 'diag', mode: 'diag', ok, n: (answers || []).length,
    // 🔢 진단도 숫자판 — 짐작한 값이 제일 궁금한 자리. 🤷 모르겠어요(w)·꼴(pf)도 일반 편과 같은 logQ로 (Codex 18차 #5 — w가 빠졌다)
    qs: (answers || []).map((a) => ({ ...logQ({ k: 'calc', ok: a.correct, tag: a.tag, w: a.w, p: a.p, g: a.g, pf: a.pf }), c: a.concept })) });
  return { startId, knownIds };
}

/**
 * 📒 회차 일지 — 한 편마다 한 줄. 아버님이 나중에 "어디서 자꾸 틀리다 언제 나아졌나"를 보려고 (2026-09-20 요청).
 * { d: 날짜, t: 시각, id: 개념|'diag', mode, ok, n, qs: [{ k: 얼굴, ok: 0|1, tag?: 오개념, c?: 진단 개념 }] }
 * 최근 LOG_MAX편만 — 한 줄이 200B 안팎이라 400편이면 80KB. 개념별 누적(kinds·miss)은 따로 있어 잘려도 요약은 남는다.
 */
export const LOG_MAX = 400;
/** 🤔 개념마다 남겨 두는 오답 노트 수 — 유형(틀)별로 하나씩이라 12면 넉넉하다 */
export const NOTES_MAX = 12;
/**
 * 지운 노트의 시각 — 옛 백업을 가져와도(mergeMath) 이미 고친 유형이 되살아나지 않게 (Codex 2차 #3).
 * { key: 지운 시각 }, 최근 NOTES_MAX개만
 */
export function markCleared(rec, key) {
  rec.cleared = rec.cleared || {};
  rec.cleared[key] = Date.now();
  const keys = Object.keys(rec.cleared);
  if (keys.length > NOTES_MAX) for (const k of keys.sort((a, b) => rec.cleared[a] - rec.cleared[b]).slice(0, keys.length - NOTES_MAX)) delete rec.cleared[k];
}
function pushLog(m, entry) {
  m.log = Array.isArray(m.log) ? m.log : [];
  m.log.push(entry);
  if (m.log.length > LOG_MAX) m.log.splice(0, m.log.length - LOG_MAX);
}
/**
 * 일지의 문항 한 줄 — { k 얼굴, ok, tag? 오개념, fx? 쌍둥이로 고침, sn? 🎯 감 잡기(1 맞음/0 틀림), w? 틀린 이유('s' 실수 / 'c' 헷갈림 / 'u' 몰랐음) }
 * (2026-09-21 ③: 계산 전에 "답이 양수일까 음수일까 / 1/2보다 클까"를 고르는 감 잡기와, 틀린 뒤 아이가 고르는 이유)
 */
/**
 * 짐작한 답(g)을 일지에 남기는 길이 — 판에 칠한 답이 끝까지 남아야 📊에서 다시 읽힌다.
 * 🧊 칠하기 판 "뒤 줄부터 ■■■ / ■■■ / ■■■" 21자(Codex 34차 #3) → 🔄 모눈 칸 칠하기 판은 칠한 칸을 감싼 네모를 줄마다 적어
 * 5 × 5 모양 판의 두 구석만 칠해도 43자, 가장 큰 자리 판(5 × 14)을 넓게 칠하면 "바뀐 모양 …" 115자 (Codex 44차 #1 — 24자에서 둘째 칸이 사라졌다)
 */
export const GUESS_MAX = 120;
function logQ(q) {
  return { k: q.k, ok: q.ok ? 1 : 0, ...(q.tag ? { tag: q.tag } : {}), ...(q.fx === undefined ? {} : { fx: q.fx ? 1 : 0 }), ...(q.sn === undefined ? {} : { sn: q.sn ? 1 : 0 }), ...(q.w ? { w: q.w } : {}),
    ...(q.w === 's' && q.sv !== undefined ? { sv: q.sv ? 1 : 0 } : {}), // 🙈 실수 확인 (v251)
    // 🔢 숫자판(2026-10-01) — p: 직접 쓴 답 · g: 어느 보기와도 다른 "짐작한 답"의 값 (오개념엔 안 넣고 부모가 보게)
    ...(q.p ? { p: 1 } : {}), ...(q.g ? { g: String(q.g).slice(0, GUESS_MAX) } : {}),
    // pf: 값은 맞는데 꼴('form' — 대분수로·소수로를 물었는데 다른 꼴) · 약분('reduce')만 틀림 — 짐작이 아니다 (Codex 18차 #4)
    ...(q.pf === 'form' || q.pf === 'reduce' ? { pf: q.pf } : {}) };
}
export const WHY_LABEL = { s: '실수', c: '헷갈림', u: '몰랐음' };
/**
 * 🙈 "실수"라고 한 오답을 노트·오개념에서 빼 주는가 (v251, 노가다 탈출구 막기 4단계 — Codex 62차 PART 3).
 * 새로 고른 실수는 확인 표시 sv를 단다 — 0 확인 전(쌍둥이를 아직 안 풀었거나 틀림·쌍둥이가 없는 문제·그만둠) · 1 같은 틀 쌍둥이를 맞힘.
 * 면제는 sv === 1일 때만. sv가 없는 옛 기록은 예전 뜻(면제) 그대로 — 소급하지 않는다
 */
export function slipExempt(q) {
  return !!q && !q.ok && q.w === 's' && q.sv !== 0;
}

// ── 💪 확인 편에서 한 번 틀려도 괜찮게 (2026-10-15, v262 — 아버님 "이대로 진행") ──
// 확인 편(문제를 다 맞혀야 통과)은 하나만 틀려도 한 칸 내려가는데, 틀린 뒤 ⏹ 그만두면 아무것도 안 바뀌었다 →
// 틀리면 바로 그만두고 새 편을 받는 쪽이 아이에게 덜 손해였다. 이제
//   · 하나만 틀리고 그 문제의 비슷한 문제(쌍둥이)를 맞히면 칸(box)·📏은 그대로, 내일 다시 (applyRound)
//   · 쌍둥이도 틀리거나 둘 넘게 틀리면 예전처럼 한 칸 내려간다
//   · 확인 차례에 틀린 뒤 그만두면 틀린 채 끝낸 확인 편과 같다 — 한 칸 내려가고 내일 다시 (applyQuit)
// 그래서 그만두는 것보다 쌍둥이를 푸는 쪽이 늘 낫다. 처음 배우기·연습 편은 그대로

/** 💪 칸을 지키나 — 틀린 문항이 꼭 하나이고 그 문항의 쌍둥이를 맞혔다(fx 1) */
export function keptReview(qs) {
  const wrong = (Array.isArray(qs) ? qs : []).filter((q) => q && !q.ok);
  return wrong.length === 1 && wrong[0].fx === 1;
}
/** 칸 그림 — 사다리와 같은 것(📏 진단으로 친 칸 · 🥚 🐣 🐥 ⭐ 🏅 👑) */
export function stageIcon(rec) {
  if (!rec) return '';
  return rec.placed ? '📏' : STAGES[Math.min(Math.max(0, rec.box || 0), STAGES.length - 1)];
}
/** 오늘 확인 차례인 칸이면 그 그림, 아니면 null — 화면이 편을 열 때 적어 두고 💪 말을 보일지 정한다(편 이름 'review'는 "🤔 한 번 더"에도 붙는다).
 *  푸는 중 기록에도 due로 남아, 그만둘 때 "확인 편이었나"를 정리하는 날이 아니라 연 날로 본다 (Codex 73차 #1) */
export function reviewKeep(rec, today) {
  return rec && rec.done && isDue(rec, today) ? stageIcon(rec) : null;
}
/**
 * 💪 같은 칸을 다른 창이 확인 편으로 열어 이미 틀린 채 풀고 있나(푸는 중 기록 due + 틀린 문항) — 그러면 이 편은 확인이 아니라 연습이다.
 * 오늘 확인은 먼저 틀린 편이 정한다 — 한 창에서 틀린 채 두고 다른 창에서 다 맞혀 칸을 올리지 못하게 (Codex 73차 #2).
 * 푸는 중 기록은 이 기기 것만이라 서로 다른 두 기기는 못 막는다(한계)
 */
export function rivalWrong(m, id, rid) {
  return Object.values((m && m.lives) || {}).some((l) => l && l.id === id && l.rid !== rid && l.due && (Array.isArray(l.qs) ? l.qs : []).some((q) => q && !q.ok));
}
/**
 * 💪 아이가 보는 말 — 지키는 것을 그림으로 보여 주고, 칸이 내려간다·몇 번째 같은 셈은 말하지 않는다
 * @param {string|null} icon reviewKeep·stageIcon
 * @param {'wrong'|'fixed'|'kept'} step 처음 틀렸을 때 · 쌍둥이를 맞혔을 때(left: 남은 문항 수) · 결과 카드
 */
export function keepLine(icon, step, left = 0) {
  if (!icon) return null;
  // 결과 보기를 누르기 전에는 "그대로예요"라고 못 박지 않는다 — 그 전에 ←로 나가면 못 통과다 (Codex 73차 #4)
  if (step === 'wrong') return `💪 괜찮아요! 한 문제는 틀려도 비슷한 문제를 맞히고 끝까지 풀면 ${icon} 그대로예요.`;
  if (step === 'fixed') return left > 0 ? `💪 좋아요! 남은 문제도 끝까지 맞히면 ${icon} 그대로예요.` : `💪 좋아요! [결과 보기]를 누르면 ${icon} 그대로예요.`;
  if (step === 'kept') return `💪 틀린 문제와 비슷한 문제를 맞혀서 ${icon} 그대로예요 — 내일 한 번 더 확인해요.`;
  return null;
}

/**
 * 문항 하나를 개념 기록에 반영 — 얼굴별(①②③⭐) 누적과 개념별 오개념("이 개념에서 어느 얼굴이 약한가"), 🤔 오답 노트.
 * 개념 편(applyRound)과 ☀️ 섞어 풀기(applyMixRound)가 같은 규칙을 쓴다. 통과·라이트너는 여기서 안 건드린다.
 */
function recordQ(rec, q, today) {
  if (!q || !q.k) return;
  rec.kinds = rec.kinds || {};
  rec.miss = rec.miss || {};
  rec.notes = Array.isArray(rec.notes) ? rec.notes : [];
  const kk = rec.kinds[q.k] || [0, 0];
  rec.kinds[q.k] = [kk[0] + (q.ok ? 1 : 0), kk[1] + 1];
  // 🙈 아이가 '실수로 눌렀어요'라고 한 오답(w:'s')은 오개념도 노트도 아니다 — 정답률(kinds)에만 남는다 (2026-09-21 ③ 틀린 이유 고르기)
  const slip = slipExempt(q); // 🙈 확인된 실수만 (v251)
  if (q.tag && !slip) rec.miss[q.tag] = (rec.miss[q.tag] || 0) + 1;
  // 🤔 오답 노트 — 틀린 문항의 틀(key)을 적어 두고, 다음 편에서 그 유형을 한 문제 다시 낸다.
  //    처음에 맞히면(ok) 노트에서 지운다 — 쌍둥이로 고친 것(fx)은 "바로 고침"으로만 표시하고 남겨 둔다 (며칠 뒤에도 맞아야 진짜)
  if (q.key) {
    const prev = rec.notes.find((n) => n.key === q.key);
    rec.notes = rec.notes.filter((n) => n.key !== q.key);
    if (!q.ok && !slip) rec.notes.push(noteOf(q, today, prev));
    else if (!q.ok && prev) rec.notes.push(prev); // 실수라고 했으면 있던 노트만 그대로 둔다
    else if (prev) markCleared(rec, q.key);
  }
  if (rec.notes.length > NOTES_MAX) rec.notes.splice(0, rec.notes.length - NOTES_MAX);
}
/** 🤔 노트 한 줄 — 끝낸 편(recordQ)과 그만둔 편(applyQuit)이 같은 꼴로 */
function noteOf(q, today, prev) {
  return { k: q.k, key: q.key, d: today, t: Date.now(), ...(prev && prev.again ? { again: prev.again } : {}), ...(q.tag ? { tag: q.tag } : {}), ...(q.fx === undefined ? {} : { fx: q.fx ? 1 : 0 }) };
}

/** 푸는 중으로 적어 두는 편 수 — 창마다 하나씩이라 넉넉하다. 넘으면 오래된 것부터 그만둠으로(칸은 안 건드린다 — 아직 푸는 창일 수 있다, Codex 73차 #3) */
export const LIVE_MAX = 4;
const loggedRid = (m, rid) => (Array.isArray(m.log) ? m.log : []).some((e) => e && e.rid === rid);
const dropLive = (m, rid) => {
  if (!m.lives || !m.lives[rid]) return;
  const rest = { ...m.lives };
  delete rest[rid];
  if (Object.keys(rest).length) m.lives = rest; else delete m.lives;
};

/**
 * ⏹ 푸는 중인 개념 편을 적어 둔다(답할 때마다, v250) — 앱을 닫아도 다음에 수학을 열 때 그만둔 편으로 남게 (Codex 60차 PART 3:
 * 닫는 순간의 저장에 기대지 말고 푸는 동안 적어 두기). **편마다 따로**(m.lives[rid]) — 두 창이 서로의 편을 덮거나 닫지 않게 (Codex 62차 #1).
 * 이미 끝냈거나 그만둔 편(일지에 그 rid)이면 **아무것도 안 바꾼다** — 늦게 도착한 저장이 되살리지도, 다른 편을 건드리지도 않게
 * @param {{rid:number, id:string, mode:string, d:string, n:number, due?:1, qs:Array}} live due: 연 날 확인 차례였나(reviewKeep, v262)
 */
export function setLive(m, live) {
  if (!live || !live.rid || !live.id) return false;
  if (loggedRid(m, live.rid)) return false;
  m.lives = { ...(m.lives || {}), [live.rid]: { ...live, qs: (Array.isArray(live.qs) ? live.qs : []).map((q) => ({ ...q })) } };
  const all = Object.values(m.lives).sort((a, b) => a.rid - b.rid);
  while (all.length > LIVE_MAX) applyQuit(m, all.shift(), live.d || '', { evict: true });
  return true;
}

/**
 * 정리할 때 둘 편 — 정리 대상(settle: 잠금을 보기 **전에** 본, 쥔 창이 없던 편)만 빼고 나머지는 다 둔다.
 * 잠금을 본 뒤에 다른 창이 막 시작해 적은 편은 settle에 없으니 그대로, 이 창이 푸는 편(cur)도 그대로 (Codex 63차 #3)
 * @param {Set<number>} settle
 */
export function liveKeep(m, settle, cur) {
  return new Set(Object.values((m && m.lives) || {}).map((l) => l && l.rid).filter((rid) => rid && (!settle.has(rid) || rid === cur)));
}

/**
 * 수학을 열 때 — 지금 쥔 창이 없는 푸는 중 편(keep에 없는 rid)을 그만둠으로 정리한다 (Codex 62차 #1).
 * keep = 다른 창이 Web Locks로 쥐고 있는 편 + 이 창이 푸는 편 — 살아 있는 창의 편은 닫지 않는다
 * @param {Set<number>} keep
 * @returns {number} 그만둠으로 적은 편 수
 */
export function settleLives(m, keep, today) {
  let n = 0;
  for (const live of Object.values(m.lives || {})) if (live && !(keep && keep.has(live.rid)) && applyQuit(m, live, today)) n += 1;
  return n;
}

/**
 * ⏹ 그만둔 개념 편 — 한 문제라도 답한 뒤 ←로 나갔거나 앱을 닫았다(다음에 수학을 열 때 정리). applyRound는 끝낸 편 규칙(통과·일정·보상)이라 따로 (Codex 60차 PART 3).
 * 일지에 'quit' 한 줄(그날 편 수에 들어간다 — 그만두고 다시 열어도 보상 단계가 처음으로 안 돌아간다) · 이미 틀린 문항은 🤔 노트에
 * (🙈 실수라고 한 것은 빼고 — recordQ와 같은 규칙, 이유를 고르기 전에 나갔으면 남긴다).
 * 얼굴별 누적·오개념 수·편 수·☀️·보상은 안 건드린다. 같은 편(rid)은 한 번만 — 일지에 그 rid가 있으면 아무것도 안 한다.
 * 💪 통과·실패 수·일정도 안 건드리지만 하나 다르다(v262): **확인 차례에 연 편에서 틀린 뒤** 그만두면 틀린 채 끝낸 확인 편과 같다 —
 * 한 칸 내려가고(📏도 지움) 내일 다시, 실패 +1, 일지 줄에 rf. 차례가 내일로 가니 그날 새 편을 받아 다 맞혀도 연습이 된다.
 * "확인 편"은 연 날의 표시(live.due)와 지금 저장된 칸(오늘도 차례인가) 둘 다로 본다 — 연습 편을 닫았다가 그 칸 차례인 날에 정리해도
 * 못 통과가 되지 않고(Codex 73차 #1), 다른 창이 먼저 끝내 차례가 지났으면 두 번 내리지 않는다.
 * 틀리기 전에 나갔거나, 처음 배우기·연습 편이면 예전 그대로. 푸는 중 편이 넘쳐 밀려난 편(o.evict)도 칸은 그대로 — 아직 푸는 창일 수 있다 (Codex 73차 #3)
 * @param {{rid:number, id:string, d:string, n:number, due?:1, qs:Array<{k:string, ok:0|1, key?:string, tag?:string, w?:string}>}} live 답한 문항까지
 * @param {{evict?:boolean}} [o]
 * @returns {boolean} 적었나
 */
export function applyQuit(m, live, today, o = {}) {
  if (!live || !live.rid || !live.id) return false;
  dropLive(m, live.rid);
  const qs = Array.isArray(live.qs) ? live.qs.filter(Boolean) : [];
  if (!qs.length) return false;
  if (loggedRid(m, live.rid)) return false;
  m.concepts = m.concepts || {};
  const rec = m.concepts[live.id] || { done: false, box: 0, dueAt: '', passes: 0, fails: 0, lastAt: 0 };
  // 💪 확인 차례에 연 편에서 틀린 뒤 그만둠 = 못 통과 (연 날의 표시 + applyRound가 확인 편을 가르는 것과 같은 조건 — 저장소에서 읽은 rec로)
  const failed = !o.evict && !!live.due && !!rec.done && isDue(rec, today) && qs.some((q) => !q.ok);
  if (failed) {
    Object.assign(rec, schedule(rec.box || 0, false, today));
    rec.schedAt = Date.now();
    rec.fails = (rec.fails || 0) + 1;
    delete rec.placed;
  }
  rec.notes = Array.isArray(rec.notes) ? rec.notes : [];
  for (const q of qs) {
    if (!q.key || q.ok || slipExempt(q)) continue;
    const prev = rec.notes.find((n) => n.key === q.key);
    rec.notes = rec.notes.filter((n) => n.key !== q.key);
    rec.notes.push(noteOf(q, today, prev));
  }
  if (rec.notes.length > NOTES_MAX) rec.notes.splice(0, rec.notes.length - NOTES_MAX);
  rec.lastAt = Date.now();
  m.concepts[live.id] = rec;
  pushLog(m, { d: live.d || today, t: Date.now(), rid: live.rid, id: live.id, mode: 'quit', ok: qs.filter((q) => q.ok).length, n: qs.length, of: Number(live.n) || qs.length, ...(failed ? { rf: 1 } : {}), qs: qs.map(logQ) });
  return true;
}

/**
 * 개념 한 편의 결과 반영.
 *
 * ★ 이미 아는 개념은 **오늘 복습 차례(dueAt ≤ today)일 때만** 라이트너가 움직인다. 차례가 아닌데 또 풀면
 *   `practice` — 기록·오개념은 남기되 box·dueAt은 그대로. 안 그러면 같은 날 여섯 번 풀어 👑을 받을 수 있고
 *   (Codex 리뷰 #1), 두 창이 같은 복습을 두 번 끝내면 두 번 올라간다. 판정은 저장소에서 읽은 rec로 하므로
 *   먼저 끝낸 창이 dueAt을 미루면 늦은 창은 자동으로 practice가 된다.
 * @param {object} m 복사본
 * @param {string} id 개념
 * @param {{correct:number, total:number, missTags:string[], qs?:Array<{k:string, ok:0|1, tag?:string}>, mode?:string}} r
 *   qs: 문항별 결과(얼굴·정오·고른 오개념) — 개념별 누적(kinds·miss)과 일지(log)에 남는다
 * @returns {{passed:boolean, first:boolean, crowned:boolean, review:boolean, practice:boolean, kept:boolean}} kept: 💪 확인 편에서 칸을 지킴 (v262)
 */
export function applyRound(m, id, r, today) {
  m.concepts = m.concepts || {};
  m.miss = m.miss || {};
  const rec = m.concepts[id] || { done: false, box: 0, dueAt: '', passes: 0, fails: 0, lastAt: 0 };
  const passed = r.total > 0 && r.correct === r.total;
  const wasDone = !!rec.done;
  const wasCrowned = wasDone && (rec.box || 0) >= GRADUATED;
  const wasStage = stageOf(rec);
  let review = false;
  let practice = false;
  let kept = false; // 💪 확인 편에서 하나만 틀리고 쌍둥이를 맞혀 칸을 지켰나 (v262)
  let late = 0; // ⏰ 확인 차례가 며칠 밀렸나 (확인 편만 — 일정을 바꾸기 전의 dueAt으로, v257)
  // ★ 일정(box·dueAt)이 바뀔 때만 schedAt을 올린다 — 백업 병합(mergeMath)은 일정을 schedAt이 최신인 쪽에서 가져온다.
  //   lastAt은 "마지막 활동"이라 연습·섞어 풀기도 올리는데, 그걸로 일정을 고르면 옛 상태의 기기가 나중에 연습만 해도 👑이 되돌아간다 (Codex 3차 #1)
  if (!wasDone) {
    if (passed) { rec.done = true; Object.assign(rec, enroll(today)); rec.schedAt = Date.now(); }
  } else if (isDue(rec, today) && !rivalWrong(m, id, r.rid)) { // 💪 다른 창이 이 칸 확인 편에서 이미 틀렸으면 연습 (Codex 73차 #2)
    review = true;
    late = Math.max(0, daysBetween(rec.dueAt, today));
    // 💪 정답 수와 문항 기록이 둘 다 "하나만 틀림"일 때만 — 통과는 아니라 실패 +1, 칸(box)·📏은 그대로 내일 다시 (v262)
    kept = !passed && r.total - r.correct === 1 && keptReview(r.qs);
    if (kept) rec.dueAt = addDays(today, 1);
    else Object.assign(rec, schedule(rec.box || 0, passed, today));
    rec.schedAt = Date.now();
  } else {
    practice = true; // 차례가 아닌 연습 — 일정은 안 건드린다
  }
  if (passed) rec.passes = (rec.passes || 0) + 1; else rec.fails = (rec.fails || 0) + 1;
  rec.lastAt = Date.now();
  // 📏 진단 표시는 일정이 바뀌는 확인(복습)에서만 지운다 — 연습으로 지우면 진단의 box 1이 그대로 🐣가 되어
  // 진단한 날 연습을 0/2로 틀려도 "안다"가 됐다 (Codex 19차 #2). 확인에서 틀리면 box 0 → 🥚로 돌아간다
  if (review && !kept) delete rec.placed; // 💪 지킨 📏는 그대로 — 지우면 box 1이 그대로 🐣 "안다"가 된다
  for (const q of (r.qs || [])) recordQ(rec, q, today);
  m.concepts[id] = rec;
  for (const t of (r.missTags || [])) if (t) m.miss[t] = (m.miss[t] || 0) + 1;
  m.rounds = (m.rounds || 0) + 1;
  const mode = practice ? 'practice' : review ? 'review' : (r.mode || 'learn');
  // rid: 화면이 편을 열 때 붙인 번호 — 그날 편 수(sameDayRounds)가 같은 편을 두 번 세지 않고, 적어 둔 푸는 중 편(m.lives[rid])을 여기서 닫는다 (v250)
  // sd: 자정을 넘겨 끝냈으면 시작한 날 — 편 수는 시작한 날로 센다(일정·☀️는 끝낸 날 today 그대로, Codex 62차 #2)
  if (r.rid) dropLive(m, r.rid);
  pushLog(m, { d: today, t: Date.now(), ...(r.rid ? { rid: r.rid } : {}), ...(r.day && r.day !== today ? { sd: r.day } : {}), id, mode, ok: r.correct, n: r.total, ...(kept ? { kp: 1 } : {}), qs: (r.qs || []).map(logQ) });
  const crowned = rec.done && (rec.box || 0) >= GRADUATED && !wasCrowned;
  // 🐣 방금 "안다"가 됐나 — 🥚 배우는 중·📏 진단으로 친 칸이 다음 날 이후 확인을 통과한 순간 (결과 카드가 축하한다)
  const known = (wasStage === 'learning' || wasStage === 'placed') && stageOf(rec) === 'known';
  return { passed, first: !wasDone && passed, crowned, review, practice, known, late, kept };
}

/** 이 편의 문항 ⚡💰 몫 (1 · 0.5 · 0) — 화면이 결과 카드에 까닭을 보여 줄 때도 */
export function roundPay(result) {
  return result && result.passed && !result.practice ? 1 : repeatPay(result && result.repeat);
}
/**
 * 한 편의 보상 계산 (지급은 화면이 한다). 차례가 아닌 연습(practice)은 정답 수만큼만.
 * 🔁 result.repeat = 그날 이 개념을 이미 푼 편 수(sameDayRounds, 화면이 트랜잭션 안에서 붙인다) — 다 맞혀 통과하는 편(처음·확인)이 아니면
 * 문항 몫이 repeatPay(둘째 반, 셋째부터 0)로 줄고, 통과·👑 보너스는 그대로 (v250)
 */
export function roundReward(result, correct) {
  const pay = roundPay(result);
  let xp = Math.floor(correct * REWARD.q.xp * pay);
  let coin = Math.floor(correct * REWARD.q.coin * pay);
  let catchOnce = false;
  if (result.practice) return { xp, coin, catchOnce };
  if (result.first) { xp += REWARD.firstPass.xp; coin += REWARD.firstPass.coin; catchOnce = true; }
  else if (result.review && result.passed) { xp += REWARD.reviewPass.xp; coin += REWARD.reviewPass.coin; }
  if (result.crowned) { xp += REWARD.crown.xp; coin += REWARD.crown.coin; }
  return { xp, coin, catchOnce };
}

/** 🤔 다음 편에서 다시 낼 오답 노트 하나 (가장 최근 것). 없으면 null */
export function nextNote(m, id) {
  const rec = m && m.concepts && m.concepts[id];
  const notes = rec && Array.isArray(rec.notes) ? rec.notes : [];
  return notes.length ? notes[notes.length - 1] : null;
}

/** 🤔 오답 노트 회차에 한 번에 내는 문항 수 */
export const NOTES_ROUND = 4;

/**
 * 🤔 오답 노트 회차에 낼 것 — **어제 이전에** 틀린 유형만 (같은 날은 그 개념을 다시 열 때 이미 한 번 끼어 든다).
 * 개념이 👑이거나 복습 차례가 아니어도 나온다 — 노트는 개념 일정과 따로 돈다. 오래된 것부터, 최대 NOTES_ROUND개.
 * @returns {Array<{id:string, note:object}>}
 */
export function dueNotes(m, today, limit = NOTES_ROUND) {
  const out = [];
  for (const [id, rec] of Object.entries((m && m.concepts) || {})) {
    for (const n of (rec && Array.isArray(rec.notes) ? rec.notes : [])) if (n && n.key && n.d && n.d < today) out.push({ id, note: n });
  }
  return out.sort((a, b) => (a.note.t || 0) - (b.note.t || 0)).slice(0, limit);
}

/** 모든 개념의 노트 수 (사다리 버튼·📊용). due: 어제 이전 것만 */
export function countNotes(m, today) {
  let all = 0; let due = 0;
  for (const rec of Object.values((m && m.concepts) || {})) {
    for (const n of (rec && Array.isArray(rec.notes) ? rec.notes : [])) { all++; if (n && n.d && today && n.d < today) due++; }
  }
  return { all, due };
}

/**
 * 🤔 오답 노트 회차 결과 반영 — 개념의 통과·라이트너는 건드리지 않는다 (연습). 맞히면 노트에서 지우고,
 * 틀리면 날짜를 오늘로 밀어 내일 이후에 다시 나오게 한다. 얼굴별 누적·오개념은 그 개념에 쌓이고, 일지에는 'notes' 한 줄.
 * @param {Array<{id:string, key:string, k:string, ok:0|1, tag?:string, fx?:0|1}>} qs
 */
export function applyNotesRound(m, qs, today) {
  m.concepts = m.concepts || {};
  m.miss = m.miss || {};
  let ok = 0;
  let resolved = 0; // 이 트랜잭션에서 **실제로 지운** 노트 수 — 다른 창이 먼저 지웠거나 같은 편을 두 번 내면 0 (Codex 6차 #1: 스톤·교환권이 두 번 나갔다)
  for (const q of (qs || [])) {
    if (!q || !q.id) continue;
    const rec = m.concepts[q.id];
    if (!rec) continue;
    if (q.ok) { ok++; if (Array.isArray(rec.notes) && rec.notes.some((n) => n.key === q.key)) resolved++; }
    recordNoteQ(m, rec, q, today);
  }
  pushLog(m, { d: today, t: Date.now(), id: 'notes', mode: 'notes', ok, n: (qs || []).length,
    qs: (qs || []).map((q) => ({ ...logQ(q), c: q.id })) });
  return { ok, total: (qs || []).length, resolved };
}

/**
 * 🤔 노트에서 다시 낸 문항 하나의 반영 — 노트 회차와 ☀️ 섞어 풀기가 같이 쓴다.
 * 맞히면 노트를 지우고(cleared), 실수는 그대로, 그 밖의 오답은 날짜를 오늘로 밀어 내일 이후에 다시.
 * ★ 노트가 없으면 새로 만든다 — 같은 편에서 같은 유형을 일반 문항으로 먼저 맞혀 지웠거나 다른 창이 지운 뒤라도,
 *   방금 틀린 건 틀린 것이다 (Codex 3차 #3). 시각은 cleared보다 뒤로 — 같은 밀리초면 병합이 "지운 것"으로 본다.
 */
function recordNoteQ(m, rec, q, today) {
  rec.kinds = rec.kinds || {};
  rec.miss = rec.miss || {};
  rec.notes = Array.isArray(rec.notes) ? rec.notes : [];
  if (q.k) { const kk = rec.kinds[q.k] || [0, 0]; rec.kinds[q.k] = [kk[0] + (q.ok ? 1 : 0), kk[1] + 1]; }
  if (q.ok) { rec.notes = rec.notes.filter((n) => n.key !== q.key); markCleared(rec, q.key); return; }
  if (slipExempt(q)) return; // 🙈 쌍둥이로 확인된 실수 — 노트는 그대로, 오개념도 안 쌓는다 (확인 전이면 틀린 것처럼, v251)
  if (q.tag) { rec.miss[q.tag] = (rec.miss[q.tag] || 0) + 1; m.miss[q.tag] = (m.miss[q.tag] || 0) + 1; }
  const t = Math.max(Date.now(), ((rec.cleared && rec.cleared[q.key]) || 0) + 1);
  const n = rec.notes.find((x) => x.key === q.key);
  if (n) { n.d = today; n.t = t; n.again = (n.again || 0) + 1; if (q.tag) n.tag = q.tag; if (q.fx !== undefined) n.fx = q.fx ? 1 : 0; }
  else rec.notes.push({ k: q.k, key: q.key, d: today, t, again: 1, ...(q.tag ? { tag: q.tag } : {}), ...(q.fx === undefined ? {} : { fx: q.fx ? 1 : 0 }) });
  if (rec.notes.length > NOTES_MAX) rec.notes.splice(0, rec.notes.length - NOTES_MAX);
}

// ───────────────────── ☀️ 오늘의 수학 (2026-09-21, 아이디어 ④) ─────────────────────
//
// 버튼 하나로 "오늘 할 것": 개념 편 하나 → 🎲 섞어 풀기. 편 하나는 같은 개념 4문항이라 아이가 "이건 통분 문제겠지"를
// 미리 안다 — 개념이 뒤섞인 문항은 "어떤 개념인지 알아내기"까지 풀게 한다(interleaving).
// ★ 섞어 풀기는 **연습**이다(아버님 결정): 1문항 정답으로 👑 확인 횟수를 올리면 "검증하고 또 검증"이 약해진다.
//   box·dueAt은 안 건드리고 얼굴별 누적·오개념·🤔 노트·일지만 남는다. 👑은 🔁 4문항 복습이 맡는다.

/** 🎲 섞어 풀기에 낼 아는 개념 수 (각 1문항) — 개념 편 4 + 여기 4 = 하루 10분 안팎 */
export const MIX_CONCEPTS = 3;
export const KINDS = ['calc', 'misread', 'why', 'special'];

/** 이 정답률부터는 "튼튼한 얼굴" — 약한 얼굴이 없으면 튼튼한 것끼리는 씨앗으로 돌린다 (3문항 미만은 이 사이 값이 나올 수 없다) */
export const STRONG_RATE = 0.9;

/**
 * 개념의 **약한 얼굴**부터 늘어놓은 순서 — 안 해 본 얼굴(n=0)이 먼저, 그다음 정답률 낮은 순. 동률은 씨앗으로.
 * 화면은 이 순서대로 문항을 만들어 보고 첫 성공을 쓴다(⭐특별은 사람이 안 쓴 개념도 있어 null이 날 수 있다).
 * ★ 누적 정답률은 한 번 틀린 자국이 영원히 남는다(9/10 = 90%) — 그대로 두면 그 얼굴만 매일 나온다 (Codex 3차 C).
 *   그래서 STRONG_RATE 이상은 모두 같은 "튼튼함"으로 보고 씨앗으로 돌린다.
 */
export function weakKinds(rec, r = Math.random) {
  const kinds = (rec && rec.kinds) || {};
  return KINDS.map((k) => {
    const a = kinds[k] || [0, 0];
    const n = a[1] || 0;
    const rate = n ? a[0] / n : -1;
    return { k, n, rate: rate >= STRONG_RATE ? 1 : rate, tie: r() };
  })
    .sort((a, b) => (a.n === 0) !== (b.n === 0) ? (a.n === 0 ? -1 : 1) : a.rate !== b.rate ? a.rate - b.rate : a.tie - b.tie)
    .map((x) => x.k);
}

// ── ⏰ 밀린 복습 (2026-10-14, 아버님 "기본안 1~4대로", v257) ──
// 줄기 고르는 화면에 밀린 복습이 안 보이고 ☀️도 고른 줄기 안에서만 고르면, 다른 줄기를 고르는 사이 어떤 줄기의 복습은 계속 밀릴 수 있다
// → ① 줄기 화면에 밀린 복습 수 ② ☀️는 줄기와 상관없이 복습 날짜가 가장 이른 칸부터 ③ 복습 날짜가 오래 지난 칸을 통과하면 💰 조금 더
// ④ 교과서에서 흔히 헷갈리는 옛 분수 칸은 그림으로 한 장씩 배우는 줄기로 잇는다. 막지 않고 보이고 이끈다(잠금 대신 보상).

/** 줄기마다 오늘 복습 차례인 칸 — [{ key, due: 칸 수, oldest: 가장 이른 dueAt, late: 그게 며칠 지났나 }] (밀린 것만, 오래된 줄기부터 · 같으면 STEM_ORDER) */
export function stemDueList(m, today) {
  const concepts = (m && m.concepts) || {};
  const out = [];
  STEM_ORDER.forEach((key, i) => {
    const due = ladderOf(m, today, key).filter((r) => r.due);
    if (!due.length) return;
    const oldest = due.map((r) => (concepts[r.id] || {}).dueAt || today).sort()[0];
    out.push({ key, due: due.length, oldest, late: Math.max(0, daysBetween(oldest, today)), i });
  });
  return out.sort((a, b) => (a.oldest < b.oldest ? -1 : a.oldest > b.oldest ? 1 : a.i - b.i)).map(({ i, ...x }) => x);
}

/** 🌳 줄기 고르는 화면의 차례 — 밀린 복습이 있는 줄기를 오래된 것부터 위로, 나머지는 원래 차례 */
export function stemPickOrder(m, today) {
  const first = stemDueList(m, today).map((x) => x.key);
  return [...first, ...STEM_ORDER.filter((k) => !first.includes(k))];
}

/**
 * ☀️가 고를 복습 — 줄기와 상관없이 dueAt이 가장 이른 칸 하나. 같은 날이면 지금 줄기(prefer) 먼저, 그다음 STEM_ORDER·사다리 차례.
 * @returns {{id:string, stem:string, dueAt:string, late:number}|null}
 */
export function oldestDue(m, today, prefer) {
  const concepts = (m && m.concepts) || {};
  const keys = [...(STEMS[prefer] ? [prefer] : []), ...STEM_ORDER.filter((k) => k !== prefer)];
  let best = null;
  for (const key of keys) {
    for (const r of ladderOf(m, today, key)) {
      if (!r.due) continue;
      const dueAt = (concepts[r.id] || {}).dueAt || today;
      if (!best || dueAt < best.dueAt) best = { id: r.id, stem: key, dueAt };
    }
  }
  return best ? { ...best, late: Math.max(0, daysBetween(best.dueAt, today)) } : null;
}

/** ⏰ 오래 밀린 복습 보너스 — 복습 날짜가 days일 이상 지난 칸을 확인 차례에 통과하면 💰coin, 하루 max번 (🍀처럼 하루 횟수는 m.late = {d, n}) */
export const LATE = { days: 7, coin: 5, max: 3 };

/**
 * 오늘 남은 ⏰ 보너스 횟수. 적힌 날이 오늘보다 **뒤**면 0 — 시계를 되돌리거나 미래 날짜 기록이 합쳐져 들어와도
 * 이미 쓴 날의 횟수가 다시 열리지 않게 (그 기록은 그대로 둔다, Codex 68차 #3)
 */
export function lateLeft(m, today) {
  if (m && m.late && m.late.d && today && m.late.d > today) return 0;
  const used = m && m.late && m.late.d === today ? Number(m.late.n) || 0 : 0;
  return Math.max(0, LATE.max - used);
}

/**
 * ⏰ 이 편이 받는 보너스 💰 — 트랜잭션 안에서 부른다(하루 횟수를 올린다). 확인 차례(review)를 통과했고 복습 날짜가 LATE.days일 이상 지났을 때만.
 * 연습·처음 배우기·못 통과한 편은 0 — 일부러 밀려 두는 길이 되지 않게 보너스는 작고 하루 max번
 */
export function lateBonus(m, { mode, result, today }) {
  if (!today || (mode !== 'learn' && mode !== 'review')) return 0;
  if (!result || !result.review || !result.passed || !((Number(result.late) || 0) >= LATE.days)) return 0;
  if (!lateLeft(m, today)) return 0;
  const used = m.late && m.late.d === today ? Number(m.late.n) || 0 : 0;
  m.late = { d: today, n: used + 1 }; // 새 객체로 — cloneMath가 얕게 복사하므로 입력을 건드리지 않게
  return LATE.coin;
}

/**
 * 📚 그림 배움 줄기로 잇기 — 처음 만든 A 분수 줄기의 칸은 문제만 있고, 같은 내용을 그림·한 장씩 배우는 줄기가 따로 생겼다.
 * 교과서에서 흔히 헷갈리는 칸(분모가 다른 덧셈·뺄셈, ×·÷, 분수가 섞인 혼합 계산)을 그 줄기로 잇는다 — 칸 id → 줄기
 */
export const BRIDGE = { 'frac.add': 'fracadd', 'frac.mulnat': 'fracmul', 'frac.mul': 'fracmul', 'frac.divnat': 'fracdiv', 'frac.div': 'fracdiv', 'mix.frac': 'fracmul' };
export function bridgeOf(id) {
  const key = Object.prototype.hasOwnProperty.call(BRIDGE, id) ? BRIDGE[id] : null;
  return key && STEMS[key] ? key : null;
}
/**
 * 이 줄기 사다리 위에 띄울 📚 잇기 — 이 줄기의 잇는 칸 가운데 오늘 복습 차례이거나 통과보다 실패가 많은 칸이 있으면 그 배움 줄기들
 * @returns {Array<{key:string, from:string[]}>}
 */
export function bridgeOffers(m, today, stem) {
  const concepts = (m && m.concepts) || {};
  const out = new Map();
  for (const r of ladderOf(m, today, stem)) {
    const key = bridgeOf(r.id);
    if (!key) continue;
    const rec = concepts[r.id];
    const weak = !!rec && (Number(rec.fails) || 0) > (Number(rec.passes) || 0);
    if (!r.due && !weak) continue;
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(r.id);
  }
  return [...out].map(([key, from]) => ({ key, from }));
}

/**
 * ☀️ 오늘의 수학 계획.
 *  1) 개념 편 하나 — 🔁 복습 차례가 있으면 **줄기와 상관없이 가장 오래 밀린 칸**(oldestDue, review · v257), 없으면 지금 줄기의 ▶(learn). 사다리가 끝났으면 null
 *  2) 🎲 섞어 풀기 — 개념 편 줄기(roundStem)의 아는 개념(done) 중 **안 본 지 오래된**(lastAt) 것부터 MIX_CONCEPTS개, 각각 약한 얼굴 순서
 *     + 🤔 노트(어제 이전에 틀린 유형, 그 줄기, 개념 편의 개념은 제외 — 그 편에 이미 한 문제 끼어 든다) 하나. 순서는 섞는다.
 * 아는 개념이 없으면 mix는 비고 개념 편만 — 그것도 오늘의 수학이다. 화면은 roundStem으로 줄기를 옮겨 편을 연다.
 * @returns {{ roundId: string|null, roundMode: 'review'|'learn'|null, roundStem: string, late: number, mix: Array<{id:string, kinds:string[], note?:object}> }}
 */
export function dailyPlan(m, today, stem = 'fraction', seed = 0) {
  const pick = oldestDue(m, today, stem);
  const roundStem = pick ? pick.stem : (STEMS[stem] ? stem : 'fraction');
  const rows = ladderOf(m, today, roundStem);
  const now = rows.find((x) => x.state === 'now');
  const roundId = pick ? pick.id : now ? now.id : null;
  const roundMode = pick ? 'review' : now ? 'learn' : null;
  const r = fractionGen.rng(seed);
  const concepts = (m && m.concepts) || {};
  const known = rows.filter((x) => x.state === 'done' && x.id !== roundId)
    .map((x, i) => ({ id: x.id, rec: concepts[x.id] || {}, i }))
    .sort((a, b) => ((a.rec.lastAt || 0) - (b.rec.lastAt || 0)) || (a.i - b.i))
    .slice(0, MIX_CONCEPTS)
    .map((x) => ({ id: x.id, kinds: weakKinds(x.rec, r) }));
  const stemKey = STEMS[roundStem].key;
  // 전부 받아서 줄기·개념 편 개념을 거른 뒤 가장 오래된 하나 — 개수 제한을 먼저 걸면 다른 줄기의 노트가 자리를 다 차지한다 (Codex 3차 #6)
  const note = dueNotes(m, today, Infinity).find((x) => x.id !== roundId && (stemOf(x.id) || {}).key === stemKey) || null;
  const mix = fractionGen.shuffle(r, [...known, ...(note ? [{ id: note.id, kinds: [note.note.k], note: note.note }] : [])]);
  // 🥚가 다 차서 새 칸이 잠겼다 — 화면이 "오늘 배운 건 내일 확인해요"라고 알린다
  const waiting = !roundId && rows.some((x) => x.state === 'wait');
  return { roundId, roundMode, roundStem, late: pick ? pick.late : 0, mix, waiting };
}

/**
 * 🎲 섞어 풀기 결과 반영 — 연습: 통과·라이트너 불변. 일반 문항은 개념 편과 같은 규칙(recordQ: 얼굴별 누적·오개념·틀리면 노트 등록·
 * 맞히면 노트 지움), 🤔 노트 문항(note)은 노트 회차 규칙(맞히면 지움, 틀리면 오늘로 밀어 내일 이후). 개념의 lastAt을 올려
 * 다음 날 다른 개념이 뽑히게 한다. 일지에는 'mix' 한 줄.
 * @param {Array<{id:string, key?:string, k:string, ok:0|1, tag?:string, fx?:0|1, sn?:0|1, w?:string, note?:boolean}>} qs
 */
export function applyMixRound(m, qs, today) {
  m.concepts = m.concepts || {};
  m.miss = m.miss || {};
  let ok = 0;
  for (const q of (qs || [])) {
    if (!q || !q.id) continue;
    if (q.ok) ok++;
    const rec = m.concepts[q.id];
    if (!rec) continue; // 기록이 없는 개념(그 사이 백업을 되돌렸다든지) — 정답 수만 세고 기록은 안 만든다
    if (q.note) recordNoteQ(m, rec, q, today);
    else {
      recordQ(rec, q, today);
      if (q.tag && !slipExempt(q)) m.miss[q.tag] = (m.miss[q.tag] || 0) + 1;
    }
    rec.lastAt = Date.now();
  }
  // 낼 문항이 하나도 안 만들어진 빈 편(있을 일이 거의 없다)은 일지에 안 남긴다 — 완주 기록(markDaily)만 같은 트랜잭션에서 된다
  if ((qs || []).length) {
    pushLog(m, { d: today, t: Date.now(), id: 'mix', mode: 'mix', ok, n: qs.length, qs: qs.map((q) => ({ ...logQ(q), c: q.id })) });
  }
  return { ok, total: (qs || []).length };
}

/**
 * ☀️ 오늘의 수학을 끝냈다고 적는다 — 저장 트랜잭션 안에서 부르므로 두 창이 같이 끝내도 첫 창만 first.
 * m.daily = { d: 날짜, n: 그날 완주 횟수 }
 * @returns {{first:boolean, n:number}}
 */
// ── 🎟️ 교환권용 누적 카운터 (2026-09-22, 아버님: "수학 진행도 교환권을 채우게") ──
// m.tot = { ok: 정답 문항(진단 제외), daily: ☀️ 하루 첫 완주 횟수, rev: 🔁 복습 편 통과(연습 제외) } — 단조 증가, 병합은 max.
// 환산(unlock.MATH_PTS)은 여기서 모른다 — 여기는 세기만. 저장 트랜잭션 안(math.js finishRound의 updateMath 안)에서 부른다.
export function bumpTot(m, key, n = 1) {
  m.tot = m.tot || { ok: 0, daily: 0, rev: 0 };
  m.tot[key] = (Number(m.tot[key]) || 0) + n;
  return m.tot;
}

/**
 * 한 편이 끝난 뒤 누적에 더한다 — 진단은 안 센다(배운 게 아니라 잰 것).
 * ★ 반복으로 채워지는 길을 전부 막는다 (Codex 5차 #4 — 일부러 3/4로 틀리는 편을 다섯 번 돌리면 30점이 났다):
 *   · 개념 편(learn/review)은 **통과한 편만**, 연습 편은 0 — 통과 뒤엔 같은 개념이 연습이 되고 복습은 일정대로만 오므로 유한
 *   · 🎲 섞어 풀기는 **하루 첫 완주의 것만** (두 번째 ☀️는 0)
 *   · ❓ 답장 풀어보기는 **처음 고친 때만** (fixed)
 *   · 🤔 노트 회차는 그대로(틀린 건 내일로 밀려 오늘 다시 안 나옴 — 자체로 유한)
 * 영어의 📼가 문장마다 한 번(done)인 것과 같은 성질이 되게.
 * @param {object} m
 * @param {{mode:string, correct:number, result?:object, dailyFirst?:boolean}} r result = applyRound/applyAskTry의 결과
 * @returns {{ok:number, rev:number}} 이번 편이 실제로 더한 몫 (화면 표시용)
 */
export function tallyRound(m, { mode, correct, result, dailyFirst }) {
  let ok = 0;
  let rev = 0;
  if (mode === 'learn' || mode === 'review') {
    if (result && result.passed && !result.practice) { ok = correct; if (result.review) rev = 1; }
  } else if (mode === 'mix') {
    if (dailyFirst) ok = correct;
  } else if (mode === 'ask') {
    if (result && result.fixed) ok = correct;
  } else if (mode === 'special') {
    // 💎 스페셜은 **교환권에 더하지 않는다** — 아이가 원할 때 몇 번이든 풀 수 있어서,
    //    정답마다 점수를 주면 "🎟️ 농사"가 된다(Codex 5차가 편 반복에서 잡았던 것과 같은 구멍).
    //    값어치는 🏅 배지와 ⚡·💰로 충분하다
    ok = 0;
  } else if (mode === 'notes') {
    ok = result ? (Number(result.resolved) || 0) : 0; // 실제로 지운 노트만 — result 없이 부르면 0 (Codex 7차 #1: 관대한 폴백이 재제출을 다시 세게 했다)
  }
  if (ok > 0) bumpTot(m, 'ok', ok);
  if (rev > 0) bumpTot(m, 'rev', rev);
  return { ok, rev };
}

// ── 🔷 수학스톤 자격 (2026-09-22, 아버님 "인피니티 스톤") — "제대로 배웠나"에서만: 양(문항 수)이 아니라 질 ──
/**
 * 이 편이 주는 수학스톤 — 개념 편 통과(연습 제외) 1 · 👑 이해 완료 +2 · 🤔 노트 회차 전부 고침 1 · ❓ 답장으로 처음 고침 1.
 * 섞어 풀기·진단은 없음. 반복으로 늘어나는 길이 없다(통과 뒤 같은 개념은 연습, 복습은 일정대로, 노트는 내일로, ❓는 한 번).
 */
export function stoneReward({ mode, result }) {
  let n = 0;
  if ((mode === 'learn' || mode === 'review') && result && result.passed && !result.practice) { n = 1; if (result.crowned) n += 2; }
  else if (mode === 'notes' && result && result.total > 0 && result.ok === result.total && (result.resolved === undefined || result.resolved > 0)) n = 1; // 실제로 지운 노트가 있어야 (재제출 0)
  else if (mode === 'ask' && result && result.fixed) n = 1;
  return n;
}

// ── 🎯 잡기 자격 (Codex 5차 #2·#6 — 화면(math.js)에 있던 규칙을 순수 함수로, 미룬 던지기는 레코드에) ──
/**
 * 이 편이 주는 몬스터볼 횟수 — 아버님 결정(2026-09-22): 개념 처음 통과 1 / ☀️ 안의 개념 편 통과(복습 포함) 1 / ☀️ 하루 첫 완주 +1.
 * @param {{mode:string, result?:object, inDaily?:boolean, dailyFirst?:boolean}} o inDaily = ☀️ 흐름의 개념 편
 */
export function roundCatches({ mode, result, inDaily, dailyFirst }) {
  let n = 0;
  if ((mode === 'learn' || mode === 'review') && result && !result.practice) {
    if (result.first) n = 1;
    if (inDaily && result.passed) n = Math.max(n, 1);
  }
  if (dailyFirst) n += 1;
  return n;
}

// 🍀 어쩌다 나오는 몬스터볼 (2026-10-01, 아버님 결정) — 이미 아는 개념을 다시 풀어 통과하면(연습·사다리 복습)
//   몬스터볼이 없었는데, "아예 안 나오게는 말고 20% 정도로 어쩌다가". 하루 max번까지만 —
//   쉬운 개념만 되풀이해 볼을 캐는 길은 막는다(☀️ 개념 편·첫 통과가 여전히 주 경로).
export const LUCKY = { chance: 0.2, max: 3 };

/**
 * 🍀 이 편이 어쩌다 나오는 볼을 받는가 — 트랜잭션 안에서 부른다(하루 횟수 m.luck = {d, n}을 올린다).
 * 통과했는데 roundCatches가 준 개념 편 볼이 없을 때만. 주사위(roll)는 부르는 쪽이 트랜잭션 밖에서 한 번 굴린다(재시도에도 같은 값).
 * @param {{mode:string, result?:object, inDaily?:boolean, roll:boolean, today:string}} o
 * @returns {0|1}
 */
export function luckyCatch(m, { mode, result, inDaily, roll, today }) {
  if (!roll || !today) return 0;
  // 사다리에서 아는 칸을 다시 푸는 길은 'practice'다 — 빠져 있어서 🍀가 실제로는 한 번도 안 나왔다 (Codex 19차 #3)
  if (mode !== 'learn' && mode !== 'review' && mode !== 'practice') return 0;
  if (!result || !result.passed) return 0;
  if (roundCatches({ mode, result, inDaily }) > 0) return 0; // 처음 통과·☀️ 안 통과는 이미 1개
  const used = m.luck && m.luck.d === today ? Number(m.luck.n) || 0 : 0;
  if (used >= LUCKY.max) return 0;
  m.luck = { d: today, n: used + 1 }; // 새 객체로 — cloneMath가 얕게 복사하므로 입력을 건드리지 않게
  return 1;
}

/**
 * 미룬 던지기 — 번 몬스터볼은 화면과 상관없이 레코드에 적어 두고, 던질 때마다 하나씩 쓴다.
 * 그림이 없거나(오프라인 첫날) 후보를 받는 사이 🎒로 나가도 잡기가 사라지지 않는다 (Codex 5차 #2). 트랜잭션 안에서 부른다.
 * ★ 모양은 잔액 하나(pend)가 아니라 **번 수·쓴 수**(m.throws = {earned, used}) — 둘 다 단조 증가라 병합이 max로 되고,
 *   옛 백업을 되돌려도 이미 쓴 던지기가 되살아나지 않는다 (Codex 6차 #5: pend를 max로 합치면 2개 쓴 뒤 복구에 2개가 돌아왔다).
 *   v112(몇 시간)의 pend는 처음 만질 때 earned로 접는다.
 */
// 세 카운터 전부 단조 증가 — earned(번 수)·used(뺀 수)·refunded(뺐다가 못 띄워 돌려준 수). 남은 던지기 = earned − used + refunded.
// 되돌리기를 used−1로 하면 병합(max)이 되돌리기를 지운다(Codex 7차 #4) → refunded를 따로 올린다
export function normThrows(m) {
  const t = (m && m.throws && typeof m.throws === 'object') ? m.throws : {};
  const out = { earned: Number(t.earned) || 0, used: Number(t.used) || 0, refunded: Number(t.refunded) || 0 };
  if (m && m.pend) out.earned += Math.max(0, Number(m.pend) || 0); // v112의 잔액(pend)은 번 수로 접는다
  return out;
}
function throwsOf(m) {
  m.throws = normThrows(m);
  delete m.pend;
  return m.throws;
}
export function addPending(m, n) {
  const t = throwsOf(m);
  if (n > 0) t.earned += n;
  return t.earned - t.used + t.refunded;
}
export function takePending(m) {
  const t = throwsOf(m);
  if (t.earned - t.used + t.refunded <= 0) return false;
  t.used += 1;
  return true;
}
/** 던지기를 뺐는데 화면을 못 띄웠다(그 사이 나감) → 돌려준다 (refunded+1, 뺀 수보다 많이 돌려주진 않는다) */
export function giveBackPending(m) {
  const t = throwsOf(m);
  if (t.refunded < t.used) t.refunded += 1;
  return t.earned - t.used + t.refunded;
}
export function pendingThrows(m) {
  if (!m) return 0;
  const t = normThrows(m);
  return Math.max(0, t.earned - t.used + t.refunded);
}

/**
 * ☀️ 완주 기록 (저장 트랜잭션 안에서 부른다 — 두 창이 같이 끝내도 첫 창만 first).
 * @param {{perfect?:boolean}} [opts] perfect = 🎲 섞어 풀기를 전부 맞힘 → 🌟 황금볼은 **하루 1개**(m.daily.gold) — 틀린 뒤 다시 ☀️ 해서 다 맞혀도 받는다(그게 학습)
 * @returns {{first:boolean, n:number, gold?:boolean}} gold는 perfect를 물었을 때만 — 이번에 새로 받는지
 */
export function markDaily(m, today, opts) {
  const same = !!(m.daily && m.daily.d === today);
  const n = same ? (Number(m.daily.n) || 0) + 1 : 1;
  const hadGold = same && !!m.daily.gold;
  m.daily = { d: today, n, ...(hadGold ? { gold: true } : {}) };
  const out = { first: n === 1, n };
  if (n === 1) bumpTot(m, 'daily', 1); // 🎟️ 하루 첫 완주만 — "한 번 더"로 교환권을 채우진 못한다
  if (opts && opts.perfect !== undefined) {
    out.gold = !!opts.perfect && !hadGold;
    if (out.gold) m.daily.gold = true;
  }
  return out;
}

/** 오늘 ☀️를 몇 번 완주했나 (0이면 아직) */
export function dailyDone(m, today) {
  return (m && m.daily && m.daily.d === today) ? (Number(m.daily.n) || 0) : 0;
}

// ── 💎 스페셜 문제 · 🏅 체육관 배지 (2026-09-26, 아버님 "새로운 보상과 함께") ──
//
// 문제집에서 뽑은 여덟 얼굴(js/mathspecial.js)을 각각 여러 번 통과하면 그 얼굴의 🏅 배지를 얻고,
// 여덟 개를 다 모으면 🏆 챔피언 보상이 한 번 나온다. 원작 관동 8배지 그대로다.
//
// ★ 통과 횟수는 **단조 증가**만 한다(줄어드는 길이 없다) → 백업 병합은 키마다 max면 답이 맞는다.
//   🏆 보상을 받았는지도 0/1 단조 — 옛 백업을 되돌려도 두 번 받지 못한다.

/** 💎 스페셜 레코드가 없으면 만들어 준다 */
function spOf(m) {
  m.sp = m.sp || {};
  m.sp.pass = m.sp.pass || {};
  return m.sp;
}

/**
 * 💎 스페셜 한 회차를 기록한다 — 맞힌 얼굴의 통과 횟수 +1.
 * @param {object} m 수학 레코드
 * @param {Array<{kind:string, ok:boolean, tag?:string}>} qs 푼 문항 (kind = 얼굴 id)
 * @param {string} today
 * @param {number} need 배지 하나에 필요한 통과 횟수
 * @returns {{ok:number, total:number, got:string[]}} got = 이번에 **새로** 받은 배지들
 */
export function applySpecialRound(m, qs, today, need = 3) {
  const sp = spOf(m);
  m.miss = m.miss || {};
  const list = (qs || []).filter((q) => q && q.kind);
  let ok = 0;
  const got = [];
  for (const q of list) {
    if (!q.ok) {
      // 틀린 것은 📊 진단에만 쌓는다 (아이가 "실수"라고 한 것은 빼는 규칙은 개념 편과 같다)
      if (q.tag && !slipExempt(q)) m.miss[q.tag] = (m.miss[q.tag] || 0) + 1; // 💎는 쌍둥이가 없어 실수도 확인 전 (v251)
      continue;
    }
    ok++;
    const before = Number(sp.pass[q.kind]) || 0;
    sp.pass[q.kind] = before + 1;
    if (before < need && before + 1 >= need) got.push(q.kind); // 이번에 배지가 찼다
  }
  sp.rounds = (Number(sp.rounds) || 0) + 1;
  if (list.length) {
    pushLog(m, { d: today, t: Date.now(), id: 'special', mode: 'special', ok, n: list.length, qs: list.map((q) => ({ k: q.kind, ok: !!q.ok, ...(q.tag ? { tag: q.tag } : {}), ...(q.w ? { w: q.w } : {}), ...(q.w === 's' && q.sv !== undefined ? { sv: q.sv ? 1 : 0 } : {}) })) }); // 🙈 실수·확인 표시도 (Codex 63차 #1)
  }
  return { ok, total: list.length, got };
}

/** 🏅 지금까지 받은 배지들 (통과 횟수가 need 이상인 얼굴) */
export function badgesOf(m, need = 3) {
  const pass = (m && m.sp && m.sp.pass) || {};
  return Object.keys(pass).filter((k) => (Number(pass[k]) || 0) >= need);
}

/** 🏅 얼굴별 통과 횟수 (화면에 "2/3"을 보여 줄 때) */
export function spPass(m, kindId) {
  return Math.max(0, Number((m && m.sp && m.sp.pass && m.sp.pass[kindId]) || 0));
}

/** 💎 스페셜을 몇 회차 했나 */
export function spRounds(m) {
  return Math.max(0, Number((m && m.sp && m.sp.rounds) || 0));
}

/**
 * 🏆 여덟 배지를 다 모았을 때의 보상을 **한 번만** 준다 (트랜잭션 안에서 부른다).
 * @returns {boolean} 이번에 받았으면 true
 */
export function claimGym(m, kindIds, need = 3) {
  const sp = spOf(m);
  if (sp.gym) return false;                       // 이미 받았다 (단조 — 옛 백업을 되돌려도 두 번은 없다)
  const got = badgesOf(m, need);
  if (!kindIds.every((k) => got.includes(k))) return false;
  sp.gym = 1;
  return true;
}

/** 💎 스페셜 보상에 쓰는 아이템 id — items.js와 같아야 한다 (테스트로 고정) */
export const SP_ITEM = { stoneMath: 'stone_math', stoneEnglish: 'stone_english', beastBall: 'beastball' };

/**
 * 💎 한 회차가 주는 보상을 **순수하게** 계산한다 (문항 정답 + 🏅 배지 + 🏆 챔피언).
 *
 * ★ 순수 함수인 까닭: 진도를 적는 트랜잭션 **안에서** 프로필에 바로 적기 위해서다.
 *   따로 적으면 배지는 저장됐는데 마스터볼·코인이 날아가고, 🏆는 한 번뿐이라 **되찾을 길이 없다**
 *   (Codex 11차 #1). 화면은 여기서 나온 값을 보여 주기만 한다.
 * @param {{correct:number, result:{got?:string[], gym?:boolean}}} o
 * @returns {{xp:number, coin:number, items:Object, badges:string[], gym:boolean, stone:number}}
 */
export function specialReward({ correct = 0, result } = {}) {
  const badges = (result && Array.isArray(result.got) ? result.got : []).slice();
  const gym = !!(result && result.gym);
  const stone = badges.length * REWARD.badge.stone + (gym ? REWARD.gym.stone : 0);
  const items = {};
  if (stone) items[SP_ITEM.stoneMath] = stone;
  if (gym) {
    items[REWARD.gym.ball] = 1;
    if (REWARD.gym.beast) items[SP_ITEM.beastBall] = REWARD.gym.beast;
    items[SP_ITEM.stoneEnglish] = REWARD.gym.stone;
  }
  return {
    xp: correct * REWARD.special.xp + badges.length * REWARD.badge.xp + (gym ? REWARD.gym.xp : 0),
    coin: correct * REWARD.special.coin + badges.length * REWARD.badge.coin + (gym ? REWARD.gym.coin : 0),
    items, badges, gym, stone,
  };
}

/** 🏆 챔피언 보상을 이미 받았나 */
export function gymClaimed(m) {
  return !!(m && m.sp && m.sp.gym);
}

/** 아이에게 보여 주지 않는 진단용 이름표 — 부모 화면(📊)에는 그대로 쌓인다 */
export const META_TAGS = new Set(['오개념을 못 짚음', '틀린 줄 모름', '개념을 다르게 이해함', '계산 실수', '엉뚱한 수', '오개념']);
export function kidTags(tags) {
  return [...new Set((tags || []).filter((t) => t && !META_TAGS.has(t)))];
}

/** 개념 이름 (id → 이름, 어느 줄기든). 없으면 id 그대로 */
export function nameOf(id) {
  const s = stemOf(id);
  const c = s && s.list.find((x) => x.id === id);
  return c ? c.name : id;
}

/** 📊용 요약 — 배운 개념 수·👑 수·헷갈리는 오개념 TOP. total/done/crowned는 모든 줄기 합, stems에 줄기별 */
export function mathSummary(m) {
  const stems = STEM_ORDER.map((key) => {
    const rows = ladderOf(m, '9999-12-31', key);
    const S = STEMS[key];
    const n = (st) => rows.filter((r) => r.stage === st).length;
    // done = 사다리가 열린 칸 전부. 그중 🐣 안다(👑 포함) · 🥚 배우는 중 · 📏 진단으로 친 칸 (2026-10-01 ②)
    return { key, code: S.code, label: S.label, total: rows.length, done: rows.filter((r) => r.state === 'done').length, known: n('known') + n('crowned'), learning: n('learning'), placed: n('placed'), crowned: rows.filter((r) => r.crowned).length, started: !!(m && m.placed && m.placed[key]) };
  });
  const sum = (k) => stems.reduce((a, s) => a + s[k], 0);
  const miss = Object.entries((m && m.miss) || {}).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag, n]) => ({ tag, n }));
  return { total: sum('total'), done: sum('done'), known: sum('known'), learning: sum('learning'), placed: sum('placed'), crowned: sum('crowned'), stems, rounds: (m && m.rounds) || 0, miss, logged: ((m && m.log) || []).length };
}

/** 단계 표시 — 📊·📋에서 같은 글자 */
export const STAGE_MARK = { learning: '🥚', placed: '📏', known: '🐣', crowned: '👑' };

export const KIND_SHORT = { calc: '①계산', misread: '②오개념', why: '③왜', special: '⭐특별' };

/** 같은 편(rid)이 그만둠과 끝냄 둘 다로 남았으면(두 창) 끝낸 줄만 — 📊가 한 편을 두 번 보여 주지 않게 (Codex 62차 #3) */
function shownLog(log) {
  const fin = new Set(log.filter((e) => e && e.rid && e.mode !== 'quit').map((e) => e.rid));
  return log.filter((e) => !(e && e.mode === 'quit' && e.rid && fin.has(e.rid)));
}

/**
 * 📊 개념별 보고 — 한 편이라도 푼 개념만. 부모가 "어디서 자꾸 틀리다 언제 나아졌나"를 보는 자리.
 *   trail: 최근 편의 통과 여부(오래된 → 최근), weak: 정답률이 제일 낮은 얼굴(2문항 이상), miss: 이 개념의 오개념 TOP3
 */
export function conceptReport(m, limit = 8) {
  const log = shownLog((m && Array.isArray(m.log)) ? m.log : []);
  return Object.entries((m && m.concepts) || {}).map(([id, rec]) => {
    const mine = log.filter((e) => e.id === id);
    // 🤔 노트 회차(id 'notes')·🎲 섞어 풀기(id 'mix')의 이 개념 문항들 — 편의 통과/실패 흔적(trail)에는 안 넣고, 바로 고침·활동에만 센다
    const noteQs = log.filter((e) => e.id === 'notes' || e.id === 'mix' || e.id === 'ask').flatMap((e) => (e.qs || []).filter((q) => q.c === id));
    // ⏹ 그만둔 편(v250)은 답한 것을 다 맞혔어도 통과가 아니다 · 💪 kept: 확인 편에서 칸을 지킴 · rf: 확인 차례에 틀린 뒤 그만둬 못 통과로 침 (v262)
    const trail = mine.slice(-limit).map((e) => ({ d: e.d, ok: e.ok, n: e.n, pass: e.mode !== 'quit' && e.n > 0 && e.ok === e.n, mode: e.mode, ...(e.mode === 'quit' ? { quit: 1, of: e.of || e.n } : {}), ...(e.kp ? { kept: 1 } : {}), ...(e.mode === 'quit' && e.rf ? { rf: 1 } : {}) }));
    const kinds = Object.entries(rec.kinds || {}).map(([k, v]) => ({ k, label: KIND_SHORT[k] || k, ok: v[0], n: v[1], rate: v[1] ? v[0] / v[1] : 1 }));
    const weak = kinds.filter((x) => x.n >= 2).sort((a, b) => a.rate - b.rate)[0] || null;
    const miss = Object.entries(rec.miss || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([tag, n]) => ({ tag, n }));
    const rounds = (rec.passes || 0) + (rec.fails || 0);
    const fixed = mine.reduce((a, e) => a + (e.qs || []).filter((q) => q.fx === 1).length, 0) + noteQs.filter((q) => q.fx === 1).length; // 🔁 틀렸다가 쌍둥이로 바로 고친 문항 수 (남아 있는 일지 안에서)
    // 🎯 감 잡기 정답률 · 🙈 틀린 이유 — 아이가 스스로 고른 것 (③, 2026-09-21)
    const allQ = [...mine.flatMap((e) => e.qs || []), ...noteQs];
    const senseN = allQ.filter((q) => q.sn !== undefined).length; const senseOk = allQ.filter((q) => q.sn === 1).length;
    const why = { s: 0, c: 0, u: 0 }; for (const q of allQ) if (q.w && why[q.w] !== undefined) why[q.w]++;
    // 🔢 숫자판으로 직접 쓴 답의 정답률과 짐작한 값(최근 셋) — 보기를 찍을 때와 견주어 볼 수 있게
    const padQ = allQ.filter((q) => q.p === 1);
    const pad = [padQ.filter((q) => q.ok === 1).length, padQ.length];
    // "최근" 짐작 셋은 일지를 시간 순으로 한 번 훑어서 — allQ는 개념 편 먼저·노트/섞어 나중이라 옛 노트가 새 것을 밀어냈다 (Codex 18차 #6)
    const guesses = log.flatMap((e) => (e.id === id ? (e.qs || []) : (e.id === 'notes' || e.id === 'mix' || e.id === 'ask') ? (e.qs || []).filter((q) => q.c === id) : []))
      .filter((q) => q.p === 1 && q.g).map((q) => q.g).slice(-3);
    // 진단으로만 "안다"가 된 개념(passes 1은 진단의 것)은 한 편도 안 푼 것이라 표에 안 올린다 — 복습에서 풀면 일지가 생겨 올라온다
    const noteList = (Array.isArray(rec.notes) ? rec.notes : []).map((n) => ({ k: n.k, label: KIND_SHORT[n.k] || n.k || '', tag: n.tag || '', d: n.d || '', again: n.again || 0, fx: n.fx }));
    const notes = noteList.length;
    return { id, name: nameOf(id), done: !!rec.done, stage: stageOf(rec), box: rec.box || 0, rounds, passes: rec.passes || 0, fails: rec.fails || 0, trail, kinds, weak, miss, fixed, sense: [senseOk, senseN], why, pad, guesses, notes, noteList, lastAt: rec.lastAt || 0, placedOnly: !!rec.placed && !mine.length && !noteQs.length };
  }).filter((r) => r.trail.length || r.notes || (r.rounds > 0 && !r.placedOnly)).sort((a, b) => b.lastAt - a.lastAt); // 🤔 노트만 있는 개념(진단으로 안 것)도 표에 — 못 고친 유형을 보여 줘야 한다
}

// ── 🛡️ 꼼수 막기 기록 (2026-10-13, 노가다 탈출구 막기 5단계, v252 — Codex 63차 PART 3) ──
// 1~4단계가 막은 길(⏹ 그만두기 · 🔁 같은 날 다시 풀기 · 🙈 실수 · 🔍 까닭 고르기)을 아빠가 📊와 📋 글에서 같은 숫자로 본다.
// 새 카운터는 없다 — 있는 일지와 🎯 첫 선택(m.chal.rf)에서 센다.

/** 📊·📋가 보는 기간 — 오늘까지 7일 */
export const GUARD_DAYS = 7;
/** 한 줄에 늘어놓는 개수 — 넘으면 "외 N" */
export const GUARD_LIST = 6;

/**
 * 최근 days일의 꼼수 막기 기록 (순수).
 *   quits: ⏹ 그만둔 개념 편 [{ id, name, d, ok, n, of }] — 같은 편(rid)을 끝내기도 했으면 끝낸 줄만(shownLog), 최근 것부터
 *   repeats: 🔁 같은 날 같은 개념을 두 편 이상 푼 날 [{ id, name, d, k }] — k는 그날 편 수(그만둔 편 포함, 같은 편은 한 번 — sameDayRounds와 같은 셈)
 *   slip: 🙈 "실수"라고 한 오답 { yes: 확인 문제를 맞힘(sv 1) · twin: 확인 문제도 틀림(sv 0 · fx 0) · none: 확인 못 함(sv 0 — 확인 문제가 없거나 그 전에 그만둠) ·
 *         old: 확인 없이 빼 주던 v251 전 기록(sv 없음 — 셈에서 뺀다) } — sv 0을 "쌍둥이 틀림"이라 부르지 않는다(쌍둥이를 틀린 것은 fx 0)
 *   review: 🔍 🎯 까닭 고르기 첫 선택 { ok, n } — 문제에 처음 낸 답일 때만 적혀 있다(applyReviewFirst)
 *   kept: 💪 확인 편에서 하나만 틀리고 쌍둥이를 맞혀 칸을 지킨 편 [{ id, name, d }] · quits의 rf: 확인 차례에 틀린 뒤 그만둬 못 통과로 친 편 (v262)
 * 날은 편을 시작한 날(sd || d). 일지는 최근 LOG_MAX편까지라 그보다 많이 풀면 오래된 날이 빠진다
 */
export function guardReport(m, today, days = GUARD_DAYS) {
  const span = Math.max(1, Math.trunc(Number(days) || GUARD_DAYS));
  const from = addDays(today, -(span - 1));
  const inWin = (d) => typeof d === 'string' && d >= from && d <= today;
  // 같은 편(rid)이 두 줄이면(같은 편을 두 번 적음) 앞 줄만 — 편 수도 🙈 셈도 한 번 (그만둠·끝냄 둘이면 shownLog가 끝낸 줄만 남긴다)
  const seen = new Set();
  const log = shownLog((m && Array.isArray(m.log)) ? m.log : [])
    .filter((e) => e && inWin(e.sd || e.d) && (e.rid === undefined || (!seen.has(e.rid) && !!seen.add(e.rid))));
  const quits = log.filter((e) => e.mode === 'quit').reverse()
    .map((e) => ({ id: e.id, name: nameOf(e.id), d: e.d, ok: Number(e.ok) || 0, n: Number(e.n) || 0, of: Number(e.of || e.n) || 0, ...(e.rf ? { rf: 1 } : {}) }));
  // 💪 확인 편에서 하나만 틀리고 쌍둥이를 맞혀 칸을 지킨 편 (v262)
  const kept = log.filter((e) => e.kp && e.mode !== 'quit').reverse().map((e) => ({ id: e.id, name: nameOf(e.id), d: e.d }));
  const byDay = new Map();
  for (const e of log) {
    if (!CONCEPT_MODES.has(e.mode)) continue;
    const day = e.sd || e.d;
    const key = `${e.id}|${day}`;
    const g = byDay.get(key) || { id: e.id, d: day, k: 0 };
    g.k += 1;
    byDay.set(key, g);
  }
  const repeats = [...byDay.values()].filter((g) => g.k >= 2)
    .sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : b.k - a.k))
    .map((g) => ({ id: g.id, name: nameOf(g.id), d: g.d, k: g.k }));
  const slip = { yes: 0, twin: 0, none: 0, old: 0 };
  for (const e of log) {
    for (const q of (e.qs || [])) {
      if (!q || q.ok || q.w !== 's') continue;
      if (q.sv === undefined) slip.old += 1;
      else if (q.sv === 1) slip.yes += 1;
      else if (q.fx === 0) slip.twin += 1;
      else slip.none += 1;
    }
  }
  const review = { ok: 0, n: 0 };
  for (const v of Object.values((m && m.chal && m.chal.rf) || {})) {
    if (!rfOk(v) || !inWin(v[1])) continue;   // 꼴이 틀린 줄은 안 센다 — 손질 안 된 길로 들어와도 (Codex 64차)
    review.n += 1;
    if (v[0] === 1) review.ok += 1;
  }
  return { from, to: today, days: span, quits, repeats, slip, review, kept };
}

/** 🛡️ 기록을 글 줄로 — 📊 화면과 📋 복사 글(비공개 저장소 math/날짜.md)이 같은 줄을 쓴다. 첫 줄은 제목 */
export function guardLines(g) {
  const md = (d) => String(d || '').slice(5);
  const list = (arr, f) => arr.slice(0, GUARD_LIST).map(f).join(' · ') + (arr.length > GUARD_LIST ? ` 외 ${arr.length - GUARD_LIST}` : '');
  const s = g.slip;
  const sN = s.yes + s.twin + s.none;
  const old = s.old ? `확인 없이 빼 주던 옛 기록 ${s.old}개는 셈에서 뺐어요` : '';
  const kept = g.kept || [];
  const rfN = g.quits.filter((x) => x.rf).length;
  return [
    `🛡️ 최근 ${g.days}일(${md(g.from)}~${md(g.to)}) 꼼수 막기 기록`,
    g.quits.length
      ? `⏹ 그만둔 편 ${g.quits.length}${rfN ? `(그중 확인 차례에 틀린 뒤 그만둬 못 통과로 친 편 ${rfN})` : ''}: ${list(g.quits, (x) => `${x.name} ${md(x.d)} (${x.of}문제 중 ${x.n}개 풀고 ${x.ok}개 맞힘${x.rf ? ' · 못 통과로 침' : ''})`)}`
      : '⏹ 그만둔 편 없음',
    g.repeats.length
      ? `🔁 같은 날 같은 개념 여러 편 ${g.repeats.length}: ${list(g.repeats, (x) => `${x.name} ${md(x.d)} ${x.k}편`)}`
      : '🔁 같은 날 같은 개념 여러 편 없음',
    sN
      ? `🙈 "실수"라고 한 오답 ${sN}: ✓ 확인 문제를 맞힘 ${s.yes} · ✗ 확인 문제도 틀림 ${s.twin} · ✗ 확인 못 함 ${s.none}(확인 문제가 없거나 그 전에 그만둠)${old ? ` — ${old}` : ''}`
      : `🙈 "실수"라고 한 오답 없음${old ? ` (${old})` : ''}`,
    g.review.n
      ? `🔍 🎯 까닭 고르기 첫 선택 정답 ${g.review.ok}/${g.review.n} — 맞는 까닭을 골랐다는 뜻이에요(이해했다는 증거는 아니에요)`
      : '🔍 🎯 까닭 고르기 첫 선택 아직 없음 — 문제를 처음 풀 때 틀려서 까닭을 고른 경우만 세요',
    // 💪 v262 — 줄 순서를 바꾸지 않게 맨 끝에
    kept.length
      ? `💪 확인 편에서 한 문제만 틀리고 비슷한 문제를 맞혀 칸을 지킨 편 ${kept.length}: ${list(kept, (x) => `${x.name} ${md(x.d)}`)}`
      : '💪 확인 편에서 한 문제만 틀리고 비슷한 문제를 맞혀 칸을 지킨 편 없음',
  ];
}

/**
 * 📋 아빠가 Claude에게 붙여 넣을 글 — 개념별 요약 + 최근 일지. JSON보다 짧고 사람이 읽을 수 있다.
 * (내보내기 JSON에도 math 레코드가 통째로 들어가지만, 폰에서 대화창에 붙이기엔 이게 낫다)
 */
export function mathReportText(m, today) {
  const s = mathSummary(m);
  const lines = [`🔢 신코치 수학 기록 (${today}) — 개념 ${s.total}개 중 🐣 안다 ${s.known} · 🥚 배우는 중 ${s.learning} · 📏 진단으로 침 ${s.placed} · 👑 ${s.crowned} · 지금까지 ${s.rounds}편`];
  for (const r of conceptReport(m, 12)) {
    const trail = r.trail.map((t) => (t.quit ? `⏹${t.rf ? '✘' : ''}${t.ok}/${t.n}` : t.pass ? '✔' : `✘${t.ok}/${t.n}${t.kept ? '💪' : ''}`)).join(' '); // 💪 칸 지킴 · ⏹✘ 틀린 뒤 그만둬 못 통과 (v262)
    const kinds = r.kinds.map((k) => `${k.label} ${k.ok}/${k.n}`).join(', ');
    const miss = r.miss.map((x) => `${x.tag}×${x.n}`).join(', ');
    lines.push(`- ${r.name}${r.stage ? ` ${STAGE_MARK[r.stage]}` : ''}: ${r.passes}통과/${r.fails}실패 · ${trail}${kinds ? ` · ${kinds}` : ''}${miss ? ` · 헷갈림: ${miss}` : ''}${r.fixed ? ` · 바로 고침 ${r.fixed}` : ''}${r.sense[1] ? ` · 감 잡기 ${r.sense[0]}/${r.sense[1]}` : ''}${(r.why.s + r.why.c + r.why.u) ? ` · 틀린 이유: 실수 ${r.why.s}·헷갈림 ${r.why.c}·몰랐음 ${r.why.u}` : ''}${r.pad[1] ? ` · ✍️ 직접 쓴 답 ${r.pad[0]}/${r.pad[1]}${r.guesses.length ? ` (짐작: ${r.guesses.join(', ')})` : ''}` : ''}${r.notes ? ` · 🤔 다시 볼 유형 ${r.notes}` : ''}`);
  }
  if (s.miss.length) lines.push(`전체 오개념 TOP: ${s.miss.map((x) => `${x.tag}×${x.n}`).join(', ')}`);
  lines.push('', ...guardLines(guardReport(m, today))); // 🛡️ 📊와 같은 줄 (v252)
  const log = shownLog((m && m.log) || []).slice(-30);
  if (log.length) {
    lines.push('', `최근 ${log.length}편 (날짜 · 개념 · 결과 · 문항별 정오와 오개념):`);
    for (const e of log) {
      const qs = (e.qs || []).map((q) => `${(KIND_SHORT[q.k] || q.k || '?').slice(0, 1)}${q.p ? '✍' : ''}${q.ok ? '○' : '✘'}${q.tag ? `(${q.tag})` : ''}${q.g ? `«${q.g}»` : ''}${q.pf ? `‹${q.pf === 'reduce' ? '약분 덜 함' : '꼴이 다름'}›` : ''}${q.fx === 1 ? '→고침' : q.fx === 0 ? '→또틀림' : ''}${q.sn === 1 ? '감○' : q.sn === 0 ? '감✘' : ''}${q.w ? `{${WHY_LABEL[q.w] || q.w}${q.w === 's' && q.sv !== undefined ? (q.sv ? '✓' : '✗') : ''}}` : ''}${q.c ? `[${nameOf(q.c)}]` : ''}`).join(' ');
      const res = e.mode === 'quit' ? `⏹그만둠 ${e.ok}/${e.n}${e.of ? ` (${e.of}문제 중)` : ''}${e.rf ? ' → 확인 못 통과로 침' : ''}` : `${e.mode || ''} ${e.ok}/${e.n}${e.kp ? ' 💪칸 그대로' : ''}`; // ⏹ 그만둔 편 (v250) · 💪 (v262)
      lines.push(`${e.d} ${e.id === 'diag' ? '📏진단' : e.id === 'notes' ? '🤔오답노트' : e.id === 'mix' ? '🎲섞어풀기' : e.id === 'ask' ? '❓답장뒤풀기' : nameOf(e.id)} ${res} ${qs}`);
    }
  }
  return lines.join('\n');
}
