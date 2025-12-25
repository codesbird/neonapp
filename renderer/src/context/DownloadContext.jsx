import React, { createContext, useContext, useReducer } from "react";

/**
 * Global Download context
 * Stores queue + active downloads metadata
 */
const DownloadContext = createContext(null);

const initialState = {
  queue: [],      // queued tasks metadata
  active: {},     // taskId -> task meta (status, progress)
  history: [],    // optionally persisted
  concurrent: 5,  // max concurrent downloads
};

function reducer(state, action) {
  switch (action.type) {
    case "ENQUEUE":
      return { ...state, queue: [...state.queue, action.payload] };

    case "DEQUEUE":
      return { ...state, queue: state.queue.filter(q => q.taskId !== action.payload) };

    case "ADD_ACTIVE":
      return {
        ...state,
        active: {
          ...state.active,
          [action.payload.taskId]: action.payload
        }
      };

    case "UPDATE_ACTIVE": {
      const { taskId, updates } = action.payload;
      const existing = state.active[taskId];
      if (!existing) return state;

      const currentStatus = existing.status;
      const incomingStatus = updates.status;

      const resumeRequested = existing.resumeRequested;
      // 💡 If paused AND no resume was requested → block forced "running"
      if (currentStatus === "paused" &&
        incomingStatus === "running" &&
        !resumeRequested) {
        return {
          ...state,
          active: {
            ...state.active,
            [taskId]: {
              ...existing,
              ...updates,
              status: "paused"
            }
          }
        };
      }

      // 💡 If resume was requested → allow "running"
      if (incomingStatus === "running" && resumeRequested) {
        return {
          ...state,
          active: {
            ...state.active,
            [taskId]: {
              ...existing,
              ...updates,
              resumeRequested: false  // reset
            }
          }
        };
      }

      // DEFAULT UPDATE
      return {
        ...state,
        active: {
          ...state.active,
          [taskId]: {
            ...existing,
            ...updates
          }
        }
      };
    }

    case "REMOVE_ACTIVE":
      const copy = { ...state.active };
      delete copy[action.payload];
      return { ...state, active: copy };

    case "SET_HISTORY":
      return { ...state, history: action.payload };

    default:
      return state;
  }
}

export function DownloadProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = { state, dispatch };
  return <DownloadContext.Provider value={value}>{children}</DownloadContext.Provider>;
}

export function useDownloads() {
  const ctx = useContext(DownloadContext);
  if (!ctx) throw new Error("useDownloads must be used inside DownloadProvider");
  return ctx;
}
