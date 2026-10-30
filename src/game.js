import { SURFACES, STYLES, STROKES, DIFFICULTY, HALF_L, HALF_W, DBL_W, SERVICE, BALL_R } from "./data.js";
import { stepBall, predict, solveShot } from "./physics.js";
import { newScore, pointTo, deuceSide } from "./scoring.js";
// Simulación del partido (la ejecuta el jugador local contra la IA, o el anfitrión en online).
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const randn = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.75;

export function newInput() { return { mx: 0, mz: 0, ax: 0, ad: 0.8, stroke: "TOPSPIN", shotT: -9, shotQ: 0, serveTap: 0, assist: true }; }

export function aimTargetFor(s, inp, strokeId) {
  const lx = clamp(inp.ax, -1, 1) * (HALF_W - 0.45), ld = clamp(inp.ad, 0, 1);
  let depth = 3 + ld * (HALF_L - 3.7);
  if (strokeId === "DROP") depth = 1.4 + ld * 2.2;
  if (strokeId === "LOB") depth = Math.max(depth, HALF_L - 2.2);
  return { x: s * lx, z: -s * depth };
}
export function serveTargetFor(s, inp, bs) {
  const u = (clamp(inp.ax, -1, 1) + 1) / 2;
  const localRight = s * bs > 0, w = HALF_W - 0.55;
  const ax = localRight ? 0.3 + u * w : -(0.3 + (1 - u) * w);
  const depth = SERVICE - 0.55 - (1 - clamp(inp.ad, 0, 1)) * 1.8;
  return { x: s * ax, z: -s * depth };
}

