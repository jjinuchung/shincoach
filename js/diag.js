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

/** 브라우저 종류 판별: 삼성 인터넷은 UA에 Chrome/xx 도 들어 있어서 따로 구분해야 함 */
function browserInfo() {
  const ua = navigator.userAgent;
  const ver = chromeVersion();
  const samsung = ua.match(/SamsungBrowser\/(\d+(?:\.\d+)?)/);
  if (samsung) return { name: `삼성 인터넷 ${samsung[1]} (Chrome ${ver} 엔진)`, samsung: true, ver };
  if (/EdgA\//.test(ua)) return { name: `Edge (Chrome ${ver} 엔진)`, samsung: false, ver };
  if (/; wv\)/.test(ua)) return { name: `앱 내장 브라우저(WebView, Chrome ${ver})`, samsung: false, ver };
  return { name: ver ? `Chrome ${ver}` : ua.slice(0, 60), samsung: false, ver };
}

/** 지원 여부 목록 렌더링 */
export function renderDiag() {
  const ul = $('diag-list');
  if (!ul) return;
  const hasMic = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const hasRec = typeof window.MediaRecorder !== 'undefined';
  const hasSpeech = !!SpeechRecognitionCtor();
  const hasAudio = !!(window.AudioContext || window.webkitAudioContext);
  const b = browserInfo();
  const ver = b.ver;
  const rows = [
    ['브라우저', b.name + (b.samsung ? ' — 음성 인식이 안 됨. Play 스토어에서 Chrome을 설치해 Chrome으로 열어 주세요' : ''), b.samsung ? '❌' : (ver >= 76 ? '✅' : (ver ? '⚠️ 오래됨' : '❓'))],
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

/** 마이크 3초 테스트: 최대 음량 측정 + 녹음 크기 (어디서 막히는지 단계별 표시) */
async function testMic() {
  const out = $('diag-result');
  if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { out.textContent = '❌ 이 브라우저는 마이크 접근을 지원하지 않아요'; return; }
  // AudioContext는 반드시 터치(클릭) 직후 동기적으로 만들고 resume — 권한 대기 뒤에 만들면 옛 Chrome에서 suspended로 남음
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = AC ? new AC() : null;
  if (ctx && ctx.resume) ctx.resume().catch(() => {});
  out.textContent = '🎤 마이크 권한을 허용해 주세요…';
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } });
  } catch (err) {
    out.textContent = `❌ 마이크를 열 수 없어요: ${err.name} — 안드로이드 설정 → 앱 → Chrome → 권한 → 마이크 확인`;
    if (ctx && ctx.close) ctx.close();
    return;
  }
  const track = stream.getAudioTracks()[0];
  const trackInfo = track ? `트랙: ${track.label || '(이름 없음)'} / enabled=${track.enabled} muted=${track.muted} state=${track.readyState}` : '트랙 없음';
  const steps = [trackInfo];
  const show = (msg) => { out.textContent = steps.concat([msg]).join('\n'); };

  // 1) MediaRecorder로 3초 녹음 → 파일 크기 (소리 분석과 독립적인 두 번째 증거)
  let recorder = null;
  const chunks = [];
  if (typeof window.MediaRecorder !== 'undefined') {
    try {
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.start(250);
    } catch (e) { steps.push(`녹음기 시작 실패: ${e.message}`); recorder = null; }
  }

  // 2) 소리 분석
  let peak = 0; let loudFrames = 0; let frames = 0;
  if (ctx) {
    try {
      if (ctx.resume) await ctx.resume();
      steps.push(`소리 분석기 상태: ${ctx.state}`);
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const started = Date.now();
      await new Promise((resolve) => {
        const tick = () => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
          const rms = Math.sqrt(sum / buf.length);
          peak = Math.max(peak, rms); frames++;
          if (rms > 0.02) loudFrames++;
          show(`🎤 말해 보세요! ${Math.max(0, 3 - Math.floor((Date.now() - started) / 1000))}초  (지금 음량 ${Math.round(rms * 100)}, 최대 ${Math.round(peak * 100)})`);
          if (Date.now() - started < 3000) requestAnimationFrame(tick); else resolve();
        };
        tick();
      });
    } catch (err) { steps.push(`소리 분석 실패: ${err.message}`); }
  } else {
    await new Promise((r) => setTimeout(r, 3000));
  }

  // 3) 녹음 결과
  let recBytes = 0;
  if (recorder) {
    await new Promise((resolve) => { recorder.onstop = resolve; try { recorder.stop(); } catch (e) { resolve(); } });
    recBytes = chunks.reduce((a, b) => a + b.size, 0);
  }
  stream.getTracks().forEach((t) => t.stop());
  if (ctx && ctx.close) ctx.close().catch(() => {});

  const ratio = frames ? Math.round((loudFrames / frames) * 100) : 0;
  const verdict = peak > 0.02 ? '✅ 소리 감지됨' : (recBytes > 3000 ? '⚠️ 분석기는 0이지만 녹음 데이터는 있음(분석기 문제)' : '❌ 소리가 전혀 안 들어옴(마이크/권한 문제)');
  steps.push(`최대 음량 ${Math.round(peak * 100)}, 말소리 비율 ${ratio}%, 3초 녹음 ${recBytes}바이트`);
  show(verdict);
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
  const trace = [];
  const show = (msg) => { out.textContent = `${msg}\n단계: ${trace.join(' → ') || '(시작 전)'}`; };
  ['start', 'audiostart', 'soundstart', 'speechstart', 'speechend', 'soundend', 'audioend'].forEach((ev) => {
    rec['on' + ev] = () => { trace.push(ev); show(out.textContent.split('\n')[0]); };
  });
  show('🗣 영어로 아무 문장이나 말해 보세요 (5초)… 예: "I love toys"');
  rec.onresult = (e) => {
    got = true;
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript + ' ';
      else interim += r[0].transcript;
    }
    show(`🗣 인식 중: ${finalText}${interim}`);
  };
  rec.onerror = (e) => {
    const why = { 'not-allowed': '마이크 권한 거부', 'no-speech': '말소리를 못 들음', network: '인터넷 필요(구글 음성 서버)', 'audio-capture': '마이크 없음', 'service-not-allowed': '음성 서비스 사용 불가' }[e.error] || e.error;
    show(`❌ 음성 인식 오류: ${why} (${e.error})`);
  };
  rec.onend = () => {
    trace.push('end');
    if (finalText || got) show(`✅ 음성 인식 결과: "${(finalText || '(중간 결과만)').trim()}"`);
    else if (!out.textContent.startsWith('❌')) show('⚠️ 인식된 말이 없어요');
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
