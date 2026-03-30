import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { discoverSocketBase } from "@/lib/runtime";

export function useWebSocket({
  sessionId,
  onReady,
  onTerminalReady,
  onOutput,
  onExit,
  onStatus,
  onDiagnosis
}) {
  const [status, setStatus] = useState("connecting");
  const [terminalStatus, setTerminalStatus] = useState("connecting");
  const socketRef = useRef(null);
  const handlersRef = useRef({
    onReady,
    onTerminalReady,
    onOutput,
    onExit,
    onStatus,
    onDiagnosis
  });

  useEffect(() => {
    handlersRef.current = {
      onReady,
      onTerminalReady,
      onOutput,
      onExit,
      onStatus,
      onDiagnosis
    };
  }, [onDiagnosis, onExit, onOutput, onReady, onStatus, onTerminalReady]);

  useEffect(() => {
    let active = true;
    let socket = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 8;
    let reconnectTimeout;

    function createSocket(base) {
      return io(base, {
        transports: ["websocket"],
        auth: {
          sessionId
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: maxReconnectAttempts
      });
    }

    discoverSocketBase()
      .then((socketBase) => {
        if (!active) {
          return;
        }

        socket = createSocket(socketBase);
        socketRef.current = socket;

        socket.on("connect", () => {
          setStatus("connected");
          reconnectAttempts = 0;
        });

        socket.on("disconnect", () => {
          setStatus("disconnected");
          setTerminalStatus("disconnected");
        });

        socket.on("connect_error", (error) => {
          console.error("WebSocket connection error:", error);
          reconnectAttempts++;
          if (reconnectAttempts >= maxReconnectAttempts) {
            setStatus("disconnected");
          }
        });

        socket.on("connection:ready", (payload) => {
          handlersRef.current.onReady?.(payload);
        });

        socket.on("terminal:ready", (payload) => {
          const nextStatus = payload?.status || "ready";
          setTerminalStatus(nextStatus);
          handlersRef.current.onTerminalReady?.(payload);
        });

        socket.on("terminal:output", (payload) => {
          handlersRef.current.onOutput?.(payload);
        });

        socket.on("terminal:exit", (payload) => {
          handlersRef.current.onExit?.(payload);
        });

        socket.on("command:status", (payload) => {
          handlersRef.current.onStatus?.(payload);
        });

        socket.on("command:diagnosis", (payload) => {
          handlersRef.current.onDiagnosis?.(payload);
        });
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setStatus("disconnected");
        setTerminalStatus("disconnected");
      });

    return () => {
      active = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [sessionId]);

  const sendTerminalInput = useCallback((data) => {
    socketRef.current?.emit("terminal:input", { data });
  }, []);

  const sendTerminalResize = useCallback((cols, rows) => {
    socketRef.current?.emit("terminal:resize", { cols, rows });
  }, []);

  const cancelCommand = useCallback(() => {
    socketRef.current?.emit("command:cancel");
  }, []);

  return {
    status,
    terminalStatus,
    sendTerminalInput,
    sendTerminalResize,
    cancelCommand
  };
}
