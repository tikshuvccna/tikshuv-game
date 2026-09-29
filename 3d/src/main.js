/* נטופוליס 3D: לולאת המשחק, מצלמה, קלט, דיאלוגים, מיני-משחקים (שכבת 2D), סיום ותעודה */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createWorld, ZONES } from './world3d.js';
import { buildAvatar } from './avatar.js';

const TK = window.TK, A = TK.audio, CFG = TK.CONFIG || {};
const W = TK.W, H = TK.H, clamp = TK.clamp;
const $ = (id) => document.getElementById(id);
const MG_IDS = { square: 'route', train: 'network', mall: 'phish', hospital: 'firewall', ai: 'ai', core: 'quiz' };
const ICONS = ['', '📡', '🖥️', '🛡️', '🧱', '🤖', '⚡'];
const SAVE_KEY = 'netopolis-3d-save-v1';
const coarse = window.matchMedia('(pointer:coarse)').matches;
const qs = new URLSearchParams(location.search);

/* ---------- רנדרר ---------- */
const cv3 = $('three');
const renderer = new THREE.WebGLRenderer({ canvas: cv3, antialias: !coarse, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 1200);
const world = createWorld(scene);
let composer = null, bloomPass = null;
if (!coarse && !qs.has('nobloom')) {
  composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.75, 0.55, 0.8); composer.addPass(bloomPass); composer.addPass(new OutputPass());
}

/* ---------- מצב ---------- */
const S = {
  scene: 'title', t: 0, look: TK.defaultLook('m'), name: '', avatar: null,
  pos: new THREE.Vector3(0, 0, 46), yaw: Math.PI, walk: 0, speed: 0, mood: 'neutral', wave: false,
  camYaw: 0, camPitch: 0.32, camDist: 7.5, camTarget: new THREE.Vector3(0, 1.5, 46),
  busy: false, finished: false, stars: ZONES.map(() => 0), arrived: ZONES.map(() => false), dwell: 0, hintT: 0, free: false,
  bit: { pos: new THREE.Vector3(0, 6, 40), mood: 'neutral', on: false }, cine: null,
  mg: null, mgApi: null, mgPhase: 'intro', mgT: 0, mgIdle: 0, bubble: null, stick: { x: 0, y: 0 }, k: 1, pulse: 0
};
const keys = {};
const mgFx = TK.makeFx();
let dlg = null, foundCount = 0;
const hot = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const tween = (ms, fn) => new Promise((res) => { const t0 = performance.now(); (function f() { const u = Math.min(1, (performance.now() - t0) / ms); fn(u); u < 1 ? requestAnimationFrame(f) : res(); })(); });
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const totalStars = () => S.stars.reduce((a, b) => a + b, 0);
const solvedCount = () => { let n = 0; for (let i = 1; i <= 5; i++) if (world.solved[i]) n++; return n; };
function toast(msg, ms) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), ms || 3200); }

/* ---------- שמירה ---------- */
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ name: S.name, look: S.look, solved: world.solved.slice(), stars: S.stars, finished: S.finished, profile: TK.profile || null, facts: hot.map((h) => h.found) })); } catch (e) { } }
const loadSave = () => { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; } };
const clearSave = () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } };

/* ---------- גודל ---------- */
const ov = $('c'), octx = ov.getContext('2d');
function resize() {
  const vw = window.innerWidth, vh = window.innerHeight, s = Math.min(vw / W, vh / H);
  renderer.setSize(vw, vh, false); camera.aspect = vw / vh; camera.updateProjectionMatrix();
  if (composer) { composer.setSize(vw, vh); composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); }
  $('game').style.transform = 'translate(-50%,-50%) scale(' + s + ')';
  S.k = clamp(s * (window.devicePixelRatio || 1), 1, 2); ov.width = Math.round(W * S.k); ov.height = Math.round(H * S.k);
  if (S.scene === 'creator') applyViewOffset();
}
window.addEventListener('resize', resize);
function applyViewOffset() { const w = window.innerWidth, h = window.innerHeight; camera.setViewOffset(w, h, w * 0.17, 0, w, h); }

/* ---------- אווטאר ---------- */
function rebuildAvatar() {
  if (S.avatar) { scene.remove(S.avatar); S.avatar.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
  const look = Object.assign({}, S.look, { hero: S.finished });
  S.avatar = buildAvatar(look); scene.add(S.avatar); S.avatar.userData.setMood(S.mood);
}

/* ---------- Bit (ספרייט שמצויר בקנבס) ---------- */
const bitCv = document.createElement('canvas'); bitCv.width = bitCv.height = 160; const bitCtx = bitCv.getContext('2d');
const bitTex = new THREE.CanvasTexture(bitCv); bitTex.colorSpace = THREE.SRGBColorSpace;
const bitSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: bitTex, transparent: true, depthWrite: false, fog: false })); bitSprite.scale.set(2.6, 2.6, 1); bitSprite.visible = false; scene.add(bitSprite);
const bitLight = new THREE.PointLight(0x22e5ff, 6, 9, 2); scene.add(bitLight);

