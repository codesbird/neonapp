# stream_downloader.py
import asyncio
import os
import shutil
import time
from typing import Optional
import aiohttp
from utils import (SEGMENTS_PER_STREAM, PROGRESS_INTERVAL, MAX_SEGMENT_SIZE_FOR_MULTISEG,
                    safe_send, STREAM_MAX_RESTARTS, DOWNLOAD_DIR)
from segmenter import download_segment

async def probe_url(session: aiohttp.ClientSession, url: str):
    """
    lightweight probe that uses HEAD then small GET fallback (similar to previous helper).
    Returns (size_in_bytes|None, accept_ranges_bool, final_url)
    """
    try:
        async with session.head(url, allow_redirects=True) as resp:
            cl = resp.headers.get("Content-Length")
            size = int(cl) if cl and cl.isdigit() else None
            accept = resp.headers.get("Accept-Ranges", "").lower() in ("bytes", "yes")
            return size, accept, str(resp.url)
    except Exception:
        try:
            headers = {"Range": "bytes=0-0"}
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10), headers=headers, allow_redirects=True) as resp:
                size = None
                if resp.status in (200,206):
                    cr = resp.headers.get("Content-Range") or resp.headers.get("Content-Length")
                    if cr:
                        import re
                        m = re.search(r"/(\d+)$", cr)
                        if m:
                            size = int(m.group(1))
                        else:
                            try:
                                size = int(cr)
                            except Exception:
                                size = None
                accept = resp.status == 206
                return size, accept, str(resp.url)
        except Exception:
            return None, False, url

