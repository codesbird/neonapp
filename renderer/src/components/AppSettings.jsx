import React, { useEffect, useState } from "react";
import { X, Settings } from "lucide-react";
import ConfirmModal from "./ConfirmModal";

// This uses Electron IPC to read/write settings.json
// Make sure preload exposes: window.api.loadSettings(), window.api.saveSettings()

export default function SettingsModal({ open, setOpen, onClose }) {
    const [settings, setSettings] = useState({
        concurrent: 5,
        defaultType: "video",
        resolution: "1080p",
        audioBitrate: "160",
        downloadPath: "downloads/",
        autoClear: true,
        layout: 'grid',
        app: "YouTube"
    });
    const [defaultSettings, setDefaultSettings] = useState({
        concurrent: 5,
        defaultType: "video",
        resolution: "1080p",
        audioBitrate: "160",
        downloadPath: "downloads/",
        autoClear: true,
        layout: 'grid',
        app: "YouTube"
    });
    const [isConfirm, setConfirm] = useState(false)

    // Load settings initially
    useEffect(() => {
        if (!open) return;
        (async () => {
            const saved = await window.api.loadSettings();
            if (saved) setSettings(saved);
        })();
    }, [open]);

    const update = (key, val) => setSettings((s) => ({ ...s, [key]: val }));

    const saveAll = async () => {
        await window.api.saveSettings(settings);
        onClose();
    };

    const browseFolder = async () => {
        const folder = await window.api.selectFolder();
        if (folder) update("downloadPath", folder);
    };


    window.addEventListener('keyup', async (e) => {
        if (isConfirm) {
            return
        }
        if (e.code == "Enter" && open) {
            saveAll();
            setOpen(false);
        }
        if (e.code == 'Escape' && open) {
            setOpen(false);
        }
    })

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-[#0b1220] w-[550px] p-k6 rounded-xl border border-[#0b1220] shadow-xl">

                {/* HEADER */}
                <div className="flex justify-between items-center mb-4 px-6 py-3 border-b border-gray-800">
                    <h2 className="text-white text-xl font-semibold flex gap-3 items-center"><Settings /> Settings</h2>
                    <button onClick={onClose}>
                        <X size={22} className="text-gray-300 hover:text-white" />
                    </button>
                </div>

                <div className="p-6 pt-0">
                    {/* SETTINGS TABLE */}
                    <table className="w-full text-gray-300 text-sm">
                        <tbody >
                            <div className="border-b border-gray-800 flex items-center">
                                <div className="me-auto py-3 border-ek border-gray-800 me-auto">Max Concurrent Downloads</div>
                                <div>
                                    <input
                                        type="number"
                                        className="mx-2 bg-[#0b1220] border border-[#122036] rounded px-2 py-1 w-24"
                                        value={settings.concurrent}
                                        min="1"
                                        max="6"
                                        onChange={(e) => update("concurrent", Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="border-b border-gray-800 flex items-center border-b">
                                <div className="me-auto py-3 border-ek border-gray-800">Default Download Type</div>
                                <div>
                                    <select
                                        className="mx-2 bg-[#0b1220] border border-[#122036] rounded px-2 py-1"
                                        value={settings.defaultType}
                                        onChange={(e) => update("defaultType", e.target.value)}
                                    >
                                        <option value="video">Video</option>
                                        <option value="audio">Audio Only</option>
                                    </select>
                                </div>
                            </div>

                            <div className="border-b border-gray-800 flex items-center border-b">
                                <div className="me-auto py-3 border-ek border-gray-800">Default Video Resolution</div>
                                <div>
                                    <select
                                        className="mx-2 bg-[#0b1220] border border-[#122036] rounded px-2 py-1"
                                        value={settings.resolution}
                                        onChange={(e) => update("resolution", e.target.value)}
                                    >
                                        <option>2160p</option>
                                        <option>1440p</option>
                                        <option>1080p</option>
                                        <option>720p</option>
                                        <option>480p</option>
                                    </select>
                                </div>
                            </div>

                            <div className="border-b border-gray-800 flex items-center border-b">
                                <div className="me-auto py-3 border-ek border-gray-800">Audio Bitrate</div>
                                <div>
                                    <select
                                        className="mx-2 bg-[#0b1220] border border-[#122036] rounded px-2 py-1"
                                        value={settings.audioBitrate}
                                        onChange={(e) => update("audioBitrate", e.target.value)}
                                    >
                                        <option value="320">320 kbps</option>
                                        <option value="256">256 kbps</option>
                                        <option value="192">192 kbps</option>
                                        <option value="160">160 kbps</option>
                                    </select>
                                </div>
                            </div>

                            <div className="border-b border-gray-800 flex items-center border-b">
                                <div className="me-auto py-3 border-ek border-gray-800">Download Path</div>
                                <div>
                                    <div className="flex gap-2">
                                        <input
                                            className="mx-2 bg-[#0b1220] border border-[#122036] rounded px-3 py-1 flex-1"
                                            value={settings.downloadPath}
                                            onChange={(e) => update("downloadPath", e.target.value)}
                                        />
                                        <button
                                            className="px-3 py-1 bg-[#0b1220] border border-[#122036] text-white rounded"
                                            onClick={browseFolder}
                                        >
                                            Browse
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="border-b border-gray-800 flex items-center border-b">
                                <div className="me-auto py-3 border-ek border-gray-800">Default App</div>
                                <div>
                                    <select
                                        className="mx-2 bg-[#0b1220] border border-[#122036] rounded px-2 py-1"
                                        value={settings.app}
                                        onChange={(e) => update("app", e.target.value)}
                                    >
                                        <option value="Video-Audio">Merge Video Audio</option>
                                        <option value="YouTube_Playlist">YouTube Playlist</option>
                                        <option value="Extract Audio">Extract Audio</option>
                                        <option value="YouTube">YouTube</option>
                                        <option value="FaceBook">FaceBook</option>
                                        <option value="Instagram">Instagram</option>
                                        <option value="Twitter">Twitter</option>
                                        <option value="Reddit">Reddit</option>
                                    </select>
                                </div>
                            </div>
                            <div className="border-b border-gray-800 flex items-center border-b">
                                <div className="me-auto py-3 border-ek border-gray-800">Default History Layout</div>
                                <div>
                                    <select
                                        className="mx-2 bg-[#0b1220] border border-[#122036] rounded px-2 py-1"
                                        value={settings.layout}
                                        onChange={(e) => update("layout", e.target.value)}
                                    >
                                        <option value="row">Row Layout</option>
                                        <option value="grid">Grid Layout</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center">
                                <div className="py-3 border-ek border-gray-800 me-auto">Auto Clear Completed Tasks</div>
                                <div>
                                    <input
                                        type="checkbox"
                                        className="mx-2 w-5 h-5"
                                        checked={settings.autoClear}
                                        onChange={(e) => update("autoClear", e.target.checked)}
                                    />
                                </div>
                            </div>
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center gap-3 border-t border-gray-800 py-3 px-6">
                    <div className="flex-1">
                        <button
                            onClick={saveAll}
                            className="w-full border border-[1px] border-gray-600 hover:border-gray-300 px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-400 rounded-full text-gray-300 font-semibold hover:text-white"
                        >
                            Save Settings
                        </button>
                    </div>
                    <div>
                        <button onClick={() => setConfirm(true)} className=" px-4 py-2 border text-gray-400 border-gray-500  rounded-3xl hover:border-gray-200 hover:text-[#fff]">Reset</button>
                    </div>
                </div>
            </div>
            <ConfirmModal open={isConfirm} title="Reset settings to default"
                description={`Are you sure to restore the default settings`}
                icon={null}
                headerColor="from-red-500 to-orange-500"
                comfirmText="Yes"
                callback={async (value) => {
                    if (value === 1) {
                        await window.api.saveSettings(defaultSettings);
                        setSettings(defaultSettings)
                        setConfirm(false);
                        return;
                    }
                    return setConfirm(false);
                }}
            />
        </div>
    );
}
