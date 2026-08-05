# ⚡ MUNO! — Overkill Mode Specification & Documentation

> **Versión:** `v1.0.0-overkill`  
> **Estado:** Rama de Desarrollo (`feature/muno-overkill`)  
> **Autor:** Dr.MetaCodeX / MacroStasis (`macrostasis.dev`)

---

## 🎯 Descripción General

**MUNO! Overkill Mode** es una variante caótica, hiperactiva y competitiva del motor de juego **MUNO!**. Rediseña las reglas tradicionales del UNO introduciendo cartas de castigo masivo, multiplicadores de daño, mecánicas de interrupción fuera de turno (**Jump-In**) y manipulación colectiva de manos.

Visualmente, transforma la interfaz en un tema **Crimson Fire (Fuego Carmesí)** con efectos neón, anuncios centrales estilo arcade y síntesis de audio acelerada.

---

## 🔥 Cartas Especiales y Efectos de Juego

| Carta | Tipo | Icono / Efecto | Descripción |
|---|---|---|---|
| **+6 Stack Card** | Acción / Castigo | 💥 `+6` | Añade 6 cartas a la pila acumulativa de robos. Se encadena con `+2`, `+4` y `x2`. |
| **Multiplicador x2** | Acción / Multiplicador | ✖️2️⃣ `x2` | Multiplica el acumulado actual de cartas de castigo por 2 (ej. `+4` → `+8`, `+10` → `+20`). |
| **Dado del Destino** | Especial / Azar | 🎲 `1-6` | El jugador tira el dado virtual y roba entre 1 y 6 cartas aleatorias del mazo. |
| **Flush (Barredora)** | Acción de Color | 🌊 `Flush` | Descarta instantáneamente **todas las cartas del mismo color** que tenga el jugador en su mano. |
| **Carta 7 (Intercambio Directo)** | Numérica / Especial | 🔄 `7` | Al jugarla, el jugador debe seleccionar obligatoriamente a otro participante para **intercambiar sus manos completas**. |
| **Carta 0 (Rotación Colectiva)** | Numérica / Especial | 🌀 `0` | **Todos los jugadores en la sala** pasan su mano completa al jugador adyacente en la dirección del turno. |

---

## ⚡ Mecánica de Intercepción: **Jump-In (Salto Fuera de Turno)**

### 📜 Regla de Salto
Cualquier jugador que posea en su mano una carta **exactamente idéntica** (mismo color y mismo número/acción) a la carta activa en la cima de la pila de descarte puede jugarla **de inmediato**, sin importar de quién sea el turno.

### 🕹️ Comportamiento del Motor
1. **Prioridad Absoluta**: El servidor procesa el `Jump-In` con prioridad microsegunda por WebSockets.
2. **Re-enrutamiento de Turno**: Al ejecutarse exitosamente el `Jump-In`, el flujo del turno salta automáticamente al jugador que realizó el salto, continuando la partida a partir de él.
3. **Comodines y Wilds**: Aplica también a comodines de color o castigo cuando coinciden en tipo.
4. **Notificación Global**: El servidor emite un evento `actionBurst` a todos los clientes mostrando la animación neón: `⚡ JUMP-IN — Username`.

---

## 🛡️ Acumulación de Castigos (Stacking & Defense)

1. **Encadenamiento Total**: Las cartas `+2`, `+4`, `+6` y `x2` pueden encadenarse indefinidamente mientras los jugadores siguientes tengan cartas de respuesta.
2. **Pila Autoritativa**: El servidor mantiene la variable `gs.drawStackCount`.
3. **Absorción de Castigo**: Si un jugador no posee ninguna carta de defensa (`+2`, `+4`, `+6` o `x2`), absorbe **la totalidad acumulada** de la pila a su mano y conserva su turno de juego.

---

## 🎨 Diseño Visual y Experiencia de Usuario (UI/UX)

- **🎨 Crimson Fire Theme**: Gradientes oscuros con tonos rojo carmesí (`#ff003c`, `#ff4d00`), bordes brillantes y resplandores pulsantes.
- **📣 Arcade Announcements**: Banners transparentes en el centro de la pantalla para comunicar jugadas especiales (`FLUSH!`, `HAND SWAP!`, `OVERKILL +6!`, `DOUBLE MULTIPLIER!`).
- **🎵 Síntesis de Audio (SoundManager)**: Sonidos generados mediante la Web Audio API con frecuencias sintetizadas agresivas para robos masivos, saltos de turno y gritos de victoria.
- **📱 Optimización Móvil**: Selector de modo en el lobby optimizado para pantallas táctiles y botones táctiles adaptables.

---

## ⚙️ Arquitectura WebSocket & Estado Servidor

### Estado de Sala (`RoomState`)
```json
{
  "code": "OK99X",
  "mode": "overkill",
  "status": "playing",
  "gameState": {
    "drawStackCount": 12,
    "lastCardEffect": "plus6",
    "jumpInAllowed": true
  }
}
```

### Eventos Clave en `server.js`
- `room:setMode` → `{ sessionId, mode: 'overkill' | 'classic' }`
- `game:jumpIn` → `{ sessionId, cardId }`
- `game:cardPlayed` → `{ card, cardEffect: 'flush' | 'swap7' | 'rotate0' | 'multiplyX2' | 'plus6' }`

---

## 📄 Licencia y Créditos

Desarrollado por **Carlos Eduardo Juarez Ricardo ([@MetaCodeX](https://github.com/MetaCodeX))**  
Organización: **MacroStasis** (`macrostasis.dev`)
