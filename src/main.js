import "./style.css";
import * as THREE from "three";
import { SURFACES, STYLES, STROKES, STROKE_ORDER, DIFFICULTY, MATCH, HALF_L, BALL_R } from "./data.js";
import { Match, newInput, aimTargetFor, serveTargetFor } from "./game.js";
import { solveShot, gEff } from "./physics.js";
import { pointText, setsWon } from "./scoring.js";
import { makePlayer } from "./player.js";
import { buildStadium } from "./stadium.js";
import { audio, sfx, unlockAudio, setCrowd, vibrate } from "./audio.js";
import * as net from "./net.js";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
// ---------- ajustes guardados ----------
const DEF = { surface: "CLAY", style: "ALL", diff: "NORMAL", match: "SHORT", sound: true, vib: true, assist: true };
let cfg = DEF;
try { cfg = { ...DEF, ...JSON.parse(localStorage.getItem("pekatenis3d") || "{}") }; } catch (e) {}
const save = () => { try { localStorage.setItem("pekatenis3d", JSON.stringify(cfg)); } catch (e) {} };
audio.on = cfg.sound; audio.vib = cfg.vib;

// ---------- render ----------
const canvas = $("c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 300);
let scene = new THREE.Scene();
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = w / h < 1.2 ? 68 : w / h < 1.7 ? 56 : 48; camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize); resize();

let world = null; // escena del partido
function buildWorld(surfaceId, styles) {
  scene = new THREE.Scene();
  const surf = SURFACES[surfaceId];
  const stadium = buildStadium(scene, surf);
  const models = styles.map((s) => makePlayer(STYLES[s]));
  models.forEach((m, i) => { m.root.rotation.y = i === 0 ? 0 : Math.PI; scene.add(m.root); });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshStandardMaterial({ color: 0xd9ff00, emissive: 0x4a5a00, roughness: 0.5 }));
  scene.add(ball);
  const bshadow = new THREE.Mesh(new THREE.CircleGeometry(0.08, 14), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.35, depthWrite: false }));
  bshadow.rotation.x = -Math.PI / 2; scene.add(bshadow);
  const N = 48;
  const trajGeo = new THREE.BufferGeometry(); trajGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const traj = new THREE.Line(trajGeo, new THREE.LineDashedMaterial({ color: 0xd9ff00, dashSize: 0.35, gapSize: 0.2, transparent: true, opacity: 0.9, depthTest: false }));
  traj.frustumCulled = false; traj.renderOrder = 5; scene.add(traj);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.4, 28), new THREE.MeshBasicMaterial({ color: 0xd9ff00, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; scene.add(ring);
  const mark = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), new THREE.MeshBasicMaterial({ color: 0x3a1d10, transparent: true, opacity: 0.5, depthWrite: false }));
  mark.rotation.x = -Math.PI / 2; mark.position.y = 0.011; mark.scale.set(1, 1.8, 1); scene.add(mark);
  world = { surf, stadium, models, ball, bshadow, traj, trajGeo, ring, mark, N, camX: 0 };
}

// ---------- estado de la sesión ----------
let mode = null; // 'ai' | 'host' | 'guest' | 'demo'
let match = null, me = 0, view = null, link = null, paused = false, opts = null;
let localInput = newInput(); localInput.assist = cfg.assist;
let pendingEv = [], lastSend = 0, guestSeq = { shot: 0, tap: 0 }, names = ["Tú", "IA"];
const hostSeq = { shot: 0, tap: 0 };

function startMatch(o) {
  opts = o; mode = o.mode; me = o.me || 0; paused = false;
  buildWorld(o.surface, o.styles);
  localInput = newInput(); localInput.assist = cfg.assist;
  if (mode !== "guest") {
    match = new Match({ surface: o.surface, diff: o.diff, match: MATCH[o.match], styles: o.styles, ai: o.ai });
    match.players[me].input = localInput;
    if (params.has("demo")) match.players[0].input.assist = true;
  } else match = null;
  view = null;
  names = o.names;
  showScreen(null); $("hud").classList.remove("hidden"); document.body.classList.add("playing");
  buildShotButtons();
  unlockAudio(); setCrowd(0.05);
}
function stopMatch() {
  mode = null; match = null; view = null;
  if (link) { link.close(); link = null; }
  $("hud").classList.add("hidden"); document.body.classList.remove("playing");
  setCrowd(0); showScreen("menu");
}
function showScreen(id) { for (const s of ["menu", "online", "pause", "end"]) $(s).classList.toggle("hidden", s !== id); }

