# segmenter.py
import asyncio
import os
import time
from typing import Optional
import aiohttp
from scripts.utils import AIO_TIMEOUT, SEGMENT_RETRIES, NETWORK_STALL_TIMEOUT, SLOW_SPEED_THRESHOLD, safe_send

# note: AIO_TIMEOUT is None here; callers should pass appropriate timeout via session

async def download_segment(session: aiohttp.ClientSession, url: str, start: int, end: int, part_path: str,
                           task, stream_key: str, retry_limit:int = SEGMENT_RETRIES) -> int:
    """
    Download a byte range into part_path. Implements retries and stall detection.
    Updates task.stream_states[stream_key]['downloaded'] as it goes.
    Returns total bytes currently present in part_path (after append).
    """
    attempt = 0
    while attempt <= retry_limit:
        if task.is_cancelled():
            return os.path.getsize(part_path) if os.path.exists(part_path) else 0

        existing = os.path.getsize(part_path) if os.path.exists(part_path) else 0
        actual_start = start + existing if end != 2**63-1 else start + existing
        if end != 2**63-1 and actual_start > end:
            return existing

        headers = {"Range": f"bytes={actual_start}-{end}"} if end != 2**63-1 else {}

        try:
            async with session.get(url, timeout=AIO_TIMEOUT, headers=headers) as resp:
                if resp.status not in (200, 206):
                    raise RuntimeError(f"Bad status {resp.status}")
                # write stream
                last_bytes_time = time.time()
                start_time = time.time()
                with open(part_path, "ab") as fh:
                    async for chunk in resp.content.iter_chunked(64*1024):
                        if task.is_cancelled():
                            return os.path.getsize(part_path)
                        while task.is_paused():
                            await asyncio.sleep(0.1)
                            if task.is_cancelled():
                                return os.path.getsize(part_path)

                        if not chunk:
                            break
                        fh.write(chunk)
                        # update counters
                        state = task.stream_states.setdefault(stream_key, {"downloaded": 0})
                        state["downloaded"] = state.get("downloaded", 0) + len(chunk)

                        # network stall detection
                        if len(chunk) > 0:
                            last_bytes_time = time.time()

                        # compute speed of this part (approx)
                        elapsed = max(1e-6, time.time() - start_time)
                        speed = state["downloaded"] / elapsed if elapsed > 0 else 0
                        # if speed drops below threshold for longer than stall timeout -> raise so retry logic triggers
                        if time.time() - last_bytes_time > NETWORK_STALL_TIMEOUT:
                            # notify client about stall
                            try:
                                await safe_send(task.ws, {
                                    "type": "network_issue",
                                    "taskId": task.task_id,
                                    "subtype": "stalled",
                                    "message": "No data received for a while; retrying..."
                                })
                            except Exception:
                                pass
                            raise RuntimeError("Network stall detected (no bytes)")

                        if speed < SLOW_SPEED_THRESHOLD and time.time() - last_bytes_time > 2:
                            # report slow connection (but allow some tolerance)
                            try:
                                await safe_send(task.ws, {
                                    "type": "network_issue",
                                    "taskId": task.task_id,
                                    "subtype": "slow",
                                    "message": f"Connection slow ({int(speed)} B/s). Trying to recover..."
                                })
                            except Exception:
                                pass
                            # let the segment continue a bit; but if it persists, outer retry will occur
                # finished reading this response successfully
                return os.path.getsize(part_path)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            attempt += 1
            if attempt > retry_limit:
                raise
            # small backoff
            await asyncio.sleep(0.5 * attempt)
    return os.path.getsize(part_path) if os.path.exists(part_path) else 0
