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
  const listeners = useRef({});

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
    listeners.current[event] = handler;
    return () => s.off(event, handler);
  }, []);

  const off = useCallback((event) => {
    const s = socket.current;
    if (listeners.current[event]) {
      s.off(event, listeners.current[event]);
      delete listeners.current[event];
    }
  }, []);

  const emit = useCallback((event, data) => {
    socket.current.emit(event, data);
  }, []);

  return { socket: socket.current, connected, on, off, emit };
}
