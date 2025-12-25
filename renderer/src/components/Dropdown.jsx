import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export default function Dropdown({ defaultTextLabel, defaultLabelIcon, items = [], setItems, onSelect, platform, setPlatform }) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [textLabel, setTextLable] = useState(defaultTextLabel)
    const [labelIcon, setLabelIcon] = useState(defaultLabelIcon)


    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClick(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    return (
        <div className="relative inline-block text-center" ref={dropdownRef}>
            <button
                onClick={() => setOpen(!open)}
                className="px-2 py-2 transition text-sm text-gray-300 hover:text-gray-100 flex gap-1 flex-row flex-nowrap items-center"
            >
                {labelIcon} <span id="platform">{textLabel.replace("_", " ")}</span> <ChevronDown className="w-4" />
            </button>

            {open && (
                <div className="absolute right-0 mt-2 mx-auto w-[300px] bg-[#0b1220] border border-white/10 rounded-md shadow-lg z-20">
                    <ul className="py-1">
                        {/* {console.log(Object.keys(items))} */}
                        {Object.keys(items).map((key) => (
                            <li key={key}>
                                <button
                                    onClick={() => {
                                        onSelect && onSelect(key);
                                        setOpen(false);
                                        setTextLable(key);
                                        setLabelIcon(items[key][0]);
                                        setPlatform(key)
                                    }}
                                    className="w-full text-left block px-2 py-3 flex flex-row justify-start flex-nowrap items-center gap-3 text-lg text-gray-400 hover:text-gray-100 hover:bg-[#141c2f]"
                                >
                                    {items[key][0] && items[key][0]}
                                    {items[key][1]}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
