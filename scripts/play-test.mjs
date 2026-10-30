// Prueba con Playwright: menú, partido contra la IA (golpes, saque, marcador) y modo demo.
import { chromium } from "playwright";
const URL = process.env.URL || "http://127.0.0.1:4173/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 780, height: 360 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await p.goto(URL); await p.waitForTimeout(2500);
await p.screenshot({ path: "shots/menu.png" });
await p.goto(URL + "?speed=2"); await p.waitForTimeout(1500); await p.click("#btnAI"); await p.waitForTimeout(1500);
// bucle de juego automático: saca y golpea cuando la bola llega
const t0 = Date.now(); let shotsPressed = 0, serves = 0, pts = 0, lastPts = "";
let shot = 0, lastPress = 0;
while (Date.now() - t0 < 50000) {
  const st = await p.evaluate(() => { const m = __tenis.match; const pl = m.players[0]; return { ph: m.phase, srv: m.score.server, hit: m.hitter, can: m.ball.vz > 0 && m.ball.z > 0 && (pl.z - m.ball.z) < 5 && (!m.isServe || m.bounces > 0), bz: m.ball.z, by: m.ball.y, sets: JSON.stringify(m.score.sets), pts: JSON.stringify(m.score.pts) }; });
  if (st.srv === 0 && (st.ph === "serve")) { await p.tap("#btnServe"); await p.waitForTimeout(470); await p.tap("#btnServe"); serves++; }
  else if (st.ph === "flight" && st.hit === 1 && st.can && Date.now() - lastPress > 400) { lastPress = Date.now(); const ids = ["TOPSPIN", "FLAT", "SLICE", "TOPSPIN", "LOB"]; await p.locator(`#shots button[data-s=${ids[shot++ % 5]}]`).dispatchEvent("pointerdown"); shotsPressed++; }
  if (st.sets + st.pts !== lastPts) { pts++; lastPts = st.sets + st.pts; }
  if (shotsPressed === 3 && !globalThis.shotTaken) { globalThis.shotTaken = 1; await p.screenshot({ path: "shots/rally.png" }); }
  await p.waitForTimeout(25);
}
await p.screenshot({ path: "shots/partido.png" });
const fin = await p.evaluate(() => ({ sets: __tenis.match.score.sets, pts: __tenis.match.score.pts, stats: __tenis.match.stats, longest: __tenis.match.longest, hits: __tenis.match.hits, points: __tenis.match.points, board: document.getElementById("board").innerText }));
console.log({ serves, shotsPressed, scoreChanges: pts, ...fin });
// trayectoria visible al sacar
await p.goto(URL + "?demo=1&surface=GRASS&speed=1"); await p.waitForTimeout(4000); await p.screenshot({ path: "shots/demo-hierba.png" });
await p.goto(URL + "?demo=1&surface=HARD"); await p.waitForTimeout(4000); await p.screenshot({ path: "shots/demo-dura.png" });
await p.goto(URL + "?demo=1&speed=8"); await p.waitForTimeout(25000);
console.log("demo x8:", await p.evaluate(() => ({ ph: __tenis.match.phase, sets: __tenis.match.score.sets })));
await p.screenshot({ path: "shots/demo-fin.png" });
console.log("errores:", errs);
await b.close();