// ---------- controles ----------
function buildShotButtons() {
  const box = $("shots"); box.innerHTML = "";
  for (const id of STROKE_ORDER) {
    const b = document.createElement("button"); b.textContent = STROKES[id].name; b.dataset.s = id;
    b.classList.toggle("sel", localInput.stroke === id);
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); pressShot(id); });
    box.appendChild(b);
  }
}
function pressShot(id) {
  unlockAudio();
  localInput.stroke = id;
  for (const b of $("shots").children) b.classList.toggle("sel", b.dataset.s === id);
  if (mode === "guest") { guestSeq.shot++; link && link.send({ t: "shot", s: id, n: guestSeq.shot }); }
  else if (match) match.pressShot(me, id);
}
function pressServe() {
  unlockAudio();
  if (mode === "guest") { link && link.send({ t: "tap" }); }
  else if (match) match.players[me].input.serveTap = 1;
}
$("btnServe").addEventListener("pointerdown", (e) => { e.preventDefault(); pressServe(); });
// apuntar: posición del dedo/ratón sobre la pantalla (arriba = más profundo)
function aimAt(px, py) {
  const w = window.innerWidth, h = window.innerHeight;
  localInput.ax = Math.max(-1, Math.min(1, ((px / w) - 0.5) * 2.3));
  localInput.ad = Math.max(0, Math.min(1, 1 - (py / h - 0.12) / 0.55));
}
const aimpad = $("aimpad");
let aimDown = false;
aimpad.addEventListener("pointerdown", (e) => { aimDown = true; aimAt(e.clientX, e.clientY); unlockAudio(); });
aimpad.addEventListener("pointermove", (e) => { if (aimDown || e.pointerType === "mouse") aimAt(e.clientX, e.clientY); });
window.addEventListener("pointerup", () => { aimDown = false; });
// joystick
const joy = $("joy"), knob = $("joyKnob"); let joyId = null;
function joyMove(e) {
  const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2;
  let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
  knob.style.transform = `translate(${dx * R * 0.6}px, ${dy * R * 0.6}px)`;
  localInput.mx = dx; localInput.mz = -dy;
}
joy.addEventListener("pointerdown", (e) => { joyId = e.pointerId; joy.setPointerCapture(e.pointerId); joyMove(e); unlockAudio(); });
joy.addEventListener("pointermove", (e) => { if (e.pointerId === joyId) joyMove(e); });
const joyEnd = (e) => { if (e.pointerId === joyId) { joyId = null; localInput.mx = localInput.mz = 0; knob.style.transform = ""; } };
joy.addEventListener("pointerup", joyEnd); joy.addEventListener("pointercancel", joyEnd);
// teclado (PC)
const keys = {};
const KEYMAP = { KeyJ: "TOPSPIN", KeyK: "FLAT", KeyL: "SLICE", KeyU: "LOB", KeyI: "DROP", Digit1: "FLAT", Digit2: "TOPSPIN", Digit3: "SLICE", Digit4: "LOB", Digit5: "DROP" };
window.addEventListener("keydown", (e) => {
  if (!mode || e.repeat) { keys[e.code] = true; return; }
  keys[e.code] = true;
  if (KEYMAP[e.code]) pressShot(KEYMAP[e.code]);
  if (e.code === "Space") { e.preventDefault(); pressServe(); }
  if (e.code === "Escape") togglePause();
});
window.addEventListener("keyup", (e) => { keys[e.code] = false; });
function keyMove() {
  if (joyId !== null) return;
  const x = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
  const z = (keys.ArrowUp || keys.KeyW ? 1 : 0) - (keys.ArrowDown || keys.KeyS ? 1 : 0);
  localInput.mx = x; localInput.mz = z;
}
function togglePause() {
  if (!mode || mode === "demo") return;
  if (mode === "host" || mode === "guest") { showScreen(paused ? null : "pause"); paused = !paused; return; }
  paused = !paused; showScreen(paused ? "pause" : null);
}
$("btnPause").addEventListener("click", togglePause);
$("btnResume").addEventListener("click", togglePause);
$("btnQuit").addEventListener("click", () => { paused = false; stopMatch(); });
$("btnEndMenu").addEventListener("click", stopMatch);
$("btnAgain").addEventListener("click", () => { const o = opts; stopMatch(); startMatch(o); });

