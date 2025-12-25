import { useCallback } from "react";

export const useYouTubeValidator = () => {
    // Standard YouTube & youtu.be video URLs
    const videoRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})(.*)?$/;

    // YouTube Shorts URLs
    const shortsRegex = /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{11})(.*)?$/;

    // YouTube playlist URLs
    const playlistRegex = /^(https?:\/\/)?(www\.)?youtube\.com\/(playlist\?list=|watch\?.*?&list=)([A-Za-z0-9_-]+)$/;

    // Validate YouTube video or short URL
    const isValidVideo = useCallback((url) => {
        return videoRegex.test(url) || shortsRegex.test(url);
    }, []);

    // Validate playlist URL
    const isValidPlaylist = useCallback((url) => {
        return playlistRegex.test(url);
    }, []);

    return {
        isValidVideo,
        isValidPlaylist
    };
};

