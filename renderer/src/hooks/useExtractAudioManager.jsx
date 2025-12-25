import { useEffect } from "react";
import { useDownloads } from "../context/DownloadContext";

/**
 * useExtractAudioManager
 * Manages ONLY audio extraction tasks using per-task WebSockets.
 */
export default function useExtractAudioManager() {
    const { state, dispatch } = useDownloads();

    useEffect(() => {
        tryStartExtracts();
    }, [state.queue, state.active, state.concurrent]);

    /* ============================
       START EXTRACT TASKS
       ============================ */
    function tryStartExtracts() {
        const activeCount = Object.keys(state.active).length;
        const available = Math.max(0, state.concurrent - activeCount);
        if (available <= 0) return;

        const extractTasks = state.queue
            .filter(t => t.type === "extract_audio")
            .slice(0, available);

        extractTasks.forEach(startExtractWorker);
    }

    /* ============================
       EXTRACT WORKER
       ============================ */
    function startExtractWorker(task) {
        // Remove from queue
        dispatch({ type: "DEQUEUE", payload: task.taskId });

        // Add active
        dispatch({
            type: "ADD_ACTIVE",
            payload: {
                taskId: task.taskId,
                title: task.title || "Extracting Audio",
                percent: 0,
                status: "starting"
            }
        });

        const ws = new WebSocket("ws://127.0.0.1:8765");

        ws.onopen = () => {
            console.log("Extract WS payload:", {
                type: "extract_audio",
                taskId: task.taskId
            });
            ws.send(JSON.stringify({
                type: "extract_audio",
                taskId: task.taskId,
                video_path: task.videoPath,
                output_path: task.outputPath,
                stream_index: task.streamIndex,
                reencode: task.format === "m4a" ? null : task.format
            }));
        };
        
        const ffmpegProgressRef = {};

        ws.onmessage = (ev) => {
            let msg;
            try { msg = JSON.parse(ev.data); } catch { return; }


            if (msg.type === "audio_extract_ack") {
                console.log("audio_extract_ack: ", msg)
            }

            // 🔄 PROGRESS
            if (msg.type === "audio_extract_progress") {
                const prev = ffmpegProgressRef[task.taskId] || {};
                const merged = { ...prev, ...msg.kv };
                ffmpegProgressRef[task.taskId] = merged;

                const percent = computePercentFromFFmpeg(merged, task.duration);
                dispatch({
                    type: "UPDATE_ACTIVE",
                    payload: {
                        taskId: task.taskId,
                        updates: {
                            percent: percent,
                            status: "running"
                        }
                    }
                });
            }

            // ✅ DONE
            else if (msg.type === "audio_extract_done") {
                console.log("audio_extract_done :", msg)

                dispatch({
                    type: "UPDATE_ACTIVE",
                    payload: {
                        taskId: task.taskId,
                        updates: {
                            percent: 100,
                            status: "complete",
                            output: task.outputPath
                        }
                    }
                });
                ws.close();
                setTimeout(() => dispatch({ type: "REMOVE_ACTIVE", payload: task.taskId }), 2000);
            }

            // ❌ ERROR
            else if (msg.type === "audio_extract_error") {
                console.log("audio_extract_error :", msg)

                dispatch({
                    type: "UPDATE_ACTIVE",
                    payload: {
                        taskId: task.taskId,
                        updates: {
                            status: "error",
                            message: msg.error
                        }
                    }
                });
                ws.close();
            }
        };

        ws.onclose = () => {
            const active = state.active[task.taskId];
            if (active && active.status !== "complete") {
                dispatch({
                    type: "UPDATE_ACTIVE",
                    payload: {
                        taskId: task.taskId,
                        updates: { status: "cancelled" }
                    }
                });
                setTimeout(() => dispatch({ type: "REMOVE_ACTIVE", payload: task.taskId }), 2000);
            }
        };

        // 🔐 store WS reference
        dispatch({
            type: "UPDATE_ACTIVE",
            payload: { taskId: task.taskId, updates: { ws } }
        });
    }

    /* ============================
       PUBLIC API
       ============================ */

    const enqueueExtract = (taskMeta) => {
        dispatch({ type: "ENQUEUE", payload: { ...taskMeta, type: "extract_audio" } });
    };

    const cancelExtract = (taskId) => {
        const active = state.active[taskId];
        active?.ws?.send(JSON.stringify({ type: "extract_cancel", taskId }));
        setTimeout(() => dispatch({ type: "REMOVE_ACTIVE", payload: taskId }), 2000);
    };

    return {
        enqueueExtract,
        cancelExtract
    };
}

/* ============================
   UTILS
   ============================ */
function computePercentFromFFmpeg(progress, durationSec) {
    if (!progress || !durationSec) return 0;

    // BEST: out_time_ms
    if (progress.out_time_ms) {
        const seconds = parseInt(progress.out_time_ms, 10) / 1_000_000;
        return Math.min(100, (seconds / durationSec) * 100);
    }

    // FALLBACK: out_time (HH:MM:SS.micro)
    if (progress.out_time) {
        const seconds = parseTimeToSeconds(progress.out_time);
        return Math.min(100, (seconds / durationSec) * 100);
    }

    return 0;
}

function parseTimeToSeconds(t) {
    // "00:01:50.119979"
    const [h, m, s] = t.split(":");
    return (+h) * 3600 + (+m) * 60 + parseFloat(s);
}