/* ---------- דיאלוג ---------- */
const pctx = $('portrait').getContext('2d');
$('dialog').addEventListener('pointerdown', (e) => { e.preventDefault(); A.init(); dlgAdvance(); });
function say(lines) {
  if (!lines || !lines.length) return Promise.resolve();
  lines = lines.map((l) => Object.assign({}, l, { t: TK.fmt(l.t, S) }));
  return new Promise((res) => { dlg = { lines, i: 0, res, pos: 0, done: false, cur: null, tick: 0 }; $('dialog').classList.remove('hidden'); showLine(); });
}
function setMood(who, m) { if (who === 'bit') S.bit.mood = m; else { S.mood = m; if (S.avatar) S.avatar.userData.setMood(m); } }
function showLine() {
  const l = dlg.lines[dlg.i]; dlg.cur = l; dlg.pos = 0; dlg.done = false;
  $('dname').textContent = l.w === 'bit' ? 'ביט · עוזר AI' : (l.w === 'me' ? S.name : 'מערכת');
  $('dialog').classList.toggle('me', l.w === 'me'); $('dtext').textContent = '';
  setMood(l.w === 'bit' ? 'bit' : 'me', l.m || 'neutral');
}
function dlgAdvance() {
  if (!dlg) return;
  if (!dlg.done) { dlg.pos = dlg.cur.t.length; $('dtext').textContent = dlg.cur.t; dlg.done = true; return; }
  A.sfx.click(); dlg.i++;
  if (dlg.i >= dlg.lines.length) { const r = dlg.res; dlg = null; $('dialog').classList.add('hidden'); setMood('me', 'neutral'); setMood('bit', 'neutral'); r(); } else showLine();
}
function updateDialog(dt) {
  if (!dlg) return;
  if (!dlg.done) {
    dlg.pos += dt * 62; const n = Math.floor(dlg.pos);
    if (n > dlg.tick) { dlg.tick = n; if (n % 3 === 0 && dlg.cur.w === 'bit') A.sfx.type(); }
    $('dtext').textContent = dlg.cur.t.slice(0, n); if (n >= dlg.cur.t.length) dlg.done = true;
  }
  pctx.clearRect(0, 0, 112, 112);
  if (dlg.cur.w === 'bit') TK.drawBit(pctx, 56, 56, S.t, dlg.cur.m, 1.3);
  else TK.drawCharacter(pctx, 56, 186, S.look, { t: S.t, scale: 1.05, mood: dlg.cur.m === 'think' ? 'neutral' : dlg.cur.m });
}

/* ---------- כרטיס, באנר, הידעת, HUD ---------- */
function showCard(c) {
  return new Promise((res) => {
    $('cIcon').textContent = c.icon; $('cardBadge').textContent = c.badge || 'מושג חדש נלמד!'; $('cTitle').textContent = c.title; $('cText').textContent = c.text; $('cLab').textContent = c.lab;
    $('card').classList.remove('hidden'); A.sfx.collect();
    $('cardOk').onclick = () => { $('card').classList.add('hidden'); A.sfx.click(); res(); };
  });
}
function showBanner(z) { const b = $('banner'); $('bnKick').textContent = 'אזור ' + z.i + ' מתוך ' + (ZONES.length - 1); $('bnTitle').textContent = z.name; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); A.sfx.whoosh(); }
function buildHot() {
  hot.forEach((h) => { if (h.sprite) scene.remove(h.sprite); }); hot.length = 0;
  const F = TK.CONTENT.facts;
  ZONES.slice(1).forEach((z) => {
    const f = F[z.id]; if (!f) return;
    const spots = z.ang != null ? [[46, z.ang + 16], [19, z.ang - 18]] : [[15, 45], [15, -45]];
    f.forEach((o, k) => { const a = spots[k][1] * Math.PI / 180, r = spots[k][0], x = r * Math.sin(a), zz = z.ang != null ? -r * Math.cos(a) : r * Math.cos(a); hot.push({ x, z: zz, t: o.t, found: false, sprite: world.makeFactSprite(x, zz) }); });
  });
}
function showFact(h) {
  h.found = true; foundCount++; A.sfx.collect(); world.burst(new THREE.Vector3(h.x, 2.6, h.z), '#ffc933', 30, 6, 1.2); world.setFactDone(h.sprite);
  $('factText').textContent = h.t; $('fact').classList.remove('hidden'); clearTimeout(showFact.h); showFact.h = setTimeout(() => $('fact').classList.add('hidden'), 8000);
  $('fact').onclick = () => $('fact').classList.add('hidden'); updateHud();
}
function buildHud() {
  const p = $('pips'); p.innerHTML = '';
  for (let i = 1; i < ZONES.length; i++) {
    const d = el('div', 'pip', ICONS[i]); d.id = 'pip' + i; d.title = ZONES[i].name;
    d.onclick = () => { if (S.busy || dlg || S.scene !== 'world') return; A.init(); teleportTo(ZONES[i]); };
    p.appendChild(d);
  }
}
function teleportTo(z) {
  A.sfx.whoosh(); const e = z.entr.clone(); const p = z.id === 'core' ? new THREE.Vector3(0, 0, 18) : e.clone().multiplyScalar(0.7);
  world.burst(S.pos.clone().setY(1), '#22e5ff', 30, 5, 0.8); S.pos.copy(p); S.dwell = 0;
  const d = e.clone().sub(p); S.yaw = Math.atan2(d.x, d.z); S.camYaw = Math.atan2(-d.x, -d.z); world.burst(S.pos.clone().setY(1), '#22e5ff', 30, 5, 0.8);
}
function nearestZoneName() { const z = world.zoneNear(S.pos.x, S.pos.z, 26); return z ? z.name : 'כיכר נטופוליס'; }
function updateHud() {
  for (let i = 1; i < ZONES.length; i++) { const e = $('pip' + i); if (e) e.classList.toggle('done', !!world.solved[i]); }
  $('starsCount').innerHTML = '<span>⭐ ' + totalStars() + '</span><span class="fc">🔎 ' + foundCount + '/' + hot.length + '</span>';
  $('zoneName').textContent = nearestZoneName();
}
function toggleMute() { const m = !A.isMuted(); A.setMuted(m); $('btnMute').textContent = m ? '🔇' : '🔊'; }
$('btnMute').addEventListener('click', () => { A.init(); toggleMute(); });

/* ---------- וידאו אופציונלי ---------- */
function playVideo(src) {
  return new Promise((res) => {
    if (!src) return res();
    const v = document.createElement('video'); v.className = 'vid'; v.src = src; v.playsInline = true; v.style.display = 'none';
    const skip = el('button', 'btn vidskip', 'דלג ⏭'); skip.style.display = 'none'; let fin = false;
    const done = () => { if (fin) return; fin = true; clearTimeout(to); try { v.pause(); } catch (e) { } v.remove(); skip.remove(); res(); };
    const to = setTimeout(done, 2500); v.addEventListener('error', done); v.addEventListener('ended', done); skip.addEventListener('click', done);
    v.addEventListener('canplay', () => { clearTimeout(to); v.style.display = 'block'; skip.style.display = 'block'; v.play().catch(done); }, { once: true });
    $('ui').appendChild(v); $('ui').appendChild(skip);
  });
}

