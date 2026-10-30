/* ══════════ Q 版角色繪製 ══════════ */
'use strict';

/* ── 配色與選項（避開背景咖啡色系） ── */
const PALETTES = {
  skin: [
    { id: 'milk', name: '奶白', c: '#FFE9D4' },
    { id: 'peach', name: '蜜桃', c: '#FFD9B4' },
    { id: 'apricot', name: '杏色', c: '#F7C592' },
    { id: 'sakura', name: '櫻花', c: '#FFCDC4' },
  ],
  hair: [
    { id: 'cocoa', name: '可可', c: '#7A564A' },
    { id: 'latte', name: '拿鐵', c: '#A97C62' },
    { id: 'berry', name: '黑莓', c: '#3A3450' },
    { id: 'indigo', name: '靛藍', c: '#4A5B93' },
    { id: 'sky', name: '天藍', c: '#4E9BD8' },
    { id: 'mint', name: '薄荷', c: '#59C29A' },
    { id: 'pink', name: '粉紅', c: '#FF8FB2' },
    { id: 'rose', name: '櫻紅', c: '#F06292' },
    { id: 'gold', name: '金色', c: '#F7C948' },
    { id: 'lilac', name: '薰衣草', c: '#A27BD8' },
  ],
  eye: [
    { id: 'cocoaEye', name: '可可棕', c: '#6E4A33' },
    { id: 'ink', name: '墨黑', c: '#3A3550' },
    { id: 'blue', name: '海藍', c: '#4A7BC8' },
    { id: 'green', name: '草綠', c: '#4FA87C' },
    { id: 'purple', name: '星紫', c: '#8E6BC8' },
    { id: 'amber', name: '蜜橘', c: '#DE8A3C' },
    { id: 'rose', name: '莓紅', c: '#D25C7A' },
  ],
  nose: [
    { id: 'n1', name: '蜜桃粉', c: '#F0A184' },
    { id: 'n2', name: '暖桃', c: '#E58E6E' },
    { id: 'n3', name: '杏色', c: '#D57F5C' },
    { id: 'n4', name: '暖棕', c: '#C06A4A' },
  ],
  mouth: [
    { id: 'm1', name: '桃粉', c: '#E85D8A' },
    { id: 'm2', name: '莓紅', c: '#D8446E' },
    { id: 'm3', name: '橘紅', c: '#E86A48' },
    { id: 'm4', name: '深粉', c: '#C24B7C' },
  ],
  top: [
    { id: 'whiteL', name: '白色長袖', c: '#FFFFFF' },
    { id: 'blackL', name: '黑色長袖', c: '#45455A' },
    { id: 'whiteS', name: '白色短袖', c: '#FFFFFF' },
    { id: 'blackS', name: '黑色短袖', c: '#45455A' },
  ],
  bottom: [
    { id: 'shortDenim', name: '牛仔短褲', c: '#7FB3D8' },
    { id: 'longDenim', name: '牛仔長褲', c: '#5E8FC2' },
    { id: 'coffeeLong', name: '深咖長褲', c: '#57473C' },
  ],
};

const HAIR_STYLES = [
  { id: 'short', name: '蓬蓬短髮' },
  { id: 'bob', name: '波波頭' },
  { id: 'pony', name: '側馬尾' },
  { id: 'twins', name: '雙馬尾' },
  { id: 'long', name: '長髮' },
  { id: 'curly', name: '卷卷頭' },
];
const EYE_SHAPES = [
  { id: 'round', name: '圓圓' },
  { id: 'oval', name: '橢圓' },
  { id: 'cat', name: '貓貓眼' },
  { id: 'dot', name: '豆豆眼' },
];
const NOSE_SHAPES = [
  { id: 'dot', name: '圓點' },
  { id: 'curve', name: '小弧' },
  { id: 'drop', name: '水滴' },
];
const MOUTH_SHAPES = [
  { id: 'smile', name: '微笑' },
  { id: 'open', name: '張嘴' },
  { id: 'cat', name: '貓嘴' },
  { id: 'dot', name: '小圓' },
];

function defaultConfig(gender) {
  return gender === 'female' ? {
    gender, skin: 'milk', hair: 'cocoa', eye: 'cocoaEye', nose: 'n1', mouth: 'm1',
    hairStyle: 'long', eyeShape: 'round', noseShape: 'dot', mouthShape: 'smile',
    top: 'whiteS', bottom: 'shortDenim', pack: 'beige',
  } : {
    gender, skin: 'milk', hair: 'cocoa', eye: 'cocoaEye', nose: 'n1', mouth: 'm1',
    hairStyle: 'short', eyeShape: 'round', noseShape: 'dot', mouthShape: 'smile',
    top: 'blackL', bottom: 'coffeeLong', pack: 'brown',
  };
}

function resolveConfig(cfg) {
  const pick = (key, id) => (PALETTES[key].find(p => p.id === id) || PALETTES[key][0]).c;
  return {
    skinColor: pick('skin', cfg.skin),
    hairColor: pick('hair', cfg.hair),
    eyeColor: pick('eye', cfg.eye),
    noseColor: pick('nose', cfg.nose),
    mouthColor: pick('mouth', cfg.mouth),
    topColor: pick('top', cfg.top),
    bottomColor: pick('bottom', cfg.bottom),
    isLongSleeve: cfg.top === 'whiteL' || cfg.top === 'blackL',
    isShortPants: cfg.bottom === 'shortDenim',
    ...cfg,
  };
}

/* ── 眨眼狀態（dt 驅動） ── */
function makeBlinkState() {
  return {
    next: 2 + Math.random() * 2.5,
    timer: 0,
    update(dt, t) {
      if (this.timer > 0) { this.timer -= dt; return 1; }
      if (t >= this.next) { this.timer = 0.13; this.next = t + 2.4 + Math.random() * 3.2; }
      return 0;
    },
  };
}

/* ══════════ 主繪製 ══════════
 * o = { x, y(腳底), facing: down|up|left|right, t, walking, gaze(-1..1),
 *       blink(0..1,1=閉眼), scale, alpha }
 */
