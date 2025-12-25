
import { X, Video, Headphones, ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react"
import ConvertToCard from "./ConvertToCard.jsx";
import useExtractAudioManager from "../hooks/useExtractAudioManager";
import { useDownloads } from "../context/DownloadContext";

export default function ConvertToMp3({ setConvertOpen, convertTo, setConvertTo }) {
    const { enqueueExtract, cancelExtract } = useExtractAudioManager();
    const { state, dispatch } = useDownloads();
    convertTo.map((item) => item['percent'] = 0)
    const latestProgressRef = useRef({ "lajsdlfkjlasdlasjdlkfjadsf": { percent: 0, output: "", status: 'running' } });

    function startConversion() {

        convertTo.forEach((video) => {
            enqueueExtract({
                taskId: video.fileId,
                title: video.title,
                videoPath: video.path,
                outputPath: `${video.path.split(".")[0]}_.mp3`,
                streamIndex: 0,
                format: "mp3",
                duration: video.duration,
                thumbnail: video.thumbnail,
                size: video.size,
                date: video.date,
                resolution: video.resolution
            });
        });

    }


    useEffect(() => {
        Object.values(state.active).forEach(active => {
            console.log("active is :", active)
            if (active.status === "running")
                latestProgressRef.current[active.taskId || active.fileId] = { "percent": active.percent, output: "", status: active.status };
            if (active.status === "complete")
                latestProgressRef.current[active.taskId || active.fileId] = { "percent": 100, output: active.output, status: active.status };
        });
    }, [state.active]);



    return (
        <div className="fixed inset-0 bg-black/60 flex items-top mkb-20 justify-end z-50 animate-fadeIn p-2 gap-2">
            <div className="bg-[#0b1220] w-full p-k6 rounded-xl border border-[#0b1220] shadow-xl p-3 min-h-40 overflow-hidden">
                <div className="flex flex-row mb-2 items-center relative border-b border-gray-700">
                    <h1 className="text-2xl text-gray-400 py-1 me-auto flex gap-3 items-center"><Video /> <ArrowRight /> <Headphones /> | Video to Audio converter  </h1>
                    <button className="text-gray-400 hover:text-red-400 gap-2" onClick={() => setConvertOpen(false)}><X className="w-10 h-7 ml-2" /></button>
                </div>
                <div className="flex mb-2 gap-3">
                    <span className="font-semibold text-gray-300">Path to save: </span>
                    <p className="me-auto text-gray-400">C:\Users\Tech2Saini\Downloads\Playlist</p>
                    <button className="border px-4 py-1 rounded">Browse</button>
                </div>
                <div className="h-full max-h-[80vh] overflow-auto pe-2 border-gray-800">
                    {convertTo.map((item, index) => (
                        <ConvertToCard
                            latestProgressRef={latestProgressRef}
                            item={item} index={index} key={index} />
                    ))}
                    {convertTo.length === 0 && <div className="text-center text-gray-500 my-5">-- No items to convert --</div>}
                </div>
                <footer className="">

                    <div className="flex">
                        <div className="me-auto">
                            <button
                                onClick={() => { setConvertOpen(false) }}
                                className="bg-gray-800 border border-gray-700 px-5 p-1 rounded hover:bg-gray-600">Cancle</button>
                        </div>
                        <div>
                            <button
                                onClick={startConversion}
                                className="bg-gray-800 border border-gray-700 px-4 p-1 rounded hover:bg-gray-700">Start Conversion</button>
                        </div>
                    </div>

                </footer>
            </div >
        </div >
    );
}