/* =====================================================================
   קלט: מקלדת, גרירה לסיבוב מצלמה, זום, ג'ויסטיק
   ===================================================================== */
window.addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'INPUT') return;
  A.init(); keys[e.code] = true;
  if ((e.code === 'Space' || e.code === 'Enter') && dlg) { e.preventDefault(); dlgAdvance(); }
  if (e.code === 'KeyM') toggleMute();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
const ptrs = new Map();
let pinch = 0;
cv3.addEventListener('pointerdown', (e) => {
  A.init(); if (dlg) { dlgAdvance(); return; } if (S.cine) { S.cine.t = S.cine.dur; return; }
  try { cv3.setPointerCapture(e.pointerId); } catch (er) { }
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
});
cv3.addEventListener('pointermove', (e) => {
  const p = ptrs.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); S.camDist = clamp(S.camDist * (pinch / Math.max(20, d)), 3, 16); pinch = d; return; }
  S.camYaw -= dx * 0.006; S.camPitch = clamp(S.camPitch + dy * 0.005, 0.04, 1.35);
});
const endP = (e) => { ptrs.delete(e.pointerId); };
cv3.addEventListener('pointerup', endP); cv3.addEventListener('pointercancel', endP);
cv3.addEventListener('wheel', (e) => { e.preventDefault(); S.camDist = clamp(S.camDist * (1 + Math.sign(e.deltaY) * 0.08), 3, 16); }, { passive: false });
cv3.addEventListener('contextmenu', (e) => e.preventDefault());
// ג'ויסטיק
const stickEl = $('stick'), knob = $('stickKnob'); let stickId = null, stickC = null;
if (coarse) stickEl.classList.remove('hidden');
stickEl.addEventListener('pointerdown', (e) => { A.init(); stickId = e.pointerId; stickEl.setPointerCapture(e.pointerId); const r = stickEl.getBoundingClientRect(); stickC = { x: r.left + r.width / 2, y: r.top + r.height / 2, R: r.width / 2 }; moveStick(e); });
stickEl.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
const endStick = (e) => { if (e.pointerId === stickId) { stickId = null; S.stick.x = S.stick.y = 0; knob.style.transform = 'translate(-50%,-50%)'; } };
stickEl.addEventListener('pointerup', endStick); stickEl.addEventListener('pointercancel', endStick);
function moveStick(e) { let dx = e.clientX - stickC.x, dy = e.clientY - stickC.y; const d = Math.hypot(dx, dy), m = stickC.R * 0.8; if (d > m) { dx *= m / d; dy *= m / d; } S.stick.x = dx / m; S.stick.y = dy / m; knob.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))'; }

/* =====================================================================
   יוצר הדמות
   ===================================================================== */
function buildCreator() {
  const p = $('cpanel'); p.innerHTML = ''; p.appendChild(el('h3', '', 'צור/י את הדמות שלך'));
  const r1 = el('div', 'crow'); r1.appendChild(el('div', 'clabel', 'מי נכנס/ת לעולם?')); const g = el('div', 'chips');
  [['m', '🧑 בן'], ['f', '👧 בת']].forEach((o) => { const c = el('div', 'chip', o[1]); c.dataset.g = o[0]; c.onclick = () => { if (S.look.gender !== o[0]) { const d = TK.defaultLook(o[0]); S.look.gender = o[0]; S.look.hairStyle = d.hairStyle; S.look.hair = d.hair; } pulse(); A.sfx.click(); renderDyn(); }; g.appendChild(c); });
  r1.appendChild(g); p.appendChild(r1);
  const r2 = el('div', 'crow'); r2.appendChild(el('div', 'clabel', 'שם או כינוי (לא שם מלא)'));
  const inp = el('input'); inp.id = 'nameIn'; inp.maxLength = 12; inp.placeholder = 'למשל: נועם'; inp.value = S.name; inp.autocomplete = 'off';
  inp.addEventListener('input', () => { S.name = inp.value.trim(); }); inp.addEventListener('keydown', (e) => e.stopPropagation()); r2.appendChild(inp); p.appendChild(r2);
  p.appendChild(el('div', '', '')).id = 'cdyn';
  const f = el('div', 'cfoot');
  const rnd = el('button', 'btn', '🎲 אקראי'); rnd.onclick = () => { S.look = TK.randomLook(S.look.gender); pulse(); A.sfx.pop(); renderDyn(); };
  const go = el('button', 'btn primary', 'צא לדרך ←'); go.onclick = startAdventure; f.appendChild(rnd); f.appendChild(go); p.appendChild(f);
  renderDyn();
}
function pulse() { S.pulse = 1; rebuildAvatar(); world.shockwave(new THREE.Vector3(0, 0, 42), '#22e5ff'); world.burst(new THREE.Vector3(0, 1.4, 42), '#22e5ff', 20, 4, 0.8); }
function renderDyn() {
  const d = $('cdyn'); d.innerHTML = '';
  document.querySelectorAll('#cpanel .chip[data-g]').forEach((c) => c.classList.toggle('on', c.dataset.g === S.look.gender));
  const swRow = (label, cols, key) => { const r = el('div', 'crow'); r.appendChild(el('div', 'clabel', label)); const w = el('div', 'chips'); cols.forEach((c, i) => { const s = el('div', 'sw' + (S.look[key] === i ? ' on' : '')); s.style.background = c; s.onclick = () => { S.look[key] = i; pulse(); A.sfx.click(); renderDyn(); }; w.appendChild(s); }); r.appendChild(w); d.appendChild(r); };
  swRow('צבע עור', TK.PAL.SKINS, 'skin');
  const hr = el('div', 'crow'); hr.appendChild(el('div', 'clabel', 'תסרוקת')); const hw = el('div', 'chips');
  TK.HAIR_STYLES.forEach((h, i) => { const c = el('div', 'chip' + (S.look.hairStyle === i ? ' on' : ''), h[1]); c.onclick = () => { S.look.hairStyle = i; pulse(); A.sfx.click(); renderDyn(); }; hw.appendChild(c); }); hr.appendChild(hw); d.appendChild(hr);
  swRow('צבע שיער', TK.PAL.HAIRS, 'hair'); swRow('צבע קפוצ\'ון', TK.PAL.TOPS, 'top'); swRow('צבע מכנסיים', TK.PAL.BOTTOMS, 'bottom');
  const ar = el('div', 'crow'); ar.appendChild(el('div', 'clabel', 'אביזרים')); const aw = el('div', 'chips');
  TK.ACCS.forEach((a) => { const c = el('div', 'chip' + (S.look.acc[a[0]] ? ' on' : ''), a[2] + ' ' + a[1]); c.onclick = () => { S.look.acc[a[0]] = !S.look.acc[a[0]]; pulse(); A.sfx.pop(); renderDyn(); }; aw.appendChild(c); }); ar.appendChild(aw); d.appendChild(ar);
}
function startCreator() {
  S.scene = 'creator'; world.preview = true; $('title').classList.add('hidden'); $('creator').classList.remove('hidden');
  S.pos.set(0, 0, 42); S.yaw = Math.PI; S.camYaw = Math.PI; S.camPitch = 0.12; S.camDist = 4.6; S.mood = 'happy'; S.wave = true;
  rebuildAvatar(); applyViewOffset(); buildCreator();
}

