// Marcador real de tenis: 15-30-40, iguales/ventaja, juegos, sets y tie-break.
export function newScore(cfg) {
  return { cfg: { sets: cfg.sets, games: cfg.games }, sets: [[0, 0]], pts: [0, 0], tb: false, winner: -1, server: 0, tbFirst: 0 };
}
const setsToWin = (s) => Math.ceil(s.cfg.sets / 2);
export function setsWon(s) {
  const w = [0, 0];
  for (const [a, b] of s.sets) { const g = s.cfg.games; if (setDone(a, b, g)) w[a > b ? 0 : 1]++; }
  return w;
}
function setDone(a, b, g) {
  const hi = Math.max(a, b), lo = Math.min(a, b);
  return (hi >= g && hi - lo >= 2) || (hi === g + 1 && lo === g);
}
export function pointTo(s, p) {
  if (s.winner >= 0) return s;
  const o = 1 - p;
  s.pts[p]++;
  const cur = s.sets[s.sets.length - 1];
  let gameWon = false;
  if (s.tb) {
    if (s.pts[p] >= 7 && s.pts[p] - s.pts[o] >= 2) gameWon = true;
    else {
      // en el tie-break cambia el saque tras el 1er punto y luego cada 2
      const n = s.pts[0] + s.pts[1];
      if (n % 2 === 1) s.server = 1 - s.server;
    }
  } else if (s.pts[p] >= 4 && s.pts[p] - s.pts[o] >= 2) gameWon = true;
  if (!gameWon) return s;
  cur[p]++;
  const wasTb = s.tb;
  s.pts = [0, 0];
  s.tb = false;
  s.server = wasTb ? 1 - s.tbFirst : 1 - s.server;
  const g = s.cfg.games;
  if (setDone(cur[0], cur[1], g)) {
    const w = setsWon(s);
    if (w[p] >= setsToWin(s)) { s.winner = p; return s; }
    s.sets.push([0, 0]);
  } else if (cur[0] === g && cur[1] === g) {
    s.tb = true; s.tbFirst = s.server;
  }
  return s;
}
const NAMES = ["0", "15", "30", "40"];
export function pointText(s) {
  const [a, b] = s.pts;
  if (s.tb) return [String(a), String(b)];
  if (a >= 3 && b >= 3) {
    if (a === b) return ["Iguales", ""];
    return a > b ? ["Ventaja", ""] : ["", "Ventaja"];
  }
  return [NAMES[Math.min(a, 3)], NAMES[Math.min(b, 3)]];
}
// Lado de saque: true = lado de iguales (derecha del que saca)
export const deuceSide = (s) => (s.pts[0] + s.pts[1]) % 2 === 0;
export function isBreakOrSetPoint(s) { return false; }
