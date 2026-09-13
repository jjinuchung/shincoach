# 신코치 (shincoach) 개발 진행 기록

> 새 세션 시작 시 이 파일과 `.task-memory/` 3종을 먼저 읽는다.

## 2026-09-12

### 진행 내용
- 요구사항 논의 → 로컬 mp4+srt/smi, 순수 HTML/JS PWA, IndexedDB 저장, GitHub Pages 배포로 결정
- 1~6단계 초안 구현: 골격, srt 파서, 가져오기/라이브러리, 플레이어(문장 이동·반복·속도·이중 자막·섀도잉·단어 하이라이트·이어보기)
- /codex 1차 리뷰 14건 중 P1 5건 + 파서 3건 반영 (백그라운드 일시정지, 탐색 동기화, ended 처리, 재생 오류 안내, SW 캐시 범위, 공백 구분줄/VTT ID, 한글 중복, 겹침 병합)
- SMI(SAMI) 자막 지원 (영·한 한 파일 자동 분리, CP949)
- 실제 영화 준비: ffmpeg 설치, mkv 내장 영어 자막 추출 3편, 720p mp4 변환(토이스토리5·미니언즈·모아나), 싱크 검증 도구
- GitHub Pages 배포(v1~v8), Tailscale 파일 서버로 집 노트북에 전송, 태블릿 설치
- 구형 안드로이드(삼성 인터넷 → Chrome 전환) 호환: 문법 하향, FileReader, 오류 배너
- 듣기 먼저 모드(영어 숨기고 N번 듣고 공개), 단어 패널(내장 사전 645→1,436단어 + 280표현), 반복 기본 ∞·설정 유지·섀도잉 순환

### 변경 파일
- `index.html`, `css/style.css`, `js/{app,db,srt,sami,library,player,vocab}.js`, `sw.js`, `manifest.webmanifest`, `vocab/*.json`, `tools/{synccheck.mjs,fileserver.py,vocab_extract.mjs,vocab_scan.mjs}`, `tests/*`

### 결정사항 / 메모
- 사무실 PC의 TRADEMY API가 상시 실행 → ffmpeg 등 무거운 작업은 Idle 우선순위 (CPU 100%로 폰 앱 타임아웃 사고)
- 미니언즈 영어 자막은 CC라 효과음 제거 로직 추가; 한글 smi의 두 화자 동일 대사는 한 줄로

## 2026-09-13

### 진행 내용
- ⚙ 설정 비밀번호(해시 보관), 듣기 먼저 4번 옵션, 기기 진단(마이크·음성 인식 테스트, 녹음 들어보기)
- 🎤 말하기 확인: 문장 끝 → 마이크 녹음 → Web Speech 단어 일치율(폴백: 말소리 길이) → 통과 전 다음 문장 차단, 3번 미달 시 통과, 마이크 불가 시 확인 없이 진행
- 📊 학습 기록 대시보드(부모, 비밀번호): DB v2(sentenceStats/sessions/daily/vocabViews), 주간 요약, 콘텐츠 진행률, 어려운 문장 TOP10(탭→이동), 복습 단어장, 세션, JSON 백업/복원. 아이 화면엔 ⭐정복·오늘의 목표 칩
- /codex 2차 리뷰 10건 전부 반영 (자동 이동 상태 초기화, 말하기 확인 수명주기, DB 업그레이드 차단 안내, 마이크 해제, 소음 바닥 최솟값, 백업 병합, 저장 재시도, 날짜 전환, 공개 시 완료 기록, 긴 문장 내용어 기준)
- v12 배포에 heredoc 백슬래시 깨짐 문법 오류 → v13 즉시 복구, 커밋 전 검사 스크립트(`tools/check.mjs`, `npm test`에 포함) 도입
- `.task-memory/`를 공개 저장소에서 제외 (비밀번호 메모 포함)
- 배포 v9 → v16

### 변경 파일
- `js/{speak,track,stats,diag}.js` 신규, `js/{player,db,app}.js`, `index.html`, `css/style.css`, `sw.js`(v16), `tools/check.mjs`, `tests/{speak,track,stats,db.merge,player.logic,vocab}.test.js` (총 74개)

### 결정사항 / 메모
- 태블릿 = 갤럭시탭 A7(Android 10) + Chrome 152. 처음엔 삼성 인터넷으로 열려 음성 인식 불가 → Chrome으로 재설치. 마이크 정상이지만 음량 작음(RMS 최대 0.03) → 말소리 문턱 상한 0.022
- 말하기 판정: 40% 일치 또는 (2단어+내용어, 6단어 이하) 또는 (3단어+내용어). 3번 미달 시 통과 (사용자 결정)
- 학습 기록 "완료" = 영어 공개 상태로 끝까지 들음(듣기 먼저면 공개 시점). ⭐ = 발음 80%↑. 📊는 부모만(비밀번호)
- Bash heredoc은 백슬래시를 깨뜨림 → 코드는 Write/Edit로, 푸시는 `npm test &&` 체인으로만

### TODO (다음 작업)
- [ ] [백로그] 태블릿 Web Speech 인식 결과 없음 원인 확정 — ⚙ 진단 "단계: start → …" 줄 확인
- [ ] 며칠 실사용 후 📊 기록 보고 판정 기준·표시 조정 (말하기 통과율, 어려운 문장 기준)
- [ ] 태블릿에서 v16 실사용 피드백 (말하기 확인 흐름, 오늘의 목표, ⭐)
- [ ] [보류] 아이 발음 녹음 보관·비교 듣기 (제안 4)
- [ ] 새 영화 추가 시 `tools/vocab_extract.mjs`로 사전 확장, README 절차 참고
