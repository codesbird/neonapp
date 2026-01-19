import { Trash, FolderOpen, Play, Files, Send, Video, Headphones, Facebook, Youtube, Instagram, Twitter, QrCode } from "lucide-react";
import { RedditIcon, MergeAVIcon, ExtractAudioIcon } from "./CustomIcons";

import { useState } from "react"

export default function HistoryVideoCard({ item, index, onSelectItem, selectedItems, deleteItem, convertSelectedToMp3 }) {
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
        <div key={index} className="my-3 flex items-center history-item history-item-grid p-0" title={item.title}>

            <div className="w-6" >
                {/* <span>{index + 1}.</span> */}
                <input type="checkbox"
                    className={`me-2 w-5 h-5 rounded ${Object.keys(selectedItems).length <= 0 && 'item-select-grid'}`}
                    checked={selectedItems[index] || false}
                    onChange={(e) => onSelectItem(index)}
                />

            </div>
            <div className="flex gap-3 relative items-center rounded border pkx-3 border-gray-800 w-full hover:bg-[#061827]" >
                <div className="w-40 min-h-10 rounded overflow-hidden shadow-lg rounded relative">
                    <button onClick={() => playMedia(item.path)} className="flex items-center justify-center rounded-full playbtn absolute h-10 w-10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"><Play size={'30px'} /></button>
                    <span className="flex items-center justify-center absolute bottom-1 left-0 px-1">{tools[item.from][0]}</span>
                    <img className="" src={`atom://${item.thumbnail.split(/[\\/]/).pop()}`} />
                    <div className="absolute bottom-0 end-0 bg-[#160d0d] font-semibold text-white text-xs p-1 m-1 rounded w-fit">
                        {qualityTag(item.resolution)}
                    </div>
                </div>
                <div className="">
                    <p className="text-[15px] flex gap-2 items-center history-title">{item.type.toUpperCase() === "VIDEO" ? <Video className="w-5" /> : <Headphones className="w-5" />} {item.title}</p>
                    <div className="flex flex-wrap gap-2 items-center justify-start my-2 text-sm  text-gray-400">
                        <div>• Size {formatBytes(item.size)}</div>
                        <div>• Duration {formatTime(item.duration)}</div>
                        <div>• Download at {formatDate(item.date)}</div>
                    </div>
                    <div className="bordjer border-gray-700 flex gap-2 px-2 py-1 rounded-full w-fit" >
                        <button
                            onClick={() => revealFolder(item.path)}
                            className=" px-2 text-gray-400 hover:text-gray-200 mx-1 text-sm rounded-lg flex gap-2 items-center justify-center"><FolderOpen className="w-4" /> Folder</button>
                        <button
                            onClick={() => revealFile(item.path)}
                            className=" px-2 text-gray-400 hover:text-gray-200 mx-1 text-sm rounded-lg flex gap-2 items-center justify-center">
                            <Files className="w-4" />
                            File
                        </button>
                        {item.type === "video"
                            &&
                            <button
                                onClick={() => convertSelectedToMp3(item)}
                                title="Convert into audio"
                                className=" px-2 text-gray-400 hover:text-gray-200 mx-1 text-sm rounded-lg flex gap-2 items-center justify-center">
                                <Headphones className="w-4" />
                                MP3
                            </button>
                        }
                        <button
                            onClick={() => revealFile(item.path)}
                            className=" px-2 text-gray-400 hover:text-gray-200 mx-1 text-sm rounded-lg flex gap-2 items-center justify-center">
                            <QrCode className="w-4" />
                            Share
                        </button>
                        <button
                            onClick={() => deleteItem(item.fileId)}
                            className="px-2 text-red-400 hover:text-red-500 mx-1 text-ksm rounded-lg flex gap-2 items-center justify-center">
                            <Trash className="w-4" />

                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}