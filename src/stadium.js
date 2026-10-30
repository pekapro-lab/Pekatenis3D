import * as THREE from "three";
import { HALF_L, HALF_W, DBL_W, SERVICE, NET_H } from "./data.js";

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function buildStadium(scene, surface) {
  const g = new THREE.Group(); scene.add(g);
  const night = surface.id === "HARD";
  scene.background = new THREE.Color(night ? 0x0b1630 : 0x8fc4ec);
  scene.fog = new THREE.Fog(scene.background, 60, 140);
  scene.add(new THREE.HemisphereLight(night ? 0xbfd4ff : 0xffffff, 0x445533, night ? 1.4 : 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, night ? 1.4 : 2.2); sun.position.set(-12, 30, 8); scene.add(sun);
  // suelo exterior y pista
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(40, 60), new THREE.MeshStandardMaterial({ color: surface.apron, roughness: 0.95 }));
  apron.rotation.x = -Math.PI / 2; g.add(apron);
  const tex = canvasTex(256, 512, (x, w, h) => {
    x.fillStyle = "#" + surface.court.toString(16).padStart(6, "0"); x.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? "0,0,0" : "255,255,255"},${Math.random() * 0.06})`; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    if (surface.id === "GRASS") for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"; x.fillRect(0, (i * h) / 12, w, h / 12); }
  });
  const court = new THREE.Mesh(new THREE.PlaneGeometry(DBL_W * 2 + 3, HALF_L * 2 + 8), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
  court.rotation.x = -Math.PI / 2; court.position.y = 0.003; g.add(court);
  // líneas
  const lm = new THREE.MeshBasicMaterial({ color: surface.line });
  const line = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lm); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.008, z); g.add(m); };
  const lw = 0.06;
  for (const s of [1, -1]) {
    line(0, s * HALF_L, DBL_W * 2, lw * 1.5); // fondo
    line(s * HALF_W, 0, lw, HALF_L * 2); line(s * DBL_W, 0, lw, HALF_L * 2);
    line(0, s * SERVICE, HALF_W * 2, lw);
    line(0, s * (HALF_L - 0.1), lw, 0.2); // marca central
  }
  line(0, 0, lw, SERVICE * 2);
  // red
  const netTex = canvasTex(256, 32, (x, w, h) => {
    x.clearRect(0, 0, w, h); x.strokeStyle = "rgba(20,20,20,0.85)"; x.lineWidth = 1;
    for (let i = 0; i <= w; i += 4) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); }
    for (let j = 0; j <= h; j += 4) { x.beginPath(); x.moveTo(0, j); x.lineTo(w, j); x.stroke(); }
  });
  netTex.wrapS = THREE.RepeatWrapping; netTex.repeat.set(6, 1);
  const net = new THREE.Mesh(new THREE.PlaneGeometry(DBL_W * 2 + 1.8, NET_H), new THREE.MeshBasicMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  net.position.set(0, NET_H / 2, 0); g.add(net);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(DBL_W * 2 + 1.8, 0.06, 0.02), new THREE.MeshStandardMaterial({ color: 0xffffff })); tape.position.y = NET_H; g.add(tape);
  for (const s of [1, -1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.07, 8), new THREE.MeshStandardMaterial({ color: 0x1c3d2a, metalness: 0.3 }));
    post.position.set(s * (DBL_W + 0.9), 0.535, 0); g.add(post);
  }
  // gradas con público (instanciado)
  const standMat = new THREE.MeshStandardMaterial({ color: night ? 0x1e2a44 : 0x2f4f6f, roughness: 0.9 });
  const fans = [];
  const addStand = (cx, cz, len, rotY) => {
    const grp = new THREE.Group(); grp.position.set(cx, 0, cz); grp.rotation.y = rotY; g.add(grp);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(len, 1.2, 0.3), new THREE.MeshStandardMaterial({ color: 0x14532d })); wall.position.set(0, 0.6, 0); grp.add(wall);
    for (let r = 0; r < 10; r++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(len, 0.55, 0.9), standMat); step.position.set(0, 1.0 + r * 0.55, -0.6 - r * 0.9); grp.add(step);
      for (let k = -len / 2 + 0.4; k < len / 2 - 0.3; k += 0.62) if (Math.random() < 0.88) fans.push({ grp, x: k + (Math.random() - 0.5) * 0.15, y: 1.27 + r * 0.55, z: -0.75 - r * 0.9 });
    }
  };
  addStand(0, -HALF_L - 6.5, 34, 0); addStand(0, HALF_L + 7.5, 34, Math.PI);
  addStand(-DBL_W - 6, 0, 40, Math.PI / 2); addStand(DBL_W + 6, 0, 40, -Math.PI / 2);
  const geo = new THREE.BoxGeometry(0.36, 0.5, 0.3); geo.translate(0, 0.25, 0);
  const headGeo = new THREE.SphereGeometry(0.11, 8, 6); headGeo.translate(0, 0.62, 0);
  const fm = new THREE.MeshLambertMaterial(), hm = new THREE.MeshLambertMaterial();
  const bodies = new THREE.InstancedMesh(geo, fm, fans.length), heads = new THREE.InstancedMesh(headGeo, hm, fans.length);
  const tmp = new THREE.Object3D(), col = new THREE.Color(), v = new THREE.Vector3();
  const palette = [0xe63946, 0xf1faee, 0x457b9d, 0xffb703, 0x2a9d8f, 0xf4a261, 0x8338ec, 0xffffff, 0x222222, 0x06d6a0];
  const skins = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];
  const base = [];
  fans.forEach((f, i) => {
    v.set(f.x, f.y, f.z); f.grp.updateMatrixWorld(); v.applyMatrix4(f.grp.matrixWorld);
    tmp.position.copy(v); tmp.rotation.set(0, f.grp.rotation.y, 0); tmp.updateMatrix();
    bodies.setMatrixAt(i, tmp.matrix); heads.setMatrixAt(i, tmp.matrix);
    bodies.setColorAt(i, col.setHex(palette[(Math.random() * palette.length) | 0]));
    heads.setColorAt(i, col.setHex(skins[(Math.random() * skins.length) | 0]));
    base.push({ p: v.clone(), r: f.grp.rotation.y, ph: Math.random() * 6 });
  });
  g.add(bodies, heads);
  // focos
  if (night) for (const [x, z] of [[-18, -20], [18, -20], [-18, 20], [18, 20]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 16, 8), new THREE.MeshStandardMaterial({ color: 0x333a44 })); pole.position.set(x, 8, z); g.add(pole);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.4), new THREE.MeshBasicMaterial({ color: 0xfffbe0 })); lamp.position.set(x * 0.97, 16, z * 0.97); lamp.lookAt(0, 0, 0); g.add(lamp);
  }
  // silla de árbitro
  const chair = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.2, 0.6), new THREE.MeshStandardMaterial({ color: 0x0f5132 })); chair.position.set(DBL_W + 1.6, 1.1, 0); g.add(chair);
  let cheer = 0;
  function update(dt, t) {
    cheer = Math.max(0, cheer - dt * 0.6);
    if (cheer <= 0 && update.idle) return;
    update.idle = cheer <= 0;
    base.forEach((b, i) => {
      const jump = cheer > 0 ? Math.max(0, Math.sin(t * 9 + b.ph)) * 0.25 * cheer : 0;
      tmp.position.set(b.p.x, b.p.y + jump, b.p.z); tmp.rotation.set(0, b.r, 0); tmp.updateMatrix();
      bodies.setMatrixAt(i, tmp.matrix); heads.setMatrixAt(i, tmp.matrix);
    });
    bodies.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
  }
  return { group: g, update, cheer: () => { cheer = 1; update.idle = false; } };
}
