import React, { useState, useEffect } from "react";
import { ChevronUp, History, Rows3, Trash2, ArrowDown } from "lucide-react";
export default function Footer({
  mode,
  onModeChange,
  resolution,
  resolutions,
  onResolutionChange,
  onDownloadAll,
  results,
  setResults,
  selected,
  onSelectAll,
  onDeselectAll,
  setIsHistoryOpen,
}) {

  const [isAnySelected, setIsAnySelected] = useState(false);

  useEffect(() => {
    const anySelected = Object.values(selected).some((val) => val === true);
    setIsAnySelected(anySelected);
  }, [selected]);

  function handleSelectAll(e) {
    if (e.target.checked) {
      onSelectAll();
      e.target.checked = true;
    }
    else {
      onDeselectAll();
      e.target.checked = false;
    }
  }


  return (
    <footer className="bg-[#0f172a] border-t border-[#0b1220] py-3 px-5 text-center flex justify-between items-center text-xs text-gray-400 fixed bottom-0 left-0 w-full">
      <div className="flex items-center gap-2 rounded-full px-3 pl-0">
        {results.length >=3 && <div className="flex flex-row flex-nowrap items-center gap-3 py-1 plx-3">
          <span className="text-gray-400 text-lg">All</span>
          <input className="w-4 h-4"
            onChange={handleSelectAll}
            type="checkbox"
          />
          <select value={mode} onChange={(e) => { onModeChange(e.target.value) }} className="flex items-center text-[15px] gap-1 bg-[#0b1220] text-sm border border-gray-700 hover:border-gray-400 hover:text-gray-200 rounded-full px-3 py-1">
            {/* Video <ChevronUp className="w-5" /> */}
            <option value="video">Video</option>
            <option value="audio">Audio</option>
          </select>
          <select
            value={resolution}
            onChange={(e) => onResolutionChange(e.target.value)}
            className="flex text-[15px] items-center font-semibold gap-1 bg-[#0b1220] border border-gray-700 hover:border-gray-400 hover:text-gray-200 rounded-full px-3 py-1">
            {/* Quality (1080p) <ChevronUp className="w-5" /> */}
            {resolutions.length === 0 && <option>No common resolutions</option>}
            {resolutions.map((r) => (
              <>
                {r && <option key={r} value={r}>{r}p</option>}
              </>
            ))}
          </select>
          <button
            onClick={onDownloadAll}
            className={`flex items-center gap-1 bg-green-600 border text-white font-semibold border-green-700 rounded-full px-3 py-1 ${isAnySelected ? "hover:bg-green-700 hover:border-green-800" : "opacity-50 cursor-not-allowed"}`}>
            <ArrowDown className="w-4" /> Download All
          </button>

          <button onClick={() => { setResults([]); setPlaylistVideos([]) }}
            className="flex items-center gap-1 bg-[#0b1220] text-red-400 border border-red-400 hover:border-gray-400 rounded-full px-3 py-1 hover:text-red-500 hover:border-red-500">
            <Trash2 className="w-4" /> Clear All
          </button>
        </div>}
      </div>
      {/* <div>Built with ♥ — Backend: local WebSocket server</div> */}
      <div className="flex flex-row flex-nowrap gap-3">

        <button onClick={() => setIsHistoryOpen(true)} className="flex items-center gap-1 bg-[#0b1220] hover:text-gray-200 rounded-full px-3 py-1 hover:bg-[#0w882d] font-semibold">
          <History className="w-5" />
          Download History
          <ChevronUp />
        </button>

        <button className="flex items-center gap-1 hidden bg-[#0b1220] hover:text-gray-200 rounded-full px-3 py-1 hover:bg-[#0w882d] font-semibold">
          <Rows3 className="w-5" />
          Download Queue
          <span className="p-0 m-0">(5)</span>
          <ChevronUp />
        </button>
      </div>

    </footer>
  );
}
