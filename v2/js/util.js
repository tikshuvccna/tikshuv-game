/* כלי עזר כלליים: מתמטיקה, צבעים, טקסט בעברית על הקנבס, חלקיקים */
window.TK = window.TK || {};
(function (TK) {
  'use strict';
  TK.W = 1280;
  TK.H = 720;
  TK.FONT = 'Rubik,Heebo,"Segoe UI",Arial,sans-serif';

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  TK.clamp = clamp;
  TK.lerp = (a, b, t) => a + (b - a) * t;
  TK.smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  TK.easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  TK.easeInOut = (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  TK.rng = (seed) => {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  TK.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  TK.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /* ---------- צבעים ---------- */
  const cache = {};
  function parse(c) {
    if (cache[c]) return cache[c];
    let h = c.replace('#', '');
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    return (cache[c] = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]);
  }
  const hx = (n) => ('0' + Math.round(n).toString(16)).slice(-2);
  TK.mix = (a, b, t) => {
    const p = parse(a), q = parse(b);
    t = clamp(t, 0, 1);
    return '#' + hx(p[0] + (q[0] - p[0]) * t) + hx(p[1] + (q[1] - p[1]) * t) + hx(p[2] + (q[2] - p[2]) * t);
  };
  TK.rgba = (c, a) => {
    const p = parse(c);
    return 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + a + ')';
  };

  /* ---------- ציור ---------- */
  TK.rr = (ctx, x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  /* טקסט: מיושר לפי align (left/right/center), כיוון RTL כברירת מחדל */
  TK.txt = (ctx, s, x, y, o) => {
    o = o || {};
    ctx.save();
    ctx.font = (o.weight || 600) + ' ' + (o.size || 20) + 'px ' + TK.FONT;
    ctx.direction = o.dir || 'rtl';
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.base || 'middle';
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowSize || 14; }
    if (o.stroke) { ctx.lineWidth = o.strokeW || 4; ctx.strokeStyle = o.stroke; ctx.strokeText(s, x, y); }
    ctx.fillStyle = o.color || '#fff';
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.fillText(s, x, y);
    ctx.restore();
  };

  TK.wrapLines = (ctx, s, maxW, size, weight) => {
    ctx.save();
    ctx.font = (weight || 500) + ' ' + size + 'px ' + TK.FONT;
    const words = String(s).split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    ctx.restore();
    return lines;
  };

  /* פסקה: כותבת שורות אחת מתחת לשנייה. מחזירה את הגובה שנצרך */
  TK.para = (ctx, s, x, y, maxW, o) => {
    o = o || {};
    const size = o.size || 20, lh = o.lh || size * 1.45;
    const lines = TK.wrapLines(ctx, s, maxW, size, o.weight);
    lines.forEach((l, i) => TK.txt(ctx, l, x, y + i * lh, o));
    return lines.length * lh;
  };

  /* ---------- חלקיקים ---------- */
  TK.makeFx = () => {
    const list = [];
    return {
      list,
      emit(o) {
        if (list.length > 900) list.shift();
        list.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, life: 1, size: 4, color: '#fff', g: 0, shape: 'sq', drag: 0, rot: 0, vr: 0 }, o, { max: o.life || 1 }));
      },
      burst(x, y, color, n, speed, o) {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * 6.283, s = (0.3 + Math.random() * 0.7) * (speed || 200);
          this.emit(Object.assign({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6 + Math.random() * 0.7, size: 2 + Math.random() * 4, color, g: 260, drag: 1.2, vr: (Math.random() - 0.5) * 10 }, o));
        }
      },
      ring(x, y, color, maxR, life, w) {
        this.emit({ shape: 'ring', x, y, maxR, color, life: life || 0.9, size: w || 4 });
      },
      update(dt) {
        for (let i = list.length - 1; i >= 0; i--) {
          const p = list[i];
          p.life -= dt;
          if (p.life <= 0) { list.splice(i, 1); continue; }
          p.vx -= p.vx * p.drag * dt;
          p.vy += p.g * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += p.vr * dt;
        }
      },
      draw(ctx) {
        ctx.save();
        for (const p of list) {
          const a = Math.max(0, p.life / p.max);
          ctx.globalAlpha = a;
          if (p.shape === 'ring') {
            const r = p.maxR * (1 - a);
            ctx.strokeStyle = p.color; ctx.lineWidth = p.size * a + 1;
            ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.283); ctx.stroke();
          } else if (p.shape === 'text') {
            TK.txt(ctx, p.text, p.x, p.y, { size: p.size, color: p.color, weight: 700, glow: p.color, glowSize: 8 });
          } else {
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color; ctx.shadowBlur = 8;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, p.size * (0.5 + a * 0.5), 0, 6.283); ctx.fill(); }
            else ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
          }
        }
        ctx.restore();
      }
    };
  };
})(window.TK);
