/* ══════════ 對話框 ══════════ */
'use strict';

const Dialogue = {
  el: null,
  nameEl: null,
  textEl: null,
  portraitEl: null,
  portraitCanvas: null,
  active: false,
  queue: [],
  idx: 0,
  typing: 0,      /* 已打出的字數 */
  typeTimer: 0,
  current: null,
  onAdvance: null,
  speed: 0.032,   /* 每字秒數 */
  t: 0,
  blink: makeBlinkState(),

  init() {
    this.el = $('#dialogue');
    this.nameEl = $('#dlg-name');
    this.textEl = $('#dlg-text');
    this.portraitCanvas = $('#dlg-portrait');
    this.el.addEventListener('click', () => this.advance());
  },

  /* lines: [{ name, text, who:'player'|'npc'|'mystery', revealed, onEnter, onExit }] */
  start(lines, onDone) {
    this.queue = lines;
    this.idx = 0;
    this.onAdvance = onDone || null;
    this.showLine();
  },

  showLine() {
    if (this.idx >= this.queue.length) {
      this.close();
      if (this.onAdvance) { const f = this.onAdvance; this.onAdvance = null; f(); }
      return;
    }
    this.current = this.queue[this.idx];
    const cur = this.current;
    this.el.classList.remove('hidden');
    /* 重新觸發彈出動畫 */
    this.el.style.animation = 'none';
    void this.el.offsetWidth;
    this.el.style.animation = '';
    this.nameEl.textContent = cur.name;
    this.nameEl.style.background = cur.who === 'player' ? '#7EC8E3' : (cur.revealed ? '#FF8FB2' : '#B9A794');
    this.drawPortrait(cur);
    this.typing = 0;
    this.typeTimer = 0;
    this.textEl.textContent = '';
    this.active = true;
    if (cur.onEnter) cur.onEnter();
  },

  drawPortrait(cur) {
    const ctx = this.portraitCanvas.getContext('2d');
    const size = this.portraitCanvas.width;
    ctx.clearRect(0, 0, size, size);
    if (cur.who === 'mystery' && !cur.revealed) {
      /* ??? 頭像 */
      ctx.fillStyle = '#C9B8A5';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFF8EC';
      ctx.font = `900 ${size * 0.42}px "M PLUS Rounded 1c", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', size / 2, size / 2 + 2);
    } else {
      const cfg = cur.who === 'player' ? Game.playerCfg : XIAOYOU_CFG;
      drawPortrait(ctx, cfg, size, { t: this.t, blink: this.blinkVal(), gaze: 0 });
    }
  },

  blinkVal() { return this.blink.timer > 0 ? 1 : 0; },

  update(dt) {
    if (!this.active || !this.current) return;
    this.t += dt;
    this.blink.update(dt, this.t);
    if (this.typing < this.current.text.length) {
      this.typeTimer += dt;
      const n = Math.floor(this.typeTimer / this.speed);
      this.typing = Math.min(this.current.text.length, this.typing + n);
      this.textEl.textContent = this.current.text.slice(0, this.typing);
      /* 頭像眨眼更新 */
      this.drawPortrait(this.current);
    } else if (this.blink.timer > 0) {
      this.drawPortrait(this.current);
    }
  },

  advance() {
    if (!this.active || !this.current) return;
    if (this.typing < this.current.text.length) {
      this.typing = this.current.text.length;
      this.textEl.textContent = this.current.text;
      return;
    }
    if (this.current.onExit) this.current.onExit();
    this.idx++;
    this.showLine();
  },

  close() {
    this.active = false;
    this.current = null;
    this.el.classList.add('hidden');
  },
};
