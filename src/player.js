import * as THREE from "three";
// Tenista con proporciones humanas (~7,5 cabezas), construido con primitivas y animado por articulaciones.
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

function mat(c, rough = 0.7) { return new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0 }); }
function limb(len, rTop, rBot, m) {
  const g = new THREE.CylinderGeometry(rTop, rBot, len, 10); g.translate(0, -len / 2, 0);
  const mesh = new THREE.Mesh(g, m); return mesh;
}
function joint(r, m) { return new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), m); }

export function makePlayer(style) {
  const skin = mat(style.skin, 0.6), shirt = mat(style.shirt), accent = mat(style.accent), shorts = mat(0xf2f2f2),
    shoe = mat(0xffffff, 0.5), sock = mat(0xffffff), hairM = mat(style.hair, 0.9), sole = mat(style.accent);
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body); // se agacha y gira
  const pelvis = new THREE.Group(); pelvis.position.y = 0.95; body.add(pelvis);
  const hipMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.16, 0.2, 12), shorts); hipMesh.position.y = 0.0; pelvis.add(hipMesh);
  const legs = [];
  for (const s of [1, -1]) {
    const hip = new THREE.Group(); hip.position.set(0.095 * s, -0.04, 0); pelvis.add(hip);
    const short = limb(0.22, 0.085, 0.075, shorts); hip.add(short);
    const thigh = limb(0.44, 0.072, 0.052, skin); hip.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -0.44; hip.add(knee); knee.add(joint(0.052, skin));
    const shin = limb(0.42, 0.05, 0.035, skin); knee.add(shin);
    const sk = limb(0.12, 0.038, 0.036, sock); sk.position.y = -0.28; knee.add(sk);
    const ankle = new THREE.Group(); ankle.position.y = -0.43; knee.add(ankle);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.27), shoe); foot.position.set(0, -0.025, -0.06); ankle.add(foot);
    const sl = new THREE.Mesh(new THREE.BoxGeometry(0.102, 0.02, 0.272), sole); sl.position.set(0, -0.065, -0.06); ankle.add(sl);
    legs.push({ hip, knee });
  }
  const spine = new THREE.Group(); spine.position.y = 0.08; pelvis.add(spine);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.5, 14), shirt); torso.position.y = 0.25; torso.scale.z = 0.62; spine.add(torso);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.202, 0.19, 0.06, 14), accent); stripe.position.y = 0.36; stripe.scale.z = 0.63; spine.add(stripe);
  const neck = limb(0.09, 0.045, 0.05, skin); neck.position.y = 0.58; spine.add(neck);
  const head = new THREE.Group(); head.position.y = 0.7; spine.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 12), skin); skull.scale.set(0.9, 1.12, 1); head.add(skull);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM); hair.position.y = 0.02; hair.scale.set(0.95, 1.1, 1.05); head.add(hair);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 6, 20), accent); band.rotation.x = Math.PI / 2; band.position.y = 0.035; band.scale.set(0.95, 1.05, 1); head.add(band);
  for (const s of [1, -1]) { const eye = joint(0.012, mat(0x222222)); eye.position.set(0.035 * s, 0.01, -0.095); head.add(eye); }
  const nose = joint(0.016, skin); nose.position.set(0, -0.02, -0.105); head.add(nose);
  const arms = [];
  for (const s of [1, -1]) {
    const sh = new THREE.Group(); sh.position.set(0.24 * s, 0.47, 0); spine.add(sh);
    sh.add(joint(0.065, shirt));
    const sleeve = limb(0.14, 0.066, 0.058, shirt); sh.add(sleeve);
    const upper = limb(0.3, 0.05, 0.04, skin); sh.add(upper);
    const elbow = new THREE.Group(); elbow.position.y = -0.3; sh.add(elbow); elbow.add(joint(0.04, skin));
    const fore = limb(0.26, 0.04, 0.032, skin); elbow.add(fore);
    const wb = limb(0.05, 0.037, 0.037, accent); wb.position.y = -0.2; elbow.add(wb);
    const hand = joint(0.042, skin); hand.position.y = -0.29; elbow.add(hand);
    arms.push({ sh, elbow });
  }
  // raqueta en la mano derecha, prolongando el antebrazo
  const racket = new THREE.Group(); racket.position.y = -0.29; arms[0].elbow.add(racket);
  const grip = limb(0.2, 0.017, 0.015, mat(0x222222)); racket.add(grip);
  const throat = limb(0.1, 0.012, 0.02, mat(style.accent, 0.4)); throat.position.y = -0.2; racket.add(throat);
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 6, 24), mat(style.shirt === 0xffffff ? 0x333333 : 0x222831, 0.35));
  frame.scale.set(0.8, 1.05, 1); frame.position.y = -0.43; racket.add(frame);
  const strings = new THREE.Mesh(new THREE.CircleGeometry(0.125, 20), new THREE.MeshStandardMaterial({ color: 0xf1f1e0, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  strings.scale.set(0.8, 1.05, 1); strings.position.y = -0.43; racket.add(strings);
  root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  // sombra simple
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.28, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012; shadow.scale.set(1, 0.7, 1); root.add(shadow);

  const st = { run: 0, speed: 0, swing: -1, kind: "fh", prep: 0, prepKind: "fh", toss: 0, serving: false };
  // poses de golpe: [t, torsoYaw, shX, shZ, elbow, wristRacketX, leftShZ, leftShX]
  const FH = [[0, 0, 0.3, 0.3, -0.3], [0.3, -1.25, 0.1, 1.2, -0.4], [0.5, 0.2, 0.6, 1.25, -0.15], [0.75, 1.15, 1.6, 0.7, -1.4], [1, 0.3, 0.4, 0.3, -0.4]];
  const BH = [[0, 0, 0.3, 0.3, -0.3], [0.3, 1.3, 0.6, -0.5, -0.5], [0.5, 0.0, 1.0, -0.1, -0.1], [0.75, -1.1, 1.8, 0.4, -0.9], [1, -0.2, 0.4, 0.3, -0.4]];
  const SV = [[0, 0, 0.3, 0.3, -0.3], [0.3, -0.6, -0.5, 2.6, -1.8], [0.5, 0.0, 2.3, 0.6, -0.1], [0.75, 0.5, 1.2, 0.2, -0.6], [1, 0, 0.3, 0.3, -0.4]];
  function sample(keys, t) {
    let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
    const a = keys[i], b = keys[i + 1]; const u = ease(Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0]))));
    return a.map((v, k) => lerp(v, b[k], u));
  }
  function update(dt, speed) {
    st.speed = lerp(st.speed, speed, Math.min(1, dt * 10));
    const moving = Math.min(1, st.speed / 5);
    st.run += dt * (5 + st.speed * 1.6);
    const ph = st.run;
    // piernas
    const crouch = 0.08 + 0.05 * moving;
    legs.forEach((l, i) => {
      const s = Math.sin(ph + i * Math.PI);
      l.hip.rotation.x = -0.25 * (1 - moving) * 0.5 + s * 0.75 * moving - 0.15;
      l.knee.rotation.x = 0.35 * (1 - moving) * 0.6 + Math.max(0, -Math.sin(ph + i * Math.PI + 0.6)) * 1.2 * moving + 0.25;
    });
    pelvis.position.y = 0.95 - crouch + Math.abs(Math.sin(ph)) * 0.04 * moving;
    spine.rotation.x = -0.12 - 0.15 * moving;
    head.rotation.x = 0.1 + 0.12 * moving;
    // brazos base
    let pose;
    if (st.swing >= 0) {
      st.swing += dt / (st.kind === "sv" ? 0.7 : 0.55);
      pose = sample(st.kind === "fh" ? FH : st.kind === "bh" ? BH : SV, Math.min(1, st.swing));
      if (st.swing >= 1) st.swing = -1;
    } else if (st.serving) {
      pose = sample(SV, 0.3 * st.toss);
    } else {
      const base = [0, 0, 0.35 + Math.sin(ph) * 0.4 * moving, 0.3, -0.5];
      const pk = st.prepKind === "fh" ? FH : BH;
      const prep = sample(pk, 0.3);
      pose = base.map((v, k) => lerp(v, prep[k], ease(st.prep)));
    }
    spine.rotation.y = pose[1];
    arms[0].sh.rotation.set(pose[2], 0, pose[3]);
    arms[0].elbow.rotation.x = pose[4];
    // brazo izquierdo: equilibrio, revés a dos manos o lanzamiento de bola
    const L = arms[1];
    if (st.kind === "bh" && st.swing >= 0) { L.sh.rotation.set(pose[2], 0, -pose[3] * -1 - 0.2); L.elbow.rotation.x = pose[4]; }
    else if (st.serving || (st.kind === "sv" && st.swing >= 0 && st.swing < 0.4)) { L.sh.rotation.set(0.3, 0, -2.7 * (st.serving ? st.toss : 1)); L.elbow.rotation.x = -0.1; }
    else { L.sh.rotation.set(-Math.sin(ph) * 0.4 * moving + (st.prep * 0.6), 0, -0.25 - st.prep * 0.5); L.elbow.rotation.x = -0.6; }
  }
  function swing(kind) { st.kind = kind; st.swing = 0.42; st.serving = false; }
  return { root, st, update, swing };
}
