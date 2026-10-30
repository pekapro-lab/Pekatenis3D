# PekaTenis 3D

Tenis 3D para móvil (en horizontal) hecho con **Vite + Three.js**. Todo se genera por código: jugadores, estadio, público, icono y sonidos (WebAudio). Sin APIs de pago.

**Jugar:** https://pekapro-lab.github.io/Pekatenis3D/ · **APK Android:** ver [Releases](https://github.com/pekapro-lab/Pekatenis3D/releases)

- 3 superficies con su propio bote: pista dura, tierra batida y hierba.
- 4 estilos de jugador: Todoterreno, Pegador de fondo, Rey del liftado y Maestro de red.
- Golpes: plano, liftado, cortado, globo, dejada y saque (primer y segundo saque).
- Marcador real: 15-30-40, iguales/ventaja, juegos, sets y tie-break.
- Contra la IA (Fácil, Normal, Difícil) u **online** con un amigo por código de sala (PeerJS, P2P).
- Trayectoria al apuntar, vibración, sonido de golpes, botes y público.

## Controles
- **Móvil:** arrastra por la pista para apuntar; pulsa un golpe cuando llegue la bola; joystick a la izquierda (con *Asistencia de movimiento* el jugador corre solo). SACAR: un toque lanza la bola, otro en lo más alto golpea.
- **PC:** ratón para apuntar, WASD/flechas para moverte, J/K/L/U/I o 1-5 para los golpes, Espacio para sacar, Esc pausa.

## Desarrollo
```
npm ci
npm run dev        # servidor local
npm test           # marcador
node scripts/sim.mjs  # partidos IA contra IA sin gráficos
```
La APK se compila en GitHub Actions (Capacitor, WebView antiguos: Chrome 87) al subir una etiqueta `v*`.