function drawCharacter(ctx, cfg, o) {
  const c = resolveConfig(cfg);
  const s = o.scale ?? 1;
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(s, s);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;

  const t = o.t ?? 0;
  const walking = o.walking;
  const ph = t * 11;
  const bob = walking ? Math.sin(ph) * 2.2 : Math.sin(t * 2.4) * 1.4;
  const f = o.facing ?? 'down';
  const fx = f === 'left' ? -1 : f === 'right' ? 1 : 0;
  const gz = (o.gaze ?? 0) * (f === 'left' || f === 'right' ? 0.5 : 1);
  const closed = o.eyesClosed || (o.blink ?? 0) > 0.5;

  /* 影子 */
  ctx.fillStyle = 'rgba(90,62,43,0.20)';
  ellipse(ctx, fx * 1, 1, 19, 7.5);

  /* ── 後層頭髮（在身體後方） ── */
  const headY = -58 + bob * 0.5;
  drawBackHair(ctx, c, fx, headY);

  /* ── 腿與鞋 ── */
  const liftL = walking ? Math.max(0, Math.sin(ph)) * 3 : 0;
  const liftR = walking ? Math.max(0, -Math.sin(ph)) * 3 : 0;
  for (const side of [-1, 1]) {
    const lift = side < 0 ? liftL : liftR;
    const x = side * 6 + fx * 1.5;
    /* 腿 */
    ctx.fillStyle = c.isShortPants ? c.skinColor : c.bottomColor;
    roundRectPath(ctx, x - 3.8, -13 - lift, 7.6, 11.5 + lift, 3.6);
    ctx.fill();
    /* 短褲 */
    if (c.isShortPants) {
      ctx.fillStyle = c.bottomColor;
      roundRectPath(ctx, x - 4.2, -13 - lift, 8.4, 8, 3.2);
      ctx.fill();
      /* 牛仔翻邊（淺色滾邊，對照 art 短褲） */
      ctx.fillStyle = shade(c.bottomColor, 0.22);
      roundRectPath(ctx, x - 4.2, -6.8 - lift, 8.4, 2.4, 1.2);
      ctx.fill();
      ctx.strokeStyle = shade(c.bottomColor, -0.18);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x - 3.4, -5.6 - lift);
      ctx.lineTo(x + 3.4, -5.6 - lift);
      ctx.stroke();
    }
    /* 鞋（帆布鞋：白鞋面＋鞋底＋鞋帶，對照 art 立繪） */
    const sx = x + fx * 1.2, sy = -1.8 - lift;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#CBB89E';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 5.6, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    /* 鞋底 */
    ctx.strokeStyle = '#D9C8AE';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.arc(sx, sy - 0.5, 4.8, Math.PI * 0.18, Math.PI * 0.82);
    ctx.stroke();
    /* 鞋帶 */
    ctx.strokeStyle = '#E8DCC8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx - 2.4, sy - 2.2);
    ctx.lineTo(sx + 2.4, sy - 1.4);
    ctx.moveTo(sx - 2.4, sy - 0.8);
    ctx.lineTo(sx + 2.4, sy - 1.8);
    ctx.stroke();
  }
  /* 工裝褲口袋（小宥深咖長褲） */
  if (c.bottom === 'coffeeLong') {
    ctx.fillStyle = shade(c.bottomColor, -0.18);
    ctx.strokeStyle = shade(c.bottomColor, -0.3);
    ctx.lineWidth = 1;
    for (const side of [-1, 1]) {
      const lift = side < 0 ? liftL : liftR;
      const x = side * 6 + fx * 1.5;
      roundRectPath(ctx, x - 2.7, -10 - lift, 5.4, 4.6, 1.6);
      ctx.fill();
      ctx.stroke();
    }
  }

  /* ── 身體（上衣） ── */
  ctx.fillStyle = c.topColor;
  ctx.strokeStyle = shade(c.topColor, -0.16);
  ctx.lineWidth = 2;
  roundRectPath(ctx, -13, -40 + bob * 0.3, 26, 30, 9);
  ctx.fill();
  ctx.stroke();
  /* 領口 */
  ctx.fillStyle = shade(c.topColor, c.topColor === '#FFFFFF' ? -0.1 : 0.25);
  ellipse(ctx, 0, -38.5 + bob * 0.3, 5.5, 3);
  /* T 恤下擺線 */
  ctx.strokeStyle = shade(c.topColor, -0.1);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-10.5, -12.5 + bob * 0.3);
  ctx.quadraticCurveTo(0, -10.5 + bob * 0.3, 10.5, -12.5 + bob * 0.3);
  ctx.stroke();
  /* 黑色長袖＝開襟拉鍊外套（對照小宥：領子＋拉鍊＋內搭白T） */
  if (c.top === 'blackL') {
    const y0 = -40 + bob * 0.3;
    ctx.fillStyle = '#FFF8EC';
    ctx.beginPath();
    ctx.moveTo(-7.5, y0 + 1.5);
    ctx.quadraticCurveTo(0, y0 + 14, 7.5, y0 + 1.5);
    ctx.quadraticCurveTo(0, y0 + 6.5, -7.5, y0 + 1.5);
    ctx.closePath();
    ctx.fill();
    /* 立領（兩片小三角） */
    ctx.fillStyle = shade(c.topColor, -0.18);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 1.5, y0 + 0.5);
      ctx.lineTo(side * 8.2, y0 + 2);
      ctx.lineTo(side * 5.6, y0 + 8.5);
      ctx.closePath();
      ctx.fill();
    }
    /* 拉鍊 */
    ctx.strokeStyle = '#9A9AAC';
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, y0 + 14);
    ctx.lineTo(0, y0 + 27);
    ctx.stroke();
    /* 拉鍊頭 */
    ctx.fillStyle = '#9A9AAC';
    ellipse(ctx, 0, y0 + 15.5, 1.5, 2.3);
  }

  /* ── 手臂 ── */
  for (const side of [-1, 1]) {
    const swing = walking ? Math.sin(ph + (side < 0 ? Math.PI : 0)) * 2.6 : Math.sin(t * 2.4 + side) * 0.9;
    const ax = side * 15.5 + fx * 2.5;
    const top = -36 + bob * 0.3;
    const handY = -14;
    if (c.isLongSleeve) {
      ctx.strokeStyle = c.topColor;
      capsule(ctx, ax, top, ax + swing, handY + 2, 7);
      ctx.strokeStyle = shade(c.topColor, -0.16);
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(ax + swing, handY + 3, 3.6, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 7;
    } else {
      /* 短袖：上段衣服 + 下段皮膚 */
      ctx.strokeStyle = c.topColor;
      capsule(ctx, ax, top, ax + swing * 0.4, top + 9, 7.5);
      ctx.strokeStyle = c.skinColor;
      capsule(ctx, ax + swing * 0.4, top + 9, ax + swing, handY + 2, 6);
    }
    /* 手 */
    ctx.fillStyle = c.skinColor;
    ellipse(ctx, ax + swing, handY, 3.7, 3.7);
  }

  /* 書包背帶（畫在手臂上：背帶穿在最外面；制服時不畫） */
  if (c.pack && f !== 'up' && !(o.gear && o.gear.uniform)) drawPackStraps(ctx, c, bob);

  /* ── 頭 ── */
  const headX = fx * 1.6;
  const R = 25;
  ctx.fillStyle = c.skinColor;
  ctx.beginPath();
  ctx.arc(headX, headY, R, 0, Math.PI * 2);
  ctx.fill();

  if (f === 'up') {
    drawBackViewHair(ctx, c, headX, headY, R);
  } else {
    /* 瀏海帽 */
    drawBangs(ctx, c, headX, headY, R, fx);
    /* 臉 */
    drawFace(ctx, c, headX, headY, R, gz, closed, t);
  }

  /* 書包包體（背面視角，畫在垂髮之後→包在髮前，對應角色立繪） */
  if (c.pack && f === 'up' && !(o.gear && o.gear.uniform)) drawPackBody(ctx, c, bob);

  /* ── 打工裝備：制服（白T+紅領+紅圍裙） / 帽子（紅帽+M） ── */
  if (o.gear) {
    if (o.gear.uniform) {
      const y0 = -40 + bob * 0.3;
      /* 白T */
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#E4D5BD';
      ctx.lineWidth = 1.8;
      roundRectPath(ctx, -12.6, y0 + 0.8, 25.2, 28.5, 8.5);
      ctx.fill(); ctx.stroke();
      /* 紅色 Polo 領 */
      ctx.strokeStyle = '#D94F4F';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, y0 + 3.4, 6.4, 0, Math.PI); ctx.stroke();
      /* 紅圍裙 */
      ctx.fillStyle = '#D94F4F';
      roundRectPath(ctx, -9.5, y0 + 10.5, 19, 17.5, 3.5);
      ctx.fill();
      ctx.strokeStyle = '#B93B3B';
      ctx.lineWidth = 1.3;
      ctx.strokeRect(-5, y0 + 17, 10, 7);
    }
    if (o.gear.hat) {
      const hy = headY - 10;
      /* 帽簷 */
      ctx.fillStyle = '#C43F3F';
      roundRectPath(ctx, headX - 20, hy + 1, 40, 7, 3.5);
      ctx.fill();
      /* 帽身 */
      ctx.fillStyle = '#D94F4F';
      ctx.beginPath();
      ctx.arc(headX, hy + 2.5, 17.5, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      /* 小 M */
      ctx.strokeStyle = '#F7C948';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      const mw = 5.4, my = hy - 2.5;
      const arch = (x0) => {
        ctx.beginPath();
        ctx.moveTo(x0, my + 3.6);
        ctx.quadraticCurveTo(x0, my - 2.6, x0 + mw / 2, my - 2.6);
        ctx.quadraticCurveTo(x0 + mw, my - 2.6, x0 + mw, my + 3.6);
        ctx.stroke();
      };
      arch(headX - mw - 1.2);
      arch(headX + 1.2);
    }
  }

  ctx.restore();
}

