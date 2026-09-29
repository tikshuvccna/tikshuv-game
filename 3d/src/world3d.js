/* העיר התלת-ממדית "נטופוליס": כיכר עגולה, ליבה במרכז, חמישה מבנים סביבה, קו רקיע, שמיים, חלקיקים.
   כל מבנה יש בו "כבוי" (אדום, תקול) ו"דלוק" (צבעוני, חי) ומעבר חלק ביניהם (lit 0..1). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const TK = window.TK;
const C = (c) => new THREE.Color(c);
const lerp = THREE.MathUtils.lerp;
const R = 34; // רדיוס טבעת המבנים

export const ZONES = [
  { i: 0, id: 'portal', name: 'שער הכניסה', acc: '#22e5ff' },
  { i: 1, id: 'square', name: 'כיכר הרשת', acc: '#ff3df2', ang: -120 },
  { i: 2, id: 'train', name: 'תחנת הרכבת החכמה', acc: '#ffb347', ang: -60 },
  { i: 3, id: 'mall', name: 'המרכז המסחרי והבנק', acc: '#ff6bd6', ang: 0 },
  { i: 4, id: 'hospital', name: 'בית החולים', acc: '#39ff88', ang: 60 },
  { i: 5, id: 'ai', name: 'מעבדת הבינה המלאכותית', acc: '#a78bfa', ang: 120 },
  { i: 6, id: 'core', name: 'ליבת העיר', acc: '#22e5ff' }
];
ZONES.forEach((z) => {
  if (z.ang != null) {
    const a = z.ang * Math.PI / 180;
    z.pos = new THREE.Vector3(R * Math.sin(a), 0, -R * Math.cos(a));
    z.entr = new THREE.Vector3(22.5 * Math.sin(a), 0, -22.5 * Math.cos(a));
  } else if (z.id === 'core') { z.pos = new THREE.Vector3(0, 0, 0); z.entr = new THREE.Vector3(0, 0, 9.5); }
  else { z.pos = new THREE.Vector3(0, 0, 50); z.entr = z.pos.clone(); }
});

function canvasTex(w, h, draw, srgb) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb !== false) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function facadeTex(seed) {
  const r = TK.rng(seed);
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (let y = 6; y < h - 6; y += 16) for (let x = 6; x < w - 6; x += 16) { if (r() < 0.55) { g.fillStyle = r() < 0.25 ? '#ffe9a8' : '#ffffff'; g.fillRect(x, y, 9, 10); } }
  });
}
const FAC = [facadeTex(11), facadeTex(23), facadeTex(37)];

export function createWorld(scene) {
  const world = {
    ZONES, lit: ZONES.map((z, i) => (i === 0 ? 1 : 0)), target: ZONES.map((z, i) => (i === 0 ? 1 : 0)), solved: ZONES.map(() => false),
    preview: false, doorOpen: 0, portal: 1, playerPos: new THREE.Vector3(0, 0, 46), colliders: [], bloom: true, avg: 0
  };
  const eff = (i) => (world.preview ? 1 : world.lit[i]);

  /* ---------- רישום חומרים שמשתנים בין כבוי לדלוק ---------- */
  const regs = ZONES.map(() => ({ mats: [], lines: [], sprites: [] }));
  const regMat = (z, mat, dim, lit, dimI, litI) => { regs[z.i].mats.push({ mat, dim: C(dim), lit: C(lit), dimI, litI }); return mat; };
  const regLine = (z, mat, dim, lit) => { regs[z.i].lines.push({ mat, dim: C(dim), lit: C(lit) }); return mat; };
  const regSprite = (z, mat, dim, lit, dimO) => { regs[z.i].sprites.push({ mat, dim: C(dim), lit: C(lit), dimO: dimO == null ? 0.55 : dimO }); return mat; };
  const bodyMat = () => new THREE.MeshStandardMaterial({ color: '#0e1428', roughness: 0.75, metalness: 0.2 });
  const neon = (z, dimI, litI, dimC) => regMat(z, new THREE.MeshStandardMaterial({ color: 0x05070f, emissive: C(z.acc), emissiveIntensity: 1 }), dimC || '#3a1420', z.acc, dimI == null ? 0.1 : dimI, litI == null ? 2 : litI);
  const edges = (z, mesh) => { const l = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), regLine(z, new THREE.LineBasicMaterial(), '#2c3558', z.acc)); mesh.add(l); return l; };
  function bld(z, g, w, h, d, x, y, zz, seed) {
    const t = FAC[seed % 3].clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, Math.round(w / 2.2)), Math.max(1, Math.round(h / 2.8)));
    const m = regMat(z, new THREE.MeshStandardMaterial({ color: '#0e1428', roughness: 0.75, metalness: 0.15, emissiveMap: t, emissive: 0xffffff }), '#ff4d6d', z.acc, 0.05, 1.15);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); mesh.position.set(x, y + h / 2, zz); g.add(mesh); edges(z, mesh); return mesh;
  }
  function label(z, g, text, x, y, zz, w, h) {
    const tx = canvasTex(512, 128, (c) => { let fs = 70; c.font = '800 ' + fs + 'px Rubik, Heebo, Arial, sans-serif'; while (c.measureText(text).width > 470 && fs > 22) { fs -= 3; c.font = '800 ' + fs + 'px Rubik, Heebo, Arial, sans-serif'; } c.direction = 'rtl'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#fff'; c.shadowBlur = 10; c.fillStyle = '#fff'; c.fillText(text, 256, 68); });
    const m = regSprite(z, new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false }), '#5a6484', z.acc);
    const s = new THREE.Sprite(m); s.position.set(x, y, zz); s.scale.set(w || 8, h || 2, 1); g.add(s); return s;
  }
  const box = (g, w, h, d, x, y, zz, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, zz); g.add(m); return m; };

  /* ---------- שמיים, כוכבים, גלובוס ---------- */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: { top: { value: C('#04060c') }, bottom: { value: C('#141a2c') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y*1.6+0.05,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, pow(h,0.7)),1.0); }'
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 24, 16), skyMat); scene.add(sky);
  scene.fog = new THREE.FogExp2(0x141a2c, 0.0085);
  const starGeo = new THREE.BufferGeometry(), sp = [], rs = TK.rng(5);
  for (let i = 0; i < 1400; i++) { const a = rs() * 6.283, b = Math.acos(1 - rs() * 0.95), r = 470; sp.push(Math.sin(b) * Math.cos(a) * r, Math.cos(b) * r, Math.sin(b) * Math.sin(a) * r); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 })); scene.add(stars);
  const globe = new THREE.Group(); globe.position.set(-120, 120, -260); scene.add(globe);
  const globeMat = new THREE.MeshBasicMaterial({ color: 0x4a6ab0, wireframe: true, transparent: true, opacity: 0.55, fog: false });
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(46, 22, 14), globeMat));
  const arcs = [];
  for (let i = 0; i < 6; i++) { const a = new THREE.Vector3().setFromSphericalCoords(46, 0.5 + rs() * 2, rs() * 6.28), b = new THREE.Vector3().setFromSphericalCoords(46, 0.5 + rs() * 2, rs() * 6.28); const mid = a.clone().add(b).multiplyScalar(0.5).multiplyScalar(1.35); const cv = new THREE.QuadraticBezierCurve3(a, mid, b); arcs.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(cv.getPoints(24)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, fog: false }))); globe.add(arcs[i]); }
  const sats = [];
  for (let i = 0; i < 3; i++) { const s = new THREE.Group(); s.add(new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 1.4), new THREE.MeshStandardMaterial({ color: '#cfe6ff', emissive: '#4aa8ff', emissiveIntensity: 0.6 }))); for (const d of [-1, 1]) s.add(new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.1, 1.4), new THREE.MeshStandardMaterial({ color: '#2a5ad0', emissive: '#2a5ad0', emissiveIntensity: 0.5 })).translateX(d * 3)); scene.add(s); sats.push({ g: s, a: i * 2.1, r: 190 + i * 20, y: 90 + i * 18, sp: 0.03 + i * 0.01 }); }

  /* ---------- תאורה ---------- */
  const hemi = new THREE.HemisphereLight(0x8a9cff, 0x1a1030, 0.5); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.5); scene.add(key, key.target); world.key = key;
  const moon = new THREE.DirectionalLight(0xa8c0ff, 0.5); moon.position.set(-40, 80, 30); scene.add(moon);

  /* ---------- קרקע ---------- */
  const gridTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(0, 0, w, h); g.lineWidth = 1; g.globalAlpha = 0.5; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } });
  gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping; gridTex.repeat.set(22, 22);
  const groundMat = new THREE.MeshStandardMaterial({ color: '#0a0f1e', roughness: 0.85, metalness: 0.3, emissiveMap: gridTex, emissive: C('#22e5ff'), emissiveIntensity: 0.06 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(64, 64), groundMat); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const beyond = new THREE.Mesh(new THREE.CircleGeometry(600, 32), new THREE.MeshStandardMaterial({ color: '#070b16', roughness: 1 })); beyond.rotation.x = -Math.PI / 2; beyond.position.y = -0.05; scene.add(beyond);
  const ringMats = [];
  for (const r of [10, 22, 44, 62]) { const m = new THREE.MeshBasicMaterial({ color: 0x22e5ff, transparent: true, opacity: 0.25, fog: true }); const rg = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.18, 96), m); rg.rotation.x = -Math.PI / 2; rg.position.y = 0.03; scene.add(rg); ringMats.push(m); }

  /* ---------- קו רקיע רחוק ---------- */
  const skyN = 380, skyMatB = new THREE.MeshStandardMaterial({ color: '#0d1326', roughness: 0.8, emissiveMap: FAC[1], emissive: C('#7a8cff'), emissiveIntensity: 0.05 });
  FAC[1].wrapS = FAC[1].wrapT = THREE.RepeatWrapping;
  const skyline = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), skyMatB, skyN); const dm = new THREE.Object3D(), rk = TK.rng(77);
  for (let i = 0; i < skyN; i++) { const a = rk() * 6.283, d = 74 + rk() * 110, w = 6 + rk() * 12, h = 14 + rk() * 70 * (0.4 + d / 190), dp = 6 + rk() * 12; dm.position.set(Math.sin(a) * d, h / 2, Math.cos(a) * d); dm.scale.set(w, h, dp); dm.rotation.y = rk() * 3; dm.updateMatrix(); skyline.setMatrixAt(i, dm.matrix); skyline.setColorAt(i, C().setHSL(0.62 + rk() * 0.12, 0.5, 0.06 + rk() * 0.06)); }
  scene.add(skyline);

  /* ---------- חלקיקים (זיקוקים, פורטל) ---------- */
  const PN = 1500, pPos = new Float32Array(PN * 3), pCol = new Float32Array(PN * 3), pVel = new Float32Array(PN * 3), pLife = new Float32Array(PN).fill(0), pMax = new Float32Array(PN).fill(1), pGrav = new Float32Array(PN);
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const dotTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.42, map: dotTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1 })); pts.frustumCulled = false; scene.add(pts);
  let pIdx = 0;
  world.burst = (pos, color, n, speed, life, grav) => {
    const c = C(color);
    for (let k = 0; k < n; k++) {
      const i = pIdx++ % PN, a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1), s = (0.3 + Math.random() * 0.7) * (speed || 8);
      pPos[i * 3] = pos.x; pPos[i * 3 + 1] = pos.y; pPos[i * 3 + 2] = pos.z;
      pVel[i * 3] = Math.sin(b) * Math.cos(a) * s; pVel[i * 3 + 1] = Math.cos(b) * s; pVel[i * 3 + 2] = Math.sin(b) * Math.sin(a) * s;
      pCol[i * 3] = c.r; pCol[i * 3 + 1] = c.g; pCol[i * 3 + 2] = c.b; pLife[i] = pMax[i] = (life || 1.4) * (0.6 + Math.random() * 0.6); pGrav[i] = grav == null ? 5 : grav;
    }
  };
  world.rise = (pos, color) => { const i = pIdx++ % PN, c = C(color); pPos[i * 3] = pos.x; pPos[i * 3 + 1] = pos.y; pPos[i * 3 + 2] = pos.z; pVel[i * 3] = 0; pVel[i * 3 + 1] = 2 + Math.random() * 3; pVel[i * 3 + 2] = 0; pCol[i * 3] = c.r; pCol[i * 3 + 1] = c.g; pCol[i * 3 + 2] = c.b; pLife[i] = pMax[i] = 2; pGrav[i] = 0; };
  const shocks = [];
  world.shockwave = (pos, color) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.copy(pos); m.position.y = 0.2; scene.add(m); shocks.push({ m, t: 0 });
  };

  /* ---------- הבניינים ---------- */
  const anim = []; // פונקציות עדכון לכל אזור

  function buildSquare(z, g) {
    const tower = new THREE.Group(); tower.position.set(-6, 0, -2); g.add(tower);
    const lat = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2.3, 22, 6, 5, true), regMat(z, new THREE.MeshBasicMaterial({ wireframe: true }), '#3a4468', z.acc, 1, 1)); lat.position.y = 11; tower.add(lat);
    lat.material.color = C('#3a4468'); regs[z.i].lines.push({ mat: lat.material, dim: C('#3a4468'), lit: C(z.acc) }); regs[z.i].mats.pop();
    const top = new THREE.Mesh(new THREE.SphereGeometry(1.1, 20, 14), neon(z, 0.15, 2.4)); top.position.y = 22.5; tower.add(top);
    const rings = [];
    for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 56), new THREE.MeshBasicMaterial({ color: z.acc, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })); r.position.y = 22.5; r.rotation.x = Math.PI / 2; tower.add(r); rings.push(r); }
    label(z, g, 'נתב מרכזי', -6, 26.5, -2, 9, 2.2);
    bld(z, g, 10, 6.5, 8, 6, 0, -1, 1);
    const aw = new THREE.Group(); aw.position.set(6, 3.6, 3.8); g.add(aw);
    for (let i = 0; i < 10; i++) { const m = i % 2 ? new THREE.MeshStandardMaterial({ color: '#e8ecff' }) : new THREE.MeshStandardMaterial({ color: '#ff5c9d', emissive: '#ff5c9d', emissiveIntensity: 0.3 }); const s = box(aw, 1.06, 0.15, 3, -4.8 + i * 1.06, 0, 0, m); s.rotation.x = 0.35; }
    label(z, g, 'בית קפה WiFi', 6, 8.6, 3.5, 9, 2.2);
    const env = [], envTex = canvasTex(128, 96, (c) => { c.fillStyle = '#fff'; c.fillRect(4, 8, 120, 80); c.strokeStyle = '#3a2a70'; c.lineWidth = 6; c.strokeRect(4, 8, 120, 80); c.beginPath(); c.moveTo(6, 10); c.lineTo(64, 56); c.lineTo(122, 10); c.stroke(); });
    for (let i = 0; i < 6; i++) { const e = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), new THREE.MeshBasicMaterial({ map: envTex, color: '#ffffff', side: THREE.DoubleSide, transparent: true })); g.add(e); env.push(e); }
    const light = new THREE.PointLight(z.acc, 0, 46, 2); light.position.set(0, 7, 6); g.add(light); z.light = light;
    anim[z.i] = (t, dt, l) => {
      rings.forEach((r, i) => { const k = ((t * 0.5 + i / 3) % 1); const s = l > 0.3 ? 2 + k * 14 : 2 + (Math.sin(t * 8 + i) > 0.7 ? 1.5 : 0); r.scale.set(s, s, s); r.material.opacity = l > 0.3 ? (1 - k) * 0.55 : 0.12; });
      env.forEach((e, i) => { const k = l > 0.5 ? ((t * 0.12 + i / 6) % 1) : 0.3 + i * 0.05; e.position.set(-14 + k * 30, 5 + Math.sin(k * 6.28 + i) * 1.2 + i * 0.3, 10); e.lookAt(world.camPos || new THREE.Vector3(0, 6, 60)); e.material.color.set(l > 0.5 ? '#ffffff' : '#ff6b85'); e.material.opacity = 1; });
    };
  }

  function buildTrain(z, g) {
    box(g, 26, 0.5, 8, 0, 0.25, -1, bodyMat());
    const canopy = box(g, 26, 0.35, 8.4, 0, 5, -1, new THREE.MeshStandardMaterial({ color: '#1a2140', roughness: 0.6 })); edges(z, canopy);
    box(g, 26, 0.12, 8.4, 0, 4.78, -1, neon(z, 0.1, 2.2));
    for (const x of [-11, -5.5, 0, 5.5, 11]) box(g, 0.35, 4.6, 0.35, x, 2.5, 2.5, new THREE.MeshStandardMaterial({ color: '#141a30', metalness: 0.5 }));
    label(z, g, 'תחנה מרכזית', 0, 7.2, -1, 10, 2.4);
    for (const dz of [-8.4, -10.2]) box(g, 90, 0.18, 0.22, 0, 0.12, dz, new THREE.MeshStandardMaterial({ color: '#8a94c0', metalness: 0.8, roughness: 0.3 }));
    for (let i = -44; i < 44; i += 2) box(g, 0.4, 0.12, 2.4, i, 0.06, -9.3, new THREE.MeshStandardMaterial({ color: '#1a1a22' }));
    const train = new THREE.Group(); train.position.set(0, 0.2, -9.3); g.add(train);
    const winMat = regMat(z, new THREE.MeshStandardMaterial({ color: '#0a0f1e', emissive: '#ffe9a8', emissiveIntensity: 1 }), '#200a0a', '#ffe9a8', 0.05, 1.6);
    for (let c = 0; c < 3; c++) { const cg = new THREE.Group(); cg.position.x = c * 6.6; const b = new THREE.Mesh(new RoundedBoxGeometry(6.2, 2.6, 2.5, 3, 0.4), new THREE.MeshStandardMaterial({ color: '#dfe6ff', roughness: 0.3, metalness: 0.4 })); b.position.y = 1.5; cg.add(b); box(cg, 5.6, 0.7, 2.56, 0, 1.9, 0, winMat); box(cg, 6.2, 0.18, 2.55, 0, 1.0, 0, neon(z, 0.2, 2.2)); train.add(cg); }
    const headL = new THREE.PointLight(0xffe9a8, 0, 14, 2); headL.position.set(-3.2, 1.6, 0); train.add(headL);
    // לוח
    const board = document.createElement('canvas'); board.width = 512; board.height = 256; const bt = new THREE.CanvasTexture(board); bt.colorSpace = THREE.SRGBColorSpace;
    const bm = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), new THREE.MeshBasicMaterial({ map: bt })); bm.position.set(-9, 3.4, 4.2); g.add(bm);
    box(g, 7.3, 3.8, 0.2, -9, 3.4, 4.05, bodyMat()); box(g, 0.25, 2, 0.25, -9, 1, 4.0, bodyMat());
    let lastState = -1;
    const drawBoard = (on) => { const c = board.getContext('2d'); c.fillStyle = '#050a1c'; c.fillRect(0, 0, 512, 256); c.textAlign = 'center'; c.direction = 'rtl'; if (on) { c.fillStyle = '#ffb347'; c.font = '700 34px Rubik, Arial'; c.fillText('יציאות', 256, 40); c.font = '600 30px Rubik, Arial'; [['תל אביב', '12:04'], ['ירושלים', '12:09'], ['חיפה', '12:15'], ['באר שבע', '12:22']].forEach((r, i) => { c.fillStyle = '#fff'; c.textAlign = 'right'; c.fillText(r[0], 470, 90 + i * 40); c.fillStyle = '#ffe07a'; c.textAlign = 'left'; c.direction = 'ltr'; c.fillText(r[1], 42, 90 + i * 40); c.direction = 'rtl'; }); } else { c.fillStyle = '#ff4d6d'; c.font = '900 52px Rubik, Arial'; c.direction = 'ltr'; c.fillText('NO CONNECTION', 256, 110); c.font = '600 30px Rubik, Arial'; c.direction = 'rtl'; c.fillStyle = '#ff8fa3'; c.fillText('שגיאה 503', 256, 170); } bt.needsUpdate = true; };
    // ארון תקשורת
    const cab = box(g, 3, 4.2, 1.6, 9, 2.1, 3, bodyMat()); edges(z, cab);
    const leds = []; for (let i = 0; i < 6; i++) { const m = new THREE.MeshBasicMaterial({ color: 0xff4d6d }); const s = box(g, 0.14, 0.14, 0.05, 8.2, 0.6 + i * 0.6, 3.83, m); leds.push(m); }
    const light = new THREE.PointLight(z.acc, 0, 46, 2); light.position.set(0, 6, 6); g.add(light); z.light = light;
    anim[z.i] = (t, dt, l) => {
      const st = l > 0.5 ? 1 : 0; if (st !== lastState) { lastState = st; drawBoard(st); }
      train.position.x = l > 0.5 ? -50 + ((t * 9) % 110) : 16; headL.intensity = l > 0.5 ? 30 : 0;
      leds.forEach((m, i) => m.color.set(l > 0.5 ? (i % 2 ? '#39ff88' : '#22e5ff') : (Math.sin(t * 6 + i) > 0 ? '#ff4d6d' : '#2a0a10')));
    };
  }

  function buildMall(z, g) {
    [[-11, 7, 5, 8, '#22e5ff', 'טק-שופ'], [-3.4, 6, 6, 7, '#ffe07a', 'מיוזיק'], [4.6, 8, 5, 9, '#ff6bd6', 'אופנה']].forEach((s, k) => {
      const b = bld(z, g, s[1], s[2] + 3, s[3], s[0], 0, -2, k + 1);
      const win = box(g, s[1] - 1.6, 2.4, 0.2, s[0], 1.5, -2 + s[3] / 2 + 0.05, new THREE.MeshStandardMaterial({ color: 0x05070f, emissive: s[4], emissiveIntensity: 0.4, transparent: true, opacity: 0.85 }));
      const lb = label(z, g, s[5], s[0], s[2] + 4.4, -2 + s[3] / 2, 6, 1.6); void b; void lb;
    });
    const bank = new THREE.Group(); bank.position.set(15, 0, -1); g.add(bank);
    bld(z, bank, 10, 9, 9, 0, 0.6, 0, 2); box(bank, 11.6, 0.6, 10.6, 0, 0.3, 0, new THREE.MeshStandardMaterial({ color: '#c9cfe8', roughness: 0.5 }));
    for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 8.4, 12), new THREE.MeshStandardMaterial({ color: '#dfe4fa', roughness: 0.4 })); c.position.set(-4 + i * 2, 4.8, 5.1); bank.add(c); }
    const ped = new THREE.Mesh(new THREE.ConeGeometry(7.4, 3, 4), new THREE.MeshStandardMaterial({ color: '#c9cfe8', roughness: 0.5 })); ped.rotation.y = Math.PI / 4; ped.scale.set(1, 1, 0.55); ped.position.set(0, 11.3, 2.6); bank.add(ped);
    label(z, bank, 'בנק', 0, 14.5, 4, 5, 1.8);
    // מנעול
    const lock = new THREE.Group(); lock.position.set(-2, 5.2, 8); g.add(lock);
    const lockMat = new THREE.MeshStandardMaterial({ color: 0x05070f, emissive: '#ff4d6d', emissiveIntensity: 1.6, transparent: true, opacity: 0.92 });
    lock.add(new THREE.Mesh(new RoundedBoxGeometry(2.4, 1.9, 0.9, 3, 0.2), lockMat));
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.2, 10, 28, Math.PI), lockMat); shackle.position.set(0, 0.95, 0); lock.add(shackle);
    lock.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.95, 10), new THREE.MeshBasicMaterial({ color: '#fff' })).translateZ(0.35).rotateX(Math.PI / 2));
    label(z, g, 'AI מגן על התשלומים', -2, 8.6, 8, 9, 1.8);
    // קרס פישינג
    const hook = new THREE.Group(); hook.position.set(-14, 9, 6); g.add(hook);
    const hl = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -6, 0)]), new THREE.LineBasicMaterial({ color: 0x9aa4c8 })); hook.add(hl);
    const env = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshBasicMaterial({ color: '#ffe07a', side: THREE.DoubleSide })); env.position.y = -6.4; hook.add(env);
    const light = new THREE.PointLight(z.acc, 0, 46, 2); light.position.set(0, 7, 8); g.add(light); z.light = light;
    anim[z.i] = (t, dt, l) => {
      lockMat.emissive.set(l > 0.5 ? '#39ff88' : '#ff4d6d'); lockMat.emissiveIntensity = l > 0.5 ? 1.8 : 1.1 + Math.sin(t * 6) * 0.5;
      shackle.rotation.z = l > 0.5 ? 0 : 0.6 + Math.sin(t * 3) * 0.1; shackle.position.x = l > 0.5 ? 0 : 0.5; lock.rotation.y = Math.sin(t * 0.7) * 0.5;
      hook.visible = l < 0.5; hook.position.y = 9 + Math.sin(t * 2) * 0.4; hook.rotation.z = Math.sin(t * 1.2) * 0.08;
    };
  }

  function buildHospital(z, g) {
    bld(z, g, 14, 13, 9, 0, 0, -1, 3);
    const cross = neon(z, 0.2, 3, '#402028'); box(g, 1.2, 4, 0.3, 0, 8.5, 3.6, cross); box(g, 4, 1.2, 0.3, 0, 8.5, 3.6, cross);
    label(z, g, 'בית חולים', 0, 15.6, 3, 9, 2.2);
    const ecg = document.createElement('canvas'); ecg.width = 512; ecg.height = 256; const et = new THREE.CanvasTexture(ecg); et.colorSpace = THREE.SRGBColorSpace;
    box(g, 7.4, 3.9, 0.2, 12, 4.5, 2, bodyMat()); const em = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), new THREE.MeshBasicMaterial({ map: et })); em.position.set(12, 4.5, 2.12); g.add(em);
    const rack = box(g, 2.2, 5, 1.6, 9.5, 2.5, 5.5, bodyMat()); edges(z, rack); label(z, g, 'גיבוי', 9.5, 6.3, 6.2, 3.5, 1.2);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(15, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: z.acc, wireframe: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); dome.position.set(0, 0, -1); g.add(dome);
    const dome2 = new THREE.Mesh(new THREE.SphereGeometry(14.8, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: z.acc, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); dome2.position.set(0, 0, -1); g.add(dome2);
    const amb = new THREE.Group(); g.add(amb); const abody = new RoundedBoxGeometry(3.4, 1.4, 1.6, 3, 0.35); amb.add(new THREE.Mesh(abody, new THREE.MeshStandardMaterial({ color: '#e8ecff', roughness: 0.4 }))); const ac = neon(z, 0.1, 2.5, '#402028'); amb.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 1, 0.3), ac).translateY(0.1).translateZ(0.85)); amb.add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.3, 0.3), ac).translateY(0.1).translateZ(0.85));
    const bugs = []; for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff4d6d })); b.scale.set(1.3, 0.7, 1); g.add(b); bugs.push(b); }
    const light = new THREE.PointLight(z.acc, 0, 46, 2); light.position.set(0, 8, 8); g.add(light); z.light = light;
    let ecgLast = -1;
    anim[z.i] = (t, dt, l) => {
      const c = ecg.getContext('2d'); c.fillStyle = '#050a1c'; c.fillRect(0, 0, 512, 256); c.strokeStyle = l > 0.5 ? '#39ff88' : '#ff4d6d'; c.lineWidth = 6; c.beginPath();
      for (let x = 0; x <= 512; x += 4) { let y = 0; if (l > 0.5) { const p = ((x + t * 180) % 190) / 190; y = p > 0.4 && p < 0.46 ? -70 : p > 0.46 && p < 0.52 ? 60 : p > 0.6 && p < 0.72 ? -16 * Math.sin((p - 0.6) / 0.12 * 3.14) : 0; } x ? c.lineTo(x, 130 + y) : c.moveTo(x, 130 + y); } c.stroke();
      c.fillStyle = l > 0.5 ? '#c8ffe0' : '#ffb3c0'; c.font = '700 30px Rubik, Arial'; c.textAlign = 'center'; c.direction = 'rtl'; c.fillText(l > 0.5 ? 'דופק תקין' : 'אין אות', 256, 40); et.needsUpdate = true; void ecgLast;
      dome.material.opacity = 0.16 * l * (0.8 + 0.2 * Math.sin(t * 2)); dome2.material.opacity = 0.05 * l;
      amb.position.set(l > 0.5 ? 14 + Math.sin(t * 0.5) * 8 : 15, l > 0.5 ? 7 + Math.sin(t * 2) * 0.4 : 0.8, 6); amb.rotation.y = l > 0.5 ? Math.cos(t * 0.5) * 0.4 : 0.4;
      bugs.forEach((b, i) => { b.visible = l < 0.5; b.position.set(-12 + i * 5 + Math.sin(t * 2 + i) * 1.2, 0.3, 9 + Math.cos(t * 1.5 + i) * 1.2); b.rotation.y = t * 2 + i; });
    };
  }

  function buildAI(z, g) {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(8.5, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), regMat(z, new THREE.MeshStandardMaterial({ color: '#160f40', transparent: true, opacity: 0.4, roughness: 0.15, metalness: 0.4, side: THREE.DoubleSide, emissive: 0xffffff }), '#221a44', z.acc, 0.05, 0.28)); dome.position.set(-9, 0, -2); g.add(dome);
    edges(z, dome).scale.setScalar(1.002);
    const nodes = [], nm = new THREE.MeshBasicMaterial({ color: 0x3a3f66 }), lm = new THREE.LineBasicMaterial({ color: 0x3a3f66, transparent: true, opacity: 0.6 });
    const layers = [3, 4, 4, 2]; layers.forEach((n, li) => { for (let i = 0; i < n; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), new THREE.MeshBasicMaterial({ color: 0x3a3f66 })); s.position.set(-9 + (li - 1.5) * 3, 3 + (i - (n - 1) / 2) * 1.5 + 0.6, -2 + Math.sin(i + li) * 0.8); g.add(s); nodes.push({ s, li }); } });
    nodes.forEach((a) => nodes.forEach((b) => { if (b.li === a.li + 1) g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a.s.position, b.s.position]), lm)); }));
    label(z, g, 'מעבדת AI', -9, 11, -2, 8, 2);
    const head = new THREE.Group(); head.position.set(9, 7.5, 0); g.add(head);
    const hm = regMat(z, new THREE.MeshStandardMaterial({ color: '#12103a', transparent: true, opacity: 0.55, roughness: 0.2, metalness: 0.5, emissive: 0xffffff }), '#331a2a', z.acc, 0.1, 0.5);
    const hb = new THREE.Mesh(new RoundedBoxGeometry(5.6, 4.4, 4.4, 4, 0.9), hm); head.add(hb); edges(z, hb);
    head.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6), new THREE.MeshBasicMaterial({ color: 0x8fb4ff })).translateY(2.9));
    const antenna = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: 0x39ff88 })); antenna.position.y = 3.7; head.add(antenna);
    const eyeM = new THREE.MeshBasicMaterial({ color: z.acc }), eyes = [];
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), eyeM); e.scale.set(1, 1.3, 0.35); e.position.set(s * 1.25, 0.4, 2.2); head.add(e); eyes.push(e); }
    const xs = []; for (const s of [-1, 1]) { const x = new THREE.Group(); x.position.set(s * 1.25, 0.4, 2.25); for (const r of [Math.PI / 4, -Math.PI / 4]) x.add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.18, 0.1), new THREE.MeshBasicMaterial({ color: 0xff4d6d })).rotateZ(r)); head.add(x); xs.push(x); }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.09, 6, 20, Math.PI), new THREE.MeshBasicMaterial({ color: z.acc })); mouth.position.set(0, -0.8, 2.25); mouth.rotation.z = Math.PI; head.add(mouth);
    const robots = []; for (let i = 0; i < 2; i++) { const r = new THREE.Group(); r.add(new THREE.Mesh(new RoundedBoxGeometry(1.8, 1.4, 1.6, 3, 0.3), new THREE.MeshStandardMaterial({ color: '#dfe6ff', roughness: 0.4 })).translateY(1.1)); r.add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 0.05), new THREE.MeshBasicMaterial({ color: 0x0a0d24 })).translateY(1.3).translateZ(0.83)); const ey = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.06), new THREE.MeshBasicMaterial({ color: 0xff4d6d })); ey.position.set(0, 1.3, 0.87); r.add(ey); r.userData.eye = ey; for (const s of [-1, 1]) r.add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12), new THREE.MeshStandardMaterial({ color: '#10152a' })).translateX(s * 0.8).translateY(0.4).rotateZ(Math.PI / 2)); g.add(r); robots.push(r); }
    const light = new THREE.PointLight(z.acc, 0, 46, 2); light.position.set(0, 8, 8); g.add(light); z.light = light;
    anim[z.i] = (t, dt, l) => {
      nodes.forEach((n, i) => { const on = l > 0.4 && Math.sin(t * 2 + i) > -0.4; n.s.material.color.set(on ? z.acc : '#3a3f66'); n.s.scale.setScalar(on ? 1.15 : 1); });
      const wp = z.group.worldToLocal(world.playerPos.clone()); const ang = Math.atan2(wp.x - head.position.x, wp.z - head.position.z); head.rotation.y += (THREE.MathUtils.clamp(ang, -0.8, 0.8) - head.rotation.y) * Math.min(1, dt * 3);
      head.position.y = 7.5 + Math.sin(t * 1.2) * 0.3;
      const on = l > 0.5; eyes.forEach((e) => { e.visible = on; e.scale.y = ((t + 1) % 3.6) < 0.1 ? 0.15 : 1.3; }); xs.forEach((x) => { x.visible = !on; }); mouth.visible = on; antenna.material.color.set(on ? '#39ff88' : '#ff4d6d');
      robots.forEach((r, i) => { r.position.set(-2 + i * 6 + (on ? Math.sin(t * 0.7 + i * 2) * 3.5 : 0), 0, 9); r.rotation.y = on ? Math.cos(t * 0.7 + i * 2) * 0.8 : 0.3; r.userData.eye.material.color.set(on ? z.acc : '#ff4d6d'); });
    };
  }

  function buildCore(z, g) {
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 22, 24, 1, true), regMat(z, new THREE.MeshStandardMaterial({ color: '#0c1a30', transparent: true, opacity: 0.3, roughness: 0.1, metalness: 0.6, side: THREE.DoubleSide, emissive: 0xffffff }), '#221420', z.acc, 0.03, 0.25)); glass.position.y = 11; g.add(glass);
    box(g, 8.4, 0.8, 8.4, 0, 0.4, 0, bodyMat()).geometry = new THREE.CylinderGeometry(4.6, 5, 0.8, 24);
    const coreM = new THREE.MeshBasicMaterial({ color: 0xff8fa3 }), core = new THREE.Mesh(new THREE.SphereGeometry(1.7, 24, 16), coreM); core.position.y = 10; g.add(core);
    const cl = new THREE.PointLight(0xff4d6d, 10, 30, 2); cl.position.y = 10; g.add(cl);
    const rings = []; for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(2.6 + i * 0.7, 0.07, 6, 60), new THREE.MeshBasicMaterial({ color: z.acc, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); r.position.y = 10; g.add(r); rings.push(r); }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1, 2.4, 300, 16, 1, true), new THREE.MeshBasicMaterial({ color: z.acc, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.position.y = 150; g.add(beam);
    label(z, g, 'ליבת העיר', 0, 24.5, 0, 10, 2.4);
    const leds = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283, rk = new THREE.Group(); rk.position.set(Math.sin(a) * 8.5, 0, Math.cos(a) * 8.5); rk.rotation.y = a; const b = box(rk, 1.4, 5.5, 1.4, 0, 2.75, 0, bodyMat()); edges(z, b); for (let k = 0; k < 6; k++) { const m = new THREE.MeshBasicMaterial({ color: 0x220a10 }); box(rk, 0.16, 0.16, 0.05, 0.4, 0.9 + k * 0.8, 0.73, m); leds.push(m); } g.add(rk); }
    world.colliders.push({ x: 0, z: 0, r: 9.6 });
    anim[z.i] = (t, dt, l) => {
      const on = l > 0.5; coreM.color.set(on ? '#ffffff' : (Math.sin(t * 9) > 0.7 ? '#ff8fa3' : '#661a2a')); core.scale.setScalar(on ? 1 + Math.sin(t * 3) * 0.08 : 0.7); cl.color.set(on ? z.acc : '#ff4d6d'); cl.intensity = on ? 40 : 6;
      rings.forEach((r, i) => { r.rotation.x = t * (0.7 + i * 0.3); r.rotation.y = t * 0.5 * (i + 1); r.material.opacity = 0.15 + 0.6 * l; });
      beam.material.opacity = (0.25 * l + 0.4 * world.doorOpen);
      leds.forEach((m, i) => m.color.set(on ? (Math.sin(t * (3 + i % 4) + i) > -0.2 ? (i % 3 ? z.acc : '#39ff88') : '#0a1a20') : (Math.sin(t * 3 + i * 7) > 0.93 ? '#ff4d6d' : '#220a10')));
    };
  }

  const builders = { square: buildSquare, train: buildTrain, mall: buildMall, hospital: buildHospital, ai: buildAI, core: buildCore };
  ZONES.forEach((z) => {
    if (!builders[z.id]) return;
    const g = new THREE.Group(); g.position.copy(z.pos); if (z.ang != null) g.rotation.y = Math.atan2(-z.pos.x, -z.pos.z); scene.add(g); z.group = g;
    builders[z.id](z, g);
    if (z.ang != null) world.colliders.push({ x: z.pos.x, z: z.pos.z, r: 11 });
  });

  /* ---------- כניסות, זרמי מידע ---------- */
  const entrances = [], streams = [];
  ZONES.slice(1).forEach((z) => {
    const g = new THREE.Group(); g.position.copy(z.entr); scene.add(g);
    const rm = new THREE.MeshBasicMaterial({ color: 0xffe07a, transparent: true, opacity: 0.85, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.85, 40), rm); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; g.add(ring);
    const ring2 = ring.clone(); ring2.material = rm.clone(); g.add(ring2);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 6, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe07a, transparent: true, opacity: 0.12, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })); col.position.y = 3; g.add(col);
    const lbT = canvasTex(512, 128, (c) => { let fs = 62; c.font = '800 ' + fs + 'px Rubik, Heebo, Arial'; while (c.measureText(z.name).width > 470 && fs > 22) { fs -= 3; c.font = '800 ' + fs + 'px Rubik, Heebo, Arial'; } c.direction = 'rtl'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#000'; c.shadowBlur = 8; c.fillStyle = '#fff'; c.fillText(z.name, 256, 66); });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: lbT, transparent: true, depthWrite: false, fog: false })); sp.position.y = 5.3; sp.scale.set(8, 2, 1); g.add(sp);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 4), new THREE.MeshBasicMaterial({ color: 0xffe07a })); arrow.rotation.x = Math.PI; g.add(arrow);
    entrances.push({ z, g, ring, ring2, col, arrow, rm });
    if (z.id !== 'core') {
      const a = new THREE.Vector3(0, 0.16, 8), b = z.entr.clone(); b.y = 0.16;
      const cv = new THREE.CatmullRomCurve3([a, a.clone().lerp(b, 0.5).add(new THREE.Vector3(Math.sign(z.entr.x || 1) * 2, 0, 0)), b]);
      const lm = regLine(z, new THREE.MeshBasicMaterial(), '#2a3350', z.acc);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(cv, 30, 0.09, 6, false), lm); scene.add(tube);
      const pulses = []; for (let k = 0; k < 5; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); scene.add(p); pulses.push(p); }
      streams.push({ z, cv, pulses });
    }
  });

  /* ---------- פורטל כניסה ---------- */
  const portal = new THREE.Group(); portal.position.set(0, 0, 51); scene.add(portal);
  const pm1 = new THREE.MeshBasicMaterial({ color: 0x22e5ff }), pm2 = new THREE.MeshBasicMaterial({ color: 0xff3df2 });
  const pr1 = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.16, 10, 60), pm1), pr2 = new THREE.Mesh(new THREE.TorusGeometry(3.7, 0.08, 8, 60), pm2); pr1.position.y = pr2.position.y = 3.6; portal.add(pr1, pr2);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.2, 40), new THREE.MeshBasicMaterial({ color: 0x22e5ff, transparent: true, opacity: 0.2, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })); disc.position.y = 3.6; portal.add(disc);
  const pbeam = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 40, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0x22e5ff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })); pbeam.position.y = 20; portal.add(pbeam);
  const pfl = new THREE.Mesh(new THREE.RingGeometry(2.6, 2.9, 48), new THREE.MeshBasicMaterial({ color: 0x22e5ff, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.8, depthWrite: false })); pfl.rotation.x = -Math.PI / 2; pfl.position.set(0, 0.06, -4.5); portal.add(pfl);
  const wl = (() => { const tx = canvasTex(512, 200, (c) => { c.font = '800 80px Rubik, Heebo, Arial'; c.direction = 'rtl'; c.textAlign = 'center'; c.fillStyle = '#22e5ff'; c.shadowColor = '#22e5ff'; c.shadowBlur = 16; c.fillText('ברוכים הבאים', 256, 80); c.fillStyle = '#fff'; c.fillText('לנטופוליס', 256, 170); }); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, fog: false })); s.position.set(0, 8.8, 0); s.scale.set(10, 3.9, 1); portal.add(s); return s; })();
  void wl;
  world.portalPos = new THREE.Vector3(0, 0, 46);

  /* ---------- רחפנים ---------- */
  const drones = []; const rd = TK.rng(9);
  for (let i = 0; i < 10; i++) { const d = new THREE.Group(); d.add(new THREE.Mesh(new RoundedBoxGeometry(1, 0.28, 1, 2, 0.1), new THREE.MeshStandardMaterial({ color: '#1b2440' }))); const led = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff4d6d })); led.position.y = -0.18; d.add(led); for (const [x, z2] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.02, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })); r.position.set(x * 0.7, 0.2, z2 * 0.7); d.add(r); } scene.add(d); drones.push({ g: d, led, a: rd() * 6.28, r: 14 + rd() * 44, y: 7 + rd() * 14, sp: 0.1 + rd() * 0.2 }); }

  /* ---------- כוכבי "הידעת?" ---------- */
  const factTex = canvasTex(128, 128, (c) => { c.fillStyle = 'rgba(40,26,0,.85)'; c.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; c.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); } c.closePath(); c.fill(); c.strokeStyle = '#ffc933'; c.lineWidth = 8; c.stroke(); c.fillStyle = '#ffc933'; c.font = '900 76px Rubik, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 64, 68); });
  const factDone = canvasTex(128, 128, (c) => { c.strokeStyle = '#5a668c'; c.lineWidth = 8; c.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; c.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); } c.closePath(); c.stroke(); c.fillStyle = '#5a668c'; c.font = '900 70px Rubik, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✓', 64, 68); });
  world.makeFactSprite = (x, z) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: factTex, transparent: true, depthWrite: false, fog: false })); s.position.set(x, 2.6, z); s.scale.set(1.6, 1.6, 1); s.userData.base = 2.6; scene.add(s); return s; };
  world.setFactDone = (s) => { s.material.map = factDone; s.material.needsUpdate = true; s.scale.set(1.2, 1.2, 1); };

  /* ---------- עדכון ---------- */
  const skyDim = ['#04060c', '#141a2c'], skyLit = ['#0a0f3a', '#8a3fd0'];
  world.update = (t, dt, camPos, focus) => {
    world.camPos = camPos; key.position.set(camPos.x + 3, camPos.y + 6, camPos.z + 2); if (focus) key.target.position.copy(focus);
    for (let i = 0; i < ZONES.length; i++) { const d = world.target[i] - world.lit[i]; if (Math.abs(d) > 0.001) world.lit[i] += Math.sign(d) * Math.min(Math.abs(d), dt * 0.45); }
    let sum = 0; for (let i = 1; i <= 5; i++) sum += eff(i); const avg = sum / 5; world.avg = avg;
    TK.audio.setIntensity(world.preview ? 0.6 : (avg * 0.85 + eff(6) * 0.15));
    ZONES.forEach((z) => {
      const l = eff(z.i), r = regs[z.i];
      r.mats.forEach((q) => { q.mat.emissive.copy(q.dim).lerp(q.lit, l); q.mat.emissiveIntensity = lerp(q.dimI, q.litI, l); });
      r.lines.forEach((q) => { q.mat.color.copy(q.dim).lerp(q.lit, l); });
      r.sprites.forEach((q) => { q.mat.color.copy(q.dim).lerp(q.lit, l); q.mat.opacity = lerp(q.dimO, 1, l); });
      if (z.light) { z.light.intensity = l * 70 + (1 - l) * (Math.sin(t * 7 + z.i * 3) > 0.85 ? 22 : 4); z.light.color.set(l > 0.5 ? z.acc : '#ff4d6d'); }
      if (anim[z.i]) anim[z.i](t, dt, l);
    });
    skyMat.uniforms.top.value.copy(C(skyDim[0])).lerp(C(skyLit[0]), avg); skyMat.uniforms.bottom.value.copy(C(skyDim[1])).lerp(C(skyLit[1]), avg);
    scene.fog.color.copy(skyMat.uniforms.bottom.value);
    hemi.intensity = 0.5 + 0.45 * avg; moon.intensity = 0.55 + 0.45 * avg;
    groundMat.emissiveIntensity = 0.05 + 0.45 * avg; ringMats.forEach((m) => { m.opacity = 0.12 + 0.35 * avg; });
    skyMatB.emissiveIntensity = 0.04 + 0.5 * avg; skyMatB.emissive.copy(C('#ff6a8a')).lerp(C('#7fa0ff'), avg);
    globeMat.color.copy(C('#4a6ab0')).lerp(C('#22e5ff'), avg); globe.rotation.y = t * 0.06;
    arcs.forEach((a, i) => { a.material.opacity = 0.15 + 0.6 * avg * (0.5 + 0.5 * Math.sin(t + i)); });
    stars.rotation.y = t * 0.004;
    sats.forEach((s) => { s.a += s.sp * dt; s.g.position.set(Math.sin(s.a) * s.r, s.y, Math.cos(s.a) * s.r); s.g.rotation.y = s.a; });
    // זרמים
    streams.forEach((s) => { const l = eff(s.z.i); s.pulses.forEach((p, k) => { let u = (t * 0.18 + k / 5) % 1; if (l < 0.5) u = Math.min(0.42, u * 0.4); p.position.copy(s.cv.getPoint(u)); p.material.color.set(l > 0.5 ? '#ffffff' : '#ff4d6d'); p.scale.setScalar(l > 0.5 ? 1 : 0.8 + 0.4 * Math.sin(t * 9 + k)); }); });
    // כניסות
    entrances.forEach((e) => {
      const sol = world.solved[e.z.i], lockedCore = e.z.id === 'core' && !world.coreOpen, c = sol ? '#39ff88' : lockedCore ? '#7f8db8' : '#ffe07a';
      e.rm.color.set(c); e.ring2.material.color.set(c); e.col.material.color.set(c); e.arrow.material.color.set(c);
      const k = (t * 0.7) % 1; e.ring2.scale.setScalar(1 + k * 0.9); e.ring2.material.opacity = (1 - k) * 0.8; e.col.material.opacity = sol ? 0.05 : 0.12 + 0.05 * Math.sin(t * 3);
      e.arrow.visible = !sol; e.arrow.position.y = 3.3 + Math.sin(t * 3) * 0.3; e.arrow.rotation.y = t * 2;
    });
    // פורטל
    const pp = world.portal; pr1.rotation.z = t * 0.6; pr2.rotation.z = -t * 0.4; disc.material.opacity = (0.12 + 0.1 * Math.sin(t * 3)) * pp + 0.05; pbeam.material.opacity = 0.16 * pp; pfl.scale.setScalar(1 + Math.sin(t * 3) * 0.06);
    if (pp > 0.2 && Math.random() < 0.6) world.rise(new THREE.Vector3(portal.position.x + (Math.random() - 0.5) * 5, 0.2, portal.position.z + (Math.random() - 0.5) * 5), Math.random() < 0.5 ? '#22e5ff' : '#ffffff');
    // רחפנים
    drones.forEach((d, i) => { const l = world.preview ? 1 : world.avg; d.a += d.sp * dt * (l > 0.4 ? 1 : 0.15); d.g.position.set(Math.sin(d.a) * d.r, d.y + Math.sin(t * 1.5 + i) * 0.4, Math.cos(d.a) * d.r); d.g.rotation.y = d.a + 1.57; d.led.material.color.set(l > 0.4 ? '#39ff88' : (Math.sin(t * 6 + i) > 0 ? '#ff4d6d' : '#301018')); });
    // חלקיקים
    for (let i = 0; i < PN; i++) {
      if (pLife[i] > 0) { pLife[i] -= dt; if (pLife[i] <= 0) { pPos[i * 3 + 1] = -100; continue; } pVel[i * 3 + 1] -= pGrav[i] * dt; pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt; const f = 1 - dt * 0.9; pCol[i * 3] *= f; pCol[i * 3 + 1] *= f; pCol[i * 3 + 2] *= f; }
      else pPos[i * 3 + 1] = -100;
    }
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
    for (let i = shocks.length - 1; i >= 0; i--) { const s = shocks[i]; s.t += dt; const k = s.t / 1.6; s.m.scale.setScalar(1 + k * 60); s.m.material.opacity = 0.9 * (1 - k); if (k >= 1) { scene.remove(s.m); shocks.splice(i, 1); } }
  };

  world.zoneNear = (x, z, maxD) => { let best = null, bd = maxD || 24; ZONES.slice(1).forEach((q) => { const d = Math.hypot(q.pos.x - x, q.pos.z - z); if (d < bd) { bd = d; best = q; } }); return best; };
  return world;
}
