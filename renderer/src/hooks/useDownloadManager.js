import { useEffect } from "react";
import { useDownloads } from "../context/DownloadContext";
import { useError } from "../context/ErrorContext";

/**
 * useDownloadManager: provides startDownload() that enqueues and starts when a slot is available.
 * Each started download opens a dedicated WebSocket and dispatches updates to DownloadContext.
 */
export default function useDownloadManager(setRetryMessage) {
  const { state, dispatch } = useDownloads();
  const { setError } = useError();

  // Attempt to start queued tasks when possible
  useEffect(() => {
    const tryStart = () => {
      const activeCount = Object.keys(state.active).length;
      const available = Math.max(0, state.concurrent - activeCount);
      if (available <= 0) return;
      const toStart = state.queue.slice(0, available);
      toStart.forEach((task) => {
        startWorker(task);
      });
    };

    function startWorker(task) {
      // Remove from queue
      dispatch({ type: "DEQUEUE", payload: task.taskId });

      // Add to active
      dispatch({ type: "ADD_ACTIVE", payload: { taskId: task.taskId, title: task.filename, percent: 0, status: "starting" } });

      // Open dedicated WS and start download
      const ws = new WebSocket("ws://127.0.0.1:8765");
      ws.onopen = () => {
        // send download instruction
        ws.send(JSON.stringify({
          type: "download",
          taskId: task.taskId,
          filename: task.filename,
          duration: task.duration,
          streams: task.streams,
          resolution: task.resolution,
          path: task.path,
          thumbnail: task.thumbnail,
        }));
      };

      ws.onmessage = (ev) => {
        let msg = null;
        try { msg = JSON.parse(ev.data); } catch { msg = ev.data; }

        // PROGRESS
        if (msg.type === "progress") {
          dispatch({
            type: "UPDATE_ACTIVE",
            payload: {
              taskId: task.taskId,
              updates: {
                percent: parseFloat(msg.percent),
                speed: msg.speed,
                eta: msg.eta,
                status: "running",
                downloaded: msg.downloaded,
                total: msg.total,
              }
            }
          });
        }

        // MERGE PROGRESS
        else if (msg.type === "merge_progress") {
          dispatch({
            type: "UPDATE_ACTIVE",
            payload: {
              taskId: task.taskId,
              updates: {
                percent: msg.processed_seconds,
                status: "merging"
              }
            }
          });
        }


        // PAUSED
        else if (msg.type === "paused") {
          dispatch({
            type: "UPDATE_ACTIVE",
            payload: {
              taskId: task.taskId,
              updates: { status: "paused" }
            }
          });
        }

        // RESUMED
        else if (msg.type === "resumed") {
          dispatch({
            type: "UPDATE_ACTIVE",
            payload: {
              taskId: task.taskId,
              updates: {
                status: "running",
                restarted: msg.restarted || false
              }
            }
          });
        }

        // NETWORK ISSUE
        else if (msg.type === "network_issue" && msg.subtype === "retrying") {
          if (setRetryMessage) {
            setRetryMessage(msg.message);
          }
        }

        // DOWNLOAD COMPLETE
        else if (msg.type === "download_complete") {
          dispatch({
            type: "UPDATE_ACTIVE",
            payload: {
              taskId: task.taskId,
              updates: {
                percent: 100,
                status: "download_complete",
                output: msg.path,
                history:msg.history
              }
            }
          });
          setTimeout(() => dispatch({ type: "REMOVE_ACTIVE", payload: task.taskId }), 2000);
          ws.close();
        }

        // MERGE COMPLETE
        else if (msg.type === "merge_complete") {
          console.log("Merge Complete : ", msg)
          dispatch({
            type: "UPDATE_ACTIVE",
            payload: {
              taskId: task.taskId,
              updates: {
                percent: 100,
                status: "merge_complete",
                output: msg.output
              }
            }
          });
        }

        // BACKEND ERROR
        else if (msg.type === "error") {
          console.log("Error : ",msg)
          setError(msg.message);
          dispatch({
            type: "UPDATE_ACTIVE",
            payload: {
              taskId: task.taskId,
              updates: {
                status: "error",
                message: msg.message
              }
            }
          });
          ws.close();
        }
      };


      ws.onclose = () => {
        // if closed and not complete, mark cancelled
        const active = state.active[task.taskId];
        if (active && active.status !== "complete") {
          dispatch({ type: "UPDATE_ACTIVE", payload: { taskId: task.taskId, updates: { status: "cancelled" } } });
          setTimeout(() => dispatch({ type: "REMOVE_ACTIVE", payload: task.taskId }), 2000);
        }
      };

      // attach control functions for pause/resume/cancel on the context active item
      // store the ws instance (so components can call ws.send for pause/resume/cancel)
      dispatch({ type: "UPDATE_ACTIVE", payload: { taskId: task.taskId, updates: { ws } } });
    }

    // try starting whenever queue or active changes
    tryStart();
  }, [state.queue, state.active, state.concurrent, dispatch]);

  const enqueueDownload = (taskMeta) => {
    dispatch({ type: "ENQUEUE", payload: taskMeta });
  };

  const pauseTask = (taskId) => {
    const active = state.active[taskId];
    if (active && active.ws) {
      active.ws.send(JSON.stringify({ type: "pause", taskId }));
    }
  };

  const resumeTask = (taskId) => {
    const active = state.active[taskId];
    if (active && active.ws) {
      active.ws.send(JSON.stringify({ type: "resume", taskId }));
    }

    // mark that we expect a running status
    dispatch({
      type: "UPDATE_ACTIVE",
      payload: {
        taskId,
        updates: { resumeRequested: true }
      }
    });
  };

  const cancelTask = (taskId) => {
    const active = state.active[taskId];
    if (active && active.ws) {
      active.ws.send(JSON.stringify({ type: "cancel", taskId }));
    }
    setTimeout(() => dispatch({ type: "REMOVE_ACTIVE", payload: taskId }), 2000);
  };

  const retryTaks = taskId => {

  }

  return { enqueueDownload, pauseTask, resumeTask, cancelTask };
}
