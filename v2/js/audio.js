/* קול: הכול מסונתז בקוד (Web Audio) - אין קבצי שמע. מוזיקת רקע יוצרת מצב רוח שמתבהר ככל שהעיר מתוקנת */
window.TK = window.TK || {};
TK.audio = (function () {
  'use strict';
  let ac = null, master, sfxG, musicG, lp, noiseBuf, muted = false, intensity = 0, timer = null, nextT = 0, step = 0;
  let charge = null;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.85; master.connect(ac.destination);
    sfxG = ac.createGain(); sfxG.gain.value = 0.5; sfxG.connect(master);
    musicG = ac.createGain(); musicG.gain.value = 0.2; musicG.connect(master);
    lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; lp.connect(musicG);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    nextT = ac.currentTime + 0.1;
    timer = setInterval(sched, 70);
  }

  function tone(f, dur, type, vol, delay, slideTo, dest) {
    if (!ac || muted) return;
    const t0 = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || sfxG);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(dur, vol, f0, f1, delay) {
    if (!ac || muted) return;
    const t0 = ac.currentTime + (delay || 0);
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(sfxG);
    s.start(t0); s.stop(t0 + dur + 0.05);
  }

  /* ---- מוזיקה: אקורדים Am F C G, ארפג'יו, בס ---- */
  const CH = [
    [110, 220, 261.63, 329.63], [87.31, 174.61, 220, 261.63],
    [130.81, 261.63, 329.63, 392], [98, 196, 246.94, 293.66]
  ];
  function sched() {
    if (!ac || muted) { if (ac) nextT = Math.max(nextT, ac.currentTime); return; }
    const spb = 60 / 92 / 2; // תו שמיני
    while (nextT < ac.currentTime + 0.3) {
      const bar = Math.floor(step / 8) % 4, k = step % 8, ch = CH[bar], t = nextT;
      if (k === 0) {
        for (let i = 1; i < 4; i++) padNote(ch[i], t, spb * 8);
        bassNote(ch[0], t, spb * 3.5);
      }
      if (k === 4) bassNote(ch[0] * 1.5, t, spb * 1.5);
      const patt = [0, 2, 1, 3, 2, 1, 3, 2];
      const av = 0.03 + intensity * 0.06;
      if (intensity > 0.05 || step % 2 === 0) arpNote(ch[1 + (patt[k] % 3)] * 2, t, spb * 1.6, av);
      if (intensity > 0.55 && k % 2 === 0) arpNote(ch[1 + (patt[(k + 3) % 8] % 3)] * 4, t + spb * 0.5, spb, av * 0.55);
      if (intensity > 0.3 && k % 4 === 2) hat(t);
      if (k === 0 && intensity > 0.2) kick(t);
      step++; nextT += spb;
    }
    lp.frequency.setTargetAtTime(500 + intensity * 3800, ac.currentTime, 0.4);
  }
  function padNote(f, t, d) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + d * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(lp); o.start(t); o.stop(t + d + 0.1);
  }
  function bassNote(f, t, d) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(musicG); o.start(t); o.stop(t + d + 0.1);
  }
  function arpNote(f, t, d, v) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'square'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(lp); o.start(t); o.stop(t + d + 0.05);
  }
  function kick(t) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(0.28, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); g.connect(musicG); o.start(t); o.stop(t + 0.25);
  }
  function hat(t) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = ac.createGain(); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f); f.connect(g); g.connect(musicG); s.start(t); s.stop(t + 0.08);
  }

  const sfx = {
    click() { tone(720, 0.07, 'square', 0.08); },
    hover() { tone(980, 0.03, 'sine', 0.03); },
    type() { tone(1400 + Math.random() * 300, 0.02, 'square', 0.025); },
    step() { tone(80 + Math.random() * 20, 0.05, 'triangle', 0.05); },
    ok() { tone(660, 0.1, 'triangle', 0.16); tone(990, 0.18, 'triangle', 0.16, 0.09); },
    bad() { tone(190, 0.28, 'sawtooth', 0.14, 0, 70); noise(0.2, 0.1, 900, 200); },
    zap() { tone(1100, 0.12, 'square', 0.1, 0, 180); noise(0.1, 0.08, 4000, 800); },
    whoosh() { noise(0.6, 0.18, 200, 3500); },
    glitch() { for (let i = 0; i < 5; i++) noise(0.05, 0.12, 500 + Math.random() * 4000, 300 + Math.random() * 2000, i * 0.045); tone(90, 0.3, 'sawtooth', 0.1, 0, 40); },
    collect() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, 'triangle', 0.14, i * 0.07)); },
    win() { [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.28, 'triangle', 0.15, i * 0.1)); },
    power() { tone(70, 1.4, 'sawtooth', 0.12, 0, 900); noise(1.2, 0.08, 200, 5000); },
    boom() { noise(0.9, 0.3, 900, 60); tone(90, 0.6, 'sine', 0.3, 0, 30); },
    pop() { tone(500 + Math.random() * 400, 0.12, 'sine', 0.12, 0, 1400); },
    chargeStart() {
      if (!ac || muted || charge) return;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sawtooth'; o.frequency.value = 80; g.gain.value = 0.0001;
      o.connect(g); g.connect(sfxG); o.start(); charge = { o, g };
    },
    chargeSet(p) {
      if (!charge) return;
      charge.o.frequency.setTargetAtTime(80 + p * 900, ac.currentTime, 0.05);
      charge.g.gain.setTargetAtTime(0.02 + p * 0.1, ac.currentTime, 0.05);
    },
    chargeStop() {
      if (!charge) return;
      const c = charge; charge = null;
      c.g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.05);
      setTimeout(() => { try { c.o.stop(); } catch (e) { } }, 300);
    }
  };

  return {
    init, sfx,
    setIntensity(v) { intensity = Math.max(0, Math.min(1, v)); },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.85; },
    isMuted() { return muted; }
  };
})();
