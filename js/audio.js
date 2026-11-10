/* ══════════ 音效系統（SFX Web Audio 合成；BGM 純 <audio>，見下方註記） ══════════ */
'use strict';

const AudioSys = {
  ctx: null,
  muted: (function () { try { return localStorage.getItem('cute-kingdom-muted') === '1'; } catch (e) { return false; } })(),
  bgmPlaying: false,
  bgmEl: null,
  _master: null,
};

const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);

function audioCtx() {
  if (!AudioSys.ctx) {
    AudioSys.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (AudioSys.ctx.state === 'suspended') AudioSys.ctx.resume();
  return AudioSys.ctx;
}

function masterGain() {
  const ac = audioCtx();
  if (!AudioSys._master) {
    AudioSys._master = ac.createGain();
    AudioSys._master.gain.value = AudioSys.muted ? 0.0001 : 1;
    AudioSys._master.connect(ac.destination);
  }
  return AudioSys._master;
}

/* 單一音：attack→decay 包絡 */
function tone(freq, t0, dur, opt = {}) {
  const { type = 'sine', vol = 0.08, attack = 0.012, release = 0.1, slideTo = 0 } = opt;
  const ac = audioCtx();
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
  o.connect(g);
  g.connect(masterGain());
  o.start(t0);
  o.stop(t0 + dur + release + 0.05);
}

/* 噪声（過濾）：whoosh 用 */
function noiseSfx(t0, dur, vol, freq) {
  const ac = audioCtx();
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(freq, t0);
  f.frequency.exponentialRampToValueAtTime(freq * 2.2, t0 + dur);
  f.Q.value = 0.7;
  const g = ac.createGain();
  g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(masterGain());
  src.start(t0);
}

/* ── 音效 ── */
function sfx(name) {
  if (AudioSys.muted) return;
  let ac;
  try { ac = audioCtx(); } catch (e) { return; }
  const t = ac.currentTime + 0.01;
  switch (name) {
    case 'click':
      tone(760, t, 0.045, { type: 'triangle', vol: 0.055, release: 0.05 });
      break;
    case 'confirm':
      tone(587, t, 0.06, { type: 'triangle', vol: 0.07, release: 0.06 });
      tone(880, t + 0.07, 0.1, { type: 'triangle', vol: 0.07, release: 0.12 });
      break;
    case 'back':
      tone(520, t, 0.06, { type: 'triangle', vol: 0.06, release: 0.06 });
      tone(392, t + 0.06, 0.09, { type: 'triangle', vol: 0.06, release: 0.1 });
      break;
    case 'place':
      tone(175, t, 0.1, { type: 'sine', vol: 0.13, release: 0.12 });
      tone(120, t + 0.02, 0.09, { type: 'sine', vol: 0.09, release: 0.1 });
      break;
    case 'pop':
      tone(420, t, 0.09, { type: 'sine', vol: 0.06, release: 0.08, slideTo: 900 });
      break;
    case 'blip':
      tone(950, t, 0.03, { type: 'square', vol: 0.02, release: 0.03 });
      break;
    case 'toast':
      tone(233, t, 0.14, { type: 'square', vol: 0.035, release: 0.12 });
      break;
    case 'whoosh':
      noiseSfx(t, 0.45, 0.05, 500);
      break;
    case 'wake':
      tone(392, t, 0.1, { type: 'sine', vol: 0.06, release: 0.1 });
      tone(523, t + 0.12, 0.1, { type: 'sine', vol: 0.06, release: 0.1 });
      tone(659, t + 0.24, 0.2, { type: 'sine', vol: 0.07, release: 0.3 });
      break;
    case 'ding':
      tone(1319, t, 0.08, { type: 'triangle', vol: 0.07, release: 0.15 });
      tone(1760, t + 0.01, 0.06, { type: 'sine', vol: 0.03, release: 0.12 });
      break;
    case 'buzz':
      tone(140, t, 0.16, { type: 'square', vol: 0.04, release: 0.14 });
      tone(110, t + 0.02, 0.14, { type: 'sawtooth', vol: 0.03, release: 0.12 });
      break;
    case 'coin':
      tone(988, t, 0.07, { type: 'square', vol: 0.05, release: 0.05 });
      tone(1319, t + 0.07, 0.14, { type: 'square', vol: 0.05, release: 0.16 });
      break;
    case 'tick':
      tone(1050, t, 0.03, { type: 'square', vol: 0.035, release: 0.03 });
      break;
    case 'fly':
      tone(320, t, 0.18, { type: 'sine', vol: 0.05, release: 0.16, slideTo: 880 });
      break;
    case 'scream': /* 20c 雲霄飛車尖叫（鋸波下滑＋高音短喊） */
      tone(880, t, 0.3, { type: 'sawtooth', vol: 0.14, release: 0.08, slideTo: 520 });
      tone(1180, t + 0.02, 0.22, { type: 'square', vol: 0.06, release: 0.06, slideTo: 700 });
      tone(1400, t + 0.3, 0.12, { type: 'sawtooth', vol: 0.08, release: 0.05, slideTo: 950 });
      break;
  }
}

/* ── BGM：三首實音軌（版權見 music/CREDITS.txt） ──
 * 第八輪：BGM 改純 <audio> 直接輸出，不走 Web Audio。
 * 原因：createMediaElementSource 對 file:// 媒體資源會被當跨域（opaque origin），
 *       Chrome/Firefox/Edge 直接輸出零（console: "MediaElementAudioSource outputs
 *       zeroes due to CORS access restrictions"），只有 Safari(WebKit) 寬容 →
 *       遊戲 BGM 在 file:// 開法下只有 Safari 有聲。純 <audio> 在 file:// 全平台正常，
 *       靜音改用 el.muted 控制。Web Audio 只留給 SFX（震盪器，不依賴音檔）。 */
const BGM_VOLUME = 0.5; /* BGM 比音效輕 */
const BGM_TRACKS = [
  'music/sugar-cookie.mp3', /* Sugar Cookie — Daystar (샛별) */
  'music/marshmallow.mp3',  /* Marshmallow — Lukrembo */
  'music/sunset.mp3',       /* Sunset — Lukrembo */
];
let bgmIdx = -1;
let bgmBlocked = false;    /* play() 被瀏覽器自動播放政策拒絕中 */
let bgmHintShown = false;
let bgmRetryBound = false;

/* 隨機選一首（不連重複） */
function pickBGMTrack() {
  let i;
  do { i = Math.floor(Math.random() * BGM_TRACKS.length); }
  while (BGM_TRACKS.length > 1 && i === bgmIdx);
  bgmIdx = i;
  AudioSys.bgmEl.src = BGM_TRACKS[i];
}

/* 播放 + 兜底：被 autoplay 政策擋住就記下，等下次使用者互動自動重試 */
function playBgmNow() {
  const el = AudioSys.bgmEl;
  if (!el || !AudioSys.bgmPlaying) return Promise.resolve(false);
  return el.play().then(
    () => { bgmBlocked = false; return true; },
    (e) => {
      console.warn('[BGM] play() 被拒絕：', (e && e.name) || e);
      if (e && e.name === 'NotAllowedError') {
        bgmBlocked = true;
        bindBgmRetry();
        if (!bgmHintShown) {
          bgmHintShown = true;
          showToast('🔊 瀏覽器擋了自動播放，點一下畫面就能開 BGM 囉');
        }
      }
      return false;
    }
  );
}

/* 首次被擋後，監聽下一次互動（點擊／按鍵）自動重試播放 */
function bindBgmRetry() {
  if (bgmRetryBound) return;
  bgmRetryBound = true;
  const retry = () => {
    if (!AudioSys.bgmPlaying) return;
    if (AudioSys.bgmEl && !AudioSys.bgmEl.paused) return;
    playBgmNow();
  };
  window.addEventListener('pointerdown', retry, { passive: true });
  window.addEventListener('keydown', retry, { passive: true });
}

function startBGM() {
  if (AudioSys.bgmPlaying) return;
  if (!AudioSys.bgmEl) {
    const el = new Audio();
    el.preload = 'auto';
    el.volume = BGM_VOLUME;
    el.muted = AudioSys.muted;
    el.addEventListener('ended', () => {
      if (!AudioSys.bgmPlaying) return;
      pickBGMTrack();
      playBgmNow(); /* ended 無 gesture，失敗時走重試兜底 */
    });
    AudioSys.bgmEl = el;
  }
  AudioSys.bgmPlaying = true;
  pickBGMTrack();
  console.debug('[BGM] 開始播放:', BGM_TRACKS[bgmIdx], '| 純 <audio>（不走 Web Audio，file:// 也有效）');
  playBgmNow();
}

function stopBGM() {
  AudioSys.bgmPlaying = false;
  bgmBlocked = false;
  if (AudioSys.bgmEl) AudioSys.bgmEl.pause();
}

function toggleMute() {
  AudioSys.muted = !AudioSys.muted;
  try { localStorage.setItem('cute-kingdom-muted', AudioSys.muted ? '1' : '0'); } catch (e) { /* ignore */ }
  /* SFX：Web Audio master gain */
  try {
    const ac = audioCtx();
    masterGain().gain.setTargetAtTime(AudioSys.muted ? 0.0001 : 1, ac.currentTime, 0.02);
  } catch (e) { /* ignore */ }
  /* BGM：純 <audio>，直接控元素（file:// 下也真正有效） */
  if (AudioSys.bgmEl) AudioSys.bgmEl.muted = AudioSys.muted;
  updateMuteBtn();
  if (!AudioSys.muted) {
    sfx('click');
    /* 音樂開關切回開：BGM 該播但停著（例如剛被擋）就立即重播 */
    if (AudioSys.bgmPlaying && AudioSys.bgmEl && AudioSys.bgmEl.paused) playBgmNow();
  }
}

function updateMuteBtn() {
  const b = document.getElementById('btn-mute');
  if (b) b.textContent = AudioSys.muted ? '🔇' : '🔊';
}