/* =====================================================================
   כניסה לעולם
   ===================================================================== */
async function startAdventure() {
  const inp = $('nameIn'); S.name = (inp.value || '').trim(); if (!S.name) S.name = S.look.gender === 'f' ? 'מתקשבת' : 'מתקשב';
  A.init(); A.sfx.win(); $('creator').classList.add('hidden'); camera.clearViewOffset();
  S.stars = ZONES.map(() => 0); S.arrived = ZONES.map(() => false); S.finished = false; S.free = false; TK.profile = null; S.dwell = 0;
  world.lit.forEach((v, i) => { world.lit[i] = i === 0 ? 1 : 0; world.target[i] = i === 0 ? 1 : 0; world.solved[i] = false; }); world.doorOpen = 0; world.coreOpen = false;
  buildHot(); foundCount = 0; save();
  await playVideo(CFG.INTRO_VIDEO);
  await intro();
}
async function intro() {
  S.scene = 'intro'; world.preview = false; S.pos.set(0, 0, 46); S.yaw = Math.PI; S.camYaw = Math.PI; S.camPitch = 0.12; S.camDist = 5.2; S.mood = 'surprised'; S.wave = false;
  rebuildAvatar(); S.avatar.visible = false; S.bit.on = false; bitSprite.visible = false; buildHud(); $('hud').classList.add('hidden');
  const f = $('fade'); f.classList.add('on'); await wait(300); f.classList.remove('on'); A.sfx.whoosh();
  S.avatar.visible = true;
  await tween(2400, (u) => { S.avatar.scale.set(0.92, 0.92 * Math.max(0.02, u), 0.92); if (Math.random() < 0.5) world.rise(S.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.4, u * 1.7, (Math.random() - 0.5) * 1.4)), '#22e5ff'); });
  S.avatar.scale.setScalar(0.92); A.sfx.collect(); world.shockwave(S.pos.clone(), '#22e5ff'); world.burst(S.pos.clone().setY(1), '#22e5ff', 60, 6, 1.2);
  S.mood = 'happy'; S.avatar.userData.setMood('happy'); S.wave = true; await wait(700);
  S.bit.on = true; bitSprite.visible = true; S.bit.pos.set(10, 9, 36); A.sfx.whoosh();
  const y0 = S.camYaw; tween(2600, (u) => { const k = TK.easeInOut(u); S.camYaw = y0 * (1 - k); S.camDist = 5.2 + 2.3 * k; S.camPitch = 0.12 + 0.2 * k; });
  await wait(1500); await say(TK.CONTENT.intro); S.wave = false; setMood('me', 'neutral');
  S.scene = 'world'; $('hud').classList.remove('hidden'); updateHud();
  toast(coarse ? 'הליכה: ג\'ויסטיק · הסתכלות: גרירה על המסך · זום: צביטה' : 'הליכה: W A S D או חצים · הסתכלות: גרירת העכבר · זום: גלגלת', 7000);
}

/* =====================================================================
   העולם: תנועה, כניסה למבנים, תיקון
   ===================================================================== */