// ---------- menú ----------
function hex(c) { return "#" + c.toString(16).padStart(6, "0"); }
function renderMenu() {
  const sf = $("optSurface"); sf.innerHTML = "";
  for (const s of Object.values(SURFACES)) {
    const b = document.createElement("button"); b.className = "card" + (cfg.surface === s.id ? " sel" : "");
    b.innerHTML = `<b><span class="swatch" style="background:${hex(s.court)}"></span>${s.name}</b><small>${s.desc}</small>`;
    b.onclick = () => { cfg.surface = s.id; save(); sfx("ui"); renderMenu(); }; sf.appendChild(b);
  }
  const st = $("optStyle"); st.innerHTML = "";
  for (const s of Object.values(STYLES)) {
    const b = document.createElement("button"); b.className = "card" + (cfg.style === s.id ? " sel" : "");
    b.innerHTML = `<b><span class="swatch" style="background:${hex(s.shirt)}"></span>${s.name}</b><small>${s.spec}</small><div class="stats">Pot <i>${s.power}</i> Vel <i>${s.speed}</i> Efe <i>${s.spin}</i> <span>${s.serve} km/h</span></div>`;
    b.onclick = () => { cfg.style = s.id; save(); sfx("ui"); renderMenu(); }; st.appendChild(b);
  }
  const chips = (el, obj, key) => { el.innerHTML = ""; for (const o of Object.values(obj)) { const b = document.createElement("button"); b.className = "chip" + (cfg[key] === o.id ? " sel" : ""); b.textContent = o.name; b.onclick = () => { cfg[key] = o.id; save(); sfx("ui"); renderMenu(); }; el.appendChild(b); } };
  chips($("optDiff"), DIFFICULTY, "diff"); chips($("optMatch"), MATCH, "match");
  const tg = $("optToggles"); tg.innerHTML = "";
  for (const [k, label] of [["sound", "Sonido"], ["vib", "Vibración"], ["assist", "Asistencia de movimiento"]]) {
    const b = document.createElement("button"); b.className = "chip" + (cfg[k] ? " sel" : ""); b.textContent = `${label}: ${cfg[k] ? "sí" : "no"}`;
    b.onclick = () => { cfg[k] = !cfg[k]; audio.on = cfg.sound; audio.vib = cfg.vib; save(); renderMenu(); if (k === "vib" && cfg.vib) vibrate(40); }; tg.appendChild(b);
  }
}
renderMenu();
const rivalStyle = () => { const ids = Object.keys(STYLES).filter((s) => s !== cfg.style); return ids[(Math.random() * ids.length) | 0]; };
$("btnAI").addEventListener("click", () => {
  startMatch({ mode: "ai", surface: cfg.surface, diff: cfg.diff, match: cfg.match, styles: [cfg.style, rivalStyle()], ai: [false, true], me: 0, names: ["Tú", "IA " + DIFFICULTY[cfg.diff].name] });
});
$("btnOnline").addEventListener("click", () => { $("netStatus").textContent = ""; showScreen("online"); });
$("btnOnlineBack").addEventListener("click", () => { if (link) { link.close(); link = null; } showScreen("menu"); });
function netError(m) { $("netStatus").textContent = m; if (mode) { stopMatch(); showScreen("online"); $("netStatus").textContent = m; } }
$("btnHost").addEventListener("click", () => {
  if (link) link.close();
  const code = net.makeCode();
  $("netStatus").innerHTML = "Creando sala…";
  link = net.host(code, {
    status: () => { $("netStatus").innerHTML = `Comparte este código:<span class="code">${code}</span>Esperando rival…`; },
    connect: () => { link.send({ t: "hello", surface: cfg.surface, match: cfg.match, style: cfg.style, v: 1 }); },
    data: (d) => {
      if (d.t === "hello") {
        startMatch({ mode: "host", surface: cfg.surface, match: cfg.match, styles: [cfg.style, d.style], ai: [false, false], me: 0, diff: "NORMAL", names: ["Tú", "Rival"] });
        match.players[1].input.assist = true;
      } else if (d.t === "in" && match) Object.assign(match.players[1].input, { mx: d.mx, mz: d.mz, ax: d.ax, ad: d.ad, assist: d.as });
      else if (d.t === "shot" && match) match.pressShot(1, d.s);
      else if (d.t === "tap" && match) match.players[1].input.serveTap = 1;
    },
    close: () => netError("El rival se ha desconectado"),
    error: netError,
  });
  window.__code = code;
});
$("btnJoin").addEventListener("click", () => {
  const code = $("joinCode").value.trim().toUpperCase();
  if (code.length !== 4) { $("netStatus").textContent = "Escribe el código de 4 letras"; return; }
  if (link) link.close();
  $("netStatus").textContent = "Conectando…";
  link = net.join(code, {
    connect: () => { $("netStatus").textContent = "Conectado, esperando al anfitrión…"; },
    data: (d) => {
      if (d.t === "hello") {
        startMatch({ mode: "guest", surface: d.surface, match: d.match, styles: [d.style, cfg.style], ai: [false, false], me: 1, names: ["Rival", "Tú"] });
        link.send({ t: "hello", style: cfg.style });
      } else if (d.t === "s" && mode === "guest") { view = d; for (const e of d.ev) playEvent(e); }
      else if (d.t === "full") netError("La sala ya está llena");
    },
    close: () => netError("Se ha cortado la conexión con el anfitrión"),
    error: netError,
  });
});

