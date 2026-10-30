import { NET_H, BALL_R, DBL_W } from "./data.js";
// Física de la bola: gravedad + efecto (liftado cae antes, cortado flota), botes según superficie.
export const G = 9.81;
export const gEff = (spin) => G + Math.max(-3.5, Math.min(4.5, spin * 0.065));

// Avanza la bola dt segundos. Devuelve eventos {type:'bounce'|'net'|'netcord', x, z}
export function stepBall(b, dt, surf, events) {
  const pz = b.z;
  b.vy -= gEff(b.spin) * dt;
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  if ((pz > 0) !== (b.z > 0) && pz !== 0 && Math.abs(b.x) < DBL_W + 0.9) {
    if (b.y < NET_H + BALL_R) {
      if (b.y > NET_H - 0.1 && !b.cord) { // toca la cinta y pasa
        b.cord = true; b.vz *= 0.45; b.vx *= 0.6; b.vy = Math.abs(b.vy) * 0.25 + 0.9; events && events.push({ type: "netcord" });
      } else { // a la red
        b.z = pz > 0 ? 0.05 : -0.05; b.vz = -b.vz * 0.12; b.vx *= 0.3; b.vy = Math.min(b.vy, 0); b.inNet = true; events && events.push({ type: "net" });
      }
    }
  }
  if (b.y <= BALL_R && b.vy < 0) {
    b.y = BALL_R;
    const e = Math.min(0.92, 0.7 * surf.bounce);
    const sp = b.spin * surf.grip;
    b.vy = -b.vy * e * (1 + Math.max(-0.25, Math.min(0.2, sp * 0.004)));
    const k = surf.retain * (1 + Math.max(-0.25, Math.min(0.18, sp * 0.003)));
    b.vx *= k; b.vz *= k;
    b.spin *= 0.4;
    if (b.vy < 0.4) { b.vy = 0; b.rolling = true; b.vx *= 0.98; b.vz *= 0.98; }
    events && events.push({ type: "bounce", x: b.x, z: b.z });
  }
}
// Simula hacia delante (sin efectos colaterales) devolviendo muestras cada dt
export function predict(b, surf, secs = 3, dt = 1 / 60) {
  const c = { ...b }; const out = []; const ev = [];
  let bounces = 0;
  for (let t = 0; t < secs; t += dt) {
    ev.length = 0; stepBall(c, dt, surf, ev);
    for (const e of ev) if (e.type === "bounce") bounces++;
    out.push({ t: t + dt, x: c.x, y: c.y, z: c.z, vz: c.vz, bounces });
    if (bounces >= 2 || c.inNet) break;
  }
  return out;
}
// Calcula la velocidad para que la bola bote en (tx,tz) con el golpe dado, asegurando pasar la red.
export function solveShot(x0, y0, z0, tx, tz, hspeed, arc, spin) {
  const dx = tx - x0, dz = tz - z0, d = Math.hypot(dx, dz) || 0.1;
  const g = gEff(spin);
  let t = (d / hspeed) * arc;
  let vy = 0;
  for (let i = 0; i < 40; i++) {
    vy = (BALL_R - y0 + 0.5 * g * t * t) / t;
    const tn = Math.abs(z0) / Math.abs(dz / t);
    const yn = y0 + vy * tn - 0.5 * g * tn * tn;
    if (Math.abs(dz) < 0.01 || (z0 > 0) === (tz > 0) || yn > NET_H + 0.22) break;
    t *= 1.05;
  }
  return { vx: dx / t, vy, vz: dz / t, spin, t };
}
