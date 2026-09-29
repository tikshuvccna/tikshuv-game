/* הדמות התלת-ממדית: נבנית מצורות פשוטות לפי אותם פרמטרים של יוצר הדמות (בן/בת, שיער, צבעים, אביזרים) */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const TK = window.TK;
const std = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.65, metalness: 0.05 }, o || {}));
const glowMat = (color, i) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: i == null ? 1.6 : i });
const mesh = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); return m; };

/* ---- פנים: טקסטורה שמצוירת על חלק הכדור שפונה קדימה ---- */
const faceCache = {};
function faceTex(look, mood, blink) {
  const key = look.gender + mood + (blink ? 'b' : 'o');
  if (faceCache[key]) return faceCache[key];
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); g.lineCap = 'round';
  const f = look.gender === 'f', ink = '#1a1230';
  g.fillStyle = 'rgba(255,90,110,.32)'; g.beginPath(); g.ellipse(58, 168, 22, 13, 0, 0, 6.283); g.ellipse(198, 168, 22, 13, 0, 0, 6.283); g.fill();
  g.fillStyle = ink; g.strokeStyle = ink; g.lineWidth = 8;
  for (const s of [-1, 1]) {
    const x = 128 + s * 46, y = 128;
    if (mood === 'happy' || blink) { g.beginPath(); g.arc(x, y + (blink ? 0 : 6), 16, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    else {
      g.beginPath(); g.ellipse(x, y, 13, f ? 19 : 17, 0, 0, 6.283); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 5, y - 6, 5, 0, 6.283); g.fill(); g.fillStyle = ink;
      if (f) { g.lineWidth = 5; g.beginPath(); g.moveTo(x + s * 12, y - 12); g.lineTo(x + s * 24, y - 20); g.stroke(); g.lineWidth = 8; }
    }
    // גבות
    const wr = mood === 'worried' ? 10 : 0;
    g.lineWidth = 7; g.strokeStyle = 'rgba(40,25,20,.85)'; g.beginPath(); g.moveTo(x - s * 20, y - 34 - wr); g.lineTo(x + s * 20, y - 30 + wr * 0.3); g.stroke(); g.strokeStyle = ink; g.lineWidth = 8;
  }
  g.strokeStyle = '#7a2a3a'; g.fillStyle = '#7a2a3a'; g.lineWidth = 7;
  if (mood === 'happy') { g.beginPath(); g.moveTo(96, 188); g.quadraticCurveTo(128, 236, 160, 188); g.closePath(); g.fill(); g.fillStyle = '#ff7a8a'; g.beginPath(); g.ellipse(128, 210, 16, 9, 0, 0, 6.283); g.fill(); }
  else if (mood === 'worried') { g.beginPath(); g.moveTo(100, 208); g.quadraticCurveTo(114, 190, 128, 204); g.quadraticCurveTo(142, 218, 156, 200); g.stroke(); }
  else if (mood === 'surprised') { g.beginPath(); g.ellipse(128, 204, 14, 18, 0, 0, 6.283); g.fill(); }
  else { g.beginPath(); g.moveTo(102, 196); g.quadraticCurveTo(128, 218, 154, 196); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (faceCache[key] = t);
}
let wifiTexCache = null;
function wifiTex() {
  if (wifiTexCache) return wifiTexCache;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.strokeStyle = '#fff'; g.lineWidth = 9; g.lineCap = 'round'; g.shadowColor = '#22e5ff'; g.shadowBlur = 12;
  for (let i = 1; i <= 3; i++) { g.beginPath(); g.arc(64, 92, i * 22, -2.35, -0.8); g.stroke(); }
  g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 92, 8, 0, 6.283); g.fill();
  wifiTexCache = new THREE.CanvasTexture(c); wifiTexCache.colorSpace = THREE.SRGBColorSpace; return wifiTexCache;
}
let auraTex = null;
function aura() {
  if (auraTex) return auraTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,224,122,.7)'); gr.addColorStop(1, 'rgba(255,224,122,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); auraTex = new THREE.CanvasTexture(c); return auraTex;
}