// ---------- eventos de sonido/vibración ----------
function playEvent(e) {
  if (e.s === "hit") { sfx("hit", e.k); if (e.p === me) vibrate(28); }
  else if (e.s === "bounce") sfx("bounce", e.k);
  else if (e.s === "net") sfx("net");
  else if (e.s === "fault") sfx("fault");
  else if (e.s === "applause") { sfx("applause"); world && world.stadium.cheer(); if (e.w === me) vibrate([20, 40, 20]); }
}

// ---------- HUD ----------
let lastBoard = "";
function renderBoard(v) {
  const s = v.sc, pt = pointText(s);
  const rows = [0, 1].map((i) => {
    const sets = s.sets.map((g) => `<td>${g[i]}</td>`).join("");
    return `<tr><td class="n">${names[i]}${s.server === i ? '<span class="srv"></span>' : ""}</td>${sets}<td class="pt">${pt[i] || "&nbsp;"}</td></tr>`;
  }).join("");
  const html = `<table>${rows}</table><div class="surf">${world.surf.name} · ${world.surf.stadium}${s.tb ? " · Tie-break" : ""}${v.sn === 2 && (v.ph === "serve" || v.ph === "toss") ? " · 2º saque" : ""}</div>`;
  if (html !== lastBoard) { $("board").innerHTML = html; lastBoard = html; }
}
let endShown = false;
function renderHud(v) {
  renderBoard(v);
  const m = $("msg"); if (v.msg) { m.textContent = v.msg; m.classList.add("on"); } else m.classList.remove("on");
  const myServe = v.srv === me && (v.ph === "serve" || v.ph === "toss");
  $("btnServe").classList.toggle("hidden", !myServe);
  $("btnServe").textContent = v.ph === "toss" ? "¡GOLPEA!" : "SACAR";
  let hint = "";
  if (myServe) hint = v.ph === "serve" ? "Apunta en el cuadro de saque y pulsa SACAR" : "Pulsa otra vez arriba del todo";
  else if (v.ph === "flight" && v.hit !== me) hint = "Elige golpe cuando llegue la bola";
  $("hint").textContent = hint; $("hint").style.display = hint ? "" : "none";
  // botones de golpe resaltados si la bola está a tiro
  const ready = v.ph === "flight" && v.hit !== me && (!v.isv || v.bo > 0) && (() => { const b = v.b, p = v.p[me], s = me === 0 ? 1 : -1; const f = (p[1] - b[2]) * s; return b[2] * s > 0 && f > -0.7 && f < 3.5 && Math.abs(b[0] - p[0]) < 2.2; })();
  $("shots").classList.toggle("is-ready", !!ready);
  for (const b of $("shots").children) b.classList.toggle("ready", !!ready && b.dataset.s === localInput.stroke);
  if (v.ph === "over" && !endShown) {
    endShown = true;
    setTimeout(() => {
      if (!mode) return;
      const w = v.sc.winner === me; sfx(w ? "win" : "ooh");
      $("endTitle").textContent = w ? "¡Has ganado el partido!" : "Has perdido el partido";
      $("endScore").textContent = v.sc.sets.map((g) => me === 0 ? `${g[0]}-${g[1]}` : `${g[1]}-${g[0]}`).join("  ");
      const st = v.st[me];
      $("endStats").innerHTML = `Aces: ${st.aces} · Golpes ganadores: ${st.winners} · Errores: ${st.errors} · Dobles faltas: ${st.df}<br>Peloteo más largo: ${v.lg} golpes`;
      $("btnAgain").classList.toggle("hidden", mode !== "ai");
      showScreen("end");
    }, 1600);
  }
  if (v.ph !== "over") endShown = false;
}

