# fetcher.py
import asyncio
from typing import Dict, Any
from pytubefix import YouTube, Playlist
from websockets import WebSocketServerProtocol
from utils import safe_send



def youtube_Video(url: str) -> Dict[str, Any]:
    """
    Blocking call using pytubefix. Returns a simplified dict similar to
    previous fetch output (video/audio streams separated).
    """
    yt = YouTube(url)
    # Some pytubefix builds expose streaming_data, others expose formats directly
    streaming = getattr(yt, "streaming_data", None) or {}
    adaptive = streaming.get("adaptiveFormats") or streaming.get("formats") or []
    result = {
        "title": getattr(yt, "title", None),
        "thumbnail": getattr(yt, "thumbnail_url", None),
        "duration": getattr(yt, "length", None),
        "adaptiveFormats": adaptive,
        "_raw": {"streaming_data": streaming}
    }
    return result

def parse_Youtube_Video(info: Any) -> Dict[str, Any]:
    formats = info.get("adaptiveFormats") or []
    video_streams = []
    audio_streams = []
    resolutions = set()

    for f in formats:
        urlf = f.get("url")
        if not urlf:
            continue
        mime = f.get("mimeType", "")
        has_video = "video" in mime
        has_audio = "audio" in mime

        if has_video and not has_audio:
            h = f.get("height") or f.get("qualityLabel")
            if isinstance(h, str) and h.isdigit():
                resolutions.add(int(h))
            elif isinstance(h, int):
                resolutions.add(h)
            video_streams.append({
                "itag": f.get("itag"),
                "url": urlf,
                "ext": (f.get("mimeType","").split(";")[0].split("/")[-1]) or f.get("ext"),
                "height": f.get("height"),
                "width": f.get("width"),
                "filesize": int(f.get("contentLength")) if f.get("contentLength") else None,
                "bitrate": f.get("bitrate") or f.get("audioBitrate") or f.get("bitrate")
            })
        elif has_audio and not has_video:
            audio_streams.append({
                "itag": f.get("itag"),
                "url": urlf,
                "ext": (f.get("mimeType","").split(";")[0].split("/")[-1]) or f.get("ext"),
                "filesize": int(f.get("contentLength")) if f.get("contentLength") else None,
                "bitrate": f.get("audioBitrate") or f.get("bitrate")
            })
        else:
            # progressive combine
            video_streams.append({
                "itag": f.get("itag"),
                "url": urlf,
                "ext": (f.get("mimeType","").split(";")[0].split("/")[-1]) or f.get("ext"),
                "height": f.get("height"),
                "width": f.get("width"),
                "filesize": int(f.get("contentLength")) if f.get("contentLength") else None,
                "bitrate": f.get("bitrate")
            })

    video_streams.sort(key=lambda x: ((x.get("height") or 0), (x.get("bitrate") or 0)), reverse=True)
    audio_streams.sort(key=lambda x: (x.get("bitrate") or 0), reverse=True)

    return {
        "success": True,
        "type": "fetch",
        "isPlaylist": False,
        "title": info.get("title"),
        "thumbnail": info.get("thumbnail"),
        "duration": info.get("duration"),
        "resolutions": sorted(list(resolutions)),
        "streams": {"video": video_streams, "audio": audio_streams},
        "_raw": info.get("_raw")
    }

def youtube_Playlist(url: str) -> Dict[str, Any]:
    playlist = Playlist(url)
    video_urls = playlist.video_urls 
    return {
        "success": True,
        "type": "fetch",
        "isPlaylist": True,
        "title": playlist.title,
        "videoCount": len(video_urls),
        "videoUrls": video_urls
    }

async def fetch_info(url: str, platform: str, ws: WebSocketServerProtocol) -> Dict[str, Any]:
    loop = asyncio.get_event_loop()

    # --- Single YouTube Video ---
    if platform.lower() == "youtube":
        try:
            info = await loop.run_in_executor(None, youtube_Video, url)
        except Exception as e:
            print(f"Error fetching YouTube video info: {e}")
            return {"success": False, "type": "fetch", "message": str(e)}
        return parse_Youtube_Video(info)

    # --- YouTube Playlist ---
    elif platform.lower() == "youtube_playlist":
        try:
            playlist_info = await loop.run_in_executor(None, youtube_Playlist, url)
            video_urls = playlist_info.get("videoUrls", [])
            await safe_send(ws, {
                "isPlaylist": True,
                "title": playlist_info.get("title"),
                "videoCount": playlist_info.get("videoCount"),
            })
            # send playlist metadata FIRST
            await safe_send(ws, playlist_info)

            async def fetch_single(u, idx):
                try:
                    raw = await loop.run_in_executor(None, youtube_Video, u)
                    print(f"Fetching video URL {idx+1}/{len(video_urls)}: {u}")

                    video = parse_Youtube_Video(raw)

                    # attach playlist index so client knows ordering
                    video["index"] = idx

                    await safe_send(ws, video)
                    return video

                except Exception as e:
                    error_item = {
                        "success": False,
                        "type": "fetch",
                        "index": idx,
                        "message": f"Failed: {u} — {e}",
                    }
                    await safe_send(ws, error_item)
                    return error_item

            # create tasks with index
            tasks = [
                fetch_single(u, idx)
                for idx, u in enumerate(video_urls)
            ]

            # concurrently fetch every video
            results = await asyncio.gather(*tasks, return_exceptions=False)

            # attach items to playlist_info for final return
            playlist_info["playlistItems"] = results
            return {
                "success": True,
                "type": "fetch",
                "isPlaylist": True,
                "videos": results
            }

        except Exception as e:
            return {"success": False, "type": "fetch", "message": str(e)}
