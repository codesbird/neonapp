
import { Trash, Video, FolderOpen, Files, Play } from "lucide-react";
import ProgressBar from "./ProgressBar";



export default function ConvertToCard({ item, index, latestProgressRef }) {
    latestProgressRef = latestProgressRef === undefined ? { percent: 0, output: "" } : latestProgressRef

    function qualityTag(resolution) {
        const r = Number(resolution);

        if (r >= 4320) return "8K";
        if (r >= 2160) return "4K";
        if (r >= 1440) return "2K";
        if (r >= 1080) return "HD";   // Full HD
        if (r >= 720) return "HD";   // HD Ready

        return `${r}p`;
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

    return (
        <div key={index} className="my-3 flex items-center history-item" title={item.title}>
            <div className="flex flex-col gap-3">
            </div>
            <div className="flex gap-3 relative items-center rounded border py-2 px-3 border-gray-800 w-full">
                <div className="w-[8rem] min-h-10 rounded overflow-hidden shadow-lg rounded relative">
                    {latestProgressRef.current[item.fileId]['percent'] === 100 && <button onClick={() => playMedia(latestProgressRef.current[item.fileId]['output'])} className="flex items-center justify-center rounded-full playbtn absolute h-10 w-10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"><Play size={'30px'} /></button>}
                    <img className="" src={item.thumbnail} />
                    <div className="absolute bottom-0 end-0 bg-[#160d0d] font-semibold text-white text-xs p-1 m-1 rounded w-fit">
                        {qualityTag(item.resolution)}
                    </div>
                </div>
                <div className="">
                    <p className="text-[15px] flex gap-2 items-center"><Video className="w-5" /> {item.title}</p>
                    <div className="flex flex-wrap gap-2 items-center justify-start my-2 text-sm  text-gray-400">
                        <div>• Size {formatBytes(item.size)}</div>
                        <div>• Duration {formatTime(item.duration)}</div>
                        <div className="text-sm text-gray-400">• Download at {formatDate(item.date)}</div>
                    </div>
                    {latestProgressRef.current[item.fileId] &&
                        <>
                            {latestProgressRef.current[item.fileId]['percent'] !== 100 &&
                                <div className="progress w-full">
                                    <div className="flex gap-3">
                                        <ProgressBar percent={latestProgressRef.current[item.fileId]['percent'] ? latestProgressRef.current[item.fileId]['percent'] : 0} />
                                        <div id={item.fileId}>{latestProgressRef.current[item.fileId]['percent'] ? latestProgressRef.current[item.fileId]['percent'].toFixed(0) : 0}%</div>
                                    </div>
                                </div>
                            }

                            {latestProgressRef.current[item.fileId]['percent'] === 100 &&
                                <div className="progress w-full">
                                    {console.log(latestProgressRef.current[item.fileId]['output'])}
                                    <div className={`grid mt-1 grid-cols-4`}>
                                        <button
                                            onClick={() => revealFolder(latestProgressRef.current[item.fileId]['output'])}
                                            className="border border-gray-500 px-2 text-gray-400 hover:text-gray-200 mx-1 text-sm rounded-lg flex gap-2 items-center justify-center"><FolderOpen className="w-4" /> Folder</button>
                                        <button
                                            onClick={() => revealFile(latestProgressRef.current[item.fileId]['output'])}
                                            className="border border-gray-500 px-2 text-gray-400 hover:text-gray-200 mx-1 text-sm rounded-lg flex gap-2 items-center justify-center">
                                            <Files className="w-4" />
                                            File
                                        </button>
                                    </div>
                                </div>
                            }
                        </>

                    }
                </div>
                <button className="me-1 text-red-400 hover:text-red-500 border-gray-500 absolute end-0 p-1 rounded-lg"><Trash className="w-5" /></button>
            </div>
        </div>
    )
}