/* 呆毛（細捲髮，對照 art 立繪）：x,y 為頭中心，R 為頭半徑 */
function ahoge(ctx, x, y, R) {
  const col = ctx.fillStyle; /* 沿用目前髮色 */
  const r = R + 1.5;
  ctx.save();
  ctx.strokeStyle = col;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 1, y - r + 2);
  ctx.quadraticCurveTo(x - 5, y - r - 7, x + 3, y - r - 12);
  ctx.quadraticCurveTo(x + 8.5, y - r - 15, x + 5, y - r - 10.5);
  ctx.quadraticCurveTo(x + 4, y - r - 8.5, x + 7.5, y - r - 10);
  ctx.stroke();
  ctx.restore();
}

/* ── 書包（對應角色立繪：玩家與小宥都背書包） ── */
const PACKS = {
  beige: { base: '#E8D5B3', dark: '#C9B28D', pocket: '#DCC8A4', strap: '#D9C4A0' },
  brown: { base: '#8A6A4F', dark: '#6E5440', pocket: '#7A5C46', strap: '#8A6A4F' },
};
/* 正面：胸前兩條背帶 */
function drawPackStraps(ctx, c, bob) {
  const p = PACKS[c.pack];
  if (!p) return;
  const y0 = -40 + bob * 0.3;
  ctx.fillStyle = p.strap;
  ctx.strokeStyle = p.dark;
  ctx.lineWidth = 1;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 13.5, y0 + 2);
    ctx.quadraticCurveTo(side * 13, y0 - 0.5, side * 10.5, y0);
    ctx.lineTo(side * 8.6, y0 + 25);
    ctx.quadraticCurveTo(side * 8.4, y0 + 27.6, side * 11.4, y0 + 27);
    ctx.lineTo(side * 13.9, y0 + 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  /* 背帶中段小橫線（釦環） */
  ctx.lineCap = 'round';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-11.3, y0 + 9.5);
  ctx.lineTo(-10.9, y0 + 14);
  ctx.moveTo(10.9, y0 + 9.5);
  ctx.lineTo(11.3, y0 + 14);
  ctx.stroke();
}
/* 背面：包體＋前置口袋＋提把 */
function drawPackBody(ctx, c, bob) {
  const p = PACKS[c.pack];
  if (!p) return;
  const y0 = -40 + bob * 0.3;
  ctx.fillStyle = p.base;
  ctx.strokeStyle = p.dark;
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, -13, y0, 26, 27, 8);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-13, y0 + 8);
  ctx.lineTo(13, y0 + 8);
  ctx.stroke();
  ctx.fillStyle = p.pocket;
  roundRectPath(ctx, -9, y0 + 15, 18, 9, 3);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-4, y0);
  ctx.quadraticCurveTo(0, y0 - 4.5, 4, y0);
  ctx.stroke();
}

