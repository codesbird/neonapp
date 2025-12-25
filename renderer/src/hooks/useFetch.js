import { useRef } from "react";

export default function useFetch() {
  function fetchInfo(url, platform, { onItem = null, onPlaylistMeta = null, timeout = 30000 } = {}) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket("ws://127.0.0.1:8765");

      let timer = null;
      let expectingPlaylist = platform.toLowerCase().includes("playlist");
      let playlistItems = [];
      let playlistCount = null;

      function resetTimeout() {
        clearTimeout(timer);
        timer = setTimeout(() => {
          ws.close();
          reject(new Error("Fetch timeout"));
        }, timeout);
      }

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "fetch", url, platform }));
        resetTimeout();
      };

      ws.onmessage = (ev) => {
        resetTimeout(); // <── FIX: refresh timeout on *every* message

        let msg;
        try { msg = JSON.parse(ev.data); }
        catch { msg = ev.data; }

        console.log("Received WS message:", msg);

        // --- Single Video (not playlist) ---
        if (!expectingPlaylist) {
          clearTimeout(timer);
          ws.close();
          return resolve(msg);
        }

        // --- Playlist Metadata (first message) ---
        if (msg.isPlaylist && msg.videoCount !== undefined) {
          playlistCount = msg.videoCount;
          onPlaylistMeta && onPlaylistMeta(msg);
          return;
        }

        // --- PLAYLIST ITEM RECEIVED ---
        if (onItem) onItem(msg);
        playlistItems.push(msg);

        // If finished receiving all videos
        if (playlistCount !== null && playlistItems.length >= playlistCount) {
          console.log("All playlist items received");
          clearTimeout(timer);
          ws.close();
          return resolve({
            isPlaylist: true,
            items: playlistItems
          });
        }
      };

      // If server closes before we expected it
      ws.onclose = () => {
        clearTimeout(timer);
        resolve({
          isPlaylist: true,
          items: playlistItems
        });
      };

      ws.onerror = () => {
        clearTimeout(timer);
        reject(new Error("WebSocket error"));
      };
    });
  }

  return fetchInfo;
}

