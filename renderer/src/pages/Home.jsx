import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import VideoCard from "../components/VideoCard";
import DownloadItem from "../components/DownloadItem";
import AppHistory from "../components/AppHistory"
import Settings from "./Settings"

import { useDownloads } from "../context/DownloadContext";
import useFetch from "../hooks/useFetch";
import useDownloadManager from "../hooks/useDownloadManager";
import InputBox from "../components/InputBox";
import { CardPlaceholder } from "../components/VideoCard";
import { useYouTubeValidator } from "../hooks/validator";
import { Trash2, Play, Pause } from "lucide-react";

export default function Home({ setRetryMessage }) {
  // STATE
  const [url, setUrl] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [platform, setPlatform] = useState("YouTube Video");
  const [message, setMessage] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [youtubeUrl, setyoutubeUrl] = useState(null);
  const [playlistMeta, setPlaylistMeta] = useState(null);
  const [isAllPaused, setIsAllPaused] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [appSettings, setAppSettings] = useState([])

  // global download mode
  const [path, setpath] = useState("");
  const [mode, setMode] = useState("video");
  const [resolution, setResolution] = useState(null);
  const [commonResolutions, setCommonResolutions] = useState([]);

  // backend manager
  const fetchInfo = useFetch();
  const { state, dispatch } = useDownloads();
  const { enqueueDownload, pauseTask, resumeTask, cancelTask, retryTask, } = useDownloadManager(setRetryMessage);
  const { isValidVideo, isValidPlaylist } = useYouTubeValidator();

  // FETCH HANDLER
  useEffect(() => {
    (async () => {
      const saved = await window.api.loadSettings();
      if (saved) setpath(saved['downloadPath']);
      if (saved) setAppSettings(saved)
    })();
  }, []);

  // CLIPBOARD AUTO-DETECT
  useEffect(() => {
    (async () => {
      window.onfocus = () => {
        navigator.clipboard
          .readText()
          .then((text) => {
            const regex =
              /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/))([A-Za-z0-9_-]{11})/;
            const m = text.match(regex);
            if (m) {
              const vid = m[1];
              setyoutubeUrl(vid);
              setUrl(`https://www.youtube.com/watch?v=${vid}`);
            }
          })
          .catch(() => { });
      };


    })()
  }, []);

  useEffect(() => {
    
    window.updater.onAvailable(() => {
      console.log("Update available");
    });

    window.updater.onProgress((p) => {
      console.log("Downloading:", p);
    });

    window.updater.onDownloaded(() => {
      console.log("Update downloaded, restart required");
    });

    window.updater.onError((err) => {
      console.error("Update error:", err);
    });
  }, []);



  function updateMessage(event, message) {
    console.log("message : ", message)
    document.getElementById("appmessage").innerText = message;
  }

  useEffect(() => {
    computeCommonResolutions(results);
  }, [results]);



  async function onFetch(e) {
    e.preventDefault();
    setIsFetching(true);
    setMessage("Fetching...");

    const isPlaylist = platform.toLowerCase().includes("playlist");

    // validation
    if (!isPlaylist && !isValidVideo(url)) {
      setMessage("Invalid YouTube URL");
      setIsFetching(false);
      return;
    }
    if (isPlaylist && !isValidPlaylist(url)) {
      setMessage("Invalid Playlist URL");
      setIsFetching(false);
      return;
    }

    try {
      const result = await fetchInfo(url, platform, {
        onItem: isPlaylist
          ? (videoObj) => {
            setResults((prev) => [videoObj, ...prev]);
          }
          : null,
        onPlaylistMeta: isPlaylist
          ? (meta) => setPlaylistMeta(meta)
          : null,
      });

      if (!isPlaylist) {
        setResults((prev) => [result, ...prev]);
      }

      setSelected((prev) => [...prev, false]);

      setMessage("");
      setIsFetching(false);
      setUrl("");
      setyoutubeUrl(null);
    } catch (err) {
      console.error(err);
      setMessage(String(err.message));
      setIsFetching(false);
    }
  }

  // COMMON RESOLUTION CALCULATION
  function computeCommonResolutions(list) {
    const all = list.map((v) =>
      v.streams?.video?.map((s) => s.height) || []
    );

    if (all.length === 0) return;

    const common = all.reduce((acc, next) =>
      acc.filter((r) => next.includes(r))
    );

    const uniqueCommon = [...new Set(common)];

    setCommonResolutions(uniqueCommon.sort((a, b) => b - a));
    if (!resolution && common.length > 0) {
      setResolution(common[0]); // default highest
    }
  }

  // ITEM SELECT LOGIC
  function toggleSelect(idx) {
    const copy = [...selected];
    copy[idx] = !copy[idx];
    setSelected(copy);
  }

  function selectAll() {
    setSelected(results.map(() => true));
    console.log("Selected all");
  }

  function deselectAll() {
    setSelected(results.map(() => false));
    console.log("Deselected all");
  }

  // DOWNLOAD ALL
  function downloadAll() {
    results.forEach((video, index) => {
      if (!selected[index]) return;

      // ALWAYS generate a globally unique task ID
      const taskId = "task_" + crypto.randomUUID();

      // Get video/audio streams
      const matchedVideo = video.streams.video.find(
        (s) => String(s.height) === String(resolution)
      );

      const bestVideo = matchedVideo || video.streams.video[0];
      const bestAudio = video.streams.audio?.[0];

      if (mode === "video" && !bestVideo) {
        console.warn("No video streams available for:", video.title);
        return;
      }

      if (!bestAudio) {
        console.warn("No audio stream available for:", video.title);
        return;
      }

      // Build payload exactly as single-download
      const payload =
        mode === "video"
          ? {
            taskId,
            filename: video.title,
            duration: video.duration,
            path,
            resolutoin: resolution,
            thumbnail: video.thumbnail,
            streams: {
              video: bestVideo,
              audio: bestAudio,
            },
          }
          : {
            taskId,
            filename: video.title,
            duration: video.duration,
            path,
            thumbnail: video.thumbnail,
            resolutoin: "350kb",
            streams: { audio: bestAudio },
          };


      // MUST use enqueueDownload instead of manual dispatch
      enqueueDownload(payload);
      setResults(prev => prev.filter((_, i) => i !== index));
      setSelected(prev => prev.filter((_, i) => i !== index));
    });
  }


  function pauseAll() {
    Object.values(state.active).forEach((task) => {
      pauseTask(task.taskId);
    });
    setIsAllPaused(true);
  }

  function resumeAll() {
    Object.values(state.active).forEach((task) => {
      resumeTask(task.taskId);
    });
    setIsAllPaused(false);
  }

  function cancelAll() {
    Object.values(state.active).forEach((task) => {
      cancelTask(task.taskId);
    });
  }

  // REMOVE RESULT ITEM
  function removeItem(index) {
    const newList = results.filter((_, i) => i !== index);
    setResults(newList);
    setSelected(selected.filter((_, i) => i !== index));
    computeCommonResolutions(newList);
  }



  // UI
  return (
    <div className="min-h-screen bg-[#050816] text-white">
      {/* POPUP FOR CLIPBOARD */}
      {youtubeUrl && !isFetching && (
        <div className="popup-container fixed inset-0 flex items-center justify-center z-50 animate-fadeIn flex-col">
          <div className="popup-modal">
            <h5>From your clipboard</h5>
            <div className="image">
              <img
                src={`https://img.youtube.com/vi/${youtubeUrl}/0.jpg`}
                alt=""
              />
            </div>
            <div className="buttons gap-2">
              <div className="button">
                <button
                  className="flex flex-col"
                  onClick={(e) => {
                    onFetch(e);
                    navigator.clipboard.writeText("");
                  }}
                >
                  Continue with this
                </button>
                <span className="text-gray-700">Press Enter</span>
              </div>

              <div className="button">
                <button
                  className="flex flex-col"
                  onClick={() => {
                    setyoutubeUrl(null);
                    setUrl("");
                    navigator.clipboard.writeText("");
                  }}
                >
                  Cancel
                </button>
                <span className="text-gray-700">Press ESC</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <Header
        platform={platform}
        setPlatform={setPlatform}
        form={
          <InputBox
            platform={platform}
            url={url}
            setUrl={setUrl}
            onFetch={onFetch}
          />
        }
      />

      <main className="mx-auto px-4 py-4 space-y-6">
        {message && <div className="text-red-400">{message}</div>}

        <section className="grid grid-cols-3 gap-4">
          {/* LEFT PANEL — VIDEO LIST */}
          <div className="col-span-2 pr-3 relative h-[80vh] overflow-auto relative">
            {(!isFetching && results.length === 0) &&
              <div className="flex items-center flex-col justify-center h-full">
                <span id="appmessage" className="text-4xl mx-auto text-gray-900 font-bold">
                  Paste Video Url
                </span>
                <p className="text-gray-900">https://youtube.com/?v=aldskfjlwrwk</p>
              </div>
            }
            {isFetching && (
              <div className="placeholder container">
                <CardPlaceholder thumbnail={youtubeUrl} />
              </div>
            )}

            {results.map((r, idx) => (
              <VideoCard
                key={idx}
                index={idx}
                videoData={r}
                selected={selected}
                onToggle={() => toggleSelect(idx)}
                removeItem={removeItem}
                appSettings={appSettings}
              />
            ))}

          </div>

          {/* RIGHT PANEL — ACTIVE DOWNLOADS */}
          <aside className="col-span-1 h-[80vh] overflow-auto space-y-3 pl-3 border-l border-gray-800">
            <div className="flex justify-between text-gray-300 font-semibold">
              <span>Downloading</span>

              {Object.values(state.active).length > 0 &&
                <>
                  {!isAllPaused ? <button
                    onClick={pauseAll}
                    className="text-sm bg-[#0b1220] px-3 py-1 rounded-full hover:border-gray-200 flex items-center gap-1 text-gray-400 hover:text-gray-200"
                  >
                    <Pause className="w-3" /> Pause All
                  </button> :
                    <button
                      onClick={resumeAll}
                      className="text-sm bg-[#0b1220] px-3 py-1 rounded-full border border-gray-400 hover:border-gray-200 flex items-center gap-1 text-gray-400 hover:text-gray-200"
                    >
                      <Play className="w-3" /> Resume All
                    </button>
                  }
                  <button
                    onClick={cancelAll}
                    className="text-sm bg-[#0b1220] px-3 py-1 rounded-full hover:border-red-400 flex items-center gap-1 text-red-300 hover:text-red-400"
                  >
                    <Trash2 className="w-3" /> Cancel All
                  </button>
                </>

              }
            </div>

            {Object.values(state.active).map((a) => (
              <DownloadItem
                key={a.taskId}
                item={a}
                onPause={pauseTask}
                onResume={resumeTask}
                onCancel={cancelTask}
              />
            ))}

            {state.queue.map((q) => (
              <div
                key={q.taskId}
                className="bg-[#07112a] border border-[#0b1220] rounded p-2 text-sm"
              >
                Queued: {q.filename}
              </div>
            ))}
          </aside>
        </section>
      </main>

      <Footer
        mode={mode}
        onModeChange={setMode}
        resolution={resolution}
        resolutions={commonResolutions}
        onResolutionChange={setResolution}
        onDownloadAll={downloadAll}
        results={results}
        setResults={setResults}
        selected={selected}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
        setIsHistoryOpen={setIsHistoryOpen}
        setIsSettingsOpen={setIsSettingsOpen}
        appSettings={appSettings}
      />

      {isHistoryOpen &&
        <>
          <AppHistory
            isHistoryOpen={isHistoryOpen}
            setIsHistoryOpen={setIsHistoryOpen}
          />
        </>
      }
      <Settings
        isSettingsOpen={isSettingsOpen}
        setIsSettingsOpen={setIsSettingsOpen}
      />
    </div >
  );
}