// ---------- dibujar ----------
const tmpV = new THREE.Vector3();
function updateTrajectory(v) {
  const w = world, side = me === 0 ? 1 : -1, p = v.p[me];
  let show = false, start = null, tg = null, stroke = STROKES[localInput.stroke], hs = 0, arc = 1, spin = 0;
  if (v.srv === me && (v.ph === "serve" || v.ph === "toss")) {
    show = true; start = [p[0], 2.9, p[1] - side * 0.35]; tg = serveTargetFor(side, localInput, v.bx);
    const sty = STYLES[opts.styles[me]]; hs = (sty.serve / 3.6) * (v.sn === 1 ? 0.5 : 0.4); arc = v.sn === 1 ? 1 : 1.18; spin = v.sn === 1 ? 10 : 35;
  } else if (v.ph === "flight" && v.hit !== me) {
    show = true; tg = aimTargetFor(side, localInput, localInput.stroke);
    const fh = (v.b[0] - p[0]) * side >= 0;
    start = [p[0] + (fh ? 1 : -1) * side * 0.7, 1.0, p[1] - side * 0.3];
    const sty = STYLES[opts.styles[me]]; hs = 20 * stroke.speed * (0.68 + sty.power / 300); arc = stroke.arc; spin = stroke.spin * (sty.spin / 95);
  }
  w.traj.visible = w.ring.visible = show;
  if (!show) return;
  const s = solveShot(start[0], start[1], start[2], tg.x, tg.z, hs, arc, spin);
  const pos = w.trajGeo.attributes.position, g = gEff(spin);
  for (let i = 0; i < w.N; i++) {
    const t = (s.t * i) / (w.N - 1);
    pos.setXYZ(i, start[0] + s.vx * t, Math.max(BALL_R, start[1] + s.vy * t - 0.5 * g * t * t), start[2] + s.vz * t);
  }
  pos.needsUpdate = true; w.traj.computeLineDistances();
  w.ring.position.set(tg.x, 0.02, tg.z);
  w.traj.material.color.setHex(localInput.stroke === "FLAT" ? 0xffffff : localInput.stroke === "SLICE" ? 0x7fd6ff : localInput.stroke === "LOB" ? 0xffb703 : localInput.stroke === "DROP" ? 0xff8fab : 0xd9ff00);
}
function draw(v, dt, t) {
  const w = world;
  v.p.forEach((pp, i) => {
    const m = w.models[i];
    m.root.position.set(pp[0], 0, pp[1]);
    const st = m.st;
    if (pp[3]) { st.swing = pp[4]; st.kind = pp[3]; } else st.swing = -1;
    st.prep = pp[5]; st.prepKind = pp[6]; st.serving = !!pp[7]; st.toss = pp[8];
    m.update(dt, pp[2]);
  });
  w.ball.position.set(v.b[0], Math.max(v.b[1], 0.075), v.b[2]);
  w.bshadow.position.set(v.b[0], 0.012, v.b[2]);
  const hgt = Math.max(0, v.b[1]); w.bshadow.scale.setScalar(1 + hgt * 0.25); w.bshadow.material.opacity = Math.max(0.08, 0.4 - hgt * 0.06);
  if (v.mk) { w.mark.visible = true; w.mark.position.set(v.mk[0], 0.011, v.mk[1]); } else w.mark.visible = false;
  updateTrajectory(v);
  w.stadium.update(dt, t);
  // cámara detrás del jugador local
  const side = me === 0 ? 1 : -1, p = v.p[me];
  w.camX += (p[0] * 0.45 - w.camX) * Math.min(1, dt * 3);
  const aspect = camera.aspect;
  const back = aspect < 1.2 ? 10 : 7.6, up = aspect < 1.2 ? 6.5 : 4.9;
  camera.position.set(w.camX, up, side * (HALF_L + back));
  tmpV.set(w.camX * 0.4, 0.2, -side * 3.5); camera.lookAt(tmpV);
  if (params.get("cam") === "close") { camera.position.set(p[0] + 2.6, 1.5, p[1] - side * 2.4); camera.lookAt(p[0], 1.0, p[1]); }
  renderer.render(scene, camera);
}

