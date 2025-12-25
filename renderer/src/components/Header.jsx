import React, { useState, useEffect } from "react";
import { Settings } from "lucide-react"
import SettingsModal from "./AppSettings";
import Dropdown from "./Dropdown";
import { X, Minimize, Maximize, Minus, Facebook, Youtube, Instagram, Twitter } from "lucide-react";
import { RedditIcon, MergeAVIcon, ExtractAudioIcon } from "./CustomIcons";

export default function Header({ form, platform, setPlatform }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isMax, setIsMax] = useState(false);

  const [tools, setTools] = useState({
    YouTube: [<Youtube className="w-5" />, "Youtube Video Downloader"],
    YouTube_Playlist: [<Youtube className="w-5" />, "Youtube Playlist Downloader"],
    FaceBook: [<Facebook className="w-5" />, "FaceBook Video Downloader"],
    Instagram: [<Instagram className="w-5 " />, "Instagram Video Downloader"],
    Twitter: [<Twitter className="w-5" />, "Twiter Video Downloader"],
    Reddit: [<RedditIcon />, "Reddit Video Downloader"],
    "Video-Audio": [<MergeAVIcon />, "Merge Video and Audio"],
    "Extract Audio": [<ExtractAudioIcon />, "Extract Audio from video"],
  })


  async function updateState() {
    const state = await window.electronAPI.isMaximized();
    setIsMax(state);
  }

  useEffect(() => {
    setPlatform('YouTube')
    updateState();
  }, []);


  return (
    <>
      <header style={{ WebkitAppRegion: "drag" }} className="bg-[#0f172a] z-10 bokrder-b bokrder-[#0b1220] sticky top-0 p-1 px-0 flex justify-start gap-3 items-center neon">
        <div className="flex flex-row w-l40 min-w-50 flex-nowrap items-center gap-3 bg-[#0b1220] rounded-r-full px-3 py-1">
          <div className="bg-gradient-to-r from-pink-500 to-orange-400 w-10 h-10 rounded-full flex items-center justify-center shadow-neon">
            <span className="text-white font-bold">N</span>
          </div>
          <h1 className="text-white text-xl font-semibold">Neon App </h1>
        </div>
        <div style={{ WebkitAppRegion: "no-drag" }} className="bg-[#0b1220] rounded-full px-3 py-1 flex flex-row flex-nowrap items-center">
          {/* <span className="me-2 border-e pe-2 border-gray-700">Tools</span> */}
          <Dropdown
            platform={platform}
            setPlatform={setPlatform}
            defaultTextLabel="YouTube"
            defaultLabelIcon={tools['YouTube'][0]}
            items={tools}
            setItems={setTools}
            onSelect={(value) => console.log("Selected:", value)}
          />
        </div>
        <div className="me-auto flex-auto" style={{ WebkitAppRegion: "no-drag" }}>
          {form}
        </div>
        <div className="px-4" style={{ WebkitAppRegion: "no-drag" }}>
          <button onClick={() => setIsSettingsOpen(true)} className="settings-btn" >
            <Settings />
          </button>
        </div>
        <div style={{ WebkitAppRegion: "no-drag" }} className="bg-[#0b1220] rounded-l-full min-w-20 px-3 py-2 flex flex-row flex-nowrap items-center">
          <button onClick={() => window.electronAPI.minimize()} className="w-8 h-8 rounded flex justify-center items-center hover:bg-[#333]"><Minus className="h-5 w-5" /></button>
          <button onClick={async () => {
            await window.electronAPI.maximize();
            updateState();
          }} className="w-8 h-8 rounded flex justify-center items-center hover:bg-[#333]">
            {!isMax ?
              <Maximize className="h-5 w-5" /> :
              <Minimize className="h-5 w-5" />
            }
          </button>
          <button onClick={() => window.electronAPI.close()} className="w-8 h-8 rounded flex justify-center items-center hover:bg-[red]" id="close-btn"><X className="h-5 w-5" /></button>
        </div>
      </header>
      {isSettingsOpen &&
        // <SettingsModal isSettingsOpen={isSettingsOpen} active={isSettingsOpen ? 'active' : ''} setIsSettingsOpen={setIsSettingsOpen} />
        <SettingsModal open={isSettingsOpen} setOpen={setIsSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      }
    </>
  );
}
