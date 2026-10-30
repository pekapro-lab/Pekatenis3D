// Audio procedural (WebAudio, sin archivos). Cadena: voces -> bus -> filtro anti-agudos -> compresor/limitador -> volumen -> salida.
export const audio = { on: true, vol: 0.7, vib: true, surface: "CLAY" };
let ctx = null, out = null, master = null, crowd = null, noiseW = null, noiseP = null;

function makeNoise(c, secs, pink) {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * secs), c.sampleRate), d = b.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (!pink) { d[i] = w; continue; }
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
  }
  return b;
}
// Construye la cadena de salida en cualquier contexto (también OfflineAudioContext).
function buildChain(c) {
  const bus = c.createGain(); bus.gain.value = 0.9;
  const hs = c.createBiquadFilter(); hs.type = "highshelf"; hs.frequency.value = 5000; hs.gain.value = -6; // menos agudos chillones
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 9000; lp.Q.value = 0.5;
  const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 70; // el altavoz del móvil no da graves: evita distorsión
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 12; comp.attack.value = 0.002; comp.release.value = 0.18;
  const vol = c.createGain();
  bus.connect(hs); hs.connect(lp); lp.connect(hp); hp.connect(comp); comp.connect(vol); vol.connect(c.destination);
  return { bus, vol, noiseW: makeNoise(c, 1.5, false), noiseP: makeNoise(c, 4, true) };
}
function init() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  try { ctx = new AC({ latencyHint: "interactive" }); } catch (e) { ctx = new AC(); }
  const ch = buildChain(ctx); out = ch.bus; master = ch.vol; noiseW = ch.noiseW; noiseP = ch.noiseP;
  applyVolume();
  // ambiente del público: ruido rosa filtrado, muy bajo y con vaivén lento
  const src = ctx.createBufferSource(); src.buffer = noiseP; src.loop = true;
  const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 180;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1100;
  crowd = ctx.createGain(); crowd.gain.value = 0;
  const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.13; lfoG.gain.value = 0.25;
  const swell = ctx.createGain(); swell.gain.value = 1; lfo.connect(lfoG); lfoG.connect(swell.gain); lfo.start();
  src.connect(hp); hp.connect(lp); lp.connect(swell); swell.connect(crowd); crowd.connect(out); src.start();
  return true;
}
function applyVolume() { if (master) master.gain.setTargetAtTime(audio.on ? audio.vol * 1.1 : 0, ctx.currentTime, 0.05); }
export function setVolume(v) { audio.vol = v; audio.on = v > 0; applyVolume(); }
export function setSurface(id) { audio.surface = id; }
export function unlockAudio() {
  if (!init()) return;
  if (ctx.state !== "running") ctx.resume().catch(() => {});
}
// Android WebView: reanudar en el primer toque y al volver a la app
for (const ev of ["pointerdown", "touchstart", "touchend", "mousedown", "keydown"]) document.addEventListener(ev, unlockAudio, { capture: true, passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden && ctx) ctx.resume().catch(() => {}); });
export function setCrowd(level) { if (ctx && crowd) crowd.gain.setTargetAtTime(level, ctx.currentTime, 0.6); }

