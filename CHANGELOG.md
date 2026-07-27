# 📜 MUNO! - Changelog & Release Notes

Todas las mejoras, correcciones y actualizaciones del motor de juego **MUNO!** organizadas cronológicamente.

---

## 🚀 [v0.9.9.88] - 2026-07-26 *(Versión Actual de Producción)*

### 🛠️ Nuevas Mecánicas de Juego y Balance
- **🚫 Límite de 5 Robos por Turno (Hard Server Enforcement)**:
  - Validación previa en el servidor antes de extraer cualquier carta del mazo.
  - Si un jugador intenta robar por 6ª vez sin haber jugado carta, el servidor rechaza la extracción, emite `⚠️ Username alcanzó el límite de 5 robos este turno` y pasa el turno automáticamente.
- **🎒 Cap Máximo de 30 Cartas en Mano**:
  - Límite máximo de 30 cartas por jugador para prevenir desbordes de interfaz en móviles.

### ⚙️ Identidad Persistente y Cero Perfiles Duplicados
- **🍪 Identificador Único de Dispositivo en 3 Capas (`muno_device_id`)**:
  - Cookie autoritativa de 1 año (`Max-Age=31536000; Path=/; SameSite=Lax`) + `localStorage` + `username`.
  - Re-vinculación inteligente en el servidor al apretón de manos (handshake): si el cliente recarga, abre un enlace desde Discord/WhatsApp o abre una pestaña nueva, **el servidor lo re-conecta inmediatamente a su casilla y mano original**, erradicando la creación de perfiles clonados (`REDZONE #2`, `Musgo89 #3`).

### ⚙️ Purga Automática de Inactivos & Auto-Kick
- **🧹 Expulsión Automática por Inactividad (2 Turnos Consecutivos)**:
  - 1° turno inactivo: advertencia en chat + 2 cartas de castigo.
  - 2° turno inactivo consecutivo: **Auto-Kick automático**. El jugador es removido de la sala, sus cartas regresan al mazo de robo (conservación 100% intacta: 324 cartas totales), las casillas se re-indexan y el turno avanza.
- **👑 Transferencia Automática de Administrador**:
  - Promoción inmediata del siguiente jugador conectado en línea al desconectarse el Admin (`👑 Username es ahora el nuevo Administrador`).
- **🧹 Purga al Iniciar Partida (`purgeDisconnectedPlayers`)**:
  - Eliminación automática de casillas fuera de línea al presionar "Iniciar partida" en el lobby.

---

## 🎨 [v0.9.1] - 2026-07-26

### 📱 Optimización de Interfaz Móvil y Chat
- **💬 Caja de Texto del Chat Elevada**:
  - Refactorización de `GameChat.jsx` con unidades dinámicas `100dvh` y padding adaptable `calc(0.85rem + env(safe-area-inset-bottom, 0px))`.
  - Entrada de texto de 42px de alto con `z-index: 15002` flotando sobre la barra gestual del sistema en iOS y Android.
- **🎴 Cero Recorte en Cartas Ampliadas (0% Clipping)**:
  - Eliminación de `overflow-x: auto` forzado y adición de 42px de padding superior libre (`padding-top: 42px; overflow: visible !important`).
  - La carta seleccionada en móviles se eleva `-24px` y escala `1.35x` dentro de la zona de amortiguación sin ningún corte en los bordes.

---

## 💓 [v0.8.2] - 2026-07-26

### 🌐 Sincronización en Tiempo Real y Despliegue Cloudflare
- **💓 Heartbeat Continuo del Servidor (1s)**:
  - Bucle maestro de emisión activa `broadcastGameState(room)` cada 1000ms a todos los sockets conectados.
- **⚡ Endpoint `game:sync` y Ticker Cliente (3s)**:
  - Solicitud de re-sincronización cliente cada 3 segundos y respuesta autoritativa inmediata del servidor.
- **🌐 Despliegue en Dominio Producción**:
  - Configuración de Túnel Cloudflare Zero Trust `troublemaker` hacia `muno.macrostasis.dev`.
  - Servidor en vivo escuchando en HTTPS con WebSockets de baja latencia.

---

## 🃏 [v0.1.0 - v0.8.0] - 2026-07-25 / 2026-07-26

### 🕹️ Funcionalidades Base del Motor
- **Cartas SVG Integradas**: Renderizado ultrarrápido con diseño SVG vectorizado.
- **Reglas Oficiales UNO**: +2, +4 Wild, Reversa, Salto, Cambio de Color y Grito de ¡MUNO!.
- **Auditoría de Conservación de Cartas**: Algoritmo autoritativo que mantiene exactamente el total de cartas en el juego sin duplicaciones.
- **Respaldo en Disco**: Guardado automático `rooms_backup.json` para tolerancia a fallos.