function updateMovement(dt) {
  let ix = 0, iy = 0;
  if (keys.ArrowRight || keys.KeyD) ix += 1; if (keys.ArrowLeft || keys.KeyA) ix -= 1; if (keys.ArrowUp || keys.KeyW) iy += 1; if (keys.ArrowDown || keys.KeyS) iy -= 1;
  ix += S.stick.x; iy -= S.stick.y;
  if (keys.KeyQ) S.camYaw += dt * 1.6; if (keys.KeyE) S.camYaw -= dt * 1.6;
  if (S.busy || dlg || S.scene !== 'world') { ix = iy = 0; }
  const len = Math.hypot(ix, iy); if (len > 1) { ix /= len; iy /= len; }
  const fx = -Math.sin(S.camYaw), fz = -Math.cos(S.camYaw), rx = Math.cos(S.camYaw), rz = -Math.sin(S.camYaw);
  const mx = fx * iy + rx * ix, mz = fz * iy + rz * ix, mag = Math.hypot(mx, mz);
  const target = Math.min(1, mag) * 7.2; S.speed += (target - S.speed) * Math.min(1, dt * 9);
  if (mag > 0.05) { const ty = Math.atan2(mx, mz); let d = ty - S.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); S.yaw += d * Math.min(1, dt * 12); S.pos.x += mx / mag * S.speed * dt; S.pos.z += mz / mag * S.speed * dt; S.hintT = 0; }
  else if (!S.busy && !dlg && S.scene === 'world') S.hintT += dt;
  // התנגשויות
  for (const c of world.colliders) { const dx = S.pos.x - c.x, dz = S.pos.z - c.z, d = Math.hypot(dx, dz), m = c.r + 0.5; if (d < m && d > 0.001) { S.pos.x = c.x + dx / d * m; S.pos.z = c.z + dz / d * m; } }
  const rr = Math.hypot(S.pos.x, S.pos.z); if (rr > 58) { S.pos.x *= 58 / rr; S.pos.z *= 58 / rr; }
  S.walk += (clamp(S.speed / 7.2, 0, 1) - S.walk) * Math.min(1, dt * 10);
  if (S.walk > 0.4) { S.stepT = (S.stepT || 0) - dt; if (S.stepT <= 0) { S.stepT = 0.3; A.sfx.step(); } }
}
function checkTriggers(dt) {
  if (S.scene !== 'world' || S.busy || dlg) return;
  for (const h of hot) if (!h.found && Math.hypot(S.pos.x - h.x, S.pos.z - h.z) < 2.4) { showFact(h); break; }
  let on = false;
  for (let i = 1; i < ZONES.length; i++) {
    const z = ZONES[i];
    if (!S.arrived[i] && Math.hypot(S.pos.x - z.pos.x, S.pos.z - z.pos.z) < (z.id === 'core' ? 14 : 24)) { S.arrived[i] = true; arrive(z); return; }
    if (!world.solved[i] && Math.hypot(S.pos.x - z.entr.x, S.pos.z - z.entr.z) < 2.3) { on = true; S.dwell += S.speed > 3 ? dt * 0.6 : dt; if (S.dwell > 0.6) { S.dwell = 0; stationTry(z); return; } }
  }
  if (!on) S.dwell = 0;
}
async function arrive(z) {
  S.busy = true; showBanner(z); await wait(1900); await say(TK.CONTENT.zones[z.id].arrive); S.busy = false;
  toast('כדי להתחיל את המשימה: עמדו על העיגול הזוהר בכניסה', 4800);
}
function stationTry(z) {
  if (z.id === 'core' && solvedCount() < 3) { S.busy = true; say(TK.CONTENT.coreLocked).then(() => { S.pos.set(0, 0, 17); S.camYaw = 0; S.busy = false; }); return; }
  runStation(z);
}
let attempt = null;
function doAttempt(cfg) { return new Promise((res) => { attempt = { t: 0, cfg, failed: false, res }; $('attempt').classList.remove('hidden', 'fail'); $('atLabel').textContent = cfg.label; $('atBar').style.width = '0%'; $('atPct').textContent = '0%'; }); }
function updateAttempt(dt) {
  if (!attempt) return; const a = attempt; a.t += dt;
  const prog = a.failed ? 0.63 : clamp(0.63 * TK.easeOut(a.t / 1.9), 0, 0.63);
  $('atBar').style.width = Math.round(prog * 100) + '%'; $('atPct').textContent = Math.round(prog * 100) + '%';
  if (!a.failed && a.t > 2.1) { a.failed = true; S.shake = 1; setMood('me', 'worried'); A.sfx.glitch(); $('attempt').classList.add('fail'); $('atLabel').textContent = a.cfg.err; world.burst(S.pos.clone().setY(1.6), '#ff4d6d', 40, 5, 0.8); }
  if (a.t > 3.7) { attempt = null; $('attempt').classList.add('hidden'); a.res(); }
}
async function runStation(z) {
  if (S.busy) return; S.busy = true; $('fact').classList.add('hidden');
  const C = TK.CONTENT.zones[z.id]; S.arrived[z.i] = true;
  await say(C.pre); await doAttempt(C.attempt); await say(C.post);
  const st = await playMinigame(z); S.stars[z.i] = Math.max(S.stars[z.i], st);
  await repair(z);
  if (C.win && C.win.length) await say(C.win);
  if (C.card) await showCard(C.card);
  save(); updateHud();
  if (z.id === 'core') { await finale(); return; }
  S.busy = false;
  toast(solvedCount() >= 5 ? 'כל האזורים תוקנו! ליבת העיר מחכה במרכז' : (solvedCount() >= 3 ? 'הליבה במרכז העיר כבר פתוחה, ואפשר להמשיך גם לאזורים האחרים' : 'האזור תוקן! בחרו לאן להמשיך: אפשר גם ללחוץ על האייקונים למעלה'), 4600);
}
async function repair(z) {
  A.sfx.power(); world.target[z.i] = 1; world.solved[z.i] = true; if (solvedCount() >= 3) world.coreOpen = true;
  S.wave = true; setMood('me', 'happy'); S.shake = 0.6; updateHud();
  for (let i = 0; i < 3; i++) setTimeout(() => world.shockwave(z.entr.clone(), i % 2 ? '#ffffff' : z.acc), i * 260);
  world.burst(z.pos.clone().setY(9), '#ffffff', 90, 12, 1.6); world.burst(z.pos.clone().setY(9), z.acc, 90, 9, 1.6);
  await wait(1900); S.wave = false; setMood('me', 'neutral'); A.sfx.collect();
}

