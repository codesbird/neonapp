import { Trash, FolderOpen, Play, Files, Send, Video, Headphones, Facebook, Youtube, Instagram, Twitter, QrCode } from "lucide-react";
import { RedditIcon, MergeAVIcon, ExtractAudioIcon } from "./CustomIcons";

import { useState } from "react"

export default function HistoryVideoCardGrid({ item, index, onSelectItem, selectedItems, deleteItem, convertSelectedToMp3 }) {
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

    async function playMedia(path) {
        await window.api.openFile(path)
        console.log(path, path[path.length - 1].length)
    }
    async function revealFolder(path) {
        await window.api.revealFolder(path)
        console.log(path)
    }
    async function revealFile(path) {
        await window.api.revealFile(path)
        console.log(path)
    }

    function formatBytes(bytes, decimals = 2) {
        if (!bytes && bytes !== 0) return "0 Bytes";
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes || 1) / Math.log(k));
        return parseFloat(((bytes || 0) / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
    }

    function formatTime(seconds) {
        seconds = Number(seconds);

        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        if (h > 0) {
            return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        } else {
            return `${m}:${String(s).padStart(2, '0')}`;
        }
    }

    function qualityTag(resolution) {
        const r = Number(resolution);

        if (r >= 4320) return "8K";
        if (r >= 2160) return "4K";
        if (r >= 1440) return "2K";
        if (r >= 1080) return "HD";   // Full HD
        if (r >= 720) return "HD";   // HD Ready

        return `${r}p`;
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr.replace(" ", "T")); // ensure valid ISO format

        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const year = d.getFullYear();

        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = Number(String(d.getMinutes()).padStart(2, "0"));
        const ampm = Number(hours) >= 12 || Number(hours) === 0 ? "PM" : "AM"
        return `${day}/${month}/${year} ${Number(hours) === 0 ? 12 : hours}:${minutes} ${ampm}`;
    }

    return (
        <div key={index} className="history-item-grid relative bg-gray-900 rounded animate-fadeIn h-60 overflow-hidden flex items-center flex-col history-item hover:bg-[#061827]" title={item.title}>
            <div className="relative" >
                <div className="rounded h-40 flex items-center overflow-hidden shadow-lg rounded relative">
                    <button onClick={() => { playMedia(item.path) }}> <img className="" src={item.thumbnail} /> </button>
                    <span className="absolute end-0 bottom-0 m-2 bg-[#160d0d7d] px-2 rounded">{formatTime(item.duration)}</span>
                    <div className="absolute top-0 end-0 bg-[#160d0d7d] font-semibold text-white text-xs p-1 m-1 rounded w-fit">
                        {qualityTag(item.resolution)}
                    </div>

                    <button onClick={() => { playMedia(item.path) }} className="flex items-center justify-center rounded-full playbtn absolute h-10 w-10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"><Play size={'30px'} /></button>
                    <div className={`absolute left-0 bottom-1 m-1 bg-[#160d0d7d] px-1 rounded`} >
                        {item.type.toUpperCase() === "VIDEO" ? <Video className="w-5" /> : <Headphones className="w-5" />}
                    </div>
                    <div className={`absolute left-0 top-0 m-1 ${Object.keys(selectedItems).length <= 0 && 'item-select-grid'}`} >
                        <input type="checkbox" className="me-2 w-6 h-6 rounded"
                        checked={selectedItems[index] || false}
                        onChange={(e) => onSelectItem(index)}
                    /></div>
                </div>

            </div>
            <div className="px-1 relative w-full">
                <p className="text-[15px] text-truncate-2 history-title text-start">{item.title}</p>
                <div className="flex flex-wrap gap-2 px-2 items-center justify-between mt-2 text-sm w-full text-gray-400">
                    <div className="font-semibold">{formatBytes(item.size)}</div>
                    <div>{formatDate(item.date).split(" ")[0]}</div>
                    <span className="flex items-center justify-center px-1 rounded">{tools[item.from][0]}</span>
                </div>
                <div className="history-item-action border border-gray-700 flex justify-between w-full gap-1 px-2 py-2 rounded-full w-fit absolute bg-[#061827] top-1 left-0" >
                    <button
                        onClick={() => revealFolder(item.path)}
                        className="text-gray-400 hover:text-gray-200 mx-1 text-sm rounded-lg flex gap-2 items-center justify-center"><FolderOpen className="w-4" /> Folder</button>
                    <button
                        onClick={() => revealFile(item.path)}
                        className="text-gray-400 hover:text-gray-200 mx-1 text-sm rounded-lg flex gap-2 items-center justify-center">
                        <Files className="w-4" />
                        File
                    </button>
                    {item.type === "video"
                        &&
                        <button
                            onClick={() => convertSelectedToMp3(item)}
                            title="Convert into audio"
                            className="text-gray-400 hover:text-gray-200 mx-1 text-sm rounded-lg flex gap-2 items-center justify-center">
                            <Headphones className="w-4" />
                            MP3
                        </button>
                    }
                    <button
                        onClick={() => revealFile(item.path)}
                        className="text-gray-400 hover:text-gray-200 mx-1 text-sm rounded-lg flex gap-2 items-center justify-center">
                        <QrCode className="w-4" />
                        Share
                    </button>
                    <button
                        onClick={() => deleteItem(item)}
                        className="text-red-400 hover:text-red-600 mx-1 text-ksm rounded-lg flex gap-2 items-center justify-center">
                        <Trash className="w-4" />

                    </button>
                </div>
            </div>
        </div>
    )
}