# 섀도잉 영어학습 PWA (shincoach) 맥락 노트

> AI 외부 기억 장치 - 결정의 이유와 참고 자료를 기록합니다.

## 핵심 결정 로그

| 날짜 | 결정 내용 | 이유 | 대안 (기각된 것) |
|------|-----------|------|-----------------|
| 2026-09-12 | 영상 소스 = 로컬 mp4 + srt | 모든 기능 100% 제어 가능, 아버님이 검수한 콘텐츠만 사용 | 유튜브 iframe API (구간 반복 불안정, 오프라인 불가) → 2차 |
| 2026-09-12 | 기술 = 순수 HTML/JS PWA | PC·안드로이드 모두 브라우저로 즉시 실행, HTML5 video가 속도/시크 표준 지원 | .NET MAUI (MediaElement 속도 편차), Flutter (Dart 학습 필요) |
| 2026-09-12 | 영상 저장 = IndexedDB | 파일 한 번 가져오면 오프라인·서버 없이 재생, 안드로이드 Chrome 지원 | 로컬 http 서버 폴더 (안드로이드에서 접근 불편), File System Access API (안드로이드 미지원) |
| 2026-09-12 | 한글 자막 = Claude 세션에서 직접 번역 | 사용자에게 Claude API 키 없음 | tools/translate_srt.py (API 키 필요) |
| 2026-09-12 | 녹음 비교 기능 = 2차 | 1차는 재생·반복·섀도잉에 집중 | - |
| 2026-09-12 | git 저장소 초기화 | 배포(정적 호스팅) 및 버전 관리 | - |
| 2026-09-12 | 백그라운드 정책 = 화면 숨김 시 일시정지, 복귀는 ▶ 수동 | Chrome이 숨긴 페이지의 rAF/타이머를 멈추거나 동결 → 자동 재개하면 문장 상태 어긋남 | 백그라운드 계속 재생 (보장 불가) |
| 2026-09-12 | 문장 끝 여유 END_EPS = 20ms | 60ms는 마지막 음절 잘림. rAF 간격(16ms)만큼만 | 0ms (다음 문장 소리 새어 들어옴) |
| 2026-09-12 | 큐 구성 순서 = 영어 문장 합치기 → 한글 매칭 | 반대 순서면 긴 한글 큐가 합쳐진 문장에 두 번 붙음 (Codex 재현) | 한글 cue ID로 중복 제거 |
| 2026-09-12 | findCueIndex = 선형 탐색 | 겹치는 큐에서 이진 탐색 실패. 위치 이탈 시에만 호출되므로 성능 무관 | 이진 탐색 유지 |
| 2026-09-12 | SMI는 가져오기 시 SRT 텍스트로 변환해 저장 | 플레이어/번역 워크플로는 SRT 하나만 알면 됨. 사용자 자막이 smi | 플레이어에서 smi 직접 파싱 (코드 경로 2배) |
| 2026-09-12 | 듣기 먼저 모드 = 영어 숨긴 채 N번 자동 반복 후 공개+멈춤 | 아들이 영어 자막을 보고 "읽기"만 함 → 소리 먼저 듣게 (사용자 요청). 반복 횟수는 공개 이후부터 셈 | 숨기기만 하고 반복은 수동 (연속 재생이면 3번 못 듣고 넘어감) |
| 2026-09-12 | 태블릿 브라우저는 Chrome 76 미만 (구형) | file.arrayBuffer 없음. 이후 코드도 2019년 이전 문법/API로 유지 | 브라우저 업데이트 요구 (안 될 수 있음) |
| 2026-09-12 | 단어장 = 앱 내장 JSON (기본형 사전 + 표현 사전 + 기초 제외 목록), 변화형은 앱에서 어간 추정 | 오프라인 태블릿, API 키 없음. 영화마다 파일 안 만들고 전역 사전 하나를 키움 | 영화별 단어 파일, 온라인 사전 API |
| 2026-09-12 | 배포처 = GitHub Pages (Public 저장소) | 무료 Pages는 Public 필수. 코드만 올라가고 영상은 기기에 있으므로 공개해도 무방 (사용자 확정) | Cloudflare Pages/Netlify + Private 저장소 |

## 관련 파일/자료
- 메인 코드: `index.html`, `js/app.js`, `js/player.js`, `js/library.js`, `js/srt.js`, `js/db.js`
- 설정 파일: `manifest.webmanifest`, `sw.js`
- 테스트: `samples/` (샘플 srt), 로컬 서버 `serve.ps1`
- 문서: `.task-memory/`, `process.md`

