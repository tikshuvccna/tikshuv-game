/* העולם: אזורים, שכבות פרלקסה, אנימציות ואלמנטים מעולם התקשוב.
   כל אזור קיים בשני מצבים: "כבוי" (תקלה) ו"דלוק" (תוקן), והמעבר ביניהם הוא רצף חלק (lit 0..1). */
window.TK = window.TK || {};
(function (TK) {
  'use strict';
  const W = TK.W, H = TK.H, G = 610, FEET = 655;
  const mix = TK.mix, rgba = TK.rgba, rr = TK.rr, txt = TK.txt;

  const ZONES = [
    { id: 'portal', name: 'שער הכניסה', start: 0, w: 1500, sky: ['#0a0f2a', '#1e2f80'], acc: '#22e5ff', bld: '#12206b' },
    { id: 'square', name: 'כיכר הרשת', start: 1500, w: 1900, sky: ['#1a0f3c', '#7a2fb0'], acc: '#ff3df2', bld: '#3a1a6b' },
    { id: 'train', name: 'תחנת הרכבת החכמה', start: 3400, w: 1900, sky: ['#1d1030', '#e0703c'], acc: '#ffb347', bld: '#4a2440' },
    { id: 'mall', name: 'המרכז המסחרי והבנק', start: 5300, w: 1900, sky: ['#150a30', '#c2358f'], acc: '#ff6bd6', bld: '#4a1a5a' },
    { id: 'hospital', name: 'בית החולים', start: 7200, w: 1900, sky: ['#04242a', '#12a07c'], acc: '#39ff88', bld: '#0e4a4a' },
    { id: 'ai', name: 'מעבדת הבינה המלאכותית', start: 9100, w: 1900, sky: ['#0a0630', '#5a35e0'], acc: '#a78bfa', bld: '#2a1a7a' },
    { id: 'core', name: 'ליבת העיר', start: 11000, w: 2000, sky: ['#050914', '#0d4a80'], acc: '#22e5ff', bld: '#0d2a5a' }
  ];
  ZONES.forEach((z, i) => { z.i = i; z.station = i === 0 ? 0 : z.start + (i === 6 ? 1300 : 1150); z.end = z.start + z.w; });
  const END = 13000;
  const DIM_SKY = ['#0a0e1a', '#1a2138'];

  const world = {
    ZONES, G, FEET, END,
    lit: ZONES.map((z, i) => (i === 0 ? 1 : 0)),
    target: ZONES.map((z, i) => (i === 0 ? 1 : 0)),
    fx: TK.makeFx(),
    bg: {},
    portal: 1,          // עוצמת הפורטל
    solved: ZONES.map(() => false),
    doorOpen: 0
  };
  TK.world = world;

  world.zoneAt = (x) => { for (let i = ZONES.length - 1; i >= 0; i--) if (x >= ZONES[i].start) return ZONES[i]; return ZONES[0]; };
  const litAt = (x) => world.lit[world.zoneAt(x).i];

  /* ---------- רקעים אופציונליים (תמונות שהמשתמש יוסיף) ---------- */
  world.loadBackgrounds = () => {
    const base = (TK.CONFIG && TK.CONFIG.BACKGROUNDS) || 'assets/backgrounds/';
    ZONES.forEach((z) => {
      const im = new Image();
      im.onload = () => { world.bg[z.id] = im; };
      im.onerror = () => { };
      im.src = base + z.id + '.jpg';
    });
  };

  /* ---------- שכבות אופק מוכנות מראש ---------- */
  function buildSkylines() {
    ZONES.forEach((z, zi) => {
      z.layers = [[0.2, 0.9, 101], [0.5, 1.15, 202]].map(([f, hs, seed], li) => {
        const cw = Math.ceil(z.w * f) + 2, ch = 520, r = TK.rng(seed + zi * 31 + li);
        const list = [];
        let x = -10;
        while (x < cw) {
          const bw = (44 + r() * 84) * (li ? 1.25 : 1), bh = (100 + r() * 280) * hs * (li ? 1.2 : 1);
          list.push({ x, bw, bh, roof: Math.floor(r() * 4), seed: Math.floor(r() * 1e6) });
          x += bw + (r() < 0.3 ? 6 + r() * 18 : 2);
        }
        const mk = (lit) => {
          const c = document.createElement('canvas'); c.width = cw; c.height = ch;
          const g = c.getContext('2d');
          list.forEach((b) => {
            const y = ch - b.bh;
            g.fillStyle = lit ? mix(z.bld, '#000000', li ? 0.12 : 0.4) : (li ? '#141b30' : '#0e1425');
            g.fillRect(b.x, y, b.bw, b.bh);
            g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(b.x + b.bw * 0.72, y, b.bw * 0.28, b.bh);
            const rw = TK.rng(b.seed);
            for (let wy = y + 10; wy < ch - 26; wy += 17) {
              for (let wx = b.x + 6; wx < b.x + b.bw - 9; wx += 13) {
                const on = rw() < (lit ? 0.5 : 0.04), warm = rw() < 0.3;
                g.fillStyle = on ? (lit ? (warm ? '#ffe9a8' : z.acc) : '#ff4d6d') : (lit ? rgba('#000000', 0.25) : 'rgba(28,36,60,.9)');
                g.globalAlpha = on ? (lit ? 0.85 : 0.5) : 1;
                g.fillRect(wx, wy, 7, 10);
              }
            }
            g.globalAlpha = 1;
            // גג
            g.fillStyle = lit ? mix(z.bld, '#ffffff', 0.15) : '#1a2138';
            if (b.roof === 1) { g.fillRect(b.x + b.bw / 2 - 1, y - 30, 2, 30); if (lit) { g.fillStyle = z.acc; g.fillRect(b.x + b.bw / 2 - 3, y - 34, 6, 6); } }
            else if (b.roof === 2) { g.beginPath(); g.ellipse(b.x + b.bw / 2, y - 6, 14, 8, -0.4, 0, 6.283); g.fill(); g.fillRect(b.x + b.bw / 2 - 1, y - 6, 2, 8); }
            else if (b.roof === 3) { g.fillRect(b.x + 6, y - 14, 20, 14); }
            if (lit) { g.fillStyle = z.acc; g.shadowColor = z.acc; g.shadowBlur = 10; g.fillRect(b.x, y - 1, b.bw, 2); g.shadowBlur = 0; }
          });
          const gr = g.createLinearGradient(0, ch - 170, 0, ch);
          gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, lit ? rgba(z.acc, 0.34) : 'rgba(6,9,18,.85)');
          g.fillStyle = gr; g.fillRect(0, ch - 170, cw, 170);
          return c;
        };
        return { f, cw, ch, dim: mk(false), lit: mk(true) };
      });
    });
  }

  /* ---------- כוכבים / גלובוס / לוויינים ---------- */
  const rs = TK.rng(7);
  const stars = Array.from({ length: 110 }, () => ({ x: rs() * W, y: rs() * 330, s: 0.6 + rs() * 1.6, p: rs() * 6.28 }));
  const rainCols = Array.from({ length: 34 }, (_, i) => ({ x: i * 40 + rs() * 30, y: rs() * H, v: 40 + rs() * 90, ch: rs() }));
  const drones = Array.from({ length: 16 }, (_, i) => ({ bx: 400 + i * 780 + rs() * 200, y: 150 + rs() * 190, p: rs() * 6.28, s: 0.7 + rs() * 0.5 }));

  function skyColors(camC) {
    const z = world.zoneAt(camC);
    const at = (i) => { const zz = ZONES[i]; const l = world.lit[i]; return [mix(DIM_SKY[0], zz.sky[0], l), mix(DIM_SKY[1], zz.sky[1], l)]; };
    let c = at(z.i);
    const u = (camC - z.start) / z.w;
    if (u > 0.85 && z.i < ZONES.length - 1) { const n = at(z.i + 1), k = TK.smooth((u - 0.85) / 0.3); c = [mix(c[0], n[0], k), mix(c[1], n[1], k)]; }
    else if (u < 0.15 && z.i > 0) { const n = at(z.i - 1), k = TK.smooth((0.15 - u) / 0.3); c = [mix(c[0], n[0], k), mix(c[1], n[1], k)]; }
    return c;
  }

  function drawGlobe(ctx, camC, t, l) {
    const cx = 1010 - camC * 0.01 % 60, cy = 150, R = 78;
    ctx.save(); ctx.globalAlpha = 0.25 + 0.55 * l;
    const col = mix('#4a6ab0', '#22e5ff', l);
    ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.shadowColor = col; ctx.shadowBlur = 8 * l;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.stroke();
    for (let i = 0; i < 4; i++) { const a = t * 0.35 + i * 0.785; ctx.beginPath(); ctx.ellipse(cx, cy, Math.abs(Math.cos(a)) * R, R, 0, 0, 6.283); ctx.stroke(); }
    for (let i = -2; i <= 2; i++) { const yy = cy + i * R * 0.36, rx = Math.sqrt(R * R - (i * R * 0.36) ** 2); ctx.beginPath(); ctx.ellipse(cx, yy, rx, rx * 0.16, 0, 0, 6.283); ctx.stroke(); }
    // צמתים וקשתות
    const pts = [];
    for (let i = 0; i < 9; i++) { const a = t * 0.35 + i * 0.7, b = (i * 1.7) % 3 - 1.5; pts.push({ x: cx + Math.sin(a) * R * Math.cos(b * 0.5), y: cy + Math.sin(b * 0.6) * R * 0.9, v: Math.cos(a) > -0.1 }); }
    ctx.fillStyle = '#fff';
    pts.forEach((p) => { if (p.v) { ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, 6.283); ctx.fill(); } });
    if (l > 0.05) {
      ctx.strokeStyle = rgba('#ffffff', 0.5 * l);
      for (let i = 0; i < pts.length - 1; i += 2) if (pts[i].v && pts[i + 1].v) { ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.quadraticCurveTo((pts[i].x + pts[i + 1].x) / 2, Math.min(pts[i].y, pts[i + 1].y) - 30, pts[i + 1].x, pts[i + 1].y); ctx.stroke(); }
    }
    ctx.restore();
  }

  function drawSatellites(ctx, t, l) {
    for (let i = 0; i < 3; i++) {
      const x = ((t * (14 + i * 6) + i * 480) % (W + 160)) - 80, y = 60 + i * 42 + Math.sin(t * 0.5 + i) * 5;
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.25);
      ctx.fillStyle = mix('#40507a', '#cfe6ff', l); ctx.fillRect(-5, -4, 10, 8);
      ctx.fillStyle = mix('#2a3760', '#4aa8ff', l); ctx.fillRect(-20, -3, 13, 6); ctx.fillRect(7, -3, 13, 6);
      ctx.restore();
      const ph = (t * 0.6 + i) % 3;
      if (ph < 1 && l > 0.1) { ctx.strokeStyle = rgba('#22e5ff', (1 - ph) * 0.6 * l); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, ph * 34, 0.4, 2.7); ctx.stroke(); }
    }
  }

  /* ---------- כבלים עיליים ---------- */
  function drawCables(ctx, cam, t) {
    const p0 = Math.floor(cam / 380) * 380 - 380;
    for (let px = p0; px < cam + W + 760; px += 380) {
      const l = litAt(px + 190), z = world.zoneAt(px + 190), top = 245;
      ctx.strokeStyle = '#141a2c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(px, G + 10); ctx.lineTo(px, top); ctx.stroke();
      ctx.fillStyle = '#1c2440'; ctx.fillRect(px - 16, top - 3, 32, 5);
      // כבל
      const nx = px + 380, sag = 34;
      ctx.strokeStyle = mix('#2a3350', z.acc, l * 0.85); ctx.lineWidth = 2.2;
      ctx.shadowColor = z.acc; ctx.shadowBlur = 6 * l;
      ctx.beginPath(); ctx.moveTo(px, top); ctx.quadraticCurveTo(px + 190, top + sag * 2, nx, top); ctx.stroke(); ctx.shadowBlur = 0;
      // חבילות מידע
      const nP = 3;
      for (let k = 0; k < nP; k++) {
        let u = ((t * 0.32 + k / nP + (px / 380) * 0.37) % 1);
        if (l < 0.5) { u = Math.min(u, 0.42 + Math.sin(t * 9 + k) * 0.01) * (0.6 + k * 0.1); if (u > 0.4) u = 0.4; }
        const bx = (1 - u) * (1 - u) * px + 2 * (1 - u) * u * (px + 190) + u * u * nx;
        const by = (1 - u) * (1 - u) * top + 2 * (1 - u) * u * (top + sag * 2) + u * u * top;
        ctx.fillStyle = l > 0.5 ? '#fff' : '#ff4d6d'; ctx.shadowColor = l > 0.5 ? z.acc : '#ff4d6d'; ctx.shadowBlur = 10;
        ctx.fillRect(bx - 3.5, by - 3.5, 7, 7); ctx.shadowBlur = 0;
      }
      if (l < 0.5 && Math.sin(t * 7 + px) > 0.8) { ctx.fillStyle = '#ffe07a'; ctx.fillRect(px + 190 - 1, top + sag - 1, 3, 3); world.fx.emit({ x: px + 190 + 60 * (Math.random() - 0.5), y: top + sag + 8, vx: (Math.random() - 0.5) * 80, vy: 40 + Math.random() * 60, life: 0.5, size: 3, color: '#ffe07a', g: 200 }); }
    }
  }

  /* ---------- ציורי עזר ---------- */
  function neon(ctx, s, x, y, size, col, l, t, seed) {
    const fl = l > 0.6 ? 1 : (Math.sin(t * (7 + seed % 5) + seed * 3) > 0.6 ? 0.9 : 0.16);
    txt(ctx, s, x, y, { size, weight: 800, color: mix('#48506e', col, l), alpha: fl, glow: l > 0.3 ? col : null, glowSize: 16 });
  }
  function bldg(ctx, x, base, w, h, col, acc, l, seed) {
    ctx.fillStyle = col; ctx.fillRect(x, base - h, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(x, base - h, 5, h);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + w - 8, base - h, 8, h);
    const r = TK.rng(seed);
    for (let wy = base - h + 16; wy < base - 34; wy += 26) for (let wx = x + 14; wx < x + w - 22; wx += 24) {
      const on = r() < 0.65;
      ctx.fillStyle = on && l > 0.03 ? rgba(r() < 0.3 ? '#ffe9a8' : acc, 0.2 + 0.7 * l) : 'rgba(16,22,40,.92)';
      ctx.fillRect(wx, wy, 13, 16);
    }
    ctx.fillStyle = mix('#28304c', acc, l); ctx.fillRect(x - 4, base - h - 6, w + 8, 7);
  }
  function holo(ctx, x, y, w, h, col, l, t) {
    ctx.save();
    ctx.fillStyle = 'rgba(4,8,22,.88)'; rr(ctx, x, y, w, h, 12); ctx.fill();
    ctx.strokeStyle = mix('#566080', col, l); ctx.lineWidth = 2.5; ctx.shadowColor = col; ctx.shadowBlur = 16 * l; ctx.stroke();
    ctx.restore();
  }
  function scan(ctx, x, y, w, h, t) {
    ctx.save(); ctx.beginPath(); rr(ctx, x, y, w, h, 12); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.04)';
    for (let yy = y + ((t * 30) % 6); yy < y + h; yy += 6) ctx.fillRect(x, yy, w, 1.5);
    ctx.restore();
  }
  function aiTag(ctx, x, y, l, t) {
    const a = 0.45 + 0.55 * l;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(30,14,80,.9)'; rr(ctx, x - 20, y - 11, 40, 22, 11); ctx.fill();
    ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2; ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 10 * (0.4 + l); ctx.stroke();
    ctx.shadowBlur = 0; txt(ctx, 'AI', x, y + 1, { size: 13, weight: 800, color: '#e4d9ff' });
    const s = (t * 1.4 + x) % 3;
    if (s < 1) { ctx.fillStyle = '#fff'; ctx.globalAlpha = a * (1 - s); ctx.fillRect(x + 12, y - 16 - s * 6, 3, 3); }
    ctx.restore();
  }
  function rack(ctx, x, base, w, h, l, t, acc, seed) {
    ctx.fillStyle = '#0e1426'; rr(ctx, x, base - h, w, h, 5); ctx.fill();
    ctx.strokeStyle = mix('#28314e', acc, l * 0.6); ctx.lineWidth = 2; ctx.stroke();
    const r = TK.rng(seed || 3);
    for (let y = base - h + 12, k = 0; y < base - 14; y += 15, k++) {
      ctx.fillStyle = '#171f38'; ctx.fillRect(x + 6, y, w - 12, 10);
      const n = 3;
      for (let i = 0; i < n; i++) {
        const ph = r() * 6.28, on = l > 0.4 ? Math.sin(t * (4 + i) + ph) > -0.3 : (Math.sin(t * 3 + ph) > 0.93);
        ctx.fillStyle = on ? (l > 0.4 ? (i === 0 ? '#39ff88' : acc) : '#ff4d6d') : '#0a0f1e';
        ctx.fillRect(x + w - 12 - i * 8, y + 3, 4, 4);
      }
    }
  }
  function drone(ctx, x, y, s, l, t, acc) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#1b2440'; rr(ctx, -14, -5, 28, 10, 5); ctx.fill();
    ctx.strokeStyle = '#2b3660'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-22, -8); ctx.lineTo(22, -8); ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.5); ctx.lineWidth = 2;
    for (const sx of [-22, 22]) { const w = Math.sin(t * 40) * 9; ctx.beginPath(); ctx.moveTo(sx - w, -10); ctx.lineTo(sx + w, -10); ctx.stroke(); }
    ctx.fillStyle = l > 0.5 ? acc : '#ff4d6d'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(0, 2, 3, 0, 6.283); ctx.fill();
    ctx.restore();
  }
  function wifi(ctx, x, y, l, t, col, size) {
    ctx.save(); ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const ph = l > 0.3 ? (t * 1.2 - i * 0.28) % 1 : 0.2;
      ctx.strokeStyle = l > 0.3 ? rgba(col, 0.25 + 0.75 * (1 - Math.max(0, ph))) : (Math.sin(t * 8 + i) > 0.7 ? '#ff4d6d' : '#2a3350');
      ctx.beginPath(); ctx.arc(x, y, size * (0.5 + i * 0.5), -2.35, -0.8); ctx.stroke();
    }
    ctx.fillStyle = l > 0.3 ? col : '#ff4d6d'; ctx.beginPath(); ctx.arc(x, y, 3.6, 0, 6.283); ctx.fill();
    ctx.restore();
  }

  /* ---------- אלמנטים לכל אזור ---------- */
  const PROPS = {};

  PROPS.portal = (ctx, z, l, t, S) => {
    const S0 = z.start, pl = world.portal;
    // רצפת גריד
    ctx.strokeStyle = rgba('#22e5ff', 0.14); ctx.lineWidth = 1;
    for (let x = 0; x < z.w; x += 60) { ctx.beginPath(); ctx.moveTo(S0 + x, G); ctx.lineTo(S0 + x - (x - 500) * 0.35, H); ctx.stroke(); }
    // פורטל
    const px = 520;
    const g = ctx.createLinearGradient(0, G - 420, 0, G);
    g.addColorStop(0, 'rgba(34,229,255,0)'); g.addColorStop(1, rgba('#22e5ff', 0.32 * pl));
    ctx.fillStyle = g; ctx.fillRect(px - 60, G - 420, 120, 420 + 45);
    ctx.save(); ctx.shadowColor = '#22e5ff'; ctx.shadowBlur = 24;
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = rgba(i === 1 ? '#ff3df2' : '#22e5ff', 0.5 + 0.4 * pl); ctx.lineWidth = 5 - i;
      ctx.beginPath(); ctx.ellipse(px, G - 130, 84 + i * 14, 150 + i * 10, 0, 0, 6.283); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = rgba('#22e5ff', 0.14 + 0.1 * Math.sin(t * 3)); ctx.beginPath(); ctx.ellipse(px, G - 130, 82, 148, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = rgba('#22e5ff', 0.7 * pl); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(px, FEET + 4, 90, 18, 0, 0, 6.283); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(px, FEET + 4, 60 + Math.sin(t * 3) * 6, 12, 0, 0, 6.283); ctx.stroke();
    if (Math.random() < 0.5 * pl) world.fx.emit({ x: px + (Math.random() - 0.5) * 100, y: G + 30, vx: 0, vy: -120 - Math.random() * 120, life: 1.5, size: 3, color: Math.random() < 0.5 ? '#22e5ff' : '#ffffff', shape: 'sq' });
    // שלט
    holo(ctx, S0 + 800, G - 300, 330, 120, '#22e5ff', 1, t);
    txt(ctx, 'ברוכים הבאים', S0 + 965, G - 262, { size: 30, weight: 800, color: '#fff', glow: '#22e5ff' });
    txt(ctx, 'לנטופוליס', S0 + 965, G - 222, { size: 36, weight: 900, color: '#22e5ff', glow: '#22e5ff' });
    scan(ctx, S0 + 800, G - 300, 330, 120, t);
    // שער העיר
    const gx = S0 + 1360;
    ctx.fillStyle = '#0d1636'; ctx.fillRect(gx - 120, G - 330, 40, 330); ctx.fillRect(gx + 80, G - 330, 40, 330);
    ctx.fillStyle = '#12204a'; rr(ctx, gx - 130, G - 350, 260, 42, 8); ctx.fill();
    ctx.strokeStyle = '#22e5ff'; ctx.lineWidth = 3; ctx.shadowColor = '#22e5ff'; ctx.shadowBlur = 14; ctx.stroke(); ctx.shadowBlur = 0;
    txt(ctx, 'שער העיר', gx, G - 329, { size: 24, weight: 800, color: '#22e5ff', glow: '#22e5ff' });
    for (let i = 0; i < 6; i++) { const k = (t * 0.6 + i / 6) % 1; ctx.fillStyle = rgba('#22e5ff', 0.5 * (1 - k)); ctx.fillRect(gx - 70 + k * 140, G - 30 - i * 40, 50, 6); }
  };

  PROPS.square = (ctx, z, l, t, S) => {
    const S0 = z.start;
    // מגדל נתב
    const tx = S0 + 380, top = G - 340;
    ctx.strokeStyle = mix('#232b47', '#8a94c0', l * 0.6); ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(tx - 56, G); ctx.lineTo(tx - 6, top); ctx.moveTo(tx + 56, G); ctx.lineTo(tx + 6, top); ctx.stroke();
    ctx.lineWidth = 3;
    for (let y = G - 30, k = 0; y > top + 30; y -= 48, k++) { const w1 = 56 - (G - y) * 0.146, w2 = 56 - (G - y + 48) * 0.146; ctx.beginPath(); ctx.moveTo(tx - w1, y); ctx.lineTo(tx + w2, y - 48); ctx.moveTo(tx + w1, y); ctx.lineTo(tx - w2, y - 48); ctx.stroke(); }
    ctx.fillStyle = mix('#28304c', z.acc, l); ctx.beginPath(); ctx.arc(tx, top - 8, 22, 0, 6.283); ctx.fill();
    wifi(ctx, tx, top - 4, l, t, z.acc, 30);
    if (l > 0.3) for (let i = 0; i < 3; i++) { const ph = (t * 0.5 + i / 3) % 1; ctx.strokeStyle = rgba(z.acc, (1 - ph) * 0.35); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tx, top - 8, 30 + ph * 160, 0, 6.283); ctx.stroke(); }
    neon(ctx, 'נתב מרכזי', tx, G + 26, 22, z.acc, l, t, 1);
    aiTag(ctx, tx + 64, top + 30, l, t);
    // בית קפה
    const cx = S0 + 760;
    bldg(ctx, cx, G, 290, 200, mix('#221a44', '#3a2a70', l), z.acc, l, 11);
    ctx.fillStyle = mix('#2a2f4a', '#ff6b9d', l); ctx.beginPath(); ctx.moveTo(cx - 12, G - 96); ctx.lineTo(cx + 302, G - 96); ctx.lineTo(cx + 280, G - 130); ctx.lineTo(cx + 10, G - 130); ctx.fill();
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? mix('#3a4058', '#fff', l * 0.9) : mix('#20263c', '#ff6b9d', l); ctx.fillRect(cx - 12 + i * 39.3, G - 96, 39.3, 12); }
    neon(ctx, 'בית קפה WiFi', cx + 145, G - 150, 26, '#ffe07a', l, t, 4);
    ctx.fillStyle = 'rgba(255,224,122,' + (0.08 + 0.3 * l) + ')'; ctx.fillRect(cx + 30, G - 80, 230, 80);
    if (l > 0.3 && Math.random() < 0.15) world.fx.emit({ x: cx + 60 + Math.random() * 20, y: G - 60, vx: 6, vy: -40, life: 1.5, size: 5, color: 'rgba(255,255,255,.5)', shape: 'circle' });
    // שלט הולוגרפי (פינג)
    const bx = S0 + 1420, bw = 300, bh = 170, by = G - 340;
    ctx.strokeStyle = '#1c2440'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(bx + 60, by + bh); ctx.lineTo(bx + 60, G); ctx.moveTo(bx + bw - 60, by + bh); ctx.lineTo(bx + bw - 60, G); ctx.stroke();
    holo(ctx, bx, by, bw, bh, z.acc, l, t);
    if (l > 0.5) {
      ctx.strokeStyle = z.acc; ctx.lineWidth = 3; ctx.shadowColor = z.acc; ctx.shadowBlur = 10; ctx.beginPath();
      for (let x = 0; x <= bw - 40; x += 4) { const yy = by + bh / 2 + Math.sin((x + t * 120) * 0.05) * 22 * Math.sin(x * 0.02 + 1); x ? ctx.lineTo(bx + 20 + x, yy) : ctx.moveTo(bx + 20 + x, yy); }
      ctx.stroke(); ctx.shadowBlur = 0;
      txt(ctx, 'PING 12ms', bx + bw / 2, by + 24, { size: 20, weight: 800, color: '#fff', glow: z.acc });
    } else {
      for (let i = 0; i < 26; i++) { ctx.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.2 + ')'; ctx.fillRect(bx + 10 + Math.random() * (bw - 30), by + 10 + Math.random() * (bh - 30), 20 + Math.random() * 30, 3); }
      txt(ctx, 'NO SIGNAL', bx + bw / 2, by + bh / 2, { size: 30, weight: 900, color: '#ff4d6d', alpha: Math.sin(t * 6) > 0 ? 1 : 0.3, glow: '#ff4d6d' });
    }
    scan(ctx, bx, by, bw, bh, t);
    // הודעות מרחפות
    for (let i = 0; i < 5; i++) {
      const k = l > 0.5 ? (t * 0.16 + i / 5) % 1 : (0.3 + i * 0.05);
      const x = S0 + 950 + k * 700, y = G - 280 - Math.sin(k * 6.28 + i) * 30 - i * 8;
      ctx.save(); ctx.globalAlpha = l > 0.5 ? Math.sin(k * 3.14) : 0.55; ctx.fillStyle = l > 0.5 ? '#fff' : '#ff8fa3'; ctx.shadowColor = l > 0.5 ? z.acc : '#ff4d6d'; ctx.shadowBlur = 12;
      rr(ctx, x - 16, y - 11, 32, 22, 5); ctx.fill(); ctx.strokeStyle = '#3a2a70'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 14, y - 8); ctx.lineTo(x, y + 2); ctx.lineTo(x + 14, y - 8); ctx.stroke();
      if (l < 0.5) { txt(ctx, '×', x + 14, y - 12, { size: 18, color: '#ff4d6d', weight: 900 }); }
      ctx.restore();
    }
  };

  PROPS.train = (ctx, z, l, t, S) => {
    const S0 = z.start;
    // מסילה
    ctx.fillStyle = mix('#161c30', '#2a2f4a', l); ctx.fillRect(S0, G - 12, z.w, 14);
    ctx.strokeStyle = mix('#3a4262', '#c8d2f0', l); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(S0, G - 14); ctx.lineTo(S0 + z.w, G - 14); ctx.stroke();
    for (let x = S0; x < S0 + z.w; x += 36) { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x, G - 10, 18, 10); }
    // רכבת
    const tx = l > 0.5 ? S0 - 700 + ((t * 260 * Math.min(1, (l - 0.5) * 2)) % (z.w + 1400)) : S0 + 1500;
    for (let c = 0; c < 3; c++) {
      const x = tx + c * 215;
      ctx.fillStyle = mix('#242b46', '#f2f4ff', l); rr(ctx, x, G - 118, 205, 100, 24); ctx.fill();
      ctx.fillStyle = mix('#181e34', z.acc, l); ctx.fillRect(x, G - 62, 205, 10);
      for (let w = 0; w < 4; w++) { ctx.fillStyle = l > 0.3 ? rgba('#ffe9a8', 0.4 + 0.5 * l) : '#0c1224'; rr(ctx, x + 14 + w * 47, G - 102, 34, 30, 6); ctx.fill(); }
      ctx.fillStyle = '#10152a'; ctx.beginPath(); ctx.arc(x + 40, G - 14, 11, 0, 6.283); ctx.arc(x + 165, G - 14, 11, 0, 6.283); ctx.fill();
    }
    ctx.fillStyle = l > 0.5 ? '#39ff88' : '#ff4d6d'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(tx + 3 * 215 - 24, G - 92, 7, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
    // גג רציף
    const rx = S0 + 200;
    ctx.fillStyle = mix('#1a2040', '#32406e', l); ctx.fillRect(rx, G - 230, 720, 20);
    ctx.fillStyle = mix('#28304c', z.acc, l); ctx.fillRect(rx, G - 212, 720, 4);
    ctx.fillStyle = '#141a30'; for (let i = 0; i < 5; i++) ctx.fillRect(rx + 30 + i * 165, G - 210, 12, 210);
    neon(ctx, 'תחנה מרכזית', rx + 360, G - 262, 32, z.acc, l, t, 2);
    // לוח נסיעות
    const bx = S0 + 940, by = G - 330, bw = 300, bh = 180;
    ctx.strokeStyle = '#1c2440'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(bx + 40, by + bh); ctx.lineTo(bx + 40, G); ctx.moveTo(bx + bw - 40, by + bh); ctx.lineTo(bx + bw - 40, G); ctx.stroke();
    holo(ctx, bx, by, bw, bh, z.acc, l, t);
    if (l > 0.5) {
      const rows = [['תל אביב', '12:04'], ['ירושלים', '12:09'], ['חיפה', '12:15'], ['באר שבע', '12:22']];
      txt(ctx, 'יציאות', bx + bw / 2, by + 20, { size: 18, weight: 800, color: z.acc });
      rows.forEach((r, i) => { txt(ctx, r[0], bx + bw - 20, by + 52 + i * 27, { size: 18, align: 'right', color: '#fff' }); txt(ctx, r[1], bx + 24, by + 52 + i * 27, { size: 18, align: 'left', color: '#ffe07a', weight: 800, dir: 'ltr' }); });
    } else {
      txt(ctx, 'NO CONNECTION', bx + bw / 2, by + bh / 2 - 8, { size: 24, weight: 900, color: '#ff4d6d', alpha: Math.sin(t * 5) > -0.3 ? 1 : 0.2, glow: '#ff4d6d' });
      txt(ctx, 'שגיאה 503', bx + bw / 2, by + bh / 2 + 24, { size: 18, color: '#ff8fa3' });
      for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(255,77,109,.18)'; ctx.fillRect(bx + 14, by + 14 + Math.random() * (bh - 28), bw - 28, 3); }
    }
    aiTag(ctx, bx + bw - 30, by + bh + 18, l, t);
    scan(ctx, bx, by, bw, bh, t);
    // שער
    const gx = z.station + 60;
    ctx.fillStyle = '#1a2040'; ctx.fillRect(gx - 40, G - 84, 14, 84); ctx.fillRect(gx + 26, G - 84, 14, 84);
    ctx.fillStyle = l > 0.5 ? '#39ff88' : '#ff4d6d'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12;
    if (l > 0.5) ctx.fillRect(gx - 26, G - 96, 8, 30); else ctx.fillRect(gx - 26, G - 66, 52, 8);
    ctx.shadowBlur = 0;
    // ארון תקשורת עם כבלים
    const cx = z.station + 320;
    ctx.fillStyle = '#10162c'; rr(ctx, cx, G - 190, 110, 190, 6); ctx.fill(); ctx.strokeStyle = mix('#28304c', z.acc, l); ctx.lineWidth = 3; ctx.stroke();
    for (let i = 0; i < 6; i++) { ctx.fillStyle = '#080c1a'; ctx.fillRect(cx + 12, G - 174 + i * 26, 86, 16); ctx.fillStyle = l > 0.5 ? (i % 2 ? '#39ff88' : '#22e5ff') : '#ff4d6d'; ctx.globalAlpha = l > 0.5 ? 1 : (Math.sin(t * 6 + i) > 0 ? 1 : 0.2); ctx.fillRect(cx + 18, G - 169 + i * 26, 5, 5); ctx.globalAlpha = 1; }
    if (l < 0.5) {
      ctx.strokeStyle = '#3a3f5c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx + 40, G - 6); ctx.bezierCurveTo(cx + 20, G + 30, cx - 40, G + 26, cx - 70, G + 30); ctx.stroke();
      ctx.strokeStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(cx + 70, G - 6); ctx.bezierCurveTo(cx + 90, G + 34, cx + 140, G + 20, cx + 180, G + 38); ctx.stroke();
      if (Math.random() < 0.2) world.fx.emit({ x: cx + 50, y: G - 4, vx: (Math.random() - 0.5) * 180, vy: -100 - Math.random() * 100, life: 0.5, size: 3, color: '#ffe07a', g: 400 });
    }
  };

  PROPS.mall = (ctx, z, l, t, S) => {
    const S0 = z.start;
    const shops = [[S0 + 220, 250, 'טק-שופ', '#22e5ff'], [S0 + 520, 220, 'מיוזיק', '#ffe07a'], [S0 + 820, 280, 'אופנה', '#ff6bd6']];
    shops.forEach((s, i) => {
      bldg(ctx, s[0], G, s[1], 190 + i * 24, mix('#20143c', '#3a2570', l), s[3], l, 30 + i);
      ctx.fillStyle = mix('#0c1024', s[3], l * 0.28); rr(ctx, s[0] + 24, G - 100, s[1] - 48, 100, 8); ctx.fill();
      neon(ctx, s[2], s[0] + s[1] / 2, G - 210 - i * 24 + 40, 26, s[3], l, t, i + 3);
    });
    // בנק
    const bx = S0 + 1100 + 240;
    ctx.fillStyle = mix('#1a1636', '#e4e8fa', l * 0.9); ctx.beginPath(); ctx.moveTo(bx - 20, G - 200); ctx.lineTo(bx + 130, G - 270); ctx.lineTo(bx + 280, G - 200); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 5; i++) { ctx.fillStyle = mix('#141a30', '#cfd6f2', l * 0.9); ctx.fillRect(bx + i * 60, G - 200, 24, 200); }
    ctx.fillStyle = mix('#141a30', '#cfd6f2', l * 0.9); ctx.fillRect(bx - 30, G - 200, 330, 10);
    neon(ctx, 'בנק', bx + 130, G - 224, 26, '#39a9ff', l, t, 8);
    // מסוף תשלום
    const px = z.station;
    ctx.fillStyle = '#10162c'; rr(ctx, px - 46, G - 170, 92, 170, 10); ctx.fill(); ctx.strokeStyle = mix('#2a3350', z.acc, l); ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#04081a'; rr(ctx, px - 34, G - 156, 68, 56, 6); ctx.fill();
    if (l > 0.5) txt(ctx, '✓', px, G - 128, { size: 40, weight: 900, color: '#39ff88', glow: '#39ff88' });
    else txt(ctx, '!', px, G - 128, { size: 44, weight: 900, color: '#ff4d6d', alpha: Math.sin(t * 6) > 0 ? 1 : 0.3, glow: '#ff4d6d' });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { ctx.fillStyle = mix('#232b47', '#8a94c0', l * 0.5); ctx.fillRect(px - 30 + c * 22, G - 88 + r * 22, 16, 15); }
    aiTag(ctx, px + 50, G - 176, l, t);
    // מנעול הולוגרפי
    const lx = S0 + 1640, ly = G - 200;
    ctx.save(); ctx.translate(lx, ly);
    const col = l > 0.5 ? '#39ff88' : '#ff4d6d';
    ctx.strokeStyle = col; ctx.lineWidth = 10; ctx.shadowColor = col; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(0, -22, 34, Math.PI, l > 0.5 ? 0 : -0.35 * 3.14); ctx.stroke();
    if (l <= 0.5) { ctx.beginPath(); ctx.moveTo(34, -22); ctx.lineTo(34, -8); ctx.stroke(); }
    ctx.fillStyle = rgba(col, 0.25); rr(ctx, -50, -22, 100, 80, 14); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 12, 9, 0, 6.283); ctx.fill(); ctx.fillRect(-3, 14, 6, 20);
    ctx.restore();
    neon(ctx, l > 0.5 ? 'AI מגן על התשלומים' : 'זוהתה חדירה', lx, ly + 84, 20, col, 1, t, 5);
    if (l <= 0.5) {
      // קרס דיג + מעטפה (פישינג)
      const hx = S0 + 1500 + Math.sin(t * 1.2) * 20, hy = G - 330 + Math.sin(t * 2) * 10;
      ctx.strokeStyle = '#9aa4c8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx, 0); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.beginPath(); ctx.arc(hx, hy + 12, 12, -1.2, 2.6); ctx.stroke();
      ctx.fillStyle = '#ffe07a'; rr(ctx, hx - 20, hy + 26, 40, 28, 4); ctx.fill(); ctx.strokeStyle = '#a86a00'; ctx.beginPath(); ctx.moveTo(hx - 18, hy + 29); ctx.lineTo(hx, hy + 44); ctx.lineTo(hx + 18, hy + 29); ctx.stroke();
    }
  };

  PROPS.hospital = (ctx, z, l, t, S) => {
    const S0 = z.start;
    const hx = S0 + 220, hw = 470, hh = 330;
    bldg(ctx, hx, G, hw, hh, mix('#0c2a2c', '#134a48', l), z.acc, l, 51);
    ctx.fillStyle = mix('#1a2a2c', '#e8fff4', l); rr(ctx, hx + hw / 2 - 34, G - hh - 60, 68, 68, 8); ctx.fill();
    ctx.fillStyle = mix('#2a3a3c', '#ff4d6d', l); ctx.fillRect(hx + hw / 2 - 8, G - hh - 50, 16, 48); ctx.fillRect(hx + hw / 2 - 24, G - hh - 34, 48, 16);
    neon(ctx, 'בית חולים', hx + hw / 2, G - 46, 28, z.acc, l, t, 6);
    // מסך דופק
    const mx = hx + hw + 40, my = G - 300, mw = 230, mh = 130;
    holo(ctx, mx, my, mw, mh, z.acc, l, t);
    ctx.strokeStyle = l > 0.5 ? z.acc : '#ff4d6d'; ctx.lineWidth = 3; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 10; ctx.beginPath();
    for (let x = 0; x <= mw - 30; x += 3) {
      let y = 0;
      if (l > 0.5) { const p = ((x + t * 90) % 90) / 90; y = p > 0.4 && p < 0.46 ? -34 : p > 0.46 && p < 0.52 ? 30 : p > 0.6 && p < 0.72 ? -8 * Math.sin((p - 0.6) / 0.12 * 3.14) : 0; }
      x ? ctx.lineTo(mx + 15 + x, my + mh / 2 + y) : ctx.moveTo(mx + 15 + x, my + mh / 2 + y);
    }
    ctx.stroke(); ctx.shadowBlur = 0;
    txt(ctx, l > 0.5 ? 'דופק תקין' : 'אין אות', mx + mw / 2, my + 20, { size: 16, weight: 800, color: l > 0.5 ? '#fff' : '#ff8fa3' });
    aiTag(ctx, mx + mw - 26, my + mh + 16, l, t);
    scan(ctx, mx, my, mw, mh, t);
    // ארון גיבוי
    rack(ctx, S0 + 1000, G, 90, 210, l, t, z.acc, 6);
    txt(ctx, 'גיבוי', S0 + 1045, G - 226, { size: 20, weight: 800, color: mix('#5a6484', z.acc, l), glow: l > 0.3 ? z.acc : null });
    // מסוף מטופל
    const px = z.station;
    ctx.fillStyle = '#0d1a1c'; rr(ctx, px - 56, G - 150, 112, 150, 10); ctx.fill(); ctx.strokeStyle = mix('#2a4a4a', z.acc, l); ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = l > 0.5 ? '#052a1a' : '#2a0510'; rr(ctx, px - 44, G - 138, 88, 70, 6); ctx.fill();
    if (l > 0.5) txt(ctx, 'תיק פתוח', px, G - 103, { size: 16, weight: 800, color: '#39ff88' });
    else { txt(ctx, 'ננעל', px, G - 112, { size: 20, weight: 900, color: '#ff4d6d', glow: '#ff4d6d', alpha: Math.sin(t * 7) > -0.2 ? 1 : 0.3 }); txt(ctx, 'RANSOM', px, G - 88, { size: 13, weight: 700, color: '#ff8fa3', dir: 'ltr' }); }
    // כיפת אבטחה
    if (l > 0.05) {
      ctx.save(); ctx.globalAlpha = 0.18 * l + 0.05 * Math.sin(t * 2) * l;
      ctx.strokeStyle = z.acc; ctx.fillStyle = z.acc; ctx.lineWidth = 2; ctx.shadowColor = z.acc; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.ellipse(hx + hw / 2, G, hw * 0.78, 380, 0, Math.PI, 0); ctx.stroke(); ctx.globalAlpha *= 0.4; ctx.fill();
      ctx.restore();
    } else {
      // באגים זוחלים
      for (let i = 0; i < 4; i++) {
        const bx = S0 + 700 + i * 180 + Math.sin(t * 2 + i) * 30, by = G + 20;
        ctx.fillStyle = '#ff4d6d'; ctx.shadowColor = '#ff4d6d'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.ellipse(bx, by, 14, 9, 0, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 2;
        for (let k = -1; k <= 1; k++) { const w = Math.sin(t * 14 + k + i) * 4; ctx.beginPath(); ctx.moveTo(bx + k * 8, by + 4); ctx.lineTo(bx + k * 12 + w, by + 14); ctx.moveTo(bx + k * 8, by - 4); ctx.lineTo(bx + k * 12 - w, by - 14); ctx.stroke(); }
        ctx.fillStyle = '#fff'; ctx.fillRect(bx + 6, by - 3, 3, 3);
      }
    }
    // רחפן אמבולנס
    const ax = S0 + 1500 + (l > 0.5 ? Math.sin(t * 0.5) * 140 : 0), ay = l > 0.5 ? G - 240 + Math.sin(t * 2) * 8 : G - 26;
    ctx.save(); ctx.translate(ax, ay);
    ctx.fillStyle = mix('#3a4448', '#ffffff', l); rr(ctx, -46, -22, 92, 42, 12); ctx.fill();
    ctx.fillStyle = mix('#3a4a4a', '#ff4d6d', l); ctx.fillRect(-6, -14, 12, 26); ctx.fillRect(-13, -7, 26, 12);
    ctx.strokeStyle = '#8a94c0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-58, -30); ctx.lineTo(58, -30); ctx.stroke();
    if (l > 0.5) { ctx.strokeStyle = rgba('#fff', 0.6); for (const sx of [-58, 58]) { const w = Math.sin(t * 40) * 10; ctx.beginPath(); ctx.moveTo(sx - w, -32); ctx.lineTo(sx + w, -32); ctx.stroke(); } }
    ctx.restore();
    if (l <= 0.5 && Math.random() < 0.2) world.fx.emit({ x: ax, y: ay - 20, vx: 10, vy: -50, life: 1.4, size: 8, color: 'rgba(120,120,140,.5)', shape: 'circle' });
  };

  PROPS.ai = (ctx, z, l, t, S) => {
    const S0 = z.start, px = S ? S.px : 0;
    // כיפת מעבדה
    const dx = S0 + 380;
    ctx.fillStyle = mix('#140e34', '#221a6a', l); ctx.beginPath(); ctx.arc(dx, G, 190, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = mix('#2a2a5a', z.acc, l); ctx.lineWidth = 4; ctx.shadowColor = z.acc; ctx.shadowBlur = 14 * l; ctx.stroke(); ctx.shadowBlur = 0;
    ctx.lineWidth = 2; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.ellipse(dx, G, 190 * i / 4, 190, 0, Math.PI, 0); ctx.stroke(); }
    // רשת עצבית בתוך הכיפה
    const layers = [3, 4, 4, 2], pts = [];
    layers.forEach((n, li) => { for (let i = 0; i < n; i++) pts.push({ x: dx - 100 + li * 66, y: G - 60 - (n - 1) * 20 + i * 40 - 30, li }); });
    ctx.lineWidth = 1.5;
    pts.forEach((a, ia) => pts.forEach((b, ib) => { if (b.li === a.li + 1) { ctx.strokeStyle = l > 0.4 ? rgba(z.acc, 0.22 + 0.3 * (Math.sin(t * 3 + ia + ib) * 0.5 + 0.5)) : 'rgba(80,80,120,.2)'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }));
    pts.forEach((p, i) => { ctx.fillStyle = l > 0.4 ? '#fff' : '#3a3f66'; ctx.shadowColor = z.acc; ctx.shadowBlur = l > 0.4 ? 10 : 0; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, 6.283); ctx.fill(); }); ctx.shadowBlur = 0;
    neon(ctx, 'מעבדת AI', dx, G + 26, 24, z.acc, l, t, 9);
    // ראש רובוט הולוגרפי ענק
    const rx = S0 + 860, ry = G - 250;
    ctx.save(); ctx.translate(rx, ry);
    const col = l > 0.5 ? z.acc : '#5a5f84';
    ctx.fillStyle = rgba(col, 0.1); ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.shadowColor = col; ctx.shadowBlur = 20 * l;
    rr(ctx, -110, -90, 220, 170, 46); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(0, -90); ctx.lineTo(0, -128); ctx.stroke(); ctx.fillStyle = l > 0.5 ? '#39ff88' : '#ff4d6d'; ctx.beginPath(); ctx.arc(0, -134, 8, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(4,6,24,.9)'; rr(ctx, -84, -52, 168, 74, 30); ctx.fill();
    const look = TK.clamp((px - (S0 + 860)) / 300, -1, 1);
    for (const s of [-1, 1]) {
      const ex = s * 40 + look * 10;
      if (l > 0.5) { ctx.fillStyle = z.acc; ctx.shadowColor = z.acc; ctx.shadowBlur = 16; const bl = ((t + 1) % 3.6) < 0.1 ? 0.12 : 1; ctx.beginPath(); ctx.ellipse(ex, -15, 14, 18 * bl, 0, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0; }
      else { ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ex - 10, -26); ctx.lineTo(ex + 10, -6); ctx.moveTo(ex + 10, -26); ctx.lineTo(ex - 10, -6); ctx.stroke(); }
    }
    ctx.strokeStyle = l > 0.5 ? z.acc : '#ff4d6d'; ctx.lineWidth = 4; ctx.beginPath();
    if (l > 0.5) { ctx.arc(0, 40, 30, 0.2, Math.PI - 0.2); } else { ctx.moveTo(-26, 52); for (let i = 0; i <= 8; i++) ctx.lineTo(-26 + i * 6.5, 52 + (i % 2 ? 6 : -6)); }
    ctx.stroke(); ctx.restore();
    scan(ctx, rx - 110, ry - 90, 220, 170, t);
    // רשת עצבית צפה
    const nx = S0 + 1460, ny = G - 250;
    const L2 = [4, 5, 5, 3], P2 = [];
    L2.forEach((n, li) => { for (let i = 0; i < n; i++) P2.push({ x: nx + li * 84, y: ny + (i - (n - 1) / 2) * 44 + Math.sin(t + li + i) * 3, li, i }); });
    P2.forEach((a, ia) => P2.forEach((b, ib) => { if (b.li === a.li + 1) { const on = l > 0.4; ctx.strokeStyle = on ? rgba(z.acc, 0.16) : 'rgba(90,90,130,.15)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); if (on) { const k = (t * 0.7 + ia * 0.13 + ib * 0.07) % 1; if (k < 1 && (ia + ib) % 5 === 0) { ctx.fillStyle = '#fff'; ctx.shadowColor = z.acc; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, 3, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0; } } } }));
    P2.forEach((p, i) => { const on = l > 0.4 && Math.sin(t * 2 + i) > -0.4; ctx.fillStyle = on ? z.acc : '#2e3358'; ctx.shadowColor = z.acc; ctx.shadowBlur = on ? 12 : 0; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, 6.283); ctx.fill(); }); ctx.shadowBlur = 0;
    txt(ctx, 'רשת עצבית: כך AI לומד', nx + 126, ny - 140, { size: 18, weight: 700, color: mix('#5a5f84', '#e4d9ff', l) });
    // מסוף שאלות
    const tx = z.station;
    ctx.fillStyle = '#0e0b26'; rr(ctx, tx - 54, G - 150, 108, 150, 10); ctx.fill(); ctx.strokeStyle = mix('#2a2a5a', z.acc, l); ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#06041a'; rr(ctx, tx - 42, G - 138, 84, 62, 6); ctx.fill();
    txt(ctx, l > 0.5 ? 'מוכן!' : '?', tx, G - 108, { size: l > 0.5 ? 22 : 40, weight: 900, color: l > 0.5 ? '#a78bfa' : '#ff8fa3', glow: l > 0.5 ? '#a78bfa' : null });
    // רובוטי שליחות
    for (let i = 0; i < 2; i++) {
      const rxp = S0 + 1160 + i * 260 + (l > 0.5 ? Math.sin(t * 0.7 + i * 2) * 110 : 0), ryp = G - 4;
      ctx.fillStyle = mix('#2a2f54', '#dfe6ff', l); rr(ctx, rxp - 26, ryp - 58, 52, 44, 12); ctx.fill();
      ctx.fillStyle = '#0a0d24'; rr(ctx, rxp - 18, ryp - 50, 36, 20, 8); ctx.fill();
      ctx.fillStyle = l > 0.5 ? z.acc : '#ff4d6d'; ctx.fillRect(rxp - 10, ryp - 43, 6, 6); ctx.fillRect(rxp + 4, ryp - 43, 6, 6);
      ctx.fillStyle = '#10152a'; ctx.beginPath(); ctx.arc(rxp - 16, ryp - 8, 9, 0, 6.283); ctx.arc(rxp + 16, ryp - 8, 9, 0, 6.283); ctx.fill();
    }
  };

  PROPS.core = (ctx, z, l, t, S) => {
    const S0 = z.start;
    // ארונות שרתים
    for (let i = 0; i < 9; i++) { const x = S0 + 120 + i * 100; rack(ctx, x, G, 78, 250 + (i % 3) * 40, l, t, z.acc, 100 + i); }
    // כבלים מתכנסים אל הליבה
    const cx = z.station;
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = mix('#28314e', z.acc, l * 0.8); ctx.lineWidth = 3; ctx.shadowColor = z.acc; ctx.shadowBlur = 6 * l;
      ctx.beginPath(); ctx.moveTo(S0 + 160 + i * 130, G - 4); ctx.bezierCurveTo(S0 + 160 + i * 130, G + 30, cx - 150 + i * 10, G + 30, cx, G - 4); ctx.stroke();
      if (l > 0.4) { const k = (t * 0.5 + i * 0.17) % 1; const u = k; const x = (1 - u) * (1 - u) * (S0 + 160 + i * 130) + 2 * (1 - u) * u * (S0 + 160 + i * 130) + u * u * cx; ctx.fillStyle = '#fff'; ctx.fillRect(x - 3, G + 20 * Math.sin(u * 3.14) - 3, 6, 6); }
    }
    ctx.shadowBlur = 0;
    // עמוד הליבה
    ctx.fillStyle = 'rgba(160,200,255,.08)'; rr(ctx, cx - 70, G - 400, 140, 400, 20); ctx.fill();
    ctx.strokeStyle = mix('#3a4262', z.acc, l); ctx.lineWidth = 4; ctx.stroke();
    const pulse = l > 0.5 ? 1 + Math.sin(t * 3) * 0.08 : 0.5 + (Math.sin(t * 9) > 0.8 ? 0.3 : 0);
    const cy = G - 230;
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 90 * pulse);
    g.addColorStop(0, l > 0.5 ? '#ffffff' : '#ff8fa3'); g.addColorStop(0.35, l > 0.5 ? z.acc : '#661a2a'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 100 * pulse, 0, 6.283); ctx.fill();
    if (l > 0.5) { ctx.strokeStyle = rgba(z.acc, 0.6); ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(cx, cy, 62 + i * 14, 16 + i * 5, t * (0.7 + i * 0.3), 0, 6.283); ctx.stroke(); } const beam = ctx.createLinearGradient(0, 0, 0, G); beam.addColorStop(0, 'rgba(34,229,255,0)'); beam.addColorStop(1, rgba('#22e5ff', 0.18)); ctx.fillStyle = beam; ctx.fillRect(cx - 24, 0, 48, G); }
    neon(ctx, 'ליבת העיר', cx, G - 430, 28, z.acc, l, t, 3);
    // דלת הכספת
    const dx = S0 + 1800, open = world.doorOpen;
    ctx.fillStyle = '#080d1e'; ctx.fillRect(dx - 110, G - 320, 220, 320);
    if (open > 0) {
      const lg = ctx.createLinearGradient(0, G - 320, 0, G);
      lg.addColorStop(0, rgba('#ffffff', 0.9 * open)); lg.addColorStop(0.6, rgba('#22e5ff', 0.55 * open)); lg.addColorStop(1, rgba('#7c4dff', 0.4 * open));
      ctx.fillStyle = lg; ctx.fillRect(dx - 110 + 6, G - 314, 208, 308);
      ctx.save(); ctx.globalAlpha = 0.25 * open; ctx.fillStyle = '#fff';
      for (let i = 0; i < 5; i++) { const a = -0.5 + i * 0.25 + Math.sin(t + i) * 0.03; ctx.beginPath(); ctx.moveTo(dx, G - 160); ctx.lineTo(dx + Math.sin(a) * 700 - 30, G - 160 - Math.cos(a) * 700); ctx.lineTo(dx + Math.sin(a) * 700 + 30, G - 160 - Math.cos(a) * 700); ctx.fill(); }
      ctx.restore();
    }
    ctx.fillStyle = mix('#1a2244', '#22e5ff', open * 0.5); ctx.fillRect(dx - 110 + 6 - open * 100, G - 314, 104, 308); ctx.fillRect(dx + 4 + open * 100, G - 314, 104, 308);
    ctx.strokeStyle = mix('#3a4262', z.acc, l); ctx.lineWidth = 4; ctx.strokeRect(dx - 110, G - 320, 220, 320);
    for (const sx of [-1, 1]) { ctx.fillStyle = mix('#28304c', z.acc, l); ctx.fillRect(dx + sx * 40 - 5 + sx * open * 100, G - 190, 10, 60); }
  };

  /* ---------- סימון תחנה ---------- */
  function drawStation(ctx, z, t) {
    if (z.i === 0) return;
    const x = z.station, done = world.solved[z.i], col = done ? '#39ff88' : '#ffe07a';
    ctx.save();
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.shadowColor = col; ctx.shadowBlur = 16;
    for (let i = 0; i < 2; i++) { const k = ((t * 0.7) + i * 0.5) % 1; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.ellipse(x, FEET + 6, 30 + k * 40, 9 + k * 12, 0, 0, 6.283); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (!done) {
      const bob = Math.sin(t * 3) * 6;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, FEET - 210 + bob + 18); ctx.lineTo(x - 13, FEET - 210 + bob); ctx.lineTo(x + 13, FEET - 210 + bob); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- ציור ראשי ---------- */
  world.init = () => { buildSkylines(); world.loadBackgrounds(); };

  world.update = (dt) => {
    for (let i = 0; i < ZONES.length; i++) {
      const d = world.target[i] - world.lit[i];
      if (Math.abs(d) > 0.001) world.lit[i] += Math.sign(d) * Math.min(Math.abs(d), dt * 0.5);
    }
    world.fx.update(dt);
    const avg = world.lit.reduce((a, b, i) => a + (i ? b : 0), 0) / (ZONES.length - 1);
    TK.audio.setIntensity(avg);
  };

  world.drawBack = (ctx, cam, t, S) => {
    const camC = cam + W / 2, l0 = litAt(camC);
    // שמיים
    const sc = skyColors(camC);
    const g = ctx.createLinearGradient(0, 0, 0, G);
    g.addColorStop(0, sc[0]); g.addColorStop(1, sc[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // תמונות רקע אופציונליות
    ZONES.forEach((z) => {
      const im = world.bg[z.id]; if (!im) return;
      const d = Math.abs(camC - (z.start + z.w / 2)) / (z.w * 0.75);
      const a = TK.clamp(1 - d, 0, 1); if (a <= 0) return;
      ctx.save(); ctx.globalAlpha = a * (0.35 + 0.5 * world.lit[z.i]);
      const s = Math.max(W / im.width, H / im.height) * 1.08;
      ctx.drawImage(im, W / 2 - im.width * s / 2 - ((camC * 0.03) % 40), H / 2 - im.height * s / 2 - 40, im.width * s, im.height * s);
      ctx.restore();
    });
    // כוכבים
    stars.forEach((s) => { ctx.globalAlpha = (0.25 + 0.5 * (Math.sin(t * 1.5 + s.p) * 0.5 + 0.5)) * (1 - 0.3 * l0); ctx.fillStyle = '#dfe8ff'; ctx.fillRect(((s.x - camC * 0.02) % W + W) % W, s.y, s.s, s.s); });
    ctx.globalAlpha = 1;
    drawGlobe(ctx, camC, t, l0);
    drawSatellites(ctx, t, l0);
    // גשם בינארי
    ctx.save(); ctx.font = '600 15px monospace'; ctx.textAlign = 'center';
    rainCols.forEach((c, i) => {
      const x = ((c.x - camC * 0.08) % (W + 40) + W + 40) % (W + 40), y0 = (c.y + t * c.v) % (H + 200) - 100;
      for (let k = 0; k < 7; k++) { ctx.globalAlpha = (1 - k / 7) * 0.16 * (0.15 + l0); ctx.fillStyle = l0 > 0.3 ? '#22e5ff' : '#ff4d6d'; ctx.fillText(((Math.floor(t * 3 + i + k) * 7 + i) % 3 === 0) ? '1' : '0', x, y0 - k * 18); }
    });
    ctx.restore();
    // קווי אופק
    ZONES.forEach((z) => {
      z.layers.forEach((L, li) => {
        const x0 = (z.start - camC) * L.f + W / 2;
        if (x0 > W || x0 + L.cw < 0) return;
        const y = G - L.ch + (li ? 44 : -4);
        ctx.drawImage(L.dim, x0, y);
        const lit = world.lit[z.i];
        if (lit > 0.01) { ctx.globalAlpha = lit; ctx.drawImage(L.lit, x0, y); ctx.globalAlpha = 1; }
      });
    });
    // רחפנים
    drones.forEach((d, i) => {
      const l = litAt(d.bx), x = d.bx + (l > 0.5 ? Math.sin(t * 0.5 * d.s + d.p) * 160 : 0) - cam, y = d.y + Math.sin(t * 1.6 + d.p) * 8;
      if (x < -60 || x > W + 60) return;
      drone(ctx, x, y, d.s, l, t, world.zoneAt(d.bx).acc);
    });
    // קרקע
    ctx.save(); ctx.translate(-cam, 0);
    ZONES.forEach((z) => {
      if (z.end < cam || z.start > cam + W) return;
      const l = world.lit[z.i];
      const gg = ctx.createLinearGradient(0, G, 0, H);
      gg.addColorStop(0, mix('#101628', mix('#101632', z.acc, 0.22), l)); gg.addColorStop(1, mix('#070a14', mix('#070a1a', z.acc, 0.08), l));
      ctx.fillStyle = gg; ctx.fillRect(z.start, G, z.w + 1, H - G);
      ctx.fillStyle = mix('#2a3350', z.acc, l); ctx.fillRect(z.start, G, z.w + 1, 3);
      ctx.strokeStyle = rgba(z.acc, 0.05 + 0.1 * l); ctx.lineWidth = 1;
      for (let x = Math.max(z.start, Math.floor(cam / 70) * 70); x < Math.min(z.end, cam + W + 70); x += 70) { ctx.beginPath(); ctx.moveTo(x, G + 3); ctx.lineTo(x + (x - (cam + W / 2)) * 0.3, H); ctx.stroke(); }
      for (const yy of [640, 686]) { ctx.beginPath(); ctx.moveTo(z.start, yy); ctx.lineTo(z.end, yy); ctx.stroke(); }
      // צינור נתונים
      ctx.strokeStyle = mix('#2a3350', z.acc, l); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(z.start, G + 20); ctx.lineTo(z.end, G + 20); ctx.stroke();
      if (l > 0.3) { ctx.strokeStyle = rgba('#ffffff', 0.9 * l); ctx.lineWidth = 3; ctx.setLineDash([26, 110]); ctx.lineDashOffset = -t * 160; ctx.shadowColor = z.acc; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(z.start, G + 20); ctx.lineTo(z.end, G + 20); ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur = 0; }
      else { ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 3; ctx.setLineDash([4, 60]); ctx.lineDashOffset = -t * 12 * (Math.sin(t * 5) > 0 ? 1 : 0); ctx.beginPath(); ctx.moveTo(z.start, G + 20); ctx.lineTo(z.end, G + 20); ctx.stroke(); ctx.setLineDash([]); }
    });
    drawCables(ctx, cam, t);
    ZONES.forEach((z) => {
      if (z.end < cam - 400 || z.start > cam + W + 400) return;
      PROPS[z.id](ctx, z, world.lit[z.i], t, S);
      drawStation(ctx, z, t);
    });
    ctx.restore();
  };

  world.drawFront = (ctx, cam, t, S) => {
    ctx.save(); ctx.translate(-cam, 0);
    world.fx.draw(ctx);
    ctx.restore();
  };
})(window.TK);
