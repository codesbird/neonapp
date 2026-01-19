import React, { useEffect, useState } from "react";
import ProgressBar from "./ProgressBar";
import { saveHistory } from "../hooks/useHistoryManager"

export default function DownloadItem({ item, onPause, onResume, onCancel, onRetry }) {
  const percent = item.percent || 0;
  const status = item.status || "queued";

  function formatBytes(bytes, decimals = 2) {
    if (!bytes && bytes !== 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes || 1) / Math.log(k));
    return parseFloat(((bytes || 0) / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  function timeConversion(seconds) {
    seconds = Number(seconds);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s + 1).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  useEffect(() => {
    if (item.status === "download_complete") {
      let history = item.history;

      (async () => {
        if (saveHistory(history)) {
          console.log("History saved successfully !")
        }
        else {
          console.log("Failed to save history !")
        }
      })()
    }
  }, [item])

  return (
    <div className="bg-[#07112a] border border-[#0b1220] rounded p-3 kflex items-center gap-4 neon-card">
      <div className="flex-1">
        <div className="text-white font-medium">{item.title || item.filename}</div>
        <div className="flex justify-between my-3">
          <div className="text-xs text-gray-400">
            {status === "merging" ? "Merging..." : String(status).toUpperCase()}
          </div>
          {status !== "merging" && (
            <>
              <div className="text-xs text-gray-400">{item.status === 'running' ? `${formatBytes(item.speed)}/s` : "0 KB/s"}</div>
              <div className="text-xs text-gray-400">{item.status === 'running' ? timeConversion(item.eta) : "00:00"}</div>
            </>
          )}
        </div>

        <div className="mt-2 flex gap-1">
          <ProgressBar percent={percent} />
          <div className="text-sm text-gray-300 w-10">{percent}%</div>
        </div>
      </div>

      <div className="flex gap-2 my-2 items-center">
        <div className="me-auto">
          {(status === "error" || status === 'failed') && <button className="px-3 py-1 rounded border border-[#333] bg-[#0b1220] text-white" onClick={() => onRetry(item.taskId)}>Retry</button>}
          {status === "running" && <button className="px-3 py-1 rounded border border-[#333] bg-[#0b1220] text-white" onClick={() => onPause(item.taskId)}>Pause</button>}
          {status === "paused" && <button className="px-3 py-1 rounded border border-[#333] bg-[#0b1220] text-white" onClick={() => onResume(item.taskId)}>Resume</button>}
        </div>
        <div className="text-xs text-gray-300 mx-auto">({formatBytes(item.downloaded)} / {formatBytes(item.total)})</div>
        <button className="px-3 py-1 rounded bg-red-600 text-white" onClick={() => onCancel(item.taskId)}>Cancel</button>
      </div>
    </div>
  );
}
