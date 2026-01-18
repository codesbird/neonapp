# audio_extractor.py
import asyncio
import os
import signal
from utils import safe_send

import subprocess
import json




def get_audio_codec(video_path, stream_index):
    cmd = [
        "ffprobe",
        "-v", "error",
        "-select_streams", f"a:{stream_index}",
        "-show_entries", "stream=codec_name",
        "-of", "json",
        video_path
    ]
    out = subprocess.check_output(cmd, text=True)
    data = json.loads(out)
    return data["streams"][0]["codec_name"]

async def run_audio_extract(
    ws,
    task_id: str,
    video_path: str,
    output_path: str,
    stream_index: int,
    reencode: str | None,
    cancel_event: asyncio.Event,
    thumbnail,
    size,
    date,
    resolution
):
    """
    Runs FFmpeg audio extraction with progress reporting.
    """
    COPY_COMPAT = {
        "aac":  ["m4a", "aac", "mp4"],
        "mp3":  ["mp3"],
        "opus": ["opus", "webm"],
        "vorbis": ["ogg"],
        "flac": ["flac"]
        }

    # Write to partial file first
    partial = output_path

    codec = get_audio_codec(video_path, stream_index)
    ext = os.path.splitext(output_path)[1].lstrip(".")

    can_copy = ext in COPY_COMPAT.get(codec, [])

    if reencode or not can_copy:
        # fallback to re-encode
        codec_args = {
            "mp3": ["-c:a", "libmp3lame", "-b:a", "320k"],
            "m4a": ["-c:a", "aac", "-b:a", "192k"],
            "flac": ["-c:a", "flac"],
            "opus": ["-c:a", "libopus", "-b:a", "128k"],
        }[reencode or ext]
    else:
        codec_args = ["-c:a", "copy"]


    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vn",
        "-map", f"0:a:{stream_index}",   # ✅ FIXED
        *codec_args,
        "-progress", "pipe:1",
        "-nostats",
        partial
    ]

    print("The partial is : ",partial)


    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )

    try:
        while True:
            if cancel_event.is_set():
                proc.send_signal(signal.SIGINT)
                await safe_send(ws, {"type": "audio_extract_cancelled", "taskId": task_id})
                return

            line = await proc.stdout.readline()
            if not line:
                break

            text = line.decode().strip()
            if "=" in text:
                k, v = text.split("=", 1)
                print(k,v   )
                await safe_send(ws, {
                    "type": "audio_extract_progress",
                    "taskId": task_id,
                    "kv": {k: v}
                })

        rc = await proc.wait()
        if rc != 0:
            # raise RuntimeError("ffmpeg failed")
            stderr = await proc.stderr.read()
            err = stderr.decode(errors="ignore")

            raise RuntimeError(f"ffmpeg failed: {err}")

        os.replace(partial, output_path)
        await safe_send(ws, {
            "type": "audio_extract_done",
            "taskId": task_id,
            "path": output_path,
            "thumbnail":thumbnail,
            "size":size,
            "date":date,
            "resolution":resolution
        })

    except Exception as e:
        try:
            proc.kill()
        except:
            pass
        await safe_send(ws, {
            "type": "audio_extract_error",
            "taskId": task_id,
            "error": str(e)
        })
