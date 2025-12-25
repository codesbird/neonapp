import { useEffect, useRef, useState } from "react";

export default function useWS(url) {
    const ws = useRef(null);
    const [lastMessage, setLastMessage] = useState(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        ws.current = new WebSocket(url);

        ws.current.onopen = () => {
            setConnected(true);
        };

        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setLastMessage(data);
            } catch (e) {
                console.error("Invalid WS message:", e);
            }
        };

        ws.current.onclose = () => {
            setConnected(false);
        };

        ws.current.onerror = (err) => {
            console.error("WebSocket error:", err);
            setConnected(false);
        };

        return () => {
            try {
                ws.current && ws.current.close();
            } catch {}
        };
    }, [url]);

    const send = (data) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(data));
        }
    };

    return {
        connected,
        lastMessage,
        send,
    };
}