/* ---------- מיני-משחקים (שכבת 2D מעל ה-3D) ---------- */
function playMinigame(z) {
  return new Promise((res) => {
    $('fact').classList.add('hidden'); let ended = false;
    const api = {
      bit: (text, ms) => { S.bubble = { t: text, ms: ms || 4000, age: 0 }; }, fx: mgFx,
      finish: (stars) => { if (ended) return; ended = true; try { S.mg.destroy(); } catch (e) { } S.mg = null; S.scene = 'world'; S.bubble = null; mgFx.list.length = 0; $('hud').style.opacity = ''; ov.classList.remove('on'); octx.clearRect(0, 0, ov.width, ov.height); res(stars || 1); }
    };
    S.mgApi = api; S.mg = TK.MG.create(MG_IDS[z.id], api); S.mgPhase = 'intro'; S.mgT = 0; S.mgIdle = 0; S.scene = 'mg'; S.bubble = null; $('hud').style.opacity = '0'; ov.classList.add('on'); $('attempt').classList.add('hidden');
  });
}
const toLogical = (e) => { const r = ov.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
ov.addEventListener('pointerdown', (e) => { A.init(); try { ov.setPointerCapture(e.pointerId); } catch (er) { } if (S.mg) mgPointer('down', toLogical(e)); });
ov.addEventListener('pointermove', (e) => { if (S.mg) mgPointer('move', toLogical(e)); });
const mgUp = (e) => { if (S.mg) mgPointer('up', toLogical(e)); };
ov.addEventListener('pointerup', mgUp); ov.addEventListener('pointercancel', mgUp);
function mgPointer(type, p) {
  const UI = TK.MG_UI; S.mgIdle = 0;
  if (type === 'move') { UI.hover = UI.hit(p.x, p.y); if (S.mgPhase === 'play') S.mg.move(p.x, p.y); return; }
  if (type === 'down') {
    const id = UI.hit(p.x, p.y);
    if (id) {
      A.sfx.click();
      if (id === '_start') S.mgPhase = 'play'; else if (id === '_hint') S.bubble = { t: S.mg.hint(), ms: 6500, age: 0 };
      else if (id === '_skip') { S.mgApi.finish(1); return; } else if (S.mgPhase === 'play') S.mg.onBtn(id);
      return;
    }
    if (S.mgPhase === 'play') S.mg.down(p.x, p.y);
  } else if (type === 'up') { if (S.mgPhase === 'play') S.mg.up(p.x, p.y); }
}
function drawMg() {
  const UI = TK.MG_UI, P = TK.MG_PANEL, ctx = octx;
  ctx.setTransform(S.k, 0, 0, S.k, 0, 0); ctx.clearRect(0, 0, W, H); ctx.fillStyle = 'rgba(3,5,16,.6)'; ctx.fillRect(0, 0, W, H); UI.reset();
  if (S.mgPhase === 'intro') {
    TK.MG.frame(ctx, S.mg.title, S.mg.acc);
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.06)'; TK.rr(ctx, 210, 150, 860, 330, 22); ctx.fill(); ctx.restore();
    TK.txt(ctx, 'המשימה', W / 2, 190, { size: 22, weight: 800, color: S.mg.acc });
    S.mg.how.forEach((l, i) => TK.para(ctx, l, W / 2, 245 + i * 72, 780, { size: 24, weight: 500, color: '#eaf0ff', lh: 32 }));
    UI.button(ctx, '_start', W / 2 - 140, 530, 280, 76, 'בואו נתחיל!', { color: '#39ff88', size: 28 });
  } else {
    S.mg.draw(ctx); mgFx.draw(ctx);
    UI.button(ctx, '_hint', P.x + P.w - 130, P.y + 14, 112, 38, '💡 רמז', { color: '#ffc933', size: 17 });
    if (S.mgT > 120) UI.button(ctx, '_skip', P.x + 18, P.y + 14, 112, 38, 'דלג ⏭', { color: '#9fb0d8', size: 16 });
  }
  if (S.bubble) {
    const b = S.bubble, a = Math.min(1, b.age * 4, (b.ms / 1000 - b.age) * 3);
    if (a > 0) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(10,18,48,.96)'; TK.rr(ctx, P.x, 690, P.w, 26, 13); ctx.fill(); ctx.strokeStyle = '#22e5ff'; ctx.lineWidth = 2; ctx.stroke(); TK.txt(ctx, b.t, P.x + P.w - 16, 704, { size: 15, weight: 600, color: '#dff6ff', align: 'right' }); TK.drawBit(ctx, P.x + 22, 703, S.t, 'neutral', 0.28); ctx.restore(); }
  }
}

/* =====================================================================
   סיום: זיקוקים, סיור בעיר, תעודה
   ===================================================================== */
