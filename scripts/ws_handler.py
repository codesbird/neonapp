# ws_handler.py
import asyncio
import json
import os
import shutil
import time
from typing import Optional
import websockets
from websockets import WebSocketServerProtocol
from fetcher import fetch_info
from tasks import DownloadTask
from stream_downloader import download_stream
from merger import run_ffmpeg_merge
from saveThumbnail import save_thumbnail
from utils import safe_send, DOWNLOAD_DIR, TEMP_DIR, safe_filename
from audio_extractor import run_audio_extract


async def handler(ws: WebSocketServerProtocol):
    task: Optional[DownloadTask] = None
    try:
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except Exception:
                await safe_send(ws, {"type":"error","success":False,"message":"invalid json"})
                continue

            mtype = msg.get("type")

            if mtype == "fetch":
                print("The path : ",os.path.abspath(__file__))
                url = msg.get("url")
                platform = msg.get("platform")
                if not url:
                    await safe_send(ws, {"type":"fetch","success":False,"message":"url missing"})
                    continue
                try:
                    info = await fetch_info(url,platform,ws)
                    await safe_send(ws, info)
                except Exception as e:
                    await safe_send(ws, {"type":"fetch","success":False,"message":str(e)})
                continue

            if mtype == "extract_audio":
                task_id = msg.get("taskId") or f"extract_{int(time.time()*1000)}"
                video_path = msg.get("video_path")
                output_path = msg.get("output_path")
                stream_index = msg.get("stream_index", 0)
                reencode = msg.get("reencode")  # None = copy
                thumbnail = msg.get("thumbnail")
                size = msg.get("size")
                date = msg.get("date")
                resolution = msg.get("resolution")

                if not video_path or not output_path:
                    await safe_send(ws, {
                        "type": "audio_extract_error",
                        "taskId": task_id,
                        "error": "missing video_path or output_path"
                    })
                    continue

                cancel_event = asyncio.Event()

                await safe_send(ws, {
                    "type": "audio_extract_ack",
                    "taskId": task_id,
                    "success": True
                })
                extract_task = asyncio.create_task(
                    run_audio_extract(
                        ws,
                        task_id,
                        video_path,
                        output_path,
                        stream_index,
                        reencode,
                        cancel_event,
                        thumbnail,
                        size,
                        date,
                        resolution
                    )
                )

                # attach cancel hook to this connection
                ws.extract_cancel = cancel_event
                ws.extract_runner = extract_task
                continue
            
            if mtype == "download":
                task_id = msg.get("taskId") or f"task_{int(time.time()*1000)}"
                temp_dir = os.path.join(TEMP_DIR, task_id)
                task = DownloadTask(task_id, msg, ws, temp_dir)
                await safe_send(ws, {"type":"download_ack","taskId":task_id,"success":True})
                async def orchestrate():
                    try:
                        task.status = "running"
                        task._pause.set()

                        streams = msg.get("streams") or {}
                        path = msg.get('path') or DOWNLOAD_DIR

                        if isinstance(streams, list) and len(streams) == 1:
                            single = streams[0]
                            final = await download_stream(task, single, "single0")
                            safe_name = safe_filename(task.filename)
                            out_path = task.output or os.path.join(path, safe_name)
                            if not os.path.splitext(out_path)[1]:
                                ext = single.get("ext") or "mp4"
                                out_path += "." + ext
                            shutil.move(final, out_path)
                            task.status = "complete"
                            await safe_send(ws, {"type":"download_complete","taskId":task.task_id,"success":True,"path":out_path})
                            return

                        video_obj = streams.get("video") if isinstance(streams, dict) else None
                        audio_obj = streams.get("audio") if isinstance(streams, dict) else None

                        dl_tasks = []
                        if video_obj:
                            dl_tasks.append(asyncio.create_task(download_stream(task, video_obj, "video")))
                        if audio_obj:
                            dl_tasks.append(asyncio.create_task(download_stream(task, audio_obj, "audio")))

                        results = await asyncio.gather(*dl_tasks, return_exceptions=True)

                        for r in results:
                            if isinstance(r, Exception):
                                raise r

                        video_path = None
                        audio_path = None
                        for idx, res in enumerate(results):
                            if isinstance(res, str) and res:
                                if video_obj and idx == 0:
                                    video_path = res
                                elif audio_obj and ((video_obj and idx == 1) or (not video_obj and idx == 0)):
                                    audio_path = res

                        safe_name = safe_filename(task.filename)
                        out_path = os.path.join(path, safe_name)
                        
                        if not os.path.splitext(out_path)[1]:
                            if audio_obj and not video_obj:
                                # PURE AUDIO DOWNLOAD
                                ext = audio_obj.get("ext") or "m4a"
                            elif video_obj:
                                # VIDEO OR VIDEO+MERGE
                                ext = video_obj.get("ext") or "mp4"
                            else:
                                ext = "mp4"

                            out_path += f"-{task.resolution}." + ext


                        if video_path and audio_path:
                            task.status = "merging"
                            await safe_send(ws, {"type":"merge_start","taskId":task.task_id,"success":True})
                            ok = await run_ffmpeg_merge(ws, audio_path, video_path, out_path, task.task_id, task.duration)
                            
                            if ok:
                                try: os.remove(video_path)
                                except: pass
                                try: os.remove(audio_path)
                                except: pass
                                task.status = "complete"

                                thumnail_path = save_thumbnail(task.thumbnail, task.task_id,task.resolution) or task.thumbnail
                                history_item = {
                                    "fileId": task.task_id,
                                    "title": task.filename,
                                    "path": out_path,
                                    "duration": task.duration,
                                    "thumbnail": thumnail_path,
                                    "resolution": task.resolution,
                                    "type": "video",
                                    "size": os.path.getsize(out_path),
                                    "date": time.strftime("%Y-%m-%d %H:%M:%S"),
                                    "from": "YouTube"
                                }
                                await safe_send(ws, {"type":"download_complete","taskId":task.task_id,"success":True,"path":out_path,"history":history_item})
                            else:
                                task.status = "error"
                                await safe_send(ws, {"type":"error","taskId":task.task_id,"success":False,"message":"merge failed"})
                        else:
                            chosen = video_path or audio_path
                            if chosen:
                                shutil.move(chosen, out_path)
                                task.status = "complete"
                                history_item = {
                                    "fileId": task.task_id,
                                    "title": task.filename,
                                    "path": out_path,
                                    "duration": task.duration,
                                    "thumbnail": task.thumbnail,
                                    "resolution": task.resolution,
                                    "type": "Audio",
                                    "size": os.path.getsize(out_path),
                                    "date": time.strftime("%Y-%m-%d %H:%M:%S"),
                                    "from": "YouTube"
                                }
                                await safe_send(ws, {"type":"download_complete","taskId":task.task_id,"success":True,"path":out_path,"history":history_item})
                            else:
                                raise RuntimeError("No streams downloaded")
                    except asyncio.CancelledError:
                        task.status = "cancelled"
                        await safe_send(ws, {"type":"cancelled","taskId":task.task_id,"success":False})
                    except Exception as e:
                        task.status = "error"
                        print("error :",e)
                        await safe_send(ws, {"type":"error","taskId":task.task_id,"success":False,"message":str(e)})
                    finally:
                        try:
                            if os.path.isdir(task.temp_dir):
                                shutil.rmtree(task.temp_dir, ignore_errors=True)
                        except Exception:
                            pass

                task._orchestrate = orchestrate
                task._runner = asyncio.create_task(orchestrate())
                continue

            if mtype == "pause":
                tid = msg.get("taskId")
                if task and task.task_id == tid:
                    task.pause()
                    await safe_send(ws, {"type":"paused","taskId":tid,"success":True})
                else:
                    await safe_send(ws, {"type":"error","success":False,"message":"unknown task or not owned by this connection"})
                continue

            if mtype == "resume":
                tid = msg.get("taskId")
                if task and task.task_id == tid:
                    task.resume()
                    runner = getattr(task, "_runner", None)
                    if runner is None or runner.done():
                        if getattr(task, "_orchestrate", None) is not None and task.status != "complete":
                            task._runner = asyncio.create_task(task._orchestrate())
                            await safe_send(ws, {"type":"resumed","taskId":tid,"success":True, "restarted": True})
                        else:
                            await safe_send(ws, {"type":"resumed","taskId":tid,"success":True, "restarted": False})
                    else:
                        await safe_send(ws, {"type":"resumed","taskId":tid,"success":True, "restarted": False})
                else:
                    await safe_send(ws, {"type":"error","success":False,"message":"unknown task or not owned by this connection"})
                continue

            if mtype == "cancel":
                tid = msg.get("taskId")
                if task and task.task_id == tid:
                    task.cancel()
                    try:
                        if getattr(task, "_runner", None) and not task._runner.done():
                            task._runner.cancel()
                    except Exception:
                        pass
                    await safe_send(ws, {"type":"cancelled","taskId":tid,"success":True})
                else:
                    await safe_send(ws, {"type":"error","success":False,"message":"unknown task or not owned by this connection"})
                continue

            if mtype == "merge":
                audio = msg.get("audio")
                video = msg.get("video")
                out = msg.get("path")
                tid = msg.get("taskId", f"merge_{int(time.time()*1000)}")
                await safe_send(ws, {"type":"merge_ack","taskId":tid,"success":True})
                asyncio.create_task(run_ffmpeg_merge(ws, audio, video, out, tid, msg.get("duration")))
                continue

            if mtype == "cancel":
                tid = msg.get("taskId")

                # download cancel (existing)
                if task and task.task_id == tid:
                    task.cancel()
                    if getattr(task, "_runner", None):
                        task._runner.cancel()
                    await safe_send(ws, {"type": "cancelled", "taskId": tid, "success": True})
                    continue

                # 🔥 extract cancel
                if hasattr(ws, "extract_cancel"):
                    ws.extract_cancel.set()
                    await safe_send(ws, {
                        "type": "audio_extract_cancelled",
                        "taskId": tid
                    })
                    continue

                await safe_send(ws, {
                    "type": "error",
                    "success": False,
                    "message": "unknown task"
                })
                continue

            await safe_send(ws, {"type":"error","success":False,"message":"unknown command"})

    except websockets.ConnectionClosed:
        if task:
            task.cancel()
            try:
                if getattr(task, "_runner", None) and not task._runner.done():
                    task._runner.cancel()
            except Exception:
                pass
    except Exception as e:
        print(e)
        try:
            await safe_send(ws, {"type":"error","success":False,"message":str(e)})
        except Exception as er:
            print(" The errror  ",er)
            pass
        if task:
            task.cancel()
