import { useCallback, useEffect, useRef, useState } from "react";

const WS_URL = "ws://localhost:3000";
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

export function useWebSocket(onMessage) {
  const [status, setStatus] = useState("disconnected");
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const onMessageRef = useRef(onMessage);

  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
    }

    setStatus("connecting");

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
        reconnectAttemptsRef.current = 0;
      };

      ws.onclose = () => {
        setStatus("disconnected");
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectTimerRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, RECONNECT_DELAY);
        }
      };

      ws.onerror = () => {};

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessageRef.current?.(data);
        } catch {
          // Ignore malformed messages
        }
      };
    } catch {
      setStatus("disconnected");
    }
  }, []);

  const sendMessage = useCallback((msg) => {
  if (wsRef.current?.readyState === WebSocket.OPEN) {
    wsRef.current.send(JSON.stringify(msg));
  } else {
    console.warn("WebSocket not connected");
  }
}, []);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { status, sendMessage, lastMessage, reconnect };
}