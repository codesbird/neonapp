import ResolutionSelector from "./ResolutionSelector";
import { useDownloads } from "../context/DownloadContext";
import { useState, useEffect } from "react";
import { Trash, FolderOpen, FolderUp, CheckLine } from "lucide-react";
import ConfirmModal from "./ConfirmModal";

export default function VideoCard({ videoData, removeItem, index, results, setResults, onToggle, selected }) {
  const { state, dispatch } = useDownloads();
  const [mode, setMode] = useState("video"); // NEW: video | audio
  const [path, setpath] = useState(""); // NEW: video | audio
  const [isConfirm, setConfirm] = useState(false);

  // Load settings initially
  useEffect(() => {
    if (!videoData) return;
    (async () => {
      const saved = await window.api.loadSettings();
      if (saved) setpath(saved['downloadPath']);
    })();
  }, [videoData]);

  const browseFolder = async () => {
    const folder = await window.api.selectFolder();
    if (folder) {
      setpath(folder);
      setConfirm(true)
    }

  };

  const revealFolder = async () => {
    await window.api.revealFolder(path);
  }

  // videoData is the object returned by backend fetch: {title, thumbnail, duration, streams: {video:[], audio:[]}, resolutions}
  const onStartDownload = (selectedResolution) => {
    const taskId = "task_" + Date.now();
    let payload = {}

    // find best video stream for resolution
    const v = videoData.streams.video.find(s => String(s.height) === String(selectedResolution));
    const a = videoData.streams.audio && videoData.streams.audio[0];

    if (!v && videoData.streams.video.length === 0) {
      alert("No video streams found.");
      return;
    }

    // fallback: pick top video if no match
    const bestVideo = v || videoData.streams.video[0];
    const bestAudio = a || (videoData.streams.audio && videoData.streams.audio[0]);

    console.log(bestVideo)

    if (mode == "video") {
      payload = {
        taskId,
        filename: videoData.title,
        duration: videoData.duration,
        path: path,
        resolution: selectedResolution,
        thumbnail: videoData.thumbnail,
        streams: {
          video: bestVideo,
          audio: bestAudio
        }
      };
    }
    else {
      payload = {
        taskId,
        filename: videoData.title,
        duration: videoData.duration,
        path: path,
        thumbnail: videoData.thumbnail,
        resolution: "350kb",
        streams: {
          audio: bestAudio
        }
      };
    }
    // enqueue
    dispatch({ type: "ENQUEUE", payload });
    // let new_results = results.filter((_, i) => i !== index);
    // setResults(new_results);
  };

  function formatBytes(bytes, decimals = 2) {
    if (!bytes && bytes !== 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes || 1) / Math.log(k));
    return parseFloat(((bytes || 0) / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  function onResultionSelect(res) {
    const val = res ? res.replace("p", "") : (videoData.resolutions[0] || "");
    let stream = videoData.streams.video.find(s => String(s.height) === String(val));
    let audioFIleSize = videoData.streams.audio && videoData.streams.audio[0] ? videoData.streams.audio[0].filesize : 0;
    let filesize = formatBytes(stream.filesize + audioFIleSize)
    document.getElementById(`filesize_${index}`).innerText = `${filesize}`
    document.getElementById(`items_ext_${index}`).innerText = `${stream.ext}`
  }

  function selectMediaType(e) {
    if (e.target.value === 'audio') {
      const stream = videoData.streams.audio && videoData.streams.audio[0];
      let filesize = formatBytes(stream.filesize)
      document.getElementById(`filesize_${index}`).innerText = `${filesize}`
      document.getElementById(`items_ext_${index}`).innerText = `${stream.ext}`
    }
    else {
      onResultionSelect(document.getElementById(`res_${index}`).value)
    }
    setMode(e.target.value)
  }


  return (
    <div key={index} className="bg-[#07112a] border border-[#0b1220] rounded mb-3 p-4 flex gap-4 neon-card relative" >
      <div className="absolute top-2 left-2 text-white text-xs flex flex-row items-center gap-1">
        <span className="bg-blue-600 px-2 py-1 rounded">#{index + 1}</span>
        <input
          onChange={() => onToggle(index)}
          checked={selected[index] || false}
          className="border-none shabdow-none w-4 h-4 rounded"
          type="checkbox" />
      </div>
      <div className="w-40 h-24 my-auto overflow-hidden rounded">
        <img src={videoData.thumbnail} className="w-full h-full object-cover rounded" />
        {/* <img src={`${videoData.thumbnail}?sqp=-oaymwEnCPYBEIoBSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLBAeMXplweJ5GWfla6q25fYaYkmCQ`} alt="" className="w-full h-full object-cover" /> */}
      </div>

      <div className="flex-1">
        <h3 className="text-white font-semibold">{videoData.title}</h3>
        <div className="text-sm text-gray-300 mt-1">Duration: {Math.floor(videoData.duration / 60)}:{String(videoData.duration % 60).padStart(2, '0')}
          <span id={`items_ext_${index}`} className="bg-gradient-to-r from-pink-500 to-orange-400 text-gray-200 p-1 mx-3 text-[10px] rounded-full">MP4</span>
        </div>
        <div className="text-sm text-gray-400 flex items-center">
          <span title={path} >Save to : {path.length > 50 ? `${path.slice(0, 10)}.....${path.slice(path.length - 30, path.length)}` : path}</span>
          <button title="Change location" className="px-2 ml-3 rounded text-white hover:text-gray-200 p-0" onClick={browseFolder}>
            <FolderUp className="w-4" />
          </button>
          <button title="Open folder in Explorer" className="text-3xl" onClick={revealFolder}><FolderOpen className="text-blue-500 ml-4 hover:text-blue-600 h-4 w-4" /></button>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={mode}
            onChange={(e) => selectMediaType(e)}
            className="bg-[#0b1220] px-3 py-2 rounded text-sm text-white"
          >
            <option value="video">Video</option>
            <option value="audio">Audio</option>
          </select>
          <ResolutionSelector id={`res_${index}`} mode={mode} resolutions={videoData.resolutions} onResultionSelect={onResultionSelect} />
          <div id={`filesize_${index}`} className="px-3 py-1 bg-[#0b1220] rounded me-auto"></div>

          <button className="text-3xl mr-3" onClick={() => removeItem(index)}><Trash className="text-red-500 hover:text-red-600 h-5 w-5" /></button>
          <button
            className="px-4 me-akuto py-1 rounded bg-gradient-to-r from-pink-500 to-orange-400 text-white hover:mb-0.5"
            onClick={() => {
              const select = document.getElementById(`res_${index}`);
              const val = select ? select.value.replace("p", "") : (videoData.resolutions[0] || "");
              onStartDownload(val);
            }}
          >
            Download
          </button>
        </div>
      </div>
      <ConfirmModal open={isConfirm} title="Set as default path"
        description={`Are you want to set this path as default\n` + path}
        icon={null}
        headerColor="from-red-500 to-orange-500"
        callback={async (value) => {
          if (value === 1) {
            const saved = await window.api.loadSettings();
            saved['downloadPath'] = path;
            await window.api.saveSettings(saved);
            setConfirm(false);
          }
          else {
            setConfirm(false)
          }
        }}
      />
    </div>
  );
}


export function CardPlaceholder({ thumbnail }) {
  return (
    <div className="bg-[#07112a] placeholder border border-[#0b1220] rounded mb-3 p-4 flex gap-4 neon-card">
      <div className="w-40 h-24 overflow-hidden rounded">
        <img src={`https://img.youtube.com/vi/${thumbnail}/0.jpg`} className="w-full h-full object-cover" alt="" />
      </div>

      <div className="flex-1">
        <h3 className="text-white font-semibold h-10 bg-color"></h3>
        <div className="text-sm flex gap-5 my-3">
          <div className="h-6 w-20 bg-color"></div>
          <div className="h-6 w-6 bg-color rounded-full"></div>
        </div>

        <div className="mt-3 flex items-center gap-3">

          <div className="px-3 py-1 h-6 w-20 bg-color rounded"></div>
          <div className="px-3 py-1 h-6 w-20 bg-color rounded"></div>

          <button className="px-4 me-auto py-1 h-6 w-20 rounded bg-color text-white">
          </button>

          <button className="text-3xl h-6 rounded-full w-6 bg-color"></button>

        </div>
      </div>
    </div>
  )
}