/* ── 後層頭髮（身前側看） ── */
function drawBackHair(ctx, c, fx, headY) {
  const x = fx * 1.6;
  ctx.fillStyle = c.hairColor;
  switch (c.hairStyle) {
    case 'long': {
      /* 長髮：四尖波浪，髮尾到胸口（對應小島女版） */
      ctx.beginPath();
      ctx.moveTo(x - 27, headY - 6);
      ctx.bezierCurveTo(x - 32, headY + 8, x - 33, headY + 26, x - 29, headY + 38);
      ctx.bezierCurveTo(x - 28, headY + 42, x - 26, headY + 44, x - 24, headY + 44.5);
      ctx.quadraticCurveTo(x - 20, headY + 38, x - 16.5, headY + 38.5);
      ctx.quadraticCurveTo(x - 13, headY + 44.5, x - 9.5, headY + 46.5);
      ctx.quadraticCurveTo(x - 5, headY + 41.5, x, headY + 41);
      ctx.quadraticCurveTo(x + 5, headY + 41.5, x + 9.5, headY + 46.5);
      ctx.quadraticCurveTo(x + 13, headY + 44.5, x + 16.5, headY + 38.5);
      ctx.quadraticCurveTo(x + 20, headY + 38, x + 24, headY + 44.5);
      ctx.bezierCurveTo(x + 26, headY + 44, x + 28, headY + 42, x + 29, headY + 38);
      ctx.bezierCurveTo(x + 33, headY + 26, x + 32, headY + 8, x + 27, headY - 6);
      ctx.closePath();
      ctx.fill();
      /* 髮絲：兩暗兩亮 */
      ctx.lineCap = 'round';
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = shade(c.hairColor, -0.22);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 14, headY + 6);
      ctx.bezierCurveTo(x - 16, headY + 18, x - 16, headY + 30, x - 13, headY + 41);
      ctx.moveTo(x + 12, headY + 8);
      ctx.bezierCurveTo(x + 14, headY + 20, x + 14, headY + 31, x + 11, headY + 42);
      ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = shade(c.hairColor, 0.35);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x - 19, headY + 12);
      ctx.bezierCurveTo(x - 21, headY + 22, x - 21, headY + 34, x - 19, headY + 43);
      ctx.moveTo(x + 16, headY - 12);
      ctx.bezierCurveTo(x + 20, headY - 8, x + 23, headY - 2, x + 24, headY + 4);
      ctx.stroke();
      ctx.restore();
      /* 呆毛 */
      ahoge(ctx, x, headY, 27);
      break;
    }
    case 'twins': {
      for (const side of [-1, 1]) {
        const px = x + side * 27;
        ctx.beginPath();
        ctx.moveTo(px - side * 8, headY - 2);
        ctx.bezierCurveTo(px + side * 12, headY + 6, px + side * 11, headY + 26, px + side * 2, headY + 40);
        ctx.bezierCurveTo(px - side * 4, headY + 30, px - side * 12, headY + 12, px - side * 8, headY - 2);
        ctx.fill();
        /* 髮圈 */
        ctx.fillStyle = '#FF7FA8';
        ellipse(ctx, px - side * 3, headY + 1, 4.5, 4.5);
        ctx.fillStyle = c.hairColor;
      }
      break;
    }
    case 'pony': {
      const side = fx === -1 ? 1 : -1; /* 馬尾擺在反方向 */
      const px = x + side * 28;
      ctx.beginPath();
      ctx.moveTo(px - side * 9, headY - 2);
      ctx.bezierCurveTo(px + side * 13, headY + 6, px + side * 12, headY + 28, px + side * 2, headY + 44);
      ctx.bezierCurveTo(px - side * 4, headY + 32, px - side * 13, headY + 12, px - side * 9, headY - 2);
      ctx.fill();
      ctx.fillStyle = '#FF7FA8';
      ellipse(ctx, px - side * 3, headY + 1, 4.5, 4.5);
      ctx.fillStyle = c.hairColor;
      break;
    }
    case 'bob': {
      ctx.beginPath();
      ctx.moveTo(x - 26, headY - 6);
      ctx.quadraticCurveTo(x - 28, headY + 20, x - 20, headY + 26);
      ctx.lineTo(x + 20, headY + 26);
      ctx.quadraticCurveTo(x + 28, headY + 20, x + 26, headY - 6);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
}

/* ── 背面瀏海（面向 up） ── */
function drawBackViewHair(ctx, c, x, y, R) {
  ctx.fillStyle = c.hairColor;
  switch (c.hairStyle) {
    case 'curly': {
      ctx.beginPath();
      ctx.arc(x, y, R + 1.5, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        ellipse(ctx, x + Math.cos(a) * (R + 1), y + Math.sin(a) * (R + 1), 6.5, 6.5);
      }
      break;
    }
    case 'long': {
      ctx.beginPath();
      ctx.arc(x, y, R + 1.5, 0, Math.PI * 2);
      ctx.fill();
      /* 垂髮：四尖波浪（背面視角，髮尾垂到書包下方） */
      ctx.beginPath();
      ctx.moveTo(x - R * 1.04, y + R * 0.32);
      ctx.bezierCurveTo(x - R * 1.24, y + R * 0.88, x - R * 1.24, y + R * 1.44, x - R * 1.08, y + R * 1.96);
      ctx.quadraticCurveTo(x - R * 0.88, y + R * 1.72, x - R * 0.72, y + R * 1.9);
      ctx.quadraticCurveTo(x - R * 0.44, y + R * 1.68, x - R * 0.22, y + R * 1.98);
      ctx.quadraticCurveTo(x, y + R * 1.76, x + R * 0.22, y + R * 1.98);
      ctx.quadraticCurveTo(x + R * 0.44, y + R * 1.68, x + R * 0.72, y + R * 1.9);
      ctx.quadraticCurveTo(x + R * 0.88, y + R * 1.72, x + R * 1.08, y + R * 1.96);
      ctx.bezierCurveTo(x + R * 1.24, y + R * 1.44, x + R * 1.24, y + R * 0.88, x + R * 1.04, y + R * 0.32);
      ctx.closePath();
      ctx.fill();
      /* 髮絲（兩亮一暗） */
      ctx.lineCap = 'round';
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = shade(c.hairColor, 0.3);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x - R * 0.48, y - R * 0.64);
      ctx.bezierCurveTo(x - R * 0.56, y, x - R * 0.56, y + R * 0.72, x - R * 0.44, y + R * 1.6);
      ctx.moveTo(x + R * 0.32, y - R * 0.72);
      ctx.bezierCurveTo(x + R * 0.4, y - R * 0.08, x + R * 0.4, y + R * 0.64, x + R * 0.32, y + R * 1.52);
      ctx.stroke();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = shade(c.hairColor, -0.2);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - R * 0.16, y - R * 0.8);
      ctx.bezierCurveTo(x - R * 0.2, y - R * 0.16, x - R * 0.2, y + R * 0.56, x - R * 0.12, y + R * 1.44);
      ctx.stroke();
      ctx.restore();
      ahoge(ctx, x, y, R);
      break;
    }
    case 'twins': {
      ctx.beginPath();
      ctx.arc(x, y, R + 1.5, 0, Math.PI * 2);
      ctx.fill();
      for (const side of [-1, 1]) {
        const px = x + side * (R + 4);
        ctx.beginPath();
        ctx.ellipse(px, y + 22, 11, 22, side * 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FF7FA8';
        ellipse(ctx, x + side * (R - 2), y + 2, 4.5, 4.5);
        ctx.fillStyle = c.hairColor;
      }
      break;
    }
    case 'pony': {
      ctx.beginPath();
      ctx.arc(x, y, R + 1.5, 0, Math.PI * 2);
      ctx.fill();
      const px = x + (R + 5);
      ctx.beginPath();
      ctx.ellipse(px, y + 24, 10.5, 23, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FF7FA8';
      ellipse(ctx, x + R - 1, y + 1, 4.5, 4.5);
      break;
    }
    default: { /* short / bob */
      ctx.beginPath();
      ctx.arc(x, y, R + 1.5, 0, Math.PI * 2);
      ctx.fill();
      /* 後頸碎髮（小鋸齒） */
      ctx.beginPath();
      ctx.moveTo(x - R * 0.44, y + R * 1.06);
      ctx.lineTo(x - R * 0.24, y + R * 1.2);
      ctx.lineTo(x - R * 0.04, y + R * 1.06);
      ctx.lineTo(x + R * 0.18, y + R * 1.22);
      ctx.lineTo(x + R * 0.4, y + R * 1.08);
      ctx.lineTo(x + R * 0.4, y + R * 0.96);
      ctx.quadraticCurveTo(x, y + R * 1.06, x - R * 0.44, y + R * 1.06);
      ctx.closePath();
      ctx.fill();
      if (c.hairStyle === 'bob') {
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(x + side * (R + 1), y + 12, 7.5, 15, side * 0.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (c.hairStyle === 'short') {
        /* 後頭頂碎刺（三撮，對應小島男版） */
        for (const [a, b, cc] of [
          [[-0.48, -0.88], [-0.56, -1.32], [-0.2, -1.08]],
          [[-0.04, -1.08], [0.16, -1.52], [0.32, -1.04]],
          [[0.32, -1.0], [0.56, -1.28], [0.52, -0.8]],
        ]) {
          ctx.beginPath();
          ctx.moveTo(x + a[0] * R, y + a[1] * R);
          ctx.lineTo(x + b[0] * R, y + b[1] * R);
          ctx.lineTo(x + cc[0] * R, y + cc[1] * R);
          ctx.closePath();
          ctx.fill();
        }
        /* 一條高光 */
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = shade(c.hairColor, 0.3);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - R * 0.4, y - R * 0.64);
        ctx.quadraticCurveTo(x - R * 0.24, y - R * 0.88, x, y - R * 0.96);
        ctx.stroke();
        ctx.restore();
        ahoge(ctx, x, y, R);
      }
      break;
    }
  }
}

/* 長髮：中分簾幕瀏海（中央最高、平滑凹弧掃到太陽穴，對應小島女版） */
function drawLongBangsCap(ctx, c, x, y, R, r) {
  ctx.fillStyle = c.hairColor;
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI, Math.PI * 2);
  ctx.quadraticCurveTo(x + R * 0.92, y + R * 0.04, x + R * 0.72, y - R * 0.08);
  ctx.quadraticCurveTo(x + R * 0.44, y - R * 0.28, x + R * 0.28, y - R * 0.52);
  ctx.quadraticCurveTo(x + R * 0.12, y - R * 0.76, x, y - R * 0.88);
  ctx.quadraticCurveTo(x - R * 0.12, y - R * 0.76, x - R * 0.28, y - R * 0.52);
  ctx.quadraticCurveTo(x - R * 0.44, y - R * 0.28, x - R * 0.72, y - R * 0.08);
  ctx.quadraticCurveTo(x - R * 0.92, y + R * 0.04, x - r, y);
  ctx.closePath();
  ctx.fill();
  /* 中分兩側細細碎髮 */
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = shade(c.hairColor, -0.18);
  ctx.lineWidth = Math.max(1, R * 0.056);
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * R * 0.06, y - R * 0.76);
    ctx.quadraticCurveTo(x + side * R * 0.152, y - R * 0.58, x + side * R * 0.112, y - R * 0.38);
    ctx.stroke();
  }
  ctx.restore();
}