// ---------- bucle ----------
let last = performance.now(), acc = 0, T = 0;
const speedMul = Number(params.get("speed") || 1);
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
  if (!mode) { idleRender(dt); return; }
  keyMove();
  if (mode === "guest") {
    if (now - lastSend > 50 && link) { lastSend = now; link.send({ t: "in", mx: localInput.mx, mz: localInput.mz, ax: localInput.ax, ad: localInput.ad, as: localInput.assist }); }
    if (view) { renderHud(view); draw(view, dt, T); }
    else renderer.render(scene, camera);
    return;
  }
  if (!paused || mode === "host") {
    acc += dt * speedMul; const h = 1 / 120; let n = 0;
    while (acc >= h && n < 60 * speedMul) { match.step(h); acc -= h; n++; }
  }
  const snap = match.snapshot();
  for (const e of snap.ev) { playEvent(e); pendingEv.push(e); }
  if (mode === "host" && link && now - lastSend > 33) { lastSend = now; link.send({ t: "s", ...snap, ev: pendingEv }); pendingEv = []; }
  if (mode !== "host") pendingEv = [];
  setCrowd(snap.ph === "flight" ? 0.025 : 0.06);
  renderHud(snap); draw(snap, dt, T);
}
// fondo del menú: estadio girando
let menuWorld = false, ang = 0;
function idleRender(dt) {
  if (!menuWorld) { buildWorld(cfg.surface, [cfg.style, "POWER"]); menuWorld = cfg.surface; world.traj.visible = world.ring.visible = false; world.ball.visible = false; world.bshadow.visible = false;
    world.models[0].root.position.set(1.5, 0, HALF_L - 1); world.models[1].root.position.set(-1.5, 0, -HALF_L + 1); }
  if (menuWorld !== cfg.surface) { menuWorld = false; return; }
  ang += dt * 0.08;
  camera.position.set(Math.sin(ang) * 22, 9, Math.cos(ang) * 22); camera.lookAt(0, 0, 0);
  world.models.forEach((m) => m.update(dt, 0)); world.stadium.update(dt, ang);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
window.__booted = true;
// ayudas para pruebas automáticas
window.__tenis = { get match() { return match; }, get mode() { return mode; }, get view() { return view; }, get me() { return me; }, startMatch, pressShot, pressServe, aimAt, cfg };
if (params.has("demo")) startMatch({ mode: "demo", surface: params.get("surface") || "CLAY", diff: "NORMAL", match: "SHORT", styles: ["ALL", "SPIN"], ai: [true, true], me: 0, names: ["IA 1", "IA 2"] });
