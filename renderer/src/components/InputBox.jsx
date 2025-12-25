import React, { useState } from "react";

export default function InputBox({ onFetch, url, setUrl, platform }) {
    const platform_list = {
        youtube: "YouTube",
        playlist: "YouTube Playlist",
        facebook: "Facebook",
        instagram: "Instagram",
        twitter: "Twitter",
        reddit: "Reddit",
    }

    function getPlatformName(platform) {
        // YouTube_Playlist
        platform = platform || "YouTube"
        platform = String(platform).toLowerCase()
        platform = String(platform).includes("playlist") ? "playlist" : platform;
        platform  = platform_list[String(platform).toLowerCase()];
        if (!platform) {
            platform = "YouTube"
        }
        return platform.toLowerCase()
    }

    return (
        <form onSubmit={onFetch} className="flex py-1 px-2 bg-[#07112a] rounded-full border border-[#444] ">
            <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={`Paste ${getPlatformName(platform)} video URL`}
                className="flex-1 px-4 text-white bg-[#07112a] outline-none rounded border border-[#0b1220]"
            />
            <button className="px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 hover:text-[16.5px]">Fetch</button>
        </form>
    );
};