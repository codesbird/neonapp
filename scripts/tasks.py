# tasks.py
import asyncio
import os
from typing import Dict, Any, Optional
from websockets import WebSocketServerProtocol
from utils import safe_filename

class DownloadTask:
    def __init__(self, task_id: str, payload: dict, ws: WebSocketServerProtocol, temp_dir: str):
        self.task_id = task_id
        self.payload = payload
        self.ws = ws

        # metadata
        self.filename = payload.get("filename") or f"task_{task_id}"
        self.output = payload.get("path")  # optional final path
        self.duration = payload.get("duration", None)
        self.resolution = payload.get("resolution", None)
        self.thumbnail = payload.get("thumbnail", None)

        # streams
        self.streams = payload.get("streams", payload.get("stream") or payload.get("streamUrls") or {})

        # control
        self._pause = asyncio.Event()
        self._pause.set()
        self._cancelled = False

        # runtime
        self.temp_dir = temp_dir
        os.makedirs(self.temp_dir, exist_ok=True)

        self.stream_states: Dict[str, Dict[str, Any]] = {}

        self._orchestrate = None
        self._runner: Optional[asyncio.Task] = None

        self.status = "queued"
        self.message = ""
        self.percent = 0.0

    def pause(self):
        if self.status == "running":
            self._pause.clear()
            self.status = "paused"

    def resume(self):
        if self.status in ("paused", "queued", "error"):
            self._pause.set()
            self.status = "running"

    def cancel(self):
        self._cancelled = True
        self._pause.set()
        self.status = "cancelled"

    def is_paused(self) -> bool:
        return not self._pause.is_set()

    def is_cancelled(self) -> bool:
        return self._cancelled
