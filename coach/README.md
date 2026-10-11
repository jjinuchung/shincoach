# coach/ — 앱이 읽는 공개 원고

이 폴더는 **누구나 볼 수 있는 공개 저장소**에 있다. 여기에는 앱이 쓰는 원고(글·문제·낱말·단원·영상 목록)만 둔다.

## ★ 아이 기록은 여기에 두지 않는다

아이가 쓴 글, 아빠 교정, 답장, 학습 기록은 **비공개 저장소 `shincoach-data`**로만 오간다(2026-10-07 Codex 35차부터).
예전(v53)에는 교정문을 이 폴더의 `fixes.json`에 적어 배포했는데, 그러면 아이 글이 인터넷에 공개된다. 그 길은 없앴고 `tools/check.mjs`가 다시 생기지 못하게 막는다.

| 무엇 | 태블릿이 올리는 것 | Claude가 적는 것(앱이 읽어 감) |
|---|---|---|
| ✍️ 영어 에세이 교정 | `essay/todo.json` | `essay/fixes.json` |
| ❓ 수학 질문 답장 | `math/latest.json` · `math/날짜.md` | `math/replies.json` |
| ✍️ 국어 서술형 답장 (v237) | `korean/todo.json` · `korean/todo.md` | `korean/replies.json` |

- 태블릿은 📊에 넣은 열쇠로 올리고 읽는다. 배포는 필요 없다(앱을 열 때 받아 간다).
- Claude가 적은 파일은 `node tools/check.mjs --private <받은 폴더>`로 검사한 뒤 올린다.
- 커밋 메시지·`process.md`·시험 데이터·이슈에도 아이 글이나 답장을 옮겨 적지 않는다.
- 자세한 흐름은 `js/upload.js` 머리 주석에 있다.