export function buildAvatar(look) {
  const P = TK.PAL, f = look.gender === 'f', acc = look.acc || {};
  const skin = P.SKINS[look.skin], hairC = P.HAIRS[look.hair], top = P.TOPS[look.top], bot = P.BOTTOMS[look.bottom];
  const style = TK.HAIR_STYLES[look.hairStyle][0];
  const skinM = std(skin), hairM = std(hairC, { roughness: 0.5 }), topM = std(top), topD = std(new THREE.Color(top).multiplyScalar(0.55)), botM = std(bot);
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const parts = {};

  // רגליים
  parts.legs = [];
  for (const s of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(s * 0.14, 0.82, 0);
    pv.add(mesh(new RoundedBoxGeometry(0.2, 0.72, 0.22, 3, 0.05), botM, 0, -0.36, 0));
    pv.add(mesh(new RoundedBoxGeometry(0.22, 0.11, 0.34, 3, 0.04), std('#f2f5ff'), 0, -0.75, 0.05));
    pv.add(mesh(new THREE.BoxGeometry(0.225, 0.025, 0.345), glowMat('#22e5ff', 1.2), 0, -0.795, 0.05));
    body.add(pv); parts.legs.push(pv);
  }
  // גוף
  const torso = mesh(new RoundedBoxGeometry(f ? 0.52 : 0.58, 0.62, 0.32, 4, 0.09), topM, 0, 1.13, 0); body.add(torso);
  body.add(mesh(new RoundedBoxGeometry(f ? 0.6 : 0.6, 0.09, 0.36, 3, 0.04), topD, 0, 0.86, 0));
  const wifi = mesh(new THREE.PlaneGeometry(0.24, 0.24), new THREE.MeshBasicMaterial({ map: wifiTex(), transparent: true, depthWrite: false }), 0, 1.15, 0.163); body.add(wifi);
  const hood = mesh(new THREE.SphereGeometry(0.2, 16, 12), topD, 0, 1.4, -0.1); hood.scale.set(1.25, 0.8, 0.85); body.add(hood);
  // זרועות
  parts.arms = [];
  for (const s of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(s * 0.36, 1.36, 0);
    pv.add(mesh(new RoundedBoxGeometry(0.16, 0.56, 0.16, 3, 0.05), topM, 0, -0.27, 0));
    pv.add(mesh(new THREE.SphereGeometry(0.085, 12, 10), skinM, 0, -0.58, 0));
    if (acc.watch && s === -1) { pv.add(mesh(new THREE.BoxGeometry(0.175, 0.07, 0.175), std('#1a2038'), 0, -0.5, 0)); pv.add(mesh(new THREE.BoxGeometry(0.11, 0.02, 0.11), glowMat('#39ff88', 2), 0, -0.5, 0.0).translateY(0.036)); }
    body.add(pv); parts.arms.push(pv);
  }
  // תיק גב
  if (acc.backpack) {
    body.add(mesh(new RoundedBoxGeometry(0.46, 0.5, 0.2, 3, 0.05), std('#2b3556'), 0, 1.14, -0.26));
    body.add(mesh(new THREE.BoxGeometry(0.1, 0.05, 0.03), glowMat('#22e5ff', 1.6), f ? 0.12 : 0.14, 1.0, -0.365));
    for (const s of [-1, 1]) body.add(mesh(new THREE.BoxGeometry(0.06, 0.56, 0.03), std('#1a2038'), s * 0.14, 1.14, 0.17));
  }
  // ראש
  const head = new THREE.Group(); head.position.set(0, 1.62, 0); body.add(head); parts.head = head;
  head.add(mesh(new THREE.SphereGeometry(0.3, 32, 24), skinM));
  for (const s of [-1, 1]) head.add(mesh(new THREE.SphereGeometry(0.055, 10, 8), skinM, s * 0.295, -0.01, 0));
  head.add(mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 10), std(new THREE.Color(skin).multiplyScalar(0.85)), 0, -0.3, 0));
  const faceMat = new THREE.MeshBasicMaterial({ map: faceTex(look, 'neutral', false), transparent: true, depthWrite: false, polygonOffsetFactor: -2, polygonOffset: true });
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.3015, 32, 20, Math.PI / 2 - 0.95, 1.9, Math.PI * 0.26, Math.PI * 0.5), faceMat); head.add(face);
  parts.faceMat = faceMat;
  // שיער
  const cap = (r, th, rotX) => { const m = mesh(new THREE.SphereGeometry(r, 32, 20, 0, Math.PI * 2, 0, Math.PI * th), hairM); m.rotation.x = rotX == null ? -0.28 : rotX; head.add(m); return m; };
  if (style === 'short') { cap(0.325, 0.56); const fr = mesh(new THREE.BoxGeometry(0.5, 0.07, 0.1), hairM, 0, 0.17, 0.25); fr.rotation.x = 0.35; head.add(fr); }
  else if (style === 'spiky') { cap(0.32, 0.5); for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, r = i % 3 === 0 ? 0 : 0.17; const cn = mesh(new THREE.ConeGeometry(0.075, 0.22, 6), hairM, Math.cos(a) * r, 0.31 - r * 0.2, Math.sin(a) * r); cn.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); head.add(cn); } }
  else if (style === 'curly') { cap(0.3, 0.5); for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, r = 0.24; head.add(mesh(new THREE.SphereGeometry(0.11, 10, 8), hairM, Math.cos(a) * r, 0.14 + (i % 2) * 0.1, Math.sin(a) * r - 0.02)); } head.add(mesh(new THREE.SphereGeometry(0.14, 10, 8), hairM, 0, 0.33, 0)); }
  else if (style === 'bob') { cap(0.33, 0.58); head.add(mesh(new THREE.BoxGeometry(0.66, 0.36, 0.14), hairM, 0, -0.06, -0.24)); for (const s of [-1, 1]) head.add(mesh(new THREE.BoxGeometry(0.08, 0.34, 0.4), hairM, s * 0.3, -0.06, -0.02)); const fr = mesh(new THREE.BoxGeometry(0.5, 0.08, 0.1), hairM, 0, 0.17, 0.25); fr.rotation.x = 0.35; head.add(fr); }
  else if (style === 'long') { cap(0.33, 0.58); head.add(mesh(new THREE.BoxGeometry(0.68, 0.9, 0.13), hairM, 0, -0.36, -0.24)); for (const s of [-1, 1]) head.add(mesh(new THREE.BoxGeometry(0.08, 0.6, 0.36), hairM, s * 0.3, -0.22, -0.04)); const fr = mesh(new THREE.BoxGeometry(0.5, 0.08, 0.1), hairM, 0, 0.17, 0.25); fr.rotation.x = 0.35; head.add(fr); }
  else if (style === 'ponytail') { cap(0.325, 0.56); const tail = mesh(new THREE.CapsuleGeometry(0.075, 0.42, 4, 8), hairM, 0, -0.12, -0.4); tail.rotation.x = 0.35; head.add(tail); head.add(mesh(new THREE.SphereGeometry(0.06, 8, 8), std('#ff5cc8'), 0, 0.1, -0.3)); parts.tail = tail; const fr = mesh(new THREE.BoxGeometry(0.5, 0.07, 0.1), hairM, 0, 0.17, 0.25); fr.rotation.x = 0.35; head.add(fr); }
  else if (style === 'bun') { cap(0.325, 0.56); if (!acc.cap) head.add(mesh(new THREE.SphereGeometry(0.14, 14, 12), hairM, 0, 0.38, -0.04)); const fr = mesh(new THREE.BoxGeometry(0.5, 0.07, 0.1), hairM, 0, 0.17, 0.25); fr.rotation.x = 0.35; head.add(fr); }
  if (f && style !== 'ponytail' && style !== 'bun') for (const s of [1]) { const bow = new THREE.Group(); bow.position.set(-0.2, 0.26, 0.14); const bm = std('#ff5cc8'); for (const d of [-1, 1]) { const c = mesh(new THREE.ConeGeometry(0.07, 0.13, 3), bm, d * 0.07, 0, 0); c.rotation.z = d * Math.PI / 2; bow.add(c); } bow.add(mesh(new THREE.SphereGeometry(0.03, 8, 8), std('#ffd3f0'))); head.add(bow); }
  // אביזרי ראש
  if (acc.glasses) {
    const gm = new THREE.MeshStandardMaterial({ color: 0x0a1020, emissive: '#22e5ff', emissiveIntensity: 0.8, transparent: true, opacity: 0.55, roughness: 0.2 });
    for (const s of [-1, 1]) { const l = mesh(new RoundedBoxGeometry(0.19, 0.13, 0.03, 2, 0.03), gm, s * 0.115, 0.01, 0.295); head.add(l); }
    head.add(mesh(new THREE.BoxGeometry(0.06, 0.02, 0.02), std('#141a34'), 0, 0.03, 0.3));
  }
  if (acc.headphones) {
    const band = mesh(new THREE.TorusGeometry(0.345, 0.028, 8, 32, Math.PI), std('#2b3556'), 0, 0, 0); band.rotation.z = 0; head.add(band);
    for (const s of [-1, 1]) { const cup = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 18), glowMat('#22e5ff', 1.5), s * 0.34, -0.01, 0); cup.rotation.z = Math.PI / 2; head.add(cup); head.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 18), std('#2b3556'), s * 0.37, -0.01, 0).rotateZ(Math.PI / 2)); }
  }
  if (acc.cap) {
    const cm = std('#1c2340'); const dome = mesh(new THREE.SphereGeometry(0.34, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), cm, 0, 0.02, 0); dome.rotation.x = -0.12; head.add(dome);
    const brim = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.025, 20, 1, false, -Math.PI / 2 - 0.9, 1.8), std('#2d3a6a'), 0, 0.09, 0.3); brim.scale.set(1, 1, 0.9); brim.position.z = 0.16; brim.rotation.y = Math.PI; head.add(brim);
    head.add(mesh(new THREE.PlaneGeometry(0.11, 0.11), new THREE.MeshBasicMaterial({ map: wifiTex(), transparent: true }), 0, 0.22, 0.335).rotateX(-0.5));
  }
  // גיבור
  if (look.hero) {
    const cg = new THREE.PlaneGeometry(0.72, 1.0, 6, 8); const cols = []; const pos = cg.attributes.position;
    for (let i = 0; i < pos.count; i++) { const k = (pos.getY(i) + 0.5); const c1 = new THREE.Color('#22e5ff'), c2 = new THREE.Color('#7c4dff'); const c = c1.lerp(c2, k); cols.push(c.r, c.g, c.b); }
    cg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const cape = mesh(cg, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.5, emissive: '#5533aa', emissiveIntensity: 0.4 }), 0, 0.93, -0.22); body.add(cape); parts.cape = cape; parts.capeBase = cg.attributes.position.array.slice();
    const star = mesh(new THREE.CircleGeometry(0.05, 5), glowMat('#ffd34d', 2.2), -0.16, 1.28, 0.168); body.add(star);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: aura(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.set(3, 3, 1); sp.position.y = 1; body.add(sp);
  }
  root.scale.setScalar(0.92);
  root.userData = { parts, look, mood: 'neutral', blinkT: 0, blinking: false };

  root.userData.setMood = (m) => { if (root.userData.mood !== m) { root.userData.mood = m; faceMat.map = faceTex(look, m === 'think' ? 'neutral' : m, false); faceMat.needsUpdate = true; } };
  root.userData.update = (t, walk, wave, dt) => {
    const ph = t * 9, sw = Math.sin(ph) * walk;
    parts.legs[0].rotation.x = sw * 0.75; parts.legs[1].rotation.x = -sw * 0.75;
    parts.arms[0].rotation.x = -sw * 0.65 + Math.sin(t * 1.6) * 0.03 * (1 - walk); parts.arms[1].rotation.x = sw * 0.65;
    parts.arms[0].rotation.z = 0.06; parts.arms[1].rotation.z = -0.06;
    if (wave) { parts.arms[1].rotation.x = 0; parts.arms[1].rotation.z = -2.7 + Math.sin(t * 12) * 0.3; }
    body.position.y = Math.abs(Math.cos(ph)) * 0.05 * walk + Math.sin(t * 2) * 0.006 * (1 - walk);
    head.rotation.z = Math.sin(t * 1.3) * 0.03; head.rotation.x = Math.sin(t * 0.9) * 0.02 - walk * 0.04;
    wifi.material.opacity = 0.7 + 0.3 * Math.sin(t * 3);
    if (parts.tail) parts.tail.rotation.x = 0.35 + Math.sin(ph) * 0.25 * walk + Math.sin(t * 2) * 0.05;
    if (parts.cape) { const p = parts.cape.geometry.attributes.position, b = parts.capeBase; for (let i = 0; i < p.count; i++) { const y = b[i * 3 + 1] + 0.5; p.setZ(i, -(1 - y) * (0.12 + walk * 0.3) * (0.6 + 0.4 * Math.sin(t * 5 + y * 4 + b[i * 3] * 3))); } p.needsUpdate = true; }
    // מצמוץ
    const ud = root.userData; ud.blinkT -= dt;
    if (ud.blinkT <= 0) { if (ud.mood === 'happy') { ud.blinkT = 2; } else { ud.blinking = !ud.blinking; ud.blinkT = ud.blinking ? 0.12 : 2.5 + Math.random() * 2; faceMat.map = faceTex(look, ud.mood === 'think' ? 'neutral' : ud.mood, ud.blinking); } }
  };
  return root;
}
