import { useEffect, useRef, useState, useCallback } from "react";

/**
 * useTaskWS(taskId) -> { connected, lastMessage, send, close }
 * Opens websocket on mount, closes on unmount.
 * Caller must pass msgs as plain JS objects; send serializes to JSON.
 */
export default function useTaskWS(onMessageOptional) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  useEffect(() => {
    // no persistent global WS — caller should call open()
    return () => {
      try { wsRef.current && wsRef.current.close(); } catch {}
    };
  }, []);

  const open = useCallback((url = "ws://127.0.0.1:8765") => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
    wsRef.current = new WebSocket(url);

    wsRef.current.onopen = () => setConnected(true);
    wsRef.current.onclose = () => setConnected(false);
    wsRef.current.onerror = (e) => {
      setConnected(false);
    };
    wsRef.current.onmessage = (ev) => {
      let obj = null;
      try { obj = JSON.parse(ev.data); } catch (e) { obj = ev.data; }
      setLastMessage(obj);
      if (typeof onMessageOptional === "function") onMessageOptional(obj);
    };
  }, [onMessageOptional]);

  const send = useCallback((obj) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn("WS not open");
      return false;
    }
    wsRef.current.send(JSON.stringify(obj));
    return true;
  }, []);

  const close = useCallback(() => {
    try { wsRef.current && wsRef.current.close(); } catch {}
  }, []);

  return {
    open,
    send,
    close,
    connected,
    lastMessage,
    wsRef
  };
}
