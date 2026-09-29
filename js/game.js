/* לולאת המשחק, מצבים (סצנות), קלט, דיאלוגים, שמירה, סוף המשחק והתעודה */
(function (TK) {
  'use strict';
  const W = TK.W, H = TK.H, world = TK.world, ZONES = world.ZONES, A = TK.audio, CFG = TK.CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const cv = $('c'), ctx = cv.getContext('2d');
  const FEET = world.FEET, clamp = TK.clamp;
  const MG_IDS = { square: 'route', train: 'cable', mall: 'phish', hospital: 'firewall', ai: 'ai', core: 'core' };
  const ICONS = ['', '📡', '🔌', '🛡️', '🧱', '🤖', '⚡'];
  const SAVE_KEY = 'netopolis-save-v1';

  const S = {
    scene: 'title', t: 0, k: 1,
    look: TK.defaultLook('m'), name: '',
    px: 520, dir: 1, walk: 0, mood: 'neutral', cam: 0, wave: 0, reveal: 1, glitch: 0, shake: 0,
    idx: 1, stars: ZONES.map(() => 0), arrived: ZONES.map(() => false),
    busy: false, free: false, finished: false,
    bit: { x: 0, y: -100, mood: 'neutral', on: false },
    attempt: null, mg: null, mgPhase: 'intro', mgT: 0, mgIdle: 0, bubble: null, pulse: 0,
    cine: null, stepT: 0, hintT: 0
  };
  const ptr = { x: 0, y: 0, down: false };
  const hot = [];   // נקודות "הידעת?"
  let foundCount = 0;
  const keys = {};
  const mgFx = TK.makeFx();
  let dlg = null;

  /* ---------- כלי עזר ---------- */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const tween = (ms, fn) => new Promise((res) => { const t0 = performance.now(); (function f() { const u = Math.min(1, (performance.now() - t0) / ms); fn(u); u < 1 ? requestAnimationFrame(f) : res(); })(); });
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const totalStars = () => S.stars.reduce((a, b) => a + b, 0);
  function toast(msg, ms) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), ms || 3200); }

  /* ---------- שמירה ---------- */
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ name: S.name, look: S.look, idx: S.idx, stars: S.stars, finished: S.finished, facts: hot.map((h) => h.found) })); } catch (e) { }
  }
  function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; } }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }

  /* ---------- קנבס, גודל וקלט ---------- */
  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight, s = Math.min(vw / W, vh / H);
    $('game').style.transform = 'translate(-50%,-50%) scale(' + s + ')';
    S.k = clamp(s * (window.devicePixelRatio || 1), 1, 2);
    cv.width = Math.round(W * S.k); cv.height = Math.round(H * S.k);
  }
  window.addEventListener('resize', resize);
  const toLogical = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };

  cv.addEventListener('pointerdown', (e) => {
    A.init();
    const p = toLogical(e); ptr.x = p.x; ptr.y = p.y; ptr.down = true;
    try { cv.setPointerCapture(e.pointerId); } catch (er) { }
    if (dlg) { dlgAdvance(); return; }
    if (S.cine) { S.cine.t = S.cine.dur; return; }
    if (S.scene === 'mg' && S.mg) mgPointer('down', p);
  });
  cv.addEventListener('pointermove', (e) => {
    const p = toLogical(e); ptr.x = p.x; ptr.y = p.y;
    if (S.scene === 'mg' && S.mg) mgPointer('move', p);
  });
  const release = (e) => { ptr.down = false; if (S.scene === 'mg' && S.mg) mgPointer('up', toLogical(e)); };
  cv.addEventListener('pointerup', release);
  cv.addEventListener('pointercancel', release);
  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    A.init(); keys[e.code] = true;
    if ((e.code === 'Space' || e.code === 'Enter') && dlg) { e.preventDefault(); dlgAdvance(); }
    if (e.code === 'KeyM') toggleMute();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; ptr.down = false; });

  function toggleMute() { const m = !A.isMuted(); A.setMuted(m); $('btnMute').textContent = m ? '🔇' : '🔊'; }
  $('btnMute').addEventListener('click', () => { A.init(); toggleMute(); });

  /* ---------- דיאלוג ---------- */
  const pctx = $('portrait').getContext('2d');
  $('dialog').addEventListener('pointerdown', (e) => { e.preventDefault(); A.init(); dlgAdvance(); });
  function say(lines) {
    if (!lines || !lines.length) return Promise.resolve();
    lines = lines.map((l) => Object.assign({}, l, { t: TK.fmt(l.t, S) }));
    return new Promise((res) => { dlg = { lines, i: 0, res, pos: 0, done: false, cur: null, tick: 0 }; $('dialog').classList.remove('hidden'); showLine(); });
  }
  function showLine() {
    const l = dlg.lines[dlg.i]; dlg.cur = l; dlg.pos = 0; dlg.done = false;
    $('dname').textContent = l.w === 'bit' ? 'ביט · עוזר AI' : (l.w === 'me' ? S.name : 'מערכת');
    $('dialog').classList.toggle('me', l.w === 'me');
    $('dtext').textContent = '';
    if (l.w === 'bit') S.bit.mood = l.m || 'neutral'; else S.mood = l.m || 'neutral';
  }
  function dlgAdvance() {
    if (!dlg) return;
    if (!dlg.done) { dlg.pos = dlg.cur.t.length; $('dtext').textContent = dlg.cur.t; dlg.done = true; return; }
    A.sfx.click();
    dlg.i++;
    if (dlg.i >= dlg.lines.length) { const r = dlg.res; dlg = null; $('dialog').classList.add('hidden'); S.mood = 'neutral'; S.bit.mood = 'neutral'; r(); }
    else showLine();
  }
  function updateDialog(dt) {
    if (!dlg) return;
    if (!dlg.done) {
      dlg.pos += dt * 62; const n = Math.floor(dlg.pos);
      if (n > dlg.tick) { dlg.tick = n; if (n % 3 === 0 && dlg.cur.w === 'bit') A.sfx.type(); }
      $('dtext').textContent = dlg.cur.t.slice(0, n);
      if (n >= dlg.cur.t.length) dlg.done = true;
    }
    pctx.clearRect(0, 0, 112, 112);
    if (dlg.cur.w === 'bit') TK.drawBit(pctx, 56, 56, S.t, dlg.cur.m, 1.3);
    else TK.drawCharacter(pctx, 56, 186, S.look, { t: S.t, scale: 1.05, mood: dlg.cur.m === 'think' ? 'neutral' : dlg.cur.m });
  }

  /* ---------- כרטיס מושג ---------- */
  function showCard(c) {
    return new Promise((res) => {
      $('cIcon').textContent = c.icon; $('cardBadge').textContent = c.badge || 'מושג חדש נלמד!'; $('cTitle').textContent = c.title; $('cText').textContent = c.text; $('cLab').textContent = c.lab;
      $('card').classList.remove('hidden'); A.sfx.collect();
      $('cardOk').onclick = () => { $('card').classList.add('hidden'); A.sfx.click(); res(); };
    });
  }

  /* ---------- באנר אזור ו"הידעת?" ---------- */
  function showBanner(z) {
    const b = $('banner'); $('bnKick').textContent = 'אזור ' + z.i + ' מתוך ' + (ZONES.length - 1); $('bnTitle').textContent = z.name;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); A.sfx.whoosh();
  }
  function showFact(h) {
    h.found = true; foundCount++; A.sfx.collect(); world.fx.burst(h.x, FEET - 260, '#ffc933', 24, 220); world.fx.ring(h.x, FEET - 260, '#ffc933', 90, 0.8, 3);
    $('factText').textContent = h.t; $('fact').classList.remove('hidden');
    clearTimeout(showFact.h); showFact.h = setTimeout(() => $('fact').classList.add('hidden'), 8000);
    $('fact').onclick = () => $('fact').classList.add('hidden');
    updateHud();
  }
  function drawHot() {
    ctx.save(); ctx.translate(-S.cam, 0);
    hot.forEach((h) => {
      if (h.x < S.cam - 60 || h.x > S.cam + W + 60) return;
      const y = FEET - 262 + Math.sin(S.t * 2 + h.ph) * 7, c = h.found ? '#5a668c' : '#ffc933';
      ctx.save(); ctx.translate(h.x, y);
      ctx.globalAlpha = h.found ? 0.5 : 1; ctx.shadowColor = c; ctx.shadowBlur = h.found ? 0 : 16;
      ctx.fillStyle = 'rgba(30,20,0,.75)'; ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      TK.txt(ctx, h.found ? '✓' : '?', 0, 1, { size: 22, weight: 900, color: c });
      if (!h.found) { const k = (S.t * 0.8 + h.ph) % 1; ctx.strokeStyle = 'rgba(255,201,51,' + (1 - k) * 0.6 + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 20 + k * 22, 0, 6.283); ctx.stroke(); }
      ctx.restore();
    });
    ctx.restore();
  }

  /* ---------- HUD ---------- */
  function buildHud() {
    const p = $('pips'); p.innerHTML = '';
    for (let i = 1; i < ZONES.length; i++) { const d = el('div', 'pip', ICONS[i]); d.id = 'pip' + i; d.title = ZONES[i].name; p.appendChild(d); }
  }
  function updateHud() {
    for (let i = 1; i < ZONES.length; i++) { const e = $('pip' + i); if (e) e.classList.toggle('done', !!world.solved[i]); }
    $('starsCount').innerHTML = '<span>⭐ ' + totalStars() + '</span><span class="fc">🔎 ' + foundCount + '/' + hot.length + '</span>';
    const x = S.cine ? S.cam + W / 2 : S.px;
    $('zoneName').textContent = world.zoneAt(x).name;
  }

  /* ---------- וידאו אופציונלי ---------- */
  function playVideo(src) {
    return new Promise((res) => {
      if (!src) return res();
      const v = document.createElement('video'); v.className = 'vid'; v.src = src; v.playsInline = true; v.style.display = 'none';
      const skip = el('button', 'btn vidskip', 'דלג ⏭'); skip.style.display = 'none';
      let fin = false;
      const done = () => { if (fin) return; fin = true; clearTimeout(to); try { v.pause(); } catch (e) { } v.remove(); skip.remove(); res(); };
      const to = setTimeout(done, 2500);
      v.addEventListener('error', done); v.addEventListener('ended', done); skip.addEventListener('click', done);
      v.addEventListener('canplay', () => { clearTimeout(to); v.style.display = 'block'; skip.style.display = 'block'; v.play().catch(done); }, { once: true });
      $('ui').appendChild(v); $('ui').appendChild(skip);
    });
  }

  /* =====================================================================
     יצירת דמות
     ===================================================================== */
  const cState = { sw: null };
  function buildCreator() {
    const p = $('cpanel'); p.innerHTML = '';
    p.appendChild(el('h3', '', 'צור/י את הדמות שלך'));
    const r1 = el('div', 'crow'); r1.appendChild(el('div', 'clabel', 'מי נכנס/ת לעולם?'));
    const g = el('div', 'chips');
    [['m', '🧑 בן'], ['f', '👧 בת']].forEach((o) => { const c = el('div', 'chip', o[1]); c.dataset.g = o[0]; c.onclick = () => { if (S.look.gender !== o[0]) { const d = TK.defaultLook(o[0]); S.look.gender = o[0]; S.look.hairStyle = d.hairStyle; S.look.hair = d.hair; } pulse(); A.sfx.click(); renderDyn(); }; g.appendChild(c); });
    r1.appendChild(g); p.appendChild(r1);
    const r2 = el('div', 'crow'); r2.appendChild(el('div', 'clabel', 'שם או כינוי (לא שם מלא)'));
    const inp = el('input'); inp.id = 'nameIn'; inp.maxLength = 12; inp.placeholder = 'למשל: נועם'; inp.value = S.name; inp.autocomplete = 'off';
    inp.addEventListener('input', () => { S.name = inp.value.trim(); }); inp.addEventListener('keydown', (e) => e.stopPropagation());
    r2.appendChild(inp); p.appendChild(r2);
    p.appendChild(el('div', '', '')).id = 'cdyn';
    const f = el('div', 'cfoot');
    const rnd = el('button', 'btn', '🎲 אקראי'); rnd.onclick = () => { S.look = TK.randomLook(S.look.gender); pulse(); A.sfx.pop(); renderDyn(); };
    const go = el('button', 'btn primary', 'צא לדרך ←'); go.onclick = startAdventure;
    f.appendChild(rnd); f.appendChild(go); p.appendChild(f);
    renderDyn();
  }
  function pulse() { S.pulse = 1; world.fx.ring(340 + S.cam, FEET - 80, '#22e5ff', 130, 0.8, 3); world.fx.burst(340 + S.cam, FEET - 100, '#22e5ff', 12, 150); }
  function renderDyn() {
    const d = $('cdyn'); d.innerHTML = '';
    document.querySelectorAll('#cpanel .chip[data-g]').forEach((c) => c.classList.toggle('on', c.dataset.g === S.look.gender));
    const swRow = (label, cols, key) => {
      const r = el('div', 'crow'); r.appendChild(el('div', 'clabel', label)); const w = el('div', 'chips');
      cols.forEach((c, i) => { const s = el('div', 'sw' + (S.look[key] === i ? ' on' : '')); s.style.background = c; s.onclick = () => { S.look[key] = i; pulse(); A.sfx.click(); renderDyn(); }; w.appendChild(s); });
      r.appendChild(w); d.appendChild(r);
    };
    swRow('צבע עור', TK.PAL.SKINS, 'skin');
    const hr = el('div', 'crow'); hr.appendChild(el('div', 'clabel', 'תסרוקת')); const hw = el('div', 'chips');
    TK.HAIR_STYLES.forEach((h, i) => { const c = el('div', 'chip' + (S.look.hairStyle === i ? ' on' : ''), h[1]); c.onclick = () => { S.look.hairStyle = i; pulse(); A.sfx.click(); renderDyn(); }; hw.appendChild(c); });
    hr.appendChild(hw); d.appendChild(hr);
    swRow('צבע שיער', TK.PAL.HAIRS, 'hair');
    swRow('צבע קפוצ\'ון', TK.PAL.TOPS, 'top');
    swRow('צבע מכנסיים', TK.PAL.BOTTOMS, 'bottom');
    const ar = el('div', 'crow'); ar.appendChild(el('div', 'clabel', 'אביזרים')); const aw = el('div', 'chips');
    TK.ACCS.forEach((a) => { const c = el('div', 'chip' + (S.look.acc[a[0]] ? ' on' : ''), a[2] + ' ' + a[1]); c.onclick = () => { S.look.acc[a[0]] = !S.look.acc[a[0]]; pulse(); A.sfx.pop(); renderDyn(); }; aw.appendChild(c); });
    ar.appendChild(aw); d.appendChild(ar);
  }

  function startCreator() {
    S.scene = 'creator'; S.cam = 180; S.px = 520;
    $('title').classList.add('hidden'); $('creator').classList.remove('hidden');
    if (!S.name) { $('nameIn') && ($('nameIn').value = ''); }
    buildCreator();
  }

  async function startAdventure() {
    const inp = $('nameIn');
    S.name = (inp.value || '').trim();
    if (!S.name) { S.name = S.look.gender === 'f' ? 'מתקשבת' : 'מתקשב'; }
    A.init(); A.sfx.win();
    $('creator').classList.add('hidden');
    S.idx = 1; S.stars = ZONES.map(() => 0); S.arrived = ZONES.map(() => false); S.finished = false; S.free = false; buildHot(); foundCount = 0;
    world.lit.forEach((v, i) => { world.lit[i] = i === 0 ? 1 : 0; world.target[i] = i === 0 ? 1 : 0; world.solved[i] = false; });
    world.doorOpen = 0;
    save();
    await playVideo(CFG.INTRO_VIDEO);
    await intro();
  }

  /* =====================================================================
     כניסה לעולם החדש
     ===================================================================== */
  async function intro() {
    S.scene = 'intro'; S.px = 520; S.dir = 1; S.cam = 180; S.reveal = 0; S.mood = 'surprised'; S.walk = 0;
    S.bit.on = false; buildHud(); $('hud').classList.add('hidden');
    const f = $('fade'); f.classList.add('on'); await wait(300); f.classList.remove('on');
    A.sfx.whoosh();
    await tween(2400, (u) => { S.reveal = u; if (Math.random() < 0.4) world.fx.emit({ x: S.px + (Math.random() - 0.5) * 80, y: FEET - u * 190, vx: 0, vy: -60, life: 0.8, size: 3, color: '#22e5ff' }); });
    A.sfx.collect(); world.fx.ring(S.px, FEET - 90, '#22e5ff', 200, 1, 4);
    S.reveal = 1; S.mood = 'happy'; S.wave = 1;
    await wait(700);
    S.bit.on = true; S.bit.x = S.px + 700; S.bit.y = 20; A.sfx.whoosh();
    await wait(1100);
    await say(TK.CONTENT.intro);
    S.wave = 0; S.mood = 'neutral';
    S.scene = 'world'; $('hud').classList.remove('hidden'); updateHud();
    toast('לחצו והחזיקו על המסך (או חצים / A D) כדי ללכת ←', 5200);
  }

  /* =====================================================================
     העולם: הליכה, תחנות, תיקון
     ===================================================================== */
  function maxX() { if (S.free || S.idx >= ZONES.length) return world.END - 260; return ZONES[S.idx].station; }
  function updateWorld(dt) {
    let ax = 0;
    if (keys.ArrowRight || keys.KeyD) ax += 1;
    if (keys.ArrowLeft || keys.KeyA) ax -= 1;
    if (!ax && ptr.down && S.scene === 'world') { const dx = ptr.x + S.cam - S.px; if (Math.abs(dx) > 30) ax = Math.sign(dx); }
    if (S.busy || dlg || S.scene !== 'world') ax = 0;
    S.px += ax * 285 * dt;
    S.walk += ((ax ? 1 : 0) - S.walk) * Math.min(1, dt * 10);
    if (ax) { S.dir = ax; S.stepT -= dt; if (S.stepT <= 0) { S.stepT = 0.29; A.sfx.step(); } S.hintT = 0; } else if (!S.busy && !dlg && S.scene === 'world') S.hintT += dt; else S.hintT = 0;
    S.px = clamp(S.px, 70, maxX());
    // מצלמה
    let tc = clamp(S.px - W * 0.38, 0, world.END - W);
    if (S.cine) {
      S.cine.t += dt * 1000; const u = clamp(S.cine.t / S.cine.dur, 0, 1);
      S.cam = TK.lerp(S.cine.from, S.cine.to, TK.easeInOut(u));
      if (u >= 1) { const r = S.cine.res; S.cine = null; r(); }
    } else S.cam += (tc - S.cam) * Math.min(1, dt * 4.5);
    // ביט
    if (S.bit.on) {
      const tx = S.px - S.dir * 74, ty = FEET - 215 + Math.sin(S.t * 1.7) * 6;
      S.bit.x += (tx - S.bit.x) * Math.min(1, dt * 3.2); S.bit.y += (ty - S.bit.y) * Math.min(1, dt * 3.2);
    }
    S.glitch = Math.max(0, S.glitch - dt * 1.2); S.shake = Math.max(0, S.shake - dt * 2);
    // ניסיון "רגיל" שנכשל
    if (S.attempt) {
      const a = S.attempt; a.t += dt;
      if (!a.failed && a.t > 2.1) { a.failed = true; S.glitch = 1; S.shake = 1; S.mood = 'worried'; A.sfx.glitch(); }
      if (a.t > 3.7) { S.attempt = null; a.res(); }
    }
    if (S.scene !== 'world') return;
    if (!S.busy && !dlg) for (const h of hot) if (!h.found && h.z <= S.idx && Math.abs(S.px - h.x) < 55) { showFact(h); break; }
    // הגעה לאזור / הגעה לתחנה
    if (!S.busy && !S.free && S.idx < ZONES.length) {
      const z = ZONES[S.idx];
      if (!S.arrived[z.i] && S.px > z.start + 140) { S.arrived[z.i] = true; arrive(z); }
      else if (S.px >= z.station - 3) runStation(z);
    }
  }

  async function arrive(z) {
    S.busy = true; showBanner(z); await wait(1900); await say(TK.CONTENT.zones[z.id].arrive); S.busy = false;
  }
  function doAttempt(cfg) { return new Promise((res) => { S.attempt = { t: 0, label: cfg.label, err: cfg.err, failed: false, res }; }); }

  async function runStation(z) {
    if (S.busy) return;
    S.busy = true; $('fact').classList.add('hidden');
    const C = TK.CONTENT.zones[z.id];
    if (!S.arrived[z.i]) S.arrived[z.i] = true;
    await say(C.pre);
    await doAttempt(C.attempt);
    await say(C.post);
    const st = await playMinigame(z);
    S.stars[z.i] = Math.max(S.stars[z.i], st);
    await repair(z);
    if (C.win && C.win.length) await say(C.win);
    if (C.card) await showCard(C.card);
    S.idx = z.i + 1; save(); updateHud();
    if (z.id === 'core') { await finale(); return; }
    S.busy = false;
    toast('האזור תוקן! ממשיכים ימינה ←', 3600);
  }

  async function repair(z) {
    A.sfx.power(); world.target[z.i] = 1; world.solved[z.i] = true; S.mood = 'happy'; S.wave = 1; S.shake = 0.5; updateHud();
    for (let i = 0; i < 4; i++) setTimeout(() => world.fx.ring(z.station, FEET - 30, '#22e5ff', 500 + i * 160, 1.4, 6), i * 220);
    world.fx.burst(z.station, FEET - 120, '#ffffff', 70, 420);
    await wait(1900); S.wave = 0; S.mood = 'neutral';
    A.sfx.collect();
  }

  /* ---------- מיני-משחקים ---------- */
  function playMinigame(z) {
    return new Promise((res) => {
      $('fact').classList.add('hidden');
      let ended = false;
      const api = {
        bit: (text, ms) => { S.bubble = { t: text, ms: ms || 4000, age: 0 }; },
        fx: mgFx,
        finish: (stars) => {
          if (ended) return; ended = true;
          try { S.mg.destroy(); } catch (e) { }
          S.mg = null; S.scene = 'world'; S.bubble = null; mgFx.list.length = 0; $('hud').style.opacity = '';
          res(stars || 1);
        }
      };
      S.mgApi = api; S.mg = TK.MG.create(MG_IDS[z.id], api); S.mgPhase = 'intro'; S.mgT = 0; S.mgIdle = 0; S.scene = 'mg'; S.bubble = null;
      ptr.down = false; $('hud').style.opacity = '0';
    });
  }
  function mgPointer(type, p) {
    const UI = TK.MG_UI; S.mgIdle = 0;
    if (type === 'move') { UI.hover = UI.hit(p.x, p.y); if (S.mgPhase === 'play') S.mg.move(p.x, p.y); return; }
    if (type === 'down') {
      const id = UI.hit(p.x, p.y);
      if (id) {
        A.sfx.click();
        if (id === '_start') { S.mgPhase = 'play'; }
        else if (id === '_hint') { S.bubble = { t: S.mg.hint(), ms: 6500, age: 0 }; }
        else if (id === '_skip') { S.mgApi.finish(1); return; }
        else if (S.mgPhase === 'play') S.mg.onBtn(id);
        return;
      }
      if (S.mgPhase === 'play') S.mg.down(p.x, p.y);
    } else if (type === 'up') { if (S.mgPhase === 'play') S.mg.up(p.x, p.y); }
  }
  function drawMg(dt) {
    const UI = TK.MG_UI, P = TK.MG_PANEL;
    ctx.fillStyle = 'rgba(3,5,16,.72)'; ctx.fillRect(0, 0, W, H);
    UI.reset();
    if (S.mgPhase === 'intro') {
      TK.MG.frame(ctx, S.mg.title, S.mg.acc);
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.06)'; TK.rr(ctx, 210, 150, 860, 330, 22); ctx.fill(); ctx.restore();
      TK.txt(ctx, 'המשימה', W / 2, 190, { size: 22, weight: 800, color: S.mg.acc });
      S.mg.how.forEach((l, i) => TK.para(ctx, l, W / 2, 245 + i * 72, 780, { size: 24, weight: 500, color: '#eaf0ff', lh: 32 }));
      UI.button(ctx, '_start', W / 2 - 140, 530, 280, 76, 'בואו נתחיל!', { color: '#39ff88', size: 28 });
    } else {
      S.mg.draw(ctx);
      mgFx.draw(ctx);
      UI.button(ctx, '_hint', P.x + P.w - 130, P.y + 14, 112, 38, '💡 רמז', { color: '#ffc933', size: 17 });
      if (S.mgT > 120) UI.button(ctx, '_skip', P.x + 18, P.y + 14, 112, 38, 'דלג ⏭', { color: '#9fb0d8', size: 16 });
    }
    // בועת ביט מתחת לחלון
    if (S.bubble) {
      const b = S.bubble, a = Math.min(1, b.age * 4, (b.ms / 1000 - b.age) * 3);
      if (a > 0) {
        ctx.save(); ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(10,18,48,.96)'; TK.rr(ctx, P.x, 690, P.w, 26, 13); ctx.fill(); ctx.strokeStyle = '#22e5ff'; ctx.lineWidth = 2; ctx.stroke();
        TK.txt(ctx, b.t, P.x + P.w - 16, 704, { size: 15, weight: 600, color: '#dff6ff', align: 'right' });
        TK.drawBit(ctx, P.x + 22, 703, S.t, 'neutral', 0.28);
        ctx.restore();
      }
    }
  }

  /* =====================================================================
     סיום: פיצוצי אור, סיור בעיר, תעודה
     ===================================================================== */
  async function finale() {
    S.busy = true; S.finished = true; save();
    A.sfx.boom();
    tween(2000, (u) => { world.doorOpen = u; });
    const cols = ['#22e5ff', '#ff3df2', '#39ff88', '#ffc933', '#ffffff'];
    for (let i = 0; i < 16; i++) setTimeout(() => {
      const x = S.cam + 160 + Math.random() * 960, y = 70 + Math.random() * 250, c = TK.pick(cols);
      world.fx.burst(x, y, c, 46, 330, { life: 1.2 + Math.random() * 0.6 }); world.fx.ring(x, y, c, 110, 0.8, 3); A.sfx.pop();
    }, i * 240);
    S.mood = 'happy'; S.wave = 1;
    await wait(2600);
    await say(TK.CONTENT.finale);
    S.wave = 0;
    await playVideo(CFG.FINALE_VIDEO);
    S.mood = 'neutral'; await showCard(TK.CONTENT.summary);
    // סיור אווירי בעיר שהצלת
    toast('העיר שהצלת ✨', 4000);
    await new Promise((res) => { S.cine = { t: 0, dur: 9500, from: S.cam, to: 0, res }; });
    await showCertificate();
  }

  function rankText() { return TK.fmt(totalStars() >= 16 ? 'מתקשב[[|ת]] מצטיי[[ן|נת]]' : 'מתקשב[[|ת]] מוסמ[[ך|כת]]', S); }
  function showCertificate() {
    return new Promise((res) => {
      A.sfx.win(); drawCert(); $('toast').classList.remove('on'); $('hud').style.opacity = '0';
      $('cert').classList.remove('hidden');
      const cta = $('btnCta');
      if (CFG.CTA_URL) { cta.href = CFG.CTA_URL; cta.textContent = CFG.CTA_BUTTON || 'לפרטים'; cta.classList.remove('hidden'); }
      $('btnDownload').onclick = () => { const a = document.createElement('a'); a.download = 'netopolis-certificate.png'; a.href = $('certCanvas').toDataURL('image/png'); a.click(); };
      $('btnExplore').onclick = () => { $('cert').classList.add('hidden'); $('hud').style.opacity = ''; S.free = true; S.busy = false; S.px = ZONES[6].station + 200; S.cam = clamp(S.px - W * 0.38, 0, world.END - W); res(); };
      $('btnAgain').onclick = () => { clearSave(); location.reload(); };
    });
  }
  let logoImg = null;
  function drawCert() {
    const c = $('certCanvas'), g = c.getContext('2d'), CW = 1200, CH = 800;
    const gr = g.createLinearGradient(0, 0, CW, CH); gr.addColorStop(0, '#070d2a'); gr.addColorStop(0.5, '#150f42'); gr.addColorStop(1, '#06142a');
    g.fillStyle = gr; g.fillRect(0, 0, CW, CH);
    g.strokeStyle = 'rgba(34,229,255,.08)'; g.lineWidth = 1;
    for (let x = 0; x < CW; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, CH); g.stroke(); }
    for (let y = 0; y < CH; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(CW, y); g.stroke(); }
    g.shadowColor = '#22e5ff'; g.shadowBlur = 24; g.strokeStyle = '#22e5ff'; g.lineWidth = 5; TK.rr(g, 28, 28, CW - 56, CH - 56, 30); g.stroke();
    g.shadowColor = '#ff3df2'; g.strokeStyle = 'rgba(255,61,242,.7)'; g.lineWidth = 2; TK.rr(g, 44, 44, CW - 88, CH - 88, 24); g.stroke(); g.shadowBlur = 0;
    const T = (s, x, y, o) => TK.txt(g, s, x, y, o);
    T((CFG.SCHOOL || 'מגמת תקשוב'), CW / 2, 100, { size: 32, weight: 800, color: '#22e5ff', glow: '#22e5ff' });
    if (CFG.SCHOOL_SUB) T(CFG.SCHOOL_SUB, CW / 2, 138, { size: 20, weight: 500, color: '#9fb0d8' });
    T('תעודת הוקרה', CW / 2, 220, { size: 84, weight: 900, color: '#fff', glow: '#7c4dff', glowSize: 30 });
    T(TK.fmt('מוענקת בזאת ל[[תלמיד|תלמידה]]', S), CW / 2, 300, { size: 28, weight: 500, color: '#cfe0ff' });
    T(S.name, CW / 2 + 130, 380, { size: 88, weight: 900, color: '#ffe07a', glow: '#ffc933', glowSize: 24 });
    T('בדרגת: ' + rankText(), CW / 2 + 130, 458, { size: 38, weight: 800, color: '#7cf5c8', glow: '#39ff88', glowSize: 14 });
    TK.para(g, TK.fmt('על שה[[חזיר|חזירה]] את נטופוליס לחיים: [[חיבר|חיברה]] רשתות, [[חיווט|חיווטה]] כבלים, [[הגן|הגנה]] מפני הונאות ותקיפות, ו[[אימן|אימנה]] בינה מלאכותית.', S), CW / 2 + 110, 520, 640, { size: 26, weight: 500, color: '#e6ecff', lh: 38 });
    // תגי אזורים
    const nm = ['רשתות', 'כבלים', 'אבטחה', 'חומת אש', 'AI', 'ליבה'];
    for (let i = 0; i < 6; i++) {
      const x = 450 + (5 - i) * 116, y = 665;
      g.fillStyle = 'rgba(57,255,136,.14)'; g.strokeStyle = '#39ff88'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 34, 0, 6.283); g.fill(); g.stroke();
      T(ICONS[i + 1], x, y + 2, { size: 30 }); T(nm[i], x, y + 52, { size: 15, weight: 600, color: '#bfffd8' });
    }
    T('⭐ ' + totalStars() + ' / ' + ((ZONES.length - 1) * 3), 1040, 130, { size: 30, weight: 800, color: '#ffc933', glow: '#ffc933', dir: 'ltr' });
    T('🔎 ' + foundCount + ' / ' + hot.length, 1040, 168, { size: 20, weight: 700, color: '#ffe07a', dir: 'ltr' });
    T(new Date().toLocaleDateString('he-IL'), 1040, 205, { size: 20, color: '#8fa0d0', dir: 'ltr' });
    TK.drawCharacter(g, 190, 700, S.look, { t: 1.2, scale: 2.1, mood: 'happy', wave: true, dir: 1, hero: true });
    TK.drawBit(g, 1100, 330, 2, 'happy', 1.25);
    T('ביט, עוזר ה-AI', 1100, 410, { size: 17, color: '#9fb0d8' });
    const lg = CFG.LOGO && (logoImg || (logoImg = (() => { const i = new Image(); i.onload = drawCert; i.onerror = () => { }; i.src = CFG.LOGO; return i; })()));
    if (lg && lg.complete && lg.naturalWidth) { const h = 70, w = lg.naturalWidth / lg.naturalHeight * h; g.drawImage(lg, 90, 70, w, h); }
  }

  /* =====================================================================
     ציור
     ===================================================================== */
  const glitchBars = () => {
    const k = S.k;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < 4; i++) {
      const y = Math.random() * (cv.height - 60), h = (6 + Math.random() * 26) * k;
      ctx.drawImage(cv, 0, y, cv.width, h, (Math.random() - 0.5) * 60 * k, y, cv.width, h);
    }
    ctx.restore();
  };
  let vig = null;
  function drawVignette(a) {
    if (!vig) { vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.95); vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,10,.75)'); }
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H); ctx.restore();
  }

  function drawAttempt() {
    const a = S.attempt; if (!a) return;
    const x = S.px - S.cam, y = FEET - 250, w = 330, h = 84;
    const prog = a.failed ? 0.63 : clamp(0.63 * TK.easeOut(a.t / 1.9), 0, 0.63) + (a.t > 1.4 ? Math.sin(a.t * 30) * 0.012 : 0);
    const col = a.failed ? '#ff4d6d' : '#22e5ff';
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(8,12,34,.94)'; TK.rr(ctx, -w / 2, -h / 2, w, h, 16); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.shadowColor = col; ctx.shadowBlur = 16; ctx.stroke(); ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.moveTo(-10, h / 2); ctx.lineTo(0, h / 2 + 14); ctx.lineTo(10, h / 2); ctx.fillStyle = col; ctx.fill();
    TK.txt(ctx, a.failed ? a.err : a.label, 0, -16, { size: 21, weight: 800, color: a.failed ? '#ffb3c0' : '#fff' });
    ctx.fillStyle = 'rgba(255,255,255,.12)'; TK.rr(ctx, -w / 2 + 24, 10, w - 48, 16, 8); ctx.fill();
    ctx.fillStyle = col; TK.rr(ctx, -w / 2 + 24, 10, Math.max(8, (w - 48) * prog), 16, 8); ctx.fill();
    TK.txt(ctx, Math.round(prog * 100) + '%', 0, 34, { size: 14, weight: 700, color: a.failed ? '#ff8fa3' : '#9fe8ff', dir: 'ltr' });
    if (a.failed) { TK.txt(ctx, '✖', w / 2 - 22, -h / 2 - 2, { size: 30, weight: 900, color: '#ff4d6d', glow: '#ff4d6d' }); }
    ctx.restore();
  }

  function drawWorldScene(withChar) {
    const sh = S.shake > 0 ? S.shake * 12 : 0;
    ctx.save();
    if (sh) ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh * 0.6);
    world.drawBack(ctx, S.cam, S.t, S);
    if (withChar) {
      TK.drawCharacter(ctx, S.px - S.cam, FEET, S.look, { t: S.t, walk: S.walk, dir: S.dir, scale: 1.12, mood: S.mood, wave: S.wave > 0, glitch: S.glitch, reveal: S.reveal, hero: S.finished });
      if (S.bit.on) TK.drawBit(ctx, S.bit.x - S.cam, S.bit.y, S.t, S.bit.mood, 0.95);
      drawAttempt();
    }
    world.drawFront(ctx, S.cam, S.t, S);
    if (withChar && S.scene !== 'intro') drawHot();
    ctx.restore();
    // אפקטים של "עיר תקולה"
    if (withChar) {
      const z = world.zoneAt(S.px), l = world.lit[z.i];
      if (l < 0.6) { drawVignette(0.7 * (1 - l)); if (Math.random() < 0.035 * (1 - l) + S.glitch * 0.6) glitchBars(); }
      if (S.glitch > 0) { ctx.fillStyle = 'rgba(255,77,109,' + S.glitch * 0.16 + ')'; ctx.fillRect(0, 0, W, H); }
    }
  }
  function withAllLit(fn) {
    const saved = world.lit.slice(); world.lit.fill(1);
    try { fn(); } finally { for (let i = 0; i < saved.length; i++) world.lit[i] = saved[i]; }
  }

  function drawCreator() {
    withAllLit(() => world.drawBack(ctx, S.cam, S.t, S));
    world.drawFront(ctx, S.cam, S.t, S);
    const x = 520 - S.cam, wv = (S.t % 6) < 1.4;
    S.pulse = Math.max(0, S.pulse - 0.02);
    TK.drawCharacter(ctx, x, FEET - 4, S.look, { t: S.t, dir: 1, scale: 2.35 + S.pulse * 0.05, mood: S.pulse > 0.2 || wv ? 'happy' : 'neutral', wave: wv });
    ctx.save(); ctx.strokeStyle = 'rgba(34,229,255,.7)'; ctx.lineWidth = 3;
    const y = FEET - ((S.t * 0.5) % 1) * 380; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(x - 170, y); ctx.lineTo(x + 170, y); ctx.stroke(); ctx.restore();
  }

  function drawWalkHint() {
    if (S.scene !== 'world' || S.busy || dlg || S.hintT < 5 || S.px >= maxX() - 150) return;
    const a = 0.4 + 0.4 * Math.sin(S.t * 4);
    ctx.save(); ctx.globalAlpha = a; TK.txt(ctx, 'ממשיכים ימינה  ➜', W - 130, H / 2, { size: 26, weight: 800, color: '#22e5ff', glow: '#22e5ff' }); ctx.restore();
  }

  /* ---------- לולאה ---------- */
  function update(dt) {
    S.t += dt;
    world.update(dt);
    updateDialog(dt);
    if (S.bubble) S.bubble.age += dt;
    switch (S.scene) {
      case 'title': S.cam = 1400 + (S.t * 70) % 10600; break;
      case 'creator': break;
      case 'intro': case 'world': updateWorld(dt); break;
      case 'mg':
        updateWorld(dt);
        S.mgT += dt; S.mgIdle += dt; mgFx.update(dt);
        if (S.mgPhase === 'play') S.mg.update(dt);
        if (S.mgPhase === 'play' && S.mgIdle > 35 && !S.bubble) { S.bubble = { t: S.mg.hint(), ms: 6500, age: 0 }; S.mgIdle = 0; }
        break;
    }
    if (S.scene === 'world' || S.scene === 'mg') { S.hudT = (S.hudT || 0) + dt; if (S.hudT > 0.25) { S.hudT = 0; updateHud(); } }
  }
  function draw() {
    ctx.setTransform(S.k, 0, 0, S.k, 0, 0);
    switch (S.scene) {
      case 'title': withAllLit(() => world.drawBack(ctx, S.cam, S.t, S)); world.drawFront(ctx, S.cam, S.t, S); break;
      case 'creator': drawCreator(); break;
      case 'intro': drawWorldScene(true); break;
      case 'world': drawWorldScene(true); drawWalkHint(); break;
      case 'mg': drawWorldScene(true); drawMg(); break;
    }
  }
  let last = performance.now();
  function frame(now) {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    try { update(dt); draw(); } catch (e) { console.error(e); }
    requestAnimationFrame(frame);
  }

  /* ---------- אתחול ---------- */
  function buildHot() {
    hot.length = 0;
    ZONES.forEach((z) => { const f = TK.CONTENT.facts[z.id]; if (f) f.forEach((o) => hot.push({ x: z.start + o.dx, z: z.i, t: o.t, found: false, ph: Math.random() * 6 })); });
  }
  function init() {
    buildHot(); world.init(); resize();
    $('tSchool').textContent = (CFG.SCHOOL || '') + (CFG.SCHOOL_SUB ? ' · ' + CFG.SCHOOL_SUB : '');
    if (CFG.LOGO) { const l = $('logo'); l.onload = () => l.classList.remove('hidden'); l.src = CFG.LOGO; }
    const sv = loadSave();
    if (sv && sv.name) $('btnContinue').classList.remove('hidden');
    $('btnStart').onclick = () => { A.init(); A.sfx.click(); startCreator(); };
    $('btnContinue').onclick = () => { A.init(); A.sfx.click(); continueGame(sv); };
    requestAnimationFrame(frame);
  }
  function continueGame(sv) {
    S.name = sv.name; S.look = sv.look; S.idx = sv.idx; S.stars = sv.stars || ZONES.map(() => 0); S.finished = !!sv.finished;
    buildHud(); buildHot(); if (sv.facts) sv.facts.forEach((f, i) => { if (hot[i]) hot[i].found = !!f; }); foundCount = hot.filter((h) => h.found).length;
    for (let i = 1; i < ZONES.length; i++) { const d = i < S.idx; world.solved[i] = d; world.lit[i] = world.target[i] = d ? 1 : 0; S.arrived[i] = d; }
    S.free = S.idx >= ZONES.length;
    const z = ZONES[Math.min(S.idx, ZONES.length - 1)];
    S.px = S.free ? ZONES[6].station + 200 : z.start + 100; S.cam = clamp(S.px - W * 0.38, 0, world.END - W);
    S.bit.on = true; S.bit.x = S.px - 70; S.bit.y = FEET - 215; S.reveal = 1; S.scene = 'world'; S.busy = false; S.mood = 'neutral';
    world.doorOpen = S.free ? 1 : 0;
    $('title').classList.add('hidden'); $('hud').classList.remove('hidden'); updateHud();
    toast('ברוכים השבים! ממשיכים ימינה ←', 3200);
  }

  TK.game = { S, world, runStation, say, finale, showCertificate, playMinigame, save };
  init();
})(window.TK);