export class Match {
  constructor(o) {
    this.surf = SURFACES[o.surface]; this.diff = DIFFICULTY[o.diff || "NORMAL"];
    this.score = newScore(o.match);
    this.t = 0;
    this.players = [0, 1].map((i) => ({
      i, side: i === 0 ? 1 : -1, style: STYLES[o.styles[i]], isAI: !!o.ai[i], x: 0, z: 0, vx: 0, vz: 0, tx: 0, tz: 0,
      input: newInput(), aiPlan: null, aiNext: 0, swing: null, prep: 0, prepKind: "fh", serving: false, toss: 0, speed: 0,
    }));
    this.ball = { x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0, spin: 0 };
    this.stats = [{ aces: 0, df: 0, winners: 0, errors: 0 }, { aces: 0, df: 0, winners: 0, errors: 0 }];
    this.hits = [0, 0]; this.points = []; this.events = []; this.msg = ""; this.msgT = 0; this.longest = 0;
    this.serveNum = 1;
    this.startPoint();
  }
  say(m, t = 1.8) { this.msg = m; this.msgT = t; }
  emit(e) { this.events.push(e); }
  get server() { return this.players[this.score.server]; }
  get receiver() { return this.players[1 - this.score.server]; }
  startPoint() {
    const sv = this.server, rc = this.receiver, d = deuceSide(this.score);
    const stand = d ? 1 : -1;
    sv.x = sv.side * stand * 0.9; sv.z = sv.side * (HALF_L + 0.35);
    rc.x = sv.x > 0 ? -2.4 : 2.4; rc.z = rc.side * (HALF_L + 0.9);
    this.boxSign = sv.x > 0 ? -1 : 1;
    for (const p of this.players) { p.vx = p.vz = 0; p.tx = p.x; p.tz = p.z; p.serving = p === sv; p.toss = 0; p.swing = null; p.prep = 0; p.aiPlan = null; }
    this.phase = "serve"; this.phaseT = 0; this.hitter = sv.i; this.isServe = true; this.bounces = 0; this.rally = 0;
    this.holdBall();
  }
  holdBall() { const sv = this.server; Object.assign(this.ball, { x: sv.x - sv.side * 0.25, y: 1.0, z: sv.z - sv.side * 0.2, vx: 0, vy: 0, vz: 0, spin: 0, cord: false, inNet: false, rolling: false }); }
  toss() {
    const sv = this.server; if (this.phase !== "serve") return;
    this.phase = "toss"; this.phaseT = 0;
    Object.assign(this.ball, { x: sv.x + sv.side * 0.25 * 0 - sv.side * 0.05, y: 1.55, z: sv.z - sv.side * 0.35, vx: 0, vy: 5.2, vz: 0 });
  }
  aimTarget(p, strokeId) { return aimTargetFor(p.side, p.input, strokeId); }
  serveTarget(p) { return serveTargetFor(p.side, p.input, this.boxSign); }
  hitServe(q) {
    const sv = this.server, b = this.ball, st = sv.style;
    q = clamp(q, 0.15, 1);
    const first = this.serveNum === 1;
    const tg = this.serveTarget(sv);
    const err = first ? 0.3 + (1 - q) * 1.9 : 0.12 + (1 - q) * 0.9;
    const ex = randn() * err * 0.7, ez = randn() * err;
    const hs = (st.serve / 3.6) * (first ? 0.5 : 0.4) * (0.72 + 0.28 * q) * (sv.isAI ? this.diff.power : 1);
    const v = solveShot(b.x, b.y, b.z, tg.x + ex, tg.z + ez * 0.8 + (q < 0.4 ? -sv.side * 0.6 * (0.4 - q) * 2 : 0), hs, first ? 1.0 : 1.18, first ? 10 : 35);
    Object.assign(b, { vx: v.vx, vy: v.vy, vz: v.vz, spin: v.spin, cord: false, inNet: false, rolling: false });
    this.phase = "flight"; this.phaseT = 0; this.hitter = sv.i; this.isServe = true; this.bounces = 0;
    sv.serving = false; sv.swing = { kind: "sv", t: 0.42 };
    this.emit({ s: "hit", k: 0.8 + 0.3 * q, p: sv.i, st: "SERVE" });
  }
  canHit(p) {
    const b = this.ball;
    if (this.phase !== "flight" || this.hitter === p.i || b.inNet) return false;
    if (this.isServe && this.bounces === 0) return false;
    const s = p.side;
    if (b.z * s <= 0.2 || b.vz * s <= 0) return false;
    const f = (p.z - b.z) * s;
    const reach = 1.35 + p.style.speed / 100 * 0.3;
    return f > -0.7 && f < 1.8 && Math.abs(b.x - p.x) < reach && b.y > 0.07 && b.y < 2.7;
  }
  hit(p, strokeId, q) {
    const b = this.ball, st = STROKES[strokeId], sty = p.style, s = p.side;
    const ai = p.isAI ? this.diff : null;
    const tg = this.aimTarget(p, strokeId);
    const err = (0.45 + (1 - clamp(q, 0, 1)) * 2.4) * st.risk * (ai ? ai.err : 1) * (b.y < 0.3 ? 1.4 : 1);
    tg.x += randn() * err * 0.75; tg.z += randn() * err;
    let hs = 20 * st.speed * (0.68 + sty.power / 300) * (ai ? ai.power : 1);
    if (strokeId === "FLAT") hs *= 0.95 + sty.power / 1000;
    const spin = st.spin * (sty.spin / 95);
    const y0 = Math.max(b.y, 0.25);
    const v = solveShot(b.x, y0, b.z, tg.x, tg.z, hs, st.arc, spin);
    Object.assign(b, { y: y0, vx: v.vx, vy: v.vy, vz: v.vz, spin: v.spin, cord: false, inNet: false, rolling: false });
    this.hits[p.i]++; this.hitter = p.i; this.isServe = false; this.bounces = 0; this.rally++; this.phaseT = 0;
    p.swing = { kind: (b.x - p.x) * s >= 0 ? "fh" : "bh", t: 0.42 }; p.prep = 0;
    this.emit({ s: "hit", k: 0.55 + st.speed * 0.4, p: p.i, st: strokeId });
    for (const o of this.players) o.aiPlan = null;
    const opp = this.players[1 - p.i]; opp.aiNext = this.t + (opp.isAI ? this.diff.react : 0);
  }
  pointWon(w, why) {
    if (this.phase === "point" || this.phase === "over") return;
    const before = JSON.stringify(this.score.sets);
    pointTo(this.score, w);
    this.points.push({ w, why });
    this.longest = Math.max(this.longest, this.rally);
    this.phase = "point"; this.phaseT = 0; this.serveNum = 1;
    const after = this.score.sets;
    let extra = "";
    if (this.score.winner >= 0) { this.phase = "over"; }
    else if (JSON.stringify(after) !== before) extra = after.length > JSON.parse(before).length ? " · ¡Set!" : " · Juego";
    this.say(why + extra, 2.2);
    this.emit({ s: "applause", w });
  }
  fault(why) {
    if (this.serveNum === 1) {
      this.serveNum = 2; this.say(why, 1.3); this.phase = "fault"; this.phaseT = 0; this.emit({ s: "fault" });
    } else {
      this.stats[this.server.i].df++;
      this.pointWon(this.receiver.i, "Doble falta");
    }
  }
  onBounce(e) {
    const hz = this.players[this.hitter].side, side = e.z > 0 ? 1 : -1;
    this.emit({ s: "bounce", k: Math.min(1, Math.abs(this.ball.vy) / 6 + 0.3) });
    const opp = 1 - this.hitter;
    if (this.isServe && this.bounces === 0) {
      const inBox = side !== hz && Math.abs(e.z) <= SERVICE + BALL_R && Math.abs(e.x) <= HALF_W + BALL_R && e.x * this.boxSign >= -BALL_R;
      if (!inBox) return this.fault(this.ball.inNet || side === hz ? "¡Red! Falta" : "Falta");
      if (this.ball.cord) { this.say("Let: repite el saque", 1.3); this.phase = "fault"; this.phaseT = 0; return; }
      this.bounces = 1; this.mark(e); return;
    }
    if (this.bounces === 0) {
      if (side === hz) { this.stats[this.hitter].errors++; return this.pointWon(opp, this.ball.inNet ? "A la red" : "No pasa la red"); }
      if (Math.abs(e.x) > HALF_W + BALL_R || Math.abs(e.z) > HALF_L + BALL_R) { this.stats[this.hitter].errors++; this.emit({ s: "out" }); return this.pointWon(opp, "¡Fuera!"); }
      this.bounces = 1; this.mark(e); return;
    }
    this.secondBounce();
  }
  mark(e) { this.lastMark = { x: e.x, z: e.z, t: this.t }; }
  secondBounce() {
    const h = this.hitter;
    if (this.isServe) { this.stats[h].aces++; return this.pointWon(h, "¡Ace!"); }
    this.stats[h].winners++;
    this.pointWon(h, this.rally > 8 ? "¡Puntazo!" : "¡Ganador!");
  }
  intercept(p) {
    const s = p.side, b = this.ball;
    if (this.phase !== "flight" || this.hitter === p.i) return null;
    const pts = predict(b, this.surf, 3.2, 1 / 60);
    let best = null;
    const needBounce = this.isServe && this.bounces === 0;
    for (const c of pts) {
      if (c.z * s <= 0.5) continue;
      if (needBounce && c.bounces < 1) continue;
      if (c.bounces >= 2) break;
      const after = c.bounces >= 1 || this.bounces >= 1;
      const volley = !after && Math.abs(p.z) < 6.5 && Math.abs(c.z) < 7.5 && c.y > 0.5 && c.y < 1.9;
      if ((after && c.y > 0.3 && c.y < 1.7) || volley) { best = c; break; }
      if (Math.abs(c.z) > HALF_L + 4.5) break;
    }
    if (!best) best = pts[pts.length - 1];
    return best;
  }
  movePlayer(p, dt) {
    const s = p.side, inp = p.input, maxV = (4.6 + p.style.speed / 100 * 2.6) * (p.isAI ? this.diff.speed : 1);
    let wx = 0, wz = 0, manual = Math.hypot(inp.mx, inp.mz) > 0.15 && !p.isAI;
    if (this.phase === "flight" && (manual || p.isAI || inp.assist) && !(p.isAI && this.t < p.aiNext)) {
      if (manual) { wx = s * inp.mx; wz = -s * inp.mz; }
      else {
        if (!p.aiPlan || this.t - p.aiPlan.at > 0.25) {
          const c = this.intercept(p);
          let tx, tz;
          if (c) {
            const fh = (c.x - p.x) * s > -0.35;
            tx = c.x - (fh ? 1 : -1) * s * 0.72; tz = c.z + s * 0.25;
          } else { // recuperar posición
            const net = p.style.id === "VOLLEY" && p.isAI && this.rally % 3 === 2;
            tx = this.ball.x * 0.35; tz = s * (net ? 3.2 : HALF_L + 0.6);
          }
          p.aiPlan = { tx, tz, at: this.t };
        }
        const dx = p.aiPlan.tx - p.x, dz = p.aiPlan.tz - p.z, d = Math.hypot(dx, dz);
        if (d > 0.08) { const k = Math.min(1, d / 0.6); wx = (dx / d) * k; wz = (dz / d) * k; }
      }
    }
    const len = Math.hypot(wx, wz); if (len > 1) { wx /= len; wz /= len; }
    const acc = 22, slide = this.surf.slide;
    p.vx += (wx * maxV - p.vx) * Math.min(1, dt * acc * (wx ? 1 : 1 - slide * 0.6));
    p.vz += (wz * maxV - p.vz) * Math.min(1, dt * acc * (wz ? 1 : 1 - slide * 0.6));
    p.x = clamp(p.x + p.vx * dt, -DBL_W - 3.5, DBL_W + 3.5);
    p.z += p.vz * dt;
    if (p.z * s < 0.7) p.z = s * 0.7;
    if (p.z * s > HALF_L + 5) p.z = s * (HALF_L + 5);
    p.speed = Math.hypot(p.vx, p.vz);
  }
  aiShot(p) {
    const b = this.ball, opp = this.players[1 - p.i];
    const oppAtNet = Math.abs(opp.z) < 5;
    const r = Math.random(); let st;
    const style = p.style.id;
    if (b.y > 1.6 && Math.abs(p.z) < 8) st = "FLAT";
    else if (oppAtNet && r < 0.3) st = "LOB";
    else if (!oppAtNet && Math.abs(opp.z) > HALF_L && r < (style === "ALL" ? 0.14 : 0.06)) st = "DROP";
    else { const r2 = Math.random(); st = style === "POWER" ? (r2 < 0.5 ? "FLAT" : r2 < 0.85 ? "TOPSPIN" : "SLICE") : style === "SPIN" ? (r2 < 0.7 ? "TOPSPIN" : r2 < 0.85 ? "FLAT" : "SLICE") : style === "VOLLEY" ? (r2 < 0.4 ? "SLICE" : r2 < 0.75 ? "TOPSPIN" : "FLAT") : (r2 < 0.5 ? "TOPSPIN" : r2 < 0.75 ? "FLAT" : "SLICE"); }
    // apunta lejos del rival
    const oppLocal = opp.x * p.side;
    p.input.ax = clamp((oppLocal > 0 ? -1 : 1) * (0.3 + Math.random() * 0.65), -0.95, 0.95);
    p.input.ad = 0.55 + Math.random() * 0.45;
    return st;
  }
  step(dt) {
    this.t += dt; this.phaseT += dt;
    if (this.msgT > 0) this.msgT -= dt;
    const b = this.ball;
    for (const p of this.players) {
      this.movePlayer(p, dt);
      if (p.swing) { p.swing.t += dt / (p.swing.kind === "sv" ? 0.7 : 0.55); if (p.swing.t >= 1) p.swing = null; }
    }
    if (this.phase === "serve") {
      this.holdBall();
      const sv = this.server;
      if (sv.isAI && this.phaseT > 1.1) this.toss();
      else if (!sv.isAI && sv.input.serveTap > 0) { sv.input.serveTap = 0; this.toss(); }
      return;
    }
    if (this.phase === "toss") {
      const sv = this.server;
      b.vy -= 9.81 * dt; b.y += b.vy * dt; sv.toss = Math.min(1, sv.toss + dt * 4);
      if (sv.isAI) { if (b.vy <= 0) this.hitServe(1 - Math.random() * 0.35 * this.diff.err); }
      else if (sv.input.serveTap > 0) { sv.input.serveTap = 0; this.hitServe(1 - Math.abs(b.y - 2.93) / 0.9); }
      if (this.phase === "toss" && b.y < 1.25 && b.vy < 0) { this.phase = "serve"; this.phaseT = 0.4; sv.toss = 0; }
      return;
    }
    if (this.phase === "fault") { if (this.phaseT > 1.2) { this.startPoint(); } return; }
    if (this.phase === "point") { if (this.phaseT > 2.2) this.startPoint(); return; }
    if (this.phase === "over") return;
    // vuelo
    const ev = [];
    const was = b.rolling;
    stepBall(b, dt, this.surf, ev);
    for (const e of ev) {
      if (e.type === "bounce") this.onBounce(e);
      else if (e.type === "net" || e.type === "netcord") this.emit({ s: "net" });
      if (this.phase !== "flight") return;
    }
    if (b.rolling && !was && this.phase === "flight") { // la bola muere
      const side = b.z > 0 ? 1 : -1;
      if (side === this.players[this.hitter].side) return this.pointWon(1 - this.hitter, "No pasa la red");
      return this.secondBounce();
    }
    if (this.phaseT > 9) return this.pointWon(1 - this.hitter, "Punto");
    // golpes
    for (const p of this.players) {
      const can = this.canHit(p);
      // preparación visual
      const incoming = this.phase === "flight" && this.hitter !== p.i && b.vz * p.side > 0 && Math.abs(b.z - p.z) < 7;
      p.prep += ((incoming ? 1 : 0) - p.prep) * Math.min(1, dt * 6);
      p.prepKind = (b.x - p.x) * p.side >= 0 ? "fh" : "bh";
      if (!can) continue;
      if (p.isAI) {
        const f = (p.z - b.z) * p.side;
        if (f < 0.35 || (b.vy < 0 && b.y < 0.5)) { const stretch = Math.max(0, Math.abs(b.x - p.x) - 0.8) * 0.5 + (b.y < 0.4 ? 0.2 : 0) + Math.max(0, Math.hypot(b.vx, b.vz) - 17) * 0.04 + p.speed * 0.03; this.hit(p, this.aiShot(p), 1 - Math.random() * 0.45 - stretch); }
      } else if (this.t - p.input.shotT < 0.4) {
        p.input.shotT = -9; this.hit(p, p.input.stroke, p.input.shotQ);
      }
      if (this.phase !== "flight") return;
    }
  }
  // pulsación de golpe: calidad según lo cerca que esté la bola del punto ideal
  pressShot(i, strokeId) {
    const p = this.players[i], b = this.ball;
    p.input.stroke = strokeId; p.input.shotT = this.t;
    let q = 0.35;
    if (this.phase === "flight" && b.vz * p.side > 0) {
      const ta = ((p.z - b.z) * p.side) / Math.max(1, Math.abs(b.vz));
      q = clamp(1 - Math.abs(ta - 0.05) / 0.45, 0.15, 1);
    }
    p.input.shotQ = q;
  }
  snapshot() {
    const b = this.ball;
    const ev = this.events; this.events = [];
    return {
      b: [b.x, b.y, b.z, b.vx, b.vy, b.vz, b.spin, b.inNet ? 1 : 0, b.cord ? 1 : 0],
      p: this.players.map((p) => [p.x, p.z, p.speed, p.swing ? p.swing.kind : "", p.swing ? p.swing.t : -1, p.prep, p.prepKind, p.serving ? 1 : 0, p.toss]),
      ph: this.phase, sc: this.score, msg: this.msgT > 0 ? this.msg : "", ev, hit: this.hitter, srv: this.score.server, sn: this.serveNum, isv: this.isServe ? 1 : 0, bo: this.bounces, bx: this.boxSign,
      mk: this.lastMark && this.t - this.lastMark.t < 1.5 ? [this.lastMark.x, this.lastMark.z] : null,
      st: this.stats, lg: this.longest,
    };
  }
}