## 기존 코드 주의사항
- 새 프로젝트 (기존 코드 없음)
- 영상/자막 파일은 절대 커밋하지 않음 (`.gitignore`에 `*.mp4`, `*.srt`, `content/` 등)

## 작업 중 발견한 것
- Codex 세션 ID: `.context/codex-session-id` (gitignore) — `/codex`로 이어서 재검토 가능
- `command -v python3`가 Windows 스토어 스텁으로 잡힘 → codex 파이프 끊김. `python` 또는 절대경로 사용
- vm 컨텍스트에서 만든 객체는 `assert.deepEqual` 실패 (프로토타입 다름) → 필드 단위 비교
- Claude Code Bash 도구 heredoc은 `\`를 `\`로 바꿔버림 → 백슬래시 포함 코드는 Write/Edit 도구로 작성할 것
- `scrollIntoView`는 페이지 전체를 스크롤시켜 폰에서 화면이 튐 → 목록 컨테이너 `scrollTo`로 대체
- 헤드리스 Chrome은 미디어 재생 시간이 실제와 다르게 흐름 → 타이밍 검증은 실기기에서
- 테스트 영상: ffmpeg 없음 → 헤드리스 브라우저 canvas+MediaRecorder로 12초 WebM 생성 (scratchpad/sample.webm)

## 콘텐츠 준비 (2026-09-12)
- 원본 위치: `F:\per\mp3\` — 토이스토리5 / 모아나(2026) / 미니언즈&몬스터즈, 전부 mkv+x265 → Chrome 재생 불가
- ffmpeg 설치: `winget install Gyan.FFmpeg` → `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_*fmpeg-9.0.1-full_buildin` (새 셸에서는 PATH에 있음)
- NVENC 불가 (NVIDIA 드라이버 12.2 < 필요 13.1) → CPU libx264 `-preset faster -crf 23`, 720p, AAC 스테레오 160k, 약 6배속
- 영어 자막: 세 편 모두 **mkv 내장** (`-map 0:2 -c:s srt`) → `toystory5.en.srt`, `moana.en.srt`, `minions.en.srt`
- 싱크(`node tools/synccheck.mjs`): 토이스토리5 -0.04s ✅ / 모아나 -0.01s ✅ / 미니언즈 +0.39s ⚠️(겹침 매칭으로 흡수)
- 미니언즈 영어는 CC라 효과음 설명 많음 → cleanText에서 `(…)` `[…]` `NAME:` 제거 (2137→1408큐)
- 사용자가 구한 KyoGo "srt"는 실제로는 한글 자막(smi와 동일) → 불필요

## 배포/사용 환경 (2026-09-12)
- 개발 PC = 사무실 PC (사용자는 집에서 원격 접속 중). 실제 사용은 집 노트북 → 안드로이드 태블릿
- 사무실 PC Tailscale IP: 100.93.254.65 (tailnet에 안드로이드 jjin22도 있음) → 영상 파일 전송 경로로 사용
- GitHub: gh CLI 로그인 jjinuchung / 배포 주소 예정: https://jjinuchung.github.io/shincoach/

## 주의: 이 PC의 다른 서비스
- TRADEMY Mobile API(`100.93.254.65:8765`)가 상시 실행 중 → 무거운 작업(ffmpeg 등)은 반드시 Idle 우선순위로 (CPU 100%면 폰 앱 타임아웃)

## 단어장 확장 절차
1. `node tools/vocab_extract.mjs F:/per/mp3/<영화>.en.srt > 후보.txt` (이미 사전에 있는 단어·기초·이름 제외)
2. 후보에 한글 뜻 작성 → `vocab/words.json`에 병합 (키 = 기본형, "=단어"는 별칭)
3. `node tools/vocab_scan.mjs <srt>` 로 커버리지 확인, `npm test`
4. `sw.js` CACHE_VERSION 올리고 배포 (cache-first라 안 올리면 옛 사전이 남음)

## 메모
- 사용자: 아버님 (C#/.NET MAUI, Python 경험). 사용자 아들: 초등 4학년.
- 테스트 순서: PC Chrome → 아버님 안드로이드 폰 → 아들 안드로이드 태블릿
- 참고 서비스: 박코치 어학원, 케이크(Cake), Language Reactor

---
**마지막 업데이트**: 2026-09-12 (1~6단계 구현 후)
