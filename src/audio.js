// Todos los sonidos se generan con WebAudio (sin archivos).
let ctx = null, master = null, crowdGain = null, noiseBuf = null;
export const audio = { on: true };
function init() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // murmullo del público: ruido filtrado en bucle
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 600; bp.Q.value = 0.6;
  crowdGain = ctx.createGain(); crowdGain.gain.value = 0.0;
  src.connect(bp); bp.connect(crowdGain); crowdGain.connect(master); src.start();
  return true;
}
export function unlockAudio() { if (init() && ctx.state === "suspended") ctx.resume(); }
export function setCrowd(level) { if (ctx && crowdGain) crowdGain.gain.setTargetAtTime(audio.on ? level : 0, ctx.currentTime, 0.4); }
function noise(dur, freq, q, gain, type = "bandpass", delay = 0) {
  const t = ctx.currentTime + delay;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}
function tone(freq, dur, gain, type = "sine", delay = 0, slideTo = 0) {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
export function sfx(name, strength = 1) {
  if (!audio.on || !ctx) return;
  const k = Math.max(0.2, Math.min(1.2, strength));
  switch (name) {
    case "hit": noise(0.09, 1800, 1.2, 0.9 * k); tone(420, 0.07, 0.35 * k, "triangle", 0, 260); break;
    case "bounce": noise(0.06, 500, 1.5, 0.5 * k); tone(160, 0.06, 0.25 * k, "sine", 0, 90); break;
    case "net": noise(0.18, 300, 0.7, 0.6); break;
    case "applause": for (let i = 0; i < 26; i++) noise(0.08, 1500 + Math.random() * 2500, 1.5, 0.12 + Math.random() * 0.12, "bandpass", Math.random() * 1.6); break;
    case "ooh": tone(220, 0.8, 0.07, "sawtooth", 0, 180); noise(0.8, 400, 0.8, 0.12, "lowpass"); break;
    case "fault": tone(880, 0.12, 0.12, "square"); tone(660, 0.18, 0.12, "square", 0.13); break;
    case "ui": tone(700, 0.05, 0.1, "triangle"); break;
    case "win": [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 0.15, "triangle", i * 0.12)); break;
  }
}
export function vibrate(ms) { try { if (audio.vib !== false && navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(ms); } catch (e) {} }