/* 蓬蓬短髮：深色底＋耳朵＋平滑髮線＋四撮寬圓髮片＋四顆頭頂碎刺（對應小島男版） */
function drawShortBangsCap(ctx, c, x, y, R, r) {
  /* 深色底（髮際線加層 depth；髮線與主帽同步抬高，不蓋眼睛） */
  ctx.fillStyle = shade(c.hairColor, -0.25);
  ctx.beginPath();
  ctx.arc(x, y + R * 0.08, R + 3, Math.PI, Math.PI * 2);
  ctx.lineTo(x + R + 3, y + R * 0.38);
  ctx.quadraticCurveTo(x + R * 0.88, y + R * 0.28, x + R * 0.8, y + R * 0.22);
  ctx.quadraticCurveTo(x + R * 0.64, y, x + R * 0.48, y - R * 0.1);
  ctx.quadraticCurveTo(x + R * 0.24, y - R * 0.24, x, y - R * 0.24);
  ctx.quadraticCurveTo(x - R * 0.24, y - R * 0.24, x - R * 0.48, y - R * 0.1);
  ctx.quadraticCurveTo(x - R * 0.64, y, x - R * 0.8, y + R * 0.22);
  ctx.quadraticCurveTo(x - R * 0.88, y + R * 0.28, x - R - 3, y + R * 0.38);
  ctx.closePath();
  ctx.fill();
  /* 耳朵 */
  ctx.fillStyle = c.skinColor;
  for (const side of [-1, 1]) ellipse(ctx, x + side * R * 0.98, y + R * 0.24, R * 0.14, R * 0.18);
  ctx.strokeStyle = shade(c.skinColor, -0.12);
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * R * 1.02, y + R * 0.18);
    ctx.quadraticCurveTo(x + side * R * 0.96, y + R * 0.24, x + side * R * 1.01, y + R * 0.31);
    ctx.stroke();
  }
  /* 主瀏海帽（平滑波浪髮線，最低點在眉上） */
  ctx.fillStyle = c.hairColor;
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI, Math.PI * 2);
  ctx.quadraticCurveTo(x + R * 1.04, y + R * 0.26, x + R * 0.98, y + R * 0.3);
  ctx.quadraticCurveTo(x + R * 0.9, y + R * 0.24, x + R * 0.8, y + R * 0.14);
  ctx.quadraticCurveTo(x + R * 0.62, y - R * 0.06, x + R * 0.48, y - R * 0.18);
  ctx.quadraticCurveTo(x + R * 0.24, y - R * 0.32, x, y - R * 0.32);
  ctx.quadraticCurveTo(x - R * 0.24, y - R * 0.32, x - R * 0.48, y - R * 0.18);
  ctx.quadraticCurveTo(x - R * 0.62, y - R * 0.06, x - R * 0.8, y + R * 0.14);
  ctx.quadraticCurveTo(x - R * 0.9, y + R * 0.24, x - R * 0.98, y + R * 0.3);
  ctx.quadraticCurveTo(x - R * 1.04, y + R * 0.26, x - r, y);
  ctx.closePath();
  ctx.fill();
  /* 四撮寬圓瀏海髮片（不對稱；尖端全在眉眼之上，露出整片額頭） */
  for (const t of [
    [-0.8, -0.14, -0.7, -0.02, -0.58, -0.04, -0.48, -0.16, -0.42, -0.26],
    [-0.46, -0.22, -0.36, -0.08, -0.26, -0.12, -0.16, -0.24, -0.08, -0.3],
    [0.12, -0.3, 0.2, -0.24, 0.3, -0.14, 0.4, -0.1, 0.46, -0.22],
    [0.5, -0.24, 0.58, -0.1, 0.66, -0.06, 0.74, -0.02, 0.78, -0.08],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x + t[0] * R, y + t[1] * R);
    ctx.quadraticCurveTo(x + t[2] * R, y + t[3] * R, x + t[4] * R, y + t[5] * R);
    ctx.quadraticCurveTo(x + t[6] * R, y + t[7] * R, x + t[8] * R, y + t[9] * R);
    ctx.closePath();
    ctx.fill();
  }
  /* 頭頂碎刺（四顆，不對稱） */
  for (const [a, b, cc] of [
    [[-0.68, -0.84], [-0.84, -1.4], [-0.36, -1.0]],
    [[-0.32, -1.0], [-0.12, -1.6], [0.16, -0.96]],
    [[0.2, -0.96], [0.48, -1.36], [0.6, -0.8]],
    [[0.6, -0.76], [0.88, -1.04], [0.84, -0.52]],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x + a[0] * R, y + a[1] * R);
    ctx.lineTo(x + b[0] * R, y + b[1] * R);
    ctx.lineTo(x + cc[0] * R, y + cc[1] * R);
    ctx.closePath();
    ctx.fill();
  }
  /* 兩條髮絲高光 */
  ctx.save();
  ctx.strokeStyle = shade(c.hairColor, 0.3);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(x - R * 0.48, y - R * 0.72);
  ctx.quadraticCurveTo(x - R * 0.32, y - R * 1.04, x - R * 0.08, y - R * 1.12);
  ctx.stroke();
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(x + R * 0.24, y - R * 0.88);
  ctx.quadraticCurveTo(x + R * 0.4, y - R * 1.04, x + R * 0.56, y - R * 0.96);
  ctx.stroke();
  ctx.restore();
}