async function finale() {
  S.busy = true; S.finished = true; rebuildAvatar(); save(); A.sfx.boom();
  tween(2400, (u) => { world.doorOpen = u; });
  const cols = ['#22e5ff', '#ff3df2', '#39ff88', '#ffc933', '#ffffff'];
  for (let i = 0; i < 22; i++) setTimeout(() => { const a = Math.random() * 6.283, r = 16 + Math.random() * 26; const p = new THREE.Vector3(Math.sin(a) * r, 22 + Math.random() * 20, Math.cos(a) * r); const c = TK.pick(cols); world.burst(p, c, 90, 14, 1.8, 6); A.sfx.pop(); }, i * 230);
  S.wave = true; setMood('me', 'happy'); await wait(2600); await say(TK.CONTENT.finale); S.wave = false;
  await playVideo(CFG.FINALE_VIDEO);
  setMood('me', 'neutral'); await showCard(TK.CONTENT.summary);
  toast('העיר שהצלת ✨', 4000);
  await new Promise((res) => { S.cine = { t: 0, dur: 14000, res }; });
  await showCertificate();
}
const rankText = () => TK.fmt(totalStars() >= 16 ? 'מתקשב[[|ת]] מצטיי[[ן|נת]]' : 'מתקשב[[|ת]] מוסמ[[ך|כת]]', S);
function showCertificate() {
  return new Promise((res) => {
    A.sfx.win(); drawCert(); $('toast').classList.remove('on'); $('hud').style.opacity = '0'; $('cert').classList.remove('hidden');
    const cta = $('btnCta'); cta.textContent = CFG.CTA_BUTTON || 'אני רוצה להירשם!'; cta.classList.remove('hidden');
    if (CFG.CTA_URL) cta.href = CFG.CTA_URL; else cta.onclick = (e) => { e.preventDefault(); toast(CFG.CTA_NOTE || 'פנו למורה או ליועצת לפרטים על ההרשמה', 6000); $('toast').style.zIndex = 60; };
    $('btnDownload').onclick = () => { const a = document.createElement('a'); a.download = 'netopolis-certificate.png'; a.href = $('certCanvas').toDataURL('image/png'); a.click(); };
    $('btnExplore').onclick = () => { $('cert').classList.add('hidden'); $('hud').style.opacity = ''; S.free = true; S.busy = false; S.scene = 'world'; S.pos.set(0, 0, 18); S.camYaw = 0; res(); };
    $('btnAgain').onclick = () => { clearSave(); location.reload(); };
  });
}
let logoImg = null;
function drawCert() {
  const c = $('certCanvas'), g = c.getContext('2d'), CW = 1200, CH = 800;
  const gr = g.createLinearGradient(0, 0, CW, CH); gr.addColorStop(0, '#070d2a'); gr.addColorStop(0.5, '#150f42'); gr.addColorStop(1, '#06142a'); g.fillStyle = gr; g.fillRect(0, 0, CW, CH);
  g.strokeStyle = 'rgba(34,229,255,.08)'; g.lineWidth = 1; for (let x = 0; x < CW; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, CH); g.stroke(); } for (let y = 0; y < CH; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(CW, y); g.stroke(); }
  g.shadowColor = '#22e5ff'; g.shadowBlur = 24; g.strokeStyle = '#22e5ff'; g.lineWidth = 5; TK.rr(g, 28, 28, CW - 56, CH - 56, 30); g.stroke();
  g.shadowColor = '#ff3df2'; g.strokeStyle = 'rgba(255,61,242,.7)'; g.lineWidth = 2; TK.rr(g, 44, 44, CW - 88, CH - 88, 24); g.stroke(); g.shadowBlur = 0;
  const T = (s, x, y, o) => TK.txt(g, s, x, y, o);
  T(CFG.SCHOOL || 'מגמת תקשוב', CW / 2, 100, { size: 32, weight: 800, color: '#22e5ff', glow: '#22e5ff' }); if (CFG.SCHOOL_SUB) T(CFG.SCHOOL_SUB, CW / 2, 138, { size: 20, weight: 500, color: '#9fb0d8' });
  T('תעודת הוקרה', CW / 2, 220, { size: 84, weight: 900, color: '#fff', glow: '#7c4dff', glowSize: 30 });
  T(TK.fmt('מוענקת בזאת ל[[תלמיד|תלמידה]]', S), CW / 2, 300, { size: 28, weight: 500, color: '#cfe0ff' });
  T(S.name, CW / 2 + 130, 380, { size: 88, weight: 900, color: '#ffe07a', glow: '#ffc933', glowSize: 24 });
  T('בדרגת: ' + rankText(), CW / 2 + 110, 442, { size: 38, weight: 800, color: '#7cf5c8', glow: '#39ff88', glowSize: 14 });
  { const pr = TK.profile && TK.CONTENT.profiles[TK.profile]; if (pr) T('הפרופיל שלי: ' + pr.icon + ' ' + pr.title, CW / 2 + 110, 490, { size: 30, weight: 800, color: '#ffe07a' }); }
  TK.para(g, TK.fmt('על שה[[חזיר|חזירה]] את נטופוליס לחיים: [[חיבר|חיברה]] רשתות, [[הגן|הגנה]] מפני הונאות ותקיפות, ו[[אימן|אימנה]] בינה מלאכותית.', S), CW / 2 + 110, 545, 640, { size: 24, weight: 500, color: '#e6ecff', lh: 38 });
  const nm = ['רשתות', 'בניית רשת', 'אבטחה', 'חומת אש', 'AI', 'ליבה'];
  for (let i = 0; i < 6; i++) { const x = 450 + (5 - i) * 116, y = 665; g.fillStyle = 'rgba(57,255,136,.14)'; g.strokeStyle = '#39ff88'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 34, 0, 6.283); g.fill(); g.stroke(); T(ICONS[i + 1], x, y + 2, { size: 30 }); T(nm[i], x, y + 52, { size: 15, weight: 600, color: '#bfffd8' }); }
  if (CFG.CTA_TEXT) T(CFG.CTA_TEXT, CW / 2, 752, { size: 22, weight: 800, color: '#22e5ff', glow: '#22e5ff' });
  T('⭐ ' + totalStars() + ' / ' + ((ZONES.length - 1) * 3), 1040, 130, { size: 30, weight: 800, color: '#ffc933', glow: '#ffc933', dir: 'ltr' });
  T('🔎 ' + foundCount + ' / ' + hot.length, 1040, 168, { size: 20, weight: 700, color: '#ffe07a', dir: 'ltr' });
  T(new Date().toLocaleDateString('he-IL'), 1040, 205, { size: 20, color: '#8fa0d0', dir: 'ltr' });
  TK.drawCharacter(g, 190, 700, S.look, { t: 1.2, scale: 2.1, mood: 'happy', wave: true, dir: 1, hero: true }); TK.drawBit(g, 1100, 330, 2, 'happy', 1.25); T('ביט, עוזר ה-AI', 1100, 410, { size: 17, color: '#9fb0d8' });
  const lg = CFG.LOGO && (logoImg || (logoImg = (() => { const i = new Image(); i.onload = drawCert; i.onerror = () => { }; i.src = CFG.LOGO; return i; })()));
  if (lg && lg.complete && lg.naturalWidth) { const h = 70, w = lg.naturalWidth / lg.naturalHeight * h; g.drawImage(lg, 90, 70, w, h); }
}

/* =====================================================================
   מצלמה ולולאה
   ===================================================================== */
