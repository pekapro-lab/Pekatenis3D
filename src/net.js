import Peer from "peerjs";
// Online por PeerJS (servidor público gratuito de PeerJS solo para el emparejamiento; el juego va P2P).
const PREFIX = "pekatenis3d-";
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const makeCode = () => Array.from({ length: 4 }, () => ALPHA[(Math.random() * ALPHA.length) | 0]).join("");
const ERR = { "peer-unavailable": "No existe ninguna sala con ese código", "unavailable-id": "Ese código ya está en uso, prueba otra vez", network: "Sin conexión con el servidor", "server-error": "El servidor de emparejamiento no responde", "browser-incompatible": "Este navegador no permite jugar online" };
export function host(code, on) {
  const peer = new Peer(PREFIX + code, { debug: 0 });
  let conn = null;
  peer.on("open", () => on.status && on.status("open"));
  peer.on("connection", (c) => {
    if (conn) { c.on("open", () => { c.send({ t: "full" }); setTimeout(() => c.close(), 300); }); return; }
    conn = c;
    c.on("open", () => on.connect && on.connect(c));
    c.on("data", (d) => on.data && on.data(d));
    c.on("close", () => on.close && on.close());
    c.on("error", () => on.close && on.close());
  });
  peer.on("error", (e) => on.error && on.error(ERR[e.type] || "Error de conexión (" + e.type + ")"));
  return { peer, send: (m) => conn && conn.open && conn.send(m), close: () => { try { peer.destroy(); } catch (e) {} } };
}
export function join(code, on) {
  const peer = new Peer({ debug: 0 });
  let conn = null;
  peer.on("open", () => {
    conn = peer.connect(PREFIX + code.toUpperCase(), { serialization: "json", reliable: true });
    conn.on("open", () => on.connect && on.connect(conn));
    conn.on("data", (d) => on.data && on.data(d));
    conn.on("close", () => on.close && on.close());
  });
  peer.on("error", (e) => on.error && on.error(ERR[e.type] || "Error de conexión (" + e.type + ")"));
  return { peer, send: (m) => conn && conn.open && conn.send(m), close: () => { try { peer.destroy(); } catch (e) {} } };
}
