/* ══════════ 音效系統（Web Audio 合成，無外部音檔） ══════════ */
'use strict';

const AudioSys = {
  ctx: null,
  muted: (function () { try { return localStorage.getItem('cute-kingdom-muted') === '1'; } catch (e) { return false; } })(),
  bgmPlaying: false,
  bgmTimer: null,
  nextTime: 0,
  step: 0,
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
  }
}

/* ── BGM：可愛小循環（C大調，132bpm，32 個八分音符） ── */
const BGM = {
  bpm: 132,
  steps: 32,
  /* 旋律（midi，0=休止）：I - IV - vi - IV 感覺 */
  melody: [
    72, 76, 79, 76, 72, 74, 76, 76,
    77, 76, 74, 72, 74, 0, 67, 0,
    72, 76, 79, 76, 81, 79, 76, 74,
    77, 79, 81, 79, 76, 74, 72, 0,
  ],
  /* 貝斯（每兩步一個音）：C F A F / C F A F→C */
  bass: [
    48, 0, 48, 0, 41, 0, 41, 0, 45, 0, 45, 0, 41, 0, 41, 0,
    48, 0, 48, 0, 41, 0, 41, 0, 45, 0, 45, 0, 41, 0, 48, 0,
  ],
};

function startBGM() {
  if (AudioSys.bgmPlaying) return;
  let ac;
  try { ac = audioCtx(); } catch (e) { return; }
  AudioSys.bgmPlaying = true;
  AudioSys.nextTime = ac.currentTime + 0.12;
  AudioSys.step = 0;
  const stepDur = 60 / BGM.bpm / 2;
  const tick = () => {
    if (!AudioSys.bgmPlaying) return;
    while (AudioSys.nextTime < ac.currentTime + 0.4) {
      const s = AudioSys.step;
      const m = BGM.melody[s];
      if (m) tone(NOTE(m), AudioSys.nextTime, stepDur * 0.92, { type: 'triangle', vol: 0.042, attack: 0.02, release: 0.06 });
      const b = BGM.bass[s];
      if (b) tone(NOTE(b), AudioSys.nextTime, stepDur * 1.7, { type: 'sine', vol: 0.05, attack: 0.02, release: 0.12 });
      AudioSys.nextTime += stepDur;
      AudioSys.step = (s + 1) % BGM.steps;
    }
    AudioSys.bgmTimer = setTimeout(tick, 90);
  };
  tick();
}

function stopBGM() {
  AudioSys.bgmPlaying = false;
  if (AudioSys.bgmTimer) clearTimeout(AudioSys.bgmTimer);
}

function toggleMute() {
  AudioSys.muted = !AudioSys.muted;
  try { localStorage.setItem('cute-kingdom-muted', AudioSys.muted ? '1' : '0'); } catch (e) { /* ignore */ }
  try {
    const ac = audioCtx();
    masterGain().gain.setTargetAtTime(AudioSys.muted ? 0.0001 : 1, ac.currentTime, 0.02);
  } catch (e) { /* ignore */ }
  updateMuteBtn();
  if (!AudioSys.muted) sfx('click');
}

function updateMuteBtn() {
  const b = document.getElementById('btn-mute');
  if (b) b.textContent = AudioSys.muted ? '🔇' : '🔊';
}