/* ── 瀏海帽（前面/側面） ── */
function drawBangs(ctx, c, x, y, R, fx) {
  ctx.fillStyle = c.hairColor;
  const r = R + 2;
  if (c.hairStyle === 'long') {
    /* 長髮：中分簾幕瀏海（對應小島女版） */
    drawLongBangsCap(ctx, c, x, y, R, r);
  } else if (c.hairStyle === 'short') {
    /* 蓬蓬短髮：底＋耳朵＋瀏海帽＋髮片＋碎刺（對應小島男版） */
    drawShortBangsCap(ctx, c, x, y, R, r);
  } else {
    ctx.beginPath();
    /* 上半圓（從左端點繞頂端至右端點） */
    ctx.arc(x, y, r, Math.PI, Math.PI * 2);
    /* 瀏海下緣（由右往左回到起點）；座標需加上頭中心偏移 */
    const pts = bangPoints(c.hairStyle, R, fx).map(p => [x + p[0], y + p[1]]);
    if (c.hairStyle === 'curly') {
      /* 波浪邊 */
      const n = 4;
      for (let i = 0; i < n; i++) {
        const p0 = pts[pts.length - 1 - i];
        const p1 = pts[pts.length - 2 - i];
        const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2 + R * 0.12;
        ctx.quadraticCurveTo(mx, my, p1[0], p1[1]);
      }
    } else {
      for (let i = pts.length - 1; i >= 1; i--) ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.closePath();
    ctx.fill();
  }

  /* 側臉時，後側多補一塊髮 */
  if (fx !== 0) {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    if (fx === 1) ctx.arc(x, y, r, Math.PI, Math.PI * 1.5);       /* 後方 = 左 */
    else ctx.arc(x, y, r, Math.PI * 1.5, Math.PI * 2);           /* 後方 = 右 */
    ctx.closePath();
    ctx.fill();
    /* 額側碎髮 */
    ctx.beginPath();
    const bx = x - fx * r * 0.72, by = y + r * 0.18;
    ctx.moveTo(bx, by - r * 0.3);
    ctx.quadraticCurveTo(bx - fx * r * 0.28, by + r * 0.1, bx - fx * r * 0.1, by + r * 0.42);
    ctx.quadraticCurveTo(bx + fx * r * 0.16, by + r * 0.05, bx, by - r * 0.3);
    ctx.fill();
  }

  /* 長髮：臉頰兩側側髮（過耳垂到鎖骨，對照小島女版） */
  if (c.hairStyle === 'long') {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + side * R * 0.96, y - R * 0.08);
      ctx.bezierCurveTo(x + side * R * 1.12, y + R * 0.48, x + side * R * 1.12, y + R * 1.2, x + side * R * 0.92, y + R * 1.8);
      ctx.quadraticCurveTo(x + side * R * 0.78, y + R * 1.64, x + side * R * 0.82, y + R * 1.4);
      ctx.bezierCurveTo(x + side * R * 0.92, y + R * 0.92, x + side * R * 0.88, y + R * 0.4, x + side * R * 0.78, y - R * 0.04);
      ctx.closePath();
      ctx.fill();
    }
  }

  /* 髮絲高光（左上大片＋頂上一小塊） */
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.16;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.68, Math.PI * 1.08, Math.PI * 1.36);
  ctx.stroke();
  ctx.lineWidth = r * 0.1;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.68, Math.PI * 1.44, Math.PI * 1.52);
  ctx.stroke();

  /* 呆毛（蓬蓬短髮/長髮，參考設定圖） */
  if (c.hairStyle === 'short' || c.hairStyle === 'long') ahoge(ctx, x, y, R);
}

/* 瀏海邊緣點（由左往右），x 相對頭中心、y 相對頭中心（向下為正） */
function bangPoints(style, R, fx) {
  const shift = fx * R * 0.22;
  const P = (dx, dy) => [dx + shift, dy];
  /* 瀏海高度基準（對照 art/ 立繪）：髮線要高，前額露出大半，
   * 最低發絲也只到眉毛上方（眉頂約在 -0.29R），兩側耳上保留低點包住頭髮 */
  switch (style) {
    case 'bob':
      return [P(-R * 1.06, R * 0.06), P(-R * 0.6, -R * 0.26), P(-R * 0.3, -R * 0.4), P(0, -R * 0.44), P(R * 0.3, -R * 0.4), P(R * 0.6, -R * 0.26), P(R * 1.06, R * 0.06)];
    case 'pony':
    case 'twins':
      return [P(-R * 1.06, R * 0.08), P(-R * 0.6, -R * 0.24), P(-R * 0.15, -R * 0.4), P(R * 0.35, -R * 0.34), P(R * 0.75, -R * 0.18), P(R * 1.06, R * 0.08)];
    case 'curly':
    default:
      return [P(-R * 1.06, R * 0.1), P(-R * 0.55, -R * 0.3), P(0, -R * 0.42), P(R * 0.55, -R * 0.3), P(R * 1.06, R * 0.1)];
  }
}

/* ── 臉 ── */
function drawFace(ctx, c, x, y, R, gz, closed, t) {
  const ox = gz * R * 0.2;

  /* 腮紅（兩層柔化，對照 art 立繪） */
  ctx.fillStyle = 'rgba(255,128,150,0.22)';
  ellipse(ctx, x - R * 0.6 + ox * 0.5, y + R * 0.4, R * 0.24, R * 0.14);
  ellipse(ctx, x + R * 0.6 + ox * 0.5, y + R * 0.4, R * 0.24, R * 0.14);
  ctx.fillStyle = 'rgba(255,128,150,0.30)';
  ellipse(ctx, x - R * 0.6 + ox * 0.5, y + R * 0.4, R * 0.16, R * 0.09);
  ellipse(ctx, x + R * 0.6 + ox * 0.5, y + R * 0.4, R * 0.16, R * 0.09);

  const ex = R * 0.38, ey = y + R * 0.08;

  /* 眉毛 */
  ctx.strokeStyle = shade(c.hairColor, -0.15);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + side * ex + ox * 0.7, ey - R * 0.24, R * 0.13, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }

  /* 眼睛 */
  if (closed) {
    ctx.strokeStyle = c.eyeColor;
    ctx.lineWidth = 2.6;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + side * ex + ox, ey + R * 0.04, R * 0.13, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  } else {
    for (const side of [-1, 1]) {
      const exx = x + side * ex + ox, eyy = ey;
      drawEye(ctx, c, exx, eyy, R, side);
    }
  }

  /* 鼻子 */
  const nx = x + ox * 0.6, ny = y + R * 0.3;
  ctx.fillStyle = c.noseColor;
  ctx.strokeStyle = c.noseColor;
  switch (c.noseShape) {
    case 'curve':
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(nx, ny - R * 0.05, R * 0.07, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
      break;
    case 'drop':
      ctx.beginPath();
      ctx.moveTo(nx, ny - R * 0.07);
      ctx.quadraticCurveTo(nx + R * 0.08, ny + R * 0.04, nx, ny + R * 0.07);
      ctx.quadraticCurveTo(nx - R * 0.08, ny + R * 0.04, nx, ny - R * 0.07);
      ctx.fill();
      break;
    default:
      ellipse(ctx, nx, ny, R * 0.055, R * 0.045);
  }

  /* 嘴巴 */
  const mx = x + ox * 0.7, my = y + R * 0.52;
  ctx.fillStyle = c.mouthColor;
  ctx.strokeStyle = c.mouthColor;
  ctx.lineCap = 'round';
  switch (c.mouthShape) {
    case 'open':
      ctx.beginPath();
      ctx.ellipse(mx, my, R * 0.11, R * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(c.mouthColor, -0.25);
      ellipse(ctx, mx, my + R * 0.05, R * 0.06, R * 0.06);
      break;
    case 'cat':
      ctx.lineWidth = 2.2;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(mx + side * R * 0.075, my - R * 0.02, R * 0.075, Math.PI * 0.05, Math.PI * 0.95);
        ctx.stroke();
      }
      break;
    case 'dot':
      ellipse(ctx, mx, my, R * 0.05, R * 0.04);
      break;
    default: /* smile */
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(mx, my - R * 0.05, R * 0.14, Math.PI * 0.12, Math.PI * 0.88);
      ctx.stroke();
  }
}