async def download_stream(task, stream_obj: dict, stream_key: str):
    """
    Orchestrates segmented parallel download of one stream (video / audio / single).
    Includes restart loop and progress reporting.
    Returns path to assembled stream file.
    """
    max_restarts = STREAM_MAX_RESTARTS
    restart_count = 0

    while True:
        try:
            url = stream_obj.get("url")
            if not url:
                raise RuntimeError("Stream url missing")

            connector = aiohttp.TCPConnector(limit_per_host=SEGMENTS_PER_STREAM * 2)
            timeout = aiohttp.ClientTimeout(total=None, sock_connect=30, sock_read=30)
            async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
                size, accept_ranges, final_url = await probe_url(session, url)

                # decide number of segments
                if size and accept_ranges and size > MAX_SEGMENT_SIZE_FOR_MULTISEG and SEGMENTS_PER_STREAM > 1:
                    approx_chunks = max(1, int(size // MAX_SEGMENT_SIZE_FOR_MULTISEG))
                    segs = min(SEGMENTS_PER_STREAM, approx_chunks)
                else:
                    segs = 1

                part_ranges = []
                if size and segs > 1:
                    chunk = size // segs
                    for i in range(segs):
                        s = i * chunk
                        e = (s + chunk - 1) if i < segs - 1 else (size - 1)
                        part_ranges.append((s, e))
                else:
                    if size:
                        part_ranges.append((0, size - 1))
                    else:
                        part_ranges.append((0, 2**63-1))

                parts = [os.path.join(task.temp_dir, f"{stream_key}_part_{i}") for i in range(len(part_ranges))]
                for p in parts:
                    open(p, "ab").close()

                task.stream_states[stream_key] = {
                    "parts": parts,
                    "ranges": part_ranges,
                    "downloaded": 0,
                    "size": size,
                    "final_url": final_url
                }

                seg_tasks = []
                for idx, (s, e) in enumerate(part_ranges):
                    t = asyncio.create_task(download_segment(session, final_url, s, e, parts[idx], task, stream_key))
                    seg_tasks.append(t)
                    task.stream_states[stream_key].setdefault("tasks", []).append(t)

                last_send = 0.0
                start_time = time.time()

                while True:
                    if task.is_cancelled():
                        for t in seg_tasks:
                            try: t.cancel()
                            except: pass
                        raise asyncio.CancelledError("task cancelled")

                    done, pending = await asyncio.wait(seg_tasks, timeout=PROGRESS_INTERVAL, return_when=asyncio.FIRST_COMPLETED)

                    # compute progress
                    downloaded = sum(os.path.getsize(p) for p in parts if os.path.exists(p))
                    task.stream_states[stream_key]["downloaded"] = downloaded

                    overall_downloaded = sum(s.get("downloaded", 0) for s in task.stream_states.values())
                    overall_total = sum((s.get("size") or 0) for s in task.stream_states.values() if s.get("size"))
                    elapsed = max(1e-6, time.time() - start_time)
                    speed = overall_downloaded / elapsed if elapsed > 0 else 0
                    percent = (overall_downloaded / overall_total * 100) if overall_total else 0.0
                    task.percent = round(percent, 2)
                    task.message = f"Downloading {stream_key}"

                    # stall detection per-stream (no progress)
                    stream_state = task.stream_states[stream_key]
                    last_prog = stream_state.get("_last_progress_ts", None)
                    last_prog_bytes = stream_state.get("_last_progress_bytes", 0)
                    now = time.time()
                    if last_prog is None:
                        stream_state["_last_progress_ts"] = now
                        stream_state["_last_progress_bytes"] = downloaded
                    else:
                        if downloaded > last_prog_bytes:
                            stream_state["_last_progress_ts"] = now
                            stream_state["_last_progress_bytes"] = downloaded
                        else:
                            if now - stream_state["_last_progress_ts"] > 10:  # NETWORK_STALL_TIMEOUT
                                # send network stalled event
                                await safe_send(task.ws, {
                                    "type": "network_issue",
                                    "taskId": task.task_id,
                                    "subtype": "stalled",
                                    "message": "Download stalled — retrying..."
                                })
                                raise RuntimeError("Download stalled (no progress)")

                    if now - last_send >= PROGRESS_INTERVAL:
                        last_send = now
                        await safe_send(task.ws, {
                            "type": "progress",
                            "taskId": task.task_id,
                            "success": True,
                            "percent": f"{task.percent:.2f}",
                            "speed": f"{speed:.2f}",
                            "eta": int((overall_total - overall_downloaded) / speed) if speed > 0 and overall_total > overall_downloaded else 0,
                            "downloaded": overall_downloaded,
                            "total": overall_total,
                            "message": task.message
                        })

                    if all(t.done() for t in seg_tasks):
                        for t in seg_tasks:
                            if t.cancelled():
                                continue
                            exc = t.exception()
                            if exc:
                                raise exc
                        break

                # assemble
                final_stream_path = os.path.join(task.temp_dir, f"{stream_key}.{stream_obj.get('ext') or 'bin'}")
                with open(final_stream_path, "wb") as wf:
                    for p in parts:
                        with open(p, "rb") as rf:
                            shutil.copyfileobj(rf, wf)
                for p in parts:
                    try: os.remove(p)
                    except: pass

                task.stream_states[stream_key]["final"] = final_stream_path
                return final_stream_path

        except asyncio.CancelledError:
            # cleanup parts on cancellation (stop-on-frontend-close choice)
            for p in task.stream_states.get(stream_key, {}).get("parts", []):
                try: os.remove(p)
                except: pass
            raise

        except Exception as e:
            restart_count += 1
            print(f"[stream_downloader] {stream_key} failed ({restart_count}/{max_restarts}): {e}")
            if restart_count >= max_restarts:
                # permanent failure - propagate
                raise RuntimeError(f"Stream {stream_key} permanently failed: {e}")
            # notify client about restart attempt
            try:
                await safe_send(task.ws, {
                    "type": "network_issue",
                    "taskId": task.task_id,
                    "subtype": "retrying",
                    "message": f"Recovering... attempt {restart_count}/{max_restarts}"
                })
            except Exception:
                pass
            # small backoff and loop to restart; do NOT delete parts (resume)
            await asyncio.sleep(1)
            continue