const tmpV = new THREE.Vector3();
function updateCamera(dt) {
  if (S.dbgCam) { camera.position.copy(S.dbgCam.p); camera.lookAt(S.dbgCam.t); return; }
  if (S.scene === 'title') {
    const a = S.t * 0.09; camera.position.set(Math.sin(a) * 78, 26 + Math.sin(S.t * 0.2) * 5, Math.cos(a) * 78); camera.lookAt(0, 9, 0); return;
  }
  if (S.cine) {
    S.cine.t += dt * 1000; const u = clamp(S.cine.t / S.cine.dur, 0, 1), a = 0.3 + u * 6.283 * 0.85, r = 62 - 12 * Math.sin(u * 3.14), y = 22 + 14 * Math.sin(u * 3.14);
    camera.position.set(Math.sin(a) * r, y, Math.cos(a) * r); camera.lookAt(0, 9, 0);
    if (u >= 1) { const rs = S.cine.res; S.cine = null; rs(); } return;
  }
  const tgt = S.camTarget; tgt.set(S.pos.x, S.pos.y + 1.55, S.pos.z);
  const cp = Math.cos(S.camPitch), d = S.camDist;
  const want = tmpV.set(tgt.x + Math.sin(S.camYaw) * cp * d, tgt.y + Math.sin(S.camPitch) * d, tgt.z + Math.cos(S.camYaw) * cp * d);
  camera.position.lerp(want, S.scene === 'world' ? Math.min(1, dt * 12) : 1); if (camera.position.y < 0.5) camera.position.y = 0.5;
  camera.lookAt(tgt);
}
let last = performance.now();
function frame(now) {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; S.t += dt;
  try { update(dt); render(); } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}
function update(dt) {
  if (S.scene === 'world' || S.scene === 'mg' || S.scene === 'intro') { updateMovement(dt); checkTriggers(dt); }
  updateAttempt(dt); updateDialog(dt); if (S.bubble) S.bubble.age += dt;
  if (S.avatar) {
    S.avatar.position.copy(S.pos); S.avatar.rotation.y = S.yaw;
    S.avatar.userData.update(S.t, S.walk, S.wave, dt);
  }
  world.playerPos.copy(S.pos);
  // Bit
  if (S.bit.on) {
    const right = tmpV.set(Math.cos(S.camYaw), 0, -Math.sin(S.camYaw)).multiplyScalar(1.6);
    const tx = S.pos.x + right.x, tz = S.pos.z + right.z, ty = 2.6 + Math.sin(S.t * 1.8) * 0.2;
    S.bit.pos.x += (tx - S.bit.pos.x) * Math.min(1, dt * 3); S.bit.pos.y += (ty - S.bit.pos.y) * Math.min(1, dt * 3); S.bit.pos.z += (tz - S.bit.pos.z) * Math.min(1, dt * 3);
    bitSprite.position.copy(S.bit.pos); bitLight.position.copy(S.bit.pos); bitCtx.clearRect(0, 0, 160, 160); TK.drawBit(bitCtx, 80, 78, S.t, S.bit.mood, 1.55); bitTex.needsUpdate = true;
  }
  if (S.scene === 'title') { /* מצלמה בלבד */ }
  updateCamera(dt);
  world.update(S.t, dt, camera.position, S.pos);
  if (S.scene === 'world' || S.scene === 'mg') { S.hudT = (S.hudT || 0) + dt; if (S.hudT > 0.3) { S.hudT = 0; updateHud(); } }
  if (S.scene === 'mg') { S.mgT += dt; S.mgIdle += dt; mgFx.update(dt); if (S.mgPhase === 'play') S.mg.update(dt); if (S.mgPhase === 'play' && S.mgIdle > 35 && !S.bubble) { S.bubble = { t: S.mg.hint(), ms: 6500, age: 0 }; S.mgIdle = 0; } }
  S.shake = Math.max(0, (S.shake || 0) - dt * 2);
  if (S.shake > 0) { camera.position.x += (Math.random() - 0.5) * S.shake * 0.3; camera.position.y += (Math.random() - 0.5) * S.shake * 0.2; }
  if (S.scene !== 'mg') { const hint = $('walkHint'); const show = S.scene === 'world' && !S.busy && !dlg && S.hintT > 6; hint.classList.toggle('hidden', !show); }
  S.pulse = Math.max(0, S.pulse - dt);
}
function render() {
  if (composer) composer.render(); else renderer.render(scene, camera);
  if (S.scene === 'mg' && S.mg) drawMg();
}

/* =====================================================================
   אתחול והמשך משחק
   ===================================================================== */
function continueGame(sv) {
  S.name = sv.name; S.look = sv.look; S.stars = sv.stars || ZONES.map(() => 0); S.finished = !!sv.finished; TK.profile = sv.profile || null;
  buildHud(); buildHot(); if (sv.facts) sv.facts.forEach((f, i) => { if (hot[i] && f) { hot[i].found = true; world.setFactDone(hot[i].sprite); } }); foundCount = hot.filter((h) => h.found).length;
  for (let i = 1; i < ZONES.length; i++) { const d = !!(sv.solved && sv.solved[i]); world.solved[i] = d; world.lit[i] = world.target[i] = d ? 1 : 0; S.arrived[i] = d; }
  world.coreOpen = solvedCount() >= 3; S.free = S.finished; world.doorOpen = S.finished ? 1 : 0; world.preview = false;
  S.pos.set(0, 0, 44); S.yaw = Math.PI; S.camYaw = 0; S.camPitch = 0.32; S.camDist = 7.5; S.mood = 'neutral'; S.wave = false;
  rebuildAvatar(); S.bit.on = true; bitSprite.visible = true; S.bit.pos.set(2, 3, 42); S.scene = 'world'; S.busy = false;
  $('title').classList.add('hidden'); $('hud').classList.remove('hidden'); updateHud();
  toast('ברוכים השבים! בחרו לאן ללכת, או לחצו על האייקונים למעלה', 3800);
}
function init() {
  resize(); world.preview = true;
  $('tSchool').textContent = (CFG.SCHOOL || '') + (CFG.SCHOOL_SUB ? ' · ' + CFG.SCHOOL_SUB : '');
  if (CFG.LOGO) { const l = $('logo'); l.onload = () => l.classList.remove('hidden'); l.src = CFG.LOGO; }
  const sv = loadSave(); if (sv && sv.name) $('btnContinue').classList.remove('hidden');
  $('btnStart').onclick = () => { A.init(); A.sfx.click(); startCreator(); };
  $('btnContinue').onclick = () => { A.init(); A.sfx.click(); continueGame(sv); };
  requestAnimationFrame(frame);
  $('loading').classList.add('hidden');
}
TK.game3d = { S, world, scene, camera, renderer, runStation, say, finale, showCertificate, playMinigame, teleportTo, save };
init();
