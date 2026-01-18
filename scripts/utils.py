# utils.py
import asyncio
import json
import os,requests
import re
import math
from typing import Any, Dict
from websockets import WebSocketServerProtocol
from pathlib import Path

# Paths
DOWNLOAD_DIR = str(Path.home() / "Downloads")
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
TEMP_DIR = os.path.join(BASE_DIR, "downloads", "tmp")
HISTORY_FILE = os.path.join(BASE_DIR, "download_history.json")

os.makedirs(DOWNLOAD_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

# Network & download tuning
SEGMENTS_PER_STREAM = 16
PROGRESS_INTERVAL = 0.25
AIO_TIMEOUT = None  # will be created in callers (aiohttp.ClientTimeout(...))
SEGMENT_RETRIES = 3
MAX_SEGMENT_SIZE_FOR_MULTISEG = 1 * 1024 * 1024

# Network detection thresholds
NETWORK_STALL_TIMEOUT = 10          # seconds without bytes -> stall
SLOW_SPEED_THRESHOLD = 10 * 1024   # bytes/sec considered "slow" (10 KB/s)
STREAM_MAX_RESTARTS = 3


def safe_filename(name: str) -> str:
    if not name:
        return "download"

    # Remove emojis
    name = re.sub(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map
        "\U0001F700-\U0001F77F"
        "\U0001F780-\U0001F7FF"
        "\U0001F800-\U0001F8FF"
        "\U0001F900-\U0001F9FF"
        "\U0001FA00-\U0001FAFF"
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "]+",
        "",
        name,
        flags=re.UNICODE
    )

    # Replace invalid filename characters + dot
    s = re.sub(r'[\\/:*?"<>|.]', "_", name).strip()

    return s or "download"


def load_history() -> Dict[str, Any]:
    if not os.path.exists(HISTORY_FILE):
        return {}
    try:
        with open(HISTORY_FILE, "r", encoding="utf8") as f:
            return json.load(f)
    except Exception:
        return {}

def save_history(history: Dict[str, Any]):
    try:
        with open(HISTORY_FILE, "w", encoding="utf8") as f:
            json.dump(history, f, indent=2)
    except Exception as e:
        print("save_history error:", e)

async def safe_send(ws: WebSocketServerProtocol, obj: dict):
    try:
        await ws.send(json.dumps(obj))
    except Exception:
        # client disconnected or send failed
        pass

def save_thumbnail(url, task_id,resolution=144):
    path = os.path.abspath("thumbnails")
    if not os.path.exists(path):
        os.makedirs(path)

    file_path = os.path.join(path, f"{task_id}_{resolution}.jpg")
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()  # Check if the request was successful

        with open(file_path, 'wb') as file:
            for chunk in response.iter_content(1024):
                file.write(chunk)
        print(f"Thumbnail saved to {file_path}")
        return file_path
    except requests.exceptions.RequestException as e:
        print(f"Error downloading thumbnail: {e}")
        return None
    