function drawEye(ctx, c, x, y, R, side) {
  let rx, ry;
  switch (c.eyeShape) {
    case 'oval': rx = R * 0.15; ry = R * 0.23; break;
    case 'cat': rx = R * 0.19; ry = R * 0.15; break;
    case 'dot': rx = R * 0.10; ry = R * 0.11; break;
    default: rx = R * 0.18; ry = R * 0.23; /* round＝大圓眼（對照 art 立繪） */
  }
  const dir = side || (x >= 0 ? 1 : -1);

  /* 豆豆眼：簡潔圓點 */
  if (c.eyeShape === 'dot') {
    ctx.fillStyle = c.eyeColor;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ellipse(ctx, x + rx * 0.3, y - ry * 0.35, rx * 0.32, rx * 0.32);
    return;
  }

  /* 虹膜（加大） */
  ctx.fillStyle = c.eyeColor;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();

  /* 虹膜下半深色（立體感） */
  ctx.save();
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = 'rgba(35,22,14,0.30)';
  ctx.beginPath(); ctx.ellipse(x, y + ry * 0.6, rx * 1.05, ry * 0.68, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  /* 大高光（左上）＋小高光（右下） */
  ctx.fillStyle = '#FFFFFF';
  ellipse(ctx, x - rx * 0.32, y - ry * 0.42, rx * 0.42, rx * 0.42);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ellipse(ctx, x + rx * 0.38, y + ry * 0.32, rx * 0.2, rx * 0.2);

  /* 上眼瞼粗線（動漫風） */
  ctx.strokeStyle = '#2E2018';
  ctx.lineWidth = Math.max(1.8, rx * 0.32);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(x, y, rx * 1.02, ry * 1.02, 0, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();

  /* 貓貓眼外眼角挑 */
  if (c.eyeShape === 'cat') {
    ctx.lineWidth = Math.max(1.6, rx * 0.26);
    ctx.beginPath();
    ctx.moveTo(x + dir * rx * 0.72, y - ry * 0.55);
    ctx.lineTo(x + dir * rx * 1.28, y - ry * 0.95);
    ctx.stroke();
  }
}

/* ══════════ 躺著（剛醒） ══════════ */
function drawLying(ctx, cfg, o) {
  const c = resolveConfig(cfg);
  ctx.save();
  ctx.translate(o.x, o.y);
  const s = o.scale ?? 1;
  ctx.scale(s, s);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  const t = o.t ?? 0;
  const bob = Math.sin(t * 2) * 1.2;
  const gz = o.gaze ?? 0;
  const closed = o.eyesClosed !== false;

  /* 影子 */
  ctx.fillStyle = 'rgba(90,62,43,0.16)';
  ellipse(ctx, 2, 6, 52, 16);

  /* 小毯子 */
  ctx.fillStyle = '#FFE1EA';
  ctx.strokeStyle = '#F5B8CC';
  ctx.lineWidth = 2.5;
  roundRectPath(ctx, -46, -22, 96, 40, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FFC2D4';
  for (const [dx, dy] of [[-26, -6], [-4, 4], [18, -8], [34, 6], [-36, 10], [28, -14]]) {
    ellipse(ctx, dx, dy, 3, 3);
  }

  /* 身體（被毯子蓋住，露出肩膀） */
  ctx.fillStyle = '#FFD3E0';
  roundRectPath(ctx, -18, -16 + bob * 0.3, 58, 26, 12);
  ctx.fill();
  /* 露出的手臂 */
  ctx.fillStyle = c.skinColor;
  ellipse(ctx, -8, -14 + bob * 0.3, 6, 6);

  /* 頭 */
  const hx = -30, hy = -16 + bob * 0.5, R = 23;
  /* 後髮 */
  ctx.fillStyle = c.hairColor;
  if (c.hairStyle === 'long') ellipse(ctx, hx - 4, hy + 4, R * 1.15, R * 0.95);
  ctx.fillStyle = c.skinColor;
  ctx.beginPath();
  ctx.arc(hx, hy, R, 0, Math.PI * 2);
  ctx.fill();
  drawBangs(ctx, c, hx, hy, R, 0);
  drawFace(ctx, c, hx, hy, R, gz, closed, t);

  ctx.restore();
}

/* ══════════ 頭像（對話框用） ══════════ */
function drawPortrait(ctx, cfg, size, o = {}) {
  ctx.clearRect(0, 0, size, size);
  const c = resolveConfig(cfg);
  const x = size / 2, y = size / 2 + size * 0.06;
  const R = size * 0.36;
  const t = o.t ?? 0;
  const closed = o.eyesClosed || (o.blink ?? 0) > 0.5;

  /* 後髮（drawBackHair 以 R=25 為基準，縮放到頭像半徑） */
  const k = R / 25;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.translate(0, -58);
  drawBackHair(ctx, c, 0, 58);
  ctx.restore();

  ctx.fillStyle = c.skinColor;
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fill();
  /* 瀏海 + 臉 */
  drawBangs(ctx, c, x, y, R, o.gaze ?? 0);
  drawFace(ctx, c, x, y, R, o.gaze ?? 0, closed, t);
}

/* ══════════ NPC：小宥（參考 art/小宥.png） ══════════ */
const XIAOYOU_CFG = {
  gender: 'female',
  skin: 'milk', hair: 'cocoa', eye: 'cocoaEye', nose: 'n1', mouth: 'm1',
  hairStyle: 'long', eyeShape: 'round', noseShape: 'dot', mouthShape: 'smile',
  top: 'whiteS', bottom: 'shortDenim', pack: 'beige',
};
