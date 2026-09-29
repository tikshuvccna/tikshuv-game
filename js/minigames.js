/* מיני-משחקים: כל אחד מלמד מושג אמיתי מעולם התקשוב.
   ממשק: create(id, api) => { title, how[], acc, update(dt), draw(ctx), down(x,y), move(x,y), up(x,y), onBtn(id), hint(), destroy() }
   api: { bit(text,ms), finish(stars), fx } */
window.TK = window.TK || {};
(function (TK) {
  'use strict';
  const W = TK.W, H = TK.H, rr = TK.rr, txt = TK.txt, mix = TK.mix, rgba = TK.rgba;
  const P = { x: 70, y: 38, w: 1140, h: 644 };
  TK.MG_PANEL = P;

  /* ---------- ממשק כפתורים (immediate mode) ---------- */
  const UI = { btns: [], hover: null };
  UI.reset = () => { UI.btns.length = 0; };
  UI.hit = (x, y) => { for (let i = UI.btns.length - 1; i >= 0; i--) { const b = UI.btns[i]; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.id; } return null; };
  UI.button = (ctx, id, x, y, w, h, label, o) => {
    o = o || {};
    const col = o.color || '#22e5ff', dis = o.disabled, hov = UI.hover === id && !dis;
    ctx.save();
    if (dis) ctx.globalAlpha = 0.4;
    ctx.fillStyle = rgba(col, hov ? 0.34 : 0.16); rr(ctx, x, y, w, h, 14); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = hov ? 3.5 : 2.5; ctx.shadowColor = col; ctx.shadowBlur = hov ? 18 : 8; ctx.stroke();
    ctx.shadowBlur = 0;
    txt(ctx, label, x + w / 2, y + h / 2 + 1, { size: o.size || 22, weight: 800, color: '#fff' });
    ctx.restore();
    if (!dis) UI.btns.push({ id, x, y, w, h });
  };
  TK.MG_UI = UI;

  function frame(ctx, title, acc, sub) {
    ctx.save();
    ctx.fillStyle = 'rgba(6,9,24,.95)'; rr(ctx, P.x, P.y, P.w, P.h, 26); ctx.fill();
    ctx.strokeStyle = acc; ctx.lineWidth = 3; ctx.shadowColor = acc; ctx.shadowBlur = 22; ctx.stroke(); ctx.shadowBlur = 0;
    txt(ctx, title, W / 2, P.y + 40, { size: 30, weight: 800, color: '#fff', glow: acc, glowSize: 12 });
    if (sub) txt(ctx, sub, W / 2, P.y + 76, { size: 18, weight: 500, color: '#9fb0d8' });
    ctx.restore();
  }
  const stars = (e, a, b) => (e <= a ? 3 : e <= b ? 2 : 1);
  const dist = (a, b, c, d) => Math.hypot(a - c, b - d);

  const MG = {};
  TK.MG = { UI, frame, create: (id, api) => MG[id](api) };

  /* =====================================================================
     1) מסלול החבילה: כתובת IP + ניתוב דרך נתבים
     ===================================================================== */
  MG.route = (api) => {
    const acc = '#22e5ff';
    const N = {
      phone: { x: 210, y: 405, t: 'phone', l: 'הטלפון שלך' },
      A: { x: 430, y: 290, t: 'router', l: 'נתב א' }, B: { x: 430, y: 525, t: 'router', l: 'נתב ב' },
      C: { x: 660, y: 410, t: 'router', l: 'נתב ג', broken: true },
      D: { x: 660, y: 262, t: 'switch', l: 'מתג ד' }, E: { x: 660, y: 570, t: 'switch', l: 'מתג ה' },
      F: { x: 890, y: 320, t: 'router', l: 'נתב ו' }, G: { x: 890, y: 510, t: 'router', l: 'נתב ז' },
      friend: { x: 1075, y: 410, t: 'phone', l: 'החבר/ה' }
    };
    const E = [['phone', 'A'], ['phone', 'B'], ['A', 'C'], ['A', 'D'], ['B', 'C'], ['B', 'E'], ['C', 'F'], ['C', 'G'], ['D', 'F'], ['E', 'G'], ['F', 'friend'], ['G', 'friend']];
    const adj = (a, b) => E.some((e) => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a));
    let stage = 'addr', errors = 0, path = ['phone'], t = 0, shake = 0, msg = '', msgT = 0, sendT = 0, doneT = 0, idle = 0;
    const opts = TK.shuffle([
      { ip: '192.168.1.42', ok: true },
      { ip: '192.168.1.24', ok: false, why: 'הספרות הפוכות! זו כתובת של מכשיר אחר.' },
      { ip: '192.168.1.420', ok: false, why: 'מספר גדול מ-255 הוא לא כתובת IP תקינה.' }
    ]);
    const say = (m) => { msg = m; msgT = 4; };

    function nodeDraw(ctx, id, n) {
      const inPath = path.includes(id), last = path[path.length - 1] === id;
      const col = n.broken ? '#ff4d6d' : inPath ? '#39ff88' : acc;
      ctx.save(); ctx.translate(n.x, n.y);
      const pulse = n.broken ? 1 + Math.sin(t * 6) * 0.06 : last ? 1 + Math.sin(t * 5) * 0.06 : 1;
      ctx.scale(pulse, pulse);
      ctx.fillStyle = rgba(col, 0.16); ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.shadowColor = col; ctx.shadowBlur = inPath || n.broken ? 20 : 8;
      ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; ctx.lineTo(Math.cos(a) * 38, Math.sin(a) * 38); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round';
      if (n.t === 'phone') { rr(ctx, -10, -18, 20, 34, 5); ctx.stroke(); ctx.fillRect(-3, 11, 6, 2); }
      else if (n.t === 'router') { ctx.beginPath(); ctx.arc(0, 0, 13, 0, 6.283); ctx.stroke(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.78; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 13, Math.sin(a) * 13); ctx.lineTo(Math.cos(a) * 21, Math.sin(a) * 21); ctx.stroke(); } }
      else { rr(ctx, -20, -10, 40, 20, 4); ctx.stroke(); for (let i = 0; i < 4; i++) ctx.fillRect(-14 + i * 9, -3, 5, 8); }
      if (n.broken) { ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-22, -22); ctx.lineTo(22, 22); ctx.moveTo(22, -22); ctx.lineTo(-22, 22); ctx.stroke(); }
      ctx.restore();
      txt(ctx, n.l, n.x, n.y + 56, { size: 16, weight: 700, color: n.broken ? '#ff8fa3' : '#cfe0ff' });
    }

    return {
      title: 'מסלול החבילה', acc,
      state: () => ({ stage, path, opts: opts.map((o) => o.ok), N }),
      how: ['ההודעה שלך היא "חבילת מידע" קטנה.', 'קודם כותבים עליה את כתובת היעד (IP), ואז מנתבים אותה דרך הרשת אל החבר/ה.', 'בנתבים המקולקלים (אדום) החבילה נתקעת. מצא/י דרך עוקפת!'],
      update(dt) {
        t += dt; idle += dt; shake = Math.max(0, shake - dt * 3); msgT = Math.max(0, msgT - dt);
        if (stage === 'send') {
          sendT += dt * 0.45;
          if (sendT >= 1) { stage = 'done'; TK.audio.sfx.win(); api.fx.burst(N.friend.x, N.friend.y, '#39ff88', 50, 320); api.fx.ring(N.friend.x, N.friend.y, '#39ff88', 140, 1); }
        }
        if (stage === 'done') { doneT += dt; if (doneT > 1.8) { stage = 'over'; api.finish(stars(errors, 0, 2)); } }
      },
      hint() { return stage === 'addr' ? 'כתובת IP נראית כמו 4 מספרים בין 0 ל-255. חפש/י את הכתובת שכתובה למעלה.' : 'נסה/י לעקוף את הצומת האדום: יש שני מסלולים תקינים. לחץ/י על צומת מחובר כדי להמשיך.'; },
      draw(ctx) {
        frame(ctx, this.title, acc, stage === 'addr' ? 'שלב 1: כתובת יעד' : 'שלב 2: בחירת מסלול');
        if (stage === 'addr') {
          ctx.save();
          ctx.fillStyle = 'rgba(255,255,255,.06)'; rr(ctx, 330, 130, 620, 130, 16); ctx.fill(); ctx.strokeStyle = '#3a4a7a'; ctx.lineWidth = 2; ctx.stroke();
          txt(ctx, 'חבילה #1  |  "היי! מה קורה?"', W / 2, 158, { size: 20, weight: 700, color: '#fff' });
          txt(ctx, 'מאת (IP):  192.168.1.7', 930, 200, { size: 19, color: '#9fb0d8', align: 'right', dir: 'ltr' });
          txt(ctx, 'אל (IP):  ?', 930, 232, { size: 19, color: '#ffe07a', align: 'right', dir: 'ltr', weight: 800 });
          ctx.restore();
          TK.para(ctx, 'החבר/ה שלך מחובר/ת לרשת בכתובת 192.168.1.42. בחר/י את הכתובת הנכונה כדי לכתוב אותה על החבילה:', W / 2, 310, 760, { size: 21, color: '#dfe8ff', weight: 500 });
          opts.forEach((o, i) => UI.button(ctx, 'ip' + i, 210 + i * 290, 400, 270, 74, o.ip, { color: o.done ? '#39ff88' : acc, size: 26, disabled: o.done && !o.ok }));
          txt(ctx, 'כתובת IP מזהה כל מכשיר ברשת, כמו כתובת של בית', W / 2, 545, { size: 18, color: '#8798c8' });
        } else {
          // קווים
          ctx.save();
          E.forEach((e) => {
            const a = N[e[0]], b = N[e[1]];
            const pi = path.indexOf(e[0]), pj = path.indexOf(e[1]);
            const on = pi >= 0 && pj >= 0 && Math.abs(pi - pj) === 1;
            ctx.strokeStyle = on ? '#39ff88' : '#2c3a66'; ctx.lineWidth = on ? 5 : 3; ctx.shadowColor = '#39ff88'; ctx.shadowBlur = on ? 14 : 0;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          });
          ctx.restore();
          Object.keys(N).forEach((k) => nodeDraw(ctx, k, N[k]));
          // חבילה בדרך
          if (stage === 'send' || stage === 'done') {
            const pts = path.map((k) => N[k]);
            let total = 0; const segs = [];
            for (let i = 1; i < pts.length; i++) { const d = dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y); segs.push(d); total += d; }
            let d = Math.min(1, sendT) * total, x = pts[0].x, y = pts[0].y;
            for (let i = 0; i < segs.length; i++) { if (d <= segs[i]) { const k = d / segs[i]; x = pts[i].x + (pts[i + 1].x - pts[i].x) * k; y = pts[i].y + (pts[i + 1].y - pts[i].y) * k; break; } d -= segs[i]; x = pts[i + 1].x; y = pts[i + 1].y; }
            ctx.save(); ctx.fillStyle = '#fff'; ctx.shadowColor = '#39ff88'; ctx.shadowBlur = 24; rr(ctx, x - 16, y - 11, 32, 22, 5); ctx.fill();
            ctx.strokeStyle = '#1a5a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 14, y - 8); ctx.lineTo(x, y + 2); ctx.lineTo(x + 14, y - 8); ctx.stroke(); ctx.restore();
            api.fx.emit({ x, y, vx: 0, vy: 0, life: 0.5, size: 6, color: '#39ff88' });
          }
          TK.para(ctx, stage === 'done' ? 'החבילה הגיעה! ההודעה נמסרה.' : 'לחץ/י על הצמתים לפי הסדר: מהטלפון שלך ועד החבר/ה. עוקפים את האדום!', W / 2, 152, 900, { size: 19, color: stage === 'done' ? '#39ff88' : '#dfe8ff', weight: 600 });
          if (stage === 'route') {
            UI.button(ctx, 'clear', 110, 615, 160, 46, 'נקה מסלול', { color: '#9fb0d8', size: 18 });
            if (path[path.length - 1] === 'friend') UI.button(ctx, 'send', 900, 598, 260, 60, 'שלח חבילה!', { color: '#39ff88', size: 25 });
          }
        }
        if (msgT > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, msgT); TK.rr(ctx, W / 2 - 400, 545, 800, 44, 12); ctx.fillStyle = 'rgba(255,77,109,.18)'; ctx.fill(); ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 2; ctx.stroke(); txt(ctx, msg, W / 2, 568, { size: 19, color: '#ffd3da', weight: 700 }); ctx.restore(); }
      },
      onBtn(id) {
        idle = 0;
        if (id.startsWith('ip')) {
          const o = opts[+id.slice(2)];
          if (o.ok) { o.done = true; TK.audio.sfx.ok(); stage = 'route'; api.bit('כתובת נכונה! עכשיו נמצא לחבילה דרך בנתבים.', 4000); }
          else { errors++; o.done = true; TK.audio.sfx.bad(); shake = 1; say(o.why); }
        } else if (id === 'clear') { path = ['phone']; stage = 'route'; TK.audio.sfx.click(); }
        else if (id === 'send') { stage = 'send'; sendT = 0; TK.audio.sfx.whoosh(); }
      },
      down(x, y) {
        idle = 0;
        if (stage !== 'route') return;
        for (const k in N) {
          const n = N[k];
          if (dist(x, y, n.x, n.y) < 44) {
            const last = path[path.length - 1];
            if (k === last) return;
            if (k === path[path.length - 2]) { path.pop(); TK.audio.sfx.click(); return; }
            if (path.includes(k)) return;
            if (!adj(last, k)) { TK.audio.sfx.bad(); say('אפשר לעבור רק בין צמתים שמחוברים בקו.'); return; }
            if (n.broken) { errors++; TK.audio.sfx.bad(); api.fx.burst(n.x, n.y, '#ff4d6d', 24, 200); say('הנתב הזה מקולקל, החבילה נתקעה! חפש/י דרך עוקפת.'); return; }
            path.push(k); TK.audio.sfx.pop(); api.fx.burst(n.x, n.y, '#39ff88', 10, 120);
            return;
          }
        }
      },
      move() { }, up() { }, destroy() { }
    };
  };

  /* =====================================================================
     2) כבל רשת: סדר החוטים לפי תקן T568B
     ===================================================================== */
  MG.cable = (api) => {
    const acc = '#ffb347';
    const COL = [
      { c: '#ff9a1f', s: true, n: 'כתום-לבן' }, { c: '#ff9a1f', n: 'כתום' }, { c: '#22b84a', s: true, n: 'ירוק-לבן' }, { c: '#1e6bff', n: 'כחול' },
      { c: '#1e6bff', s: true, n: 'כחול-לבן' }, { c: '#22b84a', n: 'ירוק' }, { c: '#8b5a2b', s: true, n: 'חום-לבן' }, { c: '#8b5a2b', n: 'חום' }
    ];
    const SX = 304, SW = 84, SY = 300;
    const order = TK.shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
    const wires = order.map((idx, j) => ({ idx, hx: SX + j * SW + 38, hy: 505, x: SX + j * SW + 38, y: 505, placed: false }));
    let drag = null, errors = 0, t = 0, stage = 'play', testT = 0, doneT = 0, msg = '', msgT = 0;

    function wireDraw(ctx, w, x, y, dim) {
      const d = COL[w.idx]; ctx.save(); ctx.translate(x, y);
      ctx.shadowColor = d.c; ctx.shadowBlur = drag === w ? 18 : 6;
      ctx.beginPath(); rr(ctx, -14, 0, 28, 128, 13); ctx.fillStyle = d.s ? '#f4f6ff' : d.c; ctx.fill(); ctx.shadowBlur = 0;
      if (d.s) { ctx.save(); ctx.clip(); ctx.fillStyle = d.c; for (let yy = -20; yy < 150; yy += 22) { ctx.beginPath(); ctx.moveTo(-16, yy); ctx.lineTo(16, yy - 12); ctx.lineTo(16, yy + 2); ctx.lineTo(-16, yy + 14); ctx.fill(); } ctx.restore(); }
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; rr(ctx, -14, 0, 28, 128, 13); ctx.stroke();
      ctx.fillStyle = '#d9a441'; ctx.fillRect(-9, -8, 18, 12);
      ctx.restore();
    }
    return {
      title: 'כבל הרשת', acc,
      state: () => ({ stage, wires: wires.map((w) => ({ idx: w.idx, x: w.x, y: w.y, placed: w.placed })), SX, SW, SY }),
      how: ['כבל רשת (Ethernet) מכיל 8 חוטים צבעוניים.', 'סדר החיבור נקבע בתקן בינלאומי (T568B). טעות בחוט אחד והחיבור נשבר.', 'גרור/י כל חוט אל החריץ הנכון, לפי טבלת התקן שלמעלה.'],
      hint() { return 'התחל/י מחריץ 1: כתום עם פסים לבנים. עקוב/י אחרי הטבלה למעלה, חריץ אחרי חריץ.'; },
      update(dt) {
        t += dt; msgT = Math.max(0, msgT - dt);
        if (stage === 'test') { testT += dt; if (testT > 2.6) { stage = 'done'; TK.audio.sfx.win(); api.fx.burst(W / 2, SY + 60, '#39ff88', 50, 300); } }
        if (stage === 'done') { doneT += dt; if (doneT > 1.6) { stage = 'over'; api.finish(stars(errors, 1, 4)); } }
      },
      draw(ctx) {
        frame(ctx, this.title, acc, stage === 'test' || stage === 'done' ? 'בודק את החיבור...' : 'חבר/י את החוטים לפי התקן');
        // טבלת תקן
        txt(ctx, 'תקן T568B, סדר החוטים:', W - 110, 130, { size: 16, weight: 700, color: '#ffce8a', align: 'right' });
        COL.forEach((d, i) => {
          const x = SX + i * SW + 38;
          ctx.save(); ctx.translate(x, 150); rr(ctx, -13, 0, 26, 36, 6); ctx.fillStyle = d.s ? '#f4f6ff' : d.c; ctx.fill();
          if (d.s) { ctx.save(); ctx.clip(); ctx.fillStyle = d.c; for (let yy = -8; yy < 44; yy += 10) { ctx.beginPath(); ctx.moveTo(-14, yy); ctx.lineTo(14, yy - 6); ctx.lineTo(14, yy); ctx.lineTo(-14, yy + 6); ctx.fill(); } ctx.restore(); }
          ctx.restore();
          txt(ctx, (i + 1) + '', x, 204, { size: 15, weight: 800, color: '#ffce8a' });
        });
        // מחבר
        ctx.save(); ctx.fillStyle = '#c9d3ee'; rr(ctx, SX - 22, SY - 30, SW * 8 + 44, 200, 18); ctx.fill();
        ctx.fillStyle = '#0d1226'; rr(ctx, SX - 8, SY - 14, SW * 8 + 16, 170, 10); ctx.fill(); ctx.restore();
        COL.forEach((d, i) => {
          const x = SX + i * SW;
          ctx.fillStyle = 'rgba(255,255,255,.07)'; rr(ctx, x + 5, SY, SW - 10, 150, 8); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2; ctx.stroke();
          txt(ctx, (i + 1) + '', x + SW / 2, SY + 176, { size: 17, weight: 700, color: '#7f8db8' });
        });
        wires.forEach((w) => { if (w.placed) wireDraw(ctx, w, w.x, SY + 10); });
        wires.forEach((w) => { if (!w.placed && w !== drag) wireDraw(ctx, w, w.x, w.y - (Math.sin(t * 2 + w.idx) * 2)); });
        if (drag) wireDraw(ctx, drag, drag.x, drag.y);
        if (stage === 'play' || stage === 'test' || stage === 'done') {
          // בודק LED
          const lit = stage === 'test' ? Math.min(8, Math.floor(testT / 0.3)) : stage === 'done' ? 8 : 0;
          for (let i = 0; i < 8; i++) { ctx.fillStyle = i < lit ? '#39ff88' : '#1d2440'; ctx.shadowColor = '#39ff88'; ctx.shadowBlur = i < lit ? 14 : 0; ctx.beginPath(); ctx.arc(SX + i * SW + 38, SY - 60, 9, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0; }
        }
        if (stage === 'done') txt(ctx, 'הכבל תקין! כל 8 החוטים מחוברים', W / 2, 250, { size: 28, weight: 800, color: '#39ff88', glow: '#39ff88' });
        if (msgT > 0) txt(ctx, msg, W / 2, 470, { size: 20, weight: 700, color: '#ff9fb0', alpha: Math.min(1, msgT) });
      },
      down(x, y) {
        if (stage !== 'play') return;
        for (let i = wires.length - 1; i >= 0; i--) { const w = wires[i]; if (!w.placed && Math.abs(x - w.x) < 22 && y > w.y - 12 && y < w.y + 132) { drag = w; drag.ox = x - w.x; drag.oy = y - w.y; TK.audio.sfx.click(); return; } }
      },
      move(x, y) { if (drag) { drag.x = x - drag.ox; drag.y = y - drag.oy; } },
      up(x, y) {
        if (!drag) return;
        const w = drag; drag = null;
        const slot = Math.floor((w.x - SX + 0) / SW);
        if (w.y < SY + 90 && slot >= 0 && slot < 8 && !wires.some((o) => o.placed && o.slotIdx === slot)) {
          if (slot === w.idx) { w.placed = true; w.slotIdx = slot; w.x = SX + slot * SW + SW / 2; TK.audio.sfx.ok(); api.fx.burst(w.x, SY + 40, COL[w.idx].c, 12, 140); if (wires.every((o) => o.placed)) { stage = 'test'; testT = 0; api.bit('כל החוטים במקום! בוא נריץ בדיקת חיבור.', 3500); } return; }
          errors++; TK.audio.sfx.bad(); msg = 'חריץ ' + (slot + 1) + ' דורש חוט אחר. בדוק/י בטבלה שלמעלה.'; msgT = 3;
        }
        w.x = w.hx; w.y = w.hy;
      },
      onBtn() { }, destroy() { }
    };
  };

  /* =====================================================================
     3) פישינג + סיסמה חזקה
     ===================================================================== */
  MG.phish = (api) => {
    const acc = '#ff6bd6';
    let deck = TK.shuffle(TK.CONTENT.phishing), i = 0, wrong = 0, total = 0, stage = 'cards', fb = null, t = 0, allErr = 0, doneT = 0;
    const input = document.getElementById('pw');
    const CRIT = [
      ['לפחות 12 תווים', (s) => s.length >= 12], ['אות גדולה באנגלית (A-Z)', (s) => /[A-Z]/.test(s)], ['אות קטנה באנגלית (a-z)', (s) => /[a-z]/.test(s)],
      ['ספרה (0-9)', (s) => /[0-9]/.test(s)], ['סימן מיוחד (! @ # - _)', (s) => /[^A-Za-z0-9]/.test(s)],
      ['לא סיסמה נפוצה ולא רצף (123456, password)', (s) => s.length > 0 && !/(123456|password|qwerty|abcdef|111111|iloveyou|admin|welcome|(.)\2{3})/i.test(s)]
    ];
    const pwOk = () => CRIT.every((c) => c[1](input.value));
    const onKey = (e) => e.stopPropagation();
    input.addEventListener('keydown', onKey); input.addEventListener('keyup', onKey);
    function startPw() { stage = 'pw'; input.style.display = 'block'; input.value = ''; setTimeout(() => input.focus(), 50); api.bit('שלב שני: צור/י סיסמה חזקה. אל תכתוב/י סיסמה אמיתית שלך!', 5000); }
    const words = ['Blue', 'Panda', 'Router', 'Rocket', 'Pixel', 'Tiger', 'Cable', 'Cloud', 'Orbit', 'Laser', 'Comet', 'Falcon'];
    return {
      title: 'מגן הסייבר', acc,
      state: () => ({ stage, cur: deck[i], fb, i, len: deck.length }),
      how: ['הודעות חשודות מציפות את העיר!', 'סמן/י כל הודעה: לגיטימית או הונאה (פישינג).', 'אחר כך תבנה/י סיסמה חזקה שאי אפשר לנחש.'],
      hint() { return stage === 'cards' ? 'סימנים להונאה: לחץ בהול, קישור מוזר, בקשת סיסמה / קוד / פרטי אשראי, פרס שלא ביקשת.' : 'סיסמה חזקה: ארוכה, עם אותיות גדולות וקטנות, ספרות וסימן. אפשר ללחוץ "הצע לי".'; },
      update(dt) { t += dt; if (stage === 'done') { doneT += dt; if (doneT > 1.6) { stage = 'over'; input.style.display = 'none'; api.finish(stars(allErr, 1, 3)); } } },
      draw(ctx) {
        if (stage === 'cards') {
          frame(ctx, this.title, acc, 'שלב 1: זיהוי הונאות (' + Math.min(i + 1, deck.length) + ' מתוך ' + deck.length + ')');
          const m = deck[i];
          if (!m) return;
          const cx = W / 2 - 320, cy = 140;
          ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.07)'; rr(ctx, cx, cy, 640, 270, 20); ctx.fill(); ctx.strokeStyle = '#4a5a8a'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
          ctx.fillStyle = rgba('#ff6bd6', 0.25); rr(ctx, cx + 24, cy + 20, 76, 28, 14); ctx.fill();
          txt(ctx, m.kind, cx + 62, cy + 35, { size: 15, weight: 700, color: '#ffc4ef' });
          txt(ctx, 'מאת: ' + m.from, cx + 616, cy + 35, { size: 22, weight: 800, color: '#fff', align: 'right' });
          TK.para(ctx, m.text, cx + 616, cy + 90, 580, { size: 23, weight: 500, color: '#e6ecff', align: 'right', lh: 34 });
          if (m.link) {
            ctx.save(); ctx.fillStyle = fb && m.scam ? 'rgba(255,77,109,.25)' : 'rgba(80,140,255,.16)'; rr(ctx, cx + 24, cy + 200, 592, 46, 10); ctx.fill(); ctx.restore();
            txt(ctx, m.link, cx + 320, cy + 224, { size: 21, weight: 600, color: fb && m.scam ? '#ff8fa3' : '#7db4ff', dir: 'ltr' });
          }
          if (!fb) {
            UI.button(ctx, 'legit', W / 2 - 320, 440, 300, 74, '✔  לגיטימית', { color: '#39ff88', size: 26 });
            UI.button(ctx, 'scam', W / 2 + 20, 440, 300, 74, '✖  הונאה', { color: '#ff4d6d', size: 26 });
          } else {
            const ok = fb.ok, col = ok ? '#39ff88' : '#ff4d6d';
            ctx.save(); ctx.fillStyle = rgba(col, 0.14); rr(ctx, cx, 430, 640, 130, 16); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.shadowColor = col; ctx.shadowBlur = 12; ctx.stroke(); ctx.restore();
            txt(ctx, ok ? 'נכון!' : 'לא בדיוק...', cx + 616, 456, { size: 24, weight: 800, color: col, align: 'right' });
            TK.para(ctx, m.why, cx + 616, 492, 600, { size: 19, color: '#e6ecff', align: 'right', lh: 27 });
            UI.button(ctx, 'next', cx + 24, 577, 200, 52, 'הבא', { color: acc, size: 22 });
          }
        } else if (stage === 'retry') {
          frame(ctx, this.title, acc, 'עוד קצת תרגול');
          TK.para(ctx, 'טעית ב-' + wrong + ' הודעות. זה בסדר, כך לומדים! נעבור על ההודעות שוב, ועכשיו כבר אתה מכיר את הסימנים.', W / 2, 260, 760, { size: 26, color: '#fff', weight: 600, lh: 40 });
          UI.button(ctx, 'again', W / 2 - 140, 420, 280, 70, 'ננסה שוב', { color: acc, size: 26 });
        } else {
          frame(ctx, this.title, acc, 'שלב 2: סיסמה חזקה');
          txt(ctx, 'כתוב/י סיסמה לדוגמה (לא את האמיתית שלך!):', W / 2, 150, { size: 20, color: '#cfe0ff', weight: 600 });
          const s = input.value, n = CRIT.filter((c) => c[1](s)).length, k = n / CRIT.length;
          CRIT.forEach((c, j) => {
            const ok = c[1](s), y = 330 + j * 40;
            txt(ctx, (ok ? '✔  ' : '✖  ') + c[0], W / 2 + 200, y, { size: 21, weight: 600, color: ok ? '#39ff88' : '#7f8db8', align: 'right' });
          });
          ctx.fillStyle = 'rgba(255,255,255,.1)'; rr(ctx, W / 2 - 300, 285, 600, 16, 8); ctx.fill();
          ctx.fillStyle = mix('#ff4d6d', '#39ff88', k); ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12; rr(ctx, W / 2 - 300, 285, Math.max(12, 600 * k), 16, 8); ctx.fill(); ctx.shadowBlur = 0;
          txt(ctx, k >= 1 ? 'חזקה מאוד!' : k > 0.6 ? 'בינונית' : 'חלשה', W / 2 - 320, 293, { size: 18, weight: 800, color: mix('#ff4d6d', '#39ff88', k), align: 'right' });
          UI.button(ctx, 'suggest', W / 2 - 300, 585, 200, 52, 'הצע לי', { color: '#9fb0d8', size: 20 });
          UI.button(ctx, 'ok', W / 2 + 60, 575, 240, 62, stage === 'done' ? 'מעולה!' : 'אישור', { color: '#39ff88', size: 24, disabled: !pwOk() || stage === 'done' });
          txt(ctx, 'טיפ: 3-4 מילים אקראיות + מספר + סימן. קל לזכור וקשה לנחש.', W / 2, 560, { size: 16, color: '#8798c8' });
        }
      },
      onBtn(id) {
        if (id === 'legit' || id === 'scam') {
          const m = deck[i], ok = (id === 'scam') === m.scam;
          total++; if (!ok) { wrong++; allErr++; }
          fb = { ok }; ok ? TK.audio.sfx.ok() : TK.audio.sfx.bad();
        } else if (id === 'next') {
          fb = null; i++;
          if (i >= deck.length) { if (wrong <= 1) startPw(); else stage = 'retry'; }
        } else if (id === 'again') { deck = TK.shuffle(TK.CONTENT.phishing); i = 0; wrong = 0; stage = 'cards'; }
        else if (id === 'suggest') { input.value = TK.shuffle(words).slice(0, 3).join('-') + '-' + (10 + Math.floor(Math.random() * 89)) + '!'; TK.audio.sfx.pop(); }
        else if (id === 'ok' && pwOk()) { stage = 'done'; doneT = 0; TK.audio.sfx.win(); api.fx.burst(W / 2, 420, '#39ff88', 50, 300); input.blur(); }
      },
      down() { }, move() { }, up() { },
      destroy() { input.style.display = 'none'; input.removeEventListener('keydown', onKey); input.removeEventListener('keyup', onKey); }
    };
  };

  /* =====================================================================
     4) חומת אש: חסימת תעבורה זדונית
     ===================================================================== */
  MG.firewall = (api) => {
    const acc = '#39ff88';
    const LY = [245, 335, 425, 515], SXp = 1040, WALL = 880, DUR = 30;
    const BAD = ['virus.exe', 'ransom.lock', 'trojan.zip', 'phish.link', 'botnet.bin'], GOOD = ['patient.dat', 'xray.png', 'lab.pdf', 'appt.csv', 'meds.db'];
    let pk = [], time = 0, spawn = 0.5, health = 100, blocked = 0, missed = 0, wrongTap = 0, delivered = 0, t = 0, stage = 'play', endT = 0, fails = 0, flash = 0, popups = [];
    const reset = () => { pk = []; time = 0; spawn = 0.5; health = 100; blocked = 0; missed = 0; wrongTap = 0; delivered = 0; };
    function pop(x, y, s, c) { popups.push({ x, y, s, c, life: 1 }); }
    return {
      title: 'חומת האש', acc,
      state: () => ({ stage, pk: pk.map((p) => ({ x: p.x, y: LY[p.lane], bad: p.bad })), health, time }),
      how: ['בית החולים תחת מתקפה! חבילות מידע זורמות אל השרת.', 'לחץ/י על חבילות אדומות (זדוניות) כדי לחסום אותן.', 'אל תחסום/י חבילות ירוקות: הן נתוני חולים אמיתיים! שרוד/י 30 שניות.'],
      hint() { return 'אדום = מסוכן, ללחוץ עליו. ירוק = תקין, לא לגעת. אל תחכה, חסום מוקדם!'; },
      update(dt) {
        t += dt; flash = Math.max(0, flash - dt * 3);
        popups.forEach((p) => { p.life -= dt; p.y -= 40 * dt; }); popups = popups.filter((p) => p.life > 0);
        if (stage === 'play') {
          time += dt; const u = time / DUR;
          spawn -= dt;
          if (spawn <= 0 && time < DUR - 2) { spawn = TK.lerp(1.0, 0.45, u); const bad = Math.random() < 0.55; pk.push({ lane: Math.floor(Math.random() * 4), x: 150, bad, vx: TK.lerp(170, 300, u) * (0.9 + Math.random() * 0.25), label: TK.pick(bad ? BAD : GOOD), ph: Math.random() * 6 }); }
          for (const p of pk) p.x += p.vx * dt;
          for (let i = pk.length - 1; i >= 0; i--) {
            const p = pk[i];
            if (p.x >= SXp - 50) {
              if (p.bad) { health -= 14; missed++; flash = 1; TK.audio.sfx.bad(); api.fx.burst(SXp, LY[p.lane], '#ff4d6d', 22, 240); pop(SXp - 60, LY[p.lane] - 30, 'פגיעה בשרת!', '#ff4d6d'); }
              else { delivered++; health = Math.min(100, health + 1); api.fx.burst(SXp - 30, LY[p.lane], '#39ff88', 8, 120); }
              pk.splice(i, 1);
            }
          }
          if (health <= 0) { stage = 'lose'; endT = 0; TK.audio.sfx.glitch(); fails++; }
          else if (time >= DUR && pk.length === 0) { stage = 'win'; endT = 0; TK.audio.sfx.win(); api.fx.burst(W / 2, 380, '#39ff88', 70, 380); api.fx.ring(SXp, 380, '#39ff88', 300, 1.2); }
        } else if (stage === 'lose') { endT += dt; if (endT > 2.2) { reset(); stage = 'play'; api.bit('ננסה שוב! זכור/י: אדום לחסום, ירוק לתת לעבור.', 4500); } }
        else if (stage === 'win') { endT += dt; if (endT > 2.4) { stage = 'over'; api.finish(stars(missed + wrongTap, 2, 6)); } }
      },
      draw(ctx) {
        frame(ctx, this.title, acc, 'חסום/י חבילות אדומות, תן/י לירוקות לעבור');
        // מסלולים
        LY.forEach((y) => {
          ctx.strokeStyle = 'rgba(80,120,200,.25)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(150, y); ctx.lineTo(SXp, y); ctx.stroke();
          ctx.strokeStyle = 'rgba(34,229,255,.4)'; ctx.lineWidth = 2; ctx.setLineDash([10, 16]); ctx.lineDashOffset = -t * 60; ctx.beginPath(); ctx.moveTo(150, y); ctx.lineTo(SXp, y); ctx.stroke(); ctx.setLineDash([]);
        });
        // אינטרנט
        ctx.save(); ctx.fillStyle = 'rgba(255,77,109,.15)'; ctx.beginPath(); ctx.arc(120, 380, 62, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#ff8fa3'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
        txt(ctx, 'אינטרנט', 120, 380, { size: 20, weight: 800, color: '#ffd3da' });
        // חומה
        ctx.save(); const wg = ctx.createLinearGradient(WALL - 12, 0, WALL + 12, 0); wg.addColorStop(0, 'rgba(57,255,136,0)'); wg.addColorStop(0.5, rgba('#39ff88', 0.55 + 0.25 * Math.sin(t * 5))); wg.addColorStop(1, 'rgba(57,255,136,0)');
        ctx.fillStyle = wg; ctx.fillRect(WALL - 14, 190, 28, 390); ctx.restore();
        for (let y = 192; y < 580; y += 28) { ctx.strokeStyle = 'rgba(57,255,136,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(WALL - 10, y); ctx.lineTo(WALL + 10, y); ctx.stroke(); }
        txt(ctx, 'חומת אש', WALL, 178, { size: 18, weight: 800, color: '#39ff88' });
        // שרת
        ctx.save(); ctx.fillStyle = flash > 0 ? rgba('#ff4d6d', 0.3) : 'rgba(255,255,255,.08)'; rr(ctx, SXp - 10, 190, 110, 380, 14); ctx.fill(); ctx.strokeStyle = flash > 0 ? '#ff4d6d' : '#8fb4ff'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
        for (let i = 0; i < 6; i++) { ctx.fillStyle = '#171f38'; rr(ctx, SXp, 205 + i * 58, 90, 44, 6); ctx.fill(); ctx.fillStyle = health > 40 ? '#39ff88' : '#ff4d6d'; ctx.fillRect(SXp + 68, 223 + i * 58, 8, 8); }
        txt(ctx, 'שרת בית החולים', SXp + 45, 590, { size: 16, weight: 700, color: '#cfe0ff' });
        // מדדים
        ctx.fillStyle = 'rgba(255,255,255,.1)'; rr(ctx, 150, 138, 300, 14, 7); ctx.fill();
        ctx.fillStyle = mix('#ff4d6d', '#39ff88', health / 100); rr(ctx, 150, 138, Math.max(8, 3 * health), 14, 7); ctx.fill();
        txt(ctx, 'בריאות השרת', 460, 145, { size: 15, weight: 700, color: '#cfe0ff', align: 'left' });
        ctx.fillStyle = 'rgba(255,255,255,.1)'; rr(ctx, 700, 138, 300, 14, 7); ctx.fill();
        ctx.fillStyle = acc; rr(ctx, 700, 138, Math.max(8, 300 * Math.min(1, time / DUR)), 14, 7); ctx.fill();
        txt(ctx, 'זמן', 1010, 145, { size: 15, weight: 700, color: '#cfe0ff', align: 'left' });
        txt(ctx, 'נחסמו: ' + blocked, 640, 619, { size: 18, weight: 700, color: '#39ff88' });
        // חבילות
        pk.forEach((p) => {
          const y = LY[p.lane] + Math.sin(t * 6 + p.ph) * 2;
          ctx.save(); ctx.translate(p.x, y);
          const c = p.bad ? '#ff4d6d' : '#39ff88';
          ctx.shadowColor = c; ctx.shadowBlur = 18; ctx.fillStyle = rgba(c, 0.25); ctx.strokeStyle = c; ctx.lineWidth = 3.5;
          if (p.bad) { ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = Math.PI / 4 * k, r = k % 2 ? 22 : 30; ctx.lineTo(Math.cos(a + t) * r, Math.sin(a + t) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0; txt(ctx, '!', 0, 2, { size: 26, weight: 900, color: '#fff' }); }
          else { rr(ctx, -26, -22, 52, 44, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0; txt(ctx, '✓', 0, 2, { size: 26, weight: 900, color: '#fff' }); }
          ctx.restore();
          txt(ctx, p.label, p.x, y + 44, { size: 13, weight: 600, color: p.bad ? '#ffb3c0' : '#b5ffd2', dir: 'ltr' });
        });
        popups.forEach((p) => txt(ctx, p.s, p.x, p.y, { size: 20, weight: 800, color: p.c, alpha: p.life, glow: p.c }));
        if (stage === 'lose') { ctx.fillStyle = 'rgba(80,0,20,.75)'; ctx.fillRect(P.x, P.y, P.w, P.h); txt(ctx, 'השרת נפל!', W / 2, 320, { size: 56, weight: 900, color: '#ff4d6d', glow: '#ff4d6d' }); txt(ctx, 'מתחילים מחדש...', W / 2, 390, { size: 24, color: '#ffd3da' }); }
        if (stage === 'win') { txt(ctx, 'השרת מוגן!', W / 2, 300, { size: 60, weight: 900, color: '#39ff88', glow: '#39ff88' }); txt(ctx, 'נחסמו ' + blocked + ' איומים, ' + delivered + ' חבילות תקינות הגיעו', W / 2, 365, { size: 24, color: '#d5ffe5' }); }
      },
      down(x, y) {
        if (stage !== 'play') return;
        let best = null, bd = 64;
        for (const p of pk) { const d = dist(x, y, p.x, LY[p.lane]) - (p.bad ? 8 : 0); if (d < bd) { bd = d; best = p; } }
        if (!best) return;
        pk.splice(pk.indexOf(best), 1);
        if (best.bad) { blocked++; TK.audio.sfx.zap(); api.fx.burst(best.x, LY[best.lane], '#ff4d6d', 18, 240); api.fx.ring(best.x, LY[best.lane], '#39ff88', 60, 0.5); }
        else { wrongTap++; health -= 7; flash = 0.6; TK.audio.sfx.bad(); pop(best.x, LY[best.lane] - 30, 'חסמת נתוני חולה!', '#ffb347'); }
      },
      move() { }, up() { }, onBtn() { }, destroy() { }
    };
  };

  /* =====================================================================
     5) אימון AI: מסווג שלומד מדוגמאות
     ===================================================================== */
  MG.ai = (api) => {
    const acc = '#a78bfa';
    const PX = 110, PY = 175, PW = 620, PH = 420;
    const NORMAL = [[0.2, 0.2], [0.34, 0.3]], ATT = [[0.86, 0.2], [0.2, 0.86], [0.86, 0.86]];
    let train, test, sel = null, stage = 'label', t = 0, errors = 0, fails = 0, res = null, doneT = 0, hover = null;
    const clip = (v) => TK.clamp(v, 0.04, 0.96);
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.75;
    function mk(cs, sd, atk) { const c = TK.pick(cs); return { x: clip(c[0] + gauss() * sd), y: clip(c[1] + gauss() * sd), atk, label: null }; }
    function gen() {
      train = []; for (let i = 0; i < 6; i++) train.push(mk(NORMAL, 0.07, false)); for (let i = 0; i < 6; i++) train.push(mk([ATT[i % 3]], 0.07, true));
      train = TK.shuffle(train);
      test = []; for (let i = 0; i < 4; i++) test.push(mk(NORMAL, 0.085, false)); for (let i = 0; i < 4; i++) test.push(mk([ATT[i % 3]], 0.085, true));
      test = TK.shuffle(test); sel = null; stage = 'label'; res = null;
    }
    gen();
    const labeled = () => train.filter((p) => p.label !== null);
    function predict(x, y) {
      const L = labeled(); if (L.length < 2 || !L.some((p) => p.label) || !L.some((p) => !p.label)) return null;
      const s = L.map((p) => ({ d: Math.hypot(p.x - x, p.y - y), l: p.label })).sort((a, b) => a.d - b.d).slice(0, 3);
      return s.filter((q) => q.l).length >= 2;
    }
    const sx = (p) => PX + p.x * PW, sy = (p) => PY + PH - p.y * PH;
    const info = (p) => 'בקשות בשנייה: ' + Math.round(p.x * 1500) + '   |   התחברויות כושלות: ' + Math.round(p.y * 60);
    return {
      title: 'אימון הבינה המלאכותית', acc,
      state: () => ({ stage, train: train.map((p) => ({ x: sx(p), y: sy(p), atk: p.atk, label: p.label })), test: test.map((p) => ({ atk: p.atk })), res }),
      how: ['ה-AI של העיר לא יודע להבדיל בין תעבורה תקינה לתקיפה.', 'לחץ/י על נקודה וסמן/י אם היא "תקינה" או "תקיפה".', 'ה-AI לומד מהדוגמאות שלך ומצבע את המפה. אחר כך נבחן אותו על נתונים חדשים!'],
      hint() { return stage === 'label' ? 'תקיפה = הרבה בקשות בשנייה (DDoS) או הרבה ניסיונות התחברות כושלים (ניחוש סיסמאות). תעבורה רגילה: שניהם נמוכים.' : 'ה-AI לומד רק ממה שלימדת אותו. דוגמאות שגויות נותנות תוצאות שגויות.'; },
      update(dt) { t += dt; if (stage === 'win') { doneT += dt; if (doneT > 2.2) { stage = 'over'; api.finish(stars(errors, 0, 1)); } } },
      draw(ctx) {
        frame(ctx, this.title, acc, stage === 'label' ? 'שלב 1: למד/י את ה-AI (סמן/י לפחות 8 נקודות)' : 'שלב 2: מבחן. האם ה-AI למד?');
        // מפת החלטות
        ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.04)'; rr(ctx, PX, PY, PW, PH, 12); ctx.fill(); ctx.clip();
        if (labeled().length >= 2) {
          for (let cx = 0; cx < PW; cx += 20) for (let cy = 0; cy < PH; cy += 20) {
            const r = predict((cx + 10) / PW, 1 - (cy + 10) / PH);
            if (r === null) continue;
            ctx.fillStyle = r ? 'rgba(255,77,109,.16)' : 'rgba(57,180,255,.16)'; ctx.fillRect(PX + cx, PY + cy, 20, 20);
          }
        }
        ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(PX + i * PW / 6, PY); ctx.lineTo(PX + i * PW / 6, PY + PH); ctx.moveTo(PX, PY + i * PH / 6); ctx.lineTo(PX + PW, PY + i * PH / 6); ctx.stroke(); }
        ctx.restore();
        ctx.strokeStyle = '#4a5a8a'; ctx.lineWidth = 2; rr(ctx, PX, PY, PW, PH, 12); ctx.stroke();
        txt(ctx, 'בקשות בשנייה', PX + PW / 2, PY + PH + 24, { size: 16, color: '#cfe0ff', weight: 700 });
        txt(ctx, 'מעט', PX + 4, PY + PH + 24, { size: 14, color: '#7f8db8', align: 'left' }); txt(ctx, 'הרבה', PX + PW - 4, PY + PH + 24, { size: 14, color: '#7f8db8', align: 'right' });
        ctx.save(); ctx.translate(PX - 24, PY + PH / 2); ctx.rotate(-Math.PI / 2); txt(ctx, 'התחברויות כושלות', 0, 0, { size: 16, color: '#cfe0ff', weight: 700 }); txt(ctx, 'מעט', -PH / 2 + 18, 0, { size: 14, color: '#7f8db8' }); txt(ctx, 'הרבה', PH / 2 - 18, 0, { size: 14, color: '#7f8db8' }); ctx.restore();
        // נקודות אימון
        train.forEach((p) => {
          const x = sx(p), y = sy(p);
          ctx.save();
          if (p.label === null) { ctx.fillStyle = '#c9d3f0'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 8 + Math.sin(t * 4 + x) * 4; ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.283); ctx.fill(); }
          else { const c = p.label ? '#ff4d6d' : '#39b4ff'; ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.283); ctx.fill(); }
          if (p === sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.shadowBlur = 0; ctx.beginPath(); ctx.arc(x, y, 16 + Math.sin(t * 8) * 1.5, 0, 6.283); ctx.stroke(); }
          ctx.restore();
        });
        // נקודות מבחן
        if (stage !== 'label') test.forEach((p) => {
          const x = sx(p), y = sy(p), pr = predict(p.x, p.y);
          ctx.save(); const c = pr ? '#ff4d6d' : '#39b4ff';
          ctx.fillStyle = rgba(c, 0.25); ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.shadowColor = c; ctx.shadowBlur = 10;
          rr(ctx, x - 12, y - 12, 24, 24, 5); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
          if (res) { const ok = pr === p.atk; txt(ctx, ok ? '✓' : '✗', x, y + 1, { size: 20, weight: 900, color: ok ? '#39ff88' : '#ffb347' }); if (!ok) { ctx.strokeStyle = p.atk ? '#ff4d6d' : '#39b4ff'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(x, y, 20, 0, 6.283); ctx.stroke(); } }
          else txt(ctx, '?', x, y + 1, { size: 18, weight: 800, color: '#fff' });
          ctx.restore();
        });
        // פאנל ימני
        const rx = 780, rw = 380;
        ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.05)'; rr(ctx, rx, 120, rw, 500, 16); ctx.fill(); ctx.restore();
        if (stage === 'label') {
          const n = labeled().length;
          txt(ctx, 'דוגמאות שסומנו: ' + n + ' / 12', rx + rw / 2, 150, { size: 20, weight: 800, color: '#e4d9ff' });
          TK.para(ctx, 'תקין: מעט בקשות ומעט כשלונות.', rx + rw - 22, 200, rw - 44, { size: 17, color: '#7fd0ff', align: 'right', weight: 600 });
          TK.para(ctx, 'תקיפה: המון בקשות בבת אחת (DDoS), או המון ניסיונות התחברות כושלים (ניחוש סיסמה).', rx + rw - 22, 235, rw - 44, { size: 17, color: '#ff9fb0', align: 'right', weight: 600 });
          ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.moveTo(rx + 20, 335); ctx.lineTo(rx + rw - 20, 335); ctx.stroke();
          if (sel) {
            txt(ctx, 'הנקודה שנבחרה:', rx + rw - 22, 362, { size: 16, color: '#9fb0d8', align: 'right' });
            TK.para(ctx, info(sel), rx + rw - 22, 392, rw - 44, { size: 17, color: '#fff', align: 'right', weight: 700 });
            UI.button(ctx, 'normal', rx + 24, 440, rw - 48, 58, 'תעבורה תקינה', { color: '#39b4ff', size: 21 });
            UI.button(ctx, 'attack', rx + 24, 508, rw - 48, 58, 'תקיפה!', { color: '#ff4d6d', size: 21 });
          } else txt(ctx, 'בחר/י נקודה על המפה', rx + rw / 2, 420, { size: 19, color: '#8798c8' });
          UI.button(ctx, 'test', rx + 24, 570, rw - 48, 40, 'בחן את ה-AI', { color: '#39ff88', size: 18, disabled: !(n >= 8 && labeled().some((p) => p.label) && labeled().some((p) => !p.label)) });
        } else {
          if (!res) {
            TK.para(ctx, 'הנקודות המרובעות הן נתונים חדשים שה-AI לא ראה. הצבע שלהן הוא הניחוש שלו.', rx + rw - 22, 160, rw - 44, { size: 19, color: '#e4d9ff', align: 'right', weight: 600, lh: 28 });
            UI.button(ctx, 'reveal', rx + 24, 400, rw - 48, 64, 'חשוף את התשובות', { color: acc, size: 22 });
          } else {
            const pct = Math.round(100 * res.ok / test.length);
            txt(ctx, 'דיוק ה-AI: ' + res.ok + ' מתוך ' + test.length, rx + rw / 2, 170, { size: 26, weight: 800, color: res.pass ? '#39ff88' : '#ffb347' });
            txt(ctx, pct + '%', rx + rw / 2, 225, { size: 52, weight: 900, color: res.pass ? '#39ff88' : '#ffb347', glow: res.pass ? '#39ff88' : '#ffb347' });
            TK.para(ctx, res.pass ? 'מעולה! ה-AI למד לזהות תקיפות מהדוגמאות שנתת לו.' : 'ה-AI טעה יותר מדי. הוא לומד רק ממה שנותנים לו: דוגמאות שגויות מלמדות אותו לטעות. ננסה שוב עם נתונים חדשים.', rx + rw - 22, 285, rw - 44, { size: 19, color: '#fff', align: 'right', weight: 600, lh: 28 });
            if (!res.pass) UI.button(ctx, 'retry', rx + 24, 480, rw - 48, 62, 'נסה שוב', { color: '#ffb347', size: 22 });
          }
        }
      },
      onBtn(id) {
        if (id === 'normal' || id === 'attack') { if (!sel) return; sel.label = id === 'attack'; sel = null; TK.audio.sfx.pop(); const n = labeled().length; if (n === 4) api.bit('רואה? ה-AI כבר מצבע את המפה לפי מה שסימנת!', 4500); if (n === 8) api.bit('יש מספיק דוגמאות. אפשר לבחון את ה-AI, או להוסיף עוד.', 4500); }
        else if (id === 'test') { stage = 'test'; TK.audio.sfx.whoosh(); api.bit('עכשיו ה-AI מנחש על נתונים שלא ראה אף פעם.', 4000); }
        else if (id === 'reveal') { const ok = test.filter((p) => predict(p.x, p.y) === p.atk).length; res = { ok, pass: ok >= 6 }; if (res.pass) { stage = 'win'; doneT = 0; TK.audio.sfx.win(); api.fx.burst(W / 2, 360, '#a78bfa', 60, 340); } else { errors++; TK.audio.sfx.bad(); } }
        else if (id === 'retry') { fails++; gen(); TK.audio.sfx.click(); }
      },
      down(x, y) {
        if (stage !== 'label') return;
        let best = null, bd = 26;
        for (const p of train) { const d = dist(x, y, sx(p), sy(p)); if (d < bd) { bd = d; best = p; } }
        if (best) { sel = best; TK.audio.sfx.click(); }
      },
      move() { }, up() { }, destroy() { }
    };
  };

  /* =====================================================================
     6) ליבת העיר: חיבור בעיות לפתרונות + טעינה
     ===================================================================== */
  MG.core = (api) => {
    const acc = '#22e5ff';
    const pairs = [
      ['ההודעה לא מוצאת את הדרך אל החבר', 'נתב וכתובת IP'], ['הרכבות מנותקות זו מזו', 'כבלי רשת ותשתית'],
      ['מישהו מתחזה לבנק כדי לגנוב סיסמה', 'אבטחת מידע וסיסמה חזקה'], ['וירוסים מנסים לחדור למערכת בית החולים', 'חומת אש וגיבוי'],
      ['צריך לזהות אלפי תקיפות בכל שנייה', 'בינה מלאכותית (AI)']
    ];
    const tiles = pairs.map((p, i) => ({ i, text: p[1], done: false }));
    const probs = TK.shuffle(pairs.map((p, i) => ({ i, text: p[0], done: false })));
    let selT = null, errors = 0, stage = 'match', prog = 0, holding = false, t = 0, msg = '', msgT = 0, doneT = 0, links = [];
    const ty = (k) => 190 + k * 84;
    return {
      title: 'הפעלת ליבת העיר', acc,
      state: () => ({ stage, probs: probs.map((p) => p.i), tiles: tiles.map((t) => t.i) }),
      how: ['כל הידע שצברת נפגש כאן.', 'התאם/י כל בעיה בעיר לתחום התקשוב שפותר אותה: לחץ/י על תחום ואז על הבעיה.', 'בסוף, החזק/י לחוץ כדי לטעון את הליבה.'],
      hint() { return 'חשוב/י על האזורים שעברת: כיכר, תחנה, קניון, בית חולים, מעבדת AI.'; },
      update(dt) {
        t += dt; msgT = Math.max(0, msgT - dt);
        if (stage === 'charge') {
          if (holding) prog = Math.min(1, prog + dt * 0.4); else prog = Math.max(0, prog - dt * 0.5);
          TK.audio.sfx.chargeSet(prog);
          if (prog >= 1) { stage = 'done'; holding = false; TK.audio.sfx.chargeStop(); TK.audio.sfx.power(); api.fx.burst(W / 2, 430, '#22e5ff', 90, 460); api.fx.ring(W / 2, 430, '#ffffff', 500, 1.6, 8); }
        }
        if (stage === 'done') { doneT += dt; if (doneT > 1.8) { stage = 'over'; api.finish(stars(errors, 0, 2)); } }
      },
      draw(ctx) {
        frame(ctx, this.title, acc, stage === 'match' ? 'התאם/י כל בעיה לפתרון שלה' : 'טעינת הליבה');
        if (stage === 'match') {
          tiles.forEach((tl, k) => {
            const y = ty(k), on = selT === tl;
            ctx.save(); ctx.fillStyle = tl.done ? 'rgba(57,255,136,.18)' : rgba(acc, on ? 0.35 : 0.14); rr(ctx, 130, y, 380, 64, 14); ctx.fill(); ctx.strokeStyle = tl.done ? '#39ff88' : acc; ctx.lineWidth = on ? 4 : 2.5; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = on ? 16 : 6; ctx.stroke(); ctx.restore();
            txt(ctx, tl.text, 320, y + 33, { size: 21, weight: 700, color: '#fff' });
          });
          probs.forEach((p, k) => {
            const y = ty(k);
            ctx.save(); ctx.fillStyle = p.done ? 'rgba(57,255,136,.18)' : 'rgba(255,77,109,.12)'; rr(ctx, 730, y, 420, 64, 14); ctx.fill(); ctx.strokeStyle = p.done ? '#39ff88' : '#ff8fa3'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
            TK.para(ctx, p.text, 940, y + 27, 390, { size: 18, weight: 600, color: '#fff', lh: 22 });
            UI.btns.push({ id: 'p' + k, x: 730, y, w: 420, h: 64 });
          });
          tiles.forEach((tl, k) => UI.btns.push({ id: 't' + k, x: 130, y: ty(k), w: 380, h: 64 }));
          links.forEach((l) => { ctx.strokeStyle = '#39ff88'; ctx.lineWidth = 4; ctx.shadowColor = '#39ff88'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.moveTo(510, ty(l.a) + 32); ctx.bezierCurveTo(620, ty(l.a) + 32, 620, ty(l.b) + 32, 730, ty(l.b) + 32); ctx.stroke(); ctx.shadowBlur = 0; });
          if (msgT > 0) txt(ctx, msg, W / 2, 625, { size: 20, weight: 700, color: '#ff9fb0', alpha: Math.min(1, msgT) });
        } else {
          const cx = W / 2, cy = 400, R = 110;
          ctx.save();
          const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, R + 60 * prog); g.addColorStop(0, rgba('#ffffff', 0.4 + 0.6 * prog)); g.addColorStop(0.5, rgba(acc, 0.3 + 0.4 * prog)); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R + 60 * prog, 0, 6.283); ctx.fill();
          ctx.strokeStyle = acc; ctx.lineWidth = 10; ctx.shadowColor = acc; ctx.shadowBlur = 24; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + prog * 6.283); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.shadowBlur = 0; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.stroke();
          ctx.restore();
          txt(ctx, Math.round(prog * 100) + '%', cx, cy, { size: 54, weight: 900, color: '#fff', glow: acc });
          txt(ctx, stage === 'done' ? 'הליבה פועלת!' : 'החזק/י לחוץ על העיגול כדי לטעון', cx, 590, { size: 26, weight: 800, color: stage === 'done' ? '#39ff88' : '#dfe8ff' });
        }
      },
      onBtn(id) {
        if (stage !== 'match') return;
        if (id[0] === 't') { const tl = tiles[+id.slice(1)]; if (!tl.done) { selT = tl; TK.audio.sfx.click(); } }
        else if (id[0] === 'p') {
          const k = +id.slice(1), p = probs[k]; if (p.done) return;
          if (!selT) { msg = 'בחר/י קודם תחום מהצד השמאלי.'; msgT = 2.5; return; }
          if (selT.i === p.i) {
            selT.done = true; p.done = true; links.push({ a: selT.i, b: k }); selT = null; TK.audio.sfx.ok(); api.fx.burst(940, ty(k) + 32, '#39ff88', 20, 200);
            if (tiles.every((x) => x.done)) { stage = 'charge'; prog = 0; TK.audio.sfx.chargeStart(); api.bit('כולם מחוברים! עכשיו נטען את הליבה.', 3500); }
          } else { errors++; TK.audio.sfx.bad(); msg = 'זה לא מתאים, חשוב/י שוב.'; msgT = 2.5; selT = null; }
        }
      },
      down(x, y) { if (stage === 'charge' && dist(x, y, W / 2, 400) < 140) { holding = true; TK.audio.sfx.chargeStart(); } },
      move() { },
      up() { if (holding) TK.audio.sfx.chargeStop(); holding = false; },
      destroy() { TK.audio.sfx.chargeStop(); }
    };
  };
})(window.TK);
