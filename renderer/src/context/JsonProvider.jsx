import { createContext, useState, useEffect } from "react";

export const JsonContext = createContext();

function JsonProvider({ children }) {
    const [dataset, setDataset] = useState(null);

    useEffect(() => {
        const data = [
            {
                fileId: "lajsldkfjlaksjdlkfjlkasdf",
                type: "video",
                title: "Maula Mere Maula Anwar (2007) Siddharth Koirala Nauheed Cyrusi Bollywood Romantic Song",
                output: "C:/Users/Tech2Saini/Downloads/Playlist/Maula Mere Maula  Anwar (2007)  Siddharth Koirala  Nauheed Cyrusi Bollywood Romantic Song_720.mp4",
                filename: "Maula Mere Maula  Anwar (2007)  Siddharth Koirala  Nauheed Cyrusi Bollywood Romantic Song_720.mp4",
                stream: "720p",
                extension: "mp4",
                status: 100,
                thumbnail: "https://i.ytimg.com/vi/l5sgIqzlPXc/sddefault.jpg",
                size: "18mb",
                downloaded: true,
                duration: "04:48"
            }
        ];

        setDataset(data);
    }, []); // Run only once

    return (
        <JsonContext.Provider value={{ dataset, setDataset }}>
            {children}
        </JsonContext.Provider>
    );
}

export default JsonProvider;
