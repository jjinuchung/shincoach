// 기기 진단: 마이크·녹음·음성 인식 지원 여부와 실제 동작 테스트 (설정 화면)
// 구형 브라우저에서도 돌아야 하므로 최신 문법(?., ??, ||=)은 쓰지 않는다.

const $ = (id) => document.getElementById(id);

function SpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function chromeVersion() {
  const m = navigator.userAgent.match(/Chrome\/(\d+)/);
  return m ? Number(m[1]) : 0;
}

/** 지원 여부 목록 렌더링 */
export function renderDiag() {
  const ul = $('diag-list');
  if (!ul) return;
  const hasMic = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const hasRec = typeof window.MediaRecorder !== 'undefined';
  const hasSpeech = !!SpeechRecognitionCtor();
  const hasAudio = !!(window.AudioContext || window.webkitAudioContext);
  const ver = chromeVersion();
  const rows = [
    ['브라우저', ver ? `Chrome ${ver}` : navigator.userAgent.slice(0, 60), ver >= 76 ? '✅' : (ver ? '⚠️ 오래됨' : '❓')],
    ['인터넷', navigator.onLine ? '연결됨' : '끊김', navigator.onLine ? '✅' : '⚠️'],
    ['마이크 접근', hasMic ? '지원' : '미지원', hasMic ? '✅' : '❌'],
    ['소리 분석(AudioContext)', hasAudio ? '지원' : '미지원', hasAudio ? '✅' : '❌'],
    ['녹음(MediaRecorder)', hasRec ? '지원' : '미지원', hasRec ? '✅' : '❌'],
    ['음성 인식(Web Speech)', hasSpeech ? '지원' : '미지원', hasSpeech ? '✅' : '❌ (1단계 "말했는지"만 가능)'],
    ['설치 앱으로 실행', window.matchMedia && window.matchMedia('(display-mode: standalone)').matches ? '예' : '아니오(브라우저 탭)', ''],
  ];
  ul.innerHTML = '';
  for (const r of rows) {
    const li = document.createElement('li');
    li.textContent = `${r[2]} ${r[0]}: ${r[1]}`;
    ul.appendChild(li);
  }
}

/** 마이크 3초 테스트: 최대 음량 측정 */
async function testMic() {
  const out = $('diag-result');
  if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { out.textContent = '❌ 이 브라우저는 마이크 접근을 지원하지 않아요'; return; }
  out.textContent = '🎤 마이크 권한을 허용해 주세요… 허용되면 3초 동안 아무 말이나 해 보세요';
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    out.textContent = `❌ 마이크를 열 수 없어요: ${err.name} (권한 거부 또는 마이크 없음)`;
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    src.connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    let peak = 0;
    let loudFrames = 0;
    let frames = 0;
    const started = Date.now();
    await new Promise((resolve) => {
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / buf.length);
        peak = Math.max(peak, rms);
        frames++;
        if (rms > 0.02) loudFrames++;
        out.textContent = `🎤 듣는 중… ${Math.max(0, 3 - Math.floor((Date.now() - started) / 1000))}초  (음량 ${Math.round(rms * 100)})`;
        if (Date.now() - started < 3000) requestAnimationFrame(tick); else resolve();
      };
      tick();
    });
    const hasRecorder = typeof window.MediaRecorder !== 'undefined';
    const ratio = frames ? Math.round((loudFrames / frames) * 100) : 0;
    out.textContent = `${peak > 0.02 ? '✅ 소리 감지됨' : '⚠️ 소리가 거의 없음'} (최대 음량 ${Math.round(peak * 100)}, 말소리 비율 ${ratio}%) · 녹음 ${hasRecorder ? '가능' : '불가'}`;
    ctx.close && ctx.close();
  } catch (err) {
    out.textContent = `❌ 소리 분석 실패: ${err.message}`;
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}

/** 음성 인식 5초 테스트 */
function testSpeech() {
  const out = $('diag-result');
  const SR = SpeechRecognitionCtor();
  if (!SR) { out.textContent = '❌ 이 브라우저는 음성 인식을 지원하지 않아요 → 1단계(말했는지 확인)만 사용 가능'; return; }
  const rec = new SR();
  rec.lang = 'en-US';
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  let finalText = '';
  let got = false;
  out.textContent = '🗣 영어로 아무 문장이나 말해 보세요 (5초)… 예: "I love toys"';
  rec.onresult = (e) => {
    got = true;
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript + ' ';
      else interim += r[0].transcript;
    }
    out.textContent = `🗣 인식 중: ${finalText}${interim}`;
  };
  rec.onerror = (e) => {
    const why = { 'not-allowed': '마이크 권한 거부', 'no-speech': '말소리를 못 들음', network: '인터넷 필요(구글 음성 서버)', 'audio-capture': '마이크 없음', 'service-not-allowed': '음성 서비스 사용 불가' }[e.error] || e.error;
    out.textContent = `❌ 음성 인식 오류: ${why}`;
  };
  rec.onend = () => {
    if (finalText || got) out.textContent = `✅ 음성 인식 결과: "${(finalText || '(중간 결과만)').trim()}"`;
    else if (!out.textContent.startsWith('❌')) out.textContent = '⚠️ 인식된 말이 없어요 (마이크/인터넷 확인)';
  };
  try {
    rec.start();
    setTimeout(() => { try { rec.stop(); } catch (e) { /* 무시 */ } }, 5000);
  } catch (err) {
    out.textContent = `❌ 음성 인식 시작 실패: ${err.message}`;
  }
}

export function initDiag() {
  const mic = $('diag-mic');
  const sp = $('diag-speech');
  if (mic) mic.addEventListener('click', testMic);
  if (sp) sp.addEventListener('click', testSpeech);
}
