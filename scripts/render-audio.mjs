// Renderiza muestras de sonido offline (OfflineAudioContext) a WAV para revisarlas.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const OUT = process.env.OUT || "/workspace/tenis-ci/audio";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto(process.env.URL || "http://127.0.0.1:4173/"); await p.waitForFunction(() => window.__tenis);
const S = ["FLAT", "TOPSPIN", "SLICE", "LOB", "DROP", "SERVE"];
const samples = {
  "golpes-raqueta": S.map((s, i) => ({ t: i * 0.6, name: "hit", k: 1, o: { stroke: s } })),
  "botes-dura-tierra-hierba": ["HARD", "CLAY", "GRASS"].flatMap((sf, i) => [0, 0.35].map((d) => ({ t: i * 1.0 + d, name: "bounce", k: 0.9, o: { surface: sf } }))),
  "red": [{ t: 0, name: "net" }],
  "aplausos-punto": [{ t: 0, name: "applause" }],
  "juez-fuera": [{ t: 0, name: "out" }],
  "peloteo-tierra-con-publico": [0, 0.75, 1.5, 2.25, 3.0].flatMap((t, i) => [{ t, name: "hit", k: 0.95, o: { stroke: i % 2 ? "TOPSPIN" : "FLAT" } }, { t: t + 0.45, name: "bounce", k: 0.8, o: { surface: "CLAY" } }]).concat([{ t: 3.9, name: "out" }, { t: 4.3, name: "applause" }]),
};
for (const [name, seq] of Object.entries(samples)) {
  const dur = Math.max(...seq.map((e) => e.t)) + (name.includes("aplausos") || name.includes("peloteo") ? 2.8 : 0.8);
  const r = await p.evaluate(([seq, dur, crowd]) => window.__tenis.renderOffline(seq, dur, crowd), [seq, dur, name.includes("publico") ? 0.035 : 0]);
  writeFileSync(`${OUT}/${name}.wav`, Buffer.from(r.b64, "base64"));
  console.log(name.padEnd(28), `pico ${(20 * Math.log10(r.peak)).toFixed(1)} dBFS`, `${dur.toFixed(1)} s`);
}
await b.close();
