// Datos del juego (portados de la referencia Kotlin, sin Firebase).
export const SURFACES = {
  HARD: { id: "HARD", name: "Pista dura", stadium: "Arena Nocturna", bounce: 1.0, retain: 0.86, grip: 1.0, slide: 0.25,
    desc: "Bote equilibrado y rápido. Ideal para pegar desde el fondo.", court: 0x2d6fb5, apron: 0x2a8a5a, line: 0xffffff },
  CLAY: { id: "CLAY", name: "Tierra batida", stadium: "Pista Central de Tierra", bounce: 1.24, retain: 0.72, grip: 1.35, slide: 0.85,
    desc: "Bote alto y lento. Premia el liftado y se resbala.", court: 0xc8603a, apron: 0xb9542f, line: 0xf6efe6 },
  GRASS: { id: "GRASS", name: "Hierba", stadium: "Pista Central de Hierba", bounce: 0.76, retain: 0.94, grip: 0.85, slide: 0.15,
    desc: "Bote raso y muy rápido. Favorece el saque-volea y el cortado.", court: 0x4f9a3c, apron: 0x468a35, line: 0xffffff },
};

export const STYLES = {
  ALL: { id: "ALL", name: "Todoterreno", spec: "Cubre toda la pista y mete dejadas letales", power: 94, speed: 96, spin: 92, serve: 222,
    shirt: 0xe63946, accent: 0xffb703, skin: 0xd9a37e, hair: 0x2b1d14 },
  POWER: { id: "POWER", name: "Pegador de fondo", spec: "Golpes planos demoledores", power: 98, speed: 89, spin: 88, serve: 230,
    shirt: 0x1d3557, accent: 0x00f5d4, skin: 0xf0c8a8, hair: 0xb5562b },
  SPIN: { id: "SPIN", name: "Rey del liftado", spec: "Liftado pesado y ángulos imposibles", power: 88, speed: 97, spin: 98, serve: 205,
    shirt: 0x7209b7, accent: 0xf72585, skin: 0xe8b996, hair: 0x5a3a1e },
  VOLLEY: { id: "VOLLEY", name: "Maestro de red", spec: "Saque preciso, cortado y volea", power: 91, speed: 92, spin: 95, serve: 226,
    shirt: 0x0f4c5c, accent: 0xd4af37, skin: 0xc68a63, hair: 0x111111 },
};

// speed: multiplicador de velocidad, arc: multiplicador del tiempo de vuelo (más alto = más bombeado), spin: + liftado / - cortado
export const STROKES = {
  FLAT: { id: "FLAT", name: "Plano", speed: 1.12, arc: 0.85, spin: 5, risk: 1.25 },
  TOPSPIN: { id: "TOPSPIN", name: "Liftado", speed: 0.98, arc: 1.15, spin: 55, risk: 0.9 },
  SLICE: { id: "SLICE", name: "Cortado", speed: 0.84, arc: 0.95, spin: -45, risk: 0.9 },
  LOB: { id: "LOB", name: "Globo", speed: 0.62, arc: 2.1, spin: 25, risk: 1.0 },
  DROP: { id: "DROP", name: "Dejada", speed: 0.5, arc: 1.2, spin: -60, risk: 1.2 },
};
export const STROKE_ORDER = ["FLAT", "TOPSPIN", "SLICE", "LOB", "DROP"];

export const DIFFICULTY = {
  EASY: { id: "EASY", name: "Fácil", react: 0.4, speed: 0.68, err: 2.4, power: 0.85 },
  NORMAL: { id: "NORMAL", name: "Normal", react: 0.25, speed: 0.8, err: 1.7, power: 0.95 },
  HARD: { id: "HARD", name: "Difícil", react: 0.12, speed: 0.92, err: 1.15, power: 1.03 },
};

export const MATCH = {
  SHORT: { id: "SHORT", name: "Rápido (1 set a 4 juegos)", sets: 1, games: 4 },
  SET: { id: "SET", name: "1 set a 6 juegos", sets: 1, games: 6 },
  BO3: { id: "BO3", name: "Al mejor de 3 sets", sets: 3, games: 6 },
};

// Medidas reales en metros
export const HALF_L = 11.885, HALF_W = 4.115, DBL_W = 5.485, SERVICE = 6.4, NET_H = 0.95, BALL_R = 0.04;
