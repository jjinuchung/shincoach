# 신코치 (shincoach) — 영어 섀도잉 학습 PWA

초등학생용. 애니메이션 영상(mp4)과 자막(srt/smi)을 넣으면 **문장 단위**로 듣고 따라 말하는 연습을 할 수 있다.

## 기능
- 문장 이전/다음 이동, 전체 대사 목록에서 탭하여 이동
- 영어/한글 이중 자막 (각각 켜기/끄기), 단어 하이라이트
- 반복: 끔 / 3회 / 5회 / 무한
- 속도: 0.6x / 0.8x / 1.0x / 1.25x (음정 유지)
- 섀도잉 모드: 문장 재생 → 자동 정지 → 따라 말하기 → 자동 다음 문장
- 마지막 본 문장 이어보기, 홈 화면 설치(PWA), 오프라인 실행
- 영상은 기기 브라우저 저장소(IndexedDB)에 보관 — 서버에 올라가지 않음

## PC에서 실행
```powershell
.\serve.ps1        # 또는 python -m http.server 8080
```
Chrome에서 http://localhost:8080 접속 → **＋ 영상 가져오기** → 제목, mp4, 영어 자막(srt/smi), (선택) 한글 자막
- smi 한 파일에 영어·한글이 같이 있으면(ENCC/KRCC) 영어 칸에만 넣어도 둘 다 자동 인식
- CP949(EUC-KR) 인코딩 자막도 자동 처리

키보드: `Space` 재생/정지, `←`/`→` 이전/다음 문장, `R` 반복, `S` 속도, `D` 섀도잉, `Esc` 목록

## 안드로이드에서 실행
GitHub Pages 주소를 Chrome으로 열고 "홈 화면에 추가". 영상은 폰 저장소에서 가져오기.

## 콘텐츠 준비 (mkv/x265 영상일 때)
```powershell
# 영어 자막이 mkv에 내장돼 있는지 확인 → 있으면 추출
ffprobe -v error -show_entries stream=index,codec_type,codec_name:stream_tags=language,title -of compact 영상.mkv
ffmpeg -i 영상.mkv -map 0:2 -c:s srt 영어.srt
# Chrome용 mp4 변환 (720p H.264 + AAC 스테레오)
ffmpeg -i 영상.mkv -map 0:v:0 -map 0:a:0 -sn -vf "scale=-2:720,format=yuv420p" -c:v libx264 -preset faster -crf 23 -c:a aac -ac 2 -b:a 160k -movflags +faststart 영상.mp4
# 영어/한글 자막 싱크 확인
node tools/synccheck.mjs 영어.srt 한글.smi
```

## 개발
```
npm test                    # 자막 파서 테스트 (node --test)
```
- `js/srt.js` 자막 파서(srt/vtt)/병합/문장 합치기/단어 타이밍
- `js/sami.js` smi(SAMI) 파서 → 언어별 트랙 → srt 텍스트로 변환
- `js/db.js` IndexedDB 저장
- `js/library.js` 가져오기·목록
- `js/player.js` 플레이어
- `sw.js` 코드 수정 후 배포 시 `CACHE_VERSION` 올리기