// ---------- síntesis (funciona sobre un contexto y salida cualquiera) ----------
function env(c, g, t, a, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur); }
function burst(S, t, { dur, type = "bandpass", f, q = 1, gain, attack = 0.001, f2, pink = false }) {
  const c = S.c, s = c.createBufferSource(); s.buffer = pink ? S.noiseP : S.noiseW;
  const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = c.createGain(); env(c, g, t, attack, gain, dur);
  s.connect(fl); fl.connect(g); g.connect(S.out); s.start(t, Math.random() * 0.8); s.stop(t + attack + dur + 0.05);
}
function partial(S, t, { f, dur, gain, type = "sine", f2, attack = 0.001 }) {
  const c = S.c, o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = c.createGain(); env(c, g, t, attack, gain, dur); o.connect(g); g.connect(S.out); o.start(t); o.stop(t + attack + dur + 0.05);
}
const HIT = { // brillo, cuerpo, roce (cepillado del liftado/cortado)
  FLAT: { f: 2000, body: 1.0, brush: 0, g: 1.0 }, TOPSPIN: { f: 1700, body: 0.85, brush: 0.5, g: 0.9 },
  SLICE: { f: 1300, body: 0.7, brush: 0.6, g: 0.75 }, LOB: { f: 1500, body: 0.6, brush: 0.3, g: 0.6 },
  DROP: { f: 1200, body: 0.45, brush: 0.2, g: 0.45 }, SERVE: { f: 2100, body: 1.15, brush: 0.15, g: 1.1 },
};
function synth(S, name, k = 1, o = {}, t = S.c.currentTime + 0.005) {
  k = Math.max(0.25, Math.min(1.2, k));
  const r = (a) => 1 + (Math.random() - 0.5) * a;
  switch (name) {
    case "hit": { // "pok" de raqueta: chasquido filtrado corto + resonancia del cordaje/marco
      const h = HIT[o.stroke] || HIT.TOPSPIN, g = 0.5 * h.g * k;
      burst(S, t, { dur: 0.018, f: h.f * r(0.15), q: 0.9, gain: g * 0.9 });
      burst(S, t, { dur: 0.05, type: "lowpass", f: 900, q: 0.7, gain: g * 0.35 });
      partial(S, t, { f: 520 * r(0.06), f2: 470, dur: 0.06, gain: g * 0.32 * h.body, type: "triangle" });
      partial(S, t, { f: 190 * r(0.05), f2: 150, dur: 0.08, gain: g * 0.4 * h.body });
      partial(S, t, { f: 1250 * r(0.05), dur: 0.025, gain: g * 0.08 });
      if (h.brush) burst(S, t + 0.004, { dur: 0.05, f: 2600, f2: 1400, q: 1.6, gain: g * 0.12 * h.brush });
      break;
    }
    case "bounce": {
      const g = 0.32 * k, sf = o.surface || audio.surface;
      if (sf === "HARD") { // seco y nítido
        burst(S, t, { dur: 0.016, f: 1500, q: 1.1, gain: g * 0.75 });
        partial(S, t, { f: 240, f2: 170, dur: 0.05, gain: g * 0.5 });
      } else if (sf === "CLAY") { // blando y apagado, con arrastre de arcilla
        burst(S, t, { dur: 0.04, type: "lowpass", f: 650, q: 0.7, gain: g * 0.6 });
        partial(S, t, { f: 140, f2: 100, dur: 0.06, gain: g * 0.45 });
        burst(S, t + 0.01, { dur: 0.07, f: 2200, q: 0.8, gain: g * 0.06, pink: true });
      } else { // hierba: muy amortiguado
        burst(S, t, { dur: 0.035, type: "lowpass", f: 420, q: 0.6, gain: g * 0.5 });
        partial(S, t, { f: 115, f2: 85, dur: 0.05, gain: g * 0.35 });
      }
      break;
    }
    case "net": // golpe sordo contra la red + vibración de la cinta
      burst(S, t, { dur: 0.16, type: "lowpass", f: 380, q: 0.8, gain: 0.5 });
      partial(S, t, { f: 95, f2: 70, dur: 0.18, gain: 0.25 });
      for (let i = 0; i < 4; i++) burst(S, t + 0.02 + i * 0.025, { dur: 0.02, f: 900, q: 2, gain: 0.05 / (i + 1) });
      break;
    case "applause": { // muchas palmas cortas con envolvente de densidad + murmullo de ánimo
      const n = Math.round(70 * k), len = 2.4;
      for (let i = 0; i < n; i++) {
        const u = Math.pow(Math.random(), 1.6), dt = u * len;
        const dens = Math.max(0.15, 1 - dt / len);
        burst(S, t + dt, { dur: 0.012 + Math.random() * 0.02, f: 900 + Math.random() * 1500, q: 1.2, gain: 0.22 * dens * (0.6 + Math.random() * 0.4) });
      }
      burst(S, t, { dur: 1.6, f: 520, q: 0.7, gain: 0.16 * k, attack: 0.25, pink: true });
      break;
    }
    case "ooh":
      burst(S, t, { dur: 0.9, f: 420, f2: 330, q: 1.2, gain: 0.09, attack: 0.2, pink: true });
      break;
    case "fault": // aviso de juez de línea: dos tonos suaves
    case "out":
      partial(S, t, { f: 659, dur: 0.18, gain: 0.07, attack: 0.01 });
      partial(S, t + 0.17, { f: 523, dur: 0.28, gain: 0.07, attack: 0.01 });
      break;
    case "ui": partial(S, t, { f: 880, dur: 0.05, gain: 0.05, type: "triangle" }); break;
    case "win": [523, 659, 784, 1047].forEach((f, i) => partial(S, t + i * 0.13, { f, dur: 0.3, gain: 0.07, type: "triangle", attack: 0.01 })); break;
  }
}
export function sfx(name, k = 1, o = {}) {
  if (!audio.on || !ctx || ctx.state !== "running") return;
  synth({ c: ctx, out, noiseW, noiseP }, name, k, o);
}
export function vibrate(ms) { try { if (audio.vib !== false && navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(ms); } catch (e) {} }

// Render offline a WAV (para revisar los sonidos). seq: [{t, name, k, o}]
export async function renderOffline(seq, secs, crowdLevel = 0) {
  const sr = 44100, c = new OfflineAudioContext(1, Math.ceil(sr * secs), sr);
  const ch = buildChain(c); ch.vol.gain.value = 0.77;
  const S = { c, out: ch.bus, noiseW: ch.noiseW, noiseP: ch.noiseP };
  if (crowdLevel) {
    const src = c.createBufferSource(); src.buffer = ch.noiseP; src.loop = true;
    const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 180;
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1100;
    const g = c.createGain(); g.gain.value = crowdLevel; src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(ch.bus); src.start();
  }
  for (const e of seq) synth(S, e.name, e.k ?? 1, e.o || {}, e.t + 0.01);
  const buf = await c.startRendering(), d = buf.getChannelData(0);
  let peak = 0; for (const v of d) peak = Math.max(peak, Math.abs(v));
  const ab = new ArrayBuffer(44 + d.length * 2), v = new DataView(ab), w = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + d.length * 2, true); w(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, d.length * 2, true);
  for (let i = 0; i < d.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 32767, true);
  let bin = ""; const u8 = new Uint8Array(ab); for (let i = 0; i < u8.length; i += 8192) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
  return { b64: btoa(bin), peak };
}
