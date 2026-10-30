// Simula partidos IA contra IA sin gráficos y comprueba que el juego avanza con reglas coherentes.
import { Match } from "../src/game.js";
import { pointText } from "../src/scoring.js";
const surfaces = ["HARD", "CLAY", "GRASS"]; let bad = 0;
for (const surface of surfaces) {
  const m = new Match({ surface, diff: process.env.D || "NORMAL", match: { sets: 1, games: 4 }, styles: ["ALL", "SPIN"], ai: [true, true] });
  const why = {}; let rallies = [], last = "", t = 0;
  while (m.phase !== "over" && t < 3600) {
    m.step(1 / 120); t += 1 / 120;
    if (m.msgT > 0 && m.msg !== last) { const k = m.msg.split(" ·")[0]; why[k] = (why[k] || 0) + 1; last = m.msg; }
    if (m.msgT <= 0) last = "";
    if (m.phase === "point" && m.phaseT < 1 / 100) rallies.push(m.rally);
  }
  const avg = rallies.length ? (rallies.reduce((a, b) => a + b, 0) / rallies.length).toFixed(1) : 0;
  console.log(surface, "fin:", m.phase, "sets", JSON.stringify(m.score.sets), "ganador", m.score.winner, `tiempo ${(t / 60).toFixed(1)} min`, "rally medio", avg, "máx", m.longest, why, "stats", JSON.stringify(m.stats));
  if (m.phase !== "over") bad++;
}
process.exit(bad ? 1 : 0);
