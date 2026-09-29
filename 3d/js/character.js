/* הדמות (בן/בת + התאמה אישית) ו"ביט" - עוזר ה-AI. הכול מצויר בקוד */
window.TK = window.TK || {};
(function (TK) {
  'use strict';
  const SKINS = ['#ffe0c2', '#f6c8a0', '#e0a678', '#c07f4f', '#8d5a34', '#5d3a22'];
  const HAIRS = ['#22140d', '#5b3520', '#a8562a', '#e8b93c', '#cfd3dc', '#ff4fa3', '#3aa8ff', '#8b5cff'];
  const TOPS = ['#1fb8d4', '#d63ad0', '#2fcf70', '#f2b31c', '#ef5b2f', '#6a44e8', '#e9edf7', '#2b3556'];
  const BOTTOMS = ['#25304f', '#3b3f52', '#1d5c8a', '#5b2e91', '#7a3b2a'];
  TK.PAL = { SKINS, HAIRS, TOPS, BOTTOMS };
  TK.HAIR_STYLES = [['short', 'קצר'], ['spiky', 'מחודד'], ['curly', 'מתולתל'], ['bob', 'קארה'], ['long', 'ארוך'], ['ponytail', 'קוקו'], ['bun', 'פקעת']];
  TK.ACCS = [['headphones', 'אוזניות', '🎧'], ['glasses', 'משקפי AR', '🕶️'], ['cap', 'כובע', '🧢'], ['backpack', 'תיק גב', '🎒'], ['watch', 'שעון חכם', '⌚']];

  TK.defaultLook = (g) => ({
    gender: g || 'm', skin: 1, hairStyle: g === 'f' ? 4 : 0, hair: g === 'f' ? 2 : 1, top: 0, bottom: 0,
    acc: { headphones: true, glasses: false, cap: false, backpack: true, watch: true }
  });
  TK.randomLook = (g) => {
    const r = (n) => Math.floor(Math.random() * n);
    const acc = {};
    TK.ACCS.forEach((a) => { acc[a[0]] = Math.random() < 0.5; });
    return { gender: g, skin: r(6), hairStyle: r(7), hair: r(8), top: r(8), bottom: r(5), acc };
  };

  const rr = TK.rr;
  let off = null;

  /* ---------- שיער ---------- */
  function hairBack(ctx, style, c, cd, o) {
    ctx.fillStyle = cd;
    if (style === 'long') { rr(ctx, -35, -14, 70, 96, 28); ctx.fill(); }
    else if (style === 'bob') { rr(ctx, -35, -12, 70, 54, 22); ctx.fill(); }
    else if (style === 'ponytail') {
      const sx = -o.dir * 30, sw = Math.sin(o.t * 11) * 5 * o.walk;
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(sx, -6); ctx.quadraticCurveTo(sx - o.dir * 26 + sw, 14, sx - o.dir * 12 + sw * 1.6, 56);
      ctx.quadraticCurveTo(sx + o.dir * 6 + sw, 22, sx + o.dir * 6, 0); ctx.fill();
    } else if (style === 'curly') {
      for (let i = 0; i < 7; i++) { const a = Math.PI * (0.05 + i * 0.15); ctx.beginPath(); ctx.arc(-Math.cos(a) * 33, Math.sin(a) * 24 - 2, 11, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.arc(Math.cos(a) * 33, Math.sin(a) * 24 - 2, 11, 0, 6.283); ctx.fill(); }
    }
  }
  function hairFront(ctx, style, c, cd, o) {
    const R = 31;
    const cap = () => {
      ctx.beginPath(); ctx.arc(0, 0, R + 2.5, Math.PI, 0); ctx.lineTo(R + 1, 8);
      ctx.lineTo(R * 0.7, -17); ctx.lineTo(R * 0.36, -12); ctx.lineTo(0, -22); ctx.lineTo(-R * 0.34, -13); ctx.lineTo(-R * 0.66, -19); ctx.lineTo(-R - 1, 8);
      ctx.closePath(); ctx.fill();
    };
    ctx.fillStyle = c;
    if (style === 'short') { cap(); }
    else if (style === 'spiky') {
      cap();
      for (let i = -3; i <= 3; i++) {
        const a = -Math.PI / 2 + i * 0.36, bx = Math.cos(a) * (R + 1), by = Math.sin(a) * (R + 1);
        ctx.beginPath(); ctx.moveTo(bx - 7, by + 4); ctx.lineTo(Math.cos(a) * (R + 17), Math.sin(a) * (R + 17)); ctx.lineTo(bx + 7, by + 4); ctx.fill();
      }
    } else if (style === 'curly') {
      cap();
      for (let i = 0; i < 9; i++) { const a = Math.PI * (1.02 + i * 0.12); ctx.beginPath(); ctx.arc(Math.cos(a) * (R + 3), Math.sin(a) * (R + 3), 10.5, 0, 6.283); ctx.fill(); }
    } else if (style === 'bob' || style === 'long') {
      cap(); ctx.fillStyle = c;
      rr(ctx, -R - 3, -6, 11, style === 'long' ? 52 : 34, 6); ctx.fill();
      rr(ctx, R - 8, -6, 11, style === 'long' ? 52 : 34, 6); ctx.fill();
    } else if (style === 'ponytail') {
      cap();
      ctx.fillStyle = '#ff5cc8'; ctx.beginPath(); ctx.arc(-o.dir * 29, -3, 5, 0, 6.283); ctx.fill();
    } else if (style === 'bun') {
      if (!o.cap) { ctx.beginPath(); ctx.arc(0, -R - 8, 13, 0, 6.283); ctx.fill(); ctx.fillStyle = cd; ctx.beginPath(); ctx.arc(3, -R - 5, 6, 0, 6.283); ctx.fill(); ctx.fillStyle = c; }
      cap();
    }
  }

  /* ---------- ציור הדמות עצמה ---------- */
  function draw(ctx, x, y, look, st) {
    const t = st.t || 0, walk = st.walk || 0, dir = st.dir || 1, sc = st.scale || 1, f = look.gender === 'f';
    const sk = SKINS[look.skin], skd = TK.mix(sk, '#7a3b1c', 0.22);
    const hc = HAIRS[look.hair], hcd = TK.mix(hc, '#000000', 0.28);
    const top = TOPS[look.top], topD = TK.mix(top, '#000000', 0.3), topL = TK.mix(top, '#ffffff', 0.28);
    const bot = BOTTOMS[look.bottom], acc = look.acc || {};
    const style = TK.HAIR_STYLES[look.hairStyle][0];
    const ph = t * 11, sw = Math.sin(ph) * walk;
    const bob = Math.abs(Math.cos(ph)) * 4 * walk + Math.sin(t * 2.2) * 1.1 * (1 - walk);
    const mood = st.mood || 'neutral';
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // צל
    ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(0, 0, 32 - bob, 8, 0, 0, 6.283); ctx.fill();

    const hy = -122 - bob;
    // ניצחון: הילה וגלימת מתקשב
    if (st.hero) {
      const ag = ctx.createRadialGradient(0, -80, 10, 0, -80, 120);
      ag.addColorStop(0, 'rgba(255,224,122,.38)'); ag.addColorStop(1, 'rgba(255,224,122,0)');
      ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(0, -80, 120, 0, 6.283); ctx.fill();
      const cw = Math.sin(t * 3) * 3 + walk * Math.sin(ph) * 5;
      const cg = ctx.createLinearGradient(0, -96, 0, -8); cg.addColorStop(0, '#7c4dff'); cg.addColorStop(1, '#22e5ff');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(-22, -96 - bob); ctx.lineTo(22, -96 - bob);
      ctx.quadraticCurveTo(40 + cw * 2, -56, 38 + cw * 3 - dir * walk * 10, -12); ctx.lineTo(-38 - cw * 3 - dir * walk * 10, -12);
      ctx.quadraticCurveTo(-40 - cw * 2, -56, -22, -96 - bob); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2.5; ctx.stroke();
    }
    // תיק גב (מאחור)
    if (acc.backpack) {
      ctx.fillStyle = '#2b3556'; rr(ctx, -32, -100 - bob, 64, 52, 15); ctx.fill();
      ctx.fillStyle = '#3d4a78'; rr(ctx, -32, -100 - bob, 64, 12, 10); ctx.fill();
      ctx.fillStyle = TK.rgba('#22e5ff', 0.9); rr(ctx, -28 + (dir > 0 ? 0 : 50), -66 - bob, 6, 14, 3); ctx.fill();
    }
    // שיער מאחור
    ctx.save(); ctx.translate(0, hy); hairBack(ctx, style, hc, hcd, { dir, t, walk }); ctx.restore();

    // רגליים
    for (const s of [-1, 1]) {
      const w2 = sw * s, hxp = s * 10, hyp = -50 - bob;
      const fx = hxp + w2 * 11, fy = -8 - Math.max(0, -w2) * 6;
      ctx.strokeStyle = bot; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(hxp, hyp); ctx.lineTo(fx, fy - 3); ctx.stroke();
      ctx.fillStyle = '#f2f5ff'; ctx.beginPath(); ctx.ellipse(fx + dir * 3, fy, 12, 6.5, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#22e5ff'; ctx.fillRect(fx + dir * 3 - 11, fy + 3, 22, 2.6);
    }

    // ברדס
    ctx.fillStyle = topD; ctx.beginPath(); ctx.arc(0, -97 - bob, 23, 0, 6.283); ctx.fill();
    // גוף
    ctx.fillStyle = top;
    if (f) { ctx.beginPath(); ctx.moveTo(-21, -97 - bob); ctx.lineTo(21, -97 - bob); ctx.lineTo(27, -46 - bob); ctx.lineTo(-27, -46 - bob); ctx.closePath(); ctx.fill(); rr(ctx, -21, -100 - bob, 42, 20, 10); ctx.fill(); }
    else { rr(ctx, -24, -100 - bob, 48, 56, 14); ctx.fill(); }
    ctx.fillStyle = topD; rr(ctx, -27, -52 - bob, 54, 8, 4); ctx.fill();
    ctx.fillStyle = TK.rgba(topD, 0.5); rr(ctx, -13, -68 - bob, 26, 15, 6); ctx.fill();
    // סמל WiFi על החזה
    ctx.save(); ctx.translate(0, -78 - bob); ctx.strokeStyle = '#fff'; ctx.shadowColor = '#22e5ff'; ctx.shadowBlur = 8; ctx.lineWidth = 2.4;
    for (let i = 1; i <= 3; i++) { ctx.globalAlpha = 0.5 + 0.5 * (Math.sin(t * 3 - i) * 0.5 + 0.5); ctx.beginPath(); ctx.arc(0, 8, i * 5, -2.35, -0.8); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 8, 1.8, 0, 6.283); ctx.fill(); ctx.restore();
    // שרוכי ברדס
    ctx.strokeStyle = topL; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -98 - bob); ctx.lineTo(-7, -84 - bob); ctx.moveTo(6, -98 - bob); ctx.lineTo(7, -84 - bob); ctx.stroke();
    // סיכת כוכב זהב (ניצחון)
    if (st.hero) {
      ctx.save(); ctx.translate(-14, -70 - bob); ctx.fillStyle = '#ffd34d'; ctx.shadowColor = '#ffc933'; ctx.shadowBlur = 10; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4 : 9; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
    // רצועות תיק
    if (acc.backpack) { ctx.strokeStyle = '#1a2038'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-14, -100 - bob); ctx.lineTo(-15, -52 - bob); ctx.moveTo(14, -100 - bob); ctx.lineTo(15, -52 - bob); ctx.stroke(); }

    // ידיים
    for (const s of [-1, 1]) {
      const w2 = -sw * s;
      let hxp = s * (31 + w2 * 3), hyp = -56 - bob + Math.abs(w2) * -3 + (w2 * 5);
      if (st.wave && s === 1) { hxp = 38 + Math.sin(t * 15) * 5; hyp = -126 - bob + Math.abs(Math.sin(t * 15)) * -4; }
      if (st.point && s === 1) { hxp = 44; hyp = -92 - bob; }
      ctx.strokeStyle = top; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(s * 25, -92 - bob); ctx.lineTo(s * (25 + (hxp / s - 25) * 0.85), -92 - bob + (hyp + 92 + bob) * 0.85); ctx.stroke();
      ctx.fillStyle = sk; ctx.beginPath(); ctx.arc(hxp, hyp, 7, 0, 6.283); ctx.fill();
      if (acc.watch && s === -1) {
        ctx.fillStyle = '#1a2038'; rr(ctx, hxp - 7, hyp - 13, 14, 9, 3); ctx.fill();
        ctx.fillStyle = '#39ff88'; ctx.shadowColor = '#39ff88'; ctx.shadowBlur = 8; ctx.fillRect(hxp - 4, hyp - 11, 8, 5); ctx.shadowBlur = 0;
      }
    }

    // צוואר וראש
    ctx.fillStyle = skd; ctx.fillRect(-7, -96 - bob, 14, 10);
    ctx.save(); ctx.translate(0, hy);
    ctx.fillStyle = sk; ctx.beginPath(); ctx.arc(-30, 4, 6.5, 0, 6.283); ctx.arc(30, 4, 6.5, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 31, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,90,110,.28)'; ctx.beginPath(); ctx.ellipse(-19, 13, 6.5, 4, 0, 0, 6.283); ctx.ellipse(19, 13, 6.5, 4, 0, 0, 6.283); ctx.fill();

    // עיניים
    const b = Math.max(0, 1 - Math.abs(((t + 1.3) % 3.7) - 0.07) / 0.07);
    const ex = 11, ey = 3, ox = dir * 2.4;
    ctx.fillStyle = '#1a1230'; ctx.strokeStyle = '#1a1230'; ctx.lineWidth = 2.6;
    if (mood === 'happy') {
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * ex + ox, ey + 3, 5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    } else {
      for (const s of [-1, 1]) {
        const ry = (f ? 6.4 : 5.6) * (1 - 0.92 * b);
        ctx.beginPath(); ctx.ellipse(s * ex + ox, ey, 4.4, ry, 0, 0, 6.283); ctx.fill();
        if (b < 0.5) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * ex + ox + 1.5, ey - 2, 1.7, 0, 6.283); ctx.fill(); ctx.fillStyle = '#1a1230'; }
        if (f && b < 0.5) { ctx.beginPath(); ctx.moveTo(s * ex + ox + s * 4, ey - 4); ctx.lineTo(s * ex + ox + s * 8, ey - 7); ctx.stroke(); }
      }
    }
    // גבות
    ctx.lineWidth = 2.4; ctx.strokeStyle = TK.mix(hc, '#000', 0.35);
    const wr = mood === 'worried' ? 3.5 : 0;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * ex + ox - s * 6, -8 - wr); ctx.lineTo(s * ex + ox + s * 6, -7 + wr * 0.3); ctx.stroke(); }
    // פה
    ctx.strokeStyle = '#7a2a3a'; ctx.lineWidth = 2.4; ctx.fillStyle = '#7a2a3a';
    if (mood === 'happy') { ctx.beginPath(); ctx.moveTo(-8 + ox, 14); ctx.quadraticCurveTo(ox, 27, 8 + ox, 14); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ff7a8a'; ctx.beginPath(); ctx.ellipse(ox, 20, 4, 2.4, 0, 0, 6.283); ctx.fill(); }
    else if (mood === 'worried') { ctx.beginPath(); ctx.moveTo(-6 + ox, 19); ctx.quadraticCurveTo(-2 + ox, 15, ox, 18); ctx.quadraticCurveTo(2 + ox, 21, 6 + ox, 17); ctx.stroke(); }
    else if (mood === 'surprised') { ctx.beginPath(); ctx.ellipse(ox, 18, 4, 5, 0, 0, 6.283); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(-6 + ox, 16); ctx.quadraticCurveTo(ox, 21, 6 + ox, 16); ctx.stroke(); }

    // שיער קדמי
    hairFront(ctx, style, hc, hcd, { dir, t, walk, cap: acc.cap });

    // סרט/פפיון לבנות
    if (f && style !== 'ponytail' && style !== 'bun') {
      ctx.fillStyle = '#ff5cc8'; ctx.strokeStyle = '#c23a97'; ctx.lineWidth = 1.5;
      const bx = -dir * 22, by = -25;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - 11, by - 7); ctx.lineTo(bx - 11, by + 7); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 11, by - 7); ctx.lineTo(bx + 11, by + 7); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx, by, 3.6, 0, 6.283); ctx.fillStyle = '#ffd3f0'; ctx.fill();
    }
    // משקפי AR
    if (acc.glasses) {
      ctx.lineWidth = 2.6; ctx.strokeStyle = '#141a34'; ctx.fillStyle = TK.rgba('#22e5ff', 0.28);
      for (const s of [-1, 1]) { rr(ctx, s * ex + ox - 10, ey - 8, 20, 16, 6); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(ox - 1, ey - 1); ctx.lineTo(ox + 1, ey - 1); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ox - 17, ey - 5); ctx.lineTo(ox - 13, ey - 6); ctx.moveTo(ox + 5, ey - 5); ctx.lineTo(ox + 9, ey - 6); ctx.stroke();
      const sc2 = (t * 0.9) % 2; if (sc2 < 1) { ctx.strokeStyle = TK.rgba('#22e5ff', 1 - sc2); ctx.beginPath(); ctx.moveTo(ox - 20 + sc2 * 40, ey - 8); ctx.lineTo(ox - 20 + sc2 * 40, ey + 8); ctx.stroke(); }
    }
    // אוזניות
    if (acc.headphones) {
      ctx.strokeStyle = '#2b3556'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 2, 36, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke();
      ctx.strokeStyle = '#22e5ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 2, 36, Math.PI * 1.3, Math.PI * 1.7); ctx.stroke();
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#2b3556'; rr(ctx, s * 35 - 7, -8, 14, 26, 6); ctx.fill();
        ctx.fillStyle = '#22e5ff'; ctx.shadowColor = '#22e5ff'; ctx.shadowBlur = 8; rr(ctx, s * 35 - 4, -3, 8, 16, 4); ctx.fill(); ctx.shadowBlur = 0;
      }
    }
    // כובע
    if (acc.cap) {
      ctx.fillStyle = '#1c2340'; ctx.beginPath(); ctx.arc(0, -1, 34, Math.PI, 0); ctx.lineTo(34, -3); ctx.quadraticCurveTo(0, 4, -34, -3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2d3a6a'; ctx.beginPath(); ctx.ellipse(dir * 18, -3, 26, 6, 0, 0, 6.283); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.shadowColor = '#22e5ff'; ctx.shadowBlur = 6; ctx.lineWidth = 1.8;
      for (let i = 1; i <= 2; i++) { ctx.beginPath(); ctx.arc(ox, -18, i * 5, -2.3, -0.85); ctx.stroke(); }
      ctx.shadowBlur = 0;
    }
    ctx.restore();
    ctx.restore();
  }

  /* עם אפקטים: התממשות (סריקה) וגליץ' */
  TK.drawCharacter = (ctx, x, y, look, st) => {
    st = st || {};
    const reveal = st.reveal == null ? 1 : st.reveal, gl = st.glitch || 0, al = st.alpha == null ? 1 : st.alpha;
    if (reveal >= 1 && gl <= 0) { ctx.save(); ctx.globalAlpha *= al; draw(ctx, x, y, look, st); ctx.restore(); return; }
    if (!off) { off = document.createElement('canvas'); off.width = 1040; off.height = 1200; }
    const o = off.getContext('2d');
    o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, off.width, off.height);
    o.setTransform(2, 0, 0, 2, 0, 0); draw(o, 260, 560, look, st); o.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save(); ctx.globalAlpha *= al;
    const bx = x - 260, by = y - 560; // ציור בגודל מקורי; הסקאלה נעשתה כבר בתוך draw
    if (reveal < 1) {
      const sc = st.scale || 1, vis = reveal * 190 * sc, topY = by + 560 - vis;
      ctx.save(); ctx.beginPath(); ctx.rect(bx, topY, 520, 700); ctx.clip();
      ctx.drawImage(off, 0, 0, 1040, 1200, bx, by, 520, 600);
      ctx.restore();
      ctx.fillStyle = TK.rgba('#22e5ff', 0.9); ctx.shadowColor = '#22e5ff'; ctx.shadowBlur = 16;
      ctx.fillRect(x - 60 * sc, topY, 120 * sc, 3);
    } else {
      const bands = 9;
      for (let i = 0; i < bands; i++) {
        const sy = Math.random() * 1100, sh = 20 + Math.random() * 100, dx = (Math.random() - 0.5) * gl * 60;
        ctx.drawImage(off, 0, sy, 1040, sh, bx + dx, by + sy / 2, 520, sh / 2);
      }
      ctx.globalAlpha *= 0.6;
      ctx.drawImage(off, 0, 0, 1040, 1200, bx + gl * 8, by, 520, 600);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.3;
      ctx.drawImage(off, 0, 0, 1040, 1200, bx - gl * 10, by, 520, 600);
    }
    ctx.restore();
  };

  /* ---------- ביט: עוזר ה-AI ---------- */
  TK.drawBit = (ctx, x, y, t, mood, sc) => {
    sc = sc || 1; mood = mood || 'neutral';
    const fy = Math.sin(t * 2.4) * 5;
    ctx.save(); ctx.translate(x, y + fy); ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(34,229,255,.12)'; ctx.beginPath(); ctx.arc(0, 0, 40, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 78 - fy, 20, 5, 0, 0, 6.283); ctx.fill();
    // אנטנה
    ctx.strokeStyle = '#8fb4ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, -38); ctx.stroke();
    ctx.fillStyle = mood === 'worried' ? '#ff4d6d' : '#39ff88'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(0, -40, 4.5 + Math.sin(t * 6) * 0.8, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
    // גוף
    const g = ctx.createRadialGradient(-8, -10, 4, 0, 0, 30); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#b9d6ff'); g.addColorStop(1, '#5d86e8');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 26, 0, 6.283); ctx.fill();
    // פנים
    ctx.fillStyle = '#0d1430'; rr(ctx, -20, -10, 40, 22, 10); ctx.fill();
    ctx.fillStyle = '#22e5ff'; ctx.shadowColor = '#22e5ff'; ctx.shadowBlur = 8; ctx.strokeStyle = '#22e5ff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    if (mood === 'happy') { for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 8, 3, 4.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); } }
    else if (mood === 'worried') { for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 8, 2, 3.4, 4.6, 0, 0, 6.283); ctx.fill(); } ctx.beginPath(); ctx.moveTo(-14, -9); ctx.lineTo(-4, -6); ctx.moveTo(14, -9); ctx.lineTo(4, -6); ctx.stroke(); }
    else if (mood === 'think') { for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.4 + 0.6 * (Math.sin(t * 6 - i * 1.2) * 0.5 + 0.5); ctx.beginPath(); ctx.arc(-8 + i * 8, 3, 2.6, 0, 6.283); ctx.fill(); } ctx.globalAlpha = 1; }
    else { const bl = ((t + 0.7) % 3.4) < 0.1 ? 0.15 : 1; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 8, 2, 3.4, 4.6 * bl, 0, 0, 6.283); ctx.fill(); } }
    ctx.shadowBlur = 0;
    // טבעת מסתובבת
    ctx.strokeStyle = TK.rgba('#22e5ff', 0.85); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(0, 4, 38, 10, Math.sin(t * 1.3) * 0.2, 0.3 + t * 2 % 6.283, 3.4 + t * 2 % 6.283); ctx.stroke();
    ctx.restore();
  };
})(window.TK);
