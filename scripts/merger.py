# merger.py
import asyncio
import re
from typing import Optional
from scripts.utils import safe_send

async def run_ffmpeg_merge(ws, audio_path: str, video_path: str, output_path: str, task_id: str, duration: Optional[float] = None):
    cmd = ["ffmpeg", "-y", "-i", video_path, "-i", audio_path, "-c:v", "copy", "-c:a", "copy", "-progress", "pipe:1", "-nostats", output_path]
    proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT)
    time_re = re.compile(r"out_time_ms=(\d+)")
    try:
        while True:
            line = await proc.stdout.readline()
            if not line:
                break
            s = line.decode("utf8", errors="ignore").strip()
            m = time_re.search(s)
            if m and duration:
                processed = int(int(m.group(1)) / 1_000_000)
                pct = int((processed / duration) * 100)
                await safe_send(ws, {"type":"merge_progress", "taskId": task_id, "processed_seconds": pct, "success": True})
            if "progress=end" in s:
                break
        rc = await proc.wait()

        await safe_send(ws, {
            "type": "merge_complete",
            "taskId": task_id,
            "success": rc == 0,
            "output": output_path
        })
        return rc == 0
    
    except Exception as e:
        print("new error : ",e)
        try: proc.kill()
        except: pass
        await safe_send(ws, {"type":"error", "taskId": task_id, "success": False, "message": str(e)})
        return False
