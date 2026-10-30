// Prueba online: dos navegadores, uno crea sala y el otro se une con el código (PeerJS).
import { chromium } from "playwright";
const URL = process.env.URL || "http://127.0.0.1:4173/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const mk = async () => { const c = await b.newContext({ viewport: { width: 780, height: 360 }, hasTouch: true }); const p = await c.newPage(); p.on("pageerror", (e) => console.log("pageerror", e.message)); await p.goto(URL); return p; };
const h = await mk(), g = await mk();
await h.click("#btnOnline"); await h.click("#btnHost");
await h.waitForFunction(() => /Comparte/.test(document.getElementById("netStatus").innerText), null, { timeout: 30000 });
const code = await h.evaluate(() => window.__code); console.log("código sala:", code);
await h.screenshot({ path: "shots/online-sala.png" });
await g.click("#btnOnline"); await g.fill("#joinCode", code); await g.click("#btnJoin");
await g.waitForFunction(() => __tenis.mode === "guest" && __tenis.view, null, { timeout: 30000 });
console.log("conectado. host:", await h.evaluate(() => __tenis.mode), "guest:", await g.evaluate(() => __tenis.mode));
// el anfitrión saca; el invitado devuelve
await h.waitForTimeout(1500);
await h.tap("#btnServe"); await h.waitForTimeout(470); await h.tap("#btnServe");
let guestPress = 0;
for (let i = 0; i < 160; i++) {
  const v = await g.evaluate(() => { const v = __tenis.view; return { ph: v.ph, hit: v.hit, bz: v.b[2], vz: v.b[5], bo: v.bo, isv: v.isv, pz: v.p[1][1], sc: JSON.stringify(v.sc.pts) }; });
  if (v.ph === "flight" && v.hit === 0 && v.bz < 0 && v.vz < 0 && (v.isv ? v.bo > 0 : true) && Math.abs(v.pz - v.bz) < 5) { await g.locator("#shots button[data-s=TOPSPIN]").dispatchEvent("pointerdown"); guestPress++; await g.waitForTimeout(300); }
  const hv = await h.evaluate(() => ({ ph: __tenis.match.phase, srv: __tenis.match.score.server }));
  if (hv.ph === "serve" && hv.srv === 0) { await h.tap("#btnServe"); await h.waitForTimeout(470); await h.tap("#btnServe"); }
  if (hv.ph === "flight") { const can = await h.evaluate(() => { const m = __tenis.match; return m.hitter === 1 && m.ball.vz > 0 && m.ball.z > 0 && m.players[0].z - m.ball.z < 5; }); if (can) { await h.locator("#shots button[data-s=FLAT]").dispatchEvent("pointerdown"); await h.waitForTimeout(300); } }
  if (i === 40) { await g.screenshot({ path: "shots/online-invitado.png" }); await h.screenshot({ path: "shots/online-anfitrion.png" }); }
  await g.waitForTimeout(60);
}
const res = await h.evaluate(() => ({ hits: __tenis.match.hits, points: __tenis.match.points, score: __tenis.match.score.sets, pts: __tenis.match.score.pts }));
const gb = await g.evaluate(() => document.getElementById("board").innerText);
console.log("pulsaciones invitado:", guestPress, "resultado host:", JSON.stringify(res), "\nmarcador invitado:", gb.replace(/\n/g, " | "));
await b.close();
