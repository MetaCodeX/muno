import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = window.location.origin;

let _socket = null;
function getSocket() {
  if (!_socket) {
    _socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
      reconnectionAttempts: Infinity,
      timeout: 10000,
      transports: ['websocket', 'polling']
    });
  }
  return _socket;
}

export function useMultiplayerSocket() {
  const socket = useRef(getSocket());
  const [connected, setConnected] = useState(false);


  useEffect(() => {
    const s = socket.current;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    if (!s.connected) s.connect();

    // ── Mobile Wakeup Listener (Screen unlock / App switch) ──────────────────
    const handleWakeup = () => {
      if (document.visibilityState === 'visible' || document.hasFocus()) {
        if (!s.connected) {
          console.log('[Mobile Wakeup] Restoring WebSocket connection...');
          s.connect();
        }
      }
    };

    window.addEventListener('visibilitychange', handleWakeup);
    window.addEventListener('focus', handleWakeup);
    window.addEventListener('online', handleWakeup);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      window.removeEventListener('visibilitychange', handleWakeup);
      window.removeEventListener('focus', handleWakeup);
      window.removeEventListener('online', handleWakeup);
    };
  }, []);

  const on = useCallback((event, handler) => {
    const s = socket.current;
    s.on(event, handler);
    // BUG 4 FIX: Return a closure that captures the exact handler reference.
    // The old approach stored listeners.current[event] = handler, which was a dict
    // with only ONE entry per event. If two effects called on('same-event', fn),
    // the second would overwrite listeners.current['same-event'], and the first
    // effect's cleanup would call off('same-event') removing the WRONG handler.
    // Now each caller gets their own specific unsubscribe function.
    return () => s.off(event, handler);
  }, []);

  const off = useCallback((event) => {
    // Legacy helper — prefer using the return value of on() for cleanup.
    // This removes ALL listeners for the event as a last-resort flush.
    socket.current.removeAllListeners(event);
  }, []);

  const emit = useCallback((event, data) => {
    socket.current.emit(event, data);
  }, []);


  return { socket: socket.current, connected, on, off, emit